/* incidents.js — CRUD заявок: создание, изменение, удаление */
(function () {
  const tbody = document.getElementById("incBody");
  const search = document.getElementById("incSearch");
  const statusF = document.getElementById("incStatusF");
  const prioF = document.getElementById("incPrioF");
  const count = document.getElementById("incCount");

  const dlg = document.getElementById("incDialog");
  const form = document.getElementById("incForm");
  const f = {
    id: document.getElementById("incId"), title: document.getElementById("incTitle"),
    room: document.getElementById("incRoom"), priority: document.getElementById("incPriority"),
    status: document.getElementById("incStatus"), assignee: document.getElementById("incAssignee"),
    comment: document.getElementById("incComment")
  };
  const err = document.getElementById("incError");

  f.room.innerHTML = getRooms().map(r => `<option>${esc(r.id)}</option>`).join("");
  f.assignee.innerHTML = ASSIGNEES.map(a => `<option>${a}</option>`).join("");

  /* READ */
  function render() {
    const all = getIncidents();
    const text = search.value.trim().toLowerCase();
    const rows = all
      .filter(i => (!statusF.value || i.status === statusF.value) && (!prioF.value || i.priority === prioF.value) &&
        (!text || [i.title, i.room, i.assignee, i.comment].some(v => String(v || "").toLowerCase().includes(text))))
      .sort((a, b) => b.id - a.id);
    const canDelete = can("deleteIncident");

    tbody.innerHTML = rows.map(i => `<tr>
      <td>#${i.id}</td>
      <td><b>${esc(i.title)}</b><div class="small muted">${esc(i.comment)}</div></td>
      <td>${esc(i.room)}</td><td>${priorityBadge(i.priority)}</td><td>${incStatusBadge(i.status)}</td>
      <td>${esc(i.assignee)}</td><td class="small">${esc(i.createdAt)}</td>
      <td><div class="row-actions">
        <button class="btn ghost sm" data-act="edit" data-id="${i.id}">Изменить</button>
        <button class="btn danger sm" data-act="del" data-id="${i.id}" ${canDelete ? "" : 'disabled title="Недостаточно прав"'}>Удалить</button>
      </div></td></tr>`).join("") || '<tr><td colspan="8" class="empty">Заявок не найдено</td></tr>';
    count.textContent = `Показано ${rows.length} из ${all.length}`;
  }

  /* форма (общая для CREATE и UPDATE) */
  function openForm(id) {
    const inc = id ? getIncidents().find(i => i.id === id) : null;
    document.getElementById("incDialogTitle").textContent = inc ? `Изменить заявку #${inc.id}` : "Новая заявка";
    f.id.value = inc ? inc.id : "";
    f.title.value = inc ? inc.title : "";
    f.room.value = inc ? inc.room : f.room.options[0].value;
    f.priority.value = inc ? inc.priority : "medium";
    f.status.value = inc ? inc.status : "open";
    f.assignee.value = inc ? inc.assignee : ASSIGNEES[1];
    f.comment.value = inc ? inc.comment : "";
    err.textContent = "";
    dlg.showModal();
  }

  /* CREATE / UPDATE */
  form.addEventListener("submit", e => {
    e.preventDefault();
    const title = f.title.value.trim();
    if (title.length < 3) { err.textContent = "Название — минимум 3 символа."; return; }

    const list = getIncidents();
    const data = { title, room: f.room.value, priority: f.priority.value, status: f.status.value, assignee: f.assignee.value, comment: f.comment.value.trim() };

    if (f.id.value) {
      const inc = list.find(i => i.id === +f.id.value);
      Object.assign(inc, data);
      toast("Заявка обновлена");
    } else {
      list.push({ id: list.reduce((m, i) => Math.max(m, i.id), 0) + 1, createdAt: stamp(), ...data });
      toast("Заявка добавлена");
    }
    saveData(KEYS.incidents, list);
    dlg.close();
    render();
  });

  /* DELETE */
  function remove(id) {
    if (!can("deleteIncident")) { toast("Недостаточно прав для удаления"); return; }
    if (!confirm(`Удалить заявку #${id}?`)) return;
    saveData(KEYS.incidents, getIncidents().filter(i => i.id !== id));
    toast("Заявка удалена");
    render();
  }

  tbody.addEventListener("click", e => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const id = +b.dataset.id;
    if (b.dataset.act === "edit") openForm(id); else remove(id);
  });
  document.getElementById("addIncBtn").addEventListener("click", () => openForm(null));
  document.getElementById("incCancel").addEventListener("click", () => dlg.close());
  [search, statusF, prioF].forEach(el => { el.addEventListener("input", render); el.addEventListener("change", render); });
  render();
})();