const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');
const bundle=require('./helpers/bundleSource').source('b');
const bootstrap=fs.readFileSync(path.join(root,'app-bootstrap.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('S2322 pre-migration checkpoint exists in source and production bundle',()=>{
  for(const text of [src,bundle]){
    assert.match(text,/kw_v4_pre_migration_backup/);
    assert.match(text,/_writePreMigrationCheckpoint/);
    assert.match(text,/Checkpoint migrasi data gagal dibuat/);
  }
});

test('S2322 future schema is fail-closed',()=>{
  for(const text of [src,bundle]) assert.match(text,/fromSchemaVersion.*expectedSchemaVersion/);
});

test('S2322 incomplete migration cannot continue with partial state',()=>{
  for(const text of [src,bundle]){
    assert.match(text,/_migrationResult/);
    assert.match(text,/State hasil migrasi parsial dibatalkan/);
  }
});

test('S2322 runtime diagnostics record build/origin',()=>{
  for(const text of [src,bundle]){
    assert.match(text,/kw_v4_runtime_meta/);
    assert.match(text,/previousBuild/);
    assert.match(text,/location\.origin/);
  }
});

test('S2322 bootstrap watchdog is present in source and bundle',()=>{
  for(const text of [bootstrap,bundle]){
    assert.match(text,/__kwBootWatchdog/);
    assert.match(text,/>15 detik/);
    assert.match(text,/Promise\.race/);
  }
});

test('S2322 service worker cleanup is scoped to app cache namespace',()=>{
  assert.match(sw,/CACHE_PREFIX\s*=\s*['"]kw-cache-['"]/);
  assert.match(sw,/key\.startsWith\(CACHE_PREFIX\)/);
});
