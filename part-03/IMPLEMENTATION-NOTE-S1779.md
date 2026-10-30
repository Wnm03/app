# S1779 — Test Runner Checkpoint Manifest Hardening

## Finding
S1777/S1778 checkpoint reuse validated individual test-file hashes and shard membership, but did not bind a checkpoint to a checkpoint schema/manifest fingerprint or verify that recorded pass count equaled the test count.

## Changes
- Added `CHECKPOINT_SCHEMA=2`.
- Added SHA-256 `manifestFingerprint` covering schema, shard count, ordered test list, all test-file hashes, and timeout.
- Checkpoint reuse now requires matching schema + manifest fingerprint + non-empty complete pass accounting + zero fail/cancelled + matching shard files/hashes.
- Newly written checkpoints persist schema and manifest fingerprint.
- Extended S1777 regression test to protect the new contract.

## Verification
- `node --check scripts/run-full-test.js` — PASS
- S1777 checkpoint integrity + S1778 serial recovery + S1779 hardening: **4/4 PASS**

No application runtime behavior changed; this is test-infrastructure hardening only.
