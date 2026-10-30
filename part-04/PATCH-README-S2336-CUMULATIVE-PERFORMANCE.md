# Cumulative Patch S2336 — Performance

This archive accumulates the reviewed changes from S2333 through S2336 and includes only the changed application files plus the deletion manifest.

- S2333: coalesce viewport resize/orientation updates.
- S2334: reuse checklist stock options within a render.
- S2335: reuse one budget recommendation analytics snapshot.
- S2336: compute budget period context once per aggregation and preserve rollover calculations.

Build identity: `s2041-1-part-sot-hardening-2223` (`?v=2223`, service-worker cache `kw-cache-v2223`).

Validation completed: 43 selected tests pass; bundle freshness, performance budget, and ZIP integrity pass. The full suite and Android/WebView runtime profiling remain unconfirmed. The generated bundles are not minified because `esbuild` is unavailable in the current environment; this archive is **not release-ready**.

Apply this ZIP over the matching baseline. Keep `DELETE-FILES.txt` and process it with the project's delete-manifest workflow so `pro-ui-layer.css` is removed as intended. Upload all changed files together; do not upload only the HTML or service worker.
