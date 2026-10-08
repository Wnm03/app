# PATCH — AUTO ESBUILD NATIVE RUNTIME / PRODUCTION GATE

## Tujuan

Menghilangkan kebutuhan langkah manual ketika GitHub Actions membangun production bundle.

## Perubahan

- `ci.yml`: locked install tetap memakai npm CI, optional dependencies dipastikan aktif, lalu native esbuild Linux x64 dipasang otomatis tanpa mengubah package-lock.
- `production-release.yml`: production gate otomatis memasang optional dependencies + `@esbuild/linux-x64@0.24.0`, memverifikasi `esbuild.transformSync()` sebelum build, lalu melanjutkan build/minification dan seluruh regression/integrity gates yang sudah ada.

## Alur otomatis

Push / Pull Request ke main
→ install dependencies
→ ensure native esbuild
→ verify native transform
→ `npm run build:release`
→ release-check
→ critical regression
→ full regression
→ system integrity gates
→ upload artifact jika semua PASS.

## Batasan perubahan

Patch ini tidak mengubah business logic, UI, SOT/domain logic, Service/Checklist, Finance, bundle source, maupun test suite aplikasi.

`package.json` dan `package-lock.json` sengaja tidak diubah. Native runtime dipasang di environment CI saja dengan `--package-lock=false`, sehingga tidak membuat perubahan dependency lokal/lockfile dari workflow.

## Verifikasi lokal patch

- YAML CI valid.
- YAML production workflow valid.
- `scripts/build.js` dan `scripts/build-core.js` tetap valid secara syntax.
