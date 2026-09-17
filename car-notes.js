
/* KZR 125 (2012) maintenance-rule metadata — additive audit layer.
 * IMPORTANT: this registry does not replace the existing reminder SoT yet.
 * IDs are aligned to SERVICE_CHECKLIST_GROUPS to avoid orphan metadata.
 */
const SERVICE_MAINTENANCE_RULES = Object.freeze({
  'oli-mesin': { inspectKm: 2000, inspectAction: 'periksa', replaceKm: 2500, replaceAction: 'ganti', maintenanceType: 'periodic' },
  'filter-oli': { maintenanceType: 'condition', condition: 'periksa saat penggantian oli atau bila ada indikasi kontaminasi' },
  'filter-kawat-oli-mesin': { inspectKm: 12000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'paking-knalpot': { maintenanceType: 'event_based', condition: 'periksa setiap kali knalpot dilepas; ganti bila gepeng atau bocor' },
  'slide-piece-cvt': { inspectKm: 8000, inspectAction: 'periksa', maintenanceType: 'periodic', condition: 'ganti bersamaan dengan roller bila aus' },
  'boss-pulley-drive-face': { inspectKm: 8000, inspectAction: 'periksa', maintenanceType: 'periodic' },
  'mangkok-kopling-ganda': { inspectKm: 8000, inspectAction: 'periksa', maintenanceType: 'periodic' },
  'seal-driven-face': { inspectKm: 12000, inspectAction: 'periksa', maintenanceType: 'periodic', condition: 'ganti bila bocor atau aus' },
  'per-sentri': { maintenanceType: 'condition', condition: 'ganti bila kendur atau lemah' },
  'pelumasan-cvt-grease': { inspectKm: 8000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'bearing-bak-cvt': { maintenanceType: 'condition', condition: 'periksa dan beri grease bila bergemuruh' },
  'busa-filter-cvt': { inspectKm: 8000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'filter-fuel-pump': { inspectKm: 12000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'ganti 48.000 km atau bila tekanan bahan bakar turun' },
  'oli-shockbreaker': { inspectKm: 15000, inspectAction: 'periksa', replaceAction: 'ganti', replaceKm: 15000, maintenanceType: 'periodic_or_condition', condition: 'ganti saat seal bocor atau kondisi oli menurun' },
  'engine-mounting-bushing-arm': { inspectKm: 12000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'ganti bila getas atau aus' },
  'saklar-sistem-penerangan': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic' },
  'relay-sekring': { inspectKm: 12000, inspectAction: 'periksa', maintenanceType: 'periodic' },
  'busi': { inspectKm: 4000, inspectAction: 'periksa', replaceKm: 8000, replaceAction: 'ganti', maintenanceType: 'periodic' },
  'filter-udara': { replaceKm: 16000, replaceAction: 'ganti', maintenanceType: 'periodic' },
  'coolant': { inspectKm: 4000, inspectAction: 'periksa', replaceKm: 12000, replaceAction: 'ganti', replaceMonths: 24, maintenanceType: 'periodic' },
  'celah-klep': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic' },
  'oli-gardan': { replaceKm: 8000, replaceAction: 'ganti', maintenanceType: 'periodic' },
  'roller-cvt': { inspectKm: 8000, inspectAction: 'periksa', replaceKm: 12000, replaceAction: 'ganti', maintenanceType: 'periodic' },
  'v-belt-cvt': { inspectKm: 8000, inspectAction: 'periksa', replaceKm: 24000, replaceAction: 'ganti', maintenanceType: 'periodic' },
  'kampas-rem-depan': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'aus' },
  'kampas-rem-belakang': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'aus' },
  'cakram-rem-depan': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'aus/ketebalan di bawah batas' },
  'kaliper-rem-depan': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'macet, bocor, atau gerak piston tidak normal' },
  'master-rem-reservoir': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'bocor, level/cairan bermasalah, atau tekanan rem tidak normal' },
  'tromol-rem-belakang': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'aus atau diameter di luar batas' },
  'minyak-rem': { replaceKm: 24000, replaceAction: 'ganti', replaceMonths: 24, maintenanceType: 'periodic' },
  'stel-grease-komstir': { inspectKm: 12000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'setir berat/jeduk' },
  'bearing-roda': { inspectKm: 12000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'oblak atau gemuruh' },
  'aki': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic' },
  'kampas-kopling-ganda': { inspectKm: 8000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'aus' },
  'per-cvt': { inspectKm: 8000, inspectAction: 'periksa', replaceKm: 24000, replaceAction: 'ganti', maintenanceType: 'periodic_or_condition', condition: 'lemah' },
  'pembersihan-rumah-cvt': { inspectKm: 8000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'throttle-body': { inspectKm: 12000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'isc': { inspectKm: 12000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'injector': { inspectKm: 12000, inspectAction: 'bersih', maintenanceType: 'periodic' },
  'thermostat': { maintenanceType: 'condition', condition: 'periksa saat ada gejala sistem pendingin/bersama diagnosis coolant' },
  'kabel-gas-standar-kunci': { maintenanceType: 'condition', condition: 'kabel seret; lumasi bila perlu' },
  // Explicit condition-based coverage for legacy checklist components that do not have a fixed interval.
  'rantai-keteng-tensioner': { maintenanceType: 'condition', condition: 'bunyi abnormal, rantai kendur, atau gejala timing; periksa saat diagnosis' },
  'kompresi-mesin': { maintenanceType: 'condition', condition: 'sulit start, tenaga turun, atau indikasi kompresi tidak normal; periksa saat diagnosis' },
  'selang-tutup-tangki': { maintenanceType: 'condition', condition: 'retak, getas, atau bocor' },
  'radiator-water-pump': { maintenanceType: 'condition', condition: 'kebocoran, overheat, atau sirkulasi coolant bermasalah' },
  'selang-rem': { inspectKm: 4000, inspectAction: 'periksa', maintenanceType: 'periodic_or_condition', condition: 'retak, getas, bocor, atau kerusakan fisik', replaceMonths: 48, replaceAction: 'ganti' },
  'kebocoran-shock': { maintenanceType: 'condition', condition: 'terdapat kebocoran oli pada seal shock' },
  'ban-depan': { inspectDays: 14, inspectAction: 'periksa', maintenanceType: 'periodic', condition: 'tekanan acuan 29 psi' },
  'ban-belakang': { inspectDays: 14, inspectAction: 'periksa', maintenanceType: 'periodic', condition: 'tekanan acuan 33 psi' }
});

/** v17: normalize inspect-vs-replace semantics without changing existing intervals. */
function getMaintenanceActionPlan(rule){
  if(!rule||typeof rule!=='object')return[];
  const out=[];
  const has=(k)=>Number.isFinite(rule[k])&&rule[k]>0;
  if((has('inspectKm')||has('inspectMonths')||has('inspectDays')) && rule.maintenanceType!=='condition' && rule.maintenanceType!=='event_based'){
    out.push({action:rule.inspectAction||'periksa',axis:'inspect',intervalKm:has('inspectKm')?rule.inspectKm:null,intervalMonths:has('inspectMonths')?rule.inspectMonths:null,intervalDays:has('inspectDays')?rule.inspectDays:null});
  }
  if((has('replaceKm')||has('replaceMonths')||has('replaceDays')) && rule.maintenanceType!=='event_based'){
    out.push({action:rule.replaceAction||'ganti',axis:'replace',intervalKm:has('replaceKm')?rule.replaceKm:null,intervalMonths:has('replaceMonths')?rule.replaceMonths:null,intervalDays:has('replaceDays')?rule.replaceDays:null});
  }
  return out;
}
if(typeof window!=='undefined'){
  window.SERVICE_MAINTENANCE_RULES=SERVICE_MAINTENANCE_RULES;
  window.getMaintenanceActionPlan=getMaintenanceActionPlan;
}
function validateMaintenanceRuleRegistry(registry=SERVICE_MAINTENANCE_RULES,catalogGroups=typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog['groups']==='function'?ServiceInputCatalog.groups():[]){
  const allowed=new Set(['periodic','condition','periodic_or_condition','event_based']);
  const ids=[];
  for(const g of (catalogGroups||[])) for(const it of (g.items||[])) if(it&&it.id) ids.push(String(it.id));
  const out={ok:true,missing:[],orphan:[],invalidType:[],invalidSchedule:[],missingCondition:[],invalidAction:[],missingAction:[]};
  for(const id of ids) if(!registry||!registry[id]) out.missing.push(id);
  for(const id of Object.keys(registry||{})) if(!ids.includes(id)) out.orphan.push(id);
  for(const [id,r] of Object.entries(registry||{})){
    if(!r||!allowed.has(r.maintenanceType)) out.invalidType.push(id);
    const nums=['inspectKm','replaceKm','inspectMonths','replaceMonths','inspectDays','replaceDays'];
    const scheduled=nums.some(k=>Number.isFinite(r[k])&&r[k]>0);
    if(r.maintenanceType!=='condition'&&r.maintenanceType!=='event_based'&&!scheduled) out.invalidSchedule.push(id);
    if((r.maintenanceType==='condition'||r.maintenanceType==='periodic_or_condition')&&!String(r.condition||'').trim()) out.missingCondition.push(id);
    if(r.inspectAction!=null&&!['periksa','bersih','catat'].includes(r.inspectAction)) out.invalidAction.push(id+':inspectAction');
    if(r.replaceAction!=null&&!['ganti','bersih','catat'].includes(r.replaceAction)) out.invalidAction.push(id+':replaceAction');
    if((Number.isFinite(r.inspectKm)&&r.inspectKm>0||Number.isFinite(r.inspectMonths)&&r.inspectMonths>0||Number.isFinite(r.inspectDays)&&r.inspectDays>0) && r.inspectAction==null) out.missingAction.push(id+':inspectAction');
    if((Number.isFinite(r.replaceKm)&&r.replaceKm>0||Number.isFinite(r.replaceMonths)&&r.replaceMonths>0||Number.isFinite(r.replaceDays)&&r.replaceDays>0) && r.replaceAction==null) out.missingAction.push(id+':replaceAction');
  }
  out.ok=!Object.values(out).some(v=>Array.isArray(v)&&v.length);
  return out;
}
if(typeof window!=='undefined') window.validateMaintenanceRuleRegistry=validateMaintenanceRuleRegistry;


/**
 * Maintenance reminder projection — v8.
 *
 * D.sparepartCats remains the persisted category SoT. For checklist components
 * that have a canonical maintenance rule but no persisted sparepart category,
 * Reminder receives a deterministic in-memory projection. This closes the
 * "linkCat:false => no Reminder" gap without creating a second persisted
 * reminder/interval store.
 */
function getMaintenanceReminderProjection(vehicleId){
  if(!vehicleId||typeof ServiceInputCatalog==='undefined'||typeof ServiceInputCatalog['groups']!=='function')return[];
  if(typeof vehicleMatchesMaintenanceRuleSet==='function'&&!vehicleMatchesMaintenanceRuleSet(vehicleId))return[];
  const out=[];
  const groups=ServiceInputCatalog.groups()||[];
  for(const g of groups){
    for(const it of (g.items||[])){
      const rule=SERVICE_MAINTENANCE_RULES[it.id];
      if(!rule||rule.maintenanceType==='event_based')continue;
      const hasSchedule=(rule.inspectKm>0||rule.replaceKm>0||rule.inspectMonths>0||rule.replaceMonths>0||rule.inspectDays>0||rule.replaceDays>0);
      if(!hasSchedule)continue;
      const exists=(D.sparepartCats||[]).some(c=>c&&(
        c.serviceComponentId===it.id || c.maintenanceRuleId===it.id ||
        String(c.id||'')===it.id || String(c.name||'').trim().toLowerCase()===String(it.name||'').trim().toLowerCase()
      ));
      if(exists)continue;
      out.push({
        id:`__maint__${vehicleId}__${it.id}`,
        name:it.name,
        code:'',
        intervalKm:null,
        intervalBulan:null,
        showInReminder:true,
        vehicleId,
        group:g.group,
        groupIcon:g.icon||'',
        serviceComponentId:it.id,
        maintenanceRuleId:it.id,
        actionMode:it.actionMode||'periksa',
        resetType:it.resetType||'km',
        gantiResetsInterval:it.gantiResetsInterval,
        maintenanceActionPlan:getMaintenanceActionPlan(rule),
        _maintenanceProjection:true
      });
    }
  }
  return out;
}
function getMaintenanceConditionProjection(vehicleId){
  if(!vehicleId||typeof ServiceInputCatalog==='undefined'||typeof ServiceInputCatalog['groups']!=='function')return[];
  if(typeof vehicleMatchesMaintenanceRuleSet==='function'&&!vehicleMatchesMaintenanceRuleSet(vehicleId))return[];
  const out=[];
  for(const g of ServiceInputCatalog.groups()||[]){
    for(const it of (g.items||[])){
      const rule=SERVICE_MAINTENANCE_RULES[it.id];
      if(!rule||rule.maintenanceType!=='condition'||!String(rule.condition||'').trim())continue;
      const exists=(D.sparepartCats||[]).some(c=>c&&(
        c.serviceComponentId===it.id || c.maintenanceRuleId===it.id ||
        String(c.id||'')===it.id || String(c.name||'').trim().toLowerCase()===String(it.name||'').trim().toLowerCase()
      ));
      if(exists)continue;
      out.push({
        id:`__maint_condition__${vehicleId}__${it.id}`, name:it.name, code:'',
        showInReminder:true, vehicleId, group:g.group, groupIcon:g.icon||'',
        serviceComponentId:it.id, maintenanceRuleId:it.id,
        maintenanceType:'condition', condition:rule.condition,
        maintenanceActionPlan:getMaintenanceActionPlan(rule), _maintenanceConditionProjection:true
      });
    }
  }
  return out;
}
function getReminderCategoriesForVehicle(vehicleId){
  const base=Array.isArray(D.sparepartCats)?D.sparepartCats.slice():[];
  return base.concat(getMaintenanceReminderProjection(vehicleId));
}
function resolveReminderCategory(catId,vehicleId){
  const hit=(D.sparepartCats||[]).find(c=>c&&c.id===catId);
  if(hit)return hit;
  return getMaintenanceReminderProjection(vehicleId).find(c=>c.id===catId)||null;
}
if(typeof window!=='undefined'){
  window.getMaintenanceReminderProjection=getMaintenanceReminderProjection;
  window.getMaintenanceConditionProjection=getMaintenanceConditionProjection;
  window.getReminderCategoriesForVehicle=getReminderCategoriesForVehicle;
  window.resolveReminderCategory=resolveReminderCategory;
}

// car-notes.js — Catatan Kendaraan (Car Notes): pajak kendaraan (VEHTAX), log BBM, log servis + pengingat interval, kalkulator Torsi baut.
// Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian Car Notes — lihat docs/FILE-MAP.md & RENCANA-SESI.md).
// Isi: VEHTAX_ITEMS/VEHTAX_INPUT_IDS (konstanta jadwal pajak STNK/ganti plat/uji kelayakan) + const BBM (catat isi BBM, hitung km/L, grafik tren) + const Servis (catat servis, pemakaian stok sparepart, pengingat interval per kategori) + TORSI_STANDARD_CAT/MY_WRENCH + const Torsi (kalkulator konversi & gauge visual torsi baut).
// PENTING: dimuat di GROUP_A build.js, tepat setelah budget.js (posisi lama features-budget-laporan-carnotes-pelanggan.js) — urutan load antar file GROUP_A jangan diubah sembarangan.

const VEHTAX_ITEMS={
tahunan:{label:'🧾 STNK Tahunan',tglKey:'pajakTahunanTgl',biayaKey:'biayaTahunan',advance:d=>d.setFullYear(d.getFullYear()+1)},
limaTahun:{label:'🔄 Ganti Plat (5th)',tglKey:'pajakLimaTahunTgl',biayaKey:'biayaLimaTahun',advance:d=>d.setFullYear(d.getFullYear()+5)},
uji:{label:'🚗 Uji Kelayakan',tglKey:'ujiKelayakanTgl',biayaKey:'biayaUji',advance:d=>d.setMonth(d.getMonth()+6)}
};
const VEHTAX_INPUT_IDS={
tahunan:{date:'vehTaxTahunan',biaya:'vehBiayaTahunan'},
limaTahun:{date:'vehTaxLimaTahun',biaya:'vehBiayaLimaTahun'},
uji:{date:'vehTaxUji',biaya:'vehBiayaUji'}
};
// Estimasi biaya pajak kendaraan dari histori pembayaran sebelumnya — pola SAMA PERSIS
// PriceReko.autoFillTransport() (modules/shop/cobek-pricing.js): rata-rata dari transaksi
// terakhir, bukan hitung ulang tarif resmi. Sumber data 100% reuse: bayarPajakKendaraan()
// (di bawah) sudah mencatat tiap pembayaran ke D.transactions dgn note persis
// `<label tanpa emoji> - <nama kendaraan>` — fungsi ini murni membaca ulang histori itu,
// TIDAK ada tabel/field baru di D.
function vehTaxHistoryEstimate(vehicleId,jenis){
const v=(D.vehicles||[]).find(x=>x.id===vehicleId);
const cfg=VEHTAX_ITEMS[jenis];
if(!v||!cfg)return null;
const noteMatch=cfg.label.replace(/^\S+\s/,'')+' - '+v.name;
const paid=(D.transactions||[]).filter(t=>t.type==='expense'&&t.note===noteMatch&&t.amount>0).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-5);
if(!paid.length)return null;
return Math.round(paid.reduce((s,t)=>s+t.amount,0)/paid.length);
}
function autoFillVehTaxBiaya(jenis){
const vehicleId=document.getElementById('vehTaxModal').dataset.vehicleId;
const ids=VEHTAX_INPUT_IDS[jenis];
if(!ids)return;
const est=vehTaxHistoryEstimate(vehicleId,jenis);
if(est===null){toast('⚠️ Belum ada histori pembayaran '+(VEHTAX_ITEMS[jenis]?.label.replace(/^\S+\s/,'')||'')+' buat kendaraan ini — bayar sekali dulu lewat tombol ✅ Bayar biar tercatat.');return;}
const el=document.getElementById(ids.biaya);
if(el)el.value=est;
toast('✅ Diisi dari rata-rata pembayaran sebelumnya: '+fmtFull(est)+' — sesuaikan lagi kalau tarif resmi terbaru beda.',7000);
}
// onBbmJenisChange() — wrapper utk data-onchange="onBbmJenisChange" di dropdown
// #bbmJenis (bbmModal, modules/shared/modals.js). Gap ditemukan lewat laporan
// user (toast "Input ini belum berfungsi") + dikonfirmasi lewat audit statis
// data-action/data-onchange di modals.js: markup & test s753 sudah mengasumsikan
// wrapper ini ADA (lihat tests/fuel-jenis-wiring-s753.test.js), tapi definisinya
// sendiri belum pernah ditulis -- beda dari onTxBbmJenisChange (txModal, sudah
// ada di modules/finance/tx-bbm.js) yang jadi pola acuan di sini. Perilaku
// disamakan persis: begitu jenis BBM diganti, harga referensi (#bbmHarga)
// di-refresh sesuai jenis baru untuk kendaraan aktif (curVehicleId).
function onBbmJenisChange(){
if(typeof FuelPriceRef!=='undefined'){
FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId);
}
}
// S1812: skip redundant BBM list DOM writes when pagination/filter state renders
// the same visible rows. No async behavior or public API is changed.
function __kwBbmSetHTMLIfChanged(el, html){
  if(!el || el.innerHTML===html)return false;
  el.innerHTML=html;
  return true;
}
const BBM={
editId:null,
listPage:1,
lastFilterSig:null,
// Sesi 1C ralat: checklist sekarang hidup DI DALAM alur Catat Servis,
// bukan modal terpisah/Torsi-only. State ini in-memory dan mengikuti modal.
_serviceChecklistGroupIdx:null,
openModal(editId){
BBM.editId=(typeof editId!=='undefined')?editId:null;
const isEdit=BBM.editId!==null;
document.getElementById('bbmModalTitle').textContent=isEdit?'Edit Catatan BBM':'Catat Isi BBM';
document.getElementById('bbmDelBtn').style.display=isEdit?'flex':'none';
const bbmAccEl=document.getElementById('bbmAcc');
if(bbmAccEl) bbmAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
if(typeof FuelPriceRef!=='undefined')FuelPriceRef.populateSelect('bbmJenis',curVehicleId);
if(isEdit){
const b=D.bbmLogs.find(x=>x.id===BBM.editId);
if(!b)return;
document.getElementById('bbmDate').value=b.date;
document.getElementById('bbmKm').value=b.km;
document.getElementById('bbmLiter').value=b.liter;
document.getElementById('bbmHarga').value=b.harga||'';
document.getElementById('bbmCost').value=b.cost;
document.getElementById('bbmSpbu').value=b.spbu||'';
document.getElementById('bbmFull').checked=!!b.fullTank;
document.getElementById('bbmNote').value=b.note||'';
if(bbmAccEl&&b.accountId)bbmAccEl.value=b.accountId;
// Edit: set dropdown Jenis BBM ke jenis tersimpan TANPA menimpa harga
// (populateSelect() di atas sudah isi opsi + default lastType; di sini
// cuma override value-nya sesuai catatan yang diedit, kalau ada).
if(b.jenis){
const jenisEl=document.getElementById('bbmJenis');
if(jenisEl)jenisEl.value=b.jenis;
} else if(typeof FuelPriceRef!=='undefined'){
FuelPriceRef.selectUnknown('bbmJenis');
}
} else {
document.getElementById('bbmDate').value=new Date().toISOString().split('T')[0];
['bbmLiter','bbmHarga','bbmCost','bbmSpbu','bbmNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('bbmKm').value=getVehicleKm(curVehicleId)||'';
document.getElementById('bbmFull').checked=true;
// Entry baru: isi harga referensi sesuai jenis default yang terpilih
// (per-kendaraan, Sesi 755 -- lihat SESSION-NOTE S755).
if(typeof FuelPriceRef!=='undefined')FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId);
}
openModal('bbmModal');
},
syncCost(){
const liter=parseFloat(document.getElementById('bbmLiter').value);
const harga=parseFloat(document.getElementById('bbmHarga').value);
if(liter&&harga)document.getElementById('bbmCost').value=Math.round(liter*harga);
},
syncLiterFromCost(){
const harga=parseFloat(document.getElementById('bbmHarga').value);
const cost=parseFloat(document.getElementById('bbmCost').value);
if(harga>0&&cost>0){
document.getElementById('bbmLiter').value=(cost/harga).toFixed(2);
}
},
syncHargaChanged(){
const liter=parseFloat(document.getElementById('bbmLiter').value);
const harga=parseFloat(document.getElementById('bbmHarga').value);
const cost=parseFloat(document.getElementById('bbmCost').value);
if(liter>0&&harga>0){
document.getElementById('bbmCost').value=Math.round(liter*harga);
}else if(harga>0&&cost>0){
document.getElementById('bbmLiter').value=(cost/harga).toFixed(2);
}
},
save(){return withSaveGuard('bbm','bbmModal',BBM._saveInner);},
_saveInner(){
const km=parseFloat(document.getElementById('bbmKm').value);
const liter=parseFloat(document.getElementById('bbmLiter').value);
let cost=parseFloat(document.getElementById('bbmCost').value);
let harga=parseFloat(document.getElementById('bbmHarga').value);
if(!km||!liter||!cost){toast('⚠️ Lengkapi KM, liter, dan biaya');return;}
const spbu=document.getElementById('bbmSpbu').value.trim();
const fullTank=document.getElementById('bbmFull').checked;
const date=document.getElementById('bbmDate').value;
const note=document.getElementById('bbmNote').value;
const accId=document.getElementById('bbmAcc')?document.getElementById('bbmAcc').value:D.accounts[0]?.id;
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const noteFull='BBM'+(veh?' '+veh.name:'')+(spbu?' - '+spbu:'')+(note?' - '+note:'');
const isEdit=BBM.editId!==null;
const existing=isEdit?D.bbmLogs.find(x=>x.id===BBM.editId):null;
if(isEdit&&!existing){toast('⚠️ Data tidak ditemukan');return;}
// BUGFIX: catatan BBM "yatim" (existing.txLinkId hilang, mis. transaksi
// terkaitnya kehapus manual) dulu SILENTLY tetap tidak tersinkron kalau
// diedit, krn txId jatuh ke null & cabang "if(txId)" di bawah dilewati.
// Sekarang: kalau ketahuan yatim saat edit, generate txId baru & buat
// ulang transaksinya (sama seperti alur catatan baru), bukan dibiarkan.
const wasOrphan=isEdit&&!existing.txLinkId;
const txId=isEdit?(existing.txLinkId||uid()):uid();
const jenisEl=document.getElementById('bbmJenis');
const jenis=jenisEl?jenisEl.value:undefined;
const result=recordBbmLog({
vehicleId:curVehicleId,date,km,liter,harga,cost,spbu,fullTank,note,accountId:accId,jenis,
txId,existingBbmId:isEdit?BBM.editId:null
});
if(isEdit){
if(wasOrphan){
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Bensin',accountId:accId,payMethod:'tunai',note:noteFull,date,bbmLinkId:result.bbmId});
const b=D.bbmLogs.find(x=>x.id===result.bbmId);
if(b)b.txLinkId=txId;
toast('✅ Catatan BBM diperbarui & disinkron ulang ke Keuangan');
}else{
const tx=D.transactions.find(t=>t.id===txId);
if(tx)Object.assign(tx,{amount:cost,date,accountId:accId,note:noteFull});
toast('✅ Catatan BBM diperbarui');
}
} else {
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Bensin',accountId:accId,payMethod:'tunai',note:noteFull,date,bbmLinkId:result.bbmId});
toast('✅ Catatan BBM tersimpan & tersinkron ke Keuangan');
}
save();closeModal('bbmModal');renderCnTab();renderDashboard();renderKeuangan();
// TASK-152 (Fuel Finance Integration): samakan dgn pola _saveTxInner()
// di transaksi.js (transaksi umum dgn sinkron BBM lewat tx-bbm.js) yang
// SUDAH emit AIBus "finance.updated" tiap transaksi tersimpan -- sebelum
// ini, catatan BBM lewat modal "Catat Isi BBM" (jalur INI) tidak pernah
// memancarkan event itu, jadi AIDecision/AIService (modules/ai/ai-service.js
// wireEvents(), SUDAH ADA) tidak pernah tahu ada transaksi BBM baru kalau
// user masuk lewat Car Notes bukan lewat form Transaksi umum. 0 field baru
// di payload selain yang sudah dipakai transaksi.js (txId/category/type/
// amount) + `kind:'bbm'` (pola sama dgn kind:"cicilan-baru"/"langganan" di
// transaksi.js) supaya listener bisa membedakan asal event kalau perlu,
// TANPA mengubah bentuk dasar payload. TIDAK menyentuh AIBus/AIService/
// FuelInsightEngine sama sekali -- murni tambah 1 pemancar event dari sisi
// ini, reuse bus yang sudah ada apa adanya.
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'bbm'});
},
deleteFromModal(){if(BBM.editId===null)return;const id=BBM.editId;closeModal('bbmModal');BBM.del(id);},
async del(id){
if(!await askConfirm('Hapus catatan ini? Catatan keuangan terkait juga akan dihapus.'))return;
const b=D.bbmLogs.find(x=>x.id===id);
if(b&&b.txLinkId)D.transactions=D.transactions.filter(tx=>tx.id!==b.txLinkId);
D.bbmLogs=D.bbmLogs.filter(b=>b.id!==id);
save();renderCnTab();renderDashboard();renderKeuangan();toast('🗑 Catatan BBM dihapus');
},
svgCostBar(months,byMonth){
if(!months.length)return '<div class="u-fs12 u-t2 u-tac" style="padding:14px 0">Belum ada data biaya BBM di periode ini.</div>';
const maxCost=Math.max(...months.map(m=>byMonth[m].cost),1);
const barW=34,gap=18,padL=10,chartH=64;
const w=months.length*(barW+gap)+padL;
let bars='';
months.forEach((m,idx)=>{
const val=byMonth[m].cost;
const h=Math.max(4,Math.round((val/maxCost)*chartH));
const x=padL+idx*(barW+gap);
const y=chartH-h+18;
bars+=`<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5" style="fill:var(--accent2)"/>`
+`<text x="${x+barW/2}" y="${y-6}" text-anchor="middle" style="font-size:9px;fill:var(--text2);font-family:'Plus Jakarta Sans',sans-serif">${fmt(val)}</text>`
+`<text x="${x+barW/2}" y="${chartH+32}" text-anchor="middle" style="font-size:9px;fill:var(--text3);font-family:'Plus Jakarta Sans',sans-serif">${byMonth[m].label}</text>`;
});
return `<svg class="u-w100" viewBox="0 0 ${w} ${chartH+40}" style="height:auto;display:block">${bars}</svg>`;
},
svgEffLine(points){
if(points.length<2)return '<div class="u-fs12 u-t2 u-tac" style="padding:14px 0">Butuh minimal 3 isi BBM "penuh" (full tank) berurutan buat menghitung tren efisiensi.</div>';
const vals=points.map(p=>p.kml);
const max=Math.max(...vals),min=Math.min(...vals);
const range=(max-min)||1;
const padT=14,padB=22,padX=10;
const w=Math.max(points.length*54,200),h=64;
const stepX=points.length>1?(w-padX*2)/(points.length-1):0;
const coords=points.map((p,i)=>({x:padX+i*stepX,y:padT+(1-(p.kml-min)/range)*(h-padT-padB),...p}));
const poly=coords.map(c=>`${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
let dots='';
coords.forEach(c=>{
dots+=`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" style="fill:var(--accent3)"/>`
+`<text x="${c.x.toFixed(1)}" y="${(c.y-8).toFixed(1)}" text-anchor="middle" style="font-size:9px;fill:var(--text2);font-family:'Plus Jakarta Sans',sans-serif">${c.kml.toFixed(1)}</text>`
+`<text x="${c.x.toFixed(1)}" y="${h+10}" text-anchor="middle" style="font-size:8px;fill:var(--text3);font-family:'Plus Jakarta Sans',sans-serif">${c.label}</text>`;
});
return `<svg class="u-w100" viewBox="0 0 ${w} ${h+20}" style="height:auto;display:block"><polyline points="${poly}" style="fill:none;stroke:var(--accent3);stroke-width:2"/>${dots}</svg>`;
},
renderTrend(logs){
const box=document.getElementById('bbmTrendCard');
if(!box)return;
const byMonth={};
logs.forEach(b=>{
const d=new Date(b.date);
if(isNaN(d))return;
const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
if(!byMonth[key])byMonth[key]={cost:0,label:d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'})};
byMonth[key].cost+=b.cost;
});
const months=Object.keys(byMonth).sort().slice(-6);
const sortedByKm=[...logs].sort((a,b)=>a.km-b.km);
const fullIdx=sortedByKm.map((b,i)=>b.fullTank?i:-1).filter(i=>i>=0);
const effPoints=[];
for(let n=0;n<fullIdx.length-1;n++){
const i=fullIdx[n],j=fullIdx[n+1];
const kmDist=sortedByKm[j].km-sortedByKm[i].km;
const literUsed=sortedByKm.slice(i+1,j+1).reduce((s,x)=>s+x.liter,0);
if(kmDist>0&&literUsed>0)effPoints.push({kml:kmDist/literUsed,label:new Date(sortedByKm[j].date).toLocaleDateString('id-ID',{day:'2-digit',month:'short'})});
}
const lastEff=effPoints.slice(-8);
box.innerHTML=`<div class="card-title">📈 Tren BBM</div>
      <div class="u-fs11 u-t2 u-fw700 u-mb6">💸 Biaya per Bulan (${months.length?'6 bulan terakhir':'-'})</div>
      ${BBM.svgCostBar(months,byMonth)}
      <div style="height:1px;background:var(--border);margin:14px 0"></div>
      <div class="u-fs11 u-t2 u-fw700 u-mb6">⚡ Efisiensi km/liter (per isi penuh, ${lastEff.length||0} data terakhir)</div>
      ${BBM.svgEffLine(lastEff)}`;
},
renderList(){
const {from,to}=getCnRange();
const filterSig=curVehicleId+'|'+(+from)+'|'+(+to);
if(filterSig!==BBM.lastFilterSig){BBM.listPage=1;BBM.lastFilterSig=filterSig;}
const logs=D.bbmLogs.filter(b=>b.vehicleId===curVehicleId&&new Date(b.date)>=from&&new Date(b.date)<=to).sort((a,b)=>a.km-b.km);
const totalL=logs.reduce((s,b)=>s+b.liter,0);
const totalCost=logs.reduce((s,b)=>s+b.cost,0);
let avgKmL=0;
const fullIdx=logs.map((b,i)=>b.fullTank?i:-1).filter(i=>i>=0);
if(fullIdx.length>=2){
let totalKmDist=0,totalLiterUsed=0;
for(let n=0;n<fullIdx.length-1;n++){
const i=fullIdx[n],j=fullIdx[n+1];
const kmDist=logs[j].km-logs[i].km;
const literUsed=logs.slice(i+1,j+1).reduce((s,b)=>s+b.liter,0);
if(kmDist>0&&literUsed>0){totalKmDist+=kmDist;totalLiterUsed+=literUsed;}
}
if(totalLiterUsed>0)avgKmL=totalKmDist/totalLiterUsed;
} else if(logs.length>=2){
const totalJarak=logs[logs.length-1].km-logs[0].km;
const literTanpaAwal=logs.slice(1).reduce((s,b)=>s+b.liter,0);
avgKmL=literTanpaAwal>0?(totalJarak/literTanpaAwal):0;
}
document.getElementById('bbmAvgKmL').textContent=avgKmL?avgKmL.toFixed(1):'-';
document.getElementById('bbmTotalL').textContent=totalL.toFixed(1)+' L';
document.getElementById('bbmTotalCost').textContent=fmt(totalCost);
BBM.renderTrend(logs);
const sorted=[...logs].sort((a,b)=>b.km-a.km);
const el=document.getElementById('bbmList');
if(!sorted.length){el.innerHTML='<div class="empty"><div class="empty-icon">⛽</div><div class="empty-text">Belum ada catatan BBM</div></div>';return;}
const prevMap=new Map(), cumLiterMap=new Map();
{
let prevDistinct=null,cum=0,i=0;
while(i<logs.length){
let j=i,groupLiter=0;
while(j<logs.length&&logs[j].km===logs[i].km){groupLiter+=(logs[j].liter||0);j++;}
cum+=groupLiter;
for(let k=i;k<j;k++){prevMap.set(logs[k].id,prevDistinct);cumLiterMap.set(logs[k].id,cum);}
prevDistinct=logs[j-1];
i=j;
}
}
const visibleCount=Math.min(sorted.length,BBM.listPage*TX_PAGE_SIZE);
const visible=sorted.slice(0,visibleCount);
__kwBbmSetHTMLIfChanged(el,visible.map((b)=>{
const prev=prevMap.get(b.id)||null;
let kmL=null;
if(prev&&b.fullTank){
const jarak=b.km-prev.km;
const literSejak=cumLiterMap.get(b.id)-(prev?cumLiterMap.get(prev.id):0);
kmL=(jarak>0&&literSejak>0)?(jarak/literSejak):null;
}
return`<div class="tx-item u-pointer" data-action="openBbmModal" data-args="${escapeHtml(JSON.stringify([b.id]))}">
        <div class="tx-icon" style="background:var(--accent4-soft)">⛽</div>
        <div class="tx-info"><div class="tx-name">${b.km!=null?b.km.toLocaleString('id-ID')+' km':'(km tidak dicatat)'} · ${b.liter}L${b.harga?' · Rp'+Math.round(b.harga).toLocaleString('id-ID')+'/L':''}</div><div class="tx-meta">${b.date}${b.spbu?' · '+escapeHtml(b.spbu):''}${b.fullTank?' · Full Tank':' · Isi sebagian'}${b.note?' · '+escapeHtml(b.note):''}</div></div>
        <div class="u-flex u-fdcol u-gap4" style="align-items:flex-end">
          <div class="tx-amount red">${fmt(b.cost)}</div>
          ${kmL?`<span class="kmL-badge">${kmL.toFixed(1)} km/L</span>`:''}
        </div>
        <button class="tx-del" data-stop="1" data-action="delBbm" data-args="${escapeHtml(JSON.stringify([b.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join(''));
let bbmMoreWrap=document.getElementById('bbmListLoadMoreWrap');
if(!bbmMoreWrap){
bbmMoreWrap=document.createElement('div');
bbmMoreWrap.id='bbmListLoadMoreWrap';
bbmMoreWrap.style.cssText='text-align:center;margin-top:10px';
bbmMoreWrap.innerHTML='<button class="btn btn-ghost btn-sm" data-action="loadMoreBbmList" aria-label="Tampilkan lebih banyak riwayat BBM"></button>';
el.insertAdjacentElement('afterend',bbmMoreWrap);
}
if(visibleCount<sorted.length){
bbmMoreWrap.style.display='block';
bbmMoreWrap.querySelector('button').textContent=`⬇️ Tampilkan lebih banyak (${sorted.length-visibleCount} lagi)`;
} else bbmMoreWrap.style.display='none';
},
loadMore(){BBM.listPage++;BBM.renderList();}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['BBM'][method]. `const BBM = {...}` di atas HANYA membuat binding
// lexical-scope (bukan properti window), pola fix sama persis window.FuelModal
// di fuel-modal.js (bug yang sama pernah terjadi & diperbaiki di sana).
// Tanpa baris ini, semua tombol data-action="BBM.xxx" gagal diam-diam.
if (typeof BBM !== 'undefined') window.BBM = BBM;
function refreshServiceReminderState(){
  // P19: Reminder is a projection, never a second datastore. After any
  // service mutation, refresh the projection explicitly so Edit/Delete and
  // direct modal flows cannot leave a stale reminder card.
  try{ if(typeof Servis!=='undefined'&&Servis&&typeof Servis.renderReminder==='function')Servis.renderReminder(); }catch(err){ console.error('P19: reminder refresh failed',err); }
  try{ if(typeof renderDashboardServisReminder==='function')renderDashboardServisReminder(); }catch(err){ console.error('P19: dashboard reminder refresh failed',err); }
}

// Servis canonical source: modules/vehicle/servis.js (GROUP_B).
const TORSI_STANDARD_CAT={cat:'Standar (Umum)', icon:'🔩', items:[
{name:'Baut hex 5 mm & mur', ulir:'5 mm', nm:5.2, kgf:0.5},
{name:'Baut hex 6 mm & mur (termasuk baut flens SH)', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut hex 8 mm & mur', ulir:'8 mm', nm:22, kgf:2.2},
{name:'Baut hex 10 mm & mur', ulir:'10 mm', nm:34, kgf:3.5},
{name:'Baut hex 12 mm & mur', ulir:'12 mm', nm:54, kgf:5.5},
{name:'Sekrup 5 mm', ulir:'5 mm', nm:4.2, kgf:0.4},
{name:'Sekrup 6 mm', ulir:'6 mm', nm:9.0, kgf:0.9},
{name:'Baut flens 6 mm (termasuk NSHF) & mur', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Baut & mur flens 8 mm', ulir:'8 mm', nm:27, kgf:2.8},
{name:'Baut & mur flens 10 mm', ulir:'10 mm', nm:39, kgf:4.0},
]};
const MY_WRENCH={brand:'MOLLAR',sku:'MLR-B11950',minNm:13.56,maxNm:108.48,minLbft:10,maxLbft:80,panjang:280};
const Torsi={
mode:'catalog', selected:null, activeCat:'Semua', extOpen:false,
pageMode:'normal', checked:{}, biaya:{}, cats:[TORSI_STANDARD_CAT], db:null,
// _selectedVehicleId — state in-memory murni (bukan field D baru), pola sama
// ShopKatalogDinamisPresenter._selectedVehicleId (lihat DESIGN dok. A.4.1).
// Default diisi curVehicleId tiap open(); dipakai toggleCheck()/updateBiaya()
// supaya baca/tulis lewat TorsiVehicleAPI, independen dari curVehicleId global.
_selectedVehicleId:null,
itemKey(cat,name){return cat+'|'+name;},
computeCats(){
const veh=D.vehicles.find(v=>v.id===curVehicleId);
this.db=veh?findTorsiDb(veh.name,veh.modelId):null;
this.cats=[TORSI_STANDARD_CAT,...(this.db?this.db.cats:[])];
},
renderSourceNote(){
const el=document.getElementById('trsSourceNote');
if(!el)return;
el.textContent='📘 Sumber: '+(this.db?this.db.sourceNote:'Torsi standar umum (baut/mur/sekrup standar Honda). Belum ada data referensi spesifik untuk model kendaraan ini.');
},
fmt(v){if(v===null||v===undefined||isNaN(v))return '–';return (Math.round(v*100)/100).toString();},
findStock(name){
const n=name.toLowerCase();
return D.partsStock.find(p=>p.name.toLowerCase()===n||p.name.toLowerCase().includes(n)||n.includes(p.name.toLowerCase()))||null;
},
loadPersisted(){
if(!D.torsiChecklist)D.torsiChecklist={};
const rec=D.torsiChecklist[curVehicleId];
this.checked=rec&&rec.checked?{...rec.checked}:{};
this.biaya=rec&&rec.biaya?{...rec.biaya}:{};
this.pageMode=(rec&&rec.pageMode)||'normal';
},
persist(){
if(!D.torsiChecklist)D.torsiChecklist={};
D.torsiChecklist[curVehicleId]={checked:this.checked,biaya:this.biaya,pageMode:this.pageMode};
save();
},
open(){
this.mode='catalog';this.selected=null;this.activeCat='Semua';this.extOpen=false;
// Default per A.4.1: mulai dari kendaraan aktif global tiap modal dibuka.
this._selectedVehicleId=curVehicleId;
this.loadPersisted();
this.computeCats();
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const km=getVehicleKm(curVehicleId)||0;
document.getElementById('trsVehChip').textContent=(veh?veh.emoji+' '+veh.name:'')+' · '+km.toLocaleString('id-ID')+' km';
this.renderVehicleSelect();
this.renderSourceNote();
document.getElementById('trsSearchInput').value='';
document.getElementById('trsManualTorsiInput').value='';
this.setCalcMode('catalog');
this.setPageMode(this.pageMode||'normal');
this.chips();
this.renderList();
openModal('torsiModal');
},
// renderVehicleSelect() — isi <select id="trsVehicleSelect"> dari
// TorsiVehicleAPI.daftarKendaraan() (lihat DESIGN dok. A.4). 100% reuse
// kontrak {ok,count,list} yang sudah dipakai ShopKatalogDinamisPresenter —
// tidak ada query/hitungan baru di sini, murni render pilihan.
renderVehicleSelect(){
const sel=document.getElementById('trsVehicleSelect');
if(!sel)return;
if(typeof TorsiVehicleAPI==='undefined'){sel.innerHTML='';return;}
const dk=TorsiVehicleAPI.daftarKendaraan();
if(!dk.ok||dk.count===0){sel.innerHTML='<option value="">— Belum ada kendaraan —</option>';return;}
if(!this._selectedVehicleId||!dk.list.some(v=>v.id===this._selectedVehicleId)){
this._selectedVehicleId=dk.list[0].id;
}
sel.innerHTML=dk.list.map(v=>`<option value="${escapeHtml(v.id)}"${v.id===this._selectedVehicleId?' selected':''}>${v.emoji} ${escapeHtml(v.name)}</option>`).join('');
},
// onVehicleChange(el) — dipanggil dari onchange <select id="trsVehicleSelect">
// (lihat DESIGN dok. A.4.1). Ganti this._selectedVehicleId (in-memory saja,
// TIDAK menyentuh curVehicleId global maupun D — pola sama persis
// ShopKatalogDinamisPresenter.onVehicleChange()), lalu baca checklist
// kendaraan terpilih APA ADANYA lewat TorsiVehicleAPI.checklistUntuk()
// (read-only, 0 side-effect) & render ulang daftar part + trsVehChip.
// CATATAN: sengaja TIDAK memanggil this.setPageMode()/this.persist() di sini
// — keduanya menulis ke D.torsiChecklist[curVehicleId] (lihat persist()),
// bukan ke vehicleId yang baru dipilih; toggle UI mode diperbarui manual
// di bawah supaya tidak salah menulis ke kendaraan aktif global.
onVehicleChange(el){
const vehicleId=el&&el.value;
if(!vehicleId)return;
this._selectedVehicleId=vehicleId;
const res=TorsiVehicleAPI.checklistUntuk(vehicleId);
if(!res.ok){toast(res.reason||'Kendaraan tidak ditemukan');return;}
this.checked={...res.checked};
this.biaya={...res.biaya};
this.pageMode=res.pageMode;
document.getElementById('trsTopModeNormal').classList.toggle('active',this.pageMode==='normal');
document.getElementById('trsTopModeChecklist').classList.toggle('active',this.pageMode==='checklist');
document.getElementById('trsSummaryBar').classList.toggle('show',this.pageMode==='checklist');
const km=getVehicleKm(vehicleId)||0;
const veh=D.vehicles.find(v=>v.id===vehicleId);
document.getElementById('trsVehChip').textContent=(veh?veh.emoji+' '+veh.name:res.kendaraan.name)+' · '+km.toLocaleString('id-ID')+' km';
this.renderList();
this.updateSummary();
},
chips(){
const cats=['Semua',...this.cats.map(d=>d.cat)];
document.getElementById('trsChipRow').innerHTML=cats.map(c=>`<div class="trs-chip ${c===Torsi.activeCat?'active':''}" data-action="Torsi.setCat" data-args="${escapeHtml(JSON.stringify([c]))}">${c==='Semua'?'🔍 Semua':escapeHtml(c)}</div>`).join('');
},
setCat(c){this.activeCat=c;this.chips();this.renderList();},
setCalcMode(m){
this.mode=m;
document.getElementById('trsModeCatalog').classList.toggle('active',m==='catalog');
document.getElementById('trsModeManual').classList.toggle('active',m==='manual');
document.getElementById('trsManualInputWrap').style.display=m==='manual'?'block':'none';
if(m==='manual')this.onManualInput();else this.updateGauge();
},
onManualInput(){
const v=parseFloat(document.getElementById('trsManualTorsiInput').value);
document.getElementById('trsGaugePartName').textContent=isNaN(v)?'Masukkan nilai torsi (N·m)':'✍️ Input manual';
this.renderGaugeValues(isNaN(v)?null:v);
},
updateGauge(){
if(this.selected){
document.getElementById('trsGaugePartName').textContent='🔩 '+this.selected.name;
this.renderGaugeValues(this.selected.nm,this.selected.note);
} else {
document.getElementById('trsGaugePartName').textContent='Pilih sparepart di bawah ⤵️';
this.renderGaugeValues(null);
}
},
selectPart(catName,itemName){
let it=null;
const cat=this.cats.find(d=>d.cat===catName);
if(cat)it=cat.items.find(x=>x.name===itemName);
if(!it||it.noTorque)return;
this.selected=it;
this.setCalcMode('catalog');
document.getElementById('trsGaugePartName').textContent='🔩 '+it.name;
this.renderGaugeValues(it.nm,it.note);
toast('✅ Dimuat ke kalkulator: '+it.name);
document.querySelector('#torsiModal .modal').scrollTop=0;
},
renderGaugeValues(nm,note){
const gv=document.getElementById('trsGaugeVal'),sub=document.getElementById('trsGaugeSub');
if(nm===null||nm===undefined||isNaN(nm)){
gv.textContent='–';sub.textContent='';
['nm','kgf','lbft','lbin'].forEach(u=>document.getElementById('trsVal-'+u).textContent='–');
} else {
gv.textContent=nm;
sub.textContent=note==='oli'?'🛢️ Oleskan oli mesin pada ulir & permukaan duduk':(note==='new'?'🔒 Baut ALOC — wajib ganti baru setiap dilepas':'');
document.getElementById('trsVal-nm').textContent=this.fmt(nm);
document.getElementById('trsVal-kgf').textContent=this.fmt(nm/TORSI_NM_PER_KGF);
document.getElementById('trsVal-lbft').textContent=this.fmt(nm/TORSI_NM_PER_LBFT);
document.getElementById('trsVal-lbin').textContent=this.fmt(nm/TORSI_NM_PER_LBIN);
}
this.calcExt();
this.renderWrenchNote(nm);
},
renderWrenchNote(nm){
const el=document.getElementById('trsWrenchNote');
if(!el)return;
if(nm===null||nm===undefined||isNaN(nm)){el.innerHTML='';return;}
const lbft=nm/TORSI_NM_PER_LBFT;
const inRange=nm>=MY_WRENCH.minNm&&nm<=MY_WRENCH.maxNm;
const rangeColor=inRange?'var(--accent3)':'var(--accent2)';
const rangeIcon=inRange?'✅':'⚠️';
const rangeMsg=inRange?'Dalam jangkauan kunci kamu':(nm<MY_WRENCH.minNm?'Di bawah jangkauan minimum — kunci ini tidak akurat/tidak bisa disetel setipis ini':'Melebihi kapasitas maksimum kunci ini — jangan dipaksa, bisa merusak kunci/baut');
el.innerHTML=`<div class="u-r10 u-fs11 u-lh16" style="background:var(--surface3);border:1px solid var(--border2);padding:10px 12px">
      <div class="u-fw700 u-ctext u-mb2">🔧 Kunci kamu: ${MY_WRENCH.brand} ${MY_WRENCH.sku} (${MY_WRENCH.minNm}–${MY_WRENCH.maxNm} Nm / ${MY_WRENCH.minLbft}–${MY_WRENCH.maxLbft} lbf·ft, ${MY_WRENCH.panjang} mm)</div>
      <div style="color:${rangeColor};font-weight:700">${rangeIcon} ${rangeMsg}</div>
      <div class="u-t2 u-mt2">📏 Skala di batang kunci tercetak langsung dalam <b>N·m</b>, tiap kenaikan angka utama = 13,56 Nm. Target kamu: <b>${this.fmt(nm)} Nm</b> (≈ ${this.fmt(lbft)} lbf·ft).</div>
      ${inRange?this.scalePositionHtml(nm):''}
    </div>`;
},
scalePositionHtml(nm){
const marks=MY_WRENCH_SCALE;
const perTurn=marks[0].nm;
const perLine=perTurn/10;
let lowerIdx=0;
for(let i=0;i<marks.length;i++){ if(marks[i].nm<=nm+1e-9) lowerIdx=i; }
let lower=marks[lowerIdx];
let remainder=nm-lower.nm;
let linesRounded=Math.round(remainder/perLine);
const upperMark=marks[lowerIdx+1]||null;
if(linesRounded>=10 && upperMark){ lower=upperMark; linesRounded=0; }
const estimatedNm=lower.nm+linesRounded*perLine;
const overallFrac=(estimatedNm-MY_WRENCH.minNm)/(MY_WRENCH.maxNm-MY_WRENCH.minNm);
let posMsg;
if(linesRounded===0){
posMsg=`🎯 Sejajarkan garis paling atas gagang dengan angka <b>${this.fmt(lower.nm)}</b> di batang, angka <b>0</b> pada gagang tepat di garis vertikal batang. Tidak perlu maju garis sama sekali.`;
} else {
const prevLabel=Math.floor(linesRounded/2)*2;
const overShoot=linesRounded-prevLabel;
const nextLabel=prevLabel+2;
const stepDesc=overShoot===0?`tepat di angka <b>${prevLabel}</b>`:`melewati angka <b>${prevLabel}</b>, lalu berhenti <b>${overShoot} garis</b> setelahnya menuju angka <b>${nextLabel}</b>`;
posMsg=`🎯 Putar gagang sampai sejajar angka <b>${this.fmt(lower.nm)}</b> di batang (posisi gagang di 0). Lalu putar maju <b>${linesRounded} garis kecil</b> (${stepDesc}) di skala gagang.`;
}
return `<div class="u-mt8">
      <div class="u-t2 u-mb8">${posMsg}</div>
      <div class="u-t2 u-mb8">≈ Setelan kamu sekarang <b>${this.fmt(estimatedNm)} Nm</b> (target ${this.fmt(nm)} Nm, selisih ${this.fmt(Math.abs(estimatedNm-nm))} Nm — 1 garis = ${this.fmt(perLine)} Nm).</div>
      ${this.scaleSvgHtml(overallFrac)}
      ${this.thimbleSvgHtml(linesRounded+((remainder/perLine)-Math.round(remainder/perLine)))}
    </div>`;
},
thimbleSvgHtml(lineVal){
lineVal=Math.max(0,Math.min(9,lineVal));
const W=300,H=54,padL=20,padR=20,axisY=30;
const w=W-padL-padR;
let ticks='';
for(let i=0;i<=9;i++){
const x=padL+(i/9)*w;
const major=i%2===0;
ticks+=`<line x1="${x}" y1="${axisY-(major?9:5)}" x2="${x}" y2="${axisY}" stroke="var(--text3)" stroke-width="${major?1.4:1}"/>`;
if(major)ticks+=`<text x="${x}" y="${axisY-12}" font-size="9" font-family="'Space Grotesk',monospace" fill="var(--text2)" text-anchor="middle">${i}</text>`;
}
const px=padL+(lineVal/9)*w;
return `<svg class="u-w100 u-mt2" viewBox="0 0 ${W} ${H}" style="height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padL}" y1="${axisY}" x2="${W-padR}" y2="${axisY}" stroke="var(--text3)" stroke-width="1"/>
      ${ticks}
      <polygon points="${px},${axisY+4} ${px-5},${axisY+13} ${px+5},${axisY+13}" fill="var(--accent)"/>
      <text x="${px}" y="${axisY+24}" font-size="9" font-family="'Space Grotesk',monospace" font-weight="700" fill="var(--accent)" text-anchor="middle">gagang</text>
    </svg>`;
},
scaleSvgHtml(frac){
frac=Math.max(0,Math.min(1,frac));
const W=300,H=98,padL=22,padR=22,railY=54,railH=16;
const railW=W-padL-padR;
const marks=MY_WRENCH_SCALE;
const collarCx=padL+frac*railW;
const collarW=34;
let ticks='';
marks.forEach((m,i)=>{
const x=padL+(i/(marks.length-1))*railW;
ticks+=`<line x1="${x}" y1="${railY-2}" x2="${x}" y2="${railY+railH+2}" stroke="var(--text3)" stroke-width="1"/>
        <text x="${x}" y="${railY-8}" font-size="9" font-family="'Space Grotesk',monospace" fill="var(--text2)" text-anchor="middle">${this.fmt(m.nm)}</text>`;
});
let hatch='';
for(let hx=-collarW/2+4;hx<collarW/2;hx+=5){
hatch+=`<line x1="${collarCx+hx}" y1="${railY-6}" x2="${collarCx+hx-6}" y2="${railY+railH+6}" stroke="rgba(0,0,0,0.35)" stroke-width="1.4"/>`;
}
return `<svg class="u-w100" viewBox="0 0 ${W} ${H}" style="height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trsRail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d8d8de"/><stop offset="45%" stop-color="#8a8a92"/><stop offset="55%" stop-color="#8a8a92"/><stop offset="100%" stop-color="#c4c4cc"/>
        </linearGradient>
        <linearGradient id="trsCollar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c9c9d2"/><stop offset="50%" stop-color="#e8e8ee"/><stop offset="100%" stop-color="#9d9da6"/>
        </linearGradient>
      </defs>
      <rect x="${padL}" y="${railY}" width="${railW}" height="${railH}" rx="3" fill="url(#trsRail)"/>
      ${ticks}
      <g>
        <rect x="${collarCx-collarW/2}" y="${railY-6}" width="${collarW}" height="${railH+12}" rx="4" fill="url(#trsCollar)" stroke="rgba(0,0,0,0.25)"/>
        <g style="clip-path:inset(0)">${hatch}</g>
        <line x1="${collarCx-collarW/2}" y1="${railY-10}" x2="${collarCx-collarW/2}" y2="${railY+railH+10}" stroke="var(--accent)" stroke-width="2.5"/>
      </g>
      <text x="${collarCx-collarW/2}" y="${railY+railH+24}" font-size="9.5" font-family="'Space Grotesk',monospace" font-weight="700" fill="var(--accent)" text-anchor="middle">▲ setel di sini</text>
    </svg>`;
},
// CATATAN (audit v1.0-stabilization): toggle ini SENGAJA tidak dipindah ke toggleCardCollapse()
// standar (modal-navigasi.js, dipakai ~40+ kartu dashboard/keuangan/dll). Alasan: (1) id elemen di
// sini (trsExtBody/trsExtChev) tidak ikuti skema key+'-cbody'/key+'-chev' yg dibutuhkan fungsi itu;
// (2) toggleCardCollapse() PERSIST status ke localStorage cardCollapsePrefs, sedangkan toggle ini
// murni state sementara helper input di dalam modal (direset ke tertutup tiap modal Torsi dibuka
// ulang, lihat this.extOpen di reset()) — mempersist status kolom "pakai ekstensi kunci" antar sesi
// bukan perilaku yg diinginkan utk field bantu ini. Class CSS (.card-collapse-toggle/.collapsed)
// tetap dipakai apa adanya krn itu memang milik sistem visual bersama, cuma jalur togglenya beda.
toggleExt(){
this.extOpen=!this.extOpen;
document.getElementById('trsExtBody').classList.toggle('collapsed');
document.getElementById('trsExtChev').classList.toggle('collapsed');
},
currentTargetNm(){
if(this.mode==='manual'){
const v=parseFloat(document.getElementById('trsManualTorsiInput').value);
return isNaN(v)?null:v;
}
return this.selected?this.selected.nm:null;
},
calcExt(){
const L=parseFloat(document.getElementById('trsExtL').value);
const A=parseFloat(document.getElementById('trsExtA').value);
const target=this.currentTargetNm();
const resWrap=document.getElementById('trsExtResult');
if(!L||!A||target===null){resWrap.style.display='none';return;}
const setting=target*L/(L+A);
resWrap.style.display='block';
document.getElementById('trsExtResultVal').textContent=this.fmt(setting)+' N·m';
document.getElementById('trsExtResultNote').textContent=`Target sebenarnya di baut tetap ${this.fmt(target)} N·m. Karena kunci diperpanjang jadi ${L+A} mm (asli ${L} mm + ekstensi ${A} mm), kunci di-set ke ${this.fmt(setting)} N·m supaya torsi yang sampai ke baut pas ${this.fmt(target)} N·m.`;
},
setPageMode(m){
this.pageMode=m;
document.getElementById('trsTopModeNormal').classList.toggle('active',m==='normal');
document.getElementById('trsTopModeChecklist').classList.toggle('active',m==='checklist');
document.getElementById('trsSummaryBar').classList.toggle('show',m==='checklist');
this.renderList();
this.updateSummary();
this.persist();
},
// toggleCheck()/updateBiaya() — refactor (lihat DESIGN dok. A.5): baca/tulis
// lewat TorsiVehicleAPI.setCheck() atas this._selectedVehicleId, bukan lagi
// this.persist() langsung ke D.torsiChecklist[curVehicleId]. Kontrak
// TorsiVehicleAPI & bentuk D.torsiChecklist tidak berubah (0 perubahan skema)
// — cuma titik tulisnya yang pindah, supaya field "Pilih Kendaraan" (sesi
// berikutnya) bisa cek/isi biaya kendaraan lain tanpa ganti curVehicleId
// global. Fallback ke curVehicleId kalau _selectedVehicleId belum diisi
// (mis. dipanggil di luar alur open() normal).
toggleCheck(key){
const vehicleId=this._selectedVehicleId||curVehicleId;
this.checked[key]=!this.checked[key];
this.renderList();
this.updateSummary();
TorsiVehicleAPI.setCheck(vehicleId,key,{checked:this.checked[key]});
},
updateBiaya(key,val){
const vehicleId=this._selectedVehicleId||curVehicleId;
this.biaya[key]=parseFloat(val)||0;
this.updateSummary();
TorsiVehicleAPI.setCheck(vehicleId,key,{biaya:this.biaya[key]});
},
updateSummary(){
let total=0,done=0,count=0;
this.cats.forEach(cat=>cat.items.forEach(it=>{
const key=this.itemKey(cat.cat,it.name);
count++;
if(this.checked[key]){done++;total+=(this.biaya[key]||0);}
}));
document.getElementById('trsSummaryProgress').textContent=done+'/'+count;
document.getElementById('trsSummaryProgressFill').style.width=count?Math.round(done/count*100)+'%':'0%';
document.getElementById('trsSummaryBiaya').textContent='Rp '+total.toLocaleString('id-ID');
},
catatServis(name){
closeModal('torsiModal');
setTimeout(()=>openServisModal(undefined,name),200);
},
goToStock(){
closeModal('torsiModal');
setTimeout(()=>{
const d=document.getElementById('cnStockDetails');
if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}
},250);
},
noteBadge(note){
if(note==='oli')return '<span class="trs-part-badge oil">🛢️ Oleskan oli</span>';
if(note==='new')return '<span class="trs-part-badge new">🔒 Ganti baru</span>';
return '';
},
renderList(){
const q=document.getElementById('trsSearchInput').value.trim().toLowerCase();
let cats=this.cats;
if(this.activeCat!=='Semua')cats=this.cats.filter(d=>d.cat===this.activeCat);
let html='';let totalShown=0;
cats.forEach((cat,ci)=>{
const items=cat.items.filter(it=>!q||it.name.toLowerCase().includes(q));
if(items.length===0)return;
totalShown+=items.length;
html+=`<div class="card" style="padding:8px 12px">
        <div class="trs-part-cat-head" data-action="Torsi.toggleCatCard" data-args='["$el"]'>
          <div class="trs-part-cat-head-left">
            <div class="trs-part-cat-icon">${cat.icon}</div>
            <div><div class="trs-part-cat-title">${escapeHtml(cat.cat)}</div><div class="trs-part-cat-count">${items.length} item</div></div>
          </div>
          <span class="trs-part-cat-chev open">▾</span>
        </div>
        <div class="card-collapse-body" style="padding-bottom:6px">
          ${items.map(it=>this.renderRow(cat.cat,it)).join('')}
        </div>
      </div>`;
});
if(totalShown===0)html=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Part tidak ditemukan. Coba kata kunci lain.</div></div>`;
document.getElementById('trsCatList').innerHTML=html;
},
toggleCatCard(headEl){
const body=headEl.parentElement.querySelector('.card-collapse-body');
const chev=headEl.querySelector('.trs-part-cat-chev');
body.classList.toggle('collapsed');
chev.classList.toggle('open');
},
renderRow(catName,it){
const key=this.itemKey(catName,it.name);
const checked=!!this.checked[key];
const biayaVal=this.biaya[key]||'';
const stockItem=this.findStock(it.name);
const torsiHtml=it.noTorque
?`<div class="trs-part-torsi"><div class="trs-part-torsi-nm u-fs11 u-ctext3">servis rutin</div></div>`
:`<div class="trs-part-torsi"><div class="trs-part-torsi-nm">${it.nm}</div><div class="trs-part-torsi-kgf">(${it.kgf} kgf·m)</div></div>`;
let extras='';
if(it.interval)extras+=`<div class="trs-tag-btn trs-tag-interval">🔁 ${escapeHtml(it.interval)}</div>`;
if(stockItem)extras+=`<div class="trs-tag-btn ${stockItem.qty>0?'stok-ok':'stok-low'}">📦 ${stockItem.qty>0?('Stok '+stockItem.qty+(stockItem.unit?' '+stockItem.unit:'')):'Stok habis'}</div>`;
extras+=`<div class="trs-tag-btn" data-stop="1" data-action="Torsi.catatServis" data-args="${escapeHtml(JSON.stringify([it.name]))}">🔧 Catat Servis</div>`;
const checkHtml=`<div class="trs-part-check ${this.pageMode==='checklist'?'show':''} ${checked?'checked':''}" data-stop="1" data-action="Torsi.toggleCheck" data-args="${escapeHtml(JSON.stringify([key]))}">${checked?'✓':''}</div>`;
let biayaHtml='';
if(it.consumable){
biayaHtml=`<div class="trs-biaya-wrap" data-stop="1" data-action="stopPropOnly"><span>💰 Rp</span><input type="number" inputmode="numeric" placeholder="estimasi" value="${biayaVal}" data-oninput="Torsi.updateBiaya" data-oninput-args='${escapeHtml(JSON.stringify([key,'$value']))}'></div>`;
}
return `<div class="trs-part-row" data-action="torsiSelectPartIfAllowed" data-args="${escapeHtml(JSON.stringify([!!it.noTorque,catName,it.name]))}">
      ${checkHtml}
      <div class="trs-part-info">
        <div class="trs-part-name">${escapeHtml(it.name)}</div>
        <div class="trs-part-meta"><span>⌀ ${escapeHtml(it.ulir)}</span>${it.note?('· '+this.noteBadge(it.note)):''}</div>
      </div>
      ${torsiHtml}
      <div class="trs-part-extra-row">${extras}</div>
      ${biayaHtml}
    </div>`;
}
};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Torsi'][method]. `const Torsi = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di fuel-modal.js (bug yang sama pernah terjadi &
// diperbaiki di sana). Tanpa baris ini, semua interaksi modal Kalkulator
// Torsi (pilih kategori, toggle checklist, mode kalkulator, dst) gagal
// diam-diam.
if (typeof Torsi !== 'undefined') window.Torsi = Torsi;
