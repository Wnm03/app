# S1762 — self-test.js decomposition

- Extracted application bootstrap implementation into `modules/shared/app-init-runtime.js`.
- Extracted self-test registry into two ordered modules: `self-test-cases-a.js` and `self-test-cases-b.js`.
- Kept compatibility facades in `self-test.js` for `init()` and `getSelfTestCases()`.
- Added the split modules to the deterministic build order before `self-test.js`.
- Preserved the legacy `init()` extraction marker required by the boot regression test.
- Added the self-test case module to the overlay-open bypass allowlist because its direct overlay opens are intentional diagnostic harness operations.
- Repaired the stale Car Notes classic-polish cache-bust assertion so it validates internal version alignment instead of hard-coding release 1756.
- Rebuilt bundles and synchronized release cache-bust version to 1757.
- S1761 retired Theme Pro artifacts are included through `DELETE-FILES.txt` so this patch is cumulative.

Validation:
- all active JS files: `node --check` PASS
- strict source-size gate: PASS; no active JS source > 1600 lines
- targeted critical/regression suite: 18/18 PASS
- window expose: PASS (82/82)
- Service SoT: PASS
- Car Notes performance: PASS
- Car Notes integrity: PASS
- bundle freshness: PASS
- full `node --test tests/*.test.js` was attempted; the environment did not terminate before its outer execution timeout. The captured run reached test 4746 with no observed failure after the stale 1756 assertion was corrected. Therefore no claim of a completed full-suite final aggregate is made.
- esbuild is unavailable in the environment, so generated bundles are valid but not minified.
