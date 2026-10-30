# Sesi s616 — Rebuild bundle (BASI, blok tab Investasi masih tidak respon)

## Diagnosis
`node scripts/verify-bundle-freshness.js` pada zip yang diupload:
- ❌ app-bundle-a.min.js BASI (hash source 21ea5bee4b98865d != hash tertanam 624e6c6a803d2778)
- ❌ app-bundle-b.min.js BASI (hash source 163726d3bc198485 != hash tertanam 8d25c862ebed5ff2)

Pola identik dengan sesi s612 sebelumnya: source sudah berubah (termasuk fix-fix
Investasi dari patch-patch sebelumnya: try/catch InvestmentWatchUI.render(),
PropertyManagementAPI taxSummary/depreciationSummary, dll) tapi bundle yang
dideploy ke HP/hosting tidak pernah dibangun ulang dari source terbaru. Browser
menjalankan JS lama -> semua fix logic yang sudah dipatch tidak pernah benar-benar
jalan -> gejala "tab Investasi masih tidak respon meski sudah beberapa patch".

0 bug baru ditemukan di source investasi*.js — murni bundle-source mismatch.

## Fix
`node scripts/build.js` dijalankan penuh:
- Rebuild app-bundle-a.min.js & app-bundle-b.min.js dari source terkini.
- Versi: s615 -> s616, ?v=1459 -> ?v=1460, CACHE_NAME sw.js -> kw-cache-v1460.
- verify-bundle-freshness.js setelah rebuild -> kedua bundle segar.
- node --test tests/*.test.js -> 4920/4920 pass, 0 fail.

## File yang berubah (upload SEMUA, jangan cuma HTML/sw.js)
- app-bundle-a.min.js, app-bundle-b.min.js
- index.html, app_production.html, sw.js
- modules/shared/modules-render.js, modules/shared/modals.js,
  modules/shared/modules-calc.js, modules/shared/features-helpers-global-security.js
- chat-action-handlers.js
- docs/FILE-MAP.md, docs/COVERAGE-PER-MODULE.md

## Setelah upload
Tutup total PWA di HP (bukan minimize) -> buka lagi 2x berturut-turut supaya
Service Worker baru (kw-cache-v1460) benar-benar mengambil alih dari cache lama.

## Rekomendasi jangka panjang
Supaya kejadian ini tidak berulang tiap sesi: jalankan
`node scripts/verify-bundle-freshness.js` sebagai langkah WAJIB terakhir sebelum
setiap kali upload/deploy, bukan hanya setelah sesi yang secara eksplisit
mengedit file investasi. Bisa juga ditambahkan sebagai pre-deploy check di
release.sh.
