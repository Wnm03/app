# V10 — cumulative lint/release-gate repair

This patch repairs the lint chain without weakening the hard release gate.

## Changes
- Remove stale root `collect-app-globals.js` through `DELETE-FILES.txt`; canonical collector remains `scripts/collect-app-globals.js`.
- Ignore nested minified bundles (`**/*.min.js`) so generated/minified artifacts are not linted as source.
- Expand deterministic global collection to classic `global/root/globalThis/window/g` exports and legacy same-line top-level declarations.
- Declare only documented browser/external/runtime globals needed by the app (`XLSX`, `Tesseract`, `eruda`, `BroadcastChannel`, `IDBKeyRange`, `TextEncoder`, `TextDecoder`, `Response`, `queueMicrotask`, etc.).
- Keep `no-undef` and `no-redeclare` as errors; no release-gate bypass.
- Fix real source/test lint defects: duplicate interval helpers, duplicate Finance stale-state helper, self-comparison guards, and batch rollback scope.
- Add canonical `VEHICLE_PART_SOT_MODEL_ID='vario-125'` required by the Vario 125 KZR part SOT.

## Validation
Static collector checks were run locally. Full ESLint/CI is not claimed here because dependencies are not installed in the local audit environment. Run `npm run release-check` in CI; do not package a release until it passes.
