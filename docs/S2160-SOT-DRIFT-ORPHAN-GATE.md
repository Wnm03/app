# S2160 — SOT Drift / Orphan Gate

Purpose: keep the S2153-S2159 consolidation from regressing into new local identities, unscoped vehicle reads, or duplicate fact stores.

Guarded invariants:
- taxonomy identity resolves through `ServiceTaxonomySOT`;
- reminder targets resolve through canonical taxonomy identity;
- vehicle-scoped service projections require active vehicle context when no explicit vehicle is supplied;
- reminder projections remain vehicle-scoped and deduplicated;
- legacy compatibility delegates to canonical identity;
- `reminderDue` and `dashboard` remain projections without write authority.

This gate is static architecture protection; it does not replace full runtime regression or production build validation.
