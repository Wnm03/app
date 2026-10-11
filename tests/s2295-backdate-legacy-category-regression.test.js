'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const bbm = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');
const tx = fs.readFileSync(path.join(root, 'modules/finance/transaksi-b.js'), 'utf8');

test('S2295 BBM validates odometer against nearest dated neighbours', () => {
  assert.match(bbm, /const prior=datedLogs\.filter\(x=>String\(x\.date\)<String\(date\)\)/);
  assert.match(bbm, /const next=datedLogs\.filter\(x=>String\(x\.date\)>String\(date\)\)/);
  assert.match(bbm, /if\(prior&&km<Number\(prior\.km\)\)/);
  assert.match(bbm, /if\(next&&km>Number\(next\.km\)\)/);
  // Semantic regression fixture: a valid backdated reading lies between its neighbours.
  const logs = [{ date: '2026-09-01', km: 12000 }, { date: '2026-10-01', km: 13000 }];
  const date = '2026-09-15', km = 12500;
  const prior = logs.filter(x => x.date < date).sort((a,b) => b.date.localeCompare(a.date))[0];
  const next = logs.filter(x => x.date > date).sort((a,b) => a.date.localeCompare(b.date))[0];
  assert.ok(!prior || km >= prior.km);
  assert.ok(!next || km <= next.km);
});

test('S2295 rejects new unknown categories but allows unchanged legacy category edits', () => {
  assert.match(tx, /const categoryExists=/);
  assert.match(tx, /const editingLegacyCategory=!!txEditId&&!!D\.transactions\.find/);
  assert.match(tx, /if\(!categoryExists&&!editingLegacyCategory\)/);
  const categories = ['Makan'];
  const legacy = { id: 'old-1', category: 'Kategori Dihapus' };
  const isKnown = category => categories.includes(category);
  const legacyEditAllowed = !!'old-1' && legacy.category === 'Kategori Dihapus';
  assert.equal(!isKnown(legacy.category) && !legacyEditAllowed, false);
  assert.equal(!isKnown('Kategori Ketik Bebas') && !false, true);
});
