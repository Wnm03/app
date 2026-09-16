'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','scripts','run-full-test.js'),'utf8');
test('S1783: orphan temporary checkpoint tidak pernah dibaca sebagai checkpoint final',()=>{
 assert.match(src,/checkpointPath\(i\)/); assert.match(src,/JSON\.parse\(fs\.readFileSync\(cp,'utf8'\)\)/); assert.match(src,/atomicWrite\(cp,/); assert.doesNotMatch(src,/readdirSync\(checkpointDir\).*\.tmp/);
});
test('S1783: temporary write memakai wx + rename sehingga JSON final tidak ditulis parsial',()=>{assert.match(src,/flag:'wx'/);assert.match(src,/fs\.renameSync\(tmp,file\)/);});
