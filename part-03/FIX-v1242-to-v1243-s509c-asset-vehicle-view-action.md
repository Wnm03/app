# FIX v1242 → v1243 — S509c: Asset → "Lihat di Kendaraan"

## Baseline & Final Version
- Baseline: FULL RELEASE v1242 (`s509b-vehicle-asset-view-action`)
- Final: v1243 (`s509c-asset-vehicle-view-action`)
- Baseline regression: 3336/3336 PASS
- Final regression: 3342/3342 PASS (3336 baseline + 6 test baru; 0 test lama
  diubah, 0 test dihapus)

## Purpose
Navigasi balik simetris dengan S509b: kalau sebuah Asset (`jenis==='Kendaraan'`)
sudah ditautkan oleh SATU `D.vehicles[]` (lewat `vehicle.assetId`), tampilkan
tombol "🚗 Lihat di Kendaraan" di `assetModal` yang membuka modal Kendaraan
yang bersangkutan.

## Keputusan Desain (dari PROMPT IMPLEMENTASI S509c, tidak diulang)
Resolver baru murni PURE (`resolveVehicleByAssetId`) ditambahkan di
`vehicle-core.js` (BUKAN di `aset.js`, sesuai HARD RULE arah kepemilikan
resolver tetap di modul vehicle) — arah BALIK dari `resolveVehicleAssetLink()`
(S506): cari `D.vehicles[]` mana yang `v.assetId`-nya menunjuk ke assetId
yang diberikan. TIDAK ada schema baru di `D.assets`/`D.vehicles`, TIDAK ada
index/cache baru (cukup `.find()` linear, sama pola resolver lain di file).
`vehicle.assetId` tetap satu-satunya pointer; Asset tetap SSOT finansial.

Modal Kendaraan existing (`editVehicle(i)`) butuh INDEX ASLI di `D.vehicles`,
bukan id — jadi navigasi lewat wrapper tipis `assetActionViewVehicle(vehicleId)`
di `action-wrappers.js` yang mencari index via `findIndex(sameId(...))`
sebelum memanggil `editVehicle(i)` (pola identik cara
`renderVehicleManageList()` di `modules-render.js` mengonversi object vehicle
jadi index untuk `data-args`). TIDAK ada modal baru, TIDAK ada router baru.

Beda dengan S509b: arah ini TIDAK punya konsep "orphan" — asset yang belum
ditautkan vehicle manapun adalah kondisi normal (bukan data rusak), jadi
TIDAK ada warning ketika tombol tidak tampil, container cukup disembunyikan
(`u-dnone`).

## Implementation
- `resolveVehicleByAssetId(assetId)` — resolver baru, PURE, di
  `vehicle-core.js`. Reuse `sameId()`, 0 rumus baru, 0 index/cache baru.
- `assetActionViewVehicle(vehicleId)` — wrapper tipis di
  `action-wrappers.js`, reuse `editVehicle(i)` existing (0 modal baru).
- `Aset._renderVehicleLinkAction(a)` — method render read-only baru di
  `aset.js`, dipanggil dari `Aset.openModal(id)` (pola identik
  `_renderTitipanSummary(a)`). Guard `typeof resolveVehicleByAssetId` (modul
  vehicle-core.js terpisah — pola sama guard `typeof MultiOwnerEngine`).
- `modules/shared/modals.js` — 1 container `<div id="assetVehicleLinkAction">`
  baru ditambahkan di template `assetModal`, tepat setelah
  `assetTitipanSummary`, sebelum tombol "⚖️ Atur Porsi Kepemilikan".
- `tests/asset-vehicle-view-action-s509c.test.js` — test baru (6), fokus ke
  `resolveVehicleByAssetId()` (fungsi pure yang bisa dites lewat
  `loadSource` harness): assetId kosong/null, tidak ada match, 1 match,
  banyak vehicle dgn hanya 1 match, edge case data kotor (assetId dipakai >1
  vehicle → balikin match pertama, tidak crash), `D.vehicles` kosong. Sesuai
  batasan `loadSource.js` (lihat catatan di file itu), rendering tombol di
  `assetModal` (baca/tulis DOM) dan wrapper `assetActionViewVehicle`
  (memanggil `editVehicle()` yang juga baca DOM) TIDAK dites otomatis di
  sini — sama batasan yang berlaku untuk `openVehicleModal`/`editVehicle` di
  test S506 — perlu verifikasi manual/smoke-test di browser.

## Tests
- Test baru: `tests/asset-vehicle-view-action-s509c.test.js` — 6/6 PASS
- Full regression: 3342/3342 PASS

## Regression
- Baseline v1242: 3336/3336 PASS
- Setelah S509c: 3342/3342 PASS (3336 + 6 baru, 0 lama diubah/dihapus)

## Guardrail
```
aset.js .............................. logic tambahan HANYA di
                                        _renderVehicleLinkAction() + 1 baris
                                        panggilan di openModal() (verified
                                        via diff)
MultiOwnerEngine ...................... UNCHANGED
OwnershipEngine ........................ UNCHANGED
DanaTitipanPortfolioAPI/presenter ...... UNCHANGED
Car Notes (car-notes.js) ............... UNCHANGED
```
Diverifikasi lewat `diff -rq` fresh baseline v1241 (baseline berantai s508→
s509b→s509c) vs hasil final: `modules/vehicle/vehicle-core.js`,
`modules/asset/aset.js`, `modules/shared/action-wrappers.js`,
`modules/shared/modals.js` (logic/template), dan
`tests/asset-vehicle-view-action-s509c.test.js` (test baru) yang berubah, di
luar file build standar (`app-bundle-*.min.js`, `index.html`,
`app_production.html`, `sw.js`, `chat-action-handlers.js`, 4 file konstanta
versi lain, `FILE-MAP.md`, `COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md`).

## Browser verification
NOT RUN — browser tidak tersedia di environment sesi ini. Tombol
"🚗 Lihat di Kendaraan" & wiring `data-action`/`data-args` belum pernah
benar-benar diklik di browser nyata — direkomendasikan verifikasi manual
sebelum dianggap selesai sepenuhnya (sama seperti dicatat di FIX S509b).

## Release Gate
`node scripts/verify-release-ready.js` LOLOS dengan 2 override manual
(lint & minify tidak tersedia di sandbox tanpa akses jaringan — eslint dan
esbuild tidak terpasang), dicatat via `CONFIRM_LINT_UNAVAILABLE_REASON` &
`CONFIRM_UNMINIFIED_REASON`. GATE html-sync: LOLOS tanpa override.
