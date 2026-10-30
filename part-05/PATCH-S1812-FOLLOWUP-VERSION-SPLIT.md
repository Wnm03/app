# S1812 Follow-up — Servis Split Harness + Version Sync

Cumulative follow-up to `S1812-service-maintenance-cumulative-patch.zip`.

## Fixes

1. Test harness compatibility now auto-loads `modules/vehicle/servis-b.js` whenever legacy `servis.js`/Car Notes source loading is requested.
2. `carNotesSource.js` reads the logical Servis source across `servis.js` + `servis-b.js`.
3. Runtime-hardening source contract checks the combined split source, so moved reminder markup remains covered.
4. Generic wiring expectations are synchronized with the intentional canonical brake names: `Kampas Rem Depan` / `Kampas Rem Belakang`.
5. The five release version source locations are synchronized to the current release family. Running the official build bumps the numeric release consistently across source/HTML/SW/bundles.
6. No oversized-file allowlist entry was added; `servis.js` remains below the 1600-line strict source-size gate after the split.

## Validation

- Targeted regression set: PASS.
- Source-size strict gate: PASS.
- Runtime hardening contract: PASS.
- Generic wiring tests: PASS.
- Official build: PASS; generated release synchronized to `s1793-final-hardening-1813` in the validation workspace.
- Full `npm test` was started in the validation workspace but the execution environment timed out before completion; no new failure attributable to these follow-up changes was observed in the completed portion.
