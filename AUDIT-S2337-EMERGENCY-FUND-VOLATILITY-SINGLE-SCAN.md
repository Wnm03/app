# S2337 — Dana Darurat monthly-income volatility scan reduction

## Finding
`DanaDaruratAI.computeRecommendation()` previously filtered `D.transactions` once per available month and parsed each qualifying transaction date twice per filter. For up to six months, that repeated work scaled with the number of months times the transaction count.

## Change
The calculation now initializes the same monthly buckets and scans `D.transactions` once, parses each eligible income date once in that scan, and assigns it to its month offset. The historical month-end boundary remains 23:59:59 (without milliseconds), and `hitungKas:false` remains excluded. Mean, population variance, coefficient of variation, multiplier, and recommendation formulas are unchanged.

## Validation
- `tests/s2337-emergency-fund-volatility-single-scan.test.js`
- Existing `tests/hitungkas-normalisasi-financial-calc.test.js`
- Existing S2333–S2336 focused performance/regression tests

## Limitations
This is an algorithmic work reduction, not a measured device-speed claim. Full-suite and release validation must run in an environment with the required production build/lint toolchain.
