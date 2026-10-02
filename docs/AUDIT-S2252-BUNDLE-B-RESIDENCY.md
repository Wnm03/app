# AUDIT S2252 — Bundle-B Residency / Dependency Review

## Baseline

Canonical working baseline: `app-main (47)` = `app-main (46) + S2248` byte-equivalent, then S2250/S2251 audit guards.

## Measurement correction

The previous S2250 note reported 377 GROUP_B files. Direct parsing of the canonical `scripts/build.js` now shows **384 GROUP_B entries** and **5,382,370 bytes of raw source**. The earlier 377 figure is superseded and must not be used for release decisions.

This audit deliberately measures **source residency**, not final production/minified payload. The current sandbox lacks the project release dependencies (`esbuild`/`eslint`), so the 5.398 MB current Bundle-B artifact cannot be treated as the final minified production size.

## Current largest clusters

- IMPORT-OCR: 18 files / 265,233 raw bytes — strongest lazy-load candidate class, but runtime consumers and modal/action dispatch must be proven before relocation.
- DIAGNOSTIC: 4 files / 240,764 raw bytes — includes `self-test.js`; it currently installs/executes diagnostic behavior and therefore is **not** safe to remove from startup by size alone.
- AI: 3 files / 122,266 raw bytes — feature-specific but may be reached from global chat/action paths; requires lifecycle/action-loader proof.
- BACKUP: 2 files / 84,751 raw bytes — backup/restore paths are feature-specific, but restore/security and offline behavior make this a higher-risk lazy-load candidate.
- VEHICLE-SERVICE and FINANCE contain many SOT/core consumers and are not candidates for bulk relocation.

## Largest individual sources

The largest files include `modules/vehicle/servis.js`, `modules/vehicle/service-master-data.generated.js`, `modules/finance/tagihan-kalender.js`, `modules/shared/features-helpers-global-security.js`, `modules/finance/dana-titipan-portfolio-render.js`, and `modules/vehicle/vehicle-core.js`. These are not safe lazy-load candidates based on size alone because they participate in broad runtime/SOT wiring.

## Recommendation

Do **not** change GROUP_B in S2252. The correct next step is to make the production toolchain reproducible (`npm ci`, `npm run build:release`) and record the real minified sizes. If Bundle-B remains over the 5,000,000-byte budget after genuine minification, then S2253 should perform a dependency-backed lazy-load proof for the IMPORT-OCR cluster first, followed by AI/diagnostic only if runtime behavior can be preserved.

### Safety rule

No module is removed or relocated solely because it is large, appears feature-specific, or is flagged by a duplicate-symbol/dead-code scanner. A candidate needs evidence of:

1. no startup consumer,
2. a deterministic load trigger,
3. all transitive dependencies available at trigger time,
4. offline/PWA cache coverage,
5. CSP-safe loading,
6. no window/global exposure regression,
7. no SOT/persistence/lifecycle regression,
8. targeted + full regression evidence.


## S2253 correction

S2253 memindahkan 14 modul feature-only IMPORT/OCR/Scanner dari `GROUP_B` ke on-demand loader. Manifest `GROUP_B` kini **371 entries / 5,205,910 raw bytes**. Angka 384/5,382,370 di bagian Baseline adalah snapshot historis S2252 dan tidak lagi menjadi current-state contract. Current-state regression contract diperbarui di `tests/s2252-bundle-b-residency-contract.test.js`.
