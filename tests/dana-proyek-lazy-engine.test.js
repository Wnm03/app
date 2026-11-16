'use strict';
// Temuan uji browser: renovasi.js (mesin dana klien) lazy-load, jadi sebelum Renovasi dibuka
// saldoPribadi/isAliranKlien/pencairan tidak ada dan semua wrapper *Safe jatuh ke angka fisik.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const akun=fs.readFileSync('modules/finance/akun.js','utf8');
const grab=(re)=>{const m=akun.match(re);assert.ok(m,String(re)+' belum ada');return m[0];};
function mk(D,{loaded=false}={}){
 const calls={ensure:0,invalidate:0,render:[]};let resolve;
 const c={D,document:{querySelector:()=>({id:'page-keuangan'})},
  invalidateAccBalCache:()=>{calls.invalidate++;},renderPageContent:(p)=>calls.render.push(p),
  ensureRenov:()=>{calls.ensure++;return new Promise(r=>{resolve=r;});},
  totalSaldoAkun:()=>1000};
 if(loaded){c.saldoPribadi=()=>700;c.isAliranKlien=()=>true;}
 vm.createContext(c);
 const names=['adaProyekKlienSafe','ensureKlienEngineSafe','saldoPribadiSafe','isAliranKlienSafe','pencairanKlienBulanSafe','pencairanKlienRentangSafe'];
 const src=grab(/let _klienEnginePending[^\n]*\n/)+names.map(n=>grab(new RegExp('function '+n+'\\([^\\n]*\\n'))).join('\n');
 vm.runInContext(src,c);
 return {c,calls,done:()=>resolve&&resolve()};
}
const klienD=()=>({renovProjects:[{id:'p',dana:'klien'}],transactions:[]});
test('proyek klien ada + mesin belum dimuat: ensureRenov dipanggil SEKALI lalu cache dibuang & halaman dirender ulang',async()=>{
 const {c,calls,done}=mk(klienD());
 assert.equal(c.saldoPribadiSafe(),1000);
 c.isAliranKlienSafe({});c.pencairanKlienBulanSafe('2026-11');c.pencairanKlienRentangSafe('a','b');
 assert.equal(calls.ensure,1);
 done();await new Promise(r=>setImmediate(r));
 assert.equal(calls.invalidate,1);assert.deepEqual(calls.render,['keuangan']);
});
test('tanpa proyek klien: mesin TIDAK dimuat (tanpa overhead)',()=>{
 const {c,calls}=mk({renovProjects:[{id:'p',dana:'pribadi'}],transactions:[]});
 c.saldoPribadiSafe();c.isAliranKlienSafe({});
 assert.equal(calls.ensure,0);
});
test('mesin sudah dimuat: tidak dipanggil lagi dan nilai pribadi dipakai',()=>{
 const {c,calls}=mk(klienD(),{loaded:true});
 assert.equal(c.saldoPribadiSafe(),700);
 assert.equal(calls.ensure,0);
});
