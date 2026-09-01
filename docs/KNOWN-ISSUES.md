
---

## 6. Business Logic — Bill/Piutang/Debt (Sesi Audit 2026-08-01)

Ditambahkan dari hasil audit eksternal (bukan bagian dari program
modernisasi UI Tahap 1–8 di atas — domain berbeda: JavaScript/business
logic, bukan CSS). **Update sesi S699 (2026-09-01)**: semua 6 item di
bawah sudah lama **FIXED** di source (sesi 338/339/342/487/audit-s327/
pre-existing) — cuma dokumen ini yang tidak pernah disinkronkan, sama pola
stale-doc `TODO.md` temukan di sesi 487. Status dikoreksi jadi ✅. Detail
lengkap & sitasi source per item: lihat `docs/BUG_REGISTRY.md` §0a.

- ✅ **BUG-FIN-001** — Validasi nilai positif hilang di `Piutang.save()`
  dan `Debt.save()`. Severity P2. **FIXED** — guard `nilai<=0` sudah ada.
- ✅ **BUG-001** — Fallback self-heal `_saveBillInner()` tidak memakai
  `countFallbackBillPaymentCandidates()`, kandidat ambigu bisa salah
  ter-link. Severity Medium-High. **FIXED** (sesi 338).
- ✅ **BUG-002** — Mismatch `tx.amount` vs label "Jumlah Total per Periode".
  **FIXED** (sesi 342).
- ✅ **BUG-003** — Interaksi `_saveBillInner()` dengan
  `syncOutstandingSharedPiutang()`. **FIXED** (sesi 339).
- ✅ **BUG-004** — `markBillPaid()`: `payMethod = b.kind`, kind `"utang"`
  tidak terdaftar di `pmIcons`/dropdown filter metode. Severity Medium.
  **FIXED** (v1216/sesi 487).
- ✅ **BUG-005** — `delBillArchive()` tidak memanggil
  `refreshBillEverywhere()`/`renderBillList()` → Daftar Tagihan tab Lunas
  jadi stale. Severity Medium. **FIXED** (audit s327).

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Bill/Piutang/Debt — dari Sesi Audit 2026-08-01".

## 7. Business Logic — Bill/Piutang/Debt, lanjutan (Sesi Audit-Docs 2, 2026-08-01)

Hasil audit langsung (bukan input eksternal) atas 4 fungsi yang
sebelumnya `PENDING AUDIT`. **Update sesi S700 (2026-09-01)**: kedua bug
di bawah sudah FIXED (fix landing sebelum sesi S646, dikonfirmasi
`docs/BUG_REGISTRY.md` sejak koreksi S657) — dokumen ini belum ikut
disinkronkan sampai sesi ini, sama pola stale-doc §6 di atas (dikoreksi
S699). Detail lengkap: `docs/BUG_REGISTRY.md` §0a-2.

- ✅ **BUG-006** — `Debt.syncBill()` menghapus tagihan cicilan-utang lewat
  array filter langsung, tidak memanggil `removeOrphanedAutoPiutangForBill()`
  → piutang otomatis "Ditanggung Bersama" jadi orphan permanen kalau utang
  ditandai Lunas/cicilan dinolkan. Severity P2 Medium. **FIXED** —
  regression test `tests/bug006-syncbill-orphan-piutang.test.js`.
- ✅ **BUG-007** — `revertBillFromDeletedTx()` (dipakai `delTx()` &
  `deleteBillHistoryTx()`) mengembalikan saldo utang sebesar `t.amount`
  penuh tanpa memperhitungkan clamp `Math.max(0,...)` saat pembayaran
  utang overpay (lunasin sekaligus lebih besar dari sisa) — saldo utang
  jadi lebih besar dari seharusnya setelah transaksi pembayaran tsb
  dihapus. Severity **P1 High**. **FIXED** — snapshot `debtNilaiBefore`
  dipakai saat revert, regression test
  `tests/bug007-overpayment-revert-debt.test.js`.

Rencana perbaikan: lihat `docs/TODO.md` § "Bill/Piutang/Debt — Sesi
Audit-Docs 2 (lanjutan)".

## 8. Business Logic — Finance/WorthIt (Sesi Audit worthit.js, 2026-08-01)

Hasil audit `modules/finance/worthit.js` (100% fungsi, sesi terputus
sebelumnya), diimplementasikan ke dokumentasi pada Sesi Audit-Docs 3.
Detail lengkap: `docs/BUG_REGISTRY.md` §0a-3.

- 🔴 **BUG-008** — `WorthIt.catatBeli()`: DP (`d.dp`) dari kalkulator
  Worth It tidak pernah diteruskan ke transaksi; `txCicilanPerBulan`
  ditimpa oleh `syncCicilanPreview('total')` sehingga nilai cicilan per
  bulan yang dimasukkan user hilang. DP jadi murni kosmetik. Severity P2
  Medium.

**Improvement (bukan bug, dicatat untuk prioritisasi ke depan):**
- Gap UX saat saldo ≤ 0 di kalkulator Worth It.
- Belum ada test untuk `hitung()` dan `computeScore()`.

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/WorthIt — dari Sesi Audit worthit.js".

## 9. Business Logic — Finance/Filter-Laporan (Sesi Audit-Docs 4, audit langsung, 2026-08-01)

Audit langsung 100% terhadap `modules/finance/filter-laporan.js` (20
fungsi + 5 state var). Detail lengkap: `docs/BUG_REGISTRY.md` §0a-4.

- 🔴 **BUG-009** — `toggleKeuFilter()`: tap pertama tombol "🔍 Filter"
  tidak membuka panel (state hidden awal dibaca dari inline style, padahal
  disembunyikan lewat class CSS `u-dnone`) — butuh tap kedua. Severity P2
  Medium.
- 🔴 **BUG-010** — `showFilteredTx()` scope `'keuangan'` tidak menerapkan
  filter pencarian teks (`kf.search`) — modal drill-down 💚Pemasukan/
  🔴Pengeluaran/💰Bersih bisa menampilkan transaksi yang seharusnya
  tersaring oleh kotak pencarian di list `#allTx`. Severity P2 Medium.
- ✅ **BUG-011 — FIXED (v1000/S335)** — `goToList()`: index tombol tab
  untuk `shopTabName` (Shop) & `cnTabName` (Carnotes) hardcode salah
  (offset dari urutan DOM aktual) — tombol tab yang ter-highlight
  `active` SALAH walau konten yang ditampilkan tetap benar. Severity P2
  Medium. Lihat §16.

**Improvement (bukan bug, dicatat untuk prioritisasi ke depan):**
- Ternary redundan (`el.value=x?'semua':'semua'`, kedua cabang identik)
  di `resetLaporanFilter()` & `resetKeuFilter()` — dead code, 0 dampak
  fungsional.
- `txMatchesSearch()` hanya mencari kategori/subkategori/catatan/nama
  akun — belum termasuk nominal/tanggal.
- 0 test unit langsung untuk seluruh fungsi di `filter-laporan.js`.

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/Filter-Laporan — dari Sesi Audit filter-laporan.js".

## 10. Business Logic — Finance/FinanceIntelligence (Sesi Audit finance-intelligence.js, implementasi Sesi Audit-Docs 5, 2026-08-01)

Hasil audit `modules/finance/finance-intelligence.js` (100% fungsi, sesi
terputus sebelumnya), diimplementasikan ke dokumentasi pada Sesi
Audit-Docs 5. Detail lengkap: `docs/BUG_REGISTRY.md` §0a-5.

- 🔴 **BUG-012** — Cache `_ivxCache`/`_budgetSummaryCache` menjadi stale
  setelah `changeMonth()`/`changeTxListMonth()` karena kedua fungsi
  tersebut tidak memanggil `FinanceIntelligence.invalidateCache()`.
  Severity P2 Medium, Confidence High.

**Design Decision (bukan bug):**
- Cache hanya dipakai untuk pemanggilan tanpa parameter eksplisit;
  pemanggilan dengan parameter selalu fresh.

**Improvement (bukan bug, dicatat untuk prioritisasi ke depan):**
- `_isTxAccountSelf()` masih O(transaksi × akun), kandidat optimasi
  memakai `Map`.

**Gap test (belum ada test):**
- `insights()`
- `summary()`
- `cashflowSummary()`
- BUG-012 (cache setelah ganti bulan)

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/FinanceIntelligence — dari Sesi Audit finance-intelligence.js".

## 11. Business Logic — Finance/FinanceDashboard (Sesi Audit finance-dashboard.js, audit langsung, 2026-08-01)

Audit langsung 100% terhadap `modules/finance/finance-dashboard.js` (7
fungsi). Detail lengkap: `docs/BUG_REGISTRY.md` §0b (False Positive) dan
§0c (Design Decision). **0 bug baru ditemukan** — file ini murni presenter
tipis, 100% reuse `FinanceIntelligence.summary()`/`Kekayaan.
currentNetWorth()`/`Sparepart.calcFinanceStats()`, kontrak data dgn
seluruh callee sudah dicek dan konsisten.

**Dampak turunan dari bug yang sudah tercatat (bukan bug baru):**
- Kartu Arus Kas/Anggaran/Skor Kesehatan di Finance Dashboard ikut
  menampilkan data stale setelah `changeMonth()`/`changeTxListMonth()`,
  karena `render()` 100% membaca `FinanceIntelligence.summary()` yang
  terpengaruh **BUG-012**.
- Kartu Sparepart (`_sparepartCards()`) memanggil `goToList(...,
  'carnotes',4,null,'servis')` — caller kedua **BUG-011** yang
  terverifikasi (lihat §16); ikut ter-fix otomatis krn perbaikan ada di
  `goToList()` sendiri, bukan per-caller.

**Gap test (belum ada test eksekusi):**
- 0 test eksekusi (loadSource+DOM) untuk `getAIHook()`, `render()`,
  `_netWorthCard()`, `_cashFlowCard()`, `_budgetCard()`, `_healthCard()`,
  `_sparepartCards()`.
- 2 test yang menyentuh file ini (`cross-module-sync-finalisasi-s201.test.js`,
  `dashboard-networth-ssot-s268.test.js`) murni static regex check thd
  source (`fs.readFileSync`), bukan uji perilaku nyata.

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/FinanceDashboard — dari Sesi Audit finance-dashboard.js".

## 12. Business Logic — Finance/FinancialHealthScoreAPI (Sesi Audit financial-health-score-api.js, audit langsung, 2026-08-01)

Audit langsung 100% terhadap `modules/finance/financial-health-score-api.js`
(5 fungsi). Detail lengkap: `docs/BUG_REGISTRY.md` §0b (False Positive),
`docs/AUDIT_MATRIX.md` §12. **0 bug baru ditemukan** — file ini murni
composition layer tipis, 100% reuse `FinanceIntelligence.healthScore()`,
kontrak data dgn seluruh caller (`FinancialHealthScorePresenter`,
`FinancialRiskDashboardAPI._healthRisk()`) sudah dicek dan konsisten.

**Improvement (bukan bug, dicatat untuk prioritisasi ke depan):**
- `summary()` memanggil `scoreOverview()` (→ `_score()` →
  `FinanceIntelligence.healthScore()`) berulang secara tidak perlu — 1x
  langsung + 1x lagi di dalam `componentBreakdown()` + 1x lagi di dalam
  `financialHealthRecommendation()` + 1x lagi di dalam pemanggilan
  `componentBreakdown()` milik `financialHealthRecommendation()` sendiri
  = 4x `FinanceIntelligence.healthScore()` per satu kali `summary()`
  dipanggil. Hasil akhirnya tetap benar (data `D` tidak berubah di
  tengah satu siklus render), murni pemborosan komputasi — sebagian
  komponen `healthScore()` (`totalSaldoAkun()`, `FI.totalDebt()`,
  `computeCashflowForecast()`) TIDAK ikut tercakup oleh cache
  `_ivxCache`/`_budgetSummaryCache` milik `FinanceIntelligence`, jadi
  dihitung ulang penuh tiap panggilan.
- 0 test unit langsung untuk 5 fungsi di `financial-health-score-api.js`
  sendiri — satu-satunya test yang menyentuh domain ini
  (`tests/finance-nav-consistency-s254a.test.js`) seluruhnya me-mock
  `FinancialHealthScoreAPI` di level presenter.

**Dampak turunan dari bug yang sudah tercatat (bukan bug baru):**
- `summary()`/`_score()` ikut menampilkan data stale setelah
  `changeMonth()`/`changeTxListMonth()` karena 100% membaca
  `FinanceIntelligence.healthScore()` yang terpengaruh **BUG-012** —
  pola turunan sama persis dampak BUG-012 pada `finance-dashboard.js`
  (§11 di atas).

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/FinancialHealthScoreAPI — dari Sesi Audit
financial-health-score-api.js".

## 13. Business Logic — Finance/FinancialRiskDashboardAPI (Sesi Audit financial-risk-dashboard-api.js, audit langsung, 2026-08-01)

Audit langsung 100% terhadap `modules/finance/financial-risk-dashboard-api.js`
(7 fungsi). Detail lengkap: `docs/BUG_REGISTRY.md` §0a-6 (Bug), §0c
(Design Decision), `docs/AUDIT_MATRIX.md` §13.

- 🔴 **BUG-013** — `_emergencyFundRisk()` membaca `dd.saved` mentah,
  mengabaikan `dd.accountId` — utk Target Dana Darurat yang tertaut ke
  akun, `dd.saved` permanen `0` (tidak pernah ditulis ulang, per desain
  `DanaDaruratAI.updateSaved()`), sehingga Risk Factor "Dana Darurat
  belum tercapai — 0% dari target" MUNCUL TERUS walau saldo akun
  tertaut sudah mencapai/melewati target. Ikut menaikkan
  `riskLevel().count` secara keliru selamanya. Severity P2 Medium,
  Confidence High — pola account-aware `recalcAccBalance(dd.accountId)`
  sudah established & konsisten di 4 lokasi lain codebase
  (`DanaDaruratAI.currentSaved()`, `aset.js`, `invest-ai-widget.js`,
  `modules-render.js`).

**Design Decision (bukan bug):**
- `summary().ok` sengaja hardcode `true` (berbeda dari
  `FinancialHealthScoreAPI.summary()`/planner lain) — file ini tidak
  punya 1 sumber data wajib tunggal, ke-4 helper sumbernya sudah
  guard sendiri & selalu balikin `[]`/nilai default kalau sumbernya
  belum dimuat.

**Improvement (bukan bug, dicatat untuk prioritisasi ke depan):**
- `riskLevel()` memanggil ulang `this.riskFactors()` secara independen,
  lalu `summary()` memanggil `riskFactors()` LAGI secara langsung —
  hasilnya `riskFactors()` (dan ke-4 helper di baliknya, termasuk
  redundansi internal `FinancialHealthScoreAPI.
  financialHealthRecommendation()` yang sudah dicatat di §12) dihitung
  2x per satu kali `summary()` dipanggil. Hasil tetap benar (data `D`
  tidak berubah di tengah satu siklus render), murni pemborosan
  komputasi yang berlipat dari sumbernya.
- 0 test unit langsung untuk 7 fungsi di
  `financial-risk-dashboard-api.js` sendiri — satu-satunya test yang
  menyentuh domain ini (`tests/finance-nav-consistency-s254a.test.js`)
  seluruhnya me-mock `FinancialRiskDashboardAPI` di level presenter.

**Catatan cross-domain (BUKAN bagian audit resmi file ini, sekadar
observasi lintas-file yang ditemukan lewat cross-check pola
`dd.saved`/`dd.accountId` — TIDAK mengubah status AUDITED file lain):**
pola pembacaan `dd.saved` mentah tanpa cek `dd.accountId` yang sama juga
terlihat di `modules/finance/worthit.js` (`ddPct` calc) dan
`modules/home/hidup-seimbang.js` (`LifeBalance.compute()`) — KEDUA file
tsb sudah berstatus FINAL AUDITED di sesi sebelumnya (`worthit.js`) atau
belum masuk giliran audit (`hidup-seimbang.js`), jadi TIDAK diaudit
ulang/ditandai bug di sesi ini sesuai aturan "jangan audit ulang file
FINAL AUDITED" — dicatat di sini murni sbg petunjuk utk sesi audit
berikutnya kalau salah satu file tsb jadi giliran.

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/FinancialRiskDashboardAPI — dari Sesi Audit
financial-risk-dashboard-api.js".

## 14. Business Logic — Finance/BudgetRecommendationAPI (Sesi Audit budget-recommendation-api.js, audit langsung, 2026-08-01)

Audit langsung 100% terhadap `modules/finance/budget-recommendation-api.js`
(6 fungsi). Detail lengkap: `docs/BUG_REGISTRY.md` §0a-7 (Bug), §0b
(False Positive), §0c (Design Decision), `docs/AUDIT_MATRIX.md` §14.

- ✅ **BUG-014 — FIXED (v997/S333)** — `spendingAnalysis()`/
  `budgetSuggestion()` tidak mengurutkan `items`/`suggestions`
  berdasarkan prioritas (over/near/underused) atau nominal — urutan
  mengikuti apa adanya urutan `D.budgets` (urutan pembuatan anggaran).
  Presenter (`budget-recommendation-presenter.js`) memakai
  `suggestions[0]` sbg kartu "💡 Rekomendasi Utama" dan `.find()` elemen
  `over` PERTAMA sbg label "Terbesar" di kartu "🚨 Anggaran Over Limit"
  — keduanya BISA menampilkan item yang bukan prioritas/nominal
  tertinggi kalau item yang lebih mendesak/besar kebetulan bukan yang
  pertama dalam urutan `D.budgets`. Severity P2 Medium, Confidence High.
  **Diperbaiki Sesi 333**: tambah `_CATEGORY_PRIORITY`/
  `_sortBySeverity()` di `spendingAnalysis()` (sort atas COPY array, 0
  mutasi), `budgetSuggestion()` tidak perlu diubah. Regression test:
  `tests/budget-recommendation-severity-sort-s333.test.js` (7 test).
  Detail: `docs/BUG_REGISTRY.md` § 0 (Resolved),
  `FIX-v997-s333-budget-reco-priority-sort.md`.

**False Positive (dicatat, bukan bug):**
- `_classify()` membandingkan `item.pct` tanpa guard `limit<=0` —
  aman krn `pct` sudah dihitung aman di `FinanceIntelligence.
  budgetSummary()` (`limit>0 ? used/limit : 0`).
- `spendingAnalysis()` memetakan `bs.items` (berpotensi objek yang
  di-cache `FinanceIntelligence._budgetSummaryCache`) lewat spread
  copy (`{...it, category}`) — TIDAK memutasi objek asli, 0 risiko
  korupsi cache utk pemanggil lain.

**Design Decision (bukan bug):**
- Ambang klasifikasi `pct >= 0.8` (near) / `pct < 0.4` (underused)
  sengaja mengikuti gaya ambang 80/60/40 `healthScore()`/15% due-soon
  `VehicleReminder` yang sudah ada — bukan rumus finansial baru.
  `suggestedLimit` sengaja hanya disertakan utk kategori `over`.

**Improvement (bukan bug, dicatat untuk prioritisasi ke depan):**
- `summary()` memanggil `spendingAnalysis()` secara tidak langsung 3x
  per satu kali dipanggil (1x langsung + 1x lagi di dalam
  `budgetSuggestion()` + 1x lagi di dalam `budgetInsight()`) — hasil
  tetap benar (data `D` tidak berubah di tengah satu siklus render,
  dan `FinanceIntelligence.budgetSummary()` sendiri sudah dicache utk
  pemanggilan tanpa parameter), murni pemborosan komputasi
  `map()`/`filter()` berlipat di layer `BudgetRecommendationAPI`.
- 0 test unit langsung untuk 6 fungsi di
  `budget-recommendation-api.js` sendiri — satu-satunya test yang
  menyentuh domain ini (`tests/finance-nav-consistency-s254b.test.js`)
  seluruhnya me-mock `BudgetRecommendationAPI` di level presenter.

Rencana perbaikan (kalau sudah diprioritaskan): lihat `docs/TODO.md` §
"Finance/BudgetRecommendationAPI — dari Sesi Audit
budget-recommendation-api.js".

## 15. Bill/Tagihan — Sesi Fix S335 (BUG-019, BUG-018, BUG-016)

Detail lengkap: `docs/BUG_REGISTRY.md` §0 (Resolved), `FIX-v999-s335-bug019-018-016.md`.

- ✅ **BUG-019 — FIXED (v999/S335)** — `delTx()` (`tx-list-cashflow.js`)
  memanggil render manual (termasuk `renderBillHistory()`) SEBELUM
  `D.transactions` difilter & `save()` — kalau modal Riwayat Pembayaran
  sedang terbuka utk bill yang sama, baris pembayaran yang baru dihapus
  masih tampil sampai ada trigger render lain. Fix: urutan dibalik
  (filter+save dulu, baru render).
- ✅ **BUG-018 — FIXED (v999/S335)** — `markBillPaid()`
  (`tagihan-kalender.js`) hanya refresh kartu Kekayaan Bersih/Zakat
  Maal di jalur `kind==='utang'` — 3 jalur lain (cicilan lunas, tagihan
  sekali selesai, berulang lanjut non-utang) tidak ikut refresh
  walau sama-sama membuat transaksi expense baru. Fix: tambah/lepaskan
  gate panggilan `renderKekayaanBersih()`/`hitungZakatMaal()` di
  ketiga jalur tsb.
- ✅ **BUG-016 — FIXED (v999/S335)** — `getBillStats()`/`checkBills()`
  (`tagihan-kalender.js`) membandingkan `today` (local midnight)
  terhadap `new Date(b.nextDue)` (UTC-parsed) — bill jatuh tempo hari
  ini tertampil sbg "H-1" di timezone Indonesia. Fix: helper baru
  `billNextDueLocalMidnight()` (parse local, bukan UTC).

**BUG-017** ("RefAI refCheckedAt") — tidak ada evidence di manapun
(bukan di registry, bukan di 4 dokumen audit yang di-cross-check,
tidak ada modul/field terkait di source code) — di-skip sesuai
konfirmasi eksplisit user, TIDAK dicatat sbg entri bug (mencegah entri
fiktif).

## 16. Shared/Navigasi — Sesi Fix S335 lanjutan (BUG-011)

Detail lengkap: `docs/BUG_REGISTRY.md` §0 (Resolved), `FIX-v1000-s335-bug011.md`.

- ✅ **BUG-011 — FIXED (v1000/S335)** — `goToList()`
  (`modules/finance/filter-laporan.js`) menghitung index tombol
  `.cn-tab` untuk `shopTabName`/`cnTabName` lewat ternary hardcode yang
  tidak cocok dengan urutan tombol aktual di DOM — tombol tab yang
  ter-highlight `active` salah (mis. "⛽ BBM" ter-highlight padahal
  konten "🔧 Servis" yang dibuka) walau konten yang ditampilkan tetap
  benar. Fix: ganti hardcode ternary dengan `SHOP_TAB_ORDER`/
  `CN_TAB_ORDER` + `indexOf()`, pola sama persis yang sudah dipakai
  `keuTabName` di fungsi yang sama.
