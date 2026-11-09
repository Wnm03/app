'use strict';
// Guard Fase 1C S2760: lantai 12px untuk sisa teks sekunder + target sentuh 44px kartu Etalase/Akun
// (hasil capture-fase1b-extended.py). Tanpa !important, tanpa selector [data-action].
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Fase 1C: tokens.css memberi lantai 12px pada tx-meta, bbm-lbl, shop-stock-pill, shop-price-label', () => {
  const t = read('tokens.css');
  const i = t.indexOf('FASE 1C (S2760):');
  assert.ok(i > 0, 'blok FASE 1C harus ada');
  const block = t.slice(i);
  for (const sel of ['.tx-meta', '.bbm-lbl', '.shop-stock-pill', '.shop-price-label']) {
    assert.ok(block.includes('html body[data-theme] ' + sel), sel);
  }
  assert.match(block, /#keuBillStatGrid \.bill-stat-pill \.stat-label/);
  assert.match(block, /\.pwa-domain-page \.pwa-status-pill/);
  assert.match(block, /\{font-size:var\(--fs-xs\)\}/);
  assert.ok(!/!important/.test(t), 'tokens.css tidak memakai !important');
  assert.ok(!/data-action=/.test(t));
});

test('Fase 1C: target sentuh 44px untuk aksi produk Shop, kartu Akun, dan tombol export', () => {
  const css = read('modern-ui-layer.css');
  const start1c = css.indexOf('FASE 1C (S2760)');
  const end1c = css.indexOf('FASE 2A (S2761)');
  const block = css.slice(start1c, end1c > start1c ? end1c : undefined);
  assert.ok(block.length > 20, 'blok FASE 1C harus ada');
  assert.match(block, /\.shop-product-card \.shop-product-actions>button/);
  assert.match(block, /\.acc-card-edit/);
  assert.match(block, /\.acc-card-del\{width:44px;height:44px;min-width:44px;min-height:44px\}/);
  assert.match(block, /\.acc-card-edit\{right:56px\}/);
  assert.match(block, /\.export-half\{min-height:44px\}/);
  assert.ok(!/data-action=/.test(block), 'tanpa selector [data-action] (kontrak S2103/S256AD)');
  assert.ok(!/!important/.test(block));
});

test('Fase 1C: cache bust konsisten (versi sama) di kedua HTML dan sw.js', () => {
  const sw = read('sw.js').match(/kw-cache-v(\d+)/);
  assert.ok(sw, 'sw.js harus punya kw-cache-v<versi>');
  const v = sw[1];
  assert.ok(Number(v) >= 2760, 'versi tidak boleh turun di bawah 2760');
  for (const f of ['index.html', 'app_production.html']) {
    const h = read(f);
    assert.ok(h.includes('tokens.css?v=' + v), f);
    assert.ok(h.includes('modern-ui-layer.css?v=' + v), f);
    assert.ok(!/\?v=2757/.test(h), f + ' tidak boleh sisa v=2757');
  }
});
