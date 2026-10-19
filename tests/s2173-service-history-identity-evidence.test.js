'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {audit,sha}=require('../scripts/s2173-service-history-identity-evidence.js');

test('S2173 is read-only and flags ambiguous multi-component service sessions',()=>{
 const data={vehicles:[{id:'v1'}],transactions:[],sparepartCats:[],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',item:'Service session',checklist:[{masterCategoryId:'cat-a',serviceComponentId:'part-a'},{masterCategoryId:'cat-b',serviceComponentId:'part-b'}]}]};
 const before=JSON.stringify(data);const r=audit(data,'fixture.json',sha(Buffer.from(before)));
 assert.equal(JSON.stringify(data),before);assert.equal(r.summary.autoChanges,0);assert.equal(r.unresolved[0].recommendation,'MULTI_COMPONENT_SESSION');assert.equal(r.unresolved[0].autoApply,false);assert.equal(r.policy.sourceMutated,false);
});

test('S2173 refuses category identity when the category ID is duplicated or cross-vehicle',()=>{
 const data={vehicles:[{id:'v1'},{id:'v2'}],transactions:[],sparepartCats:[{id:'dup',vehicleId:'v1',name:'A'},{id:'dup',vehicleId:'v2',name:'B'}],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',item:'Unknown',categoryId:'dup'}]};
 const r=audit(data);assert.equal(r.unresolved[0].recommendation,'BLOCK_CATEGORY_REFERENCE');assert.equal(r.unresolved[0].autoApply,false);
});

test('S2173 classifies transaction links by matching vehicle and date instead of trusting ID alone',()=>{
 const data={vehicles:[{id:'v1'},{id:'v2'}],sparepartCats:[],transactions:[{id:'tx-ok',vehicleId:'v1',date:'2025-01-01'},{id:'tx-bad',vehicleId:'v2',date:'2025-02-01'}],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',item:'Unknown',txLinkId:'tx-ok'},{id:'h2',vehicleId:'v1',date:'2025-01-01',item:'Unknown',txLinkId:'tx-bad'}]};
 const r=audit(data);assert.equal(r.unresolved[0].transactionEvidence.relationshipStatus,'VEHICLE_DATE_CONSISTENT');assert.equal(r.unresolved[0].transactionEvidence.vehicleDateConsistentMatches,1);assert.equal(r.unresolved[1].transactionEvidence.relationshipStatus,'LINK_MISMATCH');assert.equal(r.unresolved[1].transactionEvidence.mismatchedMatches,1);assert.equal(r.summary.autoChanges,0);
});

test('S2173 preserves strong reverse-link/category context without pretending transaction has vehicleId',()=>{
 const data={vehicles:[{id:'v1',name:'Vario 125'}],transactions:[{id:'tx1',servisLinkId:'h1',vehicleId:null,date:'2025-01-01',category:'Vario 125',note:'Part - Vario 125'}],sparepartCats:[],servisLogs:[{id:'h1',vehicleId:'v1',date:'2025-01-01',item:'Unknown',txLinkId:'tx1'}]};
 const r=audit(data);assert.equal(r.unresolved[0].transactionEvidence.relationshipStatus,'REVERSE_LINK_AND_VEHICLE_CATEGORY_MATCH');assert.equal(r.unresolved[0].transactionEvidence.reverseLinkVehicleContextMatches,1);assert.equal(r.summary.autoChanges,0);
});
