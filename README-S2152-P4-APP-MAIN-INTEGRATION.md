# S2152 P4.1-P4.7 — app-main integration patch

This package completes the `app-main (41)` baseline with the accumulated P4.1-P4.7 Stock SOT chain.

## Order
`app-main (41)` -> this patch

## Authority
`StockCommandSOT` is the runtime mutation authority; `D.partsStock` remains the persistence/storage owner.

## Included
- Runtime source changes from P4.1-P4.6
- Final P4.7 bundles/artifacts
- P4.1-P4.7 focused tests
- P4.6/P4.7 gate documentation

## Important
This package intentionally contains only the files needed to integrate the P4 chain into the supplied app-main baseline. It does not replace the whole app-main archive.
