# S1786 — Application Single Source of Truth (SoT) Hardening

## Tujuan
Menetapkan batas yang eksplisit antara source runtime dan generated artifacts agar tidak ada lagi versi/build artifact yang dapat menjadi sumber kebenaran secara tidak sengaja.

## Perubahan
- `modules/shared/features-helpers-global-security.js` ditegaskan sebagai satu-satunya owner `APP_BUILD_VERSION` aplikasi.
- `scripts/build-core.js` tidak lagi memilih versi tertinggi dari HTML/SW/bundle; `detectCurrentVersion()` membaca canonical source saja.
- `scripts/sot-integrity-gate.js` memverifikasi:
  - `GROUP_A/GROUP_B` di `scripts/build.js` sebagai manifest runtime canonical, unik dan seluruh file tersedia;
  - canonical `APP_BUILD_VERSION` + `PRODUCTION_BUILD_SYNCED_VERSION`;
  - `index.html` sebagai HTML SoT dan `app_production.html` sebagai mirror generated;
  - `sw.js` cache version sinkron;
  - bundle source-hash marker tersedia;
  - runtime HTML tidak merujuk archive `docs/*`.
- `scripts/verify-release-ready.js` sekarang menjalankan App SoT gate sebagai blocking gate.
- `npm run audit:sot` ditambahkan.
- 3 regression test S1786 ditambahkan.
- 17 retired Theme Pro files dari `DELETE-FILES.txt` benar-benar dihapus dari reconstructed active source saat audit; kontrak penghapusannya tetap berasal dari patch S1785.

## Audit hasil
- App SoT: PASS — 353 runtime source entries, unique.
- Canonical version: `s1783-final-reliability-1766`.
- HTML/SW: `1766` sinkron.
- Bundle freshness: A/B PASS.
- Car Notes integrity: PASS — forbidden 0, duplicate ID 0, `Servis` declaration 1.
- Service SoT: PASS.
- Runtime lifecycle: PASS.
- Full regression: **6839/6839 PASS**, 32 shard, concurrency 1.
- Full regression: **6839/6839 PASS**, 32 shard, concurrency 8.
- S1786 tests: **3/3 PASS**.

## Environment-only release gates
`verify-release-ready.js` masih exit 1 hanya karena:
- `eslint` tidak tersedia di sandbox;
- `esbuild` tidak tersedia sehingga bundle existing belum minified.

Keduanya bukan failure kode aplikasi dan tidak di-override dalam patch ini.
`self-test.js` 2701 baris tetap menjadi warning maintainability dan tidak dinaikkan guard cap.
