# KNOWN ISSUES / REGRESSION REGISTRY — S1942

## Active application bugs
**None identified by the S1942 document reconciliation audit.**

## Known limitations
1. Asset-unlink history does not automatically reset an account's existing `baseBalance`/`ownership`; intentional per Owner Resolver design lock.

## Environment / verification limitations
1. Browser/device visual smoke is not executable in the previous sandbox environment.
2. `eslint`/`esbuild` availability is environment-dependent; explicit override is not equivalent to a minified production build.
3. Full-suite timeout in a resource-limited sandbox is not evidence of a test failure.

## Backlog, not bugs
1. Per-route review of legacy non-modal transaction CREATE paths.
2. Vehicle/Master Database roadmap reconciliation where historical docs still say TODO.
3. Future Car Notes performance optimization only with browser profiling evidence.

## Closed regressions
- Owner Resolver Audit-8: closed.
- Owner Resolver Audit-9 badge source mismatch: closed by resolver-first lookup; S1942 regression proof added.
- Owner Resolver Audit-10: closed.
- Owner Resolver Audit-11: closed.

See `docs/PROJECT-STATUS-REGISTRY.md` for authoritative classification.
