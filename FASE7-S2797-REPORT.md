# Fase 7 — S2797: tanggal daftar transaksi, BBM/Aset/Shop tidak terpotong, lint + minify penuh

Basis: app-main (build 2795) + patch S2796. Patch ini KUMULATIF (memuat file S2796 + S2797). Setelah apply jalankan `node scripts/apply-delete-manifest.js`.

## 1. Format tanggal daftar transaksi (item "tidak diubah" di S2796)
- `modules/finance/tx-list-cashflow.js`: helper `fmtTxDateDisplay()` (mandiri, tanpa bergantung global lain; input non-ISO/kosong dikembalikan apa adanya, ter-escape). Dipakai di kartu transaksi, baris tabel (atribut `title` tetap ISO), dan kartu tagihan terjadwal.
- `modules/finance/linktx.js`: daftar pilih transaksi tertaut memakai helper yang sama (dengan guard `typeof`).
- Hasil: "2026-11-11" -> "11 Nov 2026". Data `t.date` tetap ISO (hanya tampilan; sort/filter/simpan tidak berubah).
- Mengapa S2796 menunda: ~20 tes memuat file ini sendirian dalam sandbox vm. Helper pertama (memakai `MONTHS`) membuat 23 tes gagal; helper dibuat mandiri -> 0 regresi.
- Tidak diubah: tanggal di riwayat BBM (`car-notes.js`), Riwayat Servis, dan tabel pengembalian Dana Titipan (`dana-titipan-portfolio-render.js`) masih ISO.

## 2. Audit Shop / Dana Titipan / BBM-Servis / Aset (Chromium, tema Dark + Light)
Harness sintetis: 320/360/412/768/1440px x 2 tema x semua sub-tab (280 tampilan), nama 80 karakter, nominal sampai Rp 7 miliar. Detektor: teks terpotong (ellipsis/overflow hidden), elemen keluar kartu/layar, scroll horizontal, target sentuh.
Temuan nyata dan perbaikan (`tokens.css`, blok "FASE 7 (S2797)", tanpa `!important`, tanpa `data-action`):
- BBM: badge "28.6 km/L" pecah per huruf ("2/8./6/k/m/L") -> `white-space:nowrap`. Nominal BBM terpotong di tepi layar (360px) -> kolom nominal tidak menyusut, baris membungkus <=599px, tombol hapus rata kanan.
- Nama panjang 1 baris + ellipsis di Car Notes, Aset (Buku Aset, Investasi, ringkasan), Shop (Etalase) -> maksimal 3 baris. Riwayat Servis dikecualikan (sudah clamp 2 baris sendiri).
Sebelum -> sesudah: temuan teks terpotong/keluar kartu pada Shop, Aset, dan BBM 90+ -> 0 (tampilan ber-flag 46 -> 32, sisanya hanya yang disengaja di bawah); scroll horizontal 0 di semua tampilan; Keuangan (termasuk tab Dana Titipan) bersih.
Sisa flag yang disengaja/bukan bug: baris chip kendaraan/filter yang bisa digeser, judul riwayat servis (clamp 2 baris), label sumbu grafik SVG efisiensi km/L (1-3px di tepi), elemen visually-hidden.

## 3. Lint penuh + minify penuh (item "belum" di S2796)
- `eslint .`: 0 error (sebelumnya 3 error lama, semua di berkas non-produksi: `e2e/run-e2e-shop-visual-smoke.js` `innerWidth` -> `window.innerWidth`; `tests/preorder-kasir-followup-regression.test.js` kunci ganda `renderSiapPulang`). 1880 warning `no-unused-vars` lama tidak disentuh.
- `node scripts/build.js --require-minify s2433-fase7-tx-date-bbm-2797`: esbuild nyata (bundle A 1135.9 KB, B 2550.6 KB, `node --check` lolos), tanpa `SKIP_LINT`. Bundle S2796 sebelumnya tidak diminify.
- `refresh-file-hashes.py --check`: 52 ok, 0 basi. Cache `kw-cache-v2797`.

## 4. Test
Full suite: 9708 tes, 9704 lulus, 3 gagal = tes "retired path" yang sama dengan baseline (S1780, s1608, S2308; hilang setelah `apply-delete-manifest.js`). Tes baru `tests/fase7-s2797-tx-date-bbm-overflow.test.js` (11 tes).

## Belum / batas klaim
- Safari/WebKit, Firefox, dan perangkat Android nyata TIDAK diuji (hanya Chromium tersedia di lingkungan ini).
- Dana Titipan: hanya tampilan komitmen sintetis; riwayat pengembalian gagal diseed (butuh pemilik investasi) sehingga tabel pengembalian belum teruji visual. Shop: hanya Etalase dengan nama panjang yang bermasalah; tab lain bersih pada data sintetis (bukan data nyata).
- Tema modern/graphite/auto belum diaudit.
- Tanggal ISO masih ada di riwayat BBM, Riwayat Servis, tabel pengembalian Dana Titipan.

## 5. Uji lanjutan (sesi yang sama, tanpa perubahan kode)
- Android: emulasi Chromium (Pixel 7 412px, Galaxy S9+ 320px; mobile + touch + UA) x semua halaman/sub-tab. 0 scroll horizontal; tidak ada temuan baru di Shop/Aset/BBM/Keuangan pada tema dark, light, graphite, auto. Ini emulasi, BUKAN perangkat/WebView Android nyata.
- Tema graphite dan auto: bersih. Dana Titipan (komitmen + riwayat pengembalian dengan nama pemilik 80 karakter dan nominal Rp 99 miliar): tidak ada teks terpotong di dark/light/graphite/auto.
- Tema modern: tabel Ledger (Aset > Buku Aset, Laporan > Dana Titipan) di <=599px memakai `.tx-tbl{min-width:560px}` dalam pembungkus yang bisa digeser, sehingga kolom Nilai/Saldo/"Pokok -> Kini" ada di luar layar sampai digeser (tes `s2117-data-dense-ui` mengunci nilai 560px). Ini keputusan desain, TIDAK diubah; opsi: kecilkan min-width + bungkus kolom, atau sticky kolom nominal.
- Firefox dan Safari/WebKit: tetap tidak bisa diuji (hanya Chromium terpasang; tidak ada akses jaringan untuk memasang).
