// modules/shared/backup-history-presenter.js — Backup History
// Presenter (Data Management Core). Lihat catatan lengkap di
// modules/shared/backup-history-api.js.
//
// PRINSIP: UI HANYA presenter. 100% REUSE `BackupHistoryAPI.list()`
// (modules/shared/backup-history-api.js, sesi ini) — TIDAK ada rumus
// baru, TIDAK membaca D.backupHistory langsung. Dipanggil dari
// renderSettings() (modules/shared/modules-render.js), pola guard sama
// persis presenter *-api.js lain di codebase ini.
const BACKUP_HISTORY_LIST_LIMIT = 10; // hanya tampilkan N entri terbaru di UI

const BackupHistoryPresenter = {

  render() {
    const el = document.getElementById('backupHistoryList');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof BackupHistoryAPI === 'undefined') {
      el.innerHTML = '<div class="u-fs12 u-ctext3">Histori backup belum tersedia</div>';
      return;
    }

    const list = BackupHistoryAPI.list().slice(0, BACKUP_HISTORY_LIST_LIMIT);
    if (!list.length) {
      el.innerHTML = '<div class="u-fs12 u-ctext3">Belum ada histori backup</div>';
      return;
    }

    el.innerHTML = list.map((h) => this._row(h)).join('');
  },

  // _row(h) — h = 1 entri dari BackupHistoryAPI.list(), dipakai APA
  // ADANYA (0 recompute status/tanggal).
  _row(h) {
    const dateStr = new Date(h.timestamp).toLocaleString('id-ID');
    const icon = h.status === 'success' ? '✅' : h.status === 'partial' ? '⚠️' : '❌';
    const doneText = (h.done && h.done.length) ? h.done.join(', ') : (h.type || '-');
    return `
      <div class="bh-row">
        <div class="bh-row-icon">${icon}</div>
        <div class="bh-row-body">
          <div class="bh-row-date u-fs12 u-fw600">${escapeHtml(dateStr)}</div>
          <div class="bh-row-detail u-fs11 u-ctext3">${escapeHtml(doneText)}</div>
        </div>
      </div>
    `;
  },
};
