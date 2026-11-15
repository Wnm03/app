'use strict';
// Proyeksi kas basis PRIBADI (U-user-6): dana klien tertahan bukan uang bebas pakai.
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
const MONTH=new Date().getMonth(),YEAR=new Date().getFullYear();
const dateIn=(d)=>YEAR+'-'+String(MONTH+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
function setup(txs,fisik=1000,withProject=true){
 const P={id:'p1',name:'Rumah A',klien:'Pak B',dana:'klien',items:[]};
 const D={renovProjects:withProject?[P]:[],accounts:[{id:'a1',ownership:'SELF',includeInBalance:true}],transactions:txs,workDays:[],bills:[],debts:[],piutang:[],profile:{},cashProjSnapshots:[]};
 const r=loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=>dateIn(10),totalSaldoAkun:()=>fisik},['Renov']);
 const c=loadSource(['modules/business/reset-gaji-mingguan.js','modules/finance/tagihan-kalender.js','modules/finance/cash-projection.js'],
  {D,totalSaldoAkun:()=>fisik,saldoPribadiSafe:r.saldoPribadi,isAliranKlienSafe:r.isAliranKlien});
 return {D,c};
}
const dp=(amt,extra={})=>({id:'dp'+amt,type:'income',amount:amt,accountId:'a1',date:dateIn(2),category:'Proyek',renovDpProjectId:'p1',...extra});
test('saldo awal proyeksi = saldo pribadi; fisik tampil sebagai pembanding',()=>{
 const {c}=setup([dp(100)]);const r=c.getMonthlyCashProjection(MONTH,YEAR);
 assert.equal(r.saldoKasSekarang,900);assert.equal(r.saldoFisikSekarang,1000);assert.equal(r.danaKlienTertahan,100);
});
test('tanpa proyek klien: basis pribadi identik dengan fisik',()=>{
 const {c}=setup([],1000,false);const r=c.getMonthlyCashProjection(MONTH,YEAR);
 assert.equal(r.saldoKasSekarang,1000);assert.equal(r.danaKlienTertahan,0);
});
test('DP klien bernuansa "gaji" tidak dianggap gaji; gaji pribadi tetap dianggap',()=>{
 const {c}=setup([]);
 assert.equal(c.isGajiTransaction(dp(100,{note:'gaji termin 1'})),false);
 assert.equal(c.isGajiTransaction({type:'income',amount:5,category:'Gaji'}),true);
});
test('kalibrasi: realisasi mengecualikan aliran klien, pengeluaran pribadi tetap masuk',()=>{
 const {D,c}=setup([dp(500),{id:'g',type:'income',amount:300,accountId:'a1',date:dateIn(3),category:'Gaji'},{id:'x',type:'expense',amount:50,accountId:'a1',date:dateIn(4),category:'Makan'},
  {id:'k',type:'expense',amount:80,accountId:'a1',date:dateIn(5),category:'Proyek',renovRefundProjectId:'p1'}]);
 D.cashProjSnapshots.push({month:MONTH,year:YEAR,proyeksiKas:200,proyeksiSaldoAkhirBulan:0,saldoKasSekarang:0,recordedAt:'x'});
 const k=c.getCashProjectionCalibration(MONTH,YEAR);
 assert.equal(k.available,true);assert.equal(k.realisasiKas,250);assert.equal(k.selisih,50);
});
