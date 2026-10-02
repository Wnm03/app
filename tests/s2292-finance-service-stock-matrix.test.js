'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const cp=require('child_process');const path=require('path');
test('S2292 Finance-Service-Stock matrix',()=>{const r=cp.spawnSync(process.execPath,[path.join(__dirname,'..','scripts/s2292-finance-service-stock-matrix.js')],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.match(r.stdout,/S2292: 13\/13 PASS/);});
