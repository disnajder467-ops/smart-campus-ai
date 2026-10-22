/* ai.js — «интеллектуальная» часть: пороги, z-score, рекомендации, уведомления */

/* ---------- статистика ---------- */
function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values) {
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// minSd — минимальное стандартное отклонение, чтобы шум датчика не давал ложных тревог
function zScore(values, current, minSd = 0) {
  const sd = Math.max(stdDev(values), minSd);
  if (sd === 0) return 0;
  return Math.abs((current - mean(values)) / sd);
}

/* ---------- пороги (0 = норма, 1 = warning, 2 = critical) ---------- */
function tempLevel(r) {
  const s = getSettings();
  if (r.temperature >= s.tempCrit) return 2;
  if (r.temperature > s.tempWarn || r.temperature < 18) return 1;
  return 0;
}
function co2Level(r) {
  const s = getSettings();
  if (r.co2 >= s.co2Crit) return 2;
  if (r.co2 >= s.co2Warn) return 1;
  return 0;
}
function energyLevel(r) {
  const ratio = r.energy / r.baseline;
  if (ratio >= 1.6) return 2;   // +60%
  if (ratio >= 1.3) return 1;   // +30%
  return 0;
}

const METRICS = [
  { key: "temperature", label: "Температура", unit: "°C",  minSd: 0.5,  level: tempLevel },
  { key: "co2",         label: "CO₂",         unit: "ppm", minSd: 40,   level: co2Level },
  { key: "energy",      label: "Энергия",     unit: "kWh", minSd: 0.25, level: energyLevel }
];

function roomStatus(r) {
  const worst = Math.max(...METRICS.map(m => m.level(r)));
  return ["normal", "warning", "critical"][worst];
}

/* ---------- рекомендации ---------- */
function getRecommendation(room) {
  const s = getSettings();
  if (room.co2 >= s.co2Crit) return "Критический CO₂: включить вентиляцию и проверить аудиторию.";
  if (room.temperature >= s.tempCrit) return "Перегрев: проверить кондиционер или систему вентиляции.";
  if (room.occupancy === 0 && room.type !== "Серверная" && room.energy > room.baseline * 1.3)
    return "В помещении нет людей, но энергопотребление высокое: проверить свет и оборудование.";
  if (room.co2 >= s.co2Warn) return "Повышенный CO₂: проветрить помещение.";
  if (room.temperature > s.tempWarn) return "Температура выше нормы: проверить климат-контроль.";
  if (room.temperature < 18) return "Температура ниже нормы: проверить отопление.";
  if (energyLevel(room) > 0) return "Перерасход энергии: сравнить с базовой линией.";
  return "Параметры в норме.";
}

function metricRecommendation(room, metric, level) {
  if (metric === "co2") {
    if (level === 2) return "Критический CO₂: включить вентиляцию и проверить аудиторию.";
    if (level === 1) return "Повышенный CO₂: проветрить помещение.";
    return "Резкий рост CO₂ относительно обычных значений: проверить вентиляцию и датчик.";
  }
  if (metric === "temperature") {
    if (level === 2) return "Перегрев: проверить кондиционер или систему вентиляции.";
    if (room.temperature < 18) return "Температура ниже нормы: проверить отопление.";
    if (level === 1) return "Температура выше нормы: проверить климат-контроль.";
    return "Резкое изменение температуры: проверить климат-контроль и датчик.";
  }
  if (room.occupancy === 0 && room.type !== "Серверная")
    return "В помещении нет людей, но энергопотребление высокое: проверить свет и оборудование.";
  return "Перерасход энергии: сравнить с базовой линией и проверить оборудование.";
}

/* ---------- поиск аномалий ---------- */
const RISK_ORDER = { high: 0, medium: 1, low: 2 };

function detectAnomalies(rooms, history) {
  const zLimit = getSettings().zLimit;
  const result = [];

  rooms.forEach(room => {
    const h = history.rooms[room.id];
    if (!h) return;

    METRICS.forEach(m => {
      const value = room[m.key];
      const level = m.level(room);
      const past = (h[m.key] || []).slice(0, -1);       // история без текущего значения
      const z = past.length > 2 ? zScore(past, value, m.minSd) : 0;
      const statistical = z > zLimit;
      if (level === 0 && !statistical) return;

      // риск: порог важнее статистики; чисто статистическая аномалия — low/medium
      let risk = "low";
      if (level === 2) risk = "high";
      else if (level === 1 || z > zLimit + 1) risk = "medium";

      const reasons = [];
      if (level > 0) {
        let txt = `${level === 2 ? "критический" : "предупреждающий"} порог`;
        if (m.key === "energy") txt += ` (+${Math.round((value / room.baseline - 1) * 100)}% к базовой линии)`;
        reasons.push(txt);
      }
      if (statistical) reasons.push(`z-score ${z.toFixed(1)} > ${zLimit}: отклонение от среднего ${mean(past).toFixed(1)}`);

      result.push({
        room: room.id, metric: m.key, label: m.label, unit: m.unit, value,
        z, level, risk, reason: reasons.join("; "),
        recommendation: metricRecommendation(room, m.key, level)
      });
    });
  });

  return result.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.z - a.z);
}

/* ---------- уведомления ---------- */
function buildNotifications(rooms, devices) {
  const list = [];
  const lv = n => (n === 2 ? "critical" : "warning");

  rooms.forEach(r => {
    const t = tempLevel(r), c = co2Level(r), e = energyLevel(r);
    if (c) list.push({ level: lv(c), icon: "💨", text: `${r.id}: ${c === 2 ? "критический" : "высокий"} уровень CO₂ — ${r.co2} ppm` });
    if (t) list.push({ level: lv(t), icon: "🌡️", text: `${r.id}: ${r.temperature < 18 ? "низкая температура" : "перегрев"} — ${r.temperature} °C` });
    if (e) list.push({ level: lv(e), icon: "⚡", text: `${r.id}: перерасход энергии +${Math.round((r.energy / r.baseline - 1) * 100)}% к норме` });
  });
  devices.filter(d => d.status === "offline").forEach(d =>
    list.push({ level: "warning", icon: "📡", text: `Датчик ${d.id} (${d.room}) offline` })
  );
  return list.sort((a, b) => (b.level === "critical") - (a.level === "critical"));
}