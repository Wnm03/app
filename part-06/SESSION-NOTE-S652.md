# Sesi S652 — Audit Blok E (Data Health) + Test langsung FinanceDashboard (Blok F)

## Konteks

Lanjutan `RENCANA-IMPLEMENTASI-S646-S664.md` setelah S651 (stale-doc
cleanup TODO.md). Rekomendasi S651: lanjut Blok E (Data Health, backup
2026-08-16), tapi audit dulu status langsung ke source/data sebelum
eksekusi (pola sama audit S646/487).

## Audit Blok E — hasil: TIDAK bisa dieksekusi sebagai patch source

Cek 4 item Blok E (S652–S655 di rencana lama: Pemilik Sumber Potongan
hilang, Majoris dual ownership, Renovasi akun tidak valid, Anggaran
Pulsa/Kuota) ke `data-health-check.js` — semuanya berasal dari cek yang
**didesain sengaja "murni baca, 0 auto-repair"**:

- Komentar S574-E/DL-Next-7 di `data-health-check.js` (blok
  `t.deductionOwnerId`): "Field ini murni TAG/metadata (siapa
  penanggung), TIDAK pernah masuk rumus saldo... jadi cek ini MURNI
  BACA, 0 auto-repair/auto-delete, sama disiplin semua cek orphan lain
  di file ini."
- `TitipanReconcile` (modul lain yang jadi rujukan Blok E) juga
  eksplisit "PURE, baca-saja (0 mutasi)" di header filenya.

Warning-warning ini menandai **data transaksi nyata milik user** (akun
"Saldo tagihan"/proyek Renov/aset "Majoris"/anggaran "Pulsa-Kuota") yang
perbaikannya adalah edit manual lewat modal Transaksi/Aset/Anggaran di
app yang sedang berjalan — bukan sesuatu yang bisa diperbaiki lewat
patch source code (tidak ada file data backup 2026-08-16 yang ikut
di-upload ke sesi ini untuk diverifikasi/di-derive juga). Menambahkan
"auto-repair" di sini akan bertentangan dengan keputusan desain yang
sudah didokumentasikan eksplisit di source (DL-Next-7).

**Keputusan: skip Blok E, lanjut ke Blok F (gap test coverage)** — murni
kerja kode/test, tidak butuh akses data user.

## Blok F — audit ulang, ambil 1 item yang benar-benar 0 coverage

Cek cepat ke 5 modul Blok F (`FinancialHealthScoreAPI`,
`FinancialRiskDashboardAPI`, `BudgetRecommendationAPI`, `FinanceDashboard`,
`filter-laporan.js`) — 2 di antaranya ternyata **sudah stale juga**:
`tests/financial-health-score-api.test.js` dan
`tests/financial-risk-dashboard-api.test.js` sudah ada (yang kedua
malah baru ditambah cakupan `_emergencyFundRisk()` di sesi S650).
`filter-laporan.js` & `BudgetRecommendationAPI` baru punya test parsial
(toggleKeuFilter/showFilteredTx untuk yang pertama; severity-sort saja
untuk yang kedua). `FinanceDashboard` (`modules/finance/
finance-dashboard.js`) betul-betul **0 test langsung** — dipilih sesi
ini.

## Yang dikerjakan

`tests/s652-finance-dashboard.test.js` (baru) — cakupan langsung
`FinanceDashboard`:
- `getAIHook()`: guard "FinanceIntelligence belum dimuat" → `{ok:false}`
  tanpa throw, dan passthrough `{ok:true, ...summary()}` apa adanya.
- `_netWorthCard()`: guard dependency hilang → dash `—`; reuse
  `Kekayaan.currentNetWorth()` (bukan `totalSaldoAkun()-totalDebtValue()`
  sendiri, sesuai komentar bug-fix S268 di source); cls hijau/merah
  sesuai tanda net.
- `_cashFlowCard()`/`_budgetCard()`/`_healthCard()`: guard `!ok`/falsy
  → dash + reason; ambang warna (cls) per masing-masing fungsi
  (termasuk aturan `overCount>0` selalu merah di `_budgetCard()`
  walau pct rendah).
- `_sparepartCards()`: guard `Sparepart` belum dimuat → `[]`; reuse
  `Sparepart.calcFinanceStats(D.partsStock, D.servisLogs)` apa adanya,
  6 kartu dengan `onClick.action==='goToList'` ke tab `carnotes`/`servis`,
  simbol tren ▲/▼ dari `trenSub()`.

`render()` **sengaja tidak dites** — baca/tulis DOM lewat
`document.getElementById`, di luar cakupan harness `loadSource.js`
(dinyatakan eksplisit di komentar harness itu sendiri: "Jangan pakai
harness ini buat nge-test fungsi yang baca/tulis DOM"). Tetap ranah
smoke-test.js/manual QA.

`TODO.md`:
- Tandai item test `FinanceDashboard` (baris di bawah header "Finance/
  FinanceDashboard — dari Sesi Audit finance-dashboard.js") jadi ✅
  SEBAGIAN + referensi file test baru + alasan `render()` tidak
  termasuk.
- Tambah catatan ringkasan sesi di baris atas (pola sama Sesi 487/S651)
  menjelaskan hasil audit Blok E (kenapa di-skip) + keputusan pindah ke
  Blok F.

## Test

`node --test tests/s652-finance-dashboard.test.js` → **15/15 pass**.

`node --test tests/*.test.js` (full suite, baseline `app-main` sebelum
S646–S651 di-merge) → **4645/4645 pass**, 0 fail — 0 file lama
tersentuh/rusak sesi ini.

## File yang berubah (patch-only)

```
tests/s652-finance-dashboard.test.js   (baru)
TODO.md                                (edit — dokumentasi)
```

## Sesi berikutnya (rekomendasi)

- **Blok F lanjutan** (murni test, aman dikerjakan kapan saja): pilih 1
  dari sisa 3 — `BudgetRecommendationAPI` (`_budget()`/`_classify()`/
  `budgetInsight()`/`summary()` masih 0 test langsung, `spendingAnalysis()`/
  `budgetSuggestion()` sudah tercakup lewat regression BUG-014),
  `filter-laporan.js` (`txMatchesFilters()`/`goToList()` masih 0 test
  langsung), atau cleanup catatan `FinancialRiskDashboardAPI` (item
  ✅ SEBAGIAN di TODO.md — tinggal hapus/sederhanakan, coverage-nya
  sebenarnya sudah lengkap).
- **Blok E** butuh sesi terpisah yang BUKAN patch-only source-code —
  perlu akses langsung ke data/backup app yang sedang jalan (bukan
  export statis) untuk edit manual per item, di luar pola sesi
  "1 sesi = 1 patch ZIP" yang dipakai sejauh ini. Rekomendasi: jangan
  dijadwalkan sebagai sesi kode; tangani lewat UI data-health-check
  langsung di app oleh user.
