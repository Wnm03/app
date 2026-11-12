# Akumulasi S2803 (memuat S2801 = perbaikan harga bearing) — S2800 + perbaikan harga bearing pada impor katalog

Basis: app-main_8 (v2795) + zip ini saja (memuat S2796–S2800; gantikan S2800). Build --require-minify -> versi 2803.

## S2801
`modules/vehicle/vehicle-catalog-import.js`: fallback harga angka polos menganggap "6201" pada "Bearing Radial Ball 6201" sebagai harga dan membuangnya dari nama. Kini token tipe bearing (16xx/60xx/62xx/63xx/68xx/69xx) pada baris berkata bearing/bering/brg/ball/roller/needle/klaker/laher dilewati: price kosong bila tak ada harga lain, nomor tipe tetap di nama (sekaligus membedakan baris yang sebelumnya senama). Harga di kolom akhir ("... 6205 45.000") tetap terbaca. Baris non-bearing tidak berubah.
Tes baru: tests/s2801-import-bearing-price.test.js.

## Tidak diubah
- Normalisasi nama impor (koma -> spasi) DIBATALKAN: 4 tes lama mengunci gaya nama Honda "SEAL,VALVE STEM" sebagai perilaku sengaja. Pasangan beda tanda baca ditangani di sisi pembanding/tampilan bila perlu, bukan dengan mengubah nama sumber.
- Data lama (price 6201/6202/6205/6207 di partsStock) tidak dimigrasi: nomor tipe asli sudah hilang dari nama, tidak bisa diverifikasi otomatis. Koreksi manual atau impor ulang katalog.
- Opsi 2 ditunda.
