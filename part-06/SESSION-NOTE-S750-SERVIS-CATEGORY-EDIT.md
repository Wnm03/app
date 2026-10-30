# S750 — Servis: edit kategori/komponen tanpa blokir odometer

Perubahan pada `car-notes.js`:
- Edit kategori/komponen dan field non-odometer tidak lagi menjalankan validasi urutan KM.
- Validasi odometer tetap dijalankan untuk tambah servis baru atau perubahan KM/tanggal.
- Nilai histori KM/tanggal tidak diubah oleh patch ini.
