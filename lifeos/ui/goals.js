// ui/goals.js — render-only lewat goalAdapterList(D). Tidak ada
// goal-service.js karena Goals tidak punya data tulis sendiri di Life OS
// (murni agregasi 6 sumber lama, lihat Gap #2). Aksi "tambah tabungan"
// dsb tetap dispatch ke fungsi modul lama (addTarget, dll), bukan ditulis
// ulang di sini.

const LifeOSGoals = {
  render() {
    const el = document.getElementById('lifeOSGoalsGrid');
    if (!el) return;
    const goals = goalAdapterList(D);
    el.innerHTML = goals.length
      ? goals.map((g) => `
        <div class="lifeos-goal-card u-pointer" data-action="lifeOSNavigateToSource" data-args='${escapeHtml(JSON.stringify([g.sourceKind, g.sourceId]))}' title="Buka referensi data">
          <div class="lifeos-goal-emoji">${g.emoji || '🎯'}</div>
          <div class="lifeos-goal-name">${escapeHtml(g.name || '')}</div>
          ${g.progressPct != null ? `<div class="lifeos-goal-progress">${g.progressPct}%</div>` : ''}
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Belum ada goal</div></div>';
  },
};
