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

  toLogPayload() {
    return Object.keys(this._checked).map(itemId => {
      const found = this.findItemById(itemId);
      if (!found) return null;
      const category = this.resolveCategoryForItem(found.item, this._vehicleId);
      const row = {
        itemId,
        itemName: found.item.name,
        group: found.group.group,
        masterCategoryId: found.item.masterCategoryId || found.group.masterCategoryId || null,
        actionType: this._checked[itemId],
        conditionResult: this._results[itemId] || null,
        conditionNote: this._conditionNotes[itemId] || '',
        notApplicable: this._notApplicable[itemId] === true
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
    if (!log) return { ok: true, count: 0 };
    (Array.isArray(log.checklistNotApplicable)?log.checklistNotApplicable:[]).forEach(id=>{ if(this.findItemById(id)) this._notApplicable[id]=true; });
    if (!Array.isArray(log.checklist)) return { ok: true, count: 0 };
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
    });
    return { ok: true, count: Object.keys(this._checked).length };
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

  setConditionResult(groupIdx, itemIdx, result) {
    const item = this._item(groupIdx, itemIdx);
    if (!item || this._checked[item.id] === undefined) return { ok:false, reason:'Item belum dicentang' };
    if (typeof validServiceCondition === 'function' && !validServiceCondition(result)) return { ok:false, reason:'Hasil pemeriksaan tidak valid' };
    this._results[item.id] = result;
    return { ok:true, id:item.id, conditionResult:result };
  },

  setConditionNote(groupIdx,itemIdx,note){
    const item=this._item(groupIdx,itemIdx);
    if(!item||this._checked[item.id]===undefined)return {ok:false,reason:'Item belum dicentang'};
    this._conditionNotes[item.id]=String(note||'').slice(0,500);
    return {ok:true,id:item.id,conditionNote:this._conditionNotes[item.id]};
  },

  setNotApplicable(groupIdx, itemIdx, value=true) {
    const item = this._item(groupIdx, itemIdx);
    if (!item) return { ok:false, reason:'Item tidak ditemukan' };
    if (value) { this._notApplicable[item.id] = true; delete this._checked[item.id]; delete this._results[item.id]; }
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
        return `<div class="sc-item${isChecked ? ' is-checked' : ''}"><button type="button" class="sc-check${isChecked ? ' checked' : ''}" role="checkbox" aria-checked="${isChecked ? 'true' : 'false'}" data-action="ServisChecklist.toggleItemAndRender" data-args='[${gi},${ii}]'>${isChecked ? '✓' : ''}</button><div class="sc-item-main"><div class="sc-item-name">${escapeHtml(item.name)}</div><div class="sc-item-meta">${escapeHtml(item.intervalLabel || 'Tanpa interval rutin')}</div>${choiceHtml}</div></div>`;
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
