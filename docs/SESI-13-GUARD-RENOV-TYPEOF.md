# Sesi 13 — Tahap 1a: Guard `typeof Renov`/`RenovCalc` (build `s12-guard-renov-typeof-checks`, `?v=869`)

## Konteks
Prasyarat sebelum Renovasi bisa dipindah ke lazy-load (lihat
`docs/architecture/DESIGN_lazy-load-modules.md`, Tahap 1a). Audit sesi lalu menemukan
7 titik panggilan `Renov`/`RenovCalc` TANPA `typeof` guard — termasuk yang paling
kritis: `renderDashboard()` (dipanggil dari puluhan titik `save()` di seluruh app)
memanggil `Renov.render();` langsung.

## Perubahan
0 perubahan perilaku — HANYA menambah `typeof X!=='undefined'` di titik yang belum
ada guard-nya, pola sama persis dengan guard `Pensiun`/`SewaKios` yang sudah ada di
baris yang sama sebelumnya.

| File | Fungsi | Sebelum | Sesudah |
|---|---|---|---|
| `modules/shared/modules-render.js` | live-wiring `renderDashboard()` | `Renov.render();` | `if(typeof Renov!=='undefined')Renov.render();` |
| `modules/asset/aset.js` | `TimelineW.goals()` | `const t=Renov.totals(p);` di dalam forEach | early-return `if(typeof Renov==='undefined')return;` sebelum baris itu |
| `modules/business/sewakios.js` | `SewaKios.roi()` | `Renov.totals(p).total` | ditambah `&&typeof Renov!=='undefined'` di kondisi ternary |
| `modules/finance/transaksi.js` | edit transaksi (renovItemLinkId) | `if(existingTx.renovItemLinkId){Renov.onLinkedTxEdited(...)}` | ditambah `&&typeof Renov!=='undefined'` di kondisi `if` |
| `modules/finance/tx-list-cashflow.js` | hapus transaksi (renovItemLinkId) | `if(t&&t.renovItemLinkId){Renov.onLinkedTxDeleted(...)}` | ditambah `&&typeof Renov!=='undefined'` |
| `modules/finance/linktx.js` | `LinkTx._refreshCtxUI()` (ctx==='renov') | `Renov.render();Renov.renderDetail();` | dibungkus `if(typeof Renov!=='undefined'){...}` |
| `modules/business/tukang-absensi.js` | `Tukang.applyToItem()` | `RenovCalc._pendingDetail={...}` | dibungkus `if(typeof RenovCalc!=='undefined'){...}` |

`tx-renov.js` (2 titik) TIDAK disentuh — sudah ada guard `typeof Renov!=='undefined'`
sejak sebelum sesi ini (ketahuan salah baca di audit awal, sudah dikoreksi).

## Test
Regression: **1747/1747 PASS** (build sebelum & sesudah).

## Status Tahap 1 (lazy-load Renovasi)
- ✅ Tahap 1a (guard) — SELESAI sesi ini.
- ⏳ Tahap 1b (keluarkan dari `build.js` GROUP_A + pasang `_loadScriptOnce()`) —
  BELUM dikerjakan, menunggu keputusan user untuk lanjut atau tidak.

`BUILD PASS / TEST PASS / ZIP / STOP`
