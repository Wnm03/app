'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(ROOT,'app_production.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const tema=fs.readFileSync(path.join(ROOT,'modules/shared/format-tema.js'),'utf8');
const CANONICAL=['dark','light','auto','modern','graphite'];
const RETIRED=['ocean','stone','slate','mono','sand','ink','sage','fresh','minimal','pro'];

test('S2517 canonical theme set is intentionally small and distinct',()=>{
  for(const t of CANONICAL) assert.match(index,new RegExp(`data-args='\\["${t}"\\]' data-t="${t}"`));
  assert.equal((index.match(/class="theme-card"/g)||[]).length,CANONICAL.length);
});
for(const t of RETIRED){
  test(`S2517 retired theme ${t} is absent from shipped theme picker`,()=>{
    assert.doesNotMatch(index,new RegExp(`data-t="${t}"`));
    assert.doesNotMatch(prod,new RegExp(`data-t="${t}"`));
  });
}

test('S2517 theme aliases migrate safely to canonical themes',()=>{
  for(const [legacy,canonical] of Object.entries({ocean:'dark',stone:'light',slate:'graphite',mono:'light',sand:'light',ink:'graphite',sage:'light',fresh:'light',minimal:'modern',pro:'graphite'}))
    assert.match(tema,new RegExp(`${legacy}\\s*:\\s*['"]?${canonical}['"]?`));
});

test('S2517 canonicalization happens before data-theme is applied',()=>{
  assert.match(tema,/function canonicalizeTheme\(t\)/);
  assert.match(tema,/t=canonicalizeTheme\(t\);/);
});

test('S2517 retired base theme tokens are removed from styles.css',()=>{
  for(const t of RETIRED) assert.doesNotMatch(css,new RegExp(`\\[data-theme="${t}"\\]\\s*\\{`));
});

test('S2517 production HTML remains generated/synchronized',()=>{
  const marker='<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.\n     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->\n\n';
  assert.equal(prod,index.replace('<head>\n','<head>\n'+marker));
});
