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
function _renovItemPaidAmount(it){
if(!it)return 0;
if(Array.isArray(it.payments))return it.payments.reduce((sum,p)=>sum+Math.max(0,Number(p&&p.amount)||0),0);
return it.paid?Math.max(0,Number(it.harga)||0):0;
}
function _renovSameId(a,b){return typeof sameId==='function'?sameId(a,b):String(a)===String(b);}
const Renov={
_paymentInFlight:false,
curId:null,
projEditId:null,
editItemId:null,
_currentItemCalcDetail:null,
totals(p){
const items=Array.isArray(p&&p.items)?p.items:[];
const total=items.reduce((sum,it)=>sum+Math.max(0,Number(it.harga)||0),0);
const paid=items.reduce((sum,it)=>sum+_renovItemPaidAmount(it),0);
const count=items.length;
const paidCount=items.filter(it=>_renovItemPaidAmount(it)>=Math.max(0,Number(it.harga)||0)&&Number(it.harga)>0).length;
const overpaid=items.reduce((sum,it)=>sum+Math.max(0,_renovItemPaidAmount(it)-Math.max(0,Number(it.harga)||0)),0);
return{total,paid,sisa:Math.max(0,total-paid),count,paidCount,overpaid};
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
const pct=t.total>0?Math.min(100,Math.round((t.paid/t.total)*100)):0;
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
const noteEl=document.getElementById('renovProjNote');
if(noteEl&&noteEl.parentElement){
let extra=document.getElementById('renovProjMetaFields');
if(!extra){extra=document.createElement('div');extra.id='renovProjMetaFields';extra.className='u-mb10';extra.innerHTML='<label class="field-label" for="renovProjClient">Nama Klien (opsional)</label><input id="renovProjClient" class="input" maxlength="120" placeholder="Nama klien"><label class="field-label u-mt8" for="renovProjRab">Nilai Kontrak / RAB (Rp)</label><input id="renovProjRab" class="input" inputmode="numeric" type="number" min="0" step="1" placeholder="0">';noteEl.parentElement.insertBefore(extra,noteEl);}
const clientEl=document.getElementById('renovProjClient'),rabEl=document.getElementById('renovProjRab');
if(clientEl)clientEl.value=p?(p.klien||''):'';
if(rabEl)rabEl.value=p&&p.rab!=null?String(p.rab):'';
}
openModal('renovProjectModal');
},
saveProject(){
const name=document.getElementById('renovProjName').value.trim();
if(!name){toast('⚠️ Masukkan nama proyek');return;}
const catatan=document.getElementById('renovProjNote').value.trim();
const klienEl=document.getElementById('renovProjClient'),rabEl=document.getElementById('renovProjRab');
const klien=String(klienEl&&klienEl.value||'').trim();
const rabRaw=String(rabEl&&rabEl.value||'').trim();
const rab=rabRaw===''?0:Number(rabRaw);
if(!Number.isFinite(rab)||rab<0){toast('⚠️ Nilai RAB harus angka nol atau lebih');return;}
let savedProjectId=null;
if(Renov.projEditId){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.projEditId));
if(p){p.name=name;p.catatan=catatan;p.klien=klien;p.rab=rab;savedProjectId=p.id;}
} else {
const project={id:uid(),name,catatan,klien,rab,createdAt:todayStr(),items:[]};
D.renovProjects.push(project);savedProjectId=project.id;
}
Renov.projEditId=null;
save();closeModal('renovProjectModal');Renov.render();
if(Renov.curId)Renov.renderDetail();
// If opened from the transaction form, refresh the existing selector immediately
// after save (not only on a close-button click) and select the project just saved.
const txModal=document.getElementById('txModal');
const txProjectSelect=document.getElementById('txRenovProject');
if(txModal&&txModal.classList&&typeof txModal.classList.contains==='function'&&txModal.classList.contains('open')&&typeof populateTxRenovSelect==='function'){
  populateTxRenovSelect();
  if(txProjectSelect&&savedProjectId!=null){txProjectSelect.value=String(savedProjectId);txProjectSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  if(typeof window!=='undefined'&&typeof window.__pwaSyncRenovCreateButton==='function')window.__pwaSyncRenovCreateButton();
}
toast('✅ Proyek tersimpan');
},
editCurrentProject(){ if(Renov.curId)Renov.openProjectModal(Renov.curId); },
async deleteProject(id){
const p=D.renovProjects.find(x=>sameId(x.id,id));
if(!p)return;
if(!await askConfirm(`Hapus proyek "${escapeHtml(p.name)}"? Transaksi yang sudah tercatat di Keuangan TIDAK ikut terhapus, cuma dilepas dari daftar proyek ini.`,{title:'Hapus Proyek',okText:'Ya, Hapus'}))return;
(p.items||[]).forEach(it=>{
const linkedIds=[it.txId,...(Array.isArray(it.payments)?it.payments.map(pay=>pay&&pay.txId):[])].filter(Boolean);
if(linkedIds.length&& (typeof FinanceTxSOT==='undefined'||!FinanceTxSOT))throw new Error('FINANCE_TX_SOT_REQUIRED');
linkedIds.forEach(txId=>{const tx=FinanceTxSOT.findById(txId);if(tx)FinanceTxSOT.patchMetaById(txId,{renovProjectLinkId:undefined,renovItemLinkId:undefined,renovPaymentId:undefined});});
if(it.calcDetail&&it.calcDetail.type==='absensi')Tukang.releaseEntries(it.calcDetail.entryIds);
});
const dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id));
if(dpTxs.length&&(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT))throw new Error('FINANCE_TX_SOT_REQUIRED');
dpTxs.forEach(tx=>FinanceTxSOT.patchMetaById(tx.id,{renovDpProjectId:undefined,renovDpLabel:undefined,renovDpKind:undefined}));
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
renderFundPanel(p){
if(!p)return;
const listEl=document.getElementById('renovItemList');if(!listEl||!listEl.parentElement)return;
let panel=document.getElementById('renovFundPanel');
if(!panel){panel=document.createElement('section');panel.id='renovFundPanel';panel.className='card u-mb12';listEl.parentElement.insertBefore(panel,listEl);}
const items=Array.isArray(p.items)?p.items:[];
const plan=items.reduce((sum,it)=>sum+Math.max(0,Number(it.harga)||0),0);
const paid=items.reduce((sum,it)=>sum+_renovItemPaidAmount(it),0);
const dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id)&&!(Renov._ignoreTxIds&&Renov._ignoreTxIds.has(String(tx.id))));
const dp=dpTxs.filter(tx=>tx.renovDpKind!=='termin').reduce((sum,tx)=>sum+(Number(tx.amount)||0),0);
const termin=dpTxs.filter(tx=>tx.renovDpKind==='termin').reduce((sum,tx)=>sum+(Number(tx.amount)||0),0);
const incoming=dp+termin,fund=incoming-paid,rab=Math.max(0,Number(p.rab)||0);
const categories={};items.forEach(it=>{const key=it.category||'Tanpa kategori';if(!categories[key])categories[key]={plan:0,paid:0};categories[key].plan+=Math.max(0,Number(it.harga)||0);categories[key].paid+=_renovItemPaidAmount(it);});
const categoryRows=Object.entries(categories).map(([name,v])=>`<div class="u-flex u-jcsb u-fs12 u-py4"><span>${escapeHtml(name)}</span><span>Rencana ${fmt(v.plan)} · Realisasi ${fmt(v.paid)} · Selisih ${fmt(v.plan-v.paid)}</span></div>`).join('');
const incomeRows=dpTxs.map(tx=>`<div class="u-flex u-jcsb u-aic u-fs12 u-py4"><span>${escapeHtml(tx.renovDpLabel|| (tx.renovDpKind==='termin'?'Termin':'DP'))} · ${escapeHtml(tx.date||'-')}</span><span>${fmt(tx.amount)} <button class="tx-del" data-action="Renov.deleteDpIncome" data-args="${escapeHtml(JSON.stringify([p.id,tx.id]))}" aria-label="Hapus pemasukan">🗑</button></span></div>`).join('');
const pct=plan>0?Math.min(100,Math.round(paid/plan*100)):0;
panel.innerHTML=`<div class="u-fw700 u-mb6">💰 Arus Dana Proyek</div><div class="u-fs12 u-t2">${escapeHtml(p.name)}${p.klien?' · Klien: '+escapeHtml(p.klien):''}</div><div class="u-grid u-grid2 u-gap8 u-mt10"><div><div class="u-fs11 u-t2">Nilai Kontrak / RAB</div><div class="u-fw700">${fmt(rab)}</div></div><div><div class="u-fs11 u-t2">Rencana Item</div><div class="u-fw700">${fmt(plan)}</div></div><div><div class="u-fs11 u-t2">Selisih RAB</div><div class="u-fw700">${fmt(rab-plan)}</div></div><div><div class="u-fs11 u-t2">DP Masuk</div><div class="u-fw700">${fmt(dp)}</div></div><div><div class="u-fs11 u-t2">Termin Masuk</div><div class="u-fw700">${fmt(termin)}</div></div><div><div class="u-fs11 u-t2">Total Pemasukan</div><div class="u-fw700">${fmt(incoming)}</div></div><div><div class="u-fs11 u-t2">Terbayar Item</div><div class="u-fw700">${fmt(paid)}</div></div><div><div class="u-fs11 u-t2">Dana Proyek</div><div class="u-fw700" style="color:${fund<0?'var(--danger)':'var(--text)'}">${fmt(fund)} ${fund<0?'· Nombok':''}</div></div><div><div class="u-fs11 u-t2">Sisa Tagihan Klien</div><div class="u-fw700">${fmt(Math.max(0,rab-incoming))}</div></div><div><div class="u-fs11 u-t2">Sisa Belanja</div><div class="u-fw700">${fmt(Math.max(0,plan-paid))}</div></div></div><div class="u-fs11 u-t2 u-mt8">Realisasi pembayaran item: ${pct}%${paid>plan?' · Kelebihan bayar '+fmt(paid-plan):''}${fund<0?' · Nombok pribadi '+fmt(Math.max(0,-fund)):''}</div><div class="prog-bar u-mt6"><div class="prog-fill purple" style="width:${pct}%"></div></div><div class="u-fw700 u-fs12 u-mt12">Rencana / realisasi per kategori</div>${categoryRows||'<div class="u-t2 u-fs12">Belum ada item.</div>'}<div class="u-flex u-aic u-jcsb u-mt12"><div class="u-fw700 u-fs12">Daftar DP / Termin</div><button class="btn btn-ghost" data-action="Renov.toggleDpList">Daftar pemasukan</button></div><div id="renovDpListWrap" style="display:none">${incomeRows||'<div class="u-t2 u-fs12">Belum ada pemasukan proyek.</div>'}</div><div class="u-flex u-flex-wrap u-gap6 u-mt12"><button class="btn btn-primary" data-action="Renov.openDpModal" data-args="${escapeHtml(JSON.stringify([p.id]))}">＋ Catat DP / Termin</button><button class="btn btn-ghost" data-action="Renov.exportCSV" data-args="${escapeHtml(JSON.stringify([p.id]))}">Export CSV</button><button class="btn btn-ghost" data-action="Renov.importCSV" data-args="${escapeHtml(JSON.stringify([p.id]))}">Import CSV</button><button class="btn btn-ghost" data-action="Renov.exportPDF" data-args="${escapeHtml(JSON.stringify([p.id]))}">Laporan PDF</button></div>`;
},
toggleDpList(){const el=document.getElementById('renovDpListWrap');if(el)el.style.display=el.style.display==='none'?'block':'none';},
_ensureDpModal(){let el=document.getElementById('renovDpModal');if(!el){el=document.createElement('div');el.id='renovDpModal';el.className='overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);}return el;},
openDpModal(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
Renov._dpProjectId=p.id;const cats=typeof getCatsByType==='function'?getCatsByType('income'):[];
if(!Array.isArray(cats)||!cats.length){toast('⚠️ Kategori income belum tersedia; pemasukan DP tidak dibuat');return;}
const accounts=D.accounts||[];if(!accounts.length){toast('⚠️ Belum ada akun tujuan');return;}
const el=Renov._ensureDpModal();el.innerHTML=`<div class="modal" style="max-height:90vh;overflow:auto"><div class="modal-handle"></div><div class="modal-title"><span>Catat DP / Termin Klien</span><button class="modal-close" data-action="closeModal" data-args='["renovDpModal"]'>✕</button></div><div style="overflow:auto;max-height:calc(90vh - 90px)"><label class="field-label">Label</label><input id="renovDpLabel" class="input" maxlength="120" placeholder="DP awal / Termin 1"><label class="field-label u-mt8">Jenis</label><select id="renovDpKind" class="input"><option value="dp">DP</option><option value="termin">Termin</option></select><label class="field-label u-mt8">Jumlah (Rp)</label><input id="renovDpAmount" class="input" type="number" min="1" step="1"><label class="field-label u-mt8">Tanggal</label><input id="renovDpDate" class="input" type="date" value="${todayStr()}"><label class="field-label u-mt8">Akun Tujuan</label><select id="renovDpAccount" class="input" data-onchange="Renov.updateDpOwnerVisibility"><option value="">Pilih akun tujuan</option>${accounts.map(a=>`<option value="${escapeHtml(String(a.id))}">${escapeHtml(a.emoji||'')} ${escapeHtml(a.name||'Akun')}</option>`).join('')}</select><div id="renovDpOwnerWrap" class="u-mt8" style="display:none"><label class="field-label">Pemilik / Penanggung</label><select id="renovDpOwner" class="input"></select></div><label class="field-label u-mt8">Catatan</label><input id="renovDpNote" class="input" maxlength="240"><div class="u-flex u-gap8 u-mt14"><button class="btn btn-primary" data-action="Renov.submitDpIncome">Simpan Pemasukan</button><button class="btn btn-ghost" data-action="closeModal" data-args='["renovDpModal"]'>Batal</button></div></div></div>`;
const accEl=document.getElementById('renovDpAccount');if(accEl)accEl.value='';Renov.updateDpOwnerVisibility();openModal('renovDpModal');
},
updateDpOwnerVisibility(){
const accId=document.getElementById('renovDpAccount')?.value;const wrap=document.getElementById('renovDpOwnerWrap'),sel=document.getElementById('renovDpOwner');if(!wrap||!sel)return;
const owners=typeof getAccOwnersRaw==='function'?(getAccOwnersRaw(accId).owners||[]):[];
if(!owners.length){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';sel.innerHTML='<option value="">— Pilih pemilik —</option>'+owners.map(o=>`<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName||o.ownerId)}</option>`).join('');if(owners.length===1)sel.value=owners[0].ownerId;
},
async submitDpIncome(){
if(Renov._dpInFlight)return;
const p=D.renovProjects.find(x=>sameId(x.id,Renov._dpProjectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const label=(document.getElementById('renovDpLabel')?.value||'').trim();const kind=document.getElementById('renovDpKind')?.value==='termin'?'termin':'dp';const amount=Number(document.getElementById('renovDpAmount')?.value);const date=document.getElementById('renovDpDate')?.value||todayStr();const accountId=document.getElementById('renovDpAccount')?.value||'';const note=(document.getElementById('renovDpNote')?.value||'').trim();
if(!(amount>0)||!Number.isFinite(amount)){toast('⚠️ Jumlah pemasukan harus lebih dari 0');return;}if(!accountId){toast('⚠️ Pilih akun tujuan');return;}
const cats=typeof getCatsByType==='function'?getCatsByType('income'):[];if(!Array.isArray(cats)||!cats.length){toast('⚠️ Kategori income kosong; transaksi tidak dibuat');return;}
const category=(cats.find(c=>/proyek|bisnis|jasa/i.test(c.name||''))||cats[0]).name;if(!category){toast('⚠️ Kategori income tidak valid');return;}
const owners=typeof getAccOwnersRaw==='function'?(getAccOwnersRaw(accountId).owners||[]):[];const ownerEl=document.getElementById('renovDpOwner');const deductionOwnerId=owners.length?(ownerEl?.value||(owners.length===1?owners[0].ownerId:'')):'';if(owners.length>1&&!deductionOwnerId){toast('⚠️ Pilih pemilik/penanggung akun');return;}
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');Renov._dpInFlight=true;let tx=null,committed=false;
try{tx=FinanceTxSOT.create({id:uid(),type:'income',amount,accountId,date,category,subcategory:'',note:`Renovasi: ${p.name} - ${label|| (kind==='dp'?'DP':'Termin')}${note?' ('+note+')':''}`,payMethod:'transfer',renovDpProjectId:p.id,renovDpLabel:label|| (kind==='dp'?'DP':'Termin'),renovDpKind:kind,...(deductionOwnerId?{deductionOwnerId}:{})});
const saved=save();if(saved===false)throw new Error('Penyimpanan gagal');committed=true;
try{if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});}catch(e){console.warn('[Renov] refresh DP gagal',e);}try{if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'dp-income',projectId:p.id,txId:tx.id,amount});}catch(e){console.warn('[Renov] outbox DP gagal',e);}
try{closeModal('renovDpModal');Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();}catch(e){console.warn('[Renov] render DP gagal',e);}toast('✅ DP / Termin tercatat sebagai income Keuangan');
}catch(err){if(!committed){if(tx)try{FinanceTxSOT.removeById(tx.id);}catch(e){console.error('[Renov] rollback DP gagal',e);}toast('⚠️ Gagal mencatat DP / Termin: '+(err&&err.message||'kesalahan tidak diketahui'));}else toast('⚠️ DP/Termin sudah tersimpan; tampilan perlu dimuat ulang.');}
finally{Renov._dpInFlight=false;}
},
async deleteDpIncome(projectId,txId){
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT){toast('⚠️ FinanceTxSOT tidak tersedia');return;}
const tx=FinanceTxSOT.findById(txId);if(!tx||!_renovSameId(tx.renovDpProjectId,projectId))return;
if(!await askConfirm(`Hapus pemasukan ${fmtFull(tx.amount)} dari proyek? Transaksi income akan dihapus dari Keuangan dan saldo akun ikut dihitung ulang.`))return;
const removed=FinanceTxSOT.removeById(txId);if(!removed)return;if(save()===false){try{FinanceTxSOT.create(removed);}catch(e){console.error('[Renov] rollback DP delete gagal',e);}toast('⚠️ Gagal menyimpan penghapusan DP');return;}
if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();if(sameId(Renov.curId,projectId))Renov.renderDetail();toast('🗑 Pemasukan proyek dihapus');
},
onDpTxEdited(){Renov.render();if(Renov.curId)Renov.renderDetail();},
onDpTxDeleted(t){
// S2767.3: runTxDeleteCascades() dipanggil delTx() SEBELUM transaksi dihapus dari D.transactions,
// jadi render langsung masih melihat income DP itu. Abaikan id tsb sementara, lalu render ulang setelah tick.
Renov._ignoreTxIds=new Set(t&&t.id!=null?[String(t.id)]:[]);
try{Renov.render();if(Renov.curId)Renov.renderDetail();}finally{
setTimeout(()=>{Renov._ignoreTxIds=null;try{Renov.render();if(Renov.curId)Renov.renderDetail();}catch(e){console.warn('[Renov] refresh DP setelah hapus gagal',e);}},0);}
},
_csvCell(value){
let text=String(value==null?'':value);
if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(text))text="'"+text;
return '"'+text.replace(/"/g,'""')+'"';
},
_csvRow(values,delimiter=','){return values.map(v=>Renov._csvCell(v)).join(delimiter);},
exportCSV(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const items=Array.isArray(p.items)?p.items:[],dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id));
const rows=[];const add=(r)=>rows.push(Renov._csvRow(r));
add(['=== IDENTITAS PROYEK ===']);add(['Nama Proyek','Klien','Nilai Kontrak/RAB','Catatan']);add([p.name,p.klien||'',p.rab||0,p.catatan||'']);rows.push('');
const plan=items.reduce((s,it)=>s+(Number(it.harga)||0),0),paid=items.reduce((s,it)=>s+_renovItemPaidAmount(it),0),incoming=dpTxs.reduce((s,tx)=>s+(Number(tx.amount)||0),0);
add(['=== RINGKASAN ===']);add(['RAB','Rencana Item','Terbayar','Sisa Belanja','DP+Termin Masuk','Dana Proyek','Sisa Tagihan Klien']);add([p.rab||0,plan,paid,Math.max(0,plan-paid),incoming,incoming-paid,Math.max(0,(Number(p.rab)||0)-incoming)]);rows.push('');
add(['=== DP / TERMIN ===']);add(['Label','Jenis','Tanggal','Akun','Nominal','Catatan','ID Transaksi']);dpTxs.forEach(tx=>{const acc=(D.accounts||[]).find(a=>sameId(a.id,tx.accountId));add([tx.renovDpLabel||'',tx.renovDpKind||'dp',tx.date||'',acc?acc.name:tx.accountId,tx.amount,tx.note||'',tx.id]);});rows.push('');
add(['=== DAFTAR ITEM ===']);add(['Item','Kategori','Ukuran','Harga Rencana','Terbayar','Sisa','Status','Akun','Tanggal']);items.forEach(it=>{const acc=(D.accounts||[]).find(a=>sameId(a.id,it.accountId)),amount=_renovItemPaidAmount(it);add([it.name,it.category||'',it.ukuran||'',it.harga,amount,Math.max(0,(Number(it.harga)||0)-amount),amount>=(Number(it.harga)||0)?'Lunas':amount>0?'Sebagian':'Belum dibayar',acc?acc.name:it.accountId||'',it.paidDate||it.tglBayar||'']);});rows.push('');
add(['=== RIWAYAT CICILAN ===']);add(['Item','ID Pembayaran','Tanggal','Akun','Label','Nominal','ID Transaksi']);items.forEach(it=>(it.payments||[]).forEach(pay=>{const acc=(D.accounts||[]).find(a=>sameId(a.id,pay.accountId));add([it.name,pay.id,pay.date||'',acc?acc.name:pay.accountId||'',pay.label||'',pay.amount,pay.txId]);}));
const csv='\uFEFF'+rows.join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=('renovasi-'+String(p.name||'proyek').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.csv');document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('✅ CSV proyek berhasil disiapkan');return csv;
},
_renovParsePrice(raw){
let value=String(raw==null?'':raw).trim().replace(/[^0-9,.-]/g,'');if(!value)return NaN;
const comma=value.lastIndexOf(','),dot=value.lastIndexOf('.');
if(comma>=0&&dot>=0){if(comma>dot)value=value.replace(/\./g,'').replace(',','.');else value=value.replace(/,/g,'');}
else if(comma>=0){const decimals=value.length-comma-1;value=decimals>0&&decimals<=2?value.replace(',','.'):value.replace(/,/g,'');}
else if(dot>=0){const decimals=value.length-dot-1;if(decimals>2)value=value.replace(/\./g,'');}
return Number(value);
},
_parseCSV(text){
const sample=String(text||'').slice(0,8192);let commas=0,semis=0,quoted=false;for(let i=0;i<sample.length;i++){const c=sample[i];if(c==='"'){if(quoted&&sample[i+1]==='"'){i++;continue;}quoted=!quoted;}else if(!quoted&&c===',')commas++;else if(!quoted&&c===';')semis++;}
const delimiter=semis>commas?';':',';const rows=[];let row=[],field='',inQuotes=false;
for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(inQuotes&&text[i+1]==='"'){field+='"';i++;}else inQuotes=!inQuotes;}else if(c===delimiter&&!inQuotes){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!inQuotes){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>String(v).trim()!==''))rows.push(row);row=[];field='';}else field+=c;}
if(inQuotes)throw new Error('CSV memiliki tanda kutip yang tidak berpasangan');if(field!==''||row.length){row.push(field);if(row.some(v=>String(v).trim()!==''))rows.push(row);}return{delimiter,rows};
},
async importCSV(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.style.display='none';document.body.appendChild(input);
input.addEventListener('cancel',()=>input.remove(),{once:true});
input.addEventListener('change',async()=>{try{
const file=input.files&&input.files[0];if(!file)return;if(file.size>2*1024*1024)throw new Error('Ukuran CSV maksimal 2 MB');if(!file.size)throw new Error('File CSV kosong');
let raw=await file.text();raw=raw.replace(/^\uFEFF/,'');if(!raw.trim())throw new Error('File CSV kosong');if(raw.includes('\uFFFD'))throw new Error('Encoding CSV rusak/tidak terbaca');
const parsed=Renov._parseCSV(raw),rows=parsed.rows;if(rows.length<2)throw new Error('CSV harus memiliki header dan minimal satu baris data');
const header=rows[0].map(v=>String(v||'').trim().toLowerCase().replace(/[\s_/-]+/g,''));const find=(names)=>header.findIndex(h=>names.includes(h));
const nameIdx=find(['item','nama','namaitem','namabarang']);const catIdx=find(['kategori','category']);const sizeIdx=find(['ukuran','ukurankebutuhan','size']);const priceIdx=find(['harga','hargarencana','nominal','price']);
if(nameIdx<0||priceIdx<0)throw new Error('Header wajib: Item/Nama dan Harga');
const keyOf=(name,cat,size,price)=>[name,cat,size,price].map(v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ')).join('|');
const seen=new Set((p.items||[]).map(it=>keyOf(it.name,it.category,it.ukuran,it.harga)));const valid=[],invalid=[];
rows.slice(1).forEach((r,i)=>{const name=String(r[nameIdx]||'').trim(),category=catIdx>=0?String(r[catIdx]||'').trim():'',size=sizeIdx>=0?String(r[sizeIdx]||'').trim():'';const priceRaw=String(r[priceIdx]||'').trim();const price=Renov._renovParsePrice(priceRaw);if(!name){invalid.push({line:i+2,reason:'Nama item kosong'});return;}if(!priceRaw||!Number.isFinite(price)||price<=0){invalid.push({line:i+2,reason:'Harga harus angka lebih dari 0'});return;}const key=keyOf(name,category,size,price);if(seen.has(key)){invalid.push({line:i+2,reason:'Duplikat item (sudah ada / berulang)'});return;}seen.add(key);valid.push({id:uid(),name,category,ukuran:size,harga:price,paid:false,txId:null,paidDate:null,tglBayar:'',accountId:'',note:'',payments:undefined});});
if(!valid.length){toast(`⚠️ Tidak ada baris valid. ${invalid.length} baris dilewati.`);return;}
const preview=`Preview import ${p.name}: ${valid.length} item valid, ${invalid.length} baris tidak valid.\n\n${invalid.slice(0,8).map(x=>`Baris ${x.line}: ${x.reason}`).join('\n')}`;
if(!await askConfirm(preview,{title:'Konfirmasi Import CSV',okText:`Import ${valid.length} item`}))return;
p.items=p.items||[];const start=p.items.length;p.items.push(...valid);if(save()===false){p.items.splice(start,valid.length);toast('⚠️ Import dibatalkan karena penyimpanan gagal');return;}
Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();toast(`✅ ${valid.length} item rencana berhasil diimpor; ${invalid.length} baris dilewati`);
}catch(err){toast('⚠️ Import CSV gagal: '+(err&&err.message||'format tidak valid'));}finally{input.remove();}}, {once:true});input.click();
},
async exportPDF(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return false;}
try{if(typeof ensureJsPDF==='function')await ensureJsPDF();const JsPDF=typeof window!=='undefined'&&window.jspdf&&window.jspdf.jsPDF;if(!JsPDF){toast('⚠️ Library PDF tidak tersedia. Periksa koneksi internet lalu coba lagi.');return false;}
const doc=new JsPDF({unit:'pt',format:'a4'});const left=42,right=553;let y=48;const page=()=>{doc.addPage();y=48;};const ensureSpace=(height=18)=>{if(y+height>680)page();};const section=title=>{ensureSpace(28);doc.setFontSize(12);doc.text(title,left,y);y+=18;};const line=(label,value)=>{ensureSpace(16);doc.setFontSize(9);doc.text(String(label),left,y);doc.text(String(value),right,y,{align:'right'});y+=16;};const money=n=>'Rp '+Math.round(Number(n)||0).toLocaleString('id-ID');
const items=p.items||[],dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id));const plan=items.reduce((s,it)=>s+(Number(it.harga)||0),0),paid=items.reduce((s,it)=>s+_renovItemPaidAmount(it),0),incoming=dpTxs.reduce((s,tx)=>s+(Number(tx.amount)||0),0),fund=incoming-paid;
const categories=new Map();items.forEach(it=>{const key=String(it.category||'Tanpa kategori');const row=categories.get(key)||{plan:0,paid:0};row.plan+=Math.max(0,Number(it.harga)||0);row.paid+=_renovItemPaidAmount(it);categories.set(key,row);});
doc.setFontSize(16);doc.text('Laporan Proyek Renovasi',left,y);y+=24;ensureSpace(20);doc.setFontSize(11);doc.text(String(p.name||''),left,y);y+=18;line('Klien',p.klien||'-');line('Nilai Kontrak / RAB',money(p.rab));line('Rencana Item',money(plan));line('Terbayar',money(paid));line('DP + Termin Masuk',money(incoming));line('Dana Proyek',money(fund));if(fund<0)line('STATUS DANA','NOMBOK — dana pribadi '+money(Math.abs(fund)));line('Sisa Tagihan Klien',money(Math.max(0,(Number(p.rab)||0)-incoming)));line('Sisa Belanja',money(Math.max(0,plan-paid)));if(paid>plan)line('Status realisasi','KELEBIHAN BAYAR '+money(paid-plan));
section('DP / Termin');dpTxs.forEach(tx=>line(`${tx.renovDpLabel||tx.renovDpKind||'DP'} · ${tx.date||'-'} · ${tx.note||''}`,money(tx.amount)));
section('Daftar Item Biaya');items.forEach(it=>{line(it.name,`${money(it.harga)} · Dibayar ${money(_renovItemPaidAmount(it))}`);(it.payments||[]).forEach(pay=>line('  '+(pay.label||'Cicilan')+' · '+(pay.date||'-'),money(pay.amount)));});
section('Rencana vs Realisasi per Kategori');categories.forEach((row,name)=>{line(name,`Rencana ${money(row.plan)} · Realisasi ${money(row.paid)} · Selisih ${money(row.plan-row.paid)}`);});
const filename='laporan-renovasi-'+String(p.name||'proyek').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.pdf';doc.save(filename);toast('✅ Laporan PDF berhasil dibuat');return true;
}catch(err){console.error('[Renov] export PDF gagal',err);toast('⚠️ PDF gagal dibuat: '+(err&&err.message||'library tidak tersedia'));return false;}
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
const pct=t.total>0?Math.min(100,Math.round((t.paid/t.total)*100)):0;
document.getElementById('renovDetBar').style.width=pct+'%';
document.getElementById('renovDetPct').textContent=pct+'% selesai';
document.getElementById('renovDetCount').textContent=`${t.paidCount}/${t.count} item lunas`;
const listEl=document.getElementById('renovItemList');
Renov.renderFundPanel(p);
if(!t.count){
listEl.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada item biaya</div></div>';
return;
}
const renderRow=(it)=>{
const acc=D.accounts.find(a=>sameId(a.id,it.accountId));
const itemPaid=_renovItemPaidAmount(it),itemSettled=(Number(it.harga)||0)>0&&itemPaid>=(Number(it.harga)||0),itemOverpaid=itemPaid>(Number(it.harga)||0);
return`<div class="tx-item" data-renov-item-id="${escapeHtml(String(it.id))}">
        <div class="tx-icon" style="background:${itemSettled?'var(--accent3-soft)':'var(--surface3)'};cursor:pointer" data-action="Renov.openPayModal" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}" title="${itemSettled?'Lihat pembayaran':'Catat pembayaran'}">${itemSettled?'✅':(itemPaid>0?'🟡':'⬜')}</div>
        <div class="tx-info u-pointer" data-action="Renov.openItemModal" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}">
          <div class="tx-name" style="${itemSettled?'text-decoration:line-through;color:var(--text2)':''}">${escapeHtml(it.name)} ${it.category?`<span class="acc-chip">${escapeHtml(it.category)}</span>`:''}</div>
          <div class="tx-meta">${it.ukuran?('📏 '+escapeHtml(it.ukuran)+' · '):''}${it.hargaTotal?('💰 Total '+fmt(it.hargaTotal)+' · '):''}${itemOverpaid?'Kelebihan bayar · ':itemSettled?'Lunas · ':itemPaid>0?'Terbayar '+fmt(itemPaid)+' · ':''}${acc?acc.emoji+' '+escapeHtml(acc.name):'Belum pilih akun'}${it.calcDetail?(' · 🧮'+(Math.round(it.calcDetail.total||0)!==Math.round(it.harga||0)?' ⚠️':'')):''}</div>
        </div>
        <div class="tx-amount ${itemSettled?'green':''}">${fmt(it.harga)}</div>
        <button class="tx-del" data-action="Renov.deleteItem" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
};
const belum=p.items.filter(it=>_renovItemPaidAmount(it)<(Number(it.harga)||0));
const sudah=p.items.filter(it=>_renovItemPaidAmount(it)>=(Number(it.harga)||0));
let html='';
if(belum.length)html+=`<div class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 6px">🛒 Perlu Dibeli (${belum.length})</div>`+belum.map(renderRow).join('');
if(sudah.length)html+=`<div class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px">✅ Sudah Dibeli (${sudah.length})</div>`+sudah.map(renderRow).join('');
listEl.innerHTML=html;
},
_ensurePayModal(){
let el=document.getElementById('renovPayModal');
if(!el){el=document.createElement('div');el.id='renovPayModal';el.className='overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);}
return el;
},
openPayModal(projectId,itemId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
const it=p&&(p.items||[]).find(x=>sameId(x.id,itemId));
if(!p||!it){toast('⚠️ Item/proyek tidak ditemukan');return;}
Renov._payProjectId=p.id;Renov._payItemId=it.id;Renov._payMode='cash';
Renov._renderPayModal();openModal('renovPayModal');
},
_renderPayModal(){
const p=D.renovProjects.find(x=>sameId(x.id,Renov._payProjectId));
const it=p&&(p.items||[]).find(x=>sameId(x.id,Renov._payItemId));
if(!p||!it)return;
const el=Renov._ensurePayModal();
const paid=_renovItemPaidAmount(it),remaining=Math.max(0,(Number(it.harga)||0)-paid);
const payments=Array.isArray(it.payments)?it.payments:(it.txId?[{id:'legacy-'+it.txId,txId:it.txId,amount:it.harga,date:it.paidDate||it.tglBayar,accountId:it.accountId,label:'Pembayaran cash lama',legacy:true}]:[]);
const history=payments.map(pay=>{
const acc=(D.accounts||[]).find(a=>sameId(a.id,pay.accountId));
return `<div class="tx-item u-aic"><div class="tx-info"><div class="tx-name">${escapeHtml(pay.label||'Pembayaran')}</div><div class="tx-meta">${escapeHtml(pay.date||'-')} · ${escapeHtml(acc?acc.name:'Akun tidak tersedia')}</div></div><div class="tx-amount">${fmt(pay.amount||0)}</div><button class="tx-del" data-action="${pay.legacy?'Renov.deleteLegacyItemPayment':'Renov.deleteItemPayment'}" data-args="${escapeHtml(JSON.stringify(pay.legacy?[p.id,it.id,pay.txId]:[p.id,it.id,pay.id]))}" aria-label="Hapus pembayaran">🗑</button></div>`;
}).join('');
const accounts=(D.accounts||[]).map(a=>`<option value="${escapeHtml(String(a.id))}" ${sameId(a.id,it.accountId)?'selected':''}>${escapeHtml(a.emoji||'')} ${escapeHtml(a.name||'Akun')}</option>`).join('');
const mode=Renov._payMode||'cash';
el.innerHTML=`<div class="modal" style="max-height:90vh;overflow:auto"><div class="modal-handle"></div><div class="modal-title"><span>Pembayaran Item Renovasi</span><button class="modal-close" data-action="closeModal" data-args='["renovPayModal"]'>✕</button></div><div style="overflow:auto;max-height:calc(90vh - 90px)"><div class="u-fw700">${escapeHtml(it.name)}</div><div class="u-t2 u-fs12 u-mt4">Harga item: ${fmtFull(it.harga)} · Terbayar: ${fmtFull(paid)} · Sisa: ${fmtFull(remaining)}</div><div class="u-mt12 u-fw700">Riwayat pembayaran</div>${history||'<div class="u-t2 u-fs12 u-mt6">Belum ada riwayat cicilan.</div>'}<div class="divider u-my12"></div><div class="u-fw700 u-mb8">Catat pembayaran</div><div class="u-flex u-gap8"><button class="btn ${mode==='cash'?'btn-primary':'btn-ghost'}" data-action="Renov.setPayMode" data-args='["cash"]'>Cash / Lunas</button><button class="btn ${mode==='installment'?'btn-primary':'btn-ghost'}" data-action="Renov.setPayMode" data-args='["installment"]'>Cicil</button></div><label class="field-label u-mt10">Nominal (Rp)</label><input id="renovPayAmount" class="input" type="number" min="1" step="1" value="${mode==='cash'?remaining:''}" ${mode==='cash'?'readonly':''} placeholder="Nominal pembayaran"><label class="field-label u-mt8">Tanggal</label><input id="renovPayDate" class="input" type="date" value="${todayStr()}"><label class="field-label u-mt8">Akun sumber dana</label><select id="renovPayAccount" class="input" data-onchange="Renov.updatePayOwnerVisibility">${accounts}</select><div id="renovPayOwnerWrap" class="u-mt8" style="display:none"><label class="field-label">Pemilik / Penanggung</label><select id="renovPayOwner" class="input"></select></div><label class="field-label u-mt8">Keterangan</label><input id="renovPayLabel" class="input" maxlength="120" placeholder="${mode==='cash'?'Pelunasan':'Termin pembayaran'}"><div class="u-flex u-gap8 u-mt14"><button class="btn btn-primary" data-action="Renov.submitItemPayment">Simpan Pembayaran</button><button class="btn btn-ghost" data-action="closeModal" data-args='["renovPayModal"]'>Tutup</button></div></div></div>`;
Renov.updatePayOwnerVisibility();
},
updatePayOwnerVisibility(){
const accId=document.getElementById('renovPayAccount')?.value,wrap=document.getElementById('renovPayOwnerWrap'),sel=document.getElementById('renovPayOwner');if(!wrap||!sel)return;
const owners=typeof getAccOwnersRaw==='function'?(getAccOwnersRaw(accId).owners||[]):[];if(!owners.length){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';sel.innerHTML='<option value="">— Pilih pemilik —</option>'+owners.map(o=>`<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName||o.ownerId)}</option>`).join('');
const p=D.renovProjects.find(x=>sameId(x.id,Renov._payProjectId)),it=p&&(p.items||[]).find(x=>sameId(x.id,Renov._payItemId));if(it&&it.deductionOwnerId&&owners.some(o=>o.ownerId===it.deductionOwnerId))sel.value=it.deductionOwnerId;else if(owners.length===1)sel.value=owners[0].ownerId;
},
setPayMode(mode){
if(mode!=='cash'&&mode!=='installment')return;
Renov._payMode=mode;Renov._renderPayModal();
},
async submitItemPayment(){
if(Renov._paymentInFlight)return;
const p=D.renovProjects.find(x=>sameId(x.id,Renov._payProjectId));
const it=p&&(p.items||[]).find(x=>sameId(x.id,Renov._payItemId));
if(!p||!it){toast('⚠️ Item/proyek tidak ditemukan');return;}
const paid=_renovItemPaidAmount(it),remaining=Math.max(0,(Number(it.harga)||0)-paid);
const mode=Renov._payMode||'cash';
const amount=mode==='cash'?remaining:Number(document.getElementById('renovPayAmount')?.value);
const date=document.getElementById('renovPayDate')?.value||todayStr();
const accountId=document.getElementById('renovPayAccount')?.value||'';
const owners=typeof getAccOwnersRaw==='function'?(getAccOwnersRaw(accountId).owners||[]):[];const ownerEl=document.getElementById('renovPayOwner');const deductionOwnerId=owners.length?(ownerEl?.value||''):'';
const label=(document.getElementById('renovPayLabel')?.value||'').trim()||(mode==='cash'?'Pelunasan':'Cicilan');
if(!(amount>0)||!Number.isFinite(amount)||amount>remaining){toast('⚠️ Nominal harus lebih dari 0 dan tidak melebihi sisa pembayaran');return;}
if(!accountId){toast('⚠️ Pilih akun pembayaran');return;}
if(owners.length>1&&!deductionOwnerId){toast('⚠️ Pilih pemilik/penanggung akun');return;}
if(!date){toast('⚠️ Tanggal pembayaran wajib diisi');return;}
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT){toast('⚠️ FinanceTxSOT tidak tersedia');return;}
Renov._paymentInFlight=true;
let tx=null,payment=null,legacyBefore=null,committed=false;const hadPayments=Array.isArray(it.payments);
try{
const txId=uid(),paymentId=uid();
const legacyCash=mode==='cash'&&!Array.isArray(it.payments)&&paid===0;
const txData={id:txId,type:'expense',amount,accountId,date,category:it.category||'Renovasi',subcategory:'',payMethod:'tunai',note:`Renovasi: ${p.name} - ${it.name} (${label})`,renovProjectLinkId:p.id,renovItemLinkId:it.id,...(!legacyCash?{renovPaymentId:paymentId}:{})};
if(deductionOwnerId)txData.deductionOwnerId=deductionOwnerId;else if(it.deductionOwnerId&&owners.length===0)txData.deductionOwnerId=it.deductionOwnerId;
tx=FinanceTxSOT.create(txData);
const linked=FinanceTxSOT.patchMetaById(txId,{renovProjectLinkId:p.id,renovItemLinkId:it.id,...(!legacyCash?{renovPaymentId:paymentId}:{})});if(!linked)throw new Error('Gagal menautkan transaksi pembayaran ke item Renovasi');
if(legacyCash){
legacyBefore={paid:it.paid,txId:it.txId,paidDate:it.paidDate};
it.paid=true;it.txId=txId;it.paidDate=date;
} else {
if(!Array.isArray(it.payments))it.payments=[];
payment={id:paymentId,txId,amount,date,accountId,label};it.payments.push(payment);
it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
}
const saved=save();
if(saved===false)throw new Error('Penyimpanan gagal; transaksi dibatalkan');
committed=true;
try{if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});}catch(refreshErr){console.warn('[Renov] refresh setelah pembayaran gagal',refreshErr);}
try{if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'item-pay',projectId:p.id,itemId:it.id,txId:tx.id,amount});}catch(outboxErr){console.warn('[Renov] outbox pembayaran gagal',outboxErr);}
try{Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();Renov._renderPayModal();}catch(renderErr){console.warn('[Renov] render setelah pembayaran gagal',renderErr);}
toast('✅ Pembayaran tercatat sebagai transaksi Keuangan');
}catch(err){
if(!committed){
if(payment&&Array.isArray(it.payments))it.payments=it.payments.filter(x=>!sameId(x.id,payment.id));
if(!hadPayments)delete it.payments;
if(legacyBefore){it.paid=legacyBefore.paid;it.txId=legacyBefore.txId;it.paidDate=legacyBefore.paidDate;}
if(tx)try{FinanceTxSOT.removeById(tx.id);}catch(rollbackError){console.error('[Renov] rollback transaksi gagal',rollbackError);}
console.error('[Renov] pembayaran gagal',err);toast('⚠️ Pembayaran gagal: '+(err&&err.message||'kesalahan tidak diketahui'));
}else{console.error('[Renov] pembayaran sudah tersimpan, ada kegagalan pasca-commit',err);toast('⚠️ Pembayaran sudah tersimpan; tampilan perlu dimuat ulang.');}
}finally{Renov._paymentInFlight=false;}
},
async deleteLegacyItemPayment(projectId,itemId,txId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId)),it=p&&(p.items||[]).find(x=>sameId(x.id,itemId));if(!it||!sameId(it.txId,txId)||Array.isArray(it.payments))return;
if(!await askConfirm('Hapus pembayaran cash lama? Transaksi pengeluaran terkait juga akan dihapus dari Keuangan.'))return;
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');const removed=FinanceTxSOT.removeById(txId);if(!removed){toast('⚠️ Transaksi lama tidak ditemukan');return;}
const old={paid:it.paid,txId:it.txId,paidDate:it.paidDate};it.paid=false;it.txId=null;it.paidDate=null;
if(save()===false){it.paid=old.paid;it.txId=old.txId;it.paidDate=old.paidDate;try{FinanceTxSOT.create(removed);}catch(e){console.error('[Renov] pemulihan cash legacy gagal',e);}toast('⚠️ Gagal menyimpan penghapusan pembayaran');return;}
if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();Renov._renderPayModal();toast('🗑 Pembayaran cash lama dihapus dari Keuangan');
},
async deleteItemPayment(projectId,itemId,paymentId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));const it=p&&(p.items||[]).find(x=>sameId(x.id,itemId));
const pay=it&&Array.isArray(it.payments)?it.payments.find(x=>sameId(x.id,paymentId)):null;
if(!pay)return;
if(!await askConfirm(`Hapus pembayaran ${fmtFull(pay.amount)}? Transaksi pengeluaran terkait juga akan dihapus dari Keuangan.`))return;
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
const removed=FinanceTxSOT.removeById(pay.txId);if(!removed){toast('⚠️ Transaksi pembayaran tidak ditemukan; riwayat dipertahankan');return;}
const oldPayments=it.payments.slice();const oldPaid=it.paid;it.payments=it.payments.filter(x=>!sameId(x.id,paymentId));it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
if(save()===false){it.payments=oldPayments;it.paid=oldPaid;try{FinanceTxSOT.create(removed);}catch(e){console.error('[Renov] pemulihan transaksi gagal',e);}toast('⚠️ Gagal menyimpan penghapusan pembayaran');return;}
if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});
if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'item-payment-delete',projectId:p.id,itemId:it.id,txId:removed.id});
Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();Renov._renderPayModal();toast('🗑 Pembayaran dihapus dari Renovasi dan Keuangan');
},
openItemModal(projectId,itemId){
Renov.curId=projectId;
Renov.editItemId=itemId||null;
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=itemId?p.items.find(x=>sameId(x.id,itemId)):null;
const cats=getCatsByType('expense');
document.getElementById('renovItemCat').innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c.name)}">${c.emoji} ${escapeHtml(c.name)}</option>`).join('');
document.getElementById('renovItemAcc').innerHTML=D.accounts.map(a=>`<option value="${escapeHtml(a.id)}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
document.getElementById('renovItemModalTitle').textContent=it?'Edit Item Biaya':'Tambah Item Biaya';
document.getElementById('renovItemName').value=it?it.name:'';
document.getElementById('renovItemUkuran').value=it?(it.ukuran||''):'';
document.getElementById('renovItemHarga').value=it?it.harga:'';
document.getElementById('renovItemHargaTotal').value=(it&&it.hargaTotal)?it.hargaTotal:'';
document.getElementById('renovItemHargaTotalToggle').checked=!!(it&&it.hargaTotal);
Renov.toggleHargaTotalFields();
document.getElementById('renovItemCat').value=it?(it.category||''):'';
document.getElementById('renovItemAcc').value=it?(it.accountId||D.accounts[0]?.id||''):(D.accounts[0]?.id||'');
Renov.updateDeductionOwnerVisibility(it?(it.deductionOwnerId||''):'');
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
// updateDeductionOwnerVisibility(presetOwnerId) — BUGFIX (audit "estimasi belum
// teralokasi" sesi 3, root cause sinyal 2/2 sesi 2): item Renovasi yang ditandai
// lunas (togglePaid()) atau ditautkan ke transaksi lama (confirmLinkTx()) TIDAK
// PERNAH menawarkan pemilihan "Ditanggung: <owner>" untuk akun Dana Titipan
// multi-owner -- transaksi hasilnya lolos TANPA `deductionOwnerId`, jadi
// resolveTxOwnerAssignment() (filter-laporan.js) fallback ke owners[0] (owner
// pertama), bukan owner yang sebenarnya menanggung. Fix: reuse PENUH pola
// #txDeductionOwner (transaksi.js/modals.js) -- getAccOwnersRaw(accId) (akun.js,
// 0 rumus baru) sbg sumber owners akun terpilih. 0 owner asli -> wrap
// disembunyikan (akun lama/single-owner, 0 regresi). >=1 owner -> wrap
// ditampilkan, dropdown diisi ulang dari nol tiap dipanggil (opsi owner akun
// sebelumnya TIDAK terbawa), value diisi presetOwnerId kalau valid (mode edit)
// atau owners[0] kalau cuma 1 owner (auto-select, sama seperti pola S575).
// Dipanggil dari openItemModal() (isi ulang tiap modal dibuka) + onchange
// #renovItemAcc (ganti akun -> opsi ikut berubah).
updateDeductionOwnerVisibility(presetOwnerId){
const accId=document.getElementById('renovItemAcc').value;
const wrap=document.getElementById('renovItemDeductionOwnerWrap');
const sel=document.getElementById('renovItemDeductionOwner');
if(!wrap||!sel)return;
const owners=(typeof getAccOwnersRaw==='function'?getAccOwnersRaw(accId):{ok:true,owners:[]}).owners||[];
if(!owners.length){wrap.style.display='none';sel.innerHTML='';return;}
wrap.classList.remove('u-dnone');
wrap.style.display='block';
sel.innerHTML='<option value="">— Pilih pemilik —</option>'+owners.map(o=>`<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName||o.ownerId)}</option>`).join('');
if(presetOwnerId&&owners.some(o=>o.ownerId===presetOwnerId)){
sel.value=presetOwnerId;
} else if(owners.length===1){
sel.value=owners[0].ownerId;
}
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
const existingForPrice=Renov.editItemId?p.items.find(x=>sameId(x.id,Renov.editItemId)):null;
if(existingForPrice&&harga<_renovItemPaidAmount(existingForPrice)){toast('⚠️ Harga item tidak boleh lebih kecil dari total yang sudah dibayar');return;}
const category=document.getElementById('renovItemCat').value;
const accountId=document.getElementById('renovItemAcc').value||D.accounts[0]?.id;
const tglBayar=document.getElementById('renovItemTglBayar').value||todayStr();
const note=document.getElementById('renovItemNote').value.trim();
const deductionOwnerSel=document.getElementById('renovItemDeductionOwner');
const deductionOwnerWrapEl=document.getElementById('renovItemDeductionOwnerWrap');
const deductionOwnerId=(deductionOwnerSel&&deductionOwnerWrapEl&&deductionOwnerWrapEl.style.display!=='none')?(deductionOwnerSel.value||''):'';
let calcDetail=null;
if(RenovCalc._pendingDetail&&Math.round(RenovCalc._pendingDetail.total)===Math.round(harga)){
calcDetail=RenovCalc._pendingDetail;
}
if(Renov.editItemId){
const it=p.items.find(x=>sameId(x.id,Renov.editItemId));
if(it){
it.name=name;it.ukuran=ukuran;it.harga=harga;it.hargaTotal=hargaTotal;it.category=category;it.accountId=accountId;it.note=note;it.tglBayar=tglBayar;
if(deductionOwnerId)it.deductionOwnerId=deductionOwnerId;else delete it.deductionOwnerId;
if(calcDetail){
if(it.calcDetail&&it.calcDetail.type==='absensi'&&it.calcDetail!==calcDetail){
Tukang.releaseEntries(it.calcDetail.entryIds);
}
it.calcDetail=calcDetail;
if(calcDetail.type==='absensi')Tukang.markUsed(calcDetail.entryIds,it.id);
}
if(it.paid&&it.txId&&!Array.isArray(it.payments)){
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
// Legacy cash transaction remains editable through FinanceTxSOT; installment history is immutable here.
// S2766: edit transaksi tertaut lewat FinanceTxSOT.updateById (bukan Object.assign langsung)
// supaya kanonikalisasi kategori/subkategori & batas SOT tetap berlaku.
const t=FinanceTxSOT.updateById(it.txId,{amount:harga,category:category||'Renovasi',accountId,date:tglBayar,note:'Renovasi: '+p.name+' - '+name+(note?' ('+note+')':''),deductionOwnerId:deductionOwnerId||undefined});
if(t){
it.paidDate=tglBayar;
if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'item-edit-paid',projectId:p.id,itemId:it.id,txId:t.id,amount:harga});
}
}
}
} else {
const newId=uid();
p.items.push({id:newId,name,ukuran,harga,hargaTotal,category,accountId,note,tglBayar,calcDetail,paid:false,txId:null,paidDate:null,deductionOwnerId:deductionOwnerId||undefined});
if(calcDetail&&calcDetail.type==='absensi')Tukang.markUsed(calcDetail.entryIds,newId);
}
RenovCalc._pendingDetail=null;
Renov.editItemId=null;
save();closeModal('renovItemModal');
Renov.render();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});
Renov.openDetail(p.id);
toast('✅ Item tersimpan');
},
togglePaid(projectId,itemId){
// Compatibility alias: all new cash/installment payments use one SOT-backed flow.
return Renov.openPayModal(projectId,itemId);
},
async deleteItem(projectId,itemId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,itemId));
if(!it)return;
const hasLinkedTx=!!(it.txId||(Array.isArray(it.payments)&&it.payments.some(pay=>pay&&pay.txId)));
const msg=hasLinkedTx?`Hapus item "${escapeHtml(it.name)}"? Semua transaksi pembayaran terkait di Keuangan akan ikut dihapus.`:`Hapus item "${escapeHtml(it.name)}"?`;
if(!await askConfirm(msg))return;
// BUGFIX (Bug E, s633, lihat AUDIT-s632-bugE-renovasi-delete-cascade.md):
// sebelum sesi ini, baris di bawah cuma D.transactions=D.transactions.
// filter(...) langsung -- BYPASS TOTAL cascade delTx() (stok sparepart/
// servis/BBM linked jadi orphan permanen). Fix: jalankan
// runTxDeleteCascades() (SSOT sama persis yg dipakai delTx(),
// tx-list-cashflow.js) DULU selagi transaksinya masih ada di
// D.transactions (beberapa cascade butuh state tsb), baru filter keluar.
// skipRenovCascade:true supaya TIDAK memanggil Renov.onLinkedTxDeleted(t)
// balik ke diri sendiri -- item ini SENDIRI sedang dihapus total
// (p.items=p.items.filter(...) di bawah), beda dari delTx() yang cuma
// mereset status lunas item (item tetap ada). Guard typeof: aman kalau
// urutan build.js berubah/tx-list-cashflow.js belum dimuat -- fallback ke
// perilaku lama (filter langsung, 0 error) daripada crash.
const linkedIds=[it.txId,...(Array.isArray(it.payments)?it.payments.map(pay=>pay&&pay.txId):[])].filter(Boolean);
if(linkedIds.length&&typeof FinanceTxSOT==='undefined')throw new Error('FINANCE_TX_SOT_REQUIRED');
linkedIds.forEach(txId=>{
const linkedTx=FinanceTxSOT.findById(txId);
if(linkedTx&&typeof runTxDeleteCascades==='function')runTxDeleteCascades(linkedTx,{skipRenovCascade:true});
if(linkedTx)FinanceTxSOT.removeById(txId);
});
if(it.calcDetail&&it.calcDetail.type==='absensi')Tukang.releaseEntries(it.calcDetail.entryIds);
p.items=p.items.filter(x=>!sameId(x.id,itemId));
save();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();Renov.renderDetail();
toast('🗑 Item dihapus');
},
onLinkedTxDeleted(t){
const p=D.renovProjects.find(x=>sameId(x.id,t.renovProjectLinkId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,t.renovItemLinkId));
if(!it)return;
if(t.renovPaymentId&&Array.isArray(it.payments)){
it.payments=it.payments.filter(pay=>!sameId(pay.id,t.renovPaymentId)&&!sameId(pay.txId,t.id));
it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
} else if(!Array.isArray(it.payments)){
it.paid=false;it.txId=null;it.paidDate=null;
}
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
},
onLinkedTxEdited(t){
const p=D.renovProjects.find(x=>sameId(x.id,t.renovProjectLinkId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,t.renovItemLinkId));
if(!it)return;
if(t.renovPaymentId&&Array.isArray(it.payments)){
const pay=it.payments.find(x=>sameId(x.id,t.renovPaymentId)||sameId(x.txId,t.id));
if(pay){pay.amount=Math.max(0,Number(t.amount)||0);pay.date=t.date;pay.accountId=t.accountId;}
it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
} else if(!Array.isArray(it.payments)){
it.harga=t.amount;it.category=t.category;it.accountId=t.accountId;it.paidDate=t.date;it.tglBayar=t.date;
}
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
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
const _linkPatch={renovProjectLinkId:p.id,renovItemLinkId:it.id};
if(it.deductionOwnerId&&!t.deductionOwnerId)_linkPatch.deductionOwnerId=it.deductionOwnerId;
else if(t.deductionOwnerId)it.deductionOwnerId=t.deductionOwnerId;
FinanceTxSOT.patchMetaById(t.id,_linkPatch);
Renov.editItemId=null;
save();closeModal('linkTxModal');closeModal('renovItemModal');
Renov.render();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});
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
