# Sesi 250 — Pindahkan "Alur Bisnis Shop" dari Beranda ke Shop (tab Business Intelligence)

## Ringkasan

Permintaan: pindahkan card **"Alur Bisnis Shop"** dari Beranda (Dashboard Hub)
ke Shop, sebagai tab baru **Business Intelligence** — read-only, tanpa
mengubah business logic/perhitungan engine, tanpa field `D` baru, tanpa
duplikasi data, zero regression.

### Temuan penting sebelum eksekusi

Card "Alur Bisnis Shop" di Beranda (`#businessFlowWrap`) ternyata **sudah
disembunyikan lewat CSS** (`display:none!important`) sejak sesi dedup
sebelumnya (`DASHBOARD-DEDUP.md` fix #1), bersama 2 widget saudaranya:
`#shopBusinessEngineWrap` (Purchase/Inventory/Profit) dan
`#tripPresenterWrap` (Trip/Transport). Ketiganya bersama-sama persis
mencakup 9 item yang diminta (Purchase, Inventory, Trip/Transport, Sales,
Profit, Pricing, KPI, Decision, Business Health — via kartu KPI/Decision).
Karena itu ketiganya dipindah bersamaan (bukan cuma 1 card) supaya tab
Business Intelligence benar-benar lengkap, bukan cuma memindah 1/3 dari
apa yang dulunya sudah 100% siap tapi tersembunyi.

## File yang diubah

| File | Perubahan |
|---|---|
| `index.html` | (1) Hapus 3 wrap (`shopBusinessEngineWrap`/`tripPresenterWrap`/`businessFlowWrap`) dari `#page-dashboard-hub`, ganti dengan card ringkas `#shopMiniSummaryWrap` (Omzet/Profit/Stok Menipis + tombol "Buka Shop"). (2) Tambah tombol tab baru "🧠 Business Intelligence" di `.cn-tabs` Shop. (3) Tambah container tab baru `#shopTab-bi` di `#page-shop`, isinya = 3 wrap yang dipindah **verbatim** (id/class/markup tidak berubah). |
| `app_production.html` | Auto-regenerated (salinan persis `index.html`) oleh `node scripts/build.js` — tidak diedit manual. |
| `styles.css` | Hapus 2 selector dari rule dedup lama: `#shopBusinessEngineWrap,#tripPresenterWrap,#businessFlowWrap{display:none!important}` → tinggal `#danaKelolaanWrap{display:none!important}` (Dana Kelolaan tetap tersembunyi di Beranda, di luar scope). |
| `modules/shop/cobek-io.js` | `setShopTab()`: tambah `'bi'` ke daftar tab key yang di-toggle, dan panggil `ShopBusinessEnginePresenter.render()` / `TripPresenter.render()` / `BusinessFlowPresenter.render()` saat tab `bi` dibuka (pola sama seperti tab `laporan` memanggil `Laporan.renderTab()`). |
| `modules/dashboard-hub/dashboard-hub.js` | Tambah presenter baru `ShopMiniSummary` (setelah `DashboardHubOwnershipSummary`) — 100% reuse `ShopBusinessEnginePresenter.summary()`, mengisi `#shopMiniSummaryGrid` dengan 3 angka (Omzet/Profit/Stok Menipis). Update komentar lama di `DashboardHub.render()` yang menyebut dedup CSS-hide (sudah tidak akurat, diperbarui menjadi catatan migrasi Sesi 250). |
| `modules/shared/modules-render.js` | Tambah `_safeRender('ShopMiniSummary', ...)` di siklus render global (pola sama presenter lain). |
| `docs/SESI-250-BUSINESS-INTELLIGENCE-MIGRATION.md` | Dokumen ini. |

## Yang TIDAK diubah (sengaja)

- `modules/shop/business-flow-presenter.js`, `modules/shop/shop-business-engine-presenter.js`,
  dan file engine (`purchase-engine.js`, `inventory-engine.js`, `profit-engine.js`,
  `trip-engine.js`) — **0 baris logic/rumus diubah**.
- `#shopTab-laporan` (tab "📊 Laporan" yang sudah ada di Shop, berisi ringkasan
  teks 1 baris `#businessFlowCard`/`#shopBizEngineCard`/`#tripPresenterCard`) —
  tidak disentuh, tetap seperti sebelumnya (bukan bagian dari permintaan).
- Tidak ada field `D` baru, tidak ada tabel/engine baru, tidak ada perhitungan
  yang di-duplikasi (semua kartu di tab Business Intelligence membaca ulang
  `summary()`/`render()` yang sama persis seperti sebelumnya, cuma kontainer
  DOM-nya pindah lokasi + dipicu render tambahan saat tab dibuka).

## Isi tab "Business Intelligence" (Shop)

Dipetakan dari 3 wrap yang dipindah (tidak ada kartu baru dibuat):

- **Shop Business Engine** → Purchase, Inventory, Profit (`ShopBusinessEnginePresenter`)
- **Pengiriman Shop** → Trip/Transport (`TripPresenter`)
- **Alur Bisnis Shop** → Purchase → Trip → Stock → Sale, KPI, Cost/Pricing,
  Load/Transport, Decision, Inventory Transfer (`BusinessFlowPresenter`) — kartu
  KPI & Decision di sini yang merepresentasikan "Business Health".

## Beranda setelah perubahan

Card `#shopMiniSummaryWrap` menampilkan 3 angka (Omzet Bulan Ini, Profit Bulan
Ini, Stok Menipis) + tombol **"🪨 Buka Shop"** (`showPage('shop')`). Semua
angka 100% reuse `ShopBusinessEnginePresenter.summary()` — tidak ada
compute ulang.

## Verifikasi

- `npm test` → **1172/1172 pass**, 0 fail (sebelum & sesudah `node scripts/build.js`).
- `node scripts/build.js` → lolos semua lint bawaan (u-dnone/style.display
  mismatch, escapeHtml, OCR chicken-egg guard), sintaks kedua bundle valid,
  `app_production.html` disamakan ulang dengan `index.html`, versi naik ke
  `sesi249-dana-titipan-aset-4` / build `752`.
- Cek manual: setiap id yang dipindah (`shopBusinessEngineWrap`,
  `tripPresenterWrap`, `businessFlowWrap`, dan grid-grid di dalamnya) muncul
  **tepat 1 kali** di `index.html` (tidak ada duplikasi DOM).
- Cek manual: tag `<div>` di dalam `#page-shop` seimbang (195 buka / 195 tutup)
  setelah semua edit.
