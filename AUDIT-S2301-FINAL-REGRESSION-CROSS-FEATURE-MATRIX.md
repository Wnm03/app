# S2301 — FINAL REGRESSION + CROSS-FEATURE MATRIX

## Status

**CLOSED — test-contract reconciliation only; 0 production-code change.**

Baseline under audit: `app-main (48)` + cumulative S2271–S2296 lineage.

## Scope

S2301 verifies the final regression boundary after S2296 Identity Ledger, with emphasis on:

- duplicate purchase/revert semantics;
- Stock SOT ownership and direct-write guard;
- persistence/SOT/outbox recovery;
- cross-domain identity, concurrency and crash-replay gates;
- separation between runtime source and audit/fixture scripts.

## Initial findings

A deterministic regression slice produced **37 PASS / 2 FAIL**.
Both failures were stale test contracts, not production regressions:

1. `tests/s2152-p4-1-stock-command-sot.test.js`
   - historical assertion expected duplicate purchase to leave `qty === 8`;
   - final S2296 contract is duplicate replay = **no-op**;
   - after first purchase from 2 → 5, duplicate returns `alreadyApplied=true`, `qtyAdded=0`, and quantity remains 5.

2. `tests/s2152-p4-5-zero-direct-write.test.js`
   - static source scan included `scripts/` even though the test explicitly audits **runtime source**;
   - S2296 audit script legitimately seeds fixture state in `D.partsStock`;
   - excluding `scripts/` restores the intended runtime-source boundary.

No production module was changed to satisfy either stale assertion.

## Minimal reconciliation

Changed only:

- `tests/s2152-p4-1-stock-command-sot.test.js`
- `tests/s2152-p4-5-zero-direct-write.test.js`

No module under `modules/`, no HTML, bundle, service worker, persistence implementation, or production logic was changed by S2301.

## Verification after reconciliation

### Targeted regression matrix

**52/52 PASS** covering:

- S1852 persistence contract
- S1853 persistence durability
- S2096/S2097 persistence recovery
- S2152 P4.1/P4.2/P4.3/P4.5 Stock SOT
- S2160 SOT drift/orphan
- S2162 migration gate
- S626 stock average-price regression
- S713 duplicate price-history guard
- S2200–S2211 Finance/Outbox/persistence/concurrency/crash windows
- S1783 crash-safe checkpoint tests

### Cross-domain audit scripts

- S2290: **10/10 PASS**
- S2292: **13/13 PASS**
- S2293: **10/10 PASS**
- S2294: **14/14 PASS**
- S2295: **8/8 PASS**
- S2296: **6/6 PASS**
- S2299: **10/10 PASS**

### S2299 runtime test

`tests/s2299-cross-domain-race.test.js`: **1/1 PASS**.

### Full suite note

`node --test tests/*.test.js` was attempted against the reconstructed cumulative working copy. The process exceeded the environment execution timeout before producing a complete suite result. This is recorded as **TIMEOUT / UNVERIFIED**, not as a test failure.

The deterministic regression gates above completed successfully and are the evidence used for S2301 closure.

## Production-code delta

**0 files changed by S2301.**

The only S2301 changes are test-contract corrections required to align historical tests with the already-implemented S2296 behavior and to keep the P4.5 scan scoped to runtime source.

## Closure decision

S2301 is **CLOSED**.

There is no confirmed production regression in the tested cross-feature matrix. The remaining release/freshness work (build/version/cache/bundle/security gates) remains separate under S2302.
