const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('SupplierStore rejects normalized duplicate supplier names on create and update', () => {
  const src = read('modules/shop/generic/supplier-store.js') + '\nglobalThis.__store = SupplierStore;';
  const context = { D: { produsen: [{ id: 'a', name: 'Toko  Satu' }] }, ProductRepository: { validateTextValue(v) { const value = String(v || '').trim(); return value ? { ok: true, value } : { ok: false, reason: 'empty' }; } } };
  vm.createContext(context); vm.runInContext(src, context);
  const store = context.__store;
  assert.equal(store.mutateCreate({ name: ' toko satu ' }).ok, false);
  assert.equal(store.mutateCreate({ name: 'Toko Dua' }).ok, true);
  assert.equal(store.mutateUpdate(context.D.produsen[0], { name: 'TOKO SATU' }).ok, true);
  context.D.produsen.push({ id: 'b', name: 'Toko Dua' });
  assert.equal(store.mutateUpdate(context.D.produsen[0], { name: ' toko dua ' }).ok, false);
});

test('Shop source guards tab visibility, exposes producer action, and mounts BI containers', () => {
  assert.match(read('pwa-ui-layer.css'), /\.kasir-wrap:not\(\.u-dnone\)\{display:grid/);
  assert.match(read('modules/shop/cobek-io.js'), /function openProdusenActionsMenu\(id\)\{return Produsen\.openProdusenActionsMenu\(id\);\}/);
  for (const file of ['index.html', 'app_production.html']) {
    const html = read(file);
    assert.match(html, /id="shopFab"/);
    assert.match(html, /id="shopLaporanFab" aria-hidden="true" inert/);
    assert.match(html, /data-action="setShopTab" data-args='\["laporan"(?:, "\$el")?\]'/);
    for (const id of ['biHealthScoreGrid','biDecisionPanelGrid','biTrendGrid','biExecutiveSummaryGrid','biAiInsightBody']) assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('Shop validates duplicate product names and confirms risky stock, zero cost and price inputs', () => {
  const src = read('modules/shop/cobek-etalase.js');
  assert.match(src, /_duplicateProduct=D\.products\.find/);
  assert.match(src, /Stok produk negatif/);
  assert.match(src, /Harga beli\/modal masih Rp 0/);
  assert.match(src, /Harga jual lebih rendah daripada harga beli/);
  assert.match(src, /Riwayat transaksi dipertahankan sebagai snapshot/);
  assert.match(src, /Kategori tidak ditambahkan/);
});

test('Shop delivery KPI excludes delivered orders with zero shipping cost and labels markup accurately', () => {
  assert.match(read('modules/shop/trip-presenter.js'), /t\.delivered && Number\(t\.ongkir\) > 0/);
  assert.match(read('modules/shop/cobek-etalase.js'), /markup \$\{marginPct\}%/);
});

test('Shop history and customer list show unpaid balance cues', () => {
  const src = read('modules/shop/cobek-order.js');
  assert.match(src, /DP \/ belum lunas/);
  assert.match(src, /totalPiutang/);
  assert.match(src, /Sisa piutang/);
  assert.match(src, /Pulihkan\/tambahkan produk terkait sebelum mengedit transaksi ini/);
});
