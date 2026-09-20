# S1876 — Duplicate Data Regression

Changes accumulated from S1875:

- Added content fingerprint dedupe to JSON BBM import, while retaining ID dedupe.
- Existing service JSON content dedupe remains active.
- Added regression fixtures for service-like records with different IDs/keys.

Safety constraints:

- No backup records are deleted or rewritten.
- Same date/amount records remain distinct when another identity field differs.
- Full production build and browser integration tests must be run before release.
