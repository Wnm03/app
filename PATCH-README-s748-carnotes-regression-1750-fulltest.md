# Patch s748 — Merge kumulatif Car Notes 1730-1749 ke project penuh (Full Test File Patch)

## Apa isinya
Patch kumulatif Car Notes (1730-1749, sebelumnya cuma diverifikasi di
sandbox patch-only terpisah) sudah di-apply ke project penuh
`app-main (16).zip` dan diverifikasi ulang secara nyata sesuai
`docs/SESSION_RULES.md`. Berbeda dari patch 1730-1749 sebelumnya, ZIP
ini menyertakan FULL `tests/` directory (787 file) — bukan cuma test
yang berubah — supaya `node --test tests/*.test.js` bisa dijalankan
mandiri begitu ditimpa ke project.

## Verifikasi
- Full test suite: **6846/6846 PASS, 0 FAIL** (dijalankan 2x independen:
  sebelum build & sesudah build, hasil identik).
- Build: `node scripts/build.js s748-carnotes-regression-1750` sukses
  → `?v=1750`, `kw-cache-v1750`.
- `verify-window-expose.js`: PASS (82 modul).
- `verify-bundle-freshness.js`: PASS (kedua bundle segar).
- `verify-release-ready.js` gates: html-sync PASS, version-sync PASS,
  bundle-freshness PASS; lint & minify di-override (eslint/esbuild
  tidak terpasang, sandbox tanpa akses jaringan).
- `service-sot-integrity-gate.js` dijalankan LANGSUNG (1-level, bukan
  lewat `verify-release-ready.js` yang nested 3-level execSync): **PASS
  penuh**, termasuk sub-check "FULL REGRESSION (app-main tests)". Gate
  gabungan sempat FAIL kalau dipanggil nested lewat
  `verify-release-ready.js` — batasan proses bersarang di sandbox ini
  (pola sama dgn temuan sesi-sesi sebelumnya), bukan regresi kode; tidak
  memblokir rilis krn hasil test aktualnya identik (6846/6846 pass) di
  semua cara menjalankan.

## Cara pakai
Timpa semua file dalam ZIP ini ke folder project penuh (termasuk seluruh
isi `tests/`), lalu jalankan `node --test tests/*.test.js` untuk
konfirmasi independen.
