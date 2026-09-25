'use strict';
// modules/vehicle/servis-checklist.js
// =============================================================
// Servis Checklist — runtime projection of canonical Service Master data.
// Rujukan: RENCANA-SESI-SERVICE-CHECKLIST.md, VERIFIKASI-DAN-FINALISASI-
// CHECKLIST-SERVIS.md §3 (expanded master 100 item/13 grup),
// PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2b (5 pola actionMode),
// BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md (pemecahan sesi).
//
// Canonical data source: data/database-kategori-komponen-servis.json ->
// service-master-data.generated.js. This file contains behavior/lookup logic only.
// SENGAJA TIDAK ADA di sesi ini (lihat breakdown dokumen):
//   - State/logic (ServisChecklist.open/toggleItem/dst)      -> Sesi 1B
//   - Modal/markup/accordion (index.html, tombol baru)        -> Sesi 1C
//   - Penulisan ke D.servisLogs (saveAll)                     -> Sesi 2A
// 0 file lain diubah oleh sesi ini (termasuk build.js — ditambahkan sbg
// perubahan terpisah di commit yang sama, lihat SESSION-NOTE terkait,
// supaya "murni data" tetap bisa diverifikasi 1:1 di file ini).
//
// Skema per-item (superset deskriptif, LEBIH LUAS dari
// D.sparepartCats.actionMode yang cuma relevan utk 9 item `linkCat:true`
// -- lihat SESSION-NOTE-checklist-servis-actiontype-sesi1.md poin 2):
//   id                  : string, unik, kebab-case -- dipakai sbg key
//                         `checked{}` di Sesi 1B (bukan index array, biar
//                         tahan kalau urutan item direvisi nanti).
//   name                : string, nama tampil di checklist & (kalau
//                         `linkCat:true`) dilempar ke
//                         resolveServisCatForVehicle(name, vehicleId).
//   linkCat             : boolean -- true HANYA utk 9 item yg audit
//                         tandai (Oli Mesin, Busi, V-Belt CVT, Roller CVT,
//                         Kampas Rem Depan, Minyak Rem, Aki, Filter Udara,
//                         Oli Gardan/Final Drive). Item lain SENGAJA
//                         `false` meski datanya lengkap (lihat field
//                         `needsReview` utk 2 kasus yg masih keputusan W:
//                         Ban Depan & Coolant).
//   actionMode          : 'ganti' | 'bersih' | 'periksa' |
//                         'periksa-conditional' | 'alternate' | 'none'.
//                         'periksa' (single, fixed) sengaja DITAMBAH di
//                         sini di luar 5 nilai D.sparepartCats.actionMode
//                         (session-note poin 2) -- khusus item checklist
//                         yg cuma py 1 tindakan berupa cek/setel, tidak
//                         py varian ganti sama sekali (mis. Celah Klep).
//   resetType           : 'km' | 'time' | 'both' | null (null = tidak ada
//                         reset otomatis apa pun -- item dari kontrak checklist
//                         `linkCat:false` murni catatan riwayat teks,
//                         wiring reset sesungguhnya cuma berlaku pada 9
//                         item `linkCat:true` lewat D.sparepartCats,
//                         BUKAN dari field ini -- lihat catatan Sesi 2A).
//   intervalKm          : number | null. null kalau intervalnya rentang
//                         (mis. "24.000-32.000 km") atau tidak ada angka
//                         resmi -- baca `intervalLabel` utk teks aslinya.
//   intervalTimeMonths  : number | null.
//   gantiResetsInterval : boolean | null. Hanya dipakai kalau
//                         `actionMode==='periksa-conditional'` (persis
//                         PERBAIKAN §2c pola 4) -- false berarti log
//                         actionType:'ganti' item ini TIDAK dipakai sbg
//                         basis reset jatuh-tempo Pengingat Servis.
//   intervalLabel       : string -- teks interval PERSIS dari tabel
//                         VERIFIKASI §3, sumber tampilan utama di UI
//                         (Sesi 1C) krn tidak semua interval reduce
//                         bersih ke intervalKm/intervalTimeMonths tunggal.
//   sumber              : string -- provenance singkat dari audit/
//                         verifikasi, utk transparansi asal angka.
//   needsReview         : true (opsional) -- item yg actionMode/linkCat-
//                         nya masih pending keputusan W (lihat §4
//                         VERIFIKASI & §2b catatan PERBAIKAN), BUKAN
//                         berarti datanya salah -- cuma belum final.
//
// Urutan grup & item mengikuti canonical master (13 grup, 100 item, 9
// `linkCat:true` -- divalidasi otomatis lewat
// tests/servis-checklist-groups-sesi1a.test.js).

/**
 * CATEGORY-SOT-05: canonical checklist lookup.
 * Checklist groups reference DatabaseAPI.masterCategory by stable ID.
 * This helper is read-only and never creates a second taxonomy.
 */
function getServiceChecklistMasterCategoryId(groupOrItem) {
  if (!groupOrItem) return null;
  if (groupOrItem.masterCategoryId) return groupOrItem.masterCategoryId;
  const group = groupOrItem.group;
  if (!group || typeof DatabaseAPI === 'undefined' ||
      !DatabaseAPI.masterCategory ||
      typeof DatabaseAPI.masterCategory.getAll !== 'function') return null;
  const hit = DatabaseAPI.masterCategory.getAll().find(c => c.name === group);
  return hit ? hit.id : null;
}

const SERVICE_CHECKLIST_GROUPS = (() => {
  // Canonical master is generated from data/database-kategori-komponen-servis.json.
  // Node tests load the generated artifact directly; browser builds load it before
  // this file and expose the same data through globalThis. No taxonomy is duplicated here.
  if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
    try {
      return require('./service-master-data.generated.js').SERVICE_CHECKLIST_GROUPS;
    } catch (e) { /* browser/build path */ }
  }
  if (typeof globalThis !== 'undefined' && Array.isArray(globalThis.__SERVICE_CHECKLIST_GROUPS__)) {
    return globalThis.__SERVICE_CHECKLIST_GROUPS__;
  }
  return [];
})();

// Catatan: TIDAK ada window.SERVICE_CHECKLIST_GROUPS=... di sini dgn
// sengaja -- ini `const` array (bukan object literal `{...}` top-level),
// tidak pernah dipanggil lewat data-action="X.method", jadi di luar
// cakupan gate scripts/verify-window-expose.js (lihat komentar di file
// itu: kriteria (1)-nya spesifik `const X={`). Diakses langsung via
// lexical scope sesama file dlm 1 bundle, persis pola TORSI_DB/
// GENERIC_RECOMMEND_NAMES/FALLBACK_KEYWORDS di sparepart-servis-b.js.

// =============================================================
// Sesi 1B — STATE & LOGIC TOGGLE (in-memory, tanpa markup).
// Rujukan: BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md §"Sesi 1B",
// PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2c/§2d.
// Keputusan W (dijawab sebelum sesi ini ditulis, lihat §"Keputusan W yang
// masih menggantung" poin 1-2 di breakdown dokumen):
//   1. Default toggle periksa/ganti = 'periksa' (diusulkan, dipilih --
//      lebih aman: salah toggle jadi 'periksa' cuma berarti belum
//      tercatat ganti, lebih murah dikoreksi daripada reset jatuh-tempo
//      ganti tanpa sengaja).
//   2. Item ganti-saja/bersih-saja (pola 1/2/5 §2b) TETAP 1-actionType,
//      TIDAK diberi opsi "periksa saja" tambahan (ditunda, lihat alasan
//      di breakdown dokumen -- scope creep ke tabel §2b yang sudah
//      difinalkan Sesi 1A).
//
// SENGAJA TIDAK ADA di sesi ini:
//   - Markup/modal/accordion (index.html)                     -> Sesi 1C
//   - Penulisan ke D.servisLogs (saveAll)                     -> Sesi 2A
// State `checked{}` MURNI in-memory (bukan D.*) -- tutup modal tanpa
// simpan = state hilang, sesuai default RENCANA §6-poin3 (belum
// draft-persist), lihat QA manual Sesi 1C di breakdown dokumen.
// CATEGORY-SOT-10: every checklist item carries the canonical master
// category identity explicitly. This is a projection of the existing group
// SoT, not a second taxonomy and not a categoryId. No item invents a
// sparepart category when the concrete category does not exist.
SERVICE_CHECKLIST_GROUPS.forEach((group) => {
  (group.items || []).forEach((item) => {
    if (!item.masterCategoryId) item.masterCategoryId = group.masterCategoryId || null;
  });
});

const ServisChecklist = {

  // itemsOfGroup() — satu pintu akses defensif untuk struktur grup checklist.
  // Bug S1839 terjadi karena consumer mengasumsikan `items[]` selalu ada.
  // SoT normal saat ini memang selalu memiliki items[], tetapi helper ini
  // menjaga renderer/API tetap non-throwing bila data grup rusak/terpotong.
  itemsOfGroup(group) {
    return group && Array.isArray(group.items) ? group.items : [];
  },

  // _vehicleId — kendaraan aktif utk sesi checklist ybs, diisi open().
  // Dipakai HANYA utk saran default Busi (_defaultActionType, pola
  // 'alternate') lewat suggestNextBusiAction() -- histori servis dicari
  // per-kendaraan, bukan global.
  _vehicleId: null,

  // _checked{itemId: actionType} -- PERSIS kontrak PERBAIKAN §2d (bukan
  // {itemId:true}). Key hilang = item tidak tercentang (lihat
  // toggleItem() uncentang: delete, bukan set false/null).
  _checked: {},
  _results: {},
  _conditionNotes: {},
  _notApplicable: {},
  _executionStatus: {},
  // Per-log identity override: checklist master item remains canonical, while
  // a saved service record may correct its category/component identity.
  _identityOverrides: {},
  // Per-component canonical cost state. null = belum diketahui; 0 = sengaja nol.
  // Keyed by checklist itemId so state mengikuti komponen, bukan service-level total.
  _costs: {},
  // Per-component catalog references. Kept inside checklist state until save;
  // each saved history row receives only its own refs.
  _catalogPartRefs: {},
  _stockPartRefs: {},
  _photoRefs: {},
  _intervalOverrides: {},

  // open(vehicleId) — mulai sesi checklist baru: reset _checked jadi {}
  // & simpan vehicleId aktif. Dipanggil tiap modal Servis Checklist
  // dibuka (Sesi 1C) -- state SENGAJA tidak dibawa antar-buka-modal
  // (lihat catatan file di atas, "state hilang" itu perilaku yang
  // disengaja, bukan bug).
  open(vehicleId) {
    this._vehicleId = vehicleId || null;
    this._checked = {};
    this._results = {};
    this._conditionNotes = {};
    this._notApplicable = {};
    this._executionStatus = {};
    this._identityOverrides = {};
    this._costs = {};
    this._catalogPartRefs = {};
    this._stockPartRefs = {};
    this._photoRefs = {};
    this._intervalOverrides = {};
    return { ok: true, vehicleId: this._vehicleId, checked: this._checked };
  },

  // toLogPayload() — snapshot checklist yang ikut disimpan DALAM satu entry
  // D.servisLogs. Tidak membuat tabel/store baru; hanya array plain object
  // yang menjadi bagian dari catatan servis. Hanya item yang dicentang yang
  // disimpan agar log tetap ringkas.
  // resolveCategoryForItem() — resolusi kategori SPAREPART bersifat
  // runtime-only dan vehicle-scoped. Tidak pernah membuat kategori baru,
  // tidak pernah mengambil kategori privat kendaraan lain, dan tidak
  // mengganti masterCategoryId SoT checklist. Dengan ini semua 50 item
  // dapat ditautkan ke kategori konkret BILA kategori tersebut memang ada
  // di D.sparepartCats; bila tidak ada, payload tetap valid tanpa categoryId.
  resolveCategoryForItem(item, vehicleId) {
    if (!item || typeof resolveServisCatForVehicle !== 'function') return null;
    const cat = resolveServisCatForVehicle(item.name, vehicleId || this._vehicleId);
    return cat && cat.id ? cat : null;
  },

  _normalizeCostField(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  },

  getMasterComponent(itemId) {
    const found = this.findItemById(itemId);
    if (!found) return null;
    const componentId = (this.getItemIdentity(itemId) || {}).serviceComponentId || found.item.id || null;
    if (!componentId) return null;
    try {
      if (typeof ServiceMasterDB !== 'undefined' && ServiceMasterDB && typeof ServiceMasterDB.getStore === 'function') {
        const store = ServiceMasterDB.getStore();
        const hit = store && Array.isArray(store.components) ? store.components.find(c => c && String(c.componentId) === String(componentId) && !c.deprecated) : null;
        if (hit) return hit;
      }
    } catch (_e) { /* IDB/master runtime belum tersedia; fallback ke generated checklist tetap valid. */ }
    return {
      componentId,
      masterCategoryId: found.item.masterCategoryId || found.group.masterCategoryId || null,
      componentName: found.item.name,
      intervalKm: found.item.intervalKm == null ? null : Number(found.item.intervalKm),
      intervalTimeMonths: found.item.intervalTimeMonths == null ? null : Number(found.item.intervalTimeMonths),
      resetType: found.item.resetType || null,
      gantiResetsInterval: found.item.gantiResetsInterval == null ? null : !!found.item.gantiResetsInterval,
      intervalLabel: found.item.intervalLabel || ''
    };
  },

  getCatalogPartRefs(itemId) {
    const refs = this._catalogPartRefs && Array.isArray(this._catalogPartRefs[itemId]) ? this._catalogPartRefs[itemId] : [];
    return refs.map(r => ({ catalogId: String(r.catalogId), qty: Number(r.qty) > 0 ? Number(r.qty) : 1 }));
  },

  setCatalogPartRefs(itemId, refs) {
    const found = this.findItemById(itemId);
    if (!found) return { ok:false, reason:'Item checklist tidak ditemukan' };
    const normalized = Array.isArray(refs) ? refs.filter(r => r && r.catalogId != null && String(r.catalogId).trim()).map(r => ({catalogId:String(r.catalogId).trim(), qty:Number(r.qty)>0?Number(r.qty):1})) : [];
    this._catalogPartRefs[itemId] = normalized;
    return {ok:true,itemId,catalogPartRefs:this.getCatalogPartRefs(itemId)};
  },

  setCatalogPart(itemId, catalogId, qty=1) {
    return this.setCatalogPartRefs(itemId, catalogId ? [{catalogId, qty}] : []);
  },
  getStockPartRef(itemId) { const r=this._stockPartRefs&&this._stockPartRefs[itemId]; return r&&r.partId?{partId:String(r.partId),qty:Number(r.qty)>0?Number(r.qty):1}:null; },
  setStockPartRef(itemId, partId, qty=1) { const found=this.findItemById(itemId); if(!found)return {ok:false,reason:'Item checklist tidak ditemukan'}; if(!partId){delete this._stockPartRefs[itemId];return {ok:true,itemId,stockPart:null};} const q=Number(qty); if(!Number.isFinite(q)||q<=0)return {ok:false,reason:'Jumlah stok harus lebih dari 0'}; const part=(typeof D!=='undefined'&&Array.isArray(D.partsStock))?D.partsStock.find(p=>String(p.id)===String(partId)):null; if(!part)return {ok:false,reason:'Part stok tidak ditemukan'}; this._stockPartRefs[itemId]={partId:String(partId),qty:q}; return {ok:true,itemId,stockPart:this.getStockPartRef(itemId)}; },
  getPhotos(itemId) { return this._photoRefs&&Array.isArray(this._photoRefs[itemId])?this._photoRefs[itemId].slice():[]; },
  setPhotos(itemId, photos) { if(!this.findItemById(itemId))return {ok:false,reason:'Item checklist tidak ditemukan'}; this._photoRefs[itemId]=Array.isArray(photos)?photos.slice(0,5):[]; return {ok:true,itemId,photos:this.getPhotos(itemId)}; },
  addPhoto(itemId, dataUrl) { const photos=this.getPhotos(itemId); if(photos.length>=5)return {ok:false,reason:'Maksimal 5 foto per komponen'}; if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/'))return {ok:false,reason:'Foto tidak valid'}; photos.push(dataUrl); return this.setPhotos(itemId,photos); },
  removePhoto(itemId,index) { const photos=this.getPhotos(itemId); if(index>=0&&index<photos.length)photos.splice(index,1); return this.setPhotos(itemId,photos); },
  getIntervalOverride(itemId) { const v=this._intervalOverrides&&this._intervalOverrides[itemId]; return Number.isFinite(Number(v))&&Number(v)>0?Number(v):null; },
  setIntervalOverride(itemId,value) { if(!this.findItemById(itemId))return {ok:false,reason:'Item checklist tidak ditemukan'}; if(value===null||value===''||value===undefined){delete this._intervalOverrides[itemId];return {ok:true,itemId,intervalKm:null};} const n=Number(value); if(!Number.isFinite(n)||n<=0)return {ok:false,reason:'Interval harus lebih dari 0 km'}; this._intervalOverrides[itemId]=n; return {ok:true,itemId,intervalKm:n}; },

  async openCatalogPicker(itemId) {
    const found = this.findItemById(itemId);
    if (!found) return {ok:false,reason:'Item checklist tidak ditemukan'};
    if (typeof VehicleCatalog === 'undefined' || !VehicleCatalog || typeof VehicleCatalog.getAll !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Katalog suku cadang belum tersedia');
      return {ok:false,reason:'catalog_unavailable'};
    }
    let items=[];
    try { items=await VehicleCatalog.getAll(); } catch (_e) {
      if (typeof toast === 'function') toast('⚠️ Gagal membaca katalog suku cadang');
      return {ok:false,reason:'catalog_read_failed'};
    }
    const componentId=(this.getItemIdentity(itemId)||{}).serviceComponentId||found.item.id;
    const candidates=typeof ServicePartCompatibilitySOT!=='undefined'&&ServicePartCompatibilitySOT&&typeof ServicePartCompatibilitySOT.candidates==='function'
      ?ServicePartCompatibilitySOT.candidates(items,this._vehicleId,componentId) : [];
    if (typeof document === 'undefined') return {ok:true,candidates};
    const old=document.getElementById('servisChecklistCatalogPicker'); if(old) old.remove();
    const box=document.createElement('div'); box.id='servisChecklistCatalogPicker'; box.className='overlay open'; box.style.zIndex='430';
    const current=this.getCatalogPartRefs(itemId);
    box.innerHTML=`<div class="modal" style="max-width:520px;width:100%;max-height:90dvh;overflow:auto"><div class="modal-title"><span>📦 Part Katalog — ${escapeHtml(found.item.name)}</span><button class="modal-close" data-action="ServisChecklist.closeCatalogPicker">✕</button></div><div class="u-fs11 u-t2" style="line-height:1.5;margin-bottom:10px">Hanya part yang memiliki hubungan ID kompatibilitas dengan komponen ini yang ditampilkan. Tidak ada fuzzy matching.</div>${candidates.length?candidates.map(it=>{const selected=current.some(r=>String(r.catalogId)===String(it.id));return `<button type="button" class="btn btn-ghost btn-full" style="text-align:left;margin-bottom:7px" data-action="ServisChecklist.setCatalogPartAndClose" data-args="${escapeHtml(JSON.stringify([itemId,it.id,1]))}">${selected?'✓ ':''}${escapeHtml(it.partName||it.name||it.id)}${it.oemCode?' — '+escapeHtml(it.oemCode):''}</button>`}).join(''):'<div class="u-fs12t2" style="padding:12px 0">Belum ada part katalog yang terpetakan ke komponen ini.</div>'}<button type="button" class="btn btn-ghost btn-full" data-action="ServisChecklist.setCatalogPartAndClose" data-args="${escapeHtml(JSON.stringify([itemId,null,1]))}">Hapus pilihan part</button></div>`;
    document.body.appendChild(box);
    return {ok:true,candidates};
  },

  setCatalogPartAndClose(itemId,catalogId,qty=1) {
    const result=this.setCatalogPart(itemId,catalogId,qty);
    this.closeCatalogPicker();
    this.render();
    return result;
  },

  closeCatalogPicker() { const box=typeof document!=='undefined'?document.getElementById('servisChecklistCatalogPicker'):null; if(box)box.remove(); },

  getItemCost(itemId) {
    const found = this.findItemById(itemId);
    if (!found) return null;
    const raw = this._costs && this._costs[itemId] ? this._costs[itemId] : {};
    const labor = this._normalizeCostField(raw.labor);
    const parts = this._normalizeCostField(raw.parts);
    const consumables = this._normalizeCostField(raw.consumables);
    const other = this._normalizeCostField(raw.other);
    const total = [labor, parts, consumables, other].reduce((n, v) => n + (v == null ? 0 : v), 0);
    return { labor, parts, consumables, other, total, source: 'component' };
  },

  setItemCost(itemId, patch) {
    const found = this.findItemById(itemId);
    if (!found) return { ok: false, reason: 'Item checklist tidak ditemukan' };
    const next = Object.assign({}, this._costs[itemId] || {});
    ['labor', 'parts', 'consumables', 'other'].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(patch || {}, key)) {
        const raw = patch[key];
        if (raw !== null && raw !== undefined && raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
          throw new Error('Biaya ' + key + ' harus 0 atau lebih');
        }
        next[key] = this._normalizeCostField(raw);
      }
    });
    this._costs[itemId] = next;
    return { ok: true, itemId, costBreakdown: this.getItemCost(itemId) };
  },

  setItemCostField(groupIdx, itemIdx, field, value) {
    const item = this._item(groupIdx, itemIdx);
    if (!item || !['labor', 'parts', 'consumables', 'other'].includes(String(field))) {
      return { ok: false, reason: 'Field biaya tidak valid' };
    }
    const result = this.setItemCost(item.id, { [String(field)]: value });
    if (result.ok && typeof Servis !== 'undefined' && typeof Servis.syncServiceCostSummary === 'function') {
      Servis.syncServiceCostSummary();
    }
    return result;
  },

  costSummary() {
    const rows = Object.keys(this._checked || {}).map(itemId => {
      const found = this.findItemById(itemId);
      if (!found) return null;
      return {
        itemId,
        itemName: found.item.name,
        serviceComponentId: (this.getItemIdentity(itemId) || {}).serviceComponentId || found.item.id || null,
        costBreakdown: this.getItemCost(itemId),
        cost: this.getItemCost(itemId).total,
        catalogPartRefs: this.getCatalogPartRefs(itemId),
        stockPartRef: this.getStockPartRef(itemId),
        photos: this.getPhotos(itemId),
        intervalKmOverride: this.getIntervalOverride(itemId),
        intervalKmAtService: this.getIntervalOverride(itemId) ?? (this.getMasterComponent(itemId)||{}).intervalKm ?? null,
        intervalBulanAtService: (this.getMasterComponent(itemId)||{}).intervalTimeMonths ?? null,
        reminderIntervalSource: this.getMasterComponent(itemId) ? 'service-master' : 'legacy-category',
        checklistItemId: itemId
      };
    }).filter(Boolean);
    const summary = rows.reduce((acc, row) => {
      const b = row.costBreakdown || {};
      ['labor', 'parts', 'consumables', 'other'].forEach(k => { acc[k] += b[k] == null ? 0 : Number(b[k]); });
      return acc;
    }, { labor: 0, parts: 0, consumables: 0, other: 0 });
    summary.total = summary.labor + summary.parts + summary.consumables + summary.other;
    summary.source = 'component';
    summary.byComponent = rows;
    return summary;
  },

  toLogPayload() {
    return Object.keys(this._checked).map(itemId => {
      const found = this.findItemById(itemId);
      if (!found) return null;
      const category = this.resolveCategoryForItem(found.item, this._vehicleId);
      const identity = this.getItemIdentity(itemId) || {};
      const row = {
        itemId,
        itemName: found.item.name,
        group: found.group.group,
        masterCategoryId: identity.masterCategoryId || found.item.masterCategoryId || found.group.masterCategoryId || null,
        serviceComponentId: identity.serviceComponentId || null,
        actionType: this._checked[itemId],
        conditionResult: this._results[itemId] || null,
        conditionNote: this._conditionNotes[itemId] || '',
        notApplicable: this._notApplicable[itemId] === true,
        executionStatus: (typeof ServiceChecklistExecutionSOT!=='undefined'&&typeof ServiceChecklistExecutionSOT.infer==='function') ? ServiceChecklistExecutionSOT.infer({executionStatus:this._executionStatus[itemId],notApplicable:this._notApplicable[itemId]===true,actionType:this._checked[itemId],conditionResult:this._results[itemId]||null}) : (this._notApplicable[itemId]===true?'SKIPPED':(this._checked[itemId]!==undefined?'COMPLETED':'PLANNED')),
        state: (typeof ServiceEventSOT!=='undefined'&&typeof ServiceEventSOT.checklistState==='function') ? ServiceEventSOT.checklistState({actionType:this._checked[itemId],conditionResult:this._results[itemId]||null,notApplicable:this._notApplicable[itemId]===true}) : (this._checked[itemId]==='ganti'?'REPLACED':(this._results[itemId]?'INSPECTED':'PENDING')),
        costBreakdown: this.getItemCost(itemId),
        cost: this.getItemCost(itemId).total,
        catalogPartRefs: this.getCatalogPartRefs(itemId),
        stockPartRef: this.getStockPartRef(itemId),
        usedPartId: (this.getStockPartRef(itemId)||{}).partId || null,
        usedPartQty: (this.getStockPartRef(itemId)||{}).qty || 0,
        catalogPartId: (this.getCatalogPartRefs(itemId)[0]||{}).catalogId || null,
        catalogPartQty: (this.getCatalogPartRefs(itemId)[0]||{}).qty || 0,
        photos: this.getPhotos(itemId),
        foto: this.getPhotos(itemId),
        intervalKmOverride: this.getIntervalOverride(itemId),
        intervalKmAtService: this.getIntervalOverride(itemId) ?? (this.getMasterComponent(itemId)||{}).intervalKm ?? null,
        intervalBulanAtService: (this.getMasterComponent(itemId)||{}).intervalTimeMonths ?? null,
        reminderIntervalSource: this.getIntervalOverride(itemId) ? 'component-override' : (this.getMasterComponent(itemId) ? 'service-master' : 'legacy-category'),
        checklistItemId: itemId
      };
      // categoryId hanya boleh ada bila kategori sparepart konkret benar-benar
      // ditemukan untuk kendaraan aktif. Jangan pernah mengarang ID.
      if (category) row.categoryId = category.id;
      return row;
    }).filter(Boolean);
  },

  // loadFromLog() — restore snapshot checklist saat edit catatan servis lama/baru.
  // Entry lama tanpa checklist tetap valid dan menghasilkan checklist kosong.
  loadFromLog(log) {
    this._checked = {};
    this._results = {};
    this._conditionNotes = {};
    this._notApplicable = {};
    this._executionStatus = {};
    this._identityOverrides = {};
    this._costs = {};
    this._catalogPartRefs = {};
    this._stockPartRefs = {};
    this._photoRefs = {};
    this._intervalOverrides = {};
    if (!log) return { ok: true, count: 0 };
    (Array.isArray(log.checklistNotApplicable)?log.checklistNotApplicable:[]).forEach(id=>{ if(this.findItemById(id)) this._notApplicable[id]=true; });
    if (!Array.isArray(log.checklist) || !log.checklist.length) {
      let legacyId=log.serviceComponentId||null;
      if(!legacyId && typeof ServiceInputCatalog!=='undefined'&&typeof ServiceInputCatalog.infer==='function'){const inf=ServiceInputCatalog.infer(log.item||'');legacyId=inf&&inf.item?inf.item.id:null;}
      const legacy=legacyId?this.findItemById(legacyId):null;
      if(legacy){
        this._checked[legacy.item.id]=this._validActionTypesFor(legacy).includes(log.actionType)?log.actionType:this._defaultActionType(legacy);
        if(log.conditionResult)this._results[legacy.item.id]=log.conditionResult;
        if(log.conditionNote)this._conditionNotes[legacy.item.id]=String(log.conditionNote);
        const stockRef=log.stockPartRef&&log.stockPartRef.partId?log.stockPartRef:(log.usedPartId?{partId:log.usedPartId,qty:log.usedPartQty}:null); if(stockRef)this._stockPartRefs[legacy.item.id]={partId:String(stockRef.partId),qty:Number(stockRef.qty)>0?Number(stockRef.qty):1};
        const refs=Array.isArray(log.catalogPartRefs)?log.catalogPartRefs:(log.catalogPartId?[{catalogId:log.catalogPartId,qty:log.catalogPartQty||1}]:[]); if(refs.length)this._catalogPartRefs[legacy.item.id]=refs.map(r=>({catalogId:String(r.catalogId),qty:Number(r.qty)>0?Number(r.qty):1}));
        const photos=Array.isArray(log.photos)?log.photos:(Array.isArray(log.foto)?log.foto:[]); if(photos.length)this._photoRefs[legacy.item.id]=photos.slice(0,5);
        if(log.intervalKmAtService&&Number(log.intervalKmAtService)>0)this._intervalOverrides[legacy.item.id]=Number(log.intervalKmAtService);
        return {ok:true,count:1,migratedLegacy:true};
      }
      return {ok:true,count:0,legacyUnmapped:true};
    }
    (Array.isArray(log.checklist)?log.checklist:[]).forEach(row => {
      if (!row || !row.itemId) return;
      const found = this.findItemById(row.itemId);
      if (!found) return;
      const valid = this._validActionTypesFor(found.item);
      const action = valid.includes(row.actionType) ? row.actionType : this._defaultActionType(found.item);
      this._checked[row.itemId] = action;
      if (row.conditionResult) this._results[row.itemId] = row.conditionResult;
      if (row.conditionNote) this._conditionNotes[row.itemId] = String(row.conditionNote);
      if (row.notApplicable === true) this._notApplicable[row.itemId] = true;
      if (typeof ServiceChecklistExecutionSOT!=='undefined'&&typeof ServiceChecklistExecutionSOT.normalizeState==='function'&&ServiceChecklistExecutionSOT.normalizeState(row.executionStatus)) this._executionStatus[row.itemId]=ServiceChecklistExecutionSOT.normalizeState(row.executionStatus);
      if (row.masterCategoryId || row.serviceComponentId) {
        this._identityOverrides[row.itemId] = {
          masterCategoryId: row.masterCategoryId || found.item.masterCategoryId || found.group.masterCategoryId || null,
          serviceComponentId: row.serviceComponentId || null
        };
      }
      if (Array.isArray(row.catalogPartRefs)) this._catalogPartRefs[row.itemId] = row.catalogPartRefs.map(r => ({catalogId:String(r.catalogId),qty:Number(r.qty)>0?Number(r.qty):1}));
      else if (row.catalogPartId) this._catalogPartRefs[row.itemId] = [{catalogId:String(row.catalogPartId),qty:Number(row.catalogPartQty)>0?Number(row.catalogPartQty):1}];
      const stockRef=row.stockPartRef&&row.stockPartRef.partId?row.stockPartRef:(row.usedPartId?{partId:row.usedPartId,qty:row.usedPartQty}:null); if(stockRef)this._stockPartRefs[row.itemId]={partId:String(stockRef.partId),qty:Number(stockRef.qty)>0?Number(stockRef.qty):1};
      const rowPhotos=Array.isArray(row.photos)?row.photos:(Array.isArray(row.foto)?row.foto:[]); if(rowPhotos.length)this._photoRefs[row.itemId]=rowPhotos.slice(0,5);
      if(row.intervalKmOverride&&Number(row.intervalKmOverride)>0)this._intervalOverrides[row.itemId]=Number(row.intervalKmOverride);
      if (row.costBreakdown && typeof row.costBreakdown === 'object' && row.costBreakdown.source === 'component') {
        this._costs[row.itemId] = {
          labor: this._normalizeCostField(row.costBreakdown.labor),
          parts: this._normalizeCostField(row.costBreakdown.parts),
          consumables: this._normalizeCostField(row.costBreakdown.consumables),
          other: this._normalizeCostField(row.costBreakdown.other)
        };
      }
    });
    return { ok: true, count: Object.keys(this._checked).length };
  },

  getItemIdentity(itemId) {
    const found = this.findItemById(itemId);
    if (!found) return null;
    const o = this._identityOverrides[itemId] || {};
    return {
      masterCategoryId: o.masterCategoryId || found.item.masterCategoryId || found.group.masterCategoryId || null,
      serviceComponentId: o.serviceComponentId || found.item.id || null
    };
  },

  setItemIdentity(itemId, masterCategoryId, serviceComponentId) {
    const found = this.findItemById(itemId);
    if (!found) return { ok:false, reason:'Item checklist tidak ditemukan' };
    const master = String(masterCategoryId || '');
    const component = String(serviceComponentId || '');
    if (!master) return { ok:false, reason:'Kategori servis wajib dipilih' };
    if (component && typeof ServiceInputCatalog !== 'undefined' && typeof ServiceInputCatalog.itemById === 'function') {
      const hit = ServiceInputCatalog.itemById(component);
      if (!hit || !hit.group || String(hit.group.masterCategoryId) !== master) return { ok:false, reason:'Komponen tidak cocok dengan kategori' };
    }
    this._identityOverrides[itemId] = { masterCategoryId: master, serviceComponentId: component || null };
    return { ok:true, itemId, masterCategoryId:master, serviceComponentId:component||null };
  },

  toNotApplicablePayload() { return Object.keys(this._notApplicable||{}).filter(id=>this._notApplicable[id]===true && this.findItemById(id)).map(id=>id); },

  findItemById(itemId) {
    for (let gi = 0; gi < SERVICE_CHECKLIST_GROUPS.length; gi++) {
      const group = SERVICE_CHECKLIST_GROUPS[gi];
      const ii = this.itemsOfGroup(group).findIndex(it => it.id === itemId);
      if (ii !== -1) return { group, groupIdx: gi, item: group.items[ii], itemIdx: ii };
    }
    return null;
  },

  // firstCheckedGroup() — indeks grup pertama yang mempunyai item checklist
  // tersimpan. Dipakai saat membuka ulang catatan lama supaya modal langsung
  // fokus ke kategori yang benar-benar berisi catatan. Tidak mengubah data.
  firstCheckedGroup() {
    const ids = Object.keys(this._checked || {});
    for (let gi = 0; gi < SERVICE_CHECKLIST_GROUPS.length; gi++) {
      if (this.itemsOfGroup(SERVICE_CHECKLIST_GROUPS[gi]).some(it => ids.includes(it.id))) return gi;
    }
    return null;
  },

  // summaryFromLog() — satu sumber ringkasan untuk Riwayat Servis.
  // Total selalu berasal dari SERVICE_CHECKLIST_GROUPS (SoT), sedangkan
  // checklist tersimpan tetap berasal dari entry D.servisLogs[].checklist.
  summaryFromLog(log) {
    const total = SERVICE_CHECKLIST_GROUPS.reduce((n, g) => n + this.itemsOfGroup(g).length, 0);
    const rows = Array.isArray(log && log.checklist) ? log.checklist : [];
    const validIds = new Set();
    rows.forEach(row => {
      if (row && this.findItemById(row.itemId)) validIds.add(row.itemId);
    });
    let replaced = 0, inspected = 0, conditioned = 0, notApplicable = 0;
    validIds.forEach(itemId => {
      const row = rows.find(r => r && r.itemId === itemId);
      if (row && row.actionType === 'ganti') replaced++;
      else if (row && row.actionType === 'periksa') inspected++;
      if (row && row.conditionResult) conditioned++;
      if (row && row.notApplicable === true) notApplicable++;
    });
    // Backward-compatible source contract: return { checked: validIds.size, total, replaced, inspected };
    return { checked: validIds.size, total, replaced, inspected, conditioned, notApplicable };
  },

  // _item(groupIdx, itemIdx) — 1 titik akses ke SERVICE_CHECKLIST_GROUPS
  // by posisi (bukan by id -- signature toggleItem/setActionType di
  // breakdown dokumen pakai index, cocok dgn accordion Sesi 1C yang
  // render by-index). Index di luar batas -> null (guard, bukan throw).
  _item(groupIdx, itemIdx) {
    const group = SERVICE_CHECKLIST_GROUPS[groupIdx];
    if (!group) return null;
    return this.itemsOfGroup(group)[itemIdx] || null;
  },

  // _validActionTypesFor(item) — actionType yang SAH utk item ini, dipakai
  // _defaultActionType() & setActionType() (guard override manual). Persis
  // pemetaan pola §2b:
  //  - 1/2/5 (ganti-saja/bersih-saja, terkunci)      -> [actionMode itu sendiri]
  //  - 3 (alternate, Busi)                            -> ['periksa','ganti']
  //  - 4 (periksa-conditional, mis. Kampas Rem/Coolant)-> ['periksa','ganti']
  //  - 6 (none, kondisional no-interval)               -> ['catat']
  _maintenanceRuleFor(item) {
    if (!item) return null;
    try {
      if (typeof SERVICE_MAINTENANCE_RULES !== 'undefined' &&
          SERVICE_MAINTENANCE_RULES[item.id]) return SERVICE_MAINTENANCE_RULES[item.id];
    } catch (_e) { console.warn('Service maintenance rule lookup failed', _e); }
    return null;
  },

  _validActionTypesFor(item) {
    if (!item) return [];
    const rule = this._maintenanceRuleFor(item);
    const actions = [];
    const add = (v) => { if (v && !actions.includes(v)) actions.push(v); };
    if (rule) {
      const hasInspect = Number(rule.inspectKm) > 0 || Number(rule.inspectMonths) > 0 || Number(rule.inspectDays) > 0;
      const hasReplace = Number(rule.replaceKm) > 0 || Number(rule.replaceMonths) > 0 || Number(rule.replaceDays) > 0;
      if (hasInspect) add(rule.inspectAction || 'periksa');
      if (hasReplace) add(rule.replaceAction || 'ganti');
      // Kondisional means the user must still be able to record the
      // replacement after inspection even when no fixed replacement interval exists.
      if (item.actionMode === 'periksa-conditional') add('ganti');
      if (item.actionMode === 'ganti' && hasInspect) add('ganti');
      if (actions.length) return actions;
    }
    if (item.actionMode === 'periksa-conditional' || item.actionMode === 'alternate') return ['periksa', 'ganti'];
    if (item.actionMode === 'none') return ['catat'];
    return [item.actionMode];
  },

  // _defaultActionType(item) — actionType yang diisi OTOMATIS saat item
  // PERTAMA KALI dicentang (toggleItem). BUKAN penentu reset jatuh-tempo
  // (itu tetap resolveResetActionTypeFilter()/getEffectiveActionMode() di
  // sparepart-servis.js, 0 diubah sesi ini) -- murni nilai awal toggle UI,
  // user tetap bisa override manual lewat setActionType().
  //  - 'ganti'/'bersih' (1 pilihan tetap, pola 1/2/5) -> actionMode itu
  //    sendiri (Keputusan W poin 2: TIDAK ada opsi "periksa saja").
  //  - 'periksa' (1 pilihan tetap, mis. Celah Klep)   -> 'periksa'.
  //  - 'none' (pola 6, kondisional/no-interval)        -> 'catat' (sentinel
  //    -- item ini memang tidak punya konsep ganti/periksa, cuma dicatat).
  //  - 'periksa-conditional' (pola 4)                  -> 'periksa'
  //    (KEPUTUSAN W poin 1: default aman).
  //  - 'alternate' (pola 3, SATU-SATUNYA = Busi)       -> saran dari
  //    suggestNextBusiAction() (sparepart-servis.js, SUDAH ADA -- dipanggil
  //    apa adanya, TIDAK diubah, lihat breakdown dokumen). Butuh kategori
  //    Busi ter-resolve dulu lewat resolveServisCatForVehicle(item.name,
  //    vehicleId) (SUDAH ADA juga) -- kalau belum ke-resolve (mis.
  //    kendaraan belum dipilih / kategori Busi belum pernah dibuat),
  //    fallback ke 'periksa' (Keputusan W poin 1 yang sama, safer default)
  //    karena suggestNextBusiAction() butuh `cat` valid, tidak aman
  //    dipanggil dgn null (lihat servisLogMatchesCat()).
  _defaultActionType(item) {
    if (item.actionMode === 'alternate') {
      const cat = (typeof resolveServisCatForVehicle === 'function')
        ? resolveServisCatForVehicle(item.name, this._vehicleId)
        : null;
      if (cat && typeof suggestNextBusiAction === 'function') return suggestNextBusiAction(this._vehicleId, cat);
      return 'periksa';
    }
    // Prefer the same canonical maintenance recommendation used by Reminder.
    // This makes the checklist recommendation contextual while preserving manual override.
    try {
      const cat = (typeof resolveServisCatForVehicle === 'function')
        ? resolveServisCatForVehicle(item.name, this._vehicleId)
        : null;
      if (cat && typeof computeServiceUrgency === 'function') {
        const u = computeServiceUrgency({vehicleId: this._vehicleId, cat});
        const recommended = u && u.nextAction;
        if (recommended && this._validActionTypesFor(item).includes(recommended)) return recommended;
      }
    } catch (_e) { console.warn('Service default action recommendation failed', _e); }
    if (item.actionMode === 'periksa-conditional') return 'periksa';
    if (item.actionMode === 'none') return 'catat';
    return item.actionMode;
  },

  // toggleItem(groupIdx, itemIdx) — centang/uncentang 1 item.
  //  - Belum tercentang -> hitung default (_defaultActionType) & simpan
  //    ke _checked[item.id].
  //  - Sudah tercentang -> uncentang: delete key dari _checked (bukan set
  //    false/null -- konsisten kontrak {itemId:actionType}, key hilang =
  //    tidak tercentang).
  // Toggle ulang (centang lagi setelah sempat uncentang) hitung ULANG
  // default -- utk Busi ini artinya saran bisa berubah kalau ada log baru
  // masuk di antara 2 toggle (edge case jarang, murah didukung, 0 cache
  // disimpan by design).
  toggleItem(groupIdx, itemIdx) {
    const item = this._item(groupIdx, itemIdx);
    if (!item) return { ok: false, reason: 'Item tidak ditemukan' };
    if (this._checked[item.id] !== undefined) {
      delete this._checked[item.id];
      return { ok: true, id: item.id, checked: false, actionType: null };
    }
    const actionType = this._defaultActionType(item);
    this._checked[item.id] = actionType;
    return { ok: true, id: item.id, checked: true, actionType };
  },

  // setActionType(groupIdx, itemIdx, type) — override manual toggle
  // "Diperiksa/Diganti" dari UI (Sesi 1C), dipanggil SETELAH item
  // tercentang (tidak otomatis mencentang item yang belum ditoggle).
  // `type` harus termasuk _validActionTypesFor(item) -- guard ini
  // mencegah mis. toggle "ganti" dipasang ke item yang actionMode-nya
  // 'bersih' (tidak punya varian ganti sama sekali).
  setActionType(groupIdx, itemIdx, type) {
    const item = this._item(groupIdx, itemIdx);
    if (!item) return { ok: false, reason: 'Item tidak ditemukan' };
    if (this._checked[item.id] === undefined) {
      return { ok: false, reason: 'Item belum dicentang' };
    }
    const valid = this._validActionTypesFor(item);
    if (!valid.includes(type)) {
      return { ok: false, reason: `actionType "${type}" tidak valid untuk item ini (valid: ${valid.join('/')})` };
    }
    this._checked[item.id] = type;
    return { ok: true, id: item.id, actionType: type };
  },

  findCheckedItemForService(componentId,itemName) {
    const cid=String(componentId||''); const name=String(itemName||'').trim().toLowerCase();
    for(let gi=0;gi<SERVICE_CHECKLIST_GROUPS.length;gi++){
      const group=SERVICE_CHECKLIST_GROUPS[gi]; const items=this.itemsOfGroup(group);
      for(let ii=0;ii<items.length;ii++){const it=items[ii]; if(this._checked[it.id]===undefined)continue; if((cid&&String(it.id)===cid)||(name&&String(it.name||'').trim().toLowerCase()===name))return {groupIdx:gi,itemIdx:ii,item:it};}
    }
    return null;
  },

  setActionTypeByItemId(itemId,type) {
    const found=this.findItemById(itemId);
    return found?this.setActionType(found.groupIdx,found.itemIdx,type):{ok:false,reason:'Item tidak ditemukan'};
  },

  setConditionResultByItemId(itemId,result) {
    const found=this.findItemById(itemId);
    return found?this.setConditionResult(found.groupIdx,found.itemIdx,result):{ok:false,reason:'Item tidak ditemukan'};
  },

  setConditionResult(groupIdx, itemIdx, result) {
    const item = this._item(groupIdx, itemIdx);
    if (!item || this._checked[item.id] === undefined) return { ok:false, reason:'Item belum dicentang' };
    if (!result) { delete this._results[item.id]; return { ok:true, id:item.id, conditionResult:undefined }; }
    if (typeof validServiceCondition === 'function' && !validServiceCondition(result)) return { ok:false, reason:'Hasil pemeriksaan tidak valid' };
    this._results[item.id] = result;
    return { ok:true, id:item.id, conditionResult:result };
  },

  setConditionNoteByItemId(itemId,note) {
    const found=this.findItemById(itemId);
    return found?this.setConditionNote(found.groupIdx,found.itemIdx,note):{ok:false,reason:'Item tidak ditemukan'};
  },

  setConditionNote(groupIdx,itemIdx,note){
    const item=this._item(groupIdx,itemIdx);
    if(!item||this._checked[item.id]===undefined)return {ok:false,reason:'Item belum dicentang'};
    const clean=String(note||'').slice(0,500); if(clean)this._conditionNotes[item.id]=clean; else delete this._conditionNotes[item.id];
    return {ok:true,id:item.id,conditionNote:this._conditionNotes[item.id]};
  },

  setExecutionStatus(groupIdx,itemIdx,status){
    const item=this._item(groupIdx,itemIdx);
    if(!item)return {ok:false,reason:'Item tidak ditemukan'};
    const next=typeof ServiceChecklistExecutionSOT!=='undefined'&&ServiceChecklistExecutionSOT.normalizeState?ServiceChecklistExecutionSOT.normalizeState(status):null;
    if(!next)return {ok:false,reason:'Status eksekusi tidak valid'};
    const current=this._executionStatus[item.id]||'PLANNED';
    const result=typeof ServiceChecklistExecutionSOT!=='undefined'&&ServiceChecklistExecutionSOT.transition?ServiceChecklistExecutionSOT.transition(current,next):{ok:true,to:next};
    if(!result.ok)return result;
    this._executionStatus[item.id]=next;
    return {ok:true,id:item.id,executionStatus:next};
  },

  setExecutionStatusByItemId(itemId,status){
    const found=this.findItemById(itemId);
    return found?this.setExecutionStatus(found.groupIdx,found.itemIdx,status):{ok:false,reason:'Item tidak ditemukan'};
  },

  setNotApplicable(groupIdx, itemIdx, value=true) {
    const item = this._item(groupIdx, itemIdx);
    if (!item) return { ok:false, reason:'Item tidak ditemukan' };
    if (value) { this._notApplicable[item.id] = true; delete this._checked[item.id]; delete this._results[item.id]; delete this._conditionNotes[item.id]; }
    else delete this._notApplicable[item.id];
    return { ok:true, id:item.id, notApplicable:!!value };
  },

  conditionResult(itemId) { return this._results[itemId] || null; },

  // checkedCount(groupIdx) — jumlah item tercentang dalam 1 grup (dipakai
  // badge accordion Sesi 1C). groupIdx di luar batas -> 0 (bukan throw --
  // render badge tetap aman kalau data grup berubah di sesi berikutnya).
  checkedCount(groupIdx) {
    const group = SERVICE_CHECKLIST_GROUPS[groupIdx];
    if (!group) return 0;
    return this.itemsOfGroup(group).reduce((n, it) => n + (this._checked[it.id] !== undefined ? 1 : 0), 0);
  },

  // findGroupForItem(name) — SoT tunggal untuk menghubungkan field
  // "Jenis Servis/Item" ke kategori checklist. TIDAK membaca TORSI_DB
  // sebagai sumber checklist dan TIDAK membuat daftar kedua. Prioritas
  // exact name -> nama item yang mengandung nama query -> query mengandung
  // nama item. Ambiguitas ditolak supaya tidak salah kategori.
  findGroupForItem(name) {
    const q = String(name || '').trim().toLowerCase();
    if (!q) return null;
    const exact = [];
    SERVICE_CHECKLIST_GROUPS.forEach((g, gi) => this.itemsOfGroup(g).forEach((it, ii) => {
      if (it.name.toLowerCase() === q) exact.push({ groupIdx: gi, itemIdx: ii, item: it });
    }));
    if (exact.length === 1) return { groupIdx: exact[0].groupIdx, itemIdx: exact[0].itemIdx, reason: 'exact', item: exact[0].item };
    if (exact.length > 1) return null;

    const candidates = [];
    SERVICE_CHECKLIST_GROUPS.forEach((g, gi) => this.itemsOfGroup(g).forEach((it, ii) => {
      const n = it.name.toLowerCase();
      if (n.includes(q) || q.includes(n)) candidates.push({ groupIdx: gi, itemIdx: ii, item: it });
    }));
    const groups = [...new Set(candidates.map(x => x.groupIdx))];
    if (groups.length !== 1) return null;
    return { groupIdx: groups[0], itemIdx: candidates[0].itemIdx, reason: 'partial', item: candidates[0].item };
  },

  _actionLabel(type) {
    if (type === 'ganti') return '🔧 Ganti';
    if (type === 'periksa') return '🔍 Periksa';
    if (type === 'bersih') return '🧹 Bersihkan';
    return '📝 Catat';
  },

  // renderHtml/render/toggleItemAndRender/setActionTypeAndRender dipertahankan
  // untuk kontrak UI modal checklist mandiri yang sudah ada. Alur Catat Servis
  // memakai renderer kategori milik Servis, tetapi API ini tetap menjadi kontrak
  // kompatibilitas satu SoT checklist.
  renderHtml() {
    const total = SERVICE_CHECKLIST_GROUPS.reduce((n, g) => n + this.itemsOfGroup(g).length, 0);
    const checked = Object.keys(this._checked).length;
    const groups = SERVICE_CHECKLIST_GROUPS.map((group, gi) => {
      const count = this.checkedCount(gi);
      const items = this.itemsOfGroup(group).map((item, ii) => {
        const action = this._checked[item.id];
        const isChecked = action !== undefined;
        const choices = this._validActionTypesFor(item);
        const choiceHtml = choices.length > 1 && isChecked
          ? `<div class="sc-action-toggle" role="group" aria-label="Tindakan ${escapeHtml(item.name)}">${choices.map(type => `<button type="button" class="sc-action-btn${action === type ? ' active' : ''}" data-action="ServisChecklist.setActionTypeAndRender" data-args='[${gi},${ii},"${type}"]'>${this._actionLabel(type)}</button>`).join('')}</div>`
          : `<span class="sc-action-fixed">${this._actionLabel(isChecked ? action : this._defaultActionType(item))}</span>`;
        const partRefs=this.getCatalogPartRefs(item.id);
        const partLabel=partRefs.length?`<div class="sc-item-meta">📦 ${partRefs.length} part katalog terpilih</div>`:'';
        const partButton=isChecked?`<button type="button" class="btn btn-ghost btn-sm" data-action="ServisChecklist.openCatalogPicker" data-args='["${escapeHtml(item.id)}"]'>📦 ${partRefs.length?'Ubah part':'Pilih part'}</button>`:'';
        const execStatus=isChecked?(this._executionStatus[item.id]||'COMPLETED'):null;
        const execLabel=execStatus==='PLANNED'?'⏳ Rencana':execStatus==='SKIPPED'?'⏭️ Dilewati':'✅ Selesai';
        const execButton=isChecked?`<button type="button" class="btn btn-ghost btn-sm" data-action="ServisChecklist.cycleExecutionStatusAndRender" data-args='[${gi},${ii}]'>${execLabel}</button>`:'';
        return `<div class="sc-item${isChecked ? ' is-checked' : ''}"><button type="button" class="sc-check${isChecked ? ' checked' : ''}" role="checkbox" aria-checked="${isChecked ? 'true' : 'false'}" data-action="ServisChecklist.toggleItemAndRender" data-args='[${gi},${ii}]'>${isChecked ? '✓' : ''}</button><div class="sc-item-main"><div class="sc-item-name">${escapeHtml(item.name)}</div><div class="sc-item-meta">${escapeHtml(item.intervalLabel || 'Tanpa interval rutin')}</div>${choiceHtml}${execButton}${partLabel}<div style="margin-top:5px">${partButton}</div></div></div>`;
      }).join('');
      return `<details class="sc-group" id="sc-group-${gi}"${gi === 0 ? ' open' : ''}><summary><span>${escapeHtml(group.group)}</span><span class="sc-group-badge">${count}/${this.itemsOfGroup(group).length}</span></summary><div class="sc-group-body">${items}</div></details>`;
    }).join('');
    const veh = (typeof D !== 'undefined' && Array.isArray(D.vehicles)) ? D.vehicles.find(v => v.id === this._vehicleId) : null;
    const vehicleName = veh && veh.name ? escapeHtml(veh.name) : 'Kendaraan aktif';
    return `<div class="sc-summary"><div><strong>☑️ Checklist Servis Rutin</strong><div class="sc-subtitle">${vehicleName} · ${checked}/${total} item dipilih</div></div><span class="sc-count">${checked}/${total}</span></div><div class="sc-groups">${groups}</div>`;
  },

  render() {
    const el = document.getElementById('servisChecklistBody');
    if (!el) return { ok: false, reason: 'servisChecklistBody tidak ditemukan' };
    el.innerHTML = this.renderHtml();
    return { ok: true, checkedCount: Object.keys(this._checked).length };
  },

  toggleItemAndRender(groupIdx, itemIdx) {
    const result = this.toggleItem(groupIdx, itemIdx);
    this.render();
    return result;
  },

  setActionTypeAndRender(groupIdx, itemIdx, type) {
    const result = this.setActionType(groupIdx, itemIdx, type);
    this.render();
    return result;
  },

  cycleExecutionStatusAndRender(groupIdx,itemIdx){
    const item=this._item(groupIdx,itemIdx); if(!item)return {ok:false,reason:'Item tidak ditemukan'};
    const current=this._executionStatus[item.id]||'COMPLETED';
    const next=current==='COMPLETED'?'PLANNED':current==='PLANNED'?'SKIPPED':'COMPLETED';
    const result=this.setExecutionStatus(groupIdx,itemIdx,next); this.render(); return result;
  },

  groupOptions() {
    return SERVICE_CHECKLIST_GROUPS.map((g, groupIdx) => ({
      groupIdx,
      name: g.group,
      total: this.itemsOfGroup(g).length,
      checked: this.checkedCount(groupIdx),
    }));
  },

  group(groupIdx) {
    return SERVICE_CHECKLIST_GROUPS[groupIdx] || null;
  },

  // findGroupByMasterCategoryId() — kategori servis pada form adalah
  // FILTER/PARENT untuk memilih komponen yang benar-benar dikerjakan.
  // Jadi setelah user memilih kategori, UI checklist hanya menampilkan
  // komponen milik masterCategoryId tersebut; user lalu mencentang itemnya.
  // Tidak ada konsep "servis per kategori" yang otomatis berarti semua item.
  findGroupByMasterCategoryId(masterCategoryId) {
    if (!masterCategoryId) return null;
    const idx = SERVICE_CHECKLIST_GROUPS.findIndex(g => g.masterCategoryId === masterCategoryId);
    return idx < 0 ? null : { group: SERVICE_CHECKLIST_GROUPS[idx], groupIdx: idx };
  },

  itemsForMasterCategory(masterCategoryId) {
    const found = this.findGroupByMasterCategoryId(masterCategoryId);
    return found ? this.itemsOfGroup(found.group).slice() : [];
  },

};
// Ekspos ke window — belum ada data-action="ServisChecklist.xxx" yang
// dipasang di sesi ini (0 markup, lihat catatan file di atas), TAPI
// ditambah SEKARANG (bukan ditunda ke Sesi 1C) supaya tidak masuk daftar
// bug class s345-348 (tombol data-action gagal diam-diam krn modul lupa
// di-window-expose) -- pola sama persis window.Sparepart di file kakaknya
// (sparepart-servis.js) & window.FuelModal/BBM/Servis/Torsi (car-notes.js).
if (typeof window !== 'undefined' && typeof ServisChecklist !== 'undefined') window.ServisChecklist = ServisChecklist;
if (typeof module !== 'undefined') module.exports = { SERVICE_CHECKLIST_GROUPS, ServisChecklist };
