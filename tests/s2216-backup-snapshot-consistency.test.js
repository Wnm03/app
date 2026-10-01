const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBackup(extra={}) {
  const src = fs.readFileSync(path.join(__dirname,'../modules/shared/backup-restore.js'),'utf8');
  const calls=[];
  let stateVersion=1;
  let guard='g1';
  const aux={
    'lifeos:store':{v:1},'eie:store':{v:1},
    'vehicle-catalog:store':{v:1},'honda-pdf-import:store':{v:1},
  };
  const ctx={
    console, D:{transactions:[],profile:{name:'x'},chatHistory:['secret']},
    _saveStateVersion:stateVersion,
    IDBStore:{
      async getMany(keys){
        calls.push('getMany');
        if(extra.onGetMany) extra.onGetMany(()=>{ctx._saveStateVersion++;});
        const out={}; for(const k of keys) out[k]=k==='kw_v4_writer_guard_v1'?guard:aux[k];
        return out;
      },
      async get(key){calls.push('get:'+key);return key==='kw_v4_writer_guard_v1'?guard:aux[key];}
    },
    PWAProductionHardening:null,
    getRange:()=>({}),getLaporanFilters:()=>({}),txMatchesFilters:()=>true,
    _downloadBackupBlob:()=>{},document:{},window:{},localStorage:{},
    Blob:function(){},
    ...extra.context
  };
  vm.createContext(ctx); vm.runInContext(src,ctx,{filename:'backup-restore.js'});
  return {ctx,calls};
}

test('S2216 backup reads all auxiliary stores in one readonly transaction', async()=>{
  const {ctx,calls}=loadBackup();
  const payload=await vm.runInContext('buildBackupPayload()',ctx);
  assert.equal(calls.filter(x=>x==='getMany').length,1);
  assert.deepEqual(payload._lifeosStore,{v:1});
  assert.deepEqual(payload._eieStore,{v:1});
  assert.deepEqual(payload._vehicleCatalogStore,{v:1});
  assert.deepEqual(payload._hondaPdfImportStore,{v:1});
  assert.equal(payload.chatHistory.length,0);
});

test('S2216 backup retries when D mutates during asynchronous auxiliary read', async()=>{
  let first=true;
  const {ctx,calls}=loadBackup({onGetMany: bump=>{if(first){first=false;bump();}}});
  const payload=await vm.runInContext('buildBackupPayload()',ctx);
  assert.equal(calls.filter(x=>x==='getMany').length,2);
  assert.equal(payload.chatHistory.length,0);
});

test('S2216 backup fails closed after repeated auxiliary read failure', async()=>{
  const {ctx}=loadBackup({context:{IDBStore:{
    async getMany(){throw new Error('IDB down')}, async get(){throw new Error('IDB down')}
  }}});
  await assert.rejects(()=>vm.runInContext('buildBackupPayload()',ctx),/snapshot IndexedDB tambahan/);
});

test('S2216 backup rejects writer-token change during snapshot', async()=>{
  let changed=false;
  const {ctx}=loadBackup({context:{IDBStore:{
    async getMany(keys){const out={};for(const k of keys)out[k]=k==='kw_v4_writer_guard_v1'?'g1':{v:1}; if(!changed){changed=true;ctxGuard();} return out;},
    async get(key){return key==='kw_v4_writer_guard_v1'?'g2':{v:1}}
  }},});
  function ctxGuard(){ /* context helper is replaced below by direct state */ }
  await assert.rejects(()=>vm.runInContext('buildBackupPayload()',ctx),/snapshot tidak stabil|writer guard|Writer berubah/);
});
