# Sesi B7 — Deteksi Potensi Dobel-Hitung Nilai Aset↔Investasi di Kekayaan Bersih

Audit ringan, follow-up rekomendasi #1 pasca-B5 (RELEASE-NOTES-B1-B5). **Sesi ini
CUMA deteksi+beritahu, TIDAK mengubah rumus apa pun.**

## Temuan

`modules-calc.js` (`currentNetWorth()`/FI.hitung()):
```
totalAset = totalAssetValue() + Investment.selfOwnedTotalValue()
```
`Aset.totalValue()` (=`totalAssetValue()`) cuma exclude aset yang sudah ditandai
`_migratedToInvestmentId` (migrasi PENUH s476a — aset itu literally hilang dari
Buku Aset). Field `investmentId` dari B1 (link MANUAL, kedua record — Aset & Holding
— tetap sama-sama tampil) **belum** dikecualikan. Akibatnya: begitu user menautkan
Aset ke Holding Investasi lewat dropdown B1, nilai instrumen itu kena hitung 2x di
Kekayaan Bersih — `a.nilai` (lewat `totalAssetValue()`) DAN nilai holding tertaut
(lewat `Investment.selfOwnedTotalValue()`).

## Perubahan

`data-health-check.js`: 1 blok baru di dalam `(D.assets||[]).forEach()` (guard
`typeof Aset`), setelah cek orphan B6 — kalau `a.investmentId` menunjuk holding
yang MASIH ADA (bukan orphan, itu ranah B6), push issue `level:'warn'` yang
menjelaskan potensi dobel-hitung & nilainya masing-masing.

**SENGAJA tidak diputuskan sepihak di sesi ini:** formula mana yang dikecualikan
(exclude `a.nilai` pola `_migratedToInvestmentId`, ATAU exclude sisi holding, ATAU
biarkan user pilih per-aset) — itu keputusan produk yang perlu didiskusikan dulu,
krn beda dari `_migratedToInvestmentId` (aset hilang dr Buku Aset), link B1 sengaja
menampilkan KEDUA record berdampingan (rasionalnya: histori tetap kelihatan di
Buku Aset), jadi "exclude a.nilai" bisa bikin nilai di kartu Aset & di Kekayaan
Bersih tidak konsisten (kartu masih tampilkan nilai penuh, tapi tidak ikut dihitung).

## Test

`tests/data-health-check-asset-investment-doublecount-b7.test.js` (baru, 4 test):
tidak warn kalau tidak tertaut; warn (dgn nilai aset di detail) kalau tertaut ke
holding yang masih ada; tidak warn (double-count) kalau tautan orphan (itu ranah
cek B6, dipastikan tidak duplikat pesan); guard `typeof Aset` diam saja kalau
module belum dimuat.

## Regresi

Full suite (`tests/*.test.js`, 3840 test setelah B7) → **3840/3840 lulus, 0 regresi**.

## Sesi berikutnya (rekomendasi)

Keputusan produk: pilih 1 dari 3 opsi exclude di atas, lalu implementasikan +
update test regresi Kekayaan Bersih yang sudah ada (banyak file bergantung ke
`Aset.totalValue()`, lihat daftar consumer di `docs/FILE-MAP.md`/grep
`Aset.totalValue()`). Audit serupa juga perlu utk Zakat Maal
(`Zakat.hitungMaal()`) — kemungkinan akar masalah sama.
