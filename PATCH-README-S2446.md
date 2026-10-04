# S2446 — Remaining persisted identifier/date attribute hardening

Baseline: app-main (53), cumulative chain through S2445.

Repairs:
- Encode Dana Titipan return IDs in action attributes.
- Encode inventory transfer IDs in action attributes.
- Encode Kasir product IDs in action attributes.
- Encode persisted self-care/history dates in SVG text.
- Encode Tukang worker/history IDs and dates in data attributes.

Regression: `tests/s2446-residual-persisted-attribute-encoding.test.js`.
