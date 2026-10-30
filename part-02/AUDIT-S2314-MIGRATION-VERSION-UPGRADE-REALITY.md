# S2314 — Migration & Version Upgrade Reality Audit

## Status
**OPEN / EVIDENCE GAP — no production change**

## Scope
Audit the application's ability to survive version/schema upgrades and backup
compatibility without inventing a migration path that is not present.

## Verified repository evidence

### 1. Backup/restore is an explicit recovery path
The application exposes:
- local JSON Backup / Import-Restore;
- Google Drive backup/restore;
- Google Sheets synchronization as a separate data transport.

Google Drive documentation explicitly describes the backup as a JSON file intended
to survive local browser-cache deletion.

### 2. First-run and persistent state are real application concerns
`index.html` contains a first-run onboarding flow and the source explicitly states
that `init()` decides whether onboarding must be shown for a user who has never
completed setup.

### 3. Existing version-integrity machinery exists
The project has version/build integrity gates and a canonical build-version source.
The historical S2302 audit records a real version-drift blocker (2210 vs canonical
2211) and stale Bundle-B freshness. Therefore version synchronization is a known
release invariant, not something this audit should bypass.

### 4. Backup compatibility was previously tested at the test-contract level
The prior S2311 record claimed coverage for older/newer backup compatibility,
malformed backup rejection, and integrity verification. However, that S2311
artifact was not independently re-executed in this session. It is therefore
treated as historical evidence, not fresh S2314 execution evidence.

## Migration finding

No independently verified, comprehensive **schema migration registry / ordered
migration runner** was found from the evidence retrieved for this audit.

That does NOT prove that no migration logic exists anywhere in the repository.
It means the current evidence is insufficient to declare a formal migration chain
closed.

This distinction matters because:
- backup compatibility is not identical to in-place application migration;
- version/build synchronization is not identical to schema migration;
- accepting an older JSON backup is not proof that every historical localStorage
  state upgrades safely in-place.

## Required reality test before closing S2314

A real upgrade matrix should cover:

| Case | Required result |
|---|---|
| current state → current build | data unchanged |
| previous supported state → current build | loads without loss |
| old backup → current build | explicit compatibility behavior |
| current backup → current build | round-trip identical |
| newer backup → older build | explicit rejection/confirmation, never silent corruption |
| malformed backup | rejected safely |
| unknown fields | preserved or explicitly discarded by documented contract |
| missing optional fields | defaults applied safely |
| duplicate IDs | rejected/reconciled, never silently duplicated |
| interrupted restore | previous state remains recoverable |

## Important separation

S2314 must not be closed merely because S2311's historical backup tests passed.
Those tests address backup/restore behavior; this audit is specifically about the
upgrade boundary between application versions and persisted data.

## Production delta

- Production: **0**
- Schema: **0**
- Persistence: **0**
- UI: **0**
- Service worker: **0**
- Tests: **0**
- Audit documentation: **1**

## Verdict

**S2314 = OPEN / EVIDENCE GAP.**

No defect is asserted from this audit alone. The correct next step is to locate and
execute the actual migration/version-compatibility contracts (if they exist), then
run the upgrade matrix. If no formal migration contract exists, that absence should
be recorded explicitly before any implementation decision.

Do not add migration code merely to make this audit PASS.
