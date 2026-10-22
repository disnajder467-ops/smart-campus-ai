/* analytics.js — AI Analytics: аномалии (пороги + z-score), графики, рекомендации */
(function () {
  const roomSel = document.getElementById("trendRoom");
  const metricSel = document.getElementById("trendMetric");
  const auto = document.getElementById("autoSim");
  let timer = null;

  roomSel.innerHTML = getRooms().map(r => `<option>${esc(r.id)}</option>`).join("");
  metricSel.innerHTML = METRICS.map(m => `<option value="${m.key}">${m.label}</option>`).join("");
  const first = detectAnomalies(getRooms(), getHistory())[0];
  if (first) { roomSel.value = first.room; metricSel.value = first.metric; }

  function render() {
    const rooms = getRooms(), hist = getHistory();
    const anomalies = detectAnomalies(rooms, hist);
    const high = anomalies.filter(a => a.risk === "high").length;
    const stat = anomalies.filter(a => a.z > getSettings().zLimit).length;

    const kpis = [
      { ic: "🧠", label: "Проанализировано", value: rooms.length * METRICS.length, sub: "показателей", cls: "" },
      { ic: "⚠️", label: "Аномалий", value: anomalies.length, sub: "найдено сейчас", cls: anomalies.length ? "warn" : "ok" },
      { ic: "🚨", label: "Высокий риск", value: high, sub: "критические пороги", cls: high ? "bad" : "ok" },
      { ic: "📈", label: "По z-score", value: stat, sub: `порог z > ${getSettings().zLimit}`, cls: "" }
    ];
    document.getElementById("aiKpi").innerHTML = kpis.map(k =>
      `<div class="card kpi ${k.cls}"><div class="ic">${k.ic}</div><div><small>${k.label}</small><b>${k.value}</b><small>${k.sub}</small></div></div>`).join("");

    document.getElementById("anomBody").innerHTML = anomalies.map(a => `<tr>
      <td><b>${esc(a.room)}</b></td><td>${a.label}</td><td>${a.value} ${a.unit}</td>
      <td>${a.z.toFixed(2)}</td><td class="small">${esc(a.reason)}</td>
      <td>${riskBadge(a.risk)}</td><td class="small">${esc(a.recommendation)}</td></tr>`).join("")
      || '<tr><td colspan="7" class="empty">✅ Аномалий не обнаружено</td></tr>';

    // рекомендации по помещениям
    const bad = rooms.filter(r => r.status !== "normal");
    document.getElementById("roomRecs").innerHTML = bad.length
      ? bad.map(r => `<div class="alert ${r.status}"><span>${r.status === "critical" ? "🚨" : "⚠️"}</span><span><b>${esc(r.id)}</b> · ${esc(r.type)}<br>${esc(getRecommendation(r))}</span></div>`).join("")
      : '<p class="muted">Все помещения в норме.</p>';

    renderTrend(anomalies);
    renderCharts(rooms, anomalies);
  }

  function renderTrend(anomalies) {
    const hist = getHistory();
    const m = METRICS.find(x => x.key === metricSel.value);
    const vals = (hist.rooms[roomSel.value] || {})[m.key] || [];
    const past = vals.slice(0, -1);
    const avg = past.length ? +mean(past).toFixed(2) : 0;
    const flagged = anomalies.some(a => a.room === roomSel.value && a.metric === m.key);
    makeChart("trendChart", {
      type: "line",
      data: { labels: hist.labels, datasets: [
        { label: `${m.label}, ${m.unit}`, data: vals, borderColor: "#36a3ff", backgroundColor: "rgba(54,163,255,.15)", fill: true, tension: .3, pointRadius: 5,
          pointBackgroundColor: vals.map((_, i) => (i === vals.length - 1 && flagged ? "#ff7070" : "#36a3ff")) },
        { label: "Среднее по истории", data: vals.map(() => avg), borderColor: "#ffc857", borderDash: [6, 6], pointRadius: 0 }
      ] }
    });
  }

  function renderCharts(rooms, anomalies) {
    const cnt = r => anomalies.filter(a => a.risk === r).length;
    makeChart("riskChart", {
      type: "doughnut",
      data: { labels: ["Высокий", "Средний", "Низкий"], datasets: [{ data: [cnt("high"), cnt("medium"), cnt("low")], backgroundColor: ["#ff7070", "#ffc857", "#36a3ff"], borderWidth: 0 }] },
      options: { cutout: "60%" }
    });
    const sum = (b, k) => +rooms.filter(r => r.building === b).reduce((s, r) => s + r[k], 0).toFixed(1);
    makeChart("baseChart", {
      type: "bar",
      data: { labels: BUILDINGS, datasets: [
        { label: "Факт, kWh", data: BUILDINGS.map(b => sum(b, "energy")), backgroundColor: "#36a3ff", borderRadius: 6 },
        { label: "Базовая линия, kWh", data: BUILDINGS.map(b => sum(b, "baseline")), backgroundColor: "#72e0c4", borderRadius: 6 }
      ] }
    });
  }

  function tick() {
    simulateTick();
    render();
    refreshNotifications();
  }

  document.getElementById("simBtn").addEventListener("click", () => { tick(); toast("Показания обновлены, анализ выполнен"); });
  auto.addEventListener("change", () => {
    clearInterval(timer);
    if (auto.checked) timer = setInterval(tick, 5000);
  });
  [roomSel, metricSel].forEach(el => el.addEventListener("change", () => renderTrend(detectAnomalies(getRooms(), getHistory()))));
  document.addEventListener("themechange", render);
  window.addEventListener("pagehide", () => clearInterval(timer));
  render();
})();