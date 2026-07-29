// sparepart-servis.js — Domain Sparepart & Servis kendaraan: kategori & stok sparepart
// (Sparepart), catatan servis (wrapper ke Servis di car-notes.js),
// interval servis per-kategori & override per-kendaraan, katalog referensi TORSI_DB/VEHICLE_SPEC_DB
// & skala kunci torsi (MY_WRENCH_SCALE), serta filter kartu Pengingat Servis di Dashboard.
// Dipindah ke modules/vehicle/sparepart-servis.js (Sesi 8 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari tukang-absensi.js (2026-07-12, split file besar bagian ke-3,
// lanjutan langsung dari bagian ke-1 Chat Action & ke-2 Storage/Archive di sesi yang sama).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) — lihat urutan grup di
// header tukang-absensi.js. Ditempatkan tepat setelah features-tukang-kendaraan-
// storage.js (sumber pemisahan) & data-archive.js, sebelum features-aiwidget-reminder-gdrive-search.js
// (yang memanggil getEffectiveIntervalKm() dari file ini).
function servisLogMatchesCat(s,cat){
if(s.categoryId) return s.categoryId===cat.id;
const cn=cat.name.toLowerCase();
const item=(s.item||'').toLowerCase().trim();
if(!item)return false;
if(item===cn) return true;
if(item.includes(cn)) return true;
if(cn.includes(item)&&item.length>=4){
const ambiguous=D.sparepartCats.some(c=>c.id!==cat.id&&c.name.toLowerCase().includes(item));
if(!ambiguous) return true;
}
return false;
}
function getEffectiveIntervalKm(vehicleId,cat){
const veh=D.vehicles.find(v=>v.id===vehicleId);
const ov=veh&&veh.intervalOverrides&&veh.intervalOverrides[cat.id];
return(ov!=null&&ov>0)?ov:cat.intervalKm;
}
function hasIntervalOverride(vehicleId,cat){
const veh=D.vehicles.find(v=>v.id===vehicleId);
return!!(veh&&veh.intervalOverrides&&veh.intervalOverrides[cat.id]>0);
}
async function editVehicleIntervalOverride(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
const veh=D.vehicles.find(v=>v.id===curVehicleId);
if(!veh){toast('⚠️ Pilih kendaraan dulu');return;}
const current=getEffectiveIntervalKm(curVehicleId,cat);
const val=await showPromptModal({title:'Interval Khusus '+veh.name,message:`Interval "${cat.name}" khusus untuk ${veh.emoji||'🏍️'} ${veh.name} (KM). Kosongkan/0 untuk pakai default global (${cat.intervalKm.toLocaleString('id-ID')} km, dipakai semua kendaraan lain).`,icon:'🔧',inputType:'number',defaultValue:current});
if(val===null)return;
if(!veh.intervalOverrides)veh.intervalOverrides={};
const num=parseFloat(val);
if(val===''||isNaN(num)||num<=0){
delete veh.intervalOverrides[catId];
save();Servis.renderReminder();renderDashboardServisReminder();
toast('✅ Kembali pakai default global ('+cat.intervalKm.toLocaleString('id-ID')+' km)');
} else {
veh.intervalOverrides[catId]=num;
save();Servis.renderReminder();renderDashboardServisReminder();
toast('✅ Interval khusus '+veh.name+' disimpan: '+num.toLocaleString('id-ID')+' km');
}
}
function getLastServiceKm(vehicleId){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&s.km).sort((a,b)=>new Date(b.date)-new Date(a.date)||b.km-a.km);
return logs.length?logs[0].km:0;
}
function matchingVehicleName(name){
if(!name)return null;
const n=name.trim().toLowerCase();
return D.vehicles.find(v=>v.name.trim().toLowerCase()===n)||null;
}
function codeFromName(name){
if(!name)return '';
const words=name.replace(/[\/\(\)]/g,' ').trim().split(/\s+/).filter(Boolean);
let code;
if(words.length>1) code=words.map(w=>w[0]).join('').slice(0,4);
else code=words[0].slice(0,3);
return code.toUpperCase();
}
const Sparepart={
catEditIdx:null,
stockEditIdx:null,
// isPartForVehicle(part, vehicleId) — bugfix (laporan user): Stok Sparepart
// & dropdown "Gunakan Stok Sparepart"/"Tambah ke Stok Sparepart" dulu
// selalu tampil SEMUA item D.partsStock tanpa pandang kendaraan aktif.
// D.partsStock TIDAK punya field vehicleId sendiri (lihat catatan desain),
// jadi filter ini REUSE tautan `catalogId` yg sudah ada ke Katalog Suku
// Cadang (VehicleCatalog) + compatibleVehicleIds part itu di sana -- 0
// skema baru. Part tanpa catalogId (input manual lama) ATAU yang
// compatibleVehicleIds-nya kosong dianggap UNIVERSAL (tetap tampil semua
// kendaraan) supaya tidak ada stok lama yang tiba-tiba "hilang" dari
// tampilan (backward compatible). Kalau VehicleCatalog belum sempat
// dimuat sesi ini (isLoaded()===false) atau vehicleId kosong, jangan
// filter apa pun (fail-open, bukan fail-hidden).
isPartForVehicle(part,vehicleId){
if(!vehicleId||!part)return true;
if(!part.catalogId)return true;
if(typeof VehicleCatalog==='undefined'||typeof VehicleCatalog.isLoaded!=='function'||!VehicleCatalog.isLoaded())return true;
const store=VehicleCatalog.getStore();
const catItem=(store&&Array.isArray(store.items))?store.items.find(it=>it.id===part.catalogId):null;
if(!catItem)return true;
if(!Array.isArray(catItem.compatibleVehicleIds)||!catItem.compatibleVehicleIds.length)return true;
return catItem.compatibleVehicleIds.some(id=>String(id)===String(vehicleId));
},
autoFillCatCode(){
const codeEl=document.getElementById('sparepartCode');
if(!codeEl||codeEl.dataset.manual==='1')return;
codeEl.value=codeFromName(document.getElementById('sparepartName').value);
},
populateDatalist(){
const dl=document.getElementById('sparepartDatalist');
if(!dl)return;
// Sesi 297 (permintaan eksplisit user): datalist ini awalnya HANYA reuse nama
// Kategori Sparepart -- beda sumber data dari Katalog Suku Cadang
// (VehicleCatalog), jadi user yang utamanya isi part lewat Katalog sering
// tidak lihat sarannya di field ini. Fix (tetap 100% reuse, tanpa formula
// baru): gabungkan (1) nama Kategori Sparepart (dipertahankan, dipakai
// autofill interval servis di onItemAutofillInterval()), (2) nama item Stok
// Sparepart yang MASIH ADA STOKNYA (qty>0 saja -- yang qty 0 sengaja
// dilewati supaya tidak menyarankan part yang sudah pasti tidak bisa
// dipotong stoknya), dan (3) nama part Katalog Suku Cadang (VehicleCatalog,
// async) supaya field ini & auto-link exact-match di
// tryAutoLinkCatalogPart() (car-notes.js) sinkron dari SATU sumber saran
// yang sama. Dedup case-insensitive; render dulu sinkron (kategori+stok),
// lalu render ulang setelah catalog termuat (fire-and-forget, pola sama
// populateCatalogPartSelect()).
const names=new Map(); // key: lowercase, value: nama asli pertama yang ketemu
D.sparepartCats.forEach(c=>{ if(c.name) names.set(c.name.toLowerCase(),c.name); });
D.partsStock.forEach(p=>{ if(p.name&&p.qty>0&&!names.has(p.name.toLowerCase())) names.set(p.name.toLowerCase(),p.name); });
const renderDl=()=>{ dl.innerHTML=Array.from(names.values()).map(n=>`<option value="${escapeHtml(n)}">`).join(''); };
renderDl();
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function';
if(!hasCatalog)return;
VehicleCatalog.getAll().then(items=>{
(items||[]).forEach(it=>{ const n=it.partName; if(n&&!names.has(n.toLowerCase()))names.set(n.toLowerCase(),n); });
renderDl();
}).catch(()=>{});
},
renderCatList(){
const el=document.getElementById('sparepartCatList');
if(!el)return;
if(!D.sparepartCats.length){el.innerHTML='<div class="empty"><div class="empty-text">Belum ada kategori sparepart</div></div>';return;}
// Sesi 295 (permintaan eksplisit user): tiap baris sekarang menunjukkan apakah
// kategori ini AKTIF tampil di 🔔 Pengingat Servis atau tidak -- baik karena
// belum diatur intervalnya (intervalKm 0, biasanya hasil scan Katalog Suku
// Cadang) maupun karena user sengaja menyembunyikannya (showInReminder:false).
// Tap badge status utk toggle langsung tanpa buka modal edit.
el.innerHTML=D.sparepartCats.map((c,i)=>{
const noInterval=!(c.intervalKm>0);
const hidden=c.showInReminder===false;
const inactive=noInterval||hidden;
const metaText=noInterval?'⚠️ Belum diatur interval servis':'Setiap '+c.intervalKm.toLocaleString('id-ID')+' km';
const statusBadge=noInterval
?`<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent2-soft,rgba(230,80,80,.12));color:var(--accent2,#e65050)">⚠️ Tanpa interval</span>`
:(hidden
?`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Tap utk tampilkan lagi di Pengingat Servis">🙈 Disembunyikan dari Pengingat</span>`
:`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)" title="Tap utk sembunyikan dari Pengingat Servis">🔔 Tampil di Pengingat</span>`);
return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">🔩</div><div class="tx-info"><div class="tx-name">${escapeHtml(c.name)} <span class="u-fs12 u-fw700 u-cacc u-bgaccsoft u-r6 u-ml4" style="padding:1px 6px">${escapeHtml(c.code||codeFromName(c.name))}</span></div><div class="tx-meta"${inactive?' style="color:var(--text3)"':''}>${metaText}</div><div class="u-mt4">${statusBadge}</div></div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openSparepartModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button><button class="tx-del" data-action="delSparepart" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
Sparepart.populateDatalist();
Sparepart.populateStockCatSelect();
},
toggleShowInReminder(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat)return;
if(!(cat.intervalKm>0)){
toast('⚠️ Isi dulu Interval Servis (KM) kategori ini sebelum ditampilkan di Pengingat');
Sparepart.openCatModal(D.sparepartCats.findIndex(c=>c.id===catId));
return;
}
cat.showInReminder=cat.showInReminder===false?true:false;
save();Sparepart.renderCatList();renderServisList();renderDashboardServisReminder();
toast(cat.showInReminder===false?'🙈 "'+cat.name+'" disembunyikan dari Pengingat Servis':'🔔 "'+cat.name+'" ditampilkan lagi di Pengingat Servis');
},
openCatModal(idx){
Sparepart.catEditIdx=(typeof idx==='number')?idx:null;
const isEdit=Sparepart.catEditIdx!==null;
document.getElementById('sparepartModalTitle').textContent=isEdit?'Edit Kategori Sparepart':'Tambah Kategori Sparepart';
document.getElementById('sparepartName').value=isEdit?D.sparepartCats[Sparepart.catEditIdx].name:'';
const codeEl=document.getElementById('sparepartCode');
codeEl.value=isEdit?(D.sparepartCats[Sparepart.catEditIdx].code||codeFromName(D.sparepartCats[Sparepart.catEditIdx].name)):'';
codeEl.dataset.manual=isEdit?'1':'0';
codeEl.oninput=()=>{codeEl.dataset.manual='1';};
const curCat=isEdit?D.sparepartCats[Sparepart.catEditIdx]:null;
document.getElementById('sparepartInterval').value=(curCat&&curCat.intervalKm>0)?curCat.intervalKm:'';
// Sesi 295: toggle "Tampilkan di Pengingat Servis" -- default AKTIF utk
// kategori baru (perilaku lama, tidak berubah), ikut nilai tersimpan utk
// kategori existing (termasuk kategori auto-scan yg default false).
const showRemEl=document.getElementById('sparepartShowInReminder');
if(showRemEl)showRemEl.checked=curCat?curCat.showInReminder!==false:true;
const aiBoxEl=document.getElementById('sparepartAiSuggestBox');
if(aiBoxEl){aiBoxEl.classList.add('u-dnone');aiBoxEl.innerHTML='';}
const sparepartDelBtnEl=document.getElementById('sparepartDelBtn'); if(sparepartDelBtnEl) sparepartDelBtnEl.style.display=isEdit?'':'none';
openModal('sparepartModal');
},
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
const boxEl=document.getElementById('sparepartAiSuggestBox');
if(!name){toast('⚠️ Isi dulu Nama Part/Servis-nya');return;}
const reko=suggestServiceIntervalKm(name,curVehicleId);
if(!boxEl)return;
boxEl.classList.remove('u-dnone');
if(!reko){
boxEl.innerHTML=`<div class="u-fs12 u-t2">🤖 Belum ada rekomendasi pasti utk "${escapeHtml(name)}" di data buku panduan yang tersimpan. Isi manual sesuai buku servis kendaraanmu ya.</div>`;
return;
}
boxEl.innerHTML=`<div class="u-fs12" style="line-height:1.5"><b>🤖 Rekomendasi: setiap ${reko.km.toLocaleString('id-ID')} km</b><br><span class="u-t2">Sumber: ${escapeHtml(reko.source)}</span></div><button type="button" class="btn btn-primary btn-sm u-mt6" data-action="applySparepartIntervalSuggestion" data-args="${escapeHtml(JSON.stringify([reko.km]))}">✅ Pakai Angka Ini</button>`;
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
let code=document.getElementById('sparepartCode').value.trim().toUpperCase();
const showRemEl=document.getElementById('sparepartShowInReminder');
// Sesi 295: kalau user SENGAJA mematikan toggle "Tampilkan di Pengingat
// Servis", interval boleh dikosongkan (kategori ini cuma dipakai utk
// pengelompokan Stok Sparepart, bukan jadwal servis aktif) -- interval
// tetap WAJIB kalau toggle-nya aktif (perilaku lama tidak berubah).
const wantShow=showRemEl?showRemEl.checked:true;
if(!name){toast('⚠️ Lengkapi nama kategori');return;}
if(wantShow&&(!interval||interval<=0)){toast('⚠️ Lengkapi interval servis, atau matikan toggle "Tampilkan di Pengingat Servis" kalau kategori ini cuma buat stok');return;}
const clash=matchingVehicleName(name);
if(clash){toast(`⚠️ "${name}" adalah nama kendaraan, bukan nama part/servis. Isi nama part yang mau diingatkan (mis. Oli Mesin, Ganti Ban, dll).`,4000);return;}
if(!code) code=codeFromName(name);
const intervalKm=(interval&&interval>0)?interval:0;
if(Sparepart.catEditIdx!==null){
D.sparepartCats[Sparepart.catEditIdx].name=name;
D.sparepartCats[Sparepart.catEditIdx].code=code;
D.sparepartCats[Sparepart.catEditIdx].intervalKm=intervalKm;
D.sparepartCats[Sparepart.catEditIdx].showInReminder=wantShow;
} else {
D.sparepartCats.push({id:'sp_'+Date.now(),name,code,intervalKm,showInReminder:wantShow});
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
populateStockCatSelect(){
const sel=document.getElementById('stockCatId');
if(!sel)return;
const cur=sel.value;
sel.innerHTML='<option value="">Tanpa kategori</option>'+D.sparepartCats.map(c=>`<option value="${c.id}">${escapeHtml(c.code||codeFromName(c.name))} — ${escapeHtml(c.name)}</option>`).join('');
if(cur) sel.value=cur;
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
const stats=Sparepart.calcDashboardStats(D.partsStock,D.servisLogs);
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
renderStockList(){
Sparepart.renderDashboard();
const el=document.getElementById('stockList');
if(!el)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const list=D.partsStock.filter(p=>Sparepart.isPartForVehicle(p,vid));
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada stok sparepart untuk kendaraan ini</div></div>';return;}
el.innerHTML=list.map((p)=>{
const i=D.partsStock.indexOf(p);
const cat=D.sparepartCats.find(c=>c.id===p.catId);
const low=p.minStock>0&&p.qty<=p.minStock;
const meta=[`${p.qty}${p.unit?' '+p.unit:''}`,cat?cat.name:null,p.price?'Rata2 '+fmtFull(p.price):null,p.lastPrice?'Terakhir '+fmtFull(p.lastPrice):null,p.lastPurchaseDate?'Dibeli '+p.lastPurchaseDate:null].filter(Boolean).join(' • ');
const history=Sparepart.getPartUsageHistory(p.id);
const historyHtml=history.length?`<div class="u-mt4">${history.map(h=>`<div class="u-pointer" style="padding:6px 0 6px 4px;border-top:1px dashed var(--border)" data-action="Sparepart.openPartHistoryEntry" data-args="${escapeHtml(JSON.stringify([h.servisId,h.vehicleId]))}"><div class="tx-name u-fs12">🗓️ ${escapeHtml(h.item)} <span class="u-fs12t2">— ${escapeHtml(h.vehicleName)}</span></div><div class="tx-meta">${escapeHtml(h.date)}${h.km?' • '+h.km.toLocaleString('id-ID')+' km':''} • ${h.qty}${p.unit?' '+escapeHtml(p.unit):''} dipakai</div></div>`).join('')}</div>`:'';
const priceHistoryHtml=Sparepart.getPartPriceHistoryHtml(p);
return `<div class="tx-item"><div class="tx-icon" style="background:${low?'rgba(255,80,80,.15)':'var(--accent-soft)'}">${low?'⚠️':'📦'}</div><div class="tx-info"><div class="tx-name">${escapeHtml(p.name)} <span class="u-fs12 u-fw700 u-cacc u-bgaccsoft u-r6 u-ml4" style="padding:1px 6px">${escapeHtml(p.code||'-')}</span>${p.catalogId?'<span class="u-fs12 u-fw700 u-r6 u-ml4" style="padding:1px 6px;background:rgba(80,160,255,.15);color:#4a90e2" title="Tautan otomatis dari Katalog Suku Cadang (scan)">🔗 Katalog</span>':''}</div><div class="tx-meta" style="${low?'color:#ff5050;font-weight:700':''}">${escapeHtml(meta)}${low?' • Stok menipis!':''}${p.note?' • '+escapeHtml(p.note):''}</div>${priceHistoryHtml}${historyHtml}</div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openStockModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button><button class="tx-del" data-action="delStock" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
},
getPartUsageHistory(partId){
if(!partId)return[];
return D.servisLogs.filter(s=>s.usedPartId===partId||s.catalogPartLinkedStockId===partId).map(s=>{
const veh=D.vehicles.find(v=>v.id===s.vehicleId);
const qty=(s.usedPartId===partId)?(s.usedPartQty||0):(s.catalogPartQty||0);
return{servisId:s.id,vehicleId:s.vehicleId,vehicleName:veh?veh.name:'-',date:s.date,item:s.item,km:s.km||null,qty};
}).sort((a,b)=>new Date(b.date)-new Date(a.date));
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
const list=Array.isArray(p.priceHistory)?p.priceHistory.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5):[];
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
Sparepart.populateStockCatSelect();
document.getElementById('stockModalTitle').textContent=isEdit?'Edit Stok Sparepart':'Tambah Stok Sparepart';
const p=isEdit?D.partsStock[Sparepart.stockEditIdx]:null;
document.getElementById('stockCatId').value=isEdit?(p.catId||''):'';
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
if(!name){toast('⚠️ Isi nama sparepart dulu');return;}
if(!code){
const cat=D.sparepartCats.find(c=>c.id===catId);
const prefix=cat?(cat.code||codeFromName(cat.name)):codeFromName(name);
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
code=prefix+'-'+String(seq).padStart(3,'0');
}
if(Sparepart.stockEditIdx!==null){
Object.assign(D.partsStock[Sparepart.stockEditIdx],{name,catId,code,qty,unit,minStock,price,note});
} else {
const np={id:'st_'+Date.now(),name,catId,code,qty,unit,minStock,price,note};
D.partsStock.push(np);
// Tahap 10 (lanjutan Tahap 9, jembatan Vehicle Catalog <-> Stok Sparepart):
// part baru yang ditambah manual di sini (⚙️ Atur -> Stok Sparepart) JUGA
// otomatis dibuatkan entri di Vehicle Catalog (best-effort, tidak
// menunggu/tidak memblokir simpan stok) supaya part yang sama bisa
// dikenali lewat scan barcode/OEM & muncul di dropdown "Pilih Sparepart"
// form transaksi Keuangan tanpa harus discan dulu. Pola & alasan SAMA
// PERSIS applyTxStockFromTx() di tx-stok-sparepart.js (arah Keuangan ->
// Katalog) -- di sini arahnya Kelola Stok -> Katalog. Kegagalan (mis.
// VehicleCatalog belum termuat) diabaikan diam-diam, bukan syarat simpan.
if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.create==='function'){
const cat=D.sparepartCats.find(c=>c.id===catId);
VehicleCatalog.create({partName:name,category:(cat&&cat.name)||'Umum'}).then(res=>{
if(res&&res.success&&res.item){np.catalogId=res.item.id;if(typeof save==='function')save();}
}).catch(()=>{});
}
}
save();closeModal('stockModal');Sparepart.renderStockList();toast('✅ Stok sparepart disimpan');
},
async delStock(i){
if(!await askConfirm('Hapus item stok sparepart ini?'))return;
D.partsStock.splice(i,1);save();Sparepart.renderStockList();toast('🗑 Dihapus');
},
// syncFromCatalog() — fitur baru (permintaan eksplisit user): tombol
// "🔄 Sinkron dari Katalog Suku Cadang" di 🔧 Kelola Kategori Sparepart &
// Interval Servis. BEDA dari syncPartsStockFromCatalog() (tx-stok-sparepart.js,
// dipakai alur scan di form transaksi Keuangan) dalam 2 hal sesuai keputusan
// eksplisit user:
//  1) Filter per KENDARAAN AKTIF ("beda kendaraan beda katalog") — hanya part
//     Katalog Suku Cadang yang compatibleVehicleIds-nya EKSPLISIT memuat
//     curVehicleId yang disinkron, bukan semua part tanpa pandang kendaraan.
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
const candidates=(items||[]).filter(it=>it&&!it.isDraft&&Array.isArray(it.compatibleVehicleIds)&&it.compatibleVehicleIds.some(id=>String(id)===String(curVehicleId)));
if(!candidates.length){toast('ℹ️ Belum ada part di Katalog Suku Cadang yang ditandai kompatibel dengan '+(veh?veh.name:'kendaraan ini'));return;}
const rows=candidates.map(it=>{
const already=D.partsStock.some(p=>p.catalogId===it.id);
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
let cat=D.sparepartCats.find(c=>c.name.toLowerCase()===catName.toLowerCase());
if(!cat){
cat={id:'sp_'+Date.now()+'_'+idx,name:catName,code:codeFromName(catName),intervalKm:r.intervalKm||0,showInReminder:r.intervalKm>0};
D.sparepartCats.push(cat);
addedCat++;
} else if(r.intervalKm>0&&(!cat.intervalKm||cat.intervalKm<=0)){
cat.intervalKm=r.intervalKm;
cat.showInReminder=true;
}
const prefix=cat.code||codeFromName(catName);
const seq=D.partsStock.filter(p=>p.code&&p.code.startsWith(prefix+'-')).length+1;
const code=(it.barcode||it.oemCode||(prefix+'-'+String(seq).padStart(3,'0')));
D.partsStock.push({id:'st_'+Date.now()+'_'+idx,name:it.partName||'Part dari Katalog',catId:cat.id,code,qty:0,unit:'pcs',minStock:1,price:it.price||0,note:'Disinkron dari Katalog Suku Cadang',catalogId:it.id});
addedStock++;
});
save();
Sparepart.renderCatList();
Sparepart.renderStockList();
if(typeof renderServisList==='function')renderServisList();
if(typeof renderDashboardServisReminder==='function')renderDashboardServisReminder();
toast('✅ Sinkron selesai: '+addedCat+' kategori baru, '+addedStock+' stok baru');
}
};
function autoFillSparepartCode(){return Sparepart.autoFillCatCode();}
function populateSparepartDatalist(){return Sparepart.populateDatalist();}
/* moved to modules-render.js: renderSparepartCatList */
function openSparepartModal(idx){return Sparepart.openCatModal(idx);}
function saveSparepart(){return Sparepart.saveCat();}
function delSparepart(i){return Sparepart.delCat(i);}
function populateStockCatSelect(){return Sparepart.populateStockCatSelect();}
function autoFillStockCode(){return Sparepart.autoFillStockCode();}
/* moved to modules-render.js: renderStockList */
function openStockModal(idx){return Sparepart.openStockModal(idx);}
function saveStock(){return Sparepart.saveStock();}
function delStock(i){return Sparepart.delStock(i);}
function toggleSparepartShowInReminder(catId){return Sparepart.toggleShowInReminder(catId);}
function suggestSparepartInterval(){return Sparepart.suggestInterval();}
function applySparepartIntervalSuggestion(km){return Sparepart.applyIntervalSuggestion(km);}
function syncSparepartFromCatalog(){return Sparepart.syncFromCatalog();}
function populateServisPartSelect(selectedPartId){return Servis.populatePartSelect(selectedPartId);}
function onServisPartChange(){return Servis.onPartChange();}
function onServisCatalogPartChange(){return Servis.onCatalogPartChange();}
function onServisItemAutofillInterval(){return Servis.onItemAutofillInterval();}
function openServisModal(editId,prefillItem){return Servis.openModal(editId,prefillItem);}
const TORSI_DB=[
{matchNames:['vario 125'],
sourceNote:'Honda Vario 125 (KZR) — Buku Pedoman Reparasi, bagian Spesifikasi & Torsi Pengencangan (hal. 1-4 s/d 1-8) & Perawatan (hal. 3-3).',
cats:[
{cat:'Perawatan Berkala', icon:'🛠️', items:[
{name:'Mur pengunci kabel gas', ulir:'8 mm', nm:8.5, kgf:0.9},
{name:'Sekrup cover rumah saringan udara', ulir:'5 mm', nm:1.1, kgf:0.1},
{name:'Busi', ulir:'10 mm', nm:16, kgf:1.6, interval:'Periksa tiap 4.000 km · Ganti tiap 8.000 km', consumable:true},
{name:'Mur pengunci sekrup penyetel valve', ulir:'5 mm', nm:10, kgf:1.0, note:'oli', interval:'Periksa/setel tiap 4.000 km'},
{name:'Baut pembuangan oli mesin', ulir:'12 mm', nm:24, kgf:2.4, interval:'Ganti oli tiap 4.000 km', consumable:true},
{name:'Tutup saringan kasa oli mesin', ulir:'30 mm', nm:20, kgf:2.0, interval:'Bersihkan tiap 8.000 km'},
{name:'Baut pemeriksaan oli final reduction', ulir:'8 mm', nm:23, kgf:2.3, interval:'Ganti oli transmisi tiap 8.000 km'},
{name:'Baut pembuangan oli final reduction (transmisi)', ulir:'8 mm', nm:23, kgf:2.3, interval:'Ganti oli transmisi tiap 8.000 km'},
{name:'Mur pengunci kabel penghubung equalizer (tipe CBS)', ulir:'8 mm', nm:6.4, kgf:0.7},
{name:'Saringan udara', ulir:'—', nm:null, kgf:null, interval:'Ganti tiap 16.000 km (lebih sering jika area basah/berdebu)', consumable:true, noTorque:true},
{name:'Drive belt (v-belt CVT)', ulir:'—', nm:null, kgf:null, interval:'Periksa tiap 8.000 km · Ganti tiap 32.000 km', consumable:true, noTorque:true},
{name:'Minyak rem', ulir:'—', nm:null, kgf:null, interval:'Periksa tiap 4.000 km · Ganti tiap 2 tahun', consumable:true, noTorque:true},
{name:'Cairan pendingin radiator (coolant)', ulir:'—', nm:null, kgf:null, interval:'Periksa tiap 4.000 km · Ganti tiap 2 tahun', consumable:true, noTorque:true},
]},
{cat:'Mesin — Cylinder Head/Valve', icon:'⚙️', items:[
{name:'Baut stopper camshaft', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut stopper shaft rocker arm', ulir:'5 mm', nm:5, kgf:0.5, note:'oli'},
{name:'Baut socket cam sprocket', ulir:'5 mm', nm:8, kgf:0.8, note:'oli'},
{name:'Sekrup cam chain tensioner lifter', ulir:'6 mm', nm:4, kgf:0.4},
{name:'Baut penahan pompa air', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Mur cylinder head', ulir:'8 mm', nm:27, kgf:2.8, note:'oli'},
{name:'Baut stud cylinder', ulir:'8 mm', nm:9, kgf:0.9},
]},
{cat:'Mesin — Kopling/Pulley/Final Drive', icon:'🔗', items:[
{name:'Sekrup plat cover crankcase kiri', ulir:'4 mm', nm:3.2, kgf:0.3},
{name:'Mur drive pulley face', ulir:'14 mm', nm:59, kgf:6.0, note:'oli'},
{name:'Mur kopling/driven pulley', ulir:'28 mm', nm:54, kgf:5.5},
{name:'Mur clutch outer', ulir:'12 mm', nm:49, kgf:5.0},
{name:'Baut final reduction case', ulir:'8 mm', nm:23, kgf:2.3},
{name:'Mur link penggantung mesin (sisi rangka)', ulir:'10 mm', nm:69, kgf:7.0},
{name:'Mur link penggantung mesin (sisi mesin)', ulir:'10 mm', nm:49, kgf:5.0},
]},
{cat:'Sistem PGM-FI & Bahan Bakar', icon:'⛽', items:[
{name:'Sekrup torx katup solenoid peninggi putaran stasioner', ulir:'5 mm', nm:3.4, kgf:0.3},
{name:'Sensor ECT', ulir:'10 mm', nm:12, kgf:1.2},
{name:'Sensor O2', ulir:'12 mm', nm:24.5, kgf:2.5},
{name:'Mur plat pemasangan pompa bahan bakar', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Sekrup dudukan kabel gas', ulir:'5 mm', nm:3.4, kgf:0.3},
{name:'Baut pemasangan joint injector', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Baut pemasangan pompa oli', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut pembuangan radiator', ulir:'10 mm', nm:1, kgf:0.1},
]},
{cat:'Roda Depan/Suspensi/Kemudi', icon:'🛞', items:[
{name:'Baut socket cakram rem depan', ulir:'8 mm', nm:42, kgf:4.3, note:'new'},
{name:'Mur as roda depan', ulir:'12 mm', nm:59, kgf:6.0},
{name:'Baut socket fork', ulir:'8 mm', nm:20, kgf:2.0},
{name:'Baut penjepit bottom bridge', ulir:'10 mm', nm:64, kgf:6.5},
{name:'Baut pemasangan caliper rem depan', ulir:'8 mm', nm:30, kgf:3.1, note:'new'},
{name:'Mur batang stang kemudi', ulir:'10 mm', nm:59, kgf:6.0},
{name:'Mur pengunci poros kemudi', ulir:'26 mm', nm:74, kgf:7.5},
]},
{cat:'Roda Belakang/Suspensi', icon:'🛞', items:[
{name:'Mur as roda belakang', ulir:'16 mm', nm:118, kgf:12.0, note:'oli'},
{name:'Baut pemasangan atas shock absorber', ulir:'10 mm', nm:59, kgf:6.0},
{name:'Baut pemasangan bawah shock absorber', ulir:'8 mm', nm:26, kgf:2.7},
]},
{cat:'Sistem Rem', icon:'🛑', items:[
{name:'Baut arm rem belakang', ulir:'6 mm', nm:10, kgf:1.0, note:'new'},
{name:'Katup pembuangan caliper rem', ulir:'8 mm', nm:5.4, kgf:0.6},
{name:'Sekrup tutup reservoir master cylinder rem', ulir:'4 mm', nm:1.5, kgf:0.2},
{name:'Pin brake pad (kampas rem)', ulir:'10 mm', nm:18, kgf:1.8, interval:'Periksa keausan tiap 4.000 km', consumable:true},
{name:'Mur as handel rem depan', ulir:'6 mm', nm:6, kgf:0.6},
{name:'Baut oli selang rem', ulir:'10 mm', nm:34, kgf:3.5},
{name:'Pin dudukan caliper rem', ulir:'8 mm', nm:18, kgf:1.8},
]},
{cat:'Kelistrikan & Panel', icon:'🔌', items:[
{name:'Baut socket pemasangan stator', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut spesial pemasangan sensor CKP', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Mur flywheel', ulir:'12 mm', nm:69, kgf:7.0},
{name:'Baut pemasangan kipas pendingin', ulir:'6 mm', nm:8.5, kgf:0.9},
{name:'Baut pemasangan sensor VS', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Sekrup pemasangan kunci kontak', ulir:'6 mm', nm:9, kgf:0.9, note:'new'},
{name:'Baut pemasangan muffler', ulir:'10 mm', nm:59, kgf:6.0},
{name:'Mur joint pipa exhaust', ulir:'7 mm', nm:26.5, kgf:2.7},
{name:'Baut as standar samping', ulir:'10 mm', nm:10, kgf:1.0},
{name:'Mur pengunci as standar samping', ulir:'10 mm', nm:29, kgf:3.0},
]},
]},
{matchNames:['beat fi','beat-fi','beat esp','beat pgm-fi','vario 110','vario110','vario 110 esp'],
sourceNote:'Honda BeAT FI Gen 1 — Buku Pedoman Reparasi, bab Informasi Umum (Spesifikasi & Torsi Pengencangan, hal. 1-4 s/d 1-11) & Perawatan (Jadwal Perawatan Berkala, hal. 3-3). Catatan: mesin 108cc (non-liquid cooled) satu platform dengan Vario 110 (eSP) — torsi mekanis dipakaikan juga untuk Vario 110 di sini, TAPI spek non-mesin (ban/rem/kelistrikan/kapasitas) belum terverifikasi khusus utk Vario 110 — cek ulang ke buku manual Vario 110 kalau ragu, terutama bagian Roda/Rem/Kelistrikan.',
cats:[
{cat:'Perawatan Berkala', icon:'🛠️', items:[
{name:'Mur pengunci kabel gas', ulir:'8 mm', nm:8.5, kgf:0.9},
{name:'Sekrup cover rumah saringan udara', ulir:'5 mm', nm:1.1, kgf:0.1},
{name:'Busi', ulir:'10 mm', nm:16, kgf:1.6, interval:'Periksa tiap 4.000 km · Ganti tiap 8.000 km', consumable:true},
{name:'Mur pengunci sekrup penyetel valve', ulir:'5 mm', nm:10, kgf:1.0, note:'oli', interval:'Periksa/setel tiap 1.000 km, lalu tiap kelipatan 4.000 km'},
{name:'Baut pembuangan oli mesin', ulir:'12 mm', nm:24, kgf:2.4, interval:'Ganti oli tiap 4.000 km (servis pertama di 1.000 km)', consumable:true},
{name:'Tutup saringan kasa oli mesin', ulir:'30 mm', nm:20, kgf:2.0, interval:'Bersihkan tiap 12.000 km (servis pertama di 1.000 km)'},
{name:'Baut pemeriksaan oli final reduction', ulir:'8 mm', nm:13, kgf:1.3, interval:'Ganti oli transmisi tiap 8.000 km'},
{name:'Baut pembuangan oli final reduction (transmisi)', ulir:'8 mm', nm:13, kgf:1.3, interval:'Ganti oli transmisi tiap 8.000 km'},
{name:'Mur pengunci kabel penghubung equalizer (tipe CBS)', ulir:'8 mm', nm:6.4, kgf:0.7},
{name:'Jari-jari (tipe spoke wheel)', ulir:'BC 3,2 mm', nm:3.7, kgf:0.4},
{name:'Baut penyetel arah sinar lampu depan', ulir:'4 mm', nm:2.0, kgf:0.2},
{name:'Saringan udara', ulir:'—', nm:null, kgf:null, interval:'Ganti tiap 16.000 km (lebih sering jika area basah/berdebu)', consumable:true, noTorque:true},
{name:'Drive belt (v-belt CVT)', ulir:'—', nm:null, kgf:null, interval:'Periksa tiap 8.000 km · Ganti tiap 24.000 km', consumable:true, noTorque:true},
{name:'Minyak rem', ulir:'—', nm:null, kgf:null, interval:'Periksa tiap 4.000 km · Ganti tiap 2 tahun', consumable:true, noTorque:true},
]},
{cat:'Mesin — Cylinder Head/Valve', icon:'⚙️', items:[
{name:'Sekrup pemasangan intake shroud', ulir:'5 mm', nm:0.8, kgf:0.1},
{name:'Baut pemasangan exhaust shroud', ulir:'6 mm', nm:7.0, kgf:0.7},
{name:'Mur cylinder head', ulir:'7 mm', nm:18, kgf:1.8, note:'oli'},
{name:'Baut cam sprocket', ulir:'5 mm', nm:8.0, kgf:0.8, note:'oli'},
{name:'Sekrup cam chain tensioner lifter', ulir:'6 mm', nm:4.0, kgf:0.4},
{name:'Baut special cover cylinder head', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Sekrup pemasangan breather plate', ulir:'4 mm', nm:3.0, kgf:0.3},
{name:'Baut pin as cam chain tensioner slider', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut stud cylinder', ulir:'7 mm', nm:6.0, kgf:0.6},
]},
{cat:'Mesin — Kopling/Pulley/Final Drive', icon:'🔗', items:[
{name:'Sekrup plat cover crankcase kiri', ulir:'4 mm', nm:3.0, kgf:0.3},
{name:'Mur drive pulley face', ulir:'14 mm', nm:108, kgf:11.0, note:'oli'},
{name:'Mur kopling/driven pulley', ulir:'28 mm', nm:54, kgf:5.5},
{name:'Mur clutch outer', ulir:'12 mm', nm:49, kgf:5.0},
{name:'Mur link penggantung mesin (sisi mesin)', ulir:'10 mm', nm:49, kgf:5.0},
{name:'Mur link penggantung mesin (sisi rangka)', ulir:'10 mm', nm:69, kgf:7.0},
]},
{cat:'Sistem PGM-FI & Bahan Bakar', icon:'⛽', items:[
{name:'Sekrup torx katup solenoid peninggi putaran stasioner', ulir:'5 mm', nm:3.4, kgf:0.3},
{name:'Sensor EOT', ulir:'10 mm', nm:14.5, kgf:1.5},
{name:'Sensor O2', ulir:'12 mm', nm:25, kgf:2.5},
{name:'Mur plat pemasangan pompa bahan bakar', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Sekrup dudukan kabel gas', ulir:'5 mm', nm:3.4, kgf:0.3},
{name:'Baut pemasangan joint injector', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Sekrup plat pompa oli', ulir:'4 mm', nm:3.0, kgf:0.3},
{name:'Baut pemasangan pompa oli', ulir:'6 mm', nm:10, kgf:1.0},
]},
{cat:'Roda Depan/Suspensi/Kemudi', icon:'🛞', items:[
{name:'Mur as roda depan', ulir:'12 mm', nm:59, kgf:6.0},
{name:'Baut socket cakram rem depan', ulir:'8 mm', nm:42, kgf:4.3, note:'new'},
{name:'Baut socket fork', ulir:'8 mm', nm:20, kgf:2.0},
{name:'Baut penjepit bottom bridge', ulir:'10 mm', nm:64, kgf:6.5},
{name:'Baut fork', ulir:'20 mm', nm:22.5, kgf:2.3},
{name:'Baut pemasangan caliper rem depan', ulir:'8 mm', nm:30, kgf:3.0, note:'new'},
{name:'Mur batang stang kemudi', ulir:'10 mm', nm:59, kgf:6.0},
]},
{cat:'Roda Belakang/Suspensi', icon:'🛞', items:[
{name:'Mur as roda belakang', ulir:'16 mm', nm:118, kgf:12.0, note:'oli'},
{name:'Baut pemasangan atas shock absorber belakang', ulir:'10 mm', nm:59, kgf:6.0},
{name:'Baut pemasangan bawah shock absorber belakang', ulir:'8 mm', nm:26.5, kgf:2.7},
]},
{cat:'Sistem Rem', icon:'🛑', items:[
{name:'Baut arm rem belakang', ulir:'6 mm', nm:10, kgf:1.0, note:'new'},
{name:'Katup pembuangan caliper rem', ulir:'8 mm', nm:5.4, kgf:0.6},
{name:'Sekrup tutup reservoir master cylinder rem', ulir:'4 mm', nm:1.5, kgf:0.2},
{name:'Pin brake pad (kampas rem)', ulir:'10 mm', nm:18, kgf:1.8, interval:'Periksa keausan tiap 4.000 km', consumable:true},
{name:'Mur as handel rem depan', ulir:'6 mm', nm:6.0, kgf:0.6},
{name:'Baut oli selang rem', ulir:'10 mm', nm:34, kgf:3.5},
{name:'Pin dudukan caliper rem', ulir:'8 mm', nm:18, kgf:1.8},
]},
{cat:'Kelistrikan & Panel', icon:'🔌', items:[
{name:'Baut pemasangan kipas pendingin', ulir:'6 mm', nm:8.0, kgf:0.8},
{name:'Mur flywheel', ulir:'10 mm', nm:39, kgf:4.0},
{name:'Baut pemasangan sensor CKP', ulir:'5 mm', nm:6.0, kgf:0.6},
{name:'Baut pemasangan muffler', ulir:'10 mm', nm:59, kgf:6.0},
{name:'Baut pelindung muffler', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut as standar samping', ulir:'10 mm', nm:10, kgf:1.0},
{name:'Mur pengunci as standar samping', ulir:'10 mm', nm:29, kgf:3.0},
{name:'Baut socket key shutter', ulir:'6 mm', nm:10, kgf:1.0, note:'new'},
]},
]},
];
function findTorsiDb(vehName){
if(!vehName)return null;
const n=vehName.toLowerCase();
return TORSI_DB.find(s=>s.matchNames.some(m=>n.includes(m)))||null;
}
// suggestServiceIntervalKm() (Sesi 295, permintaan eksplisit user "tambahkan
// ai rekomendasi interval pergantian sparepart sesuai panduan pengguna") --
// dipakai Sparepart.suggestInterval() di modal 🔧 Kelola Kategori Sparepart.
// TIDAK panggil AI/web baru: nambang field `interval` yg SUDAH ADA di
// TORSI_DB (dikutip langsung dari Buku Pedoman Reparasi tiap
// kendaraan -- lihat `sourceNote` per entri), yg formatnya spt "Periksa
// tiap 4.000 km · Ganti tiap 8.000 km" atau "Ganti tiap 16.000 km". Prioritas
// pencarian: (1) kendaraan aktif user dulu (findTorsiDb(vehName)) supaya
// rekomendasi paling relevan buat motor/mobil yg sedang dipakai, (2) kalau
// tidak match/tidak ada TORSI_DB utk kendaraan itu, cari di SEMUA entri
// TORSI_DB. Angka "Ganti" diutamakan drpd "Periksa" (ganti = usia pakai
// sebenarnya part itu, bukan interval cek). Kalau tetap tidak ketemu,
// fallback ke tabel kata kunci umum (angka umum dari buku servis motor
// matic Indonesia) supaya tetap ada saran meski part-nya belum ada di
// TORSI_DB manapun.
function _parseIntervalKmFromText(text){
if(!text)return null;
const gantiMatch=text.match(/ganti[^0-9]*([\d.,]+)\s*km/i);
if(gantiMatch)return parseFloat(gantiMatch[1].replace(/\./g,'').replace(',','.'));
const anyMatch=text.match(/([\d.,]+)\s*km/i);
if(anyMatch)return parseFloat(anyMatch[1].replace(/\./g,'').replace(',','.'));
return null;
}
function suggestServiceIntervalKm(partName,vehicleId){
if(!partName)return null;
const q=partName.trim().toLowerCase();
if(q.length<3)return null;
function searchInDb(dbEntry){
if(!dbEntry)return null;
for(const catGroup of dbEntry.cats){
for(const item of catGroup.items){
if(!item.interval)continue;
const iname=item.name.toLowerCase();
if(iname.includes(q)||q.includes(iname)){
const km=_parseIntervalKmFromText(item.interval);
if(km)return{km,source:dbEntry.sourceNote,partLabel:item.name};
}
}
}
return null;
}
const veh=D.vehicles.find(v=>v.id===vehicleId);
if(veh){
const own=findTorsiDb(veh.name);
const hit=searchInDb(own);
if(hit)return hit;
}
for(const dbEntry of TORSI_DB){
const hit=searchInDb(dbEntry);
if(hit)return hit;
}
// Fallback: tabel kata kunci umum (bukan dari TORSI_DB spesifik kendaraan,
// tapi angka rule-of-thumb yg lazim dipakai buku servis motor matic).
const FALLBACK_KEYWORDS=[
{keys:['oli mesin','oli mesin motor'],km:2000,label:'rata-rata rekomendasi ganti oli mesin motor matic'},
{keys:['filter oli','saringan oli'],km:8000,label:'rata-rata rekomendasi buku servis motor matic'},
{keys:['oli gardan','oli transmisi','final drive','final reduction'],km:8000,label:'rata-rata rekomendasi buku servis motor matic'},
{keys:['busi'],km:8000,label:'rata-rata rekomendasi buku servis motor matic'},
{keys:['filter udara','saringan udara'],km:16000,label:'rata-rata rekomendasi buku servis motor matic'},
{keys:['kampas rem','brake pad'],km:10000,label:'rata-rata rekomendasi pemeriksaan kampas rem'},
{keys:['v-belt','vbelt','drive belt','cvt belt'],km:24000,label:'rata-rata rekomendasi ganti v-belt CVT'},
{keys:['roller','roller cvt'],km:24000,label:'rata-rata rekomendasi ganti roller CVT'},
{keys:['minyak rem','brake fluid'],km:20000,label:'rata-rata rekomendasi ganti minyak rem (≈2 tahun)'},
{keys:['coolant','radiator','cairan pendingin'],km:20000,label:'rata-rata rekomendasi ganti coolant (≈2 tahun)'},
{keys:['aki','accu','battery'],km:15000,label:'rata-rata usia pakai aki motor sebelum dicek ulang'},
{keys:['ban depan','ban belakang','ban luar'],km:20000,label:'rata-rata usia pakai ban motor'},
];
for(const fb of FALLBACK_KEYWORDS){
if(fb.keys.some(k=>q.includes(k)))return{km:fb.km,source:fb.label+' (bukan dari buku manual kendaraan spesifik ini — sesuaikan lagi kalau ada datanya)'};
}
return null;
}
const TORSI_NM_PER_KGF=9.80665, TORSI_NM_PER_LBFT=1.35582, TORSI_NM_PER_LBIN=0.112985;
const VEHICLE_SPEC_DB=[
{matchNames:['vario 125'], sourceNote:'Honda Vario 125 (KZR) — Buku Pedoman Reparasi, bab SPESIFIKASI (hal. 1-4 s/d 1-8) & PERAWATAN (hal. 3-3)',
umum:{
'Kapasitas tangki BBM':'5,5 liter',
'Oli mesin (ganti rutin)':'0,8 liter',
'Oli mesin (setelah bongkar/ganti saringan)':'0,9 liter',
'Jenis oli mesin':'SAE 10W-30 · API SG atau lebih tinggi · JASO T903: MB',
'Oli transmisi/final drive (rutin)':'0,12 liter',
'Oli transmisi/final drive (bongkar)':'0,14 liter',
'Coolant (radiator+mesin)':'0,51 liter',
'Coolant (tangki cadangan)':'0,14 liter',
'Jenis coolant':'Honda PRE-MIX Coolant',
'Busi':'NGK CPR7EA-9 / DENSO U22EPR-9',
'Celah busi':'0,8 – 0,9 mm',
'RPM stasioner':'1.700 ± 100 rpm',
'Waktu pengapian':'12° sebelum TMA (saat stasioner)',
},
ban:{
depan:{ukuran:'80/90-14 M/C 40P', tekanan:'200 kPa · 2,00 kgf/cm² · 29 psi (solo maupun boncengan)'},
belakang:{ukuran:'90/90-14 M/C 46P', tekanan:'225 kPa · 2,25 kgf/cm² · 33 psi (solo maupun boncengan)'},
},
kelistrikan:{
aki:'YTZ6V — 12V, 5 Ah',
sekring:'Utama 25A · Tambahan 10A × 5',
bohlam:[
['Lampu depan','12V 25/25W ×2'],
['Lampu senja','12V 3,4W ×2'],
['Lampu belakang','12V 5W'],
['Lampu rem','12V 10W ×2'],
['Lampu plat nomor','12V 5W'],
['Lampu sein','12V 10W ×4'],
],
},
batasServis:[
['Ketebalan cakram rem depan','3,3–3,7 mm','Min 3,0 mm'],
['Diameter tromol rem belakang','–','Maks 131,0 mm'],
],
},
{matchNames:['beat fi','beat-fi','beat esp','beat pgm-fi'], sourceNote:'Honda BeAT FI Gen 1 — Buku Pedoman Reparasi, bab INFORMASI UMUM (hal. 1-4 s/d 1-11) & PERAWATAN (hal. 3-3). Mesin 108cc satu platform dengan Vario 110 (eSP), tapi verifikasi ulang sebelum dipakai untuk motor lain.',
umum:{
'Kapasitas tangki BBM':'3,7 liter',
'Oli mesin (ganti rutin)':'0,7 liter',
'Oli mesin (setelah bongkar/ganti saringan)':'0,8 liter',
'Jenis oli mesin':'SAE 10W-30 · API SG atau lebih tinggi · JASO T903: MB',
'Oli transmisi/final drive (rutin)':'0,14 liter',
'Oli transmisi/final drive (bongkar)':'0,16 liter',
'Sistem pendinginan':'Udara paksa (tidak pakai radiator/coolant)',
'Busi':'NGK CPR9EA-9 / DENSO U27EPR9',
'Celah busi':'0,80 – 0,90 mm',
'RPM stasioner':'1.700 ± 100 rpm',
'Waktu pengapian':'7° sebelum TMA (saat stasioner)',
},
ban:{
depan:{ukuran:'80/90-14 M/C 40P', tekanan:'200 kPa · 2,00 kgf/cm² · 29 psi (solo maupun boncengan)'},
belakang:{ukuran:'90/90-14 M/C 46P', tekanan:'225 kPa · 2,25 kgf/cm² · 33 psi (solo maupun boncengan)'},
},
kelistrikan:{
aki:'GTZ4V / YTZ4V — 12V, 3 Ah',
sekring:'Utama 15A · Tambahan 10A',
bohlam:[
['Lampu depan','12V 32/32W'],
['Lampu senja','12V 3,4W'],
['Lampu rem/belakang','12V 18/5W'],
['Lampu sein','12V 10W ×4'],
['Lampu instrumen','12V 1,7W ×2'],
['Indikator lampu jauh','12V 1,7W'],
['Indikator sein','12V 3,4W'],
['MIL','12V 1,7W'],
],
},
batasServis:[
['Ketebalan cakram rem depan','3,3–3,7 mm','Min 3,0 mm'],
['Diameter tromol rem belakang','130,0 mm','Maks 131,0 mm'],
],
},
];
function findVehicleSpec(vehName){
if(!vehName)return null;
const n=vehName.toLowerCase();
return VEHICLE_SPEC_DB.find(s=>s.matchNames.some(m=>n.includes(m)))||null;
}
/* moved to modules-render.js: renderVehicleSpecCard */
const MY_WRENCH_SCALE=(()=>{
const marks=[];
for(let l=MY_WRENCH.minLbft;l<=MY_WRENCH.maxLbft;l+=10){
marks.push({lbft:l, nm:Math.round(l*TORSI_NM_PER_LBFT*100)/100});
}
return marks;
})();
function revertStockUsage(partId,qty){return Servis.revertStockUsage(partId,qty);}
function applyStockUsage(partId,qty){return Servis.applyStockUsage(partId,qty);}
function saveServis(){
const r=Servis.save();
if(typeof AIBus!=="undefined")AIBus.emit("vehicle.updated",{kind:"servis"});
return r;
}
function deleteServisFromModal(){return Servis.deleteFromModal();}
function delServis(id){return Servis.del(id);}
function markSparepartServiced(catId){return Servis.markServiced(catId);}
function getLastServiceKmForCat(vehicleId,cat){return Servis.getLastServiceKmForCat(vehicleId,cat);}
function editSparepartFromReminder(catId){return Servis.editSparepartFromReminder(catId);}
/* moved to modules-render.js: renderServisReminder */
function loadMoreServisList(){return Servis.loadMore();}
let dashServisVehFilter='semua';
(function(){try{dashServisVehFilter=localStorage.getItem('kw_dashServisVehFilter')||'semua';}catch(e){}})();
function setDashServisVehFilter(vehId){
dashServisVehFilter=vehId;
safeSetItem('kw_dashServisVehFilter',vehId);
renderDashboardServisReminder();
}
/* moved to modules-render.js: renderDashServisVehChips */
/* moved to modules-render.js: renderDashboardServisReminder */
function goToServisFromDash(vehicleId){
if(vehicleId&&D.vehicles.find(v=>v.id===vehicleId)){curVehicleId=vehicleId;renderVehicleSelect();}
goToList('servisReminderCard','carnotes',4,null,'servis');
}

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 5/6: predictService() & maintenanceForecast()
// — fungsi prediktif domain VEHICLE (bagian servis/sparepart). Lihat
// RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. fuelEfficiency() (fungsi
// prediktif VEHICLE lainnya, bagian BBM) ada di modules/vehicle/vehicle-
// core.js, di-load SEBELUM file ini.
//
// predictService() SENGAJA tidak menduplikasi perhitungan yang sudah ada di
// Servis.renderReminder() (car-notes.js) — dia memakai getEffectiveIntervalKm/
// getLastServiceKmForCat/estimateKmPerDay/estimateServiceDateISO yang PERSIS
// SAMA (fungsi yang sama, bukan reimplementasi), cuma dikeluarkan versi
// pure-data-nya (tanpa HTML/DOM) supaya bisa dipakai AIService/wiring Sesi 6
// nanti. renderReminder() DIBIARKAN seperti semula (tidak di-refactor pakai
// fungsi ini) untuk minimalkan risiko regresi UI di sesi ini.
// PURE/read-only, TIDAK PERNAH memanggil save(). Belum ada UI/tombol baru.
// ---------------------------------------------------------------------------

// predictService({vehicleId, categoryId}) — prediksi servis berikutnya.
// Tanpa categoryId: balikin array (1 baris per D.sparepartCats), urut dari
// paling mendesak (sisaKm terkecil dulu) — sama urutan dgn
// Servis.renderReminder(). Dengan categoryId: balikin 1 objek prediksi
// (bukan array) buat kategori itu saja. Balikin {ok:false} kalau kendaraan
// tidak ditemukan atau belum ada kategori sparepart terdaftar.
function predictService({vehicleId,categoryId}={}){
const veh=(D.vehicles||[]).find(v=>v.id===vehicleId);
if(!veh)return{ok:false,reason:'Kendaraan tidak ditemukan'};
const cats=categoryId
? (D.sparepartCats||[]).filter((c)=>c.id===categoryId)
: (D.sparepartCats||[]);
if(!cats.length)return{ok:false,reason:categoryId?'Kategori sparepart tidak ditemukan':'Belum ada kategori sparepart terdaftar'};
const curKm=getVehicleKm(vehicleId);
const kmPerDay=estimateKmPerDay(vehicleId);
const rows=cats.map((cat)=>{
const lastKm=getLastServiceKmForCat(vehicleId,cat);
const intervalKm=getEffectiveIntervalKm(vehicleId,cat);
const overridden=hasIntervalOverride(vehicleId,cat);
const jarakTempuh=lastKm===null?curKm:curKm-lastKm;
const sisaKm=intervalKm-jarakTempuh;
const estDateISO=estimateServiceDateISO(sisaKm,kmPerDay);
const status=sisaKm<=0?'lewat':(sisaKm<=intervalKm*0.15?'segera':'aman');
return{categoryId:cat.id,categoryName:cat.name,lastKm,intervalKm,overridden,sisaKm,estDateISO,status};
}).sort((a,b)=>a.sisaKm-b.sisaKm);
return{ok:true,vehicleId,curKm,kmPerDay,items:categoryId?undefined:rows,...(categoryId?rows[0]:{})};
}

// maintenanceForecast({vehicleId, monthsAhead}) — perkiraan item servis yang
// akan JATUH TEMPO dalam N bulan ke depan (dari estDateISO hasil
// predictService() di atas) + estimasi total biayanya, dari rata-rata biaya
// histori per kategori (D.servisLogs[].cost, kalau ada catatannya — kategori
// tanpa histori biaya dihitung biayaEstimasi:null & TIDAK ikut totalBiaya,
// supaya total tidak under-estimate secara diam-diam).
function maintenanceForecast({vehicleId,monthsAhead=3}={}){
const pred=predictService({vehicleId});
if(!pred.ok)return pred;
const now=new Date();
const batas=new Date(now.getFullYear(),now.getMonth()+monthsAhead,now.getDate());
const dueItems=pred.items.filter((r)=>r.status==='lewat'||(r.estDateISO&&new Date(r.estDateISO)<=batas));
let totalBiaya=0;
let totalBiayaLengkap=true;
const items=dueItems.map((r)=>{
const logs=(D.servisLogs||[]).filter((s)=>s.vehicleId===vehicleId&&(s.categoryId===r.categoryId||(!s.categoryId&&s.item===r.categoryName))&&s.cost>0);
const biayaEstimasi=logs.length?logs.reduce((s,l)=>s+l.cost,0)/logs.length:null;
if(biayaEstimasi==null)totalBiayaLengkap=false;else totalBiaya+=biayaEstimasi;
return Object.assign({},r,{biayaEstimasi});
});
return{ok:true,vehicleId,monthsAhead,items,totalBiaya,totalBiayaLengkap};
}

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 8: rule domain VEHICLE utk AIDecision (lanjutan
// Sesi 7 — lihat RENCANA-SESI-RINGKAS.md). Rule: "ada kendaraan dgn item
// servis berstatus 'lewat' (jatuh tempo terlampaui)" — dari predictService()
// di atas, status yang SAMA PERSIS dipakai Servis.renderReminder() (jadi
// rule ini TIDAK mengarang ambang baru, cuma numpang status yang sudah ada).
// Diperiksa lintas SEMUA D.vehicles (bukan cuma kendaraan aktif) karena
// event 'vehicle.updated' (saveServis()) tidak membawa vehicleId spesifik.
// ---------------------------------------------------------------------------

// _vehicleOverdueCheck() — helper dipakai condition() & action().
function _vehicleOverdueCheck(){
if(typeof predictService!=='function')return{trigger:false};
const overdue=[];
(D.vehicles||[]).forEach((v)=>{
const pred=predictService({vehicleId:v.id});
if(pred&&pred.ok&&Array.isArray(pred.items)){
pred.items.filter((it)=>it.status==='lewat').forEach((it)=>overdue.push({vehicleName:v.name,categoryName:it.categoryName,sisaKm:it.sisaKm}));
}
});
return{trigger:overdue.length>0,overdue};
}

// ---------------------------------------------------------------------------
// Rule kedua VEHICLE (keputusan produk dikonfirmasi user):
// 'vehicle-fuel-efficiency-drop' — konsumsi BBM (km/liter) pengisian FULL
// TANK terakhir turun ≥20% dari rata-rata histori sebelumnya. SENGAJA tidak
// menduplikasi/mengubah fuelEfficiency()/estimateRpPerKm() di atas (yang
// menghitung km/liter GABUNGAN semua histori, bukan per-segmen) —
// _vehicleFuelEfficiencyDropCheck() menghitung km/liter PER PASANGAN log full
// tank berurutan sendiri, lalu membandingkan segmen TERAKHIR vs rata-rata
// segmen SEBELUMNYA. Ambang drop (default 20%) BISA DIATUR user (Sesi
// lanjutan, pola sama dgn getAIFinanceOverspendThreshold/getAIDeliveryThin-
// MarginThreshold) lewat D.profile.aiVehicleFuelDropThresholdPct, field baru
// di Pengaturan > 🤖 AI Asisten. Minimal 3 segmen historis TETAP DIHARDCODE
// (bukan ambang sensitivitas, tapi syarat data cukup secara statistik).
// ---------------------------------------------------------------------------
const AI_VEHICLE_FUEL_DROP_DEFAULT_PCT=20;

// getAIVehicleFuelDropThreshold()/setAIVehicleFuelDropThreshold(pct) —
// getter/setter D.profile.aiVehicleFuelDropThresholdPct, dipakai field
// Pengaturan (renderSettings()/autoSaveProfile()) & rule di bawah. Dijaga
// di rentang 5-90 (di bawah 5% terlalu sensitif/noise wajar, di atas 90%
// nyaris tidak pernah trigger).
function getAIVehicleFuelDropThreshold(){
const v=D.profile&&D.profile.aiVehicleFuelDropThresholdPct;
return(typeof v==='number'&&v>=5&&v<=90)?v:AI_VEHICLE_FUEL_DROP_DEFAULT_PCT;
}
function setAIVehicleFuelDropThreshold(pct){
const n=parseFloat(pct);
D.profile.aiVehicleFuelDropThresholdPct=(Number.isFinite(n)&&n>=5&&n<=90)?n:AI_VEHICLE_FUEL_DROP_DEFAULT_PCT;
return D.profile.aiVehicleFuelDropThresholdPct;
}

function _vehicleFuelEfficiencyDropCheck(){
const thresholdPct=getAIVehicleFuelDropThreshold();
const drops=[];
(D.vehicles||[]).forEach((v)=>{
const logs=(D.bbmLogs||[]).filter((b)=>b.vehicleId===v.id&&b.fullTank&&isFinite(b.km)&&b.km>0&&b.liter>0).sort((a,b)=>a.km-b.km);
if(logs.length<4)return; // butuh min. 3 segmen historis + 1 segmen terakhir yg dibandingkan
const segments=[];
for(let i=1;i<logs.length;i++){
const kmDiff=logs[i].km-logs[i-1].km;
if(kmDiff<=0)continue;
segments.push(kmDiff/logs[i].liter);
}
if(segments.length<4)return;
const last=segments[segments.length-1];
const prevSegs=segments.slice(0,-1);
const avgPrev=prevSegs.reduce((s,x)=>s+x,0)/prevSegs.length;
if(avgPrev<=0)return;
const dropPct=Math.round((1-last/avgPrev)*100);
if(dropPct>=thresholdPct)drops.push({vehicleId:v.id,vehicleName:v.name,dropPct,last,avgPrev,thresholdPct});
});
return{trigger:drops.length>0,drops,thresholdPct};
}

let _vehicleAIRulesRegistered=false;
// registerVehicleAIRules() — dipanggil sekali saat boot (self-test.js
// init()), idempotent lewat guard, return false kalau AIDecision belum ada.
function registerVehicleAIRules(){
if(_vehicleAIRulesRegistered)return false;
if(typeof AIDecision==='undefined'||!AIDecision.rules||typeof AIDecision.rules.register!=='function')return false;
AIDecision.rules.register({
id:'vehicle-service-overdue',
category:'vehicle',
severity:'warning',
weight:5,
cooldownHours:24,
description:'Ada kendaraan dengan item servis yang sudah lewat jatuh tempo (predictService status="lewat").',
condition:()=>_vehicleOverdueCheck().trigger,
action:()=>{
const c=_vehicleOverdueCheck();
const first=c.overdue[0];
const extra=c.overdue.length>1?` (+${c.overdue.length-1} item lain)`:'';
return{message:`Servis lewat jatuh tempo: ${first.vehicleName} — ${first.categoryName} (${Math.abs(first.sisaKm)} km lewat batas)${extra}.`};
},
});
AIDecision.rules.register({
id:'vehicle-fuel-efficiency-drop',
category:'vehicle',
severity:'info',
weight:3,
cooldownHours:72,
description:'Konsumsi BBM (km/liter) pengisian Full Tank terakhir turun ≥ambang % (bisa diatur user) dari rata-rata histori sebelumnya (min. 4 log Isi Full Tank berurutan).',
condition:()=>_vehicleFuelEfficiencyDropCheck().trigger,
action:()=>{
const c=_vehicleFuelEfficiencyDropCheck();
const first=c.drops[0];
const extra=c.drops.length>1?` (+${c.drops.length-1} kendaraan lain)`:'';
const message=`Konsumsi BBM ${first.vehicleName} turun ${first.dropPct}% dari biasanya (skrg ${first.last.toFixed(1)} km/L vs rata-rata ${first.avgPrev.toFixed(1)} km/L, ambang ${first.thresholdPct}%)${extra}.`;
// Sesi 12 — cross-engine: LogisticsEngine.fuelCalculator() (Tahap 3, sudah
// ADA & teruji) dipakai di sini utk hitung selisih biaya BBM per 100km
// akibat penurunan efisiensi, BUKAN rumus baru yg ditulis ulang di sini.
// Guard typeof supaya fallback ke message-only (perilaku lama) kalau
// LogisticsEngine/estimateRpPerKm belum ter-load atau histori harga BBM
// kendaraan ini belum cukup (estimateRpPerKm return null).
if(typeof LogisticsEngine==='undefined'||typeof LogisticsEngine.fuelCalculator!=='function'||typeof estimateRpPerKm!=='function'){
return{message};
}
const est=estimateRpPerKm(first.vehicleId);
if(!est||!est.avgHarga){
return{message};
}
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
const sekarang=LogisticsEngine.fuelCalculator({jarak:100,konsumsiKmPerLiter:first.last,hargaBBM:est.avgHarga});
const biasanya=LogisticsEngine.fuelCalculator({jarak:100,konsumsiKmPerLiter:first.avgPrev,hargaBBM:est.avgHarga});
const selisih=sekarang.biayaBBM-biasanya.biayaBBM;
return{
message,
title:'Cek performa BBM kendaraan',
affectedModules:['vehicle','finance'],
estimatedImpact:{
biayaBBMPer100kmSekarang:fmt(sekarang.biayaBBM),
biayaBBMPer100kmBiasanya:fmt(biasanya.biayaBBM),
selisihPer100km:(selisih>=0?'+':'')+fmt(selisih),
},
actions:['Cek filter udara & tekanan ban','Jadwalkan servis bila performa terus turun'],
};
},
});
_vehicleAIRulesRegistered=true;
return true;
}
