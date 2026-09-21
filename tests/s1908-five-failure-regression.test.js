'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1908: backup download survives minimal DOM stubs without a.remove()',()=>{
  for(const f of ['modules/shared/backup-restore.js','modules/shared/pwa-production-hardening.js']){
    const s=read(f);
    assert.match(s,/typeof a\.remove==='function'/,`${f} must guard anchor.remove()`);
    assert.match(s,/parentNode&&typeof a\.parentNode\.removeChild==='function'/,`${f} must have removeChild fallback`);
  }
});

test('S1908: runtime error banner remains sanitized while console keeps diagnostic location',()=>{
  const s=read('modules/shared/boot-early.js');
  assert.match(s,/console\.error\('\[Global Error\]',msg\+loc/);
  assert.match(s,/window\.__showRuntimeErrorBanner\(msg\);/);
  assert.doesNotMatch(s,/window\.__showRuntimeErrorBanner\(msg\+loc\);/);
});

test('S1908: Quick Switcher resets overlay geometry before opening',()=>{
  const s=read('modules/shared/modal-navigasi.js');
  assert.match(s,/function openQS\(id\)[\s\S]*?resetOverlayGeometry\(el\)/);
});

test('S1908: all import entry points validate files before FileReader',()=>{
  const s=read('modules/shared/backup-restore.js');
  for(const marker of ['function importData(e)','function handleImport(e)','function importCarData(e)']){
    const i=s.indexOf(marker); assert.ok(i>=0,marker+' missing');
    const part=s.slice(i,i+1200);
    const v=part.indexOf('validateImportFile');
    const r=part.indexOf('new FileReader');
    assert.ok(v>=0,marker+' missing validateImportFile');
    assert.ok(v<r,marker+' validates only after FileReader');
  }
});

test('S1908: release identity remains synchronized after later cumulative version bumps',()=>{
  const source=read('modules/shared/features-helpers-global-security.js');
  const m=source.match(/const APP_BUILD_VERSION = '([^']+)'/);
  assert.ok(m,'APP_BUILD_VERSION missing');
  const version=m[1];
  const numberMatch=version.match(/-(\d+)$/);
  assert.ok(numberMatch,'release version number missing');
  const buildNo=numberMatch[1];
  const files=['modules/shared/modules-render.js','modules/shared/modals.js','modules/shared/modules-calc.js','chat-action-handlers.js','modules/shared/features-helpers-global-security.js','index.html','app_production.html','sw.js'];
  const joined=files.map(read).join('\n');
  assert.match(joined,new RegExp(version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(read('sw.js'),new RegExp('kw-cache-v'+buildNo));
  assert.match(read('index.html'),new RegExp('\\?v='+buildNo));
  assert.match(read('app_production.html'),new RegExp('\\?v='+buildNo));
});
