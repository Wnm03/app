# AUDIT — Cakupan Insight di Dashboard Hub

> Base: `app-main__58_.zip` + `PATCH-v1551-piutang-utang-reminder.zip` (v1551, piutang/utang reminder sudah terpasang).

## 1. Temuan utama

**Ada 2 jalur insight yang berjalan paralel, tidak konsisten:**

1. **Jalur utama (terpusat, prioritized)**:
   `FinanceIntelligence.budgetSummary()` + `VehicleReminder.summary()` + `PiutangUtangReminder.summary()`
   → `UnifiedSummaryAPI` → `LifeDashboardSummaryAPI` → `PriorityEngine.getItems()` → `ActionQueue`/`LifePriorityPanel` (+ AI Chat context).
   Ini satu-satunya jalur yang punya urutan severity (overdue → over-limit → due-soon) dan tampil sebagai daftar bernomor.
2. **Jalur ad-hoc di `dashboard-hub.js`**: widget Shop (`ShopBusinessEnginePresenter.summary()`), hint Self Reward (`SelfReward.evaluate()`), dan beberapa card lain ditulis langsung sebagai potongan kode terpisah di dashboard-hub, **tidak lewat PriorityEngine** — jadi tidak ikut terurut, tidak ikut dihitung ke `priorityCount`, dan pola tiap widget beda-beda.

**Akibatnya:** dashboard *terlihat* ramai (banyak card), tapi tidak *informatif secara terpusat* — pengguna harus tahu ke mana harus lihat untuk tiap domain, bukan satu feed "yang butuh perhatian" yang lengkap.

## 2. Modul dengan fungsi reminder/summary/insight yang SUDAH ADA tapi BELUM masuk jalur utama (`PriorityEngine`)

| Domain | Modul siap-pakai | Status due-date/threshold | Prioritas |
|---|---|---|---|
| Tagihan | `getBillStats()`/`getBillPaidThisPeriodInfo()` (`tagihan-kalender.js`) | Agregat ada, tapi belum itemized & belum exclude yang lunas periode ini | **Tinggi** — sudah diantrikan sesi berikutnya di `DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md` |
| Dana Titipan | `TitipanReconcile.checkAll()` | Sudah final (gap `missing`/`orphan`/`mismatch`), tinggal reuse apa adanya | **Tinggi** — risiko paling rendah, sudah diantrikan |
| Zakat | `pajak-pbb-zakat.js` (status `wajib`/`belum` inline) | Penghasilan & Maal ✅ **SELESAI — lihat §6**. Fitrah belum ada definisi ambang due-date tahunan | Sedang — sisa Fitrah butuh keputusan desain baru dulu |
| Keuangan (lanjutan) | `FinancialHealthScoreAPI`, ~~`FinancialRiskDashboardAPI`~~ **(SELESAI — lihat §6)**, `DebtOptimizerAPI`, `CashflowProjectionAPI`, `FinancialGoalAPI`, `BudgetRecommendationAPI`, `RetirementPlannerAPI`, `InvestmentPlannerAPI` | Masing-masing sudah final sebagai fitur mandiri, **0 disebut** di `unified-summary-api.js`/`priority-engine.js` (kecuali `FinancialRiskDashboardAPI`, sudah) | Sedang — berpotensi berat kalau semua ditarik sekaligus (banyak sumber), perlu prioritisasi per-modul |
| Shop/Business | `BusinessIntelligencePresenter`, ~~`InventoryEngine.restockScan()` (restock via widget ad-hoc)~~ **(restock SELESAI — lihat §6)** | Restock sudah lewat PriorityEngine; sisanya (`BusinessIntelligencePresenter`) masih di luar jalur prioritas | Sedang |
| Aset | `AssetPortfolioAPI`, Property/Rental/Asset-Maintenance API+Presenter | Berdiri sendiri, tidak disebut cross/dashboard | Sedang-rendah |
| Home | `HidupSeimbang` (skor Dana Darurat/DSR/No-Spend/kerja-istirahat) | Skor final, hanya tampil di halaman sendiri | Sedang — cocok jadi 1 card ringkasan, bukan reminder list |
| Logistics | `LogisticsEngine`/`LogisticsService` | 0 referensi di cross/dashboard | Rendah — perlu cek dulu apakah domain ini aktif dipakai |
| Self Reward | `SelfReward.evaluate()` | Sudah tampil, tapi cuma 1 baris hint ad-hoc, bukan lewat PriorityEngine | Rendah |

## 3. Kenapa belum bisa "sekali audit langsung semua"

Pola kerja proyek ini (RULE #1: reuse, 0 skor baru, 1 fitur per sesi, wiring lewat SEMUA lapisan — `UnifiedSummaryAPI`→`LifeDashboardSummaryAPI`→`PriorityEngine`) sengaja membatasi 1 sumber per sesi supaya tiap penambahan bisa diverifikasi penuh (test + build) tanpa risiko regresi ke urutan/hitungan yang sudah final. Menarik 8+ modul finance sekaligus ke `PriorityEngine` dalam 1 sesi akan melanggar pola itu dan sulit di-review.

## 4. Rekomendasi urutan sesi (mengikuti antrian yang sudah ada + tambahan baru)

1. **Tagihan reminder** (sudah didesain, tinggal implementasi — lihat §Sesi berikutnya di DESIGN-LOCK)
2. **Dana Titipan reconcile** (reuse `checkAll()` apa adanya, risiko terendah)
3. **Konsolidasi widget ad-hoc dashboard-hub** (Shop, Self Reward) → pindahkan jadi sumber `PriorityEngine` yang sama, supaya satu feed konsisten, bukan cuma tampilan tambal-sulam
4. **Zakat** (butuh keputusan ambang dulu — perlu dikonfirmasi sebelum coding)
5. **1 modul finance-analytics per sesi** (mulai dari `FinancialRiskDashboardAPI` karena sudah ada presenter siap & disinggung di komentar dashboard-hub) → lalu `DebtOptimizerAPI`, `FinancialGoalAPI`, dst., dipilih berdasarkan mana yang paling sering relevan buat pengguna
6. **HidupSeimbang sebagai 1 summary card** (bukan reminder list — beda bentuk tampilan, bukan "item butuh perhatian")

## 5. Pertanyaan sebelum sesi 1 dimulai

1. Mulai dari **Tagihan** dulu (sesuai antrian existing), atau ada domain lain yang lebih mendesak buat kamu sekarang?
2. Untuk widget ad-hoc (Shop, Self Reward) — digabung ke `PriorityEngine` sekarang atau dibiarkan dulu sampai reminder-reminder due-date selesai semua?

## 6. Status per sesi (update berjalan)

- ✅ **Tagihan reminder** — selesai (`tagihan-reminder.js`, kind `tagihan`).
- ✅ **Dana Titipan reconcile** — selesai (reuse `TitipanReconcile.checkAll()` apa adanya, kind `danaTitipan`, severity `warning`).
- ✅ **Piutang/Utang reminder** — selesai (`piutang-utang-reminder.js`, kind `piutangUtang`).
- ✅ **Shop restock (konsolidasi widget ad-hoc)** — selesai (`shop-restock-reminder.js`, kind `shopRestock`). Self Reward SENGAJA TIDAK ikut dikonsolidasi (saran positif, bukan "butuh perhatian" — beda semantik dari PriorityEngine).
- ✅ **`FinancialRiskDashboardAPI`** (finance-analytics pertama, §4 poin 5) — selesai, `npm test` 5514/5514 di repo lengkap. `LifeDashboardSummaryAPI.summary()` reuse `FinancialRiskDashboardAPI.summary()` apa adanya jadi field `financialRisk` (riskFactors + riskLevel). `PriorityEngine.getItems()` memetakan tiap `riskFactors` jadi item kind `financialRisk` severity `warning` (BUKAN overdue/due-soon — modul sumbernya sudah final semua item type `warning`), ditempatkan di grup terpisah PALING AKHIR setelah `danaTitipan`. 0 rumus baru — 100% reuse (Debt/Health/Cashflow/EmergencyFund sudah final di modul masing-masing).
- ✅ **Zakat — Penghasilan & Maal** — selesai (`zakat-reminder.js`, kind `zakat`; 20 test baru — 13 logic + 7 wiring — 0 gagal; digabung ke repo lengkap: `npm test` 5534/5534, 0 regresi; `node scripts/build.js` sukses, versi final s740/build 1555 — sempat naik beberapa kali karena housekeeping dokumentasi §6 ini & `AUDIT_MATRIX.md` dikerjakan sesudahnya, 0 perubahan kode aplikasi di run-run tambahan itu). Ditempatkan di grup terpisah PALING AKHIR, SETELAH `financialRisk`. **Zakat Fitrah DITUNDA** — butuh keputusan ambang due-date tahunan terpisah (biasanya musiman Ramadan), belum ada state apa pun untuk itu.
- ⬜ Modul finance-analytics berikutnya (`DebtOptimizerAPI`, `FinancialGoalAPI`, dst.) — 1 per sesi, dipilih berdasar relevansi.
- ⬜ `HidupSeimbang` sebagai 1 summary card (bukan reminder list — beda bentuk tampilan, bukan "item butuh perhatian").
