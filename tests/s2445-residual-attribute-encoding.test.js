const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('S2445: persisted IDs/emoji are encoded before HTML attribute/text sinks', () => {
  const aset = read('modules/asset/aset-misc.js');
  const cobek = read('modules/shop/cobek-order.js');
  const kasir = read('modules/business/kasir.js');
  assert.match(aset, /data-args='\$\{escapeHtml\(JSON\.stringify\(\[r\.id\]\)\)\}'/);
  assert.match(aset, /escapeHtml\(r\.emoji\|\|''\)/);
  assert.match(cobek, /data-prod-id="\$\{escapeHtml\(p\.id\)\}"/);
  assert.match(kasir, /data-args='\["\$\{escapeHtml\(c\.id\)\}"\]'/);
  assert.doesNotMatch(aset, /data-args='\$\{JSON\.stringify\(\[r\.id\]\)\}'/);
  assert.doesNotMatch(cobek, /data-prod-id="\$\{p\.id\}"/);
});
