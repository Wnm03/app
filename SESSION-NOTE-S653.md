# Sesi S653 — Test langsung BudgetRecommendationAPI (Blok F lanjutan)

## Konteks

Lanjutan Blok F (gap test coverage) dari rekomendasi S652. Sisa 3 opsi:
`BudgetRecommendationAPI`, `filter-laporan.js`, atau cleanup catatan
`FinancialRiskDashboardAPI` yang sudah ✅ SEBAGIAN. Dipilih
`BudgetRecommendationAPI` — gap paling jelas & tidak butuh keputusan
cleanup (murni tambah test baru).

## Audit source dulu

`modules/finance/budget-recommendation-api.js` sudah punya
`tests/budget-recommendation-severity-sort-s333.test.js`, tapi itu
regression test BUG-014 yang HANYA cover urutan (`_sortBySeverity()`)
lewat `spendingAnalysis()`/`budgetSuggestion()` — bagian lain masih 0
test langsung:
- `_budget()` — guard "FinanceIntelligence belum dimuat" & passthrough
  `{ok:false, reason}`.
- `_classify()` — 4 cabang kategori (over/near/underused/ok) terisolasi.
- `budgetInsight()` — 4 rule (over/near/underused/healthy), termasuk
  kasus overlap (underused + healthy bisa muncul BERSAMAAN krn syarat
  `budget_healthy` cuma `overCount===0 && nearCount===0`, tidak
  exclusive thd underused — detail yang gampang salah asumsi kalau cuma
  baca sepintas).
- `summary()` — kombinasi `ok` (butuh `spendingAnalysis` DAN
  `budgetSuggestion` ok) + `insight` yang selalu array.
- `budgetSuggestion()` — isi `message`/`suggestedLimit` per kategori
  (s333 baru cek urutan & count-nya, belum isi kontennya).

## Yang dikerjakan

`tests/s653-budget-recommendation-api.test.js` (baru, 19 test):
- `_budget()`: 4 test (belum dimuat, reason default, reason asli
  diteruskan, parameter month/year diteruskan apa adanya).
- `_classify()`: 4 test (1 per kategori, termasuk batas pct 0.4/0.8
  inklusif-eksklusif).
- `budgetSuggestion()`: 4 test isi konten per kategori (`suggestedLimit`
  cuma ada di 'over', message beda per kategori, kategori 'ok' tidak
  disertakan).
- `budgetInsight()`: 6 test (passthrough `{ok:false}`, 4 rule + kasus
  overlap underused+healthy, kasus HANYA healthy).
- `summary()`: 2 test (ok=true gabungan, ok=false + insight tetap array
  kosong bukan `{ok:false}`).

Ditemukan 1 asumsi salah di draft awal saat dijalankan ke source asli
(bukan bug di source — di test): dikira `budgetInsight()` cuma keluar
`budget_underused_count` sendirian saat underused>0 tanpa over/near,
padahal `budget_healthy` SELALU ikut muncul di kondisi itu (syaratnya
independen). Test diperbaiki mengikuti perilaku source asli (bukan
sebaliknya) — dikonfirmasi lewat run source asli, bukan ditebak dari
komentar.

## Test

`node --test tests/s653-budget-recommendation-api.test.js` → **19/19
pass**.

`node --test tests/*.test.js` (full suite) → **4664/4664 pass**, 0 fail
— 0 file lama tersentuh/rusak sesi ini.

## File yang berubah (patch-only)

```
tests/s653-budget-recommendation-api.test.js   (baru)
TODO.md                                        (edit — dokumentasi)
```

## Sesi berikutnya (rekomendasi)

- **Blok F lanjutan**: `filter-laporan.js` (`txMatchesFilters()`/
  `toggleKeuFilter()`/`showFilteredTx()`/`goToList()` — sebagian sudah
  tercakup lewat `tests/s647-togglekeufilter-class-detect.test.js` &
  `tests/s648-showfilteredtx-keuangan-search-scope.test.js`, tapi
  `txMatchesFilters()`/`goToList()` masih 0 test langsung), atau cleanup
  catatan `FinancialRiskDashboardAPI` di TODO.md (item ✅ SEBAGIAN —
  coverage-nya sebenarnya sudah lengkap, tinggal sederhanakan baris
  catatannya).
- Blok E (Data Health) tetap di luar cakupan sesi patch-only kode (lihat
  SESSION-NOTE-S652.md) — butuh akses langsung ke data/backup app yang
  jalan, bukan export statis.
