'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const V='s1908-cumulative-regression-hardening-1903';

test('S1906 cumulative canonical source version is internally consistent',()=>{
  const s=read('modules/shared/features-helpers-global-security.js');
  assert.match(s,new RegExp("APP_BUILD_VERSION\\s*=\\s*'"+V.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+"'"));
  assert.match(s,new RegExp("PRODUCTION_BUILD_SYNCED_VERSION\\s*=\\s*'"+V.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+"'"));
});

test('S1905 PWA viewport source guards document.body before classList',()=>{
  const s=read('modules/shared/pwa-ux-performance.js');
  assert.match(s,/const body=document\.body;\s*if\(!body\)return;\s*body\.classList\.toggle\('pwa-landscape'/);
  assert.match(s,/PWAUX\.installViewportState\(\);/);
});

test('S1905 production-hardening source exists and is registered in build manifest',()=>{
  assert.ok(fs.existsSync(path.join(ROOT,'modules/shared/pwa-production-hardening.js')));
  const b=read('scripts/build.js');
  assert.match(b,/modules\/shared\/pwa-production-hardening\.js/);
});

test('S1905 Car Notes insight/BBM panes have null guards',()=>{
  const s=read('modules/vehicle/vehicle-core.js');
  assert.match(s,/const cniRingkasanEl=document\.getElementById\('cniTab-ringkasan'\);\s*if\(cniRingkasanEl\)/);
  assert.match(s,/const cniRekomendasiEl=document\.getElementById\('cniTab-rekomendasi'\);\s*if\(cniRekomendasiEl\)/);
  assert.match(s,/const cnbRingkasanEl=document\.getElementById\('cnbTab-ringkasan'\);\s*if\(cnbRingkasanEl\)/);
  assert.match(s,/const cnbAnalisisEl=document\.getElementById\('cnbTab-analisis'\);\s*if\(cnbAnalisisEl\)/);
});

test('S1905 modal open resets stale overlay geometry defensively',()=>{
  const s=read('modules/shared/modal-navigasi.js');
  assert.match(s,/PWAUX.*resetOverlayGeometry\(el\)/);
});

test('S1905 production readiness contracts are satisfied',()=>{
  const s=read('modules/shared/backup-restore.js');
  assert.match(s,/PWAProductionHardening\.sealBackupPayload/);
  assert.match(s,/PWAProductionHardening\.verifyBackupPayload/);
  assert.match(s,/PWAProductionHardening\.validateImportFile/);
  assert.match(s,/_downloadBackupBlob/);
  const e=read('modules/shared/error-handler.js');
  assert.match(e,/PWAProductionHardening\.sanitizeErrorMessage/);
});

test('S1905 retired pro-ui-layer.css is physically absent',()=>{
  assert.equal(fs.existsSync(path.join(ROOT,'pro-ui-layer.css')),false);
});
