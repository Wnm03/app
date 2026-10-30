# FIX v1238 → v1240 — S507: Vehicle ↔ Asset Read-Only Bridge

## Baseline & Final Version
- Baseline: FULL RELEASE v1238 (`s506-vehicle-asset-identity-link`)
- Final: v1240 (`s507-vehicle-asset-information-bridge`)
- Baseline regression: 3302/3302 PASS
- Final regression: 3316/3316 PASS (3302 baseline + 14 test baru; 4 test
  lama diupdate assertion-nya, lihat "Tests" di bawah — 0 test dihapus)

## Keputusan Desain (dari PROMPT IMPLEMENTASI S507, tidak diulang)
Bridge murni READ-ONLY: baca `vehicle.assetId` -> `D.assets` LIVE tiap
render, TIDAK ada field baru di vehicle (assetValue/assetOwners/ownership
snapshot/titipan snapshot), TIDAK ada copy data, TIDAK ada SSOT/datastore/
cache/registry baru. `D.vehicles` tetap SSOT operasional, `D.assets` tetap
SSOT finansial.

## Files Changed
- `modules/vehicle/vehicle-core.js`:
  - `resolveLinkedVehicleAsset(vehicle)` — pure, delegasi ke
    `resolveVehicleAssetLink()` (S506, tidak diubah) supaya validasi asset
    ada + `jenis==='Kendaraan'` tetap 1 sumber logic.
  - `vehAssetBridgeHtml(v)` — pure, bangun potongan HTML: "Belum terhubung"
    / warning orphan / "🔗 Terhubung ke Buku Aset" + nilai (`fmtFull`,
    reuse `format-tema.js`) + ringkasan porsi kalau multi-owner
    (`MultiOwnerEngine.getOwners()`, reuse S390/406b, 0 rumus baru; baris
    Kepemilikan disembunyikan kalau single-owner porsi 100%).
  - `vehMetaText()` — 1 baris tambahan (`assetBridge`) diselipkan di
    posisi terakhir tiap jenis (motor/mobil/listrik), additive di atas
    teks S506 (ownText/capTag/ownDetail tidak berubah urutan/isinya).
- `tests/vehicle-asset-bridge-s507.test.js` — test baru (14): orphan,
  asset non-kendaraan, multi-owner, single-owner (no ownership line), live
  read (bukan snapshot), 0 mutasi ke object vehicle, integrasi
  `vehMetaText()` per jenis.
- `tests/vehicle-jenis.test.js` — 4 assertion `assert.equal` (exact-string,
  S506-era) diupdate jadi `assert.match` prefix-check + cek kehadiran baris
  bridge baru, supaya tetap membuktikan teks interval/oli LAMA tidak
  berubah sama sekali, sekaligus mengakomodasi baris tambahan additive
  S507. 0 assertion lain di file ini disentuh.
- Version bump otomatis via `build.js` (pola sama S506): konstanta versi di
  5 file source, `app-bundle-a/b.min.js`, `app_production.html`,
  `index.html`, `sw.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`.

## UI
Modal Kelola Kendaraan (kartu tiap kendaraan, `renderVehicleManageList()`
-> `vehMetaText()`), tanpa router/halaman baru:
- Tidak ada `assetId` -> "Belum terhubung ke Buku Aset"
- `assetId` orphan (asset dihapus / jenis berubah dari Kendaraan) ->
  "⚠️ Link Buku Aset tidak ditemukan" — `assetId` TIDAK dihapus otomatis.
- `assetId` valid -> "🔗 Terhubung ke Buku Aset", nilai aset, dan (kalau
  multi-owner) ringkasan porsi "70% Budi · 30% Ayah".

## Tests
14 test baru (`vehicle-asset-bridge-s507.test.js`) mencakup semua Test 1–7
dari prompt implementasi: (1) vehicle tanpa assetId normal, (2) asset valid
tampil info, (3) asset non-kendaraan diperlakukan sama dgn orphan (ignore),
(4) orphan -> warning tanpa auto-delete, (5) multi-owner tampil benar, (6)
tidak ada mutasi ke record vehicle (Car Notes/vehicle fields tidak
tersentuh), (7) regresi S506 — dibuktikan lewat full run 3316/3316 pass
(3302 lama tetap pass, termasuk 4 yang assertion-nya diupdate tanpa
mengubah apa yang divalidasi).

## Regression Result
```
npm test
# tests 3316
# pass 3316
# fail 0
```

## Explicit Confirmation (guardrail §STOP CONDITIONS)
- ✅ `modules/asset/aset.js` — 0 perubahan.
- ✅ `MultiOwnerEngine` (`modules/shared/multi-owner-engine.js`) — 0
  perubahan (hanya DIBACA via `getOwners()`, method publik yang sudah ada).
- ✅ `OwnershipEngine` — 0 perubahan.
- ✅ Car Notes (`D.bbmLogs[]`, `D.servisLogs[]`, `D.kmLogs[]`,
  `vehicleId`) — 0 perubahan, tidak ada `assetId` ditambahkan ke log manapun.
- ✅ Tidak ada SSOT/datastore/cache/registry/array relasi baru — hanya
  `vehicle.assetId -> D.assets.id` (S506, tidak diubah).
- ✅ Tidak ada router baru — bridge tampil di kartu Kelola Kendaraan yang
  sudah ada (`vehicleModal` / `vehicleManageList`).
- ✅ Tidak ada perubahan ke Dana Titipan API/field — status titipan tidak
  disentuh sama sekali sesi ini (di luar scope §G prompt, tidak ada
  kebutuhan sampai butuh perubahan core -> S508).
- ✅ Test tidak pernah turun dari 3302 PASS di sepanjang sesi (3302 -> 3316).
