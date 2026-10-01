# S2154–S2159 — SOT Consolidation Implementation

## Goal

Make service taxonomy identity, active vehicle context, reminder/history boundaries,
canonical IDs, and legacy compatibility paths converge on the S2153 ownership map
without creating another fact store.

## Implemented

- **S2154 — Service Taxonomy Identity**
  - `ServiceTaxonomySOT.canonicalTarget()` is the canonical target normalizer.
  - `targetKey()` and `assertCanonical()` provide stable identity checks.
  - Reminder targets use the canonical resolver whenever available.
- **S2155 — Active Vehicle Context**
  - Vehicle-scoped reminder projection resolves omitted vehicle context from
    `VehicleScopedSOT.currentId()` and refuses an implicit all-vehicle read.
- **S2156 — Service/Event/History/Reminder boundary**
  - Reminder package remains plan/configuration; service history remains `D.servisLogs`.
  - No new history/reminder fact store is introduced.
- **S2157 — Reminder deduplication**
  - Reminder category projection deduplicates by canonical `serviceComponentId + vehicleId`.
  - Vehicle-specific records win over universal duplicates without deleting persisted legacy data.
- **S2158 — Cross-domain ID/reference**
  - Component/category identity is resolved through canonical `serviceComponentId` and
    `masterCategoryId` before compatibility fallbacks.
- **S2159 — Duplicate helper consolidation**
  - Legacy reminder component resolution now delegates to `ServiceTaxonomySOT` first;
    existing alias/infer logic remains only as a compatibility fallback.

## Safety rules

- `D.sparepartCats` remains a compatibility index; it is not promoted to a competing taxonomy SOT.
- `D.servisLogs` remains the service fact store.
- `D.serviceReminderPackages` remains the reminder plan/configuration store.
- Stock SOT P4.1–P4.8 is untouched.
- Legacy rows are not bulk-deleted by this patch.
- UI layout is unchanged; changes are data-contract/identity/scope focused.

## Validation

- S2154–S2159 focused regression: **4/4 PASS**
- Existing taxonomy/reminder/vehicle-scope regression: **12/12 PASS**
- S2153 map: **6/6 PASS**
- S2153 map tests: **3/3 PASS**
- SOT integrity: **PASS**
- Architecture integrity: **PASS**
- Persistence integrity: **PASS**
- App-wide hardening: **9/9 PASS**
- Full 64-shard regression: **7,980/7,980 PASS**

Production build/release status remains subject to the existing environment dependency limitation
for ESLint/esbuild; a passing test suite is not represented as a release-build PASS.
