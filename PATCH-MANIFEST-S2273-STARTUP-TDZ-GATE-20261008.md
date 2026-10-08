# Patch S2273 — Startup IIFE TDZ / Load-Order Gate

## Scope
Mencegah regresi kelas bug startup yang terjadi ketika top-level IIFE dieksekusi saat bundle sedang dimuat lalu membaca `const`/`let`/`class` yang baru dideklarasikan pada file berikutnya atau setelah IIFE dalam file yang sama.

Patch ini **bukan full source/release** dan tidak mengubah business logic aplikasi.

## Changed / support files
- `scripts/audit-startup-load-order.js` — audit statis runtime source order; hanya memeriksa top-level IIFE dan immediate execution layer.
- `scripts/build-lints.js` — mendaftarkan audit sebagai blocking build lint `startup-load-order-tdz`.
- `tests/startup-load-order-tdz.test.js` — regression tests: cross-file TDZ, same-file TDZ, hoisted function false-positive guard, dan current GROUP_A/GROUP_B baseline.

## Validation
- `node scripts/audit-startup-load-order.js` → PASS (412 runtime sources scanned)
- startup lint via build lint registry → PASS
- `node -c scripts/audit-startup-load-order.js` → PASS
- `node --check app-bundle-a.min.js` → PASS
- `node --check app-bundle-b.min.js` → PASS
- targeted build/residency/startup tests → 8/8 PASS
- full `npm test` was started but exceeded the 120s execution window; no final full-suite total is claimed.

## Audit result
No current confirmed startup lexical-TDZ dependency remains in GROUP_A/GROUP_B.
