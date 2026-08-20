# Sesi S647 — Fix BUG-009 (toggleKeuFilter panel state detection)

## Masalah

**File:** `modules/finance/filter-laporan.js` — `toggleKeuFilter()`

Panel `#keuFilterPanel` disembunyikan DEFAULT lewat class CSS `u-dnone`
(lihat `index.html`/`app_production.html`), **bukan** inline style.
`toggleKeuFilter()` lama mendeteksi status hidden lewat
`panel.style.display==='none'` — di kondisi awal, `style.display` kosong
(`''`), bukan `'none'`, jadi deteksi ini salah baca kondisi awal sebagai
"sudah kebuka" (`show=false`). Akibatnya:
- Tap **pertama** → `panel.style.display` di-set ke `'none'` (tetap
  tertutup, kelihatan seperti tombol tidak merespons).
- Tap **kedua** → baru `style.display==='none'` cocok, panel benar-benar
  terbuka.

## Fix

Deteksi status hidden diganti ke `panel.classList.contains('u-dnone') ||
getComputedStyle(panel).display==='none'` (fallback ke computed style
untuk kasus panel sudah pernah dibuka lewat jalur lain, mis.
`updateKfBadge()`/pemuatan preferensi filter tersimpan yang langsung
`set style.display='block'` tanpa melepas class). Class `u-dnone`
dilepas eksplisit saat panel dibuka, supaya state class & inline style
tetap konsisten untuk toggle berikutnya.

**Perilaku Simpan/tutup via `style.display` tetap sama** (0 perubahan ke
kode lain yang bergantung padanya) — hanya titik deteksi kondisi awalnya
yang diperbaiki.

## Test

`tests/s647-togglekeufilter-class-detect.test.js` (5 test, semua pass):
1. Kondisi awal (hidden via class `u-dnone`) → tap pertama langsung buka.
2. Panel sudah terbuka → tap berikutnya menutup.
3. Kondisi hidden via inline `style.display='none'` (jalur lama) → tetap
   buka (0 regresi).
4. Dua tap berturutan: buka → tutup (siklus toggle normal, bukan 3 tap).
5. Elemen panel tidak ada → tidak throw (guard null).

**Full suite:** `node --test tests/*.test.js` → **4639/4639 pass** (4634
sebelumnya + 5 baru), 0 fail.

## File yang berubah (patch-only)

```
modules/finance/filter-laporan.js                      (edit)
tests/s647-togglekeufilter-class-detect.test.js         (baru)
```

## Sesi berikutnya (rekomendasi)

- S648: BUG-010 — `showFilteredTx()` scope `'keuangan'` belum ikut
  `txMatchesSearch(t, kf.search)`, beda dengan `renderKeuangan()` yang
  sudah benar.
- Sekalian: update `TODO.md` menandai BUG-006/007/009/011 DONE
  (stale-doc cleanup — lihat catatan S646).
