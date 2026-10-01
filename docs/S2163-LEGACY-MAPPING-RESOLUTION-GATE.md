# S2163 — Legacy Mapping Resolution Gate

Purpose: make ambiguous legacy service labels explicit without guessing.

Rules:
- `reviewed=true` is the only mapping eligible for future controlled migration.
- `candidate` remains non-authoritative and cannot mutate service history.
- `blocked` remains untouched until a human/domain review establishes a unique canonical target.
- Every reviewed mapping must resolve to an existing canonical component and matching category.
- No new fact store is introduced.
- This gate does not mutate `D.servisLogs`.

Current registry: 16 labels: 3 reviewed, 3 candidates, 10 blocked.

Reviewed mappings:
- Slidepiece -> slide-piece-cvt / servis-cvt
- Grease Cvt -> pelumasan-cvt-grease / servis-cvt
- Grmuk cvt -> pelumasan-cvt-grease / servis-cvt

The remaining entries are deliberately not auto-migrated because the current canonical master does not provide a unique target or the legacy text describes an operation/labor rather than a component identity.
