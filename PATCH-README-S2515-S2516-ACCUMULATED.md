# PATCH S2515-S2516 — ACCUMULATED

Patch ini berbasis langsung pada baseline baru `app-main (8)` dan mempertahankan fix yang sudah ada di baseline, sambil memulihkan hardening yang ternyata hilang serta menambahkan optimasi PWA.

## Perubahan
- S2515: navigation paint-first + deferred presenter + stale render sequence guard + render revision cache.
- S2515: storage monitor adaptive/visibility-aware, dari 60s polling menjadi 5 menit foreground-only.
- S2512: bootstrap watchdog 15s diagnostic / 30s hard timeout.
- S2461/S2516: restore diagnostic helper + reconciliation payload + mobile persistence + cleanup lifecycle.
- Regression tests S1924/S2322/S2451 diselaraskan dengan kontrak terbaru.
- Test baru S2512, S2515, S2516.
- Bundle/HTML/SW dibangun ulang pada version 2238.

## Deployment
Upload semua file pada patch sebagai satu batch. Jangan mencampur bundle 2238 dengan HTML/SW versi lama.

## Validation
40/40 targeted regression PASS; SOT/architecture/persistence/PWA/runtime/bundle gates PASS.
Full repository test belum tersertifikasi karena test runner melewati batas waktu environment.
