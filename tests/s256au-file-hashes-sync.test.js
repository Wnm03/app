'use strict';
// S256AU — FILE-HASHES-SHA256.txt harus sinkron dengan file sebenarnya.
// File hasil build (bundle, html, sw.js) dikecualikan karena berubah tiap `npm run build`;
// untuk itu jalankan `python3 scripts/refresh-file-hashes.py --write` setelah build.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
// Berubah tiap `npm run build`: 5 file keluaran + file source yang konstanta versinya di-bump build
// + 2 dokumen yang ditulis ulang build (FILE-MAP, COVERAGE-PER-MODULE). Diverifikasi lewat build uji coba (S256AW).
const BUILD_OUTPUTS = new Set([
  'app-bundle-a.min.js', 'app-bundle-b.min.js', 'app_production.html', 'index.html', 'sw.js',
  'chat-action-handlers.js', 'modules/shared/features-helpers-global-security.js', 'modules/shared/modals.js',
  'modules/shared/modules-calc.js', 'modules/shared/modules-render.js',
  'docs/FILE-MAP.md', 'docs/COVERAGE-PER-MODULE.md',
]);
const entries = fs.readFileSync(path.join(ROOT, 'FILE-HASHES-SHA256.txt'), 'utf8')
  .split('\n').filter(Boolean).map((l) => {
    const m = /^([0-9a-f]{64})  (.+)$/.exec(l);
    assert.ok(m, 'format baris salah: ' + l);
    return { hash: m[1], rel: m[2] };
  });

test('S256AU: semua path terdaftar ada', () => {
  const missing = entries.filter((e) => !fs.existsSync(path.join(ROOT, e.rel))).map((e) => e.rel);
  assert.deepStrictEqual(missing, []);
});

test('S256AU: hash file non-build cocok dengan isi file', () => {
  const stale = entries
    .filter((e) => !BUILD_OUTPUTS.has(e.rel))
    .filter((e) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, e.rel))).digest('hex') !== e.hash)
    .map((e) => e.rel);
  assert.deepStrictEqual(stale, []);
});

test('S256AU: tidak ada path duplikat', () => {
  const rels = entries.map((e) => e.rel);
  assert.strictEqual(new Set(rels).size, rels.length);
});

test('S256AU: skrip refresh ada dan --check mengenali hash basi (kontrol negatif)', () => {
  const cp = require('child_process');
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's256au-'));
  fs.mkdirSync(path.join(tmp, 'scripts'));
  fs.copyFileSync(path.join(ROOT, 'scripts/refresh-file-hashes.py'), path.join(tmp, 'scripts/refresh-file-hashes.py'));
  fs.writeFileSync(path.join(tmp, 'a.txt'), 'x');
  const h = crypto.createHash('sha256').update('x').digest('hex');
  const run = () => cp.spawnSync('python3', ['-I', path.join(tmp, 'scripts/refresh-file-hashes.py'), '--check']).status;
  fs.writeFileSync(path.join(tmp, 'FILE-HASHES-SHA256.txt'), h + '  a.txt\n');
  assert.strictEqual(run(), 0);
  fs.writeFileSync(path.join(tmp, 'a.txt'), 'y');
  assert.strictEqual(run(), 1);
  fs.writeFileSync(path.join(tmp, 'a.txt'), 'x');
  fs.appendFileSync(path.join(tmp, 'FILE-HASHES-SHA256.txt'), h + '  hilang.txt\n');
  assert.strictEqual(run(), 1);
});
