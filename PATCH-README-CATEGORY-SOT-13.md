# PATCH-CATEGORY-SOT-13 — SERVICE-EVENT-LIFECYCLE-INTEGRITY

Scope: create → update → delete → unlink/reclassify for service events.

SoT remains `D.servisLogs`. New `service.updated` is an event contract, not a second store. Existing `vehicle.updated` is emitted as a backward-compatible bridge. Finance edits that leave the Service domain remove the stale linked service event and restore explicitly linked stock usage. Finance/service delete paths emit lifecycle events.
