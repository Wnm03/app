const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const p='modules/finance/tx-servis.js';
const s=fs.readFileSync(p,'utf8');
test('S16 Finance servis: checklist komponen muncul setelah kategori dan payload disimpan ke service event',()=>{
  assert.match(s,/ensureTxServisChecklistPanel/);
  assert.match(s,/findGroupByMasterCategoryId\(masterId\)/);
  assert.match(s,/TxServis\.toggleChecklist/);
  assert.match(s,/toLogPayload\(\)/);
  assert.match(s,/checklist,\s*\n?km:opts\.km/);
});
