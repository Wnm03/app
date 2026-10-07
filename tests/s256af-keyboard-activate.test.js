'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'modules/shared/features-helpers-global-security.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function load() {
  const m = src.match(/function _dataActionKeyActivate\(e\)\{[\s\S]*?\n\}\n/);
  assert.ok(m, 'handler present');
  return new Function(m[0] + '; return _dataActionKeyActivate;')();
}
function ev(key, el, extra) {
  let prevented = false;
  return Object.assign({ key, target: el, preventDefault() { prevented = true; }, get prevented() { return prevented; } }, extra || {});
}
function el(tag, matches, extra) {
  const o = { tagName: tag, clicks: 0, isContentEditable: false, matches: () => matches, click() { this.clicks++; } };
  return Object.assign(o, extra || {});
}

test('S256AF: Enter and Space click a role=button[data-action] div', () => {
  const h = load();
  for (const k of ['Enter', ' ']) {
    const d = el('DIV', true); const e = ev(k, d); h(e);
    assert.strictEqual(d.clicks, 1); assert.ok(e.prevented);
  }
});

test('S256AF: ignores other keys, repeats, native controls, editable and unmatched targets', () => {
  const h = load();
  const cases = [
    [ev('a', el('DIV', true))], [ev('Enter', el('DIV', true), { repeat: true })],
    [ev('Enter', el('BUTTON', true))], [ev('Enter', el('INPUT', true))],
    [ev('Enter', el('DIV', true, { isContentEditable: true }))], [ev('Enter', el('DIV', false))],
    [ev('Enter', el('DIV', true), { defaultPrevented: true })], [ev('Enter', el('DIV', true), { isComposing: true })],
  ];
  for (const [e] of cases) { h(e); assert.strictEqual(e.target.clicks, 0); assert.ok(!e.prevented); }
});

test('S256AF: handler is registered on document (bubble phase) and backup badge is focusable', () => {
  assert.ok(/document\.addEventListener\('keydown', _dataActionKeyActivate\);/.test(src));
  assert.ok(html.includes('id="backupBadge" data-action="runFullBackup" role="button" tabindex="0"'));
});
