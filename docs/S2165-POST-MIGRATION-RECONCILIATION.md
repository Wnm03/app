# S2165 — Post-Migration Reconciliation & Duplicate Identity Gate

Read-only reconciliation gate after S2164. It verifies canonical service identity, duplicate canonical targets, vehicle isolation, reminder/history references, and optional active-vehicle leakage.

Principle: existing service history remains the fact SOT; reminders remain plan/configuration; taxonomy remains canonical identity. This stage does not create or mutate a fact store.

PASS criteria: zero canonical mismatches, zero unresolved structured identities, zero duplicate `(vehicleId, masterCategoryId, serviceComponentId)` identities, zero duplicate reminder targets, zero target vehicle conflicts, valid reminder references, and zero active-vehicle leakage when an active vehicle is supplied.
