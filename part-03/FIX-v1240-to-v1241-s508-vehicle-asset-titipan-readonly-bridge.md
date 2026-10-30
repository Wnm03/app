# FIX v1240 → v1241 — S508: Vehicle ↔ Asset Dana Titipan Read-Only Bridge

## Baseline & Final Version
- Baseline: FULL RELEASE v1240 (`s507-vehicle-asset-information-bridge`)
- Final: v1241 (`s508-vehicle-asset-titipan-readonly-bridge`)
- Baseline regression: 3316/3316 PASS
- Final regression: 3326/3326 PASS (3316 baseline + 10 test baru; 0 test lama
  diubah, 0 test dihapus)

## Keputusan Desain (dari PROMPT IMPLEMENTASI S508, tidak diulang)
Perluasan murni READ-ONLY dari bridge S507: kalau aset yang ter-link ke
kendaraan (`vehicle.assetId -> D.assets`) juga muncul di projection Dana
Titipan (`DanaTitipanPortfolioAPI.build()`, API existing S485c/S499 — TIDAK
diubah), tampilkan baris "Dana Titipan" tambahan di kartu Kelola Kendaraan.
0 rumus baru, 0 field baru di vehicle/asset, 0 SSOT baru — angka yang
ditampilkan adalah hasil `allocatedPrincipal` yang SUDAH dihitung sepenuhnya
oleh `build()` (via `_assetSplits()`/`MultiOwnerEngine.splitByPorsi()`),
cuma di-FILTER (`linkedAssetId===asset.id`) & DIJUMLAH lintas owner —
menjumlah beberapa baris yang sudah dihitung API BUKAN rumus baru (pola
sama persis `totals` reduce di dalam `build()` sendiri).

## Files Changed
- `modules/vehicle/vehicle-core.js`:
  - `resolveVehicleAssetTitipan(a)` — fungsi baru, PURE, READ-ONLY. Panggil
    `DanaTitipanPortfolioAPI.build()` (guard `typeof` — kalau module belum
    dimuat, balikin `null`, TIDAK crash), lalu filter+jumlah baris
    `holdings[]` (lintas semua owner di projection) yang
    `linkedAssetId===a.id`. Balikin `null` (bukan 0) kalau aset ini TIDAK
    muncul di holdings manapun (aset belum pernah diatur porsi titipan
    eksplisit, atau cuma dimiliki SELF) — caller menyembunyikan baris,
    BUKAN menampilkan "Rp 0" (sesuai guardrail §2 "data tidak tersedia ->
    STOP" diterapkan di level tampilan).
  - `vehAssetBridgeHtml(v)` — 1 baris tambahan (`titipanLine`) diselipkan
    setelah baris Kepemilikan (S507), sebelum penutup `</div>`, HANYA
    tampil kalau `resolveVehicleAssetTitipan()` balikin non-null. Baris
    Kepemilikan (S507)/Nilai (S507)/"Belum terhubung"/"⚠️ orphan" TIDAK
    berubah sama sekali.
- `tests/vehicle-asset-titipan-s508.test.js` — test baru (10): API belum
  dimuat (no crash), aset tidak muncul di projection (null, baris
  disembunyikan), jumlah lintas owner untuk assetId yang sama, tampil
  dgn format Rp, vehicle tanpa asset/orphan (baris titipan tetap
  tersembunyi, konsisten S507), read-only murni (0 mutasi ke
  vehicle/asset), dan 1 test integrasi end-to-end memakai
  `DanaTitipanPortfolioAPI`+`MultiOwnerEngine` REAL (bukan stub) dengan
  aset multi-owner.
- Version bump otomatis via `build.js` (pola sama S506/S507): konstanta
  versi di 5 file source, `app-bundle-a/b.min.js`, `app_production.html`,
  `index.html`, `sw.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`.

## UI
Modal Kelola Kendaraan (kartu tiap kendaraan, `renderVehicleManageList()`
-> `vehMetaText()` -> `vehAssetBridgeHtml()`), tanpa router/halaman baru:
- Aset ter-link TIDAK muncul di projection Dana Titipan -> baris "Dana
  Titipan" tidak tampil sama sekali (bridge S507 — "🔗 Terhubung ke Buku
  Aset" / Nilai / Kepemilikan — tetap tampil apa adanya).
- Aset ter-link MUNCUL di projection (>=1 owner titipan non-SELF dgn
  `owners[]` eksplisit di Buku Aset) -> baris tambahan "Dana Titipan:
  Rp X" muncul setelah baris Kepemilikan.

## Tests
10 test baru (`vehicle-asset-titipan-s508.test.js`) mencakup Test 1–9 dari
prompt implementasi yang relevan dgn scope S508 (vehicle tanpa asset,
asset valid dgn/tanpa titipan, multi-owner, orphan, asset bukan
kendaraan — sudah dicakup jalur S507 yang tidak berubah, no-crash kalau
API belum dimuat) plus 1 test integrasi wiring end-to-end. Test 8 (Car
Notes regression) & Test 9 (S507 regression, 3316 PASS) dibuktikan lewat
full run 3326/3326 PASS (3316 lama tetap pass tanpa 1 pun diubah).

## Regression Result
```
npm test
# tests 3326
# pass 3326
# fail 0
```

## Release Gate
`node scripts/verify-release-ready.js` — 2 gate (`lint`, `minify`) di-
override manual (sandbox tanpa akses jaringan npm registry, sama persis
kondisi build S507 sebelumnya — eslint/esbuild tidak bisa diinstall).
Alasan override tercatat di `docs/RELEASE-GATE-LOG.md`. Gate `html-sync`
lolos normal (`app_production.html` sinkron dgn `index.html`). Bundle
hasil build TANPA minifikasi (esbuild tidak ada) tapi lolos `node --check`
(sintaks valid).

## Explicit Confirmation (guardrail §FILE GUARDRAIL / §STOP CONDITIONS)
- ✅ `modules/asset/aset.js` — 0 perubahan.
- ✅ `modules/shared/multi-owner-engine.js` — 0 perubahan (hanya DIBACA,
  tidak langsung dipanggil dari kode baru S508 — dipanggil transitif lewat
  `DanaTitipanPortfolioAPI.build()` yang sudah memakainya sejak S499).
- ✅ `modules/shared/ownership-engine.js` — 0 perubahan.
- ✅ `modules/finance/dana-titipan-portfolio-presenter.js` — 0 perubahan
  (`DanaTitipanPortfolioAPI.build()` DIPANGGIL apa adanya, method publik
  yang sudah ada sejak S485c/S499 — 0 method/field baru ditambahkan ke
  API ini).
- ✅ Car Notes (`D.bbmLogs[]`, `D.servisLogs[]`, `D.kmLogs[]`,
  `vehicleId`) — 0 perubahan.
- ✅ Tidak ada rumus Dana Titipan baru — `allocatedPrincipal` per baris
  holding 100% berasal dari `build()`, S508 cuma filter+jumlah baris yang
  sudah match `assetId`.
- ✅ Tidak ada field baru di `D.vehicles[]`/`D.assets[]` (tidak ada
  snapshot/copy nilai titipan ke vehicle) — dibaca LIVE tiap render lewat
  `resolveVehicleAssetTitipan()`.
- ✅ Tidak ada SSOT/datastore/cache/registry baru.
- ✅ Test tidak pernah turun dari 3316 PASS di sepanjang sesi (3316 ->
  3326).

## S509 (belum dikerjakan, di luar scope S508)
Tidak ada kebutuhan STOP S509 di sesi ini — semua data yang dibutuhkan UI
S508 (nilai aset, ownership, Dana Titipan per aset) sudah tersedia lewat
API existing (`D.assets`, `MultiOwnerEngine.getOwners()`,
`DanaTitipanPortfolioAPI.build()`), tidak perlu rumus/SSOT/perubahan core
baru.
