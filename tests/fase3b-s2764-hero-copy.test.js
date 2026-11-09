'use strict';
// Guard Fase 3B S2764: judul hero domain ringkas & fungsional (bukan copy promosi); id/aria-labelledby tetap.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Fase 3B: judul hero Shop/Mobil/Pajak satu baris ringkas, id tetap', () => {
  assert.match(h, /<h1 id="shopDomainTitle">Penjualan, stok, dan pelanggan<\/h1>/);
  assert.match(h, /<h1 id="carDomainTitle">Biaya kendaraan<\/h1>/);
  assert.match(h, /<h1 id="taxDomainTitle">Pajak dan zakat<\/h1>/);
});

test('Fase 3B: copy promosi lama tidak tersisa di judul', () => {
  assert.ok(!h.includes('Semua biaya kendaraan dalam satu ruang kerja'));
  assert.ok(!h.includes('Kelola kewajiban dan pembayaran dengan jelas'));
  assert.ok(!h.includes('<h1 id="shopDomainTitle">Kelola penjualan'));
  for (const id of ['shopDomainTitle', 'carDomainTitle', 'taxDomainTitle']) {
    assert.ok(h.includes('aria-labelledby="' + id + '"'), id);
  }
});
