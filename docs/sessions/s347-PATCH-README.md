# Patch s347 — Audit lanjutan: 30 modul lain juga hilang `window.Owner`

Lanjutan Sesi 346 (13 modul). Full source-tree audit menemukan 30 modul
tambahan dengan pola bug yang sama — `const Owner={...}` top-level tanpa
`window.Owner=Owner` — sehingga semua tombol dengan
`data-action="Owner.xxx"` di modul-modul ini gagal diam-diam:

| Modul | File |
|---|---|
| `Advisor`, `AIRecommendCard`, `AIStatusCard`, `AISimulateWidget`, `AIScenarioWidget`, `AIHealthCheckWidget`, `AIWidget` | `ai-chat.js` |
| `BudgetTabs`, `BudgetReko` | `budget.js` |
| `GoldImport`, `GoldZakat` | `modules/asset/aset-emas-impor.js` |
| `Tukang` | `modules/business/tukang-absensi.js` |
| `DashboardHub` | `modules/dashboard-hub/dashboard-hub.js` |
| `RefAI` | `modules/finance/pajak-pbb-zakat.js` |
| `Bill` | `modules/finance/piutang-utang.js` |
| `BillFallbackScan` | `modules/finance/tagihan-kalender.js` |
| `DanaDaruratAI`, `FinCoach` | `modules/shared/modules-calc.js` |
| `BillMultiScan`, `UniversalScan` | `modules/shared/scan-ocr.js` |
| `PriceReko`, `OngkirCalc`, `PriceRekoWidget`, `StockRekoWidget`, `WeightBulkWidget` | `modules/shop/cobek-pricing.js` |
| `LifeOSHome` | `lifeos/ui/lifeos-home.js` |
| `LifeOSLifeObjects` | `lifeos/ui/life-objects.js` |
| `LifeOSPlugins` | `lifeos/ui/plugins.js` |
| `LifeOSProjects` | `lifeos/ui/projects.js` |
| `LifeOSReview` | `lifeos/ui/review.js` |

**Fix**: tiap file di atas dapat satu baris tambahan tepat setelah
deklarasi objeknya selesai, mis. `if (typeof RefAI !== 'undefined')
window.RefAI = RefAI;`. **Kecuali `DashboardHub`**, yang dites di sandbox
vm tanpa global `window` sama sekali, jadi dapat guard lebih aman:
`if (typeof window !== 'undefined' && typeof DashboardHub !== 'undefined')
window.DashboardHub = DashboardHub;`. 0 perubahan logic/routing lain.
Detail root-cause & catatan teknis insersi (2 file butuh perbaikan tooling
brace-counting manual — `RefAI` krn regex literal berisi backtick literal,
`LifeOSReview` krn nested template literal):
`FIX-v1011-s347-window-expose-audit-30-modules.md`.

File lain dalam patch ini:
- `tests/window-expose-audit-s347.test.js` — 90 test regresi baru (30
  modul × 3 assertion).
- `docs/CHECKPOINT.md` — entri Sesi 347 ditambahkan di atas (Current
  Session).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js` (juga berisi fix `DanaDaruratAI` &
  `FinCoach`), `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  naik (`s346-...` -> `s347-fix-window-expose-audit-30-modules`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis
  (`node scripts/build.js`), `?v=1010` -> `?v=1011`.

Cara pakai: timpa semua file di atas di project kerja Anda dengan versi di
patch ini (struktur folder sama persis, termasuk yang bertumpuk dgn patch
s346 sebelumnya), lalu jalankan `npm test` untuk verifikasi (harus
2399/2399 pass). Tidak perlu jalankan `node scripts/build.js` lagi —
bundle & versi `?v=` di patch ini sudah hasil build final.

## Test

`node --test tests/*.test.js` -> **2399/2399 pass, 0 fail** (2309 lama +
90 baru), 2x (sebelum & sesudah build).

## Build

`node scripts/build.js s347-fix-window-expose-audit-30-modules` -> sukses,
`?v=1011`.
