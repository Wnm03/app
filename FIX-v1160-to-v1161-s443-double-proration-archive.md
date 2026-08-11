# FIX v1160 → v1161 (s443) — Bug Double-Proration di Edit Tagihan Lunas (Shared)

## Bug (BUG-FIN-003)
`getBillArchiveEditSource()` (modules/finance/tagihan-kalender.js) mengisi
field `#billAmt` di modal ✏️ Edit Tagihan (Lunas) dari `tx.amount`
(transaksi pembayaran terakhir). Untuk tagihan **shared**, `tx.amount`
cuma nyimpen **porsi sendiri** (bukan Total — lihat BUG-002 sesi 342).

Tapi `#billAmt` berlabel **"Jumlah Total per Periode"**, dan
`_saveBillInner()` SELALU mem-prorata isinya via `sharedPct`
(`rawAmt*sharedPct/100`).

Akibat: setiap kali user buka ✏️ Edit Tagihan (Lunas) pada tagihan shared
lalu Simpan (walau tanpa ubah apa pun), porsi tersimpan diprorata **dua
kali** — makin lama makin kecil.

Contoh: total 1.000.000, split 50/50 → porsi tersimpan 500.000. Buka +
Simpan sekali → jadi 250.000 (salah, seharusnya tetap 500.000).

## Fix
`getBillArchiveEditSource()` sekarang mengembalikan **Total** (dari
`b.totalAmount`, field yang tidak pernah diprorata) untuk tagihan shared,
bukan `tx.amount` (porsi). `tx.amount` tetap dipakai sebagai fallback
kalau `b.totalAmount` kosong (data lama), dan tetap dipakai apa adanya
untuk tagihan non-shared (tidak ada proses proration di sana, 0 regresi).

## File yang berubah
- `modules/finance/tagihan-kalender.js`

## Test
- `tests/tagihan-kalender-double-proration-archive-s443.test.js` (baru,
  2 test — reproduksi bug shared + guard 0-regresi non-shared)
- Full suite: 2902/2902 pass

## Build
- v1160 → v1161 (s443)
