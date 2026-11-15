'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function load(D,extra={}){return loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=> '2026-11-15',...extra},['Renov']);}
test('Dana proyek: proyek lama ABU dan klasifikasi append-only',()=>{
 const p={id:'p1',items:[]},D={renovProjects:[p],transactions:[],accounts:[]};const c=load(D);
 assert.equal(c.renovClientFundState(p).status,'ABU');
 assert.equal(c.renovClassifyProject(p,'klien','Profil').ok,true);
 assert.equal(p.dana,'klien');assert.equal(p.danaHistory.length,1);assert.equal(p.danaHistory[0].dari,'belum-diklasifikasi');
 assert.equal(c.renovClassifyProject(p,'pribadi','Profil').ok,true);assert.equal(p.danaHistory.length,2);
 p.labaLedger=[{tipe:'akui',jumlah:1}];assert.equal(c.renovClassifyProject(p,'klien','Profil').ok,false);
});
test('Dana tertahan: hanya pembayaran sumber proyek terkonfirmasi yang mengurangi',()=>{
 const p={id:'p1',dana:'klien',items:[{id:'i1',harga:100,payments:[{id:'pay1',txId:'e1',amount:30,accountId:'a1',sumberDana:'proyek'},{id:'pay2',txId:'e2',amount:20,accountId:'a2',sumberDana:'belum-dikonfirmasi'}]}]};
 const D={renovProjects:[p],accounts:[{id:'a1'},{id:'a2'}],transactions:[{id:'dp',type:'income',amount:100,accountId:'a1',renovDpProjectId:'p1'},{id:'e1',type:'expense',amount:30,accountId:'a1'},{id:'e2',type:'expense',amount:20,accountId:'a2'}]};
 const c=load(D);const state=c.renovClientFundState(p);assert.equal(state.status,'KUNING');assert.equal(state.incoming,100);assert.equal(state.cost,30);assert.equal(state.danaTertahan,70);
});
test('Dana tertahan: HIJAU untuk DP dan biaya dari rekening proyek yang valid',()=>{
 const p={id:'p1',dana:'klien',items:[{id:'i1',payments:[{id:'pay1',txId:'e1',amount:40,accountId:'a1'}]}]};
 const D={renovProjects:[p],accounts:[{id:'a1',ownership:'SELF',includeInBalance:true}],transactions:[{id:'dp',type:'income',amount:100,accountId:'a1',renovDpProjectId:'p1'},{id:'e1',type:'expense',amount:40,accountId:'a1'}]};
 const c=load(D);const state=c.renovClientFundState(p);assert.equal(state.status,'HIJAU');assert.equal(state.danaTertahan,60);
});
