# AUDIT S2005 — FINAL CUMULATIVE S2000–S2005

## Status
**IMPLEMENTED + VERIFIED** — S2005 dikerjakan satu tahap di atas baseline `app-main (18).zip` dan tidak menghapus source/artifact sesi S2000–S2004.

## Root cause yang ditutup
Gejala utama pada screenshot:

- Riwayat servis terbaru Throttle Body tersimpan pada **20.237 km**.
- Tab Pengingat tetap menghitung kondisi dari baseline yang tidak menemukan history canonical terbaru sehingga tampil **Terlewat 12.237 km**.
- `12.237 = 20.237 - 8.000`, yang berarti jalur reminder berperilaku seperti **tidak menemukan history reset yang cocok**.

Audit menemukan gap bahwa `servisLogMatchesCat()` belum memiliki satu SOT rekonsiliasi yang dapat membaca **checklist row canonical** sebagai bukti identity untuk history row yang sama. Pada data hasil checklist, `D.servisLogs[n].checklist[0]` menyimpan `serviceComponentId/itemId` canonical, sementara field top-level history dapat menjadi stale/legacy.

## S2005 implementation
### 1. New canonical SOT
`modules/vehicle/service-history-reminder-reconciliation-sot.js`

Provides:
- `match(log,target,opts)`
- `latest(logs,target,opts)`
- `compareRecency(a,b)`
- `audit(logs,target,opts)`
- deterministic mismatch codes
- vehicle isolation
- checklist canonical evidence
- strict canonical component matching
- legacy-name fallback only when canonical identity is unavailable

No second store/database and no automatic migration are introduced.

### 2. Reminder integration
`modules/vehicle/sparepart-servis.js`

`servisLogMatchesCat()` now delegates to S2005 SOT when available and keeps the previous compatibility fallback for isolated/legacy test contexts.

`computeServiceUrgency()` now obtains one reconciled latest history row and exposes:
- `sourceHistoryId`
- `reconciliationCode`

The calculation still uses the existing interval/action/reset policy; S2005 only fixes the identity/reconciliation layer.

### 3. Maintenance engine alignment
`modules/vehicle/service-maintenance-engine.js`

`latest()` now consumes the same S2005 deterministic history resolver when available, preventing a second independent definition of "latest service".

### 4. Build registration
`scripts/build.js`

S2005 SOT is loaded before `sparepart-servis.js` so the canonical matcher is available to reminder consumers.

### 5. Release gate hardening
`scripts/service-sot-integrity-gate.js`

Added a permanent S2005 contract check covering:
- checklist canonical match;
- vehicle isolation;
- deterministic latest resolver;
- reminder delegation;
- source history identity;
- maintenance-engine delegation.

### 6. Regression test
`tests/service-history-reminder-reconciliation-s2005.test.js`

8 focused tests cover:
1. checklist canonical identity overrides stale top-level identity;
2. canonical mismatch is not rescued by fuzzy text;
3. vehicle isolation;
4. deterministic recency;
5. exact screenshot scenario;
6. reminder matcher wiring;
7. maintenance engine wiring;
8. build manifest order.

## Exact screenshot regression
Scenario:

- component: `throttle-body`
- interval: `8.000 km`
- old history: `11.644 km`
- new history: `20.237 km`
- new history top-level identity intentionally stale
- checklist row contains canonical `throttle-body`
- current KM: `20.237`

Expected and verified:

- `lastKm = 20.237`
- `nextDueKm = 28.237`
- `sisaKm = 8.000`
- `status = aman`
- `sourceHistoryId = new`
- `reconciliationCode = CHECKLIST_CANONICAL_MATCH`

## Session preservation
S2000–S2004 artifacts already present in the baseline repository were preserved. S2005 adds only its own source/test/audit layer plus normal release build artifacts.

No history migration was performed.
No reminder database was created.
No interval field was added to service history.

## Verification results
### S2000–S2005 focused cumulative
**37 / 37 PASS** across selected cumulative service tests, including S2000, S2004, S2005, S2006-related master/maintenance contracts, and existing reminder/history synchronization tests.

### Full service/car-notes regression
**582 / 582 PASS**, 0 FAIL, 0 SKIPPED, 0 TODO.

### Full repository regression
The complete `npm test` run was also started against the cumulative repository. The execution window expired after reaching approximately test #3998; no assertion failure was reported before timeout, but the run did **not** reach the final aggregate result. Therefore it is not claimed as a complete full-repository PASS in this audit. The service/Car Notes regression above is the completed regression evidence for this session.

### Build
**PASS**
- bundle A syntax PASS
- bundle B syntax PASS
- build version advanced automatically from v1999 to **v2000** by existing build.js release logic
- HTML/SW cache-bust synchronized to v2000

### Bundle freshness
**PASS**
- bundle A source hash: `b02389ac52b068f0`
- bundle B source hash: `a831defa541b2e52`

### Runtime expose
**PASS** — 83 data-action modules exposed.

### Service SOT gate
**PASS** with full-regression step explicitly skipped during the gate invocation because the repository's full shard runner exceeded the execution window. The gate's structural/service checks all passed; the full service regression was separately verified at 582/582.

### Car Notes integrity
**PASS** — scanned 430, forbidden 0, duplicate IDs 0/0, Servis declarations 1.

### Patch integrity
**PASS** — 56 apply files, 2 delete entries, fingerprint `3834cf56dbfc5310`.

### Architecture integrity
**PASS** — runtime entries 402.

### Persistence integrity
**PASS** — IDB primary, LS critical fallback, queued writes, lifecycle flush, cross-tab guard, migration checkpoint.

### Source-size
**WARNING only** — `modules/vehicle/servis.js` remains 1,799 lines against the existing 1,600 guideline / 1,800 guard cap. S2005 did not add logic to that file.

## Build environment note
`esbuild` is not installed in this environment, so the repository's existing build fallback emitted valid non-minified bundles despite the `.min.js` filenames. `node --check` on both bundles passed and `verify-bundle` passed.

## Final verdict
**S2000 + S2001 + S2002 + S2003 + S2004 + S2005 = cumulative implementation preserved and verified.**

The specific screenshot class of bug is now covered at the identity-reconciliation layer rather than by adding another reminder/history store.
