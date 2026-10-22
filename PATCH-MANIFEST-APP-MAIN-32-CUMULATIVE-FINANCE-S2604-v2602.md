# Manifest kumulatif S2604 — Finance allocation guard

- Baseline: `app-main (32).zip`
- Baseline SHA-256: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`
- Parent patch: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2603-v2602.zip`
- Source production, bundle, SOT, OwnershipEngine, schema, and persistence: unchanged in S2604.
- Added: `tests/s2604-finance-allocation-reconciliation-guard.test.js`
- Added: `AUDIT-S2604-REKONSILIASI-GUARD-APP-MAIN-32.md`
- No deletions; `DELETE-FILES.txt` not required.

## Validation
- Selected tests: 114 passed, 0 failed, 0 skipped.
- UI gate, SOT integrity, bundle freshness, contamination, performance budget, and architecture gate passed.
- Full-suite runner timed out before producing a final summary; full-suite status is unverified and is not claimed as passing.

## SHA-256
- Parent patch SHA-256: `78329171773573d4cdcae11bb476b5abcb2afb731902d4fe9d2b21cd9957bf6a`
tests/s2604-finance-allocation-reconciliation-guard.test.js — `a3178cad19ac5bd8b5d3f1cb4a436058777df5cbd69627bb9ceb0f73c4fd3fdb`
AUDIT-S2604-REKONSILIASI-GUARD-APP-MAIN-32.md — `32899bb79dc287f9a5b7e7cb7cfb9a3b1c65b81dc11cd3616333792742cc4add`
