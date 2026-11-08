# Patch Kumulatif Fuel Accuracy — build 2752 (menggantikan 2749 dan 2751)

Baseline: `app-main (3).zip`. Berisi file berubah saja (kumulatif 2741–2751). Bukan full release. Tidak berisi data/backup pengguna.

## Tambahan dibanding 2749 (S2750–S2751)

Masalah yang ditemukan pada backup asli (Vario 125, 121 log): 51 log duplikat hasil impor ganda (ID beda, isi sama) dan 2 log 40 L (tangki 5,5 L) mendistorsi km/L (28,9 vs ±58) dan memblokir kalibrasi adaptif untuk selamanya.

1. `getFuelCanonicalLogs(vehicleId)` (vehicle-core.js): pemisahan log KANONIS vs KARANTINA, murni read-only. `D.bbmLogs` dan transaksi keuangan tidak pernah diubah/dihapus.
   - duplicate: fingerprint tanggal|km|liter|biaya|fullTank sama (lintas batch impor; spbu/note/id diabaikan). Dipertahankan: log bertaut transaksi (txLinkId), lalu ID terkecil.
   - over-capacity: liter > kapasitas tangki x 1,10.
2. `getFuelFullTankSegments()` / `estimateRpPerKm()` / `fuelEfficiency()` memakai log kanonis. Bentuk keluaran segmen tidak berubah.
3. `getFuelSuspectSegmentIndexes()`: segmen > 1,6x atau < 0,5x median (min. 4 segmen) dikarantina dari sampel kalibrasi; total km/L tidak berubah.
4. Gerbang kalibrasi memakai `calibrationBlockers` (data kanonis): duplikat dan isi melebihi kapasitas tidak lagi memblokir; log invalid, ID ganda, odometer mundur, dan konflik kapasitas tetap memblokir.
5. Akumulasi partial fill estimator dan pemulihan baseline (`reconcileFuelStateAfterBbmMutation`) memakai log kanonis.
6. `getFuelDataQuality()` menambah: canonicalLogCount, quarantinedCount, quarantinedDuplicateCount, quarantinedOverCapacityCount, suspectSegmentCount, calibrationBlockers. Flag peringatan lama tetap ada (informatif).

## Hasil pada backup asli (Vario 125)
| | 2749 | 2751 |
|---|---|---|
| km/L historis | 28,88 | 58,08 |
| Rp/km | 345 | 172 |
| Estimasi sisa (KM 21.885) | 2,97 L | 4,24 L |
| Kalibrasi adaptif | tidak pernah aktif | aktif (≈54–55 km/L) |
| Log dikarantina | – | 52 (50 duplikat, 2 over-capacity) |
| Log bertaut transaksi yang dikarantina | – | 0 |

Bukti: dua log 40 L bertanggal 2026-01-25 berbiaya Rp 400.000, sedangkan transaksi keuangan hari itu Rp 40.000 → kemungkinan besar salah ketik 4,0 L / Rp 40.000. Tidak diubah otomatis; pengguna dapat mengoreksinya sendiri, dan log akan kembali kanonis.

## Validasi
- Tes baru: `tests/fuel-canonical-logs-s2750.test.js` (10 tes).
- 2160 tes terkait (fuel, BBM, odometer, impor, backup, KM, release, bundle, versi, cache, kendaraan, servis, s2703) lulus.
- ESLint file yang disentuh: 0 error. Build minified lulus; bundle A/B segar; window-expose OK.
- Belum dijalankan: full test suite seluruh aplikasi, Android PWA nyata.

## Tambahan S2752
1. Saran koreksi salah-ketik desimal pada log over-capacity (40 L -> 4,0 L; biaya /10), baca-saja, tidak mengubah log.
2. Kartu fuel menampilkan pemberitahuan "N log BBM dikecualikan dari estimasi" (rincian duplikat/isi melebihi kapasitas + petunjuk koreksi). Data asli tidak diubah.
3. Analitik biaya BBM (`fuel-cost-analytics.js`) memakai log kanonis agar duplikat tidak dijumlah dua kali. Transaksi keuangan tidak tersentuh.
4. Tes baru: `tests/fuel-card-quarantine-notice-s2752.test.js` (4 tes) + 1 tes saran desimal. 2211 tes terkait lulus, ESLint 0 error.
