# Sesi S648 — Fix BUG-010 (showFilteredTx scope 'keuangan' — search scope)

## Masalah

**File:** `modules/finance/filter-laporan.js` — `showFilteredTx()`, scope `'keuangan'`

`renderKeuangan()` (di `modules/*/modules-render.js`, bagian render `#txList`)
sudah lebih dulu benar memfilter list transaksi pakai KEDUA kondisi:
`txMatchesFilters(t,kf) && txMatchesSearch(t,kf.search)`.

`showFilteredTx(scope='keuangan')` — dipanggil saat user tap kartu ringkasan
(mis. "Pemasukan"/"Pengeluaran" bulan ini) — cuma pakai `txMatchesFilters(t,kf)`,
**tidak ikut** `txMatchesSearch(t,kf.search)`. Akibatnya: user ketik kata kunci
di kolom cari filter Keuangan (`#kfSearch`), list utama sudah kefilter sesuai
pencarian, tapi modal ringkasan dari tap kartu tetap nampilin (dan
menjumlahkan total) transaksi yang seharusnya sudah tersaring keluar oleh
pencarian — summary jadi tidak nyambung 1:1 dengan apa yang sedang dicari user.

## Fix

Tambah `&&txMatchesSearch(t,kf.search)` ke filter scope `'keuangan'` di
`showFilteredTx()`, pola sama persis `renderKeuangan()`/`modules-render.js`.
0 rumus pencarian baru — `txMatchesSearch()` sudah ada (dipakai di tempat
lain), cuma dipakai juga di titik ini. Scope lain (`dashboard`/`laporan`/
`account`) tidak tersentuh (kf.search tidak relevan di scope-scope itu).

## Test

`tests/s648-showfilteredtx-keuangan-search-scope.test.js` (4 test, semua
pass):
1. `kfSearch` terisi → transaksi yang tidak match kata kunci tidak ikut
   ditampilkan/dihitung ke summary.
2. `kfSearch` kosong → 0 regresi, semua transaksi bulan berjalan tetap ikut.
3. `kfSearch` cocok nama akun (bukan cuma kategori/catatan) → tetap match,
   konsisten dengan `txMatchesSearch()` yang juga mengecek nama akun.
4. Scope selain `'keuangan'` (mis. `'laporan'`) → 0 regresi, `kfSearch` tidak
   dipakai sama sekali di jalur itu (perilaku lama tetap).

**Full suite:** `node --test tests/*.test.js` → **4643/4643 pass** (4639
sebelumnya [4634 + 5 dari S647] + 4 baru), 0 fail.

## File yang berubah (patch-only)

```
modules/finance/filter-laporan.js                          (edit)
tests/s648-showfilteredtx-keuangan-search-scope.test.js     (baru)
```

## Sesi berikutnya (rekomendasi)

- S649: BUG-011 — sudah ✅ **fix duluan di source** (dikonfirmasi audit S646:
  `goToList()` sudah pakai `SHOP_TAB_ORDER.indexOf()`/`CN_TAB_ORDER.indexOf()`,
  tidak ada ternary hardcode lagi). Sesi berikut bisa loncat langsung ke
  Blok D (S652 rencana awal — `FinanceIntelligence.invalidateCache()` di
  `changeMonth()`/`changeTxListMonth()`).
- Sekalian: update `TODO.md` menandai BUG-006/007/009/010/011 DONE
  (stale-doc cleanup — lihat catatan S646/S647; sekarang tinggal BUG-012/013
  yang masih genuinely OPEN di source dari daftar rencana awal).
