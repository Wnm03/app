# PATCH s756+s767 — Fix Jenis BBM↔Harga sync + gate anti-bundle-basi permanen

Ini patch KUMULATIF, gabungan 2 sesi (apply cukup SEKALI dari kondisi zip
original kamu — tidak perlu apply patch v1625 sebelumnya lagi):

## S756 — Fix gejala yang kamu laporkan
Jenis BBM tidak sync ke Harga per Liter. Root cause: bundle produksi
(`app-bundle-a/b.min.js`) belum di-rebuild setelah source difix di Sesi
755. Fix: rebuild bundle dari source (tidak ada perubahan logika baru).
Detail lengkap: `SESSION-NOTE-S756-bundle-staleness-fuel-jenis-sync.md`.

## S767 — Fix supaya insiden SEJENIS tidak lolos lagi ke depannya
Ditemukan lewat audit lanjutan: skrip yang seharusnya menangkap bundle
basi (`scripts/verify-bundle-freshness.js`) sudah ada sejak lama, TAPI
gate wajib sebelum ZIP (`scripts/verify-release-ready.js`) tidak pernah
memanggilnya. Sekarang sudah disambungkan sbg Gate 5 (wajib, tidak bisa
di-override) — jadi kalau lupa rebuild bundle sebelum bikin ZIP, prosesnya
sendiri yang akan BLOCK, bukan menunggu ketahuan dari laporan user lagi.
Detail lengkap: `SESSION-NOTE-S767-bundle-freshness-gate-wired-into-release-check.md`.

## File yang diganti/ditambah (18)
Ganti (timpa) di lokasi yang sama persis:
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild
- `index.html`, `app_production.html` — `?v=1627`
- `sw.js` — `CACHE_NAME` `kw-cache-v1627`
- `chat-action-handlers.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js` — bump versi saja
- `scripts/verify-bundle-freshness.js` — refactor (fungsi
  `checkBundleFreshness()` diekspor, perilaku CLI tidak berubah)
- `scripts/verify-release-ready.js` — **Gate 5 baru: bundle-freshness**
- `docs/ZIP_RULES.md`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`
  — update dokumentasi

Baru (tambahkan):
- `tests/verify-release-ready-s767-bundle-freshness-gate.test.js`
- `SESSION-NOTE-S756-bundle-staleness-fuel-jenis-sync.md`
- `SESSION-NOTE-S767-bundle-freshness-gate-wired-into-release-check.md`

## Cara apply
Timpa/tambahkan 18 file di atas persis di posisi folder yang sama
(pertahankan `modules/shared/...`, `scripts/...`, `docs/...`,
`tests/...`). Upload SEMUA sekaligus.

## Verifikasi setelah apply
```
node scripts/build.js               # opsional, kalau mau rebuild ulang
node scripts/verify-bundle-freshness.js
node scripts/verify-release-ready.js
npm test
```
- `verify-bundle-freshness.js` & Gate 5 di `verify-release-ready.js` harus
  ✓ segar.
- `npm test` di environment saya: 5879/5882 lolos. 3 gagal adalah
  kegagalan PRA-EXISTING (gate SA16 soal atribut event inline) yang SUDAH
  ada sebelum patch ini — tidak disebabkan oleh patch ini, sudah
  dikonfirmasi dgn menjalankan test yg sama di zip original.
- Gate `lint`/`minify` di `verify-release-ready.js` kemungkinan BLOCK di
  sandbox tanpa akses npm (eslint/esbuild tidak terpasang) — ini batasan
  environment saya, bukan bug. Kalau kamu punya environment dgn akses
  internet, jalankan `npm install --save-dev eslint esbuild` lalu
  `node scripts/build.js` sekali lagi supaya rilis final ter-lint &
  ter-minify penuh.

Setelah apply, di browser: hard-refresh / clear cache PWA, lalu tes ulang
modal "Catat Isi BBM" — ganti Jenis BBM harus langsung update Harga per
Liter (dan Volume BBM kalau Total Biaya sudah diisi).
