# Patch: Tombol Aksi di Hasil Pemindaian Data (Data Health Check)

## File yang diubah
- `data-health-check.js` (SATU file saja, tidak ada file lain yang diubah)

## Apa yang ditambahkan
1. **Error "Transaksi Shop dengan produk tidak valid"**
   - Sekarang tampil tombol **🛒 Buka/Edit Transaksi Shop**.
   - Tombol ini reuse `Order.openEditModal(id)` yang sudah ada di
     `modules/shop/cobek-order.js` — modal itu sendiri sudah otomatis
     menampilkan tombol 🗑 Hapus Transaksi begitu dibuka dalam mode edit.
   - Jadi dari 1 tap, kamu bisa langsung lihat, edit, atau hapus transaksi
     Shop yang berisi produk yang sudah dihapus dari etalase.

2. **Warning "Stok sparepart tertaut ke part katalog yang sudah dihapus"**
   (ini yang muncul berkali-kali di screenshot kamu — COVER COMP. HEAD,
   GASKET CYLINDER HEAD COVER, WASHER SEALING 6.5MM, dst)
   - Sekarang tampil 2 tombol:
     - **✏️ Buka Stok** — buka item stok itu di modal edit biasa.
     - **🔓 Lepas Tautan Katalog** — aksi 1-tap: langsung menghapus tautan
       `catalogId` yang sudah rusak (data stok/jumlah/harga TIDAK ikut
       terhapus, cuma tautan ke Katalog Suku Cadang yang dilepas), lalu
       otomatis menyegarkan ulang daftar Hasil Pemindaian Data supaya
       kartu warning itu langsung hilang begitu selesai.

## Cara kerja teknis (ringkas)
- Ditambahkan field `actions: [{label, action, args}]` opsional di tiap
  issue. Renderer `dataHealthList` di bagian bawah file sekarang
  menggambar tombol untuk tiap `actions[]` di samping tombol "📦 Buka Aset"
  yang sudah ada sebelumnya (pola sama, 0 dispatcher baru untuk aksi
  "buka" — hanya aksi lepas-tautan yang baru: `DataHealth.unlinkStockCatalog`).
- 0 perubahan pada cek/level issue yang sudah ada, 0 auto-repair otomatis di
  luar aksi yang kamu tap sendiri.

## Rekomendasi perbaikan lain (belum diimplementasikan, untuk sesi berikutnya)
Pola tombol aksi generik (`actions[]`) ini sengaja dibuat supaya mudah
dipakai ulang. Kandidat berikutnya yang paling bermanfaat kalau mau
dilanjutkan:
- Semua warning "X tertaut ke Aset Multi-Owner yang sudah dihapus"
  (transaksi, piutang, utang) → tombol cepat "Lepas Tautan Aset".
- "Anggaran dengan kategori tidak valid" → tombol "Buka Anggaran".
- "Barang Prioritas Belanja kemungkinan duplikat" → tombol buka masing-
  masing item yang disebut.
- "Item Renovasi kehilangan transaksi tertaut" → tombol buka proyek terkait.
