'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

test('S2271: Google Drive session state remains eager with gdrive-backup',()=>{
  const drive=fs.readFileSync(path.join(root,'gdrive-backup.js'),'utf8');
  const report=fs.readFileSync(path.join(root,'laporan-export.js'),'utf8');
  const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
  assert.match(build,/['"]gdrive-backup\.js['"]/);
  assert.match(drive,/let gdriveAccessToken\s*=\s*null/);
  assert.match(drive,/let gdrivePendingAfterAuth\s*=\s*null/);
  assert.match(drive,/let gdriveTokenScope\s*=\s*null/);
  assert.match(drive,/let gdriveTokenExpiresAt\s*=\s*null/);
  assert.match(drive,/let gdriveUserEmail\s*=\s*null/);
  assert.doesNotMatch(report,/let gdriveAccessToken\s*=|let gdrivePendingAfterAuth\s*=|let gdriveTokenScope\s*=|let gdriveTokenExpiresAt\s*=|let gdriveUserEmail\s*=/);
});

test('S2271: automatic self-test demand-loads the lazy laporan export feature',()=>{
  const selfTest=fs.readFileSync(path.join(root,'self-test.js'),'utf8');
  assert.match(selfTest,/ensureLaporanExportScripts\(\)/);
  assert.match(selfTest,/await ensureLaporanExportScripts\(\)/);
});

test('S2271: rebuilt Bundle-B contains the eager Google Drive state declarations',()=>{
  const bundle=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
  const state=bundle.indexOf('let gdriveAccessToken=null');
  const driveFn=bundle.indexOf('function gdriveTrySilentReconnectOnLoad');
  assert.ok(state>=0,'Bundle-B harus mendefinisikan gdriveAccessToken');
  assert.ok(bundle.includes('let gdrivePendingAfterAuth=null'),'Bundle-B harus mendefinisikan gdrivePendingAfterAuth');
  assert.ok(state<driveFn,'Google Drive state harus didefinisikan sebelum consumer gdriveTrySilentReconnectOnLoad');
  assert.doesNotMatch(bundle,/\/\/ laporan-export\.js —/);
});
