// modules/shop/business-flow-presenter-inventory.js — Business Flow
// Presenter, bagian Purchase Order / Movement / Inventory Transfer / Modal
// UI. DIPECAH dari modules/shop/business-flow-presenter.js (S205 dkk,
// audit ukuran file pasca-pengecekan OVERSIZED_FILE_ALLOWLIST di
// scripts/build.js) — 0 logic diubah, murni pindah lokasi fisik. Metode di
// sini digabung KEMBALI ke object BusinessFlowPresenter lewat
// Object.assign() di akhir business-flow-presenter.js, jadi tetap 1 object
// yang sama di runtime (this.xxx() antar-metode tetap jalan seperti
// sebelumnya, terlepas dari file mana metodenya fisik ditulis).
//
// Cakupan (dipindah APA ADANYA, urutan tidak diubah):
//   - Purchase Order (Sesi 378): createPurchaseOrder/receivePurchaseOrder/
//     createPurchaseOrderBatch/receivePurchaseOrderBatch/dst.
//   - Movement/Lokasi barang (Sesi 238): movementLabel/nextLocation/
//     renderMovement/dst.
//   - Inventory Transfer (Sesi 243): createInventoryTransfer/
//     receiveTransfer/transferSummary/locationSummary/dst.
//   - Modal UI utk Transfer & Purchase Order Batch (Sesi 265/374/381):
//     openTransferModal/renderTransferProductChips/
//     openPurchaseOrderBatchModal/renderPurchaseOrderBatchList/dst.
//
// Harus dimuat SEBELUM business-flow-presenter.js (lihat urutan di
// scripts/build.js GROUP_B & tests/helpers/loadSource.js per test) supaya
// Object.assign() di file itu punya BusinessFlowPresenterInventoryMixin
// yang sudah terisi.
const BusinessFlowPresenterInventoryMixin = {
  createPurchaseOrder({ productId, qty } = {}) {
    if (typeof D === 'undefined' || !D.products) return { ok: false, reason: 'D belum dimuat' };
    if (!D.purchaseOrders) D.purchaseOrders = [];
    const product = D.products.find((p) => p.id === productId);
    if (!product) return { ok: false, reason: 'Produk tidak ditemukan' };
    const q = parseFloat(qty);
    if (!Number.isFinite(q) || q <= 0) return { ok: false, reason: 'Qty harus lebih dari 0' };
    const purchase = {
      id: 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      productId,
      qty: q,
      status: 'ORDERED',
      createdDate: new Date().toISOString(),
      receivedDate: null,
    };
    D.purchaseOrders.push(purchase);
    if (typeof save === 'function') save();
    this.renderMovement(productId);
    if (typeof toast === 'function') toast(`🧾 Purchase Order dibuat — ${q} pcs ${product.name || ''} dari Supplier`);
    return { ok: true, purchase };
  },

  // receivePurchaseOrder(purchaseId) — Supplier -> Magelang Storage.
  // Idempotent by design (pola sama persis receiveTransfer(), S243) —
  // dipanggil 2x pada PO yg sudah RECEIVED balik ok:true+alreadyReceived:true
  // TANPA menimpa ulang receivedDate. TIDAK PERNAH menyentuh
  // D.products[idx].stock (stok tetap ditambah lewat alur restock yang
  // SUDAH ADA — PO ini murni penanda status/lokasi, bukan input stok baru).
  receivePurchaseOrder(purchaseId) {
    if (typeof D === 'undefined' || !D.purchaseOrders) return { ok: false };
    const purchase = D.purchaseOrders.find((p) => p.id === purchaseId);
    if (!purchase) return { ok: false, reason: 'Purchase Order tidak ditemukan' };
    if (purchase.status === 'RECEIVED') return { ok: true, purchase, alreadyReceived: true };
    purchase.status = 'RECEIVED';
    purchase.receivedDate = new Date().toISOString();
    if (typeof save === 'function') save();
    this.renderMovement(purchase.productId);
    if (typeof toast === 'function') toast(`✅ Barang sampai Magelang — ${purchase.qty} pcs diterima dari Supplier`);
    return { ok: true, purchase };
  },

  // createPurchaseOrderBatch({items,note,supplier}) (Sesi 381, +supplier
  // S383 lanjutan) — versi multi-produk dari createPurchaseOrder() di
  // atas: 1 PO bisa berisi banyak produk sekaligus (mis. borong dari 1
  // Supplier), tapi TIAP produk tetap jadi 1 record D.purchaseOrders
  // TERPISAH (0 breaking change ke bentuk data lama/createPurchaseOrder()/
  // receivePurchaseOrder()/renderPurchaseOrderBox()/
  // renderPurchaseOrderHistory() yang semua baca per-productId) — cuma
  // ditambah field `batchId` (S381) & `supplier` (S383 lanjutan, opsional,
  // string bebas — BUKAN master data terpisah, follow pola PO
  // single-produk lama yang juga belum punya field Supplier) yang sama
  // utk seluruh record dalam 1 batch, dipakai buat kelompokkan tampilan
  // di renderPurchaseOrderBatchList() di bawah. Validasi per-item reuse
  // PERSIS logic createPurchaseOrder() (produk harus ada di Etalase, qty
  // >0/finite) — item invalid di-skip (bukan gagalkan seluruh batch),
  // batch gagal total hanya kalau TIDAK ADA satupun item valid.
  createPurchaseOrderBatch({ items, note, supplier } = {}) {
    if (typeof D === 'undefined' || !D.products) return { ok: false, reason: 'D belum dimuat' };
    if (!D.purchaseOrders) D.purchaseOrders = [];
    if (!Array.isArray(items) || !items.length) return { ok: false, reason: 'Tidak ada produk di keranjang' };
    const batchId = 'pob_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const supplierName = (supplier || '').trim();
    const created = [];
    (items || []).forEach((it) => {
      const product = D.products.find((p) => p.id === it.productId);
      const q = parseFloat(it.qty);
      if (!product || !Number.isFinite(q) || q <= 0) return; // skip item invalid, bukan gagalkan seluruh batch
      const purchase = {
        id: 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        productId: it.productId,
        qty: q,
        status: 'ORDERED',
        createdDate: new Date().toISOString(),
        receivedDate: null,
        batchId,
        supplier: supplierName,
      };
      D.purchaseOrders.push(purchase);
      created.push(purchase);
    });
    if (!created.length) return { ok: false, reason: 'Tidak ada item valid (produk harus sudah ada di Etalase)' };
    if (typeof save === 'function') save();
    this.render();
    this.renderTab();
    created.forEach((p) => this.renderMovement(p.productId));
    const totalPcs = created.reduce((s, p) => s + p.qty, 0);
    if (typeof toast === 'function') {
      const supplierSuffix = supplierName ? ` (${supplierName})` : '';
      toast(`🧾 PO Multi-Produk dibuat — ${created.length} produk / ${totalPcs} pcs dari Supplier${supplierSuffix}`);
    }
    return { ok: true, batchId, purchases: created, note: note || '', supplier: supplierName };
  },

  // receivePurchaseOrderBatch(batchId) (Sesi 381) — terima SEMUA item dalam
  // 1 batch sekaligus, delegasi PERSIS receivePurchaseOrder() per item (0
  // logic status baru, idempotent by design sama seperti sumbernya).
  receivePurchaseOrderBatch(batchId) {
    if (typeof D === 'undefined' || !D.purchaseOrders) return { ok: false };
    const items = D.purchaseOrders.filter((p) => p.batchId === batchId);
    if (!items.length) return { ok: false, reason: 'Batch PO tidak ditemukan' };
    items.forEach((p) => this.receivePurchaseOrder(p.id));
    return { ok: true, batchId, purchases: items };
  },

  // purchaseOrderBatches() (Sesi 381, +supplier S383 lanjutan) —
  // ringkasan semua batch PO multi-produk (dikelompokkan by batchId),
  // TERBARU dulu, murni baca ulang D.purchaseOrders yang sudah ada (pola
  // sama transferSummary()) — 0 rumus baru. PO lama (S378, tanpa
  // batchId) TIDAK muncul di sini by design — itu tetap ditampilkan
  // lewat renderPurchaseOrderBox()/renderPurchaseOrderHistory() per-produk
  // seperti sebelumnya. `supplier` diambil dari record pertama dalam
  // grup (semua record 1 batch selalu punya `supplier` yang sama, diisi
  // sekali saat createPurchaseOrderBatch()) — fallback '' utk batch lama
  // (S381/S382) yang dibuat sebelum field ini ada.
  purchaseOrderBatches() {
    if (typeof D === 'undefined' || !D.purchaseOrders) return [];
    const groups = {};
    D.purchaseOrders.forEach((p) => {
      if (!p.batchId) return;
      if (!groups[p.batchId]) groups[p.batchId] = [];
      groups[p.batchId].push(p);
    });
    const products = D.products || [];
    return Object.keys(groups).map((batchId) => {
      const list = groups[batchId];
      const items = list.map((p) => {
        const pr = products.find((x) => x.id === p.productId);
        return { productId: p.productId, name: pr ? pr.name : p.productId, qty: p.qty, status: p.status, orphan: !pr };
      });
      const allReceived = list.every((p) => p.status === 'RECEIVED');
      const createdDate = list.reduce((min, p) => (!min || new Date(p.createdDate || 0) < new Date(min)) ? p.createdDate : min, null);
      return {
        batchId,
        items,
        totalPcs: list.reduce((s, p) => s + (p.qty || 0), 0),
        status: allReceived ? 'RECEIVED' : 'ORDERED',
        createdDate,
        supplier: list[0].supplier || '',
      };
    }).sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
  },

  // _latestPurchaseForProduct(productId) — internal WIRE: PO TERBARU (by
  // createdDate) utk productId ini, pola sama persis
  // _activeTransferForProduct()/_latestOrderForProduct() di atas. BEDA dari
  // _activeTransferForProduct(): di sini status RECEIVED tetap dianggap
  // relevan (bukan cuma ORDERED) — keduanya masih posisi valid di rantai
  // (SUPPLIER vs MAGELANG_STORAGE), beda dgn transfer yg begitu RECEIVED
  // dianggap "selesai perannya" krn derivasi order/stok sudah cukup wakili.
  _latestPurchaseForProduct(productId) {
    if (typeof D === 'undefined' || !D.purchaseOrders) return null;
    const matches = D.purchaseOrders.filter((p) => p.productId === productId);
    if (!matches.length) return null;
    return matches.reduce((latest, p) => (new Date(p.createdDate || 0) > new Date(latest.createdDate || 0) ? p : latest), matches[0]);
  },

  // _latestOrderForProduct(productId) — internal WIRE: cari transaksi Shop
  // (D.cobek) TERBARU yg items-nya memuat productId ini, reuse PERSIS field
  // items[].productId yg SUDAH ADA (ditulis Order._saveInner(),
  // cobek-order.js) — 0 field baru, 0 index baru, 0 query baru selain
  // filter+reduce murni terhadap array yg sudah ada.
  _latestOrderForProduct(productId) {
    if (typeof D === 'undefined' || !D.cobek) return null;
    const matches = D.cobek.filter((t) => Array.isArray(t.items) && t.items.some((it) => it.productId === productId));
    if (!matches.length) return null;
    return matches.reduce((latest, t) => ((t.id || 0) > (latest.id || 0) ? t : latest), matches[0]);
  },

  // _activeTransferForProduct(productId) — internal WIRE (Sesi 377): cari
  // rit D.inventoryTransfers berstatus ON_TRIP TERBARU (by createdDate)
  // yg items-nya memuat productId ini, reuse field yg SUDAH ADA
  // (createInventoryTransfer(), S243) — 0 field baru, 0 index baru, pola
  // sama persis _latestOrderForProduct() di atas.
  _activeTransferForProduct(productId) {
    if (typeof D === 'undefined' || !D.inventoryTransfers) return null;
    const matches = D.inventoryTransfers.filter((t) => t.status === 'ON_TRIP' && Array.isArray(t.items) && t.items.some((it) => it.productId === productId));
    if (!matches.length) return null;
    return matches.reduce((latest, t) => (new Date(t.createdDate || 0) > new Date(latest.createdDate || 0) ? t : latest), matches[0]);
  },

  // movementLabel(location) — label tampilan utk 1 lokasi dari
  // INVENTORY_MOVEMENT_LOCATIONS (case-insensitive). Balikin `location` apa
  // adanya (fallback tampilan, tidak crash) kalau key tidak dikenali. Sama
  // pola persis statusLabel() (S237) di atas.
  movementLabel(location) {
    const key = typeof location === 'string' ? location.trim().toUpperCase() : location;
    const found = INVENTORY_MOVEMENT_LOCATIONS.find((l) => l.key === key);
    return found ? found.label : (typeof location === 'string' ? location : String(location));
  },

  // nextLocation(location) — lokasi berikutnya dalam rantai, atau `null`
  // kalau `location` adalah lokasi terakhir (CUSTOMER) atau tidak dikenali.
  // Murni navigasi array INVENTORY_MOVEMENT_LOCATIONS, 0 logic bisnis. Sama
  // pola persis nextStatus() (S237) di atas.
  nextLocation(location) {
    const key = typeof location === 'string' ? location.trim().toUpperCase() : location;
    const idx = INVENTORY_MOVEMENT_LOCATIONS.findIndex((l) => l.key === key);
    if (idx === -1 || idx === INVENTORY_MOVEMENT_LOCATIONS.length - 1) return null;
    return INVENTORY_MOVEMENT_LOCATIONS[idx + 1].key;
  },

  // renderMovement(productId) — isi container '#productMovementList'
  // (Detail Barang / productModal) dgn rantai 7 lokasi
  // INVENTORY_MOVEMENT_LOCATIONS, highlight posisi aktif dari
  // currentLocation(productId). Guard container/typeof (pola sama
  // renderLifecycle() di atas) -> aman diam2, tidak throw.
  //
  // UPDATE (Sesi 376, module Inventory Movement — gj: "belum ada modulnya"):
  // sebelumnya baris2 di sini MURNI display (tidak bisa diapa-apakan). Sekarang
  // tiap baris jadi tappable (data-action -> clickMovementRow()) supaya posisi
  // barang bisa di-set MANUAL kalau derivasi otomatis (dari status
  // transaksi/stok) belum/tidak sesuai kenyataan lapangan (mis. barang lagi
  // "On Motor" tapi belum ada transaksi apapun yg tercatat) — 0 stok baru,
  // 0 rumus baru, cuma penanda posisi (lihat currentLocation() override di
  // atas). Kalau lagi override manual, muncul 1 baris "🔄 Reset ke Otomatis"
  // di bawah rantai utk kembali ke derivasi otomatis kapan saja.
  renderMovement(productId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('productMovementList') : null;
    if (!el) return;
    const s = this.currentLocation(productId);
    const activeKey = s.ok ? s.location : null;
    const isManual = !!(s.ok && s.manual);
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    const rows = INVENTORY_MOVEMENT_LOCATIONS.map((loc, i) => {
      const active = loc.key === activeKey;
      const arrow = i < INVENTORY_MOVEMENT_LOCATIONS.length - 1 ? '<div class="u-t3" style="text-align:center">↓</div>' : '';
      return `<div class="setting-item" style="padding:6px 0;cursor:pointer${active ? ';background:var(--accent-soft);border-radius:8px' : ''}" data-action="BusinessFlowPresenter.clickMovementRow" data-args='["${esc(productId)}","${loc.key}"]'>
        <div class="setting-label"${active ? ' style="color:var(--accent);font-weight:800"' : ''}>${active ? '● ' : ''}${esc(loc.label)}</div>
      </div>${arrow}`;
    }).join('');
    const resetRow = isManual
      ? `<div style="text-align:right;margin-top:6px"><span style="font-size:11px;color:var(--accent);cursor:pointer;font-weight:600" data-action="BusinessFlowPresenter.clickResetMovement" data-args='["${esc(productId)}"]'>🔄 Reset ke Otomatis</span></div>`
      : '';
    const manualHint = isManual
      ? '<div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5">📍 Lokasi diset manual — tidak lagi mengikuti status transaksi otomatis.</div>'
      : '';
    el.innerHTML = rows + manualHint + resetRow;
  },

  // --- Purchase Order UI (Sesi 379) --------------------------------------
  // Lanjutan S378: createPurchaseOrder()/receivePurchaseOrder() sebelumnya
  // cuma bisa dipanggil programatik (dari test), belum ada entry point nyata
  // di modal Detail Produk. renderPurchaseOrderBox() isi container
  // '#productPurchaseOrderBox' (di bawah #productMovementList, productModal)
  // dgn 1 dari 2 tampilan:
  //  - Belum ada PO aktif (atau PO terakhir sudah RECEIVED) -> 1 input qty +
  //    tombol "🧾 Buat Purchase Order", reuse createPurchaseOrder() apa
  //    adanya (0 logic baru di sini, cuma bungkus UI).
  //  - PO terakhir masih ORDERED -> info ringkas (qty + tanggal pesan) +
  //    tombol "✅ Terima Barang di Magelang", reuse receivePurchaseOrder().
  // Guard container/typeof (pola sama renderMovement()) -> aman diam2 kalau
  // dipanggil di luar konteks app (mis. produk baru yg belum punya id).
  renderPurchaseOrderBox(productId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('productPurchaseOrderBox') : null;
    if (!el) return;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    if (!productId) {
      el.innerHTML = '<div style="font-size:11px;color:var(--text2);line-height:1.5">Simpan produk ini dulu supaya bisa mencatat Purchase Order.</div>';
      return;
    }
    const purchase = this._latestPurchaseForProduct(productId);
    if (purchase && purchase.status === 'ORDERED') {
      const tgl = purchase.createdDate ? new Date(purchase.createdDate).toLocaleDateString('id-ID') : '-';
      el.innerHTML = `<div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">🧾 ${purchase.qty} pcs sedang dipesan dari Supplier (dipesan ${esc(tgl)})</div>
        <button type="button" class="btn btn-primary btn-full btn-sm" data-action="BusinessFlowPresenter.clickReceivePurchaseOrder" data-args='["${esc(purchase.id)}","${esc(productId)}"]'>✅ Terima Barang di Magelang</button>`;
      return;
    }
    el.innerHTML = `<div class="fg u-mb0"><label class="fl">Qty Dipesan dari Supplier</label><input type="number" class="fi" id="pPoQty" placeholder="10" inputmode="numeric" min="1"></div>
      <button type="button" class="btn btn-ghost btn-full btn-sm" style="margin-top:8px" data-action="BusinessFlowPresenter.clickCreatePurchaseOrder" data-args='["${esc(productId)}"]'>🧾 Buat Purchase Order</button>`;
  },

  // renderPurchaseOrderHistory(productId) — isi container '#productPurchaseOrderHistory'
  // (di bawah #productPurchaseOrderBox, productModal) dgn RIWAYAT SEMUA Purchase Order
  // utk produk ini (bukan cuma yang terbaru seperti renderPurchaseOrderBox() di atas).
  // Diminta sbg lanjutan S379 (tercatat "Belum dikerjakan" di FIX s379): sebelum ini,
  // PO lama yg sudah RECEIVED "hilang" begitu ada PO baru dibuat -- tidak ada cara lihat
  // riwayat pembelian dari Supplier utk 1 produk. Query: filter D.purchaseOrders by
  // productId (pola sama _latestPurchaseForProduct()), sort by createdDate TERBARU
  // dulu (pola sama _latestOrderForProduct()/_activeTransferForProduct()), tampilkan SEMUA
  // (bukan cuma yg terbaru) -- 0 field baru, 0 index baru, murni tampilan atas data yg
  // sudah ada. Guard container/typeof (pola sama renderMovement()/renderPurchaseOrderBox())
  // -> aman diam2 kalau dipanggil di luar konteks app.
  renderPurchaseOrderHistory(productId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('productPurchaseOrderHistory') : null;
    if (!el) return;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    if (!productId || typeof D === 'undefined' || !D.purchaseOrders) { el.innerHTML = ''; return; }
    const list = D.purchaseOrders
      .filter((p) => p.productId === productId)
      .sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
    if (!list.length) { el.innerHTML = ''; return; }
    const rows = list.map((p) => {
      const tglPesan = p.createdDate ? new Date(p.createdDate).toLocaleDateString('id-ID') : '-';
      const statusLabel = p.status === 'RECEIVED'
        ? `✅ Diterima${p.receivedDate ? ' ' + esc(new Date(p.receivedDate).toLocaleDateString('id-ID')) : ''}`
        : '🧾 Dipesan (belum diterima)';
      return `<div class="setting-item" style="padding:6px 0">
        <div class="setting-label" style="font-weight:600">${p.qty} pcs <span style="font-weight:400;color:var(--text2);font-size:11px">— dipesan ${esc(tglPesan)}</span></div>
        <div class="setting-sub">${statusLabel}</div>
      </div>`;
    }).join('');
    el.innerHTML = `<div style="font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 4px">📋 Riwayat Purchase Order (${list.length})</div>${rows}`;
  },

  // renderStockCorrections(productId) — isi container '#productStockCorrectionList'
  // (di bawah #productMovementList, productModal) dgn RIWAYAT log koreksi stok
  // (D.productStockCorrections, ditulis dari Etalase._saveInner() saat toggle
  // "🔍 Ini Koreksi Stok" aktif — Sesi s478). Query: filter by productId, sort by
  // ts TERBARU dulu, tampilkan SEMUA — pola byte-mirip renderPurchaseOrderHistory()
  // di atas (container terpisah, guard container/typeof, kosong diam2 kalau
  // productId null/produk baru atau D.productStockCorrections belum ada).
  renderStockCorrections(productId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('productStockCorrectionList') : null;
    if (!el) return;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    if (!productId || typeof D === 'undefined' || !D.productStockCorrections) { el.innerHTML = ''; return; }
    const list = D.productStockCorrections
      .filter((c) => c.productId === productId)
      .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    if (!list.length) { el.innerHTML = ''; return; }
    const rows = list.map((c) => {
      const tgl = c.ts ? new Date(c.ts).toLocaleDateString('id-ID') : '-';
      const deltaLabel = (c.delta > 0 ? '+' : '') + c.delta;
      const deltaColor = c.delta > 0 ? 'var(--accent3)' : 'var(--accent2)';
      return `<div class="setting-item" style="padding:6px 0">
        <div class="setting-label" style="font-weight:600">${esc(c.from)} → ${esc(c.to)} <span style="font-weight:800;color:${deltaColor}">(${esc(deltaLabel)})</span></div>
        <div class="setting-sub">🔍 Koreksi stok — ${esc(tgl)}</div>
      </div>`;
    }).join('');
    el.innerHTML = `<div style="font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 4px">🔍 Riwayat Koreksi Stok (${list.length})</div>${rows}`;
  },

  // clickCreatePurchaseOrder(productId) — handler WIRE tombol "Buat Purchase
  // Order" di atas: ambil qty dari input #pPoQty (fixed id, pola sama field
  // singleton lain di productModal mis. #pStock), delegasi 100% ke
  // createPurchaseOrder() (validasi qty>0 dilakukan di sana), lalu re-render
  // box supaya langsung pindah ke tampilan "PO ORDERED" tanpa perlu
  // tutup-buka modal.
  clickCreatePurchaseOrder(productId) {
    const qtyEl = (typeof document !== 'undefined') ? document.getElementById('pPoQty') : null;
    const qty = qtyEl ? qtyEl.value : null;
    const result = this.createPurchaseOrder({ productId, qty });
    if (!result.ok && typeof toast === 'function') toast('⚠️ ' + (result.reason || 'Gagal membuat Purchase Order'));
    this.renderPurchaseOrderBox(productId);
    this.renderPurchaseOrderHistory(productId);
    this.renderMovement(productId);
  },

  // clickReceivePurchaseOrder(purchaseId, productId) — handler WIRE tombol
  // "Terima Barang di Magelang". Delegasi 100% ke receivePurchaseOrder()
  // (idempotent di sana), lalu re-render box + rantai movement supaya
  // langsung sinkron.
  clickReceivePurchaseOrder(purchaseId, productId) {
    this.receivePurchaseOrder(purchaseId);
    this.renderPurchaseOrderBox(productId);
    this.renderPurchaseOrderHistory(productId);
    this.renderMovement(productId);
  },

  // clickMovementRow(productId, locationKey) — handler WIRE utk data-action di
  // atas: dipanggil global dispatcher data-action (pola sama data-action lain
  // di project ini, lihat chat-action.js/index.html) langsung dgn productId
  // string + locationKey. Delegasi 100% ke setManualLocation() (guard/validasi
  // di sana) lalu re-render container supaya tampilan langsung sinkron tanpa
  // perlu tutup-buka modal.
  clickMovementRow(productId, locationKey) {
    this.setManualLocation(productId, locationKey);
    this.renderMovement(productId);
  },

  // clickResetMovement(productId) — handler WIRE tombol "Reset ke Otomatis".
  clickResetMovement(productId) {
    this.clearManualLocation(productId);
    this.renderMovement(productId);
  },

  // setManualLocation(productId, locationKey) — SATU-SATUNYA titik masuk utk
  // menyimpan override posisi manual (Sesi 376). Validasi: productId harus ada
  // di D.products (produk nyata, bukan produk yg belum disimpan/'undefined'),
  // locationKey harus salah satu key valid di INVENTORY_MOVEMENT_LOCATIONS.
  // Disimpan di D.productMovementOverride[productId] = {location, ts} (ts =
  // epoch ms saat di-set, murni informasi, tidak dipakai logic apapun sampai
  // saat ini). save() dipanggil kalau tersedia (pola sama semua mutator lain
  // di project ini) — aman dipanggil di luar konteks app (mis. dari test)
  // karena guard typeof.
  setManualLocation(productId, locationKey) {
    if (typeof D === 'undefined' || !D.products) return { ok: false, reason: 'D belum dimuat' };
    if (!D.products.find((p) => p.id === productId)) return { ok: false, reason: 'produk_tidak_ditemukan' };
    const key = typeof locationKey === 'string' ? locationKey.trim().toUpperCase() : locationKey;
    if (!INVENTORY_MOVEMENT_LOCATIONS.find((l) => l.key === key)) return { ok: false, reason: 'lokasi_tidak_valid' };
    if (!D.productMovementOverride) D.productMovementOverride = {};
    D.productMovementOverride[productId] = { location: key, ts: Date.now() };
    if (typeof save === 'function') save();
    return { ok: true, location: key };
  },

  // clearManualLocation(productId) — hapus override, balik ke derivasi
  // otomatis (lifecycle transaksi / stok, lihat currentLocation() di atas).
  clearManualLocation(productId) {
    if (typeof D === 'undefined' || !D.productMovementOverride) return { ok: false, reason: 'D belum dimuat' };
    if (D.productMovementOverride[productId]) {
      delete D.productMovementOverride[productId];
      if (typeof save === 'function') save();
    }
    return { ok: true };
  },

  // --- Inventory Transfer (Sesi 243) --------------------------------------
  // Inventory Transfer = rit pemindahan LOKASI barang Magelang ->
  // Pekalongan, BUKAN penjualan. Trip hanya memindahkan lokasi inventory
  // (bukan stok baru, bukan qty baru, bukan penjualan/profit). Barang yang
  // dibawa diambil dari master produk Etalase yang SUDAH ADA (D.products) —
  // nama/berat/dimensi/volume TIDAK pernah diinput ulang di sini, semua
  // dibaca langsung dari D.products tiap dipanggil (satu sumber kebenaran,
  // sama prinsip InventoryEngine/TripEngine). Total PCS/Berat/Volume 100%
  // REUSE TripEngine.packing() (delegasi PERSIS packingCalculator(),
  // cobek-etalase.js) — 0 rumus baru. Record transfer disimpan di
  // D.inventoryTransfers (koleksi baru, TAPI bukan duplikat stok — cuma
  // catatan rit, field qty di dalamnya BUKAN penambahan/pengurangan stok
  // produk). createInventoryTransfer()/receiveTransfer() TIDAK PERNAH
  // menyentuh D.products[idx].stock, TIDAK PERNAH membuat D.transactions/
  // D.piutang — jadi tidak mungkin menghasilkan penjualan/profit.

  // _sanitizeQty(qty) — HELPER VALIDASI TUNGGAL (bagian 1/2, Sesi 265
  // Backend Hardening): satu-satunya tempat yang memutuskan apakah 1 nilai
  // qty transfer VALID. Menolak <=0, NaN, Infinity/-Infinity, null,
  // undefined, string non-angka — balikin `null` kalau tidak valid, atau
  // angka finite > 0 kalau valid. Dipakai SEMUA jalur transfer (validasi
  // backend createInventoryTransfer() di bawah, DAN cart UI
  // addTransferCartItem()) supaya tidak ada 2 aturan qty yang beda.
  _sanitizeQty(qty) {
    const n = typeof qty === 'number' ? qty : parseFloat(qty);
    if (typeof n !== 'number' || Number.isNaN(n) || !Number.isFinite(n) || n <= 0) return null;
    return n;
  },

  // _availableAtSource(productId, fromLocation) — HELPER VALIDASI TUNGGAL
  // (bagian 2/2, Sesi 265): stok yang TERSEDIA DI LOKASI ASAL utk 1 produk
  // (bukan stok global D.products[idx].stock). Dihitung dari stok total
  // produk DIKURANGI seluruh qty yang SUDAH PERNAH berangkat dari lokasi
  // yang sama (`t.from === fromLocation`) — baik yang statusnya masih
  // ON_TRIP maupun yang sudah RECEIVED (keduanya sama2 "sudah tidak ada
  // lagi" di lokasi asal). Reuse D.inventoryTransfers yang SUDAH ADA (S243)
  // sebagai satu-satunya sumber kebenaran posisi barang — 0 field/koleksi
  // baru. Inilah yang mencegah OVER-TRANSFER (qty diminta > yang benar2
  // tersisa di lokasi asal) & DOUBLE-TRANSFER (2 rit berturut-turut dari
  // produk+lokasi yang sama otomatis saling mengurangi kuota, bukan
  // masing2 divalidasi terhadap stok global yang tidak berkurang).
  _availableAtSource(productId, fromLocation) {
    if (typeof D === 'undefined' || !D.products) return 0;
    const product = D.products.find((p) => p.id === productId);
    if (!product) return 0;
    const total = Math.max(0, parseFloat(product.stock) || 0);
    const departed = (D.inventoryTransfers || [])
      .filter((t) => t.from === fromLocation)
      .reduce((sum, t) => sum + (t.items || [])
        .filter((it) => it.productId === productId)
        .reduce((s, it) => s + (parseFloat(it.qty) || 0), 0), 0);
    return Math.max(0, total - departed);
  },

  // _validateTransferRequest(items, from) — HELPER VALIDASI TUNGGAL yang
  // MENYATUKAN _sanitizeQty()+_availableAtSource() di atas, dipakai
  // SATU-SATUNYA titik masuk backend createInventoryTransfer() di bawah
  // (UI selalu lewat createInventoryTransfer() juga — lihat
  // saveTransferFromModal() — jadi validasi backend ini TIDAK BISA
  // dilewati cuma dgn skip UI). Baris dgn productId tak dikenal / qty
  // tidak valid di-SKIP (bukan gagal total — pola konsisten dgn
  // _transferItems() yang sudah ada, "1 baris salah tidak menggagalkan
  // seluruh transfer"). Tapi kalau TOTAL qty valid utk 1 produk (bisa dari
  // beberapa baris sekaligus) MELEBIHI stok yang tersedia di lokasi asal
  // (_availableAtSource) — seluruh permintaan DITOLAK (ok:false, 0 item
  // dibuat), supaya tidak ada transfer parsial yang melanggar invariant
  // "total stok lokasi = stok produk".
  _validateTransferRequest(items, from) {
    const fromLoc = from || 'MAGELANG_STORAGE';
    if (typeof D === 'undefined' || !D.products) return { ok: false, items: [], skipped: [], reason: 'D belum dimuat' };
    const skipped = [];
    const valid = [];
    const requestedByProduct = {};
    (items || []).forEach((it) => {
      const productId = it && it.productId;
      const product = productId ? D.products.find((p) => p.id === productId) : null;
      if (!product) { skipped.push({ productId, reason: 'produk_tidak_ditemukan' }); return; }
      const qty = this._sanitizeQty(it.qty);
      if (qty === null) { skipped.push({ productId, reason: 'qty_tidak_valid' }); return; }
      requestedByProduct[productId] = (requestedByProduct[productId] || 0) + qty;
      valid.push({ productId, qty });
    });
    if (!valid.length) {
      return { ok: false, items: [], skipped, reason: 'Tidak ada item valid (produk harus sudah ada di Etalase & qty harus > 0)' };
    }
    const productIds = Object.keys(requestedByProduct);
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const requested = requestedByProduct[productId];
      const available = this._availableAtSource(productId, fromLoc);
      if (requested > available) {
        return {
          ok: false,
          items: [],
          skipped,
          overTransfer: true,
          productId,
          available,
          requested,
          reason: `Stok tidak cukup di lokasi asal (${fromLoc}) untuk ${productId} — tersedia ${available}, diminta ${requested}`,
        };
      }
    }
    return { ok: true, items: valid, skipped };
  },

  // _transferItems(items) — internal WIRE: dari [{productId,qty}] apa
  // adanya, resolve tiap productId ke master produk Etalase (D.products)
  // yang SUDAH ADA (name/beratPerUnit/panjang/lebar/tinggi) — TIDAK ADA
  // input ulang berat/dimensi/nama, murni baca field yang sudah tersimpan.
  // Item dgn productId yang tidak ditemukan di Etalase di-skip (bukan
  // crash) supaya 1 baris salah tidak menggagalkan seluruh transfer.
  _transferItems(items) {
    if (typeof D === 'undefined' || !D.products) return [];
    return (items || []).map((it) => {
      const p = D.products.find((pr) => pr.id === it.productId);
      if (!p) return null;
      const qty = Math.max(0, parseFloat(it.qty) || 0);
      // Tahap 3 (Generic Shop Engine wiring): baca berat/dimensi lewat
      // ProductStore kalau dimuat (delegasi AttributeStore -> field fisik
      // yg sama), fallback field asli langsung — HASIL SAMA di kedua jalur.
      const dims = (typeof ProductStore !== 'undefined') ? ProductStore.getDimensions(p) : { panjang: p.panjang, lebar: p.lebar, tinggi: p.tinggi };
      const berat = (typeof ProductStore !== 'undefined') ? ProductStore.getWeight(p) : p.beratPerUnit;
      return {
        productId: p.id,
        name: p.name,
        qty,
        beratPerUnit: berat || 0,
        panjang: dims.panjang || 0,
        lebar: dims.lebar || 0,
        tinggi: dims.tinggi || 0,
      };
    }).filter(Boolean);
  },

  // transferTotals(items) — Total PCS/Total Berat/Total Volume dari
  // [{productId,qty}], 100% REUSE TripEngine.packing() (packingCalculator()
  // asli, cobek-etalase.js) atas berat/dimensi yang diambil OTOMATIS dari
  // Etalase lewat _transferItems() di atas — 0 rumus baru, 0 hitung ulang
  // manual. Contoh sesuai spesifikasi: Cobek 20 (20pcs@3kg=60kg) + Cobek 24
  // (15pcs@4kg=60kg) -> totalQty 35 pcs, totalKg 120 kg.
  transferTotals(items) {
    const resolved = this._transferItems(items);
    if (typeof TripEngine === 'undefined') return { ok: false, reason: 'TripEngine belum dimuat', items: resolved };
    const packing = TripEngine.packing({ items: resolved });
    return Object.assign({ items: resolved }, packing, {
      totalPcs: packing.totalQty || 0,
      totalBeratKg: packing.totalKg || 0,
      totalVolumeM3: packing.totalM3 || 0,
    });
  },

  // transferStatus(status) — label tampilan status Transfer dari
  // INVENTORY_TRANSFER_STATUSES (case-insensitive). Pola persis
  // tripStatus() (S239) / statusLabel() (S237) di atas.
  transferStatus(status) {
    const key = typeof status === 'string' ? status.trim().toUpperCase() : status;
    const found = INVENTORY_TRANSFER_STATUSES.find((s) => s.key === key);
    return found ? found.label : (typeof status === 'string' ? status : String(status));
  },

  // createInventoryTransfer({items, from, to}) — buat 1 rit Inventory
  // Transfer: MAGELANG_STORAGE -> ON_TRIP (default from/to sesuai
  // spesifikasi user, bisa dioverride kalau suatu saat perlu rute lain).
  // Barang diambil dari Purchase/Inventory existing (D.products, via
  // _transferItems()) — TIDAK ADA input ulang, TIDAK ADA stok/qty baru
  // dibuat: field `qty` di sini murni CATATAN berapa yang sedang di-rit,
  // BUKAN penambahan D.products[idx].stock (stok TETAP, cuma lokasinya
  // yang "berpindah" secara catatan). Item dgn productId tak dikenal
  // ditolak (validasi reuse master Etalase, bukan re-entry manual).
  createInventoryTransfer({ items, from, to } = {}) {
    if (typeof D === 'undefined') return { ok: false, reason: 'D belum dimuat' };
    if (!D.inventoryTransfers) D.inventoryTransfers = [];
    const fromLoc = from || 'MAGELANG_STORAGE';
    const toLoc = to || 'PEKALONGAN_STORAGE';

    // S265 (Backend Hardening): SATU-SATUNYA titik masuk yang BOLEH
    // menulis D.inventoryTransfers — validasi qty (<=0/NaN/Infinity/null/
    // undefined) & stok LOKASI ASAL (bukan stok global) WAJIB lolos di
    // sini, terlepas dari apa yang sudah/belum dicek di UI (addTransferCartItem()
    // cuma pre-check kenyamanan, BUKAN satu-satunya penjaga — UI bisa
    // di-skip/dilewati lewat pemanggilan langsung, backend tidak boleh
    // percaya begitu saja). Reuse _validateTransferRequest() (helper
    // validasi tunggal, dipakai juga oleh addTransferCartItem()) — 0
    // aturan qty/stok kedua yang berbeda di tempat lain.
    const validation = this._validateTransferRequest(items, fromLoc);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason || 'Tidak ada item valid (produk harus sudah ada di Etalase)', overTransfer: !!validation.overTransfer };
    }

    const resolved = this._transferItems(validation.items);
    if (!resolved.length) return { ok: false, reason: 'Tidak ada item valid (produk harus sudah ada di Etalase)' };

    const totals = this.transferTotals(validation.items);
    const transfer = {
      id: 'transfer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      from: fromLoc,
      to: toLoc,
      status: 'ON_TRIP',
      items: resolved.map((it) => ({ productId: it.productId, qty: it.qty })),
      totalPcs: totals.totalPcs,
      totalBeratKg: totals.totalBeratKg,
      totalVolumeM3: totals.totalVolumeM3,
      createdDate: new Date().toISOString(),
      receivedDate: null,
    };
    D.inventoryTransfers.push(transfer);
    if (typeof save === 'function') save();
    this.render();
    this.renderTab();
    if (typeof toast === 'function') {
      toast(`🚚 Transfer dibuat — ${transfer.totalPcs} pcs / ${transfer.totalBeratKg} kg menuju Pekalongan`);
    }
    return { ok: true, transfer, totals };
  },

  // receiveTransfer(transferId) — Saat Receive Goods: ON_TRIP ->
  // PEKALONGAN_STORAGE. Murni ubah status+receivedDate pada record yang
  // SUDAH ADA (D.inventoryTransfers) — TIDAK PERNAH mengurangi/menambah
  // D.products[idx].stock (stok total tetap, cuma "lokasi" tercatat pindah
  // dari ON_TRIP ke PEKALONGAN_STORAGE lewat status ini, dipakai
  // locationSummary() di bawah).
  // receiveTransfer() (S243, idempotent by design sejak awal — dipanggil
  // 2x pada transfer yg sudah RECEIVED balik ok:true+alreadyReceived:true
  // TANPA menimpa ulang receivedDate) tetap 100% sama di sini (S265 tidak
  // mengubah baris ini). Tambahan SATU-SATUNYA (S265, Orphan Handling):
  // `hasOrphanItems` — deteksi kalau ada item transfer yang produknya
  // SUDAH DIHAPUS dari Etalase (D.products) sebelum transfer diterima.
  // receiveTransfer() TIDAK PERNAH menyentuh D.products[idx].stock, jadi
  // produk yang sudah dihapus TIDAK menyebabkan crash di sini (aman by
  // construction) — field ini murni supaya UI bisa menampilkan
  // peringatan, bukan logic baru yang mengubah alur status ON_TRIP->RECEIVED.
  receiveTransfer(transferId) {
    if (typeof D === 'undefined' || !D.inventoryTransfers) return { ok: false };
    const transfer = D.inventoryTransfers.find((t) => t.id === transferId);
    if (!transfer) return { ok: false, reason: 'Transfer tidak ditemukan' };
    if (transfer.status === 'RECEIVED') return { ok: true, transfer, alreadyReceived: true };
    transfer.status = 'RECEIVED';
    transfer.receivedDate = new Date().toISOString();
    const products = D.products || [];
    const hasOrphanItems = (transfer.items || []).some((it) => !products.some((p) => p.id === it.productId));
    if (typeof save === 'function') save();
    this.render();
    this.renderTab();
    if (typeof toast === 'function') {
      toast(`✅ Barang sampai Pekalongan — ${transfer.totalPcs || 0} pcs diterima${hasOrphanItems ? ' (sebagian produk sudah dihapus dari Etalase)' : ''}`);
    }
    return { ok: true, transfer, hasOrphanItems };
  },

  // transferSummary(transferId) — ringkasan 1 rit Transfer (Status, Items
  // {productId,name,qty}, Total PCS/Berat/Volume, tanggal) — murni baca
  // ulang field yang SUDAH tersimpan, 0 rumus baru.
  transferSummary(transferId) {
    if (typeof D === 'undefined' || !D.inventoryTransfers) return { ok: false };
    const transfer = D.inventoryTransfers.find((t) => t.id === transferId);
    if (!transfer) return { ok: false };
    const found = INVENTORY_TRANSFER_STATUSES.find((s) => s.key === transfer.status);
    const items = transfer.items.map((it) => {
      const p = (D.products || []).find((pr) => pr.id === it.productId);
      // S265: `orphan` — field tambahan (additive, tidak mengubah field
      // lama) menandai produk yang sudah dihapus dari Etalase sesudah
      // transfer dibuat, supaya UI bisa menampilkan tanda tanpa crash.
      return { productId: it.productId, name: p ? p.name : it.productId, qty: it.qty, orphan: !p };
    });
    return {
      ok: true,
      id: transfer.id,
      from: transfer.from,
      to: transfer.to,
      status: transfer.status,
      statusLabel: found ? found.label : transfer.status,
      items,
      totalPcs: transfer.totalPcs || 0,
      totalBeratKg: transfer.totalBeratKg || 0,
      totalVolumeM3: transfer.totalVolumeM3 || 0,
      createdDate: transfer.createdDate,
      receivedDate: transfer.receivedDate,
    };
  },

  // locationSummary() — ringkasan Dashboard 3 lokasi (Magelang Storage/On
  // Trip/Pekalongan Storage) dalam PCS. `onTripQty`/`pekalonganQty` murni
  // dijumlah dari D.inventoryTransfers (qty per item, status ON_TRIP vs
  // RECEIVED) — TIDAK ADA stok/qty baru dihitung. `totalStockQty` dibaca
  // langsung dari D.products (pola sama Etalase.totalModalStok(), cuma
  // qty bukan Rupiah) supaya total selalu balance (Tidak boleh mengurangi
  // stok total): magelangQty = sisa stok yang belum pernah di-rit/sudah
  // kembali "diam" di gudang asal.
  // locationSummary() (S243) — ditambah ORPHAN GUARD (S265): sebelumnya
  // menjumlah SEMUA item transfer apa adanya, termasuk yang productId-nya
  // sudah DIHAPUS dari Etalase (D.products) sesudah transfer dibuat. Itu
  // membuat invariant "magelangQty+onTripQty+pekalonganQty = totalStockQty"
  // (Tidak boleh mengurangi stok total) BISA PECAH: totalStockQty
  // (dijumlah dari D.products yang masih ada) tidak lagi memuat kontribusi
  // produk yang sudah dihapus, tapi onTripQty/pekalonganQty tetap
  // menghitungnya — origin dari mismatch itu. Fix: item dgn productId yang
  // sudah tidak ada di D.products di-SKIP dari onTripQty/pekalonganQty
  // (persis skip yang sudah dipakai _transferItems()/transferSummary()
  // utk kasus sama) — qty-nya dilaporkan terpisah lewat `orphanQty`
  // (field BARU, additive, tidak menghapus/mengubah 4 field lama).
  locationSummary() {
    if (typeof D === 'undefined') return { ok: false };
    const transfers = D.inventoryTransfers || [];
    const products = D.products || [];
    let onTripQty = 0;
    let pekalonganQty = 0;
    let orphanQty = 0;
    transfers.forEach((t) => {
      (t.items || []).forEach((it) => {
        const qty = it.qty || 0;
        const exists = products.some((p) => p.id === it.productId);
        if (!exists) { orphanQty += qty; return; }
        if (t.status === 'ON_TRIP') onTripQty += qty;
        else if (t.status === 'RECEIVED') pekalonganQty += qty;
      });
    });
    const totalStockQty = products.reduce((s, p) => s + (p.stock || 0), 0);
    const magelangQty = Math.max(0, totalStockQty - onTripQty - pekalonganQty);
    return { ok: true, magelangQty, onTripQty, pekalonganQty, totalStockQty, orphanQty };
  },

  // _transferCard(summary) — kartu ke-9 (Inventory Transfer, S243) ke
  // #businessFlowGrid, pola PERSIS _kpiCard()/_decisionCard() di atas.
  // onClick (S251) reuse CARD_NAV_TARGETS[9].
  _transferCard(summary) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[9]] };
    if (!summary || !summary.ok) {
      return { icon: '🚚', label: 'Inventory Transfer', value: 'Belum ada data', cls: '', sub: '', onClick };
    }
    return {
      icon: '🚚',
      label: 'Inventory Transfer',
      value: `Magelang ${summary.magelangQty} · On Trip ${summary.onTripQty} · Pekalongan ${summary.pekalonganQty}`,
      cls: '',
      sub: `Total stok ${summary.totalStockQty} pcs`,
      onClick,
    };
  },

  // --- Inventory Transfer UI (Sesi 244) ----------------------------------
  // UI aksi utk createInventoryTransfer()/receiveTransfer()/
  // transferSummary()/transferStatus()/locationSummary() (S243, di atas)
  // yang sebelumnya BACKEND ONLY (tidak ada tombol/form pemanggilnya).
  // TIDAK ADA logic baru di sini — murni kumpulkan input form lalu
  // delegasi PERSIS ke method yang sudah ada. `_transferCartState` cuma
  // state form sementara (bukan D, tidak disimpan) — pola sama keranjang
  // Order (orderItemList, cobek-order.js).
  _transferCartState: [],

  // openTransferModal() — render chip produk (pola tap-to-add, S374 fix),
  // reset keranjang, buka modal. Origin/Destination sudah punya default di
  // HTML (MAGELANG_STORAGE -> PEKALONGAN_STORAGE, sama default
  // createInventoryTransfer()).
  // FIX s374 (bug laporan T): modal HTML #itProductList sebelumnya cuma
  // <div> kosong tanpa render logic sama sekali (chip-tap belum pernah
  // diimplementasikan — cuma label placeholder), sementara JS lama
  // (openTransferModal()/addTransferCartItem()) menunggu elemen #itProduct
  // (select) & #itQty (input) yang TIDAK ADA di HTML — kombinasi markup
  // vs JS beda kontrak ini yang bikin modal selalu tampil "Belum ada
  // produk ditambahkan" walau sudah ditap. Diganti total ke pola chip:
  // renderTransferProductChips()/tapTransferChip() di bawah.
  openTransferModal() {
    if (typeof document === 'undefined') return;
    this._transferCartState = [];
    this.renderTransferProductChips();
    this._renderTransferCart();
    if (typeof openModal === 'function') openModal('inventoryTransferModal');
  },

  // onTransferOriginChange() — dipanggil dari onchange #itFrom. Ketersediaan
  // stok (_availableAtSource()) itu PER LOKASI ASAL, jadi keranjang yang
  // sudah terisi dari Origin lama bisa jadi tidak valid lagi di Origin baru
  // — keranjang sengaja dikosongkan lagi supaya tidak ada baris "hantu"
  // yang qty-nya sudah tidak match sama stok Origin yang baru dipilih.
  onTransferOriginChange() {
    this._transferCartState = [];
    this.renderTransferProductChips();
    this._renderTransferCart();
  },

  // renderTransferProductChips() (S374) — render #itProductList sbg daftar
  // chip tap-to-add, HANYA produk yang masih ADA SISA STOK di lokasi asal
  // (#itFrom) SETELAH dikurangi qty yang sudah masuk keranjang sementara
  // (_transferCartState) — reuse PERSIS _availableAtSource() (helper
  // validasi tunggal yang sama dipakai backend createInventoryTransfer()),
  // 0 rumus stok baru. Tiap chip menampilkan nama, sisa stok, berat/unit
  // (kg, dari product.beratPerUnit via ProductStore.getWeight() kalau ada)
  // supaya user bisa lihat estimasi berat sebelum tap, dan badge "(Nx)"
  // kalau produk itu sudah ada di keranjang. Multi-select: user bisa tap
  // banyak chip berbeda berturut-turut (setiap tap = 1 produk masuk/nambah
  // di _transferCartState), bukan dibatasi 1 produk per transfer.
  renderTransferProductChips() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('itProductList');
    if (!listEl) return;
    const fromEl = document.getElementById('itFrom');
    const fromLoc = (fromEl && fromEl.value) || 'MAGELANG_STORAGE';
    const products = (typeof D !== 'undefined' && D.products) || [];
    const rows = products.map((p) => {
      const existing = this._transferCartState.find((it) => it.productId === p.id);
      const qtyInCart = existing ? existing.qty : 0;
      const available = this._availableAtSource(p.id, fromLoc);
      const remaining = available - qtyInCart;
      const berat = (typeof ProductStore !== 'undefined') ? ProductStore.getWeight(p) : p.beratPerUnit;
      return { product: p, qtyInCart, remaining, berat: parseFloat(berat) || 0 };
    }).filter((r) => r.remaining > 0 || r.qtyInCart > 0);
    if (!rows.length) {
      listEl.innerHTML = '<div class="u-hint10">Tidak ada produk dengan stok di lokasi asal ini.</div>';
      return;
    }
    listEl.innerHTML = `<div class="u-flex u-gap8" style="flex-wrap:wrap">${rows.map((r) => {
      const disabled = r.remaining <= 0 ? ' disabled style="opacity:.4;cursor:not-allowed"' : '';
      const badge = r.qtyInCart > 0 ? ` <b style="color:var(--accent)">(${r.qtyInCart}x)</b>` : '';
      const beratLabel = r.berat > 0 ? ` · ${r.berat}kg/pcs` : '';
      return `<button type="button" class="chip-btn" data-action="BusinessFlowPresenter.tapTransferChip" data-args='["${r.product.id}"]'${disabled}>${escapeHtml(r.product.name)}${badge} <span class="u-fs11" style="color:var(--text3)">(sisa ${r.remaining}${beratLabel})</span></button>`;
    }).join('')}</div>`;
  },

  // tapTransferChip(productId) (S374) — ketuk chip produk = +1 qty ke
  // _transferCartState (ketuk lagi = +1 lagi, sesuai label modal), qty &
  // cek stok reuse PERSIS _sanitizeQty()/_availableAtSource() (sama
  // helper validasi tunggal yang dipakai createInventoryTransfer() di
  // backend) — supaya UI & backend selalu sepakat 1 aturan yang sama. Ini
  // tetap MURNI pre-check kenyamanan (UX cepat) — createInventoryTransfer()
  // TETAP validasi ulang dari nol saat submit (backend tidak pernah
  // percaya begitu saja ke state cart sisi client ini).
  tapTransferChip(productId) {
    if (typeof document === 'undefined') return;
    const fromEl = document.getElementById('itFrom');
    const fromLoc = (fromEl && fromEl.value) || 'MAGELANG_STORAGE';
    const qty = this._sanitizeQty(1);
    const existing = this._transferCartState.find((it) => it.productId === productId);
    const alreadyInCart = existing ? existing.qty : 0;
    const available = this._availableAtSource(productId, fromLoc);
    if ((alreadyInCart + qty) > available) {
      if (typeof toast === 'function') toast('Stok habis di lokasi asal');
      return;
    }
    if (existing) existing.qty += qty;
    else this._transferCartState.push({ productId, qty });
    this.renderTransferProductChips();
    this._renderTransferCart();
  },

  // removeTransferCartItem(idx) — hapus 1 baris dari keranjang sementara.
  removeTransferCartItem(idx) {
    this._transferCartState.splice(idx, 1);
    this._renderTransferCart();
  },

  // _renderTransferCart() — render daftar keranjang + ringkasan totalnya,
  // ringkasan 100% REUSE transferTotals() (S243, delegasi PERSIS
  // TripEngine.packing()) — 0 rumus baru, sama seperti
  // _transferCard()/locationSummary() di atas.
  _renderTransferCart() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('itCartList');
    const sumEl = document.getElementById('itCartSummary');
    if (listEl) {
      if (!this._transferCartState.length) {
        listEl.innerHTML = '<div class="u-hint10">Belum ada produk ditambahkan.</div>';
      } else {
        const products = (typeof D !== 'undefined' && D.products) || [];
        listEl.innerHTML = this._transferCartState.map((it, idx) => {
          const p = products.find((pr) => pr.id === it.productId);
          const name = p ? p.name : it.productId;
          return `<div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px">
            <div class="u-flex1 u-fs12">${escapeHtml(name)} × ${it.qty}</div>
            <button type="button" class="btn btn-ghost btn-sm" data-action="BusinessFlowPresenter.removeTransferCartItem" data-args="[${idx}]">✕</button>
          </div>`;
        }).join('');
      }
    }
    if (sumEl) {
      if (!this._transferCartState.length) {
        sumEl.innerHTML = 'Belum ada produk ditambahkan.';
      } else {
        const totals = this.transferTotals(this._transferCartState);
        sumEl.innerHTML = `Total PCS: ${totals.totalPcs || 0} · Total Berat: ${(totals.totalBeratKg || 0).toFixed ? totals.totalBeratKg.toFixed(2) : totals.totalBeratKg} kg · Total Volume: ${(totals.totalVolumeM3 || 0).toFixed ? totals.totalVolumeM3.toFixed(3) : totals.totalVolumeM3} m³`;
      }
    }
  },

  // saveTransferFromModal() — baca Origin/Destination + keranjang, delegasi
  // PERSIS createInventoryTransfer() (S243, di atas) — 0 logic baru.
  // createInventoryTransfer() sendiri yang sudah memanggil save()/
  // this.render()/this.renderTab()/toast(), jadi Dashboard & list transfer
  // otomatis ke-refresh tanpa kode sync tambahan di sini.
  saveTransferFromModal() {
    if (typeof document === 'undefined') return;
    const from = document.getElementById('itFrom')?.value || 'MAGELANG_STORAGE';
    const to = document.getElementById('itTo')?.value || 'PEKALONGAN_STORAGE';
    const result = this.createInventoryTransfer({ items: this._transferCartState, from, to });
    if (!result.ok) {
      if (typeof toast === 'function') toast(result.reason || 'Gagal membuat transfer');
      return;
    }
    this._transferCartState = [];
    if (typeof closeModal === 'function') closeModal('inventoryTransferModal');
  },

  // renderTransferList() — daftar transfer aktif (ON_TRIP/RECEIVED) ke
  // #businessFlowTransferList, tiap baris 100% REUSE transferSummary()/
  // transferStatus() (S243) — 0 rumus baru. Dipanggil di akhir render()
  // (di atas) supaya otomatis ikut refresh siklus render() yang sama
  // dgn kartu Purchase/Trip/Stock/Sale/dst — TIDAK ADA wiring sync
  // terpisah utk Inventory Movement/Business Lifecycle/Trip/Dashboard,
  // semua kartu itu sudah dibangun ulang dari D FRESH tiap render() apa
  // adanya (pola yang sama sejak S207-208/S237/S238).
  renderTransferList() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('businessFlowTransferList');
    if (!el) return;
    const transfers = (typeof D !== 'undefined' && D.inventoryTransfers) || [];
    if (!transfers.length) {
      el.innerHTML = '';
      return;
    }
    const rows = transfers.slice().reverse().map((t) => {
      const s = this.transferSummary(t.id);
      if (!s.ok) return '';
      const itemsLabel = s.items.map((it) => `${escapeHtml(it.name)} × ${it.qty}`).join(', ');
      const receiveBtn = (s.status === 'ON_TRIP')
        ? `<button type="button" class="btn btn-sm u-mt6" data-action="BusinessFlowPresenter.receiveTransferFromUI" data-args='["${s.id}"]'>📥 Terima</button>`
        : '';
      return `<div class="findash-card" style="margin-bottom:8px">
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(s.statusLabel)} · ${escapeHtml(s.from)} → ${escapeHtml(s.to)}</div>
          <div class="u-fs12">${itemsLabel}</div>
          <div class="findash-card-sub">${s.totalPcs} pcs · ${s.totalBeratKg} kg</div>
          ${receiveBtn}
        </div>
      </div>`;
    }).join('');
    el.innerHTML = rows;
  },

  // receiveTransferFromUI(transferId) — tombol "📥 Terima" di list, 100%
  // delegasi PERSIS receiveTransfer() (S243) — 0 logic baru. receiveTransfer()
  // sendiri yang sudah memanggil save()/this.render()/this.renderTab(),
  // yang otomatis memanggil renderTransferList() lagi di akhirnya.
  receiveTransferFromUI(transferId) {
    this.receiveTransfer(transferId);
  },

  // --- Purchase Order Batch UI (Sesi 381, PO Multi-Produk) --------------
  // UI aksi utk createPurchaseOrderBatch()/receivePurchaseOrderBatch()/
  // purchaseOrderBatches() di atas. Pola cart 100% MIRIP
  // _transferCartState/openTransferModal()/renderTransferProductChips()/
  // tapTransferChip() (S374, di atas) — cuma beda sumber (semua produk
  // Etalase, bukan dibatasi stok lokasi asal, krn PO ini justru
  // MENAMBAH stok dari Supplier, bukan pindah stok existing).
  // `_purchaseOrderBatchCartState` cuma state form sementara (bukan D,
  // tidak disimpan).
  _purchaseOrderBatchCartState: [],

  // openPurchaseOrderBatchModal() (S381) — reset keranjang, render chip
  // produk, buka modal. Pola sama openTransferModal().
  openPurchaseOrderBatchModal() {
    if (typeof document === 'undefined') return;
    this._purchaseOrderBatchCartState = [];
    const supplierEl = document.getElementById('pobSupplier');
    if (supplierEl) supplierEl.value = '';
    this.renderPurchaseOrderBatchProductChips();
    this._renderPurchaseOrderBatchCart();
    if (typeof openModal === 'function') openModal('purchaseOrderBatchModal');
  },

  // renderPurchaseOrderBatchProductChips() (S381) — render #pobProductList
  // sbg daftar chip tap-to-add SEMUA produk Etalase (tidak dibatasi stok
  // lokasi asal seperti chip Transfer — PO ini justru MENAMBAH stok baru
  // dari Supplier, bukan pindah stok existing). Pola render sama persis
  // renderTransferProductChips(), cuma tanpa filter `remaining`.
  renderPurchaseOrderBatchProductChips() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('pobProductList');
    if (!listEl) return;
    const products = (typeof D !== 'undefined' && D.products) || [];
    if (!products.length) {
      listEl.innerHTML = '<div class="u-hint10">Belum ada produk di Etalase.</div>';
      return;
    }
    listEl.innerHTML = `<div class="u-flex u-gap8" style="flex-wrap:wrap">${products.map((p) => {
      const existing = this._purchaseOrderBatchCartState.find((it) => it.productId === p.id);
      const qtyInCart = existing ? existing.qty : 0;
      const badge = qtyInCart > 0 ? ` <b style="color:var(--accent)">(${qtyInCart}x)</b>` : '';
      return `<button type="button" class="chip-btn" data-action="BusinessFlowPresenter.tapPurchaseOrderBatchChip" data-args='["${p.id}"]'>${escapeHtml(p.name)}${badge}</button>`;
    }).join('')}</div>`;
  },

  // restockCandidatesForBatch() (S382 lanjutan) — daftar SEMUA produk yang
  // direkomendasikan direstock (bukan cuma item[0] paling urgent seperti
  // restockTripCandidate()), 100% REUSE InventoryEngine.restockScan() (yang
  // sendiri delegasi StockRekoWidget.scan()) — 0 rumus baru. Item tanpa
  // product.id atau restockQty<=0 di-skip (pola sama restockPlan() di
  // PurchaseEngine).
  restockCandidatesForBatch() {
    if (typeof InventoryEngine === 'undefined') return [];
    const scan = InventoryEngine.restockScan();
    if (!scan.ok || !scan.items || !scan.items.length) return [];
    return scan.items
      .filter((it) => it && it.product && it.product.id && it.restockQty > 0)
      .map((it) => ({ productId: it.product.id, qty: it.restockQty, productName: it.product.name }));
  },

  // fillPurchaseOrderBatchCartFromRestock() (S382 lanjutan) — tap sekali =
  // isi keranjang PO Multi-Produk sekaligus dari SEMUA kandidat restock
  // (restockCandidatesForBatch() di atas). Produk yang sudah ada di
  // keranjang ditambah qty-nya (bukan ditimpa), pola sama
  // tapPurchaseOrderBatchChip(). Tidak melakukan apa-apa kalau tidak ada
  // kandidat (toast info).
  fillPurchaseOrderBatchCartFromRestock() {
    const candidates = this.restockCandidatesForBatch();
    if (!candidates.length) {
      if (typeof toast === 'function') toast('Tidak ada produk yang stoknya di bawah ambang minimum saat ini');
      return;
    }
    candidates.forEach((c) => {
      const existing = this._purchaseOrderBatchCartState.find((it) => it.productId === c.productId);
      if (existing) existing.qty += c.qty;
      else this._purchaseOrderBatchCartState.push({ productId: c.productId, qty: c.qty });
    });
    this.renderPurchaseOrderBatchProductChips();
    this._renderPurchaseOrderBatchCart();
    if (typeof toast === 'function') toast(`${candidates.length} produk ditambahkan dari rekomendasi stok minimum`);
  },

  // tapPurchaseOrderBatchChip(productId) (S381) — ketuk chip = +1 qty ke
  // _purchaseOrderBatchCartState (ketuk lagi = +1 lagi), pola sama
  // tapTransferChip() cuma tanpa cek stok (PO menambah stok baru, bukan
  // pindah stok existing — createPurchaseOrderBatch() TETAP validasi
  // ulang produk+qty dari nol saat submit).
  tapPurchaseOrderBatchChip(productId) {
    const qty = this._sanitizeQty(1);
    const existing = this._purchaseOrderBatchCartState.find((it) => it.productId === productId);
    if (existing) existing.qty += qty;
    else this._purchaseOrderBatchCartState.push({ productId, qty });
    this.renderPurchaseOrderBatchProductChips();
    this._renderPurchaseOrderBatchCart();
  },

  // removePurchaseOrderBatchCartItem(idx) — hapus 1 baris dari keranjang
  // sementara, pola sama removeTransferCartItem().
  removePurchaseOrderBatchCartItem(idx) {
    this._purchaseOrderBatchCartState.splice(idx, 1);
    this.renderPurchaseOrderBatchProductChips();
    this._renderPurchaseOrderBatchCart();
  },

  // _renderPurchaseOrderBatchCart() — render daftar keranjang + ringkasan
  // total pcs, pola sama _renderTransferCart() (cuma tanpa berat/volume,
  // krn PO tidak dipakai buat kalkulasi rit pengiriman).
  _renderPurchaseOrderBatchCart() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('pobCartList');
    const sumEl = document.getElementById('pobCartSummary');
    if (listEl) {
      if (!this._purchaseOrderBatchCartState.length) {
        listEl.innerHTML = '<div class="u-hint10">Belum ada produk ditambahkan.</div>';
      } else {
        const products = (typeof D !== 'undefined' && D.products) || [];
        listEl.innerHTML = this._purchaseOrderBatchCartState.map((it, idx) => {
          const p = products.find((pr) => pr.id === it.productId);
          const name = p ? p.name : it.productId;
          return `<div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px">
            <div class="u-flex1 u-fs12">${escapeHtml(name)} × ${it.qty}</div>
            <button type="button" class="btn btn-ghost btn-sm" data-action="BusinessFlowPresenter.removePurchaseOrderBatchCartItem" data-args="[${idx}]">✕</button>
          </div>`;
        }).join('');
      }
    }
    if (sumEl) {
      if (!this._purchaseOrderBatchCartState.length) {
        sumEl.innerHTML = 'Belum ada produk ditambahkan.';
      } else {
        const totalProduk = this._purchaseOrderBatchCartState.length;
        const totalPcs = this._purchaseOrderBatchCartState.reduce((s, it) => s + (it.qty || 0), 0);
        const estCost = this._purchaseOrderBatchCartEstimatedCost();
        const estLabel = (estCost > 0) ? ` · Estimasi Biaya: ${this._money(estCost)}` : '';
        sumEl.innerHTML = `Total Produk: ${totalProduk} · Total PCS: ${totalPcs}${estLabel}`;
      }
    }
  },

  // _purchaseOrderBatchCartEstimatedCost() (S382) — perkiraan total modal
  // (Rp) keranjang PO Multi-Produk SEBELUM disimpan, 100% REUSE
  // `PurchaseEngine.estimatedCost()` yang sudah ada (S198) — 0 rumus baru.
  // Mapping cart {productId,qty} -> shape scanResult yang diharapkan
  // PurchaseEngine.restockPlan()/estimatedCost() ({product,restockQty}),
  // item dgn produk tidak ditemukan di-skip (tidak error). Guard
  // `typeof PurchaseEngine` supaya aman kalau modul belum dimuat.
  _purchaseOrderBatchCartEstimatedCost() {
    if (typeof PurchaseEngine === 'undefined') return 0;
    const products = (typeof D !== 'undefined' && D.products) || [];
    const scanResult = this._purchaseOrderBatchCartState
      .map((it) => {
        const product = products.find((pr) => pr.id === it.productId);
        return product ? { product, restockQty: it.qty || 0 } : null;
      })
      .filter(Boolean);
    return PurchaseEngine.estimatedCost(scanResult).totalCost || 0;
  },

  // savePurchaseOrderBatchFromModal() (+supplier S383 lanjutan) — baca
  // keranjang & field Supplier (#pobSupplier, opsional/free-text — bukan
  // master data terpisah), delegasi PERSIS createPurchaseOrderBatch() (di
  // atas) — 0 logic baru. Pola sama saveTransferFromModal().
  savePurchaseOrderBatchFromModal() {
    if (typeof document === 'undefined') return;
    const supplierEl = document.getElementById('pobSupplier');
    const supplier = supplierEl ? supplierEl.value.trim() : '';
    const result = this.createPurchaseOrderBatch({ items: this._purchaseOrderBatchCartState, supplier });
    if (!result.ok) {
      if (typeof toast === 'function') toast(result.reason || 'Gagal membuat PO Multi-Produk');
      return;
    }
    this._purchaseOrderBatchCartState = [];
    if (supplierEl) supplierEl.value = '';
    if (typeof closeModal === 'function') closeModal('purchaseOrderBatchModal');
  },

  // renderPurchaseOrderBatchList() (S381, +pisah aktif/riwayat +supplier
  // S383 lanjutan) — daftar batch PO multi-produk ke
  // #businessFlowPurchaseOrderBatchList, tiap baris 100% REUSE
  // purchaseOrderBatches() (di atas) — 0 rumus baru. Dipanggil di akhir
  // render() (pola sama renderTransferList()) supaya otomatis ikut
  // refresh siklus render() yang sudah ada. Batch dipisah 2 kelompok
  // (aktif = ORDERED, riwayat = RECEIVED, pola sama billArchiveList di
  // Buku Tagihan) — dgn label section HANYA ditampilkan kalau kedua
  // kelompok sama-sama ada isinya, biar tampilan tetap ringkas selama
  // daftar masih pendek (belum perlu archive terpisah/collapsible).
  renderPurchaseOrderBatchList() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('businessFlowPurchaseOrderBatchList');
    if (!el) return;
    const batches = this.purchaseOrderBatches();
    if (!batches.length) {
      el.innerHTML = '';
      return;
    }
    const renderRow = (b) => {
      const itemsLabel = b.items.map((it) => `${escapeHtml(it.name)} × ${it.qty}`).join(', ');
      const statusLabel = b.status === 'RECEIVED' ? '✅ Diterima' : '🧾 Dipesan (belum diterima)';
      const supplierLabel = b.supplier ? `<div class="u-fs12 u-t2">🏭 ${escapeHtml(b.supplier)}</div>` : '';
      const receiveBtn = (b.status === 'ORDERED')
        ? `<button type="button" class="btn btn-sm u-mt6" data-action="BusinessFlowPresenter.receivePurchaseOrderBatchFromUI" data-args='["${b.batchId}"]'>📥 Terima Semua</button>`
        : '';
      return `<div class="findash-card" style="margin-bottom:8px">
        <div class="findash-card-body">
          <div class="findash-card-label">${statusLabel} · ${b.items.length} produk</div>
          ${supplierLabel}
          <div class="u-fs12">${itemsLabel}</div>
          <div class="findash-card-sub">${b.totalPcs} pcs</div>
          ${receiveBtn}
        </div>
      </div>`;
    };
    const active = batches.filter((b) => b.status !== 'RECEIVED');
    const riwayat = batches.filter((b) => b.status === 'RECEIVED');
    const showLabels = active.length > 0 && riwayat.length > 0;
    let html = '';
    if (active.length) {
      html += showLabels ? '<div class="u-fs11 u-t2 u-mb6" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px">🧾 Aktif</div>' : '';
      html += active.map(renderRow).join('');
    }
    if (riwayat.length) {
      html += showLabels ? '<div class="u-fs11 u-t2 u-mb6 u-mt10" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px">📋 Riwayat</div>' : '';
      html += riwayat.map(renderRow).join('');
    }
    el.innerHTML = html;
  },

  // receivePurchaseOrderBatchFromUI(batchId) — tombol "📥 Terima Semua" di
  // list, 100% delegasi PERSIS receivePurchaseOrderBatch() (di atas) — 0
  // logic baru.
  receivePurchaseOrderBatchFromUI(batchId) {
    this.receivePurchaseOrderBatch(batchId);
    this.renderPurchaseOrderBatchList();
  },
};
