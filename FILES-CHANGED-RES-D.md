# FILES-CHANGED — Sesi Res-D (Regression & Release)

Relatif terhadap v1306 (`s576-pemilik-sumber-potongan-visibility`).
Semua perubahan di bawah adalah OUTPUT OTOMATIS `scripts/build.js`
(version-bump + regenerasi bundle) — **0 file source produksi (logic
bisnis) diedit manual sesi ini**.

## Version-bump / build artifacts (otomatis, via build.js)

| File | Perubahan |
|---|---|
| `app-bundle-a.min.js` | Regenerasi bundle (versi baru, TANPA minifikasi — esbuild tidak tersedia) |
| `app-bundle-b.min.js` | Regenerasi bundle (versi baru, TANPA minifikasi — esbuild tidak tersedia) |
| `app_production.html` | Disinkronkan ulang dari `index.html`, `?v=1306` → `?v=1307` |
| `index.html` | `?v=1306` → `?v=1307` |
| `sw.js` | `CACHE_NAME` → `kw-cache-v1307` |
| `chat-action-handlers.js` | Konstanta versi disamakan |
| `modules/shared/features-helpers-global-security.js` | `APP_BUILD_VERSION` → `s577-res-d-regression-release` |
| `modules/shared/modals.js` | `MODAL_VERSION` disamakan |
| `modules/shared/modules-calc.js` | `MODULE_CALC_VERSION` disamakan |
| `modules/shared/modules-render.js` | `MODULE_RENDER_VERSION` disamakan |
| `docs/FILE-MAP.md` | Regenerasi otomatis (306 file, 2138 identifier global) |
| `docs/COVERAGE-PER-MODULE.md` | Regenerasi otomatis (19 family) |
| `docs/RELEASE-GATE-LOG.md` | Entry baru (override lint/minify, alasan sandbox) |

## Dokumentasi baru sesi ini (bukan hasil build.js)

| File | Isi |
|---|---|
| `RES-D-IMPLEMENTATION-REPORT.md` | Laporan final Res-D (baseline, audit 9 kegagalan pre-existing, invariant check, gate) |
| `FILES-CHANGED-RES-D.md` | Dokumen ini |
| `CHANGELOG` | Entry baru untuk v1307 |

## TIDAK berubah (diverifikasi eksplisit)

- `modules/finance/akun.js` (`recalcAccBalance()`) — md5 identik pra/pasca build.
- `modules/finance/transaksi.js` (`deductionOwnerId`, Owner Resolver) — md5 identik.
- `modules/finance/dana-titipan-aggregation-api.js` (`DanaTitipanPortfolioAPI`,
  `titipanCommitments`) — md5 identik.
- Semua file source produksi lain di luar daftar version-bump di atas.
- `backups/` — backup bundle lama otomatis tersimpan (untracked, perilaku standar `build.js`), tidak masuk hitungan "berubah".
