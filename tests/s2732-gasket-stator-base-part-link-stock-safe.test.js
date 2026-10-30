'use strict';
// S2732 — tautan Gasket Stator Base ×2 → part katalog 11363KWN900 via catalogPartRefs, tanpa efek ke stok.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const synth = require('./_synthetic-data-fix');
const PREV = synth.s2732Prev();
const NEXT = synth.s2732Next();
const SCRIPT = path.join(ROOT, 'scripts/link-gasket-stator-base-part-s2732.js');
const IDS = [1782820344534, 1782820344535];
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

test('kedua log tertaut ke part katalog 11363KWN900 (qty 1) lewat catalogPartRefs', () => {
  const d = load(NEXT);
  const part = d._vehicleCatalogStore.items.filter(p => p.oemCode === '11363KWN900');
  assert.equal(part.length, 1);
  IDS.forEach(id => {
    const l = d.servisLogs.find(x => x.id === id);
    assert.deepEqual(l.catalogPartRefs, [{ catalogId: String(part[0].id), qty: 1 }]);
    assert.equal(l.serviceComponentId || null, null, 'bukan komponen servis');
  });
});

test('STOK AMAN: partsStock identik; tidak ada usedPartId/catalogPartLinkedStockId (hapus-log tak mengembalikan stok)', () => {
  const a = load(PREV), b = load(NEXT);
  assert.deepEqual(b.partsStock, a.partsStock);
  IDS.forEach(id => {
    const l = b.servisLogs.find(x => x.id === id);
    assert.ok(!l.usedPartId); assert.ok(!l.catalogPartLinkedStockId);
    assert.equal(Number(l.usedPartQty) || 0, 0);
  });
});

test('perubahan hanya catalogPartRefs pada 2 log; biaya/teks/jumlah baris tak berubah', () => {
  const a = load(PREV), b = load(NEXT);
  assert.equal(a.servisLogs.length, b.servisLogs.length);
  a.servisLogs.forEach((l, i) => {
    const m = b.servisLogs[i];
    if (!IDS.includes(l.id)) return assert.deepEqual(m, l);
    const { catalogPartRefs: _x, ...restA } = l, { catalogPartRefs: _y, ...restB } = m; void _x; void _y;
    assert.deepEqual(restB, restA);
  });
});

test('checksum tersegel valid & skrip idempoten', () => {
  const b = load(NEXT);
  const c = Object.assign({}, b); delete c._integrity;
  assert.equal(sha(JSON.stringify(c)), b._integrity.payloadHash);
  const out = path.join(os.tmpdir(), 's2732-second-' + process.pid + '.json');
  execFileSync(process.execPath, [SCRIPT, NEXT, out], { stdio: 'ignore' });
  const c2 = load(out); delete c2._integrity; delete b._integrity;
  assert.deepEqual(c2, b);
  fs.unlinkSync(out);
});
