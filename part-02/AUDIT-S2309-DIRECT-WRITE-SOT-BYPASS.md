# S2309 — Direct Write / SOT Bypass Sweep

## Status
**CLOSED — targeted production bypasses fixed**

## Baseline
`app-main (49)-S2306-bugfix.zip`

S2308 was audit/guard-only relative to this production baseline, so S2309 uses the S2306 production state as the executable baseline and carries S2308 lineage separately.

## Scope
Audit runtime production JavaScript for direct collection writes that bypass an established mutation SOT/canonical writer, with emphasis on:
- `D.transactions`
- `D.partsStock`
- existing Service SOT / `D.servisLogs`
- Shop canonical writer

No broad legacy deletion or refactor was performed.

## Findings

### F1 — Finance direct-write bypass: `chat-action-handlers.js`
**CONFIRMED.**

Two active paths wrote directly to `D.transactions`:
1. `add_transaksi()`
2. `add_servis()` transaction creation

Both now call `FinanceTxSOT.create(...)`.

### F2 — Finance direct-write bypass: `car-notes.js`
**CONFIRMED.**

The BBM modal had two active transaction-creation branches that wrote directly to `D.transactions`:
1. orphaned BBM transaction recreation
2. normal new BBM transaction creation

Both now call `FinanceTxSOT.create(...)`.

### F3 — Stock SOT
**PASS.**

No active production `D.partsStock.push/splice/unshift` bypass was found. Existing P4.5 zero-direct-write gate remains PASS.

### F4 — Service SOT
**REVIEWED / ACCEPTED.**

`D.servisLogs` remains the canonical storage SOT by architecture; `ServiceEventSOT` is the canonical normalization/projection/validation layer, not a second service datastore. Direct writes inside the service domain therefore are not classified as a duplicate datastore bypass. Existing service SOT/lifecycle gates remain PASS.

### F5 — Other FinanceTxSOT callers
**NO NEW UNCONDITIONAL BYPASS.**

Remaining production `D.transactions.push(...)` occurrences outside tests/self-test are compatibility fallbacks of the form:
`if(typeof FinanceTxSOT!=='undefined') FinanceTxSOT.create(...); else D.transactions.push(...)`

They are not active bypasses in the normal production build because `FinanceTxSOT` is loaded by `scripts/build.js` before the affected callers. They were not refactored in this session.

## Production changes

1. `chat-action-handlers.js`
2. `car-notes.js`
3. `app-bundle-a.min.js` — mirrored source-level mutation

Test added:
4. `tests/s2309-direct-write-sot-bypass.test.js`

No schema, persistence shape, UI, service worker, or data-model change.

## Regression evidence

### S2309 targeted contract
- **2/2 PASS**
  - no active direct `D.transactions.push` in the two affected production writers
  - Bundle-A mirrors the SOT mutation

### Combined regression
- **20/20 PASS** — S2305 lexical-D + persistence + architecture-related selected suite
- **23/23 PASS** — S2071 / P4.4 / P4.5 / Shop canonical / Service hardening / Service lifecycle / Stock SOT

Total executed in this session: **45/45 PASS**.

## Remaining release caveat

This session does **not** close the historical S2302 release blocker. Bundle freshness/version synchronization and the unavailable verified minification toolchain remain separate release-gate concerns.

Manual Bundle-A mirroring here is intentionally not claimed as a verified production rebuild.

## Closure

**S2309 CLOSED.**

The two confirmed active Finance SOT bypasses were removed with minimal source-level changes and mirrored into Bundle-A. No additional active Stock SOT bypass was found. Service direct storage writes were reviewed against the established architecture and are retained as canonical storage behavior.
