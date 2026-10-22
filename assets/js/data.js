/* data.js — исходные (тестовые) данные проекта */

const DEFAULT_SETTINGS = {
  campusName: "Smart Campus AI",
  co2Warn: 1000,
  co2Crit: 1500,
  tempWarn: 27,
  tempCrit: 32,
  zLimit: 2
};

const BUILDINGS = ["Корпус A", "Корпус B", "Корпус C"];
const ASSIGNEES = ["Администратор", "Инженер", "Оператор"];

// baseline — "нормальное" энергопотребление помещения (kWh)
const DEFAULT_ROOMS = [
  { id: "A-101", building: "Корпус A", floor: 1, type: "Компьютерный класс",       temperature: 24.3, co2: 780,  energy: 3.6, baseline: 3.5, occupancy: 18, status: "normal" },
  { id: "A-102", building: "Корпус A", floor: 1, type: "Лекционная аудитория",     temperature: 22.8, co2: 640,  energy: 2.4, baseline: 2.5, occupancy: 45, status: "normal" },
  { id: "A-203", building: "Корпус A", floor: 2, type: "Лаборатория физики",       temperature: 23.5, co2: 710,  energy: 3.1, baseline: 3.0, occupancy: 12, status: "normal" },
  { id: "A-205", building: "Корпус A", floor: 2, type: "Компьютерный класс",       temperature: 25.1, co2: 1620, energy: 4.4, baseline: 3.8, occupancy: 30, status: "normal" },
  { id: "A-301", building: "Корпус A", floor: 3, type: "Аудитория",                temperature: 22.0, co2: 560,  energy: 1.9, baseline: 2.0, occupancy: 0,  status: "normal" },
  { id: "B-101", building: "Корпус B", floor: 1, type: "Лекционная аудитория",     temperature: 23.1, co2: 820,  energy: 2.8, baseline: 2.8, occupancy: 40, status: "normal" },
  { id: "B-204", building: "Корпус B", floor: 2, type: "Лаборатория химии",        temperature: 26.4, co2: 1050, energy: 4.9, baseline: 4.2, occupancy: 14, status: "normal" },
  { id: "B-301", building: "Корпус B", floor: 3, type: "Лаборатория электроники",  temperature: 33.1, co2: 880,  energy: 5.2, baseline: 4.5, occupancy: 8,  status: "normal" },
  { id: "B-305", building: "Корпус B", floor: 3, type: "Административный кабинет", temperature: 22.5, co2: 600,  energy: 1.2, baseline: 1.2, occupancy: 3,  status: "normal" },
  { id: "C-102", building: "Корпус C", floor: 1, type: "Актовый зал",              temperature: 21.9, co2: 520,  energy: 5.2, baseline: 3.0, occupancy: 0,  status: "normal" },
  { id: "C-110", building: "Корпус C", floor: 1, type: "Библиотека",               temperature: 23.0, co2: 900,  energy: 2.2, baseline: 2.3, occupancy: 35, status: "normal" },
  { id: "C-201", building: "Корпус C", floor: 2, type: "Компьютерный класс",       temperature: 28.4, co2: 1180, energy: 4.7, baseline: 3.6, occupancy: 22, status: "normal" },
  { id: "C-204", building: "Корпус C", floor: 2, type: "Аудитория",                temperature: 22.6, co2: 700,  energy: 2.0, baseline: 2.1, occupancy: 28, status: "normal" },
  { id: "C-305", building: "Корпус C", floor: 3, type: "Серверная",                temperature: 24.8, co2: 480,  energy: 5.1, baseline: 5.0, occupancy: 0,  status: "normal" }
];

// Эти устройства стартуют в состоянии offline
const OFFLINE_DEVICES = ["CO2-B204-01", "TEMP-C305-01", "ENRG-A301-01", "TEMP-B101-01"];

const DEFAULT_INCIDENTS = [
  { id: 1, title: "Высокий уровень CO2",            room: "A-205", priority: "high",   status: "open",        assignee: "Инженер",       comment: "Не работает приточная вентиляция.",       createdAt: "2026-10-16 09:40" },
  { id: 2, title: "Перегрев в лаборатории",          room: "B-301", priority: "high",   status: "in_progress", assignee: "Инженер",       comment: "Проверяют кондиционер.",                  createdAt: "2026-10-16 10:15" },
  { id: 3, title: "Датчик CO2 не отвечает",          room: "B-204", priority: "medium", status: "open",        assignee: "Оператор",      comment: "Нет данных с 11:00.",                     createdAt: "2026-10-16 11:20" },
  { id: 4, title: "Свет и проектор включены ночью",  room: "C-102", priority: "medium", status: "in_progress", assignee: "Администратор", comment: "Нужно настроить расписание отключения.",  createdAt: "2026-10-15 22:05" },
  { id: 5, title: "Замена лампы в аудитории",        room: "A-102", priority: "low",    status: "resolved",    assignee: "Администратор", comment: "Лампа заменена.",                         createdAt: "2026-10-14 08:30" }
];

// Генерация IoT-устройств: по 3 датчика на каждое помещение
function buildDevices(rooms) {
  const specs = [
    { prefix: "TEMP", type: "Temperature Sensor", metric: "temperature", unit: "°C"  },
    { prefix: "CO2",  type: "CO₂ Sensor",         metric: "co2",         unit: "ppm" },
    { prefix: "ENRG", type: "Energy Meter",       metric: "energy",      unit: "kWh" }
  ];
  const devices = [];
  rooms.forEach(room => {
    specs.forEach(s => {
      const id = `${s.prefix}-${room.id.replace("-", "")}-01`;
      const offline = OFFLINE_DEVICES.includes(id);
      devices.push({
        id, room: room.id, type: s.type, metric: s.metric, unit: s.unit,
        status: offline ? "offline" : "online",
        value: room[s.metric],
        updatedAt: stamp(offline ? 180 : 0)
      });
    });
  });
  return devices;
}