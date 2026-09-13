const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
function load(D){
  const ctx={D,window:{},console,Number,Date,JSON,Math,Array,Object,String,parseFloat,parseInt,isNaN,Infinity};
  ctx.getEffectiveIntervalKm=(vehicleId,cat)=>Number(cat.intervalKm)||null;
  ctx.getEffectiveIntervalBulan=(cat,vehicleId)=>Number(cat.intervalBulan)||null;
  vm.createContext(ctx); vm.runInContext(src,ctx); return ctx.window.normalizeLegacyServiceLogs;
}
function assert(c,m){if(!c)throw new Error(m)}

// Legacy row gets canonical category/component, snapshot and deterministic key.
{
 const D={sparepartCats:[{id:'cat-oil',name:'Oli Mesin',masterCategoryId:'engine',serviceComponentId:'oil',intervalKm:5000,intervalBulan:6}],servisLogs:[{id:'s1',vehicleId:'v1',date:'2026-09-01',item:'Oli Mesin',km:80000,cost:100000,txLinkId:null}]};
 const normalize=load(D); const n1=normalize();
 assert(n1>0,'legacy row should change'); const s=D.servisLogs[0];
 assert(s.categoryId==='cat-oil','categoryId backfill failed');
 assert(s.masterCategoryId==='engine','masterCategoryId backfill failed');
 assert(s.serviceComponentId==='oil','serviceComponentId backfill failed');
 assert(s.intervalKmAtService===5000 && s.intervalBulanAtService===6,'interval snapshot failed');
 assert(s.nextDueKm===85000 && s.nextDueDate==='2027-03-01' && s.nextDueAxis==='km_or_date','next due snapshot failed');
 assert(s.idempotencyKey==='legacy-service:s1','legacy idempotency key failed');
 const n2=normalize(); assert(n2===0,'migration must be idempotent');
}

// Existing historical snapshot is immutable: master changes must not rewrite it.
{
 const D={sparepartCats:[{id:'cat-oil',name:'Oli Mesin',intervalKm:7500,intervalBulan:12}],servisLogs:[{id:'s2',vehicleId:'v1',date:'2026-01-01',item:'Oli Mesin',km:80000,categoryId:'cat-oil',intervalKmAtService:5000,intervalBulanAtService:6,nextDueKm:85000,nextDueDate:'2026-07-01',nextDueAxis:'km_or_date',actionType:null,idempotencyKey:'legacy-service:s2'}]};
 const normalize=load(D); const n=normalize(); const s=D.servisLogs[0];
 assert(n===0,'complete canonical row should not change');
 assert(s.intervalKmAtService===5000 && s.intervalBulanAtService===6 && s.nextDueKm===85000 && s.nextDueDate==='2026-07-01','existing snapshot overwritten');
}

// Transaction-linked legacy row gets tx-based key, not a synthetic legacy key.
{
 const D={sparepartCats:[],servisLogs:[{id:'s3',vehicleId:'v1',date:'2026-09-01',item:'Servis Umum',txLinkId:'t9'}]};
 const normalize=load(D); normalize(); assert(D.servisLogs[0].idempotencyKey==='tx:t9','tx idempotency key backfill failed');
}

console.log('P13 legacy migration: 3/3 PASS');
