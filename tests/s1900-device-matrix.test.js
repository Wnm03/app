const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1900 real-device matrix is explicit for the UI that previously overflowed',()=>{
 const doc=read('docs/REAL-DEVICE-VISUAL-MATRIX.md');
 for(const size of ['360x800','390x844','430x932','tablet','landscape'])assert.match(doc,new RegExp(size.replace('x','\\s*[×x]\\s*')));
 for(const page of ['Shop','Uang Mobil','Pajak & Zakat'])assert.match(doc,new RegExp(page));
 for(const state of ['keyboard','modal','drawer','offline','light','dark'])assert.match(doc,new RegExp(state,'i'));
});

test('S1900 responsive shell keeps viewport-fit and containment contracts',()=>{
 for(const f of ['index.html','app_production.html'])assert.match(read(f),/viewport[^>]+viewport-fit=cover/);
 const css=read('styles.css');
 assert.match(css,/\.pwa-domain-page\{[^}]*min-width:0/);
 assert.match(css,/orientation:landscape/);
});
