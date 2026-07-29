// shop-scan-ui.js — Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari
// DESIGN_torsi-vehicle-selector_shop-import-export-2.md, §B.3.1 Scan (Sesi
// N+8, urutan implementasi disarankan di dokumen tsb — setelah Sesi N+7
// Import PDF Shop). Import/Export JSON Shop-only (§B.3.4) SENGAJA belum
// dikerjakan sesi ini (RULE "1 target per sesi").
//
// 100% REUSE, 0 engine/parser/commit baru:
//   - Ambil teks dari foto struk/nota: ocrRecognize(file) (scan-ocr.js,
//     pipeline OCR Tesseract yang SAMA dipakai scanReceipt()/BillMultiScan/
//     UniversalScan) — dipakai APA ADANYA, TIDAK ada worker/preprocessing
//     baru.
//   - Parse baris harga: ImportKatalog.parseText(text) (cobek-io.js) — 1
//     SUMBER KEBENARAN yang sama dipakai paste manual, Import PDF Shop
//     (Sesi N+7), & Scan (sesi ini) — regex "Nama Rp30.000"/"Nama 60rb"/
//     baris tanpa harga = kategori.
//   - Commit ke D.products: ShopDataIO.commitShopRows(rows)
//     (shop-data-io-api.js, Sesi N+6) — SATU fungsi commit yang sama
//     dipakai CSV/PDF/Scan, tidak ada logic match-by-name/create-update
//     baru (§B.4).
//
// CATATAN vs draf desain awal §B.3.1: draf menyebut "kirim ke AI vision"
// & reuse `SparepartScannerUI` — audit kode menunjukkan `SparepartScannerUI`
// sebenarnya scanner BARCODE (ZXing) utk kode part Vehicle Catalog, BUKAN
// pipeline yang cocok utk struk/nota multi-baris. Pipeline yang SUDAH ADA &
// benar-benar cocok (baca teks dari foto struk, dipakai `scanReceipt()`/
// `BillMultiScan`/`universalOcrModal`) adalah `ocrRecognize()` (Tesseract,
// scan-ocr.js) — itu yang dipakai file ini. TIDAK ada prompt/endpoint AI
// vision terpisah di codebase ini utk direuse; menambah satu akan melanggar
// prinsip "100% reuse, 0 engine baru" dokumen desain.
//
// Alur (sama utk kamera & galeri, beda cuma attribute input file):
// pilih 1 foto -> ocrRecognize() -> ImportKatalog.parseText() -> baris
// {nama, kategori, harga} ditandai `included` (default TERCENTANG, bisa
// diedit manual di preview sebelum commit, pola SAMA PERSIS
// shop-pdf-import-ui.js) -> commit lewat ShopDataIO.commitShopRows().

let _shopScanRows = []; // {nama, kategori, harga, included}
let _shopScanTarget = 'beli'; // 'beli' | 'jual' — kolom tujuan commit, sama pola shop-pdf-import-ui.js

function _shopScanSetStatus(msg) {
  const el = document.getElementById('shopScanStatus');
  if (el) el.textContent = msg || '';
}

function shopScanUiResetState() {
  _shopScanRows = [];
  _shopScanTarget = 'beli';
  const preview = document.getElementById('shopScanPreview');
  if (preview) preview.innerHTML = '';
  const commitBtn = document.getElementById('shopScanCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
  _shopScanSetStatus('');
  document.querySelectorAll('#shopScanTargetToggle .chip-btn').forEach((b) => b.classList.remove('active'));
  const defBtn = document.getElementById('shopScanTargetBeli');
  if (defBtn) defBtn.classList.add('active');
}

function shopScanUiSetTarget(target, el) {
  _shopScanTarget = target;
  document.querySelectorAll('#shopScanTargetToggle .chip-btn').forEach((b) => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

/** _runScan(file) — inti proses (dipakai kamera & galeri): OCR foto ->
 * parseText() -> render preview. Satu file per scan (beda dari Import PDF
 * yang terima banyak file sekaligus — struk/nota difoto satu-satu, pola
 * sama scanReceipt()/BillMultiScan.scan()). */
async function _shopScanRun(file) {
  if (!file) return;
  shopScanUiResetState();
  openModal('shopScanModal');
  _shopScanSetStatus('🔍 Memindai foto struk/nota, mohon tunggu...');
  toast('🔍 Memindai foto struk/nota, mohon tunggu...', 6000);
  try {
    const result = await ocrRecognize(file);
    const text = (result && result.data) ? result.data.text : '';
    const parsed = (typeof ImportKatalog !== 'undefined' && ImportKatalog && typeof ImportKatalog.parseText === 'function')
      ? ImportKatalog.parseText(text)
      : [];
    _shopScanRows = parsed.map((r) => ({
      nama: r.name,
      kategori: r.kategori || '',
      harga: r.price,
      included: true,
    }));
    if (!_shopScanRows.length) {
      _shopScanSetStatus('⚠️ Tidak ada baris harga yang kebaca dari foto ini — coba foto lebih jelas/terang, atau pastikan formatnya "Nama Rp30.000" / "Nama 60rb".');
    } else {
      _shopScanSetStatus('✅ ' + _shopScanRows.length + ' produk kebaca — cek & sesuaikan dulu di bawah sebelum import.');
    }
  } catch (err) {
    _shopScanSetStatus('❌ Gagal scan: ' + scanErrorMessage(err));
  }
  shopScanUiRenderPreview();
}

function shopScanUiScanCamera() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.capture = 'environment';
  inp.onchange = (e) => { _shopScanRun(e.target.files && e.target.files[0]); };
  inp.click();
}

function shopScanUiScanGallery() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => { _shopScanRun(e.target.files && e.target.files[0]); };
  inp.click();
}

function shopScanUiToggleRow(idx) {
  if (_shopScanRows[idx]) _shopScanRows[idx].included = !_shopScanRows[idx].included;
  shopScanUiRenderPreview();
}

function shopScanUiEditField(idx, field, value) {
  if (!_shopScanRows[idx]) return;
  if (field === 'harga') {
    const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    _shopScanRows[idx].harga = isNaN(num) ? 0 : num;
  } else {
    _shopScanRows[idx][field] = value;
  }
}

function shopScanUiRenderPreview() {
  const el = document.getElementById('shopScanPreview');
  const commitBtn = document.getElementById('shopScanCommitBtn');
  if (!el) return;
  if (!_shopScanRows.length) {
    el.innerHTML = '<div class="u-fs12 u-t2">Belum ada baris terbaca. Scan foto struk/nota supplier dulu.</div>';
    if (commitBtn) commitBtn.disabled = true;
    return;
  }
  const includedCount = _shopScanRows.filter((r) => r.included).length;
  const countLabel = '<div class="u-fs12 u-t2 u-mb8">' + includedCount + ' dari ' + _shopScanRows.length + ' dicentang</div>';
  const rowsHtml = _shopScanRows.map((row, idx) => {
    const checkedAttr = row.included ? 'checked' : '';
    const exists = (typeof D !== 'undefined' && D && Array.isArray(D.products))
      ? D.products.find((p) => p.name.toLowerCase() === String(row.nama || '').toLowerCase())
      : null;
    const statusLabel = exists ? '🔄 update' : '🆕 baru';
    return '<div class="tx-item" style="align-items:flex-start">'
      + '<input type="checkbox" ' + checkedAttr + ' style="width:18px;height:18px;margin-top:8px;flex-shrink:0" onchange="ShopScanUI.toggleRow(' + idx + ')">'
      + '<div class="tx-info" style="flex:1">'
      + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.nama || '') + '" placeholder="Nama produk" oninput="ShopScanUI.editField(' + idx + ',\'nama\',this.value)">'
      + '<div class="u-flex u-gap8">'
      + '<input type="text" class="fi" style="flex:1" value="' + escapeHtml(row.kategori || '') + '" placeholder="Kategori (opsional)" oninput="ShopScanUI.editField(' + idx + ',\'kategori\',this.value)">'
      + '<input type="number" class="fi" style="flex:1" value="' + (row.harga || '') + '" placeholder="Harga" inputmode="numeric" oninput="ShopScanUI.editField(' + idx + ',\'harga\',this.value)">'
      + '</div>'
      + '<div class="u-fs11 u-t2" style="margin-top:4px">' + statusLabel + '</div>'
      + '</div></div>';
  }).join('');
  el.innerHTML = countLabel + rowsHtml;
  if (commitBtn) commitBtn.disabled = !includedCount;
}

/** commit() — map baris tercentang jadi shape `rows` yang ShopDataIO.
 * commitShopRows() harapkan, lalu pipa ke fungsi commit yang SAMA dipakai
 * Import CSV/PDF — 0 logic commit baru. Kolom tujuan (Beli/Jual) default
 * 'beli' (struk/nota supplier = harga beli, pola sama shop-pdf-import-ui.js). */
function shopScanUiCommit() {
  const rowsToImport = _shopScanRows.filter((r) => r.included && r.nama);
  if (!rowsToImport.length) { toast('⚠️ Belum ada baris yang dicentang'); return; }
  const mapped = rowsToImport.map((r) => {
    const row = { nama: r.nama, kategori: r.kategori || '' };
    if (_shopScanTarget === 'jual') row.hargaJual = r.harga || 0;
    else row.hargaBeli = r.harga || 0;
    return row;
  });
  const res = ShopDataIO.commitShopRows(mapped);
  closeModal('shopScanModal');
  renderProductList();
  toast('✅ Scan selesai: ' + res.created + ' produk baru, ' + res.updated + ' diperbarui');
  _shopScanRows = [];
}

const ShopScanUI = {
  scanCamera: shopScanUiScanCamera,
  scanGallery: shopScanUiScanGallery,
  setTarget: shopScanUiSetTarget,
  toggleRow: shopScanUiToggleRow,
  editField: shopScanUiEditField,
  commit: shopScanUiCommit,
};

if (typeof window !== 'undefined') {
  window.ShopScanUI = ShopScanUI;
}
