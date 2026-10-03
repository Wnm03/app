const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync('modules/shared/modules-render.js','utf8');
const start = src.indexOf('function renderBillList(){');
assert.ok(start >= 0);
const end = src.indexOf('\nfunction ', start + 10);
const body = src.slice(start, end > 0 ? end : src.length);

test('S2362: renderBillList membentuk active dan paid-period entries dalam satu pass D.bills', () => {
  assert.match(body, /const activeBillEntries=\[\];/);
  assert.match(body, /const paidPeriodEntries=\[\];/);
  assert.match(body, /for\(const b of \(D\.bills\|\|\[\]\)\)/);
  assert.match(body, /activeBillEntries\.push\(\{\.\.\.b,_lunas:false,_dateForFilter:b\.nextDue\}\);/);
  assert.match(body, /const info=getBillPaidThisPeriodInfo\(b,billFilterBulan,billFilterTahun\);/);
  assert.match(body, /if\(info\)paidPeriodEntries\.push/);
  assert.doesNotMatch(body, /const paidPeriodEntries=D\.bills\.map/);
  assert.doesNotMatch(body, /\.\.\.D\.bills\.map\(b=>\(\{\.\.\.b,_lunas:false,_dateForFilter:b\.nextDue\}\)\)/);
});

test('S2362: arsip tetap berada di antara active dan paid-period entries', () => {
  assert.match(body, /\.\.\.activeBillEntries,[\s\S]*\.\.\.\(D\.billsArchive\|\|\[\]\)\.map\(b=>\(\{\.\.\.b,_lunas:true/);
  assert.match(body, /\.\.\.paidPeriodEntries/);
});
