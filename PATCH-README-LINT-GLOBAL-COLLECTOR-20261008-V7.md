# PATCH V7 — ESLint Global Collector / Remaining Lint Errors

This patch accumulates V2–V6 and fixes the next real lint blockers without
bypassing any release gate.

Changes:
1. scripts/collect-app-globals.js
   - Adds conservative column-1 fallback for top-level const/let/var declarations.
   - Recognizes canonical globals exported directly through globalThis/window/g.
   - Recognizes compact top-level function declarations written as `}function name(...)`.
   - This fixes legitimate cross-file globals such as save, PPh21, PajakUMKM and
     FinanceCategorySOT while preserving no-undef as a hard error.
2. tests/sparepart-category-editor-sot-s1965.test.js
   - Removes duplicate ServiceInputCatalog object key (no-dupe-keys).

No application UI, runtime bundle, release gate, or lint rule is disabled.
Do not edit verify-release-ready.js to bypass lint.

Validation performed:
- Collector resolves: save, PPh21, PajakUMKM, FinanceCategorySOT,
  extractChatAction, chatActionInnerHTML.
- Duplicate ServiceInputCatalog entry removed.
- YAML/package files are unchanged in this patch.

After applying, run:
  npm run release-check
  npm run check

Expected next target:
  GATE lint: PASS

If a new source-level lint error appears, fix that error rather than overriding
the gate.
