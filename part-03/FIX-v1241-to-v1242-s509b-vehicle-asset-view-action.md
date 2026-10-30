# FIX v1241 → v1242 — S509b: Vehicle → "Lihat di Buku Aset"

## Baseline & Final Version
- Baseline: FULL RELEASE v1241 (`s508-vehicle-asset-titipan-readonly-bridge`)
- Final: v1242 (`s509b-vehicle-asset-view-action`)
- Baseline regression: 3326/3326 PASS
- Final regression: 3336/3336 PASS (3326 baseline + 10 test baru; 0 test lama
  diubah, 0 test dihapus)

## Purpose
Menambahkan navigasi langsung dari kendaraan yang sudah tertaut
(`D.vehicles[].assetId`) ke record Asset yang sudah ada — hasil audit S509:
«Tambahkan tombol/link "🔍 Lihat di Buku Aset" pada kartu/detail kendaraan
yang sudah memiliki `assetId` valid.»

## Keputusan Desain (dari PROMPT IMPLEMENTASI S509b, tidak diulang)
Enhancement UI kecil murni navigasi, dibangun di atas bridge S507/S508
(`vehAssetBridgeHtml(v)`). TIDAK ada schema baru di `D.vehicles`/`D.assets`,
TIDAK ada resolver kedua (reuse `resolveLinkedVehicleAsset()` S507 yang
delegasi ke `resolveVehicleAssetLink()` S506 — single validation path tetap
sama), TIDAK ada modal baru (reuse `Aset.openModal()` existing di
`modules/asset/aset.js` + dispatcher `data-action`/`data-args` generik yang
sudah ada di `features-helpers-global-security.js`). Tombol HANYA muncul
pada kondisi resolve sukses (asset ADA & `jenis==='Kendaraan'`) — pada
kondisi lain (assetId kosong, orphan/asset dihapus, atau asset ditemukan
tapi bukan jenis Kendaraan) TIDAK ada tombol sama sekali, sesuai §5 prompt.

## Implementation
- reuse `resolveLinkedVehicleAsset()` — 0 resolver baru
- reuse `Aset.openModal()` — 0 modal baru
- `data-action="Aset.openModal"` — action existing, 0 handler baru
- no new SSOT
- no new relationship
- no ownership sync
- no Dana Titipan logic
- no Car Notes changes

## Files Changed
- `modules/vehicle/vehicle-core.js`:
  - `vehAssetViewActionHtml(a)` — fungsi baru, PURE (tidak sentuh DOM/D).
    Bangun 1 tombol `<button data-action="Aset.openModal"
    data-args="[asset.id]">🔍 Lihat di Buku Aset</button>`, dipanggil HANYA
    dari `vehAssetBridgeHtml()` pada kondisi resolve sukses. `asset.id`
    di-escape lewat `escapeHtml(JSON.stringify(...))`, pola sama persis
    tombol `data-args` lain di codebase (mis. `chat-action.js`,
    `assetActionHistory` di `aset.js`).
  - `vehAssetBridgeHtml(v)` — 1 baris tambahan (`viewActionLine`) diselipkan
    setelah baris Dana Titipan (S508)/Kepemilikan (S507)/Nilai (S507),
    sebelum penutup `</div>`, HANYA pada kondisi resolve sukses. Baris
    "Belum terhubung ke Buku Aset" & warning "⚠️ Link Buku Aset tidak
    ditemukan" (assetId kosong/orphan/bukan Kendaraan) TIDAK berubah sama
    sekali — TIDAK ada tombol pada kondisi-kondisi itu.
- `tests/vehicle-asset-view-action-s509b.test.js` — test baru (10): tombol
  tidak ada tanpa assetId; tombol ada utk link valid; `data-action` benar;
  `data-args` berisi `asset.id` yang benar; tombol tidak ada utk orphan
  (warning tetap tampil); tombol tidak ada utk asset non-Kendaraan; asset id
  dgn karakter khusus tetap ter-escape aman (pakai `escapeHtml()` nyata);
  output S507/S508 existing tetap ada berdampingan; TIDAK ada snapshot field
  baru (`assetValue`/`assetOwners`/`titipanAmount`/`titipanPrincipal`/
  `titipanQuota`) ditulis ke object vehicle; action hanya memanggil
  `Aset.openModal`, tidak ada `data-action` lain di output.

## Tests
- Test baru: `tests/vehicle-asset-view-action-s509b.test.js` — 10/10 PASS
- Full regression: 3336/3336 PASS

## Regression
- Baseline v1241: 3326/3326 PASS
- Setelah S509b: 3336/3336 PASS (3326 + 10 baru, 0 lama diubah/dihapus)

## Guardrail
```
aset.js ........................... UNCHANGED
MultiOwnerEngine ................... UNCHANGED
OwnershipEngine ..................... UNCHANGED
DanaTitipanPortfolioAPI/presenter ... UNCHANGED
Car Notes (car-notes.js) ............ UNCHANGED
```
Diverifikasi lewat `diff -rq` fresh baseline v1241 vs hasil final: HANYA
`modules/vehicle/vehicle-core.js` (logic) &
`tests/vehicle-asset-view-action-s509b.test.js` (test baru) yang berubah,
di luar file build (`app-bundle-*.min.js`, `index.html`,
`app_production.html`, `sw.js`, `FILE-MAP.md`, `COVERAGE-PER-MODULE.md`) &
dokumen sesi ini.

## Browser verification
NOT RUN — browser tidak tersedia di environment sesi ini.

## Release Gate
`node scripts/verify-release-ready.js` LOLOS dengan 2 override manual
(lint & minify tidak tersedia di sandbox tanpa akses jaringan — eslint dan
esbuild tidak terpasang), dicatat via `CONFIRM_LINT_UNAVAILABLE_REASON` &
`CONFIRM_UNMINIFIED_REASON`. GATE html-sync: LOLOS tanpa override.
