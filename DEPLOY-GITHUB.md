# Keluarga W — GitHub Production Deployment

## Required pre-deploy state

A production deployment is considered ready only when the GitHub Actions workflow **Keluarga W Production Release Gate** is green on the exact commit intended for deployment.

The workflow deliberately performs the steps that this sandbox cannot complete reliably:

1. install release dependencies from npm;
2. run the required production build with esbuild minification;
3. run `npm run release-check` without lint/minify overrides;
4. run the critical regression gate;
5. run the deterministic full regression runner;
6. run SoT, architecture, persistence, PWA, feature, patch-integrity, contamination, and release-closure gates;
7. publish the five production runtime files as a workflow artifact.

## Deployment rule

Do **not** deploy the locally generated unminified `app-bundle-a.min.js` or `app-bundle-b.min.js` merely because they pass syntax and freshness checks. The repository's release contract requires minification.

Deploy the exact commit only after the GitHub Actions production gate is green and the artifact belongs to that same commit.

## Current sandbox limitation

The current audit environment has no installed `esbuild` or `eslint` and cannot resolve them from the npm registry. Therefore local production minification/lint is intentionally **BLOCKED**, not overridden. GitHub Actions is the reproducible verification path.
