# S2442 — Residual persisted-data HTML sink hardening

Baseline: app-main (53)
Previous cumulative repair: S2441

## Scope
Hardened residual `innerHTML` sinks that render persisted/state-derived values without HTML encoding.

## Repairs
- Encode persisted bill due-date values before HTML insertion.
- Encode persisted SIM type text and vehicle-tax status/config labels used in HTML.
- Encode grouped bill labels and cash-projection top-obligation names.
- Encode service-history field values before joining them into an HTML audit fragment.

No schema, SOT, persistence, business-logic, or API contract changes.

## Validation
- Production syntax checks: PASS for all changed production files.
- S2439 + S2440 + S2441 + S2442 targeted regression suite: 8/8 PASS.
- No full-suite PASS claimed.
- Production release remains blocked by unavailable dependency/toolchain provisioning and stale Bundle-B freshness until genuine esbuild/minified rebuild is possible.
