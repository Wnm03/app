# Sesi 251 — Lanjutan Tab "Business Intelligence" Shop

## Ringkasan

Permintaan: lanjutkan pengembangan tab **Business Intelligence** di Shop
(dibuat Sesi 250) dengan menambahkan 5 kemampuan baru — Business Health
Score (0-100), Decision Panel (Restock/Pricing/Inventory/Supplier), Trend
Analytics (7/30 hari), Executive Summary (Hari/Minggu/Bulan/Tahun), AI
Insight (maks. 3 rekomendasi) — **read-only**, **zero business logic
baru**, **zero field `D` baru**, **100% reuse** engine/presenter yang
sudah ada, **zero regression**.

## Pendekatan

Sesi 250 sudah memindahkan 3 presenter (`ShopBusinessEnginePresenter`,
`TripPresenter`, `BusinessFlowPresenter`) ke tab ini. Audit menemukan
`BusinessFlowPresenter` sudah punya hampir semua bahan baku yang
dibutuhkan (`businessKPI()`, `costPricingKPI()`, `loadCostKPI()`,
`aiDecisionSummary()`, `recommendation()`), dan `ProfitEngine.summarize()`/
`.margin()` sudah jadi satu-satunya sumber kebenaran omzet/untung/margin.
Sesi ini menambahkan **satu presenter baru murni** —
`BusinessIntelligencePresenter` — yang **hanya merangkai ulang** (repackage)
angka-angka yang sudah dihitung presenter/engine di atas, sama persis pola
"presenter di atas presenter" yang sudah dipakai `BusinessFlowPresenter`
sendiri (S205) dan `FinancialRiskDashboardPresenter` (S99).

## File yang diubah

| File | Perubahan |
|---|---|
| `modules/shop/business-intelligence-presenter.js` | **BARU.** `BusinessIntelligencePresenter` — implementasi 5 kemampuan (lihat detail di bawah), 100% reuse, 0 rumus baru, 0 field D baru, `render()` read-only (tidak pernah memanggil `save()`). |
| `scripts/build.js` | Tambah `'modules/shop/business-intelligence-presenter.js'` ke `GROUP_B`, langsung setelah `business-flow-presenter.js` (0 forward-reference — semua sumbernya sudah dimuat lebih dulu). |
| `index.html` | Tambah 5 section baru di **awal** `#shopTab-bi` (sebelum 3 wrap lama Sesi 250): `#biHealthScoreWrap`, `#biDecisionPanelWrap`, `#biTrendWrap`, `#biExecSummaryWrap`, `#biAiInsightCard`. **Semua pakai class CSS yang SUDAH ADA** (`dashhub-wrap`, `dashhub-cat-head`, `findash-grid`, `findash-card`, `u-fs12`/`u-t2`/`u-lh15`/`u-mb8`) — **0 CSS baru ditulis**. |
| `app_production.html` | Auto-regenerated (salinan persis `index.html`) oleh `node scripts/build.js` — tidak diedit manual. |
| `modules/shop/cobek-io.js` | `setShopTab()`: tambah panggilan `BusinessIntelligencePresenter.render()` di blok `if(t==='bi')`, setelah 3 panggilan render() Sesi 250 yang sudah ada. |
| `modules/shared/modules-render.js` | Tambah `_safeRender('BusinessIntelligencePresenter', ...)` di siklus render global, pola sama persis 3 presenter Business Intelligence lain (supaya tab tetap live-update kalau data disimpan dari halaman lain). |
| `tests/business-intelligence-presenter.test.js` | **BARU.** 18 test — `healthScore()`, `decisionPanel()` (4 sub-fungsi), `trend()`, `executiveSummary()` (4 sub-field), `aiInsight()`, `render()`. Pola `loadSource` sama persis `tests/business-flow-presenter.test.js`. |
| `docs/SESI-251-BUSINESS-INTELLIGENCE-EXTENSION.md` | Dokumen ini. |

## Yang TIDAK diubah (sengaja)

- **0 baris logic diubah** di `ProfitEngine`, `InventoryEngine`,
  `PurchaseEngine`, `TripEngine`, `ShopBusinessEnginePresenter`,
  `TripPresenter`, `BusinessFlowPresenter`, `ShopInsight`, atau
  `OwnershipEngine`. Semua fungsi ini dipanggil **apa adanya**.
- **0 field `D` baru.** Tidak ada properti baru ditulis ke `D.products`,
  `D.cobek`, atau `D.produsen` — presenter baru ini murni **membaca**
  (read-only) dan mengelompokkan data yang sudah tersimpan.
- **0 CSS baru.** Semua 5 section baru pakai class generik yang sudah
  dipakai berulang di seluruh app (`findash-grid`/`findash-card`/
  `dashhub-wrap`, dst).
- `#shopTab-laporan` dan 3 wrap lama (`shopBusinessEngineWrap`/
  `tripPresenterWrap`/`businessFlowWrap`) — tidak disentuh, tetap seperti
  Sesi 250, cuma sekarang diikuti 5 section baru di atasnya.

## Detail implementasi (5 kemampuan)

### 1. Business Health Score (0–100)
Komposit 4 komponen, bobot 25 masing-masing, **pola bobot sama persis**
`FinanceIntelligence.healthScore()` (skor diskalakan ulang dari bobot yang
benar-benar tersedia):
- **Margin** — dari `BusinessFlowPresenter.businessKPI().marginPctBulanIni` (full skor di margin ≥20%, ambang yang sama dipakai `recommendation()` untuk status "sehat").
- **Restock** — dari `businessKPI().purchaseStatus` (`clear` = 25, `pending` = 0).
- **Pricing** — dari `costPricingKPI()`: proporsi trip yang TIDAK bermargin tipis (<10%, ambang yang sama dipakai `_recommendationCompute()`).
- **Delivery** — dari `loadCostKPI()`: proporsi trip yang efisien (omzet/ongkir ≥ 3x, ambang yang sama dipakai `loadCostKPI()`).

### 2. Decision Panel
4 kartu, semuanya derivasi ambang dari data yang sudah dihitung:
- **Restock** ← `ShopBusinessEnginePresenter.summary().purchase` apa adanya.
- **Pricing** ← `BusinessFlowPresenter.costPricingKPI()` apa adanya.
- **Inventory** ← `summary().inventory` + "potensi margin stok" pakai `ProfitEngine.margin()` (fungsi margin generik yang sudah ada, dipanggil atas 2 angka yang sudah dihitung — bukan rumus baru).
- **Supplier** ← `InventoryEngine.restockScan()` × `PurchaseEngine.produsenPrice()` (lookup harga per-produsen yang sudah tersimpan di `product.hargaByProdusen`) — mencari produsen termurah untuk produk yang perlu direstock. 0 rumus baru selain `Math.min()` atas harga yang sudah ada.

### 3. Trend Analytics (7/30 hari)
`D.cobek` (ownership SELF, pola S194) dikelompokkan per tanggal dalam
window 7/30 hari terakhir; **tiap bucket harian & totalnya dihitung lewat
`ProfitEngine.summarize()` yang sama** — satu-satunya fungsi omzet/untung/
margin di seluruh app, dipakai ulang apa adanya per bucket.

### 4. Executive Summary (Hari/Minggu/Bulan/Tahun)
- **Bulan** — 100% reuse `BusinessFlowPresenter.businessKPI()` apa adanya (0 recompute).
- **Minggu** — reuse `trend(7).total` langsung (metodologi bucket sama persis Trend Analytics, bukan filter baru).
- **Hari** & **Tahun** — filter `D.cobek` (SELF) per rentang tanggal, dihitung lewat `ProfitEngine.summarize()` yang sama.

### 5. AI Insight (maksimal 3)
100% reuse `ShopInsight.compute()` (`modules/ai/feature-insights.js`) —
**0 rule/insight baru ditulis**. Hasilnya diurutkan berdasar level
(`danger` > `warning` > `good` > `info`) lalu dipotong ke 3 teratas, supaya
konsisten dengan sumber yang sama dipakai kartu "💡 Insight Bisnis Shop"
yang sudah ada di halaman Etalase (satu sumber angka, tidak ada
duplikasi rule).

## Verifikasi

- `npm test` → **1190/1190 pass** (1172 lama + 18 test baru), 0 fail — dijalankan sebelum & sesudah `node scripts/build.js`.
- `node scripts/build.js` → lolos semua lint bawaan (u-dnone/style.display mismatch, escapeHtml, OCR chicken-egg guard), sintaks kedua bundle valid, `app_production.html` disamakan ulang dengan `index.html` (md5 identik), versi naik ke `sesi249-dana-titipan-aset-5` / build `753`.
- Cek manual: tag `<div>` di seluruh `index.html` seimbang (1756 buka / 1756 tutup) setelah semua edit.
- Cek manual: `#biHealthScoreGrid`, `#biDecisionPanelGrid`, `#biTrendGrid`, `#biExecSummaryGrid`, `#biAiInsightBody` masing-masing muncul **tepat 1 kali** (tidak ada duplikasi DOM).
