# PATCH S1931 CUMULATIVE — Atomic Navigation + ScrollRoot DOM Fix

This cumulative patch preserves the previous S1931 Atomic Navigation/UI fixes and adds the S1931 ScrollRoot DOM-nesting fix.

Included prior fixes:
- Atomic page transition / no blank intermediate state.
- Navigation active-state synchronization.
- S1930 mobile transition hardening retained.
- CSS performance budget reduction retained (`styles.css` 179,925 bytes).
- Existing bundle-b freshness retained.

Added fix:
- Correct `#scrollRoot -> #mainApp -> #page-*` DOM nesting in `index.html` and `app_production.html`.
- Regression test for mainApp/scrollRoot nesting.

No prior files from the atomic S1931 patch are intentionally removed.
