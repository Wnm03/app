# S1856 — Regression Hardening

Fixes a real standalone regression introduced by S1842 render-gating in `tx-list-cashflow.js`.
`delTx()` now guards `refreshAfterMutation()` for isolated callers; production behavior is unchanged when the helper exists, while standalone tests fall back to the prior dashboard/finance render hooks.

Important: S1841–S1855 cumulative patches must be applied with their intended module/test paths. Some later patch archives are flattened at ZIP root and must be mapped to their source paths; they are not safe to blindly unzip over the app root.
