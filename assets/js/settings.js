/* settings.js — тема, параметры кампуса, сброс данных */
(function () {
  const form = document.getElementById("settingsForm");
  const fields = ["campusName", "co2Warn", "co2Crit", "tempWarn", "tempCrit", "zLimit"];
  const user = currentUser();

  /* тема */
  const themeBtns = document.querySelectorAll("[data-theme]");
  function markTheme() {
    const cur = document.body.classList.contains("light") ? "light" : "dark";
    themeBtns.forEach(b => b.classList.toggle("on", b.dataset.theme === cur));
  }
  themeBtns.forEach(b => b.addEventListener("click", () => { setTheme(b.dataset.theme); markTheme(); }));
  markTheme();

  /* параметры */
  const s = getSettings();
  fields.forEach(k => (document.getElementById(k).value = s[k]));

  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = {};
    fields.forEach(k => (v[k] = document.getElementById(k).value.trim()));
    ["co2Warn", "co2Crit", "tempWarn", "tempCrit", "zLimit"].forEach(k => (v[k] = Number(v[k])));

    if (!v.campusName) return toast("Введите название кампуса");
    if ([v.co2Warn, v.co2Crit, v.tempWarn, v.tempCrit, v.zLimit].some(n => Number.isNaN(n))) return toast("Параметры должны быть числами");
    if (v.co2Warn >= v.co2Crit) return toast("Порог CO₂ «внимание» должен быть меньше «критично»");
    if (v.tempWarn >= v.tempCrit) return toast("Порог температуры «внимание» должен быть меньше «критично»");
    if (v.zLimit < 1 || v.zLimit > 5) return toast("Порог z-оценки: от 1 до 5");

    saveData(KEYS.settings, v);
    refreshStatuses();
    refreshNotifications();
    document.querySelector(".brand b").textContent = v.campusName;
    toast("Настройки сохранены");
  });

  /* данные */
  function info() {
    document.getElementById("storageInfo").textContent =
      `В памяти браузера: помещений — ${getRooms().length}, устройств — ${getDevices().length}, заявок — ${getIncidents().length}.`;
  }
  const resetBtn = document.getElementById("resetBtn");
  if (!can("resetData")) {
    resetBtn.disabled = true;
    document.getElementById("resetNote").textContent = "Сброс доступен только роли Администратор.";
  }
  resetBtn.addEventListener("click", () => {
    if (!confirm("Сбросить все тестовые данные (помещения, устройства, заявки, историю)?")) return;
    resetData();
    refreshNotifications();
    info();
    toast("Тестовые данные восстановлены");
  });
  info();

  document.getElementById("profileInfo").innerHTML =
    `Эл. почта: <b>${esc(user.email)}</b><br>Роль: <b>${esc(user.role)}</b><br><span class="muted small">Роли — учебная имитация и не заменяют настоящую защиту на сервере.</span>`;
})();