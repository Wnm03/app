# AUDIT-S2304 — BASELINE FILESYSTEM HYGIENE

## Scope

Audit-only / housekeeping terhadap `app-main (49)`. Tidak ada perubahan production logic, schema, UI, persistence, API, atau feature behavior.

## Findings

### 1. Root `FILE-MAP.md` — STALE DUPLICATE

- Canonical generator: `scripts/generate-file-map.js`
- Generator output: `docs/FILE-MAP.md`
- `docs/FILE-MAP.md` is current and reports 405 source files.
- Root `FILE-MAP.md` reported an older snapshot of 325 source files.
- No runtime/test dependency on the root copy was found.

Action: **DELETE root `FILE-MAP.md`**.

### 2. `docs/app-bundle-b.min.js` — RETAIN

This file is stale relative to the root runtime bundle, but it is an explicit historical/contract fixture used by persistence/performance regression tests. It is not safe to delete or move in this session.

Action: **RETAIN**.

### 3. `dom.txt` — RETAIN FOR NOW

`dom.txt` is empty, but `FILE-HASHES-SHA256.txt` explicitly tracks its SHA-256.

Action: **RETAIN** until the hash-manifest lifecycle is audited. Deleting it now would create manifest drift.

### 4. Historical audit/patch files

The root contains many historical audit/patch/session artifacts. No mass move/delete was performed because references and lineage must be audited first.

Action: **NO CHANGE**.

## Verification after cleanup

- `verify-patch-integrity.js` — PASS
- `architecture-integrity-gate.js` — PASS
- `persistence-integrity-gate.js` — PASS
- `pwa-recovery-integrity-gate.js` — PASS
- `feature-regression-gate.js` — PASS
- `verify-window-expose.js` — PASS

## Result

S2304 filesystem cleanup is intentionally minimal.

Production logic changes: **0**

Safe deletion: **1 stale duplicate**
- `FILE-MAP.md`

Retained candidates:
- `dom.txt`
- `docs/app-bundle-b.min.js`
- historical audit/patch/session artifacts

Status: **CLOSED — MINIMAL SAFE CLEANUP**
