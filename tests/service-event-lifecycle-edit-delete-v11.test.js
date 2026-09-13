// v11: lifecycle hardening contract for edit/delete service events.
const fs=require('fs'),assert=require('assert');
const car=fs.readFileSync(require('path').join(__dirname,'..','car-notes.js'),'utf8');
function ok(c,m){assert.ok(c,m);console.log('PASS',m)}
ok(/ServiceEventLifecycle\.update\(s,\{txId:s\.txLinkId\|\|null,categoryId:s\.categoryId\|\|null\}\)/.test(car),'edit path updates canonical ServiceEventLifecycle');
ok(/ServiceEventLifecycle\.remove\(s,\{deletedTxId/.test(car),'delete path removes canonical ServiceEventLifecycle');
ok(/D\.servisLogs=D\.servisLogs\.filter\(x=>x\.id!==id\)/.test(car),'delete removes the canonical D.servisLogs record');
ok(/D\.transactions=D\.transactions\.filter\(t=>t\.id!==s\.txLinkId\)/.test(car),'delete removes linked finance transaction');
ok(/autoGantiStockId[\s\S]{0,180}revertStockUsage/.test(car),'delete restores automatic replacement stock usage');
ok(/finance\.updated/.test(car)&&/else if\(cost>0\)/.test(car), 'edit emits finance.updated for a linked nonzero transaction and handles zero-cost separately');
ok(/deletedTxId[\s\S]{0,180}finance\.updated/.test(car),'delete emits finance.updated for linked transaction removal');
const updatePos=car.indexOf('ServiceEventLifecycle.update(s,');
const savePos=car.lastIndexOf('save();',updatePos);
ok(updatePos>=0 && savePos>=0 && updatePos>savePos,'edit persists UI/data before lifecycle update');
const removePos=car.indexOf('ServiceEventLifecycle.remove(s,');
const deleteFilterPos=car.indexOf('D.servisLogs=D.servisLogs.filter(x=>x.id!==id);');
ok(removePos>=0 && deleteFilterPos>=0 && removePos>deleteFilterPos,'delete removes canonical record before lifecycle remove');
console.log('TOTAL 9 PASS');
