# Audit S2361–S2363 — Deep Performance / Regression

## S2361 — Dashboard monthly income/expense

Temuan: `_renderCashProjectionCard()` membentuk `txM` dengan satu `filter()`, lalu memindai hasil tersebut dua kali lagi untuk income dan expense. Jalur ini aktif ketika `ctx.inc/ctx.exp` belum tersedia.

Perbaikan: parsing tanggal, guard `hitungKas`, dan agregasi income/expense digabung menjadi satu pass atas `D.transactions`. Jalur context yang sudah menyediakan `inc/exp` tidak berubah.

Kontrak dipertahankan:
- bulan/tahun target sama;
- `hitungKas:false` tetap dikeluarkan;
- transaksi tanpa `hitungKas` tetap dihitung;
- hanya `income` dan `expense` yang masuk agregasi;
- hasil numerik tetap mengikuti penjumlahan sebelumnya.

## S2362 — renderBillList

Temuan: `D.bills` dipindai terpisah untuk entri aktif dan `paidPeriodEntries`. Pada daftar tagihan besar, pekerjaan yang sama dilakukan dua kali.

Perbaikan: satu pass menghasilkan `activeBillEntries` dan `paidPeriodEntries`. Arsip tetap diproses terpisah dan urutan gabungan tetap `active -> archive -> paid-period`.

Kontrak dipertahankan:
- active entry tetap `_lunas:false` dan `_dateForFilter:b.nextDue`;
- paid-period entry tetap memakai `getBillPaidThisPeriodInfo()`;
- tanggal paid-period tetap ISO date;
- arsip tetap berada di antara active dan paid-period;
- filter berikutnya tetap bekerja terhadap bentuk objek yang sama.

## S2363 — Validasi regresi

Tes terfokus cash projection, calibration, bill history, dan kontrak baru dijalankan bersama. Tidak ada perubahan pada bundle produksi.

## Status

Source patch aman untuk diakumulasikan. Bundle produksi belum dibangun ulang sehingga patch ini tetap `SOURCE-NOT-RELEASE`.
