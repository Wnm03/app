# A-S2183 — Ownership Canonical Writer

## Scope

Consolidate the mutable `owners[]` identity boundary used by Asset and Investment without changing persisted schema, UI, or performing bulk migration.

## Canonical contract

`OwnershipCanonicalWriter` is now the shared write-boundary normalizer:

- `SELF` remains universal and is never created in `D.ownerRegistry`.
- New non-SELF owners resolve through `OwnerRegistry.findOrCreate()`.
- Existing registered owner IDs are preserved.
- Legacy/unregistered IDs encountered on an explicit ownership save are remapped by owner name to the canonical registry ID.
- Canonical duplicate IDs are rejected before the domain object is committed.
- Domain storage remains unchanged: `Aset` owns `D.assets[].owners[]`; `Investment` owns `D.investments[].owners[]`.
- Existing debt/settlement references are remapped only when their owning domain row is explicitly saved.

## Integration

- `Aset.saveOwners()` delegates owner normalization to `OwnershipCanonicalWriter` when available.
- `Investment.setOwners()` delegates owner normalization to `OwnershipCanonicalWriter` when available.
- `MultiOwnerEngine` remains the validation/normalization engine underneath; no second ownership schema is introduced.
- Legacy fallback remains in place for isolated test/runtime contexts where the canonical writer is not loaded.

## Safety boundary

No UI changes. No destructive migration. No legacy row deletion. No schema changes to `owners[]`, `D.assets`, or `D.investments`.

## Verification

Focused S2183 tests: 10/10 PASS.

The full repository suite and full ESLint remain subject to the existing environment timeout limitation; this checkpoint does not claim those gates as PASS.
