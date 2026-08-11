# B9 — Fix dobel-hitung Aset↔Investasi di Financial Freedom Index (follow-up B8)

## Konteks
Dicatat di release notes B8 sebagai temuan belum disentuh: `FI.investmentAssetValue()`
(`modules/shared/modules-calc.js`, dipakai `FI.assetFund()` → Financial Freedom Index)
scope default `'zakatable'` punya filter **inline sendiri** (duplikat rumus dari
`Zakat.hitungMaal()`, BUKAN reuse `totalAssetValue()`/`Aset.totalValue()`) —
jadi tidak otomatis kebagian fix B8 dan masih dobel-hitung aset yang ditautkan
(`a.investmentId`, B1) ke holding zakatable.

Scope `'semua'` (baris pertama fungsi ini) **tidak perlu** disentuh — sudah
`return totalAssetValue()` yang sama dengan `Aset.totalValue()`, otomatis
kebagian fix B8.

## Perubahan
**`modules/shared/modules-calc.js` — `FI.investmentAssetValue()`**
Filter di scope `'zakatable'` ditambah `&&!a.investmentId`, pola sama persis
fix B8 di `Zakat.hitungMaal()`.

## Test
`tests/fi-investment-asset-value-doublecount-fix-b9.test.js` (4 test baru):
- Aset zakatable tanpa `investmentId` → tetap ikut (0 regresi).
- Aset zakatable + `investmentId` ke holding valid → dikecualikan.
- Aset zakatable + `_migratedToInvestmentId` (s476a) → tetap dikecualikan (0 regresi fix lama).
- Scope `'semua'` → otomatis exclude lewat `totalAssetValue()` (buktikan tidak perlu fix terpisah).

Full suite: **3846/3846 lulus, 0 regresi** (3842 baseline B8 + 4 test baru).

## Status audit B7/B8/B9 (Kekayaan Bersih, Zakat Maal, Financial Freedom Index)
Ketiga rumus yang menjumlah "aset zakatable/total" sekarang konsisten
mengecualikan aset yang ditautkan (`investmentId`) maupun yang termigrasi
penuh (`_migratedToInvestmentId`). Belum ada titik lain yang diketahui
punya pola filter serupa yang belum dicek.
