'use strict';
const fs=require('fs'),assert=require('assert');
const br=fs.readFileSync('modules/shared/backup-restore.js','utf8');
const fg=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
let pass=0,total=0;
async function t(name,fn){total++;try{await fn();pass++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
(async()=>{
 await t('restore uses one atomic persistence boundary for D + auxiliary stores',async()=>{
   const a=br.indexOf("__s2013SetStage('atomic-restore-persist');");
   const z=br.indexOf('return true;',a);
   assert(a>=0&&z>a);
   const block=br.slice(a,z);
   assert(block.includes('_persistAtomicSnapshotWithAux'));
   assert(block.includes('_restoreAuxEntries.push'));
   assert(block.includes('_persistAtomicSnapshotWithAux'));
   assert(block.includes("if(typeof _persistAtomicSnapshotWithAux!=='function')throw new Error('Restore atomic persistence helper tidak tersedia; restore dibatalkan untuk mencegah partial write')"));
 });
 await t('atomic restore helper persists auxiliary entries under the same CAS token',async()=>{
   const a=fg.indexOf('async function _persistAtomicSnapshotWithAux');
   const z=fg.indexOf('function _saveImmediate',a);
   const block=fg.slice(a,z);
   assert(block.includes("['kw_v4_mirror',snapshotJson]"));
   assert(block.includes('extraEntries.forEach'));
   assert(block.includes('FinanceEventOutbox.prepareAtomicPersistence'));
   assert(block.includes('IDBStore.setManyIfCurrent(entries,_crossTabWriterGuardKey,_crossTabWriterToken,next)'));
   assert(block.includes("e.code='CROSS_TAB_RESTORE_CONFLICT'"));
 });
 await t('restore conflict never writes the old snapshot back over the winning tab',async()=>{
   const a=br.indexOf("if(e&&e.code==='CROSS_TAB_RESTORE_CONFLICT')");
   const z=br.indexOf('D=prevD;',a);
   assert(a>=0&&z>a);
   const block=br.slice(a,z);
   assert(block.includes('await load()'));
   assert(!block.includes('saveFlush()'));
 });
 await t('CAS conflict is still guarded by the canonical writer token',async()=>{
   assert(fg.includes("const _crossTabWriterGuardKey='kw_v4_writer_guard_v1';"));
   assert(fg.includes("CROSS_TAB_RESTORE_CONFLICT"));
 });
 console.log(`${pass}/${total} PASS`);if(pass!==total)process.exit(1);
})();
