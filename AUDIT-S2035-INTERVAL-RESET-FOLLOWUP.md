# Audit & perbaikan lanjutan S2035 — baseline interval servis

## Temuan
`buildServiceNextDueSnapshot()` sebelumnya selalu menghitung `serviceKm + interval` dan `serviceDate + interval`, bahkan untuk tindakan `bersih`/`periksa`. Ini menggeser titik awal interval tanpa penggantian komponen. Selain itu action dibandingkan sebagai teks mentah pada pemilihan interval schedule sehingga alias tindakan berpotensi memilih sumbu interval yang salah.

## Perbaikan
- Normalisasi action melalui `normalizeServiceActionType()` saat memilih jadwal inspeksi/penggantian.
- Hanya tindakan reset (`ganti`, `pasang`, `overhaul` dan alias normalisasinya) yang memakai KM/tanggal servis yang sedang dicatat sebagai titik awal baru.
- Untuk tindakan non-reset, snapshot dihitung dari riwayat reset terakhir untuk kendaraan + komponen yang sama. Catatan pembersihan/inspeksi tidak memindahkan due KM/tanggal.
- Jika belum ada riwayat reset yang valid, tindakan non-reset tidak membuat baseline baru dari KM/tanggal pemeriksaan.
- Perubahan disalin ke bundle hasil build; konstanta cache dan HTML disinkronkan oleh build.

## Verifikasi
- 41 test `tests/service-reminder-*.test.js`: PASS (termasuk S2031/S2033/S2034 dan scope kendaraan, paket pengingat, komponen).
- Build `node scripts/build.js --require-minify`: PASS; kedua bundle lolos syntax check dan versi sinkron.
- Full suite seluruh aplikasi belum dijalankan pada tahap ini; tidak mengklaim bebas regresi seluruh aplikasi.

## Batasan
Snapshot non-reset mengambil reset event terakhir yang cocok dengan identitas komponen kanonis. Data lama tanpa identitas komponen tetap bergantung pada aturan pencocokan legacy yang sudah ada; pengujian data produksi aktual masih disarankan.
