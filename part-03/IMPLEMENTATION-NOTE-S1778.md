# S1778 — Full-test runner serial recovery + canonical path hardening

## Finding
The S1777 checkpoint-integrity implementation was present in a root-level `run-full-test.js`, while the canonical project runner is `scripts/run-full-test.js`. This left the canonical entry point without the S1777 hash-bound checkpoint logic. Concurrent shard execution can also produce an empty TAP result under process/resource contention; retrying immediately can repeat the same contention.

## Fix
- Moved the S1777 hash-bound runner implementation into the canonical `scripts/run-full-test.js`.
- Added `emptyTap` classification and a serial recovery retry after concurrent batches have drained.
- Preserved zero-test protection and SHA-256 checkpoint/file membership validation.
- Removed the duplicate root-level `run-full-test.js`.
- Added S1778 regression tests for serial recovery and checkpoint integrity.
- Kept the S1761 retirement deletion manifest cumulative.

## Verification
- `node --check scripts/run-full-test.js` PASS.
- S1777 checkpoint-integrity + S1778 serial-recovery regression: **2/2 PASS**.
- A full 32-shard run was attempted in this sandbox but exceeded the tool execution window during repeated resource-contention recovery; therefore no full-suite PASS is claimed for S1778.
