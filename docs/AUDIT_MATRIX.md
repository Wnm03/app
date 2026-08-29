# AUDIT MATRIX
## v986 / S324 Baseline

> This matrix is the traceability backbone for the application. It is deliberately conservative: `PASS` means verified, not merely present in code.

### Status meanings

- `INVENTORIED` — discovered in source/docs but not behaviorally verified.
- `REVIEW` — requires code/runtime verification.
- `PASS` — verified by evidence.
- `FAIL` — defect/gap found.
- `N/A` — not applicable.
- `VERIFY` — business decision required.

---

# 1. Coverage Baseline

| Metric | Baseline |
|---|---:|
| Total files | 1391 |
| JavaScript | 833 |
| Tests | 470 |
| Markdown | 508 |
| HTML | 5 |
| JSON | 2 |
| CSS | 2 |
| Module families | 12 |

**Important:** Structural inventory is complete for the uploaded ZIP (`kw_release_v992_s331-coverage-per-module.zip`, cross-checked against the patch ZIP). Counts exclude `backups/` (historical snapshots, not live app code) and `node_modules/`/`.git/`. This is **not** a claim that every runtime behavior has already passed QA. These numbers are now auto-checked by `scripts/build.js` (`lintDocsBaselineCountDrift()`, non-fatal warning) — update this table whenever the warning fires and the change is intentional.

_Baseline diperbarui pasca-v1100/S398 ("update baseline drift", laporan `lintDocsBaselineCountDrift()` di build.js): Total files 754→740 (-14), JavaScript 611→527 (-84), Markdown 127→189 (+62), Tests 174→222 (+48), Module families tetap 12 — drift terkumpul dari banyak sesi sejak S353 (baseline lama belum sempat diupdate, bukan perubahan tunggal sesi ini). Sesi S398 sendiri cuma nambah +1 JS (tests/salary-allocation-s398.test.js) & +1 Markdown (FIX-v1099-to-v1100-s398-salary-allocation-suggestion.md) dari total drift di atas._

_Baseline diperbarui lagi pasca-v1153/S438 ("update baseline drift"): Total files 740→822 (+82), JavaScript 527→555 (+28), Markdown 189→243 (+54), Tests/HTML/JSON/CSS/Module families tetap — drift terkumpul dari banyak sesi sejak S398 (baseline lama belum sempat diupdate lagi, bukan perubahan tunggal sesi ini; termasuk 3 file baru dari sesi s437 itu sendiri: 1 JS fix + 1 test + 1 dokumen FIX)._

_Baseline diperbarui lagi pasca-v1189/S470 ("update baseline drift"): Total files 822→861 (+39), JavaScript 555→579 (+24), Markdown 243→258 (+15), Tests/HTML/JSON/CSS/Module families tetap — drift terkumpul dari banyak sesi sejak S438 (baseline lama belum sempat diupdate lagi selama ±31 sesi, bukan perubahan tunggal sesi ini; mencakup seluruh pekerjaan BUG-INV-001 Opsi 3, Sesi 466-469 — `InvestmentListUI`/`InvestmentTxUI`/`InvestmentWatchUI` + test coverage-nya, verifikasi 4 dead-read call site, & fix navigasi Investment Planner)._

_Baseline diperbarui lagi (housekeeping, temuan audit lanjutan poin #3 pasca-S677/S679 — tabel ini sempat dibiarkan basi ±200 sesi, selisih makin lebar tiap kali dicek): Total files 861→1391 (+530), JavaScript 579→833 (+254), Markdown 258→508 (+250), HTML 3→5 (+2), Tests 222→470 (+248, dihitung dari jumlah file pola `*.test.js` — label ini TIDAK ikut auto-check `lintDocsBaselineCountDrift()` di build.js krn "Tests" tidak ada di `FILE_COUNT_LINT_LABELS`, jadi angka ini estimasi manual konsisten dgn definisi awal, bukan hasil lint), JSON/CSS/Module families tetap — drift terkumpul dari SANGAT banyak sesi sejak S470 (baseline lama belum sempat diupdate lagi selama ratusan sesi, bukan perubahan tunggal sesi ini). Snapshot dihitung dgn logic walk yang persis sama dgn `lintDocsBaselineCountDrift()` (exclude `node_modules/`, `.git/`, `backups/`), diambil pada versi app v1435 (`CACHE_NAME` = `kw-cache-v1435` di `sw.js`). CATATAN: poin #3 audit lanjutan cuma housekeeping dokumentasi — 0 perubahan kode aplikasi, 0 perubahan behavior._

---

# 2. Feature Domains

| ID | Domain | Entry / Ownership | Initial Status |
|---|---|---|---|
| DASH-001 | Dashboard | `modules/dashboard-hub`, home/shared | REVIEW |
| SHOP-001 | Product management | `modules/shop` | REVIEW |
| SHOP-002 | Shop/Kasir | `modules/shop` | REVIEW |
| TX-001 | Transactions | `modules/shop`, shared transaction modules | REVIEW |
| BILL-001 | Bills/installments | finance/shop/bill-related modules | REVIEW |
| FIN-001 | Finance | `modules/finance` | REVIEW |
| DEBT-001 | Debt/receivable | finance/bill-related modules | REVIEW |
| INV-001 | Inventory/stock | shop/business | REVIEW |
| IMP-001 | Import/export | shared/shop/finance | REVIEW |
| SCAN-001 | Vehicle scanner | `modules/vehicle` | REVIEW |
| SCAN-002 | Sparepart scanner | `modules/vehicle` | REVIEW |
| MODAL-001 | Modal lifecycle | shared/UI helpers | REVIEW |
| CAR-001 | Car Notes | `modules/vehicle` | REVIEW |
| AST-001 | Asset management | `modules/asset` | REVIEW |
| AI-001 | AI/Insight | `modules/ai` | REVIEW |
| BUS-001 | Business | `modules/business` | REVIEW |
| LOG-001 | Logistics | `modules/logistics` | REVIEW |
| REWARD-001 | Self Reward | `modules/self-reward` | REVIEW |
| CROSS-001 | Cross-domain | `modules/cross` | REVIEW |
| LIFE-001 | LifeOS | `lifeos` | REVIEW |
| EIE-001 | Economic Intelligence | `economic-intelligence` | REVIEW |

---

# 3. High-Risk Test Matrix

| ID | Scenario | Expected invariant | Status |
|---|---|---|---|
| MODAL-101 | open → close → reopen | no stranded overlay/stale state | REVIEW |
| MODAL-102 | submit twice rapidly | one logical mutation | REVIEW |
| MODAL-103 | submit → error → retry | recoverable state | REVIEW |
| MODAL-104 | Escape/backdrop close | cleanup complete | REVIEW |
| SCAN-101 | camera denied | no stuck overlay | REVIEW |
| SCAN-102 | scan same code rapidly | no unintended duplicate mutation | REVIEW |
| SCAN-103 | close/reopen scanner | one active session | REVIEW |
| SCAN-104 | pagehide/background | stream/listeners cleaned | REVIEW |
| BILL-101 | create installment | source links intact | REVIEW |
| BILL-102 | edit payment | old effect reversed correctly | REVIEW |
| BILL-103 | delete payment | dependent state consistent | REVIEW |
| BILL-104 | full payment | authoritative status becomes paid | REVIEW |
| BILL-105 | ambiguous fallback | no silent wrong record selection | REVIEW |
| TX-101 | edit transaction | totals/dependencies synchronized | REVIEW |
| TX-102 | duplicate payment | blocked/guarded | REVIEW |
| IMP-101 | malformed CSV | explicit error, no silent corruption | REVIEW |
| IMP-102 | duplicate CSV rows | deterministic policy | REVIEW |
| DATA-101 | mutation then reload | persisted state remains correct | REVIEW |
| DATA-102 | UI vs DB comparison | same authoritative state | REVIEW |
| INV-101 | Servis save: `usedPartId` stock deducted, then `catalogPartId` stock deduction fails & user declines "tetap lanjut" (new-record path) | `usedPartId` stock is reverted, not deducted a second time; no `D.servisLogs` entry created | **PASS** — `car-notes.js` `Servis._saveInner()` rollback now calls `revertStockUsage()` instead of `applyStockUsage()`; regression test `tests/servis-stock-rollback-double-deduct-s324.test.js` (reproduced failing against pre-fix v985/S323 code, passing after fix) |
| INV-102 | Same as INV-101 but on the edit path (`editId!==null`), where the OLD `usedPartId` deduction was already reverted at function start | OLD `usedPartId` deduction is restored AND the newly-attempted deduction is not double-applied | **PASS** — same fix/commit as INV-101; second case in `servis-stock-rollback-double-deduct-s324.test.js` |
| REG-101 | latest fix (S324) | no dependent regression | **PASS** — full suite reported 2055/2056 passing post-fix (1 pre-existing unrelated failure: `self-test.js`, a browser script incorrectly globbed by `node --test`, present identically in the v985/S323 baseline); 2 new tests added, 0 removed |

---

# 4. Audit Procedure

For every row:

1. locate implementation;
2. identify authoritative data source;
3. identify event/entry point;
4. trace mutation;
5. trace persistence;
6. trace UI refresh;
7. test error path;
8. test boundary cases;
9. test reload;
10. record evidence;
11. classify defect;
12. add regression test if needed.

---

# 5. Evidence Rules

A row may become `PASS` only with one or more of:

- source-code trace;
- automated test;
- build/lint result;
- runtime reproduction;
- database/persistence verification;
- explicit product decision.

A comment or historical changelog alone is not proof of current behavior.

---

# 6. Recommended Audit Sequence (ringan → berat)

This sequence turns `REVIEW` rows into `PASS`/`FAIL` gradually,
batch-sized to fit the project's existing one-session-at-a-time,
additive-only convention (no batch touches `FEATURE_REGISTRY`,
`OwnershipEngine`, or the build system). Each batch should end the
same way every session already does: build + test + ZIP. Order is by
estimated blast-radius/effort, not by product importance.

## Batch 0 — done (v986/S324)

- `INV-101`, `INV-102`, `REG-101` — already `PASS`, evidence in
  Section 3 above. No action needed.

## Batch 1 — Ringan: isolated, low blast-radius domains

Single-owner modules with few cross-domain dependencies; mostly a
source-code trace plus existing tests, low risk of touching shared
state.

- `REWARD-001` Self Reward
- `LIFE-001` LifeOS
- `EIE-001` Economic Intelligence
- `AST-001` Asset management
- `AI-001` AI/Insight (advisory-only per PRD §3.13 — must not mutate
  authoritative data, which itself makes this quick to verify)

## Batch 2 — Sedang: standard single-domain CRUD

Normal create/edit/delete surfaces, one primary module each, moderate
cross-references (e.g. to Dashboard).

- `DASH-001` Dashboard
- `SHOP-001` Product management
- `CAR-001` Car Notes (remaining scope beyond the S324 stock-rollback
  fix already covered in Batch 0)
- `BUS-001` Business
- `LOG-001` Logistics
- `SCAN-002` Sparepart scanner

## Batch 3 — Berat: historically flagged high-risk areas

These correspond directly to the `OPEN` findings already logged in
`BUG_REGISTRY.md` (`AUD-001`–`AUD-003`) — areas with a track record of
past bugs, multiple interacting records, or camera/lifecycle state.
Do these after Batch 1–2 so the simpler domains are already trusted
building blocks.

- `BILL-101`…`BILL-105`, `DEBT-001` (→ `AUD-001`)
- `MODAL-001`, `MODAL-101`…`MODAL-104` (→ `AUD-002`)
- `SCAN-001`, `SCAN-101`…`SCAN-104` (→ `AUD-003`)
- `TX-001`, `TX-101`…`TX-102`
- `INV-001` (remaining scope beyond `INV-101`/`INV-102`)
- `SHOP-002` Kasir (payment-adjacent)
- `IMP-001`, `IMP-101`…`IMP-102`

## Batch 4 — Integrasi & penutup

Cross-cutting checks that only make sense once the individual domains
above are already `PASS`, plus the remaining `BUG_REGISTRY.md`
findings that are inherently cross-domain.

- `DATA-101`, `DATA-102`
- `AUD-004` Source/bundle drift
- `AUD-005` Dashboard/widget ownership dedup
- `AUD-006` Data fallback resolution
- Full-suite `REG-101` re-run (final, after Batch 1–3 all `PASS`)
- `RELEASE_GATE.md` final sign-off

## Notes

- A batch may be split across multiple sessions if a domain turns out
  larger than expected — splitting is preferred over scope creep in a
  single session.
- Any row that surfaces a real defect goes into `BUG_REGISTRY.md`
  immediately (using the finding template) rather than being silently
  left as `REVIEW`.
- `[VERIFY]` items encountered along the way should be raised to the
  product owner directly rather than assumed.

---

# 7. Function-Level Audit Log — Bill/Piutang/Debt domain (Sesi Audit 2026-08-01)

> Diimplementasikan dari hasil audit eksternal (source of truth). Status
> `AUDITED` = fungsi sudah diaudit sesi ini (temuan terkait ada di
> `BUG_REGISTRY.md` §0a/0b/0c). Status `PENDING AUDIT` = belum disentuh.

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| (Piutang module) | `Piutang.save()` | AUDITED | Bug — OPEN | BUG-FIN-001, `BUG_REGISTRY.md` §0a |
| (Debt module) | `Debt.save()` | AUDITED | Bug — OPEN | BUG-FIN-001, `BUG_REGISTRY.md` §0a |
| (Bill module) | `_saveBillInner()` | AUDITED | Bug — OPEN | BUG-001, BUG-003, `BUG_REGISTRY.md` §0a |
| (Bill module) | `applyBillPaymentTxSync()` | AUDITED | Not specified in audit input | No finding recorded against this function in the audit input |
| (Bill module) | `isLatestBillPaymentTx()` | AUDITED | Not specified in audit input | No finding recorded against this function in the audit input |
| (Bill module) | `getBillArchiveEditSource()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| (Bill module) | `saveBill()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| (Bill module) | `markBillPaid()` | AUDITED | Bug — OPEN | BUG-004, `BUG_REGISTRY.md` §0a |
| (Bill module) | `delBill()` | AUDITED | By Design | `BUG_REGISTRY.md` §0c |
| (Bill module) | `delBillArchive()` | AUDITED | Bug — OPEN | BUG-005, `BUG_REGISTRY.md` §0a |
| (Piutang module) | `syncOutstandingSharedPiutang()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| (Piutang module) | `maybeCreateSharedPiutangFromBill()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| `modules/finance/piutang-utang.js` | `Debt.syncBill()` | AUDITED | Bug — OPEN | BUG-006, `BUG_REGISTRY.md` §0a-2 |
| `modules/finance/tagihan-kalender.js` | `getBillPaidThisPeriodInfo()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| `modules/finance/tagihan-kalender.js` | `revertBillFromDeletedTx()` | AUDITED | Bug — OPEN | BUG-007, `BUG_REGISTRY.md` §0a-2 |
| `modules/finance/tagihan-kalender.js` | `deleteBillHistoryTx()` | AUDITED | No independent finding (inherits BUG-007 via shared `revertBillFromDeletedTx()`) | `BUG_REGISTRY.md` §0a-2 |

**Sesi Audit-Docs 2 (2026-08-01, lanjutan):** ke-4 fungsi di atas yang
tadinya `PENDING AUDIT` sudah diaudit langsung dari source code (bukan
input eksternal) — 2 bug baru (BUG-006, BUG-007), 1 false positive
(`getBillPaidThisPeriodInfo()`), 1 fungsi tanpa temuan independen
(`deleteBillHistoryTx()`, mewarisi BUG-007 lewat SSOT). Kolom "File" untuk
baris ini diisi path eksak (hasil verifikasi langsung), berbeda dari
baris-baris §7 sebelumnya yang cuma diisi nama domain (input audit
eksternal tidak menyebutkan path). **Semua fungsi di domain
Bill/Piutang/Debt yang tercantum di §7 sekarang berstatus AUDITED — tidak
ada lagi PENDING AUDIT tersisa dari daftar awal sesi audit ini.**

**Catatan tambahan:** BUG-002 (mismatch `tx.amount` vs label "Jumlah Total
per Periode") tidak dikaitkan ke fungsi spesifik pada tabel di atas karena
input audit tidak menyebutkan nama fungsi/file untuk temuan ini — lihat
`BUG_REGISTRY.md` §0a untuk detail temuan apa adanya.

**Catatan:** kolom "File" tidak disertakan path eksak di input audit untuk
sebagian fungsi (hanya nama module/domain) — diisi berdasarkan domain yang
disebutkan (Piutang/Debt/Bill) tanpa mengasumsikan path file spesifik yang
tidak ada di input audit. Update ke path file eksak boleh dilakukan sesi
berikutnya kalau diverifikasi ulang.

---

# 8. Business Logic — Finance/WorthIt (Sesi Audit worthit.js, diimplementasikan Sesi Audit-Docs 3, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/worthit.js` | `WorthIt.catatBeli()` | AUDITED | Bug — OPEN | BUG-008, `BUG_REGISTRY.md` §0a-3 |
| `modules/finance/worthit.js` | `pendingBuyId` / `openTxModal()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| `modules/finance/worthit.js` | `incomeAvg()` (div-by-zero) | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |

**Status file:** Seluruh fungsi di `modules/finance/worthit.js` berstatus
**AUDITED (100%)** per hasil audit sesi terputus sebelumnya — tidak ada
fungsi tersisa berstatus PENDING AUDIT di file ini. Input audit yang
diteruskan ke sesi dokumentasi ini hanya merinci 1 bug (BUG-008) dan 2
false positive di atas; fungsi-fungsi lain di file tersebut tercakup
dalam status "AUDITED (100%)" tanpa rincian per-fungsi tambahan karena
tidak disebutkan di ringkasan hasil audit yang diteruskan. Item
Improvement (gap UX saldo ≤ 0; belum ada test untuk `hitung()` dan
`computeScore()`) dicatat di `docs/KNOWN-ISSUES.md` §8 dan `TODO.md`,
bukan sebagai baris matrix tersendiri karena bukan bug/false
positive/design decision.

---

# 9. Business Logic — Finance/Filter-Laporan (Sesi Audit-Docs 4, audit langsung, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/filter-laporan.js` | `txMatchesFilters(t,f)` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `populateCatFilter()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `onFKatChange()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `resetLaporanFilter()` | AUDITED | No independent finding (ternary redundan, lihat Improvement) | `docs/KNOWN-ISSUES.md` §9 |
| `modules/finance/filter-laporan.js` | `getLaporanFilters()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `populateKeuFilters()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `onKfKatChange()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `toggleKeuFilter()` | AUDITED | Bug — OPEN | BUG-009, `BUG_REGISTRY.md` §0a-4 |
| `modules/finance/filter-laporan.js` | `resetKeuFilter()` | AUDITED | No independent finding (ternary redundan, lihat Improvement) | `docs/KNOWN-ISSUES.md` §9 |
| `modules/finance/filter-laporan.js` | `getKeuFilters()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `txMatchesSearch(t,q)` | AUDITED | No independent finding (scope pencarian terbatas, lihat Improvement) | `docs/KNOWN-ISSUES.md` §9 |
| `modules/finance/filter-laporan.js` | `loadMoreLapTx()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `resetTxPageAndRender()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `onKfSearchInput()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `loadMoreTx()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `saveKeuFilterPrefs()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `loadKeuFilterPrefsIntoDOM()` | AUDITED | By Design | `BUG_REGISTRY.md` §0c |
| `modules/finance/filter-laporan.js` | `updateKfBadge()` | AUDITED | No independent finding | — |
| `modules/finance/filter-laporan.js` | `goToList()` | AUDITED | Bug — OPEN | BUG-011, `BUG_REGISTRY.md` §0a-4 |
| `modules/finance/filter-laporan.js` | `showFilteredTx()` | AUDITED | Bug — OPEN (BUG-010) + False Positive (2 item, timezone & scope dashboard) | `BUG_REGISTRY.md` §0a-4, §0b |

**Status file:** Seluruh 20 fungsi + 5 state var module-level
(`txListPage`, `TX_PAGE_SIZE`, `lapTxPage`, `_lapLastFilterSig`,
`_keuFilterPrefsLoaded`) di `modules/finance/filter-laporan.js` sudah
`AUDITED (100%)` — tidak ada fungsi tersisa PENDING AUDIT di file ini.
Audit dilakukan LANGSUNG dari source code (trace caller/callee lintas
codebase termasuk `index.html`/`app_production.html`, `styles.css`,
`modules/shop/cobek-io.js`, `modules/vehicle/vehicle-core.js`,
`modules/finance/pajak-pbb-zakat.js`, `modules/shared/modules-render.js`),
bukan implementasi input eksternal. 3 bug baru (BUG-009, BUG-010,
BUG-011), 2 false positive, 1 design decision, 2 improvement (dead
ternary, scope pencarian) — lihat `docs/BUG_REGISTRY.md` §0a-4/§0b/§0c
dan `docs/KNOWN-ISSUES.md` §9 untuk detail lengkap.

---

# 10. Business Logic — Finance/FinanceIntelligence (Sesi Audit-Docs 5, implementasi dari sesi terputus, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/finance-intelligence.js` | `healthScore()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| `modules/finance/finance-intelligence.js` | `insights()` | AUDITED | False Positive | `BUG_REGISTRY.md` §0b |
| `modules/finance/finance-intelligence.js` | `summary()` | AUDITED | No independent finding (test gap) | `docs/KNOWN-ISSUES.md` §10 |
| `modules/finance/finance-intelligence.js` | `cashflowSummary()` | AUDITED | No independent finding (test gap) | `docs/KNOWN-ISSUES.md` §10 |
| `modules/finance/finance-intelligence.js` | `_ivxCache` / `_budgetSummaryCache` (cache mechanism) | AUDITED | By Design (scope cache) + Bug — OPEN (invalidation) | BUG-012, `BUG_REGISTRY.md` §0a-5/§0c |
| `modules/finance/finance-intelligence.js` | `changeMonth()` | AUDITED | Bug — OPEN | BUG-012, `BUG_REGISTRY.md` §0a-5 |
| `modules/finance/finance-intelligence.js` | `changeTxListMonth()` | AUDITED | Bug — OPEN | BUG-012, `BUG_REGISTRY.md` §0a-5 |
| `modules/finance/finance-intelligence.js` | `_isTxAccountSelf()` | AUDITED | No independent finding (Improvement — kompleksitas O(transaksi × akun)) | `docs/KNOWN-ISSUES.md` §10 |

**Status file:** Seluruh fungsi di `modules/finance/finance-intelligence.js`
berstatus **AUDITED (100%)** — tidak ada fungsi tersisa. Hasil audit
diteruskan dari sesi audit (langsung terhadap source code) yang terputus
karena limit sebelum sempat didokumentasikan; sesi dokumentasi ini
(Sesi Audit-Docs 5) TIDAK mengaudit ulang kode, murni mengimplementasikan
hasil audit yang sudah final sebagai source of truth. 1 bug baru
(BUG-012), 2 false positive, 1 design decision (scope pemakaian cache),
1 improvement (`_isTxAccountSelf()` kandidat optimasi Map). Gap test:
`insights()`, `summary()`, `cashflowSummary()`, dan BUG-012 (cache
setelah ganti bulan) belum punya test — lihat `docs/KNOWN-ISSUES.md` §10
dan `TODO.md` § "Finance/FinanceIntelligence — dari Sesi Audit
finance-intelligence.js".

---

# 11. Business Logic — Finance/FinanceDashboard (Sesi Audit-Docs 6, audit langsung, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/finance-dashboard.js` | `getAIHook()` | AUDITED | No independent finding | Wrapper tipis `FinanceIntelligence.summary()`, kontrak konsisten |
| `modules/finance/finance-dashboard.js` | `render()` | AUDITED | No independent finding (dampak turunan BUG-012) | `docs/BUG_REGISTRY.md` §0a-5 (cache stale ikut mempengaruhi kartu Arus Kas/Anggaran/Skor Kesehatan) |
| `modules/finance/finance-dashboard.js` | `_sparepartCards()` | AUDITED | No independent finding (trigger tambahan BUG-011) | `docs/BUG_REGISTRY.md` §0a-4 — caller kedua terverifikasi `goToList(...,'servis')` |
| `modules/finance/finance-dashboard.js` | `_netWorthCard()` | AUDITED | No independent finding | Reuse SSOT `Kekayaan.currentNetWorth()` (S268), kontrak cocok |
| `modules/finance/finance-dashboard.js` | `_cashFlowCard(cf)` | AUDITED | No independent finding | Field `cf.currentMonth.net`/`cf.projected` cocok dgn `cashflowSummary()`/`computeCashflowForecast()` |
| `modules/finance/finance-dashboard.js` | `_budgetCard(bs)` | AUDITED | No independent finding | Field `bs.overallPct`/`overCount`/`totalUsed`/`totalLimit` cocok dgn `budgetSummary()` |
| `modules/finance/finance-dashboard.js` | `_healthCard(hs)` | AUDITED | False Positive | `docs/BUG_REGISTRY.md` §0b — guard `if(!hs)` dead code tapi aman |

**Status file:** Seluruh 7 fungsi di `modules/finance/finance-dashboard.js`
berstatus **AUDITED (100%)** — tidak ada fungsi tersisa. Audit dilakukan
LANGSUNG dari source code (trace caller/callee penuh lintas codebase:
`modules/shared/modules-render.js` — `renderKeuangan()`/`runDeferredOrNow()`,
`modules/finance/tx-list-cashflow.js` — `computeCashflowForecast()`/
`changeMonth()`/`changeTxListMonth()`, `modules/finance/finance-intelligence.js`
— kontrak `summary()`, `modules/vehicle/sparepart-servis.js` —
`calcFinanceStats()`, `modules/shared/modules-calc.js` — `Kekayaan.
currentNetWorth()`, `index.html`/`app_production.html` — `#findashGrid`).
**0 bug baru ditemukan** — file ini murni presenter tipis, 100% reuse,
kontrak data dgn seluruh calleenya konsisten. 1 false positive, 1 design
decision, 0 improvement pada logic file ini sendiri. Gap nyata: 0 test
eksekusi (loadSource+DOM) untuk 7 fungsi di file ini — 2 test yang ada
(`cross-module-sync-finalisasi-s201.test.js`,
`dashboard-networth-ssot-s268.test.js`) murni static regex check thd
source, bukan uji perilaku — lihat `docs/KNOWN-ISSUES.md` §11 dan
`TODO.md` § "Finance/FinanceDashboard — dari Sesi Audit
finance-dashboard.js".

---

# 12. Business Logic — Finance/FinancialHealthScoreAPI (Sesi Audit-Docs 7, audit langsung, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/financial-health-score-api.js` | `_score()` | AUDITED | No independent finding | Satu titik akses ke `FinanceIntelligence.healthScore()`, guard `typeof`+try/catch benar |
| `modules/finance/financial-health-score-api.js` | `scoreOverview()` | AUDITED | No independent finding | Wrapper tipis `_score()`, kontrak `{ok,score,label,parts}` apa adanya |
| `modules/finance/financial-health-score-api.js` | `componentBreakdown()` | AUDITED | False Positive | `docs/BUG_REGISTRY.md` §0b — guard `p.weight>0` dead code tapi aman |
| `modules/finance/financial-health-score-api.js` | `financialHealthRecommendation()` | AUDITED | No independent finding (Improvement — lihat catatan) | `docs/KNOWN-ISSUES.md` §12 |
| `modules/finance/financial-health-score-api.js` | `summary()` | AUDITED | No independent finding (Improvement — panggilan redundan) | `docs/KNOWN-ISSUES.md` §12 |

**Status file:** Seluruh 5 fungsi di
`modules/finance/financial-health-score-api.js` berstatus **AUDITED
(100%)** — tidak ada fungsi tersisa PENDING AUDIT di file ini. Audit
dilakukan LANGSUNG dari source code (137 baris, baris-per-baris, bukan
sampling/grep) + trace penuh caller/callee lintas codebase:
`modules/finance/finance-intelligence.js` — kontrak
`healthScore()` (`{score,label,parts[]}`, `parts[].weight` hardcode 25,
`maxScore` tidak pernah 0 karena komponen `savings` selalu didorong
tanpa guard), `modules/finance/financial-health-score-presenter.js` —
seluruh 3 `_xxxCard()` + `render()` (konsumen utama, lewat `summary()`),
`modules/finance/financial-risk-dashboard-api.js` — `_healthRisk()`
(konsumen kedua, memanggil `financialHealthRecommendation()` langsung,
bukan lewat `summary()`), `modules/finance/debt-optimizer-api.js` —
`debtRecommendation()` (pembanding pola "return `out` array kosong kalau
`!o.ok`", TERVERIFIKASI SAMA, bukan penyimpangan), `tests/
finance-nav-consistency-s254a.test.js` (satu-satunya test yang menyentuh
domain ini, seluruhnya me-mock `FinancialHealthScoreAPI` di level
presenter — 0 test unit langsung utk 5 fungsi file ini sendiri).
**0 bug baru ditemukan** — file ini murni composition layer tipis, 100%
reuse `FinanceIntelligence.healthScore()`, kontrak data dgn seluruh
callee & caller konsisten (dicek baris-per-baris, termasuk perbandingan
kontrak `financialHealthRecommendation()`/`debtRecommendation()`). 1
false positive, 0 design decision baru, 2 improvement (redundansi
pemanggilan `_score()`/`FinanceIntelligence.healthScore()` di
`summary()`; 0 test unit langsung). Dampak turunan (bukan bug baru):
`summary()`/`_score()` ikut terdampak **BUG-012** (cache
`_ivxCache`/`_budgetSummaryCache` stale setelah `changeMonth()`/
`changeTxListMonth()`, `finance-intelligence.js`) lewat panggilan
`FinanceIntelligence.healthScore()` — pola turunan sama persis
`finance-dashboard.js` (§11 di atas) — lihat `docs/KNOWN-ISSUES.md` §12
dan `TODO.md` § "Finance/FinancialHealthScoreAPI — dari Sesi Audit
financial-health-score-api.js".

---

# 13. Business Logic — Finance/FinancialRiskDashboardAPI (Sesi Audit-Docs 8, audit langsung, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/financial-risk-dashboard-api.js` | `_debtRisk()` | AUDITED | No independent finding | Reuse `DebtOptimizerAPI.debtRecommendation()` apa adanya, guard+try/catch benar |
| `modules/finance/financial-risk-dashboard-api.js` | `_healthRisk()` | AUDITED | No independent finding | Reuse `FinancialHealthScoreAPI.financialHealthRecommendation()` apa adanya, guard+try/catch benar |
| `modules/finance/financial-risk-dashboard-api.js` | `_cashflowBudgetRisk()` | AUDITED | No independent finding | Reuse `FinanceIntelligence.insights()` apa adanya, guard+try/catch benar |
| `modules/finance/financial-risk-dashboard-api.js` | `_emergencyFundRisk()` | AUDITED | **Bug — OPEN** | **BUG-013**, `docs/BUG_REGISTRY.md` §0a-6 — abaikan `dd.accountId`, baca `dd.saved` mentah (selalu 0 utk target ber-akun) |
| `modules/finance/financial-risk-dashboard-api.js` | `riskFactors()` | AUDITED | No independent finding (dampak turunan BUG-013) | Menggabungkan hasil ke-4 helper apa adanya — ikut membawa BUG-013 lewat `_emergencyFundRisk()` |
| `modules/finance/financial-risk-dashboard-api.js` | `riskLevel()` | AUDITED | No independent finding (Improvement — lihat catatan) | `docs/KNOWN-ISSUES.md` §13 — recompute `riskFactors()` independen |
| `modules/finance/financial-risk-dashboard-api.js` | `summary()` | AUDITED | Design Decision (`ok` selalu `true`) + Improvement (panggilan `riskFactors()` 2x) | `docs/BUG_REGISTRY.md` §0c, `docs/KNOWN-ISSUES.md` §13 |

**Status file:** Seluruh 7 fungsi di `modules/finance/
financial-risk-dashboard-api.js` berstatus **AUDITED (100%)** — tidak
ada fungsi tersisa PENDING AUDIT di file ini. Audit dilakukan LANGSUNG
dari source code (163 baris, baris-per-baris) + trace penuh
caller/callee lintas codebase: `modules/finance/debt-optimizer-api.js`
— `debtRecommendation()`, `modules/finance/financial-health-score-api.js`
— `financialHealthRecommendation()` (termasuk redundansi internalnya,
lihat §12), `modules/finance/finance-intelligence.js` — `insights()`,
`modules/finance/tx-target.js` — `saveTarget()`/`onTargetDanaDaruratToggle()`
(konfirmasi `saved=0` permanen utk target ber-`accountId`),
`modules/shared/modules-calc.js` — `DanaDaruratAI.currentSaved()`/
`updateSaved()` (SSOT pola account-aware, DAN konfirmasi `dd.saved`
sengaja TIDAK ditulis ulang kalau `accountId` ada), `modules/asset/aset.js`
& `modules/asset/invest-ai-widget.js` (2 konsumen lain `D.targets`
Dana Darurat yang SUDAH benar pakai pola account-aware, dipakai sbg
pembanding), `modules/finance/financial-risk-dashboard-presenter.js`
(satu-satunya caller, 100% konsumsi `summary()` apa adanya, tidak ada
kompensasi utk bug ini di level presenter), `tests/
finance-nav-consistency-s254a.test.js` (satu-satunya test yang
menyentuh domain ini, seluruhnya me-mock `FinancialRiskDashboardAPI` di
level presenter — 0 test unit langsung utk 7 fungsi file ini sendiri).
**1 bug baru ditemukan (BUG-013)** — `_emergencyFundRisk()` tidak
mengikuti pola account-aware Dana Darurat yang sudah established di 4
lokasi lain di codebase. 0 false positive baru, 1 design decision baru
(`summary().ok` selalu `true`), 2 improvement (`riskLevel()`/`summary()`
memanggil `riskFactors()` berulang; 0 test unit langsung) — lihat
`docs/KNOWN-ISSUES.md` §13 dan `TODO.md` §
"Finance/FinancialRiskDashboardAPI — dari Sesi Audit
financial-risk-dashboard-api.js".

---

# 14. Business Logic — Finance/BudgetRecommendationAPI (Sesi Audit-Docs 9, audit langsung, 2026-08-01)

| File | Function | Audit Status | Classification | Notes |
|---|---|---|---|---|
| `modules/finance/budget-recommendation-api.js` | `_budget()` | AUDITED | No independent finding | Satu titik akses ke `FinanceIntelligence.budgetSummary()`, guard `typeof`+`{ok:false}` diteruskan apa adanya |
| `modules/finance/budget-recommendation-api.js` | `_classify()` | AUDITED | False Positive | `docs/BUG_REGISTRY.md` §0b — pembagian `pct` tanpa guard `limit<=0` terlihat rawan tapi aman (pct sudah final dari hulu) |
| `modules/finance/budget-recommendation-api.js` | `spendingAnalysis()` | AUDITED | **Bug — FIXED (v997/S333)** + False Positive | **BUG-014** (`docs/BUG_REGISTRY.md` §0, resolved — `_sortBySeverity()` ditambahkan, `items` sekarang diurutkan prioritas) + False Positive (spread copy, 0 risiko mutasi cache `FinanceIntelligence`) |
| `modules/finance/budget-recommendation-api.js` | `budgetSuggestion()` | AUDITED | **Bug — FIXED (v997/S333, dampak turunan)** | **BUG-014** — `suggestions[0]` sekarang benar2 prioritas tertinggi krn mewarisi `sa.items` yang sudah diurutkan `_sortBySeverity()`, 0 perubahan kode di fungsi ini sendiri |
| `modules/finance/budget-recommendation-api.js` | `budgetInsight()` | AUDITED | No independent finding (dampak turunan BUG-014 tidak berlaku — hanya hitung count per kategori, bukan urutan) | Derivatif murni `spendingAnalysis()`, 3 rule count-based, tidak terpengaruh isu urutan BUG-014 |
| `modules/finance/budget-recommendation-api.js` | `summary()` | AUDITED | No independent finding (Improvement — lihat catatan) | `docs/KNOWN-ISSUES.md` §14 — `spendingAnalysis()` dipanggil 3x per `summary()` |

**Status file:** Seluruh 6 fungsi di `modules/finance/
budget-recommendation-api.js` berstatus **AUDITED (100%)** — tidak ada
fungsi tersisa PENDING AUDIT di file ini. Audit dilakukan LANGSUNG dari
source code (204 baris, baris-per-baris) + trace penuh caller/callee
lintas codebase: `modules/finance/finance-intelligence.js` —
`budgetSummary()` (konfirmasi `items` TIDAK pernah diurutkan, murni
`D.budgets.map()`), `modules/finance/budget-recommendation-presenter.js`
(satu-satunya caller, 100% konsumsi `summary()` — `_overCard()`/
`_underusedCard()`/`_topSuggestionCard()` — TERVERIFIKASI memperlakukan
posisi array/`.find()` pertama seolah sudah terurut prioritas, sumber
BUG-014), `modules/finance/financial-goal-api.js` &
`modules/finance/investment-planner-api.js` (2 komentar referensi,
TIDAK memanggil `BudgetRecommendationAPI` secara langsung — murni
catatan dokumentasi lintas-file, dikonfirmasi lewat `grep`),
`budget.js` (baris 104, pembanding pola `_pct`/`_sisa` yang sudah ada,
TERVERIFIKASI konsisten dgn kontrak `budgetSummary()`), `tests/
finance-nav-consistency-s254b.test.js` (satu-satunya test yang
menyentuh domain ini, me-mock `BudgetRecommendationAPI` di level
presenter — 0 test unit langsung utk 6 fungsi file ini sendiri).
**1 bug baru ditemukan (BUG-014)** — `spendingAnalysis()`/
`budgetSuggestion()` tidak mengurutkan hasil berdasarkan prioritas
(over/near/underused) atau nominal, padahal presenter mengonsumsi
posisi pertama array sbg "Rekomendasi Utama"/"Terbesar". **Diperbaiki
Sesi 333 (v997)** — `_CATEGORY_PRIORITY`/`_sortBySeverity()` ditambahkan
di `spendingAnalysis()`, `budgetSuggestion()` tidak perlu diubah (ikut
mewarisi urutan baru), 7 regression test baru
(`tests/budget-recommendation-severity-sort-s333.test.js`), suite penuh
2074/2074 pass — lihat `docs/BUG_REGISTRY.md` § 0 (Resolved) &
`FIX-v997-s333-budget-reco-priority-sort.md`. 2 false positive baru
(guard `pct` division aman krn sudah final dari hulu; spread copy aman
dari risiko mutasi cache), 1 design decision baru (ambang klasifikasi
0.8/0.4 & `suggestedLimit` hanya utk kategori `over`, sudah
didokumentasikan eksplisit di komentar file), 1 improvement (`summary()`
memanggil `spendingAnalysis()` 3x secara tidak langsung, MASIH OPEN — 0
test unit langsung digenapi sesi ini lewat regression test BUG-014,
tapi cakupan `_budget()`/`_classify()`/`budgetInsight()`/`summary()`
langsung masih 0) — lihat `docs/KNOWN-ISSUES.md` §14 dan `TODO.md` §
"Finance/BudgetRecommendationAPI — dari Sesi Audit
budget-recommendation-api.js".
