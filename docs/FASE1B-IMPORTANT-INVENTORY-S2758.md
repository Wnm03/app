# Inventaris `!important` per selector — S2758

Basis: stylesheet runtime di root proyek (`styles.css`, `modern-ui-layer.css`, `pwa-ui-layer.css`) setelah overlay S2757. Inventaris ini dibuat dengan parser CSS (PostCSS), bukan pencarian teks biasa, sehingga deklarasi `!important` dicatat bersama selector dan nomor barisnya.

## Ringkasan

| File | Jumlah deklarasi | Grup selector |
|---|---:|---:|
| `styles.css` | 106 | 60 |
| `modern-ui-layer.css` | 76 | 42 |
| `pwa-ui-layer.css` | 3 | 2 |
| **Total** | **185** | **104** |

Dua pengurangan S2757 tetap dipertahankan. Pada S2758 tidak ada penghapusan `!important` tambahan: audit menemukan sejumlah deklarasi yang tampak dapat dihapus ternyata menjaga state tersembunyi, reduced-motion, kontrol modal, atau mengalahkan inline style yang memang ditulis oleh renderer. Contoh konkret: tombol Pulihkan part stok diberi `style.marginRight = '6px'`; aturan `#stockList .tx-item > .tx-del` masih perlu memaksa margin sesuai layout. Menghapus prioritas tanpa browser capture akan berisiko mengubah UI.

## Strategi aman berikutnya

1. Untuk setiap grup selector, cocokkan properti dengan semua deklarasi yang berpotensi match di ketiga stylesheet dan inline style yang dibuat renderer.
2. Tandai `!important` yang dibutuhkan untuk hidden/state, reduced-motion, overlay/modal, dan override inline sebagai **dipertahankan** kecuali arsitektur pemiliknya diubah.
3. Hanya hapus prioritas setelah capture before/after pada 390×844, 768×1024, dan 1440×900, untuk tema Light/Dark/Ocean/Stone/Slate, termasuk sub-tab yang mengaktifkan rule tersebut.
4. Jangan membungkus stylesheet lama ke `@layer` secara parsial. Deklarasi normal unlayered mengalahkan deklarasi normal layered; pemindahan seluruh CSS ke layer juga membalik urutan prioritas deklarasi `!important` antar-layer. Migrasi perlu satu perubahan terencana dan perbandingan visual lengkap.

## Daftar deklarasi


## styles.css (106 declarations; 60 selector groups)

### `.theme-card-preview`
- L5: `color: var(--text) !important`
### `.theme-card[data-t="dark"] .theme-card-preview`
- L6: `background: #08090c !important`
- L6: `color: #c9a35f !important`
### `.theme-card[data-t="light"] .theme-card-preview`
- L7: `background: #f5f5fa !important`
- L7: `color: #6366f1 !important`
### `.theme-card[data-t="modern"] .theme-card-preview`
- L8: `background: #fafafa !important`
- L8: `color: #2f6fed !important`
### `.theme-card[data-t="graphite"] .theme-card-preview`
- L9: `background: #111315 !important`
- L9: `color: #d1d5da !important`
### `.theme-card[data-t="auto"] .theme-card-preview`
- L10: `background: linear-gradient(135deg,#08090c 50%,#f5f5fa 50%) !important`
- L10: `color: #c9a35f !important`
### `[data-theme] .green`
- L11: `color: var(--money-pos,var(--accent3)) !important`
### `[data-theme] .red`
- L12: `color: var(--money-neg,var(--accent2)) !important`
### `[data-theme] .orange`
- L13: `color: var(--accent4) !important`
### `*, *::before, *::after`
- L52: `animation-duration: .01ms !important`
- L52: `animation-iteration-count: 1 !important`
- L52: `transition-duration: .01ms !important`
- L52: `scroll-behavior: auto !important`
### `.overlay.open, .calc-overlay.open, .qs-modal-overlay.open`
- L53: `animation: none !important`
- L53: `opacity: 1 !important`
### `body.has-open-modal .nav`
- L71: `display: none !important`
### `.card-collapse-body.collapsed`
- L153: `max-height: 0 !important`
- L153: `margin-top: 0 !important`
### `.servis-history-item > img`
- L193: `width: 36px !important`
- L193: `height: 36px !important`
### `#servisActionTypeChipRow, #servisMasterCategoryChipRow`
- L205: `flex-wrap: nowrap !important`
### `[data-theme="modern"] .titipan-holding-row`
- L222: `margin-bottom: 0 !important`
### `.titipan-tbl-owner-cell`
- L226: `padding: 6px 8px !important`
### `.titipan-owner-card`
- L234: `margin-bottom: 8px !important`
### `.titipan-owner-avatar`
- L244: `flex: 0 0 auto !important`
### `.green`
- L254: `color: var(--accent3) !important`
### `.red`
- L255: `color: var(--accent2) !important`
### `.purple`
- L256: `color: var(--accent) !important`
### `.orange`
- L257: `color: var(--accent4) !important`
### `.tx-icon`
- L283: `background: none !important`
- L283: `box-shadow: none !important`
### `.wh-day-box.selected`
- L345: `background: var(--accent-soft) !important`
### `.dashhub-hero-stats`
- L926: `display: none !important`
### `.dashhub-summary-grid`
- L934: `display: none !important`
### `#danaKelolaanWrap`
- L935: `display: none !important`
### `#lifePriorityWrap`
- L936: `display: none !important`
### `#page-carnotes .cn-primary-action`
- L1231: `padding: 12px 14px !important`
### `#page-carnotes *`
- L1248: `scroll-behavior: auto !important`
- L1248: `animation-duration: .01ms !important`
- L1248: `animation-iteration-count: 1 !important`
- L1248: `transition-duration: .01ms !important`
### `.btn-primary,
.chip-btn.active,
.cn-tab.active,
.kel-subtab.active,
.nav-fab-icon,
#lifeOSReviewPanel button[data-action="LifeOSReview.startWeekly"]`
- L1259: `color: var(--on-accent) !important`
### `.segmented-control > .active,
.segmented-control > .chip-btn.active,
.segmented-control > .cn-tab.active,
.segmented-control > .kel-subtab.active,
.segmented-control > .lap-subtab.active,
.segmented-control > .pjk-subtab.active,
.segmented-control > .cni-subtab.active,
.segmented-control > .budget-tab-btn.active`
- L1270: `color: var(--text) !important`
### `.btn-income, .type-btn.ai`
- L1272: `color: var(--text) !important`
### `.btn-expense, .btn-danger, .type-btn.ae`
- L1273: `color: var(--text) !important`
### `.btn-transfer, .type-btn.at`
- L1274: `color: var(--text) !important`
### `.header-badge`
- L1275: `color: var(--text) !important`
### `.pin-key:active, .qs-btn:active, .kasir-qty-pill button:active`
- L1276: `color: var(--text) !important`
### `.btn, .chip-btn, .cn-tab, .kel-subtab, .type-btn, .qs-btn,
.pin-key, .nav-fab-icon`
- L1291: `transition: none !important`
### `.page`
- L1365: `animation: none !important`
- L1365: `opacity: 1 !important`
- L1365: `transform: none !important`
### `.page.active`
- L1366: `display: block !important`
- L1366: `visibility: visible !important`
- L1366: `opacity: 1 !important`
- L1366: `transform: none !important`
- L1366: `animation: none !important`
### `.page.nav-transition-hold`
- L1368: `display: block !important`
- L1368: `visibility: visible !important`
- L1368: `pointer-events: none !important`
### `.page.nav-transition-pending`
- L1369: `visibility: hidden !important`
- L1369: `pointer-events: none !important`
### `.tx-touch-target`
- L1371: `width: 44px !important`
- L1371: `min-width: 44px !important`
- L1371: `height: 44px !important`
- L1371: `min-height: 44px !important`
- L1371: `padding: 0 !important`
- L1371: `display: inline-flex !important`
- L1371: `background: radial-gradient(circle 13px at center,var(--surface3) 0 100%,transparent 100%) !important`
### `.tx-touch-target:active`
- L1371: `background: radial-gradient(circle 13px at center,var(--surface4) 0 100%,transparent 100%) !important`
### `.touch-target-remove-photo`
- L1371: `width: 44px !important`
- L1371: `min-width: 44px !important`
- L1371: `height: 44px !important`
- L1371: `min-height: 44px !important`
- L1371: `padding: 0 !important`
- L1371: `border: 0 !important`
- L1371: `background: radial-gradient(circle 13px at center,var(--accent2) 0 100%,transparent 100%) !important`
### `.touch-target-remove-photo:active`
- L1371: `background: radial-gradient(circle 13px at center,color-mix(in srgb,var(--accent2) 82%,#000 18%) 0 100%,transparent 100%) !important`
### `.segmented-control > .budget-tab-btn.active`
- L1437: `color: var(--text) !important`
### `.segmented-control > button`
- L1451: `transition: none !important`
### `.segmented-control`
- L1479: `scroll-behavior: auto !important`
### `.servis-history-item > .servis-history-photo-thumb img`
- L1500: `width: 36px !important`
- L1501: `height: 36px !important`
- L1518: `width: 32px !important`
- L1519: `height: 32px !important`
### `#stockServiceFilterWrap`
- L1623: `display: grid !important`
- L1625: `gap: 8px !important`
- L1626: `align-items: stretch !important`
### `#stockServiceFilterWrap .fs`
- L1629: `width: 100% !important`
- L1630: `min-width: 0 !important`
### `:where(*, *::before, *::after)`
- L1953: `scroll-behavior: auto !important`
- L1954: `transition-duration: 0.01ms !important`
- L1955: `animation-duration: 0.01ms !important`
- L1956: `animation-iteration-count: 1 !important`
### `#catalogList .tx-item .tx-del`
- L2880: `margin-right: 0 !important`
### `.tx-item > .tx-del`
- L2949: `margin-right: 0 !important`
### `#stockList .tx-item > .tx-del`
- L3080: `margin: 0 !important`
### `#stockList .tx-item .tx-name > span`
- L3165: `margin: 3px 4px 2px 0 !important`
### `.nav-fab-menu[hidden]`
- L3432: `display: none !important`
### `#keuFab, #laporanFab`
- L3470: `display: none !important`
- L3470: `pointer-events: none !important`

## modern-ui-layer.css (75 declarations; 42 selector groups)

### `.card, .btn-primary, .nav-item, .nav-item svg`
- L133: `transition: none !important`
- L134: `transform: none !important`
### `.ui-icon,
  .dashhub-cat-icon,
  .qs-action-icon,
  .keu-fab-action-icon,
  .nav-fab-icon,
  .empty-icon`
- L242: `transition: none !important`
### `[data-theme="graphite"] .tx-icon`
- L362: `background: var(--surface2) !important`
### `[data-theme="graphite"] .nav-dot`
- L457: `display: none !important`
### `[data-theme="graphite"] *`
- L473: `scroll-behavior: auto !important`
- L473: `transition: none !important`
- L473: `animation: none !important`
### `[data-theme] .nav-dot`
- L675: `display: none !important`
### `[data-theme] *, [data-theme] *::before, [data-theme] *::after`
- L698: `animation-duration: .01ms !important`
- L699: `transition-duration: .01ms !important`
- L700: `scroll-behavior: auto !important`
### `*, *::before, *::after`
- L856: `scroll-behavior: auto !important`
- L856: `animation-duration: .01ms !important`
- L856: `transition-duration: .01ms !important`
### `body[data-theme] .pwa-domain-page .btn-primary,
body[data-theme] .pwa-domain-page .pwa-action-card.pwa-action-primary`
- L951: `color: #fff !important`
### `#keuFab, #laporanFab`
- L1044: `display: none !important`
- L1044: `pointer-events: none !important`
### `#shopTab-bi #shopBusinessEngineWrap,#shopTab-bi #tripPresenterWrap,#shopTab-bi #businessFlowWrap`
- L1048: `display: none !important`
### `.dhb-ov-tile .pos,#dashHubTrendBody .pos`
- L1060: `color: var(--money-pos) !important`
### `.dhb-ov-tile .neg,#dashHubTrendBody .neg`
- L1061: `color: var(--money-neg) !important`
### `.dhb-ov-tile .warn`
- L1062: `color: #d97706 !important`
### `[data-theme="light"] #pobProductList .chip-btn b,
[data-theme="modern"] #pobProductList .chip-btn b`
- L1129: `color: color-mix(in srgb, var(--accent) 70%, black) !important`
### `#orderModal .gaji-result > div:not(.gaji-result-main)`
- L1133: `color: color-mix(in srgb, var(--text) 40%, var(--text2)) !important`
### `.tx-link-warn[hidden], .tx-amt-hint[hidden], .tx-renov-create-project[hidden]`
- L1199: `display: none !important`
### `#orderModal .sheet-source-select`
- L1204: `position: absolute !important`
- L1204: `width: 1px !important`
- L1204: `height: 1px !important`
- L1204: `padding: 0 !important`
- L1204: `margin: -1px !important`
- L1204: `overflow: hidden !important`
- L1204: `clip: rect(0,0,0,0) !important`
- L1204: `white-space: nowrap !important`
- L1204: `border: 0 !important`
### `.sheet-product-search`
- L1205: `font-size: 16px !important`
### `#pobProductList button[hidden]`
- L1221: `display: none !important`
### `#pobCartList .btn-sm`
- L1222: `min-width: 40px !important`
- L1222: `min-height: 40px !important`
### `#shopScanPreview`
- L1230: `max-height: none !important`
- L1230: `overflow: visible !important`
### `#shopScanPreview .tx-item`
- L1231: `display: grid !important`
- L1231: `align-items: start !important`
- L1231: `gap: 8px !important`
### `#shopScanPreview .shop-scan-check-target input[type="checkbox"]`
- L1237: `width: 20px !important`
- L1237: `height: 20px !important`
- L1237: `margin: 0 !important`
### `#shopScanPreview .tx-info > .u-fs11.u-t2`
- L1238: `margin-top: 5px !important`
- L1238: `font-size: 12px !important`
### `.sheet-file-source`
- L1245: `position: absolute !important`
- L1245: `width: 1px !important`
- L1245: `height: 1px !important`
- L1245: `padding: 0 !important`
- L1245: `margin: -1px !important`
- L1245: `overflow: hidden !important`
- L1245: `clip: rect(0,0,0,0) !important`
- L1245: `white-space: nowrap !important`
- L1245: `border: 0 !important`
### `#page-shop .page-breadcrumb[hidden]`
- L1280: `display: none !important`
### `#page-carnotes .pwa-action-card[hidden], #page-carnotes .cn-summary-link[hidden], #cnCurKm[hidden], #cnKmInitialLink[hidden]`
- L1286: `display: none !important`
### `.renov-paid-item, .renov-paid-item *`
- L1290: `text-decoration: none !important`
### `.renov-paid-chip`
- L1291: `text-decoration: none !important`
### `.sheet-linked-panel-heading`
- L1297: `display: flex !important`
### `.sheet-linked-panel-heading input[type="checkbox"]`
- L1298: `width: 20px !important`
- L1298: `height: 20px !important`
### `.shop-kpi-strip > .shop-grid`
- L1311: `display: grid !important`
### `.shop-kpi-strip > .shop-grid #shopModalStokCard`
- L1313: `margin: 0 !important`
### `#orderModal #oPriceType, #orderModal #oProductSelect, #orderModal #oAcc,
#purchaseOrderBatchModal #pobSupplier, #importShopExcelFile`
- L1337: `font-size: 16px !important`
### `#keuanganTab-laporan .dashhub-cat-desc, #keuanganTab-laporan .findash-card-label, #keuanganTab-laporan .findash-card-sub, #keuanganTab-laporan .stat-label, #keuanganTab-laporan .u-fs11`
- L1346: `font-size: 12px !important`
### `#keuanganTab-laporan .pb-current, #keuanganTab-laporan .titipan-pool-lbl, #keuanganTab-laporan .u-fs10, #keuanganTab-laporan .btn-sm`
- L1364: `font-size: 12px !important`
### `#page-shop[data-active-shop-tab="bi"] #shopInsightCard`
- L1378: `display: none !important`
### `#cnTab-servis .u-fs10, #cnTab-servis [style*="font-size:10px"], #cnTab-servis [style*="font-size:9px"], #cnTab-servis [style*="font-size:10.5px"], #page-shop .u-fs10`
- L1379: `font-size: 11px !important`
### `#page-shop[data-active-shop-tab]:not([data-active-shop-tab="kasir"]) #shopInsightCard`
- L1384: `display: none !important`
### `#page-shop .pwa-workspace-head .pwa-workspace-kicker,
#page-shop .pwa-workspace-head p`
- L1418: `display: none !important`
### `#page-shop .kasir-view-toggle .chip-btn`
- L1419: `min-width: 44px !important`
- L1419: `min-height: 44px !important`

## pwa-ui-layer.css (3 declarations; 2 selector groups)

### `body[data-theme] .nav-dot`
- L1: `display: none !important`
### `body[data-theme] *,body[data-theme] *::before,body[data-theme] *::after`
- L1: `scroll-behavior: auto !important`
- L1: `transition-duration: .01ms !important`
