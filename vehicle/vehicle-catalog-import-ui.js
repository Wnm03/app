// vehicle-catalog-import-ui.js — UI Tahap 5 "Import Katalog" (PDF -> OCR ->
// Parser -> Preview -> Import). Lapisan DOM/presenter SAJA, seluruh
// logic parsing/commit ada di vehicle-catalog-import.js (TIDAK
// diduplikasi/diubah di sini) — pola sama persis vehicle-catalog-ui.js
// vs vehicle-catalog.js.
//
// Entry point: tombol "📋 Import Katalog" ditambah di dalam `catalogModal`
// (index.html/app_production.html), di baris tombol Scan/Tambah Manual.
// Modal baru `vehCatalogImportModal` — WAJIB preview + konfirmasi sebelum
// commitRows() dipanggil (Tahap 5: "Jangan langsung mengubah database
// tanpa preview dan konfirmasi pengguna") — checkbox per baris, default
// TERCENTANG (baris valid), tapi commit hanya jalan lewat tombol
// "Import yang Dicentang" setelah user melihat preview-nya.

let _vehImportRows = []; // state hasil parse, per baris: {partName, oemCode, barcode, price, category, raw, included}

function _vehImportSetStatus(msg) {
  const el = document.getElementById('vehCatImportStatus');
  if (el) el.textContent = msg || '';
}

async function catalogImportUiOpen() {
  _vehImportRows = [];
  const preview = document.getElementById('vehCatImportPreview');
  if (preview) preview.innerHTML = '';
  const commitBtn = document.getElementById('vehCatImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  _vehImportSetStatus('');
  const fileInput = document.getElementById('vehCatImportPdfFile');
  if (fileInput) fileInput.value = '';
  openModal('vehCatalogImportModal');
}

function catalogImportUiPickFile() {
  const inp = document.getElementById('vehCatImportPdfFile');
  if (inp) inp.click();
}

/** onFileChange(e) — terima 1 ATAU BANYAK file PDF sekaligus (input
 * `multiple`, lihat modals.js `vehCatImportPdfFile`). Tiap file diproses
 * berurutan lewat jalur yg SAMA PERSIS dgn sebelumnya (extractPdfText ->
 * parseCatalogRows -> filterCompleteRows), 100% reuse — TIDAK ada engine
 * baca/parse PDF baru. Hasil semua file digabung ke satu _vehImportRows
 * (ditandai `sourceFile` per baris) supaya preview & commit tetap 1 alur
 * checklist gabungan, bukan per-file terpisah. Satu file gagal TIDAK
 * menghentikan file lain. Menggantikan modal "Import PDF Honda" terpisah
 * (honda-pdf-import*.js) yg ternyata reuse engine yg sama persis — cukup
 * 1 modal ini yg sekarang mendukung banyak file sekaligus. */
async function catalogImportUiOnFileChange(e) {
  const files = (e && e.target && e.target.files) ? Array.from(e.target.files) : [];
  if (!files.length) return;
  _vehImportSetStatus('🔍 Membaca ' + files.length + ' PDF (OCR otomatis kalau perlu, bisa beberapa menit utk banyak file)...');
  const commitBtn = document.getElementById('vehCatImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  const pickBtn = document.querySelector('[data-action="VehicleCatalogImportUI.pickFile"]');
  if (pickBtn) pickBtn.disabled = true;
  let allRows = [];
  let totalRaw = 0;
  const fileErrors = [];
  try {
    for (const file of files) {
      try {
        const text = await VehicleCatalogImport.extractPdfText(file);
        const rows = VehicleCatalogImport.parseCatalogRows(text);
        totalRaw += rows.length;
        // Hanya tampilkan baris yang sudah punya kode part — harga TIDAK
        // wajib (banyak PDF katalog dealer nyata cuma nampilkan harga sbg
        // angka polos tanpa "Rp", jadi tidak selalu kedeteksi parser; harga
        // masih bisa diisi/dikoreksi manual di preview di bawah).
        const completeRows = VehicleCatalogImport.filterCompleteRows(rows, { requirePrice: false });
        allRows = allRows.concat(completeRows.map((r) => Object.assign({}, r, { sourceFile: file.name })));
      } catch (err) {
        console.error('[VehicleCatalogImportUI] gagal baca PDF:', file.name, err);
        const msg = (typeof VehicleScanner !== 'undefined' && VehicleScanner && typeof VehicleScanner.errorMessage === 'function')
          ? VehicleScanner.errorMessage(err)
          : ((err && err.message) || 'gagal membaca PDF, coba lagi');
        fileErrors.push(file.name + ': ' + msg);
      }
    }
    _vehImportRows = allRows.map((r) => Object.assign({}, r, { included: true }));
    const skippedIncomplete = totalRaw - allRows.length;
    const fileLabel = files.length > 1 ? (files.length + ' file') : 'PDF ini';
    if (!_vehImportRows.length) {
      _vehImportSetStatus('⚠️ Tidak ada part dgn kode part dari ' + fileLabel + (totalRaw ? ' (' + totalRaw + ' baris terbaca, tapi tidak ada yang punya kode part)' : '') + (fileErrors.length ? ' — ' + fileErrors.join('; ') : ' — coba file lain atau pastikan halaman cukup jelas.'));
    } else {
      _vehImportSetStatus('✅ ' + _vehImportRows.length + ' part dgn kode part dari ' + fileLabel + (skippedIncomplete ? ', ' + skippedIncomplete + ' baris dilewati (tidak ada kode part)' : '') + (fileErrors.length ? ', ' + fileErrors.length + ' file gagal dibaca (' + fileErrors.join('; ') + ')' : '') + ' — cek & sesuaikan dulu di bawah (isi harga manual kalau belum ada) sebelum import.');
    }
    catalogImportUiRenderPreview();
  } finally {
    if (pickBtn) pickBtn.disabled = false;
  }
}

function catalogImportUiToggleRow(idx) {
  if (_vehImportRows[idx]) _vehImportRows[idx].included = !_vehImportRows[idx].included;
  catalogImportUiRenderPreview();
}

function catalogImportUiEditField(idx, field, value) {
  if (!_vehImportRows[idx]) return;
  if (field === 'price') {
    const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    _vehImportRows[idx].price = isNaN(num) ? null : num;
  } else {
    _vehImportRows[idx][field] = value;
  }
}

function catalogImportUiRenderPreview() {
  const el = document.getElementById('vehCatImportPreview');
  const commitBtn = document.getElementById('vehCatImportCommitBtn');
  if (!el) return;
  if (!_vehImportRows.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada baris terbaca. Pilih file PDF katalog dulu.</div></div>';
    if (commitBtn) commitBtn.disabled = true;
    return;
  }
  const includedCount = _vehImportRows.filter((r) => r.included).length;
  const countLabel = '<div style="font-size:11px;color:var(--text2);margin-bottom:8px;font-weight:600">' + includedCount + ' dari ' + _vehImportRows.length + ' dicentang</div>';
  // Dikelompokkan per kategori (saran user: preview list datar bikin
  // kategori "nyasar"/salah gabung baru ketahuan SETELAH commit) — reuse
  // VehicleCatalogImport.groupRowsByCategory() (murni, sudah dites di
  // vehicle-catalog-import.test.js), TIDAK ada logic pengelompokan baru
  // di layer UI ini. `idx` di tiap item = index ASLI di _vehImportRows,
  // dipakai apa adanya oleh toggleRow()/editField() yang sudah ada.
  const groups = (typeof VehicleCatalogImport !== 'undefined' && VehicleCatalogImport && typeof VehicleCatalogImport.groupRowsByCategory === 'function')
    ? VehicleCatalogImport.groupRowsByCategory(_vehImportRows)
    : [{ category: '', items: _vehImportRows.map((row, idx) => ({ row, idx })) }];
  const catCountLabel = groups.length > 1
    ? '<div style="font-size:11px;color:var(--text2);margin-bottom:10px;font-weight:600">📂 ' + groups.length + ' kategori terdeteksi</div>'
    : '';
  const groupsHtml = groups.map((group) => {
    const header = group.category
      ? '<div style="font-size:12px;font-weight:700;color:var(--text2);margin:14px 0 6px;text-transform:uppercase;letter-spacing:.02em">' + escapeHtml(group.category) + ' <span style="font-weight:500;text-transform:none">(' + group.items.length + ')</span></div>'
      : '';
    const rowsHtml = group.items.map(({ row, idx }) => {
      const checkedAttr = row.included ? 'checked' : '';
      const priceVal = (typeof row.price === 'number' && !isNaN(row.price)) ? row.price : '';
      return '<div class="tx-item" style="align-items:flex-start">'
        + '<input type="checkbox" ' + checkedAttr + ' style="width:18px;height:18px;margin-top:8px;flex-shrink:0" onchange="VehicleCatalogImportUI.toggleRow(' + idx + ')">'
        + '<div class="tx-info" style="flex:1">'
        + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.partName || '') + '" placeholder="Nama part" oninput="VehicleCatalogImportUI.editField(' + idx + ',\'partName\',this.value)">'
        + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.category || '') + '" placeholder="Kategori (opsional, otomatis dari PDF)" oninput="VehicleCatalogImportUI.editField(' + idx + ',\'category\',this.value)">'
        + '<div class="u-flex u-gap8">'
        + '<input type="text" class="fi" style="flex:1" value="' + escapeHtml(row.oemCode || '') + '" placeholder="OEM code (opsional)" oninput="VehicleCatalogImportUI.editField(' + idx + ',\'oemCode\',this.value)">'
        + '<input type="number" class="fi" style="flex:1" value="' + priceVal + '" placeholder="Harga (opsional)" inputmode="numeric" oninput="VehicleCatalogImportUI.editField(' + idx + ',\'price\',this.value)">'
        + '</div></div></div>';
    }).join('');
    return header + rowsHtml;
  }).join('');
  el.innerHTML = countLabel + catCountLabel + groupsHtml;
  if (commitBtn) commitBtn.disabled = !includedCount;
}

async function catalogImportUiCommit() {
  const rowsToImport = _vehImportRows.filter((r) => r.included);
  if (!rowsToImport.length) return;
  const ok = await askConfirm('Import ' + rowsToImport.length + ' part yang dicentang ke katalog?');
  if (!ok) return;
  const commitBtn = document.getElementById('vehCatImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  _vehImportSetStatus('⏳ Mengimpor...');
  try {
    const summary = await VehicleCatalogImport.commitRows(rowsToImport);
    const dupNote = summary.duplicates ? ' (' + summary.duplicates + ' duplikat)' : '';
    toast('✅ ' + summary.imported + ' part diimpor' + (summary.skipped ? ', ' + summary.skipped + ' dilewati' + dupNote : ''));
    _vehImportRows = [];
    catalogImportUiRenderPreview();
    closeModal('vehCatalogImportModal');
    if (typeof VehicleCatalogUI !== 'undefined' && VehicleCatalogUI && typeof VehicleCatalogUI.renderList === 'function') {
      await VehicleCatalogUI.renderList();
    }
    // Sesi ini (fitur "Push ke Stok Sparepart"): tawarkan hubungkan part
    // yang BARU DIIMPOR (`summary.createdItems`, field baru di
    // commitRows()) ke Stok Sparepart dgn qty nyata, reuse
    // VehicleCatalogImportStockPush.promptAndRun() (SUDAH ADA modalnya,
    // TIDAK ada modal baru di sini). Dibungkus try/catch supaya modal
    // "push ke stok" opsional ini TIDAK PERNAH menggagalkan toast/refresh
    // import yang sudah sukses di atas kalau ada error tak terduga.
    if (typeof VehicleCatalogImportStockPush !== 'undefined' && VehicleCatalogImportStockPush && typeof VehicleCatalogImportStockPush.promptAndRun === 'function') {
      try {
        await VehicleCatalogImportStockPush.promptAndRun(summary.createdItems);
      } catch (e) {
        console.error('[VehicleCatalogImportUI] gagal push ke Stok Sparepart:', e);
      }
    }
  } finally {
    if (commitBtn) commitBtn.disabled = !_vehImportRows.some((r) => r.included);
  }
}

const VehicleCatalogImportUI = {
  open: catalogImportUiOpen,
  pickFile: catalogImportUiPickFile,
  onFileChange: catalogImportUiOnFileChange,
  toggleRow: catalogImportUiToggleRow,
  editField: catalogImportUiEditField,
  commit: catalogImportUiCommit,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogImportUI = VehicleCatalogImportUI;
}
