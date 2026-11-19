'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');
function load(D,extra={}){return loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=>'2026-11-15',uid:(()=>{let n=0;return()=>'u'+(++n);})(),...extra},['Renov']);}
const acc=[{id:'a1',ownership:'SELF',includeInBalance:true}];
function fixture(src){
 const p={id:'p1',name:'Rumah A',klien:'Pak B',dana:'klien',items:[{id:'i1',harga:100,payments:[{id:'pay1',txId:'e1',amount:40,accountId:'a1',date:'2026-11-01',sumberDana:src}]}]};
 const D={renovProjects:[p],accounts:acc,piutang:[],transactions:[{id:'dp',type:'income',amount:100,accountId:'a1',renovDpProjectId:'p1'},{id:'e1',type:'expense',amount:40,accountId:'a1',renovProjectLinkId:'p1',renovItemLinkId:'i1',renovPaymentId:'pay1'}]};
 return {p,D};
}
test('saldoPribadi = fisik - dana tertahan; proyek lama tidak berubah',()=>{
 const {p,D}=fixture('proyek');const c=load(D,{totalSaldoAkun:()=>1000});
 assert.equal(c.renovDanaTertahan(p),60);assert.equal(c.saldoPribadi(),940);
 delete p.dana;assert.equal(c.saldoPribadi(),1000);
 p.dana='pribadi';assert.equal(c.saldoPribadi(),1000);
});
test('isAliranKlien: DP, pengembalian, belanja dana proyek; belanja talangan pribadi tetap pribadi',()=>{
 const {D}=fixture('proyek');const c=load(D);
 assert.equal(c.isAliranKlien(D.transactions[0]),true);
 assert.equal(c.isAliranKlien(D.transactions[1]),true);
 assert.equal(c.isAliranKlien({type:'expense',renovRefundProjectId:'p1'}),true);
 const f=fixture('talangan-pribadi');assert.equal(load(f.D).isAliranKlien(f.D.transactions[1]),false);
 assert.equal(load(f.D).isAliranKlien({type:'income',amount:5}),false);
});
test('T1: talangan-tagih membuat piutang tertaut, bukan expense pribadi, bukan biaya proyek',()=>{
 const {p,D}=fixture('talangan-tagih');const c=load(D);
 assert.equal(c.isAliranKlien(D.transactions[1]),false);
 const r=c.renovEnsureTalanganPiutang(p,p.items[0],p.items[0].payments[0]);
 assert.equal(r.ok,true);assert.equal(D.piutang.length,1);assert.equal(D.piutang[0].nilai,40);assert.equal(D.piutang[0].renovPaymentId,'pay1');
 assert.equal(c.isAliranKlien(D.transactions[1]),true);
 assert.equal(c.renovClientFundState(p).cost,0);
 assert.equal(c.renovEnsureTalanganPiutang(p,p.items[0],p.items[0].payments[0]).existing,true);assert.equal(D.piutang.length,1);
});
test('T1: nilai > pembayaran ditolak; tanpa klien ditolak',()=>{
 const {p,D}=fixture('talangan-tagih');const c=load(D);const pay=p.items[0].payments[0];
 assert.equal(c.renovEnsureTalanganPiutang(p,p.items[0],pay,41).ok,false);
 p.klien='';assert.equal(c.renovEnsureTalanganPiutang(p,p.items[0],pay).ok,false);assert.equal(D.piutang.length,0);
});
test('T1: hapus transaksi membersihkan piutang belum lunas, mempertahankan yang lunas',()=>{
 const {p,D}=fixture('talangan-tagih');const c=load(D);c.renovEnsureTalanganPiutang(p,p.items[0],p.items[0].payments[0]);
 D.piutang[0].lunas=true;c.Renov.onTalanganTxDeleted({id:'e1'});assert.equal(D.piutang.length,1);
 D.piutang[0].lunas=false;c.Renov.onTalanganTxDeleted({id:'e1'});assert.equal(D.piutang.length,0);
});
test('Backup/restore: klasifikasi, riwayat, arsip, sumberDana, piutang identik setelah round-trip',()=>{
 const {p,D}=fixture('talangan-tagih');const c=load(D);
 const _tx=D.transactions;D.transactions=_tx.filter(t=>!t.renovDpProjectId&&!t.renovRefundProjectId);/* S2840: klien->pribadi ditolak bila ada DP/refund; ganti klasifikasi dites tanpa aliran klien */
 c.renovClassifyProject(p,'pribadi','x');c.renovClassifyProject(p,'klien','x');D.transactions=_tx;p.status='arsip';
 c.renovEnsureTalanganPiutang(p,p.items[0],p.items[0].payments[0]);
 const copy=JSON.parse(JSON.stringify({renovProjects:D.renovProjects,piutang:D.piutang,transactions:D.transactions}));
 const D2={...copy,accounts:acc};const c2=load(D2);
 assert.equal(JSON.stringify(D2.renovProjects),JSON.stringify(D.renovProjects));assert.equal(D2.renovProjects[0].danaHistory.length,2);
 assert.equal(JSON.stringify(c2.renovClientFundState(D2.renovProjects[0])),JSON.stringify(c.renovClientFundState(p)));
 assert.equal(c2.renovDanaTertahan(D2.renovProjects[0]),c.renovDanaTertahan(p));
});
test('Konsumen terpasang: NW, snapshot basis, zakat, budget memakai helper',()=>{
 const rd=f=>fs.readFileSync(f,'utf8');
 assert.match(rd('modules/shared/modules-calc.js'),/saldoPribadiSafe\(\):totalSaldoAkun\(\)\)\+totalAssetValue\(\)/);
 assert.match(rd('modules/shared/modules-calc.js'),/const saldoAkun=\(typeof saldoPribadiSafe==='function'\?saldoPribadiSafe\(\):totalSaldoAkun\(\)\)/);
 assert.match(rd('modules/shared/modules-calc.js'),/basis:'pribadi-v1'/);
  assert.match(rd('modules/finance/pajak-pbb-zakat.js'),/isAliranKlienSafe\(t\)\)&&String/);
 assert.match(rd('budget.js'),/isAliranKlienSafe\(t\)\) return false/);
 const E=fs.readFileSync('modules/finance/akun.js','utf8');assert.match(E,/function saldoPribadiSafe/);
});
