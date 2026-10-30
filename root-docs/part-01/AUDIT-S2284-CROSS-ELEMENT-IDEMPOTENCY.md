# S2284 — Cross-Element Lazy Action Idempotency Matrix

## Scope
Audit whether two distinct DOM elements can trigger the same lazy feature concurrently without corrupting the lazy-loader promise state, while keeping domain-level idempotency responsibility in the existing SOT/domain layer.

## Result
10/10 checks PASS.

The UI dispatcher uses per-element pending/token state. The shared feature loader remains responsible for deduplicating the actual module load. A failure resets the shared loader promise so a later retry remains possible.

This audit does **not** claim that arbitrary domain operations are idempotent. Different elements may legitimately invoke the same resolved function; duplicate side-effect prevention remains a domain/SOT contract and must be audited separately where applicable.

## Boundary
Deterministic Node/VM-style contract simulation and static source assertions. No browser/device E2E or real concurrent network execution.
