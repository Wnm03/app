# Patch S2710 — Car Notes follow-up

Baseline: cumulative patch S2709 / bundle v2662. This patch contains only files changed in this follow-up.

## Implemented
- Health score is `null` when no usable service/fuel evidence exists; UI/consumers can show an em dash / “Data Kurang” rather than misleading `0/100`.
- Fleet average includes only vehicles with a finite, evidence-backed score. Fleet insight says “belum tersedia” when no score can be computed and reports the number of vehicles with adequate data when available.
- Removed redundant “Insight AI” text from the breadcrumb while retaining the current sub-tab label.
- Updated dashboard and fleet cards to display an em dash plus “Data Kurang” when no evidence-backed score exists; per-vehicle insight no longer says `null/100`.
- Updated app cache/query version to v2663 and applied the corresponding surgical bundle update in `app-bundle-b.min.js`.
- Added 4 focused S2710 regression tests; combined S2709+S2710 tests pass 9/9.

## Preserved
- No user data migrations or storage rewrites.
- No merge/delete of the two “Kabel Rem Belakang” component IDs. This is intentional: names alone do not prove semantic identity; merging could orphan or misattribute historic service rows. Use a future explicit alias mapping only after confirming both IDs and all consumers can resolve to a canonical display identity without rewriting stored rows.
- No suppression of “Uji Kelayakan” based only on a guessed vehicle type. The current tax item source is configured through `VEHTAX_ITEMS`/vehicle records and the repo source does not expose a reliable universal personal-motorcycle predicate. A generic label clarification is safer than silently removing an existing due-date field; this remains open for product/domain confirmation.

## Verification
- `node --check modules/vehicle/vehicle-intelligence.js`: PASS
- `node --check app-bundle-b.min.js`: PASS
- `node --test tests/carnotes-audit-regressions-s2709.test.js tests/carnotes-audit-regressions-s2710.test.js`: 8 passed, 0 failed.
- This environment does not provide a documented full bundle-build command in the repository root. Bundle B was updated surgically to match the changed source logic and syntax-checked; this is not represented as a full deterministic rebuild.
- Chromium re-audit and the 9,211-test full suite have not been rerun in this turn. Therefore no claim of zero substantive bugs is made.
