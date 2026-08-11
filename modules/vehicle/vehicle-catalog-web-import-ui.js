// vehicle-catalog-web-import-ui.js — UI Tahap 6 "Import Katalog dari URL
// Web" (fetch/paste HTML -> Parser -> Preview -> Import). Lapisan
// DOM/presenter SAJA, logic ada di vehicle-catalog-web-import.js — pola
// sama persis vehicle-catalog-import-ui.js vs vehicle-catalog-import.js.
//
// Entry point: tombol "🌐 Import dari URL" ditambah di baris tombol
// Scan/Tambah Manual/Import Katalog dalam `catalogModal`. Modal baru
// `vehCatWebImportModal` — alur: isi URL -> tap "Ambil Otomatis" -> kalau
// gagal (CORS, lihat catatan di vehicle-catalog-web-import.js) area
// textarea paste HTML otomatis muncul -> tap "Cek dari HTML yang
// Ditempel" -> preview (checkbox per baris, default TERCENTANG) -> tap
// "Import yang Dicentang" (WAJIB preview dulu, sama kebijakan semua
// tahap import lain). Reuse penuh VehicleCatalogImport.commitRows() —
// TIDAK ada logic commit baru di sini.

let _vehWebImportRows = []; // {partName, oemCode, barcode, price, raw, included}

function _vehWebImportSetStatus(msg) {
  const el = document.getElementById('vehCatWebImportStatus');
  if (el) el.textContent = msg || '';
}

function catalogWebImportUiOpen() {
  _vehWebImportRows = [];
  const preview = document.getElementById('vehCatWebImportPreview');
  if (preview) preview.innerHTML = '';
  const commitBtn = document.getElementById('vehCatWebImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  const pasteWrap = document.getElementById('vehCatWebImportPasteWrap');
  if (pasteWrap) pasteWrap.classList.add('u-dnone');
  const urlInput = document.getElementById('vehCatWebImportUrl');
  if (urlInput) urlInput.value = '';
  const pasteInput = document.getElementById('vehCatWebImportPasteHtml');
  if (pasteInput) pasteInput.value = '';
  _vehWebImportSetStatus('');
  openModal('vehCatWebImportModal');
}

function _catalogWebImportUiProcessHtml(html, sourceLabel) {
  const rows = VehicleCatalogWebImport.parseCatalogHtml(html);
  const complete = (typeof VehicleCatalogImport !== 'undefined' && VehicleCatalogImport && typeof VehicleCatalogImport.filterCompleteRows === 'function')
    ? VehicleCatalogImport.filterCompleteRows(rows)
    : rows;
  _vehWebImportRows = complete.map((r) => Object.assign({}, r, { included: true }));
  if (!_vehWebImportRows.length) {
    _vehWebImportSetStatus('⚠️ Tidak ada part dgn kode part + harga lengkap ditemukan dari ' + sourceLabel + ' — cek lagi halamannya, atau coba tempel HTML manual kalau belum.');
  } else {
    _vehWebImportSetStatus('✅ ' + _vehWebImportRows.length + ' part dgn kode+harga lengkap dari ' + sourceLabel + ' — cek & sesuaikan dulu di bawah sebelum import.');
  }
  catalogWebImportUiRenderPreview();
}

async function catalogWebImportUiFetch() {
  const urlInput = document.getElementById('vehCatWebImportUrl');
  const url = urlInput ? urlInput.value.trim() : '';
  if (!url) { _vehWebImportSetStatus('⚠️ Isi URL katalog dulu.'); return; }
  const fetchBtn = document.querySelector('[data-action="VehicleCatalogWebImportUI.fetchUrl"]');
  if (fetchBtn) fetchBtn.disabled = true;
  _vehWebImportSetStatus('🌐 Mengambil halaman...');
  try {
    const html = await VehicleCatalogWebImport.fetchHtml(url);
    _catalogWebImportUiProcessHtml(html, 'URL');
  } catch (err) {
    console.warn('[VehicleCatalogWebImportUI] fetch otomatis gagal:', err);
    const pasteWrap = document.getElementById('vehCatWebImportPasteWrap');
    if (pasteWrap) pasteWrap.classList.remove('u-dnone');
    _vehWebImportSetStatus('❌ ' + ((err && err.message) || 'Gagal mengambil halaman otomatis') + ' Tempel HTML halaman di kotak bawah ini, lalu tap "Cek dari HTML yang Ditempel".');
  } finally {
    if (fetchBtn) fetchBtn.disabled = false;
  }
}

function catalogWebImportUiProcessPaste() {
  const pasteInput = document.getElementById('vehCatWebImportPasteHtml');
  const html = pasteInput ? pasteInput.value : '';
  if (!html || !html.trim()) { _vehWebImportSetStatus('⚠️ Tempel dulu kode HTML halamannya (View Source / Ctrl+U di halaman katalog, lalu copy-paste ke sini).'); return; }
  _catalogWebImportUiProcessHtml(html, 'HTML yang ditempel');
}

function catalogWebImportUiToggleRow(idx) {
  if (_vehWebImportRows[idx]) _vehWebImportRows[idx].included = !_vehWebImportRows[idx].included;
  catalogWebImportUiRenderPreview();
}

function catalogWebImportUiEditField(idx, field, value) {
  if (!_vehWebImportRows[idx]) return;
  if (field === 'price') {
    const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    _vehWebImportRows[idx].price = isNaN(num) ? null : num;
  } else {
    _vehWebImportRows[idx][field] = value;
  }
}

function catalogWebImportUiRenderPreview() {
  const el = document.getElementById('vehCatWebImportPreview');
  const commitBtn = document.getElementById('vehCatWebImportCommitBtn');
  if (!el) return;
  if (!_vehWebImportRows.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🌐</div><div class="empty-text">Belum ada baris terbaca. Isi URL & ambil, atau tempel HTML dulu.</div></div>';
    if (commitBtn) commitBtn.disabled = true;
    return;
  }
  const includedCount = _vehWebImportRows.filter((r) => r.included).length;
  const countLabel = '<div style="font-size:11px;color:var(--text2);margin-bottom:8px;font-weight:600">' + includedCount + ' dari ' + _vehWebImportRows.length + ' dicentang</div>';
  el.innerHTML = countLabel + _vehWebImportRows.map((row, idx) => {
    const checkedAttr = row.included ? 'checked' : '';
    const priceVal = (typeof row.price === 'number' && !isNaN(row.price)) ? row.price : '';
    return '<div class="tx-item" style="align-items:flex-start">'
      + '<input type="checkbox" ' + checkedAttr + ' style="width:18px;height:18px;margin-top:8px;flex-shrink:0" onchange="VehicleCatalogWebImportUI.toggleRow(' + idx + ')">'
      + '<div class="tx-info" style="flex:1">'
      + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.partName || '') + '" placeholder="Nama part" oninput="VehicleCatalogWebImportUI.editField(' + idx + ',\'partName\',this.value)">'
      + '<div class="u-flex u-gap8">'
      + '<input type="text" class="fi" style="flex:1" value="' + escapeHtml(row.oemCode || '') + '" placeholder="Kode part" oninput="VehicleCatalogWebImportUI.editField(' + idx + ',\'oemCode\',this.value)">'
      + '<input type="number" class="fi" style="flex:1" value="' + priceVal + '" placeholder="Harga" inputmode="numeric" oninput="VehicleCatalogWebImportUI.editField(' + idx + ',\'price\',this.value)">'
      + '</div></div></div>';
  }).join('');
  if (commitBtn) commitBtn.disabled = !includedCount;
}

async function catalogWebImportUiCommit() {
  const rowsToImport = _vehWebImportRows.filter((r) => r.included);
  if (!rowsToImport.length) return;
  const ok = await askConfirm('Import ' + rowsToImport.length + ' part yang dicentang ke katalog?');
  if (!ok) return;
  const commitBtn = document.getElementById('vehCatWebImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  _vehWebImportSetStatus('⏳ Mengimpor...');
  try {
    const summary = await VehicleCatalogImport.commitRows(rowsToImport);
    const dupNote = summary.duplicates ? ' (' + summary.duplicates + ' duplikat)' : '';
    toast('✅ ' + summary.imported + ' part diimpor' + (summary.skipped ? ', ' + summary.skipped + ' dilewati' + dupNote : ''));
    _vehWebImportRows = [];
    catalogWebImportUiRenderPreview();
    closeModal('vehCatWebImportModal');
    if (typeof VehicleCatalogUI !== 'undefined' && VehicleCatalogUI && typeof VehicleCatalogUI.renderList === 'function') {
      await VehicleCatalogUI.renderList();
    }
  } finally {
    if (commitBtn) commitBtn.disabled = !_vehWebImportRows.some((r) => r.included);
  }
}

const VehicleCatalogWebImportUI = {
  open: catalogWebImportUiOpen,
  fetchUrl: catalogWebImportUiFetch,
  processPaste: catalogWebImportUiProcessPaste,
  toggleRow: catalogWebImportUiToggleRow,
  editField: catalogWebImportUiEditField,
  commit: catalogWebImportUiCommit,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogWebImportUI = VehicleCatalogWebImportUI;
}
