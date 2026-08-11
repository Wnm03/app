# S328 — Fix Regression Klik Tagihan

## Temuan
Patch S326 mengganti handler native `markBillPaid`/`openBillHistory` dengan wrapper baru. Pada bundle yang belum direbuild, wrapper dapat tidak tersedia sehingga tombol Bayar/Riwayat tidak merespons.

## Perbaikan
Kembalikan mapping aksi Tagihan ke handler native:
- Bayar → `markBillPaid`
- Riwayat → `openBillHistory`

Wrapper S326 yang hanya diperlukan untuk substitusi tersebut dikeluarkan dari patch agar tidak menambah dependency runtime.

## Regression
Ditambahkan test yang memastikan kedua `data-action` tetap menggunakan handler native.

## Batasan
Patch ini tidak mengubah logika sinkronisasi S327 (hapus pembayaran/arsip).
