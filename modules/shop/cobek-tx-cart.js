// cobek-tx-cart.js — Domain Shop bagian integrasi form Transaksi: cart Stok Masuk & Penjualan
// Dipindah ke modules/shop/cobek-tx-cart.js (Sesi 10 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Shop pada form Transaksi gabungan (populate/onChange/toggle/add/remove/sync/apply), termasuk
// applyBundleLinkedStock & recordShopSale. Bagian ke-4 dari 5 hasil pemecahan cobek.js — lihat
// catatan urutan load di cobek-etalase.js. (Beda dari tx-cobek.js yg cuma berisi
// isShopStockCatName() — lihat catatan di file itu.)

function acShopCustomers(){return Pelanggan._acList();}
function onShopCustFieldInput(field){return Pelanggan.onFieldInput(field);}
function selectShopCustomer(name,phone,address){return Pelanggan.select(name,phone,address);}

function resolveShopKategori(name){
name=(name||'').trim();
if(!name)return '';
let cat=D.cobekKategori.find(c=>c.name.toLowerCase()===name.toLowerCase());
if(!cat){cat={id:'ck_'+Date.now()+'_'+uid(),name};D.cobekKategori.push(cat);}
return cat.id;
}
function shopKategoriName(id){const c=D.cobekKategori.find(x=>x.id===id);return c?c.name:'';}
let curShopStockCart=[];
function resetShopStockCart(){
curShopStockCart=[];
renderShopStockCartList();
}
function populateTxShopStockSelect(){
const sel=document.getElementById('txShopStockItem');
const prodSel=document.getElementById('txShopStockProdusen');
const katList=document.getElementById('txShopKategoriList');
if(!sel)return;
const cur=sel.value;
sel.innerHTML='<option value="__new__">➕ Produk Baru</option>'+D.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.stock})</option>`).join('');
sel.value=cur&&D.products.find(p=>p.id===cur)?cur:'__new__';
if(prodSel) prodSel.innerHTML='<option value="">— Tanpa produsen —</option>'+D.produsen.map(pr=>`<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('')+'<option value="__new__">➕ Produsen Baru</option>';
if(katList) katList.innerHTML=D.cobekKategori.map(k=>`<option value="${escapeHtml(k.name)}">`).join('');
onTxShopStockItemChange();
renderShopStockCartList();
}
function onTxShopStockItemChange(){
const sel=document.getElementById('txShopStockItem');
const wrap=document.getElementById('txShopStockNewWrap');
const jualWrap=document.getElementById('txShopStockJualWrap');
if(!sel||!wrap)return;
const isNew=sel.value==='__new__';
wrap.style.display=isNew?'block':'none';
if(jualWrap) jualWrap.style.display=isNew?'block':'none';
if(isNew){
const noteVal=document.getElementById('txNote').value.trim();
const nameEl=document.getElementById('txShopStockNewName');
if(nameEl&&!nameEl.value) nameEl.value=noteVal;
document.getElementById('txShopStockKategori').value='';
document.getElementById('txShopStockHarga').value='';
} else {
const p=D.products.find(x=>x.id===sel.value);
if(p){
document.getElementById('txShopStockKategori').value=shopKategoriName(p.kategoriId);
const prodSel=document.getElementById('txShopStockProdusen');
const curProdusen=prodSel?prodSel.value:'';
if(curProdusen&&p.hargaByProdusen&&p.hargaByProdusen[curProdusen]){
document.getElementById('txShopStockHarga').value=p.hargaByProdusen[curProdusen];
} else {
document.getElementById('txShopStockHarga').value=p.hargaBeli||'';
}
}
}
}
async function onTxShopStockProdusenChange(){
const prodSel=document.getElementById('txShopStockProdusen');
if(!prodSel)return;
if(prodSel.value==='__new__'){
const name=await showPromptModal({title:'Produsen Baru',message:'Nama produsen baru:',icon:'🏭'});
if(name&&name.trim()){
const np={id:'prd_'+Date.now(),name:name.trim(),contact:'',note:''};
D.produsen.push(np);
populateTxShopStockSelect();
prodSel.value=np.id;
save();
} else {
prodSel.value='';
}
}
const itemSel=document.getElementById('txShopStockItem');
if(itemSel&&itemSel.value!=='__new__'){
const p=D.products.find(x=>x.id===itemSel.value);
if(p&&prodSel.value&&p.hargaByProdusen&&p.hargaByProdusen[prodSel.value]){
document.getElementById('txShopStockHarga').value=p.hargaByProdusen[prodSel.value];
}
}
}
function toggleTxShopStockFields(){
const chk=document.getElementById('txAddShopStock');
const fields=document.getElementById('txShopStockFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked) populateTxShopStockSelect();
}
function addShopStockCartItem(){
const itemSel=document.getElementById('txShopStockItem');
const qty=parseFloat(document.getElementById('txShopStockQty').value)||0;
const hargaBeli=parseFloat(document.getElementById('txShopStockHarga').value)||0;
const produsenId=document.getElementById('txShopStockProdusen').value||'';
const kategoriInput=document.getElementById('txShopStockKategori').value.trim();
if(!itemSel||!itemSel.value){toast('⚠️ Pilih produk dulu');return;}
if(qty<=0){toast('⚠️ Jumlah harus lebih dari 0');return;}
const isNew=itemSel.value==='__new__';
let name,productId=null;
if(isNew){
name=(document.getElementById('txShopStockNewName').value.trim())||document.getElementById('txNote').value.trim()||'Produk Shop Baru';
} else {
const p=D.products.find(x=>x.id===itemSel.value);
if(!p){toast('⚠️ Produk tidak ditemukan');return;}
name=p.name;productId=p.id;
}
const hargaJual=parseFloat(document.getElementById('txShopStockJual').value)||0;
curShopStockCart.push({productId,isNew,name,qty,hargaBeli,produsenId:(produsenId&&produsenId!=='__new__')?produsenId:'',kategoriInput,hargaJual});
renderShopStockCartList();
syncTxShopStockAmt();
document.getElementById('txShopStockQty').value='1';
document.getElementById('txShopStockHarga').value='';
if(document.getElementById('txShopStockJual'))document.getElementById('txShopStockJual').value='';
if(document.getElementById('txShopStockNewName'))document.getElementById('txShopStockNewName').value='';
toast(`➕ "${name}" ditambahkan ke daftar (${qty}x)`);
}
function removeShopStockCartItem(idx){
curShopStockCart.splice(idx,1);
renderShopStockCartList();
syncTxShopStockAmt();
}
/* moved to modules-render.js: renderShopStockCartList */
function syncTxShopStockAmt(){
const chk=document.getElementById('txAddShopStock');
if(!chk||!chk.checked)return;
const cartTotal=curShopStockCart.reduce((s,it)=>s+(it.qty*it.hargaBeli),0);
if(cartTotal>0)document.getElementById('txAmt').value=Math.round(cartTotal);
}
function applyTxShopStockFromTx(txId,note,existingTx){
const chk=document.getElementById('txAddShopStock');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txShopStockPanel');
if(!panel||panel.style.display==='none')return;
if(!curShopStockCart.length){toast('⚠️ Belum ada produk di daftar. Isi produk, lalu klik "Tambahkan Produk ke Daftar" dulu sebelum simpan');return;}
if(existingTx){
if(existingTx.stockItems&&existingTx.stockItems.length){
existingTx.stockItems.forEach(si=>{
const prevP=D.products.find(p=>p.id===si.productId);
if(prevP)prevP.stock=Math.max(0,(prevP.stock||0)-(si.qty||0));
});
} else if(existingTx.stockProductId){
const prevP=D.products.find(p=>p.id===existingTx.stockProductId);
if(prevP)prevP.stock=Math.max(0,(prevP.stock||0)-(existingTx.stockQty||0));
}
}
const resultItems=[];
let totalBelanja=0;
curShopStockCart.forEach(it=>{
let product;
if(it.isNew){
const kategoriId=resolveShopKategori(it.kategoriInput);
product=D.products.find(p=>p.name.toLowerCase()===it.name.toLowerCase());
if(!product){
product={id:'prod_'+Date.now()+'_'+uid(),name:it.name,stock:0,hargaBeli:it.hargaBeli,hargaJual:it.hargaJual,hargaReseller:null,diskonPersen:0,kategoriId,produsenId:it.produsenId,hargaByProdusen:{}};
D.products.push(product);
} else if(kategoriId){
product.kategoriId=kategoriId;
}
} else {
product=D.products.find(p=>p.id===it.productId);
if(product&&it.kategoriInput) product.kategoriId=resolveShopKategori(it.kategoriInput);
}
if(!product)return;
product.stock=(product.stock||0)+it.qty;
if(it.hargaBeli>0)product.hargaBeli=it.hargaBeli;
if(it.produsenId){
product.produsenId=it.produsenId;
if(!product.hargaByProdusen)product.hargaByProdusen={};
if(it.hargaBeli>0)product.hargaByProdusen[it.produsenId]=it.hargaBeli;
}
resultItems.push({productId:product.id,name:product.name,qty:it.qty,hargaBeli:it.hargaBeli,produsenId:it.produsenId||'',kategoriId:product.kategoriId||''});
totalBelanja+=it.qty*it.hargaBeli;
});
const tx=existingTx||D.transactions.find(t=>t.id===txId);
if(tx){
tx.stockItems=resultItems;
if(resultItems[0]){
tx.stockProductId=resultItems[0].productId;
tx.stockQty=resultItems[0].qty;
if(resultItems[0].produsenId)tx.produsenId=resultItems[0].produsenId;
tx.kategoriId=resultItems[0].kategoriId||'';
}
}
renderProductList();
const ringkasan=resultItems.map(it=>`${it.name} +${it.qty}`).join(', ');
toast(`📦 Stok bertambah: ${ringkasan} (total ${fmtFull(totalBelanja)})`);
}
let curTxShopSaleCart=[];
function resetTxShopSaleCart(){
curTxShopSaleCart=[];
renderTxShopSaleCartList();
}
function populateTxShopSaleSelect(){
const sel=document.getElementById('txShopSaleItem');
if(!sel)return;
const cur=sel.value;
if(!D.products.length){
sel.innerHTML='<option value="">— Belum ada produk di Etalase —</option>';
return;
}
sel.innerHTML=D.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.stock})</option>`).join('');
sel.value=cur&&D.products.find(p=>p.id===cur)?cur:D.products[0].id;
onTxShopSaleItemChange();
renderTxShopSaleCartList();
}
function onTxShopSaleItemChange(){
const sel=document.getElementById('txShopSaleItem');
if(!sel||!sel.value)return;
const p=D.products.find(x=>x.id===sel.value);
if(p) document.getElementById('txShopSaleHarga').value=p.hargaJual||'';
}
function computeTxShopSaleTotals(){
let subtotal=0,modal=0;
const lines=curTxShopSaleCart.map(it=>{
const p=D.products.find(x=>x.id===it.productId);
const lineTotal=it.harga*it.qty;
subtotal+=lineTotal;modal+=(p?(p.hargaBeli||0):0)*it.qty;
return{...it,lineTotal};
});
const diskon=parseFloat(document.getElementById('txShopSaleDiskon')?.value)||0;
const ongkir=parseFloat(document.getElementById('txShopSaleOngkir')?.value)||0;
const total=Math.max(0,subtotal-diskon)+ongkir;
const profit=subtotal-modal-diskon;
return{lines,subtotal,modal,diskon,ongkir,total,profit};
}
function addTxShopSaleCartItem(){
const sel=document.getElementById('txShopSaleItem');
const product=sel?D.products.find(p=>p.id===sel.value):null;
if(!product){toast('⚠️ Belum ada produk di Etalase — tambah produk dulu di tab Bisnis Shop');return;}
const qty=parseFloat(document.getElementById('txShopSaleQty').value)||0;
const harga=parseFloat(document.getElementById('txShopSaleHarga').value)||0;
if(qty<=0){toast('⚠️ Jumlah terjual harus lebih dari 0');return;}
if(harga<=0){toast('⚠️ Harga jual harus lebih dari 0');return;}
curTxShopSaleCart.push({productId:product.id,name:product.name,qty,harga});
renderTxShopSaleCartList();
syncTxShopSaleAmt();
document.getElementById('txShopSaleQty').value='1';
toast(`➕ "${escapeHtml(product.name)}" ditambahkan ke daftar (${qty}x)`);
}
function removeTxShopSaleCartItem(idx){
curTxShopSaleCart.splice(idx,1);
renderTxShopSaleCartList();
syncTxShopSaleAmt();
}
/* moved to modules-render.js: renderTxShopSaleCartList */
function syncTxShopSaleAmt(){
const chk=document.getElementById('txAddShopSale');
if(!chk||!chk.checked)return;
const{total}=computeTxShopSaleTotals();
if(total>0)document.getElementById('txAmt').value=Math.round(total);
}
function toggleTxShopSaleFields(){
const chk=document.getElementById('txAddShopSale');
const fields=document.getElementById('txShopSaleFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked) populateTxShopSaleSelect();
}
// applyBundleLinkedStock (kw207-cobek-bundle-addon) — dipanggil dari recordShopSale tiap kali stok
// SATU item baris penjualan disesuaikan (sign=-1 saat jual/kurangi, sign=+1 saat undo/edit ulang &
// stok dikembalikan). Kalau produk itu bundle (nama ada "+alu"/"+muntu"), ikut sesuaikan stok:
//  1. produk dasar polos di bracket ukuran yg sama (mis. "Lumpang 20cm" utk bundle "Lumpang 20cm+alu")
//  2. SATU produk alu/muntu mana pun yg ada stoknya (aplikasi tidak tahu alu/muntu ukuran persis mana
//     yg dipasangkan fisik ke lumpang/cobek itu — jadi dipilih otomatis: saat menjual/mengurangi,
//     pilih yg stoknya masih cukup (biar tidak minus duluan); saat mengembalikan/menambah, kembalikan
//     ke kandidat pertama yg cocok). Kalau tidak ada produk dasar/alu-muntu yg cocok, dilewati saja
//     (TIDAK membatalkan penjualan utama — stok bundle itu sendiri tetap prioritas).
function applyBundleLinkedStock(product,qty,sign){
if(!product)return;
const addon=Etalase.bundleAddonShape(product);
if(!addon)return;
const bracket=Etalase.bracketRange(product);
const base=(D.products||[]).find(q=>q.id!==product.id&&Etalase.bracketRange(q)===bracket&&!Etalase.bundleAddonShape(q));
if(base)base.stock=Math.max(0,(base.stock||0)+sign*qty);
const addonCandidates=(D.products||[]).filter(q=>{
const parsed=Etalase.parseSizeName(q.name);
if(addon==='alu')return parsed&&parsed.shape==='alu';
if(addon==='muntu')return(parsed&&(parsed.shape==='muntu'||parsed.shape==='munthu'))||/^muntu/i.test((q.name||'').trim());
return false;
});
const addonProduct=sign<0?(addonCandidates.find(q=>(q.stock||0)>=qty)||addonCandidates[0]):addonCandidates[0];
if(addonProduct)addonProduct.stock=Math.max(0,(addonProduct.stock||0)+sign*qty);
}
function recordShopSale(opts){
const items=(opts.items||[]).filter(it=>it&&it.productId&&it.qty>0);
if(!items.length)return{ok:false,message:'Keranjang masih kosong'};
let prevShop=null;
if(opts.existingShopId){
prevShop=D.cobek.find(c=>c.id===opts.existingShopId);
if(prevShop&&prevShop.items){
prevShop.items.forEach(it=>{
const pp=D.products.find(x=>x.id===it.productId);
if(pp){pp.stock=(pp.stock||0)+it.qty;applyBundleLinkedStock(pp,it.qty,1);}
});
}
}
for(const it of items){
const p=D.products.find(x=>x.id===it.productId);
if(!p){
if(prevShop&&prevShop.items)prevShop.items.forEach(pi=>{const pp=D.products.find(x=>x.id===pi.productId);if(pp){pp.stock=Math.max(0,(pp.stock||0)-pi.qty);applyBundleLinkedStock(pp,pi.qty,-1);}});
return{ok:false,message:'Produk tidak ditemukan'};
}
if(it.qty>p.stock){
if(prevShop&&prevShop.items)prevShop.items.forEach(pi=>{const pp=D.products.find(x=>x.id===pi.productId);if(pp){pp.stock=Math.max(0,(pp.stock||0)-pi.qty);applyBundleLinkedStock(pp,pi.qty,-1);}});
return{ok:false,message:'Stok '+p.name+' tidak cukup (sisa '+p.stock+')'};
}
}
items.forEach(it=>{const p=D.products.find(x=>x.id===it.productId);p.stock=(p.stock||0)-it.qty;applyBundleLinkedStock(p,it.qty,-1);});
const customer=opts.customer||{name:'',phone:'',address:''};
if(prevShop){
Object.assign(prevShop,{
date:opts.date,items,priceType:opts.priceType||prevShop.priceType||'normal',
customer,subtotal:opts.subtotal,diskon:opts.diskon||0,ongkir:opts.ongkir||0,
total:opts.total,profit:opts.profit,accountId:opts.accountId,
delivered:opts.delivered!==undefined?opts.delivered:prevShop.delivered,
note:opts.note!==undefined?(opts.note||prevShop.note):prevShop.note
});
return{ok:true,shopId:prevShop.id,isNew:false};
}
const shopId=uid();
D.cobek.push({
id:shopId,date:opts.date,items,priceType:opts.priceType||'normal',customer,
subtotal:opts.subtotal,diskon:opts.diskon||0,ongkir:opts.ongkir||0,total:opts.total,profit:opts.profit,
accountId:opts.accountId,txLinkId:opts.txId,delivered:opts.delivered!==undefined?opts.delivered:true,
note:opts.note||''
});
return{ok:true,shopId,isNew:true};
}
function applyTxShopSaleFromTx(txId,date,accId,note,existingTx){
const chk=document.getElementById('txAddShopSale');
if(!chk||!chk.checked)return;
const panel=document.getElementById('txShopSalePanel');
if(!panel||panel.style.display==='none')return;
if(!curTxShopSaleCart.length){toast('⚠️ Belum ada produk di daftar penjualan shop — tambahkan dulu');return;}
const{lines,subtotal,diskon,ongkir,total,profit}=computeTxShopSaleTotals();
const items=lines.map(l=>({productId:l.productId,name:l.name,qty:l.qty,harga:l.harga,lineTotal:l.lineTotal}));
const customer={
name:(document.getElementById('txShopSaleCustName')?.value||'').trim(),
phone:(document.getElementById('txShopSaleCustPhone')?.value||'').trim(),
address:(document.getElementById('txShopSaleCustAddr')?.value||'').trim()
};
const tx=existingTx||D.transactions.find(t=>t.id===txId);
const result=recordShopSale({
items,subtotal,diskon,ongkir,total,profit,date,note,customer,
priceType:'normal',delivered:true,accountId:accId,txId,
existingShopId:(existingTx&&existingTx.cobekLinkId)?existingTx.cobekLinkId:null
});
if(!result.ok){toast('⚠️ '+result.message);return;}
if(tx)tx.cobekLinkId=result.shopId;
renderProductList();renderShop();renderShopRecent();
const itemSummary=items.map(it=>it.name+' x'+it.qty).join(', ');
toast(`🪨 Penjualan tercatat: ${itemSummary}`);
}

function openProductModal(idx){return Etalase.openModal(idx);}
function onPProdusenChange(){return Etalase.onProdusenChange();}
function saveProduct(){return Etalase.save();}
function delProduct(i){return Etalase.delete(i);}

// ImportKatalog (kw200-import-katalog-harga): import massal produk+harga dari teks yang ditempel
// (mis. daftar harga reseller dari WA/supplier). Baris tanpa harga di akhir dianggap header
// kategori (berlaku utk baris2 sesudahnya sampai ketemu header baru). Baris dgn harga di akhir
// (format "Rp30.000", "30.000", atau "60rb") jadi 1 produk. Produk yg namanya sudah ada (cocok
// case-insensitive) di-UPDATE harganya, bukan bikin duplikat. Tidak membuat transaksi pengeluaran
// apapun (beda dari Etalase.save) — stok produk baru = 0, isi manual lewat Kasir Isi Stok kalau perlu.
