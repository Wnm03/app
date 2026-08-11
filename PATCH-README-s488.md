# Patch Package — Sesi s488 (titipanCommitmentModal & titipanReturnModal ke sweep)

Isi zip ini adalah SEMUA file yang berubah dari baseline
`kw_release_v1216_s487-pmicons-badge-tagihan-utang.zip`, disusun dengan
struktur folder yang SAMA seperti di project asli. Tinggal salin/timpa
(overwrite) ke folder project Anda sesuai path masing-masing.

## Cara pakai
1. Backup dulu project Anda saat ini (jaga-jaga).
2. Salin semua file di dalam zip ini ke root folder project, timpa file
   lama dengan nama/path yang sama:
   - `CHANGELOG.md`
   - `app-bundle-a.min.js`
   - `app-bundle-b.min.js`
   - `app_production.html`
   - `chat-action-handlers.js`
   - `docs/COVERAGE-PER-MODULE.md`
   - `docs/FILE-MAP.md`
   - `docs/RELEASE-GATE-LOG.md`
   - `index.html`
   - `modules/shared/features-helpers-global-security.js`
   - `modules/shared/modals.js`
   - `modules/shared/modules-calc.js`
   - `modules/shared/modules-render.js`
   - `self-test.js`
   - `sw.js`
   - `s488-SESSION-NOTE.md` (file baru)
3. Reload aplikasi (hard refresh / clear cache) — `sw.js` sudah dibump
   ke `kw-cache-v1218` jadi cache lama otomatis kebuang.
4. Jalankan 🧪 Tes Buka/Tutup Modal (Beranda) untuk konfirmasi
   "119/119 modal aman · 0 bermasalah".

## Detail perubahan
Lihat `CHANGELOG.md` (entri Sesi 488 paling atas) dan
`s488-SESSION-NOTE.md` untuk penjelasan lengkap + daftar verifikasi
yang sudah dijalankan (full test suite 3178/3178 lolos, dll).

Kalau ingin lihat perubahan baris-per-baris tanpa menimpa file
langsung, pakai `PATCH-s488-titipan-modal-sweep-fix-CORE.patch` (diff
teks, tidak termasuk 2 bundle minified) atau versi lengkapnya
`PATCH-s488-titipan-modal-sweep-fix.patch` (termasuk bundle) yang
dikirim terpisah.
