'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} exists`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = null, escape = false;
  for (let i = brace; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

test('B1: local date helper returns today at 01:00 WIB, not previous UTC day', () => {
  const previousTZ = process.env.TZ; process.env.TZ = 'Asia/Jakarta';
  const source = read('modules/shared/features-helpers-global-security.js');
  const fixedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-11T18:00:00.000Z'])); }
    static now() { return new Date('2026-10-11T18:00:00.000Z').getTime(); }
  };
  const ctx = { Date: fixedDate };
  vm.runInNewContext(`${extractFunction(source, 'todayStr')}; ${extractFunction(source, 'localISO')}; this.out={todayStr,localISO};`, ctx);
  assert.equal(ctx.out.todayStr(), '2026-10-12');
  assert.equal(ctx.out.localISO(new fixedDate('2026-10-12T03:00:00.000Z')), '2026-10-12');
  if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;
});

test('B2: backup date-only range includes current local day and correct month snapshot', () => {
  const source = read('modules/shared/backup-restore.js');
  const helper = read('modules/shared/features-helpers-global-security.js');
  const ctx = { Date };
  vm.runInNewContext(`${extractFunction(helper, 'localISO')}; ${extractFunction(source, '_backupLocalISO')}; ${extractFunction(source, 'inRange')}; this.api={localISO,inRange};`, ctx);
  const from = new Date(2026, 9, 1), now = new Date(2026, 9, 12, 1);
  assert.equal(ctx.api.inRange('2026-10-12', from, now), true);
  assert.equal(ctx.api.inRange('2026-10-11', from, now), true);
  assert.equal(ctx.api.inRange('2026-09-30', from, now), false);
  assert.equal(ctx.api.localISO(new Date(2026, 9, 1)), '2026-10-01');
  assert.match(read('budget.js'), /function _budgetTxDate\(t\)/);
  assert.match(read('budget.js'), /_budgetTxDate\(t\)>=from&&_budgetTxDate\(t\)<=now/);
});

test('B3: borongan decimal parser handles comma, dot, thousands and round-trip area', () => {
  const source = read('pajak-aset-ui-wrappers.js');
  const ctx = {};
  vm.runInNewContext(`${extractFunction(source, 'parseDecimalID')}; this.parseDecimalID=parseDecimalID;`, ctx);
  assert.equal(ctx.parseDecimalID('2.5'), 2.5);
  assert.equal(ctx.parseDecimalID('2,5'), 2.5);
  assert.equal(ctx.parseDecimalID('12.5'), 12.5);
  assert.equal(ctx.parseDecimalID('1.500.000'), 1500000);
  const tukang = read('modules/business/tukang-absensi.js');
  const methodStart = tukang.indexOf('calcBorCalc(){');
  const methodEnd = tukang.indexOf('},\nuseBorCalc()', methodStart);
  assert.ok(methodStart >= 0 && methodEnd > methodStart, 'actual Tukang.calcBorCalc method exists');
  const methodBody = tukang.slice(methodStart + 'calcBorCalc(){'.length, methodEnd);
  const elements = new Map([
    ['tkBorCalcSatuan', { value: 'm2' }], ['tkBorCalcHitungUkuran', { checked: true }],
    ['tkBorCalcP', { value: '2,5' }], ['tkBorCalcL', { value: '4' }], ['tkBorCalcT', { value: '1' }],
    ['tkBorCalcLuas', { value: '' }], ['tkBorCalcHarga', { value: '100000' }],
    ['tkBorCalcLuasOut', { textContent: '' }], ['tkBorCalcTotal', { textContent: '' }],
    ['tkBorCalcLuasOutLbl', { textContent: '' }],
  ]);
  const actualCtx = {
    document: { getElementById: (id) => elements.get(id) },
    parseDecimalID: ctx.parseDecimalID,
    parsePzNum: (v) => Number(String(v || '').replace(/[^0-9-]/g, '')) || 0,
    fmtFull: (n) => 'Rp ' + String(n),
    Tukang: { BOR_UNIT_LABEL: { m2: 'm²', m3: 'm³' }, _borCalcResult: null },
  };
  vm.runInNewContext(`function calcBorCalc(){${methodBody}}; this.calcBorCalc=calcBorCalc;`, actualCtx);
  const result = actualCtx.calcBorCalc();
  assert.equal(result.luas, 10, '2,5 m × 4 m must yield 10 m² in the actual calculator');
  assert.equal(result.total, 1000000, '10 m² × Rp100.000 must yield Rp1.000.000');
  assert.equal(elements.get('tkBorCalcLuas').value, '10', 'calculated area round-trips to the input field');
  elements.get('tkBorCalcHitungUkuran').checked = false;
  elements.get('tkBorCalcLuas').value = '2,5';
  assert.equal(actualCtx.calcBorCalc().luas, 2.5, 'manual area input also preserves decimal comma');
  assert.match(tukang, /const p=parseDecimalID\(document\.getElementById\('tkBorCalcP'\)\.value\)/);
  assert.match(source, /function parsePzNum\(v\)/); // Rupiah parser remains available and unchanged.
});

test('B4: profit clamps discount at subtotal and keeps loss negative', () => {
  const source = read('modules/shared/format-tema.js');
  const ctx = {};
  vm.runInNewContext(`${extractFunction(source, 'calculateNetProfit')}; this.calculateNetProfit=calculateNetProfit;`, ctx);
  assert.equal(ctx.calculateNetProfit(100, 60, 20), 20);
  assert.equal(ctx.calculateNetProfit(100, 140, 20), -60);
  assert.equal(ctx.calculateNetProfit(100, 60, 150), -60);
  assert.match(read('modules/business/kasir.js'), /Estimasi rugi: .*fmtFullSigned\(profit\)/);
  assert.match(read('modules/shop/cobek-order.js'), /Estimasi rugi: .*fmtFullSigned\(profit\)/);
  assert.match(read('modules/shared/modules-calc.js'), /fmtFullSigned\(surplus\)/);
  assert.match(read('modules/shared/modules-calc.js'), /fmtFullSigned\(saldoAkun\)/);
});
