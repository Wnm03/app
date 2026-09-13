// tx-servis.js — logika panel "Sinkron ke Catatan Servis juga?" pada txModal
// (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (Sesi ini,
// "sync sparepart -> servis"), pola SAMA PERSIS tx-bbm.js (populateTxBbmVehicleSelect/
// toggleTxBbmFields/applyTxBbmFromTx): panel Transaksi cuma bikin D.servisLogs
// yang TERTAUT ke transaksi yang SUDAH ADA (txId), TIDAK bikin transaksi baru
// -- beda arah dari Servis._saveInner (car-notes.js) yang justru transaksi-nya
// yang dibuat dari situ. Kedua arah tetap saling kompatibel karena SAMA-SAMA
// memakai field `servisLinkId` (di D.transactions) <-> `txLinkId` (di
// D.servisLogs) -- lihat catatan existingTx.servisLinkId di _saveTxInner()
// (transaksi.js) yang SUDAH lebih dulu menyinkronkan cost/date/accountId utk
// tx yang dibuat lewat Servis, sebelum sesi ini ada.
// "Tab edit servisnya" (permintaan user): tombol "✏️ Edit Detail Servis" di
// modal Transaksi (lihat editTx() di transaksi.js) yang muncul begitu
// tx.servisLinkId ada -- reuse 100% modal Servis yang sudah ada
// (Servis.openModal(servisId)), TIDAK ada modal/UI edit baru.
//
// BUGFIX (audit sesi ini, laporan user): waktu checkbox "📦 Tambah ke Stok
// Sparepart juga?" (txStockPanel) DAN "🔧 Sinkron ke Catatan Servis juga?"
// (txServisPanel) dicentang BERSAMAAN dalam 1 transaksi (beli part sekaligus
// langsung dipasang) -- yang memang didesain boleh aktif bareng, lihat
// catatan updateTxVehiclePanels() (transaksi.js) soal "efek stok net" -- baris
// D.servisLogs yang dibuat recordServisLog() di bawah SEBELUMNYA SELALU
// hardcode usedPartId:null/usedPartQty:0, TIDAK PERNAH ditautkan ke part yang
// baru saja dibeli (tx.partStockId/tx.partStockQty, ditulis
// applyTxStockFromTx() di tx-stok-sparepart.js TEPAT SEBELUM fungsi ini
// dipanggil di _saveTxInner()). Akibatnya:
//  1) "Stok Masuk" sinkron dengan benar (D.partsStock nambah), TAPI catatan
//     Servis yang memakai stok itu TIDAK ikut tersinkron -- usedPartId-nya
//     kosong selamanya walau secara logika part itu jelas "dibeli & dipakai"
//     di transaksi yang sama, dan "efek stok net" yang disebut komentar di
//     transaksi.js TIDAK PERNAH benar-benar terjadi (stok jadi kelebihan
//     dobel: nambah dari pembelian, TIDAK berkurang dari pemakaian).
//  2) Begitu transaksi ini dibuka lagi lewat "✏️ Edit Detail Servis" (modal
//     Servis di car-notes.js, openModal(editId) -> Servis.populatePartSelect
//     (s.usedPartId)) -- field "Gunakan Stok Sparepart" SELALU tampil kosong
//     ("Tidak pakai stok") walau baris Servis itu SUDAH ADA & riwayatnya
//     kelihatan normal di tab Servis Car Notes (item/tanggal/biaya-nya utuh,
//     cuma detail part-nya yang hilang) -- persis laporan user "tab servis
//     kosong padahal sudah diisi, tapi di tab servis carnotes muncul
//     riwayatnya".
// Fix: recordServisLog() sekarang menerima purchasedPartId/purchasedPartQty
// (dibaca applyTxServisFromTx() dari tx.partStockId/tx.partStockQty) & baris
// D.servisLogs otomatis ditautkan (usedPartId/usedPartQty) + stok yang baru
// ditambah dipotong balik sejumlah yang sama lewat _servisAutoLinkAdjustStock()
// -- net stok = 0 kalau part dibeli & langsung dipasang di transaksi yang
// sama, PERSIS niat awal comment "efek stok net" di transaksi.js. Field
// `autoLinkedPartStock:true` dipakai sbg penanda "usedPartId ini diisi
// otomatis dari sinkron pembelian di transaksi ini", supaya kalau user
// SUDAH pernah ganti manual part yang dipakai lewat "✏️ Edit Detail Servis"
// (usedPartId beda dari hasil auto-link / autoLinkedPartStock jadi false di
// sana), sinkron dari sisi Transaksi berikutnya TIDAK menimpa pilihan manual
// itu -- lihat _syncServisUsedPartFromPurchase() di bawah.
//
// BUGFIX #2 (audit sesi ini, laporan user lanjutan -- "kategori sparepart
// jg belum terisi otomatis"): lihat _resolveServisCategoryId() di bawah utk
// detail lengkap. Ringkas: recordServisLog() sekarang mengisi
// D.servisLogs[].categoryId (bukan hardcode null lagi) dgn logika match yang
// SAMA PERSIS dgn Servis._saveInner() (car-notes.js), + fallback ke
// kategori part yang dibeli/dipakai (D.partsStock[].catId) -- konsisten
// dgn BUGFIX #1 di atas: SoT (source of truth) kategori & pemakaian stok
// sekarang sama-sama sinkron dari transaksi yang sama.
function populateTxServisVehicleSelect(){
const sel=document.getElementById('txServisVehicle');
if(!sel)return;
const cur=sel.value;
sel.innerHTML=(D.vehicles||[]).map(v=>`<option value="${v.id}">${v.emoji||'🏍️'} ${escapeHtml(v.name)}</option>`).join('');
const fallback=(typeof curVehicleId!=='undefined'&&curVehicleId&&D.vehicles.some(v=>v.id===curVehicleId))?curVehicleId:(D.vehicles[0]&&D.vehicles[0].id);
sel.value=cur&&D.vehicles.some(v=>v.id===cur)?cur:(fallback||'');
}
function toggleTxServisFields(){
const chk=document.getElementById('txSyncServis');
const fields=document.getElementById('txServisFields');
if(!chk||!fields)return;
fields.style.display=chk.checked?'block':'none';
if(chk.checked){populateTxServisVehicleSelect();renderTxServisSelectors();}
}
function renderTxServisSelectors(selectedMasterId,selectedComponentId){
const catEl=document.getElementById('txServisCategory');
const compEl=document.getElementById('txServisComponent');
const itemEl=document.getElementById('txServisItem');
if(typeof ServiceInputCatalog==='undefined')return;
ServiceInputCatalog.populateCategorySelect(catEl,selectedMasterId||'');
const master=selectedMasterId||catEl&&catEl.value||'';
ServiceInputCatalog.populateComponentSelect(compEl,master,selectedComponentId||'');
if(itemEl&&itemEl.value)ServiceInputCatalog.sync(catEl,compEl,itemEl);
renderTxServisChecklist();
}
function onTxServisCategoryChange(){
if(typeof ServiceInputCatalog==='undefined')return;
ServiceInputCatalog.onCategoryChange(document.getElementById('txServisCategory'),document.getElementById('txServisComponent'),document.getElementById('txServisItem'));
renderTxServisChecklist();
}
function onTxServisComponentChange(){
if(typeof ServiceInputCatalog==='undefined')return;
ServiceInputCatalog.onComponentChange(document.getElementById('txServisComponent'),document.getElementById('txServisCategory'),document.getElementById('txServisItem'));
renderTxServisChecklist();
}
function onTxServisItemInput(){
if(typeof ServiceInputCatalog==='undefined')return;
ServiceInputCatalog.sync(document.getElementById('txServisCategory'),document.getElementById('txServisComponent'),document.getElementById('txServisItem'));
}
// _servisAutoLinkAdjustStock(partId,deltaQty) — helper murni (baca/tulis
// D.partsStock saja, TIDAK memanggil save()), dipakai _syncServisUsedPartFromPurchase()
// di bawah utk memotong/mengembalikan stok akibat auto-link usedPartId.
// deltaQty NEGATIF = part dipakai (stok berkurang), POSITIF = lepas
// pemakaian lama (stok dikembalikan). Sengaja TIDAK lewat
// Servis.applyStockUsage() (async, bisa munculkan konfirmasi "stok kurang")
// karena qty yang dipotong di sini SELALU persis qty yang BARU SAJA
// ditambah applyStockPurchase() beberapa baris sebelumnya di alur yang sama
// (_saveTxInner -> applyTxStockFromTx -> applyTxServisFromTx), jadi stok
// dijamin cukup & tidak perlu tanya konfirmasi ke user.
function _servisAutoLinkAdjustStock(partId,deltaQty){
if(!partId||!deltaQty)return;
const p=(D.partsStock||[]).find(x=>x.id===partId);
if(!p)return;
p.qty=(p.qty||0)+deltaQty;
}
// _syncServisUsedPartFromPurchase(log,purchasedPartId,purchasedPartQty) —
// satu titik tunggal yang menjaga usedPartId/usedPartQty 1 baris D.servisLogs
// tetap konsisten dengan part yang dibeli (tx.partStockId/tx.partStockQty)
// di transaksi Keuangan yang sama, dipanggil baik saat baris Servis baru
// dibuat maupun saat di-update ulang (edit transaksi). Aman dipanggil
// berkali-kali (idempotent): kalau part/qty pembelian tidak berubah,
// lepas-lalu-pasang-lagi dengan angka yang sama = no-op net stok.
function _syncServisUsedPartFromPurchase(log,purchasedPartId,purchasedPartQty){
const wasAuto=!!log.autoLinkedPartStock;
if(wasAuto){
// Lepas dulu pemakaian LAMA yang auto-linked dari sinkron ini sebelumnya
// (kembalikan stok yang sebelumnya dipotong), supaya ganti part/qty
// pembelian saat edit tidak dobel-potong ATAU meninggalkan potongan basi
// dari part/qty yang sudah tidak relevan lagi.
_servisAutoLinkAdjustStock(log.usedPartId,log.usedPartQty||0);
log.usedPartId=null;log.usedPartQty=0;log.autoLinkedPartStock=false;
} else if(log.usedPartId){
// Baris ini punya usedPartId yang DIPILIH MANUAL oleh user lewat "✏️ Edit
// Detail Servis" (modal Servis asli, car-notes.js) -- BUKAN hasil
// auto-link sinkron ini. Jangan disentuh sama sekali, hormati pilihan
// manual itu apa adanya.
return;
}
if(!purchasedPartId||!(purchasedPartQty>0))return;
log.usedPartId=purchasedPartId;
log.usedPartQty=purchasedPartQty;
log.autoLinkedPartStock=true;
_servisAutoLinkAdjustStock(purchasedPartId,-purchasedPartQty);
}
// recordServisLog(opts) — satu titik tunggal bikin/update 1 baris D.servisLogs
// dari sisi Transaksi Keuangan. Pola PERSIS recordBbmLog() (tx-bbm.js): TIDAK
// pernah push ke D.transactions (tx-nya sudah ada, dikelola _saveTxInner()),
// cuma push/Object.assign ke D.servisLogs & set opts.tx.servisLinkId begitu
// baris baru dibuat (existingServisId null) supaya link 2 arah langsung utuh
// sejak baris pertama (sama seperti Servis._saveInner() lakukan dari sisi
// sana). Dipanggil dari applyTxServisFromTx() di bawah.
// opts.purchasedPartId/opts.purchasedPartQty (BARU, opsional) — part+qty yang
// baru saja dibeli via panel "Tambah ke Stok Sparepart" di transaksi yang
// sama (lihat catatan bugfix di atas berkas ini), diteruskan ke
// _syncServisUsedPartFromPurchase() supaya usedPartId/usedPartQty baris ini
// otomatis tertaut & net efek stoknya benar.
// _resolveServisCategoryId(item,purchasedPartId) — BUGFIX (audit sesi ini,
// laporan user lanjutan): recordServisLog() DULU selalu hardcode
// categoryId:null utk baris D.servisLogs yang dibuat/diupdate dari sisi
// Transaksi (txServisPanel), TIDAK PERNAH mengisi "Kategori Sparepart" sama
// sekali -- beda dgn Servis._saveInner() (car-notes.js baris ~625) yang
// SELALU mencoba mencocokkan `item` ke nama D.sparepartCats
// (matched=D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase()))
// tiap kali disimpan. Akibatnya baris Servis yang lahir dari sinkron
// Transaksi (mis. "beli part sekaligus dipasang", kasus BUGFIX di atas)
// selamanya "Tanpa Kategori" di tab Servis Car Notes & tidak pernah ikut
// prediksi/pengingat servis berbasis kategori (predictService() di
// sparepart-servis.js), walau item-nya sudah jelas cocok nama kategori
// (mis. item "ban" <-> kategori "Ban") ATAU part yang barusan
// dibeli/dipakai sudah jelas kategorinya (D.partsStock[].catId).
// Fix: replikasi match-by-nama YANG SAMA seperti car-notes.js (SoT yang
// sama, supaya baris Servis yang lahir dari Transaksi & yang lahir dari
// modal Servis langsung berperilaku identik), dgn fallback TAMBAHAN ke
// kategori part yang baru dibeli/dipakai (purchasedPartId ->
// D.partsStock[].catId) kalau item TIDAK cocok nama kategori manapun --
// ini sinkron langsung dari SoT stok sparepart sesuai laporan user.
// BUGFIX (audit sesi ini, lanjutan langsung dari fix di atas): match-by-nama
// di sini tadinya masih polos/global (D.sparepartCats.find by name saja),
// sama seperti bug lama di car-notes.js -- servis yang lahir dari sinkron
// Transaksi bisa ke-link ke kategori PRIVAT milik kendaraan lain kalau nama
// item kebetulan sama. Sekarang pakai resolveServisCatForVehicle()
// (sparepart-servis.js, SoT baru match-by-nama yang sadar kendaraan) dgn
// guard typeof supaya tetap aman dipakai terisolasi di test yang tidak
// memuat sparepart-servis.js.
function _resolveServisCategoryId(item,purchasedPartId,vehicleId){
const name=(item||'').trim().toLowerCase();
if(name){
const matched=typeof canonicalServisCategoryId==='function'
?canonicalServisCategoryId(item,vehicleId,null)
:(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,vehicleId):(D.sparepartCats||[]).find(c=>c&&c.name&&c.name.toLowerCase()===name));
if(matched)return matched&&matched.id?matched.id:matched;
}
if(purchasedPartId){
const part=(D.partsStock||[]).find(p=>p.id===purchasedPartId);
if(part&&part.catId){
const partCat=typeof canonicalServisCategoryId==='function'
?canonicalServisCategoryId(item,vehicleId,part.catId):part.catId;
if(partCat)return partCat&&partCat.id?partCat.id:partCat;
}
}
return null;
}
function recordServisLog(opts){
const vehicleId=opts.vehicleId||null;
const catIdForLog=_resolveServisCategoryId(opts.item,opts.purchasedPartId,vehicleId);
const masterCategoryId=opts.masterCategoryId||null;
const componentId=opts.componentId||null;
const checklist=Array.isArray(opts.checklist)?opts.checklist:[];

// Existing link wins, but it may only update an event belonging to the same
// vehicle. A stale/corrupt link from another vehicle is never mutated.
let s=null;
if(opts.existingServisId){
const candidate=(D.servisLogs||[]).find(x=>x.id===opts.existingServisId);
if(candidate&&candidate.vehicleId===vehicleId)s=candidate;
}

// Idempotency: retries of the same financial transaction must converge on
// the same service event even when servisLinkId was not persisted yet.
if(!s&&opts.txId&&typeof findServiceEventForTransaction==='function'){
s=findServiceEventForTransaction(D.servisLogs||[],opts.txId,vehicleId);
}
const _idempotencyKey=opts.idempotencyKey||((opts.txId)?`tx:${opts.txId}`:null);
if(!s&&_idempotencyKey&&typeof findServiceEventByIdempotencyKey==='function'){
s=findServiceEventByIdempotencyKey(D.servisLogs||[],_idempotencyKey,vehicleId);
}

if(s){
// V26 G38: one Service Event may have at most one Finance owner.
const _owners=(D.transactions||[]).filter(t=>t&&t.servisLinkId===s.id&&t.id!==opts.txId);
if(_owners.length){
  throw new Error('Service event sudah dimiliki transaksi Finance lain; linkage ditolak untuk mencegah duplicate owner.');
}
// V26 G25/G32: capture the persisted historical payload BEFORE mutation.
// Otherwise Object.assign() makes a genuine edit look identical to opts and
// can incorrectly preserve an obsolete nextDue snapshot.
const _beforeHistoricalPayload={
  date:s.date,item:s.item,km:s.km,cost:s.cost,note:s.note,accountId:s.accountId,
  categoryId:s.categoryId,serviceComponentId:s.serviceComponentId,
  checklist:Array.isArray(s.checklist)?JSON.stringify(s.checklist):JSON.stringify([])
};
Object.assign(s,{
  date:opts.date,
  item:opts.item,
  km:opts.km,
  cost:opts.cost,
  note:opts.note,
  accountId:opts.accountId,
  vehicleId,
  masterCategoryId:masterCategoryId||s.masterCategoryId||null,
  serviceComponentId:componentId||s.serviceComponentId||null,
  checklist:checklist.length?checklist:s.checklist||[]
});
if(catIdForLog)s.categoryId=catIdForLog;
const _catForSnapshot=catIdForLog?(D.sparepartCats||[]).find(c=>c&&c.id===catIdForLog):null;
// V24 G4: an idempotent retry with identical service payload must NOT
// recalculate historical snapshot fields from today's master interval.
// A genuine Finance edit (date/item/KM/cost/note/account/category/component/checklist change)
// is allowed to recompute the snapshot.
const _sameHistoricalPayload=
  _beforeHistoricalPayload.date===opts.date && _beforeHistoricalPayload.item===opts.item && Number(_beforeHistoricalPayload.km??null)===Number(opts.km??null) &&
  Number(_beforeHistoricalPayload.cost??0)===Number(opts.cost??0) && String(_beforeHistoricalPayload.note||'')===String(opts.note||'') &&
  String(_beforeHistoricalPayload.accountId||'')===String(opts.accountId||'') &&
  String(_beforeHistoricalPayload.categoryId||'')===String(catIdForLog||'') &&
  String(_beforeHistoricalPayload.serviceComponentId||'')===String(componentId||'') &&
  _beforeHistoricalPayload.checklist===JSON.stringify(checklist);
if(_catForSnapshot&&typeof buildServiceNextDueSnapshot==='function'&&!(_sameHistoricalPayload&&s.nextDueAxis!==undefined)){
  const _snap=buildServiceNextDueSnapshot({vehicleId,cat:_catForSnapshot,serviceKm:opts.km,serviceDate:opts.date,actionType:opts.actionType||null});
  s.intervalKmAtService=_snap.intervalKmAtService; s.intervalBulanAtService=_snap.intervalBulanAtService;
  s.nextDueKm=_snap.nextDueKm; s.nextDueDate=_snap.nextDueDate; s.nextDueAxis=_snap.nextDueAxis;
}
_syncServisUsedPartFromPurchase(s,opts.purchasedPartId,opts.purchasedPartQty);
// V24 G3: Finance->Service must not emit lifecycle events before the Finance
// transaction itself commits. Caller flushes this after its final save().
return s.id;
}

const servisId=uid();
const log={
  id:servisId,
  vehicleId,
  date:opts.date,
  item:opts.item,
  categoryId:catIdForLog,
  masterCategoryId,
  serviceComponentId:componentId,
  checklist,
  km:opts.km,
  cost:opts.cost,
  note:opts.note,
  accountId:opts.accountId,
  txLinkId:opts.txId,
  idempotencyKey:_idempotencyKey,
  usedPartId:null,
  usedPartQty:0,
  catalogPartId:null,
  catalogPartQty:0,
  catalogPartOemCode:'',
  catalogPartLinkedStockId:null,
  autoLinkedPartStock:false
};
const _catForSnapshotNew=catIdForLog?(D.sparepartCats||[]).find(c=>c&&c.id===catIdForLog):null;
if(_catForSnapshotNew&&typeof buildServiceNextDueSnapshot==='function'){
  const _snap=buildServiceNextDueSnapshot({vehicleId,cat:_catForSnapshotNew,serviceKm:opts.km,serviceDate:opts.date,actionType:opts.actionType||null});
  log.intervalKmAtService=_snap.intervalKmAtService; log.intervalBulanAtService=_snap.intervalBulanAtService;
  log.nextDueKm=_snap.nextDueKm; log.nextDueDate=_snap.nextDueDate; log.nextDueAxis=_snap.nextDueAxis;
}
D.servisLogs.push(log);
_syncServisUsedPartFromPurchase(log,opts.purchasedPartId,opts.purchasedPartQty);
// V24 G3: defer lifecycle create until Finance commit succeeds.
return servisId;
}
// applyTxServisFromTx(txId,amt,date,accId,note,tx,existingTx) — dipanggil dari
// _saveTxInner() (transaksi.js), pola sejajar applyTxBbmFromTx()/
// applyTxStockFromTx(). `tx` = objek transaksi yang baru saja dibuat/diedit
// (newTx atau existingTx) -- servisLinkId ditulis balik ke situ begitu baris
// D.servisLogs baru berhasil dibuat, biar tombol "✏️ Edit Detail Servis" di
// editTx() langsung kelihatan tanpa perlu tutup-buka modal dulu.
// Dipanggil SETELAH applyTxStockFromTx() (tx-stok-sparepart.js) di
// _saveTxInner(), jadi tx.partStockId/tx.partStockQty (kalau ada, dari
// checkbox "Tambah ke Stok Sparepart" di transaksi yang sama) SUDAH terisi
// & siap dibaca di sini utk auto-link usedPartId (lihat catatan bugfix di
// atas berkas ini).
function _isFinanceServiceTransaction(){
const cat=(document.getElementById('txCat')?.value||'').trim();
const sub=(document.getElementById('txSubCat')?.value||'').trim();
return (typeof curTxType==='undefined'||curTxType==='expense')&&typeof isKendaraanCatName==='function'&&isKendaraanCatName(cat)&&/servis\s*&\s*oli|servis|service/i.test(sub);
}
function _ensureAutoServisFields(){
const vehicleEl=document.getElementById('txServisVehicle');
const itemEl=document.getElementById('txServisItem');
const kmEl=document.getElementById('txServisKm');
if(vehicleEl&&typeof populateTxServisVehicleSelect==='function')populateTxServisVehicleSelect();
if(itemEl&&!itemEl.value.trim()){
 const note=(document.getElementById('txNote')?.value||'').trim();
 const sub=(document.getElementById('txSubCat')?.value||'').trim();
 itemEl.value=note||sub||'Servis';
}
onTxServisItemInput();
if(kmEl&&!kmEl.value&&typeof getVehicleKm==='function'&&vehicleEl&&vehicleEl.value){
 const km=getVehicleKm(vehicleEl.value); if(Number.isFinite(km)&&km>0)kmEl.value=km;
}
}
function ensureTxServisChecklistPanel(){
const fields=document.getElementById('txServisFields');
if(!fields||typeof ServisChecklist==='undefined')return null;
let box=document.getElementById('txServisChecklistPanel');
if(!box){box=document.createElement('div');box.id='txServisChecklistPanel';fields.appendChild(box);}
return box;
}
function renderTxServisChecklist(){
const box=ensureTxServisChecklistPanel(); if(!box)return;
const masterId=document.getElementById('txServisCategory')?.value||'';
const found=typeof ServisChecklist.findGroupByMasterCategoryId==='function'?ServisChecklist.findGroupByMasterCategoryId(masterId):null;
if(!found){box.innerHTML='<div style="font-size:11px;color:var(--text2);padding:10px 0">Pilih Kategori Servis untuk menampilkan checklist komponennya.</div>';return;}
const group=found.group,gi=found.groupIdx;
const rows=group.items.map((it,ii)=>{const checked=ServisChecklist._checked[it.id]!==undefined;const action=ServisChecklist._checked[it.id];const valid=ServisChecklist._validActionTypesFor(it);const acts=checked&&valid.length>1?valid.map(v=>`<button type="button" class="btn btn-ghost btn-sm ${action===v?'active':''}" data-action="TxServis.setChecklistAction" data-args="${escapeHtml(JSON.stringify([gi,ii,v]))}">${v==='periksa'?'🔍 Periksa':'🔧 Ganti'}</button>`).join(''):'';return `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border2)"><button type="button" class="btn ${checked?'btn-primary':'btn-ghost'} btn-sm" data-action="TxServis.toggleChecklist" data-args="${escapeHtml(JSON.stringify([gi,ii]))}">${checked?'✓':'○'} Cek</button><div style="flex:1"><div class="u-fw700 u-fs12">${escapeHtml(it.name)}</div><div class="u-fs11 u-t2">${escapeHtml(it.intervalLabel)}</div>${checked?`<div class="u-fs11 u-cacc">Tindakan: ${escapeHtml(action||'')}</div>`:''}${acts?`<div style="display:flex;gap:6px;margin-top:5px">${acts}</div>`:''}</div></div>`;}).join('');
box.innerHTML=`<div style="background:var(--surface3);border:1px solid var(--border2);border-radius:12px;padding:12px;margin-top:10px"><div class="u-fw700 u-fs12">☑️ Komponen yang benar-benar diservis</div><div class="u-fs11 u-t2" style="margin:3px 0 8px">Kategori hanya menyaring daftar. Centang komponen yang dikerjakan; yang tidak dicentang tidak masuk Service Event.</div><div>${rows}</div></div>`;
}
const TxServis=typeof window!=='undefined'?(window.TxServis=window.TxServis||{}):{};
TxServis.toggleChecklist=function(groupIdx,itemIdx){if(typeof ServisChecklist==='undefined')return;ServisChecklist.toggleItem(Number(groupIdx),Number(itemIdx));renderTxServisChecklist();};
TxServis.setChecklistAction=function(groupIdx,itemIdx,type){if(typeof ServisChecklist==='undefined')return;ServisChecklist.setActionType(Number(groupIdx),Number(itemIdx),type);renderTxServisChecklist();};
async function applyTxServisFromTx(txId,amt,date,accId,note,tx,existingTx){
const run=async()=>{
const chk=document.getElementById('txSyncServis');
const autoService=_isFinanceServiceTransaction();
if(!autoService&&(!chk||!chk.checked))return null;
const panel=document.getElementById('txServisPanel');
if(!panel||panel.style.display==='none')return null;
if(autoService){
  if(chk)chk.checked=true;
  _ensureAutoServisFields();
}
const vehicleId=document.getElementById('txServisVehicle').value;
// P14 — vehicle isolation: a Finance transaction that already has a vehicle
// identity must never be linked to a service event for another vehicle.
const txVehicleId=tx&&tx.vehicleId!=null?tx.vehicleId:(existingTx&&existingTx.vehicleId!=null?existingTx.vehicleId:null);
if(txVehicleId&&vehicleId&&txVehicleId!==vehicleId){
  toast('⚠️ Kendaraan transaksi berbeda dengan kendaraan servis — linkage dibatalkan');
  return null;
}
if(typeof ServisChecklist!=='undefined'&&ServisChecklist._vehicleId!==vehicleId)ServisChecklist.open(vehicleId);
const masterCategoryId=document.getElementById('txServisCategory')?.value||null;
const componentId=document.getElementById('txServisComponent')?.value||null;
const item=document.getElementById('txServisItem').value.trim();
const kmRaw=document.getElementById('txServisKm').value.trim();
const km=kmRaw===''?null:Number(kmRaw);
if(!vehicleId){toast('⚠️ Pilih kendaraan dulu utk transaksi servis');return null;}
if(km!==null&&typeof Servis!=='undefined'&&typeof Servis.validateServiceOdometer==='function'){
  const odometerCheck=Servis.validateServiceOdometer({vehicleId,km,date,excludeId:(existingTx&&existingTx.servisLinkId)||null});
  if(!odometerCheck.ok){toast('⚠️ '+odometerCheck.message);return null;}
}
if(!item){toast('⚠️ Isi Jenis Servis/Item dulu utk transaksi servis');return null;}
const existingServisId=(existingTx&&existingTx.servisLinkId)?existingTx.servisLinkId:null;
const purchasedPartId=(tx&&tx.partStockId)?tx.partStockId:null;
const purchasedPartQty=purchasedPartId?(tx.partStockQty||0):0;
const checklist=(typeof ServisChecklist!=='undefined'&&typeof ServisChecklist.toLogPayload==='function')?ServisChecklist.toLogPayload():[];
const servisId=recordServisLog({existingServisId,vehicleId,date,item,km,cost:amt,note,accountId:accId,txId,idempotencyKey:`tx:${txId}`,purchasedPartId,purchasedPartQty,masterCategoryId,componentId,checklist});
if(tx)tx.servisLinkId=servisId;
if(typeof Sparepart!=='undefined'&&Sparepart.renderStockList)Sparepart.renderStockList();
if(typeof Sparepart!=='undefined'&&Sparepart.renderCatList)Sparepart.renderCatList();
if(typeof renderCnTab==='function')renderCnTab();
// SOT bridge: satu perubahan transaksi servis harus langsung memberi sinyal ke
// vehicle/reminder/AI dan renderer domain lain. Tagihan tidak dibuat/dimodifikasi
// karena servis bukan kewajiban tagihan; aset hanya berubah bila transaksi memang
// sudah memiliki assetId, sedangkan renderer global tetap aman dipanggil ulang.
if(typeof Aset!=='undefined'&&Aset&&typeof Aset.renderList==='function'&&tx&&tx.assetId)Aset.renderList();
if(typeof renderDashboard==='function')renderDashboard();
if(typeof renderKeuangan==='function')renderKeuangan();
if(typeof renderBillList==='function')renderBillList();
toast(autoService
  ? (existingServisId?'🔧 Transaksi servis diperbarui — Riwayat & Pengingat tersinkron':'🔧 Transaksi servis otomatis masuk ke Riwayat & Pengingat')
  : (existingServisId?'✅ Catatan Servis tertaut ikut diperbarui':'🔧 Catatan Servis dibuat & tertaut ke transaksi ini'));
return {servisId,created:!existingServisId,vehicleId,txId};
};
return typeof withServiceMutationLock==='function'?withServiceMutationLock(run):run();
}
// openTxLinkedServisModal() — tombol "✏️ Edit Detail Servis" di modal Edit
// Transaksi (lihat editTx() di transaksi.js utk logic tampil/sembunyi
// tombolnya). Reuse 100% Servis.openModal() (car-notes.js) apa adanya --
// TIDAK ada modal/field edit baru di sini, cuma jembatan dari txEditId ke
// servisLinkId-nya. txModal ditutup dulu supaya servisModal (yang statusnya
// stacked overlay biasa) tidak numpuk di atas txModal yang masih terbuka.
function openTxLinkedServisModal(){
const t=(D.transactions||[]).find(x=>x.id===txEditId);
if(!t||!t.servisLinkId){toast('⚠️ Transaksi ini belum tertaut ke catatan Servis');return;}
const s=(D.servisLogs||[]).find(x=>x.id===t.servisLinkId);
if(!s){toast('⚠️ Catatan Servis tertaut sudah tidak ditemukan (mungkin sudah dihapus)');return;}
if(t.vehicleId&&s.vehicleId&&t.vehicleId!==s.vehicleId){toast('⚠️ Link Servis tidak valid: kendaraan transaksi dan servis berbeda');return;}
closeModal('txModal');
if(typeof Servis!=='undefined'&&Servis.openModal)Servis.openModal(s.id);
}
