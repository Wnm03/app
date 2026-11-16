'use strict';
// Catatan dana klien di hero Dashboard Hub: dibuat sekali, diperbarui, dihapus; null tanpa proyek klien.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const akun=fs.readFileSync('modules/finance/akun.js','utf8');
const hub=fs.readFileSync('modules/dashboard-hub/dashboard-hub.js','utf8');
const grab=(name)=>{const m=akun.match(new RegExp('function '+name+'\\([^\\n]*\\n'));assert.ok(m,name+' belum ada');return m[0];};
function mkEl(){const e={id:'',style:{},textContent:'',children:[],parentNode:null,appendChild(c){c.parentNode=e;e.children.push(c);return c;},remove(){e.parentNode.children=e.parentNode.children.filter(x=>x!==e);}};return e;}
function ctx(D,{fisik=1000,pribadi=700}={}){
 const doc={_by:{},getElementById(id){return this._by[id]||null;},createElement(){const e=mkEl();Object.defineProperty(e,'id',{get(){return this._id||'';},set(v){this._id=v;doc._by[v]=this;}});return e;}};
 const c={D,document:doc,totalSaldoAkun:()=>fisik,saldoPribadiSafe:()=>pribadi,fmtFull:(n)=>'Rp'+n};
 vm.createContext(c);
 vm.runInContext(['adaProyekKlienSafe','saldoKlienRingkasSafe','catatanHubSaldoKlienSafe'].map(grab).join('\n'),c);
 return c;
}
const wrap=()=>{const w=mkEl();const a=mkEl();w.appendChild(a);return {w,a};};
test('tanpa proyek klien: tidak ada elemen tambahan',()=>{
 const c=ctx({renovProjects:[{id:'p',dana:'pribadi'}]});const {w,a}=wrap();
 c.catatanHubSaldoKlienSafe(a);assert.equal(w.children.length,1);
});
test('ada dana tertahan: catatan dibuat sekali & diperbarui',()=>{
 const c=ctx({renovProjects:[{id:'p',dana:'klien'}]});const {w,a}=wrap();
 c.catatanHubSaldoKlienSafe(a);c.catatanHubSaldoKlienSafe(a);
 assert.equal(w.children.length,2);
 assert.match(w.children[1].textContent,/Rp300/);assert.match(w.children[1].textContent,/Rp1000/);
});
test('tertahan 0 / proyek hilang: catatan dihapus',()=>{
 const D={renovProjects:[{id:'p',dana:'klien'}]};const c=ctx(D);const {w,a}=wrap();
 c.catatanHubSaldoKlienSafe(a);assert.equal(w.children.length,2);
 D.renovProjects=[];c.catatanHubSaldoKlienSafe(a);assert.equal(w.children.length,1);
});
test('wiring: hub memanggil dengan guard typeof',()=>{
 assert.match(hub,/typeof catatanHubSaldoKlienSafe === 'function'\) catatanHubSaldoKlienSafe\(saldoEl\)/);
});
