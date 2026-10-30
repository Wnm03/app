S1764 — Persistence/Backup History Consistency Audit

FIXES
- Fixed backup history persistence ordering in modules/shared/backup-restore.js.
- Local export now records BackupHistoryAPI entry BEFORE save().
- Full backup now records final success/partial/failed history BEFORE save(), including when the local file path fails but another backup target succeeds.
- Custom backup now records history BEFORE save().
- Custom backup payload now carries lastBackup and backupHistory metadata so this backup path does not silently omit backup-state metadata.
- Added tests/backup-history-persistence-order-1764.test.js covering all three paths.
- Kept S1763 runtime lifecycle fixes and S1761 retired Theme Pro deletions cumulative.
- Rebuilt release/cache version to 1761 and regenerated bundles/docs.

VALIDATION
- Targeted regression: 22/22 PASS.
- Bundle freshness: PASS (both bundles fresh).
- window-expose: 82/82 PASS.
- Car Notes performance: PASS.
- Car Notes integrity: PASS (scanned=341, forbidden=0, duplicateIds=0/0, ServisDeclarations=1).
- JS source >1600 lines: 0.
- backup-restore.js node --check: PASS.
- Build: PASS; esbuild unavailable, therefore bundles are valid but not minified.
- Full suite was not rerun to final aggregate in this session; prior environment behavior can time out due lingering test-runner handles. Targeted gates above are green.
