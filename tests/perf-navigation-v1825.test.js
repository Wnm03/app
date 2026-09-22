'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const a=fs.readFileSync('app-bundle-a.min.js','utf8');
const b=fs.readFileSync('app-bundle-b.min.js','utf8');

test('Keuangan page navigation is top-tab scoped',()=>{
  const i=a.indexOf("if(name==='keuangan'){");
  const j=a.indexOf("if(name==='shop')",i);
  const body=a.slice(i,j);
  assert.match(body,/const tab=getActivePageTab\('page-keuangan','kelola'\)/);
  assert.match(body,/if\(tab==='kelola'\)/);
  assert.match(body,/else if\(tab==='tagihan'\)/);
  assert.match(body,/else if\(tab==='budget'\)/);
  assert.match(body,/else if\(tab==='laporan'\)/);
});

test('Shop page does not render every presenter on entry',()=>{
  const i=a.indexOf("if(name==='shop'){");
  const j=a.indexOf("if(name==='laporan')",i);
  const body=a.slice(i,j);
  assert.match(body,/const tab=getActivePageTab\('page-shop','kasir'\)/);
  assert.match(body,/if\(tab==='kasir'\)/);
  assert.match(body,/else if\(tab==='etalase'\)/);
  assert.match(body,/else if\(tab==='riwayat'\)/);
  assert.doesNotMatch(body,/renderProductList\(\);renderShop\(\);if\(typeof Kasir/);
});

test('Asset management and investment presenters are lazy by active tab',()=>{
  const i=a.indexOf("if(name==='aset'){");
  const j=a.indexOf("if(name==='settings')",i);
  const body=a.slice(i,j);
  assert.match(body,/const tab=getActivePageTab\('page-aset','ringkasan'\)/);
  assert.match(body,/if\(tab!=='manajemen'&&tab!=='investasi'\)renderAsetCore\(\)/);
  assert.match(body,/if\(tab==='manajemen'\)/);
  assert.match(body,/if\(tab==='investasi'\)/);
});

test('Asset tab switch renders only when the tab actually changes',()=>{
  const i=a.indexOf('function setAsetTab(t,el)');
  const j=a.indexOf('\n}\n\n// (bukan module)',i);
  const body=a.slice(i,j);
  assert.match(body,/const _sameAsetTab=_prevAsetTab===t/);
  assert.match(body,/if\(!_sameAsetTab&&t!=='investasi'&&t!=='manajemen'/);
  assert.match(body,/if\(t==='manajemen'&&!_sameAsetTab\)/);
  assert.match(body,/if\(t==='investasi'&&!_sameAsetTab/);
});

test('showPage avoids duplicate overlay DOM scans',()=>{
  const i=b.indexOf('function showPage(name,el,opts){');
  const j=b.indexOf('/* moved to modules-render.js: renderPageContent */',i);
  const body=b.slice(i,j);
  assert.equal((body.match(/document\.querySelectorAll\('\.overlay\.open/g)||[]).length,1);
  assert.match(body,/_openOverlays\.forEach\(o=>/);
});

test('same active bottom-nav tap skips a redundant full render',()=>{
  const i=b.indexOf('function showPage(name,el,opts){');
  const j=b.indexOf('/* moved to modules-render.js: renderPageContent */',i);
  const body=b.slice(i,j);
  assert.match(body,/const _sameActiveNav=.*pageEl\.classList(?:&&typeof pageEl\.classList\.contains==='function'&&)?\.contains\('active'\)/);
  assert.match(body,/el\.classList\.contains\('nav-item'\)/);
  assert.match(body,/if\(_sameActiveNav\)/);
  assert.match(body,/return;/);
});

// S1861 fix: dulu meng-assert angka versi literal (v1826) sehingga pecah tiap
// kali scripts/build.js menaikkan versi. Kontrak sebenarnya adalah cache-bust
// itu ADA dan SINKRON lintas index.html / app_production.html / sw.js, bukan
// nomornya. Baca versi dari index.html lalu bandingkan.
test('performance patch is cache-busted & sinkron lintas index/app_production/sw',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const prod=fs.readFileSync('app_production.html','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  const m=index.match(/app-bundle-b\.min\.js\?v=(\d+)/);
  assert.ok(m,'index.html harus cache-bust app-bundle-b.min.js dengan ?v=<versi>');
  const v=m[1];
  assert.match(prod,new RegExp(`app-bundle-b\\.min\\.js\\?v=${v}\\b`));
  assert.match(sw,new RegExp(`kw-cache-v${v}\\b`));
});
