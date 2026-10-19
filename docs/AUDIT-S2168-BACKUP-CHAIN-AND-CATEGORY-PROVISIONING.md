# S2168 — Audit backup aktual dan provisioning pengingat per kategori

## Basis audit
- Backup pengguna: `backup-keluarga-W-2026-10-18.json` (diperiksa read-only; tidak diubah).
- Source awal: akumulasi S2159 `s2033-reset-interval-chain-audit-2574`.
- Patch S2168: kategori SOT yang valid dapat menghasilkan jadwal pengingat walaupun belum mempunyai tautan `catalogPartId` ke `VehicleCatalog`.

## Temuan data aktual
- 5 kendaraan, 110 riwayat servis, 205 kategori sparepart global.
- Semua 5 kendaraan memiliki `serviceSchedules: []` dan status provisioning `no-rules` pada snapshot backup.
- Store katalog memiliki 338 item, tetapi item-item itu tidak membawa `serviceComponentId`, `masterCategoryId`, atau interval servis; kategori SOT per kendaraan tidak memiliki `catalogPartId` yang menghubungkan mereka ke item katalog. Akibatnya, provisioning yang hanya dimulai dari item katalog menghasilkan jadwal kosong meskipun kategori SOT berisi interval.
- 21 riwayat menunjukkan `actionType` tingkat atas tidak ada dalam himpunan tindakan checklist; 30 baris `ganti`/`bersih` tidak memiliki kombinasi interval/tenggat yang valid; 3 riwayat menunjuk kategori kendaraan lain. Angka ini adalah hitungan temuan, bukan hitungan bug unik—temuan dapat tumpang tindih.
- 4 baris memiliki `nextDueKm` berbeda dari `km + intervalKmAtService`; dua merupakan interval nol yang perlu ditinjau, satu punya interval bulan/tenggat gabungan, dan satu tampak sebagai inkonsistensi snapshot. Jangan melakukan koreksi data otomatis hanya dari hitungan ini.

## Perubahan source
1. `vehicle-service-reminder-sot.js` mempertahankan provisioning berbasis katalog untuk item yang benar-benar tertaut.
2. Bila kategori SOT belum direpresentasikan oleh item katalog, kategori yang mempunyai interval KM atau bulan dan identitas komponen/kategori yang valid sekarang diproyeksikan menjadi jadwal kategori.
3. Dedup memakai identitas komponen/kategori agar kategori tanpa `catalogPartId` tidak dibuang.
4. `vehicle-sot-fleet-integrity.js` dapat menemukan riwayat terbaru berdasarkan `catalogPartId`, `categoryId`, atau `serviceComponentId`/checklist, tetap dalam batas kendaraan yang sama.
5. `sparepart-servis.js` menggunakan tindakan pada baris checklist yang cocok dengan komponen saat menentukan baseline interval; `actionType` tingkat atas hanya menjadi fallback. Ini mencegah baris checklist `periksa` dengan root lama `ganti` mereset interval komponen secara keliru.
6. Data backup tidak dimigrasikan atau ditulis ulang oleh patch ini.

## Verifikasi
- Tes regresi provisioning S2159, tes fleet integrity, tes reset S2031/S2033, dan tiga tes S2168: lulus.
- Simulasi provisioning read-only atas kategori backup aktual menghasilkan jadwal untuk semua kendaraan: Vario 125 43 rules (39 tampil), Vario 110 33 (30 tampil), Grandmax 36 (34 tampil), Beat Street 21 (19 tampil), Xenia 34 (32 tampil).
- Build `npm run build` lulus pada `s2033-reset-interval-chain-audit-2577` (`kw-cache-v2577`); sintaks kedua bundle lulus.
- Full suite `node --test --test-concurrency=8 tests/*.test.js`: **8.925 tests, 8.924 pass, 0 fail, 1 skipped**, durasi sekitar 445 detik. Satu skip adalah replay fixture historis yang memang tidak disertakan.
- `verify-bundle-freshness.js`, `verify-window-expose.js`, dan `verify-patch-integrity.js` lulus. Audit struktur servis S2151 membaca 102 komponen dan melaporkan 0 temuan struktural.

## Batasan
- Patch memperbaiki proyeksi jadwal kosong dari kategori yang memiliki interval. Patch tidak menebak interval untuk kategori yang tidak memiliki aturan.
- Konflik `actionType` vs checklist, kategori lintas kendaraan, dan snapshot tenggat lama perlu diperbaiki melalui migrasi terpisah dengan laporan preview/rollback; tidak diubah otomatis.
