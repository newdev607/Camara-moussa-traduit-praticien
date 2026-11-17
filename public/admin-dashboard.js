(() => {
  const list = document.getElementById("requestList");
  const notice = document.getElementById("dashNotice");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const dateFilter = document.getElementById("dateFilter");
  const resultsLine = document.getElementById("resultsLine");
  const statusLabels = {"en attente":"En attente", "confirmée":"Confirmée", "refusée":"Refusée", "terminée":"Terminée"};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let appointments = [];
  function showNotice(text, error=false) { notice.textContent=text; notice.className="notice"+(error?" error":""); }
  async function api(url, options={}) {
    const response = await fetch(url, {credentials:"same-origin", cache:"no-store", ...options});
    const data = await response.json().catch(()=>({}));
    if (response.status === 401) { location.replace("/admin"); throw new Error("Session expirée."); }
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  }
  function filteredItems() {
    const q = searchInput.value.trim().toLocaleLowerCase("fr-FR");
    const status = statusFilter.value;
    const date = dateFilter.value;
    return appointments.filter(item => {
      const nameMatch = !q || String(item.fullName || "").toLocaleLowerCase("fr-FR").includes(q);
      const statusMatch = status === "tous" || item.status === status;
      const dateMatch = !date || item.preferredDate === date;
      return nameMatch && statusMatch && dateMatch;
    }).sort((a,b) => String(a.preferredDate).localeCompare(String(b.preferredDate)) || String(a.preferredTime).localeCompare(String(b.preferredTime)));
  }
  function render() {
    document.getElementById("totalCount").textContent = appointments.length;
    document.getElementById("pendingCount").textContent = appointments.filter(x=>x.status==="en attente").length;
    document.getElementById("confirmedCount").textContent = appointments.filter(x=>x.status==="confirmée").length;
    document.getElementById("declinedCount").textContent = appointments.filter(x=>x.status==="refusée").length;
    document.getElementById("completedCount").textContent = appointments.filter(x=>x.status==="terminée").length;
    const items = filteredItems();
    resultsLine.textContent = `${items.length} rendez-vous affiché${items.length>1?"s":""} sur ${appointments.length}.`;
    if (!items.length) {
      list.innerHTML = `<div class="empty-state">${appointments.length ? "Aucun rendez-vous ne correspond à ces filtres." : "Aucune demande enregistrée pour le moment."}</div>`;
      return;
    }
    list.innerHTML = items.map(item => {
      const statusClass = item.status === "confirmée" ? "confirmed" : item.status === "refusée" ? "declined" : "";
      const message = `Bonjour Camara Moussa, je vous contacte au sujet du rendez-vous demandé par ${item.fullName} pour le ${item.preferredDate} (${item.preferredTime}).`;
      const wa = "https://wa.me/2250546351182?text=" + encodeURIComponent(message);
      return `<article class="request-card" data-id="${esc(item.id)}">
        <div class="request-top"><div><h2>${esc(item.fullName)}</h2><div class="request-time">Demande reçue le ${esc(new Date(item.createdAt).toLocaleString("fr-FR"))}</div></div><span class="status ${statusClass}">${esc(statusLabels[item.status] || item.status)}</span></div>
        <div class="request-meta"><span>📅 ${esc(item.preferredDate)}</span><span>🕒 ${esc(item.preferredTime)}</span><span>📍 ${esc(item.contactMethod)}</span><span>🌐 ${esc(item.replyLanguage)}</span></div>
        <div class="request-actions">
          <button type="button" data-status="confirmée">Confirmer</button>
          <button type="button" data-status="en attente">Remettre en attente</button>
          <button type="button" data-status="refusée">Refuser</button>
          <button type="button" data-status="terminée">Marquer terminée</button>
          <a class="action-link" href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a class="action-link" href="tel:+2250797328731">Appeler le centre</a>
        </div>
        <form class="reschedule-form" data-reschedule="${esc(item.id)}">
          <strong>Reporter le rendez-vous</strong>
          <label>Date souhaitée<input type="date" name="preferredDate" min="${new Date().toISOString().slice(0,10)}" value="${esc(item.preferredDate)}" required></label>
          <label>Moment souhaité<select name="preferredTime"><option value="Matin" ${item.preferredTime === "Matin" ? "selected" : ""}>Matin</option><option value="Après-midi" ${item.preferredTime === "Après-midi" ? "selected" : ""}>Après-midi</option><option value="Soir" ${item.preferredTime === "Soir" ? "selected" : ""}>Soir</option></select></label>
          <button type="submit">Enregistrer le report</button>
        </form>
      </article>`;
    }).join("");
    list.querySelectorAll("form[data-reschedule]").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const card = form.closest("[data-id]");
      const preferredDate = form.elements.preferredDate.value;
      const preferredTime = form.elements.preferredTime.value;
      const button = form.querySelector('button[type="submit"]');
      if (!preferredDate) { showNotice("Choisis une date valide.", true); return; }
      if (!confirm(`Enregistrer le report au ${preferredDate} (${preferredTime}) ?`)) return;
      button.disabled = true;
      try {
        await api("/api/admin/appointments/" + encodeURIComponent(card.dataset.id), {
          method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({preferredDate, preferredTime})
        });
        showNotice("Date et moment du rendez-vous mis à jour. Pense à prévenir le patient.");
        await load(false);
      } catch(error) { showNotice(error.message,true); button.disabled = false; }
    }));
    list.querySelectorAll("button[data-status]").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest("[data-id]");
      button.disabled = true;
      try {
        await api("/api/admin/appointments/" + encodeURIComponent(card.dataset.id), {
          method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:button.dataset.status})
        });
        showNotice("Statut du rendez-vous mis à jour.");
        await load(false);
      } catch(error) { showNotice(error.message,true); button.disabled = false; }
    }));
  }
  async function load(showMessage=true) {
    try {
      const data = await api("/api/admin/appointments");
      appointments = Array.isArray(data.appointments) ? data.appointments : [];
      render();
      if (showMessage) showNotice("Liste des rendez-vous actualisée.");
    } catch(error) { showNotice(error.message,true); }
  }
  function csvCell(value) {
    let safe = String(value ?? "");
    if (/^[\s]*[=+\-@\t\r]/.test(safe)) safe = "\'" + safe; // protège les tableurs contre les formules injectées
    return '"' + safe.replace(/"/g,'""') + '"';
  }
  document.getElementById("exportButton").addEventListener("click", () => {
    const items = filteredItems();
    if (!items.length) { showNotice("Aucun rendez-vous à exporter avec les filtres actuels.",true); return; }
    const rows = [["Nom","Date souhaitée","Heure souhaitée","Mode de contact","Langue","Statut","Demande reçue le"], ...items.map(x=>[x.fullName,x.preferredDate,x.preferredTime,x.contactMethod,x.replyLanguage,statusLabels[x.status]||x.status,new Date(x.createdAt).toLocaleString("fr-FR")])];
    const csv = "\uFEFF" + rows.map(row=>row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download="rendez-vous-camara-moussa.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showNotice("Export CSV prêt. Le fichier peut être ouvert dans Excel.");
  });
  document.getElementById("printButton").addEventListener("click", () => window.print());
  document.getElementById("clearFiltersButton").addEventListener("click", () => { searchInput.value=""; statusFilter.value="tous"; dateFilter.value=""; render(); });
  [searchInput,statusFilter,dateFilter].forEach(el => el.addEventListener("input",render));
  document.getElementById("refreshButton").addEventListener("click", () => load(true));
  document.getElementById("logoutButton").addEventListener("click", async () => {
    try { await api("/api/admin/logout", {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}); }
    catch(error) { showNotice(error.message,true); }
    finally { location.replace("/admin"); }
  });

  const calendarDate = document.getElementById("calendarDate");
  const calendarList = document.getElementById("calendarList");
  const dayNames = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  if (calendarDate) calendarDate.value = new Date().toLocaleDateString("en-CA");
  function renderCalendar() {
    if (!calendarList) return;
    const day = calendarDate.value;
    const items = appointments.filter(x => x.preferredDate === day).sort((a,b)=>String(a.preferredTime).localeCompare(String(b.preferredTime)));
    calendarList.innerHTML = items.length ? items.map(x=>`<div class="calendar-item"><strong>${esc(x.preferredTime)} — ${esc(x.fullName)}</strong><span>${esc(statusLabels[x.status]||x.status)}</span></div>`).join("") : '<p class="muted">Aucun rendez-vous enregistré pour cette date.</p>';
  }
  if (calendarDate) calendarDate.addEventListener("change", renderCalendar);
  const hoursFields = document.getElementById("hoursFields");
  const weekdays = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  async function loadHours() {
    try {
      const data = await api("/api/admin/settings");
      hoursFields.innerHTML = weekdays.map(day=>`<label>${day[0].toUpperCase()+day.slice(1)}<input data-day="${day}" maxlength="30" value="${esc(data.hours?.[day] || (day==="dimanche"?"Fermé":"08:00-17:00"))}" placeholder="08:00-17:00 ou Fermé"></label>`).join("");
    } catch(error) { showNotice(error.message,true); }
  }
  document.getElementById("saveHoursButton").addEventListener("click", async () => {
    const hours = {};
    hoursFields.querySelectorAll("[data-day]").forEach(input=>hours[input.dataset.day]=input.value.trim());
    try {
      await api("/api/admin/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({hours})});
      showNotice("Horaires enregistrés.");
    } catch(error) { showNotice(error.message,true); }
  });
  document.getElementById("backupButton").addEventListener("click", async () => {
    try {
      const response = await fetch("/api/admin/backup",{credentials:"same-origin",cache:"no-store"});
      if(response.status===401){location.replace("/admin");return;}
      if(!response.ok) throw new Error("Impossible de créer la sauvegarde.");
      const blob = await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url;a.download="camara-moussa-sauvegarde.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
      showNotice("Sauvegarde téléchargée. Conserve-la dans un endroit privé.");
    } catch(error) { showNotice(error.message,true); }
  });
  document.getElementById("restoreFile").addEventListener("change", async event => {
    const file=event.target.files?.[0]; if(!file)return;
    if(!confirm("La restauration remplacera la liste actuelle des rendez-vous et les horaires. As-tu déjà téléchargé une sauvegarde récente ?")){event.target.value="";return;}
    try {
      const backup=JSON.parse(await file.text());
      const result=await api("/api/admin/restore",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(backup)});
      showNotice(`Sauvegarde restaurée : ${result.count} rendez-vous.`);
      await load(false); await loadHours();
    } catch(error){showNotice(error.message||"Fichier de sauvegarde invalide.",true);}
    finally {event.target.value="";}
  });
  document.getElementById("passwordForm").addEventListener("submit", async event => {
    event.preventDefault();
    const currentPassword=document.getElementById("currentPassword").value;
    const newPassword=document.getElementById("newPassword").value;
    if(newPassword.length<12){showNotice("Le nouveau mot de passe doit contenir au moins 12 caractères.",true);return;}
    try {
      await api("/api/admin/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
      showNotice("Mot de passe modifié. Tu vas être déconnecté.");
      setTimeout(()=>location.replace("/admin"),700);
    } catch(error){showNotice(error.message,true);}
  });
  loadHours();
  const originalRender = render;
  render = function(){ originalRender(); renderCalendar(); };
  load(false);
})();