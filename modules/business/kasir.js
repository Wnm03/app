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
lastReceipt:null,
_preorderFormKey:null,
_preorderSubmitting:false,
priceType:'jual',
viewMode:'grid', // 'grid' (tile 2 kolom) atau 'list' (baris ringkas) — kw198-kasir-viewtoggle, dipilih user & diingat lewat localStorage
categoryFilter:'', // '' = semua kategori — kw199-kasir-kategori-chip, id dari D.cobekKategori
heldCartStorageKey:'kw_kasir_held_carts_v1',
readHeldCarts(){
try{const raw=localStorage.getItem(this.heldCartStorageKey);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows.filter(x=>x&&Array.isArray(x.items)):[];}catch(e){return[];}
},
writeHeldCarts(rows){
try{localStorage.setItem(this.heldCartStorageKey,JSON.stringify((Array.isArray(rows)?rows:[]).slice(-5)));return true;}catch(e){return false;}
},
holdCart(){
if(!this.cart.length){toast('⚠️ Keranjang kosong — tidak ada yang bisa ditahan');return;}
const rows=this.readHeldCarts();let id='hold_'+Date.now()+'_'+rows.length;
while(rows.some(x=>x.id===id))id+='_1';
const items=this.cart.map(it=>({productId:String(it.productId),qty:Number(it.qty),hargaOverride:Number.isFinite(Number(it.hargaOverride))?Number(it.hargaOverride):null})).filter(it=>it.productId&&Number.isFinite(it.qty)&&it.qty>0);
if(!items.length){toast('⚠️ Isi keranjang tidak valid');return;}
rows.push({id,createdAt:Date.now(),items});
if(!this.writeHeldCarts(rows)){toast('⚠️ Keranjang tidak dapat ditahan di perangkat ini');return;}
this.cart=[];this.renderGrid();this.renderCart();toast('⏸ Keranjang ditahan di perangkat ini');
},
restoreHeldCart(id){
const rows=this.readHeldCarts(),held=rows.find(x=>String(x.id)===String(id));if(!held)return;
const qtyNow=new Map();this.cart.forEach(it=>qtyNow.set(String(it.productId),(qtyNow.get(String(it.productId))||0)+Number(it.qty||0)));
let dropped=0;
held.items.forEach(it=>{
const p=(D.products||[]).find(x=>x&&String(x.id)===String(it.productId)),qty=Number(it.qty),current=qtyNow.get(String(it.productId))||0,stock=p?Number(p.stock):NaN;
if(!p||!Number.isFinite(qty)||qty<=0||!Number.isFinite(stock)||current+qty>stock){dropped++;return;}
const existing=this.cart.find(x=>String(x.productId)===String(it.productId));
if(existing)existing.qty+=qty;else this.cart.push({productId:it.productId,qty,hargaOverride:Number.isFinite(Number(it.hargaOverride))?Number(it.hargaOverride):null});
qtyNow.set(String(it.productId),current+qty);
});
this.writeHeldCarts(rows.filter(x=>String(x.id)!==String(id)));this.renderGrid();this.renderCart();
toast(dropped?'✅ Keranjang dipulihkan; '+dropped+' item dibuang karena produk/stok tidak valid':'✅ Keranjang dipulihkan');
},
deleteHeldCart(id){this.writeHeldCarts(this.readHeldCarts().filter(x=>String(x.id)!==String(id)));this.renderHeldCarts();},
renderHeldCarts(){
const el=document.getElementById('kasirHeldCarts');if(!el)return;const rows=this.readHeldCarts();
el.innerHTML=rows.length?'<div class="u-fs11 u-fw700 u-t2 u-mb6">Keranjang ditahan (perangkat ini)</div>'+rows.map((x,i)=>'<div class="tx-item"><div class="tx-info"><div class="tx-name">Keranjang '+(i+1)+'</div><div class="tx-meta">'+x.items.length+' jenis produk</div></div><button type="button" class="btn btn-ghost btn-sm" data-action="Kasir.restoreHeldCart" data-args="'+escapeHtml(JSON.stringify([x.id]))+'">Pulihkan</button><button type="button" class="tx-del" data-action="Kasir.deleteHeldCart" data-args="'+escapeHtml(JSON.stringify([x.id]))+'" aria-label="Hapus keranjang ditahan">×</button></div>').join(''):'';
},
dailyRecap(date){
const day=String(date||(typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10)));
const sales=(Array.isArray(D.cobek)?D.cobek:[]).filter(x=>x&&String(x.date||'').slice(0,10)===day);
const txs=Array.isArray(D.transactions)?D.transactions:[],accounts=Array.isArray(D.accounts)?D.accounts:[],receivables=Array.isArray(D.piutang)?D.piutang:[];
const groups=new Map();let total=0,received=0,dp=0,receivable=0;
sales.forEach(sale=>{
const tx=txs.find(t=>t&&(String(t.cobekLinkId||'')===String(sale.id)||String(t.id||'')===String(sale.txLinkId||sale.id||'')));
const accountId=(tx&&tx.accountId)||sale.accountId||'',account=accounts.find(a=>a&&String(a.id)===String(accountId));
const method=tx&&tx.payMethod?String(tx.payMethod):'Tidak tercatat',key=String(accountId)+'|'+method;
if(!groups.has(key))groups.set(key,{accountId,accountName:account&&account.name||'Akun tidak tercatat',method,count:0,total:0,received:0,dp:0});
const g=groups.get(key),saleTotal=Number(sale.total)||0,paid=tx&&Number.isFinite(Number(tx.amount))?Number(tx.amount):0;
g.count++;g.total+=saleTotal;g.received+=paid;total+=saleTotal;received+=paid;if(tx&&paid<saleTotal){g.dp+=paid;dp+=paid;}
if(sale.piutangLinkId){const p=receivables.find(x=>x&&String(x.id)===String(sale.piutangLinkId));if(p&&!p.lunas)receivable+=Math.max(0,Number(p.nilai)||0);}
});
return{date:day,count:sales.length,total,received,dp,receivable,groups:[...groups.values()]};
},
renderDailyRecap(){
const el=document.getElementById('kasirDailyRecapBody');if(!el)return;const r=this.dailyRecap();
el.innerHTML=r.count?'<div class="u-flex u-jcb u-mb6"><span>Transaksi</span><b>'+r.count+'</b></div><div class="u-flex u-jcb u-mb6"><span>Total penjualan</span><b>'+fmtFull(r.total)+'</b></div><div class="u-flex u-jcb u-mb6"><span>DP tercatat</span><b>'+fmtFull(r.dp)+'</b></div><div class="u-flex u-jcb u-mb8"><span>Piutang baru terkait yang masih terbuka</span><b>'+fmtFull(r.receivable)+'</b></div>'+r.groups.map(g=>'<div class="tx-item"><div class="tx-info"><div class="tx-name">'+escapeHtml(g.accountName)+' · '+escapeHtml(g.method)+'</div><div class="tx-meta">'+g.count+' transaksi · Total '+fmtFull(g.total)+' · Uang masuk '+fmtFull(g.received)+' · DP '+fmtFull(g.dp)+'</div></div></div>').join(''):'Belum ada transaksi tersimpan untuk '+escapeHtml(r.date)+'.';
},
populateAccSelect(){
const el=document.getElementById('kasirAcc');
if(!el)return;
const cur=el.value;
el.innerHTML=D.accounts.map(a=>`<option value="${escapeHtml(a.id)}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('')+'<option value="__new__">➕ Akun Baru</option>';
el.value=(cur&&[...el.options].some(o=>o.value===cur))?cur:(D.accounts[0]?D.accounts[0].id:'');
if(el.value!=='__new__')el.dataset.prevValue=el.value;
},
// onAccSelectChange() — dipanggil dari onchange <select id="kasirAcc"> (index.html). Kalau user
// pilih opsi "➕ Akun Baru" (__new__), buka accModal (modules/finance/akun.js) lewat callback
// (pola identik openCatModal()/catModalCallback yang sudah ada), lalu auto-select akun yang baru
// dibuat. Kalau modal dibatalkan (tidak ada akun baru tersimpan), select dikembalikan ke pilihan
// sebelumnya (accModalCallback di-reset ke null oleh akun.js sendiri, jadi aman kalau modal cuma
// ditutup tanpa simpan) supaya tidak nyangkut di opsi "➕ Akun Baru".
onAccSelectChange(){
const el=document.getElementById('kasirAcc');
if(!el)return;
if(el.value!=='__new__'){el.dataset.prevValue=el.value;return;}
openAccModal(undefined,(newAcc)=>{
Kasir.populateAccSelect();
if(newAcc&&newAcc.id){el.value=newAcc.id;el.dataset.prevValue=newAcc.id;}
});
if(el.value==='__new__'&&el.dataset.prevValue)el.value=el.dataset.prevValue;
},
render(){
Kasir.populateAccSelect();
Kasir.renderCategoryChips();
Kasir.renderGrid();
Kasir.renderCart();
Kasir.renderDailyRecap();
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
if(typeof PWAUX!=='undefined'&&PWAUX.debounce){
  if(!Kasir._debouncedRenderGrid)Kasir._debouncedRenderGrid=PWAUX.debounce(function(){Kasir.renderGrid();},140);
  Kasir._debouncedRenderGrid();
}else Kasir.renderGrid();
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
+cats.map(c=>`<button type="button" class="chip-btn kasir-kat-chip${Kasir.categoryFilter===c.id?' active':''}" data-action="Kasir.setCategoryFilter" data-args='["${escapeHtml(c.id)}"]'>${escapeHtml(c.name)} (${c.count})</button>`).join('');
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
const preorderAktif=!!(p.preorder&&p.preorder.aktif);
let harga=(Kasir.priceType==='reseller'&&p.hargaReseller)?p.hargaReseller:p.hargaJual;
if(p.diskonPersen)harga=(typeof shopDiscountedPrice==='function')?shopDiscountedPrice(harga,p.diskonPersen):harga-(harga*p.diskonPersen/100);
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
const rowAction=habis?(preorderAktif?'Kasir.openPreorderForm':'Kasir.stockOutNotice'):'Kasir.addToCart';
const rowAttrs=` data-action="${rowAction}" data-args='["${escapeHtml(p.id)}"]'`;
if(isList){
const badge=inCart?`<div class="kasir-tile-badge kasir-tile-badge-inline">${inCart.qty}</div>`:'';
return`<div class="kasir-tile kasir-tile-row ${stockLvl}${habis&&!preorderAktif?' kasir-tile-disabled':''}${preorderAktif&&habis?' kasir-tile-preorder':''}${inCart?' kasir-tile-active':''}"${rowAttrs}>
      ${priceWarn}
      <div class="kasir-tile-row-main">
        <div class="kasir-tile-name">${escapeHtml(p.name)}</div>
        <div class="kasir-tile-stock">${habis?(preorderAktif?'Stok habis · PREORDER':'Stok habis'):'Stok '+p.stock}</div>
      </div>
      <div class="kasir-tile-price">${fmt(harga)}</div>
      ${badge}
    </div>`;
}
return`<div class="kasir-tile ${stockLvl}${habis&&!preorderAktif?' kasir-tile-disabled':''}${preorderAktif&&habis?' kasir-tile-preorder':''}${inCart?' kasir-tile-active':''}"${rowAttrs}>
      ${priceWarn}
      <div class="kasir-tile-name">${escapeHtml(p.name)}</div>
      <div class="kasir-tile-price">${fmt(harga)}</div>
      <div class="kasir-tile-stock">${habis?(preorderAktif?'Stok habis · PREORDER':'Stok habis'):'Stok '+p.stock}</div>
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
stockOutNotice(pid){
const p=D.products.find(x=>x&&String(x.id)===String(pid));
toast('⚠️ Stok habis'+(p&&p.name?' untuk '+p.name:'')+'. Produk tidak dimasukkan ke keranjang.');
},
openPreorderForm(pid){
const p=D.products.find(x=>x&&String(x.id)===String(pid));
if(!p||Number(p.stock)>0||!(p.preorder&&p.preorder.aktif)){toast('⚠️ Preorder tidak tersedia untuk produk ini');return;}
if(typeof Preorder==='undefined'||typeof Preorder.create!=='function'){toast('⚠️ Modul preorder belum tersedia');return;}
let modal=document.getElementById('kasirPreorderModal');
if(!modal){
  modal=document.createElement('div');modal.id='kasirPreorderModal';modal.className='overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.innerHTML=`<div class="modal"><div class="modal-handle"></div><div class="modal-title"><span>📝 Buat Preorder Kasir</span><button class="modal-close" data-action="closeModal" data-args='["kasirPreorderModal"]' aria-label="Tutup">✕</button></div><div id="kasirPreorderProduct" class="u-fs13 u-fw700 u-mb10"></div><div class="fg"><label class="fl" for="kasirPoName">Nama pemesan *</label><input class="fi" id="kasirPoName" maxlength="100" autocomplete="name" placeholder="Nama pemesan"></div><div class="fg"><label class="fl" for="kasirPoPhone">No. HP</label><input class="fi" id="kasirPoPhone" maxlength="30" inputmode="tel" placeholder="08xx"></div><div class="fg"><label class="fl" for="kasirPoQty">Jumlah *</label><input class="fi" id="kasirPoQty" type="number" min="1" step="1" inputmode="numeric" value="1"></div><div class="fg"><label class="fl" for="kasirPoNote">Catatan</label><textarea class="fi" id="kasirPoNote" rows="2" placeholder="Warna, varian, atau catatan lain"></textarea></div><div id="kasirPoQuota" class="u-fs11 u-t2 u-mb10"></div><button type="button" class="btn btn-primary btn-full" data-action="Kasir.submitPreorderForm">Simpan preorder</button></div>`;
  document.body.appendChild(modal);
}
this._preorderFormKey='kasir:'+String(p.id)+':'+Date.now()+':'+Math.random().toString(36).slice(2,8);
this._preorderSubmitting=false;
const product=document.getElementById('kasirPreorderProduct');if(product)product.textContent=p.name+' · Stok '+p.stock;
const quota=Preorder.quota(p.id);const quotaEl=document.getElementById('kasirPoQuota');
if(quotaEl)quotaEl.textContent=quota.sisa===null?'Kuota preorder: tidak dibatasi':'Sisa kuota: '+quota.sisa+' dari '+quota.kuota;
['kasirPoName','kasirPoPhone','kasirPoNote'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const qty=document.getElementById('kasirPoQty');if(qty)qty.value='1';
modal.dataset.productId=String(p.id);
openModal('kasirPreorderModal');
},
submitPreorderForm(){
if(this._preorderSubmitting)return;
const modal=document.getElementById('kasirPreorderModal');
const productId=modal&&modal.dataset.productId;
const name=(document.getElementById('kasirPoName')?.value||'').trim();
const phone=(document.getElementById('kasirPoPhone')?.value||'').trim();
const qty=Number(document.getElementById('kasirPoQty')?.value);
const note=(document.getElementById('kasirPoNote')?.value||'').trim();
if(!name){toast('⚠️ Nama pemesan wajib diisi');return;}
if(!Number.isInteger(qty)||qty<=0){toast('⚠️ Jumlah preorder harus bilangan bulat lebih dari 0');return;}
this._preorderSubmitting=true;
const btn=modal&&modal.querySelector('[data-action="Kasir.submitPreorderForm"]');if(btn)btn.disabled=true;
const result=Preorder.create({productId,customer:{name,phone},qty,note,idempotencyKey:this._preorderFormKey});
this._preorderSubmitting=false;if(btn)btn.disabled=false;
if(!result.ok){toast('⚠️ '+result.message);return;}
closeModal('kasirPreorderModal');
toast(result.duplicate?'ℹ️ Preorder sudah tersimpan':'✅ Preorder tersimpan');
if(typeof Preorder.renderPanel==='function')Preorder.renderPanel();
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
if(p.diskonPersen)hargaDefault=(typeof shopDiscountedPrice==='function')?shopDiscountedPrice(hargaDefault,p.diskonPersen):hargaDefault-(hargaDefault*p.diskonPersen/100);
const harga=(it.hargaOverride!=null&&it.hargaOverride>0)?it.hargaOverride:hargaDefault;
const lineTotal=harga*it.qty;
subtotal+=lineTotal;modal+=(p.hargaBeli||0)*it.qty;
return{...it,product:p,harga,hargaDefault,lineTotal};
}).filter(Boolean);
const diskon=parseFloat(document.getElementById('kasirDiskon')?.value)||0;
// S2725 (audit Kasir K1): ongkir negatif/NaN/Infinity tidak boleh memotong total — paritas dgn Order.computeTotals (S2307 B9). Dulu total jadi negatif -> syncShopSalePayment menolak SETELAH stok terpotong.
const _ongkirN=parseFloat(document.getElementById('kasirOngkir')?.value);const ongkir=Number.isFinite(_ongkirN)?Math.max(0,_ongkirN):0;
const effectiveDiskon=Math.min(Math.max(0,diskon),Math.max(0,subtotal));
const total=Math.max(0,subtotal-effectiveDiskon)+ongkir;
const profit=typeof calculateNetProfit==='function'?calculateNetProfit(subtotal,modal,diskon):Math.max(0,subtotal)-Math.min(Math.max(0,diskon),Math.max(0,subtotal))-modal;
// S2726: `diskon` tetap nilai mentah (kontrak B9, utk audit/UI); `diskonEfektif` (0..subtotal) dipakai saat MENYIMPAN & di struk, supaya record tidak berisi diskon negatif/berlebih.
return{lines,subtotal,modal,diskon,diskonEfektif:effectiveDiskon,ongkir,total,profit};
},
renderCart(){
const{lines,subtotal,diskonEfektif:diskon,ongkir,total,profit}=Kasir.computeTotals();
const el=document.getElementById('kasirCartList');
Kasir.renderHeldCarts();
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
const changeRow=document.getElementById('kasirChangeRow');
const dpInput=document.getElementById('kasirDP');
const dpRaw=dpInput?String(dpInput.value||'').trim():'';
const received=dpRaw===''?total:Math.max(0,Number.parseFloat(dpRaw)||0);
const change=received-total;
if(changeRow){changeRow.style.display=change>0?'flex':'none';const changeEl=document.getElementById('kasirChangeDisplay');if(changeEl)changeEl.textContent=fmtFull(change>0?change:0);}

const profitEl=document.getElementById('kasirProfitDisplay');if(profitEl)profitEl.textContent=(profit<0?'Estimasi rugi: ':'Estimasi untung: ')+(typeof fmtFullSigned==='function'?fmtFullSigned(profit):(profit<0?'-':'')+fmtFull(Math.abs(profit)));
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
const saved=Kasir.cart.length?null:Kasir.lastReceipt;
const totals=saved?{lines:saved.lines,diskonEfektif:saved.diskon,ongkir:saved.ongkir,total:saved.total}:{...Kasir.computeTotals()};
const{lines,diskonEfektif:diskon,ongkir,total}=totals;
const namaToko=(D.profile&&(D.profile.namaBisnis||D.profile.nama))||'Toko';
const kasir=(D.profile&&D.profile.namaKasir)||'Kasir';
const acc=(D.accounts||[]).find(a=>a&&a.id===(saved?saved.accountId:(document.getElementById('kasirAcc')?.value)));
const cashReceived=saved?saved.cashReceived:(()=>{const raw=(document.getElementById('kasirDP')?.value||'').trim();return raw===''?total:Math.max(0,Number.parseFloat(raw)||0);})();
const received=saved?saved.dp:Math.min(cashReceived,total);
const change=saved?saved.change:Math.max(0,cashReceived-total);
let txt=`🧾 ${namaToko}\n${saved?'No. transaksi: '+saved.txId:'DRAFT — belum disimpan'}\nKasir: ${kasir}\nTanggal: ${saved?saved.date:new Date().toLocaleDateString('id-ID')}\nPelanggan: ${(saved&&saved.customerName)||'Umum'}\n`;
txt+=`Metode bayar: Tunai · Akun: ${(acc&&acc.name)||'akun kasir'}\n\n`;
lines.forEach(l=>{const name=l.product?l.product.name:(l.name||'Produk');txt+=`${name} x${l.qty}  ${fmt(l.lineTotal)}\n`;});
if(diskon>0)txt+=`Diskon: -${fmt(diskon)}\n`;
if(ongkir>0)txt+=`Ongkir: +${fmt(ongkir)}\n`;
txt+=`\nTOTAL: ${fmt(total)}\nUang diterima: ${fmt(cashReceived)}\nPembayaran tercatat (DP): ${fmt(received)}\nSisa piutang: ${fmt(saved?saved.sisa:Math.max(0,total-received))}\nKembalian: ${fmt(change)}\n\nTerima kasih! 🙏`;
return txt;
},
async shareReceipt(){
if(!Kasir.cart.length&&!Kasir.lastReceipt){toast('⚠️ Keranjang masih kosong');return;}
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
const{lines,subtotal,diskonEfektif:diskon,ongkir,total,profit}=Kasir.computeTotals();
const items=lines.map(l=>({productId:l.productId,name:l.product.name,qty:l.qty,harga:l.harga,lineTotal:l.lineTotal}));
const accId=document.getElementById('kasirAcc')?document.getElementById('kasirAcc').value:D.accounts[0]?.id;
const custName=(document.getElementById('kasirCustName')?.value||'').trim();
const custPhone=(document.getElementById('kasirCustPhone')?.value||'').trim();
// kw-kasir-audit-1: alamat sekarang ikut dikirim (dulu selalu '' hardcoded).
const custAddr=(document.getElementById('kasirCustAddr')?.value||'').trim();
const customer={name:custName,phone:custPhone,address:custAddr};
// kw-kasir-audit-2: delivered sekarang ikut toggle di UI (dulu selalu true hardcoded).
const delivered=document.getElementById('kasirDelivered')?document.getElementById('kasirDelivered').checked:true;
const date=todayStr();
const note=(document.getElementById('kasirNote')?.value||'').trim();
const txId=uid();
// S2725 (K1): preflight — tolak SEBELUM stok/D.cobek disentuh kalau total tidak bisa disinkronkan ke pembayaran.
if(!Number.isFinite(total)||total<0){toast('⚠️ Total tidak valid — periksa diskon/ongkir. Transaksi tidak disimpan.');return;}
const result=recordShopSale({
items,subtotal,diskon,ongkir,total,profit,date,note,customer,priceType:Kasir.priceType,delivered,
accountId:accId,txId,existingShopId:null
});
if(!result.ok){toast('⚠️ '+result.message);return;}
const itemSummary=items.map(it=>it.name+' x'+it.qty).join(', ');
// Kasir dan Order memakai rekonsiliasi pembayaran kanonis yang sama.
const dpRaw=document.getElementById('kasirDP')?document.getElementById('kasirDP').value.trim():'';
if(typeof syncShopSalePayment!=='function')throw new Error('SHOP_PAYMENT_RECONCILIATION_REQUIRED');
// S2725 (K1): recordShopSale sudah memotong stok & membuat baris D.cobek. Kalau sinkron pembayaran gagal
// (return !ok ATAU throw), batalkan semuanya lewat SSOT yg sama (rollbackShopItems) supaya tidak ada penjualan
// yatim & stok hilang; keranjang tetap utk dicoba ulang tanpa menggandakan penjualan.
const _undoNewSale=()=>{
try{if(typeof FinanceTxSOT!=='undefined'&&FinanceTxSOT&&FinanceTxSOT.removeById&&D.transactions.some(t=>t&&t.id===txId))FinanceTxSOT.removeById(txId);}catch(e){void e;}
const row=D.cobek.find(c=>c.id===result.shopId);
if(row&&row.piutangLinkId&&typeof BillDebtPiutangCanonicalWriter!=='undefined'&&BillDebtPiutangCanonicalWriter.removeById){try{BillDebtPiutangCanonicalWriter.removeById('piutang',row.piutangLinkId);}catch(e){void e;}}
rollbackShopItems(items,1,txId);
D.cobek=D.cobek.filter(c=>c.id!==result.shopId);
};
let payment;
try{payment=syncShopSalePayment({shopId:result.shopId,txId,dpRaw,total,accountId:accId,customerName:customer.name,date,itemSummary});}
catch(err){_undoNewSale();toast('⚠️ Pembayaran gagal, penjualan dibatalkan: '+(err&&err.message||err));return;}
if(!payment.ok){_undoNewSale();toast('⚠️ Pembayaran tidak tersinkron ('+payment.reason+'). Penjualan dibatalkan, stok dikembalikan.');return;}
const dpVal=payment.dp,sisa=payment.sisa;
Kasir.lastReceipt={txId,shopId:result.shopId,date,customerName:customer.name,accountId:accId,lines:lines.map(l=>({name:l.product.name,qty:l.qty,lineTotal:l.lineTotal})),diskon,ongkir,total,dp:dpVal,sisa,cashReceived:dpRaw===''?total:Math.max(0,Number.parseFloat(dpRaw)||0),change:Math.max(0,(Number.parseFloat(dpRaw)||0)-total)};
save();
renderProductList();renderShop();Order.renderRecent();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});renderSiapPulang();
if(typeof Piutang!=='undefined'&&Piutang.renderList)Piutang.renderList();
toast(sisa>0?`✅ Tersimpan — DP ${fmtFull(dpVal)}, sisa ${fmtFull(sisa)} otomatis masuk Piutang`:'✅ Transaksi tersimpan & tersinkron ke Keuangan');
Kasir.reset();
}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Kasir'][method]. `const Kasir = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di modules/vehicle/fuel-modal.js / window.BBM,Servis,Torsi
// di car-notes.js (Sesi 345) — bug yang sama pernah terjadi & diperbaiki di
// sana. Tanpa baris ini, semua tombol data-action="Kasir.xxx" gagal diam-diam.
if (typeof Kasir !== 'undefined') window.Kasir = Kasir;
// Muat preferensi mode tampilan (grid/list) yg tersimpan dari sesi sebelumnya — kw198-kasir-viewtoggle.
(function(){try{const saved=localStorage.getItem('kw_kasirViewMode');if(saved==='list')Kasir.viewMode='list';}catch(e){/* default 'grid' */}})();
// kw-kasir-audit-2: wrapper global dipanggil dari onchange di HTML, sama pola persis
// toggleOrderDeliveredField() (modules/shop/cobek-io.js) yg membungkus SiapPulang.toggleDeliveredField().
function toggleKasirDeliveredField(){return Kasir.toggleDeliveredField();}
