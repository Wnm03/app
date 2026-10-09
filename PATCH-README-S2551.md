# S2551 — kumulatif di atas S2550 (fuel visibility Car Notes)

Base: app-main__8_ + patch-s2550. Tanpa perubahan kode produksi; bundle tidak di-rebuild.

- DELETE-FILES.txt dibuat kumulatif (pro-ui-layer.css, modules/shop/modules-render.js, collect-app-globals.js).
- tests/s2420-cwd-relative-test-contract.test.js: regex runner menerima `--test-reporter=tap`.
- e2e/run-e2e.js + e2e/README.md + script `test:e2e` (opt-in). Patch s2550: 11/11; baseline tanpa patch: 3/11.

Belum dikerjakan (menunggu keputusan): kelompok D (CI vs tes: npm ci), kelompok E (triase per tes), kelompok A (tes teks bundle minify; butuh helper VM/skeleton).
