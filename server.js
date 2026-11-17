const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "private-data");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const APPOINTMENTS_FILE = path.join(DATA_DIR, "appointments.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY = 2 * 1024 * 1024;
const sessions = new Map();
const loginAttempts = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon"
};
const adminPages = {
  "/admin": "admin.html", "/admin/": "admin.html",
  "/admin/dashboard": "admin-dashboard.html"
};

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
try { fs.chmodSync(DATA_DIR, 0o700); } catch {}
if (!fs.existsSync(APPOINTMENTS_FILE)) fs.writeFileSync(APPOINTMENTS_FILE, "[]", { mode: 0o600 });
if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ hours: { lundi:"08:00-17:00", mardi:"08:00-17:00", mercredi:"08:00-17:00", jeudi:"08:00-17:00", vendredi:"08:00-17:00", samedi:"08:00-13:00", dimanche:"Fermé" } }, null, 2), { mode: 0o600 });
try { fs.chmodSync(APPOINTMENTS_FILE, 0o600); } catch {}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJson(file, value) {
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  try { fs.chmodSync(temp, 0o600); } catch {}
  fs.renameSync(temp, file);
  try { fs.chmodSync(file, 0o600); } catch {}
}
function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, {
    "Content-Type": type, "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin", "Content-Security-Policy": "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    ...extra
  });
  res.end(Buffer.isBuffer(body) ? body : (typeof body === "string" ? body : JSON.stringify(body)));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY) {
        reject(Object.assign(new Error("Requête trop volumineuse."), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { reject(Object.assign(new Error("Données invalides."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function getCookies(req) {
  const result = {};
  (req.headers.cookie || "").split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i > 0) result[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return result;
}
function currentSession(req) {
  const token = getCookies(req).cm_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) { sessions.delete(token); return null; }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { token, ...session };
}
function setSession(res, token, maxAge = 28800, req = null) {
  const secure = req && req.socket && req.socket.encrypted ? "; Secure" : "";
  res.setHeader("Set-Cookie", `cm_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`);
}
function clearSession(res, req) {
  const secure = req && req.socket && req.socket.encrypted ? "; Secure" : "";
  res.setHeader("Set-Cookie", `cm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host = req.headers.host;
    return parsed.host === host && ["http:", "https:"].includes(parsed.protocol);
  } catch { return false; }
}
function safeText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function validCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function normalizedName(value) { return safeText(value, 80).normalize("NFKC").toLocaleLowerCase("fr-FR").replace(/\s+/g, " "); }
function isActiveAppointment(item) { return item.status !== "refusée" && item.status !== "terminée"; }
function appointmentList() { return readJson(APPOINTMENTS_FILE, []); }
function publicAppointment(item) {
  return { id: item.id, fullName: item.fullName, contactMethod: item.contactMethod,
    preferredDate: item.preferredDate, preferredTime: item.preferredTime,
    replyLanguage: item.replyLanguage, createdAt: item.createdAt, status: item.status };
}
function sessionToken() { return crypto.randomBytes(32).toString("hex"); }
function verifyPassword(password, admin) {
  const actual = crypto.scryptSync(password, Buffer.from(admin.salt, "hex"), 64);
  const expected = Buffer.from(admin.hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function hashPassword(password, salt = crypto.randomBytes(16)) {
  return { salt: salt.toString("hex"), hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
function rateLimitKey(req) { return (req.socket.remoteAddress || "unknown").slice(0, 80); }

const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname); }
  catch { return send(res, 400, { error: "Requête invalide." }); }

  if (pathname === "/api/status" && req.method === "GET") {
    return send(res, 200, { success: true, message: "Le site Camara Moussa fonctionne.", bookingMode: "WhatsApp avec enregistrement local" });
  }

  if (pathname === "/api/admin/status" && req.method === "GET") {
    const session = currentSession(req);
    return send(res, 200, { setupRequired: !fs.existsSync(ADMIN_FILE), authenticated: Boolean(session) });
  }

  if (pathname === "/api/admin/setup" && req.method === "POST") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
    if (fs.existsSync(ADMIN_FILE)) return send(res, 409, { error: "Le compte responsable existe déjà. Connecte-toi." });
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
    const username = safeText(body.username, 40);
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[\p{L}\p{N}_.-]{3,40}$/u.test(username)) return send(res, 400, { error: "Identifiant : 3 à 40 caractères, lettres, chiffres, point, tiret ou soulignement." });
    if (password.length < 12 || password.length > 200) return send(res, 400, { error: "Choisis un mot de passe de 12 caractères minimum." });
    const credentials = hashPassword(password);
    writeJson(ADMIN_FILE, { username, ...credentials, createdAt: new Date().toISOString() });
    try { fs.chmodSync(ADMIN_FILE, 0o600); } catch {}
    const token = sessionToken();
    sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
    setSession(res, token, 28800, req);
    return send(res, 201, { success: true });
  }

  if (pathname === "/api/admin/login" && req.method === "POST") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
    const key = rateLimitKey(req);
    const attempts = loginAttempts.get(key) || { count: 0, until: 0 };
    if (attempts.until > Date.now()) return send(res, 429, { error: "Trop de tentatives. Attends quelques minutes avant de réessayer." });
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
    const admin = readJson(ADMIN_FILE, null);
    if (!admin) return send(res, 409, { error: "Crée d’abord le compte responsable." });
    const username = safeText(body.username, 40);
    const password = typeof body.password === "string" ? body.password : "";
    if (username !== admin.username || password.length > 200 || !verifyPassword(password, admin)) {
      attempts.count += 1;
      if (attempts.count >= 5) { attempts.count = 0; attempts.until = Date.now() + 5 * 60 * 1000; }
      loginAttempts.set(key, attempts);
      return send(res, 401, { error: "Identifiant ou mot de passe incorrect." });
    }
    loginAttempts.delete(key);
    const token = sessionToken();
    sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
    setSession(res, token, 28800, req);
    return send(res, 200, { success: true });
  }

  if (pathname === "/api/admin/logout" && req.method === "POST") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
    const session = currentSession(req);
    if (session) sessions.delete(session.token);
    clearSession(res, req);
    return send(res, 200, { success: true });
  }

  if (pathname === "/api/appointments" && req.method === "POST") {
    if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
    const fullName = safeText(body.fullName, 80);
    const contactMethod = safeText(body.contactMethod, 30);
    const preferredDate = safeText(body.preferredDate, 10);
    const preferredTime = safeText(body.preferredTime, 30);
    const replyLanguage = safeText(body.replyLanguage, 20);
    if (fullName.length < 2 || !validCalendarDate(preferredDate) ||
        !["Au centre", "À distance", "À discuter"].includes(contactMethod) ||
        !["Matin", "Après-midi", "Soir"].includes(preferredTime) ||
        !["Français", "English"].includes(replyLanguage)) {
      return send(res, 400, { error: "Vérifie les informations de la demande." });
    }
    const list = appointmentList();
    const duplicate = list.find(x => isActiveAppointment(x) && normalizedName(x.fullName) === normalizedName(fullName) && x.preferredDate === preferredDate && x.preferredTime === preferredTime && x.contactMethod === contactMethod);
    if (duplicate) return send(res, 409, { error: "Une demande active existe déjà pour ce nom, cette date, ce moment et ce mode de contact. Contacte le centre si tu souhaites la modifier." });
    const item = { id: crypto.randomUUID(), fullName, contactMethod, preferredDate, preferredTime, replyLanguage, createdAt: new Date().toISOString(), status: "en attente" };
    list.unshift(item);
    writeJson(APPOINTMENTS_FILE, list.slice(0, 500));
    return send(res, 201, { success: true, id: item.id });
  }

  if (pathname.startsWith("/api/admin/")) {
    const session = currentSession(req);
    if (!session) return send(res, 401, { error: "Connexion requise." });
    if (pathname === "/api/admin/appointments" && req.method === "GET") {
      const list = appointmentList().map(publicAppointment).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, { appointments: list });
    }
    if (pathname === "/api/admin/settings" && req.method === "GET") {
      return send(res, 200, readJson(SETTINGS_FILE, { hours: {} }));
    }
    if (pathname === "/api/admin/settings" && req.method === "PUT") {
      if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
      let body; try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
      if (!body.hours || typeof body.hours !== "object") return send(res, 400, { error: "Horaires invalides." });
      const days = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
      const hours = {};
      for (const day of days) {
        const value = safeText(body.hours[day], 30);
        if (!value || !/^(Fermé|\d{2}:\d{2}\s*-\s*\d{2}:\d{2})$/.test(value)) return send(res, 400, { error: "Utilise HH:MM-HH:MM ou Fermé pour chaque jour." });
        hours[day] = value;
      }
      writeJson(SETTINGS_FILE, { hours, updatedAt: new Date().toISOString() });
      return send(res, 200, { success: true });
    }
    if (pathname === "/api/admin/password" && req.method === "POST") {
      if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
      let body; try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
      const admin = readJson(ADMIN_FILE, null);
      if (!admin || typeof body.currentPassword !== "string" || !verifyPassword(body.currentPassword, admin)) return send(res, 401, { error: "Mot de passe actuel incorrect." });
      if (typeof body.newPassword !== "string" || body.newPassword.length < 12 || body.newPassword.length > 200) return send(res, 400, { error: "Le nouveau mot de passe doit contenir au moins 12 caractères." });
      const credentials = hashPassword(body.newPassword);
      writeJson(ADMIN_FILE, { username: admin.username, ...credentials, createdAt: admin.createdAt, passwordChangedAt: new Date().toISOString() });
      sessions.clear();
      clearSession(res, req);
      return send(res, 200, { success: true, message: "Mot de passe modifié. Reconnecte-toi." });
    }
    if (pathname === "/api/admin/backup" && req.method === "GET") {
      const backup = { format: "camara-moussa-backup-v1", createdAt: new Date().toISOString(), appointments: appointmentList(), settings: readJson(SETTINGS_FILE, { hours: {} }) };
      return send(res, 200, backup, "application/json; charset=utf-8", { "Content-Disposition": 'attachment; filename="camara-moussa-sauvegarde.json"' });
    }
    if (pathname === "/api/admin/restore" && req.method === "POST") {
      if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
      let body; try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
      if (body.format !== "camara-moussa-backup-v1" || !Array.isArray(body.appointments) || body.appointments.length > 5000 || !body.settings || typeof body.settings !== "object") return send(res, 400, { error: "Fichier de sauvegarde non reconnu ou invalide." });
      const valid = body.appointments.every(x => x && typeof x.id === "string" && typeof x.fullName === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.preferredDate) && ["en attente","confirmée","refusée","terminée"].includes(x.status));
      if (!valid) return send(res, 400, { error: "Certaines demandes du fichier sont invalides." });
      writeJson(APPOINTMENTS_FILE, body.appointments);
      if (body.settings.hours && typeof body.settings.hours === "object") writeJson(SETTINGS_FILE, body.settings);
      return send(res, 200, { success: true, count: body.appointments.length });
    }
    const match = pathname.match(/^\/api\/admin\/appointments\/([a-f0-9-]+)$/i);
    if (match && req.method === "PATCH") {
      if (!sameOrigin(req)) return send(res, 403, { error: "Origine refusée." });
      let body;
      try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
      const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
      const hasDate = Object.prototype.hasOwnProperty.call(body, "preferredDate");
      const hasTime = Object.prototype.hasOwnProperty.call(body, "preferredTime");
      if (hasStatus && !["en attente", "confirmée", "refusée", "terminée"].includes(body.status)) return send(res, 400, { error: "Statut invalide." });
      if (hasDate && !validCalendarDate(body.preferredDate)) return send(res, 400, { error: "Date invalide. Choisis une date réelle au format AAAA-MM-JJ." });
      if (hasTime && !["Matin", "Après-midi", "Soir"].includes(body.preferredTime)) return send(res, 400, { error: "Moment invalide." });
      if (!hasStatus && !hasDate && !hasTime) return send(res, 400, { error: "Aucune modification fournie." });
      const list = appointmentList();
      const item = list.find(x => x.id === match[1]);
      if (!item) return send(res, 404, { error: "Demande introuvable." });
      const nextDate = hasDate ? body.preferredDate : item.preferredDate;
      const nextTime = hasTime ? body.preferredTime : item.preferredTime;
      if (isActiveAppointment({ ...item, status: hasStatus ? body.status : item.status })) {
        const conflict = list.find(x => x.id !== item.id && isActiveAppointment(x) && normalizedName(x.fullName) === normalizedName(item.fullName) && x.preferredDate === nextDate && x.preferredTime === nextTime && x.contactMethod === item.contactMethod);
        if (conflict) return send(res, 409, { error: "Ce patient possède déjà une demande active pour cette date et ce moment." });
      }
      if (hasStatus) item.status = body.status;
      if (hasDate) item.preferredDate = body.preferredDate;
      if (hasTime) item.preferredTime = body.preferredTime;
      item.updatedAt = new Date().toISOString();
      writeJson(APPOINTMENTS_FILE, list);
      return send(res, 200, { success: true, appointment: publicAppointment(item) });
    }
    return send(res, 404, { error: "Route introuvable." });
  }

  if (adminPages[pathname]) {
    const file = path.join(PUBLIC_DIR, adminPages[pathname]);
    return fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, "Page introuvable.", "text/plain; charset=utf-8");
      send(res, 200, data, "text/html; charset=utf-8", { "X-Robots-Tag": "noindex, nofollow" });
    });
  }

  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(PUBLIC_DIR, "." + pathname);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, "index.html")) {
    return send(res, 403, "Accès interdit", "text/plain; charset=utf-8");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Page introuvable", "text/plain; charset=utf-8");
    send(res, 200, data, MIME[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Camara Moussa : http://${HOST}:${PORT}`);
  console.log(`Espace privé : http://${HOST}:${PORT}/admin`);
  console.log("Les rendez-vous sont stockés localement dans private-data/.");
});