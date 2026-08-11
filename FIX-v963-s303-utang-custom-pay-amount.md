# Fix v963 (s303) — jumlah bayar custom utk Utang (pelunasan lebih besar dari cicilan tetap)

## Latar belakang

Lanjutan audit "sync 2 arah Ditanggung Bersama" (s297–s302). Item #3 dari
laporan sebelumnya (`FIX-v962-s302-arrears-nextdue-piutang-chip.md`), yang
saat itu sengaja belum dikerjakan.

## Bug

`markBillPaid()` utk `kind==='utang'` selalu pakai `b.amount` (cicilan
bulanan tetap) sbg jumlah bayar. Kalau user mau bayar sekaligus lebih besar
(mis. mau lunasin di muka), tidak ada jalur dari sisi Tagihan utk itu — harus
lewat Buku Utang edit `nilai` manual (terpisah dari alur bayar tagihan yang
biasa dipakai).

## Fix

**`modules/finance/tagihan-kalender.js`** — `markBillPaid()`: jalur bayar
BIASA (bukan `advance`/"Bayar Bulan Depan") khusus utk `b.kind==='utang'`
sekarang menampilkan 1 prompt tambahan **"Jumlah Pembayaran"**
(`showPromptModal`, `inputType:'number'`, default `b.amount`, tampilkan sisa
utang saat ini sbg info) SEBELUM prompt tanggal pembayaran yang sudah ada.
Nilai yang dientri (`payAmount`) dipakai konsisten utk:
- nominal transaksi pengeluaran yang dicatat (`D.transactions`), dan
- jumlah yang dikurangkan dari `D.debts[].nilai`.

Validasi hanya `> 0` (bukan dibatasi `<= sisa`) — kalau user isi lebih besar
dari sisa (overpay/pembulatan), `dbt.nilai` tetap di-clamp ke 0 seperti
perilaku existing (`Math.max(0, ...)`), utang langsung ditandai lunas &
tagihan diarsipkan. Kalau jumlahnya kurang dari sisa (bayar ekstra tapi belum
lunas), tagihan tetap aktif & `nextDue` dimajukan lewat `advanceBillNextDue()`
(s302) seperti pembayaran biasa.

**Kind lain (tagihan/langganan/cicilan) SENGAJA TIDAK diubah** — tetap
terkunci ke `b.amount` seperti sebelumnya (nominalnya memang sudah
pasti/terjadwal, beda dari utang yang sisa saldonya fleksibel & bisa dilunasi
sebagian besar kapan saja). Jalur `advance` (Bayar Bulan Depan) utk utang
juga tidak diubah — tetap pakai `b.amount`, karena fitur itu maksudnya "bayar
cicilan biasa lebih awal", bukan pelunasan.

## Test

`tests/s303-utang-custom-pay-amount.test.js` — 5 test baru murni-logika:
tanpa isi custom (perilaku lama tidak berubah), isi lebih besar dari cicilan
tapi < sisa (bill tetap aktif, sisa dikurangi sesuai jumlah custom), isi =
sisa persis (langsung lunas & diarsipkan), isi lebih besar dari sisa/overpay
(clamp ke 0, tetap lunas, tidak minus), dan kind lain (tagihan biasa) — pastikan
TIDAK kena prompt jumlah custom sama sekali.

`tests/s285-bill-lunas-tanggal-bayar.test.js` — sandbox extraction-nya
diupdate: tambah stub `parsePzNum` & ikut extract `advanceBillNextDue`
(dependency baru `markBillPaid()`, sudah perlu sejak s302 tapi baru kepakai
test ini di kind `utang`).

Full suite: **1969/1969 test lolos** (`node --test tests/*.test.js`), 0
regresi.

## Build

`node scripts/build.js s303-utang-custom-pay-amount` → sukses, `?v=963`,
`index.html`/`app_production.html` identik, sintaks kedua bundle valid
(`node --check`).

## Status audit "sync 2 arah Ditanggung Bersama" (update)

Ketiga item dari laporan lanjutan user (s302) sudah selesai:
1. ✅ nextDue basi saat nunggak 2+ periode (s302, `advanceBillNextDue`).
2. ✅ chip balik Tagihan→Piutang (s302, `getAutoPiutangIdForBill`).
3. ✅ jumlah bayar custom utk Utang (sesi ini, s303).
