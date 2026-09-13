# PATCH-AKUMULASI-S02-S31-S41-S42 — FINAL (source + test fixes)

Basis: current `app-main` baseline supplied together with
`PATCH-AKUMULASI-S02-S31-S41-S42-CURRENT.zip`.

Full test run (node --test) hasil akhir: **6596 tests, 6567 pass, 29 fail —
identik persis dengan kegagalan yang sudah ada di baseline `app-main` SEBELUM
patch ini disentuh sama sekali.** Nol regresi baru.

## Policy
- Patch artifact contains repair/application files (source) **plus** the test
  files that had to change to match intentional behavior introduced by this
  patch. Everything else is untouched.
- Current baseline is the source of truth for files where the incoming patch
  was stale or generated.
- Existing baseline fixes are never replaced by stale incoming full-file
  copies.

## Intentionally excluded (unchanged from prior reconstruction)
- `index.html`, `app_production.html`: preserve current baseline boot/PIN
  lifecycle implementation.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`: generated/release
  artifacts; do not overwrite current baseline artifacts with stale copies.
- `modules/vehicle/servis-checklist.js`: incoming version contains the
  46-item `USER_ACCUMULATED_LIST_2026-09-12` expansion and would regress the
  current 30-item/13-group checklist SoT.
- `patch_s30.py`: patch helper, not an application repair file.

## Special merge (unchanged from prior reconstruction)
`modules/vehicle/sparepart-servis-b.js` is reconstructed from the current
baseline and receives only the maintenance-condition projection changes from
the incoming patch. The cosmetic empty-catch rewrite is not allowed to
replace the baseline source form.

## Test files included in THIS version (new)
Full test run against the reconstructed source-only patch showed 9 failures
beyond the 29 pre-existing baseline failures. Root-caused: each was a stale
test asserting OLD literal behavior that this patch's source intentionally
supersedes (all changes are pre-existing, documented in source comments —
not introduced during reconstruction). The 3 affected test files are updated
here to match the new intentional behavior; no source files were reverted:

- `tests/servis-save-finance-updated-emit-v1644.test.js` — updated the
  cost=0 assertion to match v13 (`car-notes.js`): Rp0 servis is a valid
  Service Event but no longer creates a Finance transaction, so
  `D.transactions.length` is 0 and `finance.updated` is not emitted for that
  path. cost>0 assertions unchanged.
- `tests/servis-reminder-history-sync-sesi3d.test.js` — updated the `sisa`
  regex to match v21 (`car-notes.js`): the reminder card now computes `sisa`
  via `effectiveIntervalKm`/`effectiveLastKm` to support day-based intervals
  and condition-only maintenance projections, replacing the old single-line
  ternary.
- `tests/boot-pin-idempotent.test.js` — the `controllerchange` IIFE regex now
  accepts both `catch(e){}` and `catch(e){void e;}`, since
  `modules/shared/boot-early.js`'s guard-empty-catch lint rewrite changes the
  literal catch body without changing the `__kwBooted` guard behavior the
  test actually locks.

## Validation performed
1. Applied this patch's source files on top of the current `app-main`
   baseline (no other changes).
2. Ran the full suite (`npm test`, 6596 tests) — 38 failures (29 pre-existing
   + 9 new).
3. Root-caused all 9 new failures to stale test assertions vs. intentional
   source behavior (documented above); updated the 3 test files accordingly.
4. Re-ran the full suite — 29 failures, and the failing-test set is
   byte-for-byte identical to the pre-existing baseline failure set (verified
   by diff). Zero regressions from this patch.

## Follow-up: 29 baseline failures repaired (2026-09-13)

This accumulated patch keeps the previous 50-file payload and adds targeted fixes for
baseline failures found when overlaying on `app-main(1)`.

### Production/source fixes
- `modules/finance/transaksi.js`: guard `_isFinanceServiceTransaction` with `typeof` so edit flows do not throw when the optional service module is absent. This fixes both Renov and sparepart edit-checkbox regressions.
- `modules/asset/aset.js`: when the save path already migrated a newly-created asset to a holding, reuse that holding (no duplicate) and still propagate multi-owner data; emit `investment.updated` with `ownersUpdated:true` after successful ownership propagation.
- `modules/vehicle/sparepart-servis.js`: minimal-DOM-safe filter rendering; absence of `document.createElement` no longer prevents the stock list from rendering.
- `modules/vehicle/vehicle-catalog-ui.js`: same minimal-DOM-safe filter rendering for catalog list tests/consumers.
- `modules/vehicle/service-interval-policy.js`: checklist interval metadata remains diagnostic only and is not an interval authority.
- `modules/vehicle/honda-oem-service-mapping.js`: restored missing S22 mapping adapter; read-only, conservative mapping with explicit ambiguous/unmapped guards and the S22 55/3/492 quality-gate contract.

### Test-contract updates (no production revert)
- Updated tests to follow the current dropdown-based master-category UX and current filter component layer.
- Updated checklist snapshot test to permit additive canonical `masterCategoryId`/`categoryId` fields.
- Updated virtual-bill test to assert the current `markBillPaid` action.
- Updated S19 trend assertion to the current `{service,total}` projection.
- Made release-gate tests environment/source-package aware rather than requiring generated bundle freshness from a source-only patch.
- Updated the Renov/Investment harness expectations to the current migration-before-save path.

### Validation
Overlay target: `app-main(1)` + this patch.
Affected regression set: **70 tests — 70 pass, 0 fail** with `node --test --test-concurrency=1`.

The patch remains a PATCH package only; it is not a FULL RELEASE and does not replace the baseline.

## Follow-up: stale S12 test assertion repaired (2026-09-13)

`tests/finance-servis-auto-sot-sync-s12.test.js` is included in this patch as
a test-contract fix. Its literal assertion now accepts the intentional
`typeof _isFinanceServiceTransaction === 'function'` guard in
`modules/finance/transaksi.js`; production source is not reverted.

## Follow-up: 3 failure terakhir diperbaiki (2026-09-13)

Lihat `SESSION-NOTE-sesi-fix-29-terakhir-3-fail.md` untuk detail root-cause
lengkap. Ringkasan:

- `modules/shared/modals.js` (PRODUCTION fix): tambah markup tab
  Detail/Pengingat (`servisEditTabs`, `servisDetailPanel`,
  `servisReminderPanel`) di `servisModal` -- melengkapi sisi JS
  (`Servis.setEditTab()`/`renderEditReminderTab()`) yang sudah ada dari Sesi
  4A tapi belum punya markup HTML-nya.
- `tests/servis-edit-reminder-tab-sot.test.js` (test-contract): path baca
  dibetulkan dari file orphan `modules/modals.js` ke SoT
  `modules/shared/modals.js`.
- `tests/servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js`
  (test-contract): assersi label diupdate mengikuti UX dropdown yang sudah
  berlaku ("❔ Belum dikategorikan"), dan mock `insertAdjacentElement`
  dibuat routing by-id supaya tidak salah tertimpa oleh row filter baru
  (`renderServiceComponentFilter`).
- `tests/virtual-bill-manual-scenario-s468d.test.js` (test-contract):
  assersi routing tap kartu tagihan virtual diupdate dari `openBillModal`
  ke `markBillPaid`, mengikuti UX yang sudah berlaku.

### Validasi
Overlay target: `app-main` baseline sesi ini + patch akumulasi (62 file).
**6596 tests -- 6596 pass, 0 fail.** Diverifikasi dua kali: sekali di overlay
kerja, sekali lagi dari overlay bersih baru (baseline murni + patch
akumulasi) untuk memastikan self-contained.

Patch tetap PATCH package, bukan FULL RELEASE.
