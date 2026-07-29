// piutang-utang.js — Domain Piutang & Utang: catatan piutang (uang dipinjamkan), utang (uang dipinjam) beserta status lunas/cicilan, dan DebtStrategy (simulasi strategi pelunasan Avalanche/Snowball).
// Dipindah ke modules/finance/piutang-utang.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Juga berisi Bill (helper hubungkan transaksi lama ke riwayat tagihan) — domain tagihan/cicilan, dipindah dari file etalase.
// Dipisah dari: features-etalase-piutang-renovai.js (sesi pemisahan domain Piutang/Utang, lanjutan roadmap PEMISAHAN-FILE-ROADMAP.md).
// DebtStrategy dipindah dari features-edukasi-pajak-utang-sewakios.js (v56) — gabung ke sini krn 1 domain (utang) & sudah dipakai Debt.renderList() di file yang sama.
// PENTING: harus dimuat sesuai urutan build.js (GROUP_A) — Debt.renderList() memanggil DebtStrategy.render() (sekarang di file yang sama, tidak perlu lagi guarded typeof check tapi tetap dipertahankan untuk jaga-jaga).
// PENTING: DebtStrategy.computeDSR() memanggil WorthIt (di worthit.js, guarded typeof check, aman krn runtime call — walau worthit.js sekarang dimuat SETELAH piutang-utang.js di urutan GROUP_A, tetap aman krn guard & dipanggil runtime setelah semua file ter-load, bukan saat load).
// PENTING: Bill.openLinkTxModal() memakai curBillHistoryId (dideklarasikan di tagihan-kalender.js) & LinkTx (di linktx.js) — dipanggil saat runtime (dari klik tombol), bukan saat load, jadi aman walau dideklarasikan di file lain asalkan semua file ikut ter-load (selalu, lewat build.js).

// isPiutangOwnershipSelf(p) — helper REUSE dari OwnershipEngine (Sesi 255,
// Ownership Sync Piutang & Utang), pola SAMA PERSIS isAssetOwnershipSelf()
// (Sesi 193, modules/asset/aset.js). Guard typeof OwnershipEngine: kalau
// engine belum dimuat, SEMUA piutang dianggap SELF (regresi lama tetap
// jalan, tidak pernah dikecualikan).
function isPiutangOwnershipSelf(p){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(p).type==='SELF';
}
const Piutang={
editId:null,
_lunasState:false,
openModal(id){
Piutang.editId=id||null;
const p=id?D.piutang.find(x=>sameId(x.id,id)):null;
document.getElementById('piutangModalTitle').textContent=p?'Edit Piutang':'Tambah Piutang';
document.getElementById('piutangName').value=p?p.name:'';
document.getElementById('piutangNilai').value=p?p.nilai:'';
document.getElementById('piutangTanggal').value=p?(p.tanggal||''):todayStr();
document.getElementById('piutangJatuhTempo').value=p?(p.jatuhTempo||''):'';
document.getElementById('piutangCatatan').value=p?(p.catatan||''):'';
Piutang._lunasState=p?!!p.lunas:false;
const btn=document.getElementById('piutangLunasBtn');
btn.textContent=Piutang._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Piutang._lunasState?' active':'');
openModal('piutangModal');
},
toggleLunas(){
Piutang._lunasState=!Piutang._lunasState;
const btn=document.getElementById('piutangLunasBtn');
btn.textContent=Piutang._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Piutang._lunasState?' active':'');
},
save(){
const name=document.getElementById('piutangName').value.trim();
if(!name){toast('⚠️ Nama peminjam wajib diisi');return;}
const nilai=parsePzNum(document.getElementById('piutangNilai').value);
const tanggal=document.getElementById('piutangTanggal').value||'';
const jatuhTempo=document.getElementById('piutangJatuhTempo').value||'';
const catatan=document.getElementById('piutangCatatan').value.trim();
if(Piutang.editId){
const p=D.piutang.find(x=>sameId(x.id,Piutang.editId));
if(!p){toast('⚠️ Piutang tidak ditemukan, coba tutup dan buka lagi');return;}
Object.assign(p,{name,nilai,tanggal,jatuhTempo,catatan,lunas:Piutang._lunasState});
} else {
D.piutang.push({id:uid(),name,nilai,tanggal,jatuhTempo,catatan,lunas:Piutang._lunasState});
}
save();
closeModal('piutangModal');
Piutang.renderList();renderKekayaanBersih();hitungZakatMaal();
toast('✅ Piutang tersimpan');
},
async delete(id){
if(!await askConfirm('Hapus catatan piutang ini?',{okText:'Ya, Hapus'}))return;
D.piutang=D.piutang.filter(p=>!sameId(p.id,id));
save();
Piutang.renderList();renderKekayaanBersih();hitungZakatMaal();
},
// totalValue() — Sesi 255 (Ownership Sync): TAMBAH 1 filter
// isPiutangOwnershipSelf(p) di atas filter lunas yang sudah ada (pola
// SAMA PERSIS Aset.totalValue(), Sesi 193) — piutang ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY DIKECUALIKAN dari Total Piutang
// (yang mengalir ke Net Worth/Dashboard/Report/AI lewat totalPiutangValue()),
// TAPI TIDAK dihapus dari D.piutang (histori tetap tersimpan, masih
// tampil di Piutang.renderList()). 0 rumus diubah.
totalValue(){return(D.piutang||[]).filter(isPiutangOwnershipSelf).filter(p=>!p.lunas).reduce((s,p)=>s+(p.nilai||0),0);},
overdueDays(p){
if(p.lunas||!p.jatuhTempo)return 0;
const jt=new Date(p.jatuhTempo);
if(isNaN(jt.getTime()))return 0;
const today=new Date();today.setHours(0,0,0,0);jt.setHours(0,0,0,0);
const diff=Math.round((today-jt)/86400000);
return diff>0?diff:0;
},
sortedActive(){
const active=(D.piutang||[]).filter(p=>!p.lunas);
return active.slice().sort((a,b)=>{
const oa=Piutang.overdueDays(a),ob=Piutang.overdueDays(b);
if(oa>0&&ob>0)return(ob*(b.nilai||0))-(oa*(a.nilai||0));
if(oa>0)return -1;
if(ob>0)return 1;
if(a.jatuhTempo&&b.jatuhTempo)return new Date(a.jatuhTempo)-new Date(b.jatuhTempo);
if(a.jatuhTempo)return -1;
if(b.jatuhTempo)return 1;
return(b.nilai||0)-(a.nilai||0);
});
},
renderList(){
if(typeof PiutangUtangInsight!=='undefined')PiutangUtangInsight.render();
const el=document.getElementById('piutangList');
if(!el)return;
const list=D.piutang||[];
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">🤝</div><div class="empty-text">Belum ada piutang tercatat</div></div>';return;}
const today=new Date().toISOString().slice(0,10);
const active=Piutang.sortedActive();
const lunas=list.filter(p=>p.lunas);
const topOverdueDays=active.length?Piutang.overdueDays(active[0]):0;
let summaryHtml='';
if(topOverdueDays>0){
summaryHtml=`<div class="u-fs12 u-cacc2 u-r10 u-mb10 u-lh15" style="padding:9px 11px;background:var(--accent2-soft)">🔥 <b>Prioritas tagih: ${escapeHtml(active[0].name)}</b> — ${fmt(active[0].nilai)}, sudah lewat jatuh tempo ${topOverdueDays} hari. Piutang yang telat lama & nominalnya besar makin berisiko jadi macet, tagih ini duluan.</div>`;
}
const ordered=[...active,...lunas];
el.innerHTML=summaryHtml+ordered.map((p,idx)=>{
const overdue=!p.lunas&&p.jatuhTempo&&p.jatuhTempo<today;
const isPrioritas=idx===0&&topOverdueDays>0&&!p.lunas;
const od=overdue?Piutang.overdueDays(p):0;
const metaParts=[];
if(p.jatuhTempo)metaParts.push(overdue?`⚠️ Telat ${od} hari (jatuh tempo ${p.jatuhTempo})`:'Jatuh tempo '+p.jatuhTempo);
if(p.catatan)metaParts.push(escapeHtml(p.catatan));
const badge=p.lunas?' <span class="bill-due-badge bill-due-ok u-ml4">Lunas</span>'
:(isPrioritas?' <span class="u-fs10 u-r6 u-ml4" style="color:#fff;background:var(--accent2);padding:1px 5px">🔥 Prioritas</span>'
:(overdue?' <span class="bill-due-badge bill-due-urgent u-ml4">Jatuh Tempo</span>':''));
return `<div class="tx-item u-pointer" data-action="openPiutangModal" data-args="${escapeHtml(JSON.stringify([p.id]))}"><div class="tx-icon u-bgaccsoft">🤝</div><div class="tx-info"><div class="tx-name">${escapeHtml(p.name)}${badge}</div><div class="tx-meta">${metaParts.join(' · ')}</div></div><div class="tx-amount${p.lunas?'':' green'}">${fmt(p.nilai)}</div><button class="tx-del" data-stop="1" data-action="delPiutang" data-args="${escapeHtml(JSON.stringify([p.id]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
}
};
// isDebtOwnershipSelf(d) — helper REUSE dari OwnershipEngine (Sesi 255,
// Ownership Sync Piutang & Utang), pola SAMA PERSIS isAssetOwnershipSelf()/
// isPiutangOwnershipSelf() di atas. Guard typeof OwnershipEngine: kalau
// engine belum dimuat, SEMUA utang dianggap SELF (regresi lama tetap jalan).
function isDebtOwnershipSelf(d){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(d).type==='SELF';
}
const Debt={
editId:null,
_lunasState:false,
// Perkiraan bunga %/tahun per jenis utang (KW-163) — angka umum di pasar Indonesia,
// murni titik awal buat diisi otomatis di field Bunga; user tetap bebas edit sendiri.
// bunga:null artinya tidak ada default yang masuk akal (mis. pinjaman pribadi/lainnya
// biasanya kesepakatan langsung, tidak ada tarif pasar baku).
JENIS_DEFAULTS:{
kta:{label:'KTA (Kredit Tanpa Agunan)',bunga:18},
kartu_kredit:{label:'Kartu Kredit',bunga:24},
pinjol:{label:'Pinjaman Online (Pinjol)',bunga:36},
pribadi:{label:'Pinjaman Pribadi',bunga:null},
koperasi:{label:'Koperasi',bunga:12},
lainnya:{label:'Lainnya',bunga:null}
},
getJenisDefault(jenis){
return Debt.JENIS_DEFAULTS[jenis]||null;
},
onJenisChange(){
const sel=document.getElementById('debtJenis');
const bungaEl=document.getElementById('debtBunga');
if(!sel||!bungaEl)return;
const def=Debt.getJenisDefault(sel.value);
// Jangan timpa kalau field Bunga sudah diisi manual (baik pas edit maupun user sudah ngetik) — autofill cuma buat bantu titik awal.
if(def&&def.bunga!=null&&!bungaEl.value.trim())bungaEl.value=def.bunga;
},
openModal(id){
Debt.editId=id||null;
const d=id?D.debts.find(x=>sameId(x.id,id)):null;
document.getElementById('debtModalTitle').textContent=d?'Edit Utang':'Tambah Utang';
document.getElementById('debtName').value=d?d.name:'';
document.getElementById('debtJenis').value=d?(d.jenis||'lainnya'):'lainnya';
document.getElementById('debtNilai').value=d?d.nilai:'';
document.getElementById('debtBunga').value=d?(d.bunga||''):'';
document.getElementById('debtCicilan').value=d?(d.cicilanBulanan||''):'';
document.getElementById('debtTanggal').value=d?(d.tanggal||''):todayStr();
document.getElementById('debtJatuhTempo').value=d?(d.jatuhTempo||''):'';
document.getElementById('debtCatatan').value=d?(d.catatan||''):'';
updateAmtPreview('debtNilai','debtNilaiPreview');
updateAmtPreview('debtCicilan','debtCicilanPreview');
Debt._lunasState=d?!!d.lunas:false;
const btn=document.getElementById('debtLunasBtn');
btn.textContent=Debt._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Debt._lunasState?' active':'');
openModal('debtModal');
},
toggleLunas(){
Debt._lunasState=!Debt._lunasState;
const btn=document.getElementById('debtLunasBtn');
btn.textContent=Debt._lunasState?'✓ Lunas':'Belum Lunas';
btn.className='chip-btn'+(Debt._lunasState?' active':'');
},
save(){
const name=document.getElementById('debtName').value.trim();
if(!name){toast('⚠️ Nama pemberi pinjaman wajib diisi');return;}
const jenis=document.getElementById('debtJenis').value||'lainnya';
const nilai=parsePzNum(document.getElementById('debtNilai').value);
const bunga=parseFloat(document.getElementById('debtBunga').value)||0;
const cicilanBulanan=parsePzNum(document.getElementById('debtCicilan').value);
const tanggal=document.getElementById('debtTanggal').value||'';
const jatuhTempo=document.getElementById('debtJatuhTempo').value||'';
const catatan=document.getElementById('debtCatatan').value.trim();
let d;
if(Debt.editId){
d=D.debts.find(x=>sameId(x.id,Debt.editId));
if(!d){toast('⚠️ Utang tidak ditemukan, coba tutup dan buka lagi');return;}
Object.assign(d,{name,jenis,nilai,bunga,cicilanBulanan,tanggal,jatuhTempo,catatan,lunas:Debt._lunasState});
} else {
d={id:uid(),name,jenis,nilai,bunga,cicilanBulanan,tanggal,jatuhTempo,catatan,lunas:Debt._lunasState};
D.debts.push(d);
}
Debt.syncBill(d);
save();
closeModal('debtModal');
Debt.renderList();renderKekayaanBersih();hitungZakatMaal();renderBillList();checkBills();
toast('✅ Utang tersimpan');
},
syncBill(d){
const shouldHaveBill=!d.lunas&&(d.cicilanBulanan||0)>0;
let bill=(d.billId?D.bills.find(b=>sameId(b.id,d.billId)):null)||D.bills.find(b=>b.kind==='utang'&&sameId(b.debtId,d.id));
if(!shouldHaveBill){
if(bill){D.bills=D.bills.filter(b=>b!==bill);}
d.billId=null;
return;
}
const today=new Date().toISOString().slice(0,10);
const defaultNextDue=()=>{const dt=new Date();dt.setMonth(dt.getMonth()+1);return dt.toISOString().split('T')[0];};
if(bill){
bill.name='Cicilan: '+d.name;
bill.amount=d.cicilanBulanan;
bill.debtId=d.id;
if(!bill.nextDue||bill.nextDue<today)bill.nextDue=(d.jatuhTempo&&d.jatuhTempo>=today)?d.jatuhTempo:defaultNextDue();
} else {
bill={id:uid(),name:'Cicilan: '+d.name,amount:d.cicilanBulanan,nextDue:(d.jatuhTempo&&d.jatuhTempo>=today)?d.jatuhTempo:defaultNextDue(),freq:'bulanan',category:'Utang',subcategory:'',accountId:(D.accounts[0]&&D.accounts[0].id)||'',note:'Auto tersinkron dari Buku Utang — bayar di sini otomatis mengurangi sisa utang',kind:'utang',debtId:d.id};
D.bills.push(bill);
}
d.billId=bill.id;
},
async delete(id){
if(!await askConfirm('Hapus catatan utang ini?',{okText:'Ya, Hapus'}))return;
const d=D.debts.find(x=>sameId(x.id,id));
if(d&&d.billId){D.bills=D.bills.filter(b=>!sameId(b.id,d.billId));}
D.debts=D.debts.filter(d=>!sameId(d.id,id));
save();
Debt.renderList();renderKekayaanBersih();hitungZakatMaal();renderBillList();checkBills();
},
// totalValue()/totalCicilanBulanan() — Sesi 255 (Ownership Sync): TAMBAH 1
// filter isDebtOwnershipSelf(d) di atas filter lunas yang sudah ada (pola
// SAMA PERSIS Aset.totalValue(), Sesi 193) — utang ber-ownership INVESTOR/
// CUSTOMER/THIRD_PARTY/FAMILY DIKECUALIKAN dari Total Utang & DSR (yang
// mengalir ke Net Worth/Dashboard/Report/AI lewat totalDebtValue()/
// DebtStrategy.computeDSR()), TAPI TIDAK dihapus dari D.debts (histori
// tetap tersimpan, masih tampil di Debt.renderList()). 0 rumus diubah.
totalValue(){return(D.debts||[]).filter(isDebtOwnershipSelf).filter(d=>!d.lunas).reduce((s,d)=>s+(d.nilai||0),0);},
totalCicilanBulanan(){return(D.debts||[]).filter(isDebtOwnershipSelf).filter(d=>!d.lunas).reduce((s,d)=>s+(d.cicilanBulanan||0),0);},
// billCicilanAktif() — KW-170: cicilan barang aktif dari Buku Tagihan
// (D.bills kind:'cicilan', sisaTenor>0) — dianggap "utang beneran": ikut
// tampil sbg baris di Buku Utang & ikut disimulasikan pelunasannya di
// DebtStrategy (lihat DebtStrategy.billCicilanAsDebtLike()). Filter SAMA
// PERSIS dgn yg sudah dipakai DebtStrategy.computeDSR() (totalCicilanLain)
// & DebtOptimizerAPI._overview() (billCicilan) — 0 filter baru, 1 sumber.
// Langganan (kind:'langganan') SENGAJA tidak ikut — tidak punya sisaTenor/
// tenor, tidak ada "pokok" yang bisa dilunasi, jadi tidak cocok masuk
// model utang (konsisten sama computeDSR() yg juga selalu exclude langganan).
billCicilanAktif(){
return(D.bills||[]).filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null&&b.sisaTenor>0);
},
renderList(){
if(typeof PiutangUtangInsight!=='undefined')PiutangUtangInsight.render();
const el=document.getElementById('debtList');
if(!el)return;
const list=D.debts||[];
const billCicilan=Debt.billCicilanAktif();
const billOutstanding=billCicilan.reduce((s,b)=>s+(b.amount||0)*(b.sisaTenor||0),0);
const billBulanan=billCicilan.reduce((s,b)=>s+(b.amount||0),0);
document.getElementById('debtTotalVal').textContent=fmtFull(Debt.totalValue()+billOutstanding);
document.getElementById('debtCicilanVal').textContent=fmtFull(Debt.totalCicilanBulanan()+billBulanan);
if(!list.length&&!billCicilan.length){el.innerHTML='<div class="empty"><div class="empty-icon">📕</div><div class="empty-text">Belum ada utang tercatat</div></div>';return;}
const today=new Date().toISOString().slice(0,10);
const debtRowsHtml=list.map(d=>{
const overdue=!d.lunas&&d.jatuhTempo&&d.jatuhTempo<today;
const metaParts=[];
if(d.jenis&&Debt.JENIS_DEFAULTS[d.jenis]&&d.jenis!=='lainnya')metaParts.push(Debt.JENIS_DEFAULTS[d.jenis].label);
if(d.bunga)metaParts.push('Bunga '+d.bunga+'%/th');
if(d.cicilanBulanan)metaParts.push('Cicilan '+fmt(d.cicilanBulanan)+'/bln');
if(d.jatuhTempo)metaParts.push((overdue?'⚠️ Lewat jatuh tempo ':'Jatuh tempo ')+d.jatuhTempo);
if(d.catatan)metaParts.push(escapeHtml(d.catatan));
return `<div class="tx-item u-pointer" data-action="openDebtModal" data-args="${escapeHtml(JSON.stringify([d.id]))}"><div class="tx-icon" style="background:var(--accent2-soft)">📕</div><div class="tx-info"><div class="tx-name">${escapeHtml(d.name)}${d.lunas?' <span class="bill-due-badge bill-due-ok u-ml4">Lunas</span>':(overdue?' <span class="bill-due-badge bill-due-urgent u-ml4">Jatuh Tempo</span>':'')}</div><div class="tx-meta">${metaParts.join(' · ')}</div></div><div class="tx-amount${d.lunas?'':' red'}">${fmt(d.nilai)}</div><button class="tx-del" data-stop="1" data-action="delDebt" data-args="${escapeHtml(JSON.stringify([d.id]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
// KW-170: baris cicilan barang — read-only dari sini (edit/hapus/riwayat
// pembayaran tetap lewat alur Tagihan yang sudah ada, krn datanya D.bills
// bukan D.debts). Klik baris -> Riwayat Pembayaran (openBillHistory, sama
// persis alur yg sudah dipakai utk cicilan di Buku Tagihan).
const billRowsHtml=billCicilan.map(b=>{
const overdue=b.nextDue&&b.nextDue<today;
const outstanding=(b.amount||0)*(b.sisaTenor||0);
const metaParts=['🛒 Cicilan Barang','Cicilan '+fmt(b.amount)+'/bln','Sisa '+b.sisaTenor+'x'];
if(b.nextDue)metaParts.push((overdue?'⚠️ Lewat jatuh tempo ':'Jatuh tempo ')+b.nextDue);
return `<div class="tx-item u-pointer" data-action="openBillHistory" data-args="${escapeHtml(JSON.stringify([b.id]))}"><div class="tx-icon" style="background:var(--accent2-soft)">🛒</div><div class="tx-info"><div class="tx-name">${escapeHtml(b.name)}${overdue?' <span style=\\"font-size:10px;color:var(--accent2);border:1px solid var(--accent2);border-radius:6px;padding:1px 5px;margin-left:4px\\">Jatuh Tempo</span>':''}</div><div class="tx-meta">${metaParts.join(' · ')}</div></div><div class="tx-amount red">${fmt(outstanding)}</div></div>`;
}).join('');
el.innerHTML=debtRowsHtml+billRowsHtml;
if(typeof DebtStrategy!=='undefined')DebtStrategy.render();
}
};
const DebtStrategy={
setMethod(method){
D.debtStrategy=D.debtStrategy||{};
D.debtStrategy.method=method;
save();
DebtStrategy.render();
},
onExtraInput(){
const el=document.getElementById('dsExtra');
if(!el)return;
D.debtStrategy=D.debtStrategy||{};
D.debtStrategy.extra=parsePzNum(el.value);
save();
DebtStrategy.render();
},
activeDebts(){
const real=(D.debts||[]).filter(d=>!d.lunas&&(d.nilai||0)>0);
return real.concat(DebtStrategy.billCicilanAsDebtLike());
},
// billCicilanAsDebtLike() — KW-170: map cicilan barang aktif (Debt.
// billCicilanAktif(), Buku Tagihan kind:'cicilan') jadi bentuk mirip
// D.debts biar bisa ikut computeOrder()/simulate() APA ADANYA (0 rumus
// baru di simulate() sendiri, cuma titik masuk data tambahan).
// bunga SENGAJA di-set 0: bunga cicilan barang itu bunga flat SEKALI di
// awal, sudah dibakar ke nominal cicilan/bulan (amount) sejak dibuat di
// transaksi.js — beda dari Debt.bunga (%/tahun, dihitung MAJEMUK tiap
// bulan oleh simulate()). Kalau ikut dipakein compounding simulate(),
// bunganya kehitung dobel. nilai ("pokok" versi simulasi) = amount ×
// sisaTenor, SAMA PERSIS formula outstanding di getBillStats()
// (tagihan-kalender.js) — 0 rumus baru.
billCicilanAsDebtLike(){
if(typeof Debt==='undefined')return[];
return Debt.billCicilanAktif().map(b=>({
id:'bill:'+b.id,
name:b.name,
bunga:0,
cicilanBulanan:b.amount,
nilai:(b.amount||0)*(b.sisaTenor||0),
lunas:false,
_isBillCicilan:true,
_billId:b.id
}));
},
computeOrder(list,method){
const arr=list.slice();
if(method==='snowball')arr.sort((a,b)=>(a.nilai||0)-(b.nilai||0));
else arr.sort((a,b)=>(b.bunga||0)-(a.bunga||0));
return arr;
},
computeDSR(){
const totalCicilanUtang=(typeof Debt!=='undefined')?Debt.totalCicilanBulanan():0;
const totalCicilanLain=(D.bills||[]).filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null).reduce((s,b)=>s+(b.amount||0),0);
const totalCicilan=totalCicilanUtang+totalCicilanLain;
const incAvg=(typeof WorthIt!=='undefined')?WorthIt.incomeAvg():0;
const pct=incAvg>0?(totalCicilan/incAvg)*100:null;
return{totalCicilanUtang,totalCicilanLain,totalCicilan,incAvg,pct};
},
simulate(orderedDebts,extraMonthly){
const simDebts=orderedDebts.filter(d=>(d.cicilanBulanan||0)>0).map(d=>({id:d.id,bunga:d.bunga||0,cicilanBulanan:d.cicilanBulanan,balance:d.nilai||0}));
if(!simDebts.length)return{months:null,totalInterest:0,payoffMonth:{}};
extraMonthly=extraMonthly||0;
const MAX_MONTHS=600;
let month=0,totalInterest=0;
const payoffMonth={};
while(simDebts.some(d=>d.balance>0.5)&&month<MAX_MONTHS){
month++;
simDebts.forEach(d=>{
if(d.balance<=0)return;
const interest=d.balance*(d.bunga/100/12);
totalInterest+=interest;
d.balance+=interest;
});
let pool=extraMonthly;
simDebts.forEach(d=>{if(d.balance<=0)pool+=d.cicilanBulanan;});
simDebts.forEach(d=>{
if(d.balance<=0)return;
d.balance-=Math.min(d.cicilanBulanan,d.balance);
});
for(const d of simDebts){
if(pool<=0)break;
if(d.balance<=0)continue;
const pay=Math.min(pool,d.balance);
d.balance-=pay;
pool-=pay;
}
simDebts.forEach(d=>{if(d.balance<=0.5&&payoffMonth[d.id]==null)payoffMonth[d.id]=month;});
}
return{months:month>=MAX_MONTHS?null:month,totalInterest:Math.round(totalInterest),payoffMonth};
},
render(){
const box=document.getElementById('dsResult');
if(!box)return;
D.debtStrategy=D.debtStrategy||{method:'avalanche',extra:0};
const chips=document.querySelectorAll('#dsMethodChips .chip-btn');
chips.forEach(b=>b.classList.remove('active'));
const method=D.debtStrategy.method==='snowball'?'snowball':'avalanche';
const idx={avalanche:0,snowball:1}[method];
if(chips[idx])chips[idx].classList.add('active');
const extraEl=document.getElementById('dsExtra');
if(extraEl&&!extraEl.matches(':focus'))extraEl.value=D.debtStrategy.extra||'';
const active=DebtStrategy.activeDebts();
if(!active.length){
box.innerHTML='<div class="empty"><div class="empty-icon">🎯</div><div class="empty-text">Belum ada utang aktif buat disusun strategi pelunasannya</div></div>';
return;
}
const dsr=DebtStrategy.computeDSR();
let dsrHtml;
if(dsr.incAvg>0){
const pct=dsr.pct;
const level=pct>35?'red':(pct>30?'orange':'green');
const msg=level==='red'?'⚠️ Sudah lewat batas aman (30–35%) — total cicilan/tagihan bulanan menekan cukup berat. Pertimbangkan percepat pelunasan lewat dana ekstra di bawah, atau tunda dulu kewajiban baru.':
level==='orange'?'Mendekati batas aman 30–35% — masih terkendali, tapi mulai hati-hati sebelum nambah utang baru.':
'✅ Masih di zona aman.';
dsrHtml=`<div style="font-size:12px;line-height:1.5;margin-bottom:12px;padding:10px;border-radius:10px;background:${level==='green'?'var(--accent3-soft)':'var(--accent2-soft)'}">💳 <b>DSR (Rasio Cicilan): ${pct.toFixed(0)}%</b> dari rata-rata income ${fmtFull(dsr.incAvg)}/bln (total cicilan/tagihan ${fmtFull(dsr.totalCicilan)}/bln)<br>${msg}</div>`;
} else {
dsrHtml='<div class="u-fs11 u-t2 u-mb12">Belum cukup data pemasukan buat hitung DSR (rasio cicilan) otomatis.</div>';
}
const order=DebtStrategy.computeOrder(active,method);
const listHtml=order.map((d,i)=>{
const meta=[];
if(d.bunga)meta.push('Bunga '+d.bunga+'%/th');
if(d.cicilanBulanan)meta.push('Cicilan '+fmt(d.cicilanBulanan)+'/bln');
else meta.push('Belum ada cicilan/bulan diisi');
return`<div class="u-flex u-aic u-gap10" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="u-bgaccsoft u-flex u-aic u-jcc u-fs12 u-fw700" style="width:24px;height:24px;border-radius:50%;flex-shrink:0">${i+1}</div>
        <div class="u-flex1"><div class="u-fs13 u-fw600">${escapeHtml(d.name)}${d._isBillCicilan?' <span class="u-fs10 u-t2" style="border:1px solid var(--border);border-radius:6px;padding:1px 5px;margin-left:2px">🛒 Cicilan Barang</span>':''}</div><div class="u-fs11 u-t2">${meta.join(' · ')}</div></div>
        <div class="u-fw700 u-fs13" style="white-space:nowrap;padding-left:8px">${fmt(d.nilai)}</div>
      </div>`;
}).join('');
const extra=D.debtStrategy.extra||0;
const sim=DebtStrategy.simulate(order,extra);
let simHtml;
if(sim.months==null){
simHtml=order.every(d=>!(d.cicilanBulanan>0))?
'<div class="u-fs11 u-t2 u-mt10">💡 Isi "Cicilan/Bulan" di masing-masing utang (edit dari 📕 Buku Utang di atas) buat bisa lihat simulasi kapan lunasnya.</div>':
'<div class="u-fs11 u-t2 u-mt10">⚠️ Simulasi lebih dari 50 tahun / tidak konvergen — cek lagi cicilan & bunga yang diisi, kemungkinan cicilan terlalu kecil dibanding bunganya.</div>';
} else {
const years=Math.floor(sim.months/12),months=sim.months%12;
const durText=years>0?(years+' thn '+months+' bln'):(months+' bln');
simHtml=`<div class="u-mt12" style="padding-top:10px;border-top:1px dashed var(--border)">
        <div class="u-fs12 u-lh16"><b>⏱️ Estimasi lunas semua: ${durText} lagi</b>${extra>0?' (dgn dana ekstra '+fmtFull(extra)+'/bln)':''}<br>💸 Estimasi total bunga yang masih akan dibayar: <b>${fmtFull(sim.totalInterest)}</b></div>
      </div>`;
const otherMethod=method==='avalanche'?'snowball':'avalanche';
const otherOrder=DebtStrategy.computeOrder(active,otherMethod);
const otherSim=DebtStrategy.simulate(otherOrder,extra);
if(otherSim.months!=null){
const interestDiff=sim.totalInterest-otherSim.totalInterest;
const monthDiff=sim.months-otherSim.months;
if(Math.abs(interestDiff)>=1000||monthDiff!==0){
const label=otherMethod==='avalanche'?'Avalanche':'Snowball';
let cmp=interestDiff>0?('bayar bunga <b>'+fmtFull(interestDiff)+' lebih banyak</b>'):(interestDiff<0?('hemat bunga <b>'+fmtFull(-interestDiff)+'</b>'):'bunga sama');
if(monthDiff>0)cmp+=' & lunas <b>'+monthDiff+' bln lebih lambat</b>';
else if(monthDiff<0)cmp+=' & lunas <b>'+(-monthDiff)+' bln lebih cepat</b>';
simHtml+=`<div class="u-fs11 u-t2 u-mt8">🔎 Dibanding strategi ${label}: pakai metode saat ini kamu ${cmp}.</div>`;
}
}
}
box.innerHTML=dsrHtml+listHtml+simHtml+'<div class="u-fs10 u-ctext3 u-mt10 u-lh15">⚠️ Simulasi berdasarkan asumsi bunga & pembayaran konsisten tiap bulan — perkiraan kasar buat bahan pertimbangan, bukan angka pasti dari bank/lembaga pemberi pinjaman.</div>';
}
};
const Bill={
openLinkTxModal(){
if(curBillHistoryId==null){toast('⚠️ Buka dulu Riwayat Pembayaran tagihan yang mau dihubungkan');return;}
LinkTx.open('bill',curBillHistoryId);
}
};
