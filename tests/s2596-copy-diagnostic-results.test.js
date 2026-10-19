'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadHelper(overrides = {}) {
  const source = fs.readFileSync(require.resolve('../self-test.js'), 'utf8');
  const start = source.indexOf('async function copyDiagnosticText(text)');
  assert.notEqual(start, -1, 'shared copy helper exists');
  const end = source.indexOf('\nasync function copySelfTestResults()', start);
  assert.notEqual(end, -1, 'helper has a clear boundary');
  const sandbox = {
    navigator: overrides.navigator || {},
    document: overrides.document || {},
    Promise,
    String,
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end) + '\nthis.copyDiagnosticText = copyDiagnosticText;', sandbox);
  return sandbox.copyDiagnosticText;
}

function fakeDocument(copyResult = true) {
  const body = { appendChild(el) { el.parentNode = body; }, removeChild(el) { el.parentNode = null; } };
  return {
    body,
    createElement() { return { value: '', style: {}, setAttribute() {}, focus() {}, select() {}, setSelectionRange() {}, parentNode: null }; },
    execCommand(cmd) { assert.equal(cmd, 'copy'); return copyResult; },
  };
}

test('clipboard rejection falls back to legacy copy on mobile/embedded browsers', async () => {
  const copy = loadHelper({ navigator: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, document: fakeDocument(true) });
  assert.equal(await copy('hasil tes'), true);
});

test('clipboard API success reports copied without legacy fallback', async () => {
  let fallbackCalled = false;
  const doc = fakeDocument(true); doc.execCommand = () => { fallbackCalled = true; return true; };
  const copy = loadHelper({ navigator: { clipboard: { writeText: async (value) => assert.equal(value, 'hasil tes') } }, document: doc });
  assert.equal(await copy('hasil tes'), true);
  assert.equal(fallbackCalled, false);
});

test('failed legacy copy is not falsely reported as success', async () => {
  const copy = loadHelper({ navigator: {}, document: fakeDocument(false) });
  assert.equal(await copy('hasil tes'), false);
});

test('empty result is rejected without touching clipboard', async () => {
  const copy = loadHelper({ navigator: {}, document: fakeDocument(true) });
  assert.equal(await copy(''), false);
});

test('all three diagnostic result buttons use the shared verified helper', () => {
  const source = fs.readFileSync(require.resolve('../self-test.js'), 'utf8');
  for (const fn of ['copySelfTestResults', 'copyNavSmokeResults', 'copyModalSweepResults']) {
    const start = source.indexOf('async function ' + fn + '()');
    const end = source.indexOf('\n}', start);
    assert.notEqual(start, -1, fn + ' exists');
    assert.match(source.slice(start, end), /copyDiagnosticText\(text\)/, fn + ' uses helper');
  }
});
