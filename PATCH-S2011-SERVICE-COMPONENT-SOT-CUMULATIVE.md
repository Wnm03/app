# S2011 — Service Component Single-Source-of-Truth Refactor

## Scope
Cumulative continuation of S2009/S2010. The service edit form now treats the component checklist as the only writable source for component-level service data.

## Session-level data retained
- Date
- Service job type (one per session)
- Odometer / KM
- Session note
- Payment account

## Component-level data moved into checklist cards
- Service category/component identity
- Action
- Inspection result
- Condition note
- Component cost breakdown
- Stock sparepart + quantity
- Catalog part references
- Component photos
- Component reminder interval override

## Data integrity
- Checklist payload is the writable SoT for component data.
- Legacy hidden fields remain only as compatibility state for old records/tests; they are not presented as a second input surface.
- Legacy service rows can be normalized back into checklist state when a canonical component can be resolved.
- Multi-row sessions are loaded as one combined checklist for editing.
- Save preserves one finance transaction on the primary session row and component-level stock/catalog linkage per component.
- Session totals are derived from component costs.
- Reminder tab is a read-only summary of component reminders.

## UI wiring
All new component controls are wired to explicit handlers for stock, quantity, catalog picker, photos, interval override, condition/action, cost, identity and save.

## Compatibility
Existing catalog-id stock matching and legacy name fallback remain intact. Existing lifecycle, finance, zero-cost and catalog snapshot paths remain covered by regression tests.

## Validation
- Node syntax checks pass for modified source files.
- Component SoT state round-trip test passes (cost, stock, photo, interval).
- Service regression suite used for this patch: 28/28 targeted tests passed after final build.
- Production build completed as `s1956-service-history-audit-package-2002` and both bundles passed `node --check`.

## Build limitation
`esbuild` is not installed in the current environment, so generated bundles are valid but not minified. The build tool itself reports this explicitly; no source or runtime error was introduced by that condition.
