# Patch Debug Sementara — "Terjadi error saat memproses tombol"

Ini BUKAN perbaikan permanen — ini alat bantu supaya kamu bisa lihat
pesan error ASLI-nya (nama error + baris kode) langsung di toast HP,
tanpa perlu buka DevTools/console lagi.

## Cara pakai
1. Upload SEMUA file di patch ini (timpa yang lama), lalu buka app lagi
   (hard refresh / clear cache kalau perlu, versi sekarang v1381).
2. Klik lagi tombol yang tadi error (mis. "Atur Pokok Dana Titipan" di
   kartu "mas sihab" atau "Aku").
3. Toast yang muncul sekarang akan berbunyi:
   "⚠️ DEBUG: <NamaError>: <pesan> | at <fungsi> (<file>:<baris>:<kolom>)"
4. Kirim SELURUH teks toast itu (boleh screenshot) ke saya — itu sudah
   cukup buat saya cari & tambal baris penyebabnya secara presisi.

## Setelah selesai
Jangan pakai versi ini sebagai rilis final — setelah bug ketemu &
ditambal, saya akan kirim patch normal yang mengembalikan toast ke
teks generik semula ("Terjadi error saat memproses tombol. Cek
console.") + fix aslinya sekaligus.
