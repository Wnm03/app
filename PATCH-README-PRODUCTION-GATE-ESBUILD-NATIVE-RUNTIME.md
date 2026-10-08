# Production Gate Fix — esbuild native runtime

## Root cause

GitHub Actions production gate gagal pada `scripts/build.js:521` saat `buildBundle()` memanggil `esbuild.transformSync()`. Baseline hanya mengunci paket `esbuild@0.24.0` di `devDependencies`, tetapi `package-lock.json` tidak membawa paket binary platform-specific `@esbuild/linux-x64@0.24.0`.

Akibatnya `require('esbuild')` dapat lolos preflight, tetapi transform pertama gagal saat binary native dibutuhkan. Ini menjelaskan kenapa stack trace berhenti di `buildBundle()` dan bukan di pengecekan `require('esbuild')`.

## Perbaikan

1. `package.json`
   - Menambahkan `@esbuild/linux-x64@0.24.0` sebagai `optionalDependencies` untuk runner Linux CI/production.
2. `package-lock.json`
   - Menambahkan entry terkunci lengkap untuk `@esbuild/linux-x64@0.24.0`, termasuk integrity, CPU, OS, dan optional flag.
3. `scripts/build.js`
   - Preflight `--require-minify` sekarang melakukan `esbuild.transformSync()` minimal.
   - Missing native runtime akan gagal **sebelum** generate/version bump, dengan pesan yang langsung menunjuk ke binary platform-specific.
4. `tests/s2427-direct-build-tool-version-contract.test.js`
   - Menambahkan regression contract agar lockfile tidak kembali kehilangan native runtime.

## Batas perubahan

Patch ini tidak mengubah business logic, UI, data, SOT, service/checklist, finance taxonomy, atau bundle production. Hanya toolchain/release-gate reliability yang disentuh.

## Verifikasi lokal

- `node --check scripts/build.js` — PASS.
- `node --test tests/s2427-direct-build-tool-version-contract.test.js` — PASS.
- `package.json` dan `package-lock.json` valid JSON.
- Bundle tidak diregenerasi di patch ini karena environment audit tidak memiliki native esbuild runtime yang terkunci.

## Release verification wajib di GitHub Actions

Setelah patch diterapkan ke baseline, jalankan ulang production gate. Expected: `npm install`/`npm ci` memasang `@esbuild/linux-x64@0.24.0`, preflight menampilkan `esbuild + native runtime siap`, lalu build production melanjutkan ke minifikasi A/B.
