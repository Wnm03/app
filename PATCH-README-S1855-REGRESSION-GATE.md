# S1855 — Regression Gate Compatibility

Cumulative follow-up to S1841–S1854.

The performance render-context optimization intentionally changed transaction render calls from bare `txHTML` / `txTableHTML` calls to calls carrying a reusable render context. Several legacy structural tests asserted the pre-optimization call strings literally.

S1855 updates those tests to assert the same behavior while allowing the optional render context:
- S637 modern ledger wiring
- S641 history modern ledger wiring
- S643 cross-audit for the legacy card fallback

No production behavior is changed by S1855.
