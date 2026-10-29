'use strict';
// S2743 — Login Google terpadu: satu paket izin Drive+Sheets, login_hint dari akun terakhir,
// token sesi di sessionStorage, sambung diam-diam hanya bila pernah terhubung.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function mem(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m};}
function setup(opts={}){
  const toasts=[],clients=[],saves=[],uploads=[];
  const session=opts.session||mem();
  const ctx={console,setTimeout,clearTimeout,Promise,Date,Math,Blob,sessionStorage:session,
    D:{accounts:[],transactions:[],products:[],assets:[],bbmLogs:[],servisLogs:[],googleDrive:Object.assign({clientId:'first.apps.googleusercontent.com'},opts.drive||{}),googleSheets:{spreadsheetId:'ss1',lastSync:'t'},profile:{}},
    DEFAULT_ACCOUNTS:[],SHEETS_MODULES:[],_saveGuards:{},location:{protocol:'https:'},
    toast:m=>toasts.push(m),save(){saves.push(1);},askConfirm:async()=>true,renderGDriveSettings(){},renderSheetsSettings(){},
    ensureGoogleGSI:()=>Promise.resolve(),fetch:async()=>({ok:true,status:200,json:async()=>({email:'n@example.com'})}),
    google:{accounts:{oauth2:{initTokenClient:cfg=>{const c={cfg,reqs:[],requestAccessToken(o){c.reqs.push(o);}};clients.push(c);return c;},revoke(){}}}}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'gdrive-backup.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'sheets-sync.js'),'utf8'),ctx);
  ctx.uploadBackupToDrive=()=>uploads.push(1);
  return {ctx,toasts,clients,saves,uploads,session};
}
const run=(ctx,c)=>vm.runInContext(c,ctx);

test('S2743: klien Drive dan Sheets meminta paket izin yang sama (Drive+Sheets+email)',async()=>{
  const {ctx,clients}=setup();
  await run(ctx,'gdriveEnsureAuth(null)');
  await run(ctx,'sheetsEnsureAuth(()=>{},()=>{})');
  assert.equal(clients.length,2);
  for(const c of clients){
    assert.match(c.cfg.scope,/auth\/drive\.file/);
    assert.match(c.cfg.scope,/auth\/spreadsheets/);
    assert.match(c.cfg.scope,/userinfo\.email/);
  }
  assert.equal(clients[0].cfg.scope,clients[1].cfg.scope);
});

test('S2743: login pertama tanpa hint tidak mengirim login_hint; setelah email diketahui, ingat akun',async()=>{
  const {ctx,clients,saves}=setup();
  await run(ctx,'gdriveEnsureAuth(null)');
  assert.equal(JSON.stringify(clients[0].reqs[0]),JSON.stringify({}));
  clients[0].cfg.callback({access_token:'tok',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets'});
  await new Promise(r=>setImmediate(r));
  assert.equal(run(ctx,'D.googleDrive.accountHint'),'n@example.com');
  assert.ok(saves.length>=1);
  assert.equal(run(ctx,'gdriveTokenScope'),'sheets','scope Sheets ikut diberikan -> satu login cukup untuk Sheets');
});

test('S2743: dengan akun yang diingat, permintaan token memakai login_hint dan prompt kosong (tanpa layar pilih akun)',async()=>{
  const {ctx,clients}=setup({drive:{accountHint:'n@example.com'}});
  await run(ctx,'gdriveEnsureAuth(null)');
  assert.equal(JSON.stringify(clients[0].reqs[0]),JSON.stringify({prompt:'',login_hint:'n@example.com'}));
  await run(ctx,'sheetsEnsureAuth(()=>{},()=>{})');
  assert.equal(JSON.stringify(clients[1].reqs[0]),JSON.stringify({prompt:'',login_hint:'n@example.com'}));
});

test('S2743: izin Sheets dicabut pengguna di dialog Google -> scope tetap "drive" dan Sheets minta lagi',async()=>{
  const {ctx,clients}=setup();
  await run(ctx,'gdriveEnsureAuth(null)');
  clients[0].cfg.callback({access_token:'tok',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'});
  assert.equal(run(ctx,'gdriveTokenScope'),'drive');
  await run(ctx,'sheetsEnsureAuth(()=>{},()=>{})');
  assert.equal(clients[1].reqs.length,1,'Sheets harus meminta ulang karena scope belum cukup');
});

test('S2743: token tersimpan di sessionStorage dan dipulihkan setelah muat ulang selama belum kedaluwarsa',async()=>{
  const first=setup();
  await run(first.ctx,'gdriveEnsureAuth(null)');
  first.clients[0].cfg.callback({access_token:'tok-abc',expires_in:3600,scope:'drive.file /auth/spreadsheets'});
  assert.ok(first.session._m.get('kw_google_session_token_v1'));
  const second=setup({session:first.session});
  await run(second.ctx,'gdriveTrySilentReconnectOnLoad()');
  assert.equal(run(second.ctx,'gdriveAccessToken'),'tok-abc');
  assert.equal(second.clients.length,0,'tidak perlu membuat klien/popup baru');
  assert.equal(run(second.ctx,'gdriveTokenScope'),'sheets');
});

test('S2743: token sesi kedaluwarsa atau Client ID berbeda tidak dipakai dan dibersihkan',async()=>{
  const s=mem();
  s.setItem('kw_google_session_token_v1',JSON.stringify({t:'lama',exp:Date.now()+1000,scope:'sheets',cid:'first.apps.googleusercontent.com'}));
  let x=setup({session:s});
  assert.equal(run(x.ctx,'gdriveSessionTokenRestore()'),false);
  assert.equal(s._m.has('kw_google_session_token_v1'),false);
  s.setItem('kw_google_session_token_v1',JSON.stringify({t:'cid',exp:Date.now()+3600000,scope:'sheets',cid:'lain.apps.googleusercontent.com'}));
  x=setup({session:s});
  assert.equal(run(x.ctx,'gdriveSessionTokenRestore()'),false);
  assert.equal(s._m.has('kw_google_session_token_v1'),false);
});

test('S2743: 401 / reset state menghapus token sesi',async()=>{
  const x=setup();
  await run(x.ctx,'gdriveEnsureAuth(null)');
  x.clients[0].cfg.callback({access_token:'tok',expires_in:3600,scope:'/auth/spreadsheets'});
  assert.ok(x.session._m.get('kw_google_session_token_v1'));
  run(x.ctx,'gdriveResetTokenState()');
  assert.equal(x.session._m.has('kw_google_session_token_v1'),false);
});

test('S2743: sambung diam-diam saat buka aplikasi: jalan bila pernah terhubung, tidak bila belum',async()=>{
  let x=setup({drive:{autoSync:false}});
  await run(x.ctx,'gdriveTrySilentReconnectOnLoad()');
  assert.equal(x.clients.length,0,'belum pernah terhubung & autoSync mati -> tidak mencoba apa pun');
  x=setup({drive:{autoSync:false,accountHint:'n@example.com'}});
  await run(x.ctx,'gdriveTrySilentReconnectOnLoad()');
  assert.equal(x.clients.length,1);
  assert.equal(JSON.stringify(x.clients[0].reqs[0]),JSON.stringify({prompt:'',login_hint:'n@example.com'}));
});

test('S2743: sambung diam-diam TIDAK mengunggah backup kalau autoSync mati; mengunggah kalau hidup',async()=>{
  let x=setup({drive:{autoSync:false,accountHint:'n@example.com'}});
  await run(x.ctx,'gdriveTrySilentReconnectOnLoad()');
  x.clients[0].cfg.callback({access_token:'t',expires_in:3600,scope:'/auth/spreadsheets'});
  assert.equal(x.uploads.length,0);
  x=setup({drive:{autoSync:true,accountHint:'n@example.com'}});
  await run(x.ctx,'gdriveTrySilentReconnectOnLoad()');
  x.clients[0].cfg.callback({access_token:'t',expires_in:3600,scope:'/auth/spreadsheets'});
  assert.equal(x.uploads.length,1);
});

test('S2743: Putuskan melupakan akun yang diingat',async()=>{
  const x=setup({drive:{accountHint:'n@example.com'}});
  run(x.ctx,'gdriveDisconnect()');
  assert.equal(run(x.ctx,'D.googleDrive.accountHint'),undefined);
  assert.ok(x.saves.length>=1);
});
