/* rooms.js — таблица помещений, поиск и фильтры */
(function () {
  const tbody = document.getElementById("roomsBody");
  const search = document.getElementById("roomSearch");
  const building = document.getElementById("roomBuilding");
  const status = document.getElementById("roomStatus");
  const count = document.getElementById("roomCount");

  building.innerHTML = '<option value="">Все корпуса</option>' + BUILDINGS.map(b => `<option>${b}</option>`).join("");
  const q = new URLSearchParams(location.search).get("q");
  if (q) search.value = q;

  function render() {
    const all = getRooms();
    const text = search.value.trim().toLowerCase();
    const rows = all.filter(r =>
      (!building.value || r.building === building.value) &&
      (!status.value || r.status === status.value) &&
      (!text || [r.id, r.building, r.type].some(v => String(v).toLowerCase().includes(text)))
    );
    tbody.innerHTML = rows.map(r => `<tr>
      <td><b>${esc(r.id)}</b></td><td>${esc(r.building)}</td><td>${r.floor}</td><td>${esc(r.type)}</td>
      <td class="lv${tempLevel(r)}">${r.temperature} °C</td>
      <td class="lv${co2Level(r)}">${r.co2} ppm</td>
      <td class="lv${energyLevel(r)}">${r.energy} kWh</td>
      <td>${r.occupancy}</td><td>${roomBadge(r.status)}</td>
      <td class="small muted">${esc(getRecommendation(r))}</td></tr>`).join("")
      || '<tr><td colspan="10" class="empty">Ничего не найдено</td></tr>';
    count.textContent = `Показано ${rows.length} из ${all.length}`;
  }

  [search, building, status].forEach(el => { el.addEventListener("input", render); el.addEventListener("change", render); });
  render();
})();