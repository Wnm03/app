# PATCH — Dana Titipan: selaraskan tampilan ke mockup (Agustus 2026)

## Audit — kenapa tampilan belum sesuai mockup

Dibandingkan `mockup-ledgerpro.html` & `mockup-minimal.html` (kartu bulat,
avatar inisial per pemilik, 1 angka ringkasan besar per kartu, rincian
teknis disembunyikan di balik expand), layar Dana Titipan versi live
(screenshot) punya 3 gap utama:

1. **Kartu ringkasan pool ("👥 Sudah Dialokasikan" dst) 0 CSS sungguhan.**
   `_poolSummaryHtml()` cuma pakai `style="border:1px dashed ...border-radius:8px"`
   inline + `<div class="u-flex u-jcb">` polos → kotak putus-putus rata kiri,
   bukan kartu bulat dgn angka hero besar spt mockup.
2. **Kartu per-pemilik (`<details id="titipanOwnerCard_N">`) 0 border/avatar.**
   Class yang dipakai (`titipan-summary-sticky`, `titipan-owner-alert`) tidak
   pernah punya definisi di `styles.css` — hasilnya baris flat tanpa
   pembeda visual antar pemilik, beda jauh dari `.owner-tbl`/`.tcard`
   (avatar bulat + border) di kedua mockup.
3. **Rincian audit (Pengeluaran Majoris, Sisa Saldo, warning mismatch,
   Total Kelebihan Alokasi) selalu terbuka di layar utama** — 6+ baris
   teks teknis mendominasi tampilan sebelum user sempat lihat angka yang
   relevan (`Total Teralokasi`). Mockup HANYA menonjolkan 1 angka utama
   per kartu.
4. `.titipan-over-badge` (badge "⚠️ Rp X") juga 0 CSS — tampil sbg teks
   merah polos, bukan pil/badge.

## Rekomendasi

- **A. Styling kartu (diimplementasikan)** — tambah class `.titipan-card`,
  `.titipan-card-hero`, `.titipan-pool-row`, `.titipan-owner-card`,
  `.titipan-owner-avatar`, `.titipan-over-badge` di `styles.css`, dipakai
  di SEMUA tema (bukan cuma `[data-theme="modern"]`) supaya tampilan
  default (screenshot user) langsung ikut rapi.
- **B. Sembunyikan rincian audit di balik expand (diimplementasikan)** —
  baris "Total Pokok Dikomit" s/d "Total Kelebihan Alokasi" dibungkus
  `<details class="titipan-detail-toggle titipan-audit-toggle">🔍 Rincian
  Audit & Rekonsiliasi</details>` collapsed-by-default. "Total Teralokasi"
  TETAP selalu terlihat (angka paling relevan).
- **C. Avatar inisial per pemilik (diimplementasikan)** — huruf pertama
  nama pemilik dirender via `data-owner-initial` + CSS `::before`, 0 <span>
  nama duplikat ditulis.
- **D. Belum diimplementasikan (usulan lanjutan, di luar scope patch ini
  supaya tetap "hanya file yang dirubah"):**
  - Tampilkan porsi % per pemilik di kartu (spt `.owner-pct`/`.tcard-sub`
    mockup) — perlu field baru di `DanaTitipanPortfolioAPI.build()`
    (`dana-titipan-aggregation-api.js`), bukan murni CSS/markup.
  - Pertimbangkan pindahkan warning mismatch Majoris/Renov ke badge
    ringkas (bukan kalimat panjang) — perlu keputusan Design Lock krn
    menyangkut isi pesan, bukan cuma visual.
  - `modules/finance/dana-titipan-portfolio-render.js` sekarang 1605
    baris (ambang lint 1600, lihat output `node scripts/build.js`) —
    pertimbangkan pecah file spt pola `aset.js`/`aset-reports.js` di sesi
    mendatang.

## File yang diubah di patch ini

- `modules/finance/dana-titipan-portfolio-render.js` — restyle
  `_poolSummaryHtml()`, `_ownerCardHtml()`, footer totals di `_renderNow()`.
  0 logic/rumus/data-action/id diubah — murni class/markup tambahan.
- `styles.css` — tambah aturan CSS baru (lihat blok "MOCKUP-ALIGN").
- `tests/s643-audit-lintas-s641-s642.test.js`,
  `tests/s645-dana-titipan-owner-list-tabel-modern.test.js` — 3 assertion
  literal yang mengunci markup lama `<details class="u-mb6" ...>` diupdate
  supaya sesuai class baru yang disengaja (0 test lain disentuh).

**Status test:** `node --test tests/*.test.js` → 4628/4628 lolos.

## Cara pasang

1. Timpa 4 file di atas ke lokasi yang sama di project.
2. Jalankan `npm run build:safe` (atau `node scripts/build.js`) seperti
   biasa — patch ini SENGAJA tidak menyertakan `app-bundle-*.min.js`/
   `index.html`/`app_production.html`/`sw.js` hasil build (itu artefak
   turunan, bukan "file yang dirubah", dan build juga menaikkan nomor
   versi + sinkronisasi 5 file lain yang di luar scope perbaikan ini).
