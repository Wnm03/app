# S2387 — Reuse vehicle-scoped service-history rows during render

## Temuan
`Servis.renderEditHistoryTab()` independently filtered the full `D.servisLogs` array to create session options, component options, and the displayed history. On vehicles with long service histories, these passes repeatedly checked records belonging to other vehicles.

## Perubahan
- Create one local `vehicleLogs` view at the start of history rendering.
- Build session options, component option source rows, and displayed history from that vehicle-scoped view.
- Preserve session filtering for component options and history rows, plus existing sort order, canonical component resolvers, and persisted source data.
- Keep the view local to one render; no global cache or persisted schema changes.

## Validation scope
Source-level regression tests check that all three consumers reuse the vehicle-scoped view and that the renderer does not mutate `D.servisLogs`. Focused tests and bundle checks are required before considering the patch complete. Full-suite/release-gate status must be reported separately.
