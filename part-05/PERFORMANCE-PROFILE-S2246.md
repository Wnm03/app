# Production Performance Profile — S2246

The profile is read-only and intentionally avoids runtime instrumentation that could perturb application timing.

## Artifact size

- `index.html`: 319,791 B / 320,000 B (99.9%)
- `app_production.html`: 319,984 B / 320,000 B (100.0%)
- `styles.css`: 179,550 B / 180,000 B (99.8%)
- `app-bundle-a.min.js`: 1,529,055 B / 1,600,000 B (95.6%)
- `app-bundle-b.min.js`: 5,398,399 B / 5,000,000 B (108.0%)
- `sw.js`: 3,565 B

## Existing performance contracts

- S1842: 4/4 PASS
- S1843: 6/6 PASS
- S1844: 3/3 PASS
- S1851: 3/3 PASS
- S1891: 5/5 PASS
- S1900: 3/3 PASS
- PWA performance budget contract: 2/2 PASS

Total: **26/26 PASS**.

## Actionable finding

`app-bundle-b.min.js` is above the existing 5 MB performance budget. The budget should not be raised merely to make the gate green. The next optimization session should profile module contribution and startup dependency criticality before choosing lazy-load/split points.

## What still needs real-device measurement

1. Cold and warm startup time.
2. IndexedDB open/read/write latency for realistic datasets.
3. Large transaction/service/stock list render and rerender cost.
4. Outbox replay duration and main-thread blocking after reconnect.

These measurements should be collected from the production/minified build in a representative mobile browser/device.
