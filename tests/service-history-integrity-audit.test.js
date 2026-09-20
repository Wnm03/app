const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../modules/vehicle/service-history-integrity-audit');
const base={id:'s1',vehicleId:'v1',date:'2026-09-20',item:'Ganti oli',km:10000,cost:50000,note:'',checklist:[]};
test('audit is read-only and identifies source of truth',()=>{const input=[{...base}];const before=JSON.stringify(input);const out=A.audit(input);assert.equal(out.sourceOfTruth,'D.servisLogs');assert.equal(out.readOnly,true);assert.equal(JSON.stringify(input),before);});
test('duplicate IDs and transaction links are reported',()=>{const out=A.audit([{...base},{...base,id:'s2'},{...base,id:'s1'}]);assert.equal(out.duplicateIds.length,1);assert.equal(out.duplicateTxLinks.length,0);});
test('same logical fingerprint is a suspicion, never auto-merge',()=>{const out=A.audit([{...base},{...base,id:'s2'}]);assert.equal(out.suspectedDuplicates.length,1);assert.deepEqual(out.safeToMerge,[]);});
test('missing required fields are reported',()=>{const out=A.audit([{id:'x',vehicleId:'v1'}]);assert.deepEqual(out.incompleteRecords[0].missing,['date','item']);});
test('cross-vehicle transaction conflict is reported',()=>{const out=A.audit([{...base,txLinkId:'tx1'},{...base,id:'s2',vehicleId:'v2',txLinkId:'tx1'}]);assert.equal(out.conflicts[0].type,'TX_LINK_CROSS_VEHICLE');});
