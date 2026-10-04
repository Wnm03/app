# S2441 — HTML-encoding residual persisted emoji sinks

Baseline: app-main (53)
Previous cumulative repair: S2440

## Finding
Several renderers still interpolated persisted/user-controlled `emoji` values directly into HTML. The values are presentation data but are persisted state, so they must not bypass the shared HTML encoder when inserted into `innerHTML`.

## Repair
HTML-encode the affected emoji values in transaction, account, category, vehicle, target, and select-option renderers. No business logic, schema, persistence, SOT, or navigation behavior was changed.

## Validation
- `node --check`: PASS for all 9 changed production JS files.
- S2439 + S2440 + S2441 targeted regression tests: 7/7 PASS.
- Full `npm test`: NOT RUN / not claimed because canonical environment still lacks installed `esbuild`/`eslint` and dependency lockfile.
- Production Bundle-B rebuild: NOT RUN; exact production minification remains blocked on dependency provisioning.

## Packaging
This ZIP is cumulative from pristine app-main (53), contains only changed/new files, and is intended to replay over the pristine baseline.
