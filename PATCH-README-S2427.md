# S2427 — Direct Build-Tool Version Contract

## Scope
Menutup variasi versi langsung toolchain release tanpa membuat lockfile palsu.

## Repair
- `package.json`: pin exact `eslint` ke `9.19.0`.
- `package.json`: pin exact `esbuild` ke `0.24.0`.
- Tambah regression guard untuk memastikan kedua direct build tools tidak kembali memakai `^`/`~` range.

## Important limitation
Exact direct pins **bukan pengganti lockfile**. Dependency transitive tetap belum reproducible sampai `package-lock.json` atau `npm-shrinkwrap.json` dibuat melalui environment dengan registry/cache yang valid.

## Validation
- S2426 dependency-lock contract: PASS.
- S2426 minify contract: PASS.
- S2427 direct version contract: PASS.
- S2427 no-fake-lock contract: PASS.
- Tidak ada Bundle-A/Bundle-B/HTML/SW regeneration pada sesi ini.

## Release blockers remaining
- package-lock/npm-shrinkwrap belum tersedia.
- eslint belum tersedia di environment.
- esbuild belum tersedia di environment.
- Bundle-B masih stale terhadap source.

## Policy
Jangan membuat `package-lock.json` secara manual atau mengklaim reproducible build sebelum lockfile benar-benar dihasilkan oleh npm dari dependency graph yang tervalidasi.
