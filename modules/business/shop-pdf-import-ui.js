// shop-pdf-import-ui.js — Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON)
// dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md, §B.3.2 Import
// PDF (Sesi N+7, urutan implementasi disarankan di dokumen tsb — setelah
// Sesi N+6 commitShopRows()+Import CSV). Scan (§B.3.1) & Import/Export JSON
// Shop-only (§B.3.4) SENGAJA belum dikerjakan sesi ini (RULE "1 target per
// sesi").
//
// 100% REUSE, 0 engine/parser/commit baru:
//   - Baca PDF (text layer pdf.js + fallback OCR per halaman kalau kosong):
//     VehicleCatalogImport.extractPdfText() (vehicle-catalog-import.js,
//     Tahap 5) — dipakai APA ADANYA lewat adapter tipis (lihat komentar di
//     _readOneFile() di bawah), sama pola vehicle-catalog-import-ui.js.
//   - Parse baris harga: ImportKatalog.parseText(text) (cobek-io.js, sesi
//     ini juga ditambah sbg wrapper tipis di atas `_parse()` yang sudah
//     ada) — supaya regex "Nama Rp30.000"/"Nama 60rb"/kategori-tanpa-harga
//     jadi 1 SUMBER KEBENARAN yang sama dipakai paste manual & PDF.
//   - Commit ke D.products: ShopDataIO.commitShopRows(rows) (shop-data-io-
//     api.js, Sesi N+6) — SATU fungsi commit yang sama dipakai CSV & PDF,
//     tidak ada logic match-by-name/create-update baru.
//
// Beda dengan katalog supplier PDF (harga BELI, bukan harga jual) vs
// importKatalogModal (paste manual, biasa dipakai utk harga reseller/jual):
// modal ini punya toggle "Isi ke Kolom" (Harga Beli/Harga Jual), DEFAULT
// "Harga Beli" karena PDF katalog supplier pada dasarnya daftar harga beli
// dari supplier, bukan harga jual ke konsumen — beda dari importKatalogModal
// yang defaultnya "Harga Reseller". Bisa diganti user per-sesi lewat toggle
// sebelum commit; TIDAK disimpan sbg preferensi tersimpan (in-memory saja,
// sama pola Torsi._selectedVehicleId/ShopKatalogDinamisPresenter).
//
// Preview WAJIB sebelum commit (konsisten RULE "jangan langsung mengubah
// database tanpa preview & konfirmasi pengguna" yang sudah dipakai di
// vehCatalogImportModal/hondaPdfImportModal) — checkbox per baris, default
// TERCENTANG, field nama/kategori/harga bisa diedit manual di preview
// sebelum commit (mis. kalau parser salah pisah harga/nama).

let _shopPdfImportRows = []; // {nama, kategori, harga, sourceFile, included}
let _shopPdfImportTarget = 'beli'; // 'beli' | 'jual' — kolom tujuan commit

function _shopPdfImportSetStatus(msg) {
  const el = document.getElementById('shopPdfImportStatus');
  if (el) el.textContent = msg || '';
}

function shopPdfImportUiOpen() {
  _shopPdfImportRows = [];
  _shopPdfImportTarget = 'beli';
  const preview = document.getElementById('shopPdfImportPreview');
  if (preview) preview.innerHTML = '';
  const commitBtn = document.getElementById('shopPdfImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  _shopPdfImportSetStatus('');
  const fileInput = document.getElementById('shopPdfImportFile');
  if (fileInput) fileInput.value = '';
  document.querySelectorAll('#shopPdfImportTargetToggle .chip-btn').forEach((b) => b.classList.remove('active'));
  const defBtn = document.getElementById('shopPdfImportTargetBeli');
  if (defBtn) defBtn.classList.add('active');
  openModal('shopPdfImportModal');
}

function shopPdfImportUiPickFile() {
  const inp = document.getElementById('shopPdfImportFile');
  if (inp) inp.click();
}

function shopPdfImportUiSetTarget(target, el) {
  _shopPdfImportTarget = target;
  document.querySelectorAll('#shopPdfImportTargetToggle .chip-btn').forEach((b) => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

/** onFileChange(e) — terima 1 ATAU BANYAK file PDF sekaligus (input
 * `multiple`, sama pola vehCatalogImportModal). Tiap file: extractPdfText()
 * -> parseText() -> baris {name, price, kategori} ditandai `sourceFile`,
 * digabung ke satu _shopPdfImportRows (1 preview gabungan, bukan per-file
 * terpisah). Satu file gagal TIDAK menghentikan file lain. */
async function shopPdfImportUiOnFileChange(e) {
  const files = (e && e.target && e.target.files) ? Array.from(e.target.files) : [];
  if (!files.length) return;
  _shopPdfImportSetStatus('🔍 Membaca ' + files.length + ' PDF (OCR otomatis kalau perlu, bisa beberapa menit utk banyak file)...');
  const commitBtn = document.getElementById('shopPdfImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  const pickBtn = document.querySelector('[data-action="ShopPdfImportUI.pickFile"]');
  if (pickBtn) pickBtn.disabled = true;
  let allRows = [];
  const fileErrors = [];
  try {
    for (const file of files) {
      try {
        if (typeof VehicleCatalogImport === 'undefined' || !VehicleCatalogImport || typeof VehicleCatalogImport.extractPdfText !== 'function') {
          throw new Error('Modul pembaca PDF belum siap, coba muat ulang halaman.');
        }
        const text = await VehicleCatalogImport.extractPdfText(file);
        const rows = (typeof ImportKatalog !== 'undefined' && ImportKatalog && typeof ImportKatalog.parseText === 'function')
          ? ImportKatalog.parseText(text)
          : [];
        allRows = allRows.concat(rows.map((r) => ({
          nama: r.name,
          kategori: r.kategori || '',
          harga: r.price,
          sourceFile: file.name,
        })));
      } catch (err) {
        console.error('[ShopPdfImportUI] gagal baca PDF:', file.name, err);
        fileErrors.push(file.name + ': ' + ((err && err.message) || 'gagal membaca PDF, coba lagi'));
      }
    }
    _shopPdfImportRows = allRows.map((r) => Object.assign({}, r, { included: true }));
    const fileLabel = files.length > 1 ? (files.length + ' file') : 'PDF ini';
    if (!_shopPdfImportRows.length) {
      _shopPdfImportSetStatus('⚠️ Tidak ada baris harga yang kebaca dari ' + fileLabel + (fileErrors.length ? ' — ' + fileErrors.join('; ') : ' — coba file lain atau pastikan halaman cukup jelas.'));
    } else {
      _shopPdfImportSetStatus('✅ ' + _shopPdfImportRows.length + ' produk kebaca dari ' + fileLabel + (fileErrors.length ? ', ' + fileErrors.length + ' file gagal dibaca (' + fileErrors.join('; ') + ')' : '') + ' — cek & sesuaikan dulu di bawah sebelum import.');
    }
    shopPdfImportUiRenderPreview();
  } finally {
    if (pickBtn) pickBtn.disabled = false;
  }
}

function shopPdfImportUiToggleRow(idx) {
  if (_shopPdfImportRows[idx]) _shopPdfImportRows[idx].included = !_shopPdfImportRows[idx].included;
  shopPdfImportUiRenderPreview();
}

function shopPdfImportUiEditField(idx, field, value) {
  if (!_shopPdfImportRows[idx]) return;
  if (field === 'harga') {
    const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    _shopPdfImportRows[idx].harga = isNaN(num) ? 0 : num;
  } else {
    _shopPdfImportRows[idx][field] = value;
  }
}

function shopPdfImportUiRenderPreview() {
  const el = document.getElementById('shopPdfImportPreview');
  const commitBtn = document.getElementById('shopPdfImportCommitBtn');
  if (!el) return;
  if (!_shopPdfImportRows.length) {
    el.innerHTML = '<div class="u-fs12 u-t2">Belum ada baris terbaca. Pilih file PDF katalog supplier dulu.</div>';
    if (commitBtn) commitBtn.disabled = true;
    return;
  }
  const includedCount = _shopPdfImportRows.filter((r) => r.included).length;
  const countLabel = '<div class="u-fs12 u-t2 u-mb8">' + includedCount + ' dari ' + _shopPdfImportRows.length + ' dicentang</div>';
  const rowsHtml = _shopPdfImportRows.map((row, idx) => {
    const checkedAttr = row.included ? 'checked' : '';
    const exists = (typeof D !== 'undefined' && D && Array.isArray(D.products))
      ? D.products.find((p) => p.name.toLowerCase() === String(row.nama || '').toLowerCase())
      : null;
    const statusLabel = exists ? '🔄 update' : '🆕 baru';
    return '<div class="tx-item" style="align-items:flex-start">'
      + '<input type="checkbox" ' + checkedAttr + ' style="width:18px;height:18px;margin-top:8px;flex-shrink:0" onchange="ShopPdfImportUI.toggleRow(' + idx + ')">'
      + '<div class="tx-info" style="flex:1">'
      + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.nama || '') + '" placeholder="Nama produk" oninput="ShopPdfImportUI.editField(' + idx + ',\'nama\',this.value)">'
      + '<div class="u-flex u-gap8">'
      + '<input type="text" class="fi" style="flex:1" value="' + escapeHtml(row.kategori || '') + '" placeholder="Kategori (opsional)" oninput="ShopPdfImportUI.editField(' + idx + ',\'kategori\',this.value)">'
      + '<input type="number" class="fi" style="flex:1" value="' + (row.harga || '') + '" placeholder="Harga" inputmode="numeric" oninput="ShopPdfImportUI.editField(' + idx + ',\'harga\',this.value)">'
      + '</div>'
      + '<div class="u-fs11 u-t2" style="margin-top:4px">' + statusLabel + '</div>'
      + '</div></div>';
  }).join('');
  el.innerHTML = countLabel + rowsHtml;
  if (commitBtn) commitBtn.disabled = !includedCount;
}

/** commit() — map baris tercentang jadi shape `rows` yang ShopDataIO.
 * commitShopRows() harapkan ({nama, kategori, hargaBeli/hargaJual, ...}),
 * lalu pipa ke fungsi commit yang SAMA dipakai Import CSV (Sesi N+6) — 0
 * logic commit baru. Kolom tujuan (Beli/Jual) ikut toggle
 * _shopPdfImportTarget, default 'beli' (lihat komentar header file). */
function shopPdfImportUiCommit() {
  const rowsToImport = _shopPdfImportRows.filter((r) => r.included && r.nama);
  if (!rowsToImport.length) { toast('⚠️ Belum ada baris yang dicentang'); return; }
  const mapped = rowsToImport.map((r) => {
    const row = { nama: r.nama, kategori: r.kategori || '' };
    if (_shopPdfImportTarget === 'jual') row.hargaJual = r.harga || 0;
    else row.hargaBeli = r.harga || 0;
    return row;
  });
  const res = ShopDataIO.commitShopRows(mapped);
  closeModal('shopPdfImportModal');
  renderProductList();
  toast('✅ Import PDF selesai: ' + res.created + ' produk baru, ' + res.updated + ' diperbarui');
  _shopPdfImportRows = [];
}

const ShopPdfImportUI = {
  open: shopPdfImportUiOpen,
  pickFile: shopPdfImportUiPickFile,
  setTarget: shopPdfImportUiSetTarget,
  onFileChange: shopPdfImportUiOnFileChange,
  toggleRow: shopPdfImportUiToggleRow,
  editField: shopPdfImportUiEditField,
  commit: shopPdfImportUiCommit,
};

if (typeof window !== 'undefined') {
  window.ShopPdfImportUI = ShopPdfImportUI;
}
