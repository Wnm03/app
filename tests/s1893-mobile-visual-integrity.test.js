'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

for(const shell of ['index.html','app_production.html']){
  test(`S1893 ${shell}: viewport and domain shells are mobile-safe`,()=>{
    const html=read(shell);
    assert.match(html,/name="viewport"[^>]*width=device-width[^>]*viewport-fit=cover/);
    for(const id of ['page-shop','page-carnotes','page-pajak']){
      const start=html.indexOf(`id="${id}"`); assert.ok(start>=0,`${id} missing`);
      const end=html.indexOf('\n<!-- ',start+10); const section=html.slice(start,end<0?html.length:end);
      assert.match(section,/class="page-settings-btn"[\s\S]*?class="pwa-domain-page/);
      assert.match(section,/class="pwa-domain-page[^"]*"[\s\S]*?class="pwa-domain-hero"/);
    }
  });
}

test('S1893 CSS: mobile/landscape containment exists without horizontal masking as the primary repair',()=>{
  const css=read('styles.css');
  assert.match(css,/S1893 — mobile visual integrity/);
  assert.match(css,/\.page\{width:100%;max-width:100%;min-width:0;margin:0;overflow-x:clip/);
  assert.match(css,/orientation:landscape/);
  assert.match(css,/\.pwa-domain-page\{min-width:0;max-width:100%;width:100%;overflow-x:clip/);
  const pwa=read('pwa-ui-layer.css');
  assert.ok(Buffer.byteLength(pwa,'utf8')<=15000,`pwa-ui-layer.css ${Buffer.byteLength(pwa,'utf8')} > 15000`);
});

test('S1893 runtime: viewport state and overlay geometry reset are implemented',()=>{
  const ux=read('modules/shared/pwa-ux-performance.js');
  assert.match(ux,/installViewportState/);
  assert.match(ux,/visualViewport/);
  assert.match(ux,/pwa-keyboard-open/);
  assert.match(ux,/resetOverlayGeometry/);
  for(const f of ['modules/shared/modal-navigasi.js','modules/asset/modal-navigasi.js']){
    const s=read(f);
    assert.match(s,/resetOverlayGeometry\(el\)/,`${f} missing overlay reset`);
    assert.match(s,/function openQS\(id\)[\s\S]*?resetOverlayGeometry\(el\)/,`${f} missing QS reset`);
  }
});

test('S1893 no new fixed-width page shell is introduced',()=>{
  for(const f of ['styles.css','pwa-ui-layer.css']){
    const s=read(f);
    assert.doesNotMatch(s,/(?:^|[,{])\.page\{[^}]*min-width\s*:\s*(?:[5-9]\d\d|1\d{3,})px/);
    assert.doesNotMatch(s,/(?:^|[,{])\.pwa-domain-page\{[^}]*width\s*:\s*(?:[5-9]\d\d|1\d{3,})px/);
  }
});
