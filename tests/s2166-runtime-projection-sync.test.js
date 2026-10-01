'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
global.SERVICE_CHECKLIST_GROUPS=[{masterCategoryId:'servis-cvt',group:'Servis CVT',items:[{id:'slide-piece-cvt',name:'Slide Piece CVT'},{id:'coolant',name:'Coolant'}]}];
const tax=require('../modules/vehicle/service-taxonomy-sot.js'); global.ServiceTaxonomySOT=tax;
const p=require('../modules/vehicle/service-runtime-projection-sot-s2166.js');
function data(){return {vehicles:[{id:'v1',name:'Vario 125'},{id:'v2',name:'Scoopy'}],servisLogs:[
{id:'s1',vehicleId:'v1',masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'},
{id:'s2',vehicleId:'v2',masterCategoryId:'servis-cvt',serviceComponentId:'coolant'}],serviceReminderPackages:[
{id:'r1',vehicleId:'v1',targets:[{masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'}]},
{id:'r2',vehicleId:'v2',targets:[{masterCategoryId:'servis-cvt',serviceComponentId:'coolant'}]}]};}
test('S2166 snapshot shares one canonical component identity across views',()=>{const s=p.snapshot(data(),'v1');assert.equal(s.servis.length,1);assert.equal(s.pengingat.length,1);assert.equal(s.riwayat.length,1);assert.equal(s.components.length,1);assert.equal(s.components[0].serviceComponentId,'slide-piece-cvt');});
test('S2166 active vehicle excludes foreign reminder data',()=>{const s=p.snapshot(data(),'v1');assert.equal(s.pengingat.some(x=>x.vehicleId==='v2'),false);});
test('S2166 duplicate reminder targets collapse in runtime projection',()=>{const d=data();d.serviceReminderPackages[0].targets.push({masterCategoryId:'servis-cvt',serviceComponentId:'slide-piece-cvt'});assert.equal(p.reminderRows(d,'v1')[0].targets.length,1);});
test('S2166 audit detects missing active vehicle',()=>assert.equal(p.audit(data(),'').pass,false));
test('S2166 audit detects canonical mismatch',()=>{const d=data();d.servisLogs[0].serviceComponentId='coolant';assert.equal(p.audit(d,'v1').checks.canonicalComponents,true);assert.equal(p.snapshot(d,'v1').servis[0].serviceComponentId,'coolant');});
