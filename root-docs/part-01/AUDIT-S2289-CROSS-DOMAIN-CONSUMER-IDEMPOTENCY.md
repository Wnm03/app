# S2289 — Cross-Domain Consumer Idempotency / Duplicate Recovery

## Finding
A durable outbox already preserves a stable `eventId`, and `AIDecision` already keeps a persisted `processedEventIds` ledger. Static tracing found a concurrency gap at the consumer boundary: two concurrent deliveries of the same event could both pass the persisted-ledger check before either `aiSave()` completed.

## Root cause
The persisted ledger is checked after `aiLoad()`, but it is not an in-flight claim. Concurrent calls can therefore observe the same event as unprocessed.

## Fix
`AIDecision.decide()` now keeps `_eventIdInFlight`, keyed by `eventId`. Concurrent deliveries of the same event share one promise and therefore one domain decision operation. The persisted `processedEventIds` ledger remains the durable second-line defense for later retries after the in-flight promise is gone.

The in-flight map is intentionally scoped to the domain consumer and does not alter UI dispatchers or invent a global application lock.

## Recovery
The map entry is removed in `finally`, so a failed operation does not permanently poison the event key; a later retry can execute again.

## Validation
- S2289 audit: 8/8 PASS.
- Boundary: deterministic Node/source-contract test; no browser/device crash E2E.
