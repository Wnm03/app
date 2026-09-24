# PATCH S1984 — versi tersinkron (cumulative)
Base: app-main__13_ (v1974). Cara pakai: extract ZIP ini menimpa root app-main (path relatif sudah sesuai).

Perubahan vs patch S1984 asli:
- Versi kanonik s1956-service-history-audit-package-1984 disinkronkan ke: modals.js, modules-render.js, modules-calc.js, chat-action-handlers.js, sw.js (kw-cache-v1984), index.html & app_production.html (?v=1984), app-bundle-a/b.
- Hash marker app-bundle-a diperbarui (120687bcc736e237); bundle-b tetap segar (8d252b7aef14f9f9).
- tests/servis-s1973-bundle-version-integrity.test.js: tidak lagi hardcode 1974, membaca APP_BUILD_VERSION kanonik.

Hasil: node --test tests/*.test.js => 7540/7540 PASS; verify-bundle-freshness, verify-version-integrity, verify-patch-integrity PASS.
Belum dilakukan (sandbox tanpa esbuild/eslint): minify ulang & lint. Jalankan `npm i && npm run build:release && npm run release-check` di lokal.
