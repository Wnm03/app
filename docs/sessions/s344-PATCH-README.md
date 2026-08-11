# Patch s344 — Fix label tombol ✏️ kartu "sudah dibayar periode ini" (tab Lunas Tagihan)

File yang berubah: `modules/shared/modules-render.js` (fungsi `renderBillItemHtml()`).

Perubahan: title/aria-label tombol ✏️ pada kartu duplikat `_paidPeriodOnly`
(tab Lunas, tagihan/cicilan/langganan AKTIF yang sudah dibayar periode ini)
diganti dari "Edit" (generik, menyesatkan — tombolnya sebenarnya membuka Edit
Transaksi lewat `openBillModal()->editTx()`) menjadi "Edit Pembayaran Bulan
Ini". 0 perubahan routing/logic, 0 file lain disentuh. Lihat `docs/CHECKPOINT.md`
§ Sesi 344 untuk detail lengkap root-cause & rationale.

Cara pakai: timpa `modules/shared/modules-render.js` di project kerja Anda
dengan versi di patch ini, lalu jalankan ulang `node scripts/build.js` seperti
biasa (bundle & versi ?v= akan dibuat ulang otomatis).
