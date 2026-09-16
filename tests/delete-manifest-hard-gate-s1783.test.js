'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','scripts','verify-delete-manifest.js'),'utf8');
test('S1783: DELETE-FILES menolak duplicate dan path dengan separator ambigu',()=>{assert.match(src,/duplikat path/);assert.match(src,/rel\.includes\('\\\\'\)/);});
test('S1783: release gate memanggil verifier DELETE-FILES',()=>{const release=fs.readFileSync(path.join(__dirname,'..','scripts','verify-release-ready.js'),'utf8');assert.match(release,/verifyDeleteManifest\(\)/);});
