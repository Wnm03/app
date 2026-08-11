# Audit Klik S326 — Tagihan/Keuangan

## Temuan dari video + source

1. Tombol `✅ Bayar sekarang` pada kartu tagihan memang dirender dengan `data-action`.
2. Jalur lama langsung memanggil fungsi inti `markBillPaid`. Secara fungsi ini valid, tetapi kontrak klik tidak konsisten dengan aksi lain yang sudah memakai wrapper (`billActionPayAdvance`, `billActionEdit`, dll.).
3. `markBillPaid()` adalah async dan memiliki beberapa tahap prompt/konfirmasi. Karena tombol UI memanggil fungsi inti langsung, jalur klik lebih sulit diaudit/diinstrumentasi.
4. Dispatcher `data-action` sudah berjalan di capture phase dan sudah menangani Promise rejection. Jadi tidak ditemukan bukti bahwa masalahnya berasal dari event delegation secara umum.
5. Video juga memperlihatkan toast `Riwayat pembayaran cicilan ini tidak ditemukan...` saat alur edit cicilan disentuh. Itu adalah masalah terpisah dari tombol Bayar dan tidak boleh dicampur dengan patch klik ini.

## Implementasi

- Tambah wrapper `billActionPayNow(id)` di `modules/shared/action-wrappers.js`.
- Ubah semua tombol UI `Bayar sekarang` yang ditemukan pada renderer menjadi `data-action="billActionPayNow"`.
- Tambah regression test `tests/s326-click-action-pay-button.test.js` untuk memastikan kontrak tombol tidak kembali memanggil fungsi inti secara langsung.

## Rekomendasi lanjutan

- Uji manual minimal: wifi, tas, anak, STNK; tap `✅` sekali; pastikan dialog tanggal muncul; batalkan; ulangi dan pilih `Ya, Bayar`; pastikan transaksi tercatat dan kartu/reschedule berubah.
- Jangan menganggap toast edit cicilan sebagai kegagalan tombol Bayar; itu jalur berbeda.
- Untuk audit klik seluruh aplikasi, gunakan `modules/shared/smoke-test.js` sebagai coverage registry `data-action` dan lanjutkan dengan QA tap-per-modul untuk aksi yang mengubah data.
