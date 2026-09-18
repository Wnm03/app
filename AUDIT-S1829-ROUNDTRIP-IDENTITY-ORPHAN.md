# S1829 — Round-trip Identity & Orphan Audit

## Finding

The Car Notes JSON import path had an identity bug for `bbmLogs`:

1. It checked whether the imported BBM `id` already existed.
2. It then discarded that same source `id` and stored a fresh `uid()`.
3. Therefore a repeated import of the same JSON could not be recognized by ID and could duplicate the BBM record.

Service JSON import already preserved the service `id` and `vehicleId` and also checked `idempotencyKey`.

## Fix

`modules/shared/backup-restore.js` now:

- preserves `bbmLogs[].id` when supplied;
- deduplicates an imported BBM by that source ID before insertion;
- generates a new ID only for legacy BBM rows without an ID;
- preserves the imported `vehicleId`, falling back to the selected vehicle only when absent.

No fuzzy matching, merging, or automatic orphan repair is introduced.

## Round-trip invariant

`Export JSON → Import JSON → Import same JSON again` must not create a second record for an entity that carries a stable source ID.

This audit covers the currently implemented Car Notes JSON path. CSV imports intentionally create new records with deterministic idempotency keys rather than pretending an external row has an application-native identity.
