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
| Total files | 629 |
| JavaScript | 475 |
| Tests | 181 |
| Markdown | 140 |
| HTML | 3 |
| JSON | 2 |
| CSS | 2 |
| Module families | 12 |

**Important:** Structural inventory is complete for the uploaded ZIP (`kw_release_v992_s331-coverage-per-module.zip`, cross-checked against the patch ZIP). Counts exclude `backups/` (historical snapshots, not live app code) and `node_modules/`/`.git/`. This is **not** a claim that every runtime behavior has already passed QA. These numbers are now auto-checked by `scripts/build.js` (`lintDocsBaselineCountDrift()`, non-fatal warning) — update this table whenever the warning fires and the change is intentional.

_Baseline diperbarui pasca-S331 ("update baseline"): Total files 625→629 (+4, terutama `docs/COVERAGE-PER-MODULE.md` + `scripts/generate-coverage-per-module.js` dari S331, sisanya drift kecil yang belum ke-flag sejak S324), JavaScript 474→475, Markdown 137→140, Module families "13+"→**12** (sekarang dihitung eksak dari isi `modules/*`, bukan lagi perkiraan)._

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

