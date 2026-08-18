# Sesi S646 — Fix BUG-008 (WorthIt.catatBeli)

## Catatan penting: TODO.md basi (stale-doc, sama pola sesi 487)

Sebelum eksekusi, dicek langsung ke source (bukan cuma baca TODO.md).
Hasilnya, dari daftar rencana S646–S651 di dokumen rencana sebelumnya,
**tiga item ternyata sudah lebih dulu diperbaiki di source**, TODO.md-nya
saja yang belum disinkron:

| Bug | Status TODO.md | Status source (dicek) |
|---|---|---|
| BUG-007 | OPEN | ✅ sudah fix — `tagihan-kalender.js` `revertBillFromDeletedTx()`, komentar `FIX (BUG-007, audit 2026-08)` |
| BUG-006 | OPEN | ✅ sudah fix — `piutang-utang.js` `Debt.syncBill()`, komentar `FIX (BUG-006, audit 2026-08)` |
| BUG-011 | OPEN | ✅ sudah fix — `goToList()` sudah pakai `SHOP_TAB_ORDER.indexOf()`/`CN_TAB_ORDER.indexOf()`, tidak ada ternary hardcode lagi |
| BUG-008 | OPEN | ❌ **masih OPEN, dikerjakan sesi ini** |
| BUG-009 | OPEN | ❌ masih OPEN (belum dikerjakan) |
| BUG-010 | OPEN | ❌ masih OPEN (belum dikerjakan) |

Rekomendasi: update `TODO.md` supaya BUG-006/007/011 ditandai DONE (di
luar cakupan patch-only sesi ini — sesi berikut bisa sekalian
membersihkan tabel TODO).

## Yang dikerjakan sesi ini: BUG-008

**File:** `modules/finance/worthit.js` — `WorthIt.catatBeli()`

**Masalah (2 bug dalam 1 fungsi):**
1. `catatBeli()` selalu memaksa `cicilanLastInput='total'` lalu
   `syncCicilanPreview('total')` — ini menghitung ULANG
   `txCicilanPerBulan` dari Total÷Tenor, **menimpa** `d.cicilanBulan`
   yang sudah dihitung presisi oleh kalkulator WorthIt (mis. skema bunga
   custom yang tidak sama dengan rumus sederhana total/tenor di
   `cicilan.js`).
2. DP (`d.dp`) tidak pernah dipetakan — `txCicilanTotal` selalu diisi
   `d.price` mentah walau sebagian sudah dibayar DP di muka (lihat
   `WorthIt.hitung()`, `uangKeluarSekarang=dp` untuk method cicilan).

**Fix:**
- `txCicilanTotal` sekarang diisi `financed = max(0, price - dp)`,
  bukan `price` mentah.
- Kalau `d.cicilanBulan > 0` (sudah presisi dari kalkulator),
  `cicilanLastInput` diset ke `'perbulan'` (bukan `'total'`) sebelum
  memanggil `syncCicilanPreview('perbulan')` — supaya Total yang
  direkalkulasi DARI cicilan/bulan itu, bukan sebaliknya. Ini otomatis
  juga benar terhadap DP karena cicilan/bulan hasil kalkulator sudah
  dihitung dari `(price-dp)/tenor`.
- Kalau `cicilanBulan` belum diisi (user cuma isi Total Harga di
  kalkulator), tetap pakai jalur lama (`cicilanLastInput='total'`,
  `syncCicilanPreview('total')`), tapi dengan Total yang sudah
  benar (`price-dp`).

**Test:** `tests/s646-worthit-catatbeli-cicilan-dp.test.js` (4 test,
semua pass) — cakupan:
1. cicilan/bulan dari kalkulator tidak ditimpa
2. DP dikurangkan dari Total Harga
3. tanpa DP, Total Harga tetap = price penuh (0 regresi)
4. method tunai tidak tersentuh (0 regresi)

**Full suite:** `node --test tests/*.test.js` → **4634/4634 pass** (4630
sebelumnya + 4 baru), 0 fail.

## File yang berubah (patch-only)

```
modules/finance/worthit.js                          (edit)
tests/s646-worthit-catatbeli-cicilan-dp.test.js      (baru)
```

## Sesi berikutnya (rekomendasi)

- S647: BUG-009 (`toggleKeuFilter()` — deteksi state panel pakai
  `panel.style.display==='none'`, ganti ke `classList`/`getComputedStyle`).
- S648: BUG-010 (`showFilteredTx()` scope `'keuangan'` belum ikut
  `txMatchesSearch()`).
- Sekalian: update `TODO.md` menandai BUG-006/007/011 DONE (stale-doc
  cleanup, pola sama sesi 487).
