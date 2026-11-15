'use strict';
// Langkah 4 (T-14/D-05): penanda diskontinuitas basis snapshot kekayaan (fisik lama vs 'pribadi-v1').
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function kek(D){
 const noop=()=>{};
 const g=loadSource(['modules/shared/modules-calc.js'],{D,todayStr:()=>'2026-11-15',uid:()=>'u1',save:noop,toast:noop,fmtFull:(n)=>String(n),fmtFullSigned:(n)=>String(n),sameId:(a,b)=>String(a)===String(b),renderFinancialFreedom:noop,
  totalSaldoAkun:()=>1000,saldoPribadiSafe:()=>600,totalAssetValue:()=>0,totalInventoriBisnisValue:()=>0,totalPiutangValue:()=>0,FI:{totalDebt:()=>0,investmentAssetValue:()=>0},Investment:{selfOwnedTotalValue:()=>0}},['Kekayaan']);
 return g.Kekayaan;
}
const klien={renovProjects:[{id:'p1',dana:'klien'}]};
const snap=(date,nw,basis)=>({id:date,date,netWorth:nw,auto:true,...(basis?{basis}:{})});

test('snapshotBasis: tanpa field basis = fisik (legacy), tidak diubah',()=>{
 const K=kek({...klien,wealthSnapshots:[]});
 const lama=snap('2026-01-01',1000);
 assert.equal(K.snapshotBasis(lama),'fisik');assert.equal(K.snapshotBasis(snap('2026-11-01',1,'pribadi-v1')),'pribadi-v1');
 assert.equal('basis' in lama,false);
});
test('basisBeda: hanya bila basis berbeda DAN ada proyek klien',()=>{
 const a=snap('2026-01-01',1000),b=snap('2026-11-01',600,'pribadi-v1');
 assert.equal(kek({...klien,wealthSnapshots:[]}).basisBeda(a,b),true);
 assert.equal(kek({...klien,wealthSnapshots:[]}).basisBeda(b,b),false);
 assert.equal(kek({renovProjects:[],wealthSnapshots:[]}).basisBeda(a,b),false);
 assert.equal(kek({renovProjects:[{id:'p',dana:'pribadi'}],wealthSnapshots:[]}).basisBeda(a,b),false);
 assert.equal(kek({...klien,wealthSnapshots:[]}).basisBeda(a,null),false);
});
test('actualCAGR: angka CAGR tidak berubah, basisCampur ditandai',()=>{
 const D={...klien,wealthSnapshots:[snap('2025-01-01',1000),snap('2026-01-01',1210,'pribadi-v1')]};
 const r=kek(D).actualCAGR();
 assert.ok(Math.abs(r.cagr-0.21)<0.005);assert.equal(r.basisCampur,true);
 const D2={renovProjects:[],wealthSnapshots:[snap('2025-01-01',1000),snap('2026-01-01',1210,'pribadi-v1')]};
 assert.equal(kek(D2).actualCAGR().basisCampur,false);
 const D3={...klien,wealthSnapshots:[snap('2025-01-01',1000,'pribadi-v1'),snap('2026-01-01',1210,'pribadi-v1')]};
 assert.equal(kek(D3).actualCAGR().basisCampur,false);
});
test('actualCAGR reason negatif tetap membawa basisCampur',()=>{
 const D={...klien,wealthSnapshots:[snap('2025-01-01',-5),snap('2026-01-01',100,'pribadi-v1')]};
 const r=kek(D).actualCAGR();assert.equal(r.reason,'baseline-negative');assert.equal(r.basisCampur,true);
});
test('saveSnapshot: snapshot lama tidak disentuh, baru berbasis pribadi dengan NW saldo pribadi',()=>{
 const lama=snap('2026-10-01',1000);
 const D={...klien,accounts:[{id:'a'}],assets:[],wealthSnapshots:[lama]};
 const K=kek(D);K.renderSnapshots=()=>{};K.saveSnapshot(false);
 assert.deepEqual(D.wealthSnapshots[0],snap('2026-10-01',1000));
 const baru=D.wealthSnapshots.find(s=>s.date==='2026-11-15');
 assert.equal(baru.basis,'pribadi-v1');assert.equal(baru.netWorth,600);
});
