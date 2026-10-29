'use strict';
// S2744 — Tombol Hubungkan + Sync Drive/Sheets digabung.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function setup(opts={}){
  const toasts=[],order=[],clients=[];
  const ctx={console,setTimeout,clearTimeout,Promise,Date,Math,Blob,
    sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    D:{accounts:[],transactions:[],products:[],assets:[],bbmLogs:[],servisLogs:[],googleDrive:{clientId:opts.noClient?'':'first.apps.googleusercontent.com'},googleSheets:{spreadsheetId:'ss1',lastSync:'t'},profile:{}},
    DEFAULT_ACCOUNTS:[],SHEETS_MODULES:[],_saveGuards:{},location:{protocol:'https:'},
    toast:m=>toasts.push(m),save(){},askConfirm:async()=>true,renderGDriveSettings(){},renderSheetsSettings(){},
    ensureGoogleGSI:()=>Promise.resolve(),fetch:async()=>({ok:true,status:200,json:async()=>({email:'n@example.com'})}),
    google:{accounts:{oauth2:{initTokenClient:cfg=>{const c={cfg,n:0,requestAccessToken(){c.n++;setTimeout(()=>cfg.callback({access_token:'t',expires_in:3600,scope:'/auth/spreadsheets'}),0);}};clients.push(c);return c;},revoke(){}}}}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'gdrive-backup.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'sheets-sync.js'),'utf8'),ctx);
  ctx.uploadBackupToDrive=async()=>{order.push('drive');if(opts.driveFails)throw new Error('boom');};
  ctx.sheetsSyncNow=async()=>{order.push('sheets');};
  return {ctx,toasts,order,clients};
}
const run=(ctx,c)=>vm.runInContext(c,ctx);

test('S2744: Sync Semua = login sekali, lalu backup Drive, lalu sync Sheets (urut)',async()=>{
  const {ctx,order,clients}=setup();
  await run(ctx,'googleSyncAllNow()');
  assert.equal(order.join(','),'drive,sheets');
  assert.equal(clients.reduce((s,c)=>s+c.n,0),1,'hanya satu permintaan login');
});
test('S2744: backup Drive gagal tidak menghentikan sync Sheets, dan error dilaporkan',async()=>{
  const {ctx,order,toasts}=setup({driveFails:true});
  await run(ctx,'googleSyncAllNow()');
  assert.equal(order.join(','),'drive,sheets');
  assert.ok(toasts.some(t=>/Backup Drive gagal: boom/.test(t)));
});
test('S2744: tanpa Client ID tidak memulai apa pun',async()=>{
  const {ctx,order,clients,toasts}=setup({noClient:true});
  await run(ctx,'googleSyncAllNow()');
  assert.equal(order.length,0);assert.equal(clients.length,0);
  assert.ok(toasts.some(t=>/Client ID/.test(t)));
});
test('S2744: guard mencegah Sync Semua jalan dobel; guard dilepas setelah selesai',async()=>{
  const {ctx,order}=setup();
  const a=run(ctx,'googleSyncAllNow()');const b=run(ctx,'googleSyncAllNow()');
  await Promise.all([a,b]);
  assert.equal(order.filter(x=>x==='drive').length,1);
  await run(ctx,'googleSyncAllNow()');
  assert.equal(order.filter(x=>x==='drive').length,2);
});
test('S2744: Hubungkan Google meminta login sekali; panggilan kedua cukup memberi tahu sudah terhubung',async()=>{
  const {ctx,clients,toasts}=setup();
  run(ctx,'googleConnectAll()');await new Promise(r=>setTimeout(r,20));
  run(ctx,'googleConnectAll()');
  assert.equal(clients.reduce((s,c)=>s+c.n,0),1);
  assert.ok(toasts.some(t=>/Sudah terhubung ke Google \(Drive \+ Sheets\)/.test(t)));
});
test('S2744: UI — satu kartu gabungan; tombol Hubungkan/Putuskan tidak lagi dobel di kartu Drive & Sheets',()=>{
  for(const f of['index.html','app_production.html']){
    const h=fs.readFileSync(path.join(root,f),'utf8');
    const count=s=>h.split(s).length-1;
    assert.equal(count('data-action="googleConnectAll"'),1,f);
    assert.equal(count('data-action="googleSyncAllNow"'),1,f);
    assert.equal(count('data-action="gdriveDisconnect"'),1,f+': Putuskan hanya satu');
    assert.equal(count('data-action="gdriveConnectOnly"'),0,f);
    assert.equal(count('data-action="sheetsConnectOnly"'),0,f);
    // aksi destruktif tetap terpisah & eksplisit
    assert.equal(count('data-action="gdriveRestoreNow"'),1,f);
    assert.equal(count('data-action="sheetsPullNow"'),1,f);
    assert.equal(count('data-action="gdriveBackupNow"'),1,f);
    assert.equal(count('data-action="sheetsSyncNow"'),1,f);
  }
});
