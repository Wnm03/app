# THEME CONTRAST FIX — Koreksi (Sesi 336)

**Catatan penting**: versi dokumen ini sebelumnya (lihat
`THEME-CONTRAST-FIX.md.bak`) mendeskripsikan sebuah "Tahap 9" dengan
tabel nilai `--text3` lama→baru per tema dan klaim `tests/theme-
text3-contrast.test.js` sudah ada dengan 1366/1366 test lulus. Audit
Sesi 336 menemukan **dokumen itu tidak pernah benar-benar diterapkan**
ke kode: file test yang disebut tidak ada di `tests/`, dan nilai hex
"lama" yang disebut tidak cocok dengan isi `styles.css` saat ini.
Kemungkinan dokumen draft dari eksplorasi sesi lain yang tidak jadi
di-merge, atau ZIP checkpoint yang salah dibawa. Disimpan sebagai
`.bak` untuk arsip, tidak dipakai sebagai rujukan.

## Temuan aktual (Sesi 336)

`styles.css` mendefinisikan **10** tema (`dark`, `ocean`, `light`,
`stone`, `slate`, `mono`, `sand`, `ink`, `sage`, `fresh`) via selector
`[data-theme="..."]`. Diukur ulang dengan formula kontras WCAG
(relative luminance) terhadap `--bg` dan `--surface2`, **seluruh 10
tema sudah memenuhi ambang AA (≥4.5:1) untuk teks normal** — rentang
aktual 4.50:1–5.78:1. Nilai `--text3` di kode sudah benar; yang basi
hanyalah `ROADMAP-v1.1.md` §High Priority #1 dan `KNOWN-ISSUES.md`
§1.1, yang masih menyebut status "belum diperbaiki". Kedua dokumen itu
sudah disinkronkan di sesi ini.

## Perubahan Sesi 336

- **Tidak ada perubahan nilai warna** di `styles.css` — sudah sesuai
  target sebelum sesi ini dimulai.
- **`tests/theme-text3-contrast.test.js`** — 22 test baru: parsing
  token `--bg`/`--surface2`/`--text3` langsung dari `styles.css` per
  blok tema (bukan hardcode independen), hitung ulang rasio kontras
  WCAG untuk tiap tema vs `--bg` dan vs `--surface2`, plus guard token
  `--text2`/`--accent` tiap tema tetap ada. Ini adalah pengaman
  regresi ke depan, bukan perbaikan.
- **`ROADMAP-v1.1.md`**, **`KNOWN-ISSUES.md`** — status item
  diperbarui dari "belum" menjadi "selesai", dengan catatan angka
  rasio aktual.
- **`CHANGELOG.md`** — entry baru (aditif).
- **`THEME-CONTRAST-FIX.md`** (dokumen ini) — ditulis ulang;
  `THEME-CONTRAST-FIX.md.bak` — arsip versi lama yang tidak akurat.

## Tidak diubah

- Nilai hex `--text3` (maupun token lain) di `styles.css` — tidak
  disentuh sama sekali.
- Markup/JS halaman manapun, `FEATURE_REGISTRY`, business logic,
  routing, database, service worker, build system, `package.json`.

## Hasil test

```
node --test tests/*.test.js
# tests 1821  (baseline 1799 + 22 baru)
# pass 1821
# fail 0
```
