# S1777 — Full-test checkpoint integrity

## Finding
The resumable full-test runner reused a PASS checkpoint based on status/tests only. A changed test file with the same filename could therefore reuse stale results.

## Fix
- Added SHA-256 fingerprints for every test file.
- Stored hashes in the runner manifest and each shard checkpoint.
- Reuse now requires exact shard membership and matching file hashes.
- Existing zero-test protection remains active.

## Verification
- `node --check scripts/run-full-test.js` PASS
- S1777 regression PASS
- Fresh 32-shard run: 6822/6822 PASS
- Immediate checkpoint reuse: 6822/6822 PASS
