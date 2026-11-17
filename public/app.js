(() => {
  const WHATSAPP_NUMBER = "2250546351182";
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const langSwitch = document.getElementById("langSwitch");
  const form = document.getElementById("appointmentForm");
  const message = document.getElementById("formMessage");
  let language = "fr";

  document.getElementById("year").textContent = new Date().getFullYear();

  // Date minimale : aujourd'hui, calculée selon l'heure locale du téléphone.
  const dateInput = document.getElementById("preferredDate");
  const localToday = new Date();
  dateInput.min = [
    localToday.getFullYear(),
    String(localToday.getMonth() + 1).padStart(2, "0"),
    String(localToday.getDate()).padStart(2, "0")
  ].join("-");

  menuToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.textContent = open ? "✕" : "☰";
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    });
  });

  function setLanguage(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-fr][data-en]").forEach(element => {
      const value = element.getAttribute(`data-${language}`);
      if (value !== null) element.innerHTML = value;
    });
    langSwitch.textContent = language === "fr" ? "EN" : "FR";
    langSwitch.setAttribute("aria-label", language === "fr" ? "Switch to English" : "Passer en français");
    document.title = language === "fr"
      ? "Camara Moussa, Tradipraticien | Accueil"
      : "Camara Moussa, Traditional Practitioner | Home";
  }
  langSwitch.addEventListener("click", () => setLanguage(language === "fr" ? "en" : "fr"));

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity() || form.dataset.submitting === "true") return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    const name = document.getElementById("fullName").value.trim();
    const method = document.getElementById("contactMethod").value;
    const date = document.getElementById("preferredDate").value;
    const time = document.getElementById("preferredTime").value;
    const replyLanguage = document.getElementById("replyLanguage").value;
    const labels = language === "fr"
      ? { title: "Bonjour, je souhaite demander un rendez-vous au centre Camara Moussa, Tradipraticien.", name: "Nom", method: "Mode souhaité", date: "Date souhaitée", time: "Moment souhaité", lang: "Langue de réponse", end: "Merci de me confirmer si ce créneau est disponible." }
      : { title: "Hello, I would like to request an appointment with Camara Moussa, Traditional Practitioner.", name: "Name", method: "Preferred format", date: "Preferred date", time: "Preferred time", lang: "Reply language", end: "Please confirm whether this time is available." };
    const details = [labels.title, "", `${labels.name}: ${name}`, `${labels.method}: ${method}`, `${labels.date}: ${date}`, `${labels.time}: ${time}`, `${labels.lang}: ${replyLanguage}`, "", labels.end].join("\n");
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(details)}`;

    form.dataset.submitting = "true";
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.textContent = language === "fr" ? "Préparation de votre demande…" : "Preparing your request…";
    message.textContent = language === "fr" ? "Enregistrement de votre demande…" : "Saving your request…";

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fullName: name, contactMethod: method, preferredDate: date, preferredTime: time, replyLanguage })
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 409) {
        message.textContent = language === "fr"
          ? "Une demande identique existe déjà. Vous pouvez contacter le centre sur WhatsApp pour la modifier."
          : "An identical request already exists. Contact the centre on WhatsApp to change it.";
        return;
      }
      if (!response.ok) throw new Error(result.error || "Enregistrement impossible.");
      message.textContent = language === "fr"
        ? "Demande enregistrée. WhatsApp va s’ouvrir : appuyez sur Envoyer pour contacter le centre. Le rendez-vous reste à confirmer."
        : "Request saved. WhatsApp will open: tap Send to contact the centre. The appointment still needs confirmation.";
      window.location.href = whatsappUrl;
    } catch (error) {
      message.textContent = language === "fr"
        ? "Le serveur n’a pas pu enregistrer la demande. WhatsApp va s’ouvrir pour vous permettre de contacter le centre, mais la demande n’apparaîtra peut-être pas dans l’espace responsable."
        : "The server could not save the request. WhatsApp will open so you can contact the centre, but the request may not appear in the manager area.";
      window.location.href = whatsappUrl;
    } finally {
      form.dataset.submitting = "false";
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.innerHTML = originalButtonText;
    }
  });
})();
