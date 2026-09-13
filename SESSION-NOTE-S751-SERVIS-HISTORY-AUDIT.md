# S751 — Audit lanjutan riwayat servis

- Memperbaiki edit kategori/komponen agar tidak menghitung ulang snapshot histori.
- Edit metadata-only mempertahankan `intervalKmAtService`, `intervalBulanAtService`, `nextDueKm`, `nextDueDate`, dan `nextDueAxis`.
- Perubahan KM/tanggal tetap menghitung ulang snapshot dan melewati validasi odometer.
- Menambahkan `editHistory` terbatas maksimal 50 entri untuk audit perubahan metadata.
- Seluruh isi patch sebelumnya dipertahankan.
