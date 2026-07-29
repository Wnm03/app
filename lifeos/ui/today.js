// ui/today.js — render-only lewat todayAdapterList(D). Aksi "selesaikan"
// tetap dispatch ke fungsi modul LAMA (mis. dismiss bill), Life OS tidak
// menduplikasi logic itu.

const LifeOSToday = {
  render() {
    const el = document.getElementById('lifeOSTodayList');
    if (!el) return;
    const items = todayAdapterList(D);
    el.innerHTML = items.length
      ? items.map((it) => `
        <div class="lifeos-today-item u-pointer" data-action="lifeOSNavigateToSource" data-args='${escapeHtml(JSON.stringify([it.sourceKind, it.sourceId]))}' title="Buka referensi data">
          <div class="lifeos-today-label">${escapeHtml(it.label || '')}</div>
          ${it.dueDate ? `<div class="lifeos-today-due">${escapeHtml(it.dueDate)}</div>` : ''}
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Tidak ada item hari ini</div></div>';
  },
};
