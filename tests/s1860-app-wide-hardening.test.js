'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('S1860 app-wide hardening gate: seluruh kontrak audit satu tahap PASS',()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'..','scripts','s1860-app-wide-hardening-gate.js')],{encoding:'utf8'});
  assert.equal(r.status,0,`${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout,/S1860 APP-WIDE HARDENING: \d+ contracts pass, 0 fail/);
});
