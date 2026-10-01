const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const idb = fs.readFileSync(path.join(root, 'modules/asset/aset-misc.js'), 'utf8');
const sec = fs.readFileSync(path.join(root, 'modules/shared/features-helpers-global-security.js'), 'utf8');

test('S2214: IDBStore exposes atomic readonly getMany for snapshot + writer guard', () => {
  assert.match(idb, /async getMany\(keys\)/);
  assert.match(idb, /const tx=db\.transaction\(IDBStore\.STORE,'readonly'\)/);
  assert.match(idb, /store\.get\(key\)/);
  assert.doesNotMatch(idb, /getMany\(keys\)[\s\S]{0,1200}localStorage/);
});

test('S2214: startup reads mirror and writer token in one IDB transaction', () => {
  const block = sec.slice(sec.indexOf('async function load(){'), sec.indexOf('const _parseStoredSnapshot='));
  assert.match(block, /IDBStore\.getMany\(\['kw_v4_mirror',_crossTabWriterGuardKey\]\)/);
  assert.match(block, /_crossTabWriterToken=_pair\[_crossTabWriterGuardKey\]/);
});

test('S2214: startup rechecks mirror + token immediately before applying D', () => {
  const marker = '// S2214: startup/load race guard.';
  const i = sec.indexOf(marker);
  assert.ok(i >= 0);
  const block = sec.slice(i, i + 1800);
  assert.match(block, /await IDBStore\.getMany\(\['kw_v4_mirror',_crossTabWriterGuardKey\]\)/);
  assert.match(block, /_crossTabWriterToken=_latestToken/);
  const apply = sec.indexOf('D={...D,...p};', i);
  assert.ok(apply > i, 'startup guard must execute before D merge');
});

test('S2214: stale startup context cannot overwrite a later tab commit', () => {
  const i = sec.indexOf('const ok=typeof IDBStore.setManyIfCurrent');
  assert.ok(i >= 0);
  const block = sec.slice(i, i + 900);
  assert.match(block, /if\(!ok\)\{_markCrossTabStale\(\);throw new Error\('Cross-tab persistence conflict/);
  assert.match(sec, /if\(_crossTabStateStale\)\{/);
});
