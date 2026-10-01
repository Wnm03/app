const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');

test('S2229 package scripts do not reference missing local JS commands',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  const missing=[];
  for(const [name,command] of Object.entries(pkg.scripts||{})){
    const re=/(?:^|\s)node\s+(scripts\/[^\s]+\.js)/g;
    let m;
    while((m=re.exec(command))){
      const file=m[1];
      if(!fs.existsSync(path.join(ROOT,file))) missing.push(`${name}: ${file}`);
    }
  }
  assert.deepEqual(missing,[],'package.json masih memiliki command yang menunjuk script lokal yang hilang');
});

test('S2229 document-status README no longer claims a missing release-gate script',()=>{
  const s=fs.readFileSync(path.join(ROOT,'README-S1942-DOCUMENT-STATUS-RECONCILIATION.md'),'utf8');
  assert.doesNotMatch(s,/scripts\/document-status-audit\.js.*release gate/);
  assert.match(s,/PROJECT-STATUS-REGISTRY\.md.*sumber status/);
});
