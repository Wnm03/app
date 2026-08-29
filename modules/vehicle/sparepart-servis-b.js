// modules/vehicle/sparepart-servis-b.js — lanjutan modules/vehicle/sparepart-servis.js
// (Audit ukuran file, lanjutan sesi split modules-render.js): file
// sparepart-servis.js dipecah jadi 2 supaya di bawah OVERSIZED_FILE_LINE_THRESHOLD
// (1600 baris, scripts/build.js). Titik potong di batas bersih: TEPAT SETELAH
// `window.Sparepart = Sparepart;` (baris terakhir object `Sparepart` di bagian
// PERTAMA) -- 0 logika diubah, murni dipindah baris demi baris.
// Isi file ini: object `SparepartCsvImport` (presenter modal import CSV kategori
// sparepart, pola sama ShopCsvImport), katalog referensi TORSI_DB/VEHICLE_SPEC_DB,
// skala kunci torsi MY_WRENCH_SCALE, seluruh fungsi wrapper global ke Servis
// (di car-notes.js) -- saveServis/delServis/markSparepartServiced dkk, & fitur
// prediksi/AI kendaraan (predictService, maintenanceForecast, registerVehicleAIRules,
// _vehicleOverdueCheck, _vehicleFuelEfficiencyDropCheck, _vehicleCapacityMissingCheck).
// Semua deklarasi di sini murni `function`/`const` top-level (bukan mixin
// Object.assign), jadi HARUS dimuat SETELAH sparepart-servis.js (lihat urutan
// di scripts/build.js) supaya fungsi-fungsi yang saling panggil (mis.
// getEffectiveIntervalKm/servisLogMatchesCat dari bagian PERTAMA) sudah
// terdaftar di scope global saat dipanggil runtime.

// SparepartCsvImport — presenter/wrapper modal `sparepartCsvImportModal`, pola
// SAMA PERSIS `ShopCsvImport` (shop-data-io-api.js): pilih file -> baca native
// File.text() -> parse (Sparepart.parseCategoryCSV) -> preview (badge 🆕 baru
// / 🔄 update) -> commit lewat Sparepart.commitCategoryCSV().
const SparepartCsvImport={
parsedRows:[],
open(){
this.parsedRows=[];
const fileEl=document.getElementById('sparepartCsvImportFile');
if(fileEl)fileEl.value='';
const box=document.getElementById('sparepartCsvImportPreview');
if(box)box.innerHTML='';
const btn=document.getElementById('sparepartCsvImportCommitBtn');
if(btn)btn.disabled=true;
openModal('sparepartCsvImportModal');
},
async onFileSelected(evt){
const file=evt.target.files&&evt.target.files[0];
const box=document.getElementById('sparepartCsvImportPreview');
const btn=document.getElementById('sparepartCsvImportCommitBtn');
if(!file){if(box)box.innerHTML='';if(btn)btn.disabled=true;return;}
if(box)box.innerHTML='<div class="u-fs12 u-t2">Membaca file...</div>';
try{
const text=await file.text();
this.parsedRows=Sparepart.parseCategoryCSV(text);
}catch(e){
toast('⚠️ Gagal membaca file CSV: '+(e&&e.message?e.message:'format tidak dikenali'));
this.parsedRows=[];
if(box)box.innerHTML='';
if(btn)btn.disabled=true;
return;
}
this._renderPreview();
},
_renderPreview(){
const box=document.getElementById('sparepartCsvImportPreview');
const btn=document.getElementById('sparepartCsvImportCommitBtn');
if(!box)return;
if(!this.parsedRows.length){
box.innerHTML='<div class="u-fs12 u-t2">Tidak ada baris valid terbaca. Pastikan file CSV punya header: nama,kode,interval_km,tampil_reminder (kolom "nama" wajib ada).</div>';
if(btn)btn.disabled=true;
return;
}
let created=0,updated=0;
const rowsHtml=this.parsedRows.slice(0,50).map(r=>{
const exists=D.sparepartCats.find(c=>c.name.toLowerCase()===r.nama.toLowerCase());
if(exists)updated++;else created++;
const statusLabel=exists?'🔄 update':'🆕 baru';
const sub=(r.kode||'-')+(r.intervalKm?' · setiap '+r.intervalKm.toLocaleString('id-ID')+' km':'');
return `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px"><span>${escapeHtml(r.nama)}</span><span style="white-space:nowrap">${escapeHtml(sub)} <span class="u-t2">(${statusLabel})</span></span></div>`;
}).join('');
const moreNote=this.parsedRows.length>50?`<div class="u-fs11 u-t2" style="margin-top:6px">+${this.parsedRows.length-50} baris lain tidak ditampilkan di pratinjau (tetap ikut diimpor)</div>`:'';
box.innerHTML=`<div class="u-fs12 u-t2 u-mb8">${this.parsedRows.length} baris kebaca — ${created} baru, ${updated} update.</div>${rowsHtml}${moreNote}`;
if(btn)btn.disabled=false;
},
commit(){
if(!this.parsedRows.length){toast('⚠️ Belum ada data yang terbaca dari file');return;}
const res=Sparepart.commitCategoryCSV(this.parsedRows);
closeModal('sparepartCsvImportModal');
Sparepart.renderCatList();
toast(`✅ Import CSV selesai: ${res.created} kategori baru, ${res.updated} diperbarui`);
this.parsedRows=[];
}
};
function openSparepartCsvImportModal(){return SparepartCsvImport.open();}
function onSparepartCsvImportFileChange(evt){return SparepartCsvImport.onFileSelected(evt);}
function commitSparepartCsvImport(){return SparepartCsvImport.commit();}
function exportSparepartCategoryCSV(){
const n=Sparepart.exportCategoryCSV();
toast(n>0?'📤 '+n+' kategori diexport ke CSV':'⚠️ Belum ada kategori sparepart untuk diexport');
return n;
}
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
function onServisItemInput(){return Servis.onItemInputSuggest();}
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
// BUGFIX (audit lanjutan Smart Delivery Engine): sebelumnya loop di sini
// pakai (D.sparepartCats||[]) mentah -- tidak difilter catVisibleForVehicle()
// (kategori privat kendaraan lain ikut terhitung) maupun intervalKm>0 &&
// showInReminder!==false (kategori "sampah" hasil scan Katalog Suku Cadang,
// intervalKm:0, bikin sisaKm selalu negatif -> status 'lewat' permanen).
// Servis.renderReminder() (car-notes.js) SUDAH benar pakai kedua filter ini
// sejak awal -- predictService() cuma belum ikut ditempel. Disamakan di sini
// supaya predictService()/maintenanceForecast()/_vehicleOverdueCheck() (yang
// semuanya menghitung hal yang sama) konsisten dgn renderReminder().
const remindable=(D.sparepartCats||[]).filter(c=>c.intervalKm>0&&c.showInReminder!==false&&catVisibleForVehicle(c,vehicleId));
const cats=categoryId
? remindable.filter((c)=>c.id===categoryId)
: remindable;
if(!cats.length)return{ok:false,reason:categoryId?'Kategori sparepart tidak ditemukan':'Belum ada kategori sparepart terdaftar'};
const curKm=getVehicleKm(vehicleId);
const kmPerDay=estimateKmPerDay(vehicleId);
const rows=cats.map((cat)=>{
const lastKm=getLastServiceKmForCat(vehicleId,cat);
const overridden=hasIntervalOverride(vehicleId,cat);
const u=computeServiceUrgency({vehicleId,cat,curKm,kmPerDay});
return{categoryId:cat.id,categoryName:cat.name,lastKm,intervalKm:u.intervalKm,overridden,sisaKm:u.sisaKm,sisaBulan:u.sisaBulan,intervalBulan:u.intervalBulan,limitingAxis:u.limitingAxis,estDateISO:u.estDateISO,status:u.status};
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
// BUGFIX (audit lanjutan): pencocokan biaya histori sebelumnya pakai
// exact-string-match polos (s.item===r.categoryName), bukan
// servisLogMatchesCat() yang sudah ada (fuzzy match: cocok
// substring/ambigu-check, dipakai recommendIntervalKm() di atas) --
// biayaEstimasi jadi lebih sering null dari seharusnya walau catatan
// servisnya sebenarnya cocok.
const cat=(D.sparepartCats||[]).find((c)=>c.id===r.categoryId);
const logs=(D.servisLogs||[]).filter((s)=>s.vehicleId===vehicleId&&s.cost>0&&cat&&servisLogMatchesCat(s,cat));
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
// _vehicleCapacityMissingCheck() — cek kendaraan yg dipakai operasional Shop
// (muncul di D.deliveryPlans, audit item #3) tapi capacityKg/capacityM3
// (vehicle-core.js, field yg sudah ada) masih kosong -> TripEngine.
// vehicleCapacity() tidak bisa hitung status AMAN/OVERLOAD. Murni baca D
// langsung, 0 field/index baru.
function _vehicleCapacityMissingCheck(){
if(typeof D==='undefined'||!D.vehicles||!D.deliveryPlans)return{trigger:false,missing:[]};
const usedIds=new Set(D.deliveryPlans.map(p=>p.vehicleId).filter(Boolean));
const missing=D.vehicles.filter(v=>usedIds.has(v.id)&&!v.capacityKg&&!v.capacityM3);
return{trigger:missing.length>0,missing};
}
AIDecision.rules.register({
id:'vehicle-capacity-missing',
category:'vehicle',
severity:'warning',
weight:4,
cooldownHours:72,
description:'Kendaraan dipakai di Rencana Pengiriman tapi kapasitas angkut (capacityKg/capacityM3, Kelola Kendaraan) belum diisi, jadi cek AMAN/OVERLOAD muatan tidak bisa jalan.',
condition:()=>_vehicleCapacityMissingCheck().trigger,
action:()=>{
const c=_vehicleCapacityMissingCheck();
const first=c.missing[0];
const extra=c.missing.length>1?` (+${c.missing.length-1} kendaraan lain)`:'';
// Sesi 344b — actionTargets: bawa id kendaraan yg missing supaya AIRecommendCard
// (ai-chat.js) bisa render tombol yg langsung panggil editVehicle(idx), bukan cuma
// teks 'actions' yg user harus cari sendiri ke Kelola Kendaraan.
return{message:`Kapasitas angkut "${first.name}" belum diisi, cek muatan di Rencana Pengiriman belum akurat${extra}.`,actions:['Isi Kapasitas Angkut Maks di Kelola Kendaraan'],actionTargets:[{type:'vehicle',id:first.id}]};
},
});
_vehicleAIRulesRegistered=true;
return true;
}
