# S2169 — Component-scoped action authority and cumulative verification

## Baseline and scope
- Source baseline: `app-main-S2159-CUMULATIVE-v2574.zip`.
- Previous cumulative release: `app-main-S2168-CUMULATIVE-v2577.zip`.
- New build: `s2033-reset-interval-chain-audit-2578` (`kw-cache-v2578`).
- Actual user backup inspected read-only: `backup-keluarga-W-2026-10-18.json`.
- No user backup/data was modified or embedded into the patch.

## Root cause addressed
Service interval reset decisions were component-scoped in the checklist path, but a legacy top-level `actionType` could still be used as fallback when a matching component row existed without its own action. In a multi-component checklist this is ambiguous: a stale root `ganti` can make a component appear replaced even when its own row did not say so. Duplicate matching rows with conflicting actions were also effectively first-row-wins.

## Implementation
`modules/vehicle/sparepart-servis.js` now applies these shared rules in `matchesActionTypeForReset`:
1. Matching checklist actions for the target component are authoritative.
2. If multiple matching rows disagree on action, the record is ambiguous and cannot reset the interval through this path.
3. If a matching component row has no action and the checklist contains multiple rows, the stale root action is not used as fallback.
4. Single-row legacy records can still fall back to root `actionType` for compatibility.
5. Existing S2168 behavior remains: a matched checklist `periksa` overrides a stale root `ganti`.

## Regression coverage
Added `tests/service-action-authority-s2169.test.js` for (a) missing component action in multi-component checklist with stale root `ganti`, and (b) duplicate matching checklist rows with conflicting actions. Both tests assert no reset action is selected. S2168 provisioning, vehicle-isolation and checklist-override tests remain in place.

## Actual backup audit findings (read-only)
- 5 vehicles, 110 service history rows, 205 global sparepart categories; the S2168 audit also found all 5 vehicles had empty persisted `serviceSchedules` in the snapshot although canonical categories had intervals.
- S2168 audit reported 21 top-level `actionType` conflicts against checklist action vocabulary; 30 `ganti`/`bersih` rows with invalid/missing interval/deadline combinations; 3 history rows referencing another vehicle's category; and 4 `nextDueKm` snapshot inconsistencies. These groups may overlap and are not a count of unique records.
- The S2161 identity reconciliation audit reports 90 clean, 20 unresolved service history rows, 0 deterministic-safe identity changes, and 83 checklist rows clean. Ambiguous rows are deliberately not guessed or auto-mutated.
- No automatic data migration is included in this patch. Data repair for ambiguous identity/interval snapshots requires preview and rollback.

## Verification
- `npm run build`: PASS; generated build v2578, bundle syntax checks pass, HTML versions and service worker cache synchronized.
- `node scripts/verify-bundle-freshness.js`: PASS.
- `node scripts/verify-window-expose.js`: PASS (83 `data-action` modules exposed).
- `node scripts/verify-patch-integrity.js`: PASS (existing release manifest: 87 apply files, 0 deletes).
- Targeted tests after S2169: 16/16 PASS before splitting S2169 cases into their own file; dedicated S2169 + S2168 tests: 5/5 PASS after split. S2005/S2159/S2168 targeted chain was 14/14 PASS before S2169; run it again with S2169 for current 16-test result.
- Full suite rerun via `TEST_SHARDS=32 TEST_CONCURRENCY=8 TEST_SHARD_TIMEOUT_MS=180000 node scripts/run-full-test.js` did not complete within the execution limit in this environment. The previously documented S2168 result (8,924 pass, 0 fail, 1 skipped out of 8,925) is historical and is not claimed as a newly reproduced S2169 full-suite result.

## Safety and limitations
- Backup was only read; no production data mutation was performed.
- The fail-closed behavior may leave an ambiguous record out of reset eligibility until its component-level action is corrected. This is intentional to avoid a false reset from a stale session-level action.
- This change addresses a class of action-authority bugs; it does not resolve the 20 ambiguous identity rows or missing/invalid interval snapshots in the actual backup.
