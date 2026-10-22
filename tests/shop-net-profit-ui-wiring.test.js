'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');

test('delivery plan modal exposes seller costs, fee rates and separate tax treatment inputs', () => {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  const html = ctx.MODAL_HTML.join('\n');
  for (const id of ['dpUnitCost', 'dpSellerDiscount', 'dpMarketplaceFeePct', 'dpMarketplaceFixedFee',
    'dpPaymentFeePct', 'dpSellerShippingSubsidy', 'dpOtherSellingCost',
    'dpTaxExpense', 'dpTaxWithheld', 'dpTaxStatus', 'dpNetProfitBox']) {
    assert.ok(html.includes(`id="${id}"`), `missing modal control ${id}`);
  }
  assert.match(html, /tidak menyimpan data/i);
});

test('delivery plan UI calls ProfitEngine analysis and marks incomplete estimates', () => {
  const source = fs.readFileSync('modules/shop/delivery-plan-ui.js', 'utf8');
  assert.match(source, /ProfitEngine\.analyzeSale/);
  assert.match(source, /unitCost: read\('dpUnitCost'\)/);
  assert.match(source, /analysis\.missingInputs/);
  assert.match(source, /analysis\.warnings/);
  assert.match(source, /HPP historis/);
});

test('S2628: modal marks every net-profit field optional with neutral (non-zero) placeholders and adds price/delivery overrides', () => {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  const html = ctx.MODAL_HTML.join('\n');
  assert.ok(html.includes('id="dpSellingPrice"') && html.includes('id="dpDeliveryCost"'));
  assert.match(html, /Semua kolom opsional dan boleh dikosongkan/);
  for (const id of ['dpSellerDiscount', 'dpMarketplaceFixedFee', 'dpSellerShippingSubsidy', 'dpOtherSellingCost', 'dpTaxExpense', 'dpTaxWithheld']) {
    const m = html.match(new RegExp('id="' + id + '"[^>]*placeholder="([^"]*)"'));
    assert.ok(m, id + ' placeholder');
    assert.notEqual(m[1].trim(), '0', id + ' placeholder must not look like a default 0');
    assert.ok(!/ required/.test(html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>'))[0]), id + ' must not be required');
  }
});

test('S2628: UI sends blank fields as undefined, keeps net-profit box when qty is blank, shows "belum diisi" for null', () => {
  const source = fs.readFileSync('modules/shop/delivery-plan-ui.js', 'utf8');
  assert.match(source, /_renderNetProfit\(/);
  assert.match(source, /sellingPrice: read\('dpSellingPrice'\)/);
  assert.match(source, /deliveryCost: read\('dpDeliveryCost'\)/);
  assert.match(source, /belum diisi/);
  assert.ok(!/Math\.max\(0, parseFloat\(document\.getElementById\('dpQty'\)/.test(source), 'blank qty must not be coerced to 0');
  assert.match(source, /analysis\.marginPct === null/);
});
