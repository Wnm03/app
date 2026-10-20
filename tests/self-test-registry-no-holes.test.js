'use strict';
// Regresi: typo koma ganda `},,` di array case self-test membuat elemen kosong (hole) ->
// runner melempar "Cannot read properties of undefined (reading 'fn')" dgn nama "(kasus tanpa nama)".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

function loadRegistry() {
  const ctx = vm.createContext({ console });
  for (const f of ['modules/shared/self-test-cases-a.js', 'modules/shared/self-test-cases-b.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  }
  return vm.runInContext('__kwSelfTestCases()', ctx);
}

test('registry self-test: tidak ada hole/undefined, tiap entri punya name & fn', () => {
  const cases = loadRegistry();
  assert.ok(cases.length > 0);
  for (let i = 0; i < cases.length; i++) {
    assert.ok(i in cases && cases[i], 'entri #' + (i + 1) + ' kosong/hole (cek koma ganda)');
    assert.ok(cases[i].name, 'entri #' + (i + 1) + ' tanpa name');
    assert.strictEqual(typeof cases[i].fn, 'function', 'entri #' + (i + 1) + ' tanpa fn');
  }
});

test('self-test.js: runner punya guard untuk entri kosong (pesan jelas, bukan TypeError samar)', () => {
  const src = fs.readFileSync(path.join(root, 'self-test.js'), 'utf8');
  assert.ok(/typeof c\.fn!=='function'/.test(src));
});

test('source case self-test tidak mengandung koma ganda `},,`', () => {
  for (const f of ['modules/shared/self-test-cases-a.js', 'modules/shared/self-test-cases-b.js']) {
    assert.ok(!/\}\},\s*,/.test(fs.readFileSync(path.join(root, f), 'utf8')), f + ' ada "},,"');
  }
});
