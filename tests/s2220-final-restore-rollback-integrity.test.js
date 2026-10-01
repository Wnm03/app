'use strict';
const fs=require('fs'),assert=require('assert');
const br=fs.readFileSync('modules/shared/backup-restore.js','utf8');
let pass=0,total=0;
function t(name,fn){total++;try{fn();pass++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
t('S2220 restore fails closed when atomic helper is unavailable',()=>{
  const a=br.indexOf("const _restoreAuxEntries=[];");
  const z=br.indexOf("await _persistAtomicSnapshotWithAux(_restorePersistJson,_restoreAuxEntries);",a);
  const block=br.slice(a,z);
  assert(block.includes("if(typeof _persistAtomicSnapshotWithAux!=='function')throw new Error('Restore atomic persistence helper tidak tersedia; restore dibatalkan untuk mencegah partial write');"));
  assert(!block.includes('IDBStore.set(\'lifeos:store\''));
});
t('S2220 post-commit rollback uses the same atomic CAS boundary',()=>{
  const a=br.indexOf('D=prevD;');
  const z=br.indexOf("await showAlertModal('Restore gagal",a);
  const block=br.slice(a,z);
  assert(block.includes('_restoreAtomicCommitted'));
  assert(block.includes('_persistAtomicSnapshotWithAux(snapJson,_rollbackAuxEntries)'));
  assert(!block.includes("IDBStore.set('lifeos:store',_prevLifeosStore)"));
  assert(!block.includes("IDBStore.set('eie:store',_prevEieStore)"));
});
t('S2220 rollback auxiliary scope matches only stores included in restored backup',()=>{
  const a=br.indexOf('const _rollbackAuxEntries=[];');
  const z=br.indexOf('await _persistAtomicSnapshotWithAux(snapJson,_rollbackAuxEntries);',a);
  const block=br.slice(a,z);
  assert(block.includes("if(_restoredLifeosStore!==undefined)_rollbackAuxEntries.push(['lifeos:store',_prevLifeosStore]);"));
  assert(block.includes("if(_restoredEieStore!==undefined)_rollbackAuxEntries.push(['eie:store',_prevEieStore]);"));
  assert(block.includes("if(_restoredVehicleCatalogStore!==undefined)_rollbackAuxEntries.push(['vehicle-catalog:store',_prevVehicleCatalogStore]);"));
  assert(block.includes("if(_restoredHondaPdfImportStore!==undefined)_rollbackAuxEntries.push(['honda-pdf-import:store',_prevHondaPdfImportStore]);"));
});
console.log(`S2220 ${pass}/${total} PASS`);if(pass!==total)process.exit(1);
