// honda-pdf-import-ui.js — UI Tahap 7D-5 "Import PDF Honda" (Preview Import).
// Lapisan DOM/presenter SAJA di atas HondaPdfImport (Tahap 7D-1, pilih+simpan
// sementara), HondaPdfImportExtract (Tahap 7D-2, extract teks), HondaPdfImportParse
// (Tahap 7D-3, parse jadi baris) & HondaPdfImportCommit (Tahap 7D-4, commit ke
// Vehicle Catalog) — TIDAK ada logic parsing/commit baru di sini, pola SAMA
// PERSIS vehicle-catalog-import-ui.js vs vehicle-catalog-import.js.
//
// Entry point: tombol "🏍️ Import PDF Honda" ditambah di dalam `catalogModal`
// (index.html/app_production.html). Modal baru `hondaPdfImportModal` — WAJIB
// preview + konfirmasi sebelum commitRows() dipanggil (pola sama Tahap 5):
// pilih 1/banyak PDF -> daftar file tersimpan sementara -> tap "Proses" (1
// file, extract+parse berantai) -> tap "Preview" -> checklist per baris
// (default TERCENTANG) -> commit HANYA lewat tombol "Import yang Dicentang".

let _hondaImportCurrentId = null; // id record yang sedang dibuka preview-nya
let _hondaImportRows = []; // state hasil parse record yang sedang dibuka: {partName, oemCode, barcode, price, category, raw, included}

function _hondaImportSetStatus(msg) {
  const el = document.getElementById('hondaPdfImportStatus');
  if (el) el.textContent = msg || '';
}

function _hondaImportHidePreview() {
  const wrap = document.getElementById('hondaPdfImportPreviewWrap');
  if (wrap) wrap.style.display = 'none';
  const preview = document.getElementById('hondaPdfImportPreview');
  if (preview) preview.innerHTML = '';
  const commitBtn = document.getElementById('hondaPdfImportCommitBtn');
  if (commitBtn) commitBtn.disabled = true;
}

async function hondaPdfImportUiOpen() {
  _hondaImportCurrentId = null;
  _hondaImportRows = [];
  _hondaImportSetStatus('');
  _hondaImportHidePreview();
  await hondaPdfImportUiRenderList();
  if(typeof _hondaAutoEnsureButton==='function') _hondaAutoEnsureButton();
  openModal('hondaPdfImportModal');
}

async function hondaPdfImportUiPickFiles() {
  await HondaPdfImport.pickAndStage();
  await hondaPdfImportUiRenderList();
}

function _hondaImportStatusLabel(status) {
  const map = {
    pending: '⏳ Belum diproses',
    extracted: '📄 Teks terbaca, belum diparse',
    parsed: '🔎 Siap di-preview',
    committed: '✅ Sudah diimpor',
    failed: '❌ Gagal, coba Proses lagi',
  };
  return map[status] || (status || '-');
}

async function hondaPdfImportUiRenderList() {
  const el = document.getElementById('hondaPdfImportList');
  if (!el) return;
  const list = await HondaPdfImport.list();
  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📄</div><div class="empty-text">Belum ada PDF Honda dipilih</div></div>';
    return;
  }
  el.innerHTML = list.map((rec) => {
    const canPreview = rec.status === 'parsed' || rec.status === 'committed';
    const canProcess = rec.status === 'pending' || rec.status === 'extracted' || rec.status === 'failed';
    return '<div class="tx-item" style="align-items:flex-start">'
      + '<div class="tx-info" style="flex:1;min-width:0">'
      + '<div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(rec.fileName || '') + '</div>'
      + '<div style="font-size:11px;color:var(--text2)">' + _hondaImportStatusLabel(rec.status) + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0">'
      + (canProcess ? '<button type="button" class="btn btn-ghost btn-sm" data-action="HondaPdfImportUI.process" data-args=\'["' + rec.id + '"]\'>⚙️ Proses</button>' : '')
      + (canPreview ? '<button type="button" class="btn btn-ghost btn-sm" data-action="HondaPdfImportUI.openPreview" data-args=\'["' + rec.id + '"]\'>👁️ Preview</button>' : '')
      + '<button type="button" class="btn btn-ghost btn-sm" data-action="HondaPdfImportUI.remove" data-args=\'["' + rec.id + '"]\' aria-label="Hapus">🗑️</button>'
      + '</div></div>';
  }).join('');
}

/** process(id) — orkestrasi 1 file: extract teks (7D-2) lalu, kalau sukses,
 * parse jadi baris (7D-3). 0 logic baru, murni memanggil dua fungsi yang
 * sudah ada berurutan, sama pola SparepartOcrOrchestrator.run(). */
async function hondaPdfImportUiProcess(id) {
  _hondaImportSetStatus('📄 Membaca teks PDF (OCR otomatis kalau perlu, bisa beberapa detik)...');
  const extractRes = await HondaPdfImportExtract.extractText(id);
  if (!extractRes.success) {
    _hondaImportSetStatus('❌ Gagal membaca PDF: ' + (extractRes.errors[0] || 'error tidak diketahui'));
    await hondaPdfImportUiRenderList();
    return extractRes;
  }
  _hondaImportSetStatus('🔎 Membaca kandidat part dari teks PDF...');
  const parseRes = await HondaPdfImportParse.parseText(id);
  if (!parseRes.success) {
    _hondaImportSetStatus('❌ Gagal parse PDF: ' + (parseRes.errors[0] || 'error tidak diketahui'));
  } else if (!parseRes.rows.length) {
    _hondaImportSetStatus('⚠️ Tidak ada kandidat part terdeteksi dari file ini.');
  } else {
    _hondaImportSetStatus('✅ ' + parseRes.rows.length + ' kandidat part ditemukan — tap "Preview" utk cek & import.');
  }
  await hondaPdfImportUiRenderList();
  return parseRes;
}

async function hondaPdfImportUiOpenPreview(id) {
  const record = await HondaPdfImport.get(id);
  if (!record) return;
  _hondaImportCurrentId = id;
  const rows = Array.isArray(record.parsedRows) ? record.parsedRows : [];
  // Hanya tampilkan baris yang sudah punya kode part — harga TIDAK wajib
  // (banyak PDF katalog dealer Honda nyata cuma nampilkan harga sbg angka
  // polos tanpa "Rp", jadi tidak selalu kedeteksi parser; harga masih
  // bisa diisi/dikoreksi manual di preview). Reuse
  // VehicleCatalogImport.filterCompleteRows() (vehicle-catalog-import.js),
  // pola sama vehicle-catalog-import-ui.js, TIDAK ada logic filter baru di sini.
  const completeRows = (typeof VehicleCatalogImport !== 'undefined' && VehicleCatalogImport && typeof VehicleCatalogImport.filterCompleteRows === 'function')
    ? VehicleCatalogImport.filterCompleteRows(rows, { requirePrice: false })
    : rows.filter((r) => r && (r.oemCode || r.barcode));
  const skippedIncomplete = rows.length - completeRows.length;
  _hondaImportRows = completeRows.map((r) => Object.assign({}, r, { included: true }));
  const wrap = document.getElementById('hondaPdfImportPreviewWrap');
  if (wrap) wrap.style.display = '';
  _hondaImportSetStatus(_hondaImportRows.length
    ? ('✅ ' + _hondaImportRows.length + ' part dgn kode part' + (skippedIncomplete ? ', ' + skippedIncomplete + ' dilewati (tidak ada kode part)' : '') + ' — isi harga manual kalau belum ada.')
    : '⚠️ Tidak ada part dgn kode part dari file ini.');
  hondaPdfImportUiRenderPreview();
}

function hondaPdfImportUiToggleRow(idx) {
  if (_hondaImportRows[idx]) _hondaImportRows[idx].included = !_hondaImportRows[idx].included;
  hondaPdfImportUiRenderPreview();
}

function hondaPdfImportUiEditField(idx, field, value) {
  if (!_hondaImportRows[idx]) return;
  if (field === 'price') {
    const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    _hondaImportRows[idx].price = isNaN(num) ? null : num;
  } else {
    _hondaImportRows[idx][field] = value;
  }
}

function hondaPdfImportUiRenderPreview() {
  const el = document.getElementById('hondaPdfImportPreview');
  const commitBtn = document.getElementById('hondaPdfImportCommitBtn');
  if (!el) return;
  if (!_hondaImportRows.length) {
    el.innerHTML = '<div class="empty"><div class="empty-text">Tidak ada kandidat part utk file ini</div></div>';
    if (commitBtn) commitBtn.disabled = true;
    return;
  }
  // Dikelompokkan per kategori (saran user: preview list datar bikin
  // kategori "nyasar"/salah gabung baru ketahuan SETELAH commit) — reuse
  // VehicleCatalogImport.groupRowsByCategory() (murni, sudah dites di
  // vehicle-catalog-import.test.js), TIDAK ada logic pengelompokan baru
  // di layer UI ini. `idx` di tiap item = index ASLI di _hondaImportRows,
  // dipakai apa adanya oleh toggleRow()/editField() yang sudah ada.
  const groups = (typeof VehicleCatalogImport !== 'undefined' && VehicleCatalogImport && typeof VehicleCatalogImport.groupRowsByCategory === 'function')
    ? VehicleCatalogImport.groupRowsByCategory(_hondaImportRows)
    : [{ category: '', items: _hondaImportRows.map((row, idx) => ({ row, idx })) }];
  const catCountLabel = groups.length > 1
    ? '<div style="font-size:11px;color:var(--text2);margin-bottom:10px;font-weight:600">📂 ' + groups.length + ' kategori terdeteksi</div>'
    : '';
  el.innerHTML = catCountLabel + groups.map((group) => {
    const header = group.category
      ? '<div style="font-size:12px;font-weight:700;color:var(--text2);margin:14px 0 6px;text-transform:uppercase;letter-spacing:.02em">' + escapeHtml(group.category) + ' <span style="font-weight:500;text-transform:none">(' + group.items.length + ')</span></div>'
      : '';
    const rowsHtml = group.items.map(({ row, idx }) => {
      const checkedAttr = row.included ? 'checked' : '';
      const priceVal = (typeof row.price === 'number' && !isNaN(row.price)) ? row.price : '';
      return '<div class="tx-item" style="align-items:flex-start">'
        + '<input type="checkbox" ' + checkedAttr + ' style="width:18px;height:18px;margin-top:8px;flex-shrink:0" data-onchange="HondaPdfImportUI.toggleRow" data-onchange-args=\'[' + idx + ']\'>'
        + '<div class="tx-info" style="flex:1">'
        + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.partName || '') + '" placeholder="Nama part" data-oninput="HondaPdfImportUI.editField" data-oninput-args=\'[' + idx + ',"partName","$value"]\'>'
        + '<input type="text" class="fi" style="margin-bottom:6px" value="' + escapeHtml(row.category || '') + '" placeholder="Kategori (opsional, otomatis dari PDF)" data-oninput="HondaPdfImportUI.editField" data-oninput-args=\'[' + idx + ',"category","$value"]\'>'
        + '<div class="u-flex u-gap8">'
        + '<input type="text" class="fi" style="flex:1" value="' + escapeHtml(row.oemCode || '') + '" placeholder="OEM code (opsional)" data-oninput="HondaPdfImportUI.editField" data-oninput-args=\'[' + idx + ',"oemCode","$value"]\'>'
        + '<input type="number" class="fi" style="flex:1" value="' + priceVal + '" placeholder="Harga (opsional)" inputmode="numeric" data-oninput="HondaPdfImportUI.editField" data-oninput-args=\'[' + idx + ',"price","$value"]\'>'
        + '</div></div></div>';
    }).join('');
    return header + rowsHtml;
  }).join('');
  if (commitBtn) commitBtn.disabled = !_hondaImportRows.some((r) => r.included);
}

async function hondaPdfImportUiCommit() {
  if (!_hondaImportCurrentId) return;
  const rowsToImport = _hondaImportRows.filter((r) => r.included);
  if (!rowsToImport.length) return;
  const ok = await askConfirm('Import ' + rowsToImport.length + ' part yang dicentang ke Vehicle Catalog?');
  if (!ok) return;
  _hondaImportSetStatus('📥 Menyimpan kandidat part ke Vehicle Catalog...');
  const res = await HondaPdfImportCommit.commitRows(_hondaImportCurrentId, rowsToImport);
  if (res.success) {
    toast('✅ ' + res.imported + ' part diimpor' + (res.skipped ? ', ' + res.skipped + ' dilewati' : ''));
  } else {
    toast('❌ Gagal impor: ' + (res.errors[0] || 'error tidak diketahui'));
  }
  _hondaImportRows = [];
  _hondaImportCurrentId = null;
  _hondaImportHidePreview();
  await hondaPdfImportUiRenderList();
  if (typeof VehicleCatalogUI !== 'undefined' && VehicleCatalogUI && typeof VehicleCatalogUI.renderList === 'function') {
    await VehicleCatalogUI.renderList();
  }
}

async function hondaPdfImportUiRemove(id) {
  const ok = await askConfirm('Hapus file PDF ini dari daftar sementara?');
  if (!ok) return;
  await HondaPdfImport.remove(id);
  if (_hondaImportCurrentId === id) {
    _hondaImportCurrentId = null;
    _hondaImportRows = [];
    _hondaImportHidePreview();
  }
  await hondaPdfImportUiRenderList();
}

const HondaPdfImportUI = {
  open: hondaPdfImportUiOpen,
  pickFiles: hondaPdfImportUiPickFiles,
  process: hondaPdfImportUiProcess,
  openPreview: hondaPdfImportUiOpenPreview,
  toggleRow: hondaPdfImportUiToggleRow,
  editField: hondaPdfImportUiEditField,
  renderPreview: hondaPdfImportUiRenderPreview,
  commit: hondaPdfImportUiCommit,
  remove: hondaPdfImportUiRemove,
};

if (typeof window !== 'undefined') {
  window.HondaPdfImportUI = HondaPdfImportUI;
}

// ------------------------------------------------------------------------
// S1867 — Auto Catalog Flow: PDF -> vehicle choice -> dry-run -> commit.
// This is intentionally additive to the existing 7D preview UI. No direct
// DB write happens until the dry-run is shown and the user confirms.
// ------------------------------------------------------------------------
function _hondaAutoEnsureButton(){
  const list=document.getElementById('hondaPdfImportList'); if(!list||document.getElementById('hondaPdfAutoBtn'))return;
  const b=document.createElement('button'); b.id='hondaPdfAutoBtn'; b.type='button'; b.className='btn btn-primary btn-full u-p14'; b.style.marginBottom='10px'; b.textContent='🤖 Auto Katalog Kendaraan — PDF → Kendaraan → Dry Run'; b.onclick=()=>hondaPdfAutoUiStart(); list.parentNode.insertBefore(b,list);
}
function _hondaAutoRenderHook(){_hondaAutoEnsureButton();}
const _hondaOldRenderList=hondaPdfImportUiRenderList;
hondaPdfImportUiRenderList=async function(){const r=await _hondaOldRenderList();_hondaAutoRenderHook();return r;};
function _hondaAutoModalClose(){const el=document.getElementById('hondaPdfAutoModal');if(el)el.remove();}
function _hondaAutoEscape(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function hondaPdfAutoUiStart(){
  const list=await HondaPdfImport.list(); const candidates=list.filter(x=>x&&(x.status==='parsed'||x.status==='extracted'));
  if(!candidates.length){toast('⚠️ Proses PDF dulu sampai status siap di-analisis.');return;}
  const rec=candidates[candidates.length-1];
  let plan; try{plan=await HondaPdfCatalogAutoImport.analyze({text:rec.extractedText||'',fileName:rec.fileName,pageCount:null});}catch(e){toast('❌ Analisis gagal: '+(e.message||e));return;}
  const vehicles=(typeof D!=='undefined'&&Array.isArray(D.vehicles))?D.vehicles:[]; const active=(typeof curVehicleId!=='undefined')?curVehicleId:null;
  const opts=['<option value="active">🚗 Kendaraan aktif'+(active?' — '+_hondaAutoEscape((vehicles.find(v=>String(v.id)===String(active))||{}).name||active):' — belum dipilih')+'</option>'].concat(vehicles.map(v=>'<option value="existing:'+_hondaAutoEscape(v.id)+'">'+_hondaAutoEscape(v.name||v.id)+'</option>')).concat(['<option value="new">➕ Buat kendaraan baru (isi metadata di form kendaraan)</option>']);
  const dry=HondaPdfCatalogAutoImport.buildDryRun(plan);
  _hondaAutoModalClose(); const modal=document.createElement('div'); modal.id='hondaPdfAutoModal'; modal.className='overlay'; modal.innerHTML='<div class="modal" style="max-height:90vh;overflow:auto"><div class="modal-handle"></div><div class="modal-title"><span>🤖 Auto Import Katalog Honda</span><button class="modal-close" type="button" id="hondaAutoClose">✕</button></div><div class="u-hint12">PDF dianalisis dulu. Belum ada database yang ditulis.</div><div style="background:var(--surface3);padding:12px;border-radius:12px;margin:10px 0;line-height:1.6;font-size:12px"><b>Katalog:</b> '+_hondaAutoEscape(dry.catalog.model||'-')+'<br><b>Kode:</b> '+_hondaAutoEscape(dry.catalog.catalogCode||'-')+'<br><b>File:</b> '+_hondaAutoEscape(dry.catalog.sourceFileName||'-')+'<br><b>Halaman:</b> '+_hondaAutoEscape(dry.pages||'-')+'<br><b>Section:</b> '+dry.sectionsDetected+'<br><b>Part terdeteksi:</b> '+dry.partsDetected+'<br><b>Mapping HIGH:</b> '+(dry.mapping.high||0)+' · MEDIUM: '+(dry.mapping.medium||0)+' · AMBIGUOUS: '+(dry.mapping.ambiguous||0)+' · UNMAPPED: '+(dry.mapping.unmapped||0)+'</div><div class="fg"><label class="fl">Target kendaraan</label><select class="fs" id="hondaAutoTarget">'+opts.join('')+'</select></div><div id="hondaAutoWarnings" style="font-size:11px;color:var(--warning,#b26a00);line-height:1.6;margin:8px 0">'+(dry.newComponentCandidates.length?('⚠️ '+dry.newComponentCandidates.length+' part belum punya mapping pasti. Tidak dibuat menjadi komponen maintenance otomatis.'): '✅ Tidak ada kandidat unmapped/ambiguous pada hasil analisis ini.')+'</div><button class="btn btn-primary btn-full u-p14" id="hondaAutoCommit">🔎 Tampilkan Dry Run & Konfirmasi Import</button></div>';
  document.body.appendChild(modal); modal.style.display='flex'; document.getElementById('hondaAutoClose').onclick=_hondaAutoModalClose;
  document.getElementById('hondaAutoCommit').onclick=async()=>{const sel=document.getElementById('hondaAutoTarget').value;_hondaAutoShowFinalDryRun(plan,rec,sel);};
}
function _hondaAutoShowFinalDryRun(plan,rec,sel){
  const vehicleId=sel==='active'?((typeof curVehicleId!=='undefined')?curVehicleId:null):(sel.startsWith('existing:')?sel.slice(9):null);
  const target=sel==='new'?{mode:'new'}:{mode:sel==='active'?'active':'existing',vehicleId};
  const dry=HondaPdfCatalogAutoImport.buildDryRun(plan); const modal=document.getElementById('hondaPdfAutoModal'); if(!modal)return;
  const body=modal.querySelector('.modal'); const old=body.querySelector('#hondaAutoCommit'); if(old)old.remove(); const actions=document.createElement('div'); actions.innerHTML='<div style="background:var(--surface3);padding:12px;border-radius:12px;margin:10px 0;font-size:12px;line-height:1.6"><b>PROPOSED DATABASE CHANGES</b><br>• Simpan 1 catalog dinamis ke IndexedDB<br>• Simpan '+dry.partsDetected+' part dengan scope katalog/kendaraan<br>• '+(vehicleId?'Hubungkan part ke kendaraan '+_hondaAutoEscape(vehicleId):'Kendaraan baru belum dibuat; form kendaraan akan dibuka')+'<br>• Service Master: <b>0 perubahan otomatis</b><br>• Semua mapping AMBIGUOUS/UNMAPPED tetap ditandai untuk review</div><div class="u-flex u-gap8"><button class="btn btn-ghost u-flex1" id="hondaAutoCancel">Batal</button><button class="btn btn-primary u-flex1" id="hondaAutoConfirm">✅ Konfirmasi</button></div>'; body.appendChild(actions); document.getElementById('hondaAutoCancel').onclick=_hondaAutoModalClose; document.getElementById('hondaAutoConfirm').onclick=async()=>{if(sel==='new'){_hondaAutoModalClose();HondaPdfCatalogAutoImport.prepareNewVehicle(plan.meta);toast('✅ Form kendaraan baru dibuka. Simpan kendaraan, lalu jalankan Auto Katalog lagi untuk mengikat katalog.');return;}const res=await HondaPdfCatalogAutoImport.commit(plan,target);if(res.success){_hondaAutoModalClose();toast('✅ Katalog '+(plan.meta.catalogCode||'PDF')+' tersimpan: '+res.parts+' part');await hondaPdfImportUiRenderList();}else toast('❌ Import dibatalkan: '+(res.errors||[]).join('; '));};
}
