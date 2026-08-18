# Sesi S649 — sambungkan toast error ke toggle "Debug Console" yang sudah ada

Lahir dari kasus S648 (bug "assetId.indexOf is not a function") yang
susah dilacak karena user cuma lihat toast generik di HP tanpa akses
console gampang. Solusinya: reuse toggle "🐞 Aktifkan/Matikan Debug
Console" yang SUDAH ADA di menu Pengaturan (localStorage kw_debug_console)
— tidak ada UI/toggle baru.

- Toggle OFF (default) -> toast error tetap teks generik seperti biasa,
  0 perubahan perilaku utk pemakaian sehari-hari.
- Toggle ON -> toast error langsung tampilkan nama+pesan+baris kode
  persis, jadi lain kali ada bug serupa bisa langsung kirim screenshot
  toast-nya tanpa perlu patch debug sementara lagi.

2 test baru (toggle ON & toggle belum pernah diaktifkan sama sekali),
4632/4632 test lulus 0 regresi, build+verify-bundle-freshness+
verify-window-expose semua OK.
