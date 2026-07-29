// vehicle-core.js — Domain Vehicle core: CRUD kendaraan, KM (log & estimasi konsumsi/rp-per-km),
// Pajak Kendaraan (STNK tahunan/5-tahunan + SPT Tahunan pribadi), SIM, proactive reminders
// (dashboard), dan Car Notes tab (filter periode, edit KM cepat, wrapper BBM).
// Dipindah ke modules/vehicle/vehicle-core.js (Sesi 8 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari tukang-absensi.js (2026-07-12, split file besar bagian ke-4,
// lanjutan langsung dari bagian ke-1 Chat Action, ke-2 Storage/Archive & ke-3 Sparepart/Servis di
// sesi yang sama). Sisa file asal (tukang-absensi.js) sekarang murni domain
// Tukang (absensi/payroll) — akan di-rename/dipindah jadi tukang-absensi.js di bagian ke-5 (terakhir).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) — lihat urutan grup di
// header tukang-absensi.js. Ditempatkan tepat setelah features-tukang-kendaraan-
// storage.js, sebelum chat-action.js/data-archive.js/sparepart-servis.js (yang tidak butuh apa pun
// dari file ini) & features-aiwidget-reminder-gdrive-search.js (yang memanggil getVehicleKm() dst
// dari file ini).
/* moved to modules-render.js: renderVehicleSelect */
function selectVehicle(id){curVehicleId=id;renderVehicleSelect();renderCnTab();}
// isVehicleOwnershipSelf(vehicleId) — helper REUSE dari OwnershipEngine (Sesi 196,
// Ownership Sync Vehicle/Car Notes/Fuel/Servis/Reminder/Dashboard/Report/AI).
// Balikin true kalau kepemilikan EFEKTIF kendaraan ini SELF (termasuk kendaraan
// lama yg belum punya field `ownership` sama sekali — via OwnershipEngine.resolve()
// otomatis fallback ke SELF/DEFAULT, jadi 100% backward compatible, TIDAK ada
// kendaraan existing yang tiba-tiba ke-exclude). Balikin false kalau ownership-nya
// salah satu dari INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY — dikecualikan dari agregat
// LINTAS-KENDARAAN (fleetSummary/reminder fleet-wide/cost trend fleet-wide/
// Dashboard/AI briefing) — TAPI TIDAK dari tampilan per-kendaraan (Car Notes tab
// kendaraan terpilih, vehicleOverview(vehicleId)/fuel-dashboard dst tetap normal
// kalau diakses langsung by id), sama persis pola isAccOwnershipSelf/
// isAssetOwnershipSelf/isHoldingOwnershipSelf/isCobekOwnershipSelf (Sesi 192-194).
// Guard typeof OwnershipEngine/D: kalau engine/data belum dimuat, fallback true
// (anggap SELF/tidak exclude apa pun) — pola sama persis guard fungsi lain di file
// ini.
function isVehicleOwnershipSelf(vehicleId){
if(typeof OwnershipEngine==='undefined')return true;
if(typeof D==='undefined'||!D.vehicles)return true;
const v=D.vehicles.find(x=>x.id===vehicleId);
if(!v)return true;
return OwnershipEngine.resolve(v).type==='SELF';
}
/* moved to modules-render.js: renderCarImportVehicleSelect */
let vehEditIdx=null;
// Field per Jenis Kendaraan (KW-165, lanjutan sesi KW-164 — sebelumnya cuma 1 field generik
// "Interval Servis (KM)" buat semua jenis kendaraan). Motor: 1 interval (oli mesin). Mobil: oli
// mesin & oli transmisi punya interval beda jauh (mesin ~5rb km, transmisi puluhan ribu km) jadi
// dipisah 2 field. Listrik: tidak ada oli mesin sama sekali, field interval KM diganti Kapasitas
// Baterai (kWh) — dipakai kartu Vehicle Intelligence/estimasi jarak tempuh, bukan reminder ganti oli.
const VEH_JENIS_DEFAULT_INTERVAL={motor:3000,mobil:5000};
function vehJenisFieldsHtml(jenis,v){
v=v||{};
if(jenis==='mobil'){
return '<div class="fg"><label class="fl">Interval Servis Oli Mesin (KM)</label><input type="number" class="fi" id="vehInterval" placeholder="5000" inputmode="numeric" value="'+(v.serviceIntervalKm||'')+'"></div>'
+'<div class="fg"><label class="fl">Interval Servis Oli Transmisi (KM)</label><input type="number" class="fi" id="vehOliTransInterval" placeholder="20000" inputmode="numeric" value="'+(v.oliTransmisiIntervalKm||'')+'"></div>';
}
if(jenis==='listrik'){
return '<div class="fg"><label class="fl">Kapasitas Baterai (kWh)</label><input type="number" step="0.1" class="fi" id="vehBatteryCapacity" placeholder="5.5" inputmode="decimal" value="'+(v.batteryCapacityKwh||'')+'"><div style="font-size:11px;color:var(--text2);margin-top:4px">Kendaraan listrik tidak ganti oli, jadi tidak ada interval servis KM — kapasitas baterai dipakai buat estimasi jarak tempuh & pengingat servis berkala lain (rem/ban/aki).</div></div>';
}
return '<div class="fg"><label class="fl">Interval Servis (KM)</label><input type="number" class="fi" id="vehInterval" placeholder="3000" inputmode="numeric" value="'+(v.serviceIntervalKm||'')+'"></div>';
}
function onVehJenisChange(){
const jenisEl=document.getElementById('vehJenis');
const wrap=document.getElementById('vehJenisFieldsWrap');
if(!jenisEl||!wrap)return;
const jenis=jenisEl.value||'motor';
const editing=(vehEditIdx!==null&&vehEditIdx!==undefined)?D.vehicles[vehEditIdx]:null;
wrap.innerHTML=vehJenisFieldsHtml(jenis,editing);
if(!editing){
const def=VEH_JENIS_DEFAULT_INTERVAL[jenis];
const intervalEl=document.getElementById('vehInterval');
if(def&&intervalEl&&!intervalEl.value)intervalEl.value=def;
}
}
function openVehicleModal(){
vehEditIdx=null;
renderVehicleManageList();
document.getElementById('vehFormLabel').textContent='Nama Kendaraan Baru';
document.getElementById('vehName').value='';
document.getElementById('vehEmoji').value='🏍️';
const jenisEl=document.getElementById('vehJenis');
if(jenisEl)jenisEl.value='motor';
onVehJenisChange();
const kmWrap=document.getElementById('vehKmAwalWrap');if(kmWrap)kmWrap.style.display='';
document.getElementById('vehSaveBtn').textContent='+ Tambah Kendaraan';
_populateVehOwnershipSelect(null);
openModal('vehicleModal');
}
// _populateVehOwnershipSelect(v) — helper (S231, reuse OwnershipEngine) dipakai openVehicleModal
// (tambah baru, v=null) & editVehicle (v=kendaraan existing). Kendaraan lama tanpa field
// ownership: resolve() fallback ke SELF/DEFAULT, sama pola dgn Akun/Aset.
function _populateVehOwnershipSelect(v){
const ownSel=document.getElementById('vehOwnership');
if(!ownSel)return;
if(typeof OwnershipEngine!=='undefined'){
ownSel.innerHTML=OwnershipEngine.TYPES.map(t=>'<option value="'+t+'">'+escapeHtml(OwnershipEngine.label(t))+'</option>').join('');
ownSel.value=OwnershipEngine.resolve(v||{}).type;
}else{
ownSel.innerHTML='<option value="SELF">Milik Sendiri</option>';
ownSel.value='SELF';
}
}
function editVehicle(i){
vehEditIdx=i;
const v=D.vehicles[i];
renderVehicleManageList();
document.getElementById('vehFormLabel').textContent='Edit Kendaraan';
document.getElementById('vehName').value=v.name;
document.getElementById('vehEmoji').value=v.emoji||'🏍️';
const jenisEl=document.getElementById('vehJenis');
if(jenisEl)jenisEl.value=v.jenis||'motor';
onVehJenisChange();
const kmWrap=document.getElementById('vehKmAwalWrap');if(kmWrap)kmWrap.style.display='none';
document.getElementById('vehSaveBtn').textContent='Simpan Perubahan';
_populateVehOwnershipSelect(v);
openModal('vehicleModal');
}
function saveVehicle(){
const name=document.getElementById('vehName').value.trim();
const emoji=document.getElementById('vehEmoji').value||'🏍️';
const jenisEl=document.getElementById('vehJenis');
const jenis=jenisEl?(jenisEl.value||'motor'):'motor';
if(!name){toast('⚠️ Isi nama kendaraan');return;}
// Ownership (S231) — dibaca dari dropdown, divalidasi/dinormalisasi via OwnershipEngine.
const ownRawV=document.getElementById('vehOwnership')?.value;
const ownership=(typeof OwnershipEngine!=='undefined'&&OwnershipEngine.isValidType(ownRawV))?OwnershipEngine.normalize(ownRawV):(typeof OwnershipEngine!=='undefined'?OwnershipEngine.DEFAULT:'SELF');
let interval,oliTrans=null,batteryCapacity=null;
if(jenis==='listrik'){
const batEl=document.getElementById('vehBatteryCapacity');
batteryCapacity=batEl?(parseFloat(batEl.value)||null):null;
interval=0;
} else {
const intervalEl=document.getElementById('vehInterval');
interval=intervalEl?(parseFloat(intervalEl.value)||VEH_JENIS_DEFAULT_INTERVAL[jenis]||3000):(VEH_JENIS_DEFAULT_INTERVAL[jenis]||3000);
if(jenis==='mobil'){
const transEl=document.getElementById('vehOliTransInterval');
oliTrans=transEl?(parseFloat(transEl.value)||null):null;
}
}
if(vehEditIdx!==null&&vehEditIdx!==undefined){
const v=D.vehicles[vehEditIdx];
if(!v){vehEditIdx=null;return;}
v.name=name;v.emoji=emoji;v.jenis=jenis;v.serviceIntervalKm=interval;v.ownership=ownership;
if(jenis==='mobil'&&oliTrans)v.oliTransmisiIntervalKm=oliTrans;else delete v.oliTransmisiIntervalKm;
if(jenis==='listrik'&&batteryCapacity)v.batteryCapacityKwh=batteryCapacity;else delete v.batteryCapacityKwh;
vehEditIdx=null;
save();renderVehicleManageList();renderVehicleSelect();renderCarImportVehicleSelect();renderDashboardServisReminder();renderServisList();toast('✅ Kendaraan diperbarui');
return;
}
const kmAwalEl=document.getElementById('vehKmAwal');
const kmAwal=kmAwalEl?parseFloat(kmAwalEl.value):NaN;
const newId='veh_'+Date.now();
const newVeh={id:newId,name,emoji,jenis,serviceIntervalKm:interval,intervalOverrides:{},ownership};
if(jenis==='mobil'&&oliTrans)newVeh.oliTransmisiIntervalKm=oliTrans;
if(jenis==='listrik'&&batteryCapacity)newVeh.batteryCapacityKwh=batteryCapacity;
D.vehicles.push(newVeh);
if(!isNaN(kmAwal)&&kmAwal>0){
D.kmLogs.push({id:uid(),vehicleId:newId,date:new Date().toISOString().split('T')[0],km:kmAwal,note:'KM awal saat kendaraan ditambahkan'});
}
save();renderVehicleManageList();renderVehicleSelect();renderCarImportVehicleSelect();renderDashboardServisReminder();document.getElementById('vehName').value='';if(kmAwalEl)kmAwalEl.value='';toast('✅ Kendaraan ditambahkan'+(!isNaN(kmAwal)&&kmAwal>0?' (KM awal: '+kmAwal.toLocaleString('id-ID')+' km)':''));
}
// Teks ringkasan servis per kendaraan di daftar Kelola Kendaraan — beda per jenis (KW-165).
// PURE function (tidak sentuh DOM/D), dipanggil dari renderVehicleManageList() di modules-render.js.
function vehMetaText(v){
const jenis=v.jenis||'motor';
// Ownership Badge (S233) — upgrade dari teks sederhana (S232) jadi badge, reuse class
// "acc-chip" yang SUDAH ADA (dipakai badge/chip lain di project ini, mis. akun.js/aset.js/
// bill render — lihat styles.css) — TIDAK ada style baru. Data diambil HANYA dari
// OwnershipEngine.resolve()/label() (0 rumus baru). Data lama tanpa field ownership:
// resolve() fallback ke SELF/DEFAULT (backward compatible, sama seperti S232).
// Ownership Detail View (S234) — SATU pemanggilan OwnershipEngine.resolve(v) dipakai
// bareng utk badge (S233, label Bahasa Indonesia) DAN detail view di bawahnya (kode tipe
// mentah, mis. "SELF") — supaya TIDAK ada logic resolve/hitung ulang yang duplikat.
const ownResolved=(typeof OwnershipEngine!=='undefined')?OwnershipEngine.resolve(v):null;
const ownText=ownResolved?(' <span class="acc-chip">'+escapeHtml(OwnershipEngine.label(ownResolved.type))+'</span>'):'';
const ownDetail=ownResolved?('<div class="u-fs10 u-t2">Ownership<br>'+escapeHtml(ownResolved.type)+'</div>'):'';
if(jenis==='mobil'){
const mesin=(v.serviceIntervalKm||5000).toLocaleString('id-ID');
const trans=v.oliTransmisiIntervalKm?(v.oliTransmisiIntervalKm.toLocaleString('id-ID')+' km'):'belum diisi';
return 'Oli mesin: '+mesin+' km · Oli transmisi: '+trans+ownText+ownDetail;
}
if(jenis==='listrik'){
return (v.batteryCapacityKwh?('Kapasitas baterai: '+v.batteryCapacityKwh+' kWh'):'Kapasitas baterai belum diisi')+ownText+ownDetail;
}
return 'Interval servis: '+(v.serviceIntervalKm||3000).toLocaleString('id-ID')+' km'+ownText+ownDetail;
}
function populateKmVehicleSelect(){
const sel=document.getElementById('kmVehicle');
if(!sel||!D.vehicles)return;
sel.innerHTML=D.vehicles.map(v=>`<option value="${v.id}">${v.emoji} ${escapeHtml(v.name)}</option>`).join('');
sel.value=(D.vehicles.find(v=>v.id===curVehicleId))?curVehicleId:(D.vehicles[0]&&D.vehicles[0].id);
}
function onKmVehicleChange(){
const sel=document.getElementById('kmVehicle');
if(!sel)return;
document.getElementById('kmVal').value=getVehicleKm(sel.value)||'';
}
function openKmModal(){
document.getElementById('kmDate').value=new Date().toISOString().split('T')[0];
document.getElementById('kmNote').value='';
populateKmVehicleSelect();
document.getElementById('kmVal').value=getVehicleKm(curVehicleId)||'';
openModal('kmModal');
}
async function saveKm(){
const vehSel=document.getElementById('kmVehicle');
const vehicleId=(vehSel&&vehSel.value&&D.vehicles.find(v=>v.id===vehSel.value))?vehSel.value:curVehicleId;
const km=parseFloat(document.getElementById('kmVal').value);
if(!km){toast('⚠️ Isi nilai KM');return;}
const curKm=getVehicleKm(vehicleId);
if(km<curKm){if(!await askConfirm('KM yang diisi lebih kecil dari catatan terakhir ('+curKm.toLocaleString('id-ID')+' km). Tetap simpan?',{danger:false,okText:'Ya, Simpan'}))return;}
D.kmLogs.push({id:uid(),vehicleId,date:document.getElementById('kmDate').value,km,note:document.getElementById('kmNote').value});
if(vehicleId!==curVehicleId){curVehicleId=vehicleId;renderVehicleSelect();}
save();closeModal('kmModal');renderCnTab();renderDashboardServisReminder();toast('✅ KM diperbarui: '+km.toLocaleString('id-ID')+' km');
}
async function delVehicle(i){
if(D.vehicles.length<=1){toast('⚠️ Minimal 1 kendaraan');return;}
if(!await askConfirm('Hapus kendaraan ini? Catatan BBM/servis terkait tetap ada.'))return;
D.vehicles.splice(i,1);save();renderVehicleManageList();renderVehicleSelect();renderCnTab();renderDashboardServisReminder();toast('🗑 Dihapus');
}
function daysUntilDate(dateStr){
if(!dateStr)return null;
const now=new Date(); now.setHours(0,0,0,0);
const target=new Date(dateStr); target.setHours(0,0,0,0);
return Math.round((target-now)/86400000);
}
function dateStatusBadge(dateStr){
const d=daysUntilDate(dateStr);
if(d===null)return{col:'',label:'Belum diisi'};
if(d<0)return{col:'red',label:`⚠️ Lewat ${Math.abs(d)} hari`};
if(d<=30)return{col:'orange',label:d===0?'🔔 Jatuh tempo hari ini':`🔔 H-${d} hari`};
return{col:'green',label:`✅ Aktif s.d ${fmtDateID(dateStr)}`};
}
function fmtDateID(dateStr){
return new Date(dateStr).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}
function sptTahunanDueDate(){
const now=new Date(); now.setHours(0,0,0,0);
const y=now.getFullYear();
let due=new Date(y,2,31); due.setHours(0,0,0,0);
const diffDays=Math.round((now-due)/86400000);
if(diffDays>30) due=new Date(y+1,2,31);
return dateToISO(due);
}
function sptStatusBadge(){
const dateStr=sptTahunanDueDate();
const d=daysUntilDate(dateStr);
if(d<0)return{col:'red',label:`⚠️ Lewat ${Math.abs(d)} hari, segera lapor!`};
if(d<=30)return{col:'orange',label:d===0?'🔔 Batas lapor HARI INI':`🔔 H-${d} hari (${fmtDateID(dateStr)})`};
return{col:'green',label:`Batas lapor ${fmtDateID(dateStr)}`};
}
function ikatSptTagihan(){
const due=sptTahunanDueDate();
const key='spt';
let bill=D.bills.find(b=>b.taxLink&&b.taxLink.key===key);
if(bill){
bill.nextDue=due;
save();refreshBillEverywhere();renderSptLinkStatus();
toast('✅ Reminder Tagihan SPT Tahunan diperbarui: batas lapor '+fmtDateID(due));
} else {
D.bills.push({id:uid(),name:'Lapor SPT Tahunan Orang Pribadi',amount:0,nextDue:due,freq:'sekali',category:'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||null,note:'Otomatis dari Estimasi PPh 21 — batas lapor, bukan pembayaran',kind:'tagihan',taxLink:{key}});
save();refreshBillEverywhere();renderSptLinkStatus();
toast('✅ Reminder Tagihan SPT Tahunan dibuat, batas lapor '+fmtDateID(due));
}
}
/* moved to modules-render.js: renderSptLinkStatus */
/* moved to modules-render.js: renderVehTaxSim */
function getProactiveReminders(){
const items=[];
const now=new Date();
(D.bills||[]).forEach(b=>{
const d=daysUntilDate(b.nextDue);
if(d===null)return;
if(d<0)items.push(`⚠️ ${b.name} (${b.kind}) sudah LEWAT jatuh tempo ${Math.abs(d)} hari — ${fmtFull(b.amount)}`);
else if(d<=7)items.push(`🔔 ${b.name} (${b.kind}) jatuh tempo ${d===0?'HARI INI':'H-'+d}, siapin dana ${fmtFull(b.amount)} ya`);
});
(D.vehicles||[]).forEach(v=>{
Object.entries(VEHTAX_ITEMS).forEach(([,cfg])=>{
const d=daysUntilDate(v[cfg.tglKey]);
if(d===null)return;
const label=cfg.label.replace(/^\S+\s/,'');
if(d<0)items.push(`⚠️ ${label} ${v.name} sudah LEWAT ${Math.abs(d)} hari`);
else if(d<=7)items.push(`🔔 ${label} ${v.name} jatuh tempo ${d===0?'HARI INI':'H-'+d}${v[cfg.biayaKey]?', estimasi '+fmtFull(v[cfg.biayaKey]):''}`);
});
});
(D.simList||[]).forEach(s=>{
const d=daysUntilDate(s.tglAkhir);
if(d===null)return;
if(d<0)items.push(`⚠️ SIM ${s.jenis} (${s.nama}) sudah LEWAT masa berlaku ${Math.abs(d)} hari`);
else if(d<=7)items.push(`🔔 SIM ${s.jenis} (${s.nama}) mau habis masa berlaku, ${d===0?'HARI INI':'H-'+d}`);
});
(D.eduFunds||[]).forEach(f=>{
const c=EduFund.calc(f);
if(c.kekurangan<=0)return;
const d=daysUntilDate(f.tahunTarget+'-01-01');
if(d===null)return;
if(d<0)items.push(`⚠️ Dana Pendidikan "${f.name}" sudah masuk tahun target (${f.tahunTarget}) & masih kurang ${fmtFull(c.kekurangan)} — cek progress nabungnya`);
else if(d<=90)items.push(`🔔 Dana Pendidikan "${f.name}" H-${d} hari menuju tahun target ${f.tahunTarget}, masih kurang ${fmtFull(c.kekurangan)} (≈${fmtFull(c.pmtBulanan)}/bulan)`);
});
{
const dSpt=daysUntilDate(sptTahunanDueDate());
if(dSpt<0)items.push(`⚠️ Lapor SPT Tahunan sudah LEWAT batas waktu ${Math.abs(dSpt)} hari`);
else if(dSpt<=7)items.push(`🔔 Batas lapor SPT Tahunan ${dSpt===0?'HARI INI':'H-'+dSpt} (31 Maret)`);
}
const m=now.getMonth(),y=now.getFullYear();
const pz=D.pajakZakat;
if(pz){
const incM=(D.transactions||[]).filter(t=>{const dd=new Date(t.date);return dd.getMonth()===m&&dd.getFullYear()===y&&t.type==='income';}).reduce((s,t)=>s+t.amount,0);
if(incM>=pz.nisabPenghasilanBulan){
items.push(`💰 Zakat penghasilan bulan ini sudah WAJIB (≈${fmtFull(Math.round(incM*0.025))}), pemasukan udah lewat nisab`);
}
const asetZakatable=(D.assets||[]).filter(a=>a.zakatable).reduce((s,a)=>s+(a.nilai||0),0);
const totalHartaZakat=Math.max(0,totalSaldoAkun()+asetZakatable-(pz.utangJT||0)-totalDebtValue()-totalCicilanOutstanding());
const nisabMaal=85*pz.hargaEmasPerGram;
if(totalHartaZakat>=nisabMaal&&pz.haulMaalMulai){
const hari=Math.floor((now-new Date(pz.haulMaalMulai))/86400000);
if(hari>=354)items.push(`💰 Zakat maal sudah WAJIB (haul genap), ≈${fmtFull(Math.round(totalHartaZakat*0.025))}`);
else if(hari>=354-7)items.push(`🔔 Zakat maal mau haul ${354-hari} hari lagi, siap-siap dananya ya`);
}
}
return items;
}
/* moved to modules-render.js: renderVehTaxList */
function openVehTaxModal(vehicleId){
const v=D.vehicles.find(x=>x.id===vehicleId);
if(!v)return;
document.getElementById('vehTaxVehName').textContent=v.name;
document.getElementById('vehTaxModal').dataset.vehicleId=vehicleId;
document.getElementById('vehTaxTahunan').value=v.pajakTahunanTgl||'';
document.getElementById('vehBiayaTahunan').value=v.biayaTahunan||'';
document.getElementById('vehTaxLimaTahun').value=v.pajakLimaTahunTgl||'';
document.getElementById('vehBiayaLimaTahun').value=v.biayaLimaTahun||'';
document.getElementById('vehTaxUji').value=v.ujiKelayakanTgl||'';
document.getElementById('vehBiayaUji').value=v.biayaUji||'';
renderVehTaxLinkStatus();
openModal('vehTaxModal');
}
function ikatVehTaxTagihan(jenis){
const modalEl=document.getElementById('vehTaxModal');
const vehicleId=modalEl.dataset.vehicleId;
const v=D.vehicles.find(x=>x.id===vehicleId);
const cfg=VEHTAX_ITEMS[jenis],ids=VEHTAX_INPUT_IDS[jenis];
if(!v||!cfg||!ids)return;
const due=document.getElementById(ids.date).value;
const biaya=parsePzNum(document.getElementById(ids.biaya).value);
if(!due){toast('⚠️ Isi dulu tanggal jatuh tempo');return;}
if(biaya<=0){toast('⚠️ Isi dulu estimasi biaya lewat kolom di atas');return;}
const label=cfg.label.replace(/^\S+\s/,'');
const key='vehtax:'+vehicleId+':'+jenis;
let bill=D.bills.find(b=>b.taxLink&&b.taxLink.key===key);
if(bill){
bill.amount=biaya;bill.nextDue=due;bill.name=label+' - '+v.name;
save();refreshBillEverywhere();renderVehTaxLinkStatus();
toast('✅ Reminder Tagihan '+label+' diperbarui: '+fmtFull(biaya)+' jatuh tempo '+due);
} else {
D.bills.push({id:uid(),name:label+' - '+v.name,amount:biaya,nextDue:due,freq:'sekali',category:'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||null,note:'Otomatis dari Pajak Kendaraan',kind:'tagihan',taxLink:{key}});
save();refreshBillEverywhere();renderVehTaxLinkStatus();
toast('✅ Reminder Tagihan '+label+' dibuat, aktif di menu Tagihan');
}
}
/* moved to modules-render.js: renderVehTaxLinkStatus */
function saveVehTax(){
const vehicleId=document.getElementById('vehTaxModal').dataset.vehicleId;
const v=D.vehicles.find(x=>x.id===vehicleId);
if(!v)return;
v.pajakTahunanTgl=document.getElementById('vehTaxTahunan').value||null;
v.biayaTahunan=parsePzNum(document.getElementById('vehBiayaTahunan').value);
v.pajakLimaTahunTgl=document.getElementById('vehTaxLimaTahun').value||null;
v.biayaLimaTahun=parsePzNum(document.getElementById('vehBiayaLimaTahun').value);
v.ujiKelayakanTgl=document.getElementById('vehTaxUji').value||null;
v.biayaUji=parsePzNum(document.getElementById('vehBiayaUji').value);
save();
closeModal('vehTaxModal');
renderVehTaxList();
toast('✅ Pajak & Uji Kelayakan diperbarui');
}
async function bayarPajakKendaraan(vehicleId,jenis){
const v=D.vehicles.find(x=>x.id===vehicleId);
const cfg=VEHTAX_ITEMS[jenis];
if(!v||!cfg)return;
const biaya=v[cfg.biayaKey]||0;
if(biaya<=0){toast('⚠️ Isi dulu estimasi biaya '+cfg.label+' lewat ✏️');return;}
if(!await askConfirm('Bayar '+cfg.label+' untuk '+v.name+' sebesar '+fmtFull(biaya)+'? Otomatis tercatat sebagai pengeluaran di Keuangan & jadwal diperbarui.',{danger:false,okText:'Ya, Bayar',icon:'🚦'}))return;
D.transactions.push({id:uid(),type:'expense',amount:biaya,category:'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:cfg.label.replace(/^\S+\s/,'')+' - '+v.name,date:new Date().toISOString().split('T')[0]});
const base=v[cfg.tglKey]?new Date(v[cfg.tglKey]):new Date();
cfg.advance(base);
v[cfg.tglKey]=base.toISOString().split('T')[0];
save();
renderVehTaxList();
renderDashboard();
renderKeuangan();
toast('✅ Tercatat di Keuangan & jadwal diperpanjang ke '+fmtDateID(v[cfg.tglKey]));
}
let editSimId=null;
// Perkiraan biaya perpanjangan per jenis SIM (KW-164/165) — angka umum PNBP SIM di Indonesia
// (per 5 tahun, di luar biaya tes/asuransi opsional), murni titik awal buat diisi otomatis di
// field Estimasi Biaya; user tetap bebas edit sendiri.
// Sesi 319 (KW-165): nilainya TIDAK lagi hardcode di sini — dipindah jadi field di D.pajakZakat
// (simTarifA/B1/B2/C/C1/C2/D), sama seperti hargaEmasPerGram/nisab, supaya bisa diupdate lewat
// tombol "🔍 Cek Update via AI" di tab Pajak & Zakat (RefAI) tanpa perlu edit source code.
function simTarifKey(jenis){ return 'simTarif'+String(jenis||'').replace('SIM ','').replace(/\s+/g,''); }
const SIM_MASA_BERLAKU_TAHUN=5; // semua jenis SIM di Indonesia berlaku 5 tahun
function onSimJenisChange(){
const jenisEl=document.getElementById('simJenis');
const biayaEl=document.getElementById('simBiaya');
const tglEl=document.getElementById('simTglAkhir');
if(!jenisEl)return;
const def=D.pajakZakat&&D.pajakZakat[simTarifKey(jenisEl.value)];
// Jangan timpa kalau field sudah diisi manual (baik pas edit maupun user sudah ngetik) — autofill cuma buat bantu titik awal.
if(def&&biayaEl&&!biayaEl.value.trim())biayaEl.value=def;
if(tglEl&&!tglEl.value){
const d=new Date();d.setFullYear(d.getFullYear()+SIM_MASA_BERLAKU_TAHUN);
tglEl.value=d.toISOString().split('T')[0];
}
}
function openSimModal(id){
editSimId=id||null;
const s=id?D.simList.find(x=>sameId(x.id,id)):null;
document.getElementById('simModalTitle').textContent=s?'Edit SIM':'Tambah SIM';
document.getElementById('simNama').value=s?s.nama:'';
document.getElementById('simJenis').value=s?s.jenis:'SIM C';
document.getElementById('simTglAkhir').value=s?(s.tglAkhir||''):'';
document.getElementById('simBiaya').value=s?(s.biaya||''):'';
if(!s)onSimJenisChange(); // SIM baru: bantu isi default masa berlaku (+5 tahun) & estimasi biaya
renderSimLinkStatus();
openModal('simModal');
}
function ikatSimTagihan(){
if(!editSimId){toast('⚠️ Simpan data SIM ini dulu (tombol Simpan), baru bisa diikat ke Tagihan');return;}
const s=D.simList.find(x=>sameId(x.id,editSimId));
if(!s){toast('⚠️ Data SIM tidak ditemukan');return;}
if(!s.tglAkhir){toast('⚠️ Isi & simpan dulu tanggal Berlaku Sampai');return;}
const biaya=parsePzNum(document.getElementById('simBiaya').value);
s.biaya=biaya;save();
const key='sim:'+s.id;
const name='Perpanjang SIM '+s.jenis+' - '+s.nama;
let bill=D.bills.find(b=>b.taxLink&&b.taxLink.key===key);
if(bill){
bill.amount=biaya;bill.nextDue=s.tglAkhir;bill.name=name;
save();refreshBillEverywhere();renderSimLinkStatus();
toast('✅ Reminder Tagihan SIM diperbarui, jatuh tempo '+s.tglAkhir);
} else {
D.bills.push({id:uid(),name,amount:biaya,nextDue:s.tglAkhir,freq:'sekali',category:'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||null,note:'Otomatis dari data SIM',kind:'tagihan',taxLink:{key}});
save();refreshBillEverywhere();renderSimLinkStatus();
toast('✅ Reminder Tagihan SIM dibuat, aktif di menu Tagihan');
}
}
/* moved to modules-render.js: renderSimLinkStatus */
function saveSim(){
const nama=document.getElementById('simNama').value.trim();
const jenis=document.getElementById('simJenis').value;
const tglAkhir=document.getElementById('simTglAkhir').value;
const biaya=parsePzNum(document.getElementById('simBiaya').value);
if(!nama){toast('⚠️ Nama pemilik wajib diisi');return;}
if(!tglAkhir){toast('⚠️ Tanggal berlaku sampai wajib diisi');return;}
if(editSimId){
const s=D.simList.find(x=>sameId(x.id,editSimId));
Object.assign(s,{nama,jenis,tglAkhir,biaya});
} else {
D.simList.push({id:uid(),nama,jenis,tglAkhir,biaya});
}
save();
closeModal('simModal');
renderSimList();
toast('✅ Data SIM tersimpan');
}
async function delSim(id){
if(!await askConfirm('Hapus data SIM ini?',{okText:'Ya, Hapus'}))return;
D.simList=D.simList.filter(s=>!sameId(s.id,id));
save();
renderSimList();
}
/* moved to modules-render.js: renderSimList */
function setCnTab(t,el){
// Sesi 157 (permintaan eksplisit user): page-carnotes sekarang 4 tab
// (insight/bbm/servis/pajak) — dulu cuma bbm/servis. 'jalan' ditinggal
// apa adanya (dead id, sudah begitu sebelum sesi ini, tidak disentuh).
curCnTab=t;
document.querySelectorAll('#page-carnotes .cn-tab').forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
['insight','bbm','servis','pajak','jalan'].forEach(x=>{
const elx=document.getElementById('cnTab-'+x);
if(elx){ elx.classList.toggle('u-dnone', x!==t); elx.style.display=''; }
});
// FAB (+Isi BBM/+Servis) & periode chips cuma relevan di tab bbm/servis —
// disembunyikan di tab insight/pajak (bukan aksi/filter yang relevan di sana).
const relevan=(t==='bbm'||t==='servis');
const fabEl=document.getElementById('carNotesFab');
if(fabEl) fabEl.classList.toggle('u-dnone',!relevan);
const periodeEl=document.getElementById('cnPeriodeWrap');
if(periodeEl) periodeEl.classList.toggle('u-dnone',!relevan);
renderCnTab();
}
// setCnInsightTab/setCnBbmTab (Sesi 158, permintaan eksplisit user): tab
// Insight AI & tab BBM (di dalam page-carnotes) masing-masing dipecah lagi
// jadi 2 sub-tab bersarang — pola SAMA PERSIS setPjkTab() (pajak-aset-ui-
// wrappers.js): murni toggle class active + toggle u-dnone per pane, TIDAK
// ADA render/rumus baru (render() card tetap dipanggil apa adanya dari
// renderCnTab(), terlepas sub-tab mana yang aktif — sama seperti
// renderPajakZakat() mengisi kedua sub-tab Pajak sekaligus). Vehicle
// selector + Odometer (di luar tab #cnTab-insight/#cnTab-bbm) TIDAK
// disentuh, tetap tampil di semua sub-tab supaya konteks multi-kendaraan
// tidak hilang.
const CNI_SUBTAB_ORDER=['ringkasan','rekomendasi'];
function setCnInsightTab(t,el){
const cniSubtabBtns=document.querySelectorAll('#cnTab-insight .cni-subtab');
cniSubtabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=CNI_SUBTAB_ORDER.indexOf(t); const btn=cniSubtabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('cniTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('cniTab-rekomendasi').classList.toggle('u-dnone', t!=='rekomendasi');
}
const CNB_SUBTAB_ORDER=['ringkasan','analisis'];
function setCnBbmTab(t,el){
const cnbSubtabBtns=document.querySelectorAll('#cnTab-bbm .cnb-subtab');
cnbSubtabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=CNB_SUBTAB_ORDER.indexOf(t); const btn=cnbSubtabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('cnbTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('cnbTab-analisis').classList.toggle('u-dnone', t!=='analisis');
}
function getVehicleKm(vehicleId){
const kms=[
...D.bbmLogs.filter(b=>b.vehicleId===vehicleId).map(b=>b.km),
...D.servisLogs.filter(s=>s.vehicleId===vehicleId&&s.km).map(s=>s.km),
...D.kmLogs.filter(k=>k.vehicleId===vehicleId).map(k=>k.km)
];
return kms.length?Math.max(...kms):0;
}
// estimateKmPerDay/estimateServiceDateISO — dipakai Servis.renderReminder() &
// renderDashboardServisReminder() utk "Rekomendasi Servis AI": selain "sisa X km" (yang sudah ada),
// tambahkan ESTIMASI TANGGAL servis berikutnya dari rata-rata pemakaian km/hari kendaraan itu
// (dihitung dari histori D.kmLogs + D.bbmLogs — keduanya sudah punya {date,km} per kendaraan).
// Rule-based & gratis (bukan panggilan AI/web search) — kalau histori kurang (data <2 titik, atau
// rentang tanggalnya <3 hari, atau km tidak pernah naik), balikin null & UI cukup tampilkan "sisa km"
// spt biasa tanpa estimasi tanggal.
function estimateKmPerDay(vehicleId){
const points=[
...D.kmLogs.filter(k=>k.vehicleId===vehicleId&&k.date&&isFinite(k.km)).map(k=>({date:k.date,km:k.km})),
...D.bbmLogs.filter(b=>b.vehicleId===vehicleId&&b.date&&isFinite(b.km)&&b.km>0).map(b=>({date:b.date,km:b.km}))
].sort((a,b)=>new Date(a.date)-new Date(b.date));
if(points.length<2)return null;
const first=points[0],last=points[points.length-1];
const days=(new Date(last.date)-new Date(first.date))/86400000;
const kmDiff=last.km-first.km;
if(days<3||kmDiff<=0)return null;
return kmDiff/days;
}
function estimateServiceDateISO(sisaKm,kmPerDay){
if(!kmPerDay||kmPerDay<=0||sisaKm===null||sisaKm===undefined||sisaKm<=0)return null;
const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+Math.ceil(sisaKm/kmPerDay));
return dateToISO(d);
}
// estimateRpPerKm — dipakai OngkirCalc.autoFillBiaya() (cobek.js, kw191-ongkir-jarak) utk isi
// otomatis field "Ongkos/km" dari histori BBM kendaraan (lebih akurat drpd cuma harga/liter, karena
// ikut memperhitungkan konsumsi BBM motor/mobil itu sendiri, bukan cuma harga bensin).
// Formula: ambil SEMUA log "Isi Full Tank" kendaraan ini (diurutkan by km) -- jarak antara 2 titik
// full tank berturut-turut ditempuh dgn BAHAN BAKAR SEBANYAK liter di titik KEDUA (convention standar
// hitung konsumsi BBM: isi penuh -> jalan -> isi penuh lagi, liter pengisian ke-2 = liter yg abis
// dipakai sepanjang jarak itu). Totalkan semua km & liter dari seluruh pasangan berurutan, baru itung
// km/liter gabungannya (lebih stabil drpd rata-rata dari tiap pasangan kecil). Ongkos/km = rata-rata
// harga/liter (10 log BBM terakhir) ÷ km/liter itu. Butuh minimal 2 log "Isi Full Tank" dgn km naik
// utk kendaraan ini -- kalau kurang, balikin null.
function estimateRpPerKm(vehicleId){
const logs=(D.bbmLogs||[]).filter(b=>b.vehicleId===vehicleId&&b.fullTank&&isFinite(b.km)&&b.km>0&&b.liter>0).sort((a,b)=>a.km-b.km);
if(logs.length<2)return null;
let totalKm=0,totalLiter=0;
for(let i=1;i<logs.length;i++){
const kmDiff=logs[i].km-logs[i-1].km;
if(kmDiff<=0)continue;
totalKm+=kmDiff;totalLiter+=logs[i].liter;
}
if(totalKm<=0||totalLiter<=0)return null;
const kmPerLiter=totalKm/totalLiter;
const recentHarga=(D.bbmLogs||[]).filter(b=>b.vehicleId===vehicleId&&b.harga>0).slice(-10);
if(!recentHarga.length)return null;
const avgHarga=recentHarga.reduce((s,b)=>s+b.harga,0)/recentHarga.length;
return{rpPerKm:avgHarga/kmPerLiter,kmPerLiter,avgHarga};
}
// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 5/6: fuelEfficiency() — fungsi prediktif
// domain VEHICLE (bagian BBM). Lihat RENCANA-SESI-RINGKAS.md untuk peta 6
// sesi. SENGAJA tidak menduplikasi estimateRpPerKm()/estimateKmPerDay() di
// atas — cuma MEMBUNGKUS keduanya jadi proyeksi biaya BBM bulanan. Rule-
// based & gratis (rata-rata historis), PURE/read-only. predictService() &
// maintenanceForecast() (fungsi prediktif VEHICLE lainnya, bagian servis)
// ada di modules/vehicle/sparepart-servis.js — file itu di-load SETELAH
// file ini, lihat urutan di scripts/build.js.
// ---------------------------------------------------------------------------

// fuelEfficiency(vehicleId) — konsumsi BBM (km/liter, Rp/km) dari
// estimateRpPerKm(), digabung dgn estimateKmPerDay() buat proyeksi
// pemakaian & biaya BBM SEBULAN ke depan (asumsi 30 hari, pemakaian flat
// sesuai rata-rata histori). Balikin {ok:false} kalau data BBM (min. 2 log
// "Isi Full Tank") atau histori km (min. 2 titik, rentang ≥3 hari) kurang —
// sama seperti alasan null di estimateRpPerKm()/estimateKmPerDay() sendiri.
function fuelEfficiency(vehicleId){
const est=estimateRpPerKm(vehicleId);
if(!est)return{ok:false,reason:'Data BBM kurang (butuh min. 2 log "Isi Full Tank" dgn km naik)'};
const kmPerDay=estimateKmPerDay(vehicleId);
const estMonthlyKm=kmPerDay?kmPerDay*30:null;
const estMonthlyLiter=estMonthlyKm?estMonthlyKm/est.kmPerLiter:null;
const estMonthlyCost=estMonthlyLiter?estMonthlyLiter*est.avgHarga:null;
return{ok:true,vehicleId,kmPerLiter:est.kmPerLiter,rpPerKm:est.rpPerKm,avgHarga:est.avgHarga,kmPerDay,estMonthlyKm,estMonthlyLiter,estMonthlyCost};
}

/* moved to sparepart-servis.js (2026-07-12, split file besar bagian ke-3): servisLogMatchesCat,
   getEffectiveIntervalKm, hasIntervalOverride, editVehicleIntervalOverride, getLastServiceKm —
   interval servis per-kategori & override per-kendaraan. */
function setCnPeriode(p,el){
cnPeriode=p;
document.querySelectorAll('#cnPeriodeChips .chip-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');
document.getElementById('cnCustomRange').classList.toggle('u-dnone', p!=='custom');
document.getElementById('cnCustomRange').style.display='';
renderCnTab();
}
function getCnRange(){
if(cnPeriode==='selamanya')return{from:new Date(0),to:new Date(8640000000000000)};
const now=new Date();now.setHours(23,59,59,999);let from;
if(cnPeriode==='hari'){from=new Date();from.setHours(0,0,0,0);}
else if(cnPeriode==='minggu'){from=new Date();from.setDate(from.getDate()-from.getDay());from.setHours(0,0,0,0);}
else if(cnPeriode==='bulan'){from=new Date(now.getFullYear(),now.getMonth(),1);}
else if(cnPeriode==='tahun'){from=new Date(now.getFullYear(),0,1);}
else{const f=document.getElementById('cnFrom').value,t2=document.getElementById('cnTo').value;return{from:f?new Date(f):new Date(0),to:t2?new Date(t2+'T23:59:59'):now};}
return{from,to:now};
}
/* moved to modules-render.js: renderCnTab */
function startEditCurKm(){
const el=document.getElementById('cnCurKm');
if(!el||document.getElementById('cnCurKmInput'))return;
const curKm=getVehicleKm(curVehicleId);
el.innerHTML='<input class="u-fw800 u-ctext u-r8" type="number" inputmode="numeric" id="cnCurKmInput" value="'+curKm+'" aria-label="Edit KM saat ini" style="width:120px;font-size:20px;background:var(--surface3);border:1px solid var(--accent);padding:2px 8px" data-stop="1" data-action="vehCnCurKmInputStop" onkeydown="if(event.key===\'Enter\'){this.blur();}else if(event.key===\'Escape\'){this.dataset.cancel=\'1\';this.blur();}">';
const inp=document.getElementById('cnCurKmInput');
inp.focus();inp.select();
inp.onblur=()=>commitCurKmEdit(inp);
}
async function commitCurKmEdit(inp){
const cancelled=inp.dataset.cancel==='1';
const raw=inp.value;
renderCnTab();
if(cancelled)return;
const km=parseFloat(raw);
const curKm=getVehicleKm(curVehicleId);
if(!km||km<=0){ if(raw.trim()!=='')toast('⚠️ Nilai KM tidak valid'); return; }
if(km===curKm)return;
if(km<curKm){ if(!await askConfirm('KM yang diisi lebih kecil dari catatan terakhir ('+curKm.toLocaleString('id-ID')+' km). Tetap simpan?',{danger:false,okText:'Ya, Simpan'}))return; }
D.kmLogs.push({id:uid(),vehicleId:curVehicleId,date:todayStr(),km,note:''});
save();renderCnTab();renderDashboardServisReminder();
toast('✅ KM diperbarui: '+km.toLocaleString('id-ID')+' km');
}
function openBbmModal(editId){return BBM.openModal(editId);}
function syncBbmCost(){return BBM.syncCost();}
function syncBbmLiterFromCost(){return BBM.syncLiterFromCost();}
function syncBbmHargaChanged(){return BBM.syncHargaChanged();}
function saveBbm(){return BBM.save();}
function deleteBbmFromModal(){return BBM.deleteFromModal();}
function delBbm(id){return BBM.del(id);}
/* moved to modules-render.js: renderBbmList */
function loadMoreBbmList(){return BBM.loadMore();}
/* moved to sparepart-servis.js (2026-07-12, split file besar bagian ke-3): matchingVehicleName,
   codeFromName, Sparepart, autoFillSparepartCode, populateSparepartDatalist, openSparepartModal,
   saveSparepart, delSparepart, populateStockCatSelect, autoFillStockCode, openStockModal,
   saveStock, delStock, populateServisPartSelect, onServisPartChange, onServisItemAutofillInterval,
   openServisModal, TORSI_DB, findTorsiDb, TORSI_NM_PER_KGF/LBFT/LBIN, VEHICLE_SPEC_DB,
   findVehicleSpec, MY_WRENCH_SCALE, revertStockUsage, applyStockUsage, saveServis,
   deleteServisFromModal, delServis, markSparepartServiced, getLastServiceKmForCat,
   editSparepartFromReminder, loadMoreServisList — kategori/stok sparepart, katalog torsi &
   spesifikasi kendaraan referensi, wrapper Servis. */
/* moved to modules-render.js: renderServisList */
// Filter kendaraan untuk kartu Pengingat Servis di Dashboard (dipindah dari
// features-kategori-modal-tagihan-kalender.js v80 (dipecah jadi kategori.js/
// tagihan-kalender.js), lihat PEMISAHAN-FILE-ROADMAP.md)
/* moved to sparepart-servis.js (2026-07-12, split file besar bagian ke-3): dashServisVehFilter,
   setDashServisVehFilter, goToServisFromDash — filter kartu Pengingat Servis di Dashboard. */
/* moved to data-archive.js (2026-07-12, split file besar bagian ke-2): STORAGE_QUOTA_ESTIMATE,
   STORAGE_BIG_MODULES, byteSize, fmtBytes, ARCHIVE_MODULES, archiveSelectedYears, archiveExportedYears,
   archiveGetYear, archiveAvailableYears, openArchiveModal, toggleArchiveYear, archiveCollectByYears,
   updateArchivePreview, archiveExportStep, archiveDeleteStep — estimasi kuota & arsip/hapus data lama. */
/* moved to modules-render.js: renderSettings */
/* moved to chat-action.js (2026-07-12, split file besar bagian ke-1): chatInited, _pendingChatActions,
   chatActionSummary, _repairLooseJson, extractChatAction, chatActionInnerHTML — parsing/format blok
   [[ACTION]] dari balasan AI Chat, tidak terkait domain kendaraan/sparepart/storage di file ini. */
