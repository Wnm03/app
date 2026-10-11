'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function src(p){return fs.readFileSync(p,'utf8');}
test('BUG-01: Settings self-test result is safe before lazy harness loads',()=>{
 const s=src('modules/shared/modules-render-b.js');
 assert.match(s,/typeof _lastSelfTestData!=='undefined'&&_lastSelfTestData/);
});
test('BUG-02: Dashboard Hub calls feature-grid method on its owner',()=>{
 const s=src('modules/dashboard-hub/dashboard-hub.js');
 assert.match(s,/DashboardHubHero\.renderFeatureGrid\(\)/);
});
test('BUG-03: proactive reminders never stringify missing bill kind as undefined',()=>{
 const s=src('modules/vehicle/vehicle-core.js');
 assert.match(s,/b\.kind\|\|'tagihan'/);
});
test('BUG-04/06: product prices reject nonpositive and excessive values',()=>{
 const s=src('modules/shop/cobek-etalase.js');
 assert.match(s,/hargaJual<=0/); assert.match(s,/hargaJual>999000000000/);
});
test('BUG-05/06: asset amount and account/receivable/debt amounts are bounded',()=>{
 assert.match(src('modules/asset/aset.js'),/nilai>999000000000/);
 assert.match(src('modules/finance/akun.js'),/Math\.abs\(nominal\)>999000000000/);
 assert.match(src('modules/finance/piutang-utang.js'),/nilai>999000000000/);
});
test('BUG-07: BBM form guards future dates and odometer regression',()=>{
 const s=src('car-notes.js');
 assert.match(s,/date>todayKey/); assert.match(s,/km<Number\(prior\.km\)/);
});
test('BUG-08: transaction category is validated before canonical write',()=>{
 const s=src('modules/finance/transaksi-b.js');
 assert.match(s,/getCatsByType\(curTxType\)\.some/);
});
test('BUG-09: restore initializes lazy harness before runtime init and preserves original error on rollback',()=>{
 const s=src('modules/shared/backup-restore.js');
 assert.match(s,/async function _restoreEnsureInit\(\)/);
 assert.match(s,/await ensureSelfTest\(\)/);
 assert.match(s,/error restore asli dipertahankan/);
});
