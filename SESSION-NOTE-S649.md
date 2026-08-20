# Sesi S649 — Fix BUG-012 (FinanceIntelligence cache stale setelah ganti bulan)

## Catatan: audit ulang TODO.md sebelum eksekusi (stale-doc, pola sama S646)

Dicek langsung ke source (bukan cuma baca `RENCANA-IMPLEMENTASI-S646-S664.md`
urut nomor sesi asli): **BUG-009, BUG-010, BUG-011 sudah lebih dulu
selesai** (S647/S648/audit-S646), jadi sesi ini lanjut ke item genuinely
OPEN berikutnya sesuai urutan Blok D rencana: **BUG-012**.

## Masalah

**File:** `modules/finance/tx-list-cashflow.js` — `changeMonth()` /
`changeTxListMonth()` (alias)

`FinanceIntelligence` men-cache hasil panggilan TANPA argumen eksplisit
(`incomeVsExpense()`/`budgetSummary()` bulan default — lihat `_ivxCache`/
`invalidateCache()` di `finance-intelligence.js`). Cache ini normalnya
diinvalidate lewat hook yang sama dengan cache saldo akun
(`save()`/`renderPageContent()`).

`changeMonth()` — dipanggil langsung dari tombol ‹ › navigasi bulan di
kartu "📋 Semua Transaksi"/Ringkasan Keuangan — mengganti `curMonth`/
`curYear` (bulan aktif yang jadi acuan default cache itu) TAPI **tidak
lewat `save()` atau `renderPageContent()`**, cuma memanggil
`renderKeuangan()` langsung. Akibatnya kartu turunan yang baca
`FinanceIntelligence` tanpa argumen (mis. "Skor Kesehatan Finansial",
lewat `FinancialHealthScorePresenter.render()` yang sudah dipanggil di
`renderKeuangan()`) tetap menampilkan angka cache bulan **sebelumnya**
sampai ada `save()`/pindah-halaman lain yang kebetulan invalidate
cache-nya.

## Fix

Tambah pemanggilan eksplisit
`FinanceIntelligence.invalidateCache()` di `changeMonth()`, tepat sebelum
`renderKeuangan()`, dengan guard `typeof` yang sama polanya dengan
`renderPageContent()` (`modules-render.js`). `changeTxListMonth()` ikut
kena fix ini karena murni alias (`return changeMonth(dir)`). 0 cache baru,
0 rumus baru — `invalidateCache()` sudah ada, cuma dipanggil juga di titik
ganti-bulan ini.

## Test

`tests/s649-changemonth-financeintelligence-cache-invalidate.test.js`
(5 test, semua pass):
1. `changeMonth()` memanggil `invalidateCache()` tepat 1x per ganti bulan.
2. Navigasi mundur lintas tahun (Jan → Des tahun sebelumnya) tetap
   invalidate cache (0 regresi jalur wrap-around).
3. `changeTxListMonth()` (alias) ikut invalidate cache.
4. `FinanceIntelligence` belum dimuat (guard `typeof`) → tidak throw, 0
   regresi untuk halaman/test yang tidak load modul itu.
5. `txListPage` tetap direset ke 1 & `curMonth` tetap berubah (0 regresi
   perilaku lama).

**Full suite:** `node --test tests/*.test.js` → **4648/4648 pass** (4643
sebelumnya + 5 baru), 0 fail.

## File yang berubah (patch-only)

```
modules/finance/tx-list-cashflow.js                                    (edit)
tests/s649-changemonth-financeintelligence-cache-invalidate.test.js     (baru)
```

## Sesi berikutnya (rekomendasi)

- S650: BUG-013 — `_emergencyFundRisk()` ganti pemakaian `dd.saved` mentah
  dengan `(dd.accountId && typeof recalcAccBalance==='function') ?
  recalcAccBalance(dd.accountId) : (dd.saved||0)`, pola sama
  `DanaDaruratAI.currentSaved()`/`invest-ai-widget.js._checkDanaDarurat()`.
  Ini bagian terakhir dari Blok D rencana awal.
- Sekalian: `TODO.md` masih basi — BUG-006/007/009/010/011 sudah DONE di
  source tapi masih tertulis OPEN; BUG-012 sekarang juga sudah DONE
  setelah sesi ini. Rekomendasi: sesi khusus stale-doc cleanup sebelum
  lanjut ke Blok E (data-health) supaya tabel TODO tidak makin menyesatkan
  audit-audit berikutnya.
