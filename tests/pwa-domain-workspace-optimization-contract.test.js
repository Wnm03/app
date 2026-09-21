const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'pwa-ui-layer.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('S1890 UI: Shop/Car/Pajak keep baseline pages and tab hooks',()=>{
  for(const id of ['page-shop','page-carnotes','page-pajak']) assert.match(html,new RegExp(`id=["']${id}["']`));
  for(const action of ['setShopTab','setCnTab','setPajakTab','setPjkTab']) assert.match(html,new RegExp(`data-action=["']${action}["']`));
  for(const id of ['shopTab-kasir','shopTab-etalase','shopTab-bi','cnTab-insight','cnTab-bbm','cnTab-servis','cnTab-pajak','cnTab-jalan','pajakTab-zakat','pajakTab-pajak','pjkTab-pph21','pjkTab-pbb']) assert.match(html,new RegExp(`id=["']${id}["']`));
});

test('S1890 UI: domain pages use responsive workspace layout without new framework',()=>{
  assert.match(css,/page-shop\.page\.active/);
  assert.match(css,/page-carnotes\.page\.active/);
  assert.match(css,/page-pajak\.page\.active/);
  assert.match(css,/@media\(min-width:900px\)/);
  assert.match(css,/@media\(max-width:899px\)/);
  assert.match(css,/content-visibility:auto/);
  assert.doesNotMatch(css,/@import\s+url\(/i);
  assert.doesNotMatch(css,/tailwind|bootstrap|material-ui/i);
});

test('S1890 performance guard: PWA UI layer stays <= 15 KB',()=>{
  assert.ok(Buffer.byteLength(css,'utf8')<=15000,`pwa-ui-layer.css is ${Buffer.byteLength(css,'utf8')} bytes`);
});
