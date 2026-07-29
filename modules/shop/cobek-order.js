// cobek-order.js — Domain Shop bagian order & pelanggan: Produsen (supplier), SiapPulang
// Dipindah ke modules/shop/cobek-order.js (Sesi 10 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// (status siap diambil/dikirim), Order (order pelanggan), Laporan (omzet), Pelanggan
// (data & riwayat pelanggan). Bagian ke-3 dari 5 hasil pemecahan cobek.js — lihat catatan
// urutan load di cobek-etalase.js.

// syncPiutangFinanceViews() — Sesi 225-226 (dedup side-effect payment): satu
// helper bersama utk fan-out render/refresh finance yang SAMA PERSIS dipicu
// tiap status piutang berubah (lunas/refund) — sebelumnya dituliskan ulang
// di 2 tempat terpisah dgn urutan+guard typeof yang identik: Laporan.delete()
// (di file ini) & BusinessFlowPresenter.markPaymentReceived()
// (business-flow-presenter.js, S209-210/S213-214). TIDAK ADA guard/fungsi
// yang dihapus atau ditambah, 0 logic baru — murni dipindah ke 1 tempat
// supaya tidak dobel-tulis 2x di 2 file.
function syncPiutangFinanceViews(){
if(typeof renderKeuangan==='function')renderKeuangan();
if(typeof PiutangUtangInsight!=='undefined'&&PiutangUtangInsight.render)PiutangUtangInsight.render();
if(typeof renderDashboard==='function')renderDashboard();
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
if(typeof Piutang!=='undefined'&&Piutang.renderList)Piutang.renderList();
}

const Produsen={
editId:null,
hargaEditId:null,
openModal(id){
this.editId=id||null;
const isEdit=!!this.editId;
const pr=isEdit?D.produsen.find(x=>x.id===this.editId):null;
document.getElementById('produsenModalTitle').textContent=isEdit?'Edit Produsen':'Tambah Produsen';
document.getElementById('prName').value=pr?pr.name:'';
document.getElementById('prContact').value=pr?(pr.contact||''):'';
document.getElementById('prNote').value=pr?(pr.note||''):'';
openModal('produsenModal');
},
save(){
const name=document.getElementById('prName').value.trim();
const contact=document.getElementById('prContact').value.trim();
const note=document.getElementById('prNote').value.trim();
if(!name){toast('⚠️ Nama produsen wajib diisi');return;}
if(this.editId){
const pr=D.produsen.find(x=>x.id===this.editId);
if(pr)Object.assign(pr,{name,contact,note});
} else {
D.produsen.push({id:'prd_'+Date.now(),name,contact,note});
}
this.editId=null;
save();closeModal('produsenModal');this.renderList();toast('✅ Produsen disimpan');
},
async delete(id){
if(!await askConfirm('Hapus produsen ini? Harga yang sudah tercatat di produk tidak akan terhapus otomatis.'))return;
D.produsen=D.produsen.filter(x=>x.id!==id);
D.products.forEach(p=>{if(p.produsenId===id)p.produsenId='';});
save();this.renderList();toast('🗑 Produsen dihapus');
},
renderList(){
const el=document.getElementById('produsenList');
if(!el)return;
if(!D.produsen.length){el.innerHTML='<div class="empty"><div class="empty-icon">🏭</div><div class="empty-text">Belum ada produsen</div></div>';return;}
el.innerHTML=D.produsen.map(pr=>{
const products=D.products.filter(p=>p.hargaByProdusen&&p.hargaByProdusen[pr.id]!==undefined);
const hargaInfo=products.length?products.map(p=>`${escapeHtml(p.name)}: ${fmt(p.hargaByProdusen[pr.id])}`).join(', '):'Belum ada harga produk';
// kw192-ongkir-produsen-pref: tampilkan rute Etape1 tersimpan (kalau ada) sbg info tambahan
const ruteInfo=pr.jarakKm>0?`📍 ${pr.jarakKm} km${pr.biayaPerKm>0?' × '+fmt(pr.biayaPerKm)+'/km':''} · `:'';
return`<div class="tx-item">
        <div class="tx-icon" style="background:var(--accent2-soft)">🏭</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(pr.name)}</div><div class="tx-meta">${pr.contact?'📞 '+escapeHtml(pr.contact)+' · ':''}${ruteInfo}${escapeHtml(hargaInfo)}</div></div>
        <button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openProdusenModal" data-args="${escapeHtml(JSON.stringify([pr.id]))}" aria-label="Edit/Buka">✏️</button>
        <button class="tx-del" data-action="openProdusenActionsMenu" data-args="${escapeHtml(JSON.stringify([pr.id]))}" aria-label="Aksi lainnya">⋮</button>
      </div>`;
}).join('');
},
// openProdusenActionsMenu(id) — menu overflow "⋮" utk aksi sekunder kartu produsen
// (audit tab lain, lanjutan S304: pola SAMA PERSIS openBillActionsMenu() di
// tagihan-kalender.js — Edit tetap tampil langsung di kartu krn paling sering
// dipakai, 💰 Atur Harga & 🗑 Hapus dipindah ke sini). Modal qsProdusenActions
// baru (HTML), reuse penuh class .bill-action-row/.qs-modal-overlay yg sudah ada.
openProdusenActionsMenu(id){
const pr=D.produsen.find(x=>x.id===id);
if(!pr)return;
document.getElementById('produsenActionsTitle').textContent=`🏭 ${pr.name}`;
document.getElementById('produsenActionsList').innerHTML=`
    <div class="bill-action-row" data-action="produsenActionHarga" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon u-cacc3">💰</span> Atur Harga</div>
    <div class="bill-action-row danger" data-action="produsenActionDelete" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon">🗑</span> Hapus</div>`;
openQS('qsProdusenActions');
},
openHargaModal(produsenId){
this.hargaEditId=produsenId;
const pr=D.produsen.find(x=>x.id===produsenId);
if(!pr)return;
document.getElementById('produsenHargaTitle').textContent='Atur Harga — '+pr.name;
const el=document.getElementById('produsenHargaList');
if(!D.products.length){
el.innerHTML='<div class="empty"><div class="empty-text">Belum ada produk di Etalase</div></div>';
} else {
el.innerHTML=D.products.map(p=>{
const harga=(p.hargaByProdusen&&p.hargaByProdusen[produsenId]!==undefined)?p.hargaByProdusen[produsenId]:'';
return`<div class="fg"><label class="fl">${escapeHtml(p.name)} <span class="u-t2">(harga jual ${fmt(p.hargaJual)})</span></label><input type="number" class="fi" data-prod-id="${p.id}" placeholder="Harga beli dari ${escapeHtml(pr.name)}" value="${harga}"></div>`;
}).join('');
}
openModal('produsenHargaModal');
},
saveHarga(){
if(!this.hargaEditId)return;
const inputs=document.querySelectorAll('#produsenHargaList input[data-prod-id]');
inputs.forEach(inp=>{
const p=D.products.find(x=>x.id===inp.getAttribute('data-prod-id'));
if(!p)return;
if(!p.hargaByProdusen)p.hargaByProdusen={};
const val=parseFloat(inp.value);
if(val>0)p.hargaByProdusen[this.hargaEditId]=val;
else delete p.hargaByProdusen[this.hargaEditId];
});
save();closeModal('produsenHargaModal');this.renderList();renderProductList();toast('✅ Harga produsen disimpan');
}
};

const SiapPulang={
toggleDeliveredField(){
const cb=document.getElementById('oDelivered');
const lbl=document.getElementById('oDeliveredLbl');
if(!cb||!lbl)return;
lbl.textContent=cb.checked?'✅ Sudah diserahkan ke pelanggan':'📦 Belum diserahkan (akan dibawa pulang)';
},
markDelivered(id){
const t=D.cobek.find(x=>x.id===id);
if(!t)return;
t.delivered=true;
save();this.render();renderShop();renderShopRecent();
if(typeof renderDashboard==='function')renderDashboard();
if(typeof BusinessFlowPresenter!=='undefined'){BusinessFlowPresenter.renderTab();BusinessFlowPresenter.markRealized(id);}
if(typeof ShopInsight!=='undefined')ShopInsight.render();
toast('✅ Ditandai sudah diserahkan');
},
render(){
const wrap=document.getElementById('siapPulangCard');
if(!wrap)return;
const pending=D.cobek.filter(c=>c.items && c.delivered===false);
if(!pending.length){wrap.style.display='none';wrap.innerHTML='';return;}
wrap.classList.remove('u-dnone');wrap.style.display='block';
const totalItems={};
pending.forEach(c=>c.items.forEach(i=>{totalItems[i.name]=(totalItems[i.name]||0)+i.qty;}));
const checklistHTML=Object.entries(totalItems).map(([name,qty])=>`<div class="siap-pulang-item"><span class="u-fs18">🪨</span><div class="u-flex1 u-fs13 u-fw600">${escapeHtml(name)}</div><span class="acc-chip">${qty}x</span></div>`).join('');
const ordersHTML=pending.map(c=>`
      <div class="siap-pulang-item">
        <div class="u-flex1">
          <div class="u-fs13 u-fw600">${c.customer&&c.customer.name?escapeHtml(c.customer.name):'Pelanggan'} · ${escapeHtml(c.items.map(i=>i.name+' x'+i.qty).join(', '))}</div>
          <div class="u-fs12t2">${c.date}${c.customer&&c.customer.phone?' · '+escapeHtml(c.customer.phone):''}</div>
        </div>
        <button class="btn btn-sm btn-primary" data-action="markShopDelivered" data-args="${escapeHtml(JSON.stringify([c.id]))}" aria-label="Hapus">✅ Sudah</button>
      </div>`).join('');
wrap.innerHTML=`
      <div class="card-title">📦 Siap Pulang — Barang Dibawa</div>
      <div class="u-fs12 u-t2 u-mb8">Pre-order pelanggan yang belum diserahkan. Pastikan dibawa pas pulang ke Pekalongan ya!</div>
      ${checklistHTML}
      <div class="div"></div>
      ${ordersHTML}
    `;
}
};

const Order={
items:[],
editId:null,
populateProductSelect(){
const sel=document.getElementById('oProductSelect');
if(!sel)return;
sel.innerHTML=D.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.stock})</option>`).join('')||'<option value="">Belum ada produk di etalase</option>';
},
openModal(){
if(!D.products.length){toast('⚠️ Tambah produk di Etalase dulu');return;}
Order.editId=null;
Order.items=[];
document.getElementById('oDate').value=new Date().toISOString().split('T')[0];
['oCustName','oCustPhone','oCustAddr','oNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('oDiskon').value='';
document.getElementById('oOngkir').value='';
if(document.getElementById('oDP'))document.getElementById('oDP').value='';
document.getElementById('oPriceType').value='jual';
const oCustHintEl=document.getElementById('oCustHint'); if(oCustHintEl){oCustHintEl.style.display='none';oCustHintEl.innerHTML='';}
const oDeliveredEl=document.getElementById('oDelivered'); if(oDeliveredEl){oDeliveredEl.checked=true;toggleOrderDeliveredField();}
const oAccEl=document.getElementById('oAcc');
if(oAccEl) oAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
Order.populateProductSelect();
Order.renderItems();
const titleEl=document.getElementById('orderModalTitle');if(titleEl)titleEl.textContent='Transaksi Baru';
const delBtn=document.getElementById('orderDelBtn');if(delBtn)delBtn.style.display='none';
// S237: transaksi baru belum punya cobekId -> tampilkan chain kosong (tidak ada status
// aktif yang di-highlight), reuse BusinessFlowPresenter.renderLifecycle() apa adanya.
if(typeof BusinessFlowPresenter!=='undefined'){BusinessFlowPresenter.renderLifecycle(null);BusinessFlowPresenter.renderProfitSummary(null);}
openModal('orderModal');
},
// kw-shop-edit: buka modal orderModal dalam mode edit (isi ulang form dari data D.cobek yang
// sudah ada, lalu saat Simpan _saveInner memanggil recordShopSale() dengan existingShopId ->
// engine yang sama persis dipakai applyTxShopSaleFromTx() utk update in-place, TIDAK ada
// formula/kalkulasi baru). Transaksi Shop lama tanpa field items[] (format "data lama") belum
// bisa diedit di sini -- hapus & catat ulang.
openEditModal(id){
if(!D.products.length){toast('⚠️ Tambah produk di Etalase dulu');return;}
const t=D.cobek.find(x=>x.id===id);
if(!t){toast('⚠️ Transaksi tidak ditemukan');return;}
if(!t.items||!t.items.length){toast('⚠️ Transaksi lama (format lama) belum bisa diedit di sini — hapus & catat ulang kalau perlu koreksi.');return;}
Order.editId=id;
Order.items=t.items.map(it=>({productId:it.productId,qty:it.qty,hargaOverride:(it.harga!=null?it.harga:null)}));
document.getElementById('oDate').value=t.date||new Date().toISOString().split('T')[0];
document.getElementById('oCustName').value=(t.customer&&t.customer.name)||'';
document.getElementById('oCustPhone').value=(t.customer&&t.customer.phone)||'';
document.getElementById('oCustAddr').value=(t.customer&&t.customer.address)||'';
document.getElementById('oNote').value=t.note||'';
document.getElementById('oDiskon').value=t.diskon||'';
document.getElementById('oOngkir').value=t.ongkir||'';
if(document.getElementById('oDP')){
// kw-shop-dp: kalau ada Piutang terhubung, DP yg sudah masuk = Total tercatat - sisa Piutang.
// Tidak ada Piutang terhubung = dianggap lunas penuh dulu, field dikosongkan (biar default = Total).
const linkedPiutang=t.piutangLinkId?D.piutang.find(p=>p.id===t.piutangLinkId):null;
document.getElementById('oDP').value=linkedPiutang?Math.max(0,(t.total||0)-linkedPiutang.nilai):'';
}
document.getElementById('oPriceType').value=t.priceType==='reseller'?'reseller':'jual';
const oCustHintEl=document.getElementById('oCustHint'); if(oCustHintEl){oCustHintEl.style.display='none';oCustHintEl.innerHTML='';}
const oDeliveredEl=document.getElementById('oDelivered'); if(oDeliveredEl){oDeliveredEl.checked=t.delivered!==false;toggleOrderDeliveredField();}
const oAccEl=document.getElementById('oAcc');
if(oAccEl){oAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');if(t.accountId)oAccEl.value=t.accountId;}
Order.populateProductSelect();
Order.renderItems();
const titleEl=document.getElementById('orderModalTitle');if(titleEl)titleEl.textContent='Edit Transaksi';
const delBtn=document.getElementById('orderDelBtn');if(delBtn)delBtn.style.display='flex';
// S237: reuse BusinessFlowPresenter.renderLifecycle() apa adanya — status aktif
// diturunkan dari orderStatus(id) (delivered/paid, S209-210), 0 field D baru.
if(typeof BusinessFlowPresenter!=='undefined'){BusinessFlowPresenter.renderLifecycle(id);BusinessFlowPresenter.renderProfitSummary(id);}
openModal('orderModal');
},
async deleteFromModal(){
if(!Order.editId)return;
const before=D.cobek.length;
await Laporan.delete(Order.editId);
if(D.cobek.length<before){Order.editId=null;closeModal('orderModal');}
},
addItem(){
const pid=document.getElementById('oProductSelect').value;
const product=D.products.find(p=>p.id===pid);
if(!product){toast('⚠️ Pilih produk');return;}
const existing=Order.items.find(i=>i.productId===pid);
if(existing)existing.qty+=1;
else Order.items.push({productId:pid,qty:1,hargaOverride:null});
Order.renderItems();
},
updateItemHarga(idx,val){
const h=parseFloat(val);
if(!Order.items[idx])return;
Order.items[idx].hargaOverride=(h>0)?h:null;
const{total,profit}=Order.computeTotals();
document.getElementById('oTotalDisplay').textContent=fmtFull(total);
document.getElementById('oProfitDisplay').textContent='Estimasi untung: '+fmtFull(profit);
},
changeQty(idx,delta){
Order.items[idx].qty+=delta;
if(Order.items[idx].qty<=0)Order.items.splice(idx,1);
Order.renderItems();
},
removeItem(idx){Order.items.splice(idx,1);Order.renderItems();},
computeTotals(){
const priceType=document.getElementById('oPriceType').value;
let subtotal=0,modal=0;
const lines=Order.items.map(it=>{
const p=D.products.find(x=>x.id===it.productId);
if(!p)return null;
let hargaDefault=priceType==='reseller'&&p.hargaReseller?p.hargaReseller:p.hargaJual;
if(p.diskonPersen)hargaDefault=hargaDefault-(hargaDefault*p.diskonPersen/100);
const harga=(it.hargaOverride!=null&&it.hargaOverride>0)?it.hargaOverride:hargaDefault;
const lineTotal=harga*it.qty;
subtotal+=lineTotal;modal+=p.hargaBeli*it.qty;
return{...it,product:p,harga,hargaDefault,lineTotal};
}).filter(Boolean);
const diskon=parseFloat(document.getElementById('oDiskon').value)||0;
const ongkir=parseFloat(document.getElementById('oOngkir').value)||0;
const total=Math.max(0,subtotal-diskon)+ongkir;
const profit=subtotal-modal-diskon;
return{lines,subtotal,modal,diskon,ongkir,total,profit};
},
renderItems(){
const{lines,total,profit}=Order.computeTotals();
const el=document.getElementById('orderItemList');
el.innerHTML=lines.length?lines.map((l,i)=>{
// Reko harga (kw194-kasir-order-pricereko): pakai rumus PriceRekoWidget yg sama dgn widget
// "🤖 Rekomendasi Harga Jual AI" di Etalase, biar kelihatan di titik jual (bukan cuma pas
// buka Etalase) kalau Harga Jual produk ini sudah menyimpang jauh dari estimasi.
const priceChk=(typeof PriceRekoWidget!=='undefined')?PriceRekoWidget.checkOne(l.product):null;
const priceHint=priceChk?`<div class="u-mt2" style="font-size:11px;color:${priceChk.diffPct<0?'var(--accent2)':'var(--accent4)'};font-weight:600">${priceChk.diffPct<0?'⬇️':'⬆️'} Reko Etalase: ${fmt(priceChk.reko)} <span class="u-t2" style="font-weight:400;cursor:pointer;text-decoration:underline" data-action="openPriceRekoWidgetDetail" data-args="${escapeHtml(JSON.stringify([l.productId]))}">detail →</span></div>`:'';
return`
      <div class="tx-item">
        <div class="tx-icon u-bgaccsoft">🪨</div>
        <div class="tx-info">
          <div class="tx-name">${escapeHtml(l.product.name)}</div>
          <div class="tx-meta u-flex u-aic u-gap4" style="margin-top:3px">
            <input type="number" class="fi u-fs12" value="${l.harga}" oninput="updateOrderItemHarga(${i},this.value)" placeholder="${l.hargaDefault}" inputmode="numeric" style="width:90px;padding:5px 7px" title="Harga bisa diedit manual per transaksi (mis. nego/diskon)">
            <span>x ${l.qty}${l.hargaOverride!=null&&l.hargaOverride>0&&l.hargaOverride!==l.hargaDefault?' <span class="u-cacc4">(diedit, default '+fmt(l.hargaDefault)+')</span>':''}</span>
          </div>
          ${priceHint}
        </div>
        <div class="u-flex u-aic u-gap6">
          <button class="btn btn-ghost btn-sm" style="padding:4px 10px" data-action="changeOrderQty" data-args="${escapeHtml(JSON.stringify([i, -1]))}" aria-label="Kurangi jumlah">−</button>
          <span class="u-fw700">${l.qty}</span>
          <button class="btn btn-ghost btn-sm" style="padding:4px 10px" data-action="changeOrderQty" data-args="${escapeHtml(JSON.stringify([i, 1]))}" aria-label="Tambah jumlah">+</button>
        </div>
        <button class="tx-del" data-action="removeOrderItem" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join(''):'<div class="empty"><div class="empty-text">Keranjang masih kosong</div></div>';
document.getElementById('oTotalDisplay').textContent=fmtFull(total);
document.getElementById('oProfitDisplay').textContent='Estimasi untung: '+fmtFull(profit);
},
save(){return withSaveGuard('order','orderModal',Order._saveInner);},
_saveInner(){
if(!Order.items.length){toast('⚠️ Keranjang masih kosong');return;}
const{lines,subtotal,diskon,ongkir,total,profit}=Order.computeTotals();
const items=lines.map(l=>({productId:l.productId,name:l.product.name,qty:l.qty,harga:l.harga,lineTotal:l.lineTotal}));
const customer={name:document.getElementById('oCustName').value.trim(),phone:document.getElementById('oCustPhone').value.trim(),address:document.getElementById('oCustAddr').value.trim()};
const accId=document.getElementById('oAcc')?document.getElementById('oAcc').value:D.accounts[0]?.id;
const date=document.getElementById('oDate').value;
const priceType=document.getElementById('oPriceType').value;
const delivered=document.getElementById('oDelivered')?document.getElementById('oDelivered').checked:true;
const note=document.getElementById('oNote').value;
const isEdit=!!Order.editId;
const existing=isEdit?D.cobek.find(c=>c.id===Order.editId):null;
const txId=(existing&&existing.txLinkId)?existing.txLinkId:uid();
// kw-shop-dp: "Uang Diterima" boleh < Total kalau ada DP/belum lunas walau barang sudah keluar
// stok (recordShopSale tetap mengurangi stok penuh, TIDAK terkait status bayar). Kosong = dianggap
// lunas penuh (perilaku lama, tidak berubah). Sisa (Total-DP) dicatat sbg Piutang (reuse modul
// Piutang yg sudah ada, D.piutang — bukan ledger/rumus baru), linked via piutangLinkId spy bisa
// disinkron ulang kalau transaksi ini diedit lagi nanti.
const dpRaw=document.getElementById('oDP')?document.getElementById('oDP').value.trim():'';
const dp=dpRaw===''?total:Math.max(0,Math.min(parseFloat(dpRaw)||0,total));
const sisa=Math.max(0,total-dp);
// kw-shop-edit: existingShopId->recordShopSale() (di cobek-tx-cart.js) yg kembalikan stok lama
// & apply stok baru, engine sama persis dgn yg sudah dipakai applyTxShopSaleFromTx().
const result=recordShopSale({
items,subtotal,diskon,ongkir,total,profit,date,note,customer,priceType,delivered,
accountId:accId,txId,existingShopId:isEdit?Order.editId:null
});
if(!result.ok){toast('⚠️ '+result.message);return;}
const itemSummary=items.map(it=>it.name+' x'+it.qty).join(', ');
const txNote=(customer.name?customer.name+' - ':'')+itemSummary;
if(isEdit&&existing&&existing.txLinkId){
const tx=D.transactions.find(x=>x.id===existing.txLinkId);
if(tx)Object.assign(tx,{amount:dp,accountId:accId,note:txNote,date,cobekLinkId:result.shopId});
else D.transactions.push({id:txId,type:'income',amount:dp,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:txNote,date,cobekLinkId:result.shopId});
} else {
D.transactions.push({id:txId,type:'income',amount:dp,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:txNote,date,cobekLinkId:result.shopId});
}
const existingPiutangId=(existing&&existing.piutangLinkId)?existing.piutangLinkId:null;
const shopRecord=D.cobek.find(c=>c.id===result.shopId);
if(sisa>0){
const piutangName=customer.name||'Pembeli Shop';
const piutangCatatan='Sisa pembayaran shop: '+itemSummary;
const existingPiutang=existingPiutangId?D.piutang.find(p=>p.id===existingPiutangId):null;
if(existingPiutang){
Object.assign(existingPiutang,{name:piutangName,nilai:sisa,tanggal:date,catatan:piutangCatatan,lunas:false});
if(shopRecord)shopRecord.piutangLinkId=existingPiutang.id;
}else{
const pid=uid();
D.piutang.push({id:pid,name:piutangName,nilai:sisa,tanggal:date,jatuhTempo:'',catatan:piutangCatatan,lunas:false});
if(shopRecord)shopRecord.piutangLinkId=pid;
}
}else if(existingPiutangId){
D.piutang=D.piutang.filter(p=>p.id!==existingPiutangId);
if(shopRecord)shopRecord.piutangLinkId=null;
}
save();
const marginPct=total>0?(profit/total)*100:0;
if(typeof AIBus!=="undefined")AIBus.emit("delivery.created",{orderId:txId,total,ongkir,delivered,date,marginPct});
Order.editId=null;
closeModal('orderModal');renderProductList();renderShop();Order.renderRecent();renderDashboard();renderKeuangan();renderSiapPulang();if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
if(typeof Piutang!=='undefined'&&Piutang.renderList)Piutang.renderList();
if(typeof ShopInsight!=='undefined')ShopInsight.render();
if(typeof PiutangUtangInsight!=='undefined')PiutangUtangInsight.render();
if(typeof BusinessFlowPresenter!=='undefined')BusinessFlowPresenter.renderTab();
toast(isEdit?'✅ Transaksi diperbarui':(sisa>0?`✅ Tersimpan — DP ${fmtFull(dp)}, sisa ${fmtFull(sisa)} otomatis masuk Piutang`:'✅ Transaksi tersimpan & tersinkron ke Keuangan'));
},
renderRecent(){
const el=document.getElementById('shopRecentList');
if(!el)return;
const sorted=[...D.cobek].sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,5);
el.innerHTML=sorted.length?sorted.map(t=>Order.rowHTML(t)).join(''):'<div class="empty"><div class="empty-icon">🪨</div><div class="empty-text">Belum ada transaksi</div></div>';
},
rowHTML(t){
if(t.items){
const itemSummary=t.items.map(i=>i.name+' x'+i.qty).join(', ');
const pendingBadge=t.delivered===false?' <span class="acc-chip u-cacc4" style="background:var(--accent4-soft)">📦 Belum diserahkan</span>':'';
return`<div class="tx-item u-pointer" data-action="Order.openEditModal" data-args="${escapeHtml(JSON.stringify([t.id]))}">
        <div class="tx-icon u-bgaccsoft">🪨</div>
        <div class="tx-info"><div class="tx-name">${t.customer&&t.customer.name?escapeHtml(t.customer.name):'Transaksi'} · ${escapeHtml(itemSummary)}${pendingBadge}</div><div class="tx-meta">${t.date}${t.customer&&t.customer.phone?' · '+escapeHtml(t.customer.phone):''} ${t.note?'· '+escapeHtml(t.note):''}</div></div>
        <div class="tx-amount green">${fmt(t.total)}</div>
        <button class="tx-del" data-stop="1" data-action="delShop" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
}
return`<div class="tx-item">
      <div class="tx-icon u-bgaccsoft">🪨</div>
      <div class="tx-info"><div class="tx-name">${t.date} · ${t.sets} set (data lama)</div><div class="tx-meta">${escapeHtml(t.note||'Trip Shop')}</div></div>
      <div class="tx-amount green">+${fmt(t.profit)}</div>
      <button class="tx-del" data-action="delShop" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button>
    </div>`;
}
};

// isCobekOwnershipSelf(t) — helper REUSE dari OwnershipEngine (Sesi 194,
// Ownership Sync Shop). Balikin true kalau kepemilikan EFEKTIF transaksi
// Shop ini SELF (termasuk transaksi lama yg belum punya field `ownership`
// sama sekali — via OwnershipEngine.resolve() otomatis fallback ke SELF/
// DEFAULT, 100% backward compatible, TIDAK ada transaksi existing yang
// tiba-tiba ke-exclude). Balikin false kalau ownership-nya salah satu dari
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY (transaksi2 tipe ini WAJIB
// dikecualikan dari agregat Shop/Laporan/Grafik/Dashboard/AI Insight/
// Statistik — tapi TIDAK dari D.cobek/daftar riwayat, transaksi tersebut
// tetap tampil & tersimpan apa adanya di daftar, cuma tidak ikut dijumlah).
// Guard typeof OwnershipEngine: kalau engine belum dimuat, fallback true
// (anggap SELF/tidak exclude apa pun) — pola sama persis
// isAssetOwnershipSelf() (modules/asset/aset.js, Sesi 193).
function isCobekOwnershipSelf(t){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(t).type==='SELF';
}

const Laporan={
periode:'selamanya',
setPeriode(p,el){
this.periode=p;
document.querySelectorAll('#shopPeriodeChips .chip-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');
document.getElementById('shopCustomRange').classList.toggle('u-dnone', p!=='custom');
document.getElementById('shopCustomRange').style.display='';
this.render();
},
getRange(){
if(this.periode==='selamanya')return{from:new Date(0),to:new Date(8640000000000000)};
const now=new Date();now.setHours(23,59,59,999);let from;
if(this.periode==='hari'){from=new Date();from.setHours(0,0,0,0);}
else if(this.periode==='minggu'){from=new Date();from.setDate(from.getDate()-from.getDay());from.setHours(0,0,0,0);}
else if(this.periode==='bulan'){from=new Date(now.getFullYear(),now.getMonth(),1);}
else if(this.periode==='tahun'){from=new Date(now.getFullYear(),0,1);}
else{const f=document.getElementById('shopFrom').value,t2=document.getElementById('shopTo').value;return{from:f?new Date(f):new Date(0),to:t2?new Date(t2+'T23:59:59'):now};}
return{from,to:now};
},
render(){
const {from,to}=this.getRange();
const inRange=D.cobek.filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;});
// Sesi 194 (Ownership Sync Shop): kartu ringkasan (cTrip/cSet/cUntung) HANYA
// hitung transaksi ownership SELF — shopList di bawah TETAP tampilkan semua
// transaksi di periode ini apa adanya (pola sama Aset.renderList()/Buku Aset).
const inRangeSelf=inRange.filter(isCobekOwnershipSelf);
document.getElementById('cTrip').textContent=inRangeSelf.length;
const omzet=inRangeSelf.reduce((s,t)=>s+(t.total||0),0);
document.getElementById('cSet').textContent=fmt(omzet);
document.getElementById('cUntung').textContent=fmt(inRangeSelf.reduce((s,t)=>s+(t.profit||0),0));
Etalase.renderModalStat();
const sorted=[...inRange].sort((a,b)=>(b.id||0)-(a.id||0));
const el=document.getElementById('shopList');
if(el)el.innerHTML=sorted.length?sorted.map(t=>shopOrderRowHTML(t)).join(''):'<div class="empty"><div class="empty-icon">🪨</div><div class="empty-text">Belum ada transaksi di periode ini</div></div>';
},
async delete(id){
if(!await askConfirm('Hapus transaksi ini? Stok produk akan dikembalikan & catatan keuangan terkait juga dihapus.'))return;
const t=D.cobek.find(x=>x.id===id);
if(t&&t.items){t.items.forEach(it=>{const p=D.products.find(x=>x.id===it.productId);if(p)p.stock+=it.qty;});}
if(t&&t.txLinkId)D.transactions=D.transactions.filter(tx=>tx.id!==t.txLinkId);
// S209-210 (Wire Return->Refund): piutang terhubung (sisa tagihan yg belum
// dibayar dari order ini) ikut dibersihkan saat order-nya diretur, reuse
// PERSIS pola filter yg sudah ada di Order._saveInner() (bukan rumus baru).
if(t&&t.piutangLinkId)D.piutang=D.piutang.filter(p=>p.id!==t.piutangLinkId);
D.cobek=D.cobek.filter(t=>t.id!==id);
save();this.render();renderShopRecent();renderProductList();
if(typeof ShopInsight!=='undefined')ShopInsight.render();
if(typeof BusinessFlowPresenter!=='undefined')BusinessFlowPresenter.renderTab();
// S213-214 (Audit fix): stok dikembalikan & piutang bisa terhapus di atas —
// kekayaan bersih & zakat maal harus ikut disinkron, sama persis pola yg
// sudah dipakai Aset.delete()/Piutang.save() (aset.js/piutang-utang.js) tiap
// piutang/stok berubah. Sebelumnya TIDAK dipanggil di sini (gap S209-210).
// S225-226 (dedup side-effect payment): fan-out renderDashboard/
// renderKeuangan/PiutangUtangInsight.render/renderKekayaanBersih/
// hitungZakatMaal/Piutang.renderList SEKARANG lewat syncPiutangFinanceViews()
// (1 helper bersama, didefinisikan di atas file ini) — dipakai sama persis
// oleh BusinessFlowPresenter.markPaymentReceived(). 0 fungsi dihapus/
// ditambah, cuma dipindah ke 1 tempat.
syncPiutangFinanceViews();
toast('🗑 Dihapus — stok, catatan keuangan & piutang terkait ikut dikembalikan/dibersihkan');
},
// ------ Tab "📊 Laporan" (kw-shop-laporan-tab) ------
// Analisa terpisah dari tab Riwayat: filter periode SENDIRI (periodeLap, tidak
// berbagi state dgn `periode` milik tab Riwayat di atas) supaya user bisa lihat
// riwayat transaksi "selamanya" sambil laporan tetap difilter bulan ini, atau
// sebaliknya, tanpa saling menimpa.
periodeLap:'selamanya',
setPeriodeLap(p,el){
this.periodeLap=p;
document.querySelectorAll('#lapPeriodeChips .chip-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');
const elLapCustomRange=document.getElementById('lapCustomRange');if(elLapCustomRange)elLapCustomRange.classList.toggle('u-dnone', p!=='custom');
this.renderTab();
},
getRangeLap(){
if(this.periodeLap==='selamanya')return{from:new Date(0),to:new Date(8640000000000000)};
const now=new Date();now.setHours(23,59,59,999);let from;
if(this.periodeLap==='hari'){from=new Date();from.setHours(0,0,0,0);}
else if(this.periodeLap==='minggu'){from=new Date();from.setDate(from.getDate()-from.getDay());from.setHours(0,0,0,0);}
else if(this.periodeLap==='bulan'){from=new Date(now.getFullYear(),now.getMonth(),1);}
else if(this.periodeLap==='tahun'){from=new Date(now.getFullYear(),0,1);}
else{const elFrom=document.getElementById('lapFrom'),elTo=document.getElementById('lapTo');const f=elFrom?elFrom.value:'',t2=elTo?elTo.value:'';return{from:f?new Date(f):new Date(0),to:t2?new Date(t2+'T23:59:59'):now};}
return{from,to:now};
},
renderTab(){
const {from,to}=this.getRangeLap();
const inRange=(D.cobek||[]).filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;});
// Sesi 194 (Ownership Sync Shop): tab Laporan (ringkasan lapTrip/lapOmzet/
// lapUntung/lapMargin) & Statistik (Top Produk/Top Pelanggan) HANYA hitung
// transaksi ownership SELF.
const inRangeSelf=inRange.filter(isCobekOwnershipSelf);
const omzet=inRangeSelf.reduce((s,t)=>s+(t.total||0),0);
const untung=inRangeSelf.reduce((s,t)=>s+(t.profit||0),0);
const elTrip=document.getElementById('lapTrip');if(elTrip)elTrip.textContent=inRangeSelf.length;
const elOmzet=document.getElementById('lapOmzet');if(elOmzet)elOmzet.textContent=fmt(omzet);
const elUntung=document.getElementById('lapUntung');if(elUntung)elUntung.textContent=fmt(untung);
const elMargin=document.getElementById('lapMargin');if(elMargin)elMargin.textContent=(omzet>0?Math.round((untung/omzet)*100):0)+'%';
this.renderGrafik('lapGrafikBars');
this.renderTopProduk(inRangeSelf);
this.renderTopPelanggan(inRangeSelf);
// S195 (Dana Kelolaan / Managed Funds): tambahan murni, pola sama
// pemanggilan renderTopPelanggan() di atas — 100% reuse
// DanaKelolaan.summary().dpCustomer, tidak mengubah baris manapun sebelum
// ini (Top Produk/Top Pelanggan tetap SELF-only, tidak disentuh).
if(typeof DanaKelolaanPresenter!=='undefined')DanaKelolaanPresenter.renderStatistik();
// S199 (Finalisasi Integrasi Shop): ringkasan Business Engine (Purchase/
// Inventory/Profit, S198) di tab Laporan/Statistik Shop — tambahan murni,
// pola sama pemanggilan DanaKelolaanPresenter.renderStatistik() di atas.
// 100% reuse ShopBusinessEnginePresenter.renderTab(), tidak mengubah baris
// manapun sebelum ini (Top Produk/Top Pelanggan/Dana Kelolaan tetap sama).
if(typeof ShopBusinessEnginePresenter!=='undefined')ShopBusinessEnginePresenter.renderTab();
// S204-A (Trip Presenter): ringkasan pengiriman bulan berjalan (trips/
// ongkir/margin) di tab Laporan/Statistik Shop — tambahan murni, pola
// sama pemanggilan ShopBusinessEnginePresenter.renderTab() di atas. 100%
// reuse field D.cobek yang sudah tersimpan, tidak mengubah baris manapun
// sebelum ini.
if(typeof TripPresenter!=='undefined')TripPresenter.renderTab();
// S205 (Business Flow Presenter): ringkasan alur Purchase->Trip->Stock->
// Sale di tab Laporan/Statistik Shop — WIRE ONLY, 100% reuse
// ShopBusinessEnginePresenter.summary()+TripPresenter.summary() yang
// sudah ada. Tambahan murni, tidak mengubah baris manapun sebelum ini.
if(typeof BusinessFlowPresenter!=='undefined')BusinessFlowPresenter.renderTab();
},
topProdukAgg(inRange){
const map={};
inRange.forEach(t=>{
if(!t.items)return;
t.items.forEach(it=>{
const key=it.productId||it.name;
if(!map[key])map[key]={name:it.name,qty:0,omzet:0};
map[key].qty+=it.qty||0;
map[key].omzet+=(it.harga||0)*(it.qty||0);
});
});
return Object.values(map).sort((a,b)=>b.qty-a.qty);
},
renderTopProduk(inRange){
const el=document.getElementById('lapTopProduk');
if(!el)return;
const list=this.topProdukAgg(inRange).slice(0,5);
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada data di periode ini</div></div>';return;}
const maxQty=Math.max(...list.map(p=>p.qty),1);
el.innerHTML=list.map((p,i)=>`
      <div class="u-mb8">
        <div class="u-flex u-jcb u-fs13"><span>${i+1}. ${escapeHtml(p.name)}</span><span class="u-fw700">${p.qty} terjual</span></div>
        <div style="background:var(--surface3);border-radius:6px;height:6px;margin-top:4px;overflow:hidden"><div style="background:var(--accent4);height:100%;width:${Math.max(4,(p.qty/maxQty)*100)}%"></div></div>
        <div class="u-fs12 u-t2 u-mt2">Omzet ${fmt(p.omzet)}</div>
      </div>`).join('');
},
renderTopPelanggan(inRange){
const el=document.getElementById('lapTopPelanggan');
if(!el)return;
const map={};
inRange.forEach(t=>{
if(!t.items)return;
const key=Pelanggan.key(t.customer);
if(!key)return;
if(!map[key])map[key]={name:(t.customer&&t.customer.name)||'(Tanpa nama)',orders:0,omzet:0};
map[key].orders++;
map[key].omzet+=t.total||0;
});
const list=Object.values(map).sort((a,b)=>b.omzet-a.omzet).slice(0,5);
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">👤</div><div class="empty-text">Belum ada data di periode ini</div></div>';return;}
el.innerHTML=list.map((c,i)=>`
      <div class="u-flex u-jcb u-fs13 u-mb6">
        <span>${i+1}. ${escapeHtml(c.name)}${c.orders>=3?' 🌟':''}</span>
        <span class="u-fw700">${fmt(c.omzet)} <span class="u-fs12 u-t2 u-fw400">(${c.orders}x)</span></span>
      </div>`).join('');
},
renderGrafik(elId){
const el=document.getElementById(elId||'shopGrafikBars');
if(!el)return;
const now=new Date();const bars=[];
for(let i=5;i>=0;i--){
const m=(now.getMonth()-i+12)%12,y=now.getFullYear()+(now.getMonth()-i<0?-1:0);
// Sesi 194 (Ownership Sync Shop): Grafik (bar bulanan) HANYA hitung transaksi ownership SELF.
const cobM=D.cobek.filter(c=>{const d=new Date(c.date);return d.getMonth()===m&&d.getFullYear()===y;}).filter(isCobekOwnershipSelf);
const setQty=cobM.reduce((s,c)=>s+(c.items?c.items.reduce((s2,i)=>s2+i.qty,0):(c.sets||0)),0);
const omzet=cobM.reduce((s,c)=>s+(c.total||0),0);
const profit=cobM.reduce((s,c)=>s+(c.profit||0),0);
const margin=omzet>0?Math.round((profit/omzet)*100):0;
bars.push({label:MONTHS[m],setQty,margin});
}
const maxV=Math.max(...bars.map(b=>b.setQty),1);
el.innerHTML=bars.map(b=>`<div class="grafik-col"><div class="grafik-bar-group"><div class="grafik-bar" style="background:var(--accent4);opacity:0.9;height:${Math.max(4,(b.setQty/maxV)*100)}%" title="${b.setQty} set"></div></div><div class="grafik-lbl">${b.label}</div><div class="u-fs12 u-t2 u-tac u-mt2">${b.setQty}set·${b.margin}%</div></div>`).join('');
}
};

const Pelanggan={
key(cust){
let phone='',name='';
if(cust && typeof cust==='object'){phone=cust.phone||'';name=cust.name||'';}
phone=String(phone).replace(/[^0-9]/g,'');
if(phone.length>=8) return 'p_'+phone.replace(/^0/,'62');
name=String(name).trim().toLowerCase();
return name? 'n_'+name : '';
},
getOrders(cust){
const key=this.key(cust);
if(!key) return [];
return D.cobek.filter(c=>c.items && this.key(c.customer)===key).sort((a,b)=>(b.id||0)-(a.id||0));
},
aggregate(){
const map={};
D.cobek.forEach(c=>{
if(!c.items) return;
const key=this.key(c.customer);
if(!key) return;
if(!map[key]) map[key]={key,name:(c.customer&&c.customer.name)||'(Tanpa nama)',phone:(c.customer&&c.customer.phone)||'',address:(c.customer&&c.customer.address)||'',orders:[],totalOmzet:0,totalProfit:0};
map[key].orders.push(c);
map[key].totalOmzet+=c.total||0;
map[key].totalProfit+=c.profit||0;
if(c.customer&&c.customer.name) map[key].name=c.customer.name;
if(c.customer&&c.customer.phone) map[key].phone=c.customer.phone;
});
return Object.values(map).sort((a,b)=>b.orders.length-a.orders.length || b.totalOmzet-a.totalOmzet);
},
onInputChange(){
const name=document.getElementById('oCustName').value.trim();
const phone=document.getElementById('oCustPhone').value.trim();
const hintEl=document.getElementById('oCustHint');
if(!hintEl) return;
if(!name && !phone){hintEl.style.display='none';hintEl.innerHTML='';return;}
const orders=this.getOrders({name,phone});
if(!orders.length){hintEl.style.display='none';hintEl.innerHTML='';return;}
const isLangganan=orders.length>=3;
const lastOrder=orders[0];
const lastItemsTxt=lastOrder.items.map(i=>i.name+' @'+fmtFull(i.harga)).join(', ');
hintEl.style.display='block';
hintEl.innerHTML=`👤 Pelanggan lama${isLangganan?' <span class="langganan-badge">🌟 Langganan</span>':''} — sudah order ${orders.length}x.<br>Terakhir (${lastOrder.date}): ${escapeHtml(lastItemsTxt)} · total ${fmtFull(lastOrder.total)}`;
},
renderList(){
const el=document.getElementById('customerList');
if(!el) return;
const list=this.aggregate();
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">👤</div><div class="empty-text">Belum ada data pelanggan</div></div>';return;}
const CUSTOMER_SHOW_LIMIT=40;
const visible=list.slice(0,CUSTOMER_SHOW_LIMIT);
el.innerHTML=visible.map(c=>`
      <div class="customer-card" data-action="openCustomerDetail" data-args="${escapeHtml(JSON.stringify([c.key]))}">
        <div class="u-flex u-jcb u-aifs">
          <div>
            <div class="u-fw700 u-fs14">${escapeHtml(c.name)}${c.orders.length>=3?'<span class="langganan-badge">🌟 Langganan</span>':''}</div>
            <div class="u-fs12 u-t2 u-mt2">${c.phone?escapeHtml(c.phone)+' · ':''}${c.orders.length}x order</div>
          </div>
          <div class="u-tar">
            <div class="tx-amount green u-fs13">${fmt(c.totalOmzet)}</div>
            <div class="u-fs12t2">untung ${fmt(c.totalProfit)}</div>
          </div>
        </div>
      </div>`).join('')+(list.length>CUSTOMER_SHOW_LIMIT?`<div class="u-tac u-fs12 u-t2" style="padding:8px 0">+${list.length-CUSTOMER_SHOW_LIMIT} pelanggan lain (urutan terbawah, order lebih jarang) tidak ditampilkan</div>`:'');
},
openDetail(key){
const list=this.aggregate();
const c=list.find(x=>x.key===key);
if(!c)return;
const orders=c.orders.sort((a,b)=>(b.id||0)-(a.id||0));
const itemPriceMap={};
orders.forEach(o=>{o.items.forEach(i=>{if(!itemPriceMap[i.name])itemPriceMap[i.name]=[];itemPriceMap[i.name].push({date:o.date,harga:i.harga});});});
const priceHistHTML=Object.entries(itemPriceMap).map(([name,prices])=>{
const rows=prices.slice(0,5).map(p=>`<span class="u-fs12 u-r8" style="display:inline-block;margin:2px 6px 2px 0;background:var(--surface3);padding:3px 8px">${p.date}: ${fmtFull(p.harga)}</span>`).join('');
const consistent=new Set(prices.map(p=>p.harga)).size===1;
return `<div class="u-mb8"><div class="u-fs12 u-fw700 u-mb4">${escapeHtml(name)} ${consistent?'<span class="u-cacc3 u-fs12">✓ harga konsisten</span>':'<span class="u-cacc4 u-fs12">⚠ harga berubah</span>'}</div>${rows}</div>`;
}).join('');
const orderListHTML=orders.map(o=>shopOrderRowHTML(o)).join('');
const waMsg=`Halo ${c.name}, terima kasih sudah jadi pelanggan Shop kami ya! 🪨🙏`;
const waBtn=c.phone?`<button class="wa-btn" data-action="openWaShare" data-args="${escapeHtml(JSON.stringify([waMsg, c.phone]))}">💬 Chat WhatsApp</button>`:'';
const body=document.getElementById('customerDetailBody');
document.getElementById('customerDetailTitle').textContent=c.name+(c.orders.length>=3?' 🌟':'');
body.innerHTML=`
      <div class="u-fs12 u-t2 u-mb10">${c.phone?escapeHtml(c.phone):'Tanpa no. HP'}${c.address?' · '+escapeHtml(c.address):''}</div>
      <div class="u-flex u-gap8" style="margin-bottom:14px">${waBtn}</div>
      <div class="card-title u-p0 u-mb8">💰 Riwayat Harga per Produk</div>
      ${priceHistHTML||'<div class="u-fs12t2">Belum ada data</div>'}
      <div class="div"></div>
      <div class="card-title u-p0 u-mb8">📋 Semua Transaksi (${orders.length}x)</div>
      ${orderListHTML}
    `;
openModal('customerDetailModal');
},
_acList(){
const seen=new Set();const out=[];
for(let i=(D.cobek||[]).length-1;i>=0;i--){
const c=D.cobek[i].customer||{};
const name=(c.name||'').trim();
if(!name||seen.has(name.toLowerCase()))continue;
seen.add(name.toLowerCase());
out.push({name,phone:(c.phone||'').trim(),address:(c.address||'').trim()});
if(out.length>=50)break;
}
return out;
},
onFieldInput(field){
const idMap={name:'txShopSaleCustName',phone:'txShopSaleCustPhone',address:'txShopSaleCustAddr'};
const boxMap={name:'txShopSaleCustNameBox',phone:'txShopSaleCustPhoneBox',address:'txShopSaleCustAddrBox'};
const el=document.getElementById(idMap[field]);
const box=document.getElementById(boxMap[field]);
if(!el||!box)return;
const q=el.value.trim().toLowerCase();
const customers=this._acList();
const matches=(q?customers.filter(c=>(c[field]||'').toLowerCase().includes(q)):customers).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map(c=>{
const label=field==='name'?c.name:(field==='phone'?(c.phone||'(tanpa HP)')+' — '+c.name:(c.address||'(tanpa alamat)')+' — '+c.name);
return `<div class="suggest-item" onmousedown="event.preventDefault();selectShopCustomer('${jsAttrEscape(c.name)}','${jsAttrEscape(c.phone)}','${jsAttrEscape(c.address)}')">${escapeHtml(label)}</div>`;
}).join('');
box.style.display='block';
},
select(name,phone,address){
const nameEl=document.getElementById('txShopSaleCustName');
const phoneEl=document.getElementById('txShopSaleCustPhone');
const addrEl=document.getElementById('txShopSaleCustAddr');
if(nameEl)nameEl.value=name;
if(phoneEl)phoneEl.value=phone;
if(addrEl)addrEl.value=address;
['txShopSaleCustNameBox','txShopSaleCustPhoneBox','txShopSaleCustAddrBox'].forEach(hideSuggestBox);
}
};

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 4/6: orkestrator "rencana pengiriman pintar"
// utk order Shop — menjembatani data Produsen (D.produsen, rute Etape 1
// tersimpan, lihat OngkirCalc.prefillFromProdusen() di cobek-pricing.js) &
// produk (D.products) ke LogisticsService (Sesi 3) & AIService (Sesi 2).
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. PURE/read-only seperti
// fungsi Sesi 4 lain di cobek-pricing.js — TIDAK PERNAH memanggil save()
// atau menulis ke D/AIStore. PENTING (masih "senyap"): tidak ada UI/tombol
// baru, tidak ada wiring otomatis — baru "hidup" kalau dipanggil eksplisit
// (Sesi 6).
// ---------------------------------------------------------------------------

// calculateSmartDelivery({productId, qty, produsenId, kmKonsumen,
// biayaPerKmKonsumen, metode, vehicleId, marginPct}) — satu panggilan buat
// dapat rencana pengiriman lengkap (rute+BBM+harga+profit) utk 1 produk,
// dgn km/biaya Etape 1 diambil OTOMATIS dari preferensi Produsen kalau ada
// (D.produsen[].jarakKm/biayaPerKm) — pemanggil cuma wajib kasih Etape 2
// (kmKonsumen/biayaPerKmKonsumen) kalau metode "antar". modal utk rekomendasi
// harga diambil dari product.hargaBeli, transport otomatis dari hasil
// route (lihat LogisticsEngine.plan()).
function calculateSmartDelivery({
  productId, qty, produsenId, kmKonsumen, biayaPerKmKonsumen,
  metode, vehicleId, marginPct,
} = {}) {
  if (typeof LogisticsService === 'undefined' || typeof LogisticsEngine === 'undefined') {
    return { ok: false, reason: 'LogisticsService/LogisticsEngine belum dimuat' };
  }
  const product = (D.products || []).find((p) => p.id === productId);
  if (!product) return { ok: false, reason: 'Produk tidak ditemukan' };
  const produsen = produsenId ? (D.produsen || []).find((pr) => pr.id === produsenId) : null;
  const kmProdusen = produsen && produsen.jarakKm > 0 ? produsen.jarakKm : 0;
  const biayaPerKmProdusen = produsen && produsen.biayaPerKm > 0 ? produsen.biayaPerKm : 0;
  const pcs = Math.max(0, parseFloat(qty) || 0);
  // capacityPerTrip SENGAJA tidak dikasih ke plan() (kapasitas kendaraan
  // belum ada datanya di sini) -> LogisticsEngine.plan() otomatis skip
  // bagian `load` (lihat catatan di plan()); pakai calculateVehicleCapacity()
  // di cobek-pricing.js terpisah kalau butuh hitung rit.
  const plan = LogisticsEngine.plan({
    kmProdusen, biayaPerKmProdusen, kmKonsumen, biayaPerKmKonsumen,
    metode, pcs, vehicleId, modal: product.hargaBeli, marginPct,
  });
  const profit = (typeof calculateProfit === 'function')
    ? calculateProfit({ productId, qty: pcs, deliveryPlan: plan })
    : null;
  return {
    ok: true,
    productId,
    productName: product.name,
    produsenId: produsenId || null,
    plan,
    profit,
    summary: LogisticsService.formatSummary(plan),
  };
}

// requestAIRecommendation({productId, qty, produsenId, kmKonsumen,
// biayaPerKmKonsumen, metode, vehicleId, marginPct}) — bangun rencana lewat
// calculateSmartDelivery() di atas, lalu rangkai jadi prompt siap-pakai
// lewat AIService.buildPrompt() (Sesi 2). Kalau D.profile.apiKey sudah
// diisi, prompt itu langsung dikirim ke AI (pola sama dgn
// PriceReko.checkMarketAI() di cobek-pricing.js) supaya user dapat
// rekomendasi bahasa natural; kalau belum, function ini tetap balikin
// prompt-nya (aiText:null) supaya tetap berguna tanpa memaksa isi API Key
// dulu. TIDAK PERNAH menulis ke D/AIStore (wiring beneran baru Sesi 6) —
// murni baca + maksimal 1x panggilan API kalau API Key ada.
async function requestAIRecommendation({
  productId, qty, produsenId, kmKonsumen, biayaPerKmKonsumen,
  metode, vehicleId, marginPct,
} = {}) {
  const delivery = calculateSmartDelivery({
    productId, qty, produsenId, kmKonsumen, biayaPerKmKonsumen, metode, vehicleId, marginPct,
  });
  if (!delivery.ok) return delivery;
  const prompt = (typeof AIService !== 'undefined')
    ? await AIService.buildPrompt('rekomendasi-pengiriman', {
      produk: delivery.productName,
      qty,
      ringkasan: delivery.summary,
    })
    : null;
  const apiKey = D.profile && D.profile.apiKey;
  if (!apiKey || typeof callAIProviderRaw !== 'function' || !prompt) {
    return Object.assign({}, delivery, {
      prompt, aiText: null, aiOk: false, aiReason: !apiKey ? 'Belum ada API Key' : 'Prompt/AI belum siap',
    });
  }
  try {
    const r = await callAIProviderRaw(
      'Kamu asisten logistik & harga utk toko batu cobek. Jawab ringkas & actionable dalam Bahasa Indonesia berdasarkan data yang diberikan.',
      [{ role: 'user', content: prompt }],
      { maxTokens: 512 },
    );
    if (!r.ok) {
      return Object.assign({}, delivery, { prompt, aiText: null, aiOk: false, aiReason: r.errMsg || 'Gagal hubungi AI' });
    }
    return Object.assign({}, delivery, { prompt, aiText: r.text, aiOk: true, aiReason: null });
  } catch (e) {
    return Object.assign({}, delivery, { prompt, aiText: null, aiOk: false, aiReason: String((e && e.message) || e) });
  }
}

