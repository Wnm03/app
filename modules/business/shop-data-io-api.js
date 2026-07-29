// shop-data-io-api.js — Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari
// DESIGN_torsi-vehicle-selector_shop-import-export-2.md. Bagian B (Scan,
// Import PDF, Import CSV, Import/Export JSON) SUDAH SELESAI 4/4.
//
// Sesi ini (lanjutan opsional, BUKAN bagian dokumen desain di atas — lihat
// NEXT_SESSION.md): `ImportKatalog.commit()` (Paste, cobek-io.js) DIREROUTE
// ke `ShopDataIO.commitShopRows()` di bawah, sehingga match-by-name +
// create/update produk sekarang benar-benar 1 SUMBER KEBENARAN dipakai oleh
// SEMUA 4 entry point (Scan/PDF/CSV/Paste), bukan cuma CSV. Untuk itu
// `commitShopRows(rows)` ditambah dukungan field opsional `hargaReseller`
// (dibutuhkan Paste mode "🤝 Harga Reseller" — field ini sebelumnya tidak
// ada di rows karena Scan/PDF/CSV tidak pernah mengisi harga reseller).
// 100% ADDITIVE: Scan/PDF/CSV tidak pernah mengirim `hargaReseller`, jadi
// perilakunya 0 berubah untuk ketiganya.
//
// `ShopDataIO.commitShopRows(rows)` adalah SATU fungsi commit yang menurut
// desain (§B.4) dipakai bareng oleh 4 entry point (Scan/PDF/CSV/Paste)
// supaya logic match-by-name + create/update produk tidak terduplikasi 4x.
//
// Pola commit di bawah 100% reuse logic yang SUDAH ADA di
// `ImportKatalog.commit()`/`ImportShopExcel.commit()` (cobek-io.js): match
// produk by name (case-insensitive) -> ada = update field yg dikirim saja
// (partial, field yg tidak dikirim TIDAK ditimpa), belum ada = buat baru
// dengan shape objek produk yang sama persis dipakai di seluruh Shop.
const ShopDataIO = {
  // rows: {nama, kategori?, hargaBeli?, hargaJual?, hargaReseller?, stok?, satuan?}[]
  // Field opsional yang tidak dikirim (undefined/null) TIDAK menimpa data lama
  // pada produk yang sudah ada — sama prinsip partial-update dgn
  // TorsiVehicleAPI.setCheck() (Bagian A, lihat torsi-vehicle-api.js).
  commitShopRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return { ok: false, created: 0, updated: 0, total: 0 };
    let created = 0, updated = 0;
    rows.forEach((r) => {
      if (!r || !r.nama) return;
      const nama = String(r.nama).trim();
      if (!nama) return;
      const kategoriId = r.kategori ? resolveShopKategori(r.kategori) : '';
      let product = D.products.find((p) => p.name.toLowerCase() === nama.toLowerCase());
      if (product) {
        if (r.hargaBeli !== undefined && r.hargaBeli !== null) product.hargaBeli = r.hargaBeli;
        if (r.hargaJual !== undefined && r.hargaJual !== null) product.hargaJual = r.hargaJual;
        if (r.hargaReseller !== undefined && r.hargaReseller !== null) product.hargaReseller = r.hargaReseller;
        if (r.stok !== undefined && r.stok !== null) product.stock = r.stok;
        if (r.satuan) product.satuan = r.satuan;
        if (kategoriId) product.kategoriId = kategoriId;
        updated++;
      } else {
        product = {
          id: 'prod_' + Date.now() + '_' + uid(),
          name: nama,
          stock: r.stok || 0,
          hargaBeli: r.hargaBeli || 0,
          hargaJual: r.hargaJual || 0,
          hargaReseller: (r.hargaReseller !== undefined && r.hargaReseller !== null) ? r.hargaReseller : null,
          diskonPersen: 0,
          kategoriId,
          produsenId: '',
          hargaByProdusen: {},
          satuan: r.satuan || '',
        };
        D.products.push(product);
        created++;
      }
    });
    save();
    return { ok: true, created, updated, total: created + updated };
  },

  // Parser CSV sederhana (§B.3.3): String.split('\n')+split(',') — codebase
  // belum pakai papaparse, konsisten prinsip "no extra dependency kalau tidak
  // perlu" (kalau nanti ada quoting koma di nama produk, baru upgrade).
  // Header wajib: nama,kategori,harga_beli,harga_jual,stok,satuan (urutan
  // kolom bebas, cocokkan lewat nama header, bukan posisi tetap).
  parseShopCSV(text) {
    if (!text || !text.trim()) return [];
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 1) return [];
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = {
      nama: header.indexOf('nama'),
      kategori: header.indexOf('kategori'),
      hargaBeli: header.indexOf('harga_beli'),
      hargaJual: header.indexOf('harga_jual'),
      stok: header.indexOf('stok'),
      satuan: header.indexOf('satuan'),
    };
    if (idx.nama === -1) return [];
    const toInt = (v) => {
      const digits = String(v || '').replace(/[^\d]/g, '');
      return digits ? parseInt(digits, 10) : 0;
    };
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const nama = (cols[idx.nama] || '').trim();
      if (!nama) continue;
      rows.push({
        nama,
        kategori: idx.kategori > -1 ? (cols[idx.kategori] || '').trim() : '',
        hargaBeli: idx.hargaBeli > -1 ? toInt(cols[idx.hargaBeli]) : 0,
        hargaJual: idx.hargaJual > -1 ? toInt(cols[idx.hargaJual]) : 0,
        stok: idx.stok > -1 ? toInt(cols[idx.stok]) : 0,
        satuan: idx.satuan > -1 ? (cols[idx.satuan] || '').trim() : '',
      });
    }
    return rows;
  },

  // exportShopJSON() (§B.3.4, item terakhir Bagian B) — subset Shop-only
  // dari backup-restore.js yang SUDAH ADA (`out.products=D.products;
  // out.produsen=D.produsen;`), dibungkus fungsi terpisah supaya user Shop
  // bisa backup/restore cepat tanpa buka backupModal & centang/uncentang 8
  // modul. 0 field baru, 0 rumus baru — murni passthrough + download, pola
  // sama persis blok `runBackup()`/`exportJSON()` (backup-restore.js).
  exportShopJSON() {
    const payload = {
      products: D.products,
      produsen: D.produsen,
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shop-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    return payload;
  },

  // validateShopJSON(imp) — cek shape minimal SEBELUM overwrite apa pun,
  // pola sama `applyRestoredData()` (backup-restore.js: cek `typeof
  // imp==='object'` + minimal 1 key dikenal), diperketat khusus Shop:
  // products/produsen (kalau ada) harus array.
  validateShopJSON(imp) {
    if (!imp || typeof imp !== 'object') return { ok: false, msg: 'File tidak dikenali (bukan format JSON yang valid).' };
    if (imp.products === undefined && imp.produsen === undefined) return { ok: false, msg: 'File ini sepertinya bukan file backup Shop (tidak ada data products/produsen).' };
    if (imp.products !== undefined && !Array.isArray(imp.products)) return { ok: false, msg: 'Field "products" di file ini bukan format yang valid.' };
    if (imp.produsen !== undefined && !Array.isArray(imp.produsen)) return { ok: false, msg: 'Field "produsen" di file ini bukan format yang valid.' };
    return { ok: true };
  },

  // importShopJSON(imp, mode) — mode 'gabung' (default) match produk by
  // nama (case-insensitive), pola sama commitShopRows()/ImportKatalog.
  // commit(): ada -> update PARTIAL (field undefined di sumber TIDAK
  // menimpa), belum ada -> buat baru shape produk Shop yang sama persis.
  // Beda dari commitShopRows(): sumber di sini SUDAH berbentuk objek produk
  // penuh (hasil export JSON, bukan rows sederhana scan/CSV/PDF), jadi
  // field yang ikut disalin juga lebih lengkap (kategoriId/produsenId/
  // hargaReseller/diskonPersen) — TIDAK dipetakan lewat commitShopRows()
  // krn field-nya sudah final, bukan "kategori nama teks" yang perlu
  // resolveShopKategori(). mode 'timpa' = replace total (destructive,
  // pemanggil WAJIB konfirmasi dulu via askConfirm() sebelum panggil ini).
  importShopJSON(imp, mode) {
    const v = this.validateShopJSON(imp);
    if (!v.ok) return { ok: false, msg: v.msg };
    const products = Array.isArray(imp.products) ? imp.products : [];
    const produsenList = Array.isArray(imp.produsen) ? imp.produsen : [];
    if (mode === 'timpa') {
      D.products = JSON.parse(JSON.stringify(products));
      D.produsen = JSON.parse(JSON.stringify(produsenList));
      save();
      return { ok: true, mode: 'timpa', productCount: D.products.length, produsenCount: D.produsen.length };
    }
    let created = 0, updated = 0;
    const copyFields = ['hargaBeli', 'hargaJual', 'hargaReseller', 'diskonPersen', 'kategoriId', 'produsenId', 'satuan', 'stock'];
    products.forEach((src) => {
      if (!src || !src.name) return;
      const nama = String(src.name).trim();
      if (!nama) return;
      const product = D.products.find((p) => p.name.toLowerCase() === nama.toLowerCase());
      if (product) {
        copyFields.forEach((f) => { if (src[f] !== undefined && src[f] !== null) product[f] = src[f]; });
        updated++;
      } else {
        D.products.push({
          id: 'prod_' + Date.now() + '_' + uid(),
          name: nama,
          stock: src.stock || 0,
          hargaBeli: src.hargaBeli || 0,
          hargaJual: src.hargaJual || 0,
          hargaReseller: src.hargaReseller || null,
          diskonPersen: src.diskonPersen || 0,
          kategoriId: src.kategoriId || '',
          produsenId: src.produsenId || '',
          hargaByProdusen: src.hargaByProdusen || {},
          satuan: src.satuan || '',
        });
        created++;
      }
    });
    // Produsen: TAMBAH yang belum ada saja (match by nama) -- tidak
    // update produsen existing, konsisten prinsip Gabung = additive utk
    // data yang berpotensi konflik (kontak/catatan tidak ada penanda
    // "field kosong" yang jelas seperti pada produk).
    let produsenCreated = 0;
    produsenList.forEach((p) => {
      if (!p || !p.name) return;
      const exists = D.produsen.find((x) => x.name.toLowerCase() === String(p.name).toLowerCase());
      if (!exists) {
        D.produsen.push({ id: 'prd_' + Date.now() + '_' + uid(), name: p.name, contact: p.contact || '', note: p.note || '' });
        produsenCreated++;
      }
    });
    save();
    return { ok: true, mode: 'gabung', created, updated, produsenCreated };
  },
};

// ShopCsvImport — presenter/wrapper modal `shopCsvImportModal`, pola SAMA
// PERSIS `ImportShopExcel` (cobek-io.js): pilih file -> baca (di sini native
// File.text(), bukan SheetJS karena CSV teks biasa) -> parse -> preview
// (badge 🆕 baru / 🔄 update, sama gaya `_renderPreview()` existing) -> commit
// lewat `ShopDataIO.commitShopRows()`.
const ShopCsvImport = {
  parsedRows: [],
  open() {
    this.parsedRows = [];
    const fileEl = document.getElementById('shopCsvImportFile');
    if (fileEl) fileEl.value = '';
    const box = document.getElementById('shopCsvImportPreview');
    if (box) box.innerHTML = '';
    const btn = document.getElementById('shopCsvImportCommitBtn');
    if (btn) btn.disabled = true;
    openModal('shopCsvImportModal');
  },
  async onFileSelected(evt) {
    const file = evt.target.files && evt.target.files[0];
    const box = document.getElementById('shopCsvImportPreview');
    const btn = document.getElementById('shopCsvImportCommitBtn');
    if (!file) { if (box) box.innerHTML = ''; if (btn) btn.disabled = true; return; }
    if (box) box.innerHTML = '<div class="u-fs12 u-t2">Membaca file...</div>';
    try {
      const text = await file.text();
      this.parsedRows = ShopDataIO.parseShopCSV(text);
    } catch (e) {
      toast('⚠️ Gagal membaca file CSV: ' + (e && e.message ? e.message : 'format tidak dikenali'));
      this.parsedRows = [];
      if (box) box.innerHTML = '';
      if (btn) btn.disabled = true;
      return;
    }
    this._renderPreview();
  },
  _renderPreview() {
    const box = document.getElementById('shopCsvImportPreview');
    const btn = document.getElementById('shopCsvImportCommitBtn');
    if (!box) return;
    if (!this.parsedRows.length) {
      box.innerHTML = '<div class="u-fs12 u-t2">Tidak ada baris valid terbaca. Pastikan file CSV punya header: nama,kategori,harga_beli,harga_jual,stok,satuan (kolom "nama" wajib ada).</div>';
      if (btn) btn.disabled = true;
      return;
    }
    let created = 0, updated = 0;
    const rowsHtml = this.parsedRows.slice(0, 50).map((r) => {
      const exists = D.products.find((p) => p.name.toLowerCase() === r.nama.toLowerCase());
      if (exists) updated++; else created++;
      const statusLabel = exists ? '🔄 update' : '🆕 baru';
      const sub = (r.stok || 0) + (r.satuan ? ' ' + r.satuan : '') + ' · ' + fmtFull(r.hargaJual || 0);
      return `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px"><span>${escapeHtml(r.nama)}</span><span style="white-space:nowrap">${escapeHtml(sub)} <span class="u-t2">(${statusLabel})</span></span></div>`;
    }).join('');
    const moreNote = this.parsedRows.length > 50 ? `<div class="u-fs11 u-t2" style="margin-top:6px">+${this.parsedRows.length - 50} baris lain tidak ditampilkan di pratinjau (tetap ikut diimpor)</div>` : '';
    box.innerHTML = `<div class="u-fs12 u-t2 u-mb8">${this.parsedRows.length} baris kebaca — ${created} baru, ${updated} update.</div>${rowsHtml}${moreNote}`;
    if (btn) btn.disabled = false;
  },
  commit() {
    if (!this.parsedRows.length) { toast('⚠️ Belum ada data yang terbaca dari file'); return; }
    const res = ShopDataIO.commitShopRows(this.parsedRows);
    closeModal('shopCsvImportModal');
    renderProductList();
    toast(`✅ Import CSV selesai: ${res.created} produk baru, ${res.updated} diperbarui`);
    this.parsedRows = [];
  },
};
function openShopCsvImportModal(){return ShopCsvImport.open();}
function onShopCsvImportFileChange(evt){return ShopCsvImport.onFileSelected(evt);}
function commitShopCsvImport(){return ShopCsvImport.commit();}

// ShopJsonIO — presenter/wrapper modal `shopJsonModal` (§B.3.4, item
// terakhir Bagian B DESIGN_torsi-vehicle-selector_shop-import-export-2.md).
// Export: 1 tap langsung download lewat ShopDataIO.exportShopJSON() (tidak
// butuh preview, sama gaya `runBackup()`). Import: pilih file -> baca teks
// -> JSON.parse() -> ShopDataIO.validateShopJSON() -> preview ringkasan
// (jumlah produk baru/update, produsen baru) -> commit lewat
// ShopDataIO.importShopJSON(parsed, mode). Mode 'timpa' WAJIB konfirmasi
// destruktif (askConfirm(), pola sama `archiveDeleteStep()`) SEBELUM
// commit — beda dari mode 'gabung' yang aman/additive & tidak perlu
// konfirmasi tambahan (sama seperti Import CSV/PDF/Scan yang sudah ada).
const ShopJsonIO = {
  mode: 'gabung', // 'gabung' | 'timpa'
  parsed: null,
  open() {
    this.mode = 'gabung';
    this.parsed = null;
    const fileEl = document.getElementById('shopJsonImportFile');
    if (fileEl) fileEl.value = '';
    const box = document.getElementById('shopJsonImportPreview');
    if (box) box.innerHTML = '';
    const btn = document.getElementById('shopJsonImportCommitBtn');
    if (btn) btn.disabled = true;
    document.querySelectorAll('#shopJsonImportModeToggle .chip-btn').forEach((b) => b.classList.remove('active'));
    const defBtn = document.getElementById('shopJsonModeGabung');
    if (defBtn) defBtn.classList.add('active');
    this._syncModeHint();
    openModal('shopJsonModal');
  },
  exportJSON() {
    ShopDataIO.exportShopJSON();
    toast('✅ Export JSON Shop berhasil di-download!');
  },
  setMode(mode, el) {
    this.mode = mode;
    document.querySelectorAll('#shopJsonImportModeToggle .chip-btn').forEach((b) => b.classList.remove('active'));
    if (el) el.classList.add('active');
    this._syncModeHint();
    if (this.parsed) this._renderPreview();
  },
  _syncModeHint() {
    const hint = document.getElementById('shopJsonModeHint');
    if (!hint) return;
    hint.textContent = this.mode === 'timpa'
      ? '⚠️ Timpa: SELURUH data Etalase Produk & Produsen saat ini akan diganti total dengan isi file — tidak bisa dibatalkan.'
      : '🔀 Gabung: produk yang namanya sama di-update (field kosong di file tidak menimpa), produk/produsen baru ditambahkan — data lama yang tidak ada di file TETAP ada.';
  },
  async onFileSelected(evt) {
    const file = evt.target.files && evt.target.files[0];
    const box = document.getElementById('shopJsonImportPreview');
    const btn = document.getElementById('shopJsonImportCommitBtn');
    this.parsed = null;
    if (!file) { if (box) box.innerHTML = ''; if (btn) btn.disabled = true; return; }
    if (box) box.innerHTML = '<div class="u-fs12 u-t2">Membaca file...</div>';
    try {
      const text = await file.text();
      this.parsed = JSON.parse(text);
    } catch (e) {
      toast('⚠️ Gagal membaca file JSON: ' + (e && e.message ? e.message : 'format tidak dikenali'));
      this.parsed = null;
      if (box) box.innerHTML = '';
      if (btn) btn.disabled = true;
      return;
    }
    this._renderPreview();
  },
  _renderPreview() {
    const box = document.getElementById('shopJsonImportPreview');
    const btn = document.getElementById('shopJsonImportCommitBtn');
    if (!box) return;
    const v = ShopDataIO.validateShopJSON(this.parsed);
    if (!v.ok) {
      box.innerHTML = '<div class="u-fs12 u-t2">⚠️ ' + escapeHtml(v.msg) + '</div>';
      if (btn) btn.disabled = true;
      return;
    }
    const products = Array.isArray(this.parsed.products) ? this.parsed.products : [];
    const produsenList = Array.isArray(this.parsed.produsen) ? this.parsed.produsen : [];
    let html;
    if (this.mode === 'timpa') {
      html = `<div class="u-fs12 u-t2">File berisi <b>${products.length}</b> produk & <b>${produsenList.length}</b> produsen — akan MENGGANTI TOTAL data Shop yang ada sekarang (<b>${D.products.length}</b> produk & <b>${D.produsen.length}</b> produsen saat ini).</div>`;
    } else {
      let created = 0, updated = 0;
      products.forEach((p) => {
        if (!p || !p.name) return;
        const exists = D.products.find((x) => x.name.toLowerCase() === String(p.name).toLowerCase());
        if (exists) updated++; else created++;
      });
      let produsenBaru = 0;
      produsenList.forEach((p) => {
        if (!p || !p.name) return;
        const exists = D.produsen.find((x) => x.name.toLowerCase() === String(p.name).toLowerCase());
        if (!exists) produsenBaru++;
      });
      html = `<div class="u-fs12 u-t2">${products.length} produk di file — <b>${created}</b> baru, <b>${updated}</b> update. ${produsenList.length} produsen di file — <b>${produsenBaru}</b> baru.</div>`;
    }
    box.innerHTML = html;
    if (btn) btn.disabled = false;
  },
  async commit() {
    const v = ShopDataIO.validateShopJSON(this.parsed);
    if (!v.ok) { toast('⚠️ ' + v.msg); return; }
    if (this.mode === 'timpa') {
      const lanjut = await askConfirm('Seluruh data Etalase Produk & Produsen saat ini akan DIGANTI TOTAL dengan isi file. Tindakan ini TIDAK BISA dibatalkan.\n\nTetap lanjutkan?', { title: 'Timpa Data Shop', danger: true, okText: 'Ya, Timpa Total', icon: '♻️' });
      if (!lanjut) return;
    }
    const res = ShopDataIO.importShopJSON(this.parsed, this.mode);
    if (!res.ok) { toast('⚠️ ' + res.msg); return; }
    closeModal('shopJsonModal');
    renderProductList();
    if (res.mode === 'timpa') {
      toast(`✅ Timpa data Shop selesai: ${res.productCount} produk, ${res.produsenCount} produsen`);
    } else {
      toast(`✅ Gabung data Shop selesai: ${res.created} produk baru, ${res.updated} diperbarui, ${res.produsenCreated} produsen baru`);
    }
    this.parsed = null;
  },
};
function openShopJsonModal(){return ShopJsonIO.open();}
function onShopJsonImportFileChange(evt){return ShopJsonIO.onFileSelected(evt);}
function commitShopJsonImport(){return ShopJsonIO.commit();}

if (typeof window !== 'undefined') {
  window.ShopJsonIO = ShopJsonIO;
}
