# S619 — Fix: toast lama menutupi tombol saat pindah tab (audit video user, tab Investasi)

Audit video screen recording user (`Screenrecorder-2026-08-30-08-29-34-212.mp4`): terlihat
notifikasi toast (mis. "📝 Nominal sudah diisi...", "↺ \"__selftest_barang_3__\" dikembalikan
ke daftar Prioritas Belanja", "✅ Harga Jual (& Reseller kalau kosong) terisi dari
rekomendasi") tetap tampil & mengantre menutupi tombol **"+ TAMBAH HOLDING"** dan item-item
di **Daftar Holding** setelah user pindah ke tab Investasi (Aset → Investasi).

## Root cause

`toast()`/`toastUndo()` (`modules/shared/format-tema.js`) murni berbasis waktu — antrean
`_toastQueue` & timer `_toastHideTimer`/`_toastGapTimer` tidak pernah tahu kalau konteks
halaman/tab sudah berganti. Toast dari aksi di halaman SEBELUMNYA (mis. simpan transaksi di
Beranda) terus mengantre & tampil satu-per-satu meski user sudah pindah ke tab lain, numpang
lewat di atas konten & tombol tab baru krn `.toast{position:fixed;bottom:100px}` (styles.css)
selalu di atas seluruh halaman.

## Fix

1. **`modules/shared/format-tema.js`** — fungsi baru `dismissAllToasts()`: kosongkan
   `_toastQueue`, batalkan timer show/gap yang berjalan, sembunyikan toast yang sedang
   tampil (tanpa animasi, konsisten dgn pola paksa-tutup overlay di `showPage()`). 0
   perubahan ke `toast()`/`toastUndo()`/API existing — pemanggil lama (900+ titik) 100%
   tidak terpengaruh.
2. **`modules/asset/aset-misc.js`** (`setAsetTab`) — panggil `dismissAllToasts()` di baris
   paling awal, sebelum toggle pane. Ini titik pasti direproduksi di video (ganti sub-tab
   Aset, termasuk ke Investasi).
3. **`modules/shared/modal-navigasi.js`** (`showPage`) — panggil `dismissAllToasts()` di
   titik yang sama dengan paksa-tutup overlay yang nyangkut (pindah tab bawah
   Beranda/Uang/Shop/Aset/Mobil/Pajak), supaya perilaku konsisten di semua titik navigasi,
   bukan cuma sub-tab Aset.

## Cakupan yang SENGAJA belum disentuh

Elemen search (ikon 🔍 di header, sebelah ikon ⚙️ Settings) — user melaporkan ini juga
tertutup elemen, tapi audit frame-by-frame video TIDAK menemukan bukti visual overlap (toast
`bottom:100px` secara matematis tidak pernah mencapai area header atas). Ditunda sesuai
arahan user ("lewati ikon search dulu") — butuh video/reproduksi terpisah sebelum diperbaiki.

## Test & Build

- `node --test tests/*.test.js` → 4920/4920 pass, 0 fail (0 test baru ditambahkan — fix ini
  murni perilaku UI/timing yang sudah tercakup pola existing `showPage()`, tidak ada logic
  baru yang butuh assertion terpisah).
- `node scripts/build.js` → sukses, versi s617 → s618, sintaks kedua bundle valid.
