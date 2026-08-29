// cobek-etalase.js — Domain Shop bagian Etalase: katalog produk (tambah/edit/hapus,
// Dipindah ke modules/shop/cobek-etalase.js (Sesi 10 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// size-pairing bracket harga, bundle, modal stok tertanam), stok, & produsen terkait produk.
// Dipecah dari cobek.js (2026-07-12, file lama 1966 baris > 500 baris) menjadi 5 file:
// cobek-etalase.js, cobek-pricing.js, cobek-order.js, cobek-tx-cart.js, cobek-io.js —
// MURNI pemotongan baris (tanpa ubah urutan/logic), jadi harus tetap dimuat BERURUTAN
// persis seperti urutan di atas (lihat GROUP_A di build.js) supaya perilaku identik dgn
// cobek.js lama.

// cobek.js — Domain Shop: etalase/stok produk, produsen, order pelanggan, laporan omzet, data pelanggan,
// widget dashboard "🤖 Rekomendasi Harga Jual AI" (PriceRekoWidget, kw73) & "📦 Rekomendasi Restock AI"
// (StockRekoWidget, kw74) — keduanya rule-based, tanpa panggil AI/web search.
// Dipisah dari: features-etalase-piutang-renovai.js, features-renovasi-pajak-aset-order.js,
// features-budget-laporan-carnotes-pelanggan.js, features-gaji-shop-tagihan.js (kini transaksi.js),
// features-aiwidget-reminder-gdrive-search.js, backup-restore.js, modules-render.js
// PENTING: harus dimuat SETELAH features-helpers-global-security.js tidak wajib (D dipakai di dalam method, bukan top-level),
// tapi tetap taruh di GROUP_A dekat modul lain yg saling terkait (lihat build.js).
// CATATAN: dispatcher form transaksi gabungan (updateTxVehiclePanels/saveTx di transaksi.js,
// dulu di features-gaji-shop-tagihan.js) TETAP terpisah karena juga menangani domain
// BBM/Sparepart (Car Notes) — lihat PEMISAHAN-FILE-ROADMAP.md.

// isProductOwnershipSelf(p) — helper REUSE dari OwnershipEngine (Product Ownership
// Foundation, Inventory/Shop), pola PERSIS isCobekOwnershipSelf() (cobek-order.js,
// Sesi 194) / isVehicleOwnershipSelf() (vehicle-core.js, Sesi 196). Balikin true
// kalau kepemilikan EFEKTIF produk ini SELF (termasuk produk lama yg belum punya
// field `ownership` sama sekali — via OwnershipEngine.resolve() otomatis fallback
// ke SELF/DEFAULT, sekaligus jadi "migrasi" data lama: TIDAK perlu menulis ulang
// D.products yang sudah ada, field ownership dianggap SELF sampai produk itu
// diedit & disimpan ulang lewat Product Modal, saat itu field `ownership` baru
// dipatenkan eksplisit — sama persis pola saveVehicle()). Balikin false kalau
// ownership-nya salah satu dari INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY. Guard typeof
// OwnershipEngine: kalau engine belum dimuat, fallback true (anggap SELF/tidak
// exclude apa pun), sama pola guard fungsi lain di atas.
function isProductOwnershipSelf(p){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(p).type==='SELF';
}
// ATTR_FORM_MAP — Tahap 10 (Generic Shop Engine — metadata-driven form wiring,
// OPSI B dikonfirmasi user: HTML form TETAP statis, TIDAK ada metadata UI baru
// ditambah ke AttributeStore.DEFINITIONS). Mapping LOKAL kode atribut generik
// (AttributeStore.DEFINITIONS[].code) -> {id elemen HTML form, nama field fisik
// asli} SEMATA-MATA supaya openModal()/save() bisa loop, BUKAN sumber kebenaran
// baru: `field` di sini harus selalu sama persis dgn `field` di
// AttributeStore.DEFINITIONS (modules/shop/generic/attribute-store.js) utk kode
// yang sama — dipakai sebagai fallback literal kalau AttributeStore belum
// dimuat (guard typeof, pola sama seluruh file ini), persis field yang dipakai
// manual assignment Tahap 9/sebelumnya (0 field baru, 0 kode baru).
const ATTR_FORM_MAP={
diskon_persen:{el:'pDiskon',field:'diskonPersen'},
berat_per_unit:{el:'pBeratPerUnit',field:'beratPerUnit'},
panjang:{el:'pPanjang',field:'panjang'},
lebar:{el:'pLebar',field:'lebar'},
tinggi:{el:'pTinggi',field:'tinggi'},
};
const Etalase={
editIdx:null,
// stockKoreksiState — flag toggle "🔍 Ini Koreksi Stok (Stok Opname)" (checkbox
// #pStockKoreksiBtn, productModal). Pola PERSIS accIncludeState (akun.js) — state
// module-level, bukan dibaca langsung dari DOM checkbox biasa krn UI-nya chip-btn
// toggle (bukan <input type=checkbox>). Direset ke false tiap openModal() dibuka
// (baris reset field lain, ~openModal()), dibaca sekali di _saveInner() saat submit.
// TIDAK disimpan ke D — murni switch UI sesaat, tidak perlu persist antar sesi modal.
stockKoreksiState:false,
toggleStockKoreksi(){this.stockKoreksiState=!this.stockKoreksiState;this.updateStockKoreksiBtn();},
updateStockKoreksiBtn(){
const btn=document.getElementById('pStockKoreksiBtn');
// Guard btn.classList (bukan cuma !btn) — beberapa test harness pakai stub DOM
// minimal yg mengembalikan objek utk id yg tidak dikenal tapi TANPA classList
// asli (pola sama toggleAccInclude() TIDAK punya guard ini krn akun.js tidak
// pernah dites lewat harness minimal itu; di sini kita perlu lebih defensif).
if(!btn||!btn.classList)return;
btn.classList.toggle('active',this.stockKoreksiState);
btn.textContent=this.stockKoreksiState?'✓ Aktif':'Nonaktif';
},
expandedKatId:null,
// pairKey/parseSizeName (kw206-cobek-size-pairing): banyak produk shop dijual "2 ukuran 1 harga"
// (mis. "Lumpang 20cm" & "lumpang 19cm" sama-sama masuk bracket harga "19-20cm"). Nama produk
// ditulis bebas per-unit stok (ukuran presisi tiap batu beda-beda), tapi HARGA & rekomendasi
// margin/kecepatan-jual seharusnya dianggap satu kelompok per bracket ganjil-genap 2cm, supaya tidak
// pecah jadi angka yang saling tidak nyambung (lihat keluhan user: estimasi PriceReko & restock utk
// tiap ukuran individual saling beda2 padahal harusnya sama). Dikecualikan: kategori "alu"/"muntu"
// (harga per-ukuran, TIDAK dipasangkan) — sesuai instruksi user, bukan berdasar kategoriId (D.cobekKategori
// dipakai untuk tier ukuran umum Kecil/Sedang/Besar, BUKAN bentuk barang), tapi berdasar kata pertama
// di NAMA produk itu sendiri ("sync otomatis sesuai nama").
parseSizeName(name){
if(!name)return null;
const m=String(name).trim().match(/^([a-zA-Z]+)\s+(\d+)(?:\s*[-–]\s*(\d+))?\s*cm(.*)$/i);
if(!m)return null;
return{shape:m[1].toLowerCase(),size1:parseInt(m[2],10),size2:m[3]?parseInt(m[3],10):null,suffix:m[4].trim().toLowerCase()};
},
NO_PAIR_SHAPES:['alu','muntu','munthu','munthu/ulekan'],
// bracketRange — shape+bracket TANPA suffix (dipakai buat mencocokkan bundle "+alu/+muntu" ke produk
// dasarnya yg polos, lihat bundleAddonShape/applyBundleLinkedStock kw207-cobek-bundle-addon).
bracketRange(product){
if(!product||!product.name)return null;
const parsed=this.parseSizeName(product.name);
if(!parsed)return null;
if(this.NO_PAIR_SHAPES.includes(parsed.shape))return null;
let start,end;
if(parsed.size2!=null){start=Math.min(parsed.size1,parsed.size2);end=Math.max(parsed.size1,parsed.size2);}
else{start=(parsed.size1%2===0)?parsed.size1-1:parsed.size1;end=start+1;}
return`${parsed.shape}|${start}-${end}`;
},
pairKey(product){
const range=this.bracketRange(product);
if(!range)return null;
const parsed=this.parseSizeName(product.name);
return`${range}|${parsed.suffix}`;
},
// bundleAddonShape (kw207-cobek-bundle-addon) — user jelaskan: produk kayak "Cobek 19-20cm+muntu"
// / "Lumpang 20cm+alu" itu BUKAN cuma nama, tapi bundle sungguhan = 1 cobek/lumpang ukuran itu + 1
// alu/muntu digabung jual 1 harga. Balikin 'alu'/'muntu' kalau nama produk mengandung penanda itu
// di suffix (bagian sesudah "...cm"), else null.
bundleAddonShape(product){
const parsed=this.parseSizeName(product&&product.name);
if(!parsed)return null;
const m=parsed.suffix.match(/\b(alu|muntu)\b/i);
return m?m[1].toLowerCase():null;
},
pairLabel(product){
const parsed=this.parseSizeName(product.name);
if(!parsed)return product.name;
const key=this.pairKey(product);
if(!key)return product.name;
const range=key.split('|')[2];
const shapeCap=parsed.shape.charAt(0).toUpperCase()+parsed.shape.slice(1);
return`${shapeCap} ${range}cm${parsed.suffix?' '+parsed.suffix:''}`;
},
pairSiblings(product){
const key=this.pairKey(product);
if(!key)return[];
return(D.products||[]).filter(p=>p.id!==product.id&&this.pairKey(p)===key);
},
// syncPairedPrice — dipanggil sesudah save() produk. Kalau produk ini punya pasangan ukuran
// (pairKey non-null) & Harga Jual-nya beda dari pasangannya, samakan SEMUA pasangan ke harga yg baru
// disimpan (yang terakhir diedit menang), lalu kasih toast biar user tahu ada produk lain yg ikut
// ke-update otomatis.
syncPairedPrice(product){
const siblings=this.linkedSiblings(product);
if(!siblings.length)return;
const changed=siblings.filter(s=>s.hargaJual!==product.hargaJual);
if(!changed.length)return;
changed.forEach(s=>{if(typeof ProductRepository!=='undefined')ProductRepository.mutateSetPrice(s,'hargaJual',product.hargaJual);else s.hargaJual=product.hargaJual;});
save();
this.renderList();
toast(`🔗 Harga Jual ${changed.length} produk pasangan/gabungan (${changed.map(s=>s.name).join(', ')}) ikut disinkron ke ${fmtFull(product.hargaJual)}`,6000);
},
// groupSiblings/linkedSiblings/openMergeModal/confirmMerge/unlinkFromGroup (kw209-cobek-manual-merge):
// user minta cara GABUNGKAN 2+ produk (nama bebas, tidak harus ikut pola ukuran "Bentuk NNcm") jadi
// 1 harga tanpa edit satu-satu, beda dari pairKey (otomatis dari nama) di atas -- ini manual, user pilih
// sendiri produk mana saja lewat modal, ditandai field product.priceGroupId (id grup bebas). Kedua
// mekanisme (pairKey & priceGroupId) digabung lewat linkedSiblings() supaya syncPairedPrice satu pintu.
groupSiblings(product){
if(!product||!product.priceGroupId)return[];
return(D.products||[]).filter(p=>p.id!==product.id&&p.priceGroupId===product.priceGroupId);
},
linkedSiblings(product){
const seen=new Set();
const out=[];
[...this.pairSiblings(product),...this.groupSiblings(product)].forEach(s=>{
if(!seen.has(s.id)){seen.add(s.id);out.push(s);}
});
return out;
},
mergeSelectedIds:new Set(),
openMergeModal(){
this.mergeSelectedIds=new Set();
const search=document.getElementById('mergeProductSearch');
if(search)search.value='';
const priceInput=document.getElementById('mergeProductPrice');
if(priceInput){priceInput.value='';delete priceInput.dataset.userEdited;priceInput.oninput=()=>{priceInput.dataset.userEdited='1';};}
this.renderMergeList();
openModal('mergeProductModal');
},
renderMergeList(){
const el=document.getElementById('mergeProductList');
if(!el)return;
const q=(document.getElementById('mergeProductSearch')?.value||'').toLowerCase().trim();
const list=(D.products||[]).filter(p=>!q||p.name.toLowerCase().includes(q));
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-text">Tidak ada produk cocok</div></div>';this.updateMergeFooter();return;}
el.innerHTML=list.map(p=>{
const checked=this.mergeSelectedIds.has(p.id)?'checked':'';
const groupInfo=p.priceGroupId?` <span style="color:var(--accent);font-size:11px;font-weight:700">🔗 sudah gabung (${this.groupSiblings(p).length+1} produk)</span>`:'';
return`<label style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border);cursor:pointer">
<input type="checkbox" ${checked} data-action="Etalase.toggleMergeSelect" data-args='["${p.id}","$el"]' style="width:18px;height:18px;flex-shrink:0">
<div style="flex:1"><div style="font-size:13px;font-weight:600">${escapeHtml(p.name)}${groupInfo}</div><div style="font-size:11px;color:var(--text2)">${fmt(p.hargaJual)}</div></div>
</label>`;
}).join('');
this.updateMergeFooter();
},
toggleMergeSelect(id,el){
const checked=el&&el.checked;
if(checked)this.mergeSelectedIds.add(id);else this.mergeSelectedIds.delete(id);
this.updateMergeFooter();
},
updateMergeFooter(){
const n=this.mergeSelectedIds.size;
const btn=document.getElementById('mergeProductConfirmBtn');
const txt=document.getElementById('mergeProductPreviewText');
const priceWrap=document.getElementById('mergeProductPriceWrap');
const priceInput=document.getElementById('mergeProductPrice');
if(n>=2){
if(btn)btn.disabled=false;
if(txt)txt.textContent=`${n} produk dipilih — akan disamakan ke 1 harga`;
if(priceWrap)priceWrap.style.display='';
if(priceInput&&!priceInput.dataset.userEdited){
const firstId=[...this.mergeSelectedIds][0];
const firstP=(D.products||[]).find(p=>p.id===firstId);
if(firstP)priceInput.value=firstP.hargaJual;
}
}else{
if(btn)btn.disabled=true;
if(txt)txt.textContent='Pilih minimal 2 produk';
if(priceWrap)priceWrap.style.display='none';
}
},
confirmMerge(){
const ids=[...this.mergeSelectedIds];
if(ids.length<2){toast('⚠️ Pilih minimal 2 produk');return;}
const priceInput=document.getElementById('mergeProductPrice');
const price=parseFloat(priceInput?.value)||0;
if(!price){toast('⚠️ Isi harga jual gabungan');return;}
const selected=ids.map(id=>(D.products||[]).find(p=>p.id===id)).filter(Boolean);
let groupId=null;
for(const p of selected){if(p.priceGroupId){groupId=p.priceGroupId;break;}}
if(!groupId)groupId='pg_'+Date.now();
const allMembers=new Set(selected.map(p=>p.id));
(D.products||[]).forEach(p=>{if(p.priceGroupId===groupId)allMembers.add(p.id);});
const names=[];
(D.products||[]).forEach(p=>{
if(allMembers.has(p.id)){p.priceGroupId=groupId;if(typeof ProductRepository!=='undefined')ProductRepository.mutateSetPrice(p,'hargaJual',price);else p.hargaJual=price;names.push(p.name);}
});
save();
this.renderList();
closeModal('mergeProductModal');
toast(`🔗 ${allMembers.size} produk digabung ke 1 harga ${fmtFull(price)}: ${names.join(', ')}`,6000);
},
async unlinkFromGroup(i){
const p=D.products[i];
if(!p||!p.priceGroupId)return;
if(!await askConfirm(`Lepas "${p.name}" dari grup harga gabungan? Harga produk lain di grup tidak berubah, tapi produk ini tidak akan ikut ke-update otomatis lagi.`))return;
delete p.priceGroupId;
save();
this.renderList();
toast('🔓 Produk dilepas dari grup harga');
},
// duplicateProduct(i) — Tahap 5 (Generic Shop Engine, UI Duplicate Product).
// Tombol BARU di kartu katalog yang murni memakai ProductRepository.cloneProduct()
// (Tahap 4, modules/shop/generic/product-repository.js) + ProductRepository.saveProduct()
// (upsert PURE) — TIDAK menyentuh Etalase.save() atau alur create/update existing sama
// sekali. cloneProduct() sendiri sudah final sejak Tahap 4: id baru, deep clone, stock
// dipaksa 0, field lain (harga/kategori/produsen/ownership/atribut fisik/hargaByProdusen/
// priceGroupId) tetap sama persis dgn produk asal — TIDAK diubah di sini.
// Alur: cloneProduct(product) -> {ok,product:clone} -> saveProduct(D.products, clone)
// (PURE upsert, balikin array baru krn clone.id belum ada di D.products jadi selalu
// APPEND) -> D.products diganti dgn array baru itu -> save() (fungsi global existing,
// SAMA persis yang dipanggil di seluruh CRUD produk lain, bukan Etalase.save()) -> renderList().
// Guard `typeof ProductRepository==='undefined'`: kalau modul Tahap 4 belum dimuat (mis.
// urutan build lama/parsial), tombol ini disembunyikan total di renderList() (lihat di bawah)
// supaya tidak ada tombol mati — backward compatible, 0 breaking change kalau file itu
// belum ada di suatu build.
async duplicateProduct(i){
if(typeof ProductRepository==='undefined')return;
const p=D.products[i];
if(!p)return;
if(!await askConfirm(`Duplikat produk "${p.name}"? Salinan baru akan dibuat dgn stok 0, harga & atribut lain sama persis.`))return;
const cloneResult=ProductRepository.cloneProduct(p);
if(!cloneResult.ok){toast('⚠️ Gagal duplikat produk: '+cloneResult.reason);return;}
const saveResult=ProductRepository.saveProduct(D.products,cloneResult.product);
if(!saveResult.ok){toast('⚠️ Gagal menyimpan hasil duplikat: '+saveResult.reason);return;}
D.products=saveResult.products;
save();
this.renderList();
toast(`✅ "${p.name}" diduplikat sbg "${cloneResult.product.name}" (stok 0)`);
},

// totalModalStok/totalNilaiJualStok (kw208-cobek-modal-stok) — total uang modal (HPP) yg masih
// "tertanam" di stok gudang (belum jadi uang tunai lagi sampai terjual), & estimasi nilai jualnya
// kalau semua stok itu laku di Harga Jual sekarang. Dipakai di kartu ringkasan tab Shop (cModalStok/
// cNilaiJualStok) & disuntikkan ke konteks chat AI (features-aiwidget-reminder-gdrive-search.js)
// supaya analisa keuangan AI tahu ada uang yg "nyangkut" di bentuk barang, bukan cuma saldo akun.
// Tahap 2 (Generic Shop Engine, Pricing & Inventory Integration): pembacaan
// harga/stok di bawah ini dialihkan lewat InventoryService/PricingService
// (modules/shop/generic/*.js, Tahap 1) kalau sudah dimuat — guard typeof +
// fallback ke rumus asli (baca hargaBeli/hargaJual/stock langsung) kalau
// belum, PERSIS pola guard yang sudah dipakai di seluruh file ini (mis.
// isProductOwnershipSelf). 0 rumus baru, 0 perubahan hasil: InventoryService.
// totalValue()/PricingService.getCost()/getRetail() 100% delegasi balik ke
// field asli yang sama (lihat generic/pricing-service.js §PRICE_TYPES).
totalModalStok(){
const self=(D.products||[]).filter(isProductOwnershipSelf);
if(typeof InventoryService!=='undefined')return InventoryService.totalValue(self,'cost');
return self.reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
},
totalNilaiJualStok(){
const self=(D.products||[]).filter(isProductOwnershipSelf);
if(typeof InventoryService!=='undefined')return InventoryService.totalValue(self,'retail');
return self.reduce((s,p)=>s+((p.stock||0)*(p.hargaJual||0)),0);
},
renderModalStat(){
const elModal=document.getElementById('cModalStok');
const elJual=document.getElementById('cNilaiJualStok');
if(elModal)elModal.textContent=fmt(this.totalModalStok());
if(elJual)elJual.textContent=fmt(this.totalNilaiJualStok());
},
openModal(idx,callback){
this.editIdx=(typeof idx==='number')?idx:null;
// Sesi lanjutan KasirAcc (item #2 audit dropdown produk/akun Shop) — callback opsional,
// dipanggil di akhir _saveInner() dgn produk yg baru dibuat/diedit, persis pola
// accModalCallback/openAccModal() (modules/finance/akun.js) & catModalCallback/openCatModal()
// (modules/finance/kategori.js). Direset ke null tiap kali openModal() dipanggil ulang.
this.modalCallback=typeof callback==='function'?callback:null;
const isEdit=this.editIdx!==null;
document.getElementById('productModalTitle').textContent=isEdit?'Edit Produk':'Tambah Produk';
const p=isEdit?D.products[this.editIdx]:null;
document.getElementById('pName').value=p?p.name:'';
document.getElementById('pStock').value=p?p.stock:'';
const pKatObj=p?((typeof ProductStore!=='undefined')?ProductStore.getCategory(p):null):null;
document.getElementById('pKategori').value=p?(pKatObj?pKatObj.name:shopKategoriName(p.kategoriId)):'';
document.getElementById('pKategoriList').innerHTML=D.cobekKategori.map(k=>`<option value="${escapeHtml(k.name)}">`).join('');
const pProdusenEl=document.getElementById('pProdusen');
if(pProdusenEl){
pProdusenEl.innerHTML='<option value="">— Tanpa produsen —</option>'+D.produsen.map(pr=>`<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('')+'<option value="__new__">➕ Produsen Baru</option>';
pProdusenEl.value=p&&p.produsenId?p.produsenId:'';
}
// Tahap 11 (Generic Shop Engine — audit sisa hardcode Product UI): 3 field
// harga di form (Beli/Jual/Reseller) dialihkan lewat PricingService kalau
// sudah dimuat, PERSIS pola yang sudah dipakai renderList() sejak Tahap 7
// (lihat komentar §Tahap 7 di renderList() bawah) — guard typeof + fallback
// baca field asli langsung kalau belum dimuat. 0 rumus baru, 0 perubahan
// nilai: PricingService.getCost/getRetail/getReseller 100% delegasi balik
// ke field yang sama.
const pBeliVal=p?((typeof PricingService!=='undefined')?PricingService.getCost(p):p.hargaBeli):'';
document.getElementById('pBeli').value=pBeliVal;
const pJualVal=p?((typeof PricingService!=='undefined')?PricingService.getRetail(p):p.hargaJual):'';
document.getElementById('pJual').value=pJualVal;
const pResellerRaw=p?((typeof PricingService!=='undefined')?PricingService.getReseller(p):p.hargaReseller):null;
document.getElementById('pReseller').value=pResellerRaw?pResellerRaw:'';
// Tahap 10 (Generic Shop Engine — metadata-driven form wiring, OPSI B):
// 5 assignment manual Tahap 9 di atas diganti loop terhadap ATTR_FORM_MAP
// (mapping lokal, lihat definisinya di atas file ini). Tiap iterasi TETAP
// baca lewat AttributeStore.getAttribute() (guard typeof, pola sama persis
// Tahap 9) dgn fallback literal `p[map.field]` kalau AttributeStore belum
// dimuat — 0 rumus baru, hasil byte-identik dgn 5 baris manual sebelumnya.
// HTML form/modals.js TIDAK disentuh (OPSI B dikonfirmasi user), cuma cara
// BACA nilai atribut yang di-generic-kan di level JS.
Object.keys(ATTR_FORM_MAP).forEach((code)=>{
const map=ATTR_FORM_MAP[code];
const el=document.getElementById(map.el);
const val=(typeof AttributeStore!=='undefined')?AttributeStore.getAttribute(p||{},code):(p&&p[map.field]);
if(el)el.value=val?val:'';
});
const pAccEl=document.getElementById('pAcc');
if(pAccEl) pAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const hint=document.getElementById('pAccHint');
if(hint) hint.textContent=isEdit?'Hanya dipakai kalau angka Stok di atas kamu naikkan (tambah stok) — selisihnya tercatat otomatis sebagai pengeluaran modal.':'Stok awal akan tercatat otomatis sebagai pengeluaran modal dari akun ini.';
// Ownership (Product Ownership Foundation) — dropdown pakai OwnershipEngine.TYPES,
// pola PERSIS _populateVehOwnershipSelect() (vehicle-core.js, Sesi 231). Produk
// lama tanpa field ownership: resolve() fallback ke SELF/DEFAULT.
const pOwnSel=document.getElementById('pOwnership');
if(pOwnSel){
if(typeof OwnershipEngine!=='undefined'){
pOwnSel.innerHTML=OwnershipEngine.TYPES.map(t=>'<option value="'+t+'">'+escapeHtml(OwnershipEngine.label(t))+'</option>').join('');
pOwnSel.value=OwnershipEngine.resolve(p||{}).type;
}else{
pOwnSel.innerHTML='<option value="SELF">Milik Sendiri</option>';
pOwnSel.value='SELF';
}
}
PriceReko.reset();
// Reset toggle "🔍 Ini Koreksi Stok" tiap modal dibuka — checkbox chip-btn ini
// TIDAK ada reset otomatis bawaan (beda dari <input> form biasa yg auto-reset via
// value assignment di atas), jadi wajib direset manual di sini, pola SAMA PERSIS
// titik reset field lain di openModal() ini.
this.stockKoreksiState=false;
this.updateStockKoreksiBtn();
// S238 (Inventory Movement): render rantai lokasi barang ke
// #productMovementList, reuse BusinessFlowPresenter.renderMovement()
// (S237 lifecycle + D.cobek/D.products yg SUDAH ADA) — kosong/diam2 kalau
// produk baru (belum punya id, belum ada di D.products).
if (typeof BusinessFlowPresenter !== 'undefined' && p) {
BusinessFlowPresenter.renderMovement(p.id);
} else {
const elMv = document.getElementById('productMovementList');
if (elMv) elMv.innerHTML = '';
}
// Sesi s478 (Koreksi Stok / Stok Opname): render riwayat log koreksi stok ke
// #productStockCorrectionList (tepat di bawah #productMovementList), reuse
// BusinessFlowPresenter.renderStockCorrections() (pola PERSIS renderMovement()
// di atas) — kosong/diam2 kalau produk baru (belum punya id, belum ada di
// D.products), sama guard p/BusinessFlowPresenter yg sudah ada di atas.
if (typeof BusinessFlowPresenter !== 'undefined' && BusinessFlowPresenter.renderStockCorrections) {
BusinessFlowPresenter.renderStockCorrections(p ? p.id : null);
} else {
const elSc = document.getElementById('productStockCorrectionList');
if (elSc) elSc.innerHTML = '';
}
// S379: entry point UI Purchase Order (lanjutan S378 — createPurchaseOrder()/
// receivePurchaseOrder() sebelumnya cuma bisa dipanggil programatik). Sama
// pola persis renderMovement() di atas — guard BusinessFlowPresenter+p,
// kosongkan kalau produk baru (belum punya id).
if (typeof BusinessFlowPresenter !== 'undefined' && BusinessFlowPresenter.renderPurchaseOrderBox) {
BusinessFlowPresenter.renderPurchaseOrderBox(p ? p.id : null);
} else {
const elPo = document.getElementById('productPurchaseOrderBox');
if (elPo) elPo.innerHTML = '';
}
// Sesi lanjutan S379: riwayat SEMUA Purchase Order per produk (bukan cuma
// yg terbaru) — reuse guard p/BusinessFlowPresenter yg SUDAH ADA di atas,
// sama pola persis renderPurchaseOrderBox().
if (typeof BusinessFlowPresenter !== 'undefined' && BusinessFlowPresenter.renderPurchaseOrderHistory) {
BusinessFlowPresenter.renderPurchaseOrderHistory(p ? p.id : null);
} else {
const elPoHist = document.getElementById('productPurchaseOrderHistory');
if (elPoHist) elPoHist.innerHTML = '';
}
openModal('productModal');
},
async onProdusenChange(){
const sel=document.getElementById('pProdusen');
if(!sel)return;
if(sel.value==='__new__'){
const name=await showPromptModal({title:'Produsen Baru',message:'Nama produsen baru:',icon:'🏭'});
if(name&&name.trim()){
// Modul 10 — inline "Produsen Baru" dialihkan lewat SupplierStore.mutateCreate()
// (SSOT Tahap 7, sudah battle-tested di Produsen.save()), guard typeof + fallback
// raw PERSIS literal lama (id generator SAMA: 'prd_'+Date.now()).
let np;
if(typeof SupplierStore!=='undefined'){
const hasil=SupplierStore.mutateCreate({name:name.trim(),contact:'',note:''});
np=hasil.ok?hasil.supplier:{id:'prd_'+Date.now(),name:name.trim(),contact:'',note:''};
}else{
np={id:'prd_'+Date.now(),name:name.trim(),contact:'',note:''};
}
D.produsen.push(np);
save();
sel.innerHTML='<option value="">— Tanpa produsen —</option>'+D.produsen.map(pr=>`<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('')+'<option value="__new__">➕ Produsen Baru</option>';
sel.value=np.id;
} else { sel.value=''; }
}
const isEdit=this.editIdx!==null;
if(isEdit&&sel.value){
const p=D.products[this.editIdx];
if(p&&p.hargaByProdusen&&p.hargaByProdusen[sel.value]){
document.getElementById('pBeli').value=p.hargaByProdusen[sel.value];
}
}
// kw192-ongkir-produsen-pref: ganti Produsen -> reset Etape1 (jarak/ongkos Ambil ke Produsen) lalu
// isi ulang dari preferensi produsen yang baru dipilih (kalau ada & panel Ongkir sedang kebuka).
const ongkirKmEl=document.getElementById('ongkirKmProdusen');
const ongkirBiayaEl=document.getElementById('ongkirBiayaProdusen');
if(ongkirKmEl)ongkirKmEl.value='';
if(ongkirBiayaEl)ongkirBiayaEl.value='';
if(typeof OngkirCalc!=='undefined'){
OngkirCalc.prefillFromProdusen();
OngkirCalc.calc();
}
},
save(){return withSaveGuard('etalase','productModal',Etalase._saveInner.bind(Etalase));},
_saveInner(){
const name=document.getElementById('pName').value.trim();
const stock=parseInt(document.getElementById('pStock').value)||0;
const kategoriName=document.getElementById('pKategori').value.trim();
const produsenSel=document.getElementById('pProdusen');
const produsenId=produsenSel&&produsenSel.value!=='__new__'?produsenSel.value:'';
const hargaBeli=parseFloat(document.getElementById('pBeli').value)||0;
const hargaJual=parseFloat(document.getElementById('pJual').value)||0;
const hargaReseller=parseFloat(document.getElementById('pReseller').value)||null;
// Tahap 10 (Generic Shop Engine — metadata-driven form wiring, OPSI B):
// 5 parseFloat() manual di atas diganti loop terhadap ATTR_FORM_MAP (mapping
// lokal, definisi di atas file ini, dipakai jg oleh openModal()). pDiskon
// SENGAJA TIDAK diberi guard elemen (sama seperti baris manual sebelumnya —
// satu-satunya field yang selalu diasumsikan ada di form, 0 perubahan
// perilaku), field lain (beratPerUnit/panjang/lebar/tinggi) tetap guard
// elemen ada/tidak seperti sebelumnya. Hasil: object attrVals dgn key = nama
// field fisik asli (persis nama variabel lama), dipakai ke fieldsBaru via
// spread di bawah — 0 rumus baru, 0 field baru, nilai byte-identik.
const attrVals={};
Object.keys(ATTR_FORM_MAP).forEach((code)=>{
const map=ATTR_FORM_MAP[code];
if(code==='diskon_persen'){
attrVals[map.field]=parseFloat(document.getElementById(map.el).value)||0;
return;
}
const el=document.getElementById(map.el);
attrVals[map.field]=el?(parseFloat(el.value)||0):0;
});
const {diskonPersen,beratPerUnit,panjang,lebar,tinggi}=attrVals;
if(!name||!hargaJual){toast('⚠️ Lengkapi nama & harga jual');return;}
const accId=document.getElementById('pAcc')?document.getElementById('pAcc').value:D.accounts[0]?.id;
const prevStock=this.editIdx!==null?(D.products[this.editIdx].stock||0):0;
const delta=stock-prevStock;
const kategoriId=resolveShopKategori(kategoriName);
// Ownership (Product Ownership Foundation) — dibaca dari dropdown, divalidasi/
// dinormalisasi via OwnershipEngine, pola PERSIS saveVehicle() (vehicle-core.js).
// Ini juga jadi titik "migrasi": produk lama yang belum punya field ownership
// (dianggap SELF lewat resolve() sampai titik ini) dipatenkan eksplisit begitu
// diedit & disimpan ulang lewat modal ini.
const ownRawP=document.getElementById('pOwnership')?.value;
const ownership=(typeof OwnershipEngine!=='undefined'&&OwnershipEngine.isValidType(ownRawP))?OwnershipEngine.normalize(ownRawP):(typeof OwnershipEngine!=='undefined'?OwnershipEngine.DEFAULT:'SELF');
let product;
// Tahap 6 — wiring ProductRepository (product-repository.js, Tahap 4) ke jalur
// nyata create/edit produk, sesuai keputusan yang dikonfirmasi user (opsi
// konservatif LAPORAN-TAHAP5-GENERIC-SHOP-ENGINE.md §rekomendasi):
//   - Create: createProduct() lalu D.products.push() — mekanisme insert TETAP
//     .push() persis seperti sebelumnya, objeknya memang baru jadi identitas
//     bukan masalah di jalur ini.
//   - Edit: updateProduct() dipakai HANYA utk menghitung hasil merge (PURE,
//     tidak memutasi input), lalu Object.assign(product, hasil.product) —
//     TETAP memutasi objek asli yang sama di D.products[editIdx]. Identitas
//     objek 100% tidak berubah dari perilaku sebelumnya (0 perubahan pada
//     45+ file yang bergantung pada D.products[idx] stabil referensinya).
// Guard typeof ProductRepository (pola SAMA PERSIS OwnershipEngine/AttributeStore
// di seluruh file ini) — kalau modul belum/tidak dimuat, fallback ke literal
// Object.assign/object-literal lama, 0 perubahan perilaku.
const fieldsBaru={name,stock,hargaBeli,hargaJual,hargaReseller,diskonPersen,kategoriId,beratPerUnit,panjang,lebar,tinggi,ownership};
if(this.editIdx!==null){
product=D.products[this.editIdx];
if(typeof ProductRepository!=='undefined'){
const hasil=ProductRepository.updateProduct(product,fieldsBaru);
if(hasil.ok){Object.assign(product,hasil.product);}
else{Object.assign(product,fieldsBaru);}
} else {
Object.assign(product,fieldsBaru);
}
} else {
let produkBaru={id:'prod_'+Date.now(),...fieldsBaru,produsenId:'',hargaByProdusen:{}};
if(typeof ProductRepository!=='undefined'){
const hasil=ProductRepository.createProduct(fieldsBaru);
if(hasil.ok)produkBaru=hasil.product;
}
product=produkBaru;
D.products.push(product);
}
if(!product.hargaByProdusen)product.hargaByProdusen={};
if(produsenId){
if(typeof ProductRepository!=='undefined')ProductRepository.mutateSetField(product,'produsenId',produsenId);else product.produsenId=produsenId;
// Modul 6 — mutasi nested hargaByProdusen dialihkan ke ProductRepository.
if(hargaBeli>0){
if(typeof ProductRepository!=='undefined')ProductRepository.mutateSetHargaProdusen(product,produsenId,hargaBeli);
else product.hargaByProdusen[produsenId]=hargaBeli;
}
}
const produsenName=produsenId?(D.produsen.find(pr=>pr.id===produsenId)||{}).name:'';
const kategoriLabel=kategoriName?` · kategori ${kategoriName}`:'';
const produsenLabel=produsenName?` · dari ${produsenName}`:'';
// Sesi s478 (Koreksi Stok / Stok Opname): kalau toggle "🔍 Ini Koreksi Stok" aktif,
// kenaikan stok BUKAN dianggap beli baru — gate transaksi pengeluaran di bawah
// (`delta>0&&hargaBeli>0`) sengaja di-skip lewat `&&!isKoreksi` supaya TIDAK ada
// transaksi tercatat, digantikan 1 entry log ke D.productStockCorrections (array
// flat baru, pola sama D.purchaseOrders) SELAMA delta!==0 (naik ATAU turun —
// beda dari transaksi beli yg cuma pernah jalan utk delta>0). Toggle di-reset
// tiap buka modal (lihat openModal()), jadi default-nya SELALU nonaktif kecuali
// user sengaja mencentang untuk sesi simpan ini saja.
const isKoreksi=!!this.stockKoreksiState;
if(isKoreksi&&delta!==0){
if(!D.productStockCorrections)D.productStockCorrections=[];
D.productStockCorrections.push({id:uid(),productId:product.id,from:prevStock,to:stock,delta,ts:new Date().toISOString(),note:`Koreksi stok ${name}${kategoriLabel}`});
save();closeModal('productModal');this.renderList();
toast(`✅ Stok dikoreksi (${delta>0?'+':''}${delta}), tanpa transaksi`);
this.syncPairedPrice(product);
if(this.modalCallback){const cb=this.modalCallback;this.modalCallback=null;cb(product);}
return;
}
if(delta>0&&hargaBeli>0&&!isKoreksi){
const cost=delta*hargaBeli;
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:`Beli stok ${name} x${delta}${kategoriLabel}${produsenLabel} (modal shop)`,date:new Date().toISOString().split('T')[0],stockProductId:product.id,stockQty:delta,produsenId:produsenId||undefined,kategoriId:kategoriId||undefined});
save();closeModal('productModal');this.renderList();renderDashboard();renderKeuangan();
toast(`✅ Produk disimpan, +${delta} stok tercatat sbg pengeluaran ${fmtFull(cost)}`);
this.syncPairedPrice(product);
if(this.modalCallback){const cb=this.modalCallback;this.modalCallback=null;cb(product);}
return;
}
save();closeModal('productModal');this.renderList();toast('✅ Produk disimpan (hanya update, tanpa transaksi)');
this.syncPairedPrice(product);
if(this.modalCallback){const cb=this.modalCallback;this.modalCallback=null;cb(product);}
},
async delete(i){
if(!await askConfirm('Hapus produk ini dari etalase?'))return;
// Modul 12 — hapus produk dialihkan lewat ProductRepository.mutateDelete()
// (GATE BARU sesi ini, tidak ada gate delete produk sebelumnya, pola SAMA
// PERSIS SupplierStore.mutateDelete()), guard typeof + fallback raw PERSIS
// literal lama (splice by index). Kalau index sudah basi (produk di index
// itu sudah tidak ada), fallback ke splice mentah SAMA PERSIS perilaku lama
// supaya 0 perubahan pada kasus tepi itu.
const p=D.products[i];
if(p&&typeof ProductRepository!=='undefined'){
const r=ProductRepository.mutateDelete(D.products,p.id);
if(r.ok)D.products=r.products;
else D.products.splice(i,1);
}else{
D.products.splice(i,1);
}
// Sesi 376 (Inventory Movement manual override): bersihkan override lokasi
// manual punya produk yg dihapus, kalau ada — cegah D.productMovementOverride
// nyimpen entry basi mengarah ke productId yg sudah tidak eksis.
if(p&&D.productMovementOverride&&D.productMovementOverride[p.id]){
delete D.productMovementOverride[p.id];
}
save();this.renderList();toast('🗑 Dihapus');
},
katEditId:null,
// editKategori(id) — Fitur Edit Kategori Produk (audit sesi 132: kategori
// sebelumnya cuma bisa Hapus, tidak bisa rename tanpa hapus+buat ulang).
// Pola reuse input inline `cobekKategoriNewInput` yang sudah ada (bukan
// modal baru) — isi input dgn nama lama, tombol berubah jadi "Simpan",
// tombol Batal muncul. Additive, tidak mengubah alur tambah kategori biasa.
editKategori(id){
const kat=D.cobekKategori.find(c=>c.id===id);
if(!kat)return;
this.katEditId=id;
const el=document.getElementById('cobekKategoriNewInput');
if(el){el.value=kat.name;el.focus();}
const btn=document.getElementById('cobekKategoriAddBtn');
if(btn)btn.textContent='💾 Simpan';
const cancelBtn=document.getElementById('cobekKategoriCancelBtn');
if(cancelBtn)cancelBtn.style.display='';
},
cancelEditKategori(){
this.katEditId=null;
const el=document.getElementById('cobekKategoriNewInput');
if(el)el.value='';
const btn=document.getElementById('cobekKategoriAddBtn');
if(btn)btn.textContent='+ Tambah';
const cancelBtn=document.getElementById('cobekKategoriCancelBtn');
if(cancelBtn)cancelBtn.style.display='none';
},
addKategoriManual(){
const el=document.getElementById('cobekKategoriNewInput');
if(!el)return;
const name=(el.value||'').trim();
if(!name){toast('⚠️ Nama kategori belum diisi');return;}
if(this.katEditId){
const kat=D.cobekKategori.find(c=>c.id===this.katEditId);
if(!kat){this.cancelEditKategori();return;}
const clash=D.cobekKategori.find(c=>c.id!==this.katEditId&&c.name.toLowerCase()===name.toLowerCase());
if(clash){toast(`⚠️ Kategori "${name}" sudah ada`);return;}
// dialihkan lewat CategoryStore.mutateRename() (Modul 8) kalau tersedia,
// guard + fallback raw PERSIS SAMA pola 3 titik Modul 7.
if(typeof CategoryStore!=='undefined'){
const r=CategoryStore.mutateRename(kat,name);
if(!r.ok){toast('⚠️ Nama kategori tidak valid');return;}
}else{
kat.name=name;
}
this.katEditId=null;
save();el.value='';this.renderKategoriList();this.renderList();
const btn=document.getElementById('cobekKategoriAddBtn');if(btn)btn.textContent='+ Tambah';
const cancelBtn=document.getElementById('cobekKategoriCancelBtn');if(cancelBtn)cancelBtn.style.display='none';
toast('✅ Kategori diperbarui');
return;
}
resolveShopKategori(name);
save();el.value='';this.renderKategoriList();toast('✅ Kategori ditambahkan');
},
async delKategori(id){
const kat=D.cobekKategori.find(c=>c.id===id);
if(!kat)return;
const usedCount=D.products.filter(p=>p.kategoriId===id).length;
const msg=usedCount>0
?`Hapus kategori "${escapeHtml(kat.name)}"? Dipakai di ${usedCount} produk — kategori produk itu akan dikosongkan (produk & data lain TIDAK ikut terhapus).`
:`Hapus kategori "${escapeHtml(kat.name)}"?`;
if(!await askConfirm(msg,{title:'Hapus Kategori',okText:'Ya, Hapus'}))return;
if(this.katEditId===id)this.cancelEditKategori();
// dialihkan lewat CategoryStore.mutateDelete() (Modul 8) kalau tersedia,
// guard + fallback raw PERSIS SAMA pola Produsen.delete() Modul 7.
// Modul 15 (sesi ini): p.kategoriId='' dialihkan ke ProductRepository.
// mutateSetField() (perluasan gate, lihat komentar mutateSetField() di
// product-repository.js) — guard typeof + fallback raw PERSIS pola
// Modul 3-14. Sebelumnya raw dgn sengaja (lihat catatan mutateDelete()
// CategoryStore) karena gate lama menolak string kosong; sesi ini gate-nya
// diperluas, bukan business logic-nya yang berubah (produk yang kategorinya
// dihapus TETAP dikosongkan, nilai akhir identik).
if(typeof CategoryStore!=='undefined'){
const r=CategoryStore.mutateDelete(D.cobekKategori,id);
if(r.ok)D.cobekKategori=r.categories;
}else{
D.cobekKategori=D.cobekKategori.filter(c=>c.id!==id);
}
D.products.forEach(p=>{if(p.kategoriId===id){if(typeof ProductRepository!=='undefined')ProductRepository.mutateSetField(p,'kategoriId','');else p.kategoriId='';}});
save();this.renderKategoriList();this.renderList();toast('🗑 Kategori dihapus');
},
renderKategoriList(){
const el=document.getElementById('cobekKategoriList');
if(!el)return;
if(!D.cobekKategori||!D.cobekKategori.length){el.innerHTML='<div class="empty"><div class="empty-icon">🏷️</div><div class="empty-text">Belum ada kategori</div></div>';return;}
el.innerHTML=D.cobekKategori.map(k=>{
const prodInKat=D.products.map((p,i)=>({p,i})).filter(x=>x.p.kategoriId===k.id);
const n=prodInKat.length;
const expanded=this.expandedKatId===k.id;
const detailHtml=expanded?`<div class="tx-item-detail" style="padding:0 0 10px 46px">
        ${n?prodInKat.map(x=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border)">
              <div style="font-size:12.5px;flex:1;min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(x.p.name)}</div><div style="color:var(--text2);font-size:11px">${x.p.stock} pcs</div></div>
              <button class="tx-del u-bgaccsoft u-cacc" data-action="openProductModal" data-args="${escapeHtml(JSON.stringify([x.i]))}" aria-label="Edit produk">✏️ Edit</button>
            </div>`).join(''):'<div style="font-size:12px;color:var(--text2);padding:8px 0;border-top:1px solid var(--border)">Belum ada produk di kategori ini.</div>'}
      </div>`:'';
return`<div>
      <div class="tx-item" data-action="Etalase.toggleKategoriDetail" data-args="${escapeHtml(JSON.stringify([k.id]))}" style="cursor:pointer">
        <div class="tx-icon" style="background:var(--accent2-soft)">🏷️</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(k.name)}</div><div class="tx-meta">${n} produk</div></div>
        <button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="Etalase.editKategori" data-args="${escapeHtml(JSON.stringify([k.id]))}" aria-label="Edit">✏️</button>
        <button class="tx-del" data-action="Etalase.delKategori" data-args="${escapeHtml(JSON.stringify([k.id]))}" aria-label="Hapus">🗑</button>
      </div>
      ${detailHtml}
      </div>`;
}).join('');
},
toggleKategoriDetail(id){
this.expandedKatId=(this.expandedKatId===id)?null:id;
this.renderKategoriList();
},
renderList(){
if(typeof ShopInsight!=='undefined')ShopInsight.render();
const el=document.getElementById('productList');
if(!el)return;
if(!D.products.length){el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada produk</div></div>';return;}
el.innerHTML=D.products.map((p,i)=>{
// Tahap 7 (Generic Shop Engine, Pricing & Inventory Integration): harga
// jual/beli/reseller yang DITAMPILKAN dialihkan lewat PricingService kalau
// sudah dimuat — guard typeof + fallback field asli langsung, 0 perubahan
// angka (PricingService.getRetail/getCost/getReseller 100% passthrough ke
// field yg sama, lihat generic/pricing-service.js). Rumus margin/marginPct
// di bawah ini SENGAJA TIDAK dialihkan — basisnya markup-thd-hargaBeli,
// beda dgn PricingService.margin()/ProfitEngine.margin() yg revenue-based
// thd hargaJual; migrasi akan mengubah angka yang tampil, lihat
// LAPORAN-TAHAP7-GENERIC-SHOP-ENGINE.md §temuan.
const hargaJualDisp=(typeof PricingService!=='undefined')?PricingService.getRetail(p):p.hargaJual;
const hargaBeliDisp=(typeof PricingService!=='undefined')?PricingService.getCost(p):p.hargaBeli;
const hargaResellerDisp=(typeof PricingService!=='undefined')?PricingService.getReseller(p):p.hargaReseller;
const margin=p.hargaJual-p.hargaBeli;
const marginPct=p.hargaBeli>0?Math.round((margin/p.hargaBeli)*100):0;
// stockCls/stockLbl — delegasi InventoryService.stockStatus() (Tahap 1,
// PERSIS ambang yg sama, lihat InventoryEngine.stockStatus()) kalau sudah
// dimuat, fallback rumus asli. 0 perubahan hasil.
const stockStatus=(typeof InventoryService!=='undefined')?InventoryService.stockStatus(p):null;
const stockCls=stockStatus?stockStatus.cls:(p.stock<=2?'low':(p.stock<=5?'mid':'ok'));
const stockLbl=stockStatus?stockStatus.label:(p.stock<=2?'Menipis':(p.stock<=5?'Terbatas':'Aman'));
// Tahap 3 (Generic Shop Engine wiring): ProductStore.getCategory/getSupplier
// kalau dimuat, fallback ke shopKategoriName()/D.produsen.find() langsung
// (compat layer) — HASIL SAMA di kedua jalur, murni titik baca dipindah.
const katObj=(typeof ProductStore!=='undefined')?ProductStore.getCategory(p):null;
const kat=katObj?katObj.name:shopKategoriName(p.kategoriId);
const prodObj=(typeof ProductStore!=='undefined')?ProductStore.getSupplier(p):null;
const prod=prodObj?prodObj.name:(p.produsenId?(D.produsen.find(pr=>pr.id===p.produsenId)||{}).name:'');
const hasDiskon=p.diskonPersen>0;
// finalHarga — rumus diskon SENGAJA TIDAK diubah (tetap baca p.hargaJual
// mentah), sesuai instruksi. priceBlock di bawah dipakai utk DISPLAY strike/
// harga jual polos, jadi aman pakai hargaJualDisp.
const finalHarga=hasDiskon?Math.round(p.hargaJual*(1-p.diskonPersen/100)):p.hargaJual;
const priceBlock=hasDiskon
?`<div class="shop-price-strike">${fmt(hargaJualDisp)}</div><div class="shop-price-final discounted">${fmt(finalHarga)}<span class="shop-diskon-badge">-${p.diskonPersen}%</span></div>`
:`<div class="shop-price-final">${fmt(hargaJualDisp)}</div>`;
const groupCount=p.priceGroupId?this.groupSiblings(p).length+1:0;
const groupTag=groupCount?`<span class="shop-tag" style="color:var(--accent);font-weight:700">🔗 Gabungan (${groupCount} produk)</span>`:'';
// weightMissingTag — reuse persis kondisi rule AI 'product-weight-missing'
// (cobek-pricing.js): produk dipakai di Transfer/Rencana Pengiriman tapi
// beratPerUnit kosong. Badge di kartu supaya kelihatan tanpa nunggu AI
// Briefing (cooldown 72 jam bisa kelewat).
const beratPU=(typeof ProductStore!=='undefined')?ProductStore.getWeight(p):p.beratPerUnit;
const usedInLogistics=!beratPU&&(
(D.inventoryTransfers||[]).some(t=>(t.items||[]).some(it=>it.productId===p.id))
||(D.deliveryPlans||[]).some(dp=>(dp.items||[]).some(it=>it.productId===p.id))
);
const weightMissingTag=usedInLogistics?'<span class="shop-tag" style="color:var(--warning,#c77700);font-weight:700">⚠️ Berat belum diisi</span>':'';
return`<div class="shop-product-card stock-${stockCls}">
        <div class="shop-product-head">
          <div>
            <div class="shop-product-name">${escapeHtml(p.name)}</div>
            <div class="shop-product-tags">
              ${kat?`<span class="shop-tag cat">🏷️ ${escapeHtml(kat)}</span>`:''}
              ${prod?`<span class="shop-tag">🏭 ${escapeHtml(prod)}</span>`:''}
              ${groupTag}
              ${weightMissingTag}
            </div>
          </div>
          <div class="shop-stock-pill ${stockCls}">${p.stock} pcs · ${stockLbl}</div>
        </div>
        <div class="shop-product-prices">
          <div>
            <div class="shop-price-label">Harga Jual</div>
            ${priceBlock}
            <div class="shop-price-sub">Modal ${fmt(hargaBeliDisp)}${p.hargaReseller?' · Reseller '+fmt(hargaResellerDisp):''}</div>
          </div>
          <div class="shop-product-right">
            <div class="shop-margin-badge">+${fmt(margin)} (${marginPct}%)</div>
            <div class="shop-product-actions">
              ${p.priceGroupId?`<button data-action="Etalase.unlinkFromGroup" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Lepas dari grup harga" title="Lepas dari grup harga gabungan">🔓</button>`:''}
              <button data-action="openProductModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button>
              ${(typeof ProductRepository!=='undefined')?`<button data-action="Etalase.duplicateProduct" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Duplikat produk" title="Duplikat produk (stok 0)">📋</button>`:''}
              <button data-action="delProduct" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
            </div>
          </div>
        </div>
      </div>`;
}).join('');
}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Etalase'][method]. `const Etalase = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di modules/vehicle/fuel-modal.js / window.BBM,Servis,Torsi
// di car-notes.js (Sesi 345) — bug yang sama pernah terjadi & diperbaiki di
// sana. Tanpa baris ini, semua tombol data-action="Etalase.xxx" gagal diam-diam.
if (typeof Etalase !== 'undefined') window.Etalase = Etalase;
// PriceReko — widget "Rekomendasi Harga Jual" di dalam productModal.
// Formula: (Harga Beli + Biaya Transport/unit) × (1 + Target Margin%), lalu dibulatkan ke kelipatan rapi.
// Sumber angka bantu: rata-rata margin produk lain di kategori sama (D.products), rata-rata harga/liter BBM
// terakhir (D.bbmLogs) sbg estimasi kasar biaya transport, & opsional cek kisaran harga pasar lewat AI+web search
// (pola sama seperti RefAI/EduFund.checkAI yg sudah ada — pakai D.profile.apiKey/apiProvider).

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 4/6: kalkulator berat/volume/packing utk
// pengiriman produk Shop. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi.
// Semua fungsi di bawah PURE (parameter murni, TIDAK baca DOM/D) — sama
// prinsipnya dgn LogisticsEngine (modules/logistics/logistics-engine.js,
// Sesi 3), supaya bisa dipanggil dari UI Shop mana pun & rule AI (Sesi 5-6)
// serta dites tanpa DOM. D.products BELUM punya field berat/volume/dimensi
// sama sekali, jadi fungsi ini TIDAK membaca D.products — pemanggil yang
// kasih angkanya lewat parameter, sama seperti LogisticsEngine.load()
// menerima capacityPerTrip sbg parameter (bukan baca D.vehicles).
// PENTING (masih "senyap" seperti Sesi 1-3): tidak ada UI/tombol baru,
// tidak ada wiring otomatis — baru "hidup" kalau dipanggil eksplisit oleh
// calculateVehicleCapacity() (cobek-pricing.js) atau kode Sesi 5-6.
// ---------------------------------------------------------------------------

// weightCalculator({beratPerUnit, qty}) — total berat (kg) dari qty unit @
// beratPerUnit kg. Input negatif/NaN dipaksa jadi 0, tidak throw.
function weightCalculator({ beratPerUnit, qty } = {}) {
  const berat = Math.max(0, parseFloat(beratPerUnit) || 0);
  const q = Math.max(0, parseFloat(qty) || 0);
  return { beratPerUnit: berat, qty: q, totalKg: berat * q };
}

// volumeCalculator({panjang, lebar, tinggi, qty}) — dimensi dalam cm,
// balikin volume per unit (cm3 & m3) & total (dikali qty). Dimensi
// negatif/NaN dipaksa jadi 0 (bukan NaN merambat ke hasil).
function volumeCalculator({ panjang, lebar, tinggi, qty } = {}) {
  const p = Math.max(0, parseFloat(panjang) || 0);
  const l = Math.max(0, parseFloat(lebar) || 0);
  const t = Math.max(0, parseFloat(tinggi) || 0);
  const q = Math.max(0, parseFloat(qty) || 0);
  const cm3PerUnit = p * l * t;
  const m3PerUnit = cm3PerUnit / 1000000;
  return { panjang: p, lebar: l, tinggi: t, qty: q, cm3PerUnit, m3PerUnit, totalM3: m3PerUnit * q };
}

// packingCalculator({items, capacityKg, capacityM3}) — dari daftar item
// (masing-masing boleh punya {beratPerUnit, qty} dan/atau
// {panjang, lebar, tinggi, qty}), hitung total berat & volume gabungan,
// lalu berapa kali rit (trip) dibutuhkan berdasar batas TERKETAT (berat
// ATAU volume, mana yg butuh rit lebih banyak). capacityKg/capacityM3 yg
// tidak dikasih (undefined/<=0) dianggap TIDAK membatasi (trips dari sisi
// itu = 0), bukan bikin fungsi gagal — supaya tetap bisa dipakai walau
// baru salah satu kapasitas yang diketahui. Item tanpa beratPerUnit atau
// tanpa dimensi diabaikan dari sisi itu (dianggap 0), tidak bikin error.
function packingCalculator({ items = [], capacityKg, capacityM3 } = {}) {
  let totalKg = 0;
  let totalM3 = 0;
  let totalQty = 0;
  (items || []).forEach((it) => {
    if (!it) return;
    const qty = Math.max(0, parseFloat(it.qty) || 0);
    totalQty += qty;
    if (it.beratPerUnit !== undefined) {
      totalKg += weightCalculator({ beratPerUnit: it.beratPerUnit, qty }).totalKg;
    }
    if (it.panjang !== undefined || it.lebar !== undefined || it.tinggi !== undefined) {
      totalM3 += volumeCalculator({ panjang: it.panjang, lebar: it.lebar, tinggi: it.tinggi, qty }).totalM3;
    }
  });
  const capKg = parseFloat(capacityKg);
  const capM3 = parseFloat(capacityM3);
  const tripsByWeight = (isFinite(capKg) && capKg > 0 && totalKg > 0) ? Math.ceil(totalKg / capKg) : 0;
  const tripsByVolume = (isFinite(capM3) && capM3 > 0 && totalM3 > 0) ? Math.ceil(totalM3 / capM3) : 0;
  const trips = Math.max(tripsByWeight, tripsByVolume);
  const limitingFactor = tripsByWeight === tripsByVolume
    ? (tripsByWeight > 0 ? 'berat/volume (sama)' : null)
    : (tripsByWeight > tripsByVolume ? 'berat' : 'volume');
  return { totalQty, totalKg, totalM3, tripsByWeight, tripsByVolume, trips, limitingFactor };
}
