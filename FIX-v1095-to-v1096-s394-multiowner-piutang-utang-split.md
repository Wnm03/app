# FIX v1095 → v1096 — Sesi 394: MultiOwnerEngine × Piutang/Utang (Split Porsi)

## Target user
"Utang/Piutang — kalau mau konsisten, MultiOwnerEngine bisa dipakai juga
untuk split kewajiban/piutang yang terkait aset multi-owner, terpisah dari
'Dana Titipan' yang sudah ada."

## Apa yang berubah
- **Field baru (opsional)**: `assetId` di tiap entri `D.piutang[]` / `D.debts[]`
  — link ke aset multi-owner (`D.assets[].owners`, MultiOwnerEngine S390).
- **`resolveEntryAssetSelfPorsi(entry)`** (baru, `piutang-utang.js`): kalau
  entry ditautkan ke aset yang punya >1 pemilik, balikin porsi % SELF dari
  aset itu (`MultiOwnerEngine.selfPorsi()`). Tanpa `assetId` / aset
  single-owner / engine belum dimuat → fallback 100 (0 regresi).
- **`Piutang.totalValue()` / `Debt.totalValue()`**: sekarang mengalikan tiap
  entri dengan `resolveEntryAssetSelfPorsi(entry)/100`, bukan nilai penuh.
  Piutang/utang tanpa `assetId` (kasus umum) tetap dihitung 100% seperti
  sebelumnya.
- **UI modal Piutang/Utang**: field baru "Kaitkan ke Aset Multi-Owner
  (opsional)" — dropdown isi otomatis dari aset yang punya >1 pemilik
  (`getMultiOwnerAssets()`). Kalau dipilih & porsi < 100%, badge
  "👥 Porsi Anda X% dari aset multi-owner" muncul di daftar.

## Kenapa TERPISAH dari Dana Titipan (bukan extend)
Dana Titipan (`dana-kelolaan.js`, S195/S255) mengecualikan SELURUH entity
ber-ownership non-SELF (OwnershipEngine — 1 tipe kepemilikan per entity:
INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY). Fitur ini beda kasus: piutang/utang
yang porsinya mengikuti SPLIT porsi kepemilikan sebuah ASET terkait
(MultiOwnerEngine — bisa >1 pemilik, porsi pecahan bebas, mis. 70/30).
Kedua mekanisme jalan berdampingan, tidak saling menggantikan atau
menyentuh kode satu sama lain.

## Cakupan sesi ini (disiplin 1 task = 1 sesi)
- ✅ Field `assetId` + `resolveEntryAssetSelfPorsi()` + wiring `totalValue()`
  Piutang & Debt.
- ✅ UI: dropdown pilih aset multi-owner di modal Piutang/Utang + badge porsi
  di daftar.
- ❌ TIDAK ada split otomatis "siapa berutang ke siapa" per-pemilik non-SELF
  (mis. bikin piutang turunan ke pemilik lain) — itu perluasan lanjutan
  kalau diminta eksplisit sesi berikutnya.
- ❌ TIDAK mengubah `DanaKelolaan`/Dana Titipan sama sekali.

## File yang berubah
- `modules/finance/piutang-utang.js` — `resolveEntryAssetSelfPorsi()`,
  `getMultiOwnerAssets()`, `populateEntryAssetSelect()`, wiring
  `Piutang`/`Debt` (`openModal`/`save`/`totalValue`/`renderList`).
- `modules/shared/modals.js` — field baru di `piutangModal` & `debtModal`.
- `tests/multi-owner-piutang-debt-split-s394.test.js` (baru) — 8 test,
  cakupan fallback, porsi custom, aset single-owner, aset tidak ditemukan,
  `totalValue()` Piutang & Debt, `getMultiOwnerAssets()`, backward-compat.
- Bundle (`app-bundle-a.min.js`, `app-bundle-b.min.js`), versi (`index.html`,
  `app_production.html`, `sw.js`), dan file konstanta versi lain — hasil
  `node scripts/build.js`.

## Test
`npm test` → 2691 pass, 0 fail (termasuk 8 test baru sesi ini +
regresi Ownership Sync S255 & MultiOwnerEngine S390 tetap hijau).
`node scripts/verify-bundle-freshness.js` → bundle segar.
