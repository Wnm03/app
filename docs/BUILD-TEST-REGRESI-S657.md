# BUILD TEST & REGRESI — Patch S657 (sparepart-cat-vehicle-editable)

Dokumen ini adalah bukti verifikasi yang dijalankan terhadap isi patch ZIP
S657 sebelum dianggap siap pakai — dua lapis cek: **build test** (integritas
bundle/versi/gate rilis) dan **regresi test** (full test suite Node, bukan
cuma test baru sesi ini).

Metodologi: file patch (`modules/`, `tests/`, `app_production.html`,
`index.html`, `sw.js`, `chat-action-handlers.js`, bundle) diterapkan di atas
salinan bersih repo utama (working copy terpisah), lalu dijalankan skrip
verifikasi yang sama persis dengan yang dipakai sesi-sesi sebelumnya
(`scripts/verify-*.js`, `node --test`).

## 1. Regresi Test — Full Suite

```
node --test tests/*.test.js
```

- **Total test**: 4718 (naik dari baseline >4600 — bertambah karena
  `tests/sparepart-catmodal-vehicle-edit-audit.test.js` yang dibawa patch
  ini ikut ke-load)
- **Pass**: 4718
- **Fail**: 0
- **Cancelled/Skipped**: 0
- **Durasi**: ~46.3 detik

Tidak ada regresi terdeteksi di modul lain akibat perubahan
`modules/vehicle/sparepart-servis.js` (perilaku dropdown "Berlaku untuk
Kendaraan" saat edit kategori/stok sparepart).

## 2. Build Test — Gate & Integritas

| Cek | Hasil | Catatan |
|---|---|---|
| `verify-bundle-freshness.js` | ✅ LOLOS | Hash source `app-bundle-a.min.js` (`643c4cf8d79380a8`) & `app-bundle-b.min.js` (`7fd6da672329a8cc`) cocok — bundle di patch memang hasil build dari source terbaru, bukan basi. |
| `verify-window-expose.js` | ✅ LOLOS | 76 modul dipakai lewat `data-action`, semuanya sudah di-expose ke `window` (378 file di-scan). |
| `verify-release-ready.js` — GATE html-sync | ✅ LOLOS | `app_production.html` sinkron dgn `index.html`. |
| `verify-release-ready.js` — GATE version-sync | ✅ LOLOS | `index.html` (`?v=1392`) & `sw.js` (`CACHE_NAME`) sinkron. |
| `verify-release-ready.js` — GATE lint (eslint) | ⚠️ DI-OVERRIDE | eslint tidak bisa dijalankan di sandbox verifikasi ini (tanpa akses jaringan/registry npm) — pola override yang sama seperti sesi-sesi sebelumnya (lihat `docs/RELEASE-GATE-LOG.md`, mis. s607/s608/s621). |
| `verify-release-ready.js` — GATE minify (esbuild) | ⚠️ DI-OVERRIDE | esbuild tidak bisa di-install di sandbox verifikasi (tanpa akses jaringan) untuk memverifikasi ulang minifikasi. Bundle di patch **sudah** hasil minify dari environment sesi asal (build asli) — sandbox ini cuma tidak sanggup mem-build ulang, bukan berarti bundle-nya belum di-minify. |

Kedua override di atas mengikuti prosedur baku yang sudah dipakai berkali-kali
di sesi-sesi sebelumnya (dicatat di `docs/RELEASE-GATE-LOG.md` repo utama):
dijalankan dengan alasan eksplisit lewat env var, bukan di-skip diam-diam.

```
CONFIRM_LINT_UNAVAILABLE_REASON="sandbox tanpa akses jaringan, tidak bisa install eslint" \
CONFIRM_UNMINIFIED_REASON="bundle sudah minified dari environment sesi asal (esbuild), sandbox verifikasi ini tidak sanggup install eslint/esbuild (tanpa akses jaringan)" \
node scripts/verify-release-ready.js
```
Hasil: `✅ RELEASE GATE LOLOS — aman untuk lanjut bikin ZIP.`

## 3. Kesimpulan

Patch S657 **lolos build test & regresi test** — 0 test gagal dari 4718 test,
bundle segar/konsisten dengan source, tidak ada modul yang belum
di-window-expose, dan release gate lolos (2 gate di-override dengan alasan
sah karena keterbatasan sandbox jaringan, sama seperti preseden sesi-sesi
sebelumnya). Aman untuk diterapkan ke repo utama.
