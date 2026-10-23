# S2716 — Checklist component baseline reconciliation

## Scope
Cumulative patch on top of S2715. This remains a patch-only ZIP; it is not a full release and does not modify the user's backup.

## Finding
The legacy maintenance profile selected component history only when the service-session root contained `serviceComponentId` or `checklistItemId`. Multi-component service sessions can instead store the authoritative component identity and action on an individual `checklist[]` row. In that shape, the session is visible in general history but can be invisible to the reminder baseline resolver, or the generic root action (for example `catat`) can shadow the component action.

The uploaded backup has a 18 October 2026 record for `pelumasan-cvt-grease` at 21,311 km with root action `ganti` and a matching checklist row. That record is valid evidence in this case, but this code change is deliberately general: it also covers multi-component sessions where the root identity/action is missing or generic.

## Change
- `ServiceLegacyMaintenance.history()` now includes a row when the component identity is present on a matching checklist item.
- `latestByAction()` now uses the matching component checklist action before falling back to the session-level action.
- No history is rewritten; no baseline is invented when no valid component action exists.
- Rebuilt production bundles and synchronized cache/version references to 2678.

## Verification
- Focused legacy maintenance + replacement/inspect baseline regression tests: 11/11 pass.
- `npm run verify-bundle`: pass; both bundles are fresh and syntax-checked by the build.
- Production build: pass with required esbuild minification.
- Full suite and actual Android/WebView runtime were not completed in this patch; do not interpret this as proof that all CarNotes bugs are eliminated.

## Remaining UI follow-up
The category-chip clipping and floating malformed glyph shown in the screenshots need a separate visual/browser reproduction. This patch does not claim those visual issues are fixed.
