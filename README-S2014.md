# S2014 — ODOMETER FIX + RESTORE DIAGNOSTIC ACCUMULATION

Status: PATCH, belum dinyatakan restore sukses sampai diuji di perangkat.

## Tujuan
Menggabungkan S2012 (fix validator odometer) + S2013 (diagnostic restore) tanpa mengembalikan bug comparator S2012.

## Perubahan inti
1. `modules/vehicle/servis.js`
   - Memperbaiki interpretasi `compareServiceHistoryRecency` production-style.
   - `rel < 0` = kandidat `next` dan `rel > 0` = `previous`.
2. `modules/shared/backup-restore.js`
   - Mempertahankan diagnostic tahap restore S2013 agar UI tidak lagi hanya menampilkan `Error {}`.
   - Menyimpan `window.__S2013_RESTORE_DIAGNOSTIC`.
   - Menyimpan `window.__S2014_ODOMETER_DIAGNOSTIC` dengan jumlah checked/invalid dan maksimal 100 detail invalid.
3. Bundle/cache/HTML dibangun ulang menjadi versi 2000.

## Validasi
- `node --check` source terkait: PASS.
- `node --test tests/service-odometer-integrity-p22.test.js tests/service-import-odometer-p23.test.js`: 9/9 PASS (P22 7/7, P23 2/2).
- `npm run build`: PASS.
- Kedua bundle lolos `node --check`.
- Environment tidak memiliki `esbuild`, sehingga bundle valid tetapi belum diminify.
- Full `npm test` belum dinyatakan PASS; pada sesi sebelumnya test penuh mencapai >4000 test sebelum timeout.

## Cara uji restore
1. Upload SEMUA file patch yang tercantum di ZIP, bukan hanya HTML/SW.
2. Hard refresh / bersihkan cache PWA bila perlu.
3. Gunakan backup asli yang checksum-nya valid terlebih dahulu; jangan mengubah backup untuk sesi diagnosis ini.
4. Jalankan Restore.
5. Jika gagal, buka console dan periksa:
   - `window.__S2013_RESTORE_DIAGNOSTIC`
   - `window.__S2014_ODOMETER_DIAGNOSTIC`
6. Laporkan nilai `stage`, `error.message`, `invalidCount`, dan 5–10 item pertama `invalid`.

Catatan: S2013 sebelumnya dibangun tanpa `modules/vehicle/servis.js`, sehingga bundle S2013 kembali membawa kondisi comparator lama. Karena itu hasil S2013 `odometer-validation / 80 record` tidak membuktikan fix S2012 gagal.


## S2014-FIXED — null/empty KM guard

Koreksi tambahan setelah verifikasi restore terhadap backup nyata: validator `validateServiceOdometer()` tidak lagi memasukkan record servis dengan `km=null` atau `km=''` ke daftar pembanding odometer. Sebelumnya `Number(null) === 0` dapat membuat record tanpa KM terbaca sebagai servis pada 0 km dan memblokir restore dengan `above_next_service`.

Perubahan identik diterapkan pada source `modules/vehicle/servis.js` dan bundle produksi `app-bundle-b.min.js`. Tidak ada perubahan pada backup/data pengguna.

Verification: source dan bundle lolos `node --check`; targeted S2014/P21/P22/P23/P11/backup-integrity tests pass.
