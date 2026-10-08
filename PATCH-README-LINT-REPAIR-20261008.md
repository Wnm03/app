# PATCH V6 — ESLint 9 Global/Lint Repair

Cumulative repair for the release-gate lint failure.

## Changes
- `eslint.config.js`: set `no-redeclare` to `{ builtinGlobals: false }`. This preserves real same-scope redeclaration detection while preventing ESLint 9's built-in-global behavior from rejecting the project's intentional browser-script global architecture.
- `scripts/collect-app-globals.js`: add a conservative column-1 function-declaration fallback so top-level functions containing template literals are still exported to the generated cross-file global map. This fixes the `chatActionInnerHTML is not defined` false negative without disabling `no-undef`.

## Deliberately unchanged
- No UI/source runtime behavior changes.
- No `verify-release-ready.js` bypass.
- No lint override.
- No bundle files changed; this patch changes lint configuration/analysis only, so bundle-freshness remains unaffected.
