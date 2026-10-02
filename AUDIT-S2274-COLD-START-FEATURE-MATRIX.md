# S2274 — Cold-Start Feature Matrix

## Scope

Verify every current lazy feature from a fresh VM context where no feature
script has previously been demanded. The matrix checks complete dependency
order, concurrent promise deduplication, retry after a failed script load, and
Vehicle Catalog dependency ordering for Honda PDF / Shop PDF.

## Covered lazy features

- Vehicle Catalog / Scanner
- Honda PDF import
- Data Health
- Laporan Export
- Shop PDF import UI

## Boundary

This is a deterministic Node/VM cold-start simulation. It is not a browser
rendering or real Service Worker/cache test. Browser/SW cold-start remains a
separate E2E scope.

## Exit criterion

No lazy feature may rely on a previously opened feature to make its loader
work. Each loader must:

1. load its complete manifest in declared order;
2. deduplicate concurrent calls;
3. reset its cached promise after a load failure so a later call can retry;
4. load prerequisite Vehicle Catalog modules before Honda PDF / Shop PDF.
