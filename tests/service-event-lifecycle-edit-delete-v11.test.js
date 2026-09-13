// v11: lifecycle hardening contract for edit/delete service events.
const fs=require('fs'),assert=require('assert');
const car=fs.readFileSync(require('path').join(__dirname,'..','car-notes.js'),'utf8');
function ok(c,m){assert.ok(c,m);console.log('PASS',m)}
ok(car.includes("ServiceEventLifecycle.update(s,{txId:s.txLinkId||null,categoryId:s.categoryId||null});"),'edit path updates canonical ServiceEventLifecycle');
ok(car.includes("ServiceEventLifecycle.remove(s,{deletedTxId:s.txLinkId||null,categoryId:s.categoryId||null});"),'delete path removes canonical ServiceEventLifecycle');
ok(car.includes("D.servisLogs=D.servisLogs.filter(s=>s.id!==id);"),'delete removes the canonical D.servisLogs record');
ok(car.includes("D.transactions=D.transactions.filter(tx=>tx.id!==s.txLinkId);"),'delete removes linked finance transaction');
ok(car.includes("if(s&&s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);"),'delete restores automatic replacement stock usage');
ok(car.includes("if(typeof AIBus!==\"undefined\")AIBus.emit(\"finance.updated\"")&&car.includes('else if(cost>0)'), 'edit emits finance.updated for a linked nonzero transaction and handles zero-cost separately');
ok(car.includes("if(s&&s.txLinkId&&typeof AIBus!=='undefined')AIBus.emit('finance.updated'"),'delete emits finance.updated for linked transaction removal');
const updatePos=car.indexOf('ServiceEventLifecycle.update(s,');
const savePos=car.indexOf('save();closeModal(\'servisModal\');',updatePos-5000);
ok(updatePos>=0 && savePos>=0 && updatePos>savePos,'edit persists UI/data before lifecycle update');
const removePos=car.indexOf('ServiceEventLifecycle.remove(s,');
const deleteFilterPos=car.indexOf('D.servisLogs=D.servisLogs.filter(s=>s.id!==id);');
ok(removePos>=0 && deleteFilterPos>=0 && removePos>deleteFilterPos,'delete removes canonical record before lifecycle remove');
console.log('TOTAL 9 PASS');
