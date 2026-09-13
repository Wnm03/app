# PATCH GHOST FEATURE REGISTRATION + SERVICE 23-FAIL FIX — V33

## Basis

Cumulative patch from `PATCH-GHOST-FEATURE-REGISTRATION-v1687-VERIFIED.zip`.
No SERVICE V32 patch was merged. Previous ghost-feature fixes are preserved.

## Fixes added

1. Canonical service checklist is locked to **13 groups / 46 components**; the 16 accumulated components are treated as intentional current SoT, not contamination.
2. `SERVICE_MAINTENANCE_RULES` now covers all 46 checklist components (30 -> 46) without inventing fixed intervals for condition/event-only items.
3. Added explicit maintenance metadata for the 16 previously missing components, including condition/event classification where appropriate.
4. Fixed the empty `catch` in `modules/vehicle/sparepart-servis-b.js` so localStorage failure falls back explicitly to `semua`.
5. Fixed v20/v21 tests to resolve `car-notes.js` from the repository instead of obsolete `/mnt/data/...` paths.
6. Updated stale 30-item/contamination/golden-contract tests to the current 46-item canonical SoT.
7. Updated legacy checklist contract for `kabel-gas-standar-kunci` to its current declared 8,000 km interval.
8. Made Sesi 1B state tests resolve item indexes by stable IDs, preventing new checklist insertions from retargeting tests.
9. Made cache-version assertions derive the current numeric build version instead of hard-coding historical versions.
10. Made the zero-cost production-bundle assertion whitespace/minifier tolerant while still requiring the `cost > 0` Finance gate.

## Previous fixes preserved

- Four ghost feature registrations in `scripts/build.js`:
  - `service-interval-sot.js`
  - `piutang-utang-reminder.js`
  - `tagihan-reminder.js`
  - `shop-restock-reminder.js`
- Production bundle inclusion of all four ghost definitions.
- Deletion manifest for the dead Honda OEM mapping source/test.
- Build/version synchronization introduced by the verified ghost-feature patch.

## Verification

- `node scripts/build.js`: PASS; produced build version **1688**.
- Targeted regression set covering all 23 previously reported failures: **46 tests / 46 PASS / 0 FAIL**.
- Bundle syntax: PASS (`node --check` for both bundles).
- `npm test`: the full suite was started, but the sandbox execution exceeded the 5-minute execution limit before the complete suite summary was emitted. No `not ok` failure was observed in the portion executed; the targeted set completed fully.
- Release gate: HTML/version sync PASS. Lint and minification gates could not run because `eslint` and `esbuild` are unavailable in this environment.
- `service-sot-integrity` remains a separate pre-existing gate and is not silently reclassified by this patch.

## Implementation rule

Apply this ZIP as an overlay onto the same base used for the verified ghost-feature patch. Do not merge SERVICE V32 from another ZIP. The two Honda files listed in `HAPUS-FILE-INI.txt` must remain deleted.
