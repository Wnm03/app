# S2436 — Exact Toolchain Pin Correction

## Change
- Correct `devDependencies.eslint` from a caret range to the exact `9.19.0` pin.
- Correct `devDependencies.esbuild` from a caret range to the exact `0.24.0` pin.
- Add a regression test that rejects semver range operators for these direct release tools.

## Why
S2431's contract claimed exact pins, but the materialized `package.json` still contained `^9.19.0` and `^0.24.0`. This session closes that concrete contract mismatch without fabricating a lockfile or pretending the missing toolchain is installed.

## Boundary
This does not rebuild Bundle-B and does not create a lockfile. Registry/toolchain availability remains a separate blocker.
