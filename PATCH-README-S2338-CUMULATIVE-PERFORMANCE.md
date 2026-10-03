# Cumulative performance patch S2338

Includes cumulative S2333–S2337 fixes and S2338's single-pass aggregation for Financial Independence monthly surplus, pension surplus, and salary allocation income.

Apply this archive as an overlay to the matching baseline. Process `DELETE-FILES.txt` using the repository's standard delete-manifest procedure; it retains the existing deletion of `pro-ui-layer.css`.

Validation in this environment: S2333–S2338 focused tests and related existing FI/salary/hitungKas tests passed (33/33); bundle freshness, performance budget, patch integrity, and contamination audits passed. Production release remains blocked because `esbuild` is unavailable (bundles are not minified) and the full release gate has not been completed. No device-level performance claim is made.
