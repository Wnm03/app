# S2287 — DEPLOY DATA CONTINUITY SENTINEL

## Purpose
Prevent a deployment/migration regression from silently persisting an empty or partial dataset after a build transition.

## Guarded collections
transactions, vehicles, accounts, servisLogs, partsStock, bbmLogs, kmLogs, jalanLogs, archiveHistory.

## Rule
Only when persisted runtime metadata shows a build transition: if a critical collection had >0 records on the previous build and is 0 on the new build, startup enters persistence recovery mode before the runtime metadata is replaced and before normal writes can continue.

## Non-regression rule
Same-build boots are not blocked by ordinary user edits/deletions.

## High-water protection
The continuity baseline is persisted separately and monotonically: counts can only increase. A bad release that boots with empty state cannot overwrite the prior non-zero baseline with zeros.

## Release procedure
1. Build from the complete baseline repository, not from the fix-only ZIP.
2. Run the deploy-data-continuity gate after the build, not only before it.
3. Verify HTML/SW cache version and both production bundles are fresh.
4. Upgrade an existing profile containing real records.
5. Reload twice and background/foreground once.
6. Confirm critical record counts and key balances remain unchanged.
7. Only then publish the artifact.

## Limitation
A same-origin browser storage wipe cannot be reconstructed by client code. The application therefore must preserve/export backup and must not auto-initialize a missing existing dataset. Cross-origin deployment remains a separate operational risk that must be prevented by keeping the same origin or explicitly migrating data.
