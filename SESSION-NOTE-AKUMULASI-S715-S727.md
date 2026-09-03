# AKUMULASI S715–S727 — Kartu "💰 Proyeksi Kas Bulan Ini" & fix version-drift

Patch ini KUMULATIF & SELF-CONTAINED — berisi SEMUA perubahan dari S715 s/d S727
digabung jadi 1, tinggal apply 1x di atas base app-main (tidak perlu apply
v1533/v1534/.../v1545/v1546 satu-satu lagi). Menggantikan seluruh rangkaian
patch tsb.

## Cakupan sesi yang diakumulasi

| Sesi | Versi | Ringkasan |
|---|---|---|
| S715 | v1533 | Fix MODAL_VERSION drift (pre-existing, blocker build) |
| S717 | v1534 | Fitur baru: Proyeksi Pola Absen (`getAttendancePatternStats`, `getPolaAbsenProjection`) |
| S718 | v1535 | UI pengaturan limit minggu Pola Absen (5/10/15/20/26 minggu) |
| S719–720 | v1538 | Selesaikan Dana Titipan Pinjam-Utang (linkage, cascade edit/delete, grid row) — nutup 22 test pre-existing fail |
| S721 | v1539 | Audit kartu Proyeksi Kas: fix bug data (utang Titipan tak terhitung di proyeksi) + 6 quick-win presenter (saldo sekarang, MoM, dst) |
| S722 | v1540 | Sparkline tren proyeksi kas 6 bulan (mundur, dihitung ulang) |
| S723 | v1541 | Kalibrasi proyeksi vs realisasi (snapshot otomatis + verdict optimis/pesimis/akurat) |
| S724 | v1542 | Proyeksi multi-bulan ke depan (maju, saldo kumulatif) + notifikasi proaktif defisit |
| S725 | v1544 | Proyeksi lebih informatif: badge confidence per bulan, breakdown komponen defisit, estimasi hari kerja tambahan |
| S726 | v1545 | Rentang optimis/pesimis (band simetris dari `avgAbsPctError`) |
| **S727** | **v1546** | **Fix regresi baru: `MODULE_RENDER_VERSION` drift (kelas bug sama dgn S715), ditemukan saat audit build+test full-chain** |

Detail lengkap tiap sesi ada di SESSION-NOTE masing-masing (di riwayat patch
sebelumnya). Catatan ini hanya ringkasan + hasil verifikasi akhir gabungan.

## Verifikasi akhir (atas hasil akumulasi 30 file ini, di-apply ke base app-main)

- `node scripts/build.js` → **sukses**, 5 konstanta versi tersinkron, bundle valid
  (`node --check` lolos), versi konsisten di semua file.
- `node --test tests/*.test.js` (full suite) → **5447 pass, 0 fail** — 0 regresi,
  22 kegagalan lama (Dana Titipan/Pinjam-Utang, pre-existing sejak S715) sudah
  tertutup total sejak S719-720.
- `node scripts/verify-window-expose.js` → OK.
- `node scripts/verify-bundle-freshness.js` → OK.
- eslint tidak terpasang di sandbox audit (konsisten dgn environment constraint
  yang sudah didokumentasikan berulang kali di sesi-sesi sebelumnya).

## File dalam paket ini (30 file + docs regenerated)

`app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`, `index.html`,
`sw.js`, `chat-action-handlers.js`,
`modules/finance/cash-projection.js`, `cashflow-projection-settings.js`,
`dana-titipan-aggregation-api.js`, `deficit-notif-bridge.js`, `piutang-utang.js`,
`titipan-expense-ui.js`, `transaksi.js`, `tx-list-cashflow.js`,
`modules/shared/backup-restore.js`, `features-helpers-global-security.js`,
`modals.js`, `modules-calc.js`, `modules-render.js`,
`reminder-notif.js`, `scripts/build.js`,
8 file test baru/berubah di `tests/`,
`docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerated).

## Carry-forward (belum dikerjakan, masih terbuka utk sesi berikutnya)

Dari daftar saran "proyeksi lebih informatif" (audit S724), 2 dari 6 masih
carry-forward:
1. Integrasi income cobek/lumpang ke proyeksi kas.
2. Catatan/log pemicu perubahan proyeksi (kenapa angka proyeksi berubah dari
   waktu ke waktu).
