'use strict';
// Fix: jejak laba proyek (hitungKas:false, renovLabaProjectId) tidak boleh dihitung ganda bersama pencairan klien di Laporan.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');
const pad=(n)=>String(n).padStart(2,'0');
const ymd=(d)=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const NOW=new Date(),TODAY=ymd(NOW);
const acc=[{id:'a1',ownership:'SELF',includeInBalance:true}];
const akunSrc=fs.readFileSync('modules/finance/akun.js','utf8');
const grab=(name)=>{const m=akunSrc.match(new RegExp('function '+name+'\\([^\\n]*\\n'));assert.ok(m,name);return m[0];};
const block=akunSrc.slice(akunSrc.indexOf('let _lapBasis'),akunSrc.indexOf('function _ymOf'));
// RAB 200, DP 200, biaya 120 -> LabaMaks 80. Gaji 300 = income pribadi biasa.
function fixture({cairkan=0,dana='klien'}={}){
 const p={id:'p1',name:'Rumah A',klien:'Pak B',dana,rab:200,items:[{id:'i1',harga:120,payments:[{id:'pay1',txId:'e1',amount:120,accountId:'a1',date:TODAY,sumberDana:'proyek'}]}]};
 const D={profile:{nama:'W'},renovProjects:[p],accounts:acc,piutang:[],bills:[],debts:[],workDays:[],cashProjSnapshots:[],
  transactions:[{id:'dp',type:'income',amount:200,accountId:'a1',date:TODAY,renovDpProjectId:'p1'},
   {id:'e1',type:'expense',amount:120,accountId:'a1',date:TODAY,renovProjectLinkId:'p1',renovItemLinkId:'i1',renovPaymentId:'pay1'},
   {id:'g',type:'income',amount:300,accountId:'a1',date:TODAY,category:'Gaji'},
   {id:'m',type:'expense',amount:50,accountId:'a1',date:TODAY,category:'Makan'}]};
 let n=0;
 const r=loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=>TODAY,uid:()=>'u'+(++n),save:()=>true,totalSaldoAkun:()=>1000},['Renov']);
 if(dana==='klien'&&cairkan>0){assert.equal(r.renovTandaiSelesai(p,{semuaBiayaTercatat:true}).ok,true);assert.equal(r.renovAkuiLaba(p,cairkan,{kunci:'a'}).ok,true);assert.equal(r.renovCairkanLaba(p,cairkan,{kunci:'c'}).ok,true);}
 const ctx={D,renovPencairanIncome:r.renovPencairanIncome,renovPencairanBulan:r.renovPencairanBulan,isAliranKlien:r.isAliranKlien};
 vm.createContext(ctx);
 vm.runInContext([grab('isAliranKlienOnlySafe'),grab('isAliranKlienSafe'),grab('pencairanKlienBulanSafe'),grab('pencairanKlienRentangSafe'),grab('_ymdLocal'),block].join('\n'),ctx);
 return {D,ctx};
}
const from=new Date(NOW.getFullYear(),NOW.getMonth(),1),to=new Date(NOW.getFullYear(),NOW.getMonth()+1,0,23,59,59,999);
const F={tipe:'semua',kat:'semua',sub:'semua',acc:'semua',method:'semua',proyek:'semua',sumber:'semua',classification:'semua'};
const memo=(amount)=>({id:'laba',type:'income',amount,accountId:'a1',date:TODAY,category:'Bisnis',hitungKas:false,renovLabaProjectId:'p1',renovLabaOwnerId:'SELF'});
const tot=(f,flt,basis)=>f.ctx.laporanTotalsSafe(f.D.transactions,flt||F,from,to,basis);

test('jejak laba catatan-saja + pencairan: pemasukan pribadi dihitung sekali',()=>{
 const f=fixture({cairkan:80});f.D.transactions.push(memo(80));
 const r=tot(f,F,'pribadi');
 assert.equal(r.pencairan,80);
 assert.equal(r.inc,300+80);assert.equal(r.exp,50);
});
test('semua income/expense catatan-saja (hitungKas:false) tidak masuk total, tetap ada di daftar',()=>{
 const f=fixture({cairkan:80});f.D.transactions.push({id:'x',type:'income',amount:25,accountId:'a1',date:TODAY,hitungKas:false});
 f.D.transactions.push({id:'y',type:'expense',amount:15,accountId:'a1',date:TODAY,hitungKas:false});
 const r=tot(f,F,'pribadi'),q=tot(f,F,'fisik');
 assert.equal(r.inc,300+80);assert.equal(r.exp,50);assert.equal(q.inc,500);assert.equal(q.exp,170);
 assert.equal(r.txsDipakai.some(t=>t.id==='x'),true);
});
test('filter menyempit: catatan-saja tetap tidak dihitung',()=>{
 const f=fixture({cairkan:80});f.D.transactions.push(memo(80));
 const r=f.ctx.laporanTotalsSafe(f.D.transactions.filter(t=>t.category==='Bisnis'),{...F,kat:'Bisnis'},from,to,'pribadi');
 assert.equal(r.pencairan,0);assert.equal(r.inc,0);
});
test('tanpa pencairan: jejak laba catatan-saja tidak ikut dihitung',()=>{
 const f=fixture({cairkan:0});f.D.transactions.push(memo(80));
 const r=tot(f,F,'pribadi');assert.equal(r.pencairan,0);assert.equal(r.inc,300);
});
