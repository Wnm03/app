# FIX v1134 -> v1135 (s422g) — Refresh kalkulasi turunan (Kekayaan Bersih/Zakat) dari `save()`

## Latar belakang
Rekomendasi dari review s422f: `syncLinkedAssetNilaiFromAkun()` (s422f)
mengoreksi `a.nilai` tiap ada transaksi di akun tertaut, tapi panel/kalkulasi
turunan yang membaca `a.nilai` (Kekayaan Bersih, dan nantinya Zakat Maal)
belum ikut di-refresh otomatis di siklus yang sama -- user harus pindah
halaman/trigger render lain dulu baru angkanya ikut ter-update.

## Fix
Tambah 2 guard baru di `save()` (titik tunggal, pola sama
`invalidateAccBalCache()`), BUKAN nambal tiap pemanggil `save()` satu-satu
di 6+ tempat:

```js
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
```

- `renderKekayaanBersih()` sudah ada (`modules-render.js`, delegasi ke
  `Kekayaan.renderBersih()`). Aman dipanggil dari halaman mana pun karena
  tiap elemen DOM di dalamnya sudah di-guard `if(el)` sendiri-sendiri (lihat
  komentar "GAP FIX Kekayaan Bersih" di `modules-calc.js`) -- kalau
  panel Kekayaan Bersih sedang tidak di-render di DOM, panggilan ini jadi
  no-op murah (cuma hitung ulang beberapa total, tidak nyentuh DOM).
- `hitungZakatMaal()` BELUM ada di codebase saat ini (Zakat Maal masih
  dihitung on-demand di modal, bukan lewat fungsi bernama itu) -- guard
  `typeof` di sini sengaja future-proof, jadi kalau fungsi itu ditambahkan
  nanti otomatis ikut ter-refresh dari `save()` tanpa perlu nambal titik ini
  lagi.

Urutan guard di dalam `save()` sengaja diletakkan SETELAH
`syncLinkedAssetNilaiFromAkun()` supaya `renderKekayaanBersih()` membaca
`a.nilai` yang SUDAH dikoreksi, bukan nilai lama.

## Catatan desain (bukan bug, sudah didokumentasikan sebelumnya)
Transaksi biasa di akun yang ditautkan sebagai akun aset otomatis dianggap
"perubahan nilai aset" (by design, s422f). Sudah ada hint di UI modal Aset
yang menjelaskan ini -- tidak diubah di sesi ini.

## File berubah
- `modules/shared/features-helpers-global-security.js` — `save()` tambah 2
  guard baru (`renderKekayaanBersih`, `hitungZakatMaal`), sejajar guard s422f
- `tests/save-derived-calc-refresh-s422g.test.js` — BARU, 4 test (wiring
  guard renderKekayaanBersih terpanggil, wiring guard hitungZakatMaal
  terpanggil, no-op/tidak error kalau keduanya belum ada, urutan panggilan
  invalidateAccBalCache -> syncLinkedAssetNilaiFromAkun -> renderKekayaanBersih
  tidak berubah/ter-drop)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild dari source
  (esbuild tidak tersedia, UNMINIFIED)
- `index.html`, `app_production.html`, `sw.js` — versi -> v1135
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- File versi/label lain — cuma sinkron konstanta versi (build.js), isi
  logic TIDAK berubah

## Verifikasi
- `node --test tests/*.test.js` -> **2850/2850 pass** (2846 lama + 4 baru),
  0 fail.
- `node scripts/build.js s422g-save-refresh-derived-calc` -> build sukses,
  sintaks kedua bundle valid, versi `v1134` -> `v1135`.
