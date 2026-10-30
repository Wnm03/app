# FIX v1237 → v1238 — S506: Vehicle ↔ Asset Identity Link

## Baseline & Final Version
- Baseline: FULL RELEASE v1237 (`s505-asset-owner-quota`)
- Final: v1238 (`s506-vehicle-asset-identity-link`)
- Baseline regression: 3290/3290 PASS
- Final regression: 3302/3302 PASS (3290 baseline + 12 test baru)

## Keputusan Desain (dari audit sebelumnya, tidak diulang)
Option A: `D.vehicles[].assetId → D.assets.id`, relasi opsional, satu arah,
murni referensi. `D.vehicles` tetap SSOT operasional kendaraan, `D.assets`
tetap SSOT finansial/ownership. **Tidak ada snapshot data Asset ke Vehicle.**

## Files Changed
- `modules/vehicle/vehicle-core.js` — logic:
  - `resolveVehicleAssetLink(assetId)` — pure, validasi assetId harus ada di
    `D.assets` DAN `asset.jenis === 'Kendaraan'`, selain itu `null`.
  - `vehicleAssetLinkOptionsHtml(currentAssetId)` — pure, build `<option>`
    list (opsi pertama selalu "— Tidak terhubung —", sisanya hanya
    `D.assets` jenis Kendaraan).
  - `_populateVehAssetLinkSelect(v)` — DOM helper, dipanggil dari
    `openVehicleModal()` (v=null) & `editVehicle(i)` (v=existing).
  - `saveVehicle()` — baca `#vehAssetId`, validasi via
    `resolveVehicleAssetLink()`, simpan `v.assetId` kalau valid, `delete
    v.assetId` kalau "Tidak terhubung"/tidak valid (sama untuk create & edit
    branch).
- `modules/shared/modals.js` — tambah field "🔗 Hubungkan ke Buku Aset
  (opsional)" (`<select id="vehAssetId">`) di `vehicleModal`, setelah field
  Kepemilikan, sebelum tombol Simpan.
- `data-health-check.js` — 2 cek baru (level `warn`, murni baca, 0
  auto-repair):
  1. Orphan: `vehicle.assetId` menunjuk ke asset yang sudah dihapus.
  2. Duplicate link safety (§10): 1 entry Buku Aset ditautkan ke >1
     kendaraan.
- `tests/vehicle-asset-identity-link-s506.test.js` — test baru (pure
  function `resolveVehicleAssetLink`/`vehicleAssetLinkOptionsHtml`).
- `tests/data-health-check-vehicle-assetid-orphan-s506.test.js` — test baru
  (2 cek data-health-check di atas + non-mutation check).
- Version bump otomatis via `build.js` (5 file source: modules-render.js,
  modals.js, modules-calc.js, chat-action-handlers.js,
  features-helpers-global-security.js — HANYA konstanta versi berubah di 4
  file terakhir), `app-bundle-a/b.min.js`, `app_production.html`,
  `index.html`, `sw.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`
  (auto-generated).

## Schema Change
`D.vehicles[].assetId` — string, opsional, backward-compatible. Kendaraan
lama tanpa field ini tetap valid (tidak ada migration massal, tidak ada
perubahan ID kendaraan).

## UI Link
Modal Kelola Kendaraan → field baru "🔗 Hubungkan ke Buku Aset (opsional)",
sumber pilihan `D.assets.filter(a => a.jenis === 'Kendaraan')` saja
(Tanah/Rumah/Emas/Investasi/dst TIDAK ditampilkan). Opsi "— Tidak terhubung
—" untuk melepas link secara eksplisit.

## Orphan Check
`data-health-check.js` → level `warn` (bukan error yang blokir app), bukan
auto-repair/auto-delete/auto-null. Ditambahkan untuk: (1) assetId orphan,
(2) 1 asset ditautkan ke >1 kendaraan.

## Tests
8 test baru (`resolveVehicleAssetLink`/`vehicleAssetLinkOptionsHtml`) + 5
test baru (data-health-check orphan & duplicate-link) = 12 test baru total,
mencakup semua Test 1–8 dari prompt implementasi (existing vehicle tanpa
assetId tetap jalan, valid link resolve benar, wrong asset type ditolak,
missing asset tidak crash & terdeteksi orphan, delete vehicle tidak
menghapus asset, delete asset tidak menghapus vehicle & orphan terdeteksi,
Car Notes vehicleId tidak disentuh, isolasi ownership/MultiOwner/Dana
Titipan tidak disentuh — diverifikasi via diff guardrail di bawah, bukan
lewat unit test langsung karena fungsi-fungsi itu tidak diubah sama
sekali).

## Regression Result
```
node --test tests/*.test.js
# tests 3302
# pass 3302
# fail 0
```

## Explicit Confirmation (guardrail §17)
- ✅ `modules/asset/aset.js` — 0 perubahan (diverifikasi via diff terhadap
  baseline v1237, byte-identik).
- ✅ `OwnershipEngine` (`modules/shared/ownership-engine.js`) — 0 perubahan.
- ✅ `MultiOwnerEngine` (`modules/shared/multi-owner-engine.js`) — 0
  perubahan.
- ✅ Dana Titipan (`DanaTitipanPortfolioAPI`, `DanaTitipanPortfolioPresenter`,
  `titipanCommitments`, `allocatedExcluding()`) — 0 perubahan.
- ✅ Car Notes `vehicleId` (`D.bbmLogs[].vehicleId`, `D.servisLogs[].vehicleId`,
  `D.kmLogs[].vehicleId`, `car-notes.js`) — 0 perubahan.
- ✅ Tidak ada cascade delete: hapus Vehicle tidak menyentuh Asset, hapus
  Asset tidak menyentuh Vehicle (delVehicle() di vehicle-core.js dan alur
  hapus Aset di aset.js sama sekali tidak disentuh sesi ini).
- ✅ Tidak ada auto-create Asset dari Vehicle atau sebaliknya.
- ✅ 0 snapshot data (nama/nilai/owners) dari Asset ke Vehicle — hanya
  `assetId` (1 string ID) yang disimpan.
