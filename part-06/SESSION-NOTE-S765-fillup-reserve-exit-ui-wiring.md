# S765 — TASK-148 lanjutan: wiring `inReserve`/`literToExitReserve`/`costToExitReserve` (S764) ke modal `#fuelBarCorrectionModal`

## Konteks
`SESSION-NOTE-S764-fillup-cost-reserve-exit.md` (sesi S764) menyebut di bagian
"Tidak diubah": field baru `inReserve`/`literToExitReserve`/`costToExitReserve`
di `estimateFillUpCost()` murni ditambahkan di layer engine — UI
(`fuel-intelligence-ui.js` / `#fuelBarCorrectionModal`) TIDAK disentuh sesi
itu, wiring-nya jadi task terpisah. Sesi ini mengerjakan persis task terpisah
itu.

## Yang dikerjakan
Baris baru "❗ Sampai keluar reserve" ditambahkan ke live-preview
`#fuelBarCorrectionModal` (`FuelBarCorrection.selectBar()`,
`modules/vehicle/fuel-intelligence-ui.js`), tepat di bawah baris "Estimasi
isi sampai penuh" yang sudah ada dari S763 — **pola SAMA PERSIS**.

**0 rumus baru, 0 panggilan `FuelGaugeEngine` baru** — 100% REUSE `costRes`
(hasil `FuelGaugeEngine.estimateFillUpCost()`) yang SUDAH dihitung sekali
untuk baris "Estimasi isi sampai penuh" di atasnya; field
`inReserve`/`literToExitReserve`/`costToExitReserve` di objek yang sama itu
tinggal dibaca, tidak ada pemanggilan engine kedua.

**3 kondisi tampilan** (identik logikanya dengan baris fillCost, disesuaikan
untuk semantik reserve):
- `costRes.ok:true` & `costRes.inReserve:true` → baris tampil,
  `❗ Rp X (Y L)` via `fmtFull()` (guard typeof, pola sama persis baris lain
  di file ini).
- `costRes.ok:true` & `costRes.inReserve:false` (posisi saat ini di atas
  ambang reserve, termasuk kasus tangki sudah penuh) → baris disembunyikan
  — bukan error, memang tidak ada "sampai keluar reserve" yang relevan.
- `costRes.ok:false` (histori BBM belum cukup, ATAU `estimateFillUpCost`
  tidak ada sama sekali di versi `FuelGaugeEngine` yang dimuat) → baris ikut
  disembunyikan, konsisten dengan baris fillCost di atasnya.

## Markup
`modules/shared/modals.js` (`#fuelBarCorrectionModal`): 1 baris baru
`#fbcReserveExitRow`/`#fbcReserveExitLabel` di dalam `#fbcPreviewBox`, di
bawah `#fbcFillCostRow` yang sudah ada, disembunyikan (`display:none`)
secara default sampai `selectBar()` mengisinya — struktur & style identik
`#fbcFillCostRow` (dashed top border, flex row), warna label pakai
`--accent2` (beda dari `--accent` milik fillCost) supaya kedua baris
gampang dibedakan sekilas.

## Test
`tests/fuel-intelligence-ui.test.js` — 5 test baru mengikuti pola persis 4
test fillCost yang sudah ada (bar dalam reserve, bar di atas ambang reserve,
tangki penuh, `{ok:false}`, method tidak ada), plus `fakeGaugeEngine()` &
`makeFakeDoc()` diperluas (additive — 20 test lama TIDAK dimodifikasi, semua
tetap pass tanpa ubah assertion; 25→ total test di file ini).

## Full suite
Sebelum perubahan (base v1623, overlay app-main + `PATCH-s764...`):
5.907/5.907 pass.
Setelah perubahan: **5.912/5.912 pass, 0 fail** (net +5, sesuai 5 test baru
di atas).

## Build
`node scripts/verify-window-expose.js` → OK (81 modul, tidak ada yang perlu
expose baru).
`node scripts/build.js` → versi lama tertinggi 1623 → versi baru 1624.
`app-bundle-a.min.js`/`app-bundle-b.min.js`, `FILE-MAP.md`,
`COVERAGE-PER-MODULE.md`, dan 5 file konstanta versi (`modules-render.js`,
`modals.js`, `modules-calc.js`, `chat-action-handlers.js`,
`features-helpers-global-security.js`) disinkronkan otomatis oleh
`build.js` — 0 perubahan logic di luar versi pada 5 file itu.

## Release gate override
Sama seperti sesi-sesi sebelumnya: `npm run lint` (eslint) tidak bisa
dijalankan di sandbox ini (tanpa akses npm registry/internet). `esbuild`
juga tidak terpasang, jadi bundle hasil build TANPA minifikasi (lebih besar
dari versi production sebelumnya) — `node --check` mengonfirmasi sintaks
kedua bundle valid.

## File yang berubah sesi ini (kumulatif dari PATCH-s764-fuel-fillup-cost-reserve-exit-v1623)
- `modules/vehicle/fuel-intelligence-ui.js` — wiring baru di `selectBar()`
  (satu-satunya file logic UI yang diedit sesi ini).
- `modules/shared/modals.js` — markup baru `#fbcReserveExitRow` (di luar
  sinkronisasi versi otomatis, ini perubahan sengaja).
- `tests/fuel-intelligence-ui.test.js` — 5 test baru + extend fakeGaugeEngine/makeFakeDoc.
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `index.html`, `app_production.html`, `sw.js` — sinkronisasi versi
  1623→1624 (auto, `build.js`), 0 perubahan logic di luar itu.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — regenerated (build.js).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerated (build.js).

## Belum dikerjakan / tidak diubah
- Engine layer (`fuel-gauge-engine.js`) TIDAK disentuh sesi ini — pure UI
  wiring, sesuai scope yang diminta.
- Tidak ada perubahan pada `estimateFillUpCost()`, `getReserveStatus()`,
  atau method lain di `fuel-gauge-engine.js`.
