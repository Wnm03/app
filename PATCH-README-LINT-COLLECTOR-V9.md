# V9 — ESLint collector path + remaining legitimate globals

This patch is cumulative over V8.

## Root cause fixed
V8's improved collector was packaged as `collect-app-globals.js` at repository root, while `eslint.config.js` loads `./scripts/collect-app-globals`. Therefore CI continued using the older collector and still reported legitimate cross-file globals.

## Changes
- Place the V8 collector at the actual runtime path: `scripts/collect-app-globals.js`.
- Preserve canonical manifest discovery from root `build.js` plus generated `scripts/build.js`.
- Preserve top-level declaration and global-export discovery.
- Add only intentional external/runtime globals that ESLint cannot infer from source:
  - `ZXing`
  - `pdfjsLib`
  - `FileReader`
  - `compareServiceHistoryRecency`
  - Node `require` / `module` for build/test scripts.

## Release-gate policy
- No change to `scripts/verify-release-ready.js`.
- No `no-undef` disable.
- No blanket ESLint override.
- No production bundle/UI/SOT changes.

## Required verification
Run:

    npm run check
    npm run release-check

Do not create a release ZIP until lint exits 0 and all other release gates pass.
