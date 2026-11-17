(() => {
  const setupForm = document.getElementById("setupForm");
  const loginForm = document.getElementById("loginForm");
  const notice = document.getElementById("notice");
  const title = document.getElementById("pageTitle");
  const intro = document.getElementById("intro");
  function show(text, error=false) { notice.textContent=text; notice.className="notice"+(error?" error":""); }
  async function api(url, body) {
    const response = await fetch(url,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||"Une erreur est survenue.");
    return data;
  }
  async function init() {
    try {
      const response=await fetch("/api/admin/status",{credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(data.authenticated){location.replace("/admin/dashboard");return;}
      if(data.setupRequired){title.textContent="Créer l’espace privé";intro.textContent="Crée une seule fois le compte responsable sécurisé.";setupForm.hidden=false;}
      else {title.textContent="Espace privé";intro.textContent="Connexion réservée au responsable du centre.";loginForm.hidden=false;}
    } catch { show("Impossible de joindre le serveur. Réessaie dans un instant.",true); }
  }
  setupForm.addEventListener("submit",async event=>{event.preventDefault();const username=document.getElementById("newUsername").value.trim();const password=document.getElementById("newPassword").value;if(password.length<12){show("Le mot de passe doit contenir au moins 12 caractères.",true);return;}try{await api("/api/admin/setup",{username,password});location.replace("/admin/dashboard");}catch(error){show(error.message,true);}});
  loginForm.addEventListener("submit",async event=>{event.preventDefault();try{await api("/api/admin/login",{username:document.getElementById("username").value.trim(),password:document.getElementById("password").value});location.replace("/admin/dashboard");}catch(error){show(error.message,true);}});
  init();
})();
