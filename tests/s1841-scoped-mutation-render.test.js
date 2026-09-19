const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const shared=fs.readFileSync(require('node:path').join(__dirname,'../modules/shared/features-helpers-global-security.js'),'utf8');
const servis=fs.readFileSync(require('node:path').join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const finance=fs.readFileSync(require('node:path').join(__dirname,'../modules/finance/transaksi-b.js'),'utf8');

test('S1841: scoped mutation refresh helper exists and gates by visible page',()=>{
  assert.match(shared,/function refreshAfterMutation\(opts\)/);
  assert.match(shared,/isVisible\('page-carnotes'\)/);
  assert.match(shared,/isVisible\('page-keuangan'\)/);
  assert.match(shared,/isVisible\('page-dashboard'\)/);
  assert.match(shared,/domain==='servis'/);
  assert.match(shared,/domain==='finance'/);
});

test('S1841: service save paths no longer redraw unrelated Dashboard/Finance',()=>{
  assert.doesNotMatch(servis,/save\(\);renderCnTab\(\);renderDashboard\(\);renderKeuangan\(\)/);
  assert.doesNotMatch(servis,/closeModal\('servisModal'\);renderCnTab\(\);renderDashboard\(\);renderKeuangan\(\)/);
});

test('S1841: finance save paths no longer redraw unrelated Dashboard/Finance together',()=>{
  assert.doesNotMatch(finance,/save\(\);closeModal\('txModal'\);renderDashboard\(\);renderKeuangan\(\);renderBillList\(\);checkBills\(\)/);
  assert.doesNotMatch(finance,/closeModal\('txModal'\);renderDashboard\(\);renderKeuangan\(\);renderCnTab\(\)/);
});
