# CHANGELOG-AUDIT.md — Log implementasi hasil audit ke dokumentasi

## 2026-09-21 — S1879: PWA UI Structural Redesign + Cumulative Audit Closeout

- **UI redesign:** menambahkan `pwa-ui-layer.css` sebagai presentation layer struktural, bukan sekadar theme: mobile single-column + bottom navigation, desktop/tablet sidebar dari nav yang sama, dashboard metric/action grid, touch-target hardening, modal/list/form density, dan pengurangan backdrop blur untuk PWA ringan. Tidak menambah framework/dependency dan tidak mengubah business logic/IndexedDB/data-action hooks.
- **PWA offline:** `pwa-ui-layer.css` masuk `sw.js` precache; standalone preview dan performance budget ikut diperbarui.
- **Retired artifact:** `pro-ui-layer.css` dihapus kembali karena kontrak `DELETE-FILES.txt`/rollback test mewajibkan file tersebut tidak ada.
- **Release version:** `node scripts/build.js` berhasil; version/cache/query dibump dari 1878 → 1879, HTML mirror sinkron, bundle syntax valid, FILE-MAP/COVERAGE diregenerasi. Bundle tetap unminified karena `esbuild` belum tersedia.
- **Regression:** full test runner menggunakan 32 shard menghasilkan **7202/7202 PASS**, 0 fail/cancelled/skipped/todo. Integrity gates SOT, architecture, persistence, PWA recovery, feature regression, patch integrity/contamination, window expose, dan performance budget PASS.
- **Release blockers yang masih environment/toolchain, bukan bug runtime:** `eslint` tidak terpasang; `esbuild` tidak terpasang sehingga bundle belum minified. `verify-release-hardening.js` juga menandai `app-bundle-b.min.js` melewati fixed release budget dalam kondisi unminified; minifikasi release wajib diselesaikan sebelum APK/production ZIP final.
- **Cumulative rule:** patch sebelumnya dipertahankan; patch baru harus diterapkan di atas baseline kumulatif, tidak mengganti atau menghapus perbaikan terdahulu.

---

## 2026-09-20 — Sesi Audit Kumulatif: SA-F → SA-I follow-up

- **Baseline:** `app-main (7)` + `PATCH-AKUMULASI-SEMUA-PERBAIKAN-APP-MAIN-7-SA-H.zip`. Patch lama dipertahankan dan diterapkan lebih dulu.
- **Audit status:** SA-A–SA-E sudah terwakili di patch kumulatif; SA-F (SSOT/vehicle scope), SA-G (CSP-safe suggestion handler), dan SA-H (import idempotency) juga sudah ada di patch upload.
- **Confirmed new finding fixed:** service prefill `prefillItem` di `modules/vehicle/servis.js` masih memilih `D.partsStock` lintas kendaraan; diperbaiki menjadi vehicle-scoped + regression SA-E.
- **Confirmed new finding fixed:** CSV kategori sparepart (`sparepart-servis-b.js` preview + `sparepart-servis-ui.js` commit) dapat match kategori private kendaraan lain berdasarkan nama; sekarang current-vehicle → global fallback dan kategori baru diberi `vehicleId`. Regression test baru `tests/sa-c-category-csv-vehicle-scope.test.js`.
- **Finance backlog fixed:** WorthIt saldo ≤0 UX, filter reset ternary, FinanceIntelligence account lookup `Map`, FinancialHealthScoreAPI local reuse, FinancialRiskDashboardAPI local reuse, BudgetRecommendationAPI local reuse. Regression/performance-count tests ditambahkan/ diperluas.
- **Validation:** targeted cumulative gate **15/15 PASS** untuk SA-B/SA-C/SA-D/SA-E; finance/performance gate **48/48 PASS**; seluruh file yang disentuh lolos `node --check`.
- **Remaining:** smoke/manual UI verification untuk kartu Financial Health setelah `BUG-012` cache invalidation; direct tests untuk `FinanceIntelligence.insights()`/`summary()`/`cashflowSummary()` masih dapat ditambah.

---


> Berbeda dari `CHANGELOG.md` (log perubahan kode/rilis). File ini murni
> mencatat KAPAN hasil audit eksternal diimplementasikan ke
> `docs/BUG_REGISTRY.md` / `docs/AUDIT_MATRIX.md` / `docs/KNOWN-ISSUES.md` /
> `TODO.md`. Append-only, entri terbaru di atas.

---

## 2026-08-01 — Sesi Audit-Docs 9: Finance/BudgetRecommendationAPI domain (budget-recommendation-api.js, audit langsung, 100%)

- **Audit Session:** Sesi Audit langsung (budget-recommendation-api.js,
  100% fungsi) — Sesi Audit-Docs 9 (2026-08-01), audit LANGSUNG terhadap
  source code (204 baris, baris-per-baris, bukan grep, bukan sampling).
- **Bug Added:** 1 (**BUG-014**) — `spendingAnalysis()`/
  `budgetSuggestion()` tidak mengurutkan `items`/`suggestions`
  berdasarkan prioritas (over/near/underused) atau nominal — urutan
  murni mewarisi urutan `D.budgets` dari `FinanceIntelligence.
  budgetSummary()`. Presenter (`budget-recommendation-presenter.js`)
  memakai `suggestions[0]` sbg kartu "Rekomendasi Utama" dan `.find()`
  elemen `over` pertama sbg label "Terbesar", keduanya bisa keliru
  kalau item yang lebih mendesak/besar bukan yang pertama dalam urutan
  `D.budgets`. Ditemukan lewat cross-check langsung ke callee
  (`finance-intelligence.js`) dan caller
  (`budget-recommendation-presenter.js`). Severity P2 Medium,
  Confidence High — lihat `docs/BUG_REGISTRY.md` §0a-7.
- **False Positive Added:** 2 — (1) `_classify()` pembagian `pct` tanpa
  guard `limit<=0` terlihat rawan tapi aman krn `pct` sudah final dari
  hulu (`budgetSummary()`); (2) `spendingAnalysis()` memetakan `bs.items`
  lewat spread copy, 0 risiko mutasi cache `FinanceIntelligence.
  _budgetSummaryCache`. Lihat `docs/BUG_REGISTRY.md` §0b.
- **Design Decision Added:** 1 (ambang klasifikasi over/near/underused
  0.8/0.4 sengaja mengikuti gaya ambang `healthScore()`/`VehicleReminder`
  yang sudah ada; `suggestedLimit` sengaja hanya utk kategori `over`) —
  lihat `docs/BUG_REGISTRY.md` §0c.
- **Improvement Added:** 2 — (1) `summary()` memanggil
  `spendingAnalysis()` secara tidak langsung 3x per satu kali dipanggil
  — hasil tetap benar, murni pemborosan komputasi berlipat; (2) 0 test
  unit langsung untuk 6 fungsi file ini sendiri.
- **Test Coverage Gap:** 0 test unit langsung — satu-satunya test yang
  menyentuh domain ini (`tests/finance-nav-consistency-s254b.test.js`)
  seluruhnya me-mock `BudgetRecommendationAPI` di level presenter.
- **Functions Audited:** Seluruh 6 fungsi di `modules/finance/
  budget-recommendation-api.js` (100%) — `_budget()`, `_classify()`,
  `spendingAnalysis()`, `budgetSuggestion()`, `budgetInsight()`,
  `summary()` — lihat `docs/AUDIT_MATRIX.md` §14. Tidak ada fungsi
  tersisa PENDING AUDIT di file ini.

**Catatan:** Audit dilakukan LANGSUNG dari source code (204 baris penuh
+ cross-check ke seluruh caller/callee lintas codebase:
`modules/finance/finance-intelligence.js` (`budgetSummary()`, konfirmasi
`items` tidak pernah diurutkan), `modules/finance/
budget-recommendation-presenter.js` (satu-satunya caller),
`budget.js` (baris 104, pembanding pola `_pct`/`_sisa`), `modules/finance/
financial-goal-api.js` & `modules/finance/investment-planner-api.js`
(2 komentar referensi non-caller). Dokumentasi disinkronkan ke
`docs/BUG_REGISTRY.md`, `docs/AUDIT_MATRIX.md`, `docs/KNOWN-ISSUES.md`,
`TODO.md` di sesi ini juga (Sesi Audit-Docs 9).

---

## 2026-08-01 — Sesi 333: Fix BUG-014 (Finance/BudgetRecommendationAPI, v997/S333)

- **Session:** Sesi 333 (2026-08-01) — implementasi PERBAIKAN kode (bukan
  audit dokumentasi murni) atas temuan Sesi Audit-Docs 9.
- **Bug Fixed:** BUG-014 — `spendingAnalysis()`/`budgetSuggestion()`
  (`modules/finance/budget-recommendation-api.js`) tidak mengurutkan
  hasil berdasarkan prioritas kategori/nominal. Fix: `_CATEGORY_PRIORITY`
  + `_sortBySeverity(items)` ditambahkan, diterapkan di
  `spendingAnalysis()` sebelum `return`; `budgetSuggestion()` &
  `budget-recommendation-presenter.js` TIDAK diubah (mewarisi urutan
  baru otomatis).
- **Regression Test Added:**
  `tests/budget-recommendation-severity-sort-s333.test.js` (7 test baru)
  — cakupan urutan kategori, urutan dalam kategori (magnitude), count
  integrity pasca-sort, non-mutasi array asli, guard `{ok:false}`.
- **Test Suite:** `node --test tests/*.test.js` → **2074/2074 PASS**
  (naik dari 2067, 0 fail, 0 regresi).
- **Build:** `node scripts/build.js s333-fix-budget-reco-priority-sort`
  → sukses, `?v=997`, semua guard regresi build.js lolos, kedua bundle
  valid (`node --check`), `index.html`/`app_production.html` identik.
- **Docs Synced:** `docs/BUG_REGISTRY.md` (BUG-014 dipindah ke `# 0.
  Resolved`, status FIXED; entri asli §0a-7 diupdate field
  Fix/Regression test/Verification/Status, historis tidak dihapus),
  `docs/AUDIT_MATRIX.md` §14 (baris `spendingAnalysis()`/
  `budgetSuggestion()` → FIXED), `docs/KNOWN-ISSUES.md` §14 (✅ FIXED),
  `TODO.md` (2 task terkait BUG-014 → DONE), `CHANGELOG.md` (entri Sesi
  333 baru).
- **Detail:** `FIX-v997-s333-budget-reco-priority-sort.md`.
- **Remaining (tidak dikerjakan sesi ini, tetap OPEN di `TODO.md`):**
  improvement `summary()` memanggil `spendingAnalysis()` 3x; gap test
  unit langsung utk `_budget()`/`_classify()`/`budgetInsight()`/
  `summary()`.

---

## 2026-08-01 — Sesi Audit-Docs 8: Finance/FinancialRiskDashboardAPI domain (financial-risk-dashboard-api.js, audit langsung, 100%)

- **Audit Session:** Sesi Audit langsung (financial-risk-dashboard-api.js,
  100% fungsi) — Sesi Audit-Docs 8 (2026-08-01), audit LANGSUNG terhadap
  source code (bukan implementasi input eksternal), 163 baris dibaca
  baris-per-baris (bukan grep, bukan sampling).
- **Bug Added:** 1 (**BUG-013**) — `_emergencyFundRisk()` membaca
  `dd.saved` mentah, mengabaikan `dd.accountId` — utk Target Dana
  Darurat yang tertaut ke akun, `dd.saved` permanen `0` (per desain
  `DanaDaruratAI.updateSaved()`, tidak pernah ditulis ulang kalau
  `accountId` ada), sehingga Risk Factor "Dana Darurat belum tercapai"
  muncul terus walau saldo akun tertaut sudah mencapai/melewati target.
  Ditemukan lewat cross-check ke 4 konsumen `D.targets` Dana Darurat
  lain yang SUDAH benar pakai pola account-aware
  (`DanaDaruratAI.currentSaved()` di `modules-calc.js`, `aset.js`,
  `invest-ai-widget.js`, `modules-render.js`). Severity P2 Medium,
  Confidence High — lihat `docs/BUG_REGISTRY.md` §0a-6.
- **False Positive Added:** 0.
- **Design Decision Added:** 1 (`summary().ok` sengaja hardcode `true`,
  berbeda dari pola planner lain, krn tidak ada 1 sumber data wajib
  tunggal) — lihat `docs/BUG_REGISTRY.md` §0c.
- **Cross-reference ke bug lama (bukan bug baru):** `_healthRisk()`
  meneruskan redundansi internal `FinancialHealthScoreAPI.
  financialHealthRecommendation()` (Sesi Audit-Docs 7) — `riskLevel()`/
  `summary()` melipatgandakannya lagi lewat pemanggilan `riskFactors()`
  berulang.
- **Improvement Added:** 2 — (1) `riskLevel()` recompute `riskFactors()`
  independen + `summary()` memanggil `riskFactors()` lagi secara
  langsung = `riskFactors()` (dan ke-4 helper di baliknya) dihitung 2x
  per satu kali `summary()` dipanggil — hasil tetap benar, murni
  pemborosan komputasi berlipat; (2) 0 test unit langsung untuk 7 fungsi
  file ini sendiri.
- **Test Coverage Gap:** 0 test unit langsung — satu-satunya test yang
  menyentuh domain ini (`tests/finance-nav-consistency-s254a.test.js`)
  seluruhnya me-mock `FinancialRiskDashboardAPI` di level presenter.
- **Catatan cross-domain (observasi, BUKAN audit resmi/bug baru di file
  lain):** pola `dd.saved` mentah tanpa cek `dd.accountId` yang sama
  juga terlihat di `modules/finance/worthit.js` (sudah FINAL AUDITED,
  TIDAK diaudit ulang) dan `modules/home/hidup-seimbang.js` (belum
  giliran audit) — dicatat murni sbg petunjuk sesi berikutnya, TIDAK
  mengubah status AUDITED file manapun.
- **Functions Audited:** Seluruh 7 fungsi di `modules/finance/
  financial-risk-dashboard-api.js` (100%) — `_debtRisk()`,
  `_healthRisk()`, `_cashflowBudgetRisk()`, `_emergencyFundRisk()`,
  `riskFactors()`, `riskLevel()`, `summary()` — lihat
  `docs/AUDIT_MATRIX.md` §13. Tidak ada fungsi tersisa PENDING AUDIT di
  file ini.

**Catatan:** Audit dilakukan LANGSUNG dari source code (163 baris penuh
+ cross-check ke seluruh caller/callee lintas codebase:
`modules/finance/debt-optimizer-api.js`, `modules/finance/
financial-health-score-api.js`, `modules/finance/finance-intelligence.js`,
`modules/finance/tx-target.js`, `modules/shared/modules-calc.js`,
`modules/asset/aset.js`, `modules/asset/invest-ai-widget.js`,
`modules/finance/financial-risk-dashboard-presenter.js`). 0 file kode
aplikasi diubah — murni audit + dokumentasi, belum ada fix dikerjakan.
Nomor BUG berikutnya (BUG-014) TIDAK dipakai sesi ini krn tidak ada bug
kedua yang dikonfirmasi.

**File yang diupdate:** `docs/BUG_REGISTRY.md` (§0a-6 baru dgn BUG-013 +
1 entri §0c baru), `docs/AUDIT_MATRIX.md` (§13 baru),
`docs/KNOWN-ISSUES.md` (§13 baru), `TODO.md` (section baru
"Finance/FinancialRiskDashboardAPI — dari Sesi Audit
financial-risk-dashboard-api.js"), `CHANGELOG-AUDIT.md` (file ini).
Semua perubahan bersifat append/update — tidak ada dokumentasi lama
yang dihapus, tidak ada nomor BUG lama yang diubah.

---

## 2026-08-01 — Sesi Audit-Docs 7: Finance/FinancialHealthScoreAPI domain (financial-health-score-api.js, audit langsung, 100%)

- **Audit Session:** Sesi Audit langsung (financial-health-score-api.js,
  100% fungsi) — Sesi Audit-Docs 7 (2026-08-01), audit LANGSUNG terhadap
  source code (bukan implementasi input eksternal), 137 baris dibaca
  baris-per-baris (bukan grep, bukan sampling).
- **Bug Added:** 0 — file ini murni composition layer tipis, 100% reuse
  `FinanceIntelligence.healthScore()` (`modules/finance/
  finance-intelligence.js`), kontrak data dgn seluruh caller
  (`FinancialHealthScorePresenter`,
  `FinancialRiskDashboardAPI._healthRisk()`) dan callee sudah dicek dan
  konsisten.
- **False Positive Added:** 1 (`componentBreakdown()` guard
  `p.weight > 0 ? ... : 0` dead code tapi aman — `weight` selalu 25,
  hardcode di `healthScore()`) — lihat `docs/BUG_REGISTRY.md` §0b.
- **Design Decision Added:** 0.
- **Cross-reference ke bug lama (bukan bug baru):** `summary()`/
  `_score()` ikut terdampak **BUG-012** (cache stale
  finance-intelligence.js) lewat `FinanceIntelligence.healthScore()` —
  pola turunan sama persis dampak BUG-012 pada `finance-dashboard.js`
  (Sesi Audit-Docs 6).
- **Improvement Added:** 2 — (1) `summary()` memicu
  `FinanceIntelligence.healthScore()` 4x redundan per satu kali
  dipanggil (`scoreOverview()` langsung + 3x lagi lewat pemanggilan
  internal `componentBreakdown()`/`financialHealthRecommendation()` yang
  masing-masing memanggil ulang `scoreOverview()`/`componentBreakdown()`
  sendiri) — hasil tetap benar, murni pemborosan komputasi karena
  sebagian komponen `healthScore()` (`totalSaldoAkun()`,
  `FI.totalDebt()`, `computeCashflowForecast()`) tidak tercakup cache
  `_ivxCache`/`_budgetSummaryCache`; (2) 0 test unit langsung untuk 5
  fungsi file ini sendiri.
- **Test Coverage Gap:** 0 test unit langsung — satu-satunya test yang
  menyentuh domain ini (`tests/finance-nav-consistency-s254a.test.js`)
  seluruhnya me-mock `FinancialHealthScoreAPI` di level presenter, tidak
  menguji `_score()`/`scoreOverview()`/`componentBreakdown()`/
  `financialHealthRecommendation()`/`summary()` langsung.
- **Functions Audited:** Seluruh 5 fungsi di `modules/finance/
  financial-health-score-api.js` (100%) — `_score()`, `scoreOverview()`,
  `componentBreakdown()`, `financialHealthRecommendation()`,
  `summary()` — lihat `docs/AUDIT_MATRIX.md` §12. Tidak ada fungsi
  tersisa PENDING AUDIT di file ini.

**Catatan:** Audit dilakukan LANGSUNG dari source code (137 baris penuh
+ cross-check ke seluruh caller/callee lintas codebase:
`modules/finance/finance-intelligence.js` — kontrak `healthScore()`,
`modules/finance/financial-health-score-presenter.js` — seluruh 3
`_xxxCard()`+`render()`, `modules/finance/financial-risk-dashboard-api.js`
— `_healthRisk()`, `modules/finance/debt-optimizer-api.js` —
`debtRecommendation()` sbg pembanding pola). 0 file kode aplikasi diubah
— murni audit + dokumentasi, belum ada fix dikerjakan. Nomor BUG
berikutnya (BUG-013) TIDAK dipakai sesi ini karena tidak ada bug baru
yang dikonfirmasi.

**File yang diupdate:** `docs/BUG_REGISTRY.md` (1 entri §0b baru, TIDAK
ada bug bernomor baru), `docs/AUDIT_MATRIX.md` (§12 baru),
`docs/KNOWN-ISSUES.md` (§12 baru), `TODO.md` (section baru
"Finance/FinancialHealthScoreAPI — dari Sesi Audit
financial-health-score-api.js"), `CHANGELOG-AUDIT.md` (file ini). Semua
perubahan bersifat append/update — tidak ada dokumentasi lama yang
dihapus, tidak ada nomor BUG lama yang diubah.

---

## 2026-08-01 — Sesi Audit-Docs 6: Finance/FinanceDashboard domain (finance-dashboard.js, audit langsung, 100%)

- **Audit Session:** Sesi Audit langsung (finance-dashboard.js, 100%
  fungsi) — Sesi Audit-Docs 6 (2026-08-01), audit LANGSUNG terhadap
  source code (bukan implementasi input eksternal).
- **Prioritas file:** Dipilih dari 8 kandidat finance API/dashboard yang
  belum AUDITED — `finance-dashboard.js` fan-in tertinggi (30+ file lain
  memanggil `FinanceDashboard.*` lintas domain finance/asset/vehicle/
  shop/cross/dashboard-hub), urutan sesuai daftar prioritas yang
  diberikan, tidak berubah.
- **Bug Added:** 0 — file ini murni presenter tipis, 100% reuse
  `FinanceIntelligence.summary()`/`Kekayaan.currentNetWorth()`/
  `Sparepart.calcFinanceStats()`, kontrak data dgn seluruh callee
  konsisten (dicek baris-per-baris).
- **False Positive Added:** 1 (`_healthCard(hs)` guard `if(!hs)` dead
  code tapi aman) — lihat `docs/BUG_REGISTRY.md` §0b.
- **Design Decision Added:** 1 (`hook.insights` sengaja tidak dirender
  di `FinanceDashboard`, dipakai lewat presenter terpisah) — lihat
  `docs/BUG_REGISTRY.md` §0c.
- **Cross-reference ke bug lama (bukan bug baru):** `render()` ikut
  terdampak **BUG-012** (cache stale finance-intelligence.js) lewat
  `FinanceIntelligence.summary()`; `_sparepartCards()` adalah caller
  kedua yang memicu **BUG-011** (`goToList()` index tab salah) lewat
  `goToList(...,'carnotes',4,null,'servis')`.
- **Test Coverage Gap:** 0 test eksekusi (loadSource+DOM) untuk 7 fungsi
  di file ini — 2 test yang ada murni static regex check thd source,
  bukan uji perilaku.
- **Functions Audited:** Seluruh 7 fungsi di
  `modules/finance/finance-dashboard.js` (100%) — `getAIHook()`,
  `render()`, `_sparepartCards()`, `_netWorthCard()`, `_cashFlowCard()`,
  `_budgetCard()`, `_healthCard()` — lihat `docs/AUDIT_MATRIX.md` §11.
  Tidak ada fungsi tersisa PENDING AUDIT di file ini.

**Catatan:** Audit dilakukan LANGSUNG dari source code (trace penuh:
tidak grep, tidak sampling, baca menyeluruh 201 baris + cross-check ke
seluruh caller/callee lintas codebase — `modules/shared/modules-render.js`,
`modules/finance/tx-list-cashflow.js`, `modules/finance/finance-intelligence.js`,
`modules/vehicle/sparepart-servis.js`, `modules/shared/modules-calc.js`,
`index.html`/`app_production.html`). 0 file kode aplikasi diubah — murni
audit + dokumentasi, belum ada fix dikerjakan. Nomor BUG berikutnya
(BUG-013) TIDAK dipakai sesi ini karena tidak ada bug baru yang
dikonfirmasi.

**File yang diupdate:** `docs/BUG_REGISTRY.md` (1 entri §0b baru + 1
entri §0c baru, TIDAK ada bug bernomor baru), `docs/AUDIT_MATRIX.md`
(§11 baru), `docs/KNOWN-ISSUES.md` (§11 baru), `TODO.md` (section baru
"Finance/FinanceDashboard — dari Sesi Audit finance-dashboard.js"),
`CHANGELOG-AUDIT.md` (file ini). Semua perubahan bersifat append/update —
tidak ada dokumentasi lama yang dihapus, tidak ada nomor BUG lama yang
diubah.

---

## 2026-08-01 — Sesi Audit-Docs 5: Finance/FinanceIntelligence domain (finance-intelligence.js, implementasi dari sesi terputus)

- **Audit Session:** Sesi Audit (finance-intelligence.js, 100% fungsi) —
  sesi audit terputus karena limit; hasil audit diteruskan &
  diimplementasikan ke dokumentasi pada Sesi Audit-Docs 5 (2026-08-01).
- **Bug Added:** 1 (`BUG-012`) — status **OPEN**, Severity P2 Medium,
  Confidence High, lihat `docs/BUG_REGISTRY.md` §0a-5.
- **False Positive Added:** 2 (`healthScore()` maxScore tidak mungkin 0;
  `insights()` bukan duplikasi FinCoach) — lihat `docs/BUG_REGISTRY.md`
  §0b.
- **Design Decision Added:** 1 (cache hanya dipakai untuk pemanggilan
  tanpa parameter eksplisit) — lihat `docs/BUG_REGISTRY.md` §0c.
- **Improvement Added:** 1 (`_isTxAccountSelf()` masih O(transaksi ×
  akun), kandidat optimasi Map) — lihat `docs/KNOWN-ISSUES.md` §10 dan
  `TODO.md` § "Finance/FinanceIntelligence — dari Sesi Audit
  finance-intelligence.js".
- **Test Coverage Gap:** `insights()`, `summary()`, `cashflowSummary()`,
  dan BUG-012 (cache setelah ganti bulan) — belum ada test.
- **Functions Audited:** Seluruh fungsi di
  `modules/finance/finance-intelligence.js` (100%) — lihat
  `docs/AUDIT_MATRIX.md` §10. Tidak ada fungsi tersisa di file tersebut
  yang berstatus PENDING AUDIT.

**Catatan:** Sesi ini murni implementasi dokumentasi dari hasil audit
`finance-intelligence.js` yang sudah selesai 100% di sesi (audit)
sebelumnya, yang terputus karena limit sebelum sempat didokumentasikan —
TIDAK ada audit ulang, TIDAK ada source code dibaca ulang, TIDAK ada bug
baru dicari, TIDAK ada kesimpulan/severity/klasifikasi yang diubah dari
hasil audit yang diberikan sebagai source of truth. 0 file kode aplikasi
diubah. 0 bug ditandai fixed.

**File yang diupdate:** `docs/BUG_REGISTRY.md` (§0a-5 baru + 2 entri §0b
baru + 1 entri §0c baru), `docs/AUDIT_MATRIX.md` (§10 baru),
`docs/KNOWN-ISSUES.md` (§10 baru), `TODO.md` (section baru
"Finance/FinanceIntelligence — dari Sesi Audit finance-intelligence.js"),
`CHANGELOG-AUDIT.md` (file ini). Semua perubahan bersifat append/update —
tidak ada dokumentasi lama yang dihapus. Nomor bug lama tidak diubah;
nomor bug baru `BUG-012`.

---

## 2026-08-01 — Sesi Audit-Docs 4: modules/finance/filter-laporan.js (audit langsung, 100%)

- **Audit Session:** Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01),
  audit LANGSUNG terhadap source code (bukan implementasi input eksternal).
- **Bug Added:** 3 (`BUG-009`, `BUG-010`, `BUG-011`) — semua status
  **OPEN**, Severity **P2 Medium**, Confidence **High** — lihat
  `docs/BUG_REGISTRY.md` §0a-4.
- **False Positive Added:** 2 (timezone `new Date(t.date)` di
  `showFilteredTx()`, dan `showFilteredTx()` scope `'dashboard'` pakai
  `new Date()` bukan `curMonth`/`curYear`) — lihat `docs/BUG_REGISTRY.md`
  §0b.
- **Design Decision Added:** 1 (`_keuFilterPrefsLoaded` guard sekali-load
  di `loadKeuFilterPrefsIntoDOM()`) — lihat `docs/BUG_REGISTRY.md` §0c.
- **Improvement Added:** 2 (ternary redundan di `resetLaporanFilter()`/
  `resetKeuFilter()`; scope pencarian `txMatchesSearch()` terbatas) —
  lihat `docs/KNOWN-ISSUES.md` §9 dan `TODO.md` § "Finance/Filter-Laporan
  — dari Sesi Audit filter-laporan.js".
- **Test Coverage:** 0 test unit langsung untuk fungsi-fungsi di
  `filter-laporan.js` ditemukan (`goToList` hanya di-stub, bukan diuji,
  di `tests/s271-bill-list-cicilan-fixes.test.js`).
- **Functions Audited:** 20 fungsi + 5 state var module-level (100% file)
  — `txMatchesFilters`, `populateCatFilter`, `onFKatChange`,
  `resetLaporanFilter`, `getLaporanFilters`, `populateKeuFilters`,
  `onKfKatChange`, `toggleKeuFilter`, `resetKeuFilter`, `getKeuFilters`,
  `txMatchesSearch`, `loadMoreLapTx`, `resetTxPageAndRender`,
  `onKfSearchInput`, `loadMoreTx`, `saveKeuFilterPrefs`,
  `loadKeuFilterPrefsIntoDOM`, `updateKfBadge`, `goToList`,
  `showFilteredTx` — lihat `docs/AUDIT_MATRIX.md` §9.
- **Functions Pending Audit:** 0.

**Catatan:** Audit + dokumentasi dilakukan dalam sesi yang sama (bukan 2
sesi terpisah seperti worthit.js sebelumnya). Cross-check dilakukan
terhadap `docs/BUG_REGISTRY.md` §0a/§0a-2/§0a-3 untuk memastikan tidak
ada duplikasi temuan — tidak ada. Ketiga bug baru (BUG-009/010/011)
diverifikasi lewat trace langsung ke file terkait di luar
`filter-laporan.js` (`styles.css`, `index.html`/`app_production.html`,
`modules/shop/cobek-io.js`, `modules/vehicle/vehicle-core.js`,
`modules/vehicle/sparepart-servis.js`, `modules/finance/pajak-pbb-zakat.js`,
`modules/finance/tx-list-cashflow.js`, `modules/shared/modules-render.js`).
0 file kode aplikasi diubah — murni audit + dokumentasi, belum ada fix
dikerjakan.

**File yang diupdate:** `docs/BUG_REGISTRY.md` (§0a-4 baru + 2 entri §0b
baru + 1 entri §0c baru), `docs/AUDIT_MATRIX.md` (§9 baru),
`docs/KNOWN-ISSUES.md` (§9 baru), `TODO.md` (section baru
"Finance/Filter-Laporan — dari Sesi Audit filter-laporan.js"),
`CHANGELOG-AUDIT.md` (file ini). Semua perubahan bersifat append/update —
tidak ada dokumentasi lama yang dihapus.

---

## 2026-08-01 — Sesi Audit-Docs 3: Finance/WorthIt domain (worthit.js, implementasi dari sesi terputus)

- **Audit Session:** Sesi Audit (worthit.js, 100% fungsi) — sesi audit
  terputus karena limit; hasil audit diteruskan & diimplementasikan ke
  dokumentasi pada Sesi Audit-Docs 3 (2026-08-01).
- **Bug Added:** 1 (`BUG-008`) — status **OPEN**, lihat
  `docs/BUG_REGISTRY.md` §0a-3.
- **False Positive Added:** 2 (`pendingBuyId`/`openTxModal()`,
  `incomeAvg()` div-by-zero) — lihat `docs/BUG_REGISTRY.md` §0b.
- **Design Decision Added:** 0.
- **Improvement Added:** 2 (gap UX saldo ≤ 0; belum ada test untuk
  `hitung()`/`computeScore()`) — lihat `docs/KNOWN-ISSUES.md` §8 dan
  `TODO.md` § "Finance/WorthIt — dari Sesi Audit worthit.js".
- **Functions Audited:** Seluruh fungsi di `modules/finance/worthit.js`
  (100%) — lihat `docs/AUDIT_MATRIX.md` §8. Tidak ada fungsi tersisa di
  file tersebut yang berstatus PENDING AUDIT.

**Catatan:** Sesi ini murni implementasi dokumentasi dari hasil audit
`worthit.js` yang sudah selesai di sesi (audit) sebelumnya, yang terputus
karena limit sebelum sempat didokumentasikan — TIDAK ada audit ulang,
TIDAK ada source code dibaca ulang secara menyeluruh (kecuali verifikasi
cepat & terbatas terhadap `WorthIt.catatBeli()` untuk memastikan BUG-008
akurat sebelum ditulis sebagai "Confirmed"), TIDAK ada bug baru dicari,
TIDAK ada kesimpulan/severity/klasifikasi yang diubah dari ringkasan hasil
audit yang diberikan. 0 file kode aplikasi diubah. 0 bug ditandai fixed.

**File yang diupdate:** `docs/BUG_REGISTRY.md` (§0a-3 baru + 2 entri §0b
baru), `docs/AUDIT_MATRIX.md` (§8 baru), `docs/KNOWN-ISSUES.md` (§8 baru),
`TODO.md` (section baru "Finance/WorthIt — dari Sesi Audit worthit.js"),
`CHANGELOG-AUDIT.md` (file ini). Semua perubahan bersifat append/update —
tidak ada dokumentasi lama yang dihapus.

---

## 2026-08-01 — Sesi Audit-Docs 2: Bill/Piutang/Debt domain (lanjutan, audit langsung)

- **Audit Session:** Sesi Audit-Docs 2 — Bill/Piutang/Debt lanjutan
  (2026-08-01)
- **Bug Added:** 2 (`BUG-006`, `BUG-007`) — status **OPEN**, lihat
  `docs/BUG_REGISTRY.md` §0a-2.
- **False Positive Added:** 1 (`getBillPaidThisPeriodInfo()`) — lihat
  `docs/BUG_REGISTRY.md` §0b.
- **Design Decision Added:** 0.
- **Functions Audited:** 4 (`Debt.syncBill()`, `getBillPaidThisPeriodInfo()`,
  `revertBillFromDeletedTx()`, `deleteBillHistoryTx()`) — lihat
  `docs/AUDIT_MATRIX.md` §7.
- **Functions Remaining (domain Bill/Piutang/Debt, daftar §7):** 0 — semua
  16 fungsi yang tercatat di `docs/AUDIT_MATRIX.md` §7 sekarang `AUDITED`.

**Catatan:** Berbeda dari sesi audit sebelumnya (implementasi input
eksternal), sesi ini adalah audit LANGSUNG terhadap source code (trace
manual `modules/finance/piutang-utang.js` &
`modules/finance/tagihan-kalender.js`, cross-check ke test existing di
`tests/s291-delTx-bill-sync.test.js`). 0 file kode aplikasi diubah — murni
audit + dokumentasi (Tahap 1 + Tahap 2 sesuai Master Prompt), belum ada
fix dikerjakan. Kedua bug baru (BUG-006, BUG-007) confidence **High**,
BUG-007 severity **P1 High** (kesalahan nominal saldo utang).

**File yang diupdate:** `docs/BUG_REGISTRY.md` (§0a-2 baru + 1 entri §0b
baru), `docs/AUDIT_MATRIX.md` (§7, 4 baris PENDING AUDIT → AUDITED),
`docs/KNOWN-ISSUES.md` (§7 baru), `TODO.md` (4 task baru di bawah §
Bill/Piutang/Debt lanjutan), `CHANGELOG-AUDIT.md` (file ini). Semua
perubahan bersifat append/update — tidak ada dokumentasi lama yang
dihapus.

---

## 2026-08-01 — Sesi Audit: Bill/Piutang/Debt domain

- **Audit Session:** Sesi Audit Bill/Piutang/Debt (2026-08-01)
- **Bug Added:** 6 (`BUG-FIN-001`, `BUG-001`, `BUG-002`, `BUG-003`,
  `BUG-004`, `BUG-005`) — semua status **OPEN**, lihat
  `docs/BUG_REGISTRY.md` §0a.
- **False Positive Added:** 5 (`getBillArchiveEditSource()`, `saveBill()`,
  `syncOutstandingSharedPiutang()`, `maybeCreateSharedPiutangFromBill()`,
  `delTx()`/`renderBillHistory()`) — lihat `docs/BUG_REGISTRY.md` §0b.
- **Design Decision Added:** 2 (`delBill()`, `removeOrphanedAutoPiutangForBill()`)
  — lihat `docs/BUG_REGISTRY.md` §0c.
- **Functions Audited:** 12 (`Piutang.save()`, `Debt.save()`,
  `_saveBillInner()`, `applyBillPaymentTxSync()`, `isLatestBillPaymentTx()`,
  `getBillArchiveEditSource()`, `saveBill()`, `markBillPaid()`, `delBill()`,
  `delBillArchive()`, `syncOutstandingSharedPiutang()`,
  `maybeCreateSharedPiutangFromBill()`) — lihat `docs/AUDIT_MATRIX.md` §7.
- **Functions Pending Audit:** 4 (`Debt.syncBill()`,
  `getBillPaidThisPeriodInfo()`, `revertBillFromDeletedTx()`,
  `deleteBillHistoryTx()`).

**Catatan:** Ini adalah implementasi dokumentasi dari hasil audit yang
sudah selesai dilakukan di luar sesi ini — TIDAK ada audit ulang, TIDAK ada
bug baru dicari, TIDAK ada kesimpulan/severity/klasifikasi yang diubah dari
input audit. 0 file kode disentuh. 0 bug ditandai fixed.

**File yang diupdate:** `docs/BUG_REGISTRY.md`, `docs/AUDIT_MATRIX.md`,
`docs/KNOWN-ISSUES.md`, `TODO.md`, `CHANGELOG-AUDIT.md` (file ini, baru
dibuat). Semua perubahan bersifat append/update — tidak ada dokumentasi
lama yang dihapus.

## 2026-09-20 — SA-L: IndexedDB / Persistence Restore Atomicity

- **Temuan terkonfirmasi:** jalur backup restore mengganti `D` secara langsung lalu memanggil `saveFlush()`, tetapi mutation clock/snapshot cache persistence tidak selalu diinvalidate. Jika `_saveSnapshotVersion` masih sama dengan `_saveStateVersion`, `saveFlush()` dapat memakai JSON snapshot sebelum restore dan mem-persist data stale.
- **Fix:** `modules/shared/features-helpers-global-security.js` menambahkan `_markPersistenceStateChanged()` untuk menaikkan mutation clock dan mengosongkan cached snapshot. `save()` memakai gate yang sama.
- **Fix restore:** `modules/shared/backup-restore.js` menginval cache/clock sebelum commit restore dan sebelum rollback restore.
- **Regression:** `tests/sa-l-restore-snapshot-invalidation.test.js` + seluruh `tests/backup-restore-regression-s266.test.js` + `tests/s1850-persistence-memory-audit.test.js` PASS (26/26 pada run gabungan).
- **Catatan build:** bundle production tidak diregenerate karena toolchain minifier/esbuild tidak tersedia di environment audit; patch source/test adalah source of truth.


---

## 2026-09-21 — SA-FINAL: Residual Audit Closeout + cumulative rebuild

- Residual verification completed in one stage against the cumulative SA-L baseline.
- High-risk queues AUD-001..AUD-006 were cross-checked against current source and existing regression suites; no new confirmed bug was found.
- Modal/overlay, scanner lifecycle, bill/payment/fallback, dashboard ownership, persistence/atomicity, and event-bus/idempotency suites passed in the targeted combined run: **713/714 tests PASS**. The sole failure was `tests/verify-release-ready.js`, which correctly blocked because the environment has no `eslint`/minifier and the freshly generated bundles are intentionally unminified.
- `node scripts/build.js` completed successfully: source checks, modal/scanner structural checks, escape checks, version synchronization, HTML synchronization, bundle syntax, FILE-MAP, and COVERAGE-PER-MODULE all passed.
- Documentation baseline drift was synchronized to the build-reported counts (2168 files / 1333 JavaScript / 737 Markdown).
- Stale TODO item for Tahap 5 Daily Summary/Reminder Summary was reconciled with `ROADMAP.md`/`PROJECT_STATE.md`: feature is already complete since Sesi 31.
- No existing fix was removed. Production minification remains the only release-environment blocker.

- Cumulative cleanup also honors `DELETE-FILES.txt`: unused `pro-ui-layer.css` is removed from the final merged tree. Build re-run at version `s1862-sa-i-cumulative-audit-1828`; final structural counts are 2167 files / 1333 JS / 737 Markdown / 3 CSS / 870 tests.


## S1863 — Service Master Database Integration (2026-09-20)

- Canonical master `data/database-kategori-komponen-servis.json`: 13 kategori / 50 komponen.
- Generated runtime projection menggantikan literal checklist manual di `modules/vehicle/servis-checklist.js`.
- `ServiceMasterDB` memakai existing `IDBStore`/`kw_idb_v1` key `service-master:store`; tidak membuat DB/wrapper kedua.
- Import idempotent + checksum metadata + deprecated/orphan preservation.
- `ServiceMaintenanceEngine` menambah evaluasi `km`/`time`/`both` dengan calendar-month handling dan odometer regression guard.
- `ServiceMaintenanceRepository` reuse `D.servisLogs`; tidak membuat history store kedua.
- Targeted regression: 48/48 PASS (40 checklist + 8 S1863).
- Full suite belum diberi status green karena environment timeout sebelum terminal summary; tidak ada failure baru yang terlihat sampai test #3499.
- Build `s1863-service-master-db-1863`: source/syntax/HTML/SW checks PASS; esbuild tidak tersedia sehingga bundle belum diminify.

## S1864 — Service Master Catalog Expansion
- Mempertahankan taxonomy 13 kategori dan seluruh 50 component ID lama.
- Memperluas canonical service master menjadi 100 maintenance components berdasarkan audit struktur katalog Honda Vario Techno 125 -2 (KZRJ).
- Menambahkan provenance `catalogRefs` pada component yang section katalog-nya sudah diverifikasi serta `catalogSources` pada root master.
- Tidak memasukkan gambar katalog, PDF, atau part-level inventory ke bundle/startup aplikasi.
- Interval servis baru tidak diinferensikan dari katalog; component baru tanpa interval tetap tidak memicu reset otomatis.
- Targeted verification: 11/11 PASS; build s1864 selesai dan syntax bundle PASS.

## S1865 — Part Catalog Normalization (2026-09-20)
- Audit lanjutan terhadap katalog Honda Vario Techno 125 -2 / KZRJ memisahkan `maintenance component` dari `part-level catalog record`.
- Master kumulatif menjadi **13 kategori / 102 components**; seluruh 100 ID S1864 dipertahankan, ditambah `oil-pump` dan `bearing-swingarm`.
- Ditambahkan `data/parts-catalog-vario-techno-125-kzrj.json` berisi **103 part records terverifikasi** dari section katalog yang sudah dibaca, bukan transkripsi penuh katalog.
- Ditambahkan `modules/vehicle/parts-catalog-database.js` dengan lazy/on-demand fetch JSON agar data katalog tidak ikut dimuat saat startup.
- Tidak ada gambar katalog/PDF yang dimasukkan ke bundle.
- Mapping part yang belum dapat dinormalisasi dibiarkan kosong; tidak ada mapping semantik yang dipaksakan.
- Targeted regression S1863/S1864/S1865 + golden checklist: **22/22 PASS** sebelum build.

## S1866 — Honda Vario 110 FI K46 Part Catalog Isolation

- Scope: **Honda Vario 110 FI K46 only** (2014–2015; engine `JFH1E`, frame `MH1JFH1`).
- Added `data/parts-catalog-vario-110-fi-k46.json` with 103 directly verified part records from the K46 catalog text / Honda Cengkareng K46 evidence.
- Extended `PartsCatalogDB` to support explicit catalog/model namespaces (`KZRJ` and `K46`) while preserving KZRJ as the backward-compatible default.
- K46 lookup/search cannot cross-read KZRJ when an explicit K46 scope is selected.
- No images/PDF payload embedded; catalog remains lazy/on-demand.
- No maintenance intervals invented from the parts catalog.
- K46H/eSP and older Vario 110 variants are excluded from the K46 dataset even when a part is shared.
- Targeted cumulative service/catalog suite: **66/66 PASS**.
- Build: PASS; generated bundles syntax-valid. esbuild unavailable, so bundles remain unminified.
- Version synchronized by build to `s1866-vario-110-fi-k46-part-catalog-1867`, cache `kw-cache-v1867`.


## S1867 — Generic Honda PDF Catalog Auto-Import (K61 dry-run foundation)

- Menambahkan `modules/vehicle/honda-pdf-catalog-auto-import.js`: alur generik PDF → identitas katalog → ekstraksi part → mapping ke Service Master → dry-run → commit, tanpa membuat file JSON/source baru per kendaraan.
- Katalog dinamis disimpan di IndexedDB `honda-pdf-catalog:store`; `PartsCatalogDB` diperluas untuk membaca katalog dinamis tanpa mengubah katalog statis KZRJ/K46.
- Target kendaraan tersedia: kendaraan aktif, kendaraan existing, atau jalur kendaraan baru melalui form kendaraan existing; tidak ada write otomatis sebelum konfirmasi dry-run.
- Mapping `HIGH/MEDIUM/AMBIGUOUS/UNMAPPED`; `AMBIGUOUS/UNMAPPED` tidak membuat komponen maintenance baru otomatis. Service Master tetap 102 komponen dan tidak menerima interval yang diinferensikan dari PDF.
- `vehicle-catalog-import.js` diperkuat: kualitas text-layer PDF dinilai sebelum dipakai; PDF dengan text-layer ter-encode/gibberish akan fallback ke OCR. Hasil extract mempertahankan marker page-break agar importer generik tidak membawa kategori lintas halaman.
- PDF audit yang diuji: Honda BeAT & BeAT Street eSP, cover `ACH110CBF`, katalog bertanggal 10 November 2018; file 88 halaman. Text layer native terbukti tidak layak dijadikan sumber utama, sehingga jalur OCR diperlukan.
- Targeted regression: 63/63 PASS (KZRJ, K46, S1864, parser PDF, dan S1867). Build PASS; esbuild tidak tersedia sehingga bundle valid tetapi belum diminify.


## S1868 — Dynamic Vehicle Onboarding & Maintenance Template Engine (2026-09-20)
- Menambahkan `modules/vehicle/vehicle-maintenance-template-engine.js` untuk membentuk template kategori + komponen perawatan berkala berdasarkan jenis kendaraan, model yang sudah teridentifikasi, dan katalog PDF dinamis yang sudah terikat ke kendaraan.
- Modal Tambah/Edit Kendaraan sekarang menampilkan preview template dinamis dengan checkbox komponen; pilihan user disimpan sebagai `D.vehicles[].maintenanceTemplate` tanpa membuat history/store servis baru.
- `PartsCatalogDB.getCatalogByVehicle(vehicleId)` menghubungkan katalog PDF S1867 ke template tanpa mencampur namespace KZRJ/K46.
- Interval servis tidak diinferensikan; template hanya membawa interval yang sudah ada di Service Master/evidence katalog.
- Memperbaiki adapter Vehicle Model SOT agar membaca API produksi `DatabaseAPI.vehicleModel.getAll()` sebelum fallback lama, sehingga resolusi model dapat dipakai oleh template engine.
- Targeted S1868: 4/4 PASS untuk engine + production-shape model registry; regression S1863–S1867 dan parser/import PDF tetap PASS.
- Build `s1868-dynamic-vehicle-maintenance-template-1871` PASS; bundle syntax PASS. `esbuild` tidak tersedia sehingga bundle belum diminify.

## S1880 — PWA UI + Residual Release/Regression Hardening (2026-09-21)
- Menutup regression yang ditemukan saat full-suite pasca UI redesign: `tests/dashboard-slim-performance-regression.test.js` masih mengunci marker lama `v1878`, sementara runtime sudah konsisten pada `?v=1879` / `kw-cache-v1879`. Marker inline `dashboard-slim-v1878` pada `index.html` dan `app_production.html` disinkronkan menjadi `dashboard-slim-v1879`.
- Menambahkan `tests/pwa-ui-responsive-contract.test.js` untuk mengunci kontrak structural UI: breakpoint mobile/desktop, touch target, safe-area, dependency-free CSS, link/precache PWA UI layer, preservation of existing `data-action`, dan retired Pro UI absence.
- Full regression setelah perbaikan: **7206/7206 PASS**, 0 fail/cancelled/skipped/todo.
- Structural/runtime release firewall: **10/10 PASS**. SOT, architecture, persistence, PWA recovery, feature regression, patch integrity/contamination, version, bundle freshness, runtime/listener lifecycle, reproducible build: PASS.
- Browser visual smoke-test tidak dapat dieksekusi di sandbox karena navigation Chromium ke `localhost`/`file://` diblokir oleh environment (`ERR_BLOCKED_BY_ADMINISTRATOR`); status visual browser tetap VERIFICATION-REQUIRED, bukan diasumsikan PASS.
- ESLint dan esbuild tetap unavailable di environment; production release gate tetap BLOCKED sampai toolchain tersedia atau ada release override yang terdokumentasi.
