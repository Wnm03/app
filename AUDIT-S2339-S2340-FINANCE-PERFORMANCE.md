# Audit S2339-S2340 — Finance aggregation performance

## S2339 — Finance Intelligence

Before: `incomeVsExpense()` filtered `D.transactions` to a temporary array, then filtered that array twice more for income and expense. The updated implementation uses one iteration and accumulates both totals. `txCount` continues to count every transaction passing the date and ownership predicates, including transaction types other than income/expense. Explicit date ranges still bypass cache; implicit range calls retain the existing cache.

## S2340 — Cash projection

Before: paid-status checks were repeated in the gross paid-total aggregation and scheduled-obligation aggregation; occurrence counts could also be calculated more than once for cycle mode. The updated single bill loop memoizes paid status locally and reuses each computed occurrence count. Calendar-mode gross total still comes from `getBillStats(m,y).monthTotal`, while cycle mode sums occurrences for all bills (including paid bills) to preserve existing semantics. Paid bills are skipped from scheduled remaining obligations and do not need occurrence calculation in calendar mode. Recurring occurrence functions, amount handling, and the separate unscheduled Titipan debt logic remain unchanged.

## Evidence / limitations

Focused regression tests passed. Full-suite completion and production bundle freshness remain unverified because the build-tool installation timed out and the full test run exceeded the execution window. No measured on-device performance improvement is claimed.
