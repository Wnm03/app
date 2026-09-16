# S1780-S1782 V3 — final hardening follow-up

Implemented in one batch:

- Test runner: removed `--test-force-exit` so child tests cannot be silently discarded.
- Test runner: checkpoint/manifest writes are atomic with per-process unique temp names.
- Test runner: final aggregation independently validates schema, manifest fingerprint, shard membership, file hashes, PASS counts, failures and cancellations.
- Test runner: single-shard mode validates the same integrity contract before returning PASS.
- Test runner: default concurrency follows `os.availableParallelism()` (capped at 8), while `TEST_CONCURRENCY` remains an explicit override.
- Added sharding hardening contract tests.
- DELETE-FILES is an executable release gate; retired paths must be physically removed before release.
- Fixed the S1780 delete-manifest test's empty catch so it satisfies the existing empty-catch gate.
- Reduced `modules/vehicle/servis.js` below the strict 1600-line source-size threshold without changing runtime logic.
- Rebuilt bundles/HTML/SW so bundle hashes and version markers are fresh after source changes.

Existing S1780-S1782 backlog work remains cumulative from the preceding patch, including the Riwayat Servis photo lightbox, masterCategory filtering, Investment/Aset event wiring audit, and version-bump gate.

## Verification

PASS: syntax checks for modified JS gate/runner files.
PASS: DELETE-MANIFEST gate (18 retired paths absent).
PASS: strict source-size gate.
PASS: bundle freshness gate.
PASS: targeted hardening/backlog regression: 22/22.
PASS: service-sot-integrity-gate when run independently.

Environment limitation: the sandbox does not provide eslint/esbuild, so minification and real lint execution remain environment-dependent. A 32-shard run with forced high concurrency reproduced empty-TAP contention in this 1-core sandbox; direct execution of affected shards passes. The runner now defaults concurrency to available parallelism and does not use force-exit. A representative multi-core dev/CI run should be used as the release concurrency validation.
