const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/ripple-position.js'), 'utf8');

function loadWithDoc(doc) {
  const context = { document: doc, console, WeakSet, PointerEvent: function PointerEvent() {} };
  vm.runInNewContext(src + '\nthis.__setup = setupRipplePositionTracking;', context, { filename: 'ripple-position.js' });
  return context;
}
test('setupRipplePositionTracking memasang listener hanya sekali pada document yang sama', () => {
  const listeners = [];
  const doc = { addEventListener(type, fn, opts) { listeners.push({ type, fn, opts }); } };
  const ctx = loadWithDoc(doc);
  assert.equal(listeners.length, 1);
  ctx.__setup(doc);
  ctx.__setup(doc);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].type, 'pointerdown');
});

test('document berbeda tetap boleh memiliki lifecycle listener sendiri', () => {
  const a = { addEventListener(type, fn, opts) { (this.l ||= []).push(type); } };
  const b = { addEventListener(type, fn, opts) { (this.l ||= []).push(type); } };
  const ctx = loadWithDoc(a);
  ctx.__setup(b);
  assert.deepEqual(a.l, ['pointerdown']);
  assert.deepEqual(b.l, ['pointerdown']);
});
