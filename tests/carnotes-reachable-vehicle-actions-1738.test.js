const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const modals = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
const catalogUi = fs.readFileSync(path.join(ROOT, 'modules/vehicle/vehicle-catalog-ui.js'), 'utf8');
const modalNav = fs.readFileSync(path.join(ROOT, 'modules/shared/modal-navigasi.js'), 'utf8');

function modalBody(id) {
  const start = modals.indexOf(`id=\\"${id}\\"`);
  assert.notEqual(start, -1, `modal ${id} harus ada di MODAL_HTML`);
  const end = modals.indexOf('<div class=\\"overlay\\"', start + 10);
  return modals.slice(start, end === -1 ? modals.length : end);
}

test('S1738: semua modal jalur Vehicle/Car Notes yang dapat dicapai punya tombol closeModal', () => {
  for (const id of [
    'vehicleModal', 'vehTaxModal', 'simModal', 'kmModal',
    'catalogModal', 'vehCatalogImportModal', 'vehCatWebImportModal',
    'sparepartModal', 'stockModal', 'servisModal', 'bbmModal', 'torsiModal',
    'sparepartCsvImportModal', 'sparepartOcrDetailModal',
  ]) {
    const body = modalBody(id);
    assert.ok(body.includes('data-action=\\"closeModal\\"'), `${id}: harus punya aksi closeModal`);
    assert.ok(body.includes(`data-args='[\\"${id}\\"]'`), `${id}: close harus menarget modal yang sama`);
  }
});

test('S1738: catalogModal tidak punya action mati pada jalur Scan/Import/Add/Edit/Delete', () => {
  for (const action of [
    'SparepartScannerUI.scanCamera',
    'VehicleCatalogUI.openForm',
    'VehicleCatalogImportUI.open',
    'VehicleCatalogWebImportUI.open',
    'SparepartScannerUI.scanGallery',
  ]) assert.ok(modalBody('catalogModal').includes(`data-action=\\"${action}\\"`), action);
  for (const action of [
    'VehicleCatalogUI.openForm', 'VehicleCatalogUI.remove',
  ]) assert.ok(catalogUi.includes(`data-action=\"${action}\"`), action);
});

test('S1738: modal Back stack tetap terpasang setelah jalur Car Notes -> modal', () => {
  assert.match(modalNav, /const _MODAL_HISTORY_KEY='__kwModalStack'/);
  assert.match(modalNav, /function _modalHistoryPush\(id\)/);
  assert.match(modalNav, /function _modalHistoryConsume\(id\)/);
  assert.match(modalNav, /if\(!opts\.skipHistory && !_modalHistoryPopInProgress && _modalHistoryConsume\(id\)\)/);
  assert.match(modalNav, /addEventListener\('popstate'/);
});
