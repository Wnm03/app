# S2145 — Interval pengingat mengikuti penggantian komponen

## Temuan
Pengingat Slide Piece CVT masih mengambil baseline pemeriksaan 16.824 km walau ada riwayat penggantian 21.311 km. Master komponen menggunakan `actionMode: periksa` dan `gantiResetsInterval: null`, sehingga interval SOT berada pada sumbu pemeriksaan, bukan umur sejak penggantian.

## Perubahan
- `slide-piece-cvt`: `periksa-conditional`, `gantiResetsInterval: true`, interval 8.000 km dihitung sejak penggantian; tetap periksa berkala dan ganti bila aus.
- Audit pola sejenis menemukan dua komponen lain dengan interval pemeriksaan dan penggantian kondisional: `seal-driven-face` (12.000 km) dan `engine-mounting-bushing-arm` (12.000 km). Kebijakan reset diganti juga ditegaskan pada master.
- Perubahan dibuat pada `data/database-kategori-komponen-servis.json`, lalu file generated diregenerasi lewat `scripts/generate-service-master-data.js`; checksum baru dihasilkan generator.
- Ditambahkan regresi S2145 yang memverifikasi policy canonical, baseline riwayat ganti, next due 29.311 km, sisa 8.000 km.

## Batasan
Tidak ada migrasi atau modifikasi terhadap data servis pengguna. Efek berlaku saat aplikasi memakai master baru. Riwayat lama dengan `actionType` kosong/keliru tetap bergantung pada normalisasi tindakan yang sudah ada.
