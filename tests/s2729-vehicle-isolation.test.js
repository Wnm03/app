'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadResolver(D, added = []) {
  const sot = {
    addCategory(type, input) {
      const c = { ...input, subs: [] };
      D.categories[type].push(c); added.push(c); return c;
    },
    ensureSubcategory(type, catId, sub) {
      const c = D.categories[type].find(x => x.id === catId);
      if (c && !c.subs.some(x => x.name === sub.name)) c.subs.push(sub);
    }
  };
  return loadSource(['modules/finance/transaksi.js'], {
    D, FinanceCategorySOT: sot,
    slugify: s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    uid: (() => { let n = 0; return () => `u${++n}`; })()
  }, ['resolveVehicleTxCategory']);
}

test('S2729 resolver tidak memakai kategori Transport generik untuk kendaraan yang belum punya kategori', () => {
  const D = { vehicles: [{ id: 'v2', name: 'Vario 110' }], categories: { expense: [
    { id: 'transport', name: 'Transport', subs: [{ id: 'parkir', name: 'Parkir' }] }
  ] } };
  const c = loadResolver(D);
  assert.equal(c.resolveVehicleTxCategory(D.vehicles[0]), 'Vario 110');
  const specific = D.categories.expense.find(x => x.linkedVehicleId === 'v2');
  assert.ok(specific, 'kategori khusus harus ditautkan ke ID kendaraan');
  assert.notEqual(specific.id, 'transport');
  assert.ok(specific.subs.some(x => x.name === 'Bensin'));
  assert.ok(D.categories.expense.find(x => x.id === 'transport').subs.some(x => x.name === 'Parkir'));
});

test('S2729 resolver memakai linkedVehicleId lebih dahulu dan tidak menautkan kategori generik', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario 125' }], categories: { expense: [
    { id: 'transport', name: 'Transport', subs: [] },
    { id: 'custom-v1', name: 'Motor utama', linkedVehicleId: 'v1', subs: [] }
  ] } };
  assert.equal(loadResolver(D).resolveVehicleTxCategory(D.vehicles[0]), 'Motor utama');
  assert.equal(D.categories.expense.find(x => x.id === 'transport').linkedVehicleId, undefined);
});

test('S2729 panel mengirim ID kendaraan dari kategori, bukan kendaraan aktif', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario 125' }, { id: 'v5', name: 'Xenia' }],
    categories: { expense: [{ id: 'cat-v1', name: 'Vario 125', linkedVehicleId: 'v1', subs: [] }] } };
  const els = {};
  const mk = (id, value='') => els[id] = { id, value, checked: false, style: {} };
  ['txStockPanel','txBbmPanel','txShopStockPanel','txShopSalePanel','txRenovPanel','txServisPanel','txSyncBbm','txAddStock','txSyncServis','txAddShopStock'].forEach(id => mk(id));
  mk('txCat','Vario 125'); mk('txSubCat','Dexlite');
  const seen = [];
  const noop = () => {};
  const globals = { D, curTxType:'expense', document:{getElementById:id=>els[id]||null},
    populateTxBbmVehicleSelect:id=>seen.push(['bbm',id]), toggleTxBbmFields:noop,
    populateTxStockSelect:noop, toggleTxStockFields:noop, populateTxServisVehicleSelect:id=>seen.push(['servis',id]),
    renderTxServisSelectors:noop, toggleTxServisFields:noop, isShopStockCatName:()=>false,
    populateTxShopStockSelect:noop, resetShopStockCart:noop, toggleTxShopStockFields:noop, toggleTxShopSaleFields:noop, populateTxShopSaleSelect:noop,
    resetTxShopSaleCart:noop, toggleTxRenovFields:noop, populateTxRenovSelect:noop,
    isKendaraanCatName:()=>true, isBensinSubName:()=>true, isSparepartSubName:()=>false,
    isRenovCatName:()=>false, _isFinanceServiceTransaction:()=>false, toast:noop };
  const c = loadSource(['modules/finance/transaksi.js'], globals, ['updateTxVehiclePanels']);
  c.updateTxVehiclePanels();
  assert.ok(seen.some(x=>x[0]==='bbm'&&x[1]==='v1'));
  assert.equal(els.txBbmPanel.style.display, 'block');
});
