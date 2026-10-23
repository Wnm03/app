'use strict';
// S2704 — getCachedTxDateMs: cek cache sebelum parse. Diferensial vs implementasi lama (fixture beku).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
function load(file) {
  const a = file.indexOf('const _txDateCache=');
  const b = file.indexOf('function _perfMark');
  assert.ok(a >= 0 && b > a);
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(file.slice(a, b) + '\nthis.f=getCachedTxDateMs;', ctx);
  return ctx.f;
}
const NEW = load(read('modules/shared/features-helpers-global-security.js'));
const OLD = load(read('tests/fixtures/s2704-features-helpers-original.js'));
const same = (x, y) => (Number.isNaN(x) && Number.isNaN(y)) || x === y;

test('hasil identik untuk berbagai bentuk tanggal', () => {
  const vals = ['2026-10-23', '2026-02-30', '2026-10-23T10:00:00Z', 'bukan tanggal', '', null, undefined, 20261023, new Date(0), '2024-02-29'];
  for (const v of vals) assert.ok(same(NEW({ date: v }), OLD({ date: v })), String(v));
  assert.ok(Number.isNaN(NEW(null)) && Number.isNaN(NEW(undefined)));
});

test('cache terbit ulang saat t.date berubah (invalidasi otomatis)', () => {
  const t = { date: '2026-01-05' };
  const a = NEW(t); assert.equal(NEW(t), a);
  t.date = '2026-03-09';
  assert.ok(same(NEW(t), OLD({ date: '2026-03-09' })));
  assert.notEqual(NEW(t), a);
});

test('tidak parse ulang pada cache hit (dihitung DI DALAM konteks vm)', () => {
  // Patch String.prototype milik realm vm itu sendiri; patch di realm luar tidak terlihat oleh kode di dalam vm.
  const ctx = {};
  vm.createContext(ctx);
  const file = read('modules/shared/features-helpers-global-security.js');
  const a = file.indexOf('const _txDateCache='), b = file.indexOf('function _perfMark');
  vm.runInContext(file.slice(a, b) + `
    this.f = getCachedTxDateMs; this.matchCalls = 0;
    const _m = String.prototype.match;
    String.prototype.match = function () { this.matchCalls = 0; matchCallsInc(); return _m.apply(this, arguments); };
  `.replace('this.matchCalls = 0; matchCallsInc();', 'globalThis.matchCalls++;'), ctx);
  const t = { date: '2026-01-05' };
  ctx.f(t);
  const before = ctx.matchCalls;
  for (let i = 0; i < 100; i++) ctx.f(t);
  assert.equal(ctx.matchCalls - before, 0);
  assert.ok(before >= 1, 'penghitung harus aktif (parse pertama memakai regex)');
});
