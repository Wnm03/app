'use strict';
// S2643 — P0-4, P0-5, P1-6, P1-11/22, P1-12, P1-13, P1-21 (tampilan saja).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MODALS = read('modules/shared/modals.js');
const CSS = read('modern-ui-layer.css');
const UX = read('modules/shared/pwa-ux-performance.js');

test('S2643 P0-4: placeholder Cari kategori tidak lagi berupa escape mentah', () => {
  assert.ok(MODALS.includes('placeholder=\\"&#128269; Cari kategori...\\"'));
  assert.ok(!MODALS.includes('\\\\ud83d\\\\udd0d Cari kategori'));
});

test('S2643 P0-5/P1-6: teks petunjuk jujur & bahasa awam', () => {
  assert.ok(!MODALS.includes('Jenis servis mengambil Keterangan'));
  assert.ok(!MODALS.includes('SoT Servis/Kategori'));
  assert.ok(!MODALS.includes('identitas canonical; nama kategori'));
  assert.ok(!MODALS.includes('Harga Total Beda dari Porsi Dilacak'));
  assert.ok(MODALS.includes('>Komponen servis</label>'));
  const part = read('modules/vehicle/part-crud-s2041.js');
  assert.ok(!part.includes('identity canonical yang sama') && part.includes('for="stockServiceComponentId">Komponen servis'));
});

test('S2643 P1-21: atribut keyboard pada input Order/PO, id tidak berubah', () => {
  for (const id of ['oCustName', 'oCustPhone', 'oCustAddr', 'oNote', 'oDiskon', 'oOngkir', 'oDP', 'pobSupplier']) {
    const m = new RegExp('id=\\\\"' + id + '\\\\"[^>]*enterkeyhint=\\\\"(next|done)\\\\"').exec(MODALS);
    assert.ok(m, id + ' punya enterkeyhint');
  }
  assert.match(MODALS, /id=\\"oDP\\" enterkeyhint=\\"done\\"/);
  const scan = read('modules/business/shop-scan-ui.js');
  assert.ok(scan.includes('aria-label="Nama produk baris') && scan.includes('aria-label="Harga baris'));
});

test('S2643 P1-11/12/13: CSS select 16px, toast di atas tombol, bilah total', () => {
  assert.match(CSS, /\.overlay select, \.overlay select\.fs, \.overlay input\[type="file"\] \{ font-size: 16px; \}/);
  assert.match(CSS, /body\.has-open-modal \.toast \{\s*top: auto;/);
  assert.match(CSS, /\.sheet-total-bar \{\s*position: sticky;/);
});

test('S2643 P1-13: helper hanya menyalin teks sumber dan tidak mengganti tombol asli', () => {
  assert.match(UX, /PWAUX\.installStickyTotals=function/);
  assert.match(UX, /observe\(src,\{childList:true,characterData:true,subtree:true\}\)/);
  const stickyStart = UX.indexOf('PWAUX.installStickyTotals=function');
  const stickyEnd = UX.indexOf('PWAUX.installTxLinkHints=function', stickyStart);
  assert.ok(stickyStart >= 0 && stickyEnd > stickyStart);
  assert.ok(!/addEventListener\('click'/.test(UX.slice(stickyStart, stickyEnd)));
  assert.ok(!/saveOrder\(|savePurchaseOrderBatchFromModal\(/.test(UX));
});
