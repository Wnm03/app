const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const productionFiles = [
  'modules/asset/aset-owners.js',
  'modules/asset/investasi.js',
  'modules/finance/titipan-sync.js'
];

function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

test('S2189: residual Debt field mutations use canonical writer', () => {
  for (const rel of productionFiles) {
    const src = read(rel);
    assert.doesNotMatch(src, /Object\.assign\(debt\s*,/, `${rel} masih direct Object.assign(debt, ...)`);
    assert.equal(src.includes('d.linkedOwnerId=m.newId'), false, `${rel} masih legacy owner remap assignment`);
    assert.equal(src.includes('d.linkedOwnerId=newId'), false, `${rel} masih legacy owner remap assignment`);
  }
});

test('S2189: affected modules call canonical writer for Debt updates', () => {
  for (const rel of productionFiles) {
    const src = read(rel);
    assert.match(src, /BillDebtPiutangCanonicalWriter\.updateById\(['"]debts['"]/, `${rel} tidak memakai Debt canonical writer`);
  }
});
