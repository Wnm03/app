# Audit Perbaikan B1–B4 dan Rantai Akumulasi — Keluarga-W

- **Baseline:** `app-main (18).zip`
- **SHA-256 baseline ZIP:** `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`
- **Versi baseline:** `s2041-1-part-sot-hardening-2295` / HTML `?v=2295` / SW `kw-cache-v2295`
- **Versi hasil:** `s2041-1-part-sot-hardening-2305` / HTML `?v=2305` / SW `kw-cache-v2305`
- **Cakupan:** implementasi B1–B4 dari `AUDIT-BUG-SUBSTANTIF-app-main.md`, pemulihan regresi yang terungkap selama verifikasi, serta audit rantai akumulasi. Bukan audit baris-per-baris seluruh runtime.

## 1. Status akhir

| Gerbang | Hasil | Bukti |
|---|---|---|
| Tes regresi B1–B4 | PASS | 4/4 tes pada setiap TZ: `Asia/Jakarta`, `America/Los_Angeles`, `Pacific/Kiritimati`, `UTC` (16/16 keseluruhan) |
| Full suite | PASS | 8.770 tes; 8.769 lulus, 0 gagal, 1 skipped |
| `npm run release-check` | PASS | lint 0 error, SOT 412 runtime source, versi HTML/SW sinkron, bundle freshness lulus |
| `npm run build` | PASS | kedua bundle lolos `node --check`; HTML produksi sinkron dengan `index.html` |
| `FILE-HASHES-SHA256.txt` | PASS | `scripts/refresh-file-hashes.py --check`: 110 entri valid, 0 basi, 0 hilang |
| Tes ekspor kendaraan dan PO Shop yang pernah gagal | PASS | `fuel-export`, `shop-s1932-s1940-governance`, `audit-nonsot-s2532`, `s256au-file-hashes-sync` lulus pada verifikasi ulang |
| Browser E2E/manual UI | BELUM DIJALANKAN | belum ada bukti penerimaan browser aktual |

Full suite awalnya menemukan regresi akibat pemanggilan `todayStr()` tanpa guard di modul yang juga diuji secara mandiri. Temuan itu **tidak disembunyikan**: guard/fallback tanggal lokal dipulihkan pada jalur yang relevan, build dibuat ulang, lalu full suite dijalankan ulang dari checkpoint bersih. Hasil final adalah 0 tes gagal.

## 2. Temuan dan perbaikan

### B1 — Tanggal kalender lokal, bukan tanggal UTC

- Menambahkan/menggunakan `localISO(date)` untuk tanggal kalender lokal.
- Titik tanggal-saja yang diaudit tidak lagi mengandalkan `new Date().toISOString().slice/split`.
- Timestamp penuh (misalnya `createdAt`, `receivedDate`, `generatedAt`) tetap memakai ISO timestamp; ini disengaja dan tidak diganti massal.
- `todayStr()` / `localISO()` tetap memiliki guard atau fallback lokal pada modul yang perlu berjalan sendiri dalam tes.
- Pemindaian source runtime tidak menemukan lagi pola langsung `toISOString().slice/split` untuk tanggal-saja yang menjadi target B1.

### B2 — Rentang backup/anggaran dan snapshot

- `inRange()` membandingkan tanggal `YYYY-MM-DD` sebagai tanggal kalender, bukan membandingkan UTC-midnight dengan waktu sekarang.
- Batas rentang harian/bulanan/tahunan dan snapshot bulan dinormalisasi sebagai tanggal lokal.
- Statistik anggaran dan WorthIt menggunakan parsing tanggal-saja yang konsisten dengan kalender lokal.
- Bentuk data transaksi tersimpan tidak diubah.

### B3 — Desimal kalkulator borongan tukang

- `parseDecimalID()` dipakai untuk panjang, lebar, tinggi, dan luas manual; `parsePzNum()` tetap untuk nominal Rupiah bulat.
- Verifikasi menjalankan `Tukang.calcBorCalc()` aktual dengan mock DOM: `2,5 × 4 = 10 m²`; dengan harga Rp100.000/m², hasil Rp1.000.000.
- Round-trip luas manual `2,5` juga diuji.
- Risiko input dimensi negatif belum dijadikan perubahan perilaku dalam patch ini; kebutuhan validasi nilai non-negatif tetap dapat diaudit terpisah.

### B4 — Tanda rugi dan rumus profit

- Titik yang memaparkan saldo/profit negatif memakai formatter signed, tanpa mengubah `fmtFull()` global yang memiliki banyak pemanggil.
- Profit dihitung memakai diskon efektif yang dibatasi ke subtotal, konsisten dengan total yang ditagihkan.
- Tampilan penjualan membedakan `Estimasi rugi` dari `Estimasi untung`; riwayat Shop tidak lagi memberi warna untung pada nilai rugi.
- Kebijakan lama terkait biaya pengiriman tidak dimasukkan ke profit dipertahankan.

## 3. Regresi yang ditemukan dan ditutup

| Regresi selama verifikasi | Penyebab | Tindakan |
|---|---|---|
| Tes lock pembayaran tagihan V24 gagal | `todayStr()` tanpa fallback pada modul yang dites mandiri | Guard/fallback lokal dipulihkan; V24 lulus |
| 12 tes ekspor kendaraan gagal | `FuelDashboard`/`FuelCompare` mengasumsikan global `todayStr` tersedia | Fallback tanggal lokal dipulihkan; `fuel-export` lulus 25/25 |
| Tes `maintenanceHealth` gagal | `service-event-sot.js` mengasumsikan global `todayStr` tersedia | Guard/fallback lokal ditambahkan; tes prioritas Car Notes lulus pada full suite |
| Tes create/edit Etalase dan receiving PO gagal | Jalur transaksi Shop memakai `todayStr()` tanpa fallback saat modul diisolasi | Guard/fallback lokal ditambahkan; tes Shop terkait lulus |
| Tes hash file dan pola N18 gagal selama perbaikan | File hash belum diperbarui dan bentuk fallback tidak cocok dengan kontrak source-test | Bentuk fallback diselaraskan dan file hash direfresh; kedua tes lulus |
| Bundle-parity/freshness sempat gagal di tengah iterasi | Source berubah setelah bundle dibangun | Build terakhir dijalankan ulang; release gate final lulus |

## 4. Rantai akumulasi dan integritas

1. Baseline ZIP diidentifikasi dan SHA-256-nya cocok dengan catatan manifest.
2. Patch diterapkan pada working copy terpisah; ZIP baseline yang diunggah tidak ditimpa.
3. Perubahan pasca-review diterapkan di working copy, termasuk pemulihan fallback, kemudian build dilakukan ulang sampai versi konsisten `2305`.
4. Tes B1–B4 diuji di empat zona waktu. Full suite dijalankan dari checkpoint bersih dan berakhir dengan 8.770 tes, 0 gagal, 1 skipped.
5. `FILE-HASHES-SHA256.txt` direfresh setelah build final dan diverifikasi dengan `--check`.
6. `npm run release-check` memverifikasi lint, versi/SOT, sinkronisasi HTML, firewall, Car Notes integrity, dan bundle freshness.
7. ZIP hasil hanya memuat file yang berubah dari baseline beserta tes dan dua dokumen pendukung; checkpoint sementara dan backup bundle dari iterasi build dikeluarkan.
8. Manifest final mencantumkan daftar apply, hash SHA-256 payload (kecuali hash dirinya sendiri), dan daftar delete kosong.

## 5. Batas audit dan item lanjutan

- H1 (salinan legacy) tidak termasuk patch ini.
- Domain AI, LifeOS, Economic Intelligence, dashboard, self-reward, dan bagian lain dari asset/vehicle belum menjalani review baris-per-baris.
- Temuan kandidat finance yang dicatat selama pembacaan eksploratif (parse bunga/inflasi dengan koma, nilai 0% yang tergeser oleh `||`, serta parse nominal saat blur belum berjalan) **belum diperbaiki atau dikonfirmasi melalui reproduksi UI** dan tidak boleh dianggap tertutup oleh patch B1–B4.
- Browser E2E/manual UI belum dijalankan; oleh karena itu status teknis otomatis PASS, tetapi penerimaan UI aktual tetap terbuka.
- Tidak ada klaim “0 bug substantif” untuk seluruh aplikasi.
