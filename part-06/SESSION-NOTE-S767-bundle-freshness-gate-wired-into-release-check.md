# S767 — Fix: `verify-bundle-freshness.js` sekarang wajib jalan otomatis
# lewat `verify-release-ready.js` (gate WAJIB sebelum ZIP)

## Konteks
Lanjutan dari S756 (`SESSION-NOTE-S756-bundle-staleness-fuel-jenis-sync.md`):
bundle produksi (`app-bundle-a.min.js`/`-b.min.js`) sempat basi (belum
di-rebuild) padahal source sudah benar. Fix S756 sudah menyelesaikan
gejalanya (rebuild bundle), tapi belum menutup CELAH proses yang
memungkinkan itu terjadi.

## Gejala/celah yang ditemukan (audit, bukan laporan user baru)
`scripts/verify-bundle-freshness.js` (skrip yang justru mendeteksi bundle
basi) sudah ada sejak Sesi 365, TAPI:
- Ia cuma bisa dijalankan manual lewat `npm run verify-bundle`.
- `scripts/verify-release-ready.js` — satu-satunya gate yang **WAJIB**
  dijalankan sebelum bikin ZIP menurut `docs/ZIP_RULES.md` — TIDAK PERNAH
  memanggilnya sama sekali. Gate itu cuma mengecek lint, minifikasi,
  sinkronisasi HTML, dan sinkronisasi versi cache — bundle-freshness
  luput total dari daftar itu.

Akibatnya: walau `npm run release-check` dijalankan & LOLOS, bundle basi
tetap bisa lolos ke ZIP kalau orangnya lupa menjalankan `npm run
verify-bundle` secara terpisah — persis yang terjadi di S756. Gate "wajib"
itu sendiri tidak benar-benar mencegah pola bug yang jadi alasan awal
`verify-bundle-freshness.js` dibuat (insiden S326→S328).

## Fix
- `scripts/verify-bundle-freshness.js` — logic inti diekstrak jadi fungsi
  murni `checkBundleFreshness()` (return array hasil per-bundle, tanpa
  `console.log`/`process.exit`) supaya bisa dipanggil dari modul lain.
  `main()` (CLI) tetap punya perilaku identik seperti sebelumnya (exit 1
  kalau ada yang basi).
- `scripts/verify-release-ready.js` — tambah **Gate 5: bundle-freshness**,
  memanggil `checkBundleFreshness()` langsung. Kalau ada bundle basi/
  hilang/belum punya marker hash → BLOCK, masuk daftar `blocking`.
  **TIDAK ADA jalur override** (beda dari gate lint/minify) — ini bukan
  batasan environment (seperti eslint/esbuild yang butuh network), cuma
  perlu `node scripts/build.js` yang selalu tersedia offline.
- `docs/ZIP_RULES.md` — didokumentasikan ulang: sekarang 5 gate (sebelumnya
  dokumen cuma menyebut 3, padahal Gate 4 version-sync sudah ada sejak
  Sesi 575 tapi juga belum pernah didokumentasikan di sini — sekalian
  dirapikan).
- Test baru: `tests/verify-release-ready-s767-bundle-freshness-gate.test.js`
  — memverifikasi gate benar-benar terpanggil di `main()`, tidak overridable,
  dan `checkBundleFreshness()` melapor "fresh" utk repo asli saat ini.

## Verifikasi
- `node scripts/build.js` — build sukses, versi naik ke 1626.
- `npm test` — 5879/5882 pass. 3 gagal adalah kegagalan **PRA-EXISTING**
  (gate SA16 soal atribut event inline di `modules-render.js`) yang sudah
  ada di zip asli sebelum sesi ini dimulai — dikonfirmasi dengan menjalankan
  `npm test` juga di salinan zip original (hasil sama persis: 3 gagal,
  file & nama test sama). Bukan disebabkan oleh perubahan sesi ini, di
  luar scope (1 sesi = 1 task).
- Simulasi regresi manual: tempel header
  `// __BUNDLE_SRC_HASH__:deadbeefdeadbeef` palsu ke
  `app-bundle-a.min.js`, jalankan `node scripts/verify-release-ready.js`
  → **Gate bundle-freshness BLOCK** dgn pesan jelas & tidak ada opsi
  override. Kembalikan bundle asli → gate lolos lagi. Ini membuktikan pola
  bug S756 sekarang akan otomatis terdeteksi & mencegah ZIP dibuat, bukan
  cuma terdeteksi kalau seseorang ingat menjalankan skrip terpisah.

## Catatan
Gate lint & minify di sandbox ini tetap BLOCK (eslint/esbuild tidak
tersedia, tidak ada akses jaringan/npm — `npm install` gagal 403). Ini
batasan environment yang sudah ada sejak sebelum sesi ini, bukan
disebabkan oleh perubahan sesi ini. Override manual
(`CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`) tersedia
kalau memang mau lanjut ZIP dari sandbox ini; disarankan tetap jalankan
`npm install --save-dev eslint esbuild && node scripts/build.js` sekali di
environment yang ada akses internet supaya rilis final ter-lint & ter-minify
penuh.
