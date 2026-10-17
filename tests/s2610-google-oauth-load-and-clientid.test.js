'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function setup(ensure){
  const toasts=[],clients=[];
  const ctx={console,setTimeout,clearTimeout,Promise,Date,Math,Blob,
    D:{accounts:[],transactions:[],products:[],assets:[],bbmLogs:[],servisLogs:[],googleDrive:{clientId:'first.apps.googleusercontent.com'},googleSheets:{spreadsheetId:'ss1',lastSync:'t'},profile:{}},
    DEFAULT_ACCOUNTS:[],SHEETS_MODULES:[],_saveGuards:{},location:{protocol:'https:'},
    toast:m=>toasts.push(m),save(){},askConfirm:async()=>true,renderGDriveSettings(){},renderSheetsSettings(){},
    ensureGoogleGSI:ensure||(()=>Promise.resolve()),fetch:async()=>({ok:true,status:200,json:async()=>({email:'test@example.com'})}),
    google:{accounts:{oauth2:{initTokenClient:cfg=>{const client={cfg,requestAccessToken(){client.requested=true;}};clients.push(client);return client;},revoke(){}}}}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'gdrive-backup.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'sheets-sync.js'),'utf8'),ctx);
  return {ctx,toasts,clients};
}
test('S2610: Sheets menunggu Google Identity Services sebelum membuat token client',async()=>{
  let release;
  const gate=new Promise(resolve=>release=resolve);
  const {ctx,clients}=setup(()=>gate);
  const pending=vm.runInContext("sheetsEnsureAuth(()=>{},()=>{})",ctx);
  await Promise.resolve();
  assert.equal(clients.length,0,'client tidak boleh dibuat sebelum script siap');
  release();
  await pending;
  assert.equal(clients.length,1);
  assert.equal(clients[0].requested,true);
});
test('S2610: kegagalan memuat GSI dilaporkan dan callback abort mereset alur',async()=>{
  const {ctx,toasts}=setup(()=>Promise.reject(new Error('network blocked')));

  await vm.runInContext('sheetsEnsureAuth(null,()=>{globalThis.__aborted=(globalThis.__aborted||0)+1})',ctx);
  assert.equal(ctx.__aborted,1);
  assert.ok(toasts.some(x=>String(x).includes('network blocked')));
  assert.equal(ctx._saveGuards.sheetsSync,undefined);
});
test('S2610: Client ID berubah, token client lama tidak digunakan kembali',async()=>{
  const {ctx,clients}=setup();
  await vm.runInContext('gdriveEnsureAuth(null)',ctx);
  assert.equal(clients.length,1);
  ctx.document={getElementById:()=>({value:'second.apps.googleusercontent.com'})};
  vm.runInContext('gdriveSaveClientId()',ctx);
  await vm.runInContext('gdriveEnsureAuth(null)',ctx);
  assert.equal(clients.length,2);
  assert.equal(clients[1].cfg.client_id,'second.apps.googleusercontent.com');
});
test('S2610: token client cache diverifikasi berdasarkan Client ID meski state berubah di luar form',async()=>{
  const {ctx,clients}=setup();
  await vm.runInContext('gdriveEnsureAuth(null)',ctx);
  ctx.D.googleDrive.clientId='third.apps.googleusercontent.com';
  await vm.runInContext('gdriveEnsureAuth(null)',ctx);
  assert.equal(clients.length,2);
  assert.equal(clients[1].cfg.client_id,'third.apps.googleusercontent.com');
});
