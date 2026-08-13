# Patch v1329 — fix duplikat Holding & aset hilang dari Buku Aset

## Bug
Aset yang sudah ditautkan manual ke Holding Investasi (`a.investmentId`, via
dropdown "🔗 Hubungkan ke Holding Investasi") ikut ke-anggap kandidat migrasi
otomatis oleh `migrateAssetInvestmentsToHoldings()` tiap `Aset.renderList()`
jalan → Holding duplikat terbuat (ROI +0.0%) & aset aslinya ditandai
`_migratedToInvestmentId` → hilang dari Buku Aset.

## Fix (1 baris, additive)
`modules/asset/aset-misc.js` — tambah `.filter(a=>!a.investmentId)` ke filter
kandidat migrasi, menyamakan pola exclude yang sudah dipakai di
`Aset.totalValue()`, `aset-keluarga.js`, `dana-kelolaan.js`,
`invest-ai-widget.js`, `property-management-api.js`.

## File berubah
- modules/asset/aset-misc.js (fix inti)
- app-bundle-a.min.js (hasil `node scripts/build.js`)
- app_production.html, index.html, sw.js (bump versi ?v=1329)
- modules/shared/modules-render.js, modals.js, modules-calc.js,
  features-helpers-global-security.js (sinkronisasi konstanta versi)
- docs/FILE-MAP.md, docs/COVERAGE-PER-MODULE.md (regenerasi otomatis)

## Verifikasi
- `node --test tests/*.test.js` → 4176/4176 pass, 0 regresi
- `node scripts/build.js` → sintaks bundle valid, versi tersinkron

## Catatan
Aset yang sudah kadung ke-migrasi duplikat SEBELUM patch ini tidak otomatis
dibersihkan (data lama tidak disentuh) — kalau ada holding duplikat lama,
hapus manual salah satunya lewat UI Investasi.
