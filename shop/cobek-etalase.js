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
const Etalase={
editIdx:null,
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
changed.forEach(s=>{s.hargaJual=product.hargaJual;});
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
if(allMembers.has(p.id)){p.priceGroupId=groupId;p.hargaJual=price;names.push(p.name);}
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
// totalModalStok/totalNilaiJualStok (kw208-cobek-modal-stok) — total uang modal (HPP) yg masih
// "tertanam" di stok gudang (belum jadi uang tunai lagi sampai terjual), & estimasi nilai jualnya
// kalau semua stok itu laku di Harga Jual sekarang. Dipakai di kartu ringkasan tab Shop (cModalStok/
// cNilaiJualStok) & disuntikkan ke konteks chat AI (features-aiwidget-reminder-gdrive-search.js)
// supaya analisa keuangan AI tahu ada uang yg "nyangkut" di bentuk barang, bukan cuma saldo akun.
totalModalStok(){
return(D.products||[]).filter(isProductOwnershipSelf).reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
},
totalNilaiJualStok(){
return(D.products||[]).filter(isProductOwnershipSelf).reduce((s,p)=>s+((p.stock||0)*(p.hargaJual||0)),0);
},
renderModalStat(){
const elModal=document.getElementById('cModalStok');
const elJual=document.getElementById('cNilaiJualStok');
if(elModal)elModal.textContent=fmt(this.totalModalStok());
if(elJual)elJual.textContent=fmt(this.totalNilaiJualStok());
},
openModal(idx){
this.editIdx=(typeof idx==='number')?idx:null;
const isEdit=this.editIdx!==null;
document.getElementById('productModalTitle').textContent=isEdit?'Edit Produk':'Tambah Produk';
const p=isEdit?D.products[this.editIdx]:null;
document.getElementById('pName').value=p?p.name:'';
document.getElementById('pStock').value=p?p.stock:'';
document.getElementById('pKategori').value=p?shopKategoriName(p.kategoriId):'';
document.getElementById('pKategoriList').innerHTML=D.cobekKategori.map(k=>`<option value="${escapeHtml(k.name)}">`).join('');
const pProdusenEl=document.getElementById('pProdusen');
if(pProdusenEl){
pProdusenEl.innerHTML='<option value="">— Tanpa produsen —</option>'+D.produsen.map(pr=>`<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('')+'<option value="__new__">➕ Produsen Baru</option>';
pProdusenEl.value=p&&p.produsenId?p.produsenId:'';
}
document.getElementById('pBeli').value=p?p.hargaBeli:'';
document.getElementById('pJual').value=p?p.hargaJual:'';
document.getElementById('pReseller').value=p&&p.hargaReseller?p.hargaReseller:'';
document.getElementById('pDiskon').value=p&&p.diskonPersen?p.diskonPersen:'';
const pBeratEl=document.getElementById('pBeratPerUnit');
if(pBeratEl)pBeratEl.value=p&&p.beratPerUnit?p.beratPerUnit:'';
const pPanjangEl=document.getElementById('pPanjang');
if(pPanjangEl)pPanjangEl.value=p&&p.panjang?p.panjang:'';
const pLebarEl=document.getElementById('pLebar');
if(pLebarEl)pLebarEl.value=p&&p.lebar?p.lebar:'';
const pTinggiEl=document.getElementById('pTinggi');
if(pTinggiEl)pTinggiEl.value=p&&p.tinggi?p.tinggi:'';
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
openModal('productModal');
},
async onProdusenChange(){
const sel=document.getElementById('pProdusen');
if(!sel)return;
if(sel.value==='__new__'){
const name=await showPromptModal({title:'Produsen Baru',message:'Nama produsen baru:',icon:'🏭'});
if(name&&name.trim()){
const np={id:'prd_'+Date.now(),name:name.trim(),contact:'',note:''};
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
save(){
const name=document.getElementById('pName').value.trim();
const stock=parseInt(document.getElementById('pStock').value)||0;
const kategoriName=document.getElementById('pKategori').value.trim();
const produsenSel=document.getElementById('pProdusen');
const produsenId=produsenSel&&produsenSel.value!=='__new__'?produsenSel.value:'';
const hargaBeli=parseFloat(document.getElementById('pBeli').value)||0;
const hargaJual=parseFloat(document.getElementById('pJual').value)||0;
const hargaReseller=parseFloat(document.getElementById('pReseller').value)||null;
const diskonPersen=parseFloat(document.getElementById('pDiskon').value)||0;
const beratPerUnitEl=document.getElementById('pBeratPerUnit');
const beratPerUnit=beratPerUnitEl?(parseFloat(beratPerUnitEl.value)||0):0;
const panjangEl=document.getElementById('pPanjang');
const panjang=panjangEl?(parseFloat(panjangEl.value)||0):0;
const lebarEl=document.getElementById('pLebar');
const lebar=lebarEl?(parseFloat(lebarEl.value)||0):0;
const tinggiEl=document.getElementById('pTinggi');
const tinggi=tinggiEl?(parseFloat(tinggiEl.value)||0):0;
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
if(this.editIdx!==null){
product=D.products[this.editIdx];
Object.assign(product,{name,stock,hargaBeli,hargaJual,hargaReseller,diskonPersen,kategoriId,beratPerUnit,panjang,lebar,tinggi,ownership});
} else {
product={id:'prod_'+Date.now(),name,stock,hargaBeli,hargaJual,hargaReseller,diskonPersen,kategoriId,beratPerUnit,panjang,lebar,tinggi,ownership,produsenId:'',hargaByProdusen:{}};
D.products.push(product);
}
if(!product.hargaByProdusen)product.hargaByProdusen={};
if(produsenId){
product.produsenId=produsenId;
if(hargaBeli>0)product.hargaByProdusen[produsenId]=hargaBeli;
}
const produsenName=produsenId?(D.produsen.find(pr=>pr.id===produsenId)||{}).name:'';
const kategoriLabel=kategoriName?` · kategori ${kategoriName}`:'';
const produsenLabel=produsenName?` · dari ${produsenName}`:'';
if(delta>0&&hargaBeli>0){
const cost=delta*hargaBeli;
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:`Beli stok ${name} x${delta}${kategoriLabel}${produsenLabel} (modal shop)`,date:new Date().toISOString().split('T')[0],stockProductId:product.id,stockQty:delta,produsenId:produsenId||undefined,kategoriId:kategoriId||undefined});
save();closeModal('productModal');this.renderList();renderDashboard();renderKeuangan();
toast(`✅ Produk disimpan, +${delta} stok tercatat sbg pengeluaran ${fmtFull(cost)}`);
this.syncPairedPrice(product);
return;
}
save();closeModal('productModal');this.renderList();toast('✅ Produk disimpan (hanya update, tanpa transaksi)');
this.syncPairedPrice(product);
},
async delete(i){
if(!await askConfirm('Hapus produk ini dari etalase?'))return;
D.products.splice(i,1);save();this.renderList();toast('🗑 Dihapus');
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
kat.name=name;
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
D.cobekKategori=D.cobekKategori.filter(c=>c.id!==id);
D.products.forEach(p=>{if(p.kategoriId===id)p.kategoriId='';});
save();this.renderKategoriList();this.renderList();toast('🗑 Kategori dihapus');
},
renderKategoriList(){
const el=document.getElementById('cobekKategoriList');
if(!el)return;
if(!D.cobekKategori||!D.cobekKategori.length){el.innerHTML='<div class="empty"><div class="empty-icon">🏷️</div><div class="empty-text">Belum ada kategori</div></div>';return;}
el.innerHTML=D.cobekKategori.map(k=>{
const n=D.products.filter(p=>p.kategoriId===k.id).length;
return`<div class="tx-item">
        <div class="tx-icon" style="background:var(--accent2-soft)">🏷️</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(k.name)}</div><div class="tx-meta">${n} produk</div></div>
        <button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="Etalase.editKategori" data-args="${escapeHtml(JSON.stringify([k.id]))}" aria-label="Edit">✏️</button>
        <button class="tx-del" data-action="Etalase.delKategori" data-args="${escapeHtml(JSON.stringify([k.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join('');
},
renderList(){
if(typeof ShopInsight!=='undefined')ShopInsight.render();
const el=document.getElementById('productList');
if(!el)return;
if(!D.products.length){el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada produk</div></div>';return;}
el.innerHTML=D.products.map((p,i)=>{
const margin=p.hargaJual-p.hargaBeli;
const marginPct=p.hargaBeli>0?Math.round((margin/p.hargaBeli)*100):0;
const stockCls=p.stock<=2?'low':(p.stock<=5?'mid':'ok');
const stockLbl=p.stock<=2?'Menipis':(p.stock<=5?'Terbatas':'Aman');
const kat=shopKategoriName(p.kategoriId);
const prod=p.produsenId?(D.produsen.find(pr=>pr.id===p.produsenId)||{}).name:'';
const hasDiskon=p.diskonPersen>0;
const finalHarga=hasDiskon?Math.round(p.hargaJual*(1-p.diskonPersen/100)):p.hargaJual;
const priceBlock=hasDiskon
?`<div class="shop-price-strike">${fmt(p.hargaJual)}</div><div class="shop-price-final discounted">${fmt(finalHarga)}<span class="shop-diskon-badge">-${p.diskonPersen}%</span></div>`
:`<div class="shop-price-final">${fmt(p.hargaJual)}</div>`;
const groupCount=p.priceGroupId?this.groupSiblings(p).length+1:0;
const groupTag=groupCount?`<span class="shop-tag" style="color:var(--accent);font-weight:700">🔗 Gabungan (${groupCount} produk)</span>`:'';
return`<div class="shop-product-card stock-${stockCls}">
        <div class="shop-product-head">
          <div>
            <div class="shop-product-name">${escapeHtml(p.name)}</div>
            <div class="shop-product-tags">
              ${kat?`<span class="shop-tag cat">🏷️ ${escapeHtml(kat)}</span>`:''}
              ${prod?`<span class="shop-tag">🏭 ${escapeHtml(prod)}</span>`:''}
              ${groupTag}
            </div>
          </div>
          <div class="shop-stock-pill ${stockCls}">${p.stock} pcs · ${stockLbl}</div>
        </div>
        <div class="shop-product-prices">
          <div>
            <div class="shop-price-label">Harga Jual</div>
            ${priceBlock}
            <div class="shop-price-sub">Modal ${fmt(p.hargaBeli)}${p.hargaReseller?' · Reseller '+fmt(p.hargaReseller):''}</div>
          </div>
          <div class="shop-product-right">
            <div class="shop-margin-badge">+${fmt(margin)} (${marginPct}%)</div>
            <div class="shop-product-actions">
              ${p.priceGroupId?`<button data-action="Etalase.unlinkFromGroup" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Lepas dari grup harga" title="Lepas dari grup harga gabungan">🔓</button>`:''}
              <button data-action="openProductModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button>
              <button data-action="delProduct" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
            </div>
          </div>
        </div>
      </div>`;
}).join('');
}
};
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
