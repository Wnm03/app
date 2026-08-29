// sparepart-servis.js — Domain Sparepart & Servis kendaraan: kategori & stok sparepart
// (Sparepart), catatan servis (wrapper ke Servis di car-notes.js),
// interval servis per-kategori & override per-kendaraan, katalog referensi TORSI_DB/VEHICLE_SPEC_DB
// & skala kunci torsi (MY_WRENCH_SCALE), serta filter kartu Pengingat Servis di Dashboard.
// (Audit ukuran file, sesi split lanjutan): file ini dipecah jadi 2 --
// SparepartCsvImport/TORSI_DB/VEHICLE_SPEC_DB/wrapper Servis/fitur AI
// kendaraan (predictService dkk) dipindah ke
// modules/vehicle/sparepart-servis-b.js (harus dimuat SETELAH file ini,
// lihat scripts/build.js). Titik potong: tepat setelah `window.Sparepart =
// Sparepart;`. 0 logika diubah.
// Dipindah ke modules/vehicle/sparepart-servis.js (Sesi 8 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari tukang-absensi.js (2026-07-12, split file besar bagian ke-3,
// lanjutan langsung dari bagian ke-1 Chat Action & ke-2 Storage/Archive di sesi yang sama).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) — lihat urutan grup di
// header tukang-absensi.js. Ditempatkan tepat setelah features-tukang-kendaraan-
// storage.js (sumber pemisahan) & data-archive.js, sebelum features-aiwidget-reminder-gdrive-search.js
// (yang memanggil getEffectiveIntervalKm() dari file ini).
// catVisibleForVehicle(cat,vehicleId) — S622 (permintaan user: pengingat servis
// per part, kategori part & stok sparepart harus punya cakupan SENDIRI-SENDIRI
// per kendaraan, bukan 1 daftar global yg numpuk sama utk semua kendaraan).
// cat.vehicleId BARU (opsional, backward compatible): null/undefined = kategori
// UNIVERSAL (perilaku lama, tetap tampil di semua kendaraan -- supaya kategori
// lama yg sudah ada tidak tiba-tiba hilang). Kalau diisi salah satu id
// kendaraan, kategori itu HANYA tampil/dipakai utk kendaraan tsb.
function catVisibleForVehicle(cat,vehicleId){
if(!cat)return false;
if(!cat.vehicleId)return true;
if(!vehicleId)return true;
return cat.vehicleId===vehicleId;
}
// resolveServisCatForVehicle(name,vehicleId) — BUGFIX (audit sesi ini,
// lanjutan S622/S629): sejak kategori sparepart bisa di-scope ke 1 kendaraan
// spesifik (cat.vehicleId, lihat catVisibleForVehicle() di atas), kartu
// Pengingat Servis Dashboard SUDAH benar memfilter per kendaraan. Tapi
// titik-titik yang MENCARI kategori saat MENYIMPAN servis (Servis._saveInner
// & onItemAutofillInterval & prefill edit di car-notes.js, plus
// _resolveServisCategoryId() versi sinkron Transaksi di tx-servis.js) masih
// pakai `D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase())`
// polos -- cari cocok nama scr GLOBAL, tanpa peduli kendaraan mana yang
// sedang aktif. Kalau 2 kendaraan sama-sama punya item bernama sama (mis.
// "Ganti Oli"), servis kendaraan B bisa ke-link ke kategori PRIVAT milik
// kendaraan A -- lalu di kartu Pengingat kendaraan B kategori itu disembunyikan
// (vehicleId-nya bukan B), jadi dari sudut pandang B histori servis "tidak
// kebaca" & interval yang diisi "tidak tersimpan" (padahal tersimpan, cuma ke
// kategori kendaraan lain).
// Fix: helper tunggal ini jadi SoT pencocokan nama->kategori yang sadar
// kendaraan aktif -- prioritas kategori yang benar-benar scoped ke
// vehicleId ybs, lalu fallback ke kategori UNIVERSAL (cat.vehicleId kosong),
// dan TIDAK PERNAH jatuh ke kategori privat milik kendaraan lain.
function resolveServisCatForVehicle(name,vehicleId){
const n=(name||'').trim().toLowerCase();
if(!n)return null;
const cats=(D.sparepartCats||[]).filter(c=>c&&c.name&&c.name.toLowerCase()===n);
if(!cats.length)return null;
return cats.find(c=>c.vehicleId&&c.vehicleId===vehicleId)||cats.find(c=>!c.vehicleId)||null;
}
// GENERIC_RECOMMEND_NAMES — FITUR BARU (permintaan user: "rekomendasi kategori
// part rutin servis sesuai pabrikan"). Daftar nama part/servis rutin yang UMUM
// dipakai sbg starting point rekomendasi kategori, dipisah per jenis kendaraan
// (v.jenis, field yg SUDAH ADA di vehicle-core.js — motor/mobil). Ini BUKAN
// data pabrikan (tidak ada nama part di sini yg diklaim resmi) — cuma daftar
// NAMA yg lalu di-lookup satu-satu lewat suggestServiceIntervalKm() (SUDAH
// ADA di file ini, dideklarasikan di bawah — dipanggil hanya lewat
// Sparepart.recommendCategories() saat runtime, jadi urutan deklarasi top-
// level ini aman) supaya intervalnya: (1) dari TORSI_DB kendaraan aktif kalau
// match by nama (data manual resmi, ada sourceNote-nya), atau (2) fallback ke
// FALLBACK_KEYWORDS (rule-of-thumb, dilabeli eksplisit "bukan dari buku manual
// kendaraan spesifik ini" oleh suggestServiceIntervalKm() sendiri) — 0 logic
// interval baru diciptakan di sini, 100% reuse.
const GENERIC_RECOMMEND_NAMES={
motor:['Oli Mesin','Filter Oli','Oli Gardan','Busi','Filter Udara','Kampas Rem','V-Belt CVT','Roller CVT','Minyak Rem','Aki','Ban Depan'],
mobil:['Oli Mesin','Filter Oli','Oli Transmisi','Busi','Filter Udara','Filter AC','Kampas Rem','Minyak Rem','Aki','Coolant','Timing Belt','Ban Depan'],
listrik:['Kampas Rem','Minyak Rem','Aki','Ban Depan'],
};
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
// getEffectiveIntervalBulan(cat) — FITUR BARU (permintaan user: "Interval
// Waktu"): interval berbasis WAKTU (bulan) opsional per kategori, independen
// dari getEffectiveIntervalKm() di atas -- dipakai utk kategori yg idealnya
// diingatkan berbasis waktu juga, bukan cuma km (mis. Minyak Rem/Aki, yg bisa
// menurun kualitasnya meski kendaraan jarang dipakai). TIDAK ada override
// per-kendaraan (beda dari intervalKm) -- cukup 1 field global per kategori
// (cat.intervalBulan). Backward compatible: null/undefined/0 berarti
// kategori ini TIDAK pakai interval waktu (perilaku lama, murni km).
function getEffectiveIntervalBulan(cat){
return(cat&&cat.intervalBulan>0)?cat.intervalBulan:null;
}
// getLastServiceDateForCat(vehicleId,cat) — twin TANGGAL dari
// getLastServiceKmForCat()/Servis.getLastServiceKmForCat() (car-notes.js):
// cari log servis TERAKHIR utk kategori ini (reuse servisLogMatchesCat() yg
// sama persis, 0 logic pencocokan baru) & balikin field .date-nya (ISO
// string), null kalau belum pernah dicatat servis dgn tanggal terisi.
function getLastServiceDateForCat(vehicleId,cat){
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&s.date&&servisLogMatchesCat(s,cat))
.sort((a,b)=>new Date(b.date)-new Date(a.date));
return logs.length?logs[0].date:null;
}
// monthsSinceISO(dateISO,nowISO) — selisih waktu (bulan, desimal) antara 2
// tanggal ISO, dipakai computeServiceUrgency() di bawah. Pakai konstanta
// rata-rata hari/bulan (30.4368 -- 365.2425/12, standar astronomis) supaya
// hasilnya konsisten & tidak tergantung bulan spesifik mana yg dilewati.
function monthsSinceISO(dateISO,nowISO){
if(!dateISO)return null;
const a=new Date(dateISO),b=nowISO?new Date(nowISO):new Date();
if(isNaN(a)||isNaN(b))return null;
return(b-a)/86400000/30.4368;
}
// computeServiceUrgency({vehicleId,cat,curKm,kmPerDay,nowISO}) — FITUR BARU,
// SATU-SATUNYA titik hitung status/sisa servis yg sadar 2 sumbu (km & bulan).
// Dihitung sbg FRAKSI SISA tiap sumbu (fracRemainKm/fracRemainBulan --
// 1=baru diservis .. 0=pas jatuh tempo .. negatif=lewat) -- satu-satunya
// cara valid membandingkan km vs bulan scr adil (unit beda, angka mentah
// tidak bisa dibandingkan langsung). Axis dgn fraksi PALING KECIL yg dipakai
// ("mana yang lebih dulu tercapai", konvensi servis standar km-ATAU-bulan).
// Kalau intervalBulan tidak diisi (getEffectiveIntervalBulan balikin null),
// fungsi ini SECARA MATEMATIS identik dgn formula km lama (predictService()
// versi sebelumnya) -- 0 perubahan perilaku utk data existing yg cuma pakai
// interval km. sisaKm TETAP dibalikin apa adanya (dipakai sort ascending di
// predictService(), TIDAK diubah supaya urutan kategori pure-km tidak
// berubah/regresi).
function computeServiceUrgency({vehicleId,cat,curKm,kmPerDay,nowISO}={}){
const lastKm=getLastServiceKmForCat(vehicleId,cat);
const intervalKm=getEffectiveIntervalKm(vehicleId,cat);
const jarakTempuh=lastKm===null?curKm:curKm-lastKm;
const sisaKm=intervalKm-jarakTempuh;
const fracRemainKm=intervalKm>0?sisaKm/intervalKm:null;
const intervalBulan=getEffectiveIntervalBulan(cat);
let sisaBulan=null,fracRemainBulan=null;
if(intervalBulan){
const lastDate=getLastServiceDateForCat(vehicleId,cat);
const elapsedBulan=lastDate?monthsSinceISO(lastDate,nowISO):0;
sisaBulan=intervalBulan-elapsedBulan;
fracRemainBulan=sisaBulan/intervalBulan;
}
let limitingAxis='km',frac=fracRemainKm;
if(fracRemainBulan!=null&&(frac==null||fracRemainBulan<frac)){limitingAxis='bulan';frac=fracRemainBulan;}
const status=frac==null?'aman':(frac<=0?'lewat':(frac<=0.15?'segera':'aman'));
const estDateISO=(typeof estimateServiceDateISO==='function')?estimateServiceDateISO(sisaKm,kmPerDay):null;
return{sisaKm,intervalKm,sisaBulan,intervalBulan,limitingAxis,status,estDateISO};
}
// recommendIntervalKm(vehicleId,cat) -- FITUR BARU (audit, gap "interval
// servis 100% statis, tidak ada rekomendasi berbasis data"): getEffectiveIntervalKm()
// di atas cuma baca cat.intervalKm (default manual admin) atau
// veh.intervalOverrides (override manual user) -- TIDAK PERNAH dibandingkan
// dgn pola servis AKTUAL (D.servisLogs). Fungsi ini murni MEMBACA histori yg
// sudah ada (reuse servisLogMatchesCat() apa adanya, 0 rumus status baru) &
// menghitung rata-rata jarak KM antar servis kategori ybs utk 1 kendaraan --
// hasilnya cuma ANGKA REKOMENDASI (disarankan), TIDAK PERNAH menimpa
// interval manapun sendiri. Minimal 2 servis (1 jeda) supaya ada data
// pembanding; kalau kurang dari itu balikin {ok:false} (histori belum cukup).
function recommendIntervalKm(vehicleId,cat){
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&s.km>0&&servisLogMatchesCat(s,cat)).sort((a,b)=>a.km-b.km);
if(logs.length<2)return{ok:false,reason:'Belum cukup histori servis (min. 2 catatan dgn KM terisi)',count:logs.length};
const deltas=[];
for(let i=1;i<logs.length;i++){
const d=logs[i].km-logs[i-1].km;
if(d>0)deltas.push(d);
}
if(!deltas.length)return{ok:false,reason:'Data KM histori tidak berurutan naik, tidak bisa dihitung',count:logs.length};
const avg=Math.round(deltas.reduce((s,d)=>s+d,0)/deltas.length/100)*100;
return{ok:true,avgKm:avg,count:logs.length,sampleCount:deltas.length};
}
// historyMatchesName(log,nameLower) -- versi generik servisLogMatchesCat()
// di atas, tapi menerima STRING nama part langsung (bukan objek kategori) --
// FITUR BARU (audit, gap "recommendCategories() tidak baca riwayat servis
// sama sekali"): dipakai buat cross-check kandidat rekomendasi (baik yg
// sudah match TORSI_DB/generic MAUPUN kandidat baru murni dari riwayat)
// terhadap D.servisLogs SEBELUM kategori resminya ada -- makanya tidak bisa
// pakai cat.id spt servisLogMatchesCat(). Logic fuzzy sama persis (exact +
// includes 2 arah), tanpa cek categoryId.
function historyMatchesName(log,nameLower){
const item=(log.item||'').toLowerCase().trim();
if(!item||!nameLower)return false;
if(item===nameLower)return true;
if(item.includes(nameLower))return true;
if(nameLower.includes(item)&&item.length>=4)return true;
return false;
}
// historyStatsForName(vehicleId,name) -- FITUR BARU (audit, gap 2 hal:
// (1) kandidat yg sudah sering dicatat manual di riwayat servis tapi belum
// py kategori resmi tetap direkomendasikan sbg kategori "baru" tanpa
// ditandai sudah dikenal; (2) intervalKm rekomendasi cuma dari buku
// manual/estimasi umum, tidak pernah dibandingkan dgn pola servis ASLI
// kendaraan ybs). Reuse pola persis recommendIntervalKm() di atas (rata2
// jarak KM antar catatan, min. 2 data), cuma filternya lewat
// historyMatchesName() by teks nama -- krn kandidat blm tentu py kategori
// resmi/cat.id. Murni baca D.servisLogs, 0 tulis.
function historyStatsForName(vehicleId,name){
const nameLower=(name||'').trim().toLowerCase();
if(!nameLower)return{count:0,avgKm:null};
const logs=(D.servisLogs||[]).filter(s=>s.vehicleId===vehicleId&&historyMatchesName(s,nameLower));
const withKm=logs.filter(s=>s.km>0).sort((a,b)=>a.km-b.km);
let avgKm=null;
if(withKm.length>=2){
const deltas=[];
for(let i=1;i<withKm.length;i++){
const d=withKm[i].km-withKm[i-1].km;
if(d>0)deltas.push(d);
}
if(deltas.length)avgKm=Math.round(deltas.reduce((s,d)=>s+d,0)/deltas.length/100)*100;
}
return{count:logs.length,avgKm};
}
async function editVehicleIntervalOverride(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
const veh=D.vehicles.find(v=>v.id===curVehicleId);
if(!veh){toast('⚠️ Pilih kendaraan dulu');return;}
const current=getEffectiveIntervalKm(curVehicleId,cat);
const reko=recommendIntervalKm(curVehicleId,cat);
const rekoLine=(reko.ok&&Math.abs(reko.avgKm-current)>=100)?`\n\n💡 Dari ${reko.sampleCount} jeda servis terakhir (${reko.count} catatan), rata-rata kamu servis tiap ~${reko.avgKm.toLocaleString('id-ID')} km -- beda dari interval saat ini (${current.toLocaleString('id-ID')} km). Ini cuma saran, isi angka manapun yang kamu mau.`:'';
const val=await showPromptModal({title:'Interval Khusus '+veh.name,message:`Interval "${cat.name}" khusus untuk ${veh.emoji||'🏍️'} ${veh.name} (KM). Kosongkan/0 untuk pakai default global (${cat.intervalKm.toLocaleString('id-ID')} km, dipakai semua kendaraan lain).${rekoLine}`,icon:'🔧',inputType:'number',defaultValue:current});
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
// _renderSuggestBox(name) -- helper bersama Sparepart.suggestInterval()/
// Sparepart.autoSuggestInterval() (FITUR BARU, audit user: EDIT kategori
// existing kini auto-isi box AI tanpa tap tombol), 0 rumus baru, cuma
// extract innerHTML-building yg sudah ada (suggestServiceIntervalKm(),
// dideklarasikan di bawah tapi aman krn function declaration di-hoist)
// supaya tidak duplikat antara versi manual (toast kalau nama kosong) &
// versi otomatis (diam2 kalau kosong).
function _renderSuggestBox(name){
const boxEl=document.getElementById('sparepartAiSuggestBox');
if(!boxEl)return;
const reko=(typeof suggestServiceIntervalKm==='function')?suggestServiceIntervalKm(name,curVehicleId):null;
boxEl.classList.remove('u-dnone');
if(!reko){
boxEl.innerHTML=`<div class="u-fs12 u-t2">🤖 Belum ada rekomendasi pasti utk "${escapeHtml(name)}" di data buku panduan yang tersimpan. Isi manual sesuai buku servis kendaraanmu ya.</div>`;
return;
}
boxEl.innerHTML=`<div class="u-fs12" style="line-height:1.5"><b>🤖 Rekomendasi: setiap ${reko.km.toLocaleString('id-ID')} km</b><br><span class="u-t2">Sumber: ${escapeHtml(reko.source)}</span></div><button type="button" class="btn btn-primary btn-sm u-mt6" data-action="applySparepartIntervalSuggestion" data-args="${escapeHtml(JSON.stringify([reko.km]))}">✅ Pakai Angka Ini</button>`;
}
const Sparepart={
catEditIdx:null,
stockEditIdx:null,
_catalogNameCache:[],
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
// S622: cek dulu vehicleId LANGSUNG di stok itu sendiri (field baru, diisi
// otomatis saat item stok dibuat -- lihat saveStock()) SEBELUM fallback ke
// heuristik lama lewat catalogId/compatibleVehicleIds di bawah. part.vehicleId
// kosong (stok lama sebelum field ini ada) tetap fail-open ke heuristik lama.
isPartForVehicle(part,vehicleId){
if(!vehicleId||!part)return true;
if(part.vehicleId)return part.vehicleId===vehicleId;
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
// populateDatalist() -- BUGFIX (laporan user, Sesi 545): dropdown "Jenis
// Servis/Item" di modal Catat Servis/Sparepart tidak muncul sama sekali di
// beberapa mobile WebView (mis. Brave/Chrome Android). Root cause: field ini
// dulu pakai native <input list="sparepartDatalist"> (HTML5 datalist),
// tapi popup datalist TIDAK reliable di banyak WebView Android -- kadang
// tidak tampil apa pun walau opsinya sudah terisi. Field-field lain di app
// ini (billName, pName, stockName, sparepartName, dst) SEMUA sudah pakai
// pola autocomplete custom yang terbukti jalan (simpleAutocompleteInput() +
// div.suggest-box, lihat modules/finance/transaksi.js) -- servisItem
// dulu-nya satu-satunya field yang masih pakai datalist native. Fix: markup
// <datalist id="sparepartDatalist"> dihapus dari servisModal (lihat
// modals.js), diganti div#servisItemSuggestBox yang di-render oleh
// Servis.onItemInputSuggest()/selectItemSuggestion() (car-notes.js), sumber
// datanya dari getItemSuggestions() di bawah. Fungsi populateDatalist() ini
// DIPERTAHANKAN (titik panggilnya di openModal()/renderCatList() TIDAK
// diubah) tapi isinya sekarang cuma mengisi cache nama part Katalog Suku
// Cadang (VehicleCatalog, async) yang dipakai getItemSuggestions() --
// kategori & stok sudah sinkron langsung dari D tiap kali disuggest, tidak
// perlu di-cache.
// populateDatalist() -- BUGFIX (audit user, Sesi 549): cache nama part
// Katalog Suku Cadang dulu diisi dari SEMUA kendaraan tanpa filter, beda
// dgn dropdown "Part dari Vehicle Catalog" (servisCatalogPartId) di modal
// yang sama yang SUDAH difilter pakai VehicleCatalog.filterForVehicle().
// Fix: filter di sini juga pakai fungsi yang sama (0 fungsi baru), pakai
// curVehicleId (kendaraan aktif) yang saat ini dipilih. Part universal
// (compatibleVehicleIds kosong/belum diisi) tetap ikut tampil di kendaraan
// mana pun -- perilaku sama seperti filterForVehicle()/isPartForVehicle()
// di tempat lain (fail-open, backward compatible, 0 data lama hilang).
populateDatalist(){
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function';
if(!hasCatalog)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
VehicleCatalog.getAll().then(items=>{
const filtered=(typeof VehicleCatalog.filterForVehicle==='function')?VehicleCatalog.filterForVehicle(items,vid):(items||[]);
Sparepart._catalogNameCache=(filtered||[]).map(it=>it.partName).filter(Boolean);
}).catch(()=>{});
},
// getItemSuggestions() -- gabungan (1) nama Kategori Sparepart, (2) nama
// item Stok Sparepart yang masih ada stoknya (qty>0), (3) nama part Katalog
// Suku Cadang (dari cache populateDatalist() di atas, sudah difilter per
// kendaraan aktif -- lihat catatan di populateDatalist()). Dedup case-
// insensitive, sama persis sumber & urutan gabungan datalist lama (Sesi
// 297) -- cuma cara tampilnya yang berubah (suggest-box, bukan datalist).
// BUGFIX (audit user, Sesi 549): Stok Sparepart (D.partsStock) dulu ikut
// SEMUA item tanpa pandang kendaraan aktif, padahal Sparepart.isPartForVehicle()
// sudah ada & dipakai persis utk kasus yang sama di dropdown "Gunakan Stok
// Sparepart" (lihat baris ~412 di file ini). Fix: reuse fungsi yang sama
// di sini juga -- 0 fungsi baru, 0 skema data baru.
getItemSuggestions(){
const names=new Map();
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
// BUGFIX (audit lanjutan, gap yang sama dgn resolveServisCatForVehicle()):
// dulu SEMUA D.sparepartCats ikut jadi sumber saran tanpa filter kendaraan
// -- beda dgn Stok Sparepart (partsStock, sudah pakai isPartForVehicle()) &
// Katalog Suku Cadang (_catalogNameCache, sudah pakai filterForVehicle())
// di bawahnya yang SUDAH benar. Efeknya: suggest-box "Jenis Servis/Item"
// bisa nawarin nama kategori PRIVAT milik kendaraan lain, membingungkan
// (walau kalau dipilih tetap aman krn save() sudah lewat
// resolveServisCatForVehicle() -- ini murni perbaikan relevansi saran).
D.sparepartCats.forEach(c=>{ if(c.name&&catVisibleForVehicle(c,vid)) names.set(c.name.toLowerCase(),c.name); });
D.partsStock.forEach(p=>{ if(p.name&&p.qty>0&&Sparepart.isPartForVehicle(p,vid)&&!names.has(p.name.toLowerCase())) names.set(p.name.toLowerCase(),p.name); });
(Sparepart._catalogNameCache||[]).forEach(n=>{ if(n&&!names.has(n.toLowerCase()))names.set(n.toLowerCase(),n); });
return Array.from(names.values());
},
// renderCatList() -- S622: skrg CUMA tampilkan kategori milik kendaraan aktif
// (curVehicleId) + kategori UNIVERSAL (cat.vehicleId kosong), supaya "Kelola
// Kategori Sparepart" jadi cakupan per-kendaraan juga (sinkron dgn Pengingat
// Servis di renderReminder() & Stok Sparepart di renderStockList()). Filter
// pakai findIndex ke D.sparepartCats supaya index utk edit/delete tetap
// benar ke array ASLI (bukan index dari hasil filter).
renderCatList(){
const el=document.getElementById('sparepartCatList');
if(!el)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const visible=D.sparepartCats.filter(c=>catVisibleForVehicle(c,vid));
if(!visible.length){el.innerHTML='<div class="empty"><div class="empty-text">Belum ada kategori sparepart utk kendaraan ini</div></div>';return;}
// Sesi 295 (permintaan eksplisit user): tiap baris sekarang menunjukkan apakah
// kategori ini AKTIF tampil di 🔔 Pengingat Servis atau tidak -- baik karena
// belum diatur intervalnya (intervalKm 0, biasanya hasil scan Katalog Suku
// Cadang) maupun karena user sengaja menyembunyikannya (showInReminder:false).
// Tap badge status utk toggle langsung tanpa buka modal edit.
el.innerHTML=visible.map((c)=>{
const i=D.sparepartCats.indexOf(c);
const noInterval=!(c.intervalKm>0);
const hidden=c.showInReminder===false;
const inactive=noInterval||hidden;
const metaText=noInterval?'⚠️ Belum diatur interval servis':'Setiap '+c.intervalKm.toLocaleString('id-ID')+' km'+((c.intervalBulan>0)?' atau '+c.intervalBulan.toLocaleString('id-ID')+' bln':'');
const statusBadge=noInterval
?`<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent2-soft,rgba(230,80,80,.12));color:var(--accent2,#e65050)">⚠️ Tanpa interval</span>`
:(hidden
?`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Tap utk tampilkan lagi di Pengingat Servis">🙈 Disembunyikan dari Pengingat</span>`
:`<span class="u-fs11 u-fw700 u-r6 u-pointer" data-action="toggleSparepartShowInReminder" data-args="${escapeHtml(JSON.stringify([c.id]))}" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)" title="Tap utk sembunyikan dari Pengingat Servis">🔔 Tampil di Pengingat</span>`);
const veh=c.vehicleId?D.vehicles.find(v=>v.id===c.vehicleId):null;
const vehBadge=c.vehicleId
?`<span class="u-fs11 u-fw700 u-r6 u-ml4" style="padding:2px 7px;background:var(--accent-soft);color:var(--accent)" title="Kategori khusus kendaraan ini">${veh?(veh.emoji||'🏍️')+' '+escapeHtml(veh.name):'🏍️ Kendaraan lain'}</span>`
:`<span class="u-fs11 u-fw700 u-r6 u-ml4" style="padding:2px 7px;background:var(--surface3);color:var(--text2)" title="Berlaku semua kendaraan">🌐 Semua kendaraan</span>`;
return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">🔩</div><div class="tx-info"><div class="tx-name">${escapeHtml(c.name)} <span class="u-fs12 u-fw700 u-cacc u-bgaccsoft u-r6 u-ml4" style="padding:1px 6px">${escapeHtml(c.code||codeFromName(c.name))}</span></div><div class="tx-meta"${inactive?' style="color:var(--text3)"':''}>${metaText}</div><div class="u-mt4">${statusBadge}${vehBadge}</div></div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openSparepartModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button><button class="tx-del" data-action="delSparepart" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
Sparepart.populateDatalist();
Sparepart.populateStockCatSelect();
},
// openRecommendBox()/renderRecommendBox() — UI utk recommendCategories() di
// atas. Checklist tercentang default (pola sama persis modal preview
// syncFromCatalog(), tapi di sini inline langsung di halaman, bukan modal
// askConfirm, supaya user bisa uncheck per-item sebelum commit). Div target
// #sparepartRecommendBox ada di index.html, tepat di bawah tombol pemicu.
openRecommendBox(){
const box=document.getElementById('sparepartRecommendBox');
if(!box)return;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
if(!vid){toast('⚠️ Pilih kendaraan dulu di atas');return;}
const reko=Sparepart.recommendCategories(vid);
box.classList.remove('u-dnone');
if(!reko.ok){box.innerHTML='<div class="u-fs12 u-t2">'+escapeHtml(reko.reason)+'</div>';return;}
if(!reko.all.length){box.innerHTML='<div class="u-fs12 u-t2">🤖 Semua kategori rekomendasi utk "'+escapeHtml(reko.vehicleName)+'" sudah ada di daftar kategori kendaraan ini.</div>';return;}
const rows=reko.all.map((r,i)=>{
const badge=r.tier==='manual'
?'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent3-soft,rgba(80,180,120,.12));color:var(--accent3,#3fa66f)">📖 Buku manual</span>'
:r.tier==='history'
?'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--accent-soft);color:var(--accent)">📝 Riwayat servis</span>'
:'<span class="u-fs11 u-fw700 u-r6" style="padding:2px 7px;background:var(--surface3);color:var(--text2)">🤖 Estimasi umum</span>';
// histNote -- FITUR BARU: kalau kandidat ini (tier manual/generic) juga
// sudah pernah dicatat manual di riwayat servis kendaraan ini
// (r.history.count>0, lihat historyStatsForName()), tampilkan sbg
// info tambahan -- termasuk pola KM asli (avgKm) kalau beda >=100km
// dari angka rekomendasi, sbg pembanding (bukan menimpa intervalKm).
// Tier 'history' sendiri tidak perlu histNote krn sudah jelas dari badge.
const histNote=(r.tier!=='history'&&r.history&&r.history.count>0)
?`<div style="font-size:11px;color:var(--accent3,#3fa66f);margin-top:2px">📝 Sudah dicatat ${r.history.count}x di riwayat servis kendaraan ini`+((r.history.avgKm&&Math.abs(r.history.avgKm-r.intervalKm)>=100)?` — rata-rata polamu tiap ~${r.history.avgKm.toLocaleString('id-ID')} km`:'')+`</div>`
:'';
return `<label style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">`
+`<input type="checkbox" class="sparepartRecoChk" data-idx="${i}" checked style="width:16px;height:16px;margin-top:2px;accent-color:var(--accent)">`
+`<span style="flex:1"><div style="font-size:13px;font-weight:600">${escapeHtml(r.name)} ${badge}</div>`
+`<div style="font-size:11px;color:var(--text2);margin-top:2px;line-height:1.5">Setiap ${r.intervalKm.toLocaleString('id-ID')} km — ${escapeHtml(r.source||'')}</div>${histNote}</span>`
+`</label>`;
}).join('');
box.innerHTML=`<div class="u-fs12 u-t2 u-mb8">💡 Rekomendasi kategori servis rutin utk <b>${escapeHtml(reko.vehicleName)}</b>. Kategori dgn badge 📖 diambil dari buku manual pabrikan yg sudah tersimpan; badge 📝 berarti sudah sering dicatat manual di riwayat servis kendaraan ini (interval dihitung dari pola KM aslimu); badge 🤖 adalah estimasi umum (bukan data pabrikan spesifik) — sesuaikan lagi kalau ada data resminya. Uncheck yg tidak perlu, lalu tambahkan.</div>`
+`<div id="sparepartRecoList">${rows}</div>`
+`<button type="button" class="btn btn-primary btn-full btn-sm u-mt10" data-action="Sparepart.commitRecommend">✅ Tambahkan yang Dicentang</button>`
+`<button type="button" class="btn btn-ghost btn-full btn-sm u-mt8" data-action="Sparepart.closeRecommendBox">✕ Tutup</button>`;
Sparepart._recoCache=reko.all;
},
closeRecommendBox(){
const box=document.getElementById('sparepartRecommendBox');
if(!box)return;
box.classList.add('u-dnone');
box.innerHTML='';
Sparepart._recoCache=null;
},
// commitRecommend() — buat kategori baru dari item yg dicentang di
// #sparepartRecommendBox, 1x save() di akhir (pola sama persis
// syncFromCatalog()). Kategori baru discope ke curVehicleId (SAMA seperti
// saveCat() manual), showInReminder:true, intervalKm dari rekomendasi.
commitRecommend(){
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
if(!vid||!Array.isArray(Sparepart._recoCache)){toast('⚠️ Rekomendasi sudah tidak tersedia, buka ulang');return;}
const checks=Array.from(document.querySelectorAll('.sparepartRecoChk'));
const chosen=checks.filter(c=>c.checked).map(c=>Sparepart._recoCache[parseInt(c.dataset.idx,10)]).filter(Boolean);
if(!chosen.length){toast('⚠️ Belum ada yang dicentang');return;}
let added=0;
chosen.forEach((r,idx)=>{
const already=D.sparepartCats.some(c=>catVisibleForVehicle(c,vid)&&c.name.trim().toLowerCase()===r.name.trim().toLowerCase());
if(already)return;
D.sparepartCats.push({id:'sp_'+Date.now()+'_reko_'+idx,name:r.name,code:codeFromName(r.name),intervalKm:r.intervalKm,showInReminder:true,vehicleId:vid});
added++;
});
save();
Sparepart.closeRecommendBox();
Sparepart.renderCatList();
if(typeof renderServisList==='function')renderServisList();
if(typeof renderDashboardServisReminder==='function')renderDashboardServisReminder();
toast('✅ '+added+' kategori rekomendasi ditambahkan');
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
// populateVehicleSelect() -- S622 mengisi dropdown "Berlaku untuk" di modal
// Kategori Sparepart maupun Stok Sparepart (elId beda2, dipanggil dari 2
// tempat). S629 (permintaan eksplisit user): dropdown ini DIKUNCI/disabled --
// SELALU otomatis mengikuti curVehicleId (tab kendaraan yg lagi aktif),
// baik utk tambah baru MAUPUN edit (termasuk kategori/stok lama yg tadinya
// "🌐 Semua kendaraan", begitu dibuka & disimpan otomatis pindah scope ke
// kendaraan tab aktif -- lihat saveCat()/saveStock()). Kalau tidak ada
// kendaraan aktif (curVehicleId kosong/tidak valid), tetap fallback ke
// "🌐 Semua kendaraan" (perilaku lama, select tetap dikunci).
// populateVehicleSelect() -- S622 mengisi dropdown "Berlaku untuk" di modal
// Kategori Sparepart maupun Stok Sparepart (elId beda2, dipanggil dari 2
// tempat). S629 (permintaan eksplisit user): dropdown ini DIKUNCI/disabled --
// SELALU otomatis mengikuti curVehicleId (tab kendaraan yg lagi aktif).
// FITUR BARU (audit user, lihat tests/sparepart-catmodal-vehicle-edit-audit
// .test.js): S629 dipertahankan HANYA utk TAMBAH baru (isEdit=false, wajar
// ikut tab aktif). Saat EDIT kategori/stok yg SUDAH ADA (isEdit=true),
// dropdown dibuka (enabled) supaya user bisa pindahkan manual ke kendaraan
// lain / ke "🌐 Semua kendaraan" -- nilai awal = vehicleId TERSIMPAN pada
// kategori/stok itu (currentValue), BUKAN dipaksa curVehicleId lagi.
populateVehicleSelect(elId,currentValue,isEdit){
const sel=document.getElementById(elId);
if(!sel)return;
sel.innerHTML='<option value="">🌐 Semua kendaraan</option>'+D.vehicles.map(v=>`<option value="${v.id}">${v.emoji||'🏍️'} ${escapeHtml(v.name)}</option>`).join('');
const hintId=elId==='sparepartVehicleId'?'sparepartVehicleHint':'stockVehicleHint';
const hintEl=document.getElementById(hintId);
if(isEdit){
const curValid=currentValue&&D.vehicles.some(v=>v.id===currentValue);
sel.value=curValid?currentValue:'';
sel.disabled=false;
if(hintEl){
const veh=curValid?D.vehicles.find(v=>v.id===currentValue):null;
hintEl.textContent=veh?`✏️ Khusus kendaraan: ${veh.emoji||'🏍️'} ${veh.name} — bisa dipindah manual`:'✏️ Berlaku "🌐 Semua kendaraan" — bisa dipindah manual ke kendaraan tertentu';
}
return;
}
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:'';
const vidValid=vid&&D.vehicles.some(v=>v.id===vid);
sel.value=vidValid?vid:'';
sel.disabled=true;
if(hintEl){
const veh=vidValid?D.vehicles.find(v=>v.id===vid):null;
hintEl.textContent=veh?`🔒 Otomatis khusus kendaraan tab aktif: ${veh.emoji||'🏍️'} ${veh.name}`:'🔒 Otomatis "🌐 Semua kendaraan" (tidak ada kendaraan aktif dipilih di tab atas)';
}
},
// ensureIntervalBulanField() — FITUR BARU: injeksi runtime input "Interval
// Waktu (Bulan, opsional)" ke modal Kategori Sparepart. Dipasang lewat JS
// (bukan ditambah permanen ke template HTML modal di modules/shared/modals.js)
// krn file itu di luar cakupan patch ini -- pendekatan ini SENGAJA no-op-safe
// kalau elemen anchor (#sparepartInterval) tidak ada di DOM (mis. test
// harness DOM stub minimal), supaya tidak pernah throw. Idempotent: kalau
// field-nya sudah pernah diinjeksi (buka-tutup modal berkali-kali), balikin
// elemen yg sudah ada, tidak duplikat.
ensureIntervalBulanField(){
let el=document.getElementById('sparepartIntervalBulan');
if(el)return el;
const anchor=document.getElementById('sparepartInterval');
if(!anchor||!anchor.parentNode)return null;
const wrap=document.createElement('div');
wrap.className='u-mt8';
wrap.innerHTML='<label class="u-fs12 u-t2 u-mb4" style="display:block">Interval Waktu (Bulan, opsional)</label>'
+'<input type="number" id="sparepartIntervalBulan" class="input" placeholder="mis. 6 (Minyak Rem, Aki, dll)" min="0">';
const host=anchor.closest('.u-mt8')||anchor.parentNode;
host.parentNode.insertBefore(wrap,host.nextSibling);
return document.getElementById('sparepartIntervalBulan');
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
const bulanEl=Sparepart.ensureIntervalBulanField();
if(bulanEl)bulanEl.value=(curCat&&curCat.intervalBulan>0)?curCat.intervalBulan:'';
Sparepart.populateVehicleSelect('sparepartVehicleId',curCat?curCat.vehicleId:null,isEdit);
// Sesi 295: toggle "Tampilkan di Pengingat Servis" -- default AKTIF utk
// kategori baru (perilaku lama, tidak berubah), ikut nilai tersimpan utk
// kategori existing (termasuk kategori auto-scan yg default false).
const showRemEl=document.getElementById('sparepartShowInReminder');
if(showRemEl)showRemEl.checked=curCat?curCat.showInReminder!==false:true;
// FITUR BARU (audit user): saat EDIT kategori existing, box rekomendasi AI
// diisi OTOMATIS (autoSuggestInterval(), tidak toast kalau kosong -- beda
// dari suggestInterval() manual) tanpa perlu tap tombol -- kalau TAMBAH
// baru, box tetap kosong/disembunyikan spt perilaku lama (nama masih kosong,
// belum ada yg bisa disarankan).
if(isEdit){
Sparepart.autoSuggestInterval();
} else {
const aiBoxEl=document.getElementById('sparepartAiSuggestBox');
if(aiBoxEl){aiBoxEl.classList.add('u-dnone');aiBoxEl.innerHTML='';}
}
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
if(wantShow&&(!interval||interval<=0)){toast('⚠️ Lengkapi interval servis, atau matikan toggle "Tampilkan di Pengingat Servis" kalau kategori ini cuma buat stok');return;}
const clash=matchingVehicleName(name);
if(clash){toast(`⚠️ "${name}" adalah nama kendaraan, bukan nama part/servis. Isi nama part yang mau diingatkan (mis. Oli Mesin, Ganti Ban, dll).`,4000);return;}
if(!code) code=codeFromName(name);
const intervalKm=(interval&&interval>0)?interval:0;
const intervalBulan=(intervalBulanRaw&&intervalBulanRaw>0)?intervalBulanRaw:0;
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
if(Sparepart.catEditIdx!==null){
D.sparepartCats[Sparepart.catEditIdx].name=name;
D.sparepartCats[Sparepart.catEditIdx].code=code;
D.sparepartCats[Sparepart.catEditIdx].intervalKm=intervalKm;
D.sparepartCats[Sparepart.catEditIdx].intervalBulan=intervalBulan;
D.sparepartCats[Sparepart.catEditIdx].showInReminder=wantShow;
D.sparepartCats[Sparepart.catEditIdx].vehicleId=vehicleId;
} else {
D.sparepartCats.push({id:'sp_'+Date.now(),name,code,intervalKm,intervalBulan,showInReminder:wantShow,vehicleId});
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
populateStockCatSelect(){
const sel=document.getElementById('stockCatId');
if(!sel)return;
const cur=sel.value;
const vid=(typeof curVehicleId!=='undefined')?curVehicleId:null;
const cats=D.sparepartCats.filter(c=>catVisibleForVehicle(c,vid));
sel.innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${c.id}">${escapeHtml(c.code||codeFromName(c.name))} — ${escapeHtml(c.name)}</option>`).join('');
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
const meta=[`${p.qty}${p.unit?' '+p.unit:''}`,cat?cat.name:null,p.price?'Rata2 '+fmtFull(p.price):null,p.lastPrice?'Terakhir '+fmtFull(p.lastPrice):null,p.lastPurchaseDate?'Dibeli '+p.lastPurchaseDate:null].filter(Boolean).join(' • ');
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
Object.assign(D.partsStock[Sparepart.stockEditIdx],{name,catId,code,qty,unit,minStock,price,note,vehicleId});
} else {
const np={id:'st_'+Date.now(),name,catId,code,qty,unit,minStock,price,note,vehicleId};
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
// BUGFIX (audit): sama seperti gap resolveServisCatForVehicle() -- match by
// nama di sini dulu GLOBAL, bisa numpang ke kategori PRIVAT milik kendaraan
// lain (cat.vehicleId beda) kalau nama kategori kebetulan sama. Sekarang
// sadar kendaraan lewat resolveServisCatForVehicle(), guard typeof spy tetap
// aman kalau dipanggil sebelum helper itu termuat.
let cat=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(catName,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===catName.toLowerCase());
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
let cat=D.sparepartCats.find(c=>c.name.toLowerCase()===nama.toLowerCase());
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
D.sparepartCats.push({id:'sp_'+Date.now()+'_'+created+'_'+updated,name:nama,code,intervalKm,intervalBulan,showInReminder});
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
const own=(typeof findTorsiDb==='function')?findTorsiDb(veh.name):null;
if(own&&Array.isArray(own.cats)){
own.cats.forEach(catGroup=>{
(catGroup.items||[]).forEach(item=>{
if(!item.interval||!item.name)return;
const key=item.name.trim().toLowerCase();
if(existing.has(key)||seen.has(key))return;
const km=(typeof _parseIntervalKmFromText==='function')?_parseIntervalKmFromText(item.interval):null;
if(!km)return;
seen.add(key);
tier1.push({name:item.name,intervalKm:km,tier:'manual',source:own.sourceNote});
});
});
}
const tier2=[];
const jenis=(veh.jenis&&GENERIC_RECOMMEND_NAMES[veh.jenis])?veh.jenis:'motor';
(GENERIC_RECOMMEND_NAMES[jenis]||[]).forEach(name=>{
const key=name.trim().toLowerCase();
if(existing.has(key)||seen.has(key))return;
const reko=(typeof suggestServiceIntervalKm==='function')?suggestServiceIntervalKm(name,vid):null;
if(!reko)return;
seen.add(key);
const isManual=!!(own&&reko.source===own.sourceNote);
tier2.push({name,intervalKm:reko.km,tier:isManual?'manual':'generic',source:reko.source});
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
// exportCategoryCSV() — pasangan Export utk parseCategoryCSV()/commitCategoryCSV()
// di atas, supaya round-trip CSV (Export -> edit di Excel/Sheets -> Import
// lagi) bisa dipakai sbg cara cepat edit massal Kategori Sparepart. Pola
// sama persis exportShopJSON() (shop-data-io-api.js): murni passthrough +
// download, 0 rumus baru. Header kolom SAMA PERSIS yang dibaca parseCategoryCSV().
exportCategoryCSV(){
const header='nama,kode,interval_km,interval_bulan,tampil_reminder';
const esc=(v)=>{
const s=String(v==null?'':v);
return /[",\n]/.test(s)?('"'+s.replace(/"/g,'""')+'"'):s;
};
const lines=[header].concat(D.sparepartCats.map(c=>[
esc(c.name),
esc(c.code||''),
esc(c.intervalKm>0?c.intervalKm:''),
esc(c.intervalBulan>0?c.intervalBulan:''),
esc(c.showInReminder===false?'tidak':'ya'),
].join(',')));
const blob=new Blob([lines.join('\n')],{type:'text/csv'});
const a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='kategori-sparepart-'+new Date().toISOString().split('T')[0]+'.csv';
a.click();
return lines.length-1;
}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Sparepart'][method]. `const Sparepart = {...}` di atas HANYA
// membuat binding lexical-scope (bukan properti window), pola fix sama
// persis window.FuelModal di modules/vehicle/fuel-modal.js / window.BBM,
// Servis, Torsi di car-notes.js (Sesi 345) — bug yang sama pernah terjadi
// & diperbaiki di sana. Tanpa baris ini, semua tombol data-action=
// "Sparepart.xxx" gagal diam-diam.
if (typeof Sparepart !== 'undefined') window.Sparepart = Sparepart;
