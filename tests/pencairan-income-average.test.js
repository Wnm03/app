'use strict';
// Langkah 1 (T-A): pencairan laba proyek klien ikut rata-rata income pribadi
// (worthit.incomeAvg, forecast tx-list-cashflow, realisasi kalibrasi cash-projection).
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
const pad=(n)=>String(n).padStart(2,'0');
const ymd=(d)=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const NOW=new Date(),TODAY=ymd(NOW),MONTH=NOW.getMonth(),YEAR=NOW.getFullYear();
// 'YYYY-MM-DD' dibaca LOKAL seperti getCachedTxDateMs produksi; fallback new Date(str) membaca UTC -> tes flaky di zona UTC+ sebelum jam offset.
const _tzSafeMs=(t)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t&&t.date);return m?new Date(+m[1],+m[2]-1,+m[3]).getTime():new Date(t&&t.date).getTime();};
const acc=[{id:'a1',ownership:'SELF',includeInBalance:true}];
// RAB 200, DP 200, biaya 120 -> LabaMaks 80. Semua tanggal = hari ini supaya masuk jendela.
function fixture({cairkan=0,dana='klien',extraTx=[],fisik=1000}={}){
 const p={id:'p1',name:'Rumah A',klien:'Pak B',dana,rab:200,items:[{id:'i1',harga:120,payments:[{id:'pay1',txId:'e1',amount:120,accountId:'a1',date:TODAY}]}]};
 const D={profile:{nama:'W'},renovProjects:[p],accounts:acc,piutang:[],bills:[],debts:[],workDays:[],cashProjSnapshots:[],
  transactions:[{id:'dp',type:'income',amount:200,accountId:'a1',date:TODAY,renovDpProjectId:'p1'},
   {id:'e1',type:'expense',amount:120,accountId:'a1',date:TODAY,renovProjectLinkId:'p1',renovItemLinkId:'i1',renovPaymentId:'pay1'},
   {id:'g',type:'income',amount:300,accountId:'a1',date:TODAY,category:'Gaji'},...extraTx]};
 let n=0;
 const r=loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=>TODAY,uid:()=>'u'+(++n),save:()=>true,totalSaldoAkun:()=>fisik},['Renov']);
 if(dana==='klien'&&cairkan>0){assert.equal(r.renovTandaiSelesai(p,{semuaBiayaTercatat:true}).ok,true);assert.equal(r.renovAkuiLaba(p,cairkan,{kunci:'a'}).ok,true);assert.equal(r.renovCairkanLaba(p,cairkan,{kunci:'c'}).ok,true);}
 // helper akun.js (satu-satunya definisi), dimuat dari sumber aslinya
 const src=require('node:fs').readFileSync('modules/finance/akun.js','utf8');
 const grab=(name)=>{const m=src.match(new RegExp('function '+name+'\\([^\\n]*\\n'));assert.ok(m,name);return m[0];};
 const helpers=[grab('pencairanKlienBulanSafe'),grab('pencairanKlienRentangSafe'),grab('_ymdLocal')].join('\n');
 return {D,p,r,helpers};
}
function ctxFor(f,extra={}){
 const vm=require('node:vm');const ctx={D:f.D,renovPencairanIncome:f.r.renovPencairanIncome,renovPencairanBulan:f.r.renovPencairanBulan,isAliranKlienSafe:f.r.isAliranKlien,totalSaldoAkun:()=>1000,saldoPribadiSafe:f.r.saldoPribadi,...extra};
 vm.createContext(ctx);vm.runInContext(f.helpers,ctx);return ctx;
}
test('helper rentang: hanya pencairan dalam rentang; tanpa proyek klien = 0',()=>{
 const f=fixture({cairkan:80});const c=ctxFor(f);
 assert.equal(c.pencairanKlienRentangSafe(TODAY,TODAY),80);
 assert.equal(c.pencairanKlienRentangSafe('2000-01-01','2000-12-31'),0);
 const g=fixture({dana:'pribadi'});assert.equal(ctxFor(g).pencairanKlienRentangSafe('2000-01-01','2999-12-31'),0);
 assert.equal(ctxFor(f,{renovPencairanIncome:undefined}).pencairanKlienRentangSafe(TODAY,TODAY),0);
});
test('worthit.incomeAvg: gaji + pencairan, DP klien tetap dikecualikan',()=>{
 const f=fixture({cairkan:80});
 const w=loadSource(['modules/finance/worthit.js'],{D:f.D,FI:{effectiveMonths:()=>1},...ctxFor(f)},['WorthIt']);
 assert.equal(w.WorthIt.incomeAvg(),300+80);
 const f0=fixture({cairkan:0});
 const w0=loadSource(['modules/finance/worthit.js'],{D:f0.D,FI:{effectiveMonths:()=>1},...ctxFor(f0)},['WorthIt']);
 assert.equal(w0.WorthIt.incomeAvg(),300);
});
test('kalibrasi cash-projection: realisasi memasukkan pencairan bulan itu',()=>{
 const f=fixture({cairkan:80});const x=ctxFor(f);
 const c=loadSource(['modules/business/reset-gaji-mingguan.js','modules/finance/tagihan-kalender.js','modules/finance/cash-projection.js'],{D:f.D,totalSaldoAkun:()=>1000,saldoPribadiSafe:f.r.saldoPribadi,isAliranKlienSafe:f.r.isAliranKlien,pencairanKlienBulanSafe:x.pencairanKlienBulanSafe});
 f.D.cashProjSnapshots.push({month:MONTH,year:YEAR,proyeksiKas:100,proyeksiSaldoAkhirBulan:0,saldoKasSekarang:0,recordedAt:'x'});
 const k=c.getCashProjectionCalibration(MONTH,YEAR);
 // income pribadi 300 (gaji) + 80 (pencairan) - expense 120 = 260
 assert.equal(k.realisasiKas,260);
});
function forecast(f,opts){
 const x=ctxFor(f);
 const c=loadSource(['modules/finance/tx-list-cashflow.js'],{D:f.D,BudgetReko:{monthsAvailable:()=>1,effectiveMonths:()=>1,rangeFrom:()=>new Date(YEAR,MONTH,1)},
  totalSaldoAkun:()=>1000,recalcAccBalance:()=>1000,saldoPribadiSafe:f.r.saldoPribadi,save:()=>{},isAliranKlienSafe:f.r.isAliranKlien,pencairanKlienRentangSafe:x.pencairanKlienRentangSafe,_ymdLocal:x._ymdLocal,getCachedTxDateMs:_tzSafeMs});
 return c.computeCashflowForecast(opts);
}
test('forecast incAvg: gaji + pencairan; DP klien tetap keluar; ',()=>{
 const r=forecast(fixture({cairkan:80}),{months:1,from:new Date(YEAR,MONTH,1)});
 assert.equal(r.incAvg,380);
 assert.equal(forecast(fixture({cairkan:0}),{months:1,from:new Date(YEAR,MONTH,1)}).incAvg,300);
});
test('forecast per akun: pencairan (bukan mutasi akun) tidak ikut',()=>{
 const r=forecast(fixture({cairkan:80}),{months:1,from:new Date(YEAR,MONTH,1),accountId:'a1'});
 assert.equal(r.incAvg,300);
});
test('proyek pribadi (tanpa DP klien) / tanpa pencairan: angka identik dengan perilaku lama',()=>{
 const f=fixture({dana:'pribadi'});f.D.transactions=f.D.transactions.filter(t=>t.id!=='dp');
 const r=forecast(f,{months:1,from:new Date(YEAR,MONTH,1)});
 assert.equal(r.incAvg,300);assert.equal(f.helpers.length>0,true);
});

// ---- Langkah 2: saldo awal forecast basis pribadi ----
test('saldo awal forecast = pribadi (fisik - dana tertahan); fisik & tertahan jadi pembanding',()=>{
 // sebelum selesai: DP 200 - biaya 120 -> tertahan 80 (belum diakui/dicairkan)
 const r=forecast(fixture({cairkan:0}),{months:1,from:new Date(YEAR,MONTH,1)});
 assert.equal(r.saldoFisik,1000);assert.equal(r.danaKlienTertahan,80);assert.equal(r.saldoNow,920);
 assert.equal(r.projected,r.saldoNow+r.incAvg-r.expAvg-r.billsDue);
});
test('setelah pencairan: dana tertahan turun, saldo pribadi naik, fisik tetap',()=>{
 const r=forecast(fixture({cairkan:80}),{months:1,from:new Date(YEAR,MONTH,1)});
 assert.equal(r.saldoFisik,1000);assert.equal(r.danaKlienTertahan,0);assert.equal(r.saldoNow,1000);
});
test('filter per akun tetap fisik; tanpa proyek klien identik dgn lama',()=>{
 const a=forecast(fixture({cairkan:0}),{months:1,from:new Date(YEAR,MONTH,1),accountId:'a1'});
 assert.equal(a.saldoNow,1000);assert.equal(a.danaKlienTertahan,0);
 const f=fixture({dana:'pribadi'});f.D.transactions=f.D.transactions.filter(t=>t.id!=='dp');
 const r=forecast(f,{months:1,from:new Date(YEAR,MONTH,1)});
 assert.equal(r.saldoNow,1000);assert.equal(r.danaKlienTertahan,0);
});
test('dana tertahan > saldo fisik: saldo pribadi negatif apa adanya (tidak di-clamp), projected konsisten',()=>{
 const f=fixture({cairkan:0,fisik:50});
 const x=ctxFor(f);
 const c=loadSource(['modules/finance/tx-list-cashflow.js'],{D:f.D,BudgetReko:{monthsAvailable:()=>1,effectiveMonths:()=>1,rangeFrom:()=>new Date(YEAR,MONTH,1)},
  totalSaldoAkun:()=>50,recalcAccBalance:()=>50,saldoPribadiSafe:f.r.saldoPribadi,save:()=>{},isAliranKlienSafe:f.r.isAliranKlien,pencairanKlienRentangSafe:x.pencairanKlienRentangSafe,_ymdLocal:x._ymdLocal,getCachedTxDateMs:_tzSafeMs});
 const r=c.computeCashflowForecast({months:1,from:new Date(YEAR,MONTH,1)});
 assert.equal(r.saldoNow,-30);assert.equal(r.danaKlienTertahan,80);
});
