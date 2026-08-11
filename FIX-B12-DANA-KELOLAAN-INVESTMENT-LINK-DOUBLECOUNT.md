# B12 — Fix dobel-hitung Aset<->Investasi di Dana Kelolaan (follow-up B7-B9)

## Konteks
Audit lanjutan rekomendasi #2 (cek tempat lain yang mungkin masih baca
`a.nilai` langsung, bukan lewat `Aset.totalValue()`, setelah fix B8)
menemukan `modules/finance/dana-kelolaan.js` — modul "Dana Kelolaan"
(agregat dana pihak lain: INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY, dibuat
Sesi 195, SEBELUM fitur link B1 ada) punya pola dobel-hitung yang PERSIS
sama dengan kasus Kekayaan Bersih (B7-B9), dan persis sama juga dengan
bug S449 (akun tertaut ke Buku Aset) yang sudah pernah diperbaiki di modul
ini untuk sisi Akun.

`DanaKelolaan.byType(type) = sumAccounts(type) + sumAssets(type) +
sumInvestasi(type) + sumShop(type) + sumPiutang(type)`. Kalau ada ASET
non-SELF (mis. ownership INVESTOR) yang ditautkan lewat dropdown B1
(`a.investmentId`) ke HOLDING ber-ownership INVESTOR yang sama, nilainya
kehitung 2x: sekali di `sumAssets()` (`a.nilai`), sekali lagi di
`sumInvestasi()` (`Investment.holdingValue(h)`). Modul ini tidak reuse
`Aset.totalValue()` (formula sendiri, `a.nilai` apa adanya), jadi TIDAK
otomatis kebagian fix B8 -- gap yang sama persis dicatat di release notes
B9 untuk `FI.investmentAssetValue()`, kali ini titik yang belum diketahui
sebelumnya.

## Perubahan
**`modules/finance/dana-kelolaan.js` — `DanaKelolaan.sumAssets(type)`**
Tambah filter `.filter(a=>!a.investmentId)`, pola SAMA PERSIS Opsi A
`Aset.totalValue()` (B8): tidak validasi ulang ke `D.investments` tiap
hitung (aset dengan tautan orphan tetap dikecualikan sampai user melepas
tautannya di modal Aset). `sumInvestasi()` TIDAK diubah (sudah benar,
sisi Investasi jadi sumber kebenaran).

## Tidak diubah (sengaja, di luar cakupan)
- `sumTitipanAset()`/`sumTitipanInvestasi()` — sudah punya filter anti-dobel
  sendiri (`_resolveType===SELF`, dipisah dari `byType()` non-SELF),
  mekanisme beda dari bug ini, tidak tersentuh gap yang sama.
- 3 kandidat lain hasil audit yang BUKAN pola dobel-hitung (cuma baca
  `a.nilai` independen, tidak dijumlah bareng nilai investasi di total yang
  sama): `aset-keluarga.js` (nilaiTercatat kendaraan), `property-management-api.js`
  (breakdown portofolio properti), `invest-ai-widget.js` (widget saran AI)
  — berpotensi tidak sinkron TAMPILAN dengan Kekayaan Bersih kalau asetnya
  ditautkan, tapi bukan dobel-hitung nilai uang di 1 total yang sama.
  Kandidat sesi berikutnya kalau user mau ditutup juga.
- Audit bridge Kendaraan<->Aset (`vehAssetId`, S506/S507): DIKONFIRMASI
  BUKAN bug -- desain read-only tanpa snapshot nilai, 0 dobel-hitung.

## Test
`tests/dana-kelolaan-investment-link-doublecount-b12.test.js` (3 test baru,
harness `loadSource()` asli, pola sama persis
`tests/dana-kelolaan-linked-account-exclude-s449.test.js`):
- Aset tertaut ke holding ownership sama -> dikecualikan, `byType()` tidak
  dobel-hitung.
- Aset TIDAK tertaut -> tetap kehitung normal (0 regresi).
- Aset tertaut investmentId orphan -> tetap dikecualikan (pola Opsi A).

Regresi lokal: `tests/dana-kelolaan.test.js` +
`tests/dana-kelolaan-titipan-detail-s459.test.js` +
`tests/dana-kelolaan-linked-account-exclude-s449.test.js` — 27/27 lulus,
0 gagal. (Full suite project tidak dijalankan penuh di sesi ini karena
upload hanya berisi 1 snapshot _full session lama yang tidak lengkap di
luar cakupan finance/asset/investasi -- bukan dampak dari perubahan ini.)
