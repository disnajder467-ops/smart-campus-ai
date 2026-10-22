/* devices.js — список IoT-устройств */
(function () {
  const tbody = document.getElementById("devBody");
  const search = document.getElementById("devSearch");
  const status = document.getElementById("devStatus");
  const type = document.getElementById("devType");
  const building = document.getElementById("devBuilding");
  const count = document.getElementById("devCount");

  const types = [...new Set(getDevices().map(d => d.type))];
  type.innerHTML = '<option value="">Все типы</option>' + types.map(t => `<option>${esc(t)}</option>`).join("");
  building.innerHTML = '<option value="">Все корпуса</option>' + BUILDINGS.map(b => `<option>${b}</option>`).join("");

  function render() {
    const rooms = getRooms();
    const buildingOf = id => (rooms.find(r => r.id === id) || {}).building;
    const all = getDevices();
    const text = search.value.trim().toLowerCase();
    const rows = all.filter(d =>
      (!status.value || d.status === status.value) &&
      (!type.value || d.type === type.value) &&
      (!building.value || buildingOf(d.room) === building.value) &&
      (!text || [d.id, d.room, d.type].some(v => String(v).toLowerCase().includes(text)))
    );
    tbody.innerHTML = rows.map(d => `<tr>
      <td><b>${esc(d.id)}</b></td><td>${esc(d.room)}</td><td>${esc(d.type)}</td>
      <td>${deviceBadge(d.status)}</td>
      <td class="${d.status === "offline" ? "muted" : ""}">${d.value} ${esc(d.unit)}</td>
      <td>${esc(d.updatedAt)}</td>
      <td><button class="btn ghost sm" data-id="${esc(d.id)}">${d.status === "online" ? "Отключить" : "Включить"}</button></td></tr>`).join("")
      || '<tr><td colspan="7" class="empty">Ничего не найдено</td></tr>';
    count.textContent = `Показано ${rows.length} из ${all.length}`;
  }

  tbody.addEventListener("click", e => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    const devices = getDevices();
    const d = devices.find(x => x.id === b.dataset.id);
    d.status = d.status === "online" ? "offline" : "online";
    d.updatedAt = stamp();
    saveData(KEYS.devices, devices);
    refreshNotifications();
    render();
  });

  [search, status, type, building].forEach(el => { el.addEventListener("input", render); el.addEventListener("change", render); });
  render();
})();