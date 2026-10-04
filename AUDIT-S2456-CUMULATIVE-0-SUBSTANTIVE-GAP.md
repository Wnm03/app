# S2456 — Cumulative 0-Substantive-Gap Audit

## Scope
Baseline `app-main (4).zip` + cumulative S2282→S2455 patch.

## Findings
1. Restore category/component SOT: PASS. S2455 repairs canonical cross-vehicle legacy category projections by provisioning a local vehicle-scoped Car Notes projection; unresolved unknown identities remain fail-closed.
2. Persistence/deploy continuity: PASS at source/gate level. Load/save/showMain barriers and continuity high-water checks are present.
3. SOT runtime projection: PASS. Active-vehicle scope, shared canonical identity, duplicate projection collapse, history/reminder projection wiring pass existing gates.
4. Backup/restore regression: PASS after correcting the test harness to expose top-level lexical bindings as live VM accessors. This is test infrastructure only; production source is unchanged by S2456.
5. Real backup static scan: 2 legacy cross-vehicle category references exist in `servisLogs`; both are exactly the class repaired by S2455. No cross-vehicle category reference was found in nested vehicle `sot.serviceIntervals`.

## Release blockers (not substantive logic gaps)
- `eslint` unavailable in environment.
- `esbuild` unavailable; production minified rebuild cannot be certified here.
- Both production bundles are stale until a clean release build.
- `index.html` and `app_production.html` are slightly over the performance budget.
- No lockfile is present, so `npm ci` cannot be used for reproducible dependency installation.

These are release/environment blockers, not a discovered application-data correctness gap.
