# PATCH S2744 — Tombol Hubungkan + Sync Google Drive/Sheets digabung (build 2719, di atas S2743)

Hanya UI Pengaturan > Notif&Backup dan satu fungsi pembungkus. Tidak menyentuh isi backup/sync, SOT, atau rumus.

## Masalah
Drive dan Sheets masing-masing punya tombol Hubungkan, Putuskan, dan Sync sendiri (6 tombol yang hampir kembar), padahal sejak S2743 keduanya memakai satu login.

## Perubahan
- Kartu baru paling atas "🔗 Google (Drive + Sheets)": status koneksi (akun, sisa waktu token, sinkron terakhir Drive & Sheets), **Hubungkan Google**, **Sync Semua Sekarang**, **Putuskan Koneksi Google**.
- `googleConnectAll()` (sheets-sync.js): satu login dengan paket izin gabungan; bila sudah terhubung hanya memberi tahu.
- `googleSyncAllNow()`: cek login SEKALI, lalu Backup ke Drive, lalu Sync ke Sheets. Kegagalan Drive dilaporkan tetapi tidak menghentikan Sheets. Guard `_saveGuards.googleSyncAll` mencegah jalan dobel; tanpa Client ID tidak memulai apa pun.
- Dihapus dari kartu Drive dan Sheets: tombol Hubungkan dan Putuskan yang dobel. Yang tinggal di sana: Client ID, auto-sync, Backup ke Drive, Restore, Spreadsheet ID, Sync ke Sheets, Tarik dari Sheets.
- Sengaja TETAP terpisah: **Restore dari Drive** dan **Tarik dari Sheets (Timpa Total)**, karena menimpa data di HP.
- `renderSheetsSettings()` mengisi `#gcStatus` dan menampilkan `#gcDisconnectBtn` saat ada token.
- Teks bantuan di kartu Drive diarahkan ke kartu Google di atas.
- Tes baru: `tests/s2744-google-gabung-tombol.test.js` (6 tes, termasuk cek HTML index/production: tombol tidak dobel).

## Verifikasi
Build 2719 PASS; ESLint 0 error. Uji Chromium nyata (Google Identity Services tiruan): klik Hubungkan lalu Sync Semua = 1 permintaan login, lalu urutan API: PATCH upload Drive, kemudian GET Spreadsheet; tidak ada error halaman.
