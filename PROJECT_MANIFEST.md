Version: 1.1
Manifest Version: 1.1
Project Name: Keluarga-W (KW)
Repository Status: Active Development
Architecture Status: Stable
Baseline Build: v568
Baseline Tests: 95/95 PASS (subset carried by this ZIP — see NOTE under TEST RULES)

---

# NOTE ON THIS MANIFEST

This manifest documents the CURRENT repository as it actually exists.
It is descriptive, not aspirational. If anything below ever conflicts
with the source code, the source code wins — update this file to
match reality, never change the implementation to match this file.

No architectural migration is authorized by this document. There is
no Kernel/Engine/Service/Repository layering, no IndexedDB, and no
per-module engine.js/service.js/storage.js file-set in this codebase.
Do not introduce these unless the user explicitly requests it as a
new, separately-approved task.

---

# PROJECT IDENTITY

Project Name

Keluarga-W (KW)

Purpose

Keluarga-W is a personal/family finance and life-management PWA.

It covers: keuangan (finance/transactions/accounts/categories/
piutang), aset (assets), zakat, pajak (PPh 21/tax), kendaraan
(vehicle tracking — BBM/fuel, servis, analytics), shop/kasir (POS,
"Cobek"), self-reward, dashboard-hub, and LifeOS (goals/projects/
reviews/knowledge/plugins) plus a Smart AI / AI Decision Engine layer.

This repository contains a production application, actively used by
one family. It is NOT a prototype or demo.

Language: Indonesian, throughout UI and code comments/docs.

---

# PROJECT PRINCIPLES (as actually practiced in this repo)

• Client-side only — no backend, runs entirely in the browser
• Local-first — `localStorage` is the persistence layer (via a
  global `D` data object + `save()`)
• Incremental, session-numbered development (Sesi N) — one session
  implements one task/bugfix, then builds, tests, and stops
• Reuse existing services/data structures — new features must reuse
  existing computation functions (e.g. `computeCashflowForecast()`,
  `predictService()`) rather than re-deriving the same logic
• Backward compatible — old function signatures and `D` schema fields
  are not broken; new fields/params are additive
• ZIP release is the canonical source of truth, ranked above
  documentation, whenever the two disagree
• Documentation intentionally lags 1–2 sessions behind code — this is
  expected, not a bug

---

# TECH STACK (actual)

Language: Vanilla JavaScript (no framework, no TypeScript, no JSX)

Storage: `localStorage`, via a single global `D` object with a
`save()` method. No IndexedDB anywhere in this repo.

Platform: Progressive Web App — `manifest.json`, `sw.js` (service
worker, `CACHE_NAME` bumped per build), `pwa-setup.js`

Build: Custom Node script `scripts/build.js` — concatenates source
files (GROUP_A / GROUP_B, order-dependent) into `app-bundle-a.min.js`
/ `app-bundle-b.min.js`, bumps `?v=N` across `index.html` /
`app_production.html` / `sw.js`, runs syntax checks (`node --check`)
and a few permanent regression lint guards (e.g. `u-dnone` vs
`style.display` mismatch, escapeHtml coverage, OCR chicken-egg guard),
then rewrites `app_production.html` as an exact copy of `index.html`.
Minification via `esbuild` if installed (optional dependency); falls
back to unminified concatenation otherwise — both are valid to ship.

Testing: Node's built-in test runner (`node --test tests/*.test.js`),
real unit tests (not mocked business logic) that load actual source
files via helpers in `tests/helpers/` (`loadSource()`,
`extractFunction()`).

---

# SOURCE OF TRUTH

Priority order actually followed in this repo:

1. Existing source code (as built into the ZIP / bundles)
2. `docs/PRODUCT_DECISIONS.md` (explicit product decisions)
3. `.ai/AI_STATE.md` / `.ai/AI_TASK_QUEUE.md` / `.ai/AI_PROGRESS.md`
   (current-session workspace, introduced Sesi 000 — supersedes older
   `docs/PROJECT_STATE.md` narrative log, which still exists but may
   be stale)
4. `docs/CLAUDE.md` (project conventions — build/test/session rules)
5. `docs/SESSION_RULES.md`, `docs/BATCH_PLAN.md`, other `docs/*.md`
6. This manifest

There is no `NEXUS_CONSTITUTION.md` or ADR directory in this repo.
Documentation frequently lags behind code by design — when in doubt,
trust the ZIP contents over any single doc file.

---

# IMPLEMENTATION MODE

Default Mode: IMPLEMENTATION

Never switch mode automatically.

---

# AI BEHAVIOR

Unless explicitly requested, DO NOT:

• Audit the repository (only when a session is explicitly framed as
  an audit pass)
• Migrate or introduce new architectural layers (no Kernel/Engine/
  Service/Repository split)
• Rewrite or reorganize unrelated modules
• Rename existing files or change the flat, domain-folder file layout
• Change the build pipeline (`scripts/build.js`, GROUP_A/GROUP_B
  ordering) without a clear structural reason
• Change business/financial/tax/zakat logic without an explicit
  product decision
• Create placeholder or mock data in place of real `D` fields
• Guess at missing product requirements — ask instead

---

# TASK EXECUTION

Read (in this repo, the working equivalents of "PROJECT_STATE"/
"TASK_QUEUE" are the `.ai/` files, since no root `PROJECT_STATE.md`/
`TASK_QUEUE.md` exist):

- `.ai/AI_STATE.md`
- `.ai/AI_TASK_QUEUE.md`

Implement exactly ONE task (one Sesi = one task).

Stop.

---

# IF INFORMATION IS MISSING

Search order:

1. Source code
2. `.ai/AI_CONTEXT.md` / `.ai/AI_DECISIONS.md`
3. `docs/PRODUCT_DECISIONS.md`
4. `docs/CLAUDE.md` / other `docs/*.md`

If still missing, ask ONE precise question. Never invent product
decisions (tax rules, zakat rules, financial formulas, etc.).

---

# BUILD RULES

Always:
- Run `node scripts/build.js <tag>`
- Fix any build/lint-guard errors before proceeding
- Verify `index.html` == `app_production.html` (build does this
  automatically)
- Verify bundle syntax (build runs `node --check` automatically)

Never modify GROUP_A/GROUP_B file ordering without a clear structural
reason (modules reference each other; load order matters).

---

# TEST RULES

Run `node --test tests/*.test.js`.

Regression must remain green (0 fail) before and after a change.

New features require new test files (pattern: `tests/<feature>.test.js`,
using `loadSource()`/`extractFunction()` from `tests/helpers/` to load
real source, not reimplemented logic).

NOTE: the test suite carried inside any given working ZIP may be a
subset of the full historical suite (older session logs mention
thousands of tests; some ZIPs since Sesi 138 carry only the files
touched recently). Always verify actual pass count via
`node --test tests/*.test.js` rather than trusting a remembered number.

---

# ARCHITECTURE (actual, as implemented)

There are no strict Kernel/Engine/Service/Storage/UI/Dashboard/
Plugin/Analytics/AI layers with enforced dependency direction. The
real shape is:

- **`D`** — one global in-memory data object (transactions, accounts,
  categories, assets, vehicles, `bbmLogs`, dashboard prefs, etc.),
  persisted via `D.save()` to `localStorage`.
- **Domain folders** (`modules/finance/`, `modules/vehicle/`,
  `modules/shop/`, `modules/asset/`, `modules/self-reward/`,
  `modules/home/`, `modules/dashboard-hub/`, `modules/business/`,
  `modules/logistics/`, `modules/ai/`, `modules/cross/`,
  `modules/shared/`) — each holds flat, feature-suffixed files (e.g.
  `fuel-storage.js`, `fuel-intelligence-engine.js`, `fuel-history.js`,
  `fuel-analytics.js`, `fuel-modal.js`, `fuel-card.js`), not a fixed
  per-module file set.
- **Pure aggregation/service functions** read `D` directly and return
  computed data (e.g. `FinanceIntelligence`, `VehicleReminder`,
  `VehicleIntelligence`) — no repository abstraction, no DI.
- **UI** renders from those functions and from `D` directly, using
  global event delegation (`data-action` attributes dispatched from a
  small number of root listeners) rather than per-component event
  wiring.
- **Modals** are registered in a `MODAL_HTML[n]` array pattern and
  opened/closed through shared modal helpers (`modules/shared/modals.js`).
- **LifeOS** has a registry (`lifeos-registry.js`) + adapters
  (`lifeos/adapters/*.js`) that translate other domains' `D` data into
  a common shape — this is the closest thing to an "adapter layer" in
  the repo, and it is domain-specific, not a generic architectural tier.
- **Plugins** (`lifeos/plugins/*.js`) are a manifest+registry+runtime
  MVP with a strict lifecycle (`loaded → enabled ⇄ disabled →
  unloaded`) — no arbitrary code execution (no `eval`/`import()`),
  and no Marketplace beyond the existing MVP.
- **Event bus**: some cross-module signaling exists (`AIBus` event
  emission for AI hooks), but most modules call each other's exported
  functions directly rather than going through a formal bus.

Do not introduce a new layering scheme on top of this without an
explicit, separately-approved task.

---

# MODULE FILE CONVENTIONS (actual)

A typical new feature (e.g. Sesi 141, Fuel Intelligence Card) adds a
small set of flat files inside the relevant domain folder, named by
responsibility, e.g.:

- `<feature>-storage.js` — reads/writes the relevant `D` fields
- `<feature>-intelligence-engine.js` / `<feature>-analytics.js` —
  pure computation over storage data
- `<feature>-history.js` — presentation of past records
- `<feature>-modal.js` — modal orchestration (uses `MODAL_HTML[n]`)
- `<feature>-card.js` — the dashboard/UI card that opens the modal
- Matching `tests/<feature>-*.test.js` per file above

There is no mandatory `engine.js`/`service.js`/`storage.js`/
`validator.js`/`events.js`/`constants.js`/`ui.js`/`widget.js`/
`analytics.js` file set per module, and no per-module `README.md`/
`CHANGELOG.md`. Documentation for a feature lives in a top-level
`FEATURE-NAME.md` (e.g. `CAR-NOTES-2.0.md`, `SHOP-2.0.md`) and/or as
an entry in the root `CHANGELOG.md`, not inside the module folder.

---

# STORAGE (actual)

`D` (global object) → `D.save()` → `localStorage`.

No IndexedDB. No repository abstraction between UI and storage — UI
code and pure service functions both read `D` directly; write access
is expected to go through the relevant domain's existing
save/update function (e.g. `recordBbmLog()`, `Budget.getUsed()`)
rather than mutating `D` fields ad hoc from new code.

---

# BACKWARD COMPATIBILITY

Mandatory:
- Never remove an existing exported function or change its signature
  in a breaking way
- Never break the `D` schema for existing fields (additive changes
  only)
- Never break existing user data already in `localStorage`
- Preserve `index.html` / `app_production.html` parity (build enforces
  this automatically — do not hand-edit one without the other)

---

# SESSION RULE

One Session = One Task (One Sesi N = One numbered task/bugfix)

Order: audit (only if requested) → implement → run tests → build →
update `.ai/AI_STATE.md` + `.ai/AI_TASK_QUEUE.md` (+ `.ai/AI_PROGRESS.md`
entry) → stop.

Do not start a second task in the same session.

---

# OUTPUT FORMAT

For each session, report:

STATUS
FILES CREATED
FILES MODIFIED
IMPLEMENTATION (brief)
VALIDATION (test count before/after, build tag/version)
NEXT TASK (if any `READY` task remains, otherwise "none — all
candidates BLOCKED")
STOP

---

# PROJECT STATUS

Current Baseline (this ZIP)

- Build: `kw141-fuel-intelligence-card` (`?v=568`) — PASS
- Tests: 95/95 PASS
- Repository: Stable
- Development: Incremental, session-numbered (Sesi 141 as of this
  manifest revision)

---

# END OF MANIFEST
