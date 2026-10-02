const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function loadWithLexicalD(){
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-event-sot.js'),'utf8');
  const sandbox={
    console,
    Date,
    Set,
    JSON,
    String,
    Number,
    Array,
    Object,
    Math,
    ServiceMasterDB:{getComponentSync:()=>null},
    ServiceReminderPackageSOT:null,
    ServiceChecklistExecutionSOT:null,
    save:()=>{},
    uid:()=> 'svc-test'
  };
  sandbox.globalThis=sandbox;
  // Deliberately reproduce the browser shape: lexical D exists, globalThis.D does not.
  const context=vm.createContext(sandbox);
  vm.runInContext(`let D={servisLogs:[{id:'s1',vehicleId:'v1',txLinkId:'t1',checklist:[{itemId:'c1',itemName:'Oli',conditionResult:'ok'}]}],transactions:[{id:'t1'}]};\n${src}`,context,{filename:'service-event-sot.js'});
  return context.ServiceEventSOT;
}

test('S2306 ServiceEventSOT reads lexical D when globalThis.D is absent',()=>{
  const S=loadWithLexicalD();
  const health=S.maintenanceHealth('v1');
  assert.equal(health.status,'OK');
  const audit=S.audit('v1');
  assert.equal(audit.total,1);
  assert.equal(audit.issues.length,0);
});
