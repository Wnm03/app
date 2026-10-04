# S2443 — Residual HTML Encoding Hardening

Baseline: `app-main (53)`.

Repairs:
- HTML-encode persisted PBB asset IDs, asset type labels, and bill due dates before HTML insertion.
- HTML-encode persisted zakat log dates.
- HTML-encode vehicle ID/name/emoji values in the transaction-service selector.
- HTML-encode persisted product IDs in merge-selection action arguments.
- HTML-encode account ID/emoji values and ownership type values in the shop product form.
- Add regression coverage in `tests/s2443-residual-html-encoding.test.js`.

This patch is cumulative with S2442 and contains only changed/new repair files.
