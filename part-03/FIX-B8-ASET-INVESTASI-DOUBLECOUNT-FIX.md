# B8 — Fix dobel-hitung Aset↔Investasi (Opsi A, follow-up audit B7)

## Konteks
B7 (audit) mengonfirmasi: aset yang ditautkan ke Holding Investasi lewat
dropdown B1 (`a.investmentId`) nilainya ikut dihitung 2x — sekali lewat
`Aset.totalValue()` (Kekayaan Bersih), sekali lagi lewat
`Investment.selfOwnedTotalValue()` (holding tertaut). B7 sengaja cuma
mendeteksi, bukan memperbaiki rumus. 3 opsi trade-off dipresentasikan;
**Opsi A** (exclude sisi Aset, pola sama persis `_migratedToInvestmentId`
s476a) dipilih.

## Perubahan

**1. `modules/asset/aset.js` — `Aset.totalValue()`**
Tambah filter `.filter(a=>!a.investmentId)` (selain filter
`_migratedToInvestmentId` yang sudah ada). Begitu aset ditautkan lewat B1,
nilainya dianggap "milik" sisi Investasi — sama filosofi migrasi penuh
s476a, bedanya aset tidak hilang dari Buku Aset (link B1 sengaja
menampilkan kedua record berdampingan).
- Efek samping (diinginkan): sekaligus menghapus dobel-hitung yang sama di
  `AssetPortfolioAPI.portfolioComposition()` (assetValue vs investmentValue),
  karena keduanya reuse `Aset.totalValue()`.
- Field dicek keberadaannya (`a.investmentId`), BUKAN divalidasi ulang ke
  `D.investments` tiap hitung — sama sikap dengan `_migratedToInvestmentId`.
  Konsekuensi: aset dengan tautan **orphan** (holding sudah dihapus) juga
  ikut dikecualikan sampai user melepas tautannya di modal Aset.

**2. `modules/finance/pajak-pbb-zakat.js` — `Zakat.hitungMaal()`**
Filter `asetZakatable` ditambah `&&!a.investmentId` — mengatasi poin #4
audit (dobel-hitung Zakat Maal kalau kedua sisi `zakatable=true`). Kalau
user mau aset yang ditautkan tetap kena Zakat Maal, tandai `zakatable` di
sisi **holding**, bukan di aset yang sudah ditautkan.

**3. `data-health-check.js`**
- Warn B7 ("berpotensi dihitung 2x") **dihapus** — sudah tidak akurat
  setelah rumus diperbaiki.
- Teks warn B6 (orphan `investmentId`) **diupdate**: sekarang juga
  menyebutkan bahwa nilai aset untuk sementara tidak ikut dihitung di
  Kekayaan Bersih/Zakat Maal (konsekuensi baru dari fix ini), bukan cuma
  "baris bridge UI hilang" seperti sebelumnya.

## Test
- Test baru: `tests/asset-investment-doublecount-fix-b8.test.js` (4 test —
  `Aset.totalValue()` normal/ditautkan/orphan/campuran dengan
  `_migratedToInvestmentId`).
- `tests/pajak-pbb-zakat-crud.test.js`: +2 test (`hitungMaal()` exclude
  `investmentId` & `_migratedToInvestmentId`).
- `tests/data-health-check-asset-investmentid-orphan-b6.test.js`: assert
  teks baru (nilai aset & "Kekayaan Bersih" disebut di detail).
- `tests/data-health-check-asset-investment-doublecount-b7.test.js`
  **dihapus** (menguji warning yang sudah tidak ada).
- Full suite: **3842/3842 lulus, 0 gagal** (3840 baseline − 4 test B7 lama
  + 6 test baru B8).

## Tidak diubah (di luar cakupan sesi ini, dicatat sebagai temuan terkait)
`FI.investmentAssetValue()` (`modules/shared/modules-calc.js`, scope
"Hanya Zakatable" untuk Financial Freedom Index) punya pola filter yang
sama persis (`!a._migratedToInvestmentId`, belum ada `!a.investmentId`) —
kemungkinan gejala dobel-hitung yang sama untuk fitur FI. Belum disentuh
karena di luar rekomendasi #1/#4 yang disetujui user sesi ini — kandidat
sesi berikutnya kalau mau ditutup sekalian.
