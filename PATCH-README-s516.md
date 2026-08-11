# PATCH s515 → s516 (BUG-S516-001: Owner Picker Dana Titipan — Fix Escaping ownerId)

## Status

- **3374/3374 test PASS** (`node --test tests/*.test.js`), 0 gagal
  (3372 baseline v1249 + 2 baru sesi ini).
- `node scripts/build.js` sudah dijalankan: versi
  `s515-dana-titipan-owner-nominal-asset-kuota-porsi` →
  `s516-dana-titipan-owner-nominal-asset-kuota-porsi`, `?v=` **1249 →
  1250**, `CACHE_NAME` → `kw-cache-v1250`. `app_production.html` sudah
  disinkronkan.
- `node scripts/verify-bundle-freshness.js`: **OK** (hash source cocok
  kedua bundle).
- `node scripts/verify-window-expose.js`: **OK** (68 modul window-expose
  lengkap).
- `node scripts/verify-release-ready.js`: **LOLOS** (gate `html-sync`
  hijau otomatis; gate `lint`/`minify` di-override manual karena
  eslint/esbuild tidak bisa diinstall di sandbox tanpa akses jaringan —
  tercatat di `docs/RELEASE-GATE-LOG.md`, konsisten pola override
  sesi-sesi sebelumnya di project ini).
- Bundle unminified (esbuild tidak tersedia) — sintaks lolos
  `node --check`, valid dipakai, hanya lebih besar ukurannya.

## Bug ditemukan & diperbaiki sesi ini

`BUG-S516-001` — modal "💰 Pokok Dana Titipan"/"↩️ Catat Pengembalian"
gagal simpan dgn error menyesatkan "Owner tidak ditemukan pada daftar
pemilik investasi yang ada" utk owner yg `ownerId`-nya memuat karakter
HTML-sensitif (`"`, `'`). Root cause: `DanaTitipanCommitmentUI.open()`
menyuntik `ownerId` MENTAH (tanpa `escapeHtml`) ke atribut HTML — bukan
race condition/bundle basi seperti dugaan audit statis awal. Detail
lengkap: `FIX-v1249-to-v1250-s516-titipan-commitment-ownerid-escape.md`,
`docs/BUG_REGISTRY.md` (`BUG-S516-001`).

## Isi patch (S515 → S516)

| File | Sumber perubahan |
|---|---|
| `modules/finance/dana-titipan-portfolio-presenter.js` | Fix — `escapeHtml(o.ownerId)` di option value (`DanaTitipanCommitmentUI.open()`) + `escapeHtml(JSON.stringify([o.ownerId]))` di 2 tombol per-owner (`render()`) |
| `tests/s516-dana-titipan-commitment-ownerid-escaping.test.js` | **Baru** — 2 test regresi (escapeHtml ASLI, bukan stub) |
| `tests/s485d-titipan-commitment-ui.test.js` | 2 assertion lama diupdate mengikuti format `data-args` baru yg ter-escape |
| `docs/BUG_REGISTRY.md` | Entry baru `BUG-S516-001` (root cause, evidence, fix, verifikasi) |
| `CHANGELOG.md` | Entry baru Sesi 516 |
| `FIX-v1249-to-v1250-s516-titipan-commitment-ownerid-escape.md` | **Baru** — dokumentasi fix lengkap |
| `PATCH-README-s516.md` | Dokumen ini |
| `app-bundle-a.min.js`, `app-bundle-b.min.js` | Ditulis ulang oleh `build.js` (unminified) |
| `index.html`, `app_production.html` | `?v=1249` → `?v=1250` |
| `sw.js` | `CACHE_NAME` → `kw-cache-v1250` |
| `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`, `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`, `modules/shared/modals.js` | Bump string versi otomatis (`APP_BUILD_VERSION` dkk.) |
| `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md` | Ditulis ulang otomatis oleh `build.js`/`verify-release-ready.js` |
| `backups/app-bundle-{a,b}.min.s515-....js` | Backup bundle lama, ditulis otomatis oleh `build.js` |

## Cara apply patch

1. Extract ZIP patch ini ke atas working copy `v1249` (timpa file yang
   sama namanya).
2. Jalankan `node --test tests/*.test.js` — pastikan 3374/3374 pass.
3. Jalankan `node scripts/verify-bundle-freshness.js` — pastikan OK.
4. Upload SEMUA file yang berubah (lihat tabel di atas) ke hosting —
   **jangan cuma HTML/sw.js**, karena bundle JS juga berubah.
