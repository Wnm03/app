// cobek-io.js — Domain Shop bagian impor/ekspor: ImportKatalog (impor massal produk+harga
// Dipindah ke modules/shop/cobek-io.js (Sesi 10 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// dari teks), wrapper tab/tombol UI ringan, ShopExport (ekspor XLSX), ImportShopExcel (impor
// dari file Excel). Bagian ke-5 (terakhir) dari 5 hasil pemecahan cobek.js — lihat catatan
// urutan load di cobek-etalase.js.
//
// Sesi ini (Bagian B, DESIGN_torsi-vehicle-selector_shop-import-export-2.md,
// §B.3.2 Import PDF): tambah `ImportKatalog.parseText(text)`, wrapper publik
// TIPIS di atas `_parse()` yang sudah ada (dipakai `preview()`) — supaya
// regex parsing "Nama Rp30.000"/"Nama 60rb"/kategori-tanpa-harga jadi 1
// SUMBER KEBENARAN yang dipakai bareng oleh paste manual & Import PDF Shop
// (modules/business/shop-pdf-import-ui.js, baru) — 0 logic parsing baru.

const ImportKatalog={
parsed:[],
target:'reseller',
open(){
this.parsed=[];
this.target='reseller';
const ta=document.getElementById('importKatalogText');
if(ta)ta.value='';
const box=document.getElementById('importKatalogPreview');
if(box)box.innerHTML='';
document.querySelectorAll('#importKatalogTargetToggle .chip-btn').forEach(b=>b.classList.remove('active'));
const defBtn=document.getElementById('importKatalogTargetReseller');
if(defBtn)defBtn.classList.add('active');
const btn=document.getElementById('importKatalogCommitBtn');
if(btn)btn.disabled=true;
openModal('importKatalogModal');
},
setTarget(target,el){
this.target=target;
document.querySelectorAll('#importKatalogTargetToggle .chip-btn').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
},
_parsePrice(tok){
const isRibu=/(rb|ribu|k)\s*$/i.test(tok.trim());
const digits=tok.replace(/[^\d]/g,'');
if(!digits)return 0;
let num=parseInt(digits,10);
if(isRibu)num=num*1000;
return num;
},
_parse(text){
const lines=text.split(/\r?\n/);
let currentCat='';
const items=[];
const priceLineRe=/^(.+?)[ \t]+((?:Rp\.?\s*)?\d[\d.,]*\s*(?:rb|ribu|k)?)\s*$/i;
for(const raw of lines){
const line=raw.trim();
if(!line)continue;
const m=line.match(priceLineRe);
if(m){
const name=m[1].trim();
const price=this._parsePrice(m[2]);
if(name&&price>0)items.push({name,price,kategori:currentCat});
} else {
currentCat=line;
}
}
return items;
},
// parseText(text) — wrapper publik TIPIS di atas _parse() (dipakai internal
// oleh preview() di atas), supaya ATURAN PARSING (format "Nama Rp30.000" /
// "Nama 60rb", baris tanpa harga = kategori) punya 1 SUMBER KEBENARAN yang
// dipakai bareng oleh paste manual (importKatalogModal, lewat preview()) &
// Import PDF Shop (shop-pdf-import-ui.js) sekaligus — TIDAK ada regex/logic
// parsing baru/duplikat di file lain. Return shape SAMA PERSIS _parse():
// {name, price, kategori}[].
parseText(text){
return this._parse(text||'');
},
preview(){
const ta=document.getElementById('importKatalogText');
const text=ta?ta.value:'';
if(!text.trim()){toast('⚠️ Tempel dulu daftar harga di kotak teks');return;}
const items=this._parse(text);
this.parsed=items;
const box=document.getElementById('importKatalogPreview');
const btn=document.getElementById('importKatalogCommitBtn');
if(!box)return;
if(!items.length){
box.innerHTML='<div class="u-fs12 u-t2">Tidak ada baris harga yang kebaca. Format per baris: "Nama Produk[spasi/tab]Rp30.000" atau "Nama Produk 60rb". Baris tanpa harga dianggap nama kategori utk baris2 sesudahnya.</div>';
if(btn)btn.disabled=true;
return;
}
const grouped={};
items.forEach(it=>{
const key=it.kategori||'(Tanpa Kategori)';
if(!grouped[key])grouped[key]=[];
grouped[key].push(it);
});
let html=`<div class="u-fs12 u-t2 u-mb8">${items.length} produk kebaca dari ${Object.keys(grouped).length} kategori.</div>`;
Object.keys(grouped).forEach(kat=>{
html+=`<div class="u-fs11 u-t2" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px">${escapeHtml(kat)}</div>`;
grouped[kat].forEach(it=>{
const exists=D.products.find(p=>p.name.toLowerCase()===it.name.toLowerCase());
const statusLabel=exists?'🔄 update':'🆕 baru';
html+=`<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px"><span>${escapeHtml(it.name)}</span><span style="white-space:nowrap">${fmtFull(it.price)} <span class="u-t2">(${statusLabel})</span></span></div>`;
});
});
box.innerHTML=html;
if(btn)btn.disabled=false;
},
// commit() — DIREROUTE ke ShopDataIO.commitShopRows() (shop-data-io-api.js,
// §B.4) sbg SATU-SATUNYA sumber logic match-by-name + create/update produk,
// dipakai bareng Scan/PDF/CSV. Perilaku Paste TIDAK berubah: hargaJual
// selalu diisi dari it.price; target 'reseller' TAMBAH mengisi
// hargaReseller, target 'beli' TAMBAH mengisi hargaBeli — dipetakan lewat
// field rows opsional (kategori/hargaJual/hargaReseller/hargaBeli), bukan
// diduplikasi ulang di sini.
commit(){
if(!this.parsed||!this.parsed.length){toast('⚠️ Klik Pratinjau dulu sebelum Import');return;}
const rows=this.parsed.map(it=>{
const row={nama:it.name,kategori:it.kategori,hargaJual:it.price};
if(this.target==='reseller')row.hargaReseller=it.price;
else if(this.target==='beli')row.hargaBeli=it.price;
return row;
});
const res=ShopDataIO.commitShopRows(rows);
closeModal('importKatalogModal');
renderProductList();
toast(`✅ Import selesai: ${res.created} produk baru, ${res.updated} diperbarui`);
this.parsed=[];
}
};
function openImportKatalogModal(){return ImportKatalog.open();}
function previewImportKatalog(){return ImportKatalog.preview();}
function setImportKatalogTarget(target,el){return ImportKatalog.setTarget(target,el);}
function commitImportKatalog(){return ImportKatalog.commit();}
function applyPriceRekoWidgetOne(id){return PriceRekoWidget.applyOne(id);}
function openPriceRekoWidgetDetail(id){return PriceRekoWidget.openDetail(id);}
function openStockRekoWidgetDetail(id,restockQty){return StockRekoWidget.openDetail(id,restockQty);}
/* moved to modules-render.js: renderProductList */
function setShopTab(t,el){
document.querySelectorAll('#page-shop .cn-tab').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
['kasir','jual','etalase','produsen','riwayat','pelanggan','laporan','bi'].forEach(x=>{const elx=document.getElementById('shopTab-'+x);if(elx){elx.classList.toggle('u-dnone', x!==t);elx.style.display='';}});
if(t==='kasir')Kasir.render();
if(t==='etalase')renderProductList();
if(t==='produsen')renderProdusenList();
if(t==='riwayat'){renderShop();renderShopGrafik();}
if(t==='jual')renderShopRecent();
if(t==='pelanggan')renderCustomerList();
if(t==='laporan')Laporan.renderTab();
// Sesi 250 (Business Intelligence tab): panggil ulang render() 3 presenter
// yang SUDAH ADA (100% reuse, 0 rumus baru) supaya kartu-nya SELALU
// ter-refresh tiap kali tab ini dibuka — sama seperti sebelumnya sudah
// otomatis ter-refresh lewat _safeRender (modules-render.js) tiap render
// cycle, cuma sekarang container-nya pindah ke tab Shop (bukan lagi di
// Beranda), jadi butuh trigger tambahan saat tab-nya benar2 dibuka.
if(t==='bi'){
if(typeof ShopBusinessEnginePresenter!=='undefined')ShopBusinessEnginePresenter.render();
if(typeof TripPresenter!=='undefined')TripPresenter.render();
if(typeof BusinessFlowPresenter!=='undefined')BusinessFlowPresenter.render();
// Sesi 251 (lanjutan Business Intelligence tab): BusinessIntelligencePresenter
// — Health Score/Decision Panel/Trend Analytics/Executive Summary/AI Insight,
// 100% reuse 3 presenter di atas + engine Shop (0 rumus baru), lihat
// modules/shop/business-intelligence-presenter.js.
if(typeof BusinessIntelligencePresenter!=='undefined'){BusinessIntelligencePresenter.render();}
else if(typeof ensureBusinessIntelligence==='function'){
ensureBusinessIntelligence().then(function(){if(typeof BusinessIntelligencePresenter!=='undefined')BusinessIntelligencePresenter.render();}).catch(function(e){
console.error('[BusinessIntelligencePresenter] Gagal lazy-load modules/shop/business-intelligence-presenter.js:',e);
if(typeof window.__moduleLoadFail==='function')window.__moduleLoadFail('modules/shop/business-intelligence-presenter.js');
});
}
}
}
// BUGFIX (2026-07-11): alias kompatibilitas mundur. `setCobekTab` di-rename jadi `setShopTab`
// saat redesign Etalase (lihat CATATAN-CEK-CLAUDE.md), tapi PWA yang service worker-nya belum
// sempat ganti ke bundle baru (mis. buka app pas offline / cache belum ke-refresh) masih bisa
// menyimpan HTML LAMA dgn `data-action="setCobekTab"` di tombol tab Bisnis Shop, sehingga
// begitu bundle JS baru ini ter-load, tombol lama itu memanggil fungsi yang sudah tidak ada →
// muncul toast "Tombol ini belum berfungsi (setCobekTab)". Alias tipis ini membuat kombinasi
// HTML lama + JS baru tetap berfungsi sampai service worker sempat menyegarkan HTML-nya juga.
function setCobekTab(t,el){return setShopTab(t,el);}

function openProdusenModal(id){return Produsen.openModal(id);}
function saveProdusen(){return Produsen.save();}
function delProdusen(id){return Produsen.delete(id);}
/* moved to modules-render.js: renderProdusenList */
function openProdusenHargaModal(produsenId){return Produsen.openHargaModal(produsenId);}
function saveProdusenHarga(){return Produsen.saveHarga();}
function populateOrderProductSelect(){return Order.populateProductSelect();}
function openOrderModal(){return Order.openModal();}
function addOrderItem(){return Order.addItem();}
function updateOrderItemHarga(idx,val){return Order.updateItemHarga(idx,val);}
function changeOrderQty(idx,delta){return Order.changeQty(idx,delta);}
function removeOrderItem(idx){return Order.removeItem(idx);}
function computeOrderTotals(){return Order.computeTotals();}
/* moved to modules-render.js: renderOrderItems */
function saveOrder(){return Order.save();}
/* moved to modules-render.js: renderShopRecent */
function shopOrderRowHTML(t){return Order.rowHTML(t);}

function customerKey(cust){return Pelanggan.key(cust);}
function getCustomerOrders(cust){return Pelanggan.getOrders(cust);}
function aggregateCustomers(){return Pelanggan.aggregate();}
function onCustomerInputChange(){return Pelanggan.onInputChange();}
/* moved to modules-render.js: renderCustomerList */
function openCustomerDetail(key){return Pelanggan.openDetail(key);}
function toggleOrderDeliveredField(){return SiapPulang.toggleDeliveredField();}
function markShopDelivered(id){return SiapPulang.markDelivered(id);}
/* moved to modules-render.js: renderSiapPulang */

function setShopPeriode(p,el){return Laporan.setPeriode(p,el);}
function getShopRange(){return Laporan.getRange();}
/* moved to modules-render.js: renderShop */
function delShop(id){return Laporan.delete(id);}
/* moved to modules-render.js: renderShopGrafik */
function renderShopLaporan(){return Laporan.renderTab();}

function renderShopStockCartList(){
const el=document.getElementById('txShopStockCartList');
if(!el)return;
if(!curShopStockCart.length){el.innerHTML='';return;}
el.innerHTML=curShopStockCart.map((it,i)=>`
    <div class="u-flex u-aic u-gap8 u-r8 u-mb6" style="background:var(--surface3);padding:8px 10px">
      <div class="u-flex1 u-minw0">
        <div class="u-fs12 u-fw700" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.name)}${it.isNew?' <span class="u-cacc u-fw600">(baru)</span>':''}</div>
        <div class="u-fs12t2">${it.qty} x ${fmtFull(it.hargaBeli)} = ${fmtFull(it.qty*it.hargaBeli)}</div>
      </div>
      <button type="button" class="tx-del" data-action="removeShopStockCartItem" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
    </div>`).join('');
}

function renderTxShopSaleCartList(){
const el=document.getElementById('txShopSaleCartList');
if(!el)return;
if(!curTxShopSaleCart.length){el.innerHTML='';return;}
const{lines,total,profit}=computeTxShopSaleTotals();
el.innerHTML=lines.map((l,i)=>`
    <div class="u-flex u-aic u-gap8 u-r8 u-mb6" style="background:var(--surface3);padding:8px 10px">
      <div class="u-flex1 u-minw0">
        <div class="u-fs12 u-fw700" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(l.name)}</div>
        <div class="u-fs12t2">${l.qty} x ${fmtFull(l.harga)} = ${fmtFull(l.lineTotal)}</div>
      </div>
      <button type="button" class="tx-del" data-action="removeTxShopSaleCartItem" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
    </div>`).join('')+`<div class="u-fs12 u-t2 u-mt2 u-tar">Subtotal: ${fmtFull(total)} · Estimasi untung: ${fmtFull(profit)}</div>`;
}

function renderProductList(){Etalase.renderList();Etalase.renderKategoriList();Etalase.renderModalStat();PriceRekoWidget.render();StockRekoWidget.render();}

function renderProdusenList(){return Produsen.renderList();}

function renderOrderItems(){return Order.renderItems();}

function renderShopRecent(){return Order.renderRecent();}

function renderShop(){return Laporan.render();}

function renderShopGrafik(){return Laporan.renderGrafik();}

function renderCustomerList(){return Pelanggan.renderList();}

function renderSiapPulang(){return SiapPulang.render();}

// ShopExport (kw209-shop-export-xlsx) — export data fitur Shop (Etalase, Produsen, Riwayat
// Transaksi, Pelanggan) ke file .xlsx, pakai pustaka SheetJS yang di-lazy-load dari CDN
// (ensureXLSX() di index.html/app_production.html, sama pola dgn ensureJsPDF/ensureHtml2Canvas).
// Setiap fungsi export*() bikin 1 file .xlsx sendiri (1 sheet), sedangkan exportSemua() gabung
// semua ke 1 file dgn 4 sheet. Data yg dipakai SELALU ambil langsung dari D (live), bukan cache,
// biar selalu sinkron sama kondisi terbaru pas tombol ditekan.
const ShopExport={
async _ensureLib(){
if(typeof XLSX!=='undefined')return true;
try{ await ensureXLSX(); }catch(e){ toast('⚠️ Gagal memuat pustaka Excel, cek koneksi internet'); return false; }
if(typeof XLSX==='undefined'){ toast('⚠️ Pustaka Excel tidak tersedia'); return false; }
return true;
},
_download(sheets,fileBase){
const wb=XLSX.utils.book_new();
sheets.forEach(s=>{
const ws=XLSX.utils.aoa_to_sheet(s.rows);
XLSX.utils.book_append_sheet(wb,ws,s.name.slice(0,31));
});
const dateStr=new Date().toISOString().split('T')[0];
XLSX.writeFile(wb,`${fileBase}-${dateStr}.xlsx`);
toast('✅ File Excel berhasil diunduh');
},
etalaseRows(){
const rows=[['Nama Produk','Kategori','Produsen','Stok','Harga Beli','Harga Jual','Harga Reseller','Diskon %','Margin (Rp)','Margin (%)']];
(D.products||[]).forEach(p=>{
const kat=shopKategoriName(p.kategoriId);
const prod=p.produsenId?(D.produsen.find(pr=>pr.id===p.produsenId)||{}).name:'';
const margin=(p.hargaJual||0)-(p.hargaBeli||0);
const marginPct=p.hargaBeli>0?Math.round((margin/p.hargaBeli)*100):0;
rows.push([p.name,kat||'',prod||'',p.stock||0,p.hargaBeli||0,p.hargaJual||0,p.hargaReseller||'',p.diskonPersen||0,margin,marginPct]);
});
return rows;
},
produsenRows(){
const rows=[['Nama Produsen','Kontak','Catatan','Jarak (km)','Biaya/km','Jumlah Produk Terhubung']];
(D.produsen||[]).forEach(pr=>{
const jumlah=(D.products||[]).filter(p=>p.hargaByProdusen&&p.hargaByProdusen[pr.id]!==undefined).length;
rows.push([pr.name,pr.contact||'',pr.note||'',pr.jarakKm||'',pr.biayaPerKm||'',jumlah]);
});
return rows;
},
riwayatRows(){
// Ikut periode yang lagi aktif dipilih di tab Riwayat (Laporan.periode), biar hasil export
// konsisten dgn apa yang lagi ditampilkan di layar saat tombol ditekan.
const {from,to}=Laporan.getRange();
const inRange=(D.cobek||[]).filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;}).sort((a,b)=>(b.id||0)-(a.id||0));
const rows=[['Tanggal','Pelanggan','No HP','Alamat','Item','Tipe Harga','Subtotal','Diskon','Ongkir','Total','Untung','Status Serah','Catatan']];
inRange.forEach(t=>{
if(t.items){
rows.push([t.date,t.customer?.name||'',t.customer?.phone||'',t.customer?.address||'',t.items.map(i=>i.name+' x'+i.qty).join('; '),t.priceType||'',t.subtotal||0,t.diskon||0,t.ongkir||0,t.total||0,t.profit||0,t.delivered===false?'Belum':'Sudah',t.note||'']);
}else{
rows.push([t.date,'','','',(t.sets||'')+' set (data lama)','','','','',t.total||0,t.profit||0,'',t.note||'']);
}
});
return rows;
},
pelangganRows(){
const list=Pelanggan.aggregate();
const rows=[['Nama','No HP','Alamat','Jumlah Order','Total Omzet','Total Untung','Langganan']];
list.forEach(c=>rows.push([c.name,c.phone||'',c.address||'',c.orders.length,c.totalOmzet||0,c.totalProfit||0,c.orders.length>=3?'Ya':'Tidak']));
return rows;
},
laporanRows(){
// Ikut periode yang lagi aktif di tab Laporan (Laporan.periodeLap), TERPISAH dari
// Laporan.periode milik tab Riwayat — lihat catatan di Laporan.periodeLap (cobek-order.js).
const {from,to}=Laporan.getRangeLap();
const inRange=(D.cobek||[]).filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;});
const omzet=inRange.reduce((s,t)=>s+(t.total||0),0);
const untung=inRange.reduce((s,t)=>s+(t.profit||0),0);
const ringkasan=[['Ringkasan Periode Ini'],['Jumlah Transaksi',inRange.length],['Total Omzet',omzet],['Total Untung',untung],['Margin Rata-rata (%)',omzet>0?Math.round((untung/omzet)*100):0],[],['🏆 Produk Terlaris'],['Nama Produk','Qty Terjual','Omzet']];
Laporan.topProdukAgg(inRange).forEach(p=>ringkasan.push([p.name,p.qty,p.omzet]));
return ringkasan;
},
async exportEtalase(){ if(!await this._ensureLib())return; this._download([{name:'Etalase Produk',rows:this.etalaseRows()}],'shop-etalase'); },
async exportProdusen(){ if(!await this._ensureLib())return; this._download([{name:'Produsen',rows:this.produsenRows()}],'shop-produsen'); },
async exportRiwayat(){ if(!await this._ensureLib())return; this._download([{name:'Riwayat Transaksi',rows:this.riwayatRows()}],'shop-riwayat'); },
async exportPelanggan(){ if(!await this._ensureLib())return; this._download([{name:'Pelanggan',rows:this.pelangganRows()}],'shop-pelanggan'); },
async exportLaporan(){ if(!await this._ensureLib())return; this._download([{name:'Laporan Shop',rows:this.laporanRows()}],'shop-laporan'); },
async exportSemua(){
if(!await this._ensureLib())return;
this._download([
{name:'Etalase Produk',rows:this.etalaseRows()},
{name:'Produsen',rows:this.produsenRows()},
{name:'Riwayat Transaksi',rows:this.riwayatRows()},
{name:'Pelanggan',rows:this.pelangganRows()}
],'shop-lengkap');
}
};
function exportShopEtalaseXLSX(){return ShopExport.exportEtalase();}
function exportShopProdusenXLSX(){return ShopExport.exportProdusen();}
function exportShopRiwayatXLSX(){return ShopExport.exportRiwayat();}
function exportShopPelangganXLSX(){return ShopExport.exportPelanggan();}
function exportShopSemuaXLSX(){return ShopExport.exportSemua();}
function exportLaporanShopXLSX(){return ShopExport.exportLaporan();}
function setLaporanPeriode(p,el){return Laporan.setPeriodeLap(p,el);}

// ImportShopExcel (kw210-shop-import-xlsx) — kebalikan dari ShopExport: baca file .xlsx yang
// diupload user (idealnya hasil "Export Excel" dari tab yang sama, sudah diedit/ditambah baris),
// lalu commit ke Etalase Produk atau Produsen. Alur: pilih target -> pilih file -> preview (baca
// via SheetJS, cocokkan header ke field yg diharapkan) -> commit (match by name: ada -> update,
// belum ada -> buat baru). TIDAK dipakai untuk Riwayat Transaksi/Pelanggan -- keduanya derived data
// (transaksi & agregat), impor transaksi mentah berisiko bikin ganda dgn Keuangan/stok, jadi
// sengaja tidak disediakan; hanya master data (Etalase/Produsen) yang aman diimpor begini.
const ImportShopExcel={
target:'etalase',
parsedRows:[],
open(target){
this.target=target||'etalase';
this.parsedRows=[];
document.querySelectorAll('#importShopExcelTargetToggle .chip-btn').forEach(b=>b.classList.remove('active'));
const btn=document.getElementById(this.target==='produsen'?'importShopExcelTargetProdusen':'importShopExcelTargetEtalase');
if(btn)btn.classList.add('active');
const fileEl=document.getElementById('importShopExcelFile');
if(fileEl)fileEl.value='';
const box=document.getElementById('importShopExcelPreview');
if(box)box.innerHTML='';
const commitBtn=document.getElementById('importShopExcelCommitBtn');
if(commitBtn)commitBtn.disabled=true;
openModal('importShopExcelModal');
},
setTarget(target,el){
this.target=target;
this.parsedRows=[];
document.querySelectorAll('#importShopExcelTargetToggle .chip-btn').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
const box=document.getElementById('importShopExcelPreview');
if(box)box.innerHTML='';
const commitBtn=document.getElementById('importShopExcelCommitBtn');
if(commitBtn)commitBtn.disabled=true;
const fileEl=document.getElementById('importShopExcelFile');
if(fileEl)fileEl.value='';
},
async onFileSelected(evt){
const file=evt.target.files&&evt.target.files[0];
const box=document.getElementById('importShopExcelPreview');
const commitBtn=document.getElementById('importShopExcelCommitBtn');
if(!file){if(box)box.innerHTML='';if(commitBtn)commitBtn.disabled=true;return;}
if(box)box.innerHTML='<div class="u-fs12 u-t2">Membaca file...</div>';
if(typeof XLSX==='undefined'){
try{ await ensureXLSX(); }catch(e){ toast('⚠️ Gagal memuat pustaka Excel, cek koneksi internet'); if(box)box.innerHTML=''; return; }
}
if(typeof XLSX==='undefined'){ toast('⚠️ Pustaka Excel tidak tersedia'); if(box)box.innerHTML=''; return; }
try{
const buf=await file.arrayBuffer();
const wb=XLSX.read(buf,{type:'array'});
const sheetName=wb.SheetNames[0];
const ws=wb.Sheets[sheetName];
const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
this._parse(rows);
}catch(e){
toast('⚠️ Gagal membaca file Excel: '+(e&&e.message?e.message:'format tidak dikenali'));
if(box)box.innerHTML='';
if(commitBtn)commitBtn.disabled=true;
return;
}
this._renderPreview();
},
_parse(rows){
if(this.target==='produsen'){
this.parsedRows=rows.map(r=>({
name:String(r['Nama Produsen']||'').trim(),
kontak:String(r['Kontak']||'').trim(),
catatan:String(r['Catatan']||'').trim(),
jarakKm:Number(r['Jarak (km)'])||'',
biayaPerKm:Number(r['Biaya/km'])||''
})).filter(r=>r.name);
} else {
this.parsedRows=rows.map(r=>({
name:String(r['Nama Produk']||'').trim(),
kategori:String(r['Kategori']||'').trim(),
produsen:String(r['Produsen']||'').trim(),
stock:Number(r['Stok'])||0,
hargaBeli:Number(r['Harga Beli'])||0,
hargaJual:Number(r['Harga Jual'])||0,
hargaReseller:r['Harga Reseller']!==''&&r['Harga Reseller']!==undefined?Number(r['Harga Reseller']):null,
diskonPersen:Number(r['Diskon %'])||0
})).filter(r=>r.name);
}
},
_renderPreview(){
const box=document.getElementById('importShopExcelPreview');
const commitBtn=document.getElementById('importShopExcelCommitBtn');
if(!box)return;
if(!this.parsedRows.length){
box.innerHTML='<div class="u-fs12 u-t2">Tidak ada baris valid terbaca. Pastikan file punya kolom header sesuai hasil Export Excel (mis. "Nama Produk"/"Nama Produsen").</div>';
if(commitBtn)commitBtn.disabled=true;
return;
}
let created=0,updated=0;
const rowsHtml=this.parsedRows.slice(0,50).map(r=>{
const exists=this.target==='produsen'
?D.produsen.find(p=>p.name.toLowerCase()===r.name.toLowerCase())
:D.products.find(p=>p.name.toLowerCase()===r.name.toLowerCase());
if(exists)updated++;else created++;
const statusLabel=exists?'🔄 update':'🆕 baru';
const sub=this.target==='produsen'
?(r.kontak||'')
:(r.stock+' pcs · '+fmtFull(r.hargaJual));
return`<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px"><span>${escapeHtml(r.name)}</span><span style="white-space:nowrap">${escapeHtml(sub)} <span class="u-t2">(${statusLabel})</span></span></div>`;
}).join('');
const moreNote=this.parsedRows.length>50?`<div class="u-fs11 u-t2" style="margin-top:6px">+${this.parsedRows.length-50} baris lain tidak ditampilkan di pratinjau (tetap ikut diimpor)</div>`:'';
box.innerHTML=`<div class="u-fs12 u-t2 u-mb8">${this.parsedRows.length} baris kebaca — ${created} baru, ${updated} update.</div>${rowsHtml}${moreNote}`;
if(commitBtn)commitBtn.disabled=false;
},
commit(){
if(!this.parsedRows.length){toast('⚠️ Belum ada data yang terbaca dari file');return;}
let created=0,updated=0;
if(this.target==='produsen'){
this.parsedRows.forEach(r=>{
let pr=D.produsen.find(x=>x.name.toLowerCase()===r.name.toLowerCase());
if(pr){
pr.contact=r.kontak||pr.contact||'';
pr.note=r.catatan||pr.note||'';
if(r.jarakKm!=='')pr.jarakKm=r.jarakKm;
if(r.biayaPerKm!=='')pr.biayaPerKm=r.biayaPerKm;
updated++;
} else {
D.produsen.push({id:'prd_'+Date.now()+'_'+uid(),name:r.name,contact:r.kontak||'',note:r.catatan||'',jarakKm:r.jarakKm||'',biayaPerKm:r.biayaPerKm||''});
created++;
}
});
save();closeModal('importShopExcelModal');renderProdusenList();
toast(`✅ Import Produsen selesai: ${created} baru, ${updated} diperbarui`);
} else {
this.parsedRows.forEach(r=>{
let p=D.products.find(x=>x.name.toLowerCase()===r.name.toLowerCase());
const kategoriId=r.kategori?resolveShopKategori(r.kategori):'';
const produsenMatch=r.produsen?D.produsen.find(x=>x.name.toLowerCase()===r.produsen.toLowerCase()):null;
if(p){
p.stock=r.stock;
p.hargaBeli=r.hargaBeli;
p.hargaJual=r.hargaJual;
if(r.hargaReseller!=null)p.hargaReseller=r.hargaReseller;
p.diskonPersen=r.diskonPersen;
if(kategoriId)p.kategoriId=kategoriId;
if(produsenMatch)p.produsenId=produsenMatch.id;
updated++;
} else {
D.products.push({id:'prod_'+Date.now()+'_'+uid(),name:r.name,stock:r.stock,hargaBeli:r.hargaBeli,hargaJual:r.hargaJual,hargaReseller:r.hargaReseller!=null?r.hargaReseller:null,diskonPersen:r.diskonPersen||0,kategoriId,produsenId:produsenMatch?produsenMatch.id:'',hargaByProdusen:{}});
created++;
}
});
save();closeModal('importShopExcelModal');renderProductList();
toast(`✅ Import Etalase selesai: ${created} produk baru, ${updated} diperbarui`);
}
this.parsedRows=[];
}
};
function openImportShopExcelModal(target){return ImportShopExcel.open(target);}
function setImportShopExcelTarget(target,el){return ImportShopExcel.setTarget(target,el);}
function onImportShopExcelFileChange(evt){return ImportShopExcel.onFileSelected(evt);}
function commitImportShopExcel(){return ImportShopExcel.commit();}
