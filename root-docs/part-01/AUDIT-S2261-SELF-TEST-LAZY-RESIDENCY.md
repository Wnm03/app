# S2261 — Self-Test Harness Lazy Residency

## Temuan
`self-test.js` adalah harness diagnostik internal, bukan runtime domain. Sebelumnya file 57,909 bytes berada eager di GROUP_B walaupun case registry sudah lazy sejak S2254.

## Perbaikan
- `self-test.js` dikeluarkan dari `GROUP_B`.
- Ditambahkan `ensureSelfTest()` menggunakan `_loadScriptOnce()` dengan dedup/retry semantics yang sama dengan loader lain.
- `runSelfTest` dan `copySelfTestResults` diarahkan ke `ensureSelfTest()`.
- Auto-run tetap dipertahankan pada kontrak 2,5 detik setelah bootstrap; timer sekarang berada di `boot-early.js`, memuat harness terlebih dahulu lalu memanggil `autoRunSelfTestIfNeeded()`.
- Case modules S2254 tetap lazy melalui `ensureDiagnosticCases()`.

## Verifikasi
- GROUP_B: 369 -> **362 files**
- Raw GROUP_B source: 5,083,334 -> **4,968,737 bytes**
- Bundle-B generated: **4,983,817 bytes raw/unminified**
- Targeted residency/build tests: **10/10 PASS**
- Bundle freshness: PASS
- Window expose: PASS
- Release minification: BLOCKED only because esbuild is unavailable in this environment.
