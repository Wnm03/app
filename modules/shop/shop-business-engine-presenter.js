// modules/shop/shop-business-engine-presenter.js — Shop Business Engine
// Presenter (Sesi 199, Finalisasi Integrasi Shop). Target sesi: audit
// menemukan PurchaseEngine/TripEngine/InventoryEngine/ProfitEngine (S198,
// modules/shop/*-engine.js) sudah lengkap + ada test, tapi TIDAK PERNAH
// dipanggil dari file render/presenter manapun — belum ada UI sama sekali
// (gap yang sama seperti PropertyManagementAPI di S102, ditutup di Sesi
// 132 lewat PropertyManagementPresenter). File ini menutup gap itu untuk
// Shop, pola SAMA PERSIS PropertyManagementPresenter.render()
// (modules/asset/property-management-presenter.js): UI hanya presenter,
// container findash-grid generik yang sama.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// InventoryEngine/PurchaseEngine/ProfitEngine (S198) — TIDAK ada rumus
// baru, TIDAK menghitung ulang margin/stok/restock apa pun, TIDAK
// membaca D langsung kecuali D.cobek/D.products (dioper sbg parameter ke
// engine, persis kontrak engine-nya). TripEngine (S198) tidak dipakai di
// sini — tidak ada ringkasan "pengiriman" yang relevan ditampilkan di
// Dashboard/Laporan (murni kalkulator per-transaksi, dipakai langsung di
// form Order/Kasir sesuai desain aslinya).
//
// Ownership Engine (S191, disinkronkan Sesi 194 ke Laporan/Statistik/
// Grafik/Dashboard/AI Insight Shop): agregat omzet/untung Shop di sini
// HANYA menghitung transaksi ownership SELF, reuse isCobekOwnershipSelf()
// (modules/shared/ownership-engine.js) — guard typeof supaya fallback
// aman (anggap SELF) kalau ownership-engine.js belum dimuat, PERSIS pola
// yang sama dipakai ShopInsight/Laporan (cobek-order.js) sejak S194. 0
// baris logic ownership yang diubah di sini.
//
// Dipanggil dari (semua tambahan murni, 0 baris lain diubah):
//   - DashboardHub.render() (dashboard-hub.js) -> render() -> mengisi
//     #shopBusinessEngineGrid (Dashboard Hub, index.html/
//     app_production.html), pola sama DanaKelolaanPresenter.render().
//   - renderDashboard() live-wiring (_safeRender, modules/shared/
//     modules-render.js) -> render() lagi, supaya kartu tetap live-update
//     kalau user simpan data dari halaman lain (pola sama
//     PropertyManagementPresenter di blok _safeRender yang sama).
//   - Laporan.renderTab() (modules/shop/cobek-order.js) -> renderTab() ->
//     mengisi #shopBizEngineBody (tab Laporan/Statistik Shop), pola sama
//     DanaKelolaanPresenter.renderStatistik() (dipanggil dari fungsi yang
//     sama, baris setelahnya).
//
// Navigasi silang: dipakai juga oleh ShopInsight (modules/ai/
// feature-insights.js, AI Insight) lewat summary() yang SAMA (satu sumber
// angka, bukan dihitung ulang di 2 tempat) — item insight barunya
// memakai action {page:'shop', navIdx:2} SAMA PERSIS pola action item
// ShopInsight lain (mis. 'shop-stok-menipis').
// SHOP_ENGINE_NAV_TARGETS (Sesi 251, Business Flow Navigation Consistency) —
// tujuan navigasi tiap kartu #shopBusinessEngineGrid. MURNI DATA (0 logic
// navigasi baru), format {page,tab,goTo} SAMA PERSIS format target
// FEATURE_REGISTRY (dashboard-hub-registry.js) & CARD_NAV_TARGETS di
// business-flow-presenter.js (container yang SAMA dipakai kartu Stock/
// Purchase/Sale di sana — TIDAK ADA container baru dibuat), dieksekusi
// lewat dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js).
const SHOP_ENGINE_NAV_TARGETS = Object.freeze({
  inventory: { page: 'shop', tab: 'etalase', goTo: 'productList' },
  purchase: { page: 'shop', tab: 'etalase', goTo: 'stockRekoWidgetList' },
  profit: { page: 'shop', tab: 'riwayat', goTo: 'shopList' },
});

const ShopBusinessEnginePresenter = {

  // _money(n) — helper format, fallback kalau fmt() belum dimuat (pola
  // sama _money-style helper di PropertyManagementPresenter).
  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },

  // _selfFilter() — reuse isCobekOwnershipSelf (S191/S194); fallback
  // fungsi yang selalu true (anggap SELF) kalau ownership-engine.js belum
  // dimuat, PERSIS pola guard yang sama dipakai ShopInsight.compute().
  _selfFilter() {
    return (typeof isCobekOwnershipSelf === 'function') ? isCobekOwnershipSelf : (() => true);
  },

  // summary() — ringkasan murni (TIDAK menyentuh DOM), 100% reuse
  // InventoryEngine/PurchaseEngine/ProfitEngine (S198). Dipisah dari
  // render()/renderTab() supaya bisa dites tanpa DOM & dipakai ulang oleh
  // AI Insight (ShopInsight) tanpa duplikasi hitungan.
  summary() {
    const products = (typeof D !== 'undefined' && D.products) || [];
    const cobek = (typeof D !== 'undefined' && D.cobek) || [];

    // Inventory: nilai stok tertanam (modal & estimasi jual), 100% reuse
    // InventoryEngine.totalModalStok()/totalNilaiJualStok() (S198, sendiri
    // delegasi PERSIS ke Etalase.totalModalStok()/totalNilaiJualStok()).
    let inventory = { ok: false };
    if (typeof InventoryEngine !== 'undefined') {
      inventory = {
        ok: true,
        totalModal: InventoryEngine.totalModalStok(products),
        totalNilaiJual: InventoryEngine.totalNilaiJualStok(products),
      };
    }

    // Purchase: rencana restock dari StockRekoWidget.scan() (via
    // InventoryEngine.restockScan()) + estimasi modal (via
    // PurchaseEngine.estimatedCost()) — 100% reuse S198, 0 rumus baru.
    let purchase = { ok: false };
    if (typeof InventoryEngine !== 'undefined' && typeof PurchaseEngine !== 'undefined') {
      const scan = InventoryEngine.restockScan();
      if (scan.ok) {
        const est = PurchaseEngine.estimatedCost(scan.items);
        purchase = { ok: true, itemCount: est.itemCount, totalQty: est.totalQty, totalCost: est.totalCost };
      }
    }

    // Profit: omzet/untung/margin bulan berjalan, HANYA transaksi
    // ownership SELF (pola Sesi 194) — 100% reuse ProfitEngine.summarize().
    let profit = { ok: false };
    if (typeof ProfitEngine !== 'undefined') {
      const now = new Date();
      const m = now.getMonth();
      const y = now.getFullYear();
      const selfFilter = this._selfFilter();
      const cobThis = cobek
        .filter((t) => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; })
        .filter(selfFilter);
      profit = Object.assign({ ok: true }, ProfitEngine.summarize(cobThis));
    }

    return { inventory, purchase, profit };
  },

  // render() — 3 kartu findash-card ke #shopBusinessEngineGrid (Dashboard
  // Hub), PERSIS struktur PropertyManagementPresenter.render().
  render() {
    const el = (typeof document !== 'undefined') ? document.getElementById('shopBusinessEngineGrid') : null;
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    const s = this.summary();
    const cards = [
      this._inventoryCard(s.inventory),
      this._purchaseCard(s.purchase),
      this._profitCard(s.profit),
    ];

    // S251 (Business Flow Navigation Consistency): kartu clickable lewat
    // field `onClick:{action,args}` per-kartu (ditempel di masing2
    // _xxxCard() di bawah) — SAMA PERSIS mekanisme FinanceDashboard.
    // render() (modules/finance/finance-dashboard.js) & BusinessFlow
    // Presenter.render() (business-flow-presenter.js, S251) — reuse
    // data-action + dashHubNavigateToFeature() yang SUDAH ADA, 0 pola
    // navigasi baru.
    el.innerHTML = cards.map((c) => `
      <div class="findash-card${c.onClick ? ' u-pointer' : ''}"${c.onClick ? ` data-action="${escapeHtml(c.onClick.action)}" data-args="${escapeHtml(JSON.stringify(c.onClick.args))}"` : ''}>
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  // renderTab() — versi ringkas 2 baris teks ke #shopBizEngineBody (tab
  // Laporan/Statistik Shop, cobek-order.js), pola SAMA PERSIS
  // DanaKelolaanPresenter.renderStatistik() (baris #lapDanaKelolaan).
  renderTab() {
    const el = (typeof document !== 'undefined') ? document.getElementById('shopBizEngineBody') : null;
    if (!el) return;

    const s = this.summary();
    if (!s.purchase.ok && !s.inventory.ok) {
      el.innerHTML = '<div class="u-fs12 u-t2">Business Engine belum tersedia</div>';
      return;
    }

    const restockLine = s.purchase.ok
      ? `${s.purchase.itemCount} produk perlu direstock · estimasi modal ${this._money(s.purchase.totalCost)}`
      : 'Belum ada rekomendasi restock';
    const stokLine = s.inventory.ok
      ? `Nilai stok (modal) ${this._money(s.inventory.totalModal)} · estimasi nilai jual ${this._money(s.inventory.totalNilaiJual)}`
      : '';

    el.innerHTML = `<div class="u-fs12 u-lh15">${escapeHtml(restockLine)}</div>${stokLine ? `<div class="u-fs12 u-t2 u-lh15 u-mt4">${escapeHtml(stokLine)}</div>` : ''}`;
  },

  // _inventoryCard(inv) — inv = summary().inventory, dipakai APA ADANYA
  // (totalModal/totalNilaiJual — 0 recompute, dari InventoryEngine).
  // onClick (S251) reuse SHOP_ENGINE_NAV_TARGETS.inventory.
  _inventoryCard(inv) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [SHOP_ENGINE_NAV_TARGETS.inventory] };
    if (!inv.ok) return { icon: '📦', label: 'Nilai Stok Shop', value: '—', cls: '', sub: 'InventoryEngine belum dimuat', onClick };
    return {
      icon: '📦',
      label: 'Nilai Stok Shop',
      value: this._money(inv.totalModal),
      cls: '',
      sub: `Estimasi nilai jual ${this._money(inv.totalNilaiJual)}`,
      onClick,
    };
  },

  // _purchaseCard(p) — p = summary().purchase, dipakai APA ADANYA
  // (itemCount/totalQty/totalCost — 0 recompute, dari
  // InventoryEngine.restockScan() + PurchaseEngine.estimatedCost()).
  // onClick (S251) reuse SHOP_ENGINE_NAV_TARGETS.purchase.
  _purchaseCard(p) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [SHOP_ENGINE_NAV_TARGETS.purchase] };
    if (!p.ok) return { icon: '🧾', label: 'Rencana Restock', value: 'Belum ada rekomendasi', cls: '', sub: '', onClick };
    if (p.itemCount === 0) return { icon: '🧾', label: 'Rencana Restock', value: 'Stok semua produk aman', cls: '', sub: '', onClick };
    return {
      icon: '🧾',
      label: 'Rencana Restock',
      value: `${p.itemCount} produk`,
      cls: 'red',
      sub: `Estimasi modal ${this._money(p.totalCost)} (${p.totalQty} pcs)`,
      onClick,
    };
  },

  // _profitCard(pr) — pr = summary().profit, dipakai APA ADANYA
  // (trip/omzet/untung/marginPct — 0 recompute, dari
  // ProfitEngine.summarize() atas transaksi ownership SELF bulan ini).
  // onClick (S251) reuse SHOP_ENGINE_NAV_TARGETS.profit.
  _profitCard(pr) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [SHOP_ENGINE_NAV_TARGETS.profit] };
    if (!pr.ok) return { icon: '📈', label: 'Margin Shop Bulan Ini', value: '—', cls: '', sub: 'ProfitEngine belum dimuat', onClick };
    if (pr.trip === 0) return { icon: '📈', label: 'Margin Shop Bulan Ini', value: 'Belum ada transaksi', cls: '', sub: '', onClick };
    return {
      icon: '📈',
      label: 'Margin Shop Bulan Ini',
      value: Math.round(pr.marginPct) + '%',
      cls: '',
      sub: `Omzet ${this._money(pr.omzet)} · Untung ${this._money(pr.untung)} · ${pr.trip} transaksi (SELF)`,
      onClick,
    };
  },

};
