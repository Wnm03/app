'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
function ctx(products) {
  return loadSource(['modules/shop/cobek-pricing.js', 'modules/shop/profit-engine.js'],
    { D: { products: products || [], cobekKategori: [], bbmLogs: [] } }, ['ProfitEngine']);
}
test('analyzeSale computes sale discounts, COGS, seller costs, expense tax and margin', () => {
  const c = ctx([{ id: 'p', hargaBeli: 40, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 2, unitCost: 35,
    sellerDiscount: 10, deliveryPlan: { route: { totalPerPcs: 5 } },
    marketplaceFeePct: 5, marketplaceFixedFee: 2, paymentFeePct: 2,
    sellerShippingSubsidy: 3, packagingCost: 4, otherSellingCost: 1,
    taxExpense: 2, taxWithheld: 3, taxStatus: 'CONFIRMED', settlementAmount: 150 });
  assert.equal(r.netSales, 190);
  assert.equal(r.cogs, 70);
  assert.equal(r.marketplaceFee, 9.5);
  assert.equal(r.paymentFee, 3.8);
  assert.equal(r.grossProfit, 120);
  assert.equal(r.sellingCosts, 33.3);
  assert.equal(r.estimatedNetProfit, 84.7);
  assert.equal(r.cashAfterWithholding, 153.7);
  assert.ok(Math.abs(r.settlementDelta - (-18.7)) < 1e-9);
  assert.equal(r.complete, true);
  assert.equal(r.costBasis, 'HISTORICAL_UNIT_COST');
});
test('analyzeSale marks missing cost/fees/shipping/tax as incomplete instead of asserting final profit', () => {
  const c = ctx([{ id: 'p', hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.complete, false);
  assert.deepEqual(Array.from(r.missingInputs), ['HPP', 'DISKON', 'ONGKIR', 'BIAYA_MARKETPLACE', 'BIAYA_TETAP',
    'BIAYA_PEMBAYARAN', 'SUBSIDI_ONGKIR', 'BIAYA_LAIN', 'PAJAK_BEBAN', 'PAJAK_DIPUNGUT', 'STATUS_PAJAK']);
  assert.equal(r.costBasis, 'MISSING_COST');
  assert.equal(r.estimatedNetProfit, null);
  assert.ok(r.warnings.length >= 4);
});
test('withheld tax is not treated as profit expense; expense tax is separate', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, unitCost: 20,
    deliveryCost: 0, sellerDiscount: 0, marketplaceFeePct: 0, marketplaceFixedFee: 0,
    paymentFeePct: 0, sellerShippingSubsidy: 0, otherSellingCost: 0,
    taxExpense: 5, taxWithheld: 10, taxStatus: 'CONFIRMED' });
  assert.equal(r.estimatedNetProfit, 75);
  assert.equal(r.cashAfterWithholding, 90);
});
test('analyzeSale rejects invalid quantity and unknown product', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'missing', qty: 1 }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: -1 }).ok, false);
});
test('legacy calculateProfit remains backward compatible', () => {
  const c = ctx([{ id: 'p', hargaBeli: 40, hargaJual: 100 }]);
  const r = c.ProfitEngine.profit({ productId: 'p', qty: 2 });
  assert.equal(r.profit, 120);
  assert.equal(r.marginPct, 60);
});


test('analyzeSale rejects zero quantity, negative fees, invalid tax status and excessive discount', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 0 }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, marketplaceFeePct: -1 }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, taxStatus: 'MAYBE' }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, sellerDiscount: 101 }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, settlementAmount: -1 }).ok, false);
});

test('complete simulation is still marked as estimate and not actual-ready without actual settlement', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, unitCost: 20,
    deliveryCost: 0, sellerDiscount: 0, marketplaceFeePct: 0, marketplaceFixedFee: 0,
    paymentFeePct: 0, sellerShippingSubsidy: 0, otherSellingCost: 0,
    taxStatus: 'NOT_APPLICABLE' });
  assert.equal(r.complete, true);
  assert.equal(r.resultMode, 'ESTIMATE');
  assert.equal(r.actualReady, false);
  assert.ok(r.warnings.some((w) => /Settlement aktual belum diberikan/.test(w)));
});

// ---- S2628: semua input opsional; kosong != 0 ----
const FULL0 = { sellerDiscount: 0, marketplaceFeePct: 0, marketplaceFixedFee: 0, paymentFeePct: 0,
  sellerShippingSubsidy: 0, otherSellingCost: 0, taxExpense: 0, taxWithheld: 0, taxStatus: 'CONFIRMED' };

test('blank qty and blank price do not fail and are not treated as zero', () => {
  const c = ctx([{ id: 'p' }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p' });
  assert.equal(r.ok, true);
  assert.equal(r.qty, null);
  assert.equal(r.sellingPrice, null);
  assert.equal(r.grossSales, null);
  assert.equal(r.netSales, null);
  assert.equal(r.estimatedNetProfit, null);
  assert.equal(r.marginPct, null);
  assert.ok(r.missingInputs.includes('HARGA_JUAL') && r.missingInputs.includes('KUANTITAS'));
});

test('blank fee is unknown (null, no result) while explicit 0 is a deliberate statement and is computed', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const base = { productId: 'p', qty: 1, unitCost: 20, deliveryCost: 0, ...FULL0 };
  const blankFee = { ...base }; delete blankFee.marketplaceFixedFee;
  const rb = c.ProfitEngine.analyzeSale(blankFee);
  assert.equal(rb.marketplaceFixedFee, null);
  assert.equal(rb.sellingCosts, null);
  assert.equal(rb.estimatedNetProfit, null);
  assert.equal(rb.inputStatus.marketplaceFixedFee, 'EMPTY');
  assert.ok(rb.missingInputs.includes('BIAYA_TETAP'));
  const rz = c.ProfitEngine.analyzeSale(base);
  assert.equal(rz.marketplaceFixedFee, 0);
  assert.equal(rz.inputStatus.marketplaceFixedFee, 'FILLED');
  assert.equal(rz.estimatedNetProfit, 80);
  assert.equal(rz.complete, true);
});

test('empty-string and null inputs behave like blank, not zero', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: '', unitCost: '', sellerDiscount: null, marketplaceFeePct: '' });
  assert.equal(r.ok, true);
  assert.equal(r.qty, null);
  assert.equal(r.sellerDiscount, null);
  assert.equal(r.marketplaceFeePct, null);
  assert.equal(r.costBasis, 'ESTIMATED_MASTER_COST');
});

test('only results with sufficient inputs are computed; partial known costs are exposed separately', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 2, sellerDiscount: 0, marketplaceFixedFee: 3 });
  assert.equal(r.grossSales, 200);
  assert.equal(r.netSales, 200);
  assert.equal(r.cogs, 40);
  assert.equal(r.grossProfit, 160);
  assert.equal(r.sellingCosts, null);
  assert.equal(r.contributionProfit, null);
  assert.equal(r.estimatedSettlement, null);
  assert.equal(r.knownSellingCosts, 3);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1 }).knownSellingCosts, null);
});

test('manual selling price and manual delivery cost are optional overrides without mutating product data', () => {
  const products = [{ id: 'p', hargaBeli: 20, hargaJual: 100 }];
  const c = ctx(products);
  const before = JSON.stringify(products);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, sellingPrice: 150, deliveryCost: 7,
    deliveryPlan: { route: { totalPerPcs: 99 } }, ...FULL0 });
  assert.equal(r.priceSource, 'MANUAL');
  assert.equal(r.grossSales, 150);
  assert.equal(r.deliveryCost, 7);
  assert.equal(JSON.stringify(products), before);
  const noProduct = c.ProfitEngine.analyzeSale({ qty: 1, sellingPrice: 50, unitCost: 10, deliveryCost: 0, ...FULL0 });
  assert.equal(noProduct.ok, true);
  assert.equal(noProduct.estimatedNetProfit, 40);
});

test('blank tax values stay unknown unless status explicitly says not applicable', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const common = { productId: 'p', qty: 1, unitCost: 20, deliveryCost: 0,
    sellerDiscount: 0, marketplaceFeePct: 0, marketplaceFixedFee: 0, paymentFeePct: 0, sellerShippingSubsidy: 0, otherSellingCost: 0 };
  const unk = c.ProfitEngine.analyzeSale({ ...common, taxStatus: 'UNKNOWN' });
  assert.equal(unk.taxExpense, null);
  assert.equal(unk.estimatedNetProfit, null);
  const na = c.ProfitEngine.analyzeSale({ ...common, taxStatus: 'NOT_APPLICABLE' });
  assert.equal(na.taxExpense, 0);
  assert.equal(na.estimatedNetProfit, 80);
});

test('explicit invalid values are still rejected (different from blank)', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', sellingPrice: -5 }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', deliveryCost: -1 }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, marketplaceFixedFee: 'abc' }).ok, false);
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 0 }).ok, false);
});

// ---- S2628b: ongkir dari rencana pengiriman yang bernilai 0 bukan berarti Rp0 ----
test('route total 0 (jarak/ongkos kosong) is unknown delivery cost, not Rp0', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, deliveryPlan: { route: { totalPerPcs: 0 } } });
  assert.equal(r.deliveryCost, null);
  assert.ok(r.missingInputs.includes('ONGKIR'));
  assert.equal(r.inputStatus.deliveryCost, 'EMPTY');
});

test('route with an empty consumer leg on antar is unknown even when producer leg is filled', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const route = { metode: 'antar', legProdusen: 5, legKonsumen: 0, totalPerPcs: 5 };
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 2, deliveryPlan: { route } }).deliveryCost, null);
  const ambil = { metode: 'ambil', legProdusen: 5, legKonsumen: 0, totalPerPcs: 5 };
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 2, deliveryPlan: { route: ambil } }).deliveryCost, 10);
  const full = { metode: 'antar', legProdusen: 5, legKonsumen: 3, totalPerPcs: 8 };
  assert.equal(c.ProfitEngine.analyzeSale({ productId: 'p', qty: 2, deliveryPlan: { route: full } }).deliveryCost, 16);
});

test('explicit manual delivery cost 0 is a deliberate "free shipping" statement and overrides an empty route', () => {
  const c = ctx([{ id: 'p', hargaBeli: 20, hargaJual: 100 }]);
  const r = c.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, deliveryCost: 0, deliveryPlan: { route: { totalPerPcs: 0 } } });
  assert.equal(r.deliveryCost, 0);
  assert.ok(!r.missingInputs.includes('ONGKIR'));
});

test('real LogisticsEngine.route with blank distance/cost no longer silently becomes Rp0 delivery', () => {
  const c2 = loadSource(['modules/shop/cobek-pricing.js', 'modules/logistics/logistics-engine.js', 'modules/shop/profit-engine.js'],
    { D: { products: [{ id: 'p', hargaBeli: 20, hargaJual: 100 }], cobekKategori: [], bbmLogs: [], vehicles: [] }, document: { getElementById: () => null } },
    ['LogisticsEngine', 'ProfitEngine']);
  const route = c2.LogisticsEngine.route({ metode: 'antar', pcs: 1 });
  assert.equal(route.totalPerPcs, 0);
  const r = c2.ProfitEngine.analyzeSale({ productId: 'p', qty: 1, deliveryPlan: { route } });
  assert.equal(r.deliveryCost, null);
  assert.ok(r.missingInputs.includes('ONGKIR'));
});
