# FIX v1135 -> v1136 (s422h) — Guard DOM sebelum `renderKekayaanBersih()` di `save()`

## Latar belakang
Rekomendasi tambahan dari review s422g: 3 guard cache lain di `save()`
(`invalidateAccBalCache`, `invalidateCashflowForecastCache`,
`FinanceIntelligence.invalidateCache`) murah -- cuma set flag/kosongkan
cache. `renderKekayaanBersih()` beda: dia beneran hitung ulang
`totalSaldoAkun()+totalAssetValue()+totalInventoriBisnisValue()+
totalPiutangValue()` tiap dipanggil (lihat `Kekayaan.renderBersih()`,
`modules-calc.js`). Karena `save()` adalah titik tunggal yang dipanggil dari
SEMUA halaman (bukan cuma halaman yang nampilin panel Kekayaan Bersih),
hitungan itu sebelumnya jalan di tiap mutasi data di halaman manapun,
walau hasilnya tidak dipakai (elemen DOM-nya sendiri sudah di-guard
`if(el)`, tapi hitungan totalnya tetap jalan).

## Fix
Tambah 1 guard DOM sebelum panggilan `renderKekayaanBersih()`:

```js
if(typeof renderKekayaanBersih==='function'&&typeof document!=='undefined'&&document.getElementById('kbNetWorth'))renderKekayaanBersih();
```

Sekarang hitungan cuma jalan kalau panel Kekayaan Bersih (`#kbNetWorth`)
memang lagi di-render. `hitungZakatMaal()` TIDAK diberi guard DOM serupa
karena belum ada implementasinya -- guard `typeof` yang sudah ada cukup.

## File berubah
- `modules/shared/features-helpers-global-security.js` — `save()`, guard
  DOM tambahan sebelum `renderKekayaanBersih()`
- `tests/save-derived-calc-refresh-s422g.test.js` — test lama
  "renderKekayaanBersih terpanggil" dipecah jadi 2: (a) terpanggil kalau
  `#kbNetWorth` ada di DOM, (b) TIDAK terpanggil kalau tidak ada. Test
  urutan panggilan (`invalidateAccBalCache -> syncLinkedAssetNilaiFromAkun
  -> renderKekayaanBersih`) disesuaikan pakai stub `document` yang
  menyediakan `#kbNetWorth`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild dari source
  (esbuild tidak tersedia, UNMINIFIED)
- `index.html`, `app_production.html`, `sw.js` — versi -> v1136
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- File versi/label lain — cuma sinkron konstanta versi (build.js), isi
  logic TIDAK berubah

## Verifikasi
- `node --test tests/*.test.js` -> **2851/2851 pass** (2846 dasar + 5
  di file test s422g/h), 0 fail.
- `node scripts/build.js s422h-guard-dom-kbnetworth-before-render` ->
  build sukses, sintaks kedua bundle valid, versi `v1135` -> `v1136`.
