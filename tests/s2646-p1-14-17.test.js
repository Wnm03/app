const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('P1-14: Order cart decorators only read visible row values and preserve existing actions', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /sheet-row-subtotal/);
  assert.match(helper, /Harga satuan '\+name\.trim\(\)/);
  assert.match(helper, /data-action="addOrderItem"/);
  assert.match(css, /#orderModal \.sheet-source-select/);
  assert.match(css, /\.sheet-row-subtotal/);
  assert.match(css, /min-width:40px/);
});

test('P1-15 and P1-20: Order customer/payment grouping and help folds retain source IDs', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  assert.match(helper, /orderCustomerFold/);
  assert.match(helper, /orderPaymentSection/);
  assert.match(helper, /oCustName/);
  assert.match(helper, /oCustPhone/);
  assert.match(helper, /oCustAddr/);
  assert.match(helper, /oDelivered/);
  assert.match(helper, /ⓘ Tentang DP/);
  assert.match(helper, /ⓘ Tentang PO/);
});

test('P1-16: product search keeps the native select and invokes existing add action', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  assert.match(helper, /id='orderProductSearch'/);
  assert.match(helper, /orderSelect\.value=btn\.getAttribute\('data-product-id'\)/);
  assert.match(helper, /data-action="addOrderItem"/);
  assert.match(helper, /Stok '\+stockOf\(prod\)\+' · '\+money\(priceOf\(prod\)\)/);
  assert.doesNotMatch(helper, /option\.hidden/);
});

test('P1-17: PO search filters existing chips and reads product/supplier metadata', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /id='pobProductSearch'/);
  assert.match(helper, /btn\.hidden=!!q/);
  assert.match(helper, /restockCandidatesForBatch/);
  assert.match(helper, /pobSupplierList/);
  assert.match(helper, /D\.produsen/);
  assert.match(helper, /Produk — ketuk untuk menambah 1 pcs/);
  assert.match(css, /#pobProductList \.pob-chip-meta/);
  assert.match(css, /#pobCartList \.btn-sm \{ min-width:40px !important; min-height:40px !important; \}/);
});

test('S2646 source and shipped bundle have syntax-valid matching decorators', () => {
  const source = read('modules/shared/pwa-ux-performance.js');
  const bundle = read('app-bundle-a.min.js');
  assert.match(source, /PWAUX\.installOrderPoPresentation\(\);/);
  assert.match(bundle, /__pwaOrderPoPresentationInstalled/);
});

test('P1-18: scan decoration preserves existing ShopScanUI actions and supplies bulk controls', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /shopScanBulkTools/);
  assert.match(helper, /next\.click\(\)/);
  assert.match(helper, /Nama produk baris/);
  assert.match(helper, /shopScanSelectedCount/);
  assert.match(css, /#shopScanPreview \{ max-height: none !important; overflow: visible !important; \}/);
  assert.match(css, /shop-scan-check-target \{ display: inline-flex; width: 44px; height: 44px/);
});

test('P1-19 and P2-1/P2-2: original file inputs remain and disabled/empty guidance is presentation-only', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /\['importShopExcelFile','importShopExcelModal','\.xlsx'\]/);
  assert.match(helper, /'shopCsvImportFile','shopCsvImportModal','\.csv'/);
  assert.match(helper, /input\.classList\.add\('sheet-file-source'\)/);
  assert.match(helper, /sheet-empty-guidance/);
  assert.match(helper, /sheet-disabled-reason/);
  assert.match(css, /\.sheet-file-picker/);
  assert.match(css, /\.sheet-empty-guidance/);
  assert.match(css, /\.sheet-disabled-reason/);
});

test('P1-1/P1-7/P1-8: stock scan folds, service odometer ordering and link filters are presentation-only', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /txStockExistingFold/);
  assert.match(helper, /stockSelect\.value==='__new__'/);
  assert.match(helper, /insertBefore\(kmField,serviceCategories\)/);
  assert.match(helper, /linkTxFiltersFold/);
  assert.match(helper, /linkTxSearch/);
  assert.match(css, /#servisMasterCategoryChips\.servis-category-chip-strip/);
  assert.match(css, /#linkTxFiltersFold/);
});

test('P1-3/P1-4/P1-9/P1-10: existing UI fields are grouped without changing their identifiers', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /shopSettings\.appendChild\(shopQuickSettings\)/);
  assert.match(helper, /cnKmInitialLink/);
  assert.match(helper, /Isi Bahan Bakar/);
  assert.match(helper, /renovItemCategoryHint/);
  assert.match(helper, /vehicleIdentityFold/);
  assert.match(helper, /vehicleOwnershipFold/);
  assert.match(helper, /productIdentityFold/);
  assert.match(helper, /productPriceFold/);
  assert.match(helper, /vehTaxInspectionFold/);
  assert.match(css, /#cnCurKm\[hidden\]/);
});

test('P1-2: Renovasi decorations read existing projects/items and keep delete action intact', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /renovationProjects/);
  assert.match(helper, /Sisa '\+renovationMoney\(remaining\)/);
  assert.match(helper, /item\.paid/);
  assert.match(helper, /deleteProject/);
  assert.match(helper, /keuRenovCard-cbody/);
  assert.match(css, /\.renov-paid-chip/);
  assert.match(css, /\.renov-overflow-menu/);
});

test('P1-5/P2-4: linked panels share presentation classes without replacing original controls', () => {
  const helper = read('modules/shared/pwa-ux-performance.js');
  const css = read('modern-ui-layer.css');
  assert.match(helper, /sheet-linked-panel-body/);
  for (const id of ['txStockPanel','txServisPanel','txBbmPanel','txRenovPanel','txShopStockPanel','txShopSalePanel']) assert.ok(helper.includes("'"+id+"'"));
  assert.match(css, /\.sheet-linked-panel-heading/);
  assert.match(css, /\.sheet-section/);
  assert.match(css, /\.hint-fold/);
});
