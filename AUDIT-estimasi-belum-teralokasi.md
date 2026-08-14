# Audit: "Estimasi Belum Teralokasi" tidak sinkron dengan akun tertaut

## Laporan
Kartu Dana Titipan (owner "renov") menampilkan `Estimasi Belum Teralokasi`
sebesar Rp 1.106.630, padahal akun keuangan yang tertaut ke owner tersebut
("Porsi per Pemilik" di Riwayat Transaksi) sudah menghitung Modal −
Pengeluaran = Total dengan benar (Rp 11.140.000 − Rp 1.506.415 =
Rp 9.633.585).

## Root cause
`DanaTitipanPortfolioAPI.build()` di
`modules/finance/dana-titipan-aggregation-api.js` menghitung:

```
estimatedUnallocated = principalAmount − allocatedPrincipal
```

`allocatedPrincipal` HANYA menjumlah uang yang sudah masuk ke holding
investasi/aset (mis. beli saham Majoris). Uang yang sudah keluar sebagai
pengeluaran biasa di akun yang sama (renovasi, belanja mingguan — badge
"👤 Ditanggung: renov" di Riwayat Transaksi, field `t.deductionOwnerId`)
**tidak pernah dikurangkan**.

Angka pengeluaran itu sebenarnya SUDAH dihitung di tempat lain
(`_expenseComparisonForOwner()`, baris "Estimasi dari Transaksi <Akun>"
di `dana-titipan-portfolio-render.js`) — tapi hanya ditampilkan pasif
sebagai baris pembanding, tidak pernah menjadi input ke
`estimatedUnallocated`/`allocationStatus`. Akibatnya dashboard tetap
menampilkan "masih ada dana menganggur" padahal uangnya sudah habis
dibelanjakan.

## Fix
`modules/finance/dana-titipan-aggregation-api.js`:
- Tambah `_linkedExpenseTotalForOwner(o)` — reuse 100% relasi
  holding→akun + `resolveTxOwnerSplitForAccount()`/
  `resolveTxOwnerAssignment()` yang sudah ada (0 rumus split baru).
  Transaksi yang sudah ditandai `titipanLinkId` (jalur "💸 Catat
  Pengeluaran Dana Titipan") dikecualikan supaya tidak terhitung dobel
  dengan `usedTotal`.
- `build()` sekarang menghitung:
  ```
  spent = allocatedPrincipal + usedTotal + linkedExpenseTotal
  estimatedUnallocated = max(0, principalAmount − spent)
  allocationStatus = 'OVER_ALLOCATED' kalau spent > principalAmount
  ```
- `o.available` (field yang sudah ada tapi belum pernah dipakai UI) ikut
  diperbarui dengan komponen yang sama, untuk konsistensi.

`modules/finance/dana-titipan-portfolio-render.js`:
- Tidak diubah secara fungsional — `_expenseComparisonForOwner()`
  sengaja TETAP menghitung mandiri (bukan dialihkan membaca hasil
  `build()`) supaya kontrak test yang sudah ada
  (`tests/sC-titipan-majoris-expense-comparison.test.js`) tidak
  regresi. Ditambahkan komentar yang menjelaskan duplikasi ini sengaja,
  dan bahwa kedua fungsi harus diubah bersamaan kalau formulanya
  berubah lagi.

## Test
- `tests/patch-2026-08-14-titipan-unallocated-linked-expense.test.js`
  (baru) — 4 skenario: reproduksi bug laporan, kasus over-allocated,
  anti-doublecount dengan `titipanLinkId`, dan skenario tanpa
  pengeluaran (regresi nol).
- Full suite: 4236/4236 test pass (0 regresi) setelah fix.

## Catatan tambahan (ditemukan sesi 1, DITINDAKLANJUTI sesi 2 — lihat di bawah)
Ditemukan 1 sinyal pengeluaran KETIGA yang juga tidak disinkronkan:
`majorisRenovReconciliation()` (baris "Pengeluaran Majoris (dari
transaksi Renov)" di level total kartu) memfilter berdasarkan
`t.renovProjectLinkId`, bukan `deductionOwnerId` — jadi angkanya bisa
berbeda dari `linkedExpenseTotal` per-owner di atas untuk data yang
sama. Ini tetap murni informatif/aggregate (tidak memengaruhi
`estimatedUnallocated` per-owner).

## SESI 2 (PATCH-2026-08-14-b) — sinkronisasi sinyal ketiga

### Keputusan
Root cause sinyal ketiga: `t.renovProjectLinkId` ("🔨 Catat juga ke
Proyek Renovasi?") dan `t.deductionOwnerId` ("👤 Ditanggung: <owner>")
adalah DUA TAG SCOPE independen yang diisi user di alur berbeda —
transaksi bisa dapat satu tag tanpa yang lain. **Tidak disatukan jadi 1
rumus** (supaya 0 regresi terhadap kontrak `tests/s595-*.test.js`
B1-B9/C1-C4 yang sudah mengunci formula `renovProjectLinkId` persis) —
sebagai gantinya kedua angka ditampilkan berdampingan + ditandai kalau
tidak sinkron, supaya user sadar ada transaksi yang tag-nya tidak
konsisten (mis. dicatat "Ditanggung: renov" tapi lupa centang "Proyek
Renovasi", atau sebaliknya).

### Fix
`modules/finance/dana-titipan-aggregation-api.js`:
- `majorisRenovReconciliation()` — 0 rumus `pengeluaranMajoris`/
  `sisaSaldo` lama diubah. Ditambah field baru:
  - `deductionOwnerTotal` — SUM `o.linkedExpenseTotal` (hasil fix sesi
    1) untuk owner-owner yang holding-nya tertaut ke akun yang sama
    dengan `_majorisLinkedAccountIds()`. Angka pembanding apple-to-apple
    berbasis `deductionOwnerId`.
  - `synced` — `true` kalau `pengeluaranMajoris === deductionOwnerTotal`.

`modules/finance/dana-titipan-portfolio-render.js`:
- Baris baru (additive, di bawah "Sisa Saldo Majoris Belum Terpotong")
  muncul HANYA kalau `!majoris.synced`: peringatan kecil menunjukkan
  `deductionOwnerTotal` dan mengarahkan user cek tag "Proyek Renovasi"
  vs "Ditanggung". 0 baris lama diubah/dihapus.

### Test
- `tests/patch-2026-08-14-b-majoris-deductionowner-sync.test.js` (baru)
  — 6 skenario: sinkron (angka sama), tidak sinkron krn tag beda,
  owner belum lewat `build()` (0 crash), regresi-nol formula lama,
  render menampilkan peringatan, render tanpa pengeluaran tetap 0 baris.
- Full suite: 4242/4242 test pass (0 regresi) setelah fix.
