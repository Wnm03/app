'use strict';
// Temuan uji browser: resolveOwnerDefaultForAccount memberi [{ownerId:'SELF',porsi:100}] utk akun biasa,
// sehingga renovAccountOwners(...).length>0 utk SEMUA akun -> DP "di luar cakupan", biaya dianggap "akun titipan"
// (tidak dihitung), status tak pernah HIJAU, laba tak bisa diakui. Pemilik SELF 100% BUKAN titipan.
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
const pad=(n)=>String(n).padStart(2,'0');
const N=new Date(),TODAY=N.getFullYear()+'-'+pad(N.getMonth()+1)+'-'+pad(N.getDate());
function fx(owners,{deduct}={}){
 const p={id:'p1',name:'R',klien:'B',dana:'klien',rab:200,status:'aktif',items:[{id:'i1',harga:120,payments:[{id:'pay1',txId:'e1',amount:120,accountId:'a1',date:TODAY,sumberDana:'proyek'}]}]};
 const D={renovProjects:[p],accounts:[{id:'a1',ownership:'SELF',includeInBalance:true}],piutang:[],
  transactions:[{id:'dp',type:'income',amount:200,accountId:'a1',date:TODAY,renovDpProjectId:'p1'},
   {id:'e1',type:'expense',amount:120,accountId:'a1',date:TODAY,renovProjectLinkId:'p1',renovItemLinkId:'i1',...(deduct?{deductionOwnerId:deduct}:{})}]};
 const r=loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=>TODAY,uid:()=>'u',save:()=>true,totalSaldoAkun:()=>380,renovAccountOwners:()=>owners},['Renov']);
 return {p,r};
}
test('pemilik default SELF 100%: DP eligible, biaya terhitung, status HIJAU, dana tertahan 80',()=>{
 const {p,r}=fx([{ownerId:'SELF',porsi:100,ownerName:'Milik Sendiri'}]);
 const st=r.renovClientFundState(p);
 assert.equal(st.status,'HIJAU',st.reason);
 assert.equal(st.cost,120);
 assert.equal(st.danaTertahan,80);
});
test('deductionOwnerId SELF tidak dianggap titipan',()=>{
 const {p,r}=fx([{ownerId:'SELF',porsi:100}],{deduct:'SELF'});
 assert.equal(r.renovClientFundState(p).status,'HIJAU');
});
test('pemilik non-SELF (titipan) tetap ditolak',()=>{
 const {p,r}=fx([{ownerId:'bu-ani',porsi:100}]);
 const st=r.renovClientFundState(p);
 assert.equal(st.status,'KUNING');assert.match(st.reason,/titipan|luar cakupan/);
 assert.equal(st.cost,0);
});
test('akun tanpa pemilik: tetap eligible',()=>{
 const {p,r}=fx([]);
 assert.equal(r.renovClientFundState(p).status,'HIJAU');
});
