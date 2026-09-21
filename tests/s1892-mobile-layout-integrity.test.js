'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

for(const shell of ['index.html','app_production.html']){
  test(`S1892 ${shell}: Shop/Car/Pajak domain workspaces are not trapped in title flex wrapper`,()=>{
    const html=read(shell);
    for(const id of ['page-shop','page-carnotes','page-pajak']){
      const start=html.indexOf(`id="${id}"`);
      assert.ok(start>=0,`${id} missing`);
      const end=html.indexOf('\n<!-- ',start+10);
      const section=html.slice(start,end<0?html.length:end);
      assert.match(section,/class="page-settings-btn">[\s\S]*?class="page-title"[\s\S]*?<\/div>\s*<\/div>\s*<div class="pwa-domain-page/,
        `${id}: domain wrapper must be a sibling of the title wrapper`);
      assert.match(section,/class="page-settings-btn"/);
      assert.match(section,/class="pwa-domain-page/);
      assert.match(section,/class="pwa-domain-hero"/);
    }
  });
}

test('S1892 CSS: mobile layout has width containment and accessible focus/forced-colors',()=>{
  const css=read('pwa-ui-layer.css');
  assert.ok(Buffer.byteLength(css,'utf8')<=15000,`CSS ${Buffer.byteLength(css,'utf8')} bytes`);
  assert.match(css,/pwa-domain-page[^}]*min-width:0/);
  assert.match(css,/pwa-domain-page button:focus-visible/);
  assert.match(css,/outline:3px solid var\(--accent\)/);
  assert.match(css,/forced-colors:active/);
});
