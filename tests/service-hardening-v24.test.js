const { readCarNotesSource } = require('./helpers/carNotesSource');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=readCarNotesSource();
const tx=fs.readFileSync(path.join(root,'modules/finance/tx-servis.js'),'utf8');
const txb=fs.readFileSync(path.join(root,'modules/finance/transaksi-b.js'),'utf8');
const forecast=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis-b.js'),'utf8');
const spare=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
const backup=fs.readFileSync(path.join(root,'modules/shared/backup-restore.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);console.log('PASS',m)}
const createSave=car.indexOf('D.servisLogs.push(');
const createLifecycle=car.indexOf('ServiceEventLifecycle.create(_newServisLog)',createSave);
const createPersistedLog=car.indexOf('const _newServisLog=D.servisLogs[D.servisLogs.length-1];',createSave);
const createCatalog=car.indexOf('VehicleCatalogServisLink.attachToServis(servisId',createSave);
const createClose=car.indexOf("closeModal('servisModal')",createSave);
ok(createSave>=0,'service create persists one or more service records');
ok(createLifecycle>createPersistedLog && createCatalog>createSave,'create post-commit side effects remain after save');
// S1857: save() now takes a scoped-mutation options object (domain/financeMutation/accountIds)
// instead of being called bare; ordering relative to lifecycle create is what matters here.
ok(/save\(\{[^)]*\}\);\nconst _newServisLog/.test(car.slice(createSave)),'service create save precedes lifecycle');
ok(car.indexOf("_postCommitFinanceEvent",car.indexOf('if(s.txLinkId)'))>=0,'edit finance event deferred metadata exists');
const recordLifecycleCreate=tx.indexOf("ServiceEventLifecycle.create(log",tx.indexOf('function recordServisLog'));
ok(recordLifecycleCreate<0,'finance service recorder no longer emits lifecycle before transaction commit');
ok(txb.includes('_serviceCommitMeta=await applyTxServisFromTx'),'finance caller captures deferred service commit metadata');
ok(txb.indexOf('save();\n// V28: flush deferred Finance->Service removals')>=0,'finance lifecycle flush is after final save');
ok(tx.includes('_sameHistoricalPayload'),'idempotent identical finance retry preserves historical snapshot');
ok(forecast.includes('parseServiceDateOnly')&&forecast.includes('addServiceMonthsClamped'),'maintenance forecast uses canonical date helpers');
ok(spare.includes('compareServiceHistoryRecency')&&spare.includes('getPartUsageHistory'),'part usage uses canonical history comparator');
ok(spare.includes('getPartPriceHistoryHtml')&&spare.slice(spare.indexOf('getPartPriceHistoryHtml')).includes('compareServiceHistoryRecency'),'price history uses canonical comparator');
ok(backup.includes('_prevLifeosStore')&&backup.includes('_prevEieStore')&&backup.includes('_prevVehicleCatalogStore')&&backup.includes('_prevHondaPdfImportStore'),'restore snapshots all auxiliary IDB stores');
ok(backup.includes('compensating rollback')&&backup.includes("IDBStore.set('lifeos:store',_prevLifeosStore)"),'restore has auxiliary IDB compensating rollback');
console.log('P24 G1-G10 static hardening: 11/11 PASS');
