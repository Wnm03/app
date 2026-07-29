// modules/shared/backup-health-presenter.js — Backup Health Presenter
// (Data Management Core). Lihat catatan lengkap di
// modules/shared/backup-health-api.js.
//
// PRINSIP: UI HANYA presenter. 100% REUSE `BackupHealthAPI.summary()`
// (modules/shared/backup-health-api.js, sesi ini — sendiri 100% reuse
// D.lastBackup/BackupHistoryAPI) — TIDAK ada rumus baru, TIDAK membaca
// D langsung. Dipanggil dari renderSettings() (modules/shared/
// modules-render.js), pola guard `typeof X!=='undefined'` sama persis
// presenter *-api.js lain di codebase ini (mis. DebtOptimizerPresenter).
const BackupHealthPresenter = {

  render() {
    const el = document.getElementById('backupHealthCard');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof BackupHealthAPI === 'undefined') {
      el.innerHTML = '<div class="u-fs12 u-ctext3">Status backup belum tersedia</div>';
      return;
    }

    const s = BackupHealthAPI.summary();
    const levelCls = s.status.level === 'ok' ? 'bh-health-ok'
      : s.status.level === 'overdue' ? 'bh-health-overdue'
      : 'bh-health-never';
    const rel = s.reliability;
    const relText = (rel.ok && rel.successRate !== null)
      ? rel.successRate + '% sukses (' + rel.total + ' backup tercatat)'
      : 'Belum ada histori backup';

    el.innerHTML = `
      <div class="bh-health ${levelCls}">
        <div class="bh-health-label">${escapeHtml(s.status.label)}</div>
        <div class="bh-health-sub">${escapeHtml(relText)}</div>
      </div>
    `;

    // Badge titik merah di tab "🔔 Notifikasi & Pengingat" kalau backup
    // terlambat (>7 hari, ambang SAMA dgn BackupHealthAPI/checkBackup()) --
    // supaya kelihatan dari level tab, tidak perlu buka kartu ini dulu.
    const tabBadge = document.getElementById('stgTabBadgeNotif');
    if (tabBadge) tabBadge.classList.toggle('u-dnone', s.status.level !== 'overdue');
  },
};
