// modules/vehicle/sparepart-servis-ui.js — extracted Sparepart UI/mutation methods
// Oversized-file refactor Sesi 2. Methods below are moved verbatim from
// modules/vehicle/sparepart-servis.js and attached after the main object is
// created. Structural extraction only: no business logic/API/DOM/storage
// behavior intentionally changed. Must load immediately AFTER sparepart-servis.js
// and BEFORE sparepart-servis-b.js.

function _spCatId(suffix){const base=(typeof uid==='function')?uid():(Date.now()+'_'+Math.random().toString(36).slice(2,8));return 'sp_'+base+(suffix?'_'+suffix:'');}

Object.assign(Sparepart,{
// suggestInterval() (Sesi 295, permintaan eksplisit user "tambahkan ai
// rekomendasi interval pergantian sparepart sesuai panduan pengguna"): isi
// otomatis field Interval Servis dari data manual resmi yg SUDAH ADA di app
// -- TORSI_DB (dikutip langsung dari Buku Pedoman Reparasi tiap
// motor/kendaraan, field `interval` spt "Ganti tiap 8.000 km"), bukan
// panggilan AI/web baru. Match nama part/servis yg diketik user vs semua
// entri TORSI_DB (semua kendaraan, prioritaskan kendaraan aktif kalau
// match lebih dari satu vehicle), fallback ke tabel kata kunci umum kalau
// tidak ada yg cocok. Murni rule-based & lokal (gratis, tanpa network).
suggestInterval(){
const nameEl=document.getElementById('sparepartName');
const name=(nameEl?nameEl.value:'').trim();
if(!name){toast('⚠️ Isi dulu Nama Part/Servis-nya');return;}
_renderSuggestBox(name);
},
// autoSuggestInterval() -- FITUR BARU (audit user): dipanggil OTOMATIS oleh
// openCatModal() saat EDIT kategori existing, supaya box rekomendasi AI
// langsung terisi tanpa perlu tap tombol manual. Beda dari suggestInterval()
// manual: nama kosong TIDAK toast error (cuma sembunyikan box diam2, wajar
// dipanggil otomatis tiap buka modal termasuk kategori tanpa nama -- kondisi
// yg seharusnya tidak mungkin tapi dijaga fail-safe). Reuse _renderSuggestBox
// yg sama persis dipakai suggestInterval(), 0 logic rekomendasi baru.
autoSuggestInterval(){
const nameEl=document.getElementById('sparepartName');
const name=(nameEl?nameEl.value:'').trim();
const boxEl=document.getElementById('sparepartAiSuggestBox');
if(!name){if(boxEl){boxEl.classList.add('u-dnone');boxEl.innerHTML='';}return;}
_renderSuggestBox(name);
},
applyIntervalSuggestion(km){
const el=document.getElementById('sparepartInterval');
if(el)el.value=km;
const boxEl=document.getElementById('sparepartAiSuggestBox');
if(boxEl)boxEl.classList.add('u-dnone');
toast('✅ Interval diisi '+km.toLocaleString('id-ID')+' km, cek dulu sebelum simpan');
},
async deleteFromModal(){
if(Sparepart.catEditIdx===null)return;
const before=D.sparepartCats.length;
await Sparepart.delCat(Sparepart.catEditIdx);
if(D.sparepartCats.length<before) closeModal('sparepartModal');
},
saveCat(){
const name=document.getElementById('sparepartName').value.trim();
const interval=parseFloat(document.getElementById('sparepartInterval').value);
const bulanEl=document.getElementById('sparepartIntervalBulan');
const intervalBulanRaw=bulanEl?parseFloat(bulanEl.value):NaN;
let code=document.getElementById('sparepartCode').value.trim().toUpperCase();
const showRemEl=document.getElementById('sparepartShowInReminder');
// Sesi 295: kalau user SENGAJA mematikan toggle "Tampilkan di Pengingat
// Servis", interval boleh dikosongkan (kategori ini cuma dipakai utk
// pengelompokan Stok Sparepart, bukan jadwal servis aktif) -- interval
// tetap WAJIB kalau toggle-nya aktif (perilaku lama tidak berubah).
const wantShow=showRemEl?showRemEl.checked:true;
if(!name){toast('⚠️ Lengkapi nama kategori');return;}
if(wantShow&&(!((interval&&interval>0)||(intervalBulanRaw&&intervalBulanRaw>0)))){toast('⚠️ Isi interval KM atau interval bulan, atau matikan toggle "Tampilkan di Pengingat Servis" kalau kategori ini cuma buat stok');return;}
const clash=matchingVehicleName(name);
if(clash){toast(`⚠️ "${name}" adalah nama kendaraan, bukan nama part/servis. Isi nama part yang mau diingatkan (mis. Oli Mesin, Ganti Ban, dll).`,4000);return;}
if(!code) code=codeFromName(name);
const intervalKm=(interval&&interval>0)?interval:0;
const intervalBulan=(intervalBulanRaw&&intervalBulanRaw>0)?intervalBulanRaw:0;
const catInfer=(typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog.infer)?ServiceInputCatalog.infer(name):null;
let masterCategoryId=document.getElementById('sparepartMasterCategoryId')?.value||catInfer?.group?.masterCategoryId||null;
let serviceComponentId=document.getElementById('sparepartServiceComponentId')?.value||catInfer?.item?.id||null;
const linkage=resolveServiceCategoryComponent(masterCategoryId,serviceComponentId,name);
masterCategoryId=linkage.masterCategoryId; serviceComponentId=linkage.serviceComponentId;
// vehicleId: TAMBAH baru tetap dikunci ikut curVehicleId (S629, perilaku
// lama tidak berubah -- dropdown disabled saat tambah baru, .value-nya
// kadang tidak reliable dibaca di semua browser/WebView, jadi tetap ambil
// dari curVehicleId langsung). EDIT kategori existing kini BISA dipindah
// manual (FITUR BARU, audit user) -- dropdown TERBUKA di mode ini (lihat
// populateVehicleSelect()), jadi baca LANGSUNG dari select, bukan dipaksa
// curVehicleId lagi.
let vehicleId;
if(Sparepart.catEditIdx!==null){
const selEl=document.getElementById('sparepartVehicleId');
const selVal=selEl?selEl.value:'';
vehicleId=(selVal&&D.vehicles.some(v=>v.id===selVal))?selVal:null;
} else {
const vid622=(typeof curVehicleId!=='undefined')?curVehicleId:null;
vehicleId=(vid622&&D.vehicles.some(v=>v.id===vid622))?vid622:null;
}
// FITUR BARU sesi ini (Sesi 2 dari 2, lanjutan Sesi 1 -- populateGroupSelect()
// /openCatModal() sudah isi dropdown #sparepartGroupId, sesi lalu SENGAJA
// belum baca dropdown ini saat simpan): baca pilihan dropdown "Grup Komponen".
// groupSelEl null (elemen TIDAK ADA sama sekali di DOM -- guard kompatibilitas
// mundur utk caller/test lama yang belum mengenal dropdown ini) SENGAJA
// dibedakan dari groupSelEl ada tapi value-nya "" (opsi "🤖 Otomatis" dipilih
// EKSPLISIT lewat form): yang pertama berarti "tidak ada info override sama
// sekali" -> perilaku 100% identik sebelum Sesi 2 (rule v1641 murni); yang
// kedua baru dianggap sinyal reset eksplisit dari user.
const groupSelEl=document.getElementById('sparepartGroupId');
const groupSelVal=groupSelEl?groupSelEl.value:'';
if(Sparepart.catEditIdx!==null){
const editCat=D.sparepartCats[Sparepart.catEditIdx];
// FITUR BARU (audit lanjutan grouping, sesi lalu v1641): kalau nama ATAU
// kendaraan berubah, `group`/`groupIcon` tersimpan ikut direcompute lewat
// resolveCatGroup() -- 2 hal itu satu-satunya input match TORSI_DB (lihat
// resolveCatGroup() atas), jadi group lama berpotensi basi kalau salah
// satunya berubah (mis. rename "Oli Mesin"->"Kampas Rem", atau pindah
// kendaraan yang TORSI_DB-nya beda). Kalau nama & kendaraan TIDAK berubah,
// group existing (termasuk yang di-set manual dari kategori rekomendasi)
// dibiarkan apa adanya -- 0 risiko menimpa niat manual tanpa alasan.
const nameChanged=editCat.name!==name;
const vehChanged=editCat.vehicleId!==vehicleId;
if(groupSelEl&&groupSelVal){
// Override manual dari dropdown MENANG mutlak (Sesi 2) -- bahkan atas
// rule recompute-by-rename di atas, walau nama/kendaraan ikut berubah.
editCat.group=groupSelVal;
editCat.groupIcon=(typeof iconForGroupName==='function')?iconForGroupName(groupSelVal):'📦';
} else if(nameChanged||vehChanged){
const grpEdit=(typeof resolveCatGroup==='function')?resolveCatGroup({name},vehicleId):{group:editCat.group,icon:editCat.groupIcon};
editCat.group=grpEdit.group;
editCat.groupIcon=grpEdit.icon;
} else if(groupSelEl){
// Dropdown ADA & value-nya "" -- "🤖 Otomatis" dipilih EKSPLISIT (bukan
// cuma efek rename/pindah kendaraan di atas) -- ini reset ke otomatis:
// hapus group/groupIcon TERSIMPAN supaya resolveCatGroup() ke depan
// benar2 jatuh ke jalur otomatis (match TORSI_DB/GENERIC_GROUP_BY_NAME/
// 'Lainnya'), bukan cuma dibiarkan (yang tetap akan dibaca sbg "cat.group
// tersimpan" krn itu prioritas #1 resolveCatGroup()).
delete editCat.group;
delete editCat.groupIcon;
}
// groupSelEl null (elemen tidak ada sama sekali di DOM): nameChanged/
// vehChanged sudah false di sini -- tidak ada branch lain yg cocok, group
// existing dibiarkan apa adanya, IDENTIK perilaku v1641 sebelum Sesi ini.
editCat.name=name;
editCat.code=code;
editCat.intervalKm=intervalKm;
editCat.intervalBulan=intervalBulan;
editCat.masterCategoryId=masterCategoryId||null;
editCat.serviceComponentId=serviceComponentId||null;
editCat.showInReminder=wantShow;
editCat.vehicleId=vehicleId;
} else {
// FITUR BARU (audit lanjutan grouping, sesi lalu): kategori baru dari form
// manual ini mewarisi group/groupIcon -- override dropdown manual (Sesi 2)
// MENANG kalau dipilih, fallback ke resolveCatGroup() yang SUDAH ADA (match
// nama ke TORSI_DB kendaraan aktif dulu, lalu GENERIC_GROUP_BY_NAME, lalu
// 'Lainnya' kalau tidak match sama sekali) kalau dropdown "🤖 Otomatis" atau
// elemen dropdown tidak ada sama sekali di DOM.
const grpNew=(groupSelEl&&groupSelVal)
?{group:groupSelVal,icon:(typeof iconForGroupName==='function')?iconForGroupName(groupSelVal):'📦'}
:((typeof resolveCatGroup==='function')?resolveCatGroup({name},vehicleId):{group:'Lainnya',icon:'📦'});
D.sparepartCats.push({id:_spCatId(),name,code,intervalKm,intervalBulan,masterCategoryId:masterCategoryId||null,serviceComponentId:serviceComponentId||null,showInReminder:wantShow,vehicleId,group:grpNew.group,groupIcon:grpNew.icon});
}
save();closeModal('sparepartModal');Sparepart.renderCatList();renderServisList();renderDashboardServisReminder();toast('✅ Kategori sparepart disimpan');
},
async delCat(i){
const cat=D.sparepartCats[i];
if(!cat)return;
const linkedStock=D.partsStock.filter(p=>p.catId===cat.id);
const linkedVeh=D.vehicles.filter(v=>v.intervalOverrides&&v.intervalOverrides[cat.id]>0);
let msg='Hapus kategori sparepart ini? Riwayat servis terkait tetap ada.';
if(linkedStock.length||linkedVeh.length){
const parts=[];
if(linkedStock.length)parts.push(linkedStock.length+' item Stok Sparepart');
if(linkedVeh.length)parts.push(linkedVeh.length+' interval khusus kendaraan');
msg=`⚠️ Kategori "${cat.name}" masih dipakai oleh ${parts.join(' & ')}. Kalau dihapus: item stok terkait jadi "Tanpa kategori" dan interval khusus itu ikut dihapus (kembali ke default global). Riwayat servis tetap ada. Lanjut hapus?`;
}
if(!await askConfirm(msg,{title:'Hapus Kategori Sparepart',icon:'🗑'}))return;
linkedStock.forEach(p=>{p.catId=null;});
linkedVeh.forEach(v=>{if(v.intervalOverrides)delete v.intervalOverrides[cat.id];});
D.sparepartCats.splice(i,1);save();Sparepart.renderCatList();Sparepart.renderStockList();renderServisList();renderDashboardServisReminder();
toast(linkedStock.length||linkedVeh.length?'🗑 Dihapus, referensi terkait sudah dibersihkan':'🗑 Dihapus');
},
// populateStockCatSelect() -- S622: dropdown "Kategori" di modal Stok Sparepart
// skrg cuma nawarin kategori yg RELEVAN ke kendaraan aktif (universal +
// kategori khusus kendaraan ini), pakai catVisibleForVehicle() yg sama
// dipakai renderCatList()/renderReminder(), supaya user tidak bisa taut-kan
// stok kendaraan A ke kategori khusus kendaraan B.
populateServiceComponentSelect(elId,masterCategoryId,selectedId){
const sel=document.getElementById(elId);
if(!sel||typeof ServiceInputCatalog==='undefined')return;
const g=ServiceInputCatalog.groupById(masterCategoryId);
const cur=selectedId||'';
sel.innerHTML='<option value="">— Tanpa komponen spesifik —</option>'+(g?(g.items||[]).map(it=>`<option value="${escapeHtml(it.id)}">${escapeHtml(it.name)}</option>`).join(''):'');
if(cur&&g&&(g.items||[]).some(it=>it.id===cur))sel.value=cur;
},
syncStockServiceComponent(){
const catId=document.getElementById('stockCatId')?.value||'';
const cat=D.sparepartCats.find(c=>c.id===catId);
const master=cat&&cat.masterCategoryId?cat.masterCategoryId:((typeof resolveCatGroup==='function'&&cat)?resolveCatGroup(cat,(typeof curVehicleId!=='undefined'?curVehicleId:null)).masterCategoryId:null);
this.populateServiceComponentSelect('stockServiceComponentId',master,cat&&cat.serviceComponentId||'');
},
syncCategoryServiceComponent(){
const master=document.getElementById('sparepartMasterCategoryId')?.value||'';
this.populateServiceComponentSelect('sparepartServiceComponentId',master,document.getElementById('sparepartServiceComponentId')?.value||'');
},
populateStockCatSelect(selectedId){
const sel=document.getElementById('stockCatId');
if(!sel)return;
const cur=selectedId||sel.value||'';
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const visible=D.sparepartCats.filter(c=>catVisibleForVehicle(c,vid));
// Saat edit stok universal, kategori bisa saja scoped ke kendaraan lain.
// Kategori lama itu TETAP dimunculkan sebagai opsi terpilih agar membuka+
// menyimpan ulang stok tidak diam-diam memutus catId. Namun kategori private
// kendaraan lain tidak ditawarkan sebagai opsi baru.
const selectedCat=cur?(D.sparepartCats||[]).find(c=>c&&c.id===cur):null;
const cats=selectedCat&&!visible.some(c=>c.id===selectedCat.id)?[selectedCat,...visible]:visible;
sel.innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${c.id}">${escapeHtml(c.code||codeFromName(c.name))} — ${escapeHtml(c.name)}${selectedCat&&c.id===selectedCat.id&&!catVisibleForVehicle(c,vid)?' — kategori kendaraan lain':''}</option>`).join('');
if(cur&&cats.some(c=>c.id===cur)) sel.value=cur;
// FITUR BARU (audit, gap "dropdown kategori tanpa pencarian"): reset kotak
// cari tiap kali dropdown dimuat ulang (buka modal baru/ganti kendaraan),
// supaya tidak ada filter nyangkut dari sesi buka-modal sebelumnya.
const searchEl=document.getElementById('stockCatSearch');
if(searchEl)searchEl.value='';
},
// filterStockCatOptions() -- FITUR BARU (audit, gap "dropdown kategori
// tanpa pencarian"): dropdown Kategori di modal Stok Sparepart tadinya
// <select> native flat -- begitu daftar kategori panjang (multi-kendaraan
// x banyak jenis part), native picker HP jadi susah dicari. Fix: kotak cari
// (#stockCatSearch) di atas <select> ini filter opsi secara live pakai
// `.hidden` per <option> (didukung WebView Chromium modern) -- 0 perubahan
// pada makna value/opsi itu sendiri, hanya visibilitasnya. Opsi "Tanpa
// kategori" (value kosong) SELALU ikut tampil apa pun query-nya, supaya
// tetap bisa dipilih kapan saja.
filterStockCatOptions(){
const searchEl=document.getElementById('stockCatSearch');
const sel=document.getElementById('stockCatId');
if(!searchEl||!sel)return;
const q=searchEl.value.trim().toLowerCase();
Array.from(sel.options||[]).forEach(opt=>{
opt.hidden=!!(q&&opt.value&&!opt.textContent.toLowerCase().includes(q));
});
},
autoFillStockCode(){
const codeEl=document.getElementById('stockCode');
if(!codeEl||codeEl.dataset.manual==='1')return;
const catId=document.getElementById('stockCatId').value;
const cat=D.sparepartCats.find(c=>c.id===catId);
const prefix=cat?(cat.code||codeFromName(cat.name)):codeFromName(document.getElementById('stockName').value);
if(!prefix){codeEl.value='';return;}
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
codeEl.value=prefix+'-'+String(seq).padStart(3,'0');
},
calcDashboardStats(partsStock,servisLogs){
const list=partsStock||[];
const low=list.filter(p=>p.minStock>0&&p.qty>0&&p.qty<=p.minStock);
const habis=list.filter(p=>p.qty<=0);
const usageCount={};
(servisLogs||[]).forEach(s=>{
if(s.usedPartId)usageCount[s.usedPartId]=(usageCount[s.usedPartId]||0)+1;
if(s.catalogPartLinkedStockId)usageCount[s.catalogPartLinkedStockId]=(usageCount[s.catalogPartLinkedStockId]||0)+1;
});
let topPart=null,topCount=0;
Object.keys(usageCount).forEach(id=>{if(usageCount[id]>topCount){topCount=usageCount[id];topPart=list.find(p=>p.id===id)||null;}});
const nilaiPersediaan=list.reduce((s,p)=>s+(p.qty>0?p.qty*(p.price||0):0),0);
const priced=list.filter(p=>p.price>0);
const avgPrice=priced.length?priced.reduce((s,p)=>s+p.price,0)/priced.length:0;
let lastPurchase=null;
list.forEach(p=>{
if(!p.lastPurchaseDate)return;
if(!lastPurchase||p.lastPurchaseDate>lastPurchase.lastPurchaseDate)lastPurchase=p;
});
const chartData=list.filter(p=>p.qty>0&&p.price>0).map(p=>({name:p.name,value:p.qty*(p.price||0)})).sort((a,b)=>b.value-a.value).slice(0,5);
return{low,habis,topPart,topCount,nilaiPersediaan,avgPrice,lastPurchase,chartData};
},
// calcFinanceStats(partsStock,servisLogs) — Tahap 8D: cakupan utk integrasi
// Dashboard Keuangan + Sparepart (kartu ringkasan). MURNI (array in ->
// object out, tidak sentuh DOM), sama pola dgn calcDashboardStats() di atas.
// 100% REUSE data yang sudah ada (p.priceHistory diisi applyStockPurchase()
// di tx-stok-sparepart.js Tahap 8A, p.price/p.qty dipakai persis sama
// dengan rumus nilaiPersediaan calcDashboardStats() di atas, servisLogs.cost
// & usedPartId/usedPartQty/catalogPartLinkedStockId/catalogPartQty sudah
// ada di car-notes.js) — TIDAK ada field/rumus baru di data D, cuma agregasi
// baca-saja utk presenter Dashboard Keuangan.
calcFinanceStats(partsStock,servisLogs){
const list=partsStock||[];
const logs=servisLogs||[];
let totalPembelian=0;
const beliByMonth={};
list.forEach(p=>{
(Array.isArray(p.priceHistory)?p.priceHistory:[]).forEach(h=>{
const val=(h.qty||0)*(h.price||0);
totalPembelian+=val;
if(h.date){
const key=String(h.date).slice(0,7);
beliByMonth[key]=(beliByMonth[key]||0)+val;
}
});
});
const totalNilaiStok=list.reduce((s,p)=>s+(p.qty>0?p.qty*(p.price||0):0),0);
let totalNilaiTerpakai=0;
const pakaiByMonth={};
let biayaServisSparepart=0;
logs.forEach(s=>{
let usedValue=0;
if(s.usedPartId){
const p=list.find(x=>x.id===s.usedPartId);
if(p)usedValue+=(s.usedPartQty||0)*(p.price||0);
}
if(s.catalogPartLinkedStockId){
const p=list.find(x=>x.id===s.catalogPartLinkedStockId);
if(p)usedValue+=(s.catalogPartQty||0)*(p.price||0);
}
if(usedValue>0){
totalNilaiTerpakai+=usedValue;
if(s.date){
const key=String(s.date).slice(0,7);
pakaiByMonth[key]=(pakaiByMonth[key]||0)+usedValue;
}
}
if(s.usedPartId||s.catalogPartLinkedStockId)biayaServisSparepart+=(s.cost||0);
});
const monthLabel=(key)=>{
const[y,m]=key.split('-');
const d=new Date(Number(y),Number(m)-1,1);
return d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'});
};
const toTrend=(byMonth)=>Object.keys(byMonth).sort().slice(-6).map(key=>({month:key,label:monthLabel(key),total:byMonth[key]}));
const trenPembelianBulanan=toTrend(beliByMonth);
const trenPemakaianBulanan=toTrend(pakaiByMonth);
return{totalPembelian,totalNilaiStok,totalNilaiTerpakai,biayaServisSparepart,trenPembelianBulanan,trenPemakaianBulanan};
},
renderDashboard(){
const el=document.getElementById('sparepartDashboard');
if(!el)return;
// AUDIT SOT (permintaan user): widget ringkasan ini dulu selalu pakai
// D.partsStock/D.servisLogs MENTAH tanpa filter kendaraan aktif -- beda
// dgn renderStockList() (daftar di bawah widget ini, fungsi yang sama)
// yang SUDAH benar filter via Sparepart.isPartForVehicle(). Akibatnya
// kartu "Stok Menipis/Habis/Part Terlaris/Nilai Persediaan" mencampur
// SEMUA kendaraan padahal daftar di bawahnya cuma nampilin 1 kendaraan --
// membingungkan (angka ringkasan tidak sinkron dgn daftar yg dilihat).
// Fix: filter dulu pakai pola SAMA PERSIS renderStockList().
const vidDash=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const partsStockDash=D.partsStock.filter(p=>Sparepart.isPartForVehicle(p,vidDash));
const servisLogsDash=vidDash?D.servisLogs.filter(s=>s.vehicleId===vidDash):D.servisLogs;
const stats=Sparepart.calcDashboardStats(partsStockDash,servisLogsDash);
const{low,habis,topPart,topCount,nilaiPersediaan,avgPrice,lastPurchase,chartData}=stats;
const lastPurchaseLbl=lastPurchase?escapeHtml(lastPurchase.name)+(lastPurchase.lastPurchaseDate?' • '+escapeHtml(lastPurchase.lastPurchaseDate):''):'-';
let chartHtml='';
if(chartData.length){
const W=280,H=70,pad=6,barGap=6;
const barW=(W-2*pad-(chartData.length-1)*barGap)/chartData.length;
const maxVal=Math.max(...chartData.map(c=>c.value))||1;
const bars=chartData.map((c,i)=>{
const bh=Math.max(2,(c.value/maxVal)*(H-2*pad));
const x=pad+i*(barW+barGap);
const y=H-pad-bh;
return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="var(--accent3)"><title>${escapeHtml(c.name)}: ${fmtFull(c.value)}</title></rect>`;
}).join('');
chartHtml=`<div class="u-mt10"><div class="u-fs12t2 u-mb4">📊 Nilai Stok per Part (top ${chartData.length})</div><svg class="u-w100" viewBox="0 0 ${W} ${H}" style="height:70px;display:block">${bars}</svg></div>`;
}
el.innerHTML=`<div class="bbm-stat-grid">
<div class="bbm-stat"><div class="bbm-val u-fs13" style="${low.length?'color:#ff5050':''}">${low.length}</div><div class="bbm-lbl">Stok Menipis</div></div>
<div class="bbm-stat"><div class="bbm-val u-fs13" style="${habis.length?'color:#ff5050':''}">${habis.length}</div><div class="bbm-lbl">Stok Habis</div></div>
<div class="bbm-stat"><div class="bbm-val u-fs13">${topPart?escapeHtml(topPart.name):'-'}</div><div class="bbm-lbl">Tersering${topPart?' ('+topCount+'x)':''}</div></div>
<div class="bbm-stat"><div class="bbm-val u-fs13">${fmtFull(nilaiPersediaan)}</div><div class="bbm-lbl">Nilai Persediaan</div></div>
<div class="bbm-stat"><div class="bbm-val u-fs13">${fmtFull(avgPrice)}</div><div class="bbm-lbl">Harga Rata-rata</div></div>
<div class="bbm-stat"><div class="bbm-val u-fs13">${lastPurchaseLbl}</div><div class="bbm-lbl">Pembelian Terakhir</div></div>
</div>${chartHtml}`;
},
_stockSearchQuery:'',
activeStockMasterCategoryFilter:null,
activeStockComponentFilter:null,
onStockMasterCategoryFilterChange(id){Sparepart.activeStockMasterCategoryFilter=String(id||'');Sparepart.activeStockComponentFilter='';Sparepart.renderStockList();},
onStockComponentFilterChange(id){Sparepart.activeStockComponentFilter=String(id||'');Sparepart.renderStockList();},
renderStockFilters(beforeEl){
  let wrap=document.getElementById('stockServiceFilterWrap');
  if(!wrap){if(typeof document.createElement!=='function')return;wrap=document.createElement('div');wrap.id='stockServiceFilterWrap';wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px';beforeEl.insertAdjacentElement('beforebegin',wrap);}
  if(typeof ServiceInputCatalog==='undefined'){wrap.innerHTML='';return;}
  const groups=ServiceInputCatalog.groups()||[];
  const mid=Sparepart.activeStockMasterCategoryFilter||'';
  const comps=mid?((ServiceInputCatalog.groupById(mid)||{}).items||[]):[];
  const cat=mid?`<select class="fs" style="width:auto;min-width:180px;padding:7px 9px" data-onchange="Sparepart.onStockMasterCategoryFilterChange" data-onchange-args='["$value"]'><option value="">Semua kategori servis</option>${groups.map(g=>`<option value="${escapeHtml(g.masterCategoryId)}"${g.masterCategoryId===mid?' selected':''}>${escapeHtml(g.group)}</option>`).join('')}</select>`:`<select class="fs" style="width:auto;min-width:180px;padding:7px 9px" data-onchange="Sparepart.onStockMasterCategoryFilterChange" data-onchange-args='["$value"]'><option value="">Semua kategori servis</option>${groups.map(g=>`<option value="${escapeHtml(g.masterCategoryId)}">${escapeHtml(g.group)}</option>`).join('')}</select>`;
  const comp=`<select class="fs" style="width:auto;min-width:190px;padding:7px 9px" data-onchange="Sparepart.onStockComponentFilterChange" data-onchange-args='["$value"]'><option value="">${mid?'Semua komponen':'Pilih kategori dulu'}</option>${comps.map(it=>`<option value="${escapeHtml(it.id)}"${it.id===Sparepart.activeStockComponentFilter?' selected':''}>${escapeHtml(it.name)}</option>`).join('')}</select>`;
  wrap.innerHTML=cat+comp;
},
onStockSearchInput(value){
Sparepart._stockSearchQuery=String(value||'');
Sparepart.renderStockList();
},
renderStockList(){
Sparepart.renderDashboard();
const el=document.getElementById('stockList');
if(!el)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
let list=D.partsStock.filter(p=>Sparepart.isPartForVehicle(p,vid));
const filterAnchor=document.getElementById('stockList');
Sparepart.renderStockFilters(filterAnchor);
const masterFilter=Sparepart.activeStockMasterCategoryFilter;
const componentFilter=Sparepart.activeStockComponentFilter;
if(masterFilter||componentFilter){
  list=list.filter(p=>{
    const inferred=typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.infer([p.name,p.code].filter(Boolean).join(' ')):null;
    const linkedCat=p.catId?(D.sparepartCats||[]).find(c=>c&&c.id===p.catId):null;
    const linkedGroup=linkedCat&&typeof resolveCatGroup==='function'?resolveCatGroup(linkedCat,(typeof curVehicleId!=='undefined'?curVehicleId:null)):null;
    const mid=p.masterCategoryId||linkedCat?.masterCategoryId||(linkedGroup&&linkedGroup.masterCategoryId)||(inferred&&inferred.group?inferred.group.masterCategoryId:null);
    const cid=p.serviceComponentId||linkedCat?.serviceComponentId||(inferred&&inferred.item?inferred.item.id:null);
    return (!masterFilter||mid===masterFilter)&&(!componentFilter||cid===componentFilter);
  });
}
const q=Sparepart._stockSearchQuery.trim().toLowerCase();
if(q){
list=list.filter(p=>{
const cat=D.sparepartCats.find(c=>c.id===p.catId);
const hay=[p.name,p.code,cat?cat.name:'',p.note].filter(Boolean).join(' ').toLowerCase();
return hay.includes(q);
});
}
if(!list.length){
el.innerHTML=q
? '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada stok sparepart yang cocok dengan pencarian "'+escapeHtml(Sparepart._stockSearchQuery.trim())+'"</div></div>'
: '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada stok sparepart untuk kendaraan ini</div></div>';
return;
}
el.innerHTML=list.map((p)=>{
const i=D.partsStock.indexOf(p);
const cat=D.sparepartCats.find(c=>c.id===p.catId);
const low=p.minStock>0&&p.qty<=p.minStock;
const partLinkage=getServiceLinkage(p,vid);
const partComponent=partLinkage.serviceComponentId&&typeof ServiceInputCatalog!=='undefined'?ServiceInputCatalog.itemById(partLinkage.serviceComponentId):null;
const meta=[`${p.qty}${p.unit?' '+p.unit:''}`,cat?cat.name:null,partLinkage.masterCategoryName||null,partComponent&&partComponent.item?partComponent.item.name:null,p.price?'Rata2 '+fmtFull(p.price):null,p.lastPrice?'Terakhir '+fmtFull(p.lastPrice):null,p.lastPurchaseDate?'Dibeli '+p.lastPurchaseDate:null].filter(Boolean).join(' • ');
const history=Sparepart.getPartUsageHistory(p.id);
const historyHtml=history.length?`<div class="u-mt4">${history.map(h=>`<div class="u-pointer" style="padding:6px 0 6px 4px;border-top:1px dashed var(--border)" data-action="Sparepart.openPartHistoryEntry" data-args="${escapeHtml(JSON.stringify([h.servisId,h.vehicleId]))}"><div class="tx-name u-fs12">🗓️ ${escapeHtml(h.item)} <span class="u-fs12t2">— ${escapeHtml(h.vehicleName)}</span></div><div class="tx-meta">${escapeHtml(h.date)}${h.km?' • '+h.km.toLocaleString('id-ID')+' km':''} • ${h.qty}${p.unit?' '+escapeHtml(p.unit):''} dipakai</div></div>`).join('')}</div>`:'';
const priceHistoryHtml=Sparepart.getPartPriceHistoryHtml(p);
// S622: badge kecil "khusus kendaraan X" kalau p.vehicleId terisi, supaya
// kelihatan mana stok yg sudah di-scope ke 1 kendaraan vs yg masih universal
// (tidak ditampilkan sama sekali kalau universal, biar baris tidak penuh --
// sudah jelas dari konteks tab kendaraan yg lagi aktif).
const stockVeh=p.vehicleId?D.vehicles.find(v=>v.id===p.vehicleId):null;
const stockVehBadge=p.vehicleId?`<span class="u-fs12 u-fw700 u-r6 u-ml4" style="padding:1px 6px;background:var(--accent-soft);color:var(--accent)" title="Stok khusus kendaraan ini">${stockVeh?(stockVeh.emoji||'🏍️')+' '+escapeHtml(stockVeh.name):'🏍️'}</span>`:'';
return `<div class="tx-item"><div class="tx-icon" style="background:${low?'rgba(255,80,80,.15)':'var(--accent-soft)'}">${low?'⚠️':'📦'}</div><div class="tx-info"><div class="tx-name">${escapeHtml(p.name)} <span class="u-fs12 u-fw700 u-cacc u-bgaccsoft u-r6 u-ml4" style="padding:1px 6px">${escapeHtml(p.code||'-')}</span>${p.catalogId?'<span class="u-fs12 u-fw700 u-r6 u-ml4" style="padding:1px 6px;background:rgba(80,160,255,.15);color:#4a90e2" title="Tautan otomatis dari Katalog Suku Cadang (scan)">🔗 Katalog</span>':''}${stockVehBadge}</div><div class="tx-meta" style="${low?'color:#ff5050;font-weight:700':''}">${escapeHtml(meta)}${low?' • Stok menipis!':''}${p.note?' • '+escapeHtml(p.note):''}</div>${priceHistoryHtml}${historyHtml}</div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openStockModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button><button class="tx-del" data-action="delStock" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
},
getPartUsageHistory(partId){
if(!partId)return[];
return D.servisLogs.filter(s=>s.usedPartId===partId||s.catalogPartLinkedStockId===partId).map(s=>{
const veh=D.vehicles.find(v=>v.id===s.vehicleId);
const qty=(s.usedPartId===partId)?(s.usedPartQty||0):(s.catalogPartQty||0);
return{servisId:s.id,vehicleId:s.vehicleId,vehicleName:veh?veh.name:'-',date:s.date,item:s.item,km:s.km||null,qty};
}).sort((a,b)=>{
  if(typeof compareServiceHistoryRecency==='function')return compareServiceHistoryRecency(a,b);
  return String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0);
});
},
openPartHistoryEntry(servisId,vehicleId){
if(vehicleId&&vehicleId!==curVehicleId&&typeof selectVehicle==='function')selectVehicle(vehicleId);
if(typeof openServisModal==='function')openServisModal(servisId);
},
// getPartPriceHistoryHtml(p) — Tahap 8A: render riwayat harga pembelian
// (p.priceHistory, diisi applyStockPurchase() di tx-stok-sparepart.js saat
// user centang "Tambah ke Stok Sparepart" di form transaksi Keuangan).
// Tiap baris bisa diklik -> buka transaksi Keuangan terkait (referensi
// transaksi, editTx() di transaksi.js) kalau txId-nya ada & transaksinya
// masih ada.
getPartPriceHistoryHtml(p){
const list=Array.isArray(p.priceHistory)?p.priceHistory.slice().sort((a,b)=>{
  if(typeof compareServiceHistoryRecency==='function')return compareServiceHistoryRecency(a,b);
  return String(b.date||'').localeCompare(String(a.date||''));
}).slice(0,5):[];
if(!list.length)return'';
return `<div class="u-mt4">${list.map(h=>{
const clickable=h.txId&&D.transactions.some(t=>t.id===h.txId);
const attrs=clickable?`class="u-pointer" data-action="editTx" data-args="${escapeHtml(JSON.stringify([h.txId]))}"`:'';
return `<div ${attrs} style="padding:6px 0 6px 4px;border-top:1px dashed var(--border)"><div class="tx-name u-fs12">💰 ${h.price?fmtFull(h.price):'-'} ${clickable?'<span class="u-fs12t2">(lihat transaksi)</span>':''}</div><div class="tx-meta">${escapeHtml(h.date)} • +${h.qty}${p.unit?' '+escapeHtml(p.unit):''}</div></div>`;
}).join('')}</div>`;
},
openStockModal(idx){
Sparepart.stockEditIdx=(typeof idx==='number')?idx:null;
const isEdit=Sparepart.stockEditIdx!==null;
const p=isEdit?D.partsStock[Sparepart.stockEditIdx]:null;
Sparepart.populateStockCatSelect(isEdit&&p?p.catId:null);
document.getElementById('stockModalTitle').textContent=isEdit?'Edit Stok Sparepart':'Tambah Stok Sparepart';
document.getElementById('stockCatId').value=isEdit?(p.catId||''):'';
Sparepart.syncStockServiceComponent();
if(isEdit&&p&&p.serviceComponentId){const sc=document.getElementById('stockServiceComponentId');if(sc)sc.value=p.serviceComponentId;}
document.getElementById('stockName').value=isEdit?p.name:'';
const codeEl=document.getElementById('stockCode');
codeEl.value=isEdit?(p.code||''):'';
codeEl.dataset.manual=isEdit?'1':'0';
codeEl.oninput=()=>{codeEl.dataset.manual='1';};
document.getElementById('stockQty').value=isEdit?p.qty:'';
document.getElementById('stockUnit').value=isEdit?(p.unit||''):'pcs';
document.getElementById('stockMin').value=isEdit?(p.minStock||''):'1';
document.getElementById('stockPrice').value=isEdit?(p.price||''):'';
document.getElementById('stockNote').value=isEdit?(p.note||''):'';
Sparepart.populateVehicleSelect('stockVehicleId',isEdit?p.vehicleId:null,isEdit);
openModal('stockModal');
},
saveStock(){
const name=document.getElementById('stockName').value.trim();
const catId=document.getElementById('stockCatId').value||null;
let code=document.getElementById('stockCode').value.trim().toUpperCase();
const qty=parseFloat(document.getElementById('stockQty').value)||0;
const unit=document.getElementById('stockUnit').value.trim();
const minStock=parseFloat(document.getElementById('stockMin').value)||0;
const price=parseFloat(document.getElementById('stockPrice').value)||0;
const note=document.getElementById('stockNote').value.trim();
const stockCat=D.sparepartCats.find(c=>c.id===catId);
const stockCompEl=document.getElementById('stockServiceComponentId');
const inferredStock=(typeof ServiceInputCatalog!=='undefined'&&ServiceInputCatalog.infer)?ServiceInputCatalog.infer(name):null;
const stockLinkage=resolveServiceCategoryComponent(stockCat?.masterCategoryId||(inferredStock?.group?.masterCategoryId)||null,stockCompEl?.value||stockCat?.serviceComponentId||inferredStock?.item?.id||null,name);
const serviceComponentId=stockLinkage.serviceComponentId;
const masterCategoryId=stockLinkage.masterCategoryId;
if(!name){toast('⚠️ Isi nama sparepart dulu');return;}
if(!code){
const cat=D.sparepartCats.find(c=>c.id===catId);
const prefix=cat?(cat.code||codeFromName(cat.name)):codeFromName(name);
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
code=prefix+'-'+String(seq).padStart(3,'0');
}
// vehicleId: sama pola persis saveCat() di atas -- TAMBAH baru tetap
// dikunci ikut curVehicleId (S629), EDIT stok existing kini bisa dipindah
// manual lewat select (FITUR BARU, audit user, dropdown terbuka di mode
// edit -- lihat populateVehicleSelect()).
let vehicleId;
if(Sparepart.stockEditIdx!==null){
const selEl=document.getElementById('stockVehicleId');
const selVal=selEl?selEl.value:'';
vehicleId=(selVal&&D.vehicles.some(v=>v.id===selVal))?selVal:null;
} else {
const vid622s=(typeof curVehicleId!=='undefined')?curVehicleId:null;
vehicleId=(vid622s&&D.vehicles.some(v=>v.id===vid622s))?vid622s:null;
}
if(Sparepart.stockEditIdx!==null){
Object.assign(D.partsStock[Sparepart.stockEditIdx],{name,catId,code,qty,unit,minStock,price,note,vehicleId,masterCategoryId,serviceComponentId});
} else {
const np={id:'st_'+Date.now(),name,catId,code,qty,unit,minStock,price,note,vehicleId,masterCategoryId,serviceComponentId};
D.partsStock.push(np);
// Tahap 10 (lanjutan Tahap 9, jembatan Vehicle Catalog <-> Stok Sparepart):
// part baru yang ditambah manual di sini (⚙️ Atur -> Stok Sparepart) JUGA
// otomatis dibuatkan entri di Vehicle Catalog (best-effort, tidak
// menunggu/tidak memblokir simpan stok) supaya part yang sama bisa
// dikenali lewat scan barcode/OEM & muncul di dropdown "Pilih Sparepart"
// form transaksi Keuangan tanpa harus discan dulu. Pola & alasan SAMA
// PERSIS applyTxStockFromTx() di tx-stok-sparepart.js (arah Keuangan ->
// Katalog) -- di sini arahnya Kelola Stok -> Katalog. Kegagalan tidak
// memblokir simpan stok, tetapi selalu diberi diagnostic warning agar
// kegagalan wiring SOT tidak menjadi silent failure.
if(typeof VehicleCatalogWriteSOT!=='undefined'&&VehicleCatalogWriteSOT&&typeof VehicleCatalogWriteSOT.ensurePart==='function'){
const cat=D.sparepartCats.find(c=>c.id===catId);
VehicleCatalogWriteSOT.ensurePart({partName:name,oemCode:code,category:(cat&&cat.name)||'Umum'},vehicleId).then(ci=>{
if(ci){np.catalogPartId=ci.id;np.catalogId=ci.id;if(typeof VehicleStockSOT!=='undefined'&&VehicleStockSOT.apply)VehicleStockSOT.apply(np,ci);if(typeof save==='function')save();}
}).catch(err=>{
if(typeof console!=='undefined'&&console&&typeof console.warn==='function')console.warn('[VehicleCatalogWriteSOT] saveStock ensurePart gagal:',err&&err.message?err.message:err);
});
}else if(typeof console!=='undefined'&&console&&typeof console.warn==='function'){
console.warn('[VehicleCatalogWriteSOT] tidak tersedia; stok disimpan tanpa catalogPartId. Periksa load-order/runtime SOT.');
}
}
save();closeModal('stockModal');Sparepart.renderStockList();toast('✅ Stok sparepart disimpan');
},
async delStock(i){
if(!await askConfirm('Hapus item stok sparepart ini?'))return;
D.partsStock.splice(i,1);save();Sparepart.renderStockList();toast('🗑 Dihapus');
},
// removeAllStockConfirm() — fitur baru (rekomendasi audit S331, pola SAMA
// PERSIS fix S331b utk VehicleCatalogUI.removeAllConfirm()/vehicle-catalog-ui.js):
// dibuat LANGSUNG di-scope ke item yang SEDANG TAMPIL di #stockList (filter
// kendaraan aktif via isPartForVehicle() + pencarian aktif _stockSearchQuery,
// REUSE PERSIS logic renderStockList() di atas) -- bukan D.partsStock mentah,
// supaya tidak kena bug yang sama (tombol "Hapus Semua" dulu di Katalog Suku
// Cadang menghapus lintas kendaraan padahal user cuma lihat 1 kendaraan).
// Kalau tidak ada kendaraan aktif & tidak sedang mencari, cakupannya tetap
// "semua stok" (list == D.partsStock penuh), sama seperti perilaku hapus-1
// (delStock) yang sudah ada -- tidak ada regresi krn ini fitur baru.
async removeAllStockConfirm(){
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const vehFiltered=D.partsStock.filter(p=>Sparepart.isPartForVehicle(p,vid));
const q=Sparepart._stockSearchQuery.trim().toLowerCase();
const list=q?vehFiltered.filter(p=>{
const cat=D.sparepartCats.find(c=>c.id===p.catId);
const hay=[p.name,p.code,cat?cat.name:'',p.note].filter(Boolean).join(' ').toLowerCase();
return hay.includes(q);
}):vehFiltered;
if(!list.length)return;
const scoped=list.length!==D.partsStock.length;
const curVeh=(vid&&Array.isArray(D.vehicles))?D.vehicles.find(v=>v.id===vid):null;
const scopeLabel=q?('yang cocok dgn pencarian "'+Sparepart._stockSearchQuery.trim()+'"'+(curVeh?(' untuk '+curVeh.name):'')):(curVeh?('untuk '+curVeh.name):'');
const msg=scoped
?('Hapus '+list.length+' item stok '+scopeLabel+' (yang sedang tampil)? Stok kendaraan/kategori lain yang TIDAK sedang tampil tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.')
:('Hapus SEMUA '+list.length+' item stok sparepart? Tindakan ini tidak bisa dibatalkan.');
const ok=await askConfirm(msg,{icon:'⚠️',title:scoped?'Hapus Stok yang Tampil':'Hapus Semua Stok',okText:scoped?'Ya, Hapus':'Ya, Hapus Semua',danger:true});
if(!ok)return;
const removeIds=new Set(list.map(p=>p.id));
D.partsStock=D.partsStock.filter(p=>!removeIds.has(p.id));
save();
toast(scoped?('🗑 '+list.length+' item stok dihapus'):'🗑 Semua stok dihapus');
Sparepart.renderStockList();
},
// syncFromCatalog() — fitur baru (permintaan eksplisit user): tombol
// "🔄 Sinkron dari Katalog Suku Cadang" di 🔧 Kelola Kategori Sparepart &
// Interval Servis. BEDA dari syncPartsStockFromCatalog() (tx-stok-sparepart.js,
// dipakai alur scan di form transaksi Keuangan) dalam 2 hal sesuai keputusan
// eksplisit user:
//  1) Filter per KENDARAAN AKTIF ("beda kendaraan beda katalog") — part yang
//     disinkron adalah part yang compatibleVehicleIds-nya memuat curVehicleId,
//     ATAU part "universal" (compatibleVehicleIds kosong/belum ditandai) —
//     pakai VehicleCatalog.filterForVehicle() yang SUDAH ADA, SAMA PERSIS
//     aturan yang dipakai layar Katalog Suku Cadang (VehicleCatalogUI.renderList())
//     & Servis.populateCatalogPartSelect(). Bugfix (laporan user): sebelumnya
//     di sini part universal malah DIKECUALIKAN — beda aturan dari layar
//     Katalog Suku Cadang, jadi part yang kelihatan tersedia utk kendaraan
//     aktif di sana gagal disinkron di sini krn belum sempat ditandai
//     compatibleVehicleIds-nya secara eksplisit.
//  2) intervalKm kategori baru diisi dari referensi TORSI_DB lewat
//     suggestServiceIntervalKm() yang SUDAH ADA (read-only, sama persis
//     dipakai tombol "🤖 Saran AI: Interval" di modal Tambah Kategori) —
//     bukan selalu 0 seperti syncPartsStockFromCatalog(). TORSI_DB sendiri
//     TIDAK disentuh/diubah sama sekali, tetap murni referensi torsi & interval.
// Alur: preview daftar part+kategori+interval yang akan dibuat lewat
// askConfirm dulu, baru commit (1x save() di akhir) — kategori yang SUDAH ADA
// (nama sama) tidak dibuat ulang; kalau kategori sudah ada tapi intervalnya
// masih kosong, dilengkapi dari referensi Torsi tanpa menimpa yang sudah diisi
// user secara manual. Part yang sudah pernah tersinkron (ada baris
// D.partsStock dengan catalogId yang sama) dilewati, idempotent kalau dipanggil
// berkali-kali.
async syncFromCatalog(){
if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||typeof VehicleCatalog.getAll!=='function'){toast('⚠️ Katalog Suku Cadang belum tersedia');return;}
if(!curVehicleId){toast('⚠️ Pilih kendaraan dulu di atas');return;}
const veh=D.vehicles.find(v=>v.id===curVehicleId);
let items;
try{ items=await VehicleCatalog.getAll(); }catch(e){ toast('⚠️ Gagal membaca Katalog Suku Cadang');return; }
const candidates=(items||[]).filter(it=>it&&!it.isDraft&&(!Array.isArray(it.compatibleVehicleIds)||!it.compatibleVehicleIds.length||it.compatibleVehicleIds.some(id=>String(id)===String(curVehicleId))));
if(!candidates.length){toast('ℹ️ Belum ada part di Katalog Suku Cadang untuk '+(veh?veh.name:'kendaraan ini'));return;}
const rows=candidates.map(it=>{
const already=D.partsStock.some(p=>p.catalogId===it.id&&(!p.vehicleId||String(p.vehicleId)===String(curVehicleId)));
const reko=already?null:suggestServiceIntervalKm(it.partName||'',curVehicleId);
return{item:it,already,intervalKm:reko?reko.km:0};
});
const toAdd=rows.filter(r=>!r.already);
if(!toAdd.length){toast('ℹ️ Semua part katalog untuk kendaraan ini sudah tersinkron ke Stok Sparepart');return;}
const previewMsg='Akan menambahkan '+toAdd.length+' part dari Katalog Suku Cadang ke Kelola Kategori & Stok Sparepart untuk "'+(veh?veh.name:'-')+'":\n\n'
+toAdd.map(r=>'• '+(r.item.partName||'(tanpa nama)')+(r.intervalKm?' — interval '+r.intervalKm.toLocaleString('id-ID')+' km (dari referensi Torsi)':' — interval belum ada di referensi Torsi, isi manual nanti')).join('\n')
+'\n\nLanjutkan?';
if(!await askConfirm(previewMsg,{title:'🔄 Sinkron dari Katalog',icon:'📦'}))return;
let addedCat=0,addedStock=0;
toAdd.forEach((r,idx)=>{
const it=r.item;
const catName=(it.category||'Umum').trim()||'Umum';
// BUGFIX (audit): sama seperti gap resolveServisCatForVehicle() -- match by
// nama di sini dulu GLOBAL, bisa numpang ke kategori PRIVAT milik kendaraan
// lain (cat.vehicleId beda) kalau nama kategori kebetulan sama. Sekarang
// sadar kendaraan lewat resolveServisCatForVehicle(), guard typeof spy tetap
// aman kalau dipanggil sebelum helper itu termuat.
let cat=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(catName,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===catName.toLowerCase());
if(!cat){
// FITUR BARU (audit lanjutan grouping): kategori baru dari sinkron Katalog
// juga mewarisi group/groupIcon lewat resolveCatGroup() -- match dipakai
// it.partName (nama part spesifik) dulu, fallback catName (label kategori
// umum dari katalog, mis. "Umum") kalau partName kosong. catName SENDIRI
// (bukan partName) tetap dipakai sbg cat.name, 0 perilaku lama berubah.
const grpSync=(typeof resolveCatGroup==='function')?resolveCatGroup({name:it.partName||catName},curVehicleId):{group:'Lainnya',icon:'📦'};
cat={id:_spCatId(String(idx)),name:catName,code:codeFromName(catName),intervalKm:r.intervalKm||0,showInReminder:r.intervalKm>0,group:grpSync.group,groupIcon:grpSync.icon,vehicleId:curVehicleId};
D.sparepartCats.push(cat);
addedCat++;
} else if(r.intervalKm>0&&(!cat.intervalKm||cat.intervalKm<=0)){
cat.intervalKm=r.intervalKm;
cat.showInReminder=true;
}
const prefix=cat.code||codeFromName(catName);
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
const code=(it.barcode||it.oemCode||(prefix+'-'+String(seq).padStart(3,'0')));
D.partsStock.push({id:'st_'+Date.now()+'_'+idx,name:it.partName||'Part dari Katalog',catId:cat.id,code,qty:0,unit:'pcs',minStock:1,price:it.price||0,note:'Disinkron dari Katalog Suku Cadang',catalogId:it.id,vehicleId:curVehicleId});
addedStock++;
});
save();
Sparepart.renderCatList();
Sparepart.renderStockList();
if(typeof renderServisList==='function')renderServisList();
if(typeof renderDashboardServisReminder==='function')renderDashboardServisReminder();
// BUGFIX (laporan user): data sudah benar tersimpan & innerHTML #sparepartCatList/
// #sparepartDashboard sudah di-update di atas, TAPI di beberapa WebView Android
// repaint-nya baru kelihatan setelah ada interaksi UI lain (mis. ketik di search
// Stok Sparepart -- itu yang bikin Stok "muncul" duluan, Kategori/Dashboard masih
// keliatan kosong krn belum ada interaksi susulan). Paksa reflow manual di sini
// (baca offsetHeight lalu toggle display) supaya semua 3 bagian langsung
// kelihatan update tanpa perlu interaksi tambahan dari user.
['sparepartCatList','sparepartDashboard','stockList'].forEach(id=>{
const el=document.getElementById(id);
if(!el)return;
void el.offsetHeight;
const prevDisplay=el.style.display;
el.style.display='none';
void el.offsetHeight;
el.style.display=prevDisplay;
});
toast('✅ Sinkron selesai: '+addedCat+' kategori baru, '+addedStock+' stok baru');
},
// commitCategoryCSV(rows) — CSV import utk Kategori Sparepart (bukan Etalase
// Shop). Pola SAMA PERSIS ShopDataIO.commitShopRows() (shop-data-io-api.js):
// match by name (case-insensitive) -> ada = update field yg dikirim saja
// (partial, field yg tidak dikirim TIDAK ditimpa), belum ada = buat baru
// dengan shape objek kategori yang sama persis dipakai saveCat() di atas.
commitCategoryCSV(rows){
if(!Array.isArray(rows)||!rows.length)return{ok:false,created:0,updated:0,total:0};
let created=0,updated=0;
rows.forEach(r=>{
if(!r||!r.nama)return;
const nama=String(r.nama).trim();
if(!nama)return;
const vidCsv=(typeof curVehicleId!=='undefined')?curVehicleId:null;
let cat=(D.sparepartCats||[]).find(c=>c&&c.name&&c.name.toLowerCase()===nama.toLowerCase()&&c.vehicleId&&String(c.vehicleId)===String(vidCsv))
  ||(D.sparepartCats||[]).find(c=>c&&c.name&&c.name.toLowerCase()===nama.toLowerCase()&&!c.vehicleId);
if(cat){
if(r.kode)cat.code=r.kode;
if(r.intervalKm!==undefined&&r.intervalKm!==null&&r.intervalKm>0)cat.intervalKm=r.intervalKm;
if(r.intervalBulan!==undefined&&r.intervalBulan!==null&&r.intervalBulan>0)cat.intervalBulan=r.intervalBulan;
if(r.showInReminder!==undefined&&r.showInReminder!==null)cat.showInReminder=r.showInReminder;
updated++;
} else {
const code=r.kode||codeFromName(nama);
const intervalKm=(r.intervalKm&&r.intervalKm>0)?r.intervalKm:0;
const intervalBulan=(r.intervalBulan&&r.intervalBulan>0)?r.intervalBulan:0;
const showInReminder=(r.showInReminder!==undefined&&r.showInReminder!==null)?r.showInReminder:(intervalKm>0);
// FITUR BARU (audit lanjutan grouping): kategori baru dari import CSV juga
// mewarisi group/groupIcon lewat resolveCatGroup(). Fungsi ini tidak selalu
// dipanggil dalam konteks kendaraan aktif (bisa dari alur import umum) --
// guard typeof curVehicleId, fallback null (resolveCatGroup tetap aman,
// jatuh ke GENERIC_GROUP_BY_NAME/'Lainnya' tanpa match TORSI_DB spesifik).
const grpCsv=(typeof resolveCatGroup==='function')?resolveCatGroup({name:nama},vidCsv):{group:'Lainnya',icon:'📦'};
const vehicleIdCsv=(vidCsv&&Array.isArray(D.vehicles)&&D.vehicles.some(v=>v.id===vidCsv))?vidCsv:null;
D.sparepartCats.push({id:_spCatId(created+'_'+updated),name:nama,code,intervalKm,intervalBulan,showInReminder,group:grpCsv.group,groupIcon:grpCsv.icon,vehicleId:vehicleIdCsv});
created++;
}
});
save();
return{ok:true,created,updated,total:created+updated};
},
// parseCategoryCSV(text) — parser CSV sederhana, pola SAMA PERSIS
// ShopDataIO.parseShopCSV() (String.split, tanpa dependency papaparse).
// Header wajib: nama (kolom lain opsional & urutan bebas):
// nama,kode,interval_km,tampil_reminder
parseCategoryCSV(text){
if(!text||!text.trim())return[];
const lines=text.split(/\r?\n/).filter(l=>l.trim());
if(lines.length<1)return[];
const header=lines[0].split(',').map(h=>h.trim().toLowerCase());
const idx={
nama:header.indexOf('nama'),
kode:header.indexOf('kode'),
intervalKm:header.indexOf('interval_km'),
intervalBulan:header.indexOf('interval_bulan'),
showInReminder:header.indexOf('tampil_reminder'),
};
if(idx.nama===-1)return[];
const toInt=(v)=>{const digits=String(v||'').replace(/[^\d]/g,'');return digits?parseInt(digits,10):0;};
const toBool=(v)=>{
const s=String(v||'').trim().toLowerCase();
if(!s)return null;
return['1','ya','yes','true','y'].includes(s);
};
const rows=[];
for(let i=1;i<lines.length;i++){
const cols=lines[i].split(',');
const nama=(cols[idx.nama]||'').trim();
if(!nama)continue;
rows.push({
nama,
kode:idx.kode>-1?(cols[idx.kode]||'').trim().toUpperCase():'',
intervalKm:idx.intervalKm>-1?toInt(cols[idx.intervalKm]):0,
intervalBulan:idx.intervalBulan>-1?toInt(cols[idx.intervalBulan]):0,
showInReminder:idx.showInReminder>-1?toBool(cols[idx.showInReminder]):null,
});
}
return rows;
},
// recommendCategories(vehicleId?) — FITUR BARU (audit, permintaan user).
// Hasilkan daftar kandidat kategori sparepart utk kendaraan AKTIF (curVehicleId
// kalau vehicleId tidak diberikan), dipisah 2 tier:
//  - tier 'manual': nama part diambil LANGSUNG dari entri TORSI_DB milik
//    kendaraan ini (findTorsiDb() by nama kendaraan, SUDAH ADA) — data
//    bersumber dari buku manual pabrikan asli (lihat sourceNote per entri),
//    HANYA tersedia utk kendaraan yg sudah match ke TORSI_DB (saat ini: Honda
//    Vario 125 & BeAT FI Gen 1 — lihat catatan TORSI_DB di bawah).
//  - tier 'generic': fallback GENERIC_RECOMMEND_NAMES per v.jenis, interval
//    diisi via suggestServiceIntervalKm() (reuse, akan otomatis balik ke
//    FALLBACK_KEYWORDS krn tidak match TORSI_DB kendaraan ini) — dilabeli
//    eksplisit "estimasi umum" di source teksnya, BUKAN diklaim data pabrikan.
//  - tier 'history' (FITUR BARU, audit gap "riwayat servis lama tidak
//    sync"): kandidat TAMBAHAN yg diambil langsung dari nama item
//    D.servisLogs kendaraan ini (min. 2 catatan nama sama + KM cukup utk
//    dihitung rata2 jeda via historyStatsForName()) -- utk part yg sudah
//    sering dicatat manual tapi TIDAK masuk TORSI_DB maupun
//    GENERIC_RECOMMEND_NAMES sama sekali. intervalKm-nya dari pola KM asli
//    kendaraan ini, bukan buku manual/estimasi umum.
// Kategori yg namanya SUDAH ada (case-insensitive, dlm cakupan
// catVisibleForVehicle utk kendaraan ini) dikecualikan dari ketiga tier —
// murni PEMBACAAN (read-only), tidak pernah menulis ke D/localStorage.
// Tier 'manual'/'generic' JUGA di-cross-check thd riwayat servis
// (historyStatsForName()) -- kandidat yg sudah pernah dicatat manual
// ditandai `history` & diprioritaskan (disort duluan dlm tier masing2), tapi
// intervalKm asalnya (buku manual/estimasi umum) tidak ditimpa; pola KM asli
// cuma dilampirkan sbg pembanding di `history.avgKm`.
recommendCategories(vehicleId){
const vid=vehicleId||(typeof curVehicleId!=='undefined'?curVehicleId:null);
const veh=vid?D.vehicles.find(v=>v.id===vid):null;
if(!veh)return{ok:false,reason:'Pilih kendaraan dulu di atas'};
const existing=new Set(D.sparepartCats.filter(c=>catVisibleForVehicle(c,vid)).map(c=>c.name.trim().toLowerCase()));
const seen=new Set();
const tier1=[];
const own=(typeof findTorsiDb==='function')?findTorsiDb(veh.name,veh.modelId):null;
if(own&&Array.isArray(own.cats)){
own.cats.forEach(catGroup=>{
(catGroup.items||[]).forEach(item=>{
if(!item.interval||!item.name)return;
const key=item.name.trim().toLowerCase();
if(existing.has(key)||seen.has(key))return;
const km=(typeof _parseIntervalKmFromText==='function')?_parseIntervalKmFromText(item.interval):null;
if(!km)return;
seen.add(key);
tier1.push({name:item.name,intervalKm:km,tier:'manual',source:own.sourceNote,group:catGroup.cat,groupIcon:catGroup.icon||'📦'});
});
});
}
const tier2=[];
const recNames=_genericRecommendNames();
const jenis=(veh.jenis&&recNames[veh.jenis])?veh.jenis:'motor';
(recNames[jenis]||[]).forEach(name=>{
const key=name.trim().toLowerCase();
if(existing.has(key)||seen.has(key))return;
const reko=(typeof suggestServiceIntervalKm==='function')?suggestServiceIntervalKm(name,vid):null;
if(!reko)return;
seen.add(key);
const isManual=!!(own&&reko.source===own.sourceNote);
const g=resolveCatGroup({name},vid);
tier2.push({name,intervalKm:reko.km,tier:isManual?'manual':'generic',source:reko.source,group:g.group,groupIcon:g.icon});
});
// Cross-check tier1/tier2 thd riwayat servis asli (historyStatsForName(),
// FITUR BARU di atas) -- kandidat yg sudah sering dicatat manual ditandai
// `history` (dipakai UI utk badge "📝 sudah Nx dicatat") & diprioritaskan
// (disort duluan) drpd yg blm pernah dicatat sama sekali. Ini TIDAK
// mengubah intervalKm asal (tetap dari TORSI_DB/estimasi umum) -- angka
// pola asli cuma ikut dilampirkan sbg pembanding (history.avgKm), keputusan
// pakai yg mana tetap di tangan user pas commit.
function attachHistory(list){
return list.map(r=>Object.assign({},r,{history:historyStatsForName(vid,r.name)}));
}
const tier1WithHist=attachHistory(tier1).sort((a,b)=>b.history.count-a.history.count);
const tier2WithHist=attachHistory(tier2).sort((a,b)=>b.history.count-a.history.count);
// tier3 'history' -- FITUR BARU (audit, gap "part yg sudah sering dicatat
// di riwayat servis tapi belum py kategori resmi tetap direkomendasikan
// sbg kategori baru tanpa ditandai sudah dikenal"): kandidat TAMBAHAN yg
// diambil LANGSUNG dari nama item riwayat servis kendaraan ini (bukan dari
// TORSI_DB/GENERIC_RECOMMEND_NAMES), utk part yg sering dicatat manual tapi
// tidak masuk daftar tier1/tier2 sama sekali. Syarat: minimal 2 catatan
// dgn nama sama (persis, case-insensitive -- bukan fuzzy, krn ini teks yg
// user sendiri yg ketik jadi grouping langsung apa adanya) DAN KM-nya cukup
// utk dihitung rata2 jeda (historyStatsForName -- kalau avgKm null berarti
// data KM kurang/tidak berurutan naik, tidak direkomendasikan drpd kasih
// angka ngawur). intervalKm diisi dari avgKm (satu2nya sumber tier ini,
// bukan buku manual/estimasi umum -- makanya dilabeli jelas beda).
const tier3=[];
if(vid){
const grouped={};
(D.servisLogs||[]).filter(s=>s.vehicleId===vid&&s.item&&s.item.trim()).forEach(s=>{
const key=s.item.trim().toLowerCase();
if(!grouped[key])grouped[key]={name:s.item.trim(),count:0};
grouped[key].count++;
});
Object.keys(grouped).forEach(key=>{
if(existing.has(key)||seen.has(key))return;
if(grouped[key].count<2)return;
const stats=historyStatsForName(vid,grouped[key].name);
if(!stats.avgKm)return;
seen.add(key);
tier3.push({name:grouped[key].name,intervalKm:stats.avgKm,tier:'history',source:'Sering dicatat manual di riwayat servis ('+stats.count+'x) — belum ada kategori resmi',history:stats});
});
}
return{ok:true,vehicleId:vid,vehicleName:veh.name,tier1:tier1WithHist,tier2:tier2WithHist,tier3,all:tier1WithHist.concat(tier3).concat(tier2WithHist)};
},

});
