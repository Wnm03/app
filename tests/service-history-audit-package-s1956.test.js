const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-audit-package.js'),'utf8');
function make(){
  const ctx={console,D:{servisLogs:[],serviceAuditGroups:[]},uid:()=>`id_${Math.random()}`,save(){}};
  ctx.globalThis=ctx;
  ctx.ServiceInputCatalog={
    groupById:id=>({mesin:{masterCategoryId:'mesin',group:'Mesin'},cvt:{masterCategoryId:'cvt',group:'CVT'}}[id]||null),
    itemById:id=>({klep:{item:{id:'klep',name:'Celah Klep'}},belt:{item:{id:'belt',name:'V-Belt'}}}[id]||null)
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
}
const ctx=make(); const A=ctx.ServiceHistoryAuditPackage;
ctx.D.servisLogs=[
 {id:'s1',vehicleId:'v1',date:'2026-07-01',km:10000,item:'Cek klep',masterCategoryId:'mesin',serviceComponentId:'klep',cost:100000,actionType:'periksa'},
 {id:'s2',vehicleId:'v1',date:'2026-07-01',km:10000,item:'V-Belt',masterCategoryId:'cvt',serviceComponentId:'belt',cost:250000,actionType:'ganti'},
 {id:'s3',vehicleId:'v2',date:'2026-07-01',km:10000,item:'Lain',cost:1}
];
let r=A.create({vehicleId:'v1',title:'Overhaul Juli 2026',typeId:'overhaul_turun_mesin',sourceServiceIds:['s1','s2']});
assert.equal(r.ok,true); assert.equal(r.package.sourceServiceIds.length,2); assert.equal(r.summary.services,2); assert.equal(r.summary.components.length,2); assert.equal(r.summary.totalCost,350000);
assert.equal(ctx.D.servisLogs[0].sessionId,undefined); assert.equal(ctx.D.servisLogs[1].reminderPackageId,undefined);
assert.equal(A.create({vehicleId:'v1',sourceServiceIds:['s1']}).code,'need_two_source_records');
assert.equal(A.create({vehicleId:'v1',sourceServiceIds:['s1','s3']}).code,'vehicle_mismatch');
ctx.D.servisLogs[0].cost=150000;
assert.equal(A.audit(r.package.id).summary.totalCost,400000,'summary harus membaca source terbaru, bukan snapshot duplikat');
assert.equal(A.remove(r.package.id).ok,true); assert.equal(ctx.D.serviceAuditGroups.length,0);
console.log('S1956 Service History Audit Package: PASS');
