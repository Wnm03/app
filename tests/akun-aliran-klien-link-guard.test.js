'use strict';
// Langkah 5 (U-10): akun berisi aliran dana klien tidak boleh ditautkan ke aset/holding.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const akun=fs.readFileSync('modules/finance/akun.js','utf8');
const grab=(n)=>{const m=akun.match(new RegExp('function '+n+'\\([^\\n]*\\n'));assert.ok(m,n);return m[0];};
function ctx(D){
 const c={D,sameId:(a,b)=>String(a)===String(b),isAliranKlien:(t)=>t.type==='income'&&t.renovDpProjectId!=null};
 vm.createContext(c);vm.runInContext(grab('isAliranKlienSafe')+grab('akunPunyaAliranKlienSafe'),c);return c;
}
test('akun dengan DP klien terdeteksi; akun lain tidak',()=>{
 const c=ctx({transactions:[{id:1,accountId:'a1',type:'income',amount:10,renovDpProjectId:'p1'},{id:2,accountId:'a2',type:'income',amount:5}]});
 assert.equal(c.akunPunyaAliranKlienSafe('a1'),true);
 assert.equal(c.akunPunyaAliranKlienSafe('a2'),false);
 assert.equal(c.akunPunyaAliranKlienSafe(''),false);assert.equal(c.akunPunyaAliranKlienSafe(null),false);
});
test('id angka vs string tetap cocok; tanpa transaksi = false',()=>{
 assert.equal(ctx({transactions:[{accountId:7,type:'income',renovDpProjectId:'p'}]}).akunPunyaAliranKlienSafe('7'),true);
 assert.equal(ctx({}).akunPunyaAliranKlienSafe('a1'),false);
});
test('guard terpasang di form Aset dan Holding, tautan lama tidak diblokir',()=>{
 const a=fs.readFileSync('modules/asset/aset.js','utf8'),h=fs.readFileSync('modules/asset/investasi-list-view.js','utf8');
 assert.match(a,/akunPunyaAliranKlienSafe\(accountId\)/);assert.match(a,/sameId\(_cur\.accountId,accountId\)/);
 assert.match(h,/akunPunyaAliranKlienSafe\(accountId\)/);assert.match(h,/String\(_cur\.accountId\) === String\(accountId\)/);
 assert.ok(a.indexOf('akunPunyaAliranKlienSafe(accountId)')<a.indexOf("if(accountId==='__new__')"),'guard harus sebelum mutasi akun');
});
