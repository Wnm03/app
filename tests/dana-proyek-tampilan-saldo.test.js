'use strict';
// Tampilan saldo: rincian fisik / dana klien tertahan / pribadi, hanya saat ada proyek klien.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const akun=fs.readFileSync('modules/finance/akun.js','utf8');
const grab=(name)=>{const m=akun.match(new RegExp('function '+name+'\\([^\\n]*\\n'));assert.ok(m,name+' belum ada');return m[0];};
function mkEl(){const e={id:'',className:'',style:{},textContent:'',children:[],parentNode:null,appendChild(c){c.parentNode=e;e.children.push(c);return c;},remove(){e.parentNode.children=e.parentNode.children.filter(x=>x!==e);}};return e;}
function ctx(D,{fisik=1000,pribadi=700,links=[]}={}){
 const doc={_by:{},getElementById(id){return this._by[id]||null;},createElement(){const e=mkEl();Object.defineProperty(e,'id',{get(){return this._id||'';},set(v){this._id=v;doc._by[v]=this;}});return e;}};
 const c={D,document:doc,totalSaldoAkun:()=>fisik,saldoPribadiSafe:()=>pribadi,fmtFull:(n)=>'Rp'+n,sameId:(a,b)=>String(a)===String(b),
  isAliranKlienSafe:(t)=>!!t.renovDpProjectId,isAliranKlienOnlySafe:(t)=>!!t.renovDpProjectId,isAccLinkedToAsset:(id)=>links.includes(id)};
 vm.createContext(c);
 vm.runInContext(['adaProyekKlienSafe','isAliranKlienSafe','akunPunyaAliranKlienSafe','saldoKlienRingkasSafe','catatanSaldoKlienSafe','akunAliranKlienSetSafe','akunTertautBerisiKlienSafe'].map(n=>n==='isAliranKlienSafe'?'':grab(n)).join('\n'),c);
 return c;
}
const wrap=()=>{const w=mkEl();const a=mkEl();w.appendChild(a);return {w,a};};
test('ringkasan null tanpa proyek klien (tampilan identik)',()=>{
 const c=ctx({renovProjects:[{id:'p',dana:'pribadi'}],transactions:[],accounts:[]});
 assert.equal(c.saldoKlienRingkasSafe(),null);
 const {w,a}=wrap();c.catatanSaldoKlienSafe(a,'n1');assert.equal(w.children.length,1);
});
test('ringkasan: fisik, tertahan, pribadi',()=>{
 const c=ctx({renovProjects:[{id:'p',dana:'klien'}],transactions:[],accounts:[]});
 const r=c.saldoKlienRingkasSafe();
 assert.equal(r.fisik,1000);assert.equal(r.pribadi,700);assert.equal(r.tertahan,300);
});
test('catatan dibuat sekali, diperbarui, dan dihapus bila proyek klien hilang',()=>{
 const D={renovProjects:[{id:'p',dana:'klien'}],transactions:[],accounts:[]};
 const c=ctx(D);const {w,a}=wrap();
 c.catatanSaldoKlienSafe(a,'n2');c.catatanSaldoKlienSafe(a,'n2');
 assert.equal(w.children.length,2);
 assert.match(w.children[1].textContent,/Rp300/);assert.match(w.children[1].textContent,/Rp700/);
 D.renovProjects=[];c.catatanSaldoKlienSafe(a,'n2');
 assert.equal(w.children.length,1);
});
test('akun memuat aliran klien: set satu pass + daftar akun tertaut aset',()=>{
 const D={renovProjects:[{id:'p',dana:'klien'}],accounts:[{id:'a1',name:'BCA'},{id:'a2',name:'Lain'}],
  transactions:[{id:'1',accountId:'a1',renovDpProjectId:'p'},{id:'2',accountId:'a2'}]};
 const c=ctx(D,{links:['a1']});
 const s=c.akunAliranKlienSetSafe();
 assert.equal(s.has('a1'),true);assert.equal(s.has('a2'),false);
 const t=c.akunTertautBerisiKlienSafe();
 assert.deepEqual(Array.from(t,x=>x.nama),['BCA']);
});
test('wiring: render akun, dashboard, laporan, kekayaan',()=>{
 const r=fs.readFileSync('modules/shared/modules-render.js','utf8');
 assert.match(r,/catatanSaldoKlienSafe\(totalSubEl/);
 assert.match(r,/catatanSaldoKlienSafe\(tEl,'dashAccTotalKlien'/);
 assert.match(r,/catatanSaldoKlienSafe\(tEl,'lapAccTotalKlien'/);
 assert.match(r,/akunAliranKlienSetSafe\(\)/);
 assert.match(r,/memuat dana klien/);
 assert.match(r,/akunTertautBerisiKlienSafe\(\)/);
 const k=fs.readFileSync('modules/shared/modules-calc.js','utf8');
 assert.match(k,/kbSaldoAkunNote/);
});
