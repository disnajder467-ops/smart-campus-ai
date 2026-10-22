/* app.js — общий каркас: тема, sidebar, topbar, уведомления, графики, права */

const PAGES = [
  { id: "dashboard", href: "dashboard.html", icon: "📊", title: "Dashboard" },
  { id: "rooms",     href: "rooms.html",     icon: "🏫", title: "Rooms" },
  { id: "devices",   href: "devices.html",   icon: "📡", title: "Devices" },
  { id: "incidents", href: "incidents.html", icon: "🛠", title: "Incidents" },
  { id: "analytics", href: "analytics.html", icon: "🧠", title: "Analytics" },
  { id: "settings",  href: "settings.html",  icon: "⚙️", title: "Settings" }
];

// Учебная имитация прав. Настоящую защиту делает только backend!
const ROLE_PERMS = {
  deleteIncident: ["Administrator", "Engineer"],
  resetData: ["Administrator"]
};

const charts = {};

/* ---------- утилиты ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function currentUser() { return loadData(KEYS.user, null); }
function can(action) {
  const u = currentUser();
  return !!u && (ROLE_PERMS[action] || []).includes(u.role);
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- бейджи ---------- */
const badge = (text, color) => `<span class="badge ${color}">${text}</span>`;
const roomBadge = s => ({ normal: badge("Норма", "green"), warning: badge("Внимание", "yellow"), critical: badge("Критично", "red") }[s] || badge(esc(s), "gray"));
const priorityBadge = p => ({ low: badge("Низкий", "blue"), medium: badge("Средний", "yellow"), high: badge("Высокий", "red") }[p] || badge(esc(p), "gray"));
const incStatusBadge = s => ({ open: badge("Открыта", "red"), in_progress: badge("В работе", "yellow"), resolved: badge("Решена", "green") }[s] || badge(esc(s), "gray"));
const riskBadge = r => ({ high: badge("Высокий", "red"), medium: badge("Средний", "yellow"), low: badge("Низкий", "blue") }[r] || badge(esc(r), "gray"));
const deviceBadge = s => (s === "online" ? badge("Online", "green") : badge("Offline", "red"));

/* ---------- тема ---------- */
function applyTheme() {
  const light = localStorage.getItem("theme") === "light";
  document.body.classList.toggle("light", light);
  const b = document.getElementById("themeBtn");
  if (b) b.textContent = light ? "☀️" : "🌙";
}
function setTheme(t) {
  localStorage.setItem("theme", t);
  applyTheme();
  document.dispatchEvent(new Event("themechange"));
}

/* ---------- Chart.js ---------- */
function makeChart(id, config) {
  const canvas = document.getElementById(id);
  if (typeof Chart === "undefined" || !canvas) return null;
  const css = getComputedStyle(document.body);
  Chart.defaults.color = css.getPropertyValue("--muted").trim();
  Chart.defaults.borderColor = css.getPropertyValue("--line").trim();
  if (charts[id]) charts[id].destroy();
  config.options = Object.assign({ responsive: true, maintainAspectRatio: false }, config.options || {});
  charts[id] = new Chart(canvas, config);
  return charts[id];
}

/* ---------- уведомления ---------- */
function refreshNotifications() {
  const cnt = document.getElementById("notifCount");
  const panel = document.getElementById("notifPanel");
  if (!cnt || !panel) return;
  const notes = buildNotifications(getRooms(), getDevices());
  cnt.textContent = notes.length;
  cnt.hidden = !notes.length;
  panel.innerHTML = notes.length
    ? notes.map(n => `<div class="alert ${n.level}"><span>${n.icon}</span><span>${esc(n.text)}</span></div>`).join("")
    : '<p class="muted">Нет предупреждений</p>';
}

/* ---------- каркас страницы ---------- */
function renderShell() {
  const page = document.body.dataset.page;
  const user = currentUser();
  const campus = getSettings().campusName;

  document.getElementById("sidebar").innerHTML = `
    <div class="brand"><span>🏫</span><div><b>${esc(campus)}</b><small>Admin dashboard</small></div></div>
    <nav>${PAGES.map(p => `<a href="${p.href}" class="${p.id === page ? "active" : ""}"><span>${p.icon}</span>${p.title}</a>`).join("")}</nav>
    <div class="side-foot">Учебный проект · 2026</div>`;

  document.getElementById("topbar").innerHTML = `
    <button class="icon-btn" id="menuBtn" aria-label="Меню">☰</button>
    <form class="search" id="globalSearch"><input type="search" placeholder="Поиск аудиторий и устройств…" aria-label="Поиск"></form>
    <div class="top-actions">
      <button class="icon-btn" id="themeBtn" title="Сменить тему" aria-label="Сменить тему">🌙</button>
      <div class="notif">
        <button class="icon-btn" id="notifBtn" title="Уведомления" aria-label="Уведомления">🔔<span class="count" id="notifCount">0</span></button>
        <div class="notif-panel" id="notifPanel" hidden></div>
      </div>
      <div class="profile">
        <div class="avatar">${esc((user.name || "U")[0])}</div>
        <div class="pinfo"><b>${esc(user.name)}</b><small>${esc(user.role)}</small></div>
        <button class="icon-btn" id="logoutBtn" title="Выйти" aria-label="Выйти">🚪</button>
      </div>
    </div>`;

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  document.body.appendChild(backdrop);

  document.getElementById("menuBtn").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  backdrop.addEventListener("click", () => document.body.classList.remove("menu-open"));
  document.getElementById("themeBtn").addEventListener("click", () =>
    setTheme(document.body.classList.contains("light") ? "dark" : "light"));
  document.getElementById("notifBtn").addEventListener("click", e => {
    e.stopPropagation();
    const p = document.getElementById("notifPanel");
    p.hidden = !p.hidden;
  });
  document.addEventListener("click", e => {
    const p = document.getElementById("notifPanel");
    if (p && !p.contains(e.target)) p.hidden = true;
  });
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(KEYS.user);
    location.href = "index.html";
  });
  document.getElementById("globalSearch").addEventListener("submit", e => {
    e.preventDefault();
    const q = e.target.querySelector("input").value.trim();
    location.href = "rooms.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  refreshNotifications();
}

function bootstrap() {
  applyTheme();
  if (document.body.dataset.page === "login") return;
  initData();
  if (!currentUser()) { location.replace("index.html"); return; }
  renderShell();
  applyTheme();
}
bootstrap();