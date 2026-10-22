/* storage.js — работа с localStorage и симуляция датчиков */

const KEYS = {
  rooms: "sc_rooms", devices: "sc_devices", incidents: "sc_incidents",
  history: "sc_history", settings: "sc_settings", user: "sc_user"
};
const HISTORY_LEN = 12;
const NOISE = { temperature: 0.5, co2: 60, energy: 0.2 };

/* ---------- базовые функции ---------- */
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key, fallback = []) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/* ---------- утилиты ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(2, "0");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function stamp(minAgo = 0) {
  const d = new Date(Date.now() - minAgo * 60000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeLabel(minAgo = 0) {
  const d = new Date(Date.now() - minAgo * 60000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function rand(min, max, digits = 1) {
  return +(Math.random() * (max - min) + min).toFixed(digits);
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ---------- доступ к данным ---------- */
const getRooms     = () => loadData(KEYS.rooms);
const getDevices   = () => loadData(KEYS.devices);
const getIncidents = () => loadData(KEYS.incidents);
const getHistory   = () => loadData(KEYS.history, { labels: [], rooms: {} });
const getSettings  = () => ({ ...DEFAULT_SETTINGS, ...loadData(KEYS.settings, {}) });

/* ---------- инициализация и сброс ---------- */
function typicalValue(room, metric) {
  if (metric === "temperature") return room.type === "Серверная" ? 24.5 : 23.5;
  if (metric === "co2") return 500 + room.occupancy * 8;
  return room.baseline;
}

function roundMetric(metric, v) {
  return metric === "co2" ? Math.round(v) : +v.toFixed(1);
}

function buildHistory(rooms) {
  const h = { labels: [], rooms: {} };
  for (let i = HISTORY_LEN - 1; i >= 0; i--) h.labels.push(timeLabel(i * 5));
  rooms.forEach(room => {
    const series = {};
    METRICS.forEach(m => {
      // если значение уже аномальное — история строится вокруг "типичного" значения
      const base = m.level(room) > 0 ? typicalValue(room, m.key) : room[m.key];
      const arr = [];
      for (let i = 0; i < HISTORY_LEN - 1; i++) {
        arr.push(roundMetric(m.key, base + rand(-NOISE[m.key], NOISE[m.key], 2)));
      }
      arr.push(room[m.key]);
      series[m.key] = arr;
    });
    h.rooms[room.id] = series;
  });
  return h;
}

function resetData() {
  const rooms = clone(DEFAULT_ROOMS);
  rooms.forEach(r => (r.status = roomStatus(r)));
  saveData(KEYS.rooms, rooms);
  saveData(KEYS.devices, buildDevices(rooms));
  saveData(KEYS.incidents, clone(DEFAULT_INCIDENTS));
  saveData(KEYS.history, buildHistory(rooms));
}

function initData() {
  if (!localStorage.getItem(KEYS.rooms) || !localStorage.getItem(KEYS.history)) resetData();
}

function refreshStatuses() {
  const rooms = getRooms();
  rooms.forEach(r => (r.status = roomStatus(r)));
  saveData(KEYS.rooms, rooms);
}

/* ---------- симуляция показаний датчиков ---------- */
function simulateTick() {
  const rooms = getRooms();
  const devices = getDevices();
  const hist = getHistory();

  hist.labels.push(timeLabel());
  if (hist.labels.length > HISTORY_LEN) hist.labels.shift();

  rooms.forEach(r => {
    if (r.occupancy > 0) r.occupancy = Math.max(1, r.occupancy + randInt(-2, 2));
    hist.rooms[r.id] = hist.rooms[r.id] || { temperature: [], co2: [], energy: [] };

    METRICS.forEach(m => {
      const target = typicalValue(r, m.key);
      let v = r[m.key] + (target - r[m.key]) * 0.35 + rand(-NOISE[m.key], NOISE[m.key], 2);

      // редкий скачок — именно его должен поймать AI
      if (Math.random() < 0.03) {
        if (m.key === "energy") v *= rand(1.5, 1.9, 2);
        else if (m.key === "co2") v += rand(700, 1000, 0);
        else v += rand(6, 10);
      }
      const limits = { temperature: [16, 40], co2: [400, 2500], energy: [0.5, 12] }[m.key];
      r[m.key] = roundMetric(m.key, clamp(v, limits[0], limits[1]));

      const s = hist.rooms[r.id][m.key];
      s.push(r[m.key]);
      if (s.length > HISTORY_LEN) s.shift();
    });
    r.status = roomStatus(r);
  });

  devices.forEach(d => {
    if (d.status === "online" && Math.random() < 0.02) d.status = "offline";
    else if (d.status === "offline" && Math.random() < 0.2) d.status = "online";
    if (d.status === "online") {
      const room = rooms.find(x => x.id === d.room);
      if (room) { d.value = room[d.metric]; d.updatedAt = stamp(); }
    }
  });

  saveData(KEYS.rooms, rooms);
  saveData(KEYS.devices, devices);
  saveData(KEYS.history, hist);
}