'use strict';
// S2041-2308: perilaku nyata untuk Order.computeTotals dan Zakat.hitungPenghasilan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('B9 Order.computeTotals — diskon dibatasi, ongkir negatif tidak mengurangi total, rugi tetap negatif', () => {
  const els = {
    oPriceType: { value: 'retail' },
    oDiskon: { value: '50000' },
    oOngkir: { value: '-7000' },
  };
  const D = { products: [{ id: 'p1', name: 'Barang', hargaBeli: 6000, hargaJual: 10000, hargaReseller: 9000 }] };
  const ctx = loadSource(['modules/shop/cobek-order.js'], {
    D, document: { getElementById: (id) => els[id] || null },
  }, ['Order']);
  ctx.Order.items = [{ productId: 'p1', qty: 2, hargaOverride: null }];
  let result = ctx.Order.computeTotals();
  assert.equal(result.subtotal, 20000);
  assert.equal(result.diskon, 50000, 'nilai diskon mentah tetap dikembalikan untuk audit/UI');
  assert.equal(result.ongkir, 0);
  assert.equal(result.total, 0);
  assert.equal(result.profit, -12000, 'profit harus dihitung dari diskon efektif yang dibatasi subtotal');

  els.oDiskon.value = '-5000';
  els.oOngkir.value = '3000';
  result = ctx.Order.computeTotals();
  assert.equal(result.total, 23000, 'diskon negatif tidak menaikkan total');
  assert.equal(result.profit, 8000, 'profit normal tetap konsisten');
});

test('B10 Zakat.hitungPenghasilan — transaksi tanggal 1 tetap masuk bulan lokal pada zona UTC-negatif', () => {
  const originalTZ = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const NativeDate = Date;
    class FixedDate extends NativeDate {
      constructor(...args) {
        if (args.length) super(...args);
        else super('2026-03-15T12:00:00-07:00');
      }
      static now() { return new NativeDate('2026-03-15T12:00:00-07:00').getTime(); }
    }
    const els = {
      zpIncomeBulan: { textContent: '' }, zpNisabBulan: { textContent: '' },
      zpStatus: { textContent: '', style: {} }, zpJumlah: { textContent: '' },
    };
    const D = {
      transactions: [
        { id: 'first-day', type: 'income', date: '2026-03-01', amount: 100000 },
        { id: 'previous-month', type: 'income', date: '2026-02-28', amount: 900000 },
      ],
      pajakZakat: { nisabPenghasilanBulan: 50000 },
    };
    const ctx = loadSource(['modules/finance/pajak-pbb-zakat.js'], {
      D, Date: FixedDate,
      document: { getElementById: (id) => els[id] || null },
      fmtFull: (n) => String(n), save() {}, toast() {},
      parsePzNum: (v) => Number(v) || 0,
    }, ['Zakat']);
    ctx.Zakat.hitungPenghasilan();
    assert.equal(els.zpIncomeBulan.textContent, '100000', 'hanya transaksi Maret lokal yang dihitung');
    assert.equal(els.zpJumlah.textContent, '2500');
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});
