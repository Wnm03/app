const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const root=path.resolve(__dirname,'..'); const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('S2446: remaining persisted identifiers/date attributes are HTML-encoded',()=>{
 const checks={
  'modules/finance/dana-titipan-portfolio-render.js':[/escapeHtml\(r\.id\)/],
  'modules/shop/business-flow-presenter-inventory.js':[/escapeHtml\(s\.id\)/],
  'modules/business/kasir.js':[/escapeHtml\(p\.id\)/],
  'modules/home/hidup-seimbang.js':[/escapeHtml\(s\.date\)/],
  'modules/business/tukang-absensi.js':[/escapeHtml\(w\.id\)/g,/escapeHtml\(a\.id\)/g,/escapeHtml\(a\.date\)/g,/escapeHtml\(iso\)/g]
 };
 for(const [f,patterns] of Object.entries(checks)){const s=read(f); for(const re of patterns) assert.match(s,re,f);}
});
