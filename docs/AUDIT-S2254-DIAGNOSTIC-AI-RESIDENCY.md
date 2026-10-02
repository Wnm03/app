# S2254 — Diagnostic + AI Residency Audit

## Scope

Audit ulang sesi sebelumnya dari baseline `app-main (47)` / S2253. Fokus pada pengurangan residency startup Bundle-B tanpa mengubah SOT, persistence, lifecycle, atau kontrak runtime.

## Evidence

- `self-test.js` tetap eager karena `showMain()` menjadwalkan `autoRunSelfTestIfNeeded` setelah 2.5 detik. Mengeluarkannya dari GROUP_B tanpa mengganti kontrak ini akan mengubah perilaku startup.
- `modules/shared/self-test-cases-a.js` dan `modules/shared/self-test-cases-b.js` hanya menyediakan definisi test case yang dikonsumsi oleh runtime diagnostik. Keduanya dipindahkan menjadi lazy-loaded sebelum `computeSelfTestResults()` berjalan.
- `modules/ai/ai-service.js` tetap eager. `modules/shared/app-init-runtime.js` memanggil `AIService.wireEvents()` pada boot; memindahkannya tanpa refactor lifecycle akan mengubah wiring startup.
- `feature-insights.js`, `ai-core.js`, dan `ai-decision-engine.js` juga tidak dipindahkan pada sesi ini karena consumer graph lintas dashboard/cross-feature belum memenuhi bukti aman untuk lazy residency.

## Implementation

1. Hapus dua diagnostic case files dari `scripts/build.js` GROUP_B.
2. Pertahankan `self-test.js` di GROUP_B.
3. Tambahkan `ensureDiagnosticCases()` di `modules/shared/boot-early.js`, memakai `_loadScriptOnce()` dengan urutan A → B.
4. `runSelfTest()`, `copySelfTestResults()`, dan `autoRunSelfTestIfNeeded()` memastikan case modules sudah tersedia sebelum digunakan.
5. Dispatcher `data-action` mengenali `runSelfTest`/`copySelfTestResults` sebagai lazy owners dan mendukung action global satu-segment.

## Measured impact

- GROUP_B entries: 384 → 369.
- Raw GROUP_B source: sekitar 5.382 MB → sekitar 5.122 MB.
- Bundle-B fallback unminified: 5,398,399 B → recalculated after S2253 residency + S2254 diagnostic exclusions.
- Pengurangan bundle fallback: 122,652 B (~2,27%).
- Tidak ada source diagnostic yang dihapus; hanya residency startup yang diubah.

## Verification

- `node --check` modified JS: PASS.
- S2254 contract: PASS.
- `verify-bundle-freshness.js`: PASS.
- Bundle-B rebuilt from canonical `scripts/build.js` with current GROUP_B; still unminified because esbuild is unavailable in sandbox.

## Non-goals

- Tidak memindahkan AIService.
- Tidak memindahkan Finance/SOT/Database.
- Tidak menaikkan performance budget.
- Tidak mengklaim ukuran production minified final sebelum build environment dengan esbuild tersedia.


## Chain correction (re-audit from app-main 47)
The first S2254 replay accidentally reintroduced the 14 S2253 lazy vehicle/catalog entries and removed `feature-lazy-loader.js` from GROUP_A. The corrected chain restores the S2253 exclusions and keeps the two diagnostic case exclusions. Correct GROUP_B count is 369. S2252/S2253 contracts were refreshed accordingly.
