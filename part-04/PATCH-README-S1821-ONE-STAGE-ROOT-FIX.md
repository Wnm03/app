# S1821 — One-stage cumulative root-fix overlay

Baseline: `app-main__23_`.

Fixes included in one additive overlay:
- restore four accidentally truncated theme-card wrappers (Mono/Sand/Ink/Pro Dark)
- restore baseline default theme `fresh`
- synchronize release version to 1811 across HTML, APP_BUILD_VERSION, SW and modal loader references
- restore scanner-session recovery banner watchdog with one lightweight 3s interval; banner remains inactive/no-op unless a scanner session is stuck
- keep PIN VM guard and cumulative performance changes from S1820
- update the SA10a CSP gate to validate the intentional single `data-modal-range="0-102"` modal loader
- update lifecycle gate to validate the intentional timeout-based maintenance scheduler
- keep one final `styles.css`; no duplicate S1808/S1817 packaging paths

No business/data model changes are introduced.
