// kasir.js — Modul "🧠 Kasir AI" (v127, kw81-kasir-ai-pos):
// Dipindah ke modules/business/kasir.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Tab checkout BARU utk halaman Bisnis Shop yang lebih cepat dari form "Transaksi Manual" (Order)
// lama: tap produk langsung dari grid (bukan pilih dari dropdown lalu klik "+ Tambah"), keranjang
// & total keliatan real-time di 1 layar yang sama, + 1 fitur AI (saran bundling/upsell dari isi
// keranjang, panggil callAIProviderRaw yang sama dipakai AIWidget/RenovAI/dst).
//
// PENTING: urutan load — taruh file ini SETELAH cobek.js di GROUP_A (lihat build.js). Kasir
// memakai fungsi/variabel dari cobek.js (recordShopSale, D.products, dst) & features-aiwidget-
// reminder-gdrive-search.js (callAIProviderRaw, aiErrorHint) — SEMUA dipanggil saat RUNTIME
// (di dalam method, bukan di top-level saat file di-load), jadi aman ditaruh di file terpisah
// selama file-file itu sudah lebih dulu ada & sudah selesai di-load duluan.
//
// TIDAK mengubah modul Order (form "🛒 Transaksi Manual" lama) sama sekali — Kasir cuma menambah
// TAB BARU di halaman Bisnis Shop yang jadi tab default, sementara "Transaksi Manual" tetap ada
// sbg cara lama/fallback (mis. kalau perlu edit harga per-line dari dropdown, dll). Kasir memakai
// fungsi recordShopSale() yang SAMA PERSIS dgn Order, jadi hasil transaksinya konsisten & tetap
// tersinkron ke Keuangan + stok Etalase seperti sebelumnya.
const Kasir={
cart:[], // {productId, qty, hargaOverride}
search:'',
priceType:'jual',
viewMode:'grid', // 'grid' (tile 2 kolom) atau 'list' (baris ringkas) — kw198-kasir-viewtoggle, dipilih user & diingat lewat localStorage
categoryFilter:'', // '' = semua kategori — kw199-kasir-kategori-chip, id dari D.cobekKategori
populateAccSelect(){
const el=document.getElementById('kasirAcc');
if(el)el.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
},
render(){
Kasir.populateAccSelect();
Kasir.renderCategoryChips();
Kasir.renderGrid();
Kasir.renderCart();
},
reset(){
Kasir.cart=[];
Kasir.search='';
Kasir.priceType='jual';
Kasir.categoryFilter='';
const s=document.getElementById('kasirSearch');if(s)s.value='';
const d=document.getElementById('kasirDiskon');if(d)d.value='';
const o=document.getElementById('kasirOngkir');if(o)o.value='';
const cn=document.getElementById('kasirCustName');if(cn)cn.value='';
const cp=document.getElementById('kasirCustPhone');if(cp)cp.value='';
const ca=document.getElementById('kasirCustAddr');if(ca)ca.value='';
const dp=document.getElementById('kasirDP');if(dp)dp.value='';
const dl=document.getElementById('kasirDelivered');if(dl){dl.checked=true;Kasir.toggleDeliveredField();}
const nt=document.getElementById('kasirNote');if(nt)nt.value='';
document.querySelectorAll('#kasirPriceToggle .chip-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
const aiCard=document.getElementById('kasirAiCard');if(aiCard)aiCard.style.display='none';
Kasir.render();
},
// toggleDeliveredField (kw-kasir-audit-2): update label teks sesuai status toggle, sama pola
// persis SiapPulang.toggleDeliveredField() yg dipakai Order (oDelivered/oDeliveredLbl) —
// murni UI, tidak ada logic bisnis baru.
toggleDeliveredField(){
const cb=document.getElementById('kasirDelivered');
const lbl=document.getElementById('kasirDeliveredLbl');
if(!cb||!lbl)return;
lbl.textContent=cb.checked?'✅ Sudah diserahkan ke pelanggan':'📦 Belum diserahkan (akan dibawa pulang)';
},
onSearch(v){
Kasir.search=(v||'').toLowerCase().trim();
Kasir.renderGrid();
},
setPriceType(type,el){
Kasir.priceType=type;
document.querySelectorAll('#kasirPriceToggle .chip-btn').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
Kasir.renderGrid();
Kasir.renderCart();
},
filteredProducts(){
let list=D.products;
if(Kasir.categoryFilter)list=list.filter(p=>p.kategoriId===Kasir.categoryFilter);
if(Kasir.search)list=list.filter(p=>p.name.toLowerCase().includes(Kasir.search));
return list;
},
// Kategori chip (kw199-kasir-kategori-chip): daftar kategori yg BENERAN dipakai minimal 1 produk
// (bukan seluruh D.cobekKategori) — kategori kosong/tak terpakai tidak perlu bikin baris chip
// makin panjang & tidak berguna dipilih (hasilnya pasti "Produk tidak ditemukan").
availableCategories(){
const seen=new Map();
const kats=D.cobekKategori||[];
D.products.forEach(p=>{
if(!p.kategoriId)return;
const kat=kats.find(k=>k.id===p.kategoriId);
if(!kat)return;
const cur=seen.get(kat.id);
if(cur)cur.count++;
else seen.set(kat.id,{id:kat.id,name:kat.name,count:1});
});
return[...seen.values()].sort((a,b)=>a.name.localeCompare(b.name,'id'));
},
setCategoryFilter(katId){
Kasir.categoryFilter=katId||'';
Kasir.renderCategoryChips();
Kasir.renderGrid();
},
renderCategoryChips(){
const wrap=document.getElementById('kasirKategoriChips');
if(!wrap)return;
const cats=Kasir.availableCategories();
// Kalau produk belum dikelompokkan kategori sama sekali, sembunyikan baris chip — jangan
// nambah elemen kosong di layar checkout yang memang didesain cepat/ringkas.
if(!cats.length){
wrap.style.display='none';
wrap.innerHTML='';
return;
}
wrap.style.display='flex';
wrap.innerHTML=`<button type="button" class="chip-btn kasir-kat-chip${Kasir.categoryFilter?'':' active'}" data-action="Kasir.setCategoryFilter" data-args='[""]'>Semua (${D.products.length})</button>`
+cats.map(c=>`<button type="button" class="chip-btn kasir-kat-chip${Kasir.categoryFilter===c.id?' active':''}" data-action="Kasir.setCategoryFilter" data-args='["${c.id}"]'>${escapeHtml(c.name)} (${c.count})</button>`).join('');
},
// setViewMode (kw198-kasir-viewtoggle): grid 2 kolom bagus utk sedikit produk (lebih visual),
// list 1 kolom ringkas (nama+harga+stok 1 baris) mempercepat cari kalau produk banyak. Pilihan
// diingat lewat localStorage (bukan D.profile) krn ini murni preferensi tampilan per-device,
// bukan data yang perlu ikut backup/sync — sama pola dgn kw_dashServisVehFilter.
setViewMode(mode,el){
if(mode!=='grid'&&mode!=='list')return;
Kasir.viewMode=mode;
try{localStorage.setItem('kw_kasirViewMode',mode);}catch(e){/* abaikan, cuma preferensi tampilan */}
document.querySelectorAll('#kasirViewToggle .chip-btn').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
Kasir.renderGrid();
},
renderGrid(){
const el=document.getElementById('kasirGrid');
if(!el)return;
el.classList.toggle('kasir-grid-list',Kasir.viewMode==='list');
document.querySelectorAll('#kasirViewToggle .chip-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===Kasir.viewMode));
if(!D.products.length){
el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada produk — tambah dulu di tab 📦 Etalase</div></div>';
return;
}
const list=Kasir.filteredProducts();
const isList=Kasir.viewMode==='list';
el.innerHTML=list.length?list.map(p=>{
const inCart=Kasir.cart.find(i=>i.productId===p.id);
const habis=(p.stock||0)<=0;
let harga=(Kasir.priceType==='reseller'&&p.hargaReseller)?p.hargaReseller:p.hargaJual;
if(p.diskonPersen)harga=harga-(harga*p.diskonPersen/100);
// Reko harga (kw194-kasir-order-pricereko): tandai tile produk yg Harga Jual-nya menyimpang
// jauh dari estimasi PriceRekoWidget (rumus SAMA dgn widget "🤖 Rekomendasi Harga Jual AI" di
// Etalase) — biar kasir sadar dari layar checkout juga, tanpa harus bolak-balik ke Etalase.
// Tombol terpisah (bukan nempel ke tile) supaya tap badge ini TIDAK ikut nge-trigger addToCart
// (click delegation ambil elemen [data-action] TERDEKAT ke target, lihat features-helpers-
// global-security.js).
const priceChk=(typeof PriceRekoWidget!=='undefined')?PriceRekoWidget.checkOne(p):null;
const warnCls=isList?'kasir-tile-pricewarn kasir-tile-pricewarn-inline':'kasir-tile-pricewarn';
const priceWarn=priceChk?`<button type="button" class="${warnCls}" data-action="Kasir.openPriceReko" data-args='${escapeHtml(JSON.stringify([p.id]))}' title="${priceChk.diffPct<0?'Harga di bawah':'Harga di atas'} estimasi Etalase (reko ${fmtFull(priceChk.reko)}) — tap utk detail" aria-label="Peringatan harga">${priceChk.diffPct<0?'⬇️':'⬆️'}</button>`:'';
const stockLvl=habis?'stock-out':((p.stock||0)<=3?'stock-low':'stock-ok');
const rowAttrs=`${habis?'':` data-action="Kasir.addToCart" data-args='["${p.id}"]'`}`;
if(isList){
const badge=inCart?`<div class="kasir-tile-badge kasir-tile-badge-inline">${inCart.qty}</div>`:'';
return`<div class="kasir-tile kasir-tile-row ${stockLvl}${habis?' kasir-tile-disabled':''}${inCart?' kasir-tile-active':''}"${rowAttrs}>
      ${priceWarn}
      <div class="kasir-tile-row-main">
        <div class="kasir-tile-name">${escapeHtml(p.name)}</div>
        <div class="kasir-tile-stock">${habis?'Stok habis':'Stok '+p.stock}</div>
      </div>
      <div class="kasir-tile-price">${fmt(harga)}</div>
      ${badge}
    </div>`;
}
return`<div class="kasir-tile ${stockLvl}${habis?' kasir-tile-disabled':''}${inCart?' kasir-tile-active':''}"${rowAttrs}>
      ${priceWarn}
      <div class="kasir-tile-name">${escapeHtml(p.name)}</div>
      <div class="kasir-tile-price">${fmt(harga)}</div>
      <div class="kasir-tile-stock">${habis?'Stok habis':'Stok '+p.stock}</div>
      ${inCart?`<div class="kasir-tile-badge">${inCart.qty}</div>`:''}
    </div>`;
}).join(''):'<div class="empty"><div class="empty-text">Produk tidak ditemukan</div></div>';
},
// openPriceReko(pid) — dipanggil dari badge ⬇️/⬆️ di tile grid. Reuse PriceRekoWidget.openDetail
// yg sudah ada (buka productModal produk itu & auto-expand panel "Rekomendasi Harga Jual"),
// biar 1 alur "lihat & perbaiki harga" konsisten dipakai dari Etalase MAUPUN dari Kasir.
openPriceReko(pid){
if(typeof PriceRekoWidget!=='undefined')PriceRekoWidget.openDetail(pid);
},
addToCart(pid){
const p=D.products.find(x=>x.id===pid);
if(!p)return;
const existing=Kasir.cart.find(i=>i.productId===pid);
const qtyInCart=existing?existing.qty:0;
if(qtyInCart+1>(p.stock||0)){toast('⚠️ Stok "'+p.name+'" tidak cukup (sisa '+p.stock+')');return;}
if(existing)existing.qty+=1;
else Kasir.cart.push({productId:pid,qty:1,hargaOverride:null});
Kasir.renderGrid();
Kasir.renderCart();
},
changeQty(idx,delta){
const it=Kasir.cart[idx];
if(!it)return;
const p=D.products.find(x=>x.id===it.productId);
if(delta>0&&p&&it.qty+1>(p.stock||0)){toast('⚠️ Stok tidak cukup (sisa '+p.stock+')');return;}
it.qty+=delta;
if(it.qty<=0)Kasir.cart.splice(idx,1);
Kasir.renderGrid();
Kasir.renderCart();
},
removeItem(idx){
Kasir.cart.splice(idx,1);
Kasir.renderGrid();
Kasir.renderCart();
},
computeTotals(){
let subtotal=0,modal=0;
const lines=Kasir.cart.map(it=>{
const p=D.products.find(x=>x.id===it.productId);
if(!p)return null;
let hargaDefault=(Kasir.priceType==='reseller'&&p.hargaReseller)?p.hargaReseller:p.hargaJual;
if(p.diskonPersen)hargaDefault=hargaDefault-(hargaDefault*p.diskonPersen/100);
const harga=(it.hargaOverride!=null&&it.hargaOverride>0)?it.hargaOverride:hargaDefault;
const lineTotal=harga*it.qty;
subtotal+=lineTotal;modal+=(p.hargaBeli||0)*it.qty;
return{...it,product:p,harga,hargaDefault,lineTotal};
}).filter(Boolean);
const diskon=parseFloat(document.getElementById('kasirDiskon')?.value)||0;
const ongkir=parseFloat(document.getElementById('kasirOngkir')?.value)||0;
const total=Math.max(0,subtotal-diskon)+ongkir;
const profit=subtotal-modal-diskon;
return{lines,subtotal,modal,diskon,ongkir,total,profit};
},
renderCart(){
const{lines,subtotal,diskon,ongkir,total,profit}=Kasir.computeTotals();
const el=document.getElementById('kasirCartList');
if(el){
el.innerHTML=lines.length?lines.map((l,i)=>{
const priceChk=(typeof PriceRekoWidget!=='undefined')?PriceRekoWidget.checkOne(l.product):null;
const priceHint=priceChk?`<div class="u-mt2" style="font-size:10.5px;color:${priceChk.diffPct<0?'var(--accent2)':'var(--accent4)'};font-weight:600">${priceChk.diffPct<0?'⬇️':'⬆️'} Reko Etalase: ${fmt(priceChk.reko)}</div>`:'';
return`
      <div class="tx-item kasir-cart-item">
        <div class="tx-icon u-bgaccsoft">🛒</div>
        <div class="tx-info">
          <div class="tx-name">${escapeHtml(l.product.name)}</div>
          <div class="tx-meta">${fmt(l.harga)} × ${l.qty} = <b class="u-ctext">${fmt(l.lineTotal)}</b></div>
          ${priceHint}
        </div>
        <div class="kasir-qty-pill">
          <button data-action="Kasir.changeQty" data-args="${escapeHtml(JSON.stringify([i,-1]))}" aria-label="Kurangi jumlah">−</button>
          <span>${l.qty}</span>
          <button data-action="Kasir.changeQty" data-args="${escapeHtml(JSON.stringify([i,1]))}" aria-label="Tambah jumlah">+</button>
        </div>
        <button class="tx-del" data-action="Kasir.removeItem" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join(''):'<div class="empty"><div class="empty-icon">🛒</div><div class="empty-text">Keranjang kosong — tap produk di atas ⤴️</div></div>';
}
const subEl=document.getElementById('kasirSubDisplay');if(subEl)subEl.textContent=fmtFull(subtotal);
const diskonRow=document.getElementById('kasirDiskonRow');
if(diskonRow){diskonRow.style.display=diskon>0?'flex':'none';const dEl=document.getElementById('kasirDiskonDisplay');if(dEl)dEl.textContent='− '+fmtFull(diskon);}
const ongkirRow=document.getElementById('kasirOngkirRow');
if(ongkirRow){ongkirRow.style.display=ongkir>0?'flex':'none';const oEl=document.getElementById('kasirOngkirDisplay');if(oEl)oEl.textContent='+ '+fmtFull(ongkir);}
const totalEl=document.getElementById('kasirTotalDisplay');if(totalEl)totalEl.textContent=fmtFull(total);
const profitEl=document.getElementById('kasirProfitDisplay');if(profitEl)profitEl.textContent='Estimasi untung: '+fmtFull(profit);
const btn=document.getElementById('kasirCheckoutBtn');if(btn)btn.disabled=lines.length===0;
const floatbar=document.getElementById('kasirFloatbar');
if(floatbar){
floatbar.classList.toggle('kasir-floatbar-show',lines.length>0);
const cEl=document.getElementById('kasirFloatCount');if(cEl)cEl.textContent=lines.reduce((s,l)=>s+l.qty,0)+' item';
const tEl=document.getElementById('kasirFloatTotal');if(tEl)tEl.textContent=fmtFull(total);
}
},
scrollToCheckout(){
const sec=document.getElementById('kasirCheckoutSection');
if(sec)sec.scrollIntoView({behavior:'smooth',block:'start'});
},
async aiSuggest(){
if(!D.profile.apiKey){
toast('⚠️ Isi dulu API Key AI di Pengaturan → AI Asisten');
showPage('settings',document.querySelectorAll('.nav-item')[6]);
return;
}
if(!Kasir.cart.length){toast('⚠️ Tambah produk ke keranjang dulu');return;}
const card=document.getElementById('kasirAiCard');
const body=document.getElementById('kasirAiBody');
if(card)card.style.display='block';
if(body)body.innerHTML='<div class="empty"><div class="empty-icon">🤖</div><div class="empty-text">Menyiapkan...</div></div>';
const{lines,total}=Kasir.computeTotals();
const cartSummary=lines.map(l=>`${l.product.name} x${l.qty} (sisa stok setelah ini: ${Math.max(0,l.product.stock-l.qty)})`).join(', ');
const catalog=D.products.map(p=>`${p.name} (stok ${p.stock}, harga jual ${p.hargaJual})`).join('; ')||'Tidak ada produk lain';
const systemPrompt=`Kamu asisten kasir toko kecil di Indonesia. Dari isi keranjang & katalog produk yang diberikan, beri 1-3 saran SINGKAT (maks 2 kalimat tiap saran): produk lain di katalog yang cocok ditawarkan sbg bundling/upsell ke pembeli ini, DAN/ATAU peringatan kalau ada produk di keranjang yang stoknya bakal hampir/benar-benar habis setelah transaksi ini selesai. JANGAN mengarang produk yang tidak ada di katalog. Kalau memang tidak ada saran relevan, jawab singkat saja: "Tidak ada saran khusus untuk keranjang ini." Format jawaban: bullet pendek pakai •, bahasa santai tapi sopan, TANPA kalimat pembuka/basa-basi.`;
const messages=[{role:'user',content:`Isi keranjang saat ini (total ${fmtFull(total)}): ${cartSummary}\n\nKatalog seluruh produk yang ada di etalase: ${catalog}`}];
const res=await callAIProviderRaw(systemPrompt,messages,{maxTokens:400});
if(!res.ok){
const provider=D.profile.apiProvider||'claude';
if(body)body.innerHTML=`<div class="empty"><div class="empty-text">⚠️ Gagal memuat saran${aiErrorHint(provider,res.status)}${res.errMsg?': '+escapeHtml(res.errMsg):''}</div></div>`;
return;
}
if(body)body.innerHTML=`<div style="font-size:12.5px;line-height:1.7;white-space:pre-wrap">${escapeHtml(res.text||'Tidak ada saran khusus untuk keranjang ini.')}</div>`;
},
buildReceiptText(){
const{lines,diskon,ongkir,total}=Kasir.computeTotals();
const namaToko=(D.profile&&(D.profile.namaBisnis||D.profile.nama))||'Toko';
let txt=`🧾 ${namaToko}\n${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}\n\n`;
lines.forEach(l=>{txt+=`${l.product.name} x${l.qty}  ${fmt(l.lineTotal)}\n`;});
if(diskon>0)txt+=`Diskon: -${fmt(diskon)}\n`;
if(ongkir>0)txt+=`Ongkir: +${fmt(ongkir)}\n`;
txt+=`\nTOTAL: ${fmt(total)}\n\nTerima kasih! 🙏`;
return txt;
},
async shareReceipt(){
if(!Kasir.cart.length){toast('⚠️ Keranjang masih kosong');return;}
const text=Kasir.buildReceiptText();
try{
if(navigator.share){await navigator.share({text});return;}
throw new Error('no_share_api');
}catch(e){
try{
await navigator.clipboard.writeText(text);
toast('📋 Struk disalin ke clipboard');
}catch(e2){
toast('⚠️ Gagal membuat struk — coba lagi');
}
}
},
checkout(){return withSaveGuard('kasir','',Kasir._checkoutInner);},
_checkoutInner(){
if(!Kasir.cart.length){toast('⚠️ Keranjang masih kosong');return;}
const{lines,subtotal,diskon,ongkir,total,profit}=Kasir.computeTotals();
const items=lines.map(l=>({productId:l.productId,name:l.product.name,qty:l.qty,harga:l.harga,lineTotal:l.lineTotal}));
const accId=document.getElementById('kasirAcc')?document.getElementById('kasirAcc').value:D.accounts[0]?.id;
const custName=(document.getElementById('kasirCustName')?.value||'').trim();
const custPhone=(document.getElementById('kasirCustPhone')?.value||'').trim();
// kw-kasir-audit-1: alamat sekarang ikut dikirim (dulu selalu '' hardcoded).
const custAddr=(document.getElementById('kasirCustAddr')?.value||'').trim();
const customer={name:custName,phone:custPhone,address:custAddr};
// kw-kasir-audit-2: delivered sekarang ikut toggle di UI (dulu selalu true hardcoded).
const delivered=document.getElementById('kasirDelivered')?document.getElementById('kasirDelivered').checked:true;
const date=new Date().toISOString().split('T')[0];
const note=(document.getElementById('kasirNote')?.value||'').trim();
const txId=uid();
const result=recordShopSale({
items,subtotal,diskon,ongkir,total,profit,date,note,customer,priceType:Kasir.priceType,delivered,
accountId:accId,txId,existingShopId:null
});
if(!result.ok){toast('⚠️ '+result.message);return;}
const itemSummary=items.map(it=>it.name+' x'+it.qty).join(', ');
// kw-kasir-audit-3: DP/Piutang — logic sama persis Order._saveInner() (cobek-order.js, kw-shop-dp),
// diduplikasi (bukan diekstrak jadi helper bersama, sesuai keputusan opsi A) krn Kasir TIDAK PERNAH
// mengedit entri lama (existingShopId selalu null di atas), jadi tidak perlu logic reconciliation
// piutangLinkId lama seperti di Order. Kosong = dianggap lunas penuh (perilaku lama, tidak berubah).
const dpRaw=document.getElementById('kasirDP')?document.getElementById('kasirDP').value.trim():'';
const dpVal=dpRaw===''?total:Math.max(0,Math.min(parseFloat(dpRaw)||0,total));
const sisa=Math.max(0,total-dpVal);
const txNote=(customer.name?customer.name+' - ':'')+itemSummary;
D.transactions.push({id:txId,type:'income',amount:dpVal,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:txNote,date,cobekLinkId:result.shopId});
if(sisa>0){
const piutangName=customer.name||'Pembeli Shop';
const pid=uid();
D.piutang.push({id:pid,name:piutangName,nilai:sisa,tanggal:date,jatuhTempo:'',catatan:'Sisa pembayaran shop: '+itemSummary,lunas:false});
const shopRecord=D.cobek.find(c=>c.id===result.shopId);
if(shopRecord)shopRecord.piutangLinkId=pid;
}
save();
renderProductList();renderShop();Order.renderRecent();renderDashboard();renderKeuangan();renderSiapPulang();
if(typeof Piutang!=='undefined'&&Piutang.renderList)Piutang.renderList();
toast(sisa>0?`✅ Tersimpan — DP ${fmtFull(dpVal)}, sisa ${fmtFull(sisa)} otomatis masuk Piutang`:'✅ Transaksi tersimpan & tersinkron ke Keuangan');
Kasir.reset();
}
};
// Muat preferensi mode tampilan (grid/list) yg tersimpan dari sesi sebelumnya — kw198-kasir-viewtoggle.
(function(){try{const saved=localStorage.getItem('kw_kasirViewMode');if(saved==='list')Kasir.viewMode='list';}catch(e){/* default 'grid' */}})();
// kw-kasir-audit-2: wrapper global dipanggil dari onchange di HTML, sama pola persis
// toggleOrderDeliveredField() (modules/shop/cobek-io.js) yg membungkus SiapPulang.toggleDeliveredField().
function toggleKasirDeliveredField(){return Kasir.toggleDeliveredField();}
