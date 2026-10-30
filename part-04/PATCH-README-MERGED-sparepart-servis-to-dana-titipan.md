# Patch Gabungan: split-sparepart-servis + split-transaksi + split-scan-ocr + split-dana-titipan-portfolio-render

Gabungan 4 patch sesi audit ukuran file (backlog sekarang TUNTAS), jadi
1 zip berisi HANYA file yang berubah lintas 4 sesi tsb -- tidak ada
file yang hilang, versi tiap file diambil dari state PALING BARU
(state akhir setelah sesi ke-4).

## Isi (45 file)

### 4 file split (masing-masing jadi 2 file, total 8):
- `modules/vehicle/sparepart-servis.js` + `sparepart-servis-b.js` (baru)
- `modules/finance/transaksi.js` + `transaksi-b.js` (baru)
- `modules/shared/scan-ocr.js` + `scan-ocr-b.js` (baru)
- `modules/finance/dana-titipan-portfolio-render.js` +
  `dana-titipan-portfolio-render-b.js` (baru)

### File infrastruktur (versi final, sudah kumulatif 4 sesi):
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `app_production.html`, `index.html`, `sw.js`
- `scripts/build.js`
- `docs/CLAUDE.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md`,
  `docs/RELEASE-GATE-LOG.md`

### 33 file test yang disesuaikan (union dari 4 sesi, tidak overlap):
3 dari sesi sparepart-servis, 11 dari sesi transaksi, 3 dari sesi
scan-ocr, 12 dari sesi dana-titipan-portfolio-render (lihat masing2
`PATCH-README-split-*.md` di bawah untuk detail per file).

### 4 PATCH-README asli (disertakan lengkap, untuk jejak audit per sesi):
- `PATCH-README-split-sparepart-servis.md`
- `PATCH-README-split-transaksi.md`
- `PATCH-README-split-scan-ocr.md`
- `PATCH-README-split-dana-titipan-portfolio-render.md`

## Verifikasi

- `node --test tests/*.test.js` -> **4857/4857 pass** (state final,
  sama dengan hasil tiap sesi individual -- tidak ada regresi
  kumulatif).
- Build final: versi `s678-cashflow-siklus-legacy-card`, `?v=1425`.
- Lint "file kegedean" (ambang 1600 baris): **0 file aktif** --
  backlog 4 file (transaksi.js, sparepart-servis.js, scan-ocr.js,
  dana-titipan-portfolio-render.js) semua sudah lepas dari daftar.
- Release gate tiap sesi: **LOLOS** (html-sync & version-sync lolos
  murni; lint/minify eslint/esbuild di-override, sandbox tanpa akses
  jaringan).

## Cara pakai

Timpa semua file di atas ke posisi yang sama di repo produksi (folder
struktur di dalam ZIP ini sudah persis sama dengan struktur repo),
lalu:
```
npm test          # harus 4857 pass, 0 fail
npm run build     # opsional -- bundle & versi di ZIP ini sudah hasil build sesi terakhir
```
