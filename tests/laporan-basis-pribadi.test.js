'use strict';
// Langkah 3: Laporan basis pribadi/fisik (laporanTotalsSafe di akun.js) + label basis di audit engine.
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
 vm.runInContext([grab('isAliranKlienSafe'),grab('pencairanKlienBulanSafe'),grab('pencairanKlienRentangSafe'),grab('_ymdLocal'),block].join('\n'),ctx);
 return {D,ctx};
}
const from=new Date(NOW.getFullYear(),NOW.getMonth(),1),to=new Date(NOW.getFullYear(),NOW.getMonth()+1,0,23,59,59,999);
const F={tipe:'semua',kat:'semua',sub:'semua',acc:'semua',method:'semua',proyek:'semua',sumber:'semua',classification:'semua'};
const tot=(f,flt,basis)=>f.ctx.laporanTotalsSafe(f.D.transactions,flt||F,from,to,basis);

test('pribadi (default): DP & belanja klien dikecualikan, pencairan ditambahkan',()=>{
 const f=fixture({cairkan:80});const r=tot(f,F,'pribadi');
 assert.equal(r.inc,300+80);assert.equal(r.exp,50);
 assert.equal(r.incFisik,500);assert.equal(r.expFisik,170);
 assert.equal(r.klienMasuk,200);assert.equal(r.klienKeluar,120);assert.equal(r.pencairan,80);
 assert.equal(r.basisEfektif,'pribadi');
});
test('fisik: semua pergerakan uang, pencairan tidak tampil',()=>{
 const f=fixture({cairkan:80});const r=tot(f,F,'fisik');
 assert.equal(r.inc,500);assert.equal(r.exp,170);assert.equal(r.pencairan,0);assert.equal(r.basisEfektif,'fisik');
});
test('tanpa proyek klien: pribadi == fisik (angka identik)',()=>{
 const f=fixture({dana:'pribadi'});
 f.D.transactions=f.D.transactions.filter(t=>t.id==='g'||t.id==='m');
 const a=tot(f,F,'pribadi'),b=tot(f,F,'fisik');
 assert.equal(a.inc,b.inc);assert.equal(a.exp,b.exp);assert.equal(a.inc,300);assert.equal(a.exp,50);
});
test('filter Proyek/Akun/Sumber aktif memaksa basis fisik dengan alasan',()=>{
 const f=fixture({cairkan:80});
 const p=tot(f,{...F,proyek:'p1'},'pribadi');assert.equal(p.basisEfektif,'fisik');assert.equal(p.alasan,'filter Proyek');assert.equal(p.pencairan,0);
 const a=tot(f,{...F,acc:'a1'},'pribadi');assert.equal(a.basisEfektif,'fisik');assert.equal(a.alasan,'filter Akun');
 const s=tot(f,{...F,sumber:'proyek'},'pribadi');assert.equal(s.basisEfektif,'fisik');assert.equal(s.alasan,'filter Sumber Dana');
});
test('pencairan tidak ikut bila filter menyempit (kategori / tipe pengeluaran / tanpa proyek)',()=>{
 const f=fixture({cairkan:80});
 assert.equal(tot(f,{...F,kat:'Gaji'},'pribadi').pencairan,0);
 assert.equal(tot(f,{...F,tipe:'expense'},'pribadi').pencairan,0);
 assert.equal(tot(f,{...F,proyek:'__none'},'pribadi').pencairan,0);
 assert.equal(tot(f,{...F,tipe:'income'},'pribadi').pencairan,80);
});
test('pencairan di luar rentang tidak dihitung',()=>{
 const f=fixture({cairkan:80});
 const r=f.ctx.laporanTotalsSafe(f.D.transactions,F,new Date(2000,0,1),new Date(2000,0,31,23,59,59),'pribadi');
 assert.equal(r.pencairan,0);
});
test('state basis: default pribadi, setLapBasis menormalkan nilai',()=>{
 const f=fixture();
 assert.equal(f.ctx.getLapBasis(),'pribadi');
 assert.equal(f.ctx.setLapBasis('fisik'),'fisik');assert.equal(f.ctx.getLapBasis(),'fisik');
 assert.equal(f.ctx.setLapBasis('apa-saja'),'pribadi');
});
test('audit engine: income/expense tetap fisik, pribadi aditif',()=>{
 const f=fixture({cairkan:80});
 const SELF={_isTxAccountSelf:()=>true};
 const e=loadSource(['modules/finance/financial-audit-engine.js'],{D:f.D,FinanceIntelligence:SELF,isAliranKlienSafe:f.ctx.isAliranKlienSafe,pencairanKlienRentangSafe:f.ctx.pencairanKlienRentangSafe},['FinancialAuditEngine']);
 const out=e.FinancialAuditEngine.summary({from:ymd(from),to:ymd(to)});
 assert.equal(out.income,500);assert.equal(out.expense,170);assert.equal(out.basis,'fisik');
 assert.equal(out.pribadi.income,380);assert.equal(out.pribadi.expense,50);assert.equal(out.pribadi.net,330);
 assert.equal(out.pribadi.pencairan,80);assert.equal(out.pribadi.berbeda,true);
});
test('audit engine tanpa helper klien: pribadi == fisik, berbeda=false',()=>{
 const D={transactions:[{id:'i',accountId:'a1',type:'income',amount:100,date:TODAY},{id:'x',accountId:'a1',type:'expense',amount:40,date:TODAY}],accounts:[{id:'a1',ownership:'SELF'}]};
 const e=loadSource(['modules/finance/financial-audit-engine.js'],{D,FinanceIntelligence:{_isTxAccountSelf:()=>true}},['FinancialAuditEngine']);
 const out=e.FinancialAuditEngine.summary({from:ymd(from),to:ymd(to)});
 assert.equal(out.pribadi.income,out.income);assert.equal(out.pribadi.expense,out.expense);assert.equal(out.pribadi.berbeda,false);
});
