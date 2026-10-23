# S2713 — Audit lanjutan riwayat servis, filter, pagination, dan SOT

## Perbaikan

- Riwayat servis sekarang memperluas halaman awal untuk membawa seluruh baris yang masih cocok filter dan memiliki `sessionId` yang sama. Satu sesi tidak lagi terpecah menjadi beberapa kartu hanya karena batas pagination.
- Kartu sesi menampilkan `N tampil · M total` jika filter tanggal/aksi/kategori/komponen menyembunyikan sebagian komponen sesi.
- Tombol hapus menjelaskan bahwa seluruh komponen sesi akan dihapus, termasuk komponen yang tersembunyi oleh filter. Konfirmasi di `Servis.delSession()` tetap menyatakan seluruh sesi dan transaksi terkait.
- Hitungan tombol “Tampilkan lebih banyak” menggunakan jumlah baris unik yang benar-benar dirender setelah perluasan sesi.

## Audit lanjutan dan bukti

- Backup yang diperiksa: `backup-keluarga-W-2026-10-20.json` (schemaVersion 11; 5 kendaraan; 110 riwayat servis; 249 baris `sparepartCats`; array `reminders` dan `serviceReminderPackages` kosong).
- Audit ID kategori mentah menemukan 29 nilai ID yang dipakai lintas scope, tetapi mayoritas adalah pola template global (`vehicleId` kosong) dan kategori kendaraan-spesifik; tidak boleh dihapus otomatis karena konteks kendaraan berbeda.
- Ada satu duplikasi kategori dalam kendaraan yang sama yang tampak identik: ID `sp_component_kabel-gas-standar-kunci`, nama `Cek Kabel Gas/Rem Belakang/Standar/Kunci Kontak`, `vehicleId=veh_1`, komponen `kabel-gas-standar-kunci`. Proyeksi pengingat canonical sudah mendeduplikasi komponen; baris mentah backup tidak dihapus otomatis karena perubahan data pengguna perlu migrasi/review eksplisit.
- `npm run audit:carnotes`: PASS (548 source files scanned, forbidden=0, duplicateIds=0/0, ServisDeclarations=1).
- `npm run verify-bundle`: PASS setelah rebuild.
- `npm run audit:sot-reconciliation`: PASS pada fixture/script saat ini; output bersih 0 konflik/duplikasi dalam input yang dibaca script.
- `npm run audit:sot-drift`: PASS 6/6.
- Tes regresi terarah awal: 18/18 PASS.
- Rangkaian tes servis/category/reminder yang dipilih: 512/512 PASS setelah rebuild.

## Batasan / temuan yang belum boleh diklaim selesai

- `SERVICE_SOT_SKIP_FULL_REGRESSION=1 node scripts/service-sot-integrity-gate.js`: PASS untuk seluruh pemeriksaan statis SOT (9 checks). Tanpa variabel skip, gate memanggil full regression; bagian itu tidak selesai dalam batas waktu eksekusi yang tersedia.
- `scripts/service-advanced-integrity-gate.js` masih berhenti pada `S1918 source budget`: `modules/vehicle/servis.js` memiliki 2.054 baris sementara gate mensyaratkan maksimal 1.900. Ini adalah pagar ukuran/arsitektur, bukan bukti bug runtime; tidak ditutupi dengan menaikkan ambang secara otomatis.
- Tidak dilakukan uji Chromium interaktif menggunakan backup ini. Backup tidak diubah oleh patch.
- Karena itu, “nol bug substantif” belum dapat dinyatakan sebagai fakta global; patch ini memperbaiki temuan yang dapat direproduksi dan menambahkan pagar regresi untuk temuan tersebut.

## Tambahan temuan substantif dari sweep suite penuh

Saat `npm test` berjalan, tiga regresi lama pada `reminder-baseline-neutral-legacy.test.js` muncul sebelum keseluruhan suite melewati batas waktu sesi:

1. Tanpa riwayat, reminder legacy salah masuk status `mendekati` alih-alih `unknown`.
2. KM `null`, string kosong, atau tidak ada dianggap baseline 0 km; baris servis seperti ini bisa salah menghasilkan status jatuh tempo/terlewat atau aman tanpa baseline yang valid.
3. Interval waktu 0 bulan dianggap interval aktif sehingga servis pada hari yang sama dapat salah berstatus jatuh tempo.

Ketiganya sudah diperbaiki:

- `service-legacy-maintenance.js` kini menganggap null/kosong sebagai nilai tidak diketahui, mengabaikan interval nol/negatif, dan mengembalikan `BASELINE_REQUIRED` bila tidak ada baseline valid pada sumbu interval yang berlaku.
- `sparepart-servis.js` memetakan `BASELINE_REQUIRED` menjadi status netral `unknown` dengan label penjelas, bukan “mendekati”.
- Semua 5 tes legacy-baseline terkait sekarang PASS. Sweep servis terpilih harus dijalankan ulang setelah rebuild untuk hasil akhir.

## Status suite penuh

`npm test` dimulai dan mencapai setidaknya 3.824 subtes tetapi tidak selesai dalam batas waktu eksekusi 110 detik. Tiga kegagalan yang terlihat sudah diperbaiki dan dites terarah; suite penuh tidak diklaim lulus.
