// linktx.js — Transaksi tertaut (LinkTx): hubungkan transaksi lama di Keuangan ke Renov/Wishlist/Bill
// Dipindah ke modules/finance/linktx.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: modul LinkTx dipindah ke file baru ini dari features-edukasi-pajak-utang-sewakios.js (v61).
// File lama (features-edukasi-pajak-utang-sewakios.js) DIHAPUS setelah ini karena tidak ada isi tersisa.
// LinkTx dipakai sbg utility umum "hubungkan transaksi lama" dari 3 domain beda (bukan "milik" 1 domain
// tunggal): Renov (renovasi.js) & WorthIt (worthit.js) dan Bill (piutang-utang.js).
// Semua pemanggilan LinkTx.xxx() dari file lain lewat variabel global saat runtime (klik tombol modal),
// bukan referensi lokal ke file — jadi aman dipindah ke file sendiri.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const LinkTx={
ctx:null,
targetId:null,
selected:new Set(),
lastBatch:null,
_cfg(){
if(LinkTx.ctx==='renov'){
const p=D.renovProjects.find(x=>sameId(x.id,LinkTx.targetId));
return{
desc:'Pilih transaksi pengeluaran yang sudah tercatat di Keuangan (misal dibuat sebelum fitur Renov ini ada). Tiap transaksi otomatis jadi 1 item renovasi (langsung lunas) di proyek "'+escapeHtml(p?p.name:'-')+'" — <b>TIDAK</b> ada transaksi baru dibuat, jadi tidak dobel.',
confirmLabel:'🔗 Hubungkan Terpilih jadi Item Renovasi',
confirmNote:'Setiap transaksi akan otomatis jadi 1 item renovasi (langsung berstatus lunas).'
};
}
if(LinkTx.ctx==='wishlist'){
return{
desc:'Pilih transaksi pengeluaran yang sudah tercatat di Keuangan (misal barang yg sudah dibeli sebelum dicatat di Prioritas Belanja). Tiap transaksi otomatis jadi 1 barang berstatus "✅ Sudah Beli" — <b>TIDAK</b> ada transaksi baru dibuat.',
confirmLabel:'🔗 Hubungkan Terpilih jadi "Sudah Beli"',
confirmNote:'Setiap transaksi akan otomatis jadi 1 barang berstatus "Sudah Beli" di Prioritas Belanja.'
};
}
if(LinkTx.ctx==='bill'){
const b=D.bills.find(x=>sameId(x.id,LinkTx.targetId))||(D.billsArchive||[]).find(x=>sameId(x.id,LinkTx.targetId));
return{
desc:'Pilih transaksi pengeluaran yang sudah tercatat di Keuangan (misal dibayar manual sebelum tagihan "'+escapeHtml(b?b.name:'-')+'" ini dibuat). Transaksi akan ditandai sbg riwayat pembayaran tagihan ini — <b>TIDAK</b> ada transaksi baru dibuat.',
confirmLabel:'🔗 Hubungkan jadi Riwayat Pembayaran',
confirmNote:'Setiap transaksi akan otomatis masuk sbg riwayat pembayaran tagihan ini.'
};
}
return{desc:'',confirmLabel:'🔗 Hubungkan Terpilih',confirmNote:''};
},
open(ctx,targetId){
LinkTx.ctx=ctx;LinkTx.targetId=targetId;LinkTx.selected=new Set();
document.getElementById('linkTxSuccessBox').style.display='none';
document.getElementById('linkTxFilterBox').style.display='block';
const search=document.getElementById('linkTxSearch');if(search)search.value='';
const dari=document.getElementById('linkTxDari');if(dari)dari.value='';
const sampai=document.getElementById('linkTxSampai');if(sampai)sampai.value='';
const descEl=document.getElementById('linkTxModalDesc');
if(descEl)descEl.innerHTML=LinkTx._cfg().desc;
const kat=document.getElementById('linkTxKat');
if(kat){
kat.innerHTML='<option value="semua">Semua</option>'+getCatsByType('expense').map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.emoji||'')} ${escapeHtml(c.name)}</option>`).join('');
kat.value='semua';
}
const akun=document.getElementById('linkTxAkun');
if(akun){
akun.innerHTML='<option value="semua">Semua Akun</option>'+(D.accounts||[]).map(a=>`<option value="${a.id}">${a.emoji||''} ${escapeHtml(a.name)}</option>`).join('');
akun.value='semua';
}
LinkTx.onKatChange();
openModal('linkTxModal');
},
onKatChange(){
const kat=document.getElementById('linkTxKat');
const sub=document.getElementById('linkTxSub');
if(!kat||!sub)return;
const cat=getCatsByType('expense').find(c=>c.name===kat.value);
sub.innerHTML='<option value="semua">Semua</option>'+((cat&&cat.subs)||[]).map(s=>`<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
sub.value='semua';
LinkTx.renderList();
},
_alreadyLinked(t){
return !!(t.renovItemLinkId||t.wishlistLinkId||t.billLinkId);
},
toggleSelect(txId){
txId=String(txId);
if(LinkTx.selected.has(txId))LinkTx.selected.delete(txId);
else LinkTx.selected.add(txId);
},
_getFiltered(q){
q=(q!==undefined?q:(document.getElementById('linkTxSearch')||{}).value||'').toLowerCase().trim();
const katSel=(document.getElementById('linkTxKat')||{}).value||'semua';
const subSel=(document.getElementById('linkTxSub')||{}).value||'semua';
const dari=(document.getElementById('linkTxDari')||{}).value||'';
const sampai=(document.getElementById('linkTxSampai')||{}).value||'';
const akunSel=(document.getElementById('linkTxAkun')||{}).value||'semua';
return (D.transactions||[])
.filter(t=>t.type==='expense'&&!LinkTx._alreadyLinked(t))
.filter(t=>katSel==='semua'||t.category===katSel)
.filter(t=>subSel==='semua'||t.subcategory===subSel)
.filter(t=>!dari||(t.date||'')>=dari)
.filter(t=>!sampai||(t.date||'')<=sampai)
.filter(t=>akunSel==='semua'||String(t.accountId)===String(akunSel))
.filter(t=>{
if(!q)return true;
return (t.note||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q)||String(t.amount||'').includes(q)||(t.date||'').includes(q);
})
.sort((a,b)=>(b.date||'').localeCompare(a.date||''))
.slice(0,2000);
},
selectAllMatching(){
const list=LinkTx._getFiltered();
list.forEach(t=>LinkTx.selected.add(String(t.id)));
LinkTx.renderList();
toast(`☑️ ${list.length} transaksi dipilih`);
},
clearSelection(){
LinkTx.selected=new Set();
LinkTx.renderList();
},
renderList(q){
const el=document.getElementById('linkTxList');
if(!el)return;
const list=LinkTx._getFiltered(q);
if(!list.length){
el.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada transaksi cocok</div></div>';
} else {
el.innerHTML=list.map(t=>{
const acc=D.accounts.find(a=>a.id===t.accountId);
const checked=LinkTx.selected.has(String(t.id))?'checked':'';
return`<div class="tx-item u-pointer" data-action="LinkTx.toggleSelectAndRender" data-args="${escapeHtml(JSON.stringify([t.id]))}">
          <input type="checkbox" ${checked} style="width:18px;height:18px;margin-right:4px" data-stop="1" data-action="LinkTx.toggleSelectAndRender" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Pilih transaksi ${escapeHtml(t.note||t.category||'ini')} untuk ditautkan">
          <div class="tx-icon" style="background:var(--accent2-soft)">💸</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(t.note||t.category||'Transaksi')}</div>
            <div class="tx-meta">${escapeHtml(t.date||'')} ${acc?'· '+escapeHtml(acc.name):''} ${t.subcategory?'· '+escapeHtml(t.subcategory):''}</div>
          </div>
          <div class="tx-amount red">${fmt(t.amount)}</div>
        </div>`;
}).join('');
}
LinkTx.updatePreview();
},
toggleSelectAndRender(txId){
LinkTx.toggleSelect(txId);
LinkTx.renderList();
},
updatePreview(){
const ids=Array.from(LinkTx.selected);
const total=ids.reduce((s,id)=>{const t=D.transactions.find(x=>sameId(x.id,id));return s+(t?(t.amount||0):0);},0);
const bar=document.getElementById('linkTxPreviewText');
const btn=document.getElementById('linkTxConfirmBtn');
if(bar)bar.textContent=ids.length?`☑️ ${ids.length} transaksi dipilih · Total ${fmtFull(total)}`:'Belum ada transaksi dipilih';
if(btn){
btn.disabled=!ids.length;
btn.style.opacity=ids.length?'1':'0.5';
btn.textContent=LinkTx._cfg().confirmLabel;
}
},
_createFromTx(t){
if(LinkTx.ctx==='renov'){
const p=D.renovProjects.find(x=>sameId(x.id,LinkTx.targetId));
if(!p)return null;
const it={id:uid(),name:t.note||t.category||'Item Renovasi',note:'',paid:true,txId:t.id,paidDate:t.date,harga:t.amount,category:t.category,accountId:t.accountId,tglBayar:t.date};
p.items.push(it);
t.renovProjectLinkId=p.id;t.renovItemLinkId=it.id;
return{kind:'renov',projectId:p.id,itemId:it.id,txId:t.id,amount:t.amount};
}
if(LinkTx.ctx==='wishlist'){
const it={id:uid(),name:t.note||t.category||'Barang',price:t.amount,isDiskon:false,hargaNormal:0,cat:'kebutuhan',urgensi:'mendesak',sudahPunya:false,sudahPunyaAlasan:'',createdAt:t.date?new Date(t.date).toISOString():new Date().toISOString(),bought:true,boughtDate:t.date,txId:t.id};
D.wishlist.push(it);
t.wishlistLinkId=it.id;
return{kind:'wishlist',itemId:it.id,txId:t.id,amount:t.amount};
}
if(LinkTx.ctx==='bill'){
const b=D.bills.find(x=>sameId(x.id,LinkTx.targetId))||(D.billsArchive||[]).find(x=>sameId(x.id,LinkTx.targetId));
if(!b)return null;
t.billLinkId=b.id;
return{kind:'bill',billId:b.id,txId:t.id,amount:t.amount};
}
return null;
},
_undoEntry(e){
const t=D.transactions.find(x=>sameId(x.id,e.txId));
if(e.kind==='renov'){
const p=D.renovProjects.find(x=>sameId(x.id,e.projectId));
if(p)p.items=p.items.filter(i=>!sameId(i.id,e.itemId));
if(t){delete t.renovProjectLinkId;delete t.renovItemLinkId;}
} else if(e.kind==='wishlist'){
D.wishlist=D.wishlist.filter(x=>!sameId(x.id,e.itemId));
if(t)delete t.wishlistLinkId;
} else if(e.kind==='bill'){
if(t)delete t.billLinkId;
}
},
_refreshCtxUI(){
if(LinkTx.ctx==='renov'){
if(typeof Renov!=='undefined'){
Renov.render();
if(sameId(Renov.curId,LinkTx.targetId))Renov.renderDetail();
}
renderDashboard();renderKeuangan();
} else if(LinkTx.ctx==='wishlist'){
WorthIt.renderList();
if(typeof WorthIt.renderBoughtList==='function')WorthIt.renderBoughtList();
} else if(LinkTx.ctx==='bill'){
if(typeof refreshBillEverywhere==='function')refreshBillEverywhere();
renderDashboard();renderKeuangan();
}
},
async confirmBulk(){
const ids=Array.from(LinkTx.selected);
if(!ids.length){toast('⚠️ Belum ada transaksi dipilih');return;}
const cfg=LinkTx._cfg();
const total=ids.reduce((s,id)=>{const t=D.transactions.find(x=>sameId(x.id,id));return s+(t?(t.amount||0):0);},0);
if(!await askConfirm(`Hubungkan ${ids.length} transaksi terpilih (total ${fmtFull(total)})? ${cfg.confirmNote} TIDAK ada transaksi baru yang dibuat.`,{okText:'Ya, Hubungkan',icon:'🔗',danger:false}))return;
const entries=[];
ids.forEach(txId=>{
const t=D.transactions.find(x=>sameId(x.id,txId));
if(!t||LinkTx._alreadyLinked(t))return;
const entry=LinkTx._createFromTx(t);
if(entry)entries.push(entry);
});
if(!entries.length){toast('⚠️ Tidak ada transaksi yang berhasil dihubungkan');return;}
save();
LinkTx.lastBatch={ctx:LinkTx.ctx,targetId:LinkTx.targetId,entries,count:entries.length,total:entries.reduce((s,e)=>s+(e.amount||0),0)};
LinkTx.selected=new Set();
LinkTx._refreshCtxUI();
document.getElementById('linkTxFilterBox').style.display='none';
const box=document.getElementById('linkTxSuccessBox');
box.style.display='block';
document.getElementById('linkTxSuccessTitle').textContent=`${entries.length} transaksi berhasil dihubungkan`;
document.getElementById('linkTxSuccessSub').textContent=`Total ${fmtFull(LinkTx.lastBatch.total)}. Salah pilih? Bisa diurungkan — transaksi ASLI di Keuangan tetap aman, tidak ikut terhapus.`;
toast(`🔗 ${entries.length} transaksi dihubungkan`);
},
async undo(){
const batch=LinkTx.lastBatch;
if(!batch){toast('⚠️ Tidak ada link yang bisa diurungkan');return;}
if(!await askConfirm(`Urungkan link ${batch.count} transaksi ini? Transaksi ASLI di Keuangan TIDAK akan dihapus, cuma tautannya yang dilepas.`,{okText:'Ya, Urungkan',icon:'↺',danger:false}))return;
batch.entries.forEach(e=>LinkTx._undoEntry(e));
save();
const savedCtx=LinkTx.ctx,savedTarget=LinkTx.targetId;
LinkTx.ctx=batch.ctx;LinkTx.targetId=batch.targetId;
LinkTx._refreshCtxUI();
LinkTx.ctx=savedCtx;LinkTx.targetId=savedTarget;
LinkTx.lastBatch=null;
document.getElementById('linkTxSuccessBox').style.display='none';
document.getElementById('linkTxFilterBox').style.display='block';
LinkTx.renderList();
toast('↺ Link dibatalkan, transaksi asli di Keuangan tetap ada');
},
finish(){
closeModal('linkTxModal');
LinkTx.lastBatch=null;
}
};
