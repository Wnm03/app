const fs=require('fs'); const assert=require('assert'); const path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const car=read('car-notes.js'), tx=read('modules/finance/transaksi-b.js'), del=read('modules/finance/tx-list-cashflow.js'), bridge=read('modules/finance/transaksi-b.js'), life=read('modules/vehicle/service-event-lifecycle.js');
function test(name,fn){try{fn();console.log('PASS',name)}catch(e){console.error('FAIL',name);throw e}}
test('lifecycle bridge emits service.updated and backward vehicle.updated',()=>{assert(life.includes("AIBus.emit('service.updated'"));assert(life.includes("AIBus.emit('vehicle.updated'"));});
test('service edit emits lifecycle update',()=>assert(car.includes('ServiceEventLifecycle.update(s')));
test('service delete emits lifecycle delete and finance delete',()=>{assert(car.includes('ServiceEventLifecycle.remove(s'));assert(car.includes("AIBus.emit('finance.updated'"));});
test('quick markServiced emits canonical create',()=>assert(car.includes('ServiceEventLifecycle.create(entry)')));
test('finance-created service emits create/update lifecycle',()=>{assert(/ServiceEventLifecycle\.update\(_svc,\{source:'finance'\}\)/.test(bridge));assert(/ServiceEventLifecycle\.create\(_svc,\{source:'finance'\}\)/.test(bridge));});
test('deleting linked finance tx removes service lifecycle',()=>assert(del.includes("ServiceEventLifecycle.remove(linkedServis,{deletedTxId:t.id,source:'finance'})")));
test('editing service tx out of service domain removes ghost service event',()=>assert(tx.includes("reason:'finance-domain-change'")));
console.log('S13 tests: 7/7 passed');
