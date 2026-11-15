'use strict';
// Fase 4-5: ledger laba proyek klien (pengakuan + pencairan). Metode "selesai + terverifikasi".
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function load(D,extra={}){let n=0;return loadSource(['modules/home/renovasi.js'],{D,sameId:(a,b)=>String(a)===String(b),todayStr:()=>'2026-11-15',uid:()=> 'u'+(++n),save:()=>true,...extra},['Renov']);}
const acc=[{id:'a1',ownership:'SELF',includeInBalance:true}];
// RAB 200, DP 200 masuk, biaya dana proyek 120 -> labaMaks 80 setelah selesai + atestasi lengkap.
function fixture(over={}){
 const p={id:'p1',name:'Rumah A',klien:'Pak B',dana:'klien',rab:200,items:[{id:'i1',harga:120,payments:[{id:'pay1',txId:'e1',amount:120,accountId:'a1',date:'2026-11-01'}]}],...over};
 const D={profile:{nama:'Wnm'},renovProjects:[p],accounts:acc,piutang:[],transactions:[{id:'dp',type:'income',amount:200,accountId:'a1',date:'2026-11-01',renovDpProjectId:'p1'},{id:'e1',type:'expense',amount:120,accountId:'a1',date:'2026-11-02',renovProjectLinkId:'p1',renovItemLinkId:'i1',renovPaymentId:'pay1'}]};
 return {p,D};
}
const selesai=(c,p)=>c.renovTandaiSelesai(p,{semuaBiayaTercatat:true});

test('Belum selesai: LabaMaks 0, akui dan cairkan ditolak, estimasi margin hanya informasi',()=>{
 const {p,D}=fixture();const c=load(D);const sm=c.renovLabaSummary(p);
 assert.equal(sm.labaMaks,0);assert.equal(sm.syarat,false);assert.equal(sm.estimasiMargin,80);
 assert.equal(c.renovAkuiLaba(p,10).ok,false);assert.equal(c.renovCairkanLaba(p,10).ok,false);assert.equal(p.labaLedger,undefined);
});
test('Tandai selesai butuh atestasi; proyek pribadi/ABU ditolak',()=>{
 const {p,D}=fixture();const c=load(D);
 assert.equal(c.renovTandaiSelesai(p,{}).ok,false);assert.equal(p.status,undefined);
 assert.equal(selesai(c,p).ok,true);assert.equal(p.status,'selesai');assert.equal(p.atestasi.semuaBiayaTercatat,true);
 const q=fixture({dana:'pribadi'});assert.equal(load(q.D).renovTandaiSelesai(q.p,{semuaBiayaTercatat:true}).ok,false);
});
test('Akui bertahap dibatasi LabaMaks kumulatif dan idempoten lewat kunci',()=>{
 const {p,D}=fixture();const c=load(D);selesai(c,p);
 assert.equal(c.renovLabaSummary(p).labaMaks,80);
 assert.equal(c.renovAkuiLaba(p,50,{kunci:'k1'}).ok,true);
 assert.equal(c.renovAkuiLaba(p,50,{kunci:'k2'}).ok,false);
 assert.equal(c.renovAkuiLaba(p,50,{kunci:'k1'}).duplicate,true);assert.equal(p.labaLedger.length,1);
 assert.equal(c.renovAkuiLaba(p,30,{kunci:'k3'}).ok,true);assert.equal(c.renovLabaSummary(p).labaDiakuiBersih,80);
 assert.equal(c.renovAkuiLaba(p,1,{kunci:'k4'}).ok,false);
 assert.equal(p.labaLedger[0].dasar.labaMaks,80);assert.equal(p.labaLedger[0].oleh,'Wnm');
});
test('Cadangan biaya menurunkan LabaMaks bila atestasi belum lengkap',()=>{
 const {p,D}=fixture();const c=load(D);
 assert.equal(c.renovTandaiSelesai(p,{semuaBiayaTercatat:false,cadangan:30}).ok,true);
 assert.equal(c.renovLabaSummary(p).cadangan,30);assert.equal(c.renovLabaSummary(p).labaMaks,50);
});
test('Kas klien kurang dari kontrak: laba tidak diakui dari tagihan belum dibayar',()=>{
 const {p,D}=fixture({rab:300});D.transactions[0].amount=150;const c=load(D);selesai(c,p);
 assert.equal(c.renovLabaSummary(p).labaMaks,30);
});
test('Pencairan: dana tertahan turun, saldo pribadi naik, tanpa transaksi baru',()=>{
 const {p,D}=fixture();const c=load(D,{totalSaldoAkun:()=>1000});selesai(c,p);c.renovAkuiLaba(p,80,{kunci:'a'});
 assert.equal(c.renovDanaTertahan(p),80);assert.equal(c.saldoPribadi(),920);
 const txBefore=D.transactions.length;
 assert.equal(c.renovCairkanLaba(p,30,{kunci:'c1',tanggal:'2026-11-10'}).ok,true);
 assert.equal(D.transactions.length,txBefore);assert.equal(c.renovDanaTertahan(p),50);assert.equal(c.saldoPribadi(),950);
 assert.equal(c.renovPencairanBulan('2026-11'),30);assert.equal(c.renovPencairanBulan('2026-10'),0);
 assert.equal(c.renovCairkanLaba(p,51,{kunci:'c2'}).ok,false);
 assert.equal(c.renovCairkanLaba(p,30,{kunci:'c1'}).duplicate,true);assert.equal(c.renovPencairanBulan('2026-11'),30);
 assert.equal(c.renovCairkanLaba(p,50,{kunci:'c3'}).ok,true);assert.equal(c.renovLabaSummary(p).batasPencairan,0);assert.equal(c.saldoPribadi(),1000);
});
test('Batal pencairan: sekali saja, mengurangi income periode asal, dana kembali tertahan',()=>{
 const {p,D}=fixture();const c=load(D,{totalSaldoAkun:()=>1000});selesai(c,p);c.renovAkuiLaba(p,80,{kunci:'a'});
 const r=c.renovCairkanLaba(p,40,{kunci:'c1',tanggal:'2026-10-20'});const id=r.entry.id;
 assert.equal(c.renovPencairanBulan('2026-10'),40);
 assert.equal(c.renovBatalCairkan(p,id,{kunci:'b1',tanggal:'2026-11-15'}).ok,true);
 assert.equal(c.renovPencairanBulan('2026-10'),0);assert.equal(c.renovPencairanBulan('2026-11'),0);
 assert.equal(c.renovDanaTertahan(p),80);assert.equal(c.renovBatalCairkan(p,id,{kunci:'b2'}).ok,false);assert.equal(p.labaLedger.length,3);
});
test('DP dihapus setelah akui: koreksi diperlukan, pencairan baru diblokir, koreksi append-only',()=>{
 const {p,D}=fixture();const c=load(D);selesai(c,p);c.renovAkuiLaba(p,80,{kunci:'a'});
 D.transactions=D.transactions.filter(t=>t.id!=='dp');
 let sm=c.renovLabaSummary(p);assert.notEqual(sm.status,'HIJAU');assert.equal(sm.labaMaks,0);assert.equal(sm.koreksiDiperlukan,true);
 assert.equal(c.renovCairkanLaba(p,10).ok,false);
 assert.equal(c.renovKoreksiLaba(p,80,{kunci:'k'}).ok,false); // alasan wajib
 assert.equal(c.renovKoreksiLaba(p,80,{kunci:'k',catatan:'DP dikembalikan'}).ok,true);
 sm=c.renovLabaSummary(p);assert.equal(sm.labaDiakuiBersih,0);assert.equal(sm.koreksiDiperlukan,false);assert.equal(p.labaLedger.length,2);
 assert.equal(c.renovKoreksiLaba(p,1,{catatan:'x'}).ok,false);
});
test('Kelebihan pencairan terdeteksi setelah koreksi; batas pencairan 0',()=>{
 const {p,D}=fixture();const c=load(D);selesai(c,p);c.renovAkuiLaba(p,80,{kunci:'a'});c.renovCairkanLaba(p,60,{kunci:'c'});
 c.renovKoreksiLaba(p,50,{kunci:'k',catatan:'biaya baru'});
 const sm=c.renovLabaSummary(p);assert.equal(sm.kelebihanPencairan,true);assert.equal(sm.batasPencairan,0);
 assert.ok(c.renovLedgerIssues(p).some(x=>/kelebihan pencairan/i.test(x)));
});
test('Status KUNING memblokir akui dan cairkan (pembayaran belum dikonfirmasi)',()=>{
 const {p,D}=fixture();p.items[0].payments[0].accountId='a2';D.accounts.push({id:'a2',ownership:'SELF',includeInBalance:true});D.transactions[1].accountId='a2';
 const c=load(D);selesai(c,p);const sm=c.renovLabaSummary(p);assert.equal(sm.status,'KUNING');assert.equal(c.renovAkuiLaba(p,10).ok,false);
});
test('Klasifikasi terkunci setelah ledger terisi; proyek tidak bisa dibuka kembali',()=>{
 const {p,D}=fixture();const c=load(D);selesai(c,p);c.renovAkuiLaba(p,10,{kunci:'a'});
 assert.equal(c.renovClassifyProject(p,'pribadi').ok,false);assert.equal(c.renovBukaSelesai(p).ok,false);
 const q=fixture();const c2=load(q.D);selesai(c2,q.p);assert.equal(c2.renovBukaSelesai(q.p).ok,true);assert.equal(q.p.status,'aktif');assert.equal(q.p.atestasi,undefined);
});
test('save() gagal: entri ledger di-rollback',()=>{
 const {p,D}=fixture();let ok=true;const c=load(D,{save:()=>ok});selesai(c,p);ok=false;
 assert.equal(c.renovAkuiLaba(p,10,{kunci:'a'}).ok,false);assert.equal(p.labaLedger.length,0);
});
test('Proyek non-klien tidak menghasilkan income pencairan; ledger yatim dilaporkan',()=>{
 const {p,D}=fixture();p.labaLedger=[{id:'x',tipe:'cairkan',jumlah:10,tanggal:'2026-11-05'}];p.dana='pribadi';
 const c=load(D);assert.equal(c.renovPencairanBulan('2026-11'),0);assert.ok(c.renovLedgerIssues(p).some(x=>/non-klien/.test(x)));
});
test('Backup/restore round-trip: ledger identik dan angka sama (JSON)',()=>{
 const {p,D}=fixture();const c=load(D,{totalSaldoAkun:()=>1000});selesai(c,p);c.renovAkuiLaba(p,80,{kunci:'a'});c.renovCairkanLaba(p,20,{kunci:'c'});
 const before=c.renovLabaSummary(p),spBefore=c.saldoPribadi();
 const D2=JSON.parse(JSON.stringify(D));const c2=load(D2,{totalSaldoAkun:()=>1000});
 assert.equal(JSON.stringify(D2.renovProjects[0].labaLedger),JSON.stringify(p.labaLedger));
 const after=c2.renovLabaSummary(D2.renovProjects[0]);assert.equal(after.labaBelumDicairkan,before.labaBelumDicairkan);assert.equal(c2.saldoPribadi(),spBefore);
});
