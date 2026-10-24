'use strict';
// S2733 — merge stok kembar: hanya baris yatim terhapus, data lain identik, idempoten.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const PREV = path.join(ROOT, 'data-fix/backup-keluarga-W-2026-10-24-CLEAN-S2730-dedup-S2731-FIXED-S2732.json');
const NEXT = path.join(ROOT, 'data-fix/backup-keluarga-W-2026-10-24-CLEAN-S2730-dedup-S2731-FIXED-S2732-S2733.json');
const REPORT = path.join(ROOT, 'data-fix/laporan-perubahan-S2733.json');
const SCRIPT = path.join(ROOT, 'scripts/merge-duplicate-stock-s2733.js');
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const norm = c => String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '');

test('tidak ada lagi grup kembar (kendaraan + kode part)', () => {
  const seen = new Set();
  load(NEXT).partsStock.forEach(r => { const k = r.vehicleId + '|' + norm(r.code); if (!norm(r.code)) return; assert.ok(!seen.has(k), 'kembar: ' + k); seen.add(k); });
});

test('hanya baris yatim yang dihapus; total qty & bagian data lain identik; baris terhapus ada di laporan', () => {
  const a = load(PREV), b = load(NEXT), rep = load(REPORT);
  assert.equal(a.partsStock.length - b.partsStock.length, rep.removed.length);
  assert.equal(rep.removed.length, rep.summary.groupsMerged);
  const keep = new Set(b.partsStock.map(r => r.id));
  rep.removed.forEach(x => { assert.ok(!keep.has(x.row.id)); assert.ok(keep.has(x.keptId)); assert.ok(!x.row.catId); assert.equal(Number(x.row.qty), 0); });
  assert.equal(a.partsStock.reduce((s, r) => s + (+r.qty || 0), 0), b.partsStock.reduce((s, r) => s + (+r.qty || 0), 0));
  Object.keys(a).forEach(k => { if (k === 'partsStock' || k === '_integrity') return; assert.deepEqual(b[k], a[k], 'berubah: ' + k); });
  b.partsStock.forEach(r => assert.deepEqual(r, a.partsStock.find(x => x.id === r.id)));
});

test('checksum backup hasil valid', () => {
  const b = load(NEXT), c = Object.assign({}, b); delete c._integrity;
  assert.equal(sha(JSON.stringify(c)), b._integrity.payloadHash);
});

test('skrip idempoten: jalan ulang = 0 perubahan', () => {
  const tmp = path.join(os.tmpdir(), 's2733-idem-' + process.pid + '.json');
  const o = JSON.parse(execFileSync('node', [SCRIPT, NEXT, tmp], { encoding: 'utf8' }));
  assert.equal(o.groupsMerged, 0); assert.equal(o.stockBefore, o.stockAfter);
  fs.unlinkSync(tmp);
});
