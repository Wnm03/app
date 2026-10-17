'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');

function load(){
  const toasts=[];
  const ctx={
    console, setTimeout, Promise,
    D:{accounts:[],transactions:[],products:[],assets:[],bbmLogs:[],servisLogs:[],kmLogs:[],googleDrive:{clientId:'x.apps.googleusercontent.com'},googleSheets:{spreadsheetId:'ss1',lastSync:'t'},profile:{}},
    DEFAULT_ACCOUNTS:[{id:'acc_cash',name:'Cash',emoji:'💵',balance:0},{id:'acc_bri',name:'BRI',emoji:'🏦',balance:0}],
    SHEETS_MODULES:['transactions','kmLogs','bills'],
    _saveGuards:{}, location:{protocol:'https:'},
    toast:m=>toasts.push(m), save(){}, saveFlush(){}, askConfirm:async()=>true,
    renderGDriveSettings(){}, renderSheetsSettings(){}, ensureGoogleGSI:()=>Promise.resolve(),
    fetch:async()=>{throw new Error('no network');}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'gdrive-backup.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'sheets-sync.js'),'utf8'),ctx);
  return {ctx,toasts};
}
const fresh=c=>{c.D.accounts=c.DEFAULT_ACCOUNTS.map(a=>({...a}));};

test('S2600: device baru (hanya akun bawaan, saldo 0) dianggap kosong',()=>{
  const {ctx}=load(); fresh(ctx);
  assert.equal(vm.runInContext('_gdriveLocalDataLooksEmpty()',ctx),true);
});
test('S2600: akun non-bawaan / saldo / data modul apa pun = bukan kosong',()=>{
  let {ctx}=load(); fresh(ctx); ctx.D.accounts.push({id:'acc_x',name:'Dompet',balance:0});
  assert.equal(vm.runInContext('_gdriveLocalDataLooksEmpty()',ctx),false);
  ({ctx}=load()); fresh(ctx); ctx.D.accounts[0].balance=5000;
  assert.equal(vm.runInContext('_gdriveLocalDataLooksEmpty()',ctx),false);
  ({ctx}=load()); fresh(ctx); ctx.D.bbmLogs=[{id:'b1'}];
  assert.equal(vm.runInContext('_gdriveLocalDataLooksEmpty()',ctx),false);
  ({ctx}=load()); fresh(ctx); ctx.D.kmLogs=[{id:'k1'}];
  assert.equal(vm.runInContext('_gdriveLocalDataLooksEmpty()',ctx),false,'modul Sheets (kmLogs) harus ikut dihitung');
});
test('S2600: akun dikosongkan total tetap dianggap kosong (perilaku lama terjaga)',()=>{
  const {ctx}=load(); ctx.D.accounts=[];
  assert.equal(vm.runInContext('_gdriveLocalDataLooksEmpty()',ctx),true);
});
test('S2600: tap Tarik/Sync saat GSI belum dimuat tidak mengunci guard (tap kedua tetap jalan)',async()=>{
  const {ctx,toasts}=load(); fresh(ctx); // google tidak terdefinisi
  await vm.runInContext('sheetsPullNow()',ctx);
  assert.equal(ctx._saveGuards['sheetsPull'],false,'guard pull harus direset');
  const n=toasts.length;
  await vm.runInContext('sheetsPullNow()',ctx);
  assert.ok(toasts.length>n,'tap kedua harus mencapai pemeriksaan GSI lagi, bukan return diam-diam');
  await vm.runInContext('sheetsSyncNow()',ctx);
  assert.equal(ctx._saveGuards['sheetsSync'],false,'guard sync harus direset');
});
test('S2600: error auth Sheets (popup ditutup) mereset guard',async()=>{
  const {ctx}=load(); fresh(ctx);
  ctx.google={accounts:{oauth2:{initTokenClient:cfg=>({requestAccessToken(){cfg.callback({error:'popup_closed_by_user'});}})}}};
  await vm.runInContext('sheetsPullNow()',ctx);
  assert.equal(ctx._saveGuards['sheetsPull'],false);
});
