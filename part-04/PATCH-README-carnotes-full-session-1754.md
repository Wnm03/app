# Car Notes cumulative full-session patch — baseline app-main (18)

Includes prior cumulative rollback/hardening plus deterministic full-test and performance hardening.

- Deterministic 8-shard runner: `scripts/run-full-test.js`, npm `test:full`.
- Car Notes performance guard: `scripts/verify-carnotes-performance.js`, npm `audit:carnotes-performance`.
- Removed obsolete Theme Pro/Pro mockup tests from active `tests/*.test.js`; retained Classic boot regression coverage.
- Explicit deletion manifest: `DELETE-FILES.txt`.

Verification: **6811/6811 PASS, 0 FAIL** across 8 shards. Car Notes critical **10/10 PASS**. Car Notes integrity PASS; performance PASS; JS syntax **1188/1188 PASS**; bundle freshness PASS; window expose PASS; HTML/SW version sync PASS. `self-test.js` is 2701 lines (warning only; hard cap 2750).

Environment limitation: eslint/esbuild unavailable in sandbox and npm install could not complete, so fresh minified production build is not claimed. Existing bundles passed syntax/freshness checks.
