// vehicle-catalog-ui.js — UI dasar Vehicle Catalog (Katalog Suku Cadang), lanjutan ringkas
// Tahap 2 ACR-001. Scan (vehicle-scanner.js) & storage/CRUD (vehicle-catalog.js) SUDAH ADA
// dari sesi sebelumnya — sesi ini isinya HANYA lapisan UI, scope disepakati eksplisit dgn
// user (ringkas & additive):
//
// PERUBAHAN SESI INI (Tahap 7B-1 — Fondasi Scanner Sparepart): tambah field `catBarcode`
// (baca/tulis openForm()/save()) — REUSE MURNI field `barcode` yang SUDAH ADA di skema
// VehicleCatalog (vehicle-catalog.js, dipakai findByCode()/handleScan() sejak Tahap 2),
// sebelumnya cuma belum ada input-nya di form UI ini. Ditambahkan supaya kode hasil scan
// dari sparepart-scanner.js (baru, lihat file itu) kelihatan & bisa diisi/dikoreksi manual
// di form yang sama — TIDAK ada skema/formula baru, presenter-layer saja.
// - 1 modal baru (`catalogModal`) — list part (nama, OEM code, foto thumbnail).
// - Tombol "📷 Scan" -> reuse SparepartScannerUI.scanCamera() (Tahap 7B-2,
//   lihat sparepart-scanner-ui.js/sparepart-scanner.js — adapter 'camera'
//   reuse penuh VehicleScanner.ensureZXing()/buildHints()) — TIDAK ada logic
//   scan baru di sini.
// - Tombol "+ Tambah Manual" -> form pakai field yang SUDAH ADA di VehicleCatalog
//   (partName/oemCode/category/photos) -- TIDAK ada field/skema baru.
// Entry point: tombol "📦 Katalog Suku Cadang" ditambah di page:'carnotes', tepat di bawah
// "+ Kelola Kendaraan" (index.html/app_production.html) -- additive, tidak menyentuh page lain.
//
// Kenapa namespace object (pola sama BillMultiScan/UniversalScan/GoldImport), bukan flat
// function seperti openVehicleModal()/saveVehicle(): modul ini murni presenter baru dgn
// state form sendiri (_catEditId/_catPhotos) yang terpisah dari D global (data part disimpan
// di VehicleCatalog/IDBStore, BUKAN D.vehicles) -- namespace memudahkan pemisahan itu &
// konsisten dgn modul-modul sejenis yang juga bukan bagian D.
//
// Jembatan ke Scan: vehicleScannerHandleResult() (vehicle-scanner.js) dipanggil setelah
// VehicleCatalog.handleScan(code) resolve, lewat guard typeof VehicleCatalogUI==='object' &&
// typeof .onScanResult==='function' (pola adapter tipis yang sama dgn _aiContext*() dkk) --
// supaya list di modal ini auto-refresh kalau modal sedang terbuka saat scan selesai, tanpa
// vehicle-scanner.js perlu tahu apa pun soal DOM/UI modul ini.

let _catEditId = null;
let _catPhotos = [];

// Mode "Pilih" (sesi ini) — checkbox per part di list utama supaya bisa
// hapus beberapa sekaligus, TANPA mengubah alur edit/hapus-1-part yang
// sudah ada (tap baris di luar mode ini tetap buka form edit apa adanya).
// _catSelectMode: false = list biasa (tap baris = edit, 🗑 per baris =
// hapus 1). true = list tampil checkbox, tap baris = toggle centang.
let _catSelectMode = false;
let _catSelectedIds = new Set();

// Kompresi ringan sebelum disimpan sbg base64 (IndexedDB) — REUSE penuh
// downscaleImage() yang sudah ada di scan-ocr.js (dipakai jg oleh scanReceipt
// dkk sebelum OCR: resize max-width + re-encode JPEG kualitas 0.85), bukan
// implementasi baru. Guard typeof supaya tetap aman kalau file ini pernah
// dites/dimuat terpisah tanpa scan-ocr.js (pola sama guard adapter lain di
// modul ini) — fallback ke file asli (tanpa kompresi) kalau helper tsb tidak
// ada, bukan gagal total.
function _catPhotoToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const useFile = (typeof downscaleImage === 'function') ? downscaleImage(file, 1024) : Promise.resolve(file);
    useFile.then((f) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Gagal membaca foto'));
      reader.readAsDataURL(f);
    }).catch(reject);
  });
}

async function catalogUiOpen() {
  await VehicleCatalog.ensureLoaded();
  catalogUiCloseForm();
  _catSelectMode = false;
  _catSelectedIds.clear();
  await catalogUiRenderList();
  openModal('catalogModal');
}

async function catalogUiRenderList() {
  const el = document.getElementById('catalogList');
  if (!el) return;
  const allItems = await VehicleCatalog.getAll();
  // Bugfix (laporan user): dulu selalu tampil SEMUA part tanpa pandang
  // kendaraan aktif. Sekarang di-filter ke curVehicleId, reuse field
  // compatibleVehicleIds yang sudah ada (part tanpa tag dianggap universal
  // -- lihat VehicleCatalog.filterForVehicle()). 0 perubahan skema data.
  const items = (typeof curVehicleId !== 'undefined')
    ? VehicleCatalog.filterForVehicle(allItems, curVehicleId)
    : allItems;
  if (!items.length) {
    _catSelectMode = false;
    _catSelectedIds.clear();
    el.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada part di katalog untuk kendaraan ini</div></div>';
    return;
  }
  // Buang id terpilih yang part-nya sudah tidak ada lagi (mis. terhapus dari
  // sesi lain) supaya hitungan "N Terpilih" selalu akurat.
  const validIds = new Set(items.map((it) => String(it.id)));
  for (const id of Array.from(_catSelectedIds)) {
    if (!validIds.has(id)) _catSelectedIds.delete(id);
  }

  const toolbar = _catSelectMode
    ? ('<div style="display:flex;gap:6px;margin-bottom:8px">'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" data-action="VehicleCatalogUI.selectAll">☑️ Pilih Semua</button>'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" data-action="VehicleCatalogUI.clearSelection">✕ Kosongkan</button>'
        + '</div>'
        + '<div style="display:flex;gap:6px;margin-bottom:12px">'
        + '<button type="button" class="btn btn-danger btn-sm u-flex1" data-action="VehicleCatalogUI.removeSelected"' + (_catSelectedIds.size ? '' : ' disabled') + '>🗑 Hapus Terpilih (' + _catSelectedIds.size + ')</button>'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" data-action="VehicleCatalogUI.toggleSelectMode">Batal</button>'
        + '</div>')
    : ('<div style="display:flex;gap:6px;margin-bottom:12px">'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" data-action="VehicleCatalogUI.toggleSelectMode">☑️ Pilih & Hapus</button>'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" style="color:var(--accent2)" data-action="VehicleCatalogUI.removeAllConfirm">🗑 Hapus Semua</button>'
        + '</div>');

  const rows = items.slice().reverse().map((it) => {
    const thumb = (it.photos && it.photos[0])
      ? '<img src="' + it.photos[0] + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0" alt="">'
      : '<div class="tx-icon u-bgaccsoft">📦</div>';
    const metaParts = [];
    if (it.oemCode) metaParts.push('OEM: ' + escapeHtml(it.oemCode));
    if (it.category) metaParts.push(escapeHtml(it.category));
    if (it.compatibleVehicleIds && it.compatibleVehicleIds.length) metaParts.push('🏍️ ' + it.compatibleVehicleIds.length + ' kendaraan');
    if (typeof D !== 'undefined' && Array.isArray(D.partsStock)) {
      // Sesi 274/275: catalogId dulu (match presisi, tahan rename nama
      // stok manual — pola sama S273/car-notes.js), name-match jadi
      // fallback SAJA untuk baris stok lama yang belum punya catalogId.
      const matchedStock = D.partsStock.find((p) => p.catalogId === it.id)
        || (it.partName ? D.partsStock.find((p) => p.name && p.name.trim().toLowerCase() === it.partName.trim().toLowerCase()) : null);
      if (matchedStock) metaParts.push('📦 Stok ' + matchedStock.qty + (matchedStock.unit ? ' ' + matchedStock.unit : ''));
    }
    if (it.isDraft) metaParts.push('⚠️ Draft');
    const idArg = escapeHtml(JSON.stringify([it.id]));
    const info = '<div class="tx-info"><div class="tx-name">' + escapeHtml(it.partName || '(Tanpa nama)') + '</div><div class="tx-meta">' + (metaParts.join(' · ') || '-') + '</div></div>';
    if (_catSelectMode) {
      const checkedAttr = _catSelectedIds.has(String(it.id)) ? 'checked' : '';
      return '<div class="tx-item" style="cursor:pointer" data-action="VehicleCatalogUI.toggleSelectItem" data-args="' + idArg + '">'
        + '<input type="checkbox" ' + checkedAttr + ' style="width:18px;height:18px;margin-right:2px;flex-shrink:0;pointer-events:none" tabindex="-1" aria-hidden="true">'
        + thumb + info
        + '</div>';
    }
    return '<div class="tx-item">' + thumb + info
      + '<button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="VehicleCatalogUI.openForm" data-args="' + idArg + '" aria-label="Edit">✏️</button>'
      + '<button class="tx-del" data-action="VehicleCatalogUI.remove" data-args="' + idArg + '" aria-label="Hapus">🗑</button>'
      + '</div>';
  }).join('');

  el.innerHTML = toolbar + rows;
}

// Nyala/matikan mode "Pilih" — mematikan mode selalu mengosongkan seleksi
// (supaya masuk mode lagi nanti mulai dari nol, tidak menyisakan centang
// lama yang membingungkan).
function catalogUiToggleSelectMode() {
  _catSelectMode = !_catSelectMode;
  _catSelectedIds.clear();
  catalogUiRenderList();
}

function catalogUiToggleSelectItem(id) {
  const key = String(id);
  if (_catSelectedIds.has(key)) _catSelectedIds.delete(key);
  else _catSelectedIds.add(key);
  catalogUiRenderList();
}

async function catalogUiSelectAll() {
  const items = await VehicleCatalog.getAll();
  _catSelectedIds = new Set(items.map((it) => String(it.id)));
  await catalogUiRenderList();
}

function catalogUiClearSelection() {
  _catSelectedIds.clear();
  catalogUiRenderList();
}

async function catalogUiRemoveSelected() {
  const n = _catSelectedIds.size;
  if (!n) return;
  const ok = await askConfirm('Hapus ' + n + ' part terpilih dari katalog? Tindakan ini tidak bisa dibatalkan.', {
    icon: '🗑', title: 'Hapus ' + n + ' Part', okText: 'Ya, Hapus', danger: true,
  });
  if (!ok) return;
  await VehicleCatalog.removeMany(Array.from(_catSelectedIds));
  toast('🗑 ' + n + ' part dihapus');
  _catSelectMode = false;
  _catSelectedIds.clear();
  await catalogUiRenderList();
}

async function catalogUiRemoveAllConfirm() {
  const items = await VehicleCatalog.getAll();
  if (!items.length) return;
  const ok = await askConfirm('Hapus SEMUA ' + items.length + ' part dari katalog? Tindakan ini tidak bisa dibatalkan.', {
    icon: '⚠️', title: 'Hapus Semua Part', okText: 'Ya, Hapus Semua', danger: true,
  });
  if (!ok) return;
  await VehicleCatalog.removeAll();
  toast('🗑 Semua part dihapus');
  _catSelectMode = false;
  _catSelectedIds.clear();
  await catalogUiRenderList();
}

async function catalogUiOpenForm(id) {
  _catEditId = id || null;
  _catPhotos = [];
  const wrap = document.getElementById('catalogFormWrap');
  if (!wrap) return;
  wrap.classList.remove('u-dnone');
  const delBtn = document.getElementById('catDelBtn');
  let compatibleVehicleIds = [];
  if (_catEditId) {
    const item = await VehicleCatalog.getById(_catEditId);
    if (!item) _catEditId = null;
    document.getElementById('catFormLabel').textContent = 'Edit Part';
    document.getElementById('catPartName').value = item ? item.partName : '';
    document.getElementById('catOemCode').value = item ? (item.oemCode || '') : '';
    document.getElementById('catBarcode').value = item ? (item.barcode || '') : '';
    document.getElementById('catCategory').value = item ? (item.category || '') : '';
    document.getElementById('catOldPartNumber').value = item ? (item.oldPartNumber || '') : '';
    document.getElementById('catReplacementPartNumber').value = item ? (item.replacementPartNumber || '') : '';
    document.getElementById('catDimension').value = item ? (item.dimension || '') : '';
    document.getElementById('catMaterial').value = item ? (item.material || '') : '';
    document.getElementById('catWeight').value = (item && item.weight !== null && item.weight !== undefined) ? item.weight : '';
    document.getElementById('catSource').value = item ? (item.source || '') : '';
    document.getElementById('catConfidence').value = item ? (item.confidence || '') : '';
    document.getElementById('catConsumable').checked = !!(item && item.consumable);
    // Buka otomatis panel "Detail Tambahan" kalau salah satu field-nya sudah terisi (mis. part
    // hasil scan/import yang sudah punya data ini) -- supaya user tidak perlu tap toggle dulu utk
    // lihat data yang sebenarnya sudah ada.
    const hasExtra = !!(item && (item.oldPartNumber || item.replacementPartNumber || item.dimension || item.material || (item.weight !== null && item.weight !== undefined) || item.source || item.confidence || item.consumable));
    document.getElementById('catExtraToggle').checked = hasExtra;
    toggleCatExtraFields();
    _catPhotos = (item && Array.isArray(item.photos)) ? item.photos.slice() : [];
    compatibleVehicleIds = (item && Array.isArray(item.compatibleVehicleIds)) ? item.compatibleVehicleIds : [];
    document.getElementById('catSaveBtn').textContent = 'Simpan Perubahan';
    if (delBtn) delBtn.classList.remove('u-dnone');
  } else {
    document.getElementById('catFormLabel').textContent = 'Tambah Part Baru';
    document.getElementById('catPartName').value = '';
    document.getElementById('catOemCode').value = '';
    document.getElementById('catBarcode').value = '';
    document.getElementById('catCategory').value = '';
    document.getElementById('catOldPartNumber').value = '';
    document.getElementById('catReplacementPartNumber').value = '';
    document.getElementById('catDimension').value = '';
    document.getElementById('catMaterial').value = '';
    document.getElementById('catWeight').value = '';
    document.getElementById('catSource').value = '';
    document.getElementById('catConfidence').value = '';
    document.getElementById('catConsumable').checked = false;
    document.getElementById('catExtraToggle').checked = false;
    toggleCatExtraFields();
    document.getElementById('catSaveBtn').textContent = '+ Tambah Part';
    if (delBtn) delBtn.classList.add('u-dnone');
    // Bugfix terkait: default-centang kendaraan yg sedang aktif di Car Notes
    // supaya part baru langsung kelihatan di sana (bukan "universal" tanpa
    // sengaja) -- user tetap bisa uncheck/tambah kendaraan lain manual.
    if (typeof curVehicleId !== 'undefined' && curVehicleId) compatibleVehicleIds = [curVehicleId];
  }
  catalogUiRenderPhotos();
  catalogUiRenderVehicleChecklist(compatibleVehicleIds);
  // Sesi 296 (bugfix, laporan user "tombol edit tidak ada efek"): form ✏️
  // Edit ini dirender di BAWAH #catalogList (bisa panjang kalau sudah banyak
  // part hasil scan katalog) -- munculnya form beneran jalan (u-dnone
  // dilepas), tapi kalau list panjang, form itu ada di luar area kelihatan
  // (di bawah fold), jadi kelihatan spt tombol tidak bereaksi sama sekali.
  // Fix: auto-scroll form ke dalam viewport tiap kali dibuka (baik utk Edit
  // maupun +Tambah Manual). setTimeout 0 supaya browser sempat selesai
  // reflow dulu (wrap baru saja dilepas dari u-dnone di baris atas) sebelum
  // dihitung posisi scroll-nya -- scrollIntoView tanpa delay ini kadang
  // meleset kalau dipanggil di frame yang sama dgn perubahan display.
  setTimeout(() => {
    if (wrap && typeof wrap.scrollIntoView === 'function') {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 0);
}

// Checklist kendaraan kompatibel — REUSE D.vehicles apa adanya (tidak baca/
// tulis D langsung dari sini kecuali baca id/name/emoji, sesuai batasan
// ACR-001: "validasi id dilakukan di lapisan UI/adapter", bukan di
// vehicle-catalog.js). Kalau D.vehicles belum ada/kosong, tampil hint saja.
function catalogUiRenderVehicleChecklist(selectedIds) {
  const el = document.getElementById('catCompatWrap');
  if (!el) return;
  const sel = new Set((selectedIds || []).map(String));
  const list = (typeof D !== 'undefined' && Array.isArray(D.vehicles)) ? D.vehicles : [];
  if (!list.length) {
    el.innerHTML = '<div class="u-fs11 u-t2">Belum ada kendaraan terdaftar di Kelola Kendaraan.</div>';
    return;
  }
  el.innerHTML = list.map((v) => (
    '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer">'
    + '<input type="checkbox" value="' + escapeHtml(String(v.id)) + '" ' + (sel.has(String(v.id)) ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--accent)">'
    + (v.emoji || '🏍️') + ' ' + escapeHtml(v.name || '')
    + '</label>'
  )).join('');
}

function catalogUiCloseForm() {
  _catEditId = null;
  _catPhotos = [];
  const wrap = document.getElementById('catalogFormWrap');
  if (wrap) wrap.classList.add('u-dnone');
}

// Panel "Detail Tambahan (opsional)" (Golongan A) -- pola SAMA PERSIS toggle
// opsional lain di app (mis. renovItemHargaTotalToggle), field-nya semua
// opsional di validate()/create() (lihat vehicle-catalog.js), jadi UI-nya
// juga sengaja disembunyikan default supaya form utama tetap ringkas.
function toggleCatExtraFields() {
  const toggle = document.getElementById('catExtraToggle');
  const wrap = document.getElementById('catExtraWrap');
  if (!toggle || !wrap) return;
  wrap.classList.toggle('u-dnone', !toggle.checked);
}

function catalogUiPickPhoto() {
  const inp = document.getElementById('catPhotoInput');
  if (inp) inp.click();
}

async function catalogUiAddPhoto(e) {
  const file = (e && e.target && e.target.files) ? e.target.files[0] : null;
  if (!file) return;
  if (_catPhotos.length >= VehicleCatalog.MAX_PHOTOS) {
    toast('⚠️ Maksimal ' + VehicleCatalog.MAX_PHOTOS + ' foto per part');
    if (e && e.target) e.target.value = '';
    return;
  }
  try {
    const dataUrl = await _catPhotoToDataUrl(file);
    _catPhotos.push(dataUrl);
    catalogUiRenderPhotos();
  } catch (err) {
    toast('❌ Gagal memuat foto: ' + (err && err.message ? err.message : 'error tidak diketahui'));
  } finally {
    if (e && e.target) e.target.value = '';
  }
}

function catalogUiRemovePhoto(idx) {
  _catPhotos.splice(idx, 1);
  catalogUiRenderPhotos();
}

function catalogUiRenderPhotos() {
  const el = document.getElementById('catPhotoThumbs');
  if (!el) return;
  el.innerHTML = _catPhotos.map((src, i) => (
    '<div style="position:relative">'
    + '<img src="' + src + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--border)" alt="">'
    + '<button type="button" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:var(--accent2);color:#fff;font-size:11px;line-height:1;cursor:pointer" data-action="VehicleCatalogUI.removePhoto" data-args="' + escapeHtml(JSON.stringify([i])) + '" aria-label="Hapus foto">✕</button>'
    + '</div>'
  )).join('');
}

async function catalogUiSave() {
  const partName = (document.getElementById('catPartName').value || '').trim();
  const oemCode = (document.getElementById('catOemCode').value || '').trim();
  const barcode = (document.getElementById('catBarcode').value || '').trim();
  const category = (document.getElementById('catCategory').value || '').trim();
  const compatWrap = document.getElementById('catCompatWrap');
  const compatibleVehicleIds = compatWrap
    ? Array.from(compatWrap.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value)
    : [];
  const oldPartNumber = (document.getElementById('catOldPartNumber').value || '').trim();
  const replacementPartNumber = (document.getElementById('catReplacementPartNumber').value || '').trim();
  const dimension = (document.getElementById('catDimension').value || '').trim();
  const material = (document.getElementById('catMaterial').value || '').trim();
  const weightRaw = (document.getElementById('catWeight').value || '').trim();
  const source = (document.getElementById('catSource').value || '').trim();
  const confidence = (document.getElementById('catConfidence').value || '').trim();
  const consumable = !!document.getElementById('catConsumable').checked;
  const data = {
    partName, oemCode, barcode, category, photos: _catPhotos.slice(), compatibleVehicleIds,
    oldPartNumber, replacementPartNumber, dimension, material,
    weight: weightRaw === '' ? null : weightRaw,
    source, confidence, consumable,
  };
  const res = _catEditId
    ? await VehicleCatalog.update(_catEditId, data)
    : await VehicleCatalog.create(data);
  if (!res.success) {
    toast('⚠️ ' + ((res.errors && res.errors[0]) || 'Gagal menyimpan part'));
    return;
  }
  toast(_catEditId ? '✅ Part diperbarui' : '✅ Part ditambahkan');
  catalogUiCloseForm();
  await catalogUiRenderList();
}

async function catalogUiRemove(id) {
  const target = id || _catEditId;
  if (!target) return;
  const ok = await askConfirm('Hapus part ini dari katalog?');
  if (!ok) return;
  await VehicleCatalog.remove(target);
  toast('🗑 Part dihapus');
  catalogUiCloseForm();
  await catalogUiRenderList();
}

// Dipanggil vehicleScannerHandleResult() (vehicle-scanner.js) setelah scan selesai. Refresh
// list HANYA kalau modal ini sedang terbuka (class 'open', lihat openModal()/closeModal() di
// modal-navigasi.js), supaya tidak mengganggu state form manual yang sedang diisi kalau modal
// ini kebetulan tidak dibuka lewat alur scan.
function catalogUiOnScanResult() {
  const modalEl = document.getElementById('catalogModal');
  if (!modalEl || !modalEl.classList.contains('open')) return;
  catalogUiRenderList();
}

const VehicleCatalogUI = {
  open: catalogUiOpen,
  renderList: catalogUiRenderList,
  openForm: catalogUiOpenForm,
  closeForm: catalogUiCloseForm,
  pickPhoto: catalogUiPickPhoto,
  addPhoto: catalogUiAddPhoto,
  removePhoto: catalogUiRemovePhoto,
  save: catalogUiSave,
  remove: catalogUiRemove,
  onScanResult: catalogUiOnScanResult,
  toggleSelectMode: catalogUiToggleSelectMode,
  toggleSelectItem: catalogUiToggleSelectItem,
  selectAll: catalogUiSelectAll,
  clearSelection: catalogUiClearSelection,
  removeSelected: catalogUiRemoveSelected,
  removeAllConfirm: catalogUiRemoveAllConfirm,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogUI = VehicleCatalogUI;
}
