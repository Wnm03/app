// renovasi.js — Domain Proyek Renovasi: RenovCalc (kalkulator material), Renov (proyek & item biaya), RenovAI (saran AI kebutuhan/ukuran)
// Dipindah ke modules/home/renovasi.js (Sesi 13 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: modul-modul ini dipindah ke file baru ini dari features-renovasi-pajak-aset-order.js (v62), yang sebelumnya juga berisi domain Aset/Kekayaan (AlokasiAset/Aset/IDBStore/PORTFOLIO_LABELS/TimelineW, sekarang di aset.js) & Worth It/Prioritas Belanja (WorthIt, sekarang di worthit.js).
// File lama features-renovasi-pajak-aset-order.js DIHAPUS setelah ini karena tidak ada isi tersisa.
// Renov.saveItem() memakai RenovCalc._pendingDetail lewat variabel global (diisi RenovCalc.useMaterial() saat modal Kalkulator Bantu Material dipakai) — aman krn 1 file yang sama sekarang.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const RenovCalc={
_matTotal:0,_matKebutuhan:0,_pendingDetail:null,
open(saved){
if(saved&&saved.type==='material'){
document.getElementById('rcMatNama').value=saved.nama||'';
document.getElementById('rcMatSatuan').value=saved.satuan||'m3';
document.getElementById('rcMatHitungUkuran').checked=!!saved.hitungUkuran;
document.getElementById('rcMatP').value=saved.p||'';
document.getElementById('rcMatL').value=saved.l||'';
document.getElementById('rcMatT').value=saved.t||'';
document.getElementById('rcMatLangsung').value=saved.langsung||'';
document.getElementById('rcMatBuangan').value=saved.buangan||'0';
document.getElementById('rcMatHarga').value=saved.harga||'';
} else {
['rcMatNama','rcMatP','rcMatL','rcMatT','rcMatLangsung','rcMatHarga'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
document.getElementById('rcMatBuangan').value='0';
document.getElementById('rcMatSatuan').value='m3';
document.getElementById('rcMatHitungUkuran').checked=false;
}
RenovCalc.onMatSatuanChange();
RenovCalc.toggleHitungUkuran();
openModal('renovCalcModal');
},
onMatSatuanChange(){
const s=document.getElementById('rcMatSatuan').value;
const labelMap={m3:'m³',m2:'m²',meter:'meter',batang:'batang/pcs'};
const lbl=labelMap[s];
document.getElementById('rcMatHargaLbl').textContent='Harga per '+lbl+' (Rp)';
document.getElementById('rcMatLangsungLbl').textContent='Jumlah Kebutuhan ('+lbl+')';
document.getElementById('rcMatLWrap').style.display=(s==='m3'||s==='m2')?'block':'none';
document.getElementById('rcMatTWrap').style.display=s==='m3'?'block':'none';
document.getElementById('rcMatBuanganWrap').style.display=s==='batang'?'none':'block';
RenovCalc.calcMaterial();
},
toggleHitungUkuran(){
const on=document.getElementById('rcMatHitungUkuran').checked;
const s=document.getElementById('rcMatSatuan').value;
const showUkuran=on&&s!=='batang';
document.getElementById('rcMatUkuranWrap').style.display=showUkuran?'block':'none';
document.getElementById('rcMatLangsungWrap').style.display=showUkuran?'none':'block';
RenovCalc.calcMaterial();
},
calcMaterial(){
const satuan=document.getElementById('rcMatSatuan').value;
const hitungUkuran=document.getElementById('rcMatHitungUkuran').checked&&satuan!=='batang';
const buangan=parseFloat(document.getElementById('rcMatBuangan').value)||0;
const harga=parseFloat(document.getElementById('rcMatHarga').value)||0;
let kebutuhanDasar=0;
if(hitungUkuran){
const p=parseFloat(document.getElementById('rcMatP').value)||0;
const l=parseFloat(document.getElementById('rcMatL').value)||0;
const t=parseFloat(document.getElementById('rcMatT').value)||0;
if(satuan==='m3')kebutuhanDasar=p*l*t;
else if(satuan==='m2')kebutuhanDasar=p*l;
else kebutuhanDasar=p;
} else {
kebutuhanDasar=parseFloat(document.getElementById('rcMatLangsung').value)||0;
}
const kebutuhanFinal=satuan==='batang'?Math.ceil(kebutuhanDasar*(1+buangan/100)):Math.round(kebutuhanDasar*(1+buangan/100)*100)/100;
const total=kebutuhanFinal*harga;
const labelMap={m3:'m³',m2:'m²',meter:'meter',batang:'batang/pcs'};
document.getElementById('rcMatKebutuhan').textContent=kebutuhanFinal.toLocaleString('id-ID')+' '+labelMap[satuan];
document.getElementById('rcMatTotal').textContent=fmtFull(total);
RenovCalc._matTotal=total;
RenovCalc._matKebutuhan=kebutuhanFinal;
},
useMaterial(){
const total=RenovCalc._matTotal||0;
if(total<=0){toast('⚠️ Isi dulu kebutuhan & harga satuannya');return;}
const nama=document.getElementById('rcMatNama').value.trim()||'Material';
const labelMap={m3:'m³',m2:'m²',meter:'meter',batang:'batang/pcs'};
const satuan=document.getElementById('rcMatSatuan').value;
const suggestName=`${nama} (${(RenovCalc._matKebutuhan||0).toLocaleString('id-ID')} ${labelMap[satuan]})`;
const kebutuhanText=document.getElementById('rcMatKebutuhan').textContent||'';
const hargaSatuan=parseFloat(document.getElementById('rcMatHarga').value)||0;
document.getElementById('renovItemHarga').value=Math.round(total);
const nameEl=document.getElementById('renovItemName');
if(nameEl)nameEl.value=suggestName;
RenovCalc._pendingDetail={
type:'material',nama,satuan,
hitungUkuran:document.getElementById('rcMatHitungUkuran').checked,
p:document.getElementById('rcMatP').value,
l:document.getElementById('rcMatL').value,
t:document.getElementById('rcMatT').value,
langsung:document.getElementById('rcMatLangsung').value,
buangan:document.getElementById('rcMatBuangan').value,
harga:document.getElementById('rcMatHarga').value,
total:Math.round(total),
text:'Material — '+kebutuhanText+' × '+fmtFull(hargaSatuan)+'/'+labelMap[satuan]
};
closeModal('renovCalcModal');
toast('✅ Hasil hitung material dipakai ke form item');
}
};
const Renov={
curId:null,
projEditId:null,
editItemId:null,
_currentItemCalcDetail:null,
totals(p){
const items=p.items||[];
const total=items.reduce((s,it)=>s+(it.harga||0),0);
const paid=items.filter(it=>it.paid).reduce((s,it)=>s+(it.harga||0),0);
const count=items.length;
const paidCount=items.filter(it=>it.paid).length;
return{total,paid,sisa:total-paid,count,paidCount};
},
render(){
if(typeof SewaKiosRenovInsight!=='undefined')SewaKiosRenovInsight.render();
const el=document.getElementById('renovList');
if(!el)return;
if(!D.renovProjects||!D.renovProjects.length){
el.innerHTML='<div class="empty"><div class="empty-icon">🛠️</div><div class="empty-text">Belum ada proyek renovasi</div></div>';
return;
}
el.innerHTML=D.renovProjects.map(p=>{
const t=Renov.totals(p);
const pct=t.total>0?Math.round((t.paid/t.total)*100):0;
return`<div class="tx-item u-pointer u-fdcol u-gap6" style="align-items:stretch" data-action="Renov.openDetail" data-args="${escapeHtml(JSON.stringify([p.id]))}">
        <div class="u-flex u-aic u-gap10">
          <div class="tx-icon u-bgaccsoft">🛠️</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(p.name)} ${t.count?`<span class="acc-chip">${t.paidCount}/${t.count} item</span>`:''}</div>
            <div class="tx-meta">${fmt(t.paid)} / ${fmt(t.total)} ${t.total>0?'· '+pct+'%':''}</div>
          </div>
          <button class="tx-del" data-stop="1" data-action="Renov.deleteProject" data-args="${escapeHtml(JSON.stringify([p.id]))}" aria-label="Hapus">🗑</button>
        </div>
        <div class="prog-bar" style="height:6px;margin-top:0"><div class="prog-fill purple" style="width:${pct}%"></div></div>
      </div>`;
}).join('');
},
openProjectModal(id){
Renov.projEditId=id||null;
const p=id?D.renovProjects.find(x=>sameId(x.id,id)):null;
document.getElementById('renovProjectModalTitle').textContent=p?'Edit Proyek':'Proyek Renovasi Baru';
document.getElementById('renovProjName').value=p?p.name:'';
document.getElementById('renovProjNote').value=p?(p.catatan||''):'';
openModal('renovProjectModal');
},
saveProject(){
const name=document.getElementById('renovProjName').value.trim();
if(!name){toast('⚠️ Masukkan nama proyek');return;}
const catatan=document.getElementById('renovProjNote').value.trim();
if(Renov.projEditId){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.projEditId));
if(p){p.name=name;p.catatan=catatan;}
} else {
D.renovProjects.push({id:uid(),name,catatan,createdAt:new Date().toISOString().split('T')[0],items:[]});
}
Renov.projEditId=null;
save();closeModal('renovProjectModal');Renov.render();
if(Renov.curId)Renov.renderDetail();
toast('✅ Proyek tersimpan');
},
editCurrentProject(){ if(Renov.curId)Renov.openProjectModal(Renov.curId); },
async deleteProject(id){
const p=D.renovProjects.find(x=>sameId(x.id,id));
if(!p)return;
if(!await askConfirm(`Hapus proyek "${escapeHtml(p.name)}"? Transaksi yang sudah tercatat di Keuangan TIDAK ikut terhapus, cuma dilepas dari daftar proyek ini.`,{title:'Hapus Proyek',okText:'Ya, Hapus'}))return;
(p.items||[]).forEach(it=>{
if(it.txId){
const t=D.transactions.find(x=>sameId(x.id,it.txId));
if(t){delete t.renovProjectLinkId;delete t.renovItemLinkId;}
}
if(it.calcDetail&&it.calcDetail.type==='absensi')Tukang.releaseEntries(it.calcDetail.entryIds);
});
D.renovProjects=D.renovProjects.filter(x=>!sameId(x.id,id));
if(sameId(Renov.curId,id))Renov.curId=null;
save();closeModal('renovDetailModal');Renov.render();
toast('🗑 Proyek dihapus (transaksi terkait tetap ada di Keuangan)');
},
openDetail(id){
Renov.curId=id;
Renov.renderDetail();
openModal('renovDetailModal');
},
renderDetail(){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.curId));
if(!p){closeModal('renovDetailModal');return;}
document.getElementById('renovDetailTitle').textContent=p.name;
document.getElementById('renovDetailNote').textContent=p.catatan||'';
const t=Renov.totals(p);
document.getElementById('renovDetTotal').textContent=fmtFull(t.total);
document.getElementById('renovDetPaid').textContent=fmtFull(t.paid);
document.getElementById('renovDetSisa').textContent=fmtFull(t.sisa);
const pct=t.total>0?Math.round((t.paid/t.total)*100):0;
document.getElementById('renovDetBar').style.width=pct+'%';
document.getElementById('renovDetPct').textContent=pct+'% selesai';
document.getElementById('renovDetCount').textContent=`${t.paidCount}/${t.count} item lunas`;
const listEl=document.getElementById('renovItemList');
if(!t.count){
listEl.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada item biaya</div></div>';
return;
}
const renderRow=(it)=>{
const acc=D.accounts.find(a=>a.id===it.accountId);
return`<div class="tx-item">
        <div class="tx-icon" style="background:${it.paid?'var(--accent3-soft)':'var(--surface3)'};cursor:pointer" data-action="Renov.togglePaid" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}" title="${it.paid?'Batalkan lunas':'Tandai sudah dibeli'}">${it.paid?'✅':'⬜'}</div>
        <div class="tx-info u-pointer" data-action="Renov.openItemModal" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}">
          <div class="tx-name" style="${it.paid?'text-decoration:line-through;color:var(--text2)':''}">${escapeHtml(it.name)} ${it.category?`<span class="acc-chip">${escapeHtml(it.category)}</span>`:''}</div>
          <div class="tx-meta">${it.ukuran?('📏 '+escapeHtml(it.ukuran)+' · '):''}${it.hargaTotal?('💰 Total '+fmt(it.hargaTotal)+' · '):''}${it.paid?'Lunas · ':''}${acc?acc.emoji+' '+escapeHtml(acc.name):'Belum pilih akun'}${it.calcDetail?(' · 🧮'+(Math.round(it.calcDetail.total||0)!==Math.round(it.harga||0)?' ⚠️':'')):''}</div>
        </div>
        <div class="tx-amount ${it.paid?'green':''}">${fmt(it.harga)}</div>
        <button class="tx-del" data-action="Renov.deleteItem" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
};
const belum=p.items.filter(it=>!it.paid);
const sudah=p.items.filter(it=>it.paid);
let html='';
if(belum.length)html+=`<div class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 6px">🛒 Perlu Dibeli (${belum.length})</div>`+belum.map(renderRow).join('');
if(sudah.length)html+=`<div class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px">✅ Sudah Dibeli (${sudah.length})</div>`+sudah.map(renderRow).join('');
listEl.innerHTML=html;
},
openItemModal(projectId,itemId){
Renov.curId=projectId;
Renov.editItemId=itemId||null;
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=itemId?p.items.find(x=>sameId(x.id,itemId)):null;
const cats=getCatsByType('expense');
document.getElementById('renovItemCat').innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c.name)}">${c.emoji} ${escapeHtml(c.name)}</option>`).join('');
document.getElementById('renovItemAcc').innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
document.getElementById('renovItemModalTitle').textContent=it?'Edit Item Biaya':'Tambah Item Biaya';
document.getElementById('renovItemName').value=it?it.name:'';
document.getElementById('renovItemUkuran').value=it?(it.ukuran||''):'';
document.getElementById('renovItemHarga').value=it?it.harga:'';
document.getElementById('renovItemHargaTotal').value=(it&&it.hargaTotal)?it.hargaTotal:'';
document.getElementById('renovItemHargaTotalToggle').checked=!!(it&&it.hargaTotal);
Renov.toggleHargaTotalFields();
document.getElementById('renovItemCat').value=it?(it.category||''):'';
document.getElementById('renovItemAcc').value=it?(it.accountId||D.accounts[0]?.id||''):(D.accounts[0]?.id||'');
document.getElementById('renovItemTglBayar').value=it?(it.tglBayar||it.paidDate||todayStr()):todayStr();
document.getElementById('renovItemNote').value=it?(it.note||''):'';
document.getElementById('renovItemPaidNotice').style.display=(it&&it.paid)?'block':'none';
RenovCalc._pendingDetail=null;
Renov._currentItemCalcDetail=it?(it.calcDetail||null):null;
const calcNoteEl=document.getElementById('renovItemCalcSaved');
if(calcNoteEl){
if(it&&it.calcDetail){
const mismatch=Math.round(it.calcDetail.total||0)!==Math.round(it.harga||0);
calcNoteEl.style.display='block';
calcNoteEl.innerHTML='🧮 Rincian tersimpan: '+escapeHtml(it.calcDetail.text||'')+(mismatch?' <span class="u-cacc2 u-fw600">(⚠️ sudah tidak sesuai harga terbaru)</span>':'');
} else {
calcNoteEl.style.display='none';
calcNoteEl.innerHTML='';
}
}
document.getElementById('renovItemLinkOldWrap').style.display=(it&&it.paid)?'none':'block';
closeModal('renovDetailModal');
openModal('renovItemModal');
},
toggleHargaTotalFields(){
const on=document.getElementById('renovItemHargaTotalToggle').checked;
const wrap=document.getElementById('renovItemHargaTotalWrap');
const lbl=document.getElementById('renovItemHargaLbl');
wrap.classList.toggle('u-dnone',!on);
lbl.textContent=on?'Porsi Saya / Dilacak (Rp)':'Harga (Rp)';
Renov.syncHargaTotalPreview();
},
syncHargaTotalPreview(){
const on=document.getElementById('renovItemHargaTotalToggle').checked;
const prevEl=document.getElementById('renovItemHargaTotalPreview');
if(!on){prevEl.textContent='';return;}
const total=parseFloat(document.getElementById('renovItemHargaTotal').value)||0;
const mine=parseFloat(document.getElementById('renovItemHarga').value)||0;
if(total<=0){prevEl.textContent='';return;}
const selisih=total-mine;
prevEl.textContent=selisih>0?`Selisih (bukan porsi kamu): ${fmtFull(selisih)}`:(selisih<0?`⚠️ Porsi dilacak lebih besar dari Harga Total`:'Porsi dilacak = Harga Total penuh');
},
saveItem(){
evalAmtExpr('renovItemHarga');
evalAmtExpr('renovItemHargaTotal');
const p=D.renovProjects.find(x=>sameId(x.id,Renov.curId));
if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const name=document.getElementById('renovItemName').value.trim();
const ukuran=document.getElementById('renovItemUkuran').value.trim();
const harga=parseFloat(document.getElementById('renovItemHarga').value)||0;
const hargaTotalOn=document.getElementById('renovItemHargaTotalToggle').checked;
const hargaTotal=hargaTotalOn?(parseFloat(document.getElementById('renovItemHargaTotal').value)||0):null;
if(!name||harga<=0){toast('⚠️ Lengkapi nama & harga item');return;}
const category=document.getElementById('renovItemCat').value;
const accountId=document.getElementById('renovItemAcc').value||D.accounts[0]?.id;
const tglBayar=document.getElementById('renovItemTglBayar').value||todayStr();
const note=document.getElementById('renovItemNote').value.trim();
let calcDetail=null;
if(RenovCalc._pendingDetail&&Math.round(RenovCalc._pendingDetail.total)===Math.round(harga)){
calcDetail=RenovCalc._pendingDetail;
}
if(Renov.editItemId){
const it=p.items.find(x=>sameId(x.id,Renov.editItemId));
if(it){
it.name=name;it.ukuran=ukuran;it.harga=harga;it.hargaTotal=hargaTotal;it.category=category;it.accountId=accountId;it.note=note;it.tglBayar=tglBayar;
if(calcDetail){
if(it.calcDetail&&it.calcDetail.type==='absensi'&&it.calcDetail!==calcDetail){
Tukang.releaseEntries(it.calcDetail.entryIds);
}
it.calcDetail=calcDetail;
if(calcDetail.type==='absensi')Tukang.markUsed(calcDetail.entryIds,it.id);
}
if(it.paid&&it.txId){
const t=D.transactions.find(x=>sameId(x.id,it.txId));
if(t){Object.assign(t,{amount:harga,category:category||'Renovasi',accountId,date:tglBayar,note:'Renovasi: '+p.name+' - '+name+(note?' ('+note+')':'')});it.paidDate=tglBayar;}
}
}
} else {
const newId=uid();
p.items.push({id:newId,name,ukuran,harga,hargaTotal,category,accountId,note,tglBayar,calcDetail,paid:false,txId:null,paidDate:null});
if(calcDetail&&calcDetail.type==='absensi')Tukang.markUsed(calcDetail.entryIds,newId);
}
RenovCalc._pendingDetail=null;
Renov.editItemId=null;
save();closeModal('renovItemModal');
Renov.render();renderDashboard();renderKeuangan();
Renov.openDetail(p.id);
toast('✅ Item tersimpan');
},
async togglePaid(projectId,itemId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,itemId));
if(!it)return;
if(!it.paid){
const tglBayar=it.tglBayar||todayStr();
if(!await askConfirm(`Tandai "${escapeHtml(it.name)}" lunas sebesar ${fmtFull(it.harga)} pada tanggal ${tglBayar}? Ini akan bikin transaksi pengeluaran NYATA di Keuangan (pengaruh ke saldo akun). Kalau transaksinya sudah ada sebelumnya di Keuangan, batalkan ini dan pakai tombol "🔗 Hubungkan Transaksi Lama" di form edit item supaya tidak dobel.`,{okText:'Ya, Bayar',icon:'💸'}))return;
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:it.harga,category:it.category||'Renovasi',subcategory:'',accountId:it.accountId||D.accounts[0]?.id||'',payMethod:'tunai',note:'Renovasi: '+p.name+' - '+it.name+(it.note?' ('+it.note+')':''),date:tglBayar,renovProjectLinkId:p.id,renovItemLinkId:it.id});
it.paid=true;it.txId=txId;it.paidDate=tglBayar;
save();renderDashboard();renderKeuangan();Renov.render();Renov.renderDetail();
toast('✅ Item ditandai lunas & transaksi tercatat di Keuangan');
} else {
if(!await askConfirm(`Batalkan status lunas "${escapeHtml(it.name)}"? Transaksi terkait di Keuangan akan ikut dihapus.`,{title:'Batalkan Lunas',okText:'Ya, Batalkan'}))return;
if(it.txId)D.transactions=D.transactions.filter(x=>!sameId(x.id,it.txId));
it.paid=false;it.txId=null;it.paidDate=null;
save();renderDashboard();renderKeuangan();Renov.render();Renov.renderDetail();
toast('↺ Status lunas dibatalkan, transaksi terkait dihapus');
}
},
async deleteItem(projectId,itemId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,itemId));
if(!it)return;
const msg=it.paid?`Hapus item "${escapeHtml(it.name)}"? Transaksi terkait di Keuangan akan ikut dihapus.`:`Hapus item "${escapeHtml(it.name)}"?`;
if(!await askConfirm(msg))return;
if(it.paid&&it.txId)D.transactions=D.transactions.filter(x=>!sameId(x.id,it.txId));
if(it.calcDetail&&it.calcDetail.type==='absensi')Tukang.releaseEntries(it.calcDetail.entryIds);
p.items=p.items.filter(x=>!sameId(x.id,itemId));
save();renderDashboard();renderKeuangan();Renov.render();Renov.renderDetail();
toast('🗑 Item dihapus');
},
onLinkedTxDeleted(t){
const p=D.renovProjects.find(x=>sameId(x.id,t.renovProjectLinkId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,t.renovItemLinkId));
if(!it)return;
it.paid=false;it.txId=null;it.paidDate=null;
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
},
onLinkedTxEdited(t){
const p=D.renovProjects.find(x=>sameId(x.id,t.renovProjectLinkId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,t.renovItemLinkId));
if(!it)return;
it.harga=t.amount;it.category=t.category;it.accountId=t.accountId;it.paidDate=t.date;it.tglBayar=t.date;
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
},
openLinkTxModal(){
LinkTx.open('renov',Renov.curId);
},
async confirmLinkTx(txId){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.curId));
if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const t=D.transactions.find(x=>sameId(x.id,txId));
if(!t){toast('⚠️ Transaksi tidak ditemukan');return;}
if(!await askConfirm(`Hubungkan transaksi "${t.note||t.category||'ini'}" (${fmtFull(t.amount)}, ${t.date}) ke item renovasi ini? Item akan otomatis terisi & langsung berstatus lunas dari transaksi ini — TIDAK ada transaksi baru yang dibuat.`,{okText:'Ya, Hubungkan',icon:'🔗',danger:false}))return;
const nameInput=document.getElementById('renovItemName').value.trim();
const noteInput=document.getElementById('renovItemNote').value.trim();
let it=Renov.editItemId?p.items.find(x=>sameId(x.id,Renov.editItemId)):null;
if(!it){
it={id:uid(),name:nameInput||t.note||t.category||'Item Renovasi',note:noteInput,paid:false,txId:null,paidDate:null};
p.items.push(it);
Renov.editItemId=it.id;
} else if(nameInput){
it.name=nameInput;it.note=noteInput;
}
it.harga=t.amount;it.category=t.category;it.accountId=t.accountId;
it.paid=true;it.txId=t.id;it.paidDate=t.date;it.tglBayar=t.date;
t.renovProjectLinkId=p.id;t.renovItemLinkId=it.id;
Renov.editItemId=null;
save();closeModal('linkTxModal');closeModal('renovItemModal');
Renov.render();renderDashboard();renderKeuangan();
Renov.openDetail(p.id);
toast('✅ Transaksi lama dihubungkan ke item renovasi (tidak dobel)');
}
};
// BUGFIX (Sesi 13 Tahap 1b lazy-load, temuan post-deploy v873): DEFAULT_CATS
// dipindah ke modules/shared/data-default.js. Sebelumnya nangkring di sini
// (kebetulan, tidak ada hubungan dgn fitur Renovasi) dan jadi ReferenceError
// saat boot krn file ini sekarang lazy-load (baru dimuat saat tab Renovasi
// dibuka), padahal kategori.js/backup-restore.js/features-helpers-global-
// security.js butuh DEFAULT_CATS langsung saat app pertama kali jalan.
const RenovAI={
systemPrompt(){
return `Kamu asisten renovasi rumah utk keluarga Indonesia. Kamu akan dikasih nama proyek renovasi & daftar item biaya yang sudah dicatat user (nama, ukuran/kebutuhan kalau ada, status sudah/belum dibeli). Tugasmu kasih saran singkat & praktis dalam Bahasa Indonesia, format Markdown ringkas dgn heading kecil pakai **tebal** (bukan JSON):
1. **Kebutuhan yang mungkin terlewat** — barang/jasa lazim utk proyek sejenis yang belum ada di daftar.
2. **Perkiraan ukuran/jumlah** — utk item yang ukurannya belum diisi, kasih perkiraan umum wajar (mis. keramik lantai kamar mandi 2x2m ± perlu berapa m² dgn buangan potong) & sebutkan itu perkiraan kasar yang perlu dicek ulang.
3. **Saran tambahan** — urutan pengerjaan yang wajar, atau hal yang sering bikin biaya membengkak.
Jangan mengarang harga pasti (Rupiah), fokus ke jenis/ukuran/jumlah & saran non-finansial. Jawab ringkas, maksimal sekitar 200-250 kata, jangan pakai kode fence.`;
},
buildUserPrompt(p){
const items=(p.items||[]).map(it=>`- ${escapeHtml(it.name)}${it.ukuran?` (ukuran/kebutuhan: ${it.ukuran})`:' (ukuran belum diisi)'} — ${it.paid?'sudah dibeli':'belum dibeli'}`).join('\n')||'(belum ada item dicatat)';
return `Nama proyek: ${escapeHtml(p.name)}${p.catatan?`\nCatatan: ${p.catatan}`:''}\nDaftar item saat ini:\n${items}\n\nBerikan saran sesuai instruksi.`;
},
async suggest(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){toast('⚠️ Belum ada API Key. Isi dulu di Pengaturan → AI Asisten.');return;}
document.getElementById('renovAiBody').innerHTML='<div class="empty"><div class="empty-icon">🤖</div><div class="empty-text">Menyusun saran... (bisa beberapa detik)</div></div>';
openModal('renovAiModal');
try{
const r=await callAIProviderRaw(RenovAI.systemPrompt(),[{role:'user',content:RenovAI.buildUserPrompt(p)}],{maxTokens:1200});
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
document.getElementById('renovAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal hubungi ${label}: ${escapeHtml(r.errMsg||'error tidak diketahui')}${aiErrorHint(provider,r.status)}</div></div>`;
return;
}
const textOut=r.text;
if(!textOut){
document.getElementById('renovAiBody').innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">AI tidak memberi balasan teks. Coba lagi.</div></div>';
return;
}
const htmlOut=escapeHtml(textOut).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
document.getElementById('renovAiBody').innerHTML=`<div class="u-fs13 u-lh16">${htmlOut}</div>`;
}catch(e){
document.getElementById('renovAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal ambil saran: ${escapeHtml(e.message||String(e))}</div></div>`;
}
}
};

// Sesi 13 — Tahap 1b (lazy-load): file ini sekarang bisa dimuat TERPISAH lewat
// _loadScriptOnce() (lihat ensureRenov() di index.html), bukan cuma lewat bundle
// app-bundle-a.min.js. app-bootstrap.js (Object.assign(window,{...})) cuma jalan
// SEKALI saat boot, sebelum file ini sempat ke-load kalau lazy — jadi modul ini
// sekarang mendaftarkan dirinya sendiri ke window di sini, supaya kapan pun file
// ini akhirnya dimuat, Renov/RenovAI/RenovCalc selalu tersedia sbg window.Renov
// dkk juga — 0 perubahan perilaku utk pemanggil yang sudah ada.
if(typeof window!=='undefined'){window.Renov=Renov;window.RenovAI=RenovAI;window.RenovCalc=RenovCalc;}
