# S2445 — Residual persisted HTML attribute hardening

Baseline: app-main (53), cumulative chain through S2444.

Repairs:
- Encode persisted asset timeline IDs before `data-args` HTML attributes.
- Encode persisted asset timeline emoji before HTML text rendering.
- Encode persisted shop product IDs before `data-prod-id` attributes.
- Encode persisted Kasir category/product IDs before `data-args` attributes.

Regression: `tests/s2445-residual-attribute-encoding.test.js`.
