const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const files = [
  'car-notes.js','modules/shop/modules-render.js','modules/shop/cobek-tx-cart.js','modules/shop/cobek-etalase.js','modules/shop/cobek-order.js',
  'modules/finance/tagihan-kalender.js','modules/finance/piutang-utang.js','modules/finance/tx-bbm.js','modules/finance/tx-renov.js','modules/finance/edukasi-dana.js','modules/finance/linktx.js','modules/finance/tx-stok-sparepart.js','modules/finance/titipan-expense-ui.js','modules/shared/modules-calc.js','modules/home/refleksi-selfcare.js','modules/home/renovasi.js','modules/business/sewakios.js','modules/business/kasir.js','modules/vehicle/servis.js','modules/vehicle/vehicle-core.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-ui.js'
];
const patterns = [
  /value="\$\{[a-zA-Z]+\.id\}"/g,
  /id="refNote(?:Body|EyeBtn)_\$\{n\.id\}"/g
];
for (const rel of files) {
  const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const re of patterns) assert.strictEqual(s.match(re), null, `${rel}: unencoded persisted ID attribute remains`);
}
assert.match(fs.readFileSync(path.join(ROOT,'modules/home/refleksi-selfcare.js'),'utf8'), /\$\{escapeHtml\(n\.date\)\}/);
console.log('S2444 attribute ID encoding: 1/1 PASS');
