# FIX v1011 — Sesi 347: Audit lanjutan window-expose, 30 modul lagi

## Konteks

Lanjutan Sesi 345 (car-notes.js) & Sesi 346 (13 modul). Root cause SAMA
PERSIS: `const Owner={...}` top-level di script biasa (bukan ES module)
hanya membuat binding lexical-scope, BUKAN properti `window` — sementara
dispatcher klik global (`features-helpers-global-security.js`) selalu
resolve `data-action="Owner.method"` lewat `window[Owner][method]`. Tanpa
`window.Owner=Owner`, semua tombol dengan `data-action` berbentuk
`"Owner.xxx"` di modul-modul ini gagal diam-diam (tidak ada error, tidak
ada toast).

## Metode audit

Full source-tree audit (bukan cuma ringkasan log sebelumnya) mencari semua
`const X={` top-level yang **juga** direferensikan lewat
`data-action="X.xxx"` di HTML/modal manapun, TAPI tidak punya baris
`window.X=X`. Ditemukan 30 modul (di luar 14 modul yang sudah diperbaiki
Sesi 345/346).

## Daftar modul & file

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

## Fix

Tiap file dapat satu baris tambahan tepat setelah deklarasi objeknya
selesai (`}` penutup + `;` kalau ada):

```js
if (typeof Owner !== 'undefined') window.Owner = Owner;
```

**Kecuali `DashboardHub`**, yang dapat guard lebih aman:

```js
if (typeof window !== 'undefined' && typeof DashboardHub !== 'undefined') window.DashboardHub = DashboardHub;
```

karena `DashboardHub` dites di sandbox vm tanpa global `window` sama sekali
(`tests/dashboard-hub-goto-subtab.test.js`) — guard biasa akan throw
`ReferenceError: window is not defined` di situ. Pola guard ini sudah ada
presedennya di `scanner-session.js` & `ai-core.js`.

## Catatan teknis insersi

- `Tukang` butuh `modules/business/reset-gaji-mingguan.js` (fungsi
  `getWeekRange`) dimuat sebelumnya — sama persis kasus `Payroll` di Sesi
  346.
- `RefAI` (`modules/finance/pajak-pbb-zakat.js`): objek ini punya method
  `_repairLooseJson`-style helper yang memakai regex literal berisi urutan
  backtick literal (mis. `/^```json\s*/i`). Titik penutup objek yang benar
  dikonfirmasi manual di baris 305 (`}\n};`), lalu `PajakUMKM` dimulai di
  baris 306.
- `LifeOSReview` (`lifeos/ui/review.js`): objek ini pendek (31 baris) tapi
  punya template literal bersarang — `${snapshots.wealth ? \`<div>...\` : ''}`
  di dalam template literal luar `el.innerHTML = \`...\``. Titik penutup
  objek dikonfirmasi manual di baris 31.
- 0 perubahan logic/routing lain di modul manapun — murni insersi satu
  baris exposure per modul.

## Test

`node --test tests/*.test.js` -> **2399/2399 pass, 0 fail** (2309 lama +
90 baru di `tests/window-expose-audit-s347.test.js`, 30 modul × 3
assertion: window.Owner ada, window.Owner === binding lexical, dispatcher
lookup method contoh berhasil resolve).

## Build

`node scripts/build.js s347-fix-window-expose-audit-30-modules` -> sukses,
`?v=1011`.

## File yang berubah

- 16 file source (lihat tabel di atas)
- `tests/window-expose-audit-s347.test.js` — baru, 90 test
- `docs/CHECKPOINT.md` — entri Sesi 347 ditambahkan
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  naik ke `s347-fix-window-expose-audit-30-modules`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=1010`
  -> `?v=1011`
