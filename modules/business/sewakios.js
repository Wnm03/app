// sewakios.js — Domain Sewa Kios: catat unit kios yang disewakan, riwayat tagihan sewa, ROI vs modal renovasi, laporan PDF.
// Dipindah ke modules/business/sewakios.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari: features-edukasi-pajak-utang-sewakios.js (lanjutan roadmap PEMISAHAN-FILE-ROADMAP.md, v58).
// PENTING: SewaKios.onLinkedTxDeleted()/onLinkedTxEdited() dipanggil dari backup-restore.js & transaksi.js (GROUP_B) saat transaksi diedit/dihapus — lewat variabel global, aman krn dipanggil runtime (bukan saat file di-load), asal file ini tetap ikut dimuat (selalu, lewat build.js).
// PENTING: harus dimuat sesuai urutan build.js (GROUP_A) — tidak ada modul lain di GROUP_A yang direferensi SewaKios saat load, cuma D global & helper (fmt, fmtFull, sameId, dst) yang sudah tersedia di semua file.

const SewaKios={
editUnitId:null,
pendingUnitId:null,
openUnitModal(editId){
SewaKios.editUnitId=editId!==undefined?editId:null;
const u=SewaKios.editUnitId!=null?D.sewaKios.units.find(x=>sameId(x.id,SewaKios.editUnitId)):null;
document.getElementById('sewaKiosUnitModalTitle').textContent=u?'Edit Unit Kios':'Unit Kios Baru';
document.getElementById('skDelBtn').style.display=u?'flex':'none';
const projSel=document.getElementById('skRenovProject');
projSel.innerHTML='<option value="">— Tidak ditautkan —</option>'+D.renovProjects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
const accSel=document.getElementById('skAccount');
accSel.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
document.getElementById('skName').value=u?u.name:'';
projSel.value=u&&u.renovProjectId!=null?String(u.renovProjectId):'';
document.getElementById('skStatus').value=u?u.status:'kosong';
document.getElementById('skPenyewa').value=u?(u.penyewa||''):'';
document.getElementById('skHarga').value=u?u.hargaSewaBulanan:'';
accSel.value=u&&u.accountId?u.accountId:(D.accounts[0]?.id||'');
document.getElementById('skCatatan').value=u?(u.catatan||''):'';
SewaKios.onStatusChange();
openModal('sewaKiosUnitModal');
},
// onStatusChange() -- toggle field Nama Penyewa & Harga Sewa/Bulan: keduanya cuma
// relevan/tampil kalau status "disewa" (kosong = belum ada penyewa & belum ada harga
// sewa yang berjalan). Pola sama persis onVehJenisChange()/onSimJenisChange()
// (modules/vehicle/vehicle-core.js) -- render ulang tiap dropdown Status berubah &
// sekali saat modal dibuka (dari openUnitModal() di atas).
onStatusChange(){
const status=document.getElementById('skStatus').value;
const disewa=status==='disewa';
document.getElementById('skPenyewaWrap').classList.toggle('u-dnone',!disewa);
document.getElementById('skHargaWrap').classList.toggle('u-dnone',!disewa);
},
saveUnit(){
const name=document.getElementById('skName').value.trim();
if(!name){toast('⚠️ Nama unit wajib diisi');return;}
const renovProjIdRaw=document.getElementById('skRenovProject').value;
const harga=parseFloat(document.getElementById('skHarga').value)||0;
const data={
name,
renovProjectId:renovProjIdRaw?renovProjIdRaw:null,
status:document.getElementById('skStatus').value,
penyewa:document.getElementById('skPenyewa').value.trim(),
hargaSewaBulanan:harga,
accountId:document.getElementById('skAccount').value||null,
catatan:document.getElementById('skCatatan').value.trim()
};
if(SewaKios.editUnitId!=null){
const u=D.sewaKios.units.find(x=>sameId(x.id,SewaKios.editUnitId));
if(u){
if(data.status!==u.status){
if(!u.statusLog||!u.statusLog.length)u.statusLog=[{status:u.status,tanggal:u.mulai||todayStr()}];
u.statusLog.push({status:data.status,tanggal:todayStr()});
}
Object.assign(u,data);
}
} else {
D.sewaKios.units.push({id:uid(),...data,mulai:todayStr(),riwayat:[],statusLog:[{status:data.status,tanggal:todayStr()}]});
}
save();closeModal('sewaKiosUnitModal');SewaKios.render();renderDashboardSewaKiosReminder();
toast('✅ Unit "'+name+'" disimpan');
},
async deleteUnitFromModal(){
if(SewaKios.editUnitId==null)return;
if(!await askConfirm('Hapus unit ini? Riwayat sewa yang sudah tercatat sbg transaksi TIDAK ikut terhapus, tapi link-nya ke unit ini akan hilang.'))return;
D.sewaKios.units=D.sewaKios.units.filter(x=>!sameId(x.id,SewaKios.editUnitId));
save();closeModal('sewaKiosUnitModal');SewaKios.render();renderDashboardSewaKiosReminder();
toast('🗑 Unit dihapus');
},
roi(u){
const modal=u.renovProjectId?(()=>{const p=D.renovProjects.find(x=>sameId(x.id,u.renovProjectId));return (p&&typeof Renov!=='undefined')?Renov.totals(p).total:0;})():0;
const diterima=(u.riwayat||[]).reduce((s,r)=>s+(r.jumlah||0),0);
const paybackBulan=(modal>0&&u.hargaSewaBulanan>0)?Math.ceil(modal/u.hargaSewaBulanan):null;
return{modal,diterima,sisa:Math.max(0,modal-diterima),paybackBulan,pctBalik:modal>0?Math.min(100,Math.round((diterima/modal)*100)):null};
},
nextTagih(u){
if(!u||u.status!=='disewa'||!u.hargaSewaBulanan)return null;
const riwayat=u.riwayat||[];
const baseStr=riwayat.length?riwayat.reduce((max,r)=>(r.tanggal>max?r.tanggal:max),riwayat[0].tanggal):(u.mulai||todayStr());
const due=new Date(baseStr);
if(isNaN(due.getTime()))return null;
due.setMonth(due.getMonth()+1);
due.setHours(0,0,0,0);
const today=new Date();today.setHours(0,0,0,0);
const diffDays=Math.round((due-today)/(1000*60*60*24));
return{due,diffDays};
},
occupancy(u){
const log=(u.statusLog&&u.statusLog.length)?[...u.statusLog]:[{status:u.status,tanggal:u.mulai||todayStr()}];
log.sort((a,b)=>a.tanggal<b.tanggal?-1:(a.tanggal>b.tanggal?1:0));
const today=new Date();today.setHours(0,0,0,0);
let totalDays=0,disewaDays=0;
for(let i=0;i<log.length;i++){
const start=new Date(log[i].tanggal);start.setHours(0,0,0,0);
let end;
if(i+1<log.length){end=new Date(log[i+1].tanggal);end.setHours(0,0,0,0);}else{end=today;}
const days=Math.max(0,Math.round((end-start)/(1000*60*60*24)));
totalDays+=days;
if(log[i].status==='disewa')disewaDays+=days;
}
return{totalDays,disewaDays,pct:totalDays>0?Math.round((disewaDays/totalDays)*100):null,log};
},
render(){
if(typeof SewaKiosRenovInsight!=='undefined')SewaKiosRenovInsight.render();
const el=document.getElementById('sewaKiosList');
if(!el)return;
if(!D.sewaKios.units.length){
el.innerHTML='<div class="empty"><div class="empty-icon">🏠</div><div class="empty-text">Belum ada unit kios</div></div>';
return;
}
el.innerHTML=D.sewaKios.units.map(u=>{
const r=SewaKios.roi(u);
const statusBadge=u.status==='disewa'?`<span style="background:var(--income-soft);color:var(--income)">✅ Disewa${u.penyewa?' — '+escapeHtml(u.penyewa):''}</span>`:`<span style="background:var(--expense-soft);color:var(--expense)">⬜ Kosong</span>`;
const roiLine=r.modal>0
?`Modal renov ${fmt(r.modal)} · diterima ${fmt(r.diterima)} (${r.pctBalik}%)${r.paybackBulan?' · balik modal ±'+r.paybackBulan+' bln':''}`
:`Diterima ${fmt(r.diterima)} (tidak ditautkan ke Proyek Renovasi)`;
const nt=SewaKios.nextTagih(u);
let tagihLine='';
if(nt){
const dueLabel=nt.due.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
if(nt.diffDays<0)tagihLine=`<div class="u-fs11 u-fw700 u-mt4" style="color:var(--expense)">⚠️ Sudah lewat ${Math.abs(nt.diffDays)} hari dari jatuh tempo tagih (${dueLabel})</div>`;
else if(nt.diffDays<=5)tagihLine=`<div class="u-fs11 u-cacc4 u-fw700 u-mt4">🔔 Jatuh tempo tagih ${nt.diffDays===0?'hari ini':'dalam '+nt.diffDays+' hari'} (${dueLabel})</div>`;
else tagihLine=`<div class="u-fs11 u-t2 u-mt4">Tagih berikutnya: ${dueLabel}</div>`;
}
const occ=SewaKios.occupancy(u);
let occLine='';
if(occ.pct!=null&&occ.totalDays>=1){
const occCol=occ.pct>=80?'var(--income)':occ.pct>=50?'var(--accent4)':'var(--expense)';
const histRows=[...occ.log].reverse().map(l=>{
const d=new Date(l.tanggal);
const label=isNaN(d.getTime())?l.tanggal:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
return `<div class="u-flex u-jcb u-fs11 u-t2" style="padding:3px 0">
            <span>${l.status==='disewa'?'✅ Mulai disewa':'⬜ Jadi kosong'}</span><span>${label}</span>
          </div>`;
}).join('');
occLine=`<details class="u-mt6">
          <summary style="font-size:11px;color:${occCol};font-weight:700;cursor:pointer;list-style:none">📊 Occupancy rate: ${occ.pct}% (dari ${occ.totalDays} hari tercatat)</summary>
          <div class="u-mt4" style="padding-top:2px;border-top:1px solid var(--border)">${histRows}</div>
        </details>`;
}
return `<div class="card u-mb8" style="padding:12px">
        <div class="u-flex u-jcb u-aifs u-gap8">
          <div><div class="u-fw700">${escapeHtml(u.name)}</div>
          <div class="u-fs11 u-mt2"><span class="u-r12 u-fw700" style="padding:2px 8px">${statusBadge}</span></div></div>
          <div class="u-flex u-gap6">
            <button class="card-setting-btn" data-action="SewaKios.openUnitModal" data-args="${escapeHtml(JSON.stringify([u.id]))}" aria-label="Edit">✏️</button>
          </div>
        </div>
        <div class="u-fs12 u-t2 u-mt8">Sewa: ${fmt(u.hargaSewaBulanan)}/bulan</div>
        <div class="u-fs11 u-t2 u-mt2">${roiLine}</div>
        ${tagihLine}
        ${occLine}
        <button class="btn btn-income btn-full btn-sm u-mt8" data-action="SewaKios.catatSewa" data-args="${escapeHtml(JSON.stringify([u.id]))}">💰 Catat Sewa Diterima</button>
      </div>`;
}).join('');
},
catatSewa(unitId){
const u=D.sewaKios.units.find(x=>sameId(x.id,unitId));
if(!u)return;
openTxModal('income');
SewaKios.pendingUnitId=unitId;
document.getElementById('txNote').value='Sewa '+u.name+(u.penyewa?' — '+u.penyewa:'');
document.getElementById('txAmt').value=String(u.hargaSewaBulanan||'');
const catField=document.getElementById('txCat');
if(catField)selectTxCat('Bisnis');
if(u.accountId){
const accField=document.getElementById('txAcc');
if(accField)accField.value=u.accountId;
}
},
applyPaymentLink(txId){
if(!SewaKios.pendingUnitId)return;
const u=D.sewaKios.units.find(x=>sameId(x.id,SewaKios.pendingUnitId));
const t=D.transactions.find(x=>x.id===txId);
if(u&&t){
if(!u.riwayat)u.riwayat=[];
u.riwayat.push({id:uid(),tanggal:t.date,jumlah:t.amount,txId});
t.sewaKiosLinkId=u.id;
}
SewaKios.pendingUnitId=null;
renderDashboardSewaKiosReminder();
},
onLinkedTxEdited(t){
const u=D.sewaKios.units.find(x=>x.id===t.sewaKiosLinkId);
if(!u||!u.riwayat)return;
const r=u.riwayat.find(x=>x.txId===t.id);
if(r){r.jumlah=t.amount;r.tanggal=t.date;}
SewaKios.render();renderDashboardSewaKiosReminder();
},
onLinkedTxDeleted(t){
const u=D.sewaKios.units.find(x=>x.id===t.sewaKiosLinkId);
if(!u||!u.riwayat)return;
u.riwayat=u.riwayat.filter(r=>r.txId!==t.id);
SewaKios.render();renderDashboardSewaKiosReminder();
},
exportPDF(){
if(typeof window.jspdf==='undefined'){toast('⚠️ Modul PDF masih dimuat, coba lagi 2 detik');return;}
const units=(D.sewaKios&&D.sewaKios.units)||[];
if(!units.length){toast('⚠️ Belum ada unit kios untuk dilaporkan');return;}
const {jsPDF}=window.jspdf;
const doc=new jsPDF({unit:'pt',format:'a4'});
const pageW=doc.internal.pageSize.getWidth();
let y=50;
doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(40,40,60);
doc.text('Laporan Sewa Kios - Keluarga '+(D.profile.nama||'W'),40,y);y+=20;
doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(110,110,130);
doc.text('Dicetak: '+new Date().toLocaleString('id-ID'),40,y);y+=10;
doc.text('Jumlah unit: '+units.length,40,y);y+=18;
doc.setDrawColor(220,220,230);doc.line(40,y,pageW-40,y);y+=22;
const totalDiterima=units.reduce((s,u)=>s+SewaKios.roi(u).diterima,0);
const totalModal=units.reduce((s,u)=>s+SewaKios.roi(u).modal,0);
doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,30,40);
doc.text('Ringkasan',40,y);y+=18;
doc.setFont('helvetica','normal');doc.setFontSize(11);
doc.setTextColor(20,140,90);doc.text('Total diterima: '+fmtFull(totalDiterima),40,y);
doc.setTextColor(80,70,200);doc.text('Total modal renov ditautkan: '+fmtFull(totalModal),pageW/2,y);y+=28;
units.forEach((u,idx)=>{
const r=SewaKios.roi(u);
const occ=SewaKios.occupancy(u);
const nt=SewaKios.nextTagih(u);
if(y>680){doc.addPage();y=50;}
doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(30,30,40);
doc.text((idx+1)+'. '+u.name,40,y);y+=16;
doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(60,60,70);
doc.text('Status: '+(u.status==='disewa'?('Disewa'+(u.penyewa?' — '+u.penyewa:'')):'Kosong'),40,y);y+=13;
doc.text('Sewa per bulan: '+fmtFull(u.hargaSewaBulanan||0),40,y);y+=13;
doc.text(r.modal>0
?('Modal renov: '+fmtFull(r.modal)+' · Diterima: '+fmtFull(r.diterima)+' ('+r.pctBalik+'%)'+(r.paybackBulan?' · Balik modal ±'+r.paybackBulan+' bln':''))
:('Diterima: '+fmtFull(r.diterima)+' (tidak ditautkan ke Proyek Renovasi)'),40,y);y+=13;
if(occ.pct!=null&&occ.totalDays>=1){doc.text('Occupancy rate: '+occ.pct+'% (dari '+occ.totalDays+' hari tercatat)',40,y);y+=13;}
if(nt){
const dueLabel=nt.due.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
doc.text(nt.diffDays<0?('Jatuh tempo tagih terlewat '+Math.abs(nt.diffDays)+' hari ('+dueLabel+')'):('Tagih berikutnya: '+dueLabel),40,y);y+=13;
}
const riwayat=(u.riwayat||[]).slice().sort((a,b)=>a.tanggal<b.tanggal?1:-1);
if(riwayat.length){
y+=4;
doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.text('Riwayat pembayaran:',40,y);y+=12;
doc.setFont('helvetica','normal');
riwayat.forEach(rw=>{
if(y>770){doc.addPage();y=50;}
doc.text(rw.tanggal+'  —  '+fmtFull(rw.jumlah),50,y);y+=12;
});
}
y+=16;
});
doc.save('laporan-sewakios-'+new Date().toISOString().split('T')[0]+'.pdf');
toast('✅ Laporan Sewa Kios (PDF) berhasil dibuat');
}
};

// Sesi 14 — Tahap 1b (lazy-load): file ini sekarang bisa dimuat TERPISAH lewat
// _loadScriptOnce() (lihat ensureSewaKios() di index.html), bukan cuma lewat
// bundle app-bundle-a.min.js. app-bootstrap.js (Object.assign(window,{...}))
// cuma jalan SEKALI saat boot, sebelum file ini sempat ke-load kalau lazy --
// jadi modul ini sekarang mendaftarkan dirinya sendiri ke window di sini,
// pola sama persis dengan Renov (modules/home/renovasi.js).
if(typeof window!=='undefined'){window.SewaKios=SewaKios;}
