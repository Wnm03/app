# S2296 — Cross-Domain Duplicate Side-Effect Ledger

## Scope
Trace the durable operation identity from Service/Finance into Stock and verify duplicate replay is a no-op at the mutation boundary.

## Finding
`StockCommandSOT.applyPurchase()` checked `priceHistory` for an existing `txId` only after incrementing quantity. A duplicate replay therefore incremented stock twice while avoiding a second history row. `revertPurchase()` similarly decremented quantity before determining whether the purchase history entry still existed, allowing repeated revert delivery to subtract stock again.

## Fix
`applyPurchase()` now checks the transaction identity before mutation and returns `alreadyApplied` without changing quantity/history on duplicate delivery. `revertPurchase()` now checks the transaction identity before quantity mutation and returns `alreadyReverted` when the purchase history is already absent.

## Identity chain
- Service: `idempotencyKey` / `txLinkId`
- Finance: transaction `id`
- Stock: `priceHistory[].txId` / `txRefs`
- Event replay: `eventId`

## Verification
Deterministic Node/VM failure-replay simulation: **6/6 PASS**.

This is not a browser/device power-loss E2E test.
