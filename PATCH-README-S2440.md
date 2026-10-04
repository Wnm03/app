# S2440 — External Script Integrity Governance

- Eruda debug CDN is now pinned to `eruda@3.4.3` in both loaders.
- Google GSI remains an explicit documented exception because its supported client URL is non-versioned.
- ZXing 0.21.3 and PDF.js 3.11.174 remain version-pinned but do not receive guessed SRI hashes. Their SRI closure remains BLOCKED until exact CDN bytes are independently retrieved and verified.
- Added `tests/s2440-external-script-integrity-policy.test.js`.

This patch does not claim full SRI closure.
