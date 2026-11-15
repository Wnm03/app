'use strict';
// Langkah 6 (U-10): detektor read-only akun tertaut aset yang memuat dana klien.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');
function load(linked){
 const D={profile:{nama:'W'},accounts:[{id:'a1',name:'Kas',ownership:'SELF'},{id:'a2',name:'Rekening Sewa',ownership:'SELF'}],
  renovProjects:[{id:'p1',name:'Rumah A',dana:'klien',items:[]},{id:'p2',name:'Rumah B',dana:'klien',items:[]}],
  transactions:[
   {id:'t1',type:'income',amount:100,accountId:'a1',date:'2026-11-01',renovDpProjectId:'p1'},
   {id:'t2',type:'income',amount:50,accountId:'a2',date:'2026-11-02',renovDpProjectId:'p1'},
   {id:'t3',type:'income',amount:70,accountId:'a2',date:'2026-11-03',renovDpProjectId:'p2'},
   {id:'t4',type:'expense',amount:20,accountId:'a2',date:'2026-11-04',renovRefundProjectId:'p2'},
   {id:'t5',type:'income',amount:999,accountId:'a2',date:'2026-11-05',category:'Sewa'}]};
 const snap=JSON.stringify(D);
 const r=loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),isAccLinkedToAsset:(id)=>linked.includes(String(id))},['Renov']);
 return {D,snap,r};
}
test('akun tertaut aset yang memuat DP/pengembalian klien terdeteksi; income sewa biasa tidak dihitung',()=>{
 const {r}=load(['a2']);const out=r.renovAkunTertautBerisiKlien();
 assert.equal(out.length,1);assert.equal(out[0].nama,'Rekening Sewa');assert.equal(out[0].jumlahTx,3);assert.equal(JSON.stringify([...out[0].proyek].sort()),'["p1","p2"]');
});
test('filter per proyek',()=>{
 const {r}=load(['a2']);
 assert.equal(r.renovAkunTertautBerisiKlien('p1')[0].jumlahTx,1);
 assert.equal(r.renovAkunTertautBerisiKlien('p2')[0].jumlahTx,2);
 assert.equal(JSON.stringify(r.renovAkunTertautBerisiKlien('p9')),'[]');
});
test('tanpa akun tertaut / tanpa helper tertaut = kosong; data tidak diubah (read-only)',()=>{
 const a=load([]);assert.equal(JSON.stringify(a.r.renovAkunTertautBerisiKlien()),'[]');
 const b=load(['a2']);b.r.renovAkunTertautBerisiKlien();assert.equal(JSON.stringify(b.D),b.snap);
 const D={accounts:[],renovProjects:[],transactions:[]};
 const r=loadSource(['modules/home/renovasi.js'],{D,sameId:(x,y)=>String(x)===String(y)},['Renov']);
 assert.equal(JSON.stringify(r.renovAkunTertautBerisiKlien()),'[]');
});
test('panel Arus Dana Proyek memuat peringatan hanya untuk proyek klien',()=>{
 const src=fs.readFileSync('modules/home/renovasi.js','utf8');
 assert.match(src,/const warnLink=_lnk\.length/);assert.match(src,/p\.dana==='klien'&&typeof renovAkunTertautBerisiKlien/);
 assert.match(src,/Dana tertahan \$\{fmt\(renovDanaTertahan\(p\)\)\}<\/div>\$\{warnLink\}/);
});
