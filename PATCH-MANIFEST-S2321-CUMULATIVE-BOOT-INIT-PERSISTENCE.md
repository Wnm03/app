# PATCH S2321 — CUMULATIVE BOOT INIT + DATA PERSISTENCE PROTECTION

Base: `app-main (5).zip`
Previous cumulative: S2320
Release/cache: `s2041-1-part-sot-hardening-2213` / `kw-cache-v2213`

## Included
- S2320 persistence recovery protection retained.
- S2321 fixes production bootstrap calling lazy `init()`.
- Production bundle A/B rebuilt from the current `scripts/build.js` source lists.
- Cache/query version bumped 2212 -> 2213.
- Regression tests for both S2320 and S2321.

## Root cause
`scripts/build.js` intentionally keeps `self-test.js` lazy, while `app-bootstrap.js` still called `init()` from that lazy module. Production runtime therefore raised `ReferenceError: init is not defined`.

## Verification
Bundle freshness PASS; persistence gate PASS; PWA gate PASS; window-expose PASS; selected regression suite PASS.
