# FIX s552 — Aset ↔ Investasi: Link Resmi + Badge di Level List

Lanjutan sesi B (rekomendasi struktural) dari
`FIX-s551-asset-investasi-duplicate-name-owner-mismatch-audit.md`. Butir B.1
(rule data-health-check) sudah selesai di S551. Sesi ini mengerjakan B.2 & B.3.

## B.2 — Field link resmi `assetId` + `resolveInvestmentByAssetId()`

File: `modules/asset/investasi.js`

- Holding Investasi (`D.investments[]`) dapat field opsional baru `assetId`
  (default `null`, backward-compatible — holding lama otomatis `null`).
  Mirror persis pola `D.vehicles[].assetId` (S506) — 1 pointer satu arah ke
  `D.assets[].id`, **0 snapshot** nilai/owners, **0 SSOT baru**. Beda dari
  S506: tidak dibatasi `jenis==='Kendaraan'` (investasi bisa link ke aset
  jenis apa pun — sesuai kasus "Schorder" yang jenisnya Saham).
- Fungsi baru (pola sama persis `vehicle-core.js` S506/S507/S509c):
  - `resolveInvestmentAssetLink(assetId)` — validasi PURE, assetId harus ada
    di `D.assets`.
  - `resolveLinkedInvestmentAsset(h)` — delegasi tipis dari holding.
  - `resolveInvestmentByAssetId(assetId)` — arah BALIK (Aset → Investasi).
  - `investmentAssetLinkOptionsHtml(currentAssetId)` — opsi dropdown, aset
    yang sudah ditautkan ke holding lain disembunyikan.
- `addHolding()`/`updateHolding()` diperluas terima `assetId` (pola sama
  persis `custodianId`, falsy dinormalisasi ke `null`).

## Cross-check otomatis di kedua modal (bagian dari B.2)

- `assetInvestmentMismatch(a, h)` — bandingkan signature pemilik efektif via
  `MultiOwnerEngine.getOwners()` (0 rumus baru, reuse persis pola S551).
- `investmentCrossCheckWarning(h)` / `assetCrossCheckWarning(a)` — 1 titik
  baca dipakai baik oleh badge list (B.3) maupun bridge di dalam modal:
  prioritas link resmi (`assetId`) kalau ada, fallback ke name-match (pola
  S551) kalau holding/aset belum ditautkan resmi.
- `investmentModal` (`modules/shared/modals.js`): field baru "🔗 Hubungkan ke
  Buku Aset (opsional)" (`<select id="investAssetId">`) + kotak peringatan
  `#investAssetLinkWarning` yang otomatis muncul kalau kepemilikan beda —
  **tanpa perlu buka Buku Aset secara terpisah**.
- `InvestmentListUI` (`modules/asset/investasi-list-view.js`): wiring
  populate/simpan `assetId`, `onAssetLinkChange()` (preview warning saat
  dropdown diganti sebelum disimpan), `_renderAssetLinkWarning()`.

## B.3 — Badge di level list

- `modules/asset/investasi-list-view.js` (`_renderList()`): badge ⚠️ kecil
  di sebelah nama holding kalau `investmentCrossCheckWarning()` mengembalikan
  pesan — kelihatan langsung di daftar tab 💹 Investasi, tidak perlu buka
  modal.
- `modules/asset/aset.js` (`Aset.renderList()`): badge ⚠️ sama di sisi
  balik (daftar Buku Aset), pakai `assetCrossCheckWarning()`.
- Kedua badge pakai `title` (tooltip) berisi pesan lengkap, style border
  `var(--warning,#c77700)` — reuse token warna existing, 0 CSS baru.

## Data Health Check tambahan

File: `data-health-check.js`

- 1 rule baru: orphan check untuk `h.assetId` yang menunjuk aset yang sudah
  dihapus (pola sama persis orphan check `vehicle.assetId` S506). Level
  `warn`, murni baca, **0 auto-repair** (assetId TIDAK di-null-kan otomatis
  — itu tanggung jawab `InvestmentListUI.save()` kalau user edit ulang).
- Rule S551 (duplikat nama, owner beda) TIDAK diubah — tetap jalan apa
  adanya sebagai lapisan kedua untuk kasus yang belum ditautkan resmi.

## Cakupan sengaja DIBATASI (di luar scope sesi ini)

- Tidak ada bulk-fix/auto-link otomatis untuk data lama yang kebetulan nama
  sama — user tetap yang memilih tautkan lewat dropdown atau biarkan.

## Test
2 file test permanen ditambahkan (via harness `tests/helpers/loadSource.js`
yang sudah ada, pola sama persis `tests/vehicle-asset-bridge-s507.test.js` &
`tests/data-health-check-catalog-dup-s268.test.js`), total 34 test, semua ✅
(`node --test`):

- `tests/investasi-asset-link-badge-s552.test.js` (28 test) — cakupan fungsi
  murni di `modules/asset/investasi.js`: `resolveInvestmentAssetLink()`/
  `resolveLinkedInvestmentAsset()` (termasuk TIDAK dibatasi jenis aset, beda
  dari S506), `resolveInvestmentByAssetId()` (arah balik),
  `investmentAssetLinkOptionsHtml()` (aset yang sudah tertaut ke holding lain
  disembunyikan, currentAssetId sendiri tetap muncul & selected),
  `assetInvestmentMismatch()` (signature owner via MultiOwnerEngine),
  `investmentCrossCheckWarning()`/`assetCrossCheckWarning()` (prioritas link
  resmi > fallback name-match, orphan link tidak dianggap mismatch, read-only
  murni — tidak menulis field apa pun ke object aset/holding).
- `tests/data-health-check-investment-asset-link-orphan-s552.test.js` (6 test)
  — cakupan rule orphan `h.assetId` baru di `data-health-check.js` (warn kalau
  assetId menunjuk aset terhapus, TIDAK auto-null, TIDAK ikut ter-flag kalau
  belum punya assetId sama sekali), plus 1 test regresi memastikan rule S551
  (duplikat nama/owner beda) di file yang sama tidak berubah.

## Explicit confirmation

- ✅ `D.assets`/`D.investments` — 0 mutasi di luar field `assetId` baru
  (opsional, default `null`).
- ✅ `MultiOwnerEngine`/`OwnershipEngine` — 0 perubahan, murni dipanggil.
- ✅ Dana Titipan (`DanaTitipanPortfolioAPI`, `titipanCommitments`) — 0
  disentuh.
- ✅ Tidak ada cascade delete: hapus Aset tidak menghapus holding & sebaliknya
  (orphan link cukup di-warn, bukan dibersihkan otomatis).
- ✅ File-ordering constraint (`TitipanExpenseUI` sebelum
  `DanaTitipanCommitmentUI` di `dana-titipan-portfolio-presenter.js`, S521)
  tidak tersentuh sesi ini — file berbeda sama sekali.
