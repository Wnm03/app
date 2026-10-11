# Audit Perbaikan dan Rantai Akumulasi — B1–B10 / S2041-2308

Tanggal: 11 Oktober 2026  
Baseline: `app-main (18).zip` (build 2295), SHA-256 `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`  
Build hasil: `s2041-1-part-sot-hardening-2308`

## Ringkasan keputusan

Patch kumulatif meneruskan B1–B10, menambah tes perilaku untuk B9 dan B10, serta menetapkan kontrak parser khusus nominal uang agar `15.000` pada field uang dibaca sebagai 15.000, bukan 15. Field kuantitas/unit dan persentase tetap menggunakan parser desimal agar input seperti `1.234` tidak berubah menjadi 1234.

**Status:** full test suite lulus; build/minifikasi, freshness, patch integrity, dan release gate lulus. Browser E2E gagal pada timeout `app siap`, sehingga status penerimaan keseluruhan belum final.

## Perubahan dalam tahap ini

- `parseMoneyID()` ditambahkan untuk field nominal uang. Kontrak: pemisah tunggal dengan tepat tiga digit akhir dianggap ribuan; bila titik dan koma hadir bersamaan, pemisah paling kanan dianggap desimal. Parser kuantitas `parseDecStr()` tidak diubah.
- Field uang di Buku Aset, Holding Investasi, Watchlist, dan transaksi investasi diarahkan ke `parseMoneyID()`; kuantitas/unit dan gram tetap memakai `parseDecStr()`.
- Tes B9 menjalankan `Order.computeTotals()` sungguhan untuk diskon melebihi subtotal, diskon negatif, ongkir negatif, total, dan rugi.
- Tes B10 menjalankan `Zakat.hitungPenghasilan()` pada simulasi `America/Los_Angeles` untuk memastikan transaksi tanggal 1 masuk bulan lokal yang benar.
- Versi build dinaikkan ke 2308; `index.html`, `app_production.html`, dan `sw.js` sinkron. Bundle A/B dibangun ulang dengan minifikasi wajib.

## Bukti pengujian

| Pemeriksaan | Hasil |
|---|---|
| Build `node scripts/build.js 2308 --require-minify` | PASS; sintaks bundle dan sinkronisasi HTML lolos |
| Freshness bundle | PASS; hash sumber A `4890b19a4f4783d0`, B `9bdf139ebf39a991` |
| Tes terpilih B1–B10 | 14/14 lulus |
| Full suite (`TEST_FORCE_RERUN=1`, 64 shard, concurrency 1) | 8.780 tes; 8.779 lulus, 0 gagal, 1 skipped; exit 0 |
| Release gate (`verify-release-ready.js`) | PASS; 0 lint error, SOT/version/lifecycle/service SOT/deep firewall/Car Notes/freshness lulus; peringatan ukuran sumber dalam guard cap tidak memblokir |
| Browser E2E/manual UI | Dicoba melalui `npm run test:e2e`, tetapi gagal menunggu `app siap` (timeout 15 detik); belum lulus |

Full-suite runner menghasilkan 64 checkpoint shard. Setiap shard memiliki status pass, jumlah tes nonzero, dan ringkasan TAP; total gabungan konsisten dengan hasil 8.780 tes di atas.

## Audit rantai akumulasi

1. **Baseline** — SHA-256 ZIP cocok dengan manifest S2307.
2. **Overlay patch** — file S2307 diterapkan ke working copy hasil ekstraksi baseline, bukan menimpa ZIP asli.
3. **Perbaikan lanjutan** — parser uang khusus, tes perilaku B9/B10, dan dokumentasi ditambahkan.
4. **Build** — sumber dibangun ulang pada versi 2308 setelah perubahan terakhir; bundle freshness lulus.
5. **Regresi** — full suite dipaksa menjalankan ulang semua shard; tidak memakai checkpoint pass lama sebagai pengganti eksekusi.
6. **Payload** — ZIP final harus hanya memuat file yang berubah/baru dibanding baseline serta manifest/laporan; tidak memuat `node_modules`, checkpoint tes, backup bundle iterasi, atau file baseline yang tidak berubah.
7. **Batas penerimaan** — browser E2E dicoba tetapi timeout sebelum aplikasi siap. Karena itu tidak diklaim bahwa UI aktual sudah diterima atau seluruh aplikasi bebas bug substantif.

## Batasan dan risiko tersisa

- `parseMoneyID` menetapkan aturan interpretasi untuk field uang; input angka dengan separator tunggal dan tiga digit akhir memang ambigu lintas locale. Untuk field uang, kontrak aplikasi kini mengutamakan pengelompokan ribuan; untuk kuantitas/unit, kontrak desimal tetap terpisah.
- Audit ini bukan review baris-per-baris seluruh runtime.
- Release gate independen selesai dengan exit 0. Browser E2E sudah dicoba, tetapi timeout saat menunggu `typeof D === 'object'`, `showPage`, dan `FuelTankProfile` tersedia. Ini belum membedakan kegagalan bootstrap aplikasi dari pembatasan/masalah browser harness; perlu investigasi terpisah sebelum penerimaan UI.

## Addendum — verifikasi lanjutan E2E dan rantai akumulasi

Tanggal addendum: 11 Oktober 2026.

### Temuan E2E

`npm run test:e2e` diulang setelah instrumentasi diagnostik. Chromium melaporkan `net::ERR_BLOCKED_BY_ADMINISTRATOR` pada navigasi dokumen ke origin loopback. Tidak ada exception JavaScript yang tertangkap sebelum navigasi diblokir. Runner kini mengklasifikasikan kondisi ini sebagai **E2E ENV BLOCKED** dan exit code 4, bukan timeout generik, PASS, atau bug aplikasi yang belum terbukti. Pengujian UI aktual tetap belum terlaksana; jangan mengubah exit code ini menjadi kelulusan.

Perubahan tambahan hanya pada harness/dokumentasi E2E:
- `e2e/diagnostics.js`: klasifikasi murni kegagalan navigasi yang diblokir kebijakan browser.
- `e2e/run-e2e.js`: merekam kegagalan request dan menjelaskan pembatasan browser secara eksplisit.
- `e2e/README.md`: dokumentasi exit code 4 dan penegasan bahwa block bukan PASS.
- `tests/e2e-harness-diagnostics.test.js`: tes klasifikasi diagnostik.

Tidak ada perubahan runtime aplikasi setelah build 2308; versi, HTML, service worker, dan bundle tetap build 2308. Perubahan ini adalah follow-up diagnostik, bukan klaim bahwa UI sudah lolos E2E.

### Verifikasi final yang dijalankan ulang

| Pemeriksaan | Hasil |
|---|---|
| Full suite paksa ulang, 64 shard, concurrency 1, timeout per shard 180 detik | **8.781 tes: 8.780 pass, 0 fail, 1 skipped; semua 64 shard valid; exit 0** |
| Tes terarah B1–B10 dan diagnostik E2E | **15/15 pass** |
| `node scripts/verify-release-ready.js` | **PASS; exit 0; lint 0 error; SOT 412 runtime source; version/HTML/SW sinkron; bundle freshness PASS** |
| `npm run test:e2e` | **Exit 4 — diblokir kebijakan browser `ERR_BLOCKED_BY_ADMINISTRATOR`; bukan PASS** |
| Browser E2E/UI aktual | Belum terverifikasi karena browser tidak mengizinkan navigasi origin lokal |

### Rantai akumulasi

- Baseline `app-main (18).zip` SHA-256 tetap `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`.
- Payload B1–B10 sebelumnya dipertahankan; empat file tambahan untuk diagnostik E2E ditambahkan secara kumulatif.
- ZIP tindak lanjut harus berisi file yang berubah/baru dibanding baseline serta laporan/manifest pendukung; bundle backup iterasi dan checkpoint tes tidak dimasukkan.
- Build runtime tetap `s2041-1-part-sot-hardening-2308`, karena perubahan baru hanya harness E2E dan dokumentasinya.

**Keputusan:** verifikasi otomatis B1–B10 dan release gate lulus. Penerimaan keseluruhan masih terbuka sampai skenario UI E2E dijalankan di browser yang mengizinkan origin lokal. Audit ini bukan review baris-per-baris seluruh runtime dan tidak mendukung klaim “0 bug substantif”.

Catatan reproduksibilitas release gate: satu eksekusi background selesai dan mencetak `RELEASE GATE LOLOS` dengan seluruh pemeriksaan final (termasuk bundle freshness). Eksekusi ulang foreground berikutnya melampaui batas waktu lingkungan ketika ESLint masih berjalan dan tidak mencapai ringkasan final. Karena itu, ada bukti satu eksekusi gate selesai PASS, tetapi durasi lint tidak konsisten di lingkungan ini; jangan menafsirkan timeout pengulangan sebagai kegagalan kode yang sudah terbukti, dan ulangi gate di runner yang stabil sebelum rilis produksi.
