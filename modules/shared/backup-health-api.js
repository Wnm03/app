// modules/shared/backup-health-api.js — Backup Health API (Data
// Management Core). Target: status kesehatan backup (kapan terakhir,
// terlambat atau tidak) + keandalan (persentase sukses dari histori).
//
// PRINSIP: REUSE D.lastBackup (sumber sama yang sudah dipakai
// checkBackup() di modules/shared/backup-restore.js, ambang 7 hari
// SAMA PERSIS — TIDAK ada ambang baru yang bisa berbeda dari peringatan
// banner backup yang sudah ada) + BackupHistoryAPI.summary()
// (modules/shared/backup-history-api.js, sesi ini) — TIDAK ada
// duplikasi rumus/state baru di luar keduanya. Semua method PURE
// (read-only), TIDAK menyentuh DOM, TIDAK menulis ke D/localStorage.
const BACKUP_HEALTH_OVERDUE_DAYS = 7; // sama persis ambang checkBackup()

const BackupHealthAPI = {

  // daysSinceLastBackup() — null kalau belum pernah backup sama sekali
  // (D.lastBackup kosong), selain itu jumlah hari bulat ke bawah sejak
  // backup terakhir (rumus identik dgn checkBackup()).
  daysSinceLastBackup() {
    if (typeof D === 'undefined' || !D || !D.lastBackup) return null;
    const ms = new Date() - new Date(D.lastBackup);
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  },

  // status() — level: 'never' (belum pernah backup) | 'overdue' (>=7
  // hari, ambang SAMA dgn checkBackup()) | 'ok'.
  status() {
    const days = this.daysSinceLastBackup();
    if (days === null) {
      return { ok: true, level: 'never', days: null, label: 'Belum pernah backup' };
    }
    if (days >= BACKUP_HEALTH_OVERDUE_DAYS) {
      return { ok: true, level: 'overdue', days, label: 'Backup terlambat (' + days + ' hari lalu)' };
    }
    return { ok: true, level: 'ok', days, label: 'Backup aman (' + days + ' hari lalu)' };
  },

  // reliability() — derivatif murni dari BackupHistoryAPI.summary()
  // (histori backup, sesi ini) — persentase sukses dari histori yang
  // tercatat. successRate null kalau belum ada histori sama sekali
  // (BUKAN 0 — beda makna: "belum ada data" vs "0% sukses").
  reliability() {
    if (typeof BackupHistoryAPI === 'undefined') {
      return { ok: false, reason: 'BackupHistoryAPI belum dimuat' };
    }
    const s = BackupHistoryAPI.summary();
    if (!s.total) {
      return { ok: true, total: 0, success: 0, partial: 0, failed: 0, successRate: null };
    }
    const successRate = Math.round((s.success / s.total) * 100);
    return { ok: true, total: s.total, success: s.success, partial: s.partial, failed: s.failed, successRate };
  },

  // summary() — gabungan status() + reliability(), 1 titik akses yang
  // dipakai presenter (BackupHealthPresenter).
  summary() {
    return { status: this.status(), reliability: this.reliability() };
  },
};
