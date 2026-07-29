// modules/shared/backup-history-api.js — Backup History API (Data
// Management Core). Target: catat histori tiap kali proses backup
// dijalankan (sukses/sebagian/gagal), lalu sediakan API baca murni di
// atasnya.
//
// PRINSIP: REUSE alur backup yang SUDAH ADA (runFullBackup()/
// exportData()/runBackup() di modules/shared/backup-restore.js) — TIDAK
// ada mekanisme backup baru, TIDAK duplikasi logic pembuatan file
// backup. File ini murni menambah PENCATATAN (D.backupHistory, array
// baru — field baru di D, bukan struktur yang menimpa apa pun yang
// sudah ada) & API baca di atasnya (list/latest/summary), dipanggil
// oleh backup-restore.js lewat BackupHistoryAPI.recordEntry() persis di
// titik yang sudah menandai backup selesai (D.lastBackup=...), pola
// "tambahan murni" yang sama dgn *-api.js lain di codebase ini (mis.
// DebtOptimizerAPI — 100% reuse Debt/DebtStrategy, 0 rekalkulasi).
//
// Semua method di bawah TIDAK menyentuh DOM. recordEntry() SATU-
// SATUNYA method yang menulis (ke D.backupHistory) — sisanya read-only.
const BACKUP_HISTORY_MAX_ENTRIES = 50;

const BackupHistoryAPI = {

  // _ensure() — helper internal: pastikan D.backupHistory ada sbg
  // array (init kosong kalau belum pernah ada, mis. data lama sebelum
  // fitur ini). Guard `typeof D==='undefined'` — pola sama persis guard
  // `typeof Debt==='undefined'` di DebtOptimizerAPI._overview().
  _ensure() {
    if (typeof D === 'undefined' || !D) return null;
    if (!Array.isArray(D.backupHistory)) D.backupHistory = [];
    return D.backupHistory;
  },

  // recordEntry(entry) — dipanggil dari backup-restore.js tepat setelah
  // sebuah proses backup selesai (apa pun hasilnya). entry:
  //   { type: 'local'|'full'|'custom', status: 'success'|'partial'|'failed',
  //     done: [...], skipped: [...], errors: [...] }
  // Entri terbaru ditaruh di depan (index 0, urutan terbaru-dulu — pola
  // sama dgn D.backupHistory dipakai sbg log, bukan antrian), dipotong
  // ke BACKUP_HISTORY_MAX_ENTRIES entri terakhir supaya tidak tumbuh
  // tanpa batas di localStorage.
  recordEntry(entry) {
    const hist = this._ensure();
    if (!hist) return null;
    const rec = {
      id: 'bh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      type: (entry && entry.type) || 'unknown',
      status: (entry && entry.status) || 'unknown',
      done: (entry && Array.isArray(entry.done)) ? entry.done : [],
      skipped: (entry && Array.isArray(entry.skipped)) ? entry.skipped : [],
      errors: (entry && Array.isArray(entry.errors)) ? entry.errors : [],
    };
    hist.unshift(rec);
    if (hist.length > BACKUP_HISTORY_MAX_ENTRIES) hist.length = BACKUP_HISTORY_MAX_ENTRIES;
    return rec;
  },

  // list() — seluruh histori, terbaru dulu. Array kosong kalau belum
  // pernah ada backup tercatat (BUKAN null — aman langsung dipakai
  // .map()/.length oleh presenter tanpa guard tambahan).
  list() {
    return this._ensure() || [];
  },

  // latest() — entri paling baru, atau null kalau histori kosong.
  latest() {
    const hist = this.list();
    return hist.length ? hist[0] : null;
  },

  // clear() — kosongkan histori (dipakai mis. dari menu "Bersihkan
  // Histori Backup" kalau nanti ditambahkan di UI; tidak dipanggil
  // otomatis di mana pun sesi ini).
  clear() {
    if (typeof D === 'undefined' || !D) return;
    D.backupHistory = [];
  },

  // summary() — agregat murni dari list() (hitung status, 0 rumus
  // baru selain penjumlahan sederhana).
  summary() {
    const hist = this.list();
    const total = hist.length;
    let success = 0, partial = 0, failed = 0;
    for (const h of hist) {
      if (h.status === 'success') success++;
      else if (h.status === 'partial') partial++;
      else if (h.status === 'failed') failed++;
    }
    return { total, success, partial, failed, latest: this.latest() };
  },
};
