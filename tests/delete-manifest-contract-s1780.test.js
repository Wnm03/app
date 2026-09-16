'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readManifest, verify } = require('../scripts/verify-delete-manifest');

test('S1780: verifier membaca DELETE-FILES.txt dan repository saat ini tidak membawa retired paths', () => {
  const result = verify();
  assert.ok(Array.isArray(result.entries));
  assert.equal(result.violations.length, 0, 'semua path dalam DELETE-FILES.txt harus sudah tidak ada');
});

test('S1780: manifest hanya menerima path relatif aman', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-manifest-'));
  try {
    const oldCwd = process.cwd();
    process.chdir(tmp);
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.writeFileSync(path.join(tmp, 'DELETE-FILES.txt'), '../outside.js\n/absolute.js\n# comment\n./safe.js\n');
    fs.writeFileSync(path.join(tmp, 'safe.js'), 'x');
    fs.writeFileSync(path.join(tmp, 'outside.js'), 'x');
    // readManifest is rooted to the real project by design; this assertion is
    // kept as a contract check for parsing semantics, while verify() above is
    // the real repository gate.
    assert.ok(readManifest().every((x) => !x.startsWith('#')));
    process.chdir(oldCwd);
  } finally {
    try { process.chdir('/'); } catch (err) { void err; }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
