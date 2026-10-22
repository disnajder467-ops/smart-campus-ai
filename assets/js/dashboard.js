/* dashboard.js — KPI, графики, уведомления, последние заявки */
(function () {
  function render() {
    const rooms = getRooms(), devices = getDevices(), incidents = getIncidents(), hist = getHistory();
    const notes = buildNotifications(rooms, devices);
    const online = devices.filter(d => d.status === "online").length;
    const normal = rooms.filter(r => r.status === "normal").length;
    const critical = rooms.filter(r => r.status === "critical").length;
    const openInc = incidents.filter(i => i.status !== "resolved").length;
    const energy = rooms.reduce((s, r) => s + r.energy, 0);

    const kpis = [
      { ic: "🏫", label: "Помещений", value: rooms.length, sub: `${normal} в норме`, cls: "" },
      { ic: "📡", label: "Устройств online", value: `${online}/${devices.length}`, sub: `${devices.length - online} offline`, cls: devices.length - online ? "warn" : "ok" },
      { ic: "🛠", label: "Открытых заявок", value: openInc, sub: `всего ${incidents.length}`, cls: openInc ? "warn" : "ok" },
      { ic: "⚡", label: "Энергия сейчас", value: energy.toFixed(1) + " kWh", sub: "сумма по кампусу", cls: "" },
      { ic: "🚨", label: "Критичных помещений", value: critical, sub: "требуют внимания", cls: critical ? "bad" : "ok" },
      { ic: "🔔", label: "Уведомлений", value: notes.length, sub: "предупреждения", cls: notes.length ? "warn" : "ok" }
    ];
    document.getElementById("kpiGrid").innerHTML = kpis.map(k =>
      `<div class="card kpi ${k.cls}"><div class="ic">${k.ic}</div><div><small>${k.label}</small><b>${k.value}</b><small>${k.sub}</small></div></div>`).join("");

    // список уведомлений
    document.getElementById("alertList").innerHTML = notes.length
      ? notes.slice(0, 8).map(n => `<div class="alert ${n.level}"><span>${n.icon}</span><span>${esc(n.text)}</span></div>`).join("")
      : '<p class="muted">Всё спокойно — предупреждений нет.</p>';

    // последние заявки
    const last = [...incidents].sort((a, b) => b.id - a.id).slice(0, 5);
    document.getElementById("recentInc").innerHTML = last.map(i =>
      `<tr><td>#${i.id}</td><td>${esc(i.title)}</td><td>${esc(i.room)}</td><td>${priorityBadge(i.priority)}</td><td>${incStatusBadge(i.status)}</td></tr>`
    ).join("") || '<tr><td colspan="5" class="empty">Заявок нет</td></tr>';

    renderCharts(rooms, devices, hist, online);
  }

  function renderCharts(rooms, devices, hist, online) {
    const byBuilding = BUILDINGS.map(b => +rooms.filter(r => r.building === b).reduce((s, r) => s + r.energy, 0).toFixed(1));
    makeChart("energyChart", {
      type: "bar",
      data: { labels: BUILDINGS, datasets: [{ label: "Энергия, kWh", data: byBuilding, backgroundColor: ["#36a3ff", "#72e0c4", "#b38cff"], borderRadius: 8 }] },
      options: { plugins: { legend: { display: false } } }
    });

    const avg = [], max = [];
    hist.labels.forEach((_, i) => {
      const vals = rooms.map(r => (hist.rooms[r.id] || {}).temperature?.[i]).filter(v => v !== undefined);
      avg.push(vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null);
      max.push(vals.length ? Math.max(...vals) : null);
    });
    makeChart("tempChart", {
      type: "line",
      data: { labels: hist.labels, datasets: [
        { label: "Средняя, °C", data: avg, borderColor: "#36a3ff", backgroundColor: "rgba(54,163,255,.15)", fill: true, tension: .3 },
        { label: "Максимум, °C", data: max, borderColor: "#ff7070", tension: .3, borderDash: [5, 5] }
      ] }
    });

    makeChart("deviceChart", {
      type: "doughnut",
      data: { labels: ["Online", "Offline"], datasets: [{ data: [online, devices.length - online], backgroundColor: ["#72e0c4", "#ff7070"], borderWidth: 0 }] },
      options: { cutout: "62%" }
    });
  }

  document.getElementById("simBtn").addEventListener("click", () => {
    simulateTick();
    render();
    refreshNotifications();
    toast("Показания датчиков обновлены");
  });
  document.addEventListener("themechange", render);
  render();
})();