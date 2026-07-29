// global-search.js — Pencarian DATA milik user lintas halaman (openGlobalSearch/runGlobalSearch),
// beda tujuan dari Feature Search (dashboard-hub-search.js) yang cari FITUR/MENU. Dipisah dari
// features-aiwidget-reminder-gdrive-search.js (Sesi 5 restrukturisasi folder, blok 3 — lihat
// AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan ulang file, BUKAN perubahan perilaku.

let _globalSearchDebounce=null;
function openGlobalSearch(){
document.getElementById('globalSearchInput').value='';
document.getElementById('globalSearchResults').innerHTML='<div class="u-fs12 u-ctext3 u-tac" style="padding:16px 0">Ketik minimal 2 huruf untuk mulai mencari</div>';
openModal('globalSearchModal');
setTimeout(()=>document.getElementById('globalSearchInput').focus(),200);
}
function onGlobalSearchInput(){
clearTimeout(_globalSearchDebounce);
_globalSearchDebounce=setTimeout(runGlobalSearch,200);
}
function goToPageAndClose(page){
closeModal('globalSearchModal');
showPage(page);
}
function runGlobalSearch(){
const q=document.getElementById('globalSearchInput').value.trim().toLowerCase();
const resEl=document.getElementById('globalSearchResults');
if(q.length<2){resEl.innerHTML='<div class="u-fs12 u-ctext3 u-tac" style="padding:16px 0">Ketik minimal 2 huruf untuk mulai mencari</div>';return;}
const groups=[];
const txHits=D.transactions.filter(t=>(t.note||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q)||(t.subcategory||'').toLowerCase().includes(q)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
if(txHits.length)groups.push({title:'💸 Transaksi',page:'keuangan',items:txHits.map(t=>({label:t.note||t.category,sub:`${t.date} · ${t.category}${t.subcategory?' / '+t.subcategory:''}`,amount:(t.type==='income'?'+':'-')+fmt(t.amount)}))});
const billHits=D.bills.filter(b=>(b.name||'').toLowerCase().includes(q)).slice(0,8);
if(billHits.length)groups.push({title:'🧾 Tagihan/Cicilan/Langganan',page:'keuangan',items:billHits.map(b=>({label:b.name,sub:`Jatuh tempo ${b.nextDue} · ${b.freq}`,amount:fmt(b.amount)}))});
const prodHits=D.products.filter(p=>(p.name||'').toLowerCase().includes(q)).slice(0,8);
if(prodHits.length)groups.push({title:'🪨 Produk Shop',page:'shop',items:prodHits.map(p=>({label:p.name,sub:`Stok ${p.stock}`,amount:fmt(p.hargaJual)}))});
const shopHits=D.cobek.filter(t=>t.customer&&(t.customer.name||'').toLowerCase().includes(q)).slice(0,8);
if(shopHits.length)groups.push({title:'🛒 Transaksi Shop',page:'shop',items:shopHits.map(t=>({label:t.customer.name,sub:t.date,amount:fmt(t.total)}))});
const servisHits=D.servisLogs.filter(s=>(s.item||'').toLowerCase().includes(q)||(s.note||'').toLowerCase().includes(q)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
if(servisHits.length)groups.push({title:'🔧 Catatan Servis',page:'carnotes',items:servisHits.map(s=>({label:s.item,sub:s.date,amount:fmt(s.cost)}))});
const bbmHits=D.bbmLogs.filter(b=>(b.spbu||'').toLowerCase().includes(q)||(b.note||'').toLowerCase().includes(q)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
if(bbmHits.length)groups.push({title:'⛽ Catatan BBM',page:'carnotes',items:bbmHits.map(b=>({label:b.spbu||'BBM',sub:b.date,amount:fmt(b.cost)}))});
const targetHits=D.targets.filter(t=>(t.name||'').toLowerCase().includes(q)).slice(0,8);
if(targetHits.length)groups.push({title:'🎯 Target Tabungan',page:'settings',items:targetHits.map(t=>({label:t.name,sub:`${Math.round((t.saved/t.amount)*100)}% tercapai`,amount:fmt(t.amount)}))});
const eduFundHits=(D.eduFunds||[]).filter(f=>(f.name||'').toLowerCase().includes(q)).slice(0,8);
if(eduFundHits.length)groups.push({title:'🎓 Dana Pendidikan',page:'settings',items:eduFundHits.map(f=>{const c=EduFund.calc(f);return{label:f.name,sub:`Target ${f.tahunTarget} · nabung ~${fmt(c.pmtBulanan)}/bln`,amount:fmt(c.fv)};})});
const sewaKiosHits=((D.sewaKios&&D.sewaKios.units)||[]).filter(u=>(u.name||'').toLowerCase().includes(q)||(u.penyewa||'').toLowerCase().includes(q)).slice(0,8);
if(sewaKiosHits.length)groups.push({title:'🏪 Sewa Kios',page:'keuangan',items:sewaKiosHits.map(u=>({label:u.name,sub:u.status==='disewa'?('Disewa: '+(u.penyewa||'-')):'Kosong',amount:fmt(u.hargaSewaBulanan||0)}))});
if(!groups.length){resEl.innerHTML='<div class="empty" style="padding:16px 0"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada hasil untuk "'+escapeHtml(q)+'"</div></div>';return;}
resEl.innerHTML=groups.map(g=>`
    <div class="u-fs12 u-fw700 u-t2 u-pointer" style="margin:10px 0 6px" data-action="goToPageAndClose" data-args="${escapeHtml(JSON.stringify([g.page]))}">${g.title}</div>
    ${g.items.map(it=>`<div class="tx-item u-pointer" data-action="goToPageAndClose" data-args="${escapeHtml(JSON.stringify([g.page]))}">
      <div class="tx-info"><div class="tx-name">${escapeHtml(it.label)}</div><div class="tx-meta">${escapeHtml(it.sub)}</div></div>
      <div class="tx-amount">${escapeHtml(it.amount)}</div>
    </div>`).join('')}
  `).join('');
}
/* moved to modules-render.js: renderGDriveSettings */
