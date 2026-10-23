# Patch S2710 — deduplikasi pengingat part alias

## Akumulasi
Patch ini mempertahankan seluruh 17 file patch sebelumnya dan mengakumulasikan perubahan pada:
- `modules/vehicle/service-category-sot-reconciliation-s2007.js`
- `modules/vehicle/sparepart-servis.js`
- `tests/service-reminder-normalized-alias-dedupe-s2710.test.js`

## Perubahan
- Mencoba pencocokan alias terkontrol setelah nama persis gagal: menghapus catatan dalam kurung dan mengenali beberapa sufiks merek/spesifikasi yang umum (NGK, Denso, Iridium, 10W-30/10W-40/5W-30/5W-40).
- Komponen yang berhasil dipetakan menggunakan ID komponen kanonis.
- Kategori tak dikenal dideduplikasi memakai nama alias ternormalisasi dalam lingkup kendaraan, bukan ID kategori yang selalu unik.
- Tidak mengubah data historis atau menulis ulang kategori; proyeksi tetap read-only.

## Batas verifikasi
Ini patch sumber, bukan full release. Bundle minified tidak dibangun ulang dalam paket ini; perlu jalankan pipeline build bundle proyek sebelum rilis agar runtime produksi memakai perubahan sumber. Alias spesifikasi yang tidak tercakup aturan di atas masih perlu ditinjau dengan data backup nyata. Kunci tag notifikasi push belum diubah karena perlu menelusuri jalur notifikasi runtime yang sebenarnya dan menguji tag end-to-end; jangan anggap kasus notifikasi sudah selesai.
