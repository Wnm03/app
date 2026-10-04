const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('S2447: PDF.js 3.x CVE workaround is explicitly enforced',()=>{
  const src=read('modules/vehicle/vehicle-catalog-import.js');
  assert.match(src,/getDocument\(\{\s*data:\s*buf,\s*isEvalSupported:\s*false\s*\}\)/);
});

test('S2447: release-final-gate includes strict release-readiness gate',()=>{
  const src=read('scripts/release-final-gate.js');
  assert.match(src,/release-readiness-strict/);
  assert.match(src,/scripts\/verify-release-ready\.js/);
  assert.match(src,/No manual[\s\S]*overrides/);
});
