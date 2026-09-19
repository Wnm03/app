# S1860 — Hardening Follow-up, One-Stage Cumulative

## Implemented

- Atomic build wrapper with rollback on non-zero build exit.
- Patch manifest integrity gate for apply/delete completeness.
- Fail-safe version preflight already retained in `build-core.js`.
- CPU-aware full-test fallback already retained in `run-full-test.js`.
- Brittle source-test audit retained and expanded as an advisory scanner.
- Duplicate/dead-code symbol scan added.
- Runtime I/O/render/save hotspot scan added.
- Event-listener registration scan added.
- Car Notes scalability proxy added.
- Explicit-version reproducible-build gate added.
- Patch contamination gate added.
- All new gates covered by `tests/s1860-tooling-hardening.test.js`.

## Validation in merged S1860 tree

- Atomic build with explicit version `1823`: PASS.
- Bundle syntax checks: PASS.
- Patch integrity: PASS — 53 apply files / 2 delete entries.
- Patch contamination: PASS.
- New hardening tests: 8/8 PASS.
- Existing S1860 profiling tests: 3/3 PASS.
- Full direct suite started successfully and reached >4,200 tests before the sandbox execution timeout; no final aggregate PASS claim is made from that timed-out run.

## Findings that remain advisory

The duplicate-symbol scan reports repeated names across intentionally duplicated feature/module trees; it is a review list, not an automatic deletion rule.

The runtime I/O scan reports 94 storage sites, 198 JSON parse/stringify sites, 11 service-list render call sites, 16 reminder render call sites, and 222 `save()` textual sites across its scanned roots. These counts are inventory signals, not proof of a performance defect.

The scalability scan reports source-level proxies for the four Car Notes/service hot-path files. Browser wall-clock profiling remains the authoritative measurement for real-device performance budgets.
