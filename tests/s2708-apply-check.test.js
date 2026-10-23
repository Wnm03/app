'use strict';
// S2708 — scripts/apply-check.js: baca-saja, mendeteksi konflik/hilang/rusak sebelum overlay patch dipasang.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { check } = require('../scripts/apply-check.js');
const SCRIPT = path.join(__dirname, '..', 'scripts', 'apply-check.js');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apchk-'));
  const patch = path.join(root, 'patch'), tgt = path.join(root, 'tgt');
  fs.mkdirSync(path.join(patch, 'a'), { recursive: true }); fs.mkdirSync(path.join(tgt, 'a'), { recursive: true });
  fs.writeFileSync(path.join(patch, 'a/x.js'), 'PATCH-X'); fs.writeFileSync(path.join(patch, 'a/new.js'), 'PATCH-NEW');
  fs.writeFileSync(path.join(tgt, 'a/x.js'), 'BASE-X');
  fs.writeFileSync(path.join(patch, 'BASELINE-HASHES.json'), JSON.stringify({ patch: 'T', files: {
    'a/x.js': { baseline: sha('BASE-X'), patch: sha('PATCH-X') },
    'a/new.js': { baseline: null, patch: sha('PATCH-NEW') }
  } }));
  return { root, patch, tgt };
}
const snapshot = (d) => fs.readdirSync(d, { recursive: true }).sort().map((f) => { const p = path.join(d, f); return f + ':' + (fs.statSync(p).isFile() ? sha(fs.readFileSync(p)) : 'dir'); }).join('|');

test('baseline asli → aman; tidak mengubah apa pun', () => {
  const f = fixture(), before = snapshot(f.tgt);
  const r = check(f.patch, f.tgt);
  assert.ok(r.safe); assert.deepEqual(r.ok, ['a/x.js']); assert.deepEqual(r.newOk, ['a/new.js']);
  assert.equal(snapshot(f.tgt), before, 'folder tujuan tidak boleh berubah');
});
test('sudah terpasang → aman (idempoten)', () => {
  const f = fixture(); fs.copyFileSync(path.join(f.patch, 'a/x.js'), path.join(f.tgt, 'a/x.js')); fs.copyFileSync(path.join(f.patch, 'a/new.js'), path.join(f.tgt, 'a/new.js'));
  const r = check(f.patch, f.tgt); assert.ok(r.safe); assert.equal(r.applied.length, 2);
});
test('file diubah di luar rantai → KONFLIK dan exit 1', () => {
  const f = fixture(); fs.writeFileSync(path.join(f.tgt, 'a/x.js'), 'EDIT-USER');
  assert.equal(check(f.patch, f.tgt).conflict.length, 1);
  assert.equal(spawnSync(process.execPath, [SCRIPT, f.tgt, '--patch-dir', f.patch]).status, 1);
});
test('file baru sudah ada dengan isi berbeda → KONFLIK', () => {
  const f = fixture(); fs.writeFileSync(path.join(f.tgt, 'a/new.js'), 'LAIN');
  assert.equal(check(f.patch, f.tgt).conflict[0].rel, 'a/new.js');
});
test('file baseline hilang di tujuan → tidak aman', () => {
  const f = fixture(); fs.unlinkSync(path.join(f.tgt, 'a/x.js'));
  const r = check(f.patch, f.tgt); assert.deepEqual(r.missing, ['a/x.js']); assert.ok(!r.safe);
});
test('isi folder patch rusak/terpotong → terdeteksi', () => {
  const f = fixture(); fs.writeFileSync(path.join(f.patch, 'a/x.js'), 'PATCH-X-RUSAK');
  const r = check(f.patch, f.tgt); assert.deepEqual(r.corrupt, ['a/x.js']); assert.ok(!r.safe);
});
test('CLI: exit 0 saat aman, exit 2 tanpa argumen / tanpa manifest', () => {
  const f = fixture();
  assert.equal(spawnSync(process.execPath, [SCRIPT, f.tgt, '--patch-dir', f.patch]).status, 0);
  assert.equal(spawnSync(process.execPath, [SCRIPT]).status, 2);
  assert.equal(spawnSync(process.execPath, [SCRIPT, f.tgt, '--patch-dir', f.tgt]).status, 2);
});
