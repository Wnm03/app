# Audit S256BF — Backup & Restore, pengujian aktual

Tanggal audit: 2026-10-15
Source yang diaudit: `app-main-S256BE-cumulative.zip` yang tersedia di workspace; perubahan audit diterapkan pada salinan kerja, bukan pada arsip input.

## Ringkasan

Audit menemukan dua jalur kegagalan UX/kejujuran status yang dapat diperbaiki tanpa mengubah format data backup:

1. `importData()` tidak memiliki handler `FileReader.onerror`/`onabort`. Jika pembacaan file gagal atau dibatalkan, input restore dapat tetap disabled dan label tetap dalam status busy. Sekarang semua jalur selesai menggunakan cleanup idempoten: sukses, JSON rusak, error baca, abort, atau exception sinkron `readAsText()`.
2. `exportData()`, `runFullBackup()`, dan `runBackup()` sebelumnya tidak memeriksa nilai balik `_downloadBackupBlob()`. Pada jalur ketika unduhan tidak dapat dimulai, UI masih dapat memperbarui `D.lastBackup`/riwayat seolah backup berhasil. Sekarang unduhan lokal harus mengembalikan nilai selain `false` sebelum backup ditandai sukses; status UI juga memakai null-guard pada elemen `lastBackup` dan `backupBadge`.

Perubahan tidak mengubah schema backup, format JSON/CSV, verifikasi SHA-256 payload, rekonsiliasi migrasi, atau mekanisme restore atomik IndexedDB.

## Alur aktual yang ditelusuri

### Backup penuh

`runFullBackup()` → `buildBackupPayload()` → flush recovery journal (AI/Service/Finance) → snapshot `D` + batch read IndexedDB auxiliary → validasi versi state/writer guard dan retry hingga 3 kali → seal payload bila tersedia → download JSON lokal → sinkronisasi Drive/Sheets bila terhubung → catat hasil parsial/sukses/gagal ke `BackupHistoryAPI` → `save()`.

### Restore penuh

`importData()` → validasi ekstensi/ukuran file bila hardening tersedia → baca JSON → `_validateRestoreShape()` → verifikasi integritas backup bila metadata ada → konfirmasi versi backup lebih baru bila perlu → snapshot state saat ini dan auxiliary IndexedDB → merge + migrasi → normalisasi/rekonsiliasi Car Notes dan Finance → validasi ownership/odometer/kategori → `_persistAtomicSnapshotWithAux()` → invalidasi cache → init ulang. Jika tahap restore gagal, state sebelumnya dipulihkan dan auxiliary store dikembalikan melalui jalur kompensasi; konflik lintas-tab ditangani terpisah.

### Backup custom

`runBackup()` → filter data menurut modul/periode → JSON atau CSV → mulai unduhan → hanya setelah unduhan berhasil, perbarui tanggal backup/riwayat dan tutup modal.

## Validasi yang dijalankan

- Backup/restore suite terarah: **203 lulus, 0 gagal, 0 skip**. Termasuk test backup snapshot consistency, restore atomicity/rollback, finance restore taxonomy, service restore integrity, cross-tab restore, dan test S256BF baru.
- `tests/s1901-backup-integrity-and-error-safety.test.js`: **3/3 lulus**.
- GROUP_B residency + S2552 bundle parity + S256BF: **11/11 lulus** setelah binary esbuild diberi permission executable di salinan kerja dan build resmi dijalankan.
- `npm run build` dengan `--require-minify`: **lulus**, esbuild aktif; bundle A 1017.6 KB dan bundle B 2427.8 KB, keduanya diminifikasi.
- `npm run verify-bundle`: lulus setelah build (hash marker source/bundle harus diverifikasi ulang saat pengemasan).
- `npm run audit:pwa`: lulus pada cache version build terbaru.
- `npm run audit:persistence`: lulus.
- `npm run audit:patch-integrity`: lulus sebelum perubahan audit ini; harus divalidasi lagi untuk patch baru.
- `npm run test:e2e`: **tidak dapat menyelesaikan browser E2E** karena browser policy mengembalikan `net::ERR_BLOCKED_BY_ADMINISTRATOR` saat navigasi origin lokal. Ini kendala lingkungan, bukan hasil pass aplikasi.
- `npm run test:full`: tidak selesai dalam batas waktu runner 10 menit; hasil suite penuh **belum terverifikasi**. Jangan menganggap hasil parsial sebagai full-suite pass.

## Batasan dan status

Audit menjalankan pengujian otomasi yang tersedia pada salinan kerja. Uji klik/unduh dan restore end-to-end di browser nyata masih terhalang kebijakan browser di lingkungan ini. Backup cloud (Google Drive/Sheets) tidak diuji terhadap akun eksternal; hanya jalur kode dan test lokal yang diperiksa.

**Status rilis: BELUM LAYAK DIRILIS** sampai full suite selesai, browser E2E dapat dijalankan di lingkungan yang mengizinkan localhost, dan backup file nyata dapat diunduh lalu di-restore kembali pada profil uji dengan data sintetis.


## Packaging / baseline-relative patch verification

- Baseline archive SHA-256: `6af914ad39b1e4bc938687da2ac8eeaade3c6088171cb92e014698d303f2fba1`.
- Baseline archive contained 3,080 files.
- Current tree comparison excludes `node_modules/` and `backups/`: 451 new files, 305 changed files, 1 deleted file, 2,774 identical files.
- The cumulative deletion manifest is retained; only `modules/shop/modules-render.js` is actually deleted relative to this baseline.
- The patch is intended to be applied to this exact baseline archive; do not apply it to a different baseline without recomputing the diff.
- Both ZIP archives are CRC-checked and the patch was applied in-memory to a baseline copy; the resulting non-excluded source paths match the current tree apart from patch-manifest metadata.
