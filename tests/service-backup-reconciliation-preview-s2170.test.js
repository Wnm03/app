'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=path.join(root,'scripts/s2170-service-backup-reconciliation-preview.js');
function fixture(){return {vehicles:[{id:'v1'},{id:'v2'}],sparepartCats:[{id:'cat-v2',vehicleId:'v2',serviceComponentId:'slide-piece-cvt',masterCategoryId:'servis-cvt'}],servisLogs:[
{id:'ok',vehicleId:'v1',date:'2026-01-01',item:'Slide Piece',km:1000,actionType:'ganti',checklist:[{serviceComponentId:'slide-piece-cvt',masterCategoryId:'servis-cvt',actionType:'ganti'}]},
{id:'cross',vehicleId:'v1',date:'2026-01-02',item:'Slide Piece',categoryId:'cat-v2',km:1100,nextDueKm:1000},
{id:'ambiguous',vehicleId:'v1',date:'2026-01-03',item:'Busi',actionType:'ganti',checklist:[{itemName:'Busi',actionType:'bersih'},{itemName:'Busi',actionType:'periksa'}],nextDueAxis:'km',nextDueKm:null}
]};}
test('S2170 preview is read-only and flags cross-vehicle category references',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'s2170-'));const file=path.join(dir,'backup.json');const data=fixture();const original=JSON.stringify(data,null,2)+'\n';fs.writeFileSync(file,original);
 const r=spawnSync(process.execPath,[script,file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);
 assert.equal(report.readOnly,true);assert.equal(report.policy.automaticWrites,0);assert.equal(report.input.sha256Before,report.input.sha256After);assert.equal(fs.readFileSync(file,'utf8'),original);
 assert.ok(report.findings.some(x=>x.id==='cross'&&x.kind==='cross-vehicle-category'&&x.severity==='BLOCK'));
});
test('S2170 keeps conflicting component actions as review-only, never auto-fixes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'s2170-'));const file=path.join(dir,'backup.json');fs.writeFileSync(file,JSON.stringify(fixture()));
 const r=spawnSync(process.execPath,[script,file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);
 assert.ok(report.findings.some(x=>x.id==='ambiguous'&&x.kind==='action-authority-conflict'&&x.severity==='REVIEW'));
 assert.equal(report.policy.automaticWrites,0);
});
console.log('S2170 backup reconciliation preview: PASS');
