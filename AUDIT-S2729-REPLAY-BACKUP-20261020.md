# AUDIT S2729 — Replay mesin pengingat pada backup-keluarga-W-2026-10-20.json

Tidak ada perubahan kode di sesi ini. Paket v5 = akumulasi v4 + dokumen ini.
Metode: modul sumber asli dimuat di Node (loader tests/helpers/loadSource), backup disuntik ke D,
computeServiceUrgency per kartu (pool = dedupeServiceCategoriesForVehicle), nowISO 2026-10-20. Tanpa browser.

## Vario 125 (odometer 21.311, 94 log)
Baseline app-main(39): 11 terlewat / 1 mendekati / 15 aman / 2 normal / 13 belum diketahui.
v4: 10 terlewat / 1 segera / 1 mendekati / 16 aman / 2 normal / 12 belum diketahui.
Perubahan: Busi terlewat->aman (20.237); V-Belt CVT 14.867->7.608; Kampas Kopling Ganda 14.867->5.500;
Seal Driven Face aman->segera (baseline ganti 10.469, log 21.311 hanya periksa); Pelumasan CVT Grease unknown->aman (21.311).
Kendaraan lain: tidak berubah.

## 12 kartu belum diketahui (v4)
- Tanpa log sama sekali: Filter Kawat Oli, Tromol Rem Belakang, Oli Shockbreaker Depan, Engine Mounting, Relay & Sekring, Kampas Rem Belakang, Pin brake pad.
- Kartu lama tanpa komponen, log teks bebas tanpa aksi: Servis Cvt, Grease Cvt, Slidepiece cvt (duplikat kartu kanonik; keputusan merge/hapus ada pada pemilik data).
- pentil ban: ada log ganti km 18.470 tetapi kartu tanpa interval.
- Selang Rem: hanya disebut di log Pembersihan Rem (km 15.917, tanpa ID komponen, aksi periksa).

## Gate penuh (dijalankan per shard, 32 shard, 1454 file tes)
Semua 32 shard lulus: 9.604 lulus, 0 gagal. verify-bundle OK, verify-window-expose OK (85 modul), service-sot-gate PASS (termasuk FULL REGRESSION).
Timeout sebelumnya adalah batas waktu proses tunggal, bukan kegagalan tes (tiap shard 2-9 detik).

## Belum terbukti / terbuka
Browser nyata, fan-out Pembersihan Rem dalam DOM, selisih 13 (laporan S2728, backup 18 Okt) vs 12 (replay ini). ESLint: 0 error, 142 peringatan (laporan sebelumnya).
