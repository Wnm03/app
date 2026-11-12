// S2800: dropdown stok transaksi dikelompokkan "Stok tersedia" / "Katalog (stok 0)"; jumlah baris tidak berubah.
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const tx = fs.readFileSync(path.join(root, 'modules/finance/tx-stok-sparepart.js'), 'utf8');
const pc = fs.readFileSync(path.join(root, 'modules/vehicle/part-crud-s2041.js'), 'utf8');
function loadOptionsHtml() {
  const m = tx.match(/function txStockOptionsHtml\(list\)\{[\s\S]*?\n\}\nfunction populateTxStockSelect/);
  assert.ok(m, 'txStockOptionsHtml tidak ditemukan');
  const src = m[0].replace(/function populateTxStockSelect$/, '');
  return new Function('escapeHtml', src + '; return txStockOptionsHtml;')(s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'));
}
const count = (h, re) => (h.match(re) || []).length;
test('campuran stok>0 dan 0 -> dua optgroup, semua baris tetap ada, stok 0 dapat dipilih', () => {
  const f = loadOptionsHtml();
  const list = [{ id: 'a', name: 'Oli', qty: 3 }, { id: 'b', name: 'Busi', qty: 0 }, { id: 'c', name: 'Kampas', qty: 0 }];
  const h = f(list);
  assert.ok(h.includes('<optgroup label="Stok tersedia">') && h.includes('<optgroup label="Katalog (stok 0)">'));
  assert.strictEqual(count(h, /<option /g), 4); // __new__ + 3
  assert.ok(h.indexOf('value="a"') < h.indexOf('Katalog (stok 0)') && h.indexOf('value="b"') > h.indexOf('Katalog (stok 0)'));
  assert.ok(h.startsWith('<option value="__new__">'));
});
test('hanya satu jenis -> tanpa optgroup (perilaku lama)', () => {
  const f = loadOptionsHtml();
  assert.ok(!f([{ id: 'b', name: 'Busi', qty: 0 }]).includes('optgroup'));
  assert.ok(!f([{ id: 'a', name: 'Oli', qty: 2 }]).includes('optgroup'));
});
test('PartPicker memakai optgroup yang sama dan pembanding mengabaikan tag grup', () => {
  assert.ok(pc.includes('Katalog (stok 0)') && pc.includes('Stok tersedia'));
  assert.ok(pc.includes("replace(/<\\/?optgroup[^>]*>/g,'')"));
});
