const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');

test('Pro Dark UI layer is additive, scoped, and wired into both shells',()=>{
  const css=fs.readFileSync(path.join(ROOT,'pro-ui-layer.css'),'utf8');
  const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const prod=fs.readFileSync(path.join(ROOT,'app_production.html'),'utf8');
  const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
  assert.match(css,/\[data-theme="pro"\]/);
  assert.equal((css.match(/<script\b|@import\s+/g)||[]).length,0);
  assert.match(index,/pro-ui-layer\.css\?v=\d+/);
  assert.match(prod,/pro-ui-layer\.css\?v=\d+/);
  assert.match(sw,/['"]\.\/pro-ui-layer\.css['"]/);
  assert.match(index,/data-args='\["pro"\]'/);
  assert.match(prod,/data-args='\["pro"\]'/);
  assert.match(index,/option value="pro"/);
  assert.match(prod,/option value="pro"/);
});
