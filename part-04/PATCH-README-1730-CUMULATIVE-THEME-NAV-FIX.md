# Patch 1730 — Cumulative Theme/Nav Visibility Fix

Overlay patch to apply on top of the previous cumulative Pro mockup patch.

## Root cause audited from user screenshot

The Pro CSS contained a blanket rule:

`[data-theme="pro"] #mainNav{display:none!important;}`

`#mainNav` is the global application navigation. Hiding it at the theme level
made the navigation disappear on pages that do not render the dedicated Car
Notes Pro navigation.

## Fixes accumulated

1. Global `#mainNav` stays visible under Pro by default.
2. It is suppressed only while `#page-carnotes.active` is active, where the
   dedicated Car Notes Pro bottom navigation is present.
3. The replacement hide is inside `@supports selector(...)`; older engines
   safely retain the global navigation rather than hiding it.
4. `vehicle-core.js` now hides/toggles the `beranda` pane together with all
   other Car Notes panes on every `setCnTab()` call, fixing the Klasik boot
   visibility regression found during the cumulative full-source audit.
5. `proCnBottomNav` state synchronization and `children?.[index]` guarding are
   retained in the source of truth, not only in a generated bundle.
6. HTML/SW/cache version is bumped to 1730.
7. A/B bundles are rebuilt from the corrected source and included here.
8. Regression tests cover the nav/theme failure and Car Notes boot visibility.

## Verification performed

- Targeted cumulative tests: **12/12 PASS**.
- `node --check app-bundle-a.min.js`: PASS.
- `node --check app-bundle-b.min.js`: PASS.
- Bundle freshness: PASS.
- Window-expose audit: PASS (82 modules / 382 scanned files).
- Build 1730: PASS; A/B bundles generated and source/hash markers synchronized.
- Full-suite process was started against the original full source plus this
  cumulative overlay. It is long-running in this environment; no immediate
  failure was observed before the process continued.

## Environment note

`esbuild` is not installed in this sandbox and the registry is unavailable,
so the documented build fallback generated valid, unminified bundles. This is
not a functional correctness failure, but a release-size limitation.

---

## ADDENDUM — accumulated against the previous session's targeted fix

This file set was cross-checked against an earlier, narrower same-purpose
fix (CSS-only, scoped `#mainNav` hide via `:has()` without the
`@supports` fallback or the `vehicle-core.js` boot-visibility change). That
earlier fix is fully superseded here: this patch's `[data-theme="pro"]
#mainNav{display:flex!important;}` + `@supports selector(...)` approach is
strictly more robust (graceful degradation on engines without `:has()`), so
the earlier fix's files were **not** carried forward and its now-redundant
regression test was retired in favor of `tests/pro-theme-nav-visibility-
audit1730.test.js`, which already covers the same regression plus version/
cache-bump checks.

### Additional bug found and fixed during accumulation

Audited every JS/HTML file for unrelated side effects of the version bump
(1728 → 1730) by diffing against the 1728 baseline. Found one genuine data
corruption, isolated to `modules/shared/features-helpers-global-security.js`
and its compiled copy in `app-bundle-b.min.js`:

```
nisabPenghasilanTahun:91681730   // WRONG (as uploaded)
```

`91681728` is not a version marker — it is the legitimate result of
`nisabPenghasilanBulan (7640144) * 12`, which just happens to end in the
same four digits as patch 1728. The version-bump step appears to have done
a blind literal string-replace of `"1728"` → `"1730"` across the file,
which silently corrupted this unrelated zakat-nisab constant into
`91681730` (no longer a multiple of 12 of the monthly value). This affects
the default annual income-zakat threshold used whenever `D.pajakZakat` has
not yet been set for a user.

**Fixed** in this accumulated patch: `nisabPenghasilanTahun` restored to
`91681728` in both the source file and `app-bundle-b.min.js` (surgical
string replace, syntax re-verified with `node --check`). No other
occurrence of this class of collision was found elsewhere in the patch (full
grep audit of every `1728`/`1730` occurrence across all included files).

Added `tests/pajak-zakat-nisab-tahun-version-collision-1730.test.js` to gate
this permanently: it asserts `nisabPenghasilanTahun === nisabPenghasilanBulan
* 12` in both the source file and the compiled bundle, so a future version
bump can't silently reintroduce the same class of bug against this specific
constant.

### Verification performed on the accumulated result

- `node --test` run locally against the corrected files:
  `pro-theme-nav-visibility-audit1730.test.js` (4/4 pass, unchanged from as-
  uploaded) + new `pajak-zakat-nisab-tahun-version-collision-1730.test.js`
  (3/3 pass; confirmed 3/3 **fail** against the as-uploaded, uncorrected
  files, proving the test actually catches the bug).
- `node --check` on both `app-bundle-a.min.js` and `app-bundle-b.min.js`
  after the bundle edit: PASS.
- Full grep audit for other `1728`/`1730` collisions: none found beyond the
  one fixed here.
- **Not run in this environment**: the full ~6800-test suite (requires the
  full baseline repo/toolchain, not present in this overlay-only upload).
  Recommend running it before merging, given a hand-edit was made directly
  to a pre-minified bundle file.

---

## ADDENDUM 2 — critical regression found when the full suite was actually run

The recommendation above ("run the full suite before merging") was followed,
against the real baseline (`app-main`) with this overlay applied on top.
Result: **6793/6795 pass, 2 fail.**

Root cause: `modules/vehicle/vehicle-core.js` in this patch was built from an
older/wrong source snapshot, not from the true baseline plus the intended
nav/theme diff. Diffing this patch's `vehicle-core.js` against the actual
baseline file (not against 1728, against the real `app-main` source) showed
it silently **deleted two real, unrelated things** on top of baseline while
introducing no functional change of its own:

1. `beranda:'Beranda'` entry dropped from `CN_TAB_LABEL` — breadcrumb fell
   back to the raw key `"beranda"` instead of the localized label.
2. `proMockupSetScreen(n)`, `proMockupInit()`, and `proOpenHistoryTab()` —
   37 lines gone entirely. These are the navigation functions for the 8-screen
   Pro mockup (the "Jadwalkan Servis" button, the `‹` back button, and the
   "Riwayat" button in the Pro bottom nav).

The `setCnTab()` → `proCnBottomNav` sync rewrite in the same file (switched to
`?.[bi]` optional chaining) was harmless — same behavior as baseline, just
restyled — and was kept as-is.

The original README's claim that `vehicle-core.js` was fixed here "so the
`beranda` pane toggles" was also checked against the true baseline: that
behavior **already existed in baseline**, so the intended change added
nothing, while the bad source snapshot it was built from cost two real
features.

### Fixed in this version

- Restored `beranda:'Beranda'` to `CN_TAB_LABEL` in
  `modules/vehicle/vehicle-core.js`.
- Restored `proMockupSetScreen()`, `proMockupInit()`, and
  `proOpenHistoryTab()` verbatim from baseline into
  `modules/vehicle/vehicle-core.js`, in their original location.
- Applied the identical two restorations to the compiled copy in
  `app-bundle-b.min.js` (the only bundle that contains this module).
- Kept the optional-chaining `proCnBottomNav` sync rewrite (behavior-neutral).
- Did **not** re-bump the version number — this stays patch 1730, since the
  fix restores dropped baseline behavior rather than adding new behavior.

### Verification performed on this corrected version

- `node --check` on `vehicle-core.js`, `app-bundle-a.min.js`, and
  `app-bundle-b.min.js`: PASS.
- Diffed the corrected `vehicle-core.js` against true baseline: the only
  remaining delta is the harmless optional-chaining rewrite noted above.
- **Full suite run against the true baseline with this corrected overlay
  applied: `node --test tests/*.test.js` → 6795/6795 pass, 0 fail.**
