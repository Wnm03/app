# PATCH S1867 — Honda PDF Catalog Auto-Import

Satu tahap implementasi kumulatif untuk mengubah import katalog PDF Honda menjadi alur generik:

`PDF -> OCR/text quality gate -> metadata -> sections -> parts -> component mapping -> dry-run -> target vehicle -> commit`

## Perubahan utama

- `modules/vehicle/honda-pdf-catalog-auto-import.js`
  - generic analyzer
  - K61 metadata detection
  - page-aware parsing
  - component mapping confidence
  - dry-run
  - dynamic catalog persistence
  - target vehicle: active/existing/new-preflight
- `modules/vehicle/parts-catalog-database.js`
  - dynamic catalog registry dari IDB
  - KZRJ/K46 tetap backward-compatible
- `modules/vehicle/vehicle-catalog-import.js`
  - native text readability gate
  - OCR fallback untuk encoded/gibberish PDF
  - page-break markers
- `modules/vehicle/honda-pdf-import-ui.js`
  - tombol Auto Katalog
  - target vehicle selection
  - dry-run confirmation UI
- `scripts/build.js`
  - registrasi module baru
- tests + audit docs

## Data safety

- Tidak ada write pada dry-run.
- Service Master 102 komponen tidak diubah otomatis.
- Mapping ambigu/unmapped tidak difinalkan sebagai maintenance component.
- Katalog baru disimpan dinamis, bukan source JSON baru.

## Verification

Targeted regression: 63/63 PASS sebelum build final; regression S1864/S1865/S1866 dan parser PDF ikut PASS.
Build final: PASS, bundle syntax PASS, HTML/SW version sync PASS.

Catatan: environment tidak memiliki esbuild, sehingga bundle final valid tetapi belum diminify.
