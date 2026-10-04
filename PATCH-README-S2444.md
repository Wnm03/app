# S2444 — Persisted ID HTML-Attribute Encoding Hardening

Baseline: app-main (53), cumulative through S2443.

## Finding
Residual persisted/state identifiers were interpolated directly into HTML `value`/`id` attributes in UI renderers. These values are persisted data and should not be trusted at an HTML sink.

## Repair
Encode persisted/state IDs with the existing `escapeHtml()` helper before interpolation into HTML attributes. The persisted date displayed by the Refleksi note list is also encoded.

No identifier semantics, storage schema, routing, or business logic were changed.

## Verification
- S2444 regression: 1/1 PASS.
- Changed JavaScript syntax checks: PASS.
- Release/minification dependency blockers from prior sessions remain unchanged.
