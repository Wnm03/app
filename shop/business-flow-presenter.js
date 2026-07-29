// modules/shop/business-flow-presenter.js — Business Flow Presenter
// (Sesi 205). WIRE ONLY: menyusun 4 tahap alur bisnis Shop —
// Purchase -> Trip -> Stock -> Sale — dari 2 presenter yang SUDAH ADA:
// ShopBusinessEnginePresenter.summary() (S199, punya purchase/inventory/
// profit) & TripPresenter.summary() (S204-A, punya trip). TIDAK ADA
// engine baru, TIDAK ADA rumus baru, TIDAK ADA logic bisnis baru — file
// ini murni MEMETAKAN 4 field yang sudah dihitung ke urutan tahap alur,
// pola sama "presenter di atas presenter" seperti CashFlowProjectionAPI
// membungkus FinancialForecastAPI (Sesi 93).
//
// Pemetaan tahap (SEMUA dari fungsi/summary yang sudah ada):
//   Purchase -> ShopBusinessEnginePresenter.summary().purchase
//               (InventoryEngine.restockScan()+PurchaseEngine.estimatedCost(), S198)
//   Trip     -> TripPresenter.summary()
//               (field D.cobek yang sudah tersimpan: delivered/ongkir/marginPct, S204-A)
//   Stock    -> ShopBusinessEnginePresenter.summary().inventory
//               (InventoryEngine.totalModalStok()/totalNilaiJualStok(), S198)
//   Sale     -> ShopBusinessEnginePresenter.summary().profit
//               (ProfitEngine.summarize() atas transaksi ownership SELF, S198/S191)
//
// Dipanggil dari (semua tambahan murni, 0 baris lain diubah):
//   - DashboardHub.render() (dashboard-hub.js) -> render() -> mengisi
//     #businessFlowGrid, persis setelah TripPresenter.render().
//   - renderDashboard() live-wiring (_safeRender, modules/shared/
//     modules-render.js) -> render() lagi, pola sama.
//   - Laporan.renderTab() (modules/shop/cobek-order.js) -> renderTab() ->
//     mengisi #businessFlowBody, persis setelah TripPresenter.renderTab().
// BUSINESS_LIFECYCLE_STATUSES (Sesi 237) — daftar status standar alur
// bisnis, urutan tetap sesuai spesifikasi eksplisit user: DRAFT ->
// PURCHASED -> PICKED_UP -> IN_TRANSIT -> RECEIVED -> READY_FOR_SALE ->
// SOLD -> PACKING -> SHIPPED -> COMPLETED. Ini MURNI daftar tampilan (data
// statis + label Bahasa Indonesia) — TIDAK ADA field D baru yang disimpan,
// TIDAK ADA status/CRUD baru per transaksi. statusLabel()/nextStatus()/
// previousStatus() di bawah semuanya beroperasi murni terhadap array ini
// (0 logic bisnis). lifecycleStatus() (WIRE, bukan CRUD) menurunkan posisi
// SATU transaksi di rantai ini semata dari status yang SUDAH ADA & SUDAH
// dites (orderStatus(), S209-210 — delivered/paid dari D.cobek/D.piutang)
// — tidak menambah field baru, tidak mengubah transaksi lama.
const BUSINESS_LIFECYCLE_STATUSES = Object.freeze([
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PURCHASED', label: 'Purchased' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'READY_FOR_SALE', label: 'Ready For Sale' },
  { key: 'SOLD', label: 'Sold' },
  { key: 'PACKING', label: 'Packing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'COMPLETED', label: 'Completed' },
]);

// INVENTORY_MOVEMENT_LOCATIONS (Sesi 238) — daftar lokasi tracking barang,
// urutan tetap sesuai spesifikasi eksplisit user: SUPPLIER -> MAGELANG_
// STORAGE -> ON_MOTOR -> PEKALONGAN_STORAGE -> PACKING -> SHIPPED ->
// CUSTOMER. Sama pola persis BUSINESS_LIFECYCLE_STATUSES (S237) di atas:
// MURNI daftar tampilan (data statis + label), TIDAK ADA field D baru,
// TIDAK ADA stok baru, TIDAK ADA CRUD baru per produk.
const INVENTORY_MOVEMENT_LOCATIONS = Object.freeze([
  { key: 'SUPPLIER', label: 'Supplier' },
  { key: 'MAGELANG_STORAGE', label: 'Magelang Storage' },
  { key: 'ON_MOTOR', label: 'On Motor' },
  { key: 'PEKALONGAN_STORAGE', label: 'Pekalongan Storage' },
  { key: 'PACKING', label: 'Packing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'CUSTOMER', label: 'Customer' },
]);

// INVENTORY_LIFECYCLE_TO_LOCATION (Sesi 238) — lookup TETAP (bukan
// hitungan/logic baru) yg memetakan tiap status BUSINESS_LIFECYCLE_STATUSES
// (S237) ke 1 lokasi di INVENTORY_MOVEMENT_LOCATIONS. Dipakai currentLocation()
// SUPAYA posisi barang tetap sinkron dgn lifecycle transaksi yg SUDAH ADA
// (lifecycleStatus(), S237, hanya bisa balikin IN_TRANSIT/SOLD/COMPLETED
// dari 2 sinyal delivered/paid yg tersedia) — status lain di tabel ini
// (DRAFT/PURCHASED/dst) disertakan supaya lookup tetap lengkap 1:1 thd
// BUSINESS_LIFECYCLE_STATUSES, walau saat ini cuma 3 yg pernah benar2
// dikembalikan lifecycleStatus().
const INVENTORY_LIFECYCLE_TO_LOCATION = Object.freeze({
  DRAFT: 'SUPPLIER',
  PURCHASED: 'SUPPLIER',
  PICKED_UP: 'MAGELANG_STORAGE',
  IN_TRANSIT: 'ON_MOTOR',
  RECEIVED: 'PEKALONGAN_STORAGE',
  READY_FOR_SALE: 'PEKALONGAN_STORAGE',
  SOLD: 'PACKING',
  PACKING: 'PACKING',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'CUSTOMER',
});

// TRIP_STATUSES (Sesi 239) — daftar status Trip (rit pengiriman), urutan
// tetap sesuai spesifikasi eksplisit user: PLANNED -> LOADING -> READY ->
// ON_TRIP -> ARRIVED -> UNLOADING -> COMPLETED. Sama pola persis
// BUSINESS_LIFECYCLE_STATUSES (S237)/INVENTORY_MOVEMENT_LOCATIONS (S238) di
// atas: MURNI daftar tampilan (data statis + label), TIDAK ADA field D
// baru, TIDAK ADA Trip entity/CRUD baru — tripStatus()/nextTripStatus() di
// bawah semuanya beroperasi murni terhadap array ini (0 logic bisnis).
const TRIP_STATUSES = Object.freeze([
  { key: 'PLANNED', label: 'Planned' },
  { key: 'LOADING', label: 'Loading' },
  { key: 'READY', label: 'Ready' },
  { key: 'ON_TRIP', label: 'On Trip' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'UNLOADING', label: 'Unloading' },
  { key: 'COMPLETED', label: 'Completed' },
]);

// RECEIVE_STATUSES (Sesi 240) — daftar status penerimaan barang per Trip,
// urutan sesuai spesifikasi eksplisit user: NOT_RECEIVED ->
// PARTIALLY_RECEIVED -> FULLY_RECEIVED. Sama pola persis TRIP_STATUSES
// (S239)/BUSINESS_LIFECYCLE_STATUSES (S237)/INVENTORY_MOVEMENT_LOCATIONS
// (S238) di atas: MURNI daftar tampilan (data statis + label). Status
// SEBENARNYA per Trip diturunkan murni dari qty/receivedQty tersimpan di
// item Trip (lihat _receiveStatusOf() di bawah) — 0 engine baru, 0 rumus
// stok baru (stok tetap ditambah lewat receiveGoods() yang SUDAH ADA,
// S207-208).
const RECEIVE_STATUSES = Object.freeze([
  { key: 'NOT_RECEIVED', label: 'Belum Diterima' },
  { key: 'PARTIALLY_RECEIVED', label: 'Diterima Sebagian' },
  { key: 'FULLY_RECEIVED', label: 'Diterima Penuh' },
]);

// PAYMENT_STATUSES (Sesi 241) — daftar status pembayaran per transaksi
// Shop (D.cobek), urutan sesuai spesifikasi eksplisit user: UNPAID ->
// PARTIAL -> PAID. Sama pola persis RECEIVE_STATUSES (S240) di atas:
// MURNI daftar tampilan (data statis + label). Status SEBENARNYA per
// transaksi diturunkan murni dari field yang SUDAH ADA (t.total & Piutang
// terhubung — dp/sisa yang SUDAH dihitung & disimpan Order._saveInner(),
// kw-shop-dp) — lihat paymentStatus()/paymentSummary() di bawah, 0 rumus
// pembayaran baru, 0 duplikat logic Piutang.
const PAYMENT_STATUSES = Object.freeze([
  { key: 'UNPAID', label: 'Belum Dibayar' },
  { key: 'PARTIAL', label: 'Dibayar Sebagian' },
  { key: 'PAID', label: 'Lunas' },
]);

// REALIZATION_STATUSES (Sesi 242) — daftar status Profit Realization per
// transaksi Shop (D.cobek), sesuai spesifikasi eksplisit user: UNREALIZED ->
// REALIZED. Sama pola persis PAYMENT_STATUSES (S241)/RECEIVE_STATUSES (S240)
// di atas: MURNI daftar tampilan (data statis + label). Status SEBENARNYA
// per transaksi diturunkan murni dari orderStatus() yang SUDAH ADA
// (S209-210, delivered/paid dari D.cobek/D.piutang) — lihat profitStatus()
// di bawah, 0 rumus profit baru, 0 duplikat logic ProfitEngine/Piutang.
const REALIZATION_STATUSES = Object.freeze([
  { key: 'UNREALIZED', label: 'Belum Direalisasi' },
  { key: 'REALIZED', label: 'Direalisasi' },
]);

// INVENTORY_TRANSFER_STATUSES (Sesi 243) — daftar status Inventory
// Transfer (rit pemindahan lokasi barang Magelang -> Pekalongan, BUKAN
// penjualan), sesuai spesifikasi eksplisit user: ON_TRIP -> RECEIVED.
// Sama pola persis REALIZATION_STATUSES (S242)/PAYMENT_STATUSES (S241) di
// atas: MURNI daftar tampilan (data statis + label), TIDAK ADA rumus
// bisnis baru. Transfer TIDAK PERNAH mengubah D.products[idx].stock (total
// stok tetap) — cuma memindahkan qty antara 2 lokasi (Magelang<->Pekalongan)
// lewat status ON_TRIP/RECEIVED yang disimpan per-record D.inventoryTransfers.
const INVENTORY_TRANSFER_STATUSES = Object.freeze([
  { key: 'ON_TRIP', label: 'On Trip' },
  { key: 'RECEIVED', label: 'Diterima (Pekalongan)' },
]);

// CARD_NAV_TARGETS (Sesi 250, diperbarui Sesi 251 — Business Flow
// Navigation Consistency) — tujuan navigasi tiap kartu #businessFlowGrid,
// index SEJAJAR array `cards` di render() (0=Purchase..9=Transfer). MURNI
// DATA (0 logic navigasi baru) — format {page,tab,goTo} SAMA PERSIS
// format target FEATURE_REGISTRY (dashboard-hub-registry.js), dieksekusi
// lewat dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js,
// dipakai juga oleh openTripPage() S249 di bawah). Dikonsumsi LANGSUNG
// oleh masing2 _xxxCard() (S251, lihat onClick di tiap card factory di
// bawah) — SAMA PERSIS pola FinanceDashboard._sparepartCards() (finance-
// dashboard.js) yang menempel onClick per-kartu, bukan lewat method+index
// indirection. Index 1 (Trip) SENGAJA tidak dimasukkan di sini — Trip py
// penanganan sendiri (openTripPage(), reuse + fallback DeliveryPlanUI)
// karena ybs juga harus jalan di konteks tanpa dashHubNavigateToFeature.
// 9 kartu lain semuanya menunjuk container yang
// TERVERIFIKASI ADA di index.html/app_production.html (grep manual, 0
// halaman/tab/container baru dibuat):
//   0 Purchase       -> Etalase > Rekomendasi Restock AI (stockRekoWidgetList)
//   2 Stock          -> Etalase > Daftar Produk (productList)
//   3 Sale           -> Riwayat > Riwayat Transaksi (shopList)
//   4 KPI            -> Laporan > Alur Bisnis Shop (businessFlowBody)
//   5 Cost/Pricing   -> sda (belum ada kartu Cost/Pricing berdiri sendiri)
//   6 Load/Transport -> sda (belum ada kartu Load/Transport berdiri sendiri)
//   7 Decision       -> sda (belum ada kartu Decision berdiri sendiri)
//   8 Finance        -> halaman Keuangan (ringkasan finansial lengkap)
//   9 Transfer       -> daftar Transfer di kartu ini sendiri
//     (businessFlowTransferList, sekarang di tab Business Intelligence
//     Shop — sudah ada tombol "Buat Transfer" di kartu ini, klik kartu
//     cuma scroll+highlight ke daftarnya, 0 navigasi baru selain scroll)
//
// BUGFIX (Sesi 264, audit navigasi shop): entri 4-7 SEBELUMNYA menunjuk
// tab:'riwayat', padahal container businessFlowBody sejak Sesi 205 hidup
// di dalam #shopTab-laporan (bukan #shopTab-riwayat) — grep manual
// index.html mengonfirmasi. Entri 9 SEBELUMNYA menunjuk page:
// 'dashboard-hub', padahal container businessFlowTransferList sudah
// DIPINDAH ke #shopTab-bi sejak migrasi Business Intelligence (Sesi 250,
// lihat komentar besar di index.html "BUSINESS INTELLIGENCE (Sesi 250)").
// Akibat sebelumnya: klik kartu KPI/Transfer melempar ke tab/halaman yang
// TIDAK berisi datanya (kartu terlihat "mengarah ke dashboard/tab lain,
// bukan ke datanya sendiri").
const CARD_NAV_TARGETS = Object.freeze({
  0: { page: 'shop', tab: 'etalase', goTo: 'stockRekoWidgetList' },
  2: { page: 'shop', tab: 'etalase', goTo: 'productList' },
  3: { page: 'shop', tab: 'riwayat', goTo: 'shopList' },
  4: { page: 'shop', tab: 'laporan', goTo: 'businessFlowBody' },
  5: { page: 'shop', tab: 'laporan', goTo: 'businessFlowBody' },
  6: { page: 'shop', tab: 'laporan', goTo: 'businessFlowBody' },
  7: { page: 'shop', tab: 'laporan', goTo: 'businessFlowBody' },
  8: { page: 'keuangan' },
  9: { page: 'shop', tab: 'bi', goTo: 'businessFlowTransferList' },
});

const BusinessFlowPresenter = {

  // --- Memoization per render tick (S225-226) -------------------------
  // render()/renderTab() masing2 memanggil flow()/businessKPI()/
  // costPricingKPI()/loadCostKPI()/profitPerTrip()/restockTripCandidate()/
  // aiDecisionSummary()/recommendation() — beberapa dipanggil LEBIH DARI 1x
  // per 1x render (mis. profitPerTrip() dipanggil ulang oleh
  // costPricingKPI()/loadCostKPI()/aiDecisionSummary()/recommendation(),
  // yang semuanya dipanggil lagi di dalam 1x render()) padahal D belum
  // berubah sama sekali di antara panggilan2 itu — murni compute ulang yang
  // sama. _beginTick() dipanggil di awal render()/renderTab() (1 tick = 1
  // render pass) buat reset cache; _memo() dipakai fungsi2 di bawah supaya
  // dalam 1 tick yang sama, panggilan kedua dst tinggal ambil hasil cache
  // (0 recompute) — TIDAK mengubah nilai yang dikembalikan (fungsi2 ini
  // tetap murni terhadap D), cuma menghindari hitung ulang. Di luar tick
  // (dipanggil langsung, mis. dari tests atau ShopInsight.compute()),
  // _cache tidak aktif sehingga tetap compute langsung tiap panggilan —
  // perilaku SAMA PERSIS dgn sebelum ada memoization ini.
  _tick: 0,
  _cache: null,

  _beginTick() {
    this._tick++;
    this._cache = { id: this._tick };
  },

  _memo(key, fn) {
    if (this._cache && this._cache.id === this._tick) {
      if (Object.prototype.hasOwnProperty.call(this._cache, key)) return this._cache[key];
      const val = fn.call(this);
      this._cache[key] = val;
      return val;
    }
    return fn.call(this);
  },

  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },

  // flow() — susun 4 tahap dari summary() presenter yang SUDAH ADA, 0
  // recompute. Dipisah dari render()/renderTab() supaya bisa dites tanpa
  // DOM, pola sama summary() di ShopBusinessEnginePresenter/TripPresenter.
  flow() {
    return this._memo('flow', () => {
      const shop = (typeof ShopBusinessEnginePresenter !== 'undefined')
        ? ShopBusinessEnginePresenter.summary() : { purchase: { ok: false }, inventory: { ok: false }, profit: { ok: false } };
      const trip = (typeof TripPresenter !== 'undefined')
        ? TripPresenter.summary() : { ok: false };

      return {
        purchase: shop.purchase,
        trip,
        stock: shop.inventory,
        sale: shop.profit,
      };
    });
  },

  // render() — 4 kartu findash-card berurutan (Purchase→Trip→Stock→Sale)
  // ke #businessFlowGrid (Dashboard Hub), pola SAMA PERSIS
  // ShopBusinessEnginePresenter.render()/TripPresenter.render().
  render() {
    const el = (typeof document !== 'undefined') ? document.getElementById('businessFlowGrid') : null;
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    this._beginTick(); // S225-226: 1x render() = 1 tick memoization
    const f = this.flow();
    const cards = [
      this._purchaseCard(f.purchase),
      this._tripCard(f.trip),
      this._stockCard(f.stock),
      this._saleCard(f.sale),
      this._kpiCard(this.businessKPI()),
      this._costPricingCard(this.costPricingKPI()),
      this._loadCostCard(this.loadCostKPI()),
      this._decisionCard(this.aiDecisionSummary()),
      this._financeCard(this.decisionDashboard().financeSummary),
      this._transferCard(this.locationSummary()),
    ];
    // S206 (Wire Purchase->Trip): tombol CTA di kartu Purchase HANYA
    // muncul kalau ada kandidat restock nyata (restockTripCandidate()),
    // reuse data-action yang sudah ada (pola sama tombol lain di
    // shop-business-engine-presenter.js/delivery-plan-ui.js) — klik ->
    // planTripForRestock() -> DeliveryPlanUI.open(candidate).
    const candidate = this.restockTripCandidate();

    // S249/S250/S251 (Business Flow Navigation Consistency): SELURUH
    // kartu #businessFlowGrid clickable lewat SATU mekanisme yang SAMA
    // PERSIS dipakai FinanceDashboard.render() (modules/finance/finance-
    // dashboard.js, field "onClick: {action,args}") — tiap kartu carry
    // field `onClick:{action,args}` sendiri (ditempel di masing2
    // _xxxCard() di bawah, reuse CARD_NAV_TARGETS sbg sumber target),
    // lalu template di sini CUMA mengecek `c.onClick` (0 logic navigasi
    // baru di render(), 0 percabangan per-index) — persis pola
    // `c.onClick ? ... : ''` di finance-dashboard.js. openCard(index)
    // (S250, indirection ad-hoc per-index) DIHAPUS sesi ini (S251): 100%
    // digantikan onClick per-kartu supaya 1 pola navigasi konsisten di
    // seluruh codebase, bukan 2 varian (card.onClick vs method+index).
    el.innerHTML = cards.map((c, i) => `
      <div class="findash-card${c.onClick ? ' u-pointer' : ''}"${c.onClick ? ` data-action="${escapeHtml(c.onClick.action)}" data-args="${escapeHtml(JSON.stringify(c.onClick.args))}"` : ''} aria-label="Buka ${escapeHtml(c.label)}">
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
          ${(i === 0 && candidate) ? `<button class="btn btn-sm u-mt6" data-action="BusinessFlowPresenter.planTripForRestock">🚚 Rencanakan Pengiriman</button>
          <button class="btn btn-sm btn-ghost u-mt6" data-action="BusinessFlowPresenter.completeTrip">📦 Barang Sampai (Trip Selesai)</button>` : ''}
          ${(i === 9) ? `<button class="btn btn-sm u-mt6" data-action="BusinessFlowPresenter.openTransferModal">🚚 Buat Transfer</button>` : ''}
        </div>
      </div>
    `).join('');

    // S244: list transfer aktif (ON_TRIP/RECEIVED) + tombol Terima —
    // dipanggil di akhir render() supaya SELALU ikut ke-refresh tiap kali
    // render() dipanggil (termasuk otomatis dari createInventoryTransfer()/
    // receiveTransfer() yang SUDAH memanggil this.render()) — 0 wiring
    // sync tambahan, murni ikut siklus render() yang sudah ada.
    this.renderTransferList();
  },

  // renderTab() — versi ringkas 1 baris per tahap ke #businessFlowBody
  // (tab Laporan/Statistik Shop), pola SAMA PERSIS
  // TripPresenter.renderTab().
  renderTab() {
    const el = (typeof document !== 'undefined') ? document.getElementById('businessFlowBody') : null;
    if (!el) return;

    this._beginTick(); // S225-226: 1x renderTab() = 1 tick memoization
    const f = this.flow();
    const cards = [
      { icon: '🧾', prefix: 'Purchase', card: this._purchaseCard(f.purchase) },
      { icon: '🚚', prefix: 'Trip', card: this._tripCard(f.trip) },
      { icon: '📦', prefix: 'Stock', card: this._stockCard(f.stock) },
      { icon: '📈', prefix: 'Sale', card: this._saleCard(f.sale) },
      { icon: '📊', prefix: 'KPI', card: this._kpiCard(this.businessKPI()) },
      { icon: '💰', prefix: 'Cost/Pricing', card: this._costPricingCard(this.costPricingKPI()) },
      { icon: '🚛', prefix: 'Load/Transport', card: this._loadCostCard(this.loadCostKPI()) },
      { icon: '🧭', prefix: 'Decision', card: this._decisionCard(this.aiDecisionSummary()) },
      { icon: '🩺', prefix: 'Finance', card: this._financeCard(this.decisionDashboard().financeSummary) },
      { icon: '🚚', prefix: 'Inventory Transfer', card: this._transferCard(this.locationSummary()) },
    ];
    // S251 fix: baris di sini SEBELUMNYA cuma <div> teks polos (0
    // data-action/onClick) — beda dgn render() (#businessFlowGrid) yang
    // sudah clickable lewat mekanisme onClick per-kartu. Karena
    // #businessFlowGrid disembunyikan via CSS di Dashboard Hub (lihat
    // komentar dashboard-hub.js "Alur Bisnis Shop DIPINDAH ke tab Shop"),
    // #businessFlowBody (di sini) JUSTRU yang tampil ke user — jadi
    // "tidak bisa diklik" itu benar: baris ini memang belum pernah
    // dikasih data-action. Reuse PERSIS field `onClick:{action,args}`
    // yang tiap kartu SUDAH punya (S251, sama seperti render() di atas),
    // 0 target navigasi baru.
    el.innerHTML = cards.map(({ icon, prefix, card }) => {
      const clickAttrs = card.onClick
        ? ` data-action="${escapeHtml(card.onClick.action)}" data-args="${escapeHtml(JSON.stringify(card.onClick.args))}"`
        : '';
      return `<div class="u-fs12 u-lh15${card.onClick ? ' u-pointer' : ''}"${clickAttrs}>${escapeHtml(`${icon} ${prefix}: ${card.value}`)}</div>`;
    }).join('');
  },

  // restockTripCandidate() — WIRE Purchase->Trip (S206): ambil item
  // restock PALING URGENT dari InventoryEngine.restockScan() (S198,
  // sendiri delegasi PERSIS ke StockRekoWidget.scan(), sudah terurut
  // dari paling urgent) — item[0].product.id/restockQty dipakai APA
  // ADANYA, 0 recompute, 0 rumus baru. Dipisah dari
  // planTripForRestock() supaya bisa dites tanpa DOM.
  restockTripCandidate() {
    return this._memo('restockTripCandidate', () => {
      if (typeof InventoryEngine === 'undefined') return null;
      const scan = InventoryEngine.restockScan();
      if (!scan.ok || !scan.items || !scan.items.length) return null;
      const top = scan.items[0];
      if (!top || !top.product || !top.product.id) return null;
      return { productId: top.product.id, qty: top.restockQty > 0 ? top.restockQty : 1, productName: top.product.name };
    });
  },

  // planTripForRestock() — WIRE Purchase->Trip (S206): buka
  // DeliveryPlanUI (S203) dgn produk & qty PERSIS dari
  // restockTripCandidate(), 0 logic baru — murni oper parameter dari 1
  // engine ke presenter lain yang sudah ada. Dipanggil dari tombol CTA
  // di kartu Purchase (render()).
  planTripForRestock() {
    const candidate = this.restockTripCandidate();
    if (!candidate) return;
    if (typeof DeliveryPlanUI !== 'undefined') DeliveryPlanUI.open(candidate);
  },

  // openTripPage() — WIRE Trip Navigation (Sesi 249): tombol "🚚 Trip" pada
  // kartu Business Flow. TIDAK ADA halaman Trip berdiri sendiri di app
  // ini — Trip SUDAH direpresentasikan oleh TripPresenter (S204-A), yang
  // landing/render-nya ada di 2 tempat: #tripPresenterGrid (tab Shop >
  // Business Intelligence) & #tripPresenterBody (tab Shop > Laporan,
  // lihat komentar "S204-A (Trip Presenter)" di index.html). Sesuai
  // prinsip "jangan buat halaman/modal/engine baru bila sudah ada yang
  // relevan": navigasi di sini 100% REUSE dashHubNavigateToFeature()
  // (dashboard-hub.js) — ke tab Shop > Laporan lalu scroll+flash-highlight
  // ke #tripPresenterBody (landing TripPresenter, container yang SUDAH ADA
  // sejak S204-A). Kalau dashHubNavigateToFeature belum dimuat (mis.
  // dipanggil dari konteks tanpa dashboard-hub.js), fallback ke
  // DeliveryPlanUI.open() (S203, fitur Delivery/Pengiriman yang SUDAH
  // ADA) — 0 halaman/modal/engine baru dibuat di kedua jalur.
  //
  // BUGFIX (Sesi 264, audit navigasi shop): SEBELUMNYA target tab:
  // 'riwayat' — padahal #tripPresenterBody hidup di #shopTab-laporan
  // (grep manual index.html), bukan #shopTab-riwayat. Efeknya klik
  // "🚚 Trip" melempar ke tab Riwayat yang tidak berisi ringkasan Trip.
  openTripPage() {
    if (typeof dashHubNavigateToFeature === 'function') {
      dashHubNavigateToFeature({ page: 'shop', tab: 'laporan', goTo: 'tripPresenterBody' });
      return;
    }
    if (typeof DeliveryPlanUI !== 'undefined' && DeliveryPlanUI.open) DeliveryPlanUI.open();
  },

  // receiveGoods(candidate) — WIRE Trip->Goods Receipt->Stock (S207-208):
  // terima barang utk 1 kandidat restock {productId,qty}, reuse PERSIS
  // formula StockRekoWidget.applyAll() (D.products[idx].stock+=qty,
  // cobek-pricing.js) — cuma versi 1-produk yg sudah ada, dipanggil
  // programatis (tanpa confirm dialog) supaya bisa jadi langkah lanjutan
  // completeTrip() tanpa modal tambahan. 0 rumus baru, 0 field D baru.
  receiveGoods(candidate) {
    if (!candidate || !candidate.productId) return { ok: false };
    if (typeof D === 'undefined' || !D.products) return { ok: false };
    const idx = D.products.findIndex((p) => p.id === candidate.productId);
    if (idx < 0) return { ok: false };
    const qty = candidate.qty > 0 ? candidate.qty : 0;
    D.products[idx].stock = (D.products[idx].stock || 0) + qty;
    if (typeof save === 'function') save();
    if (typeof renderProductList === 'function') renderProductList();
    if (typeof StockRekoWidget !== 'undefined' && StockRekoWidget.render) StockRekoWidget.render();
    // S213-214 (Audit fix): stok berubah di sini tapi ShopInsight (kartu
    // "💡 Insight" — sinyal stok menipis di modules/ai/feature-insights.js)
    // sebelumnya TIDAK ikut disegarkan (gap S207-208), jadi insight bisa
    // basi sesaat setelah barang diterima sampai halaman Etalase dibuka
    // ulang. Reuse render() yang sudah ada, 0 logic baru.
    // S225-226 (defer): ShopInsight.render() men-scan ulang D.products/
    // D.cobek (bisa berat kalau datanya besar) — DIJADWALKAN lewat
    // runDeferredOrNow() yang SUDAH ADA (modules/shared/modules-render.js,
    // rAF->setTimeout 0->langsung, dipakai persis pola sama dgn blok
    // presenter non-inti di renderDashboard()) supaya tidak menahan
    // eksekusi receiveGoods()/completeTrip() yang memanggilnya. Guard
    // typeof: kalau runDeferredOrNow belum dimuat (mis. dipanggil berdiri
    // sendiri tanpa modules-render.js), tetap jalan LANGSUNG-sinkron sama
    // seperti sebelumnya — 0 perubahan urutan/isi utk kasus itu.
    if (typeof ShopInsight !== 'undefined' && ShopInsight.render) {
      if (typeof runDeferredOrNow === 'function') {
        runDeferredOrNow(function () { ShopInsight.render(); });
      } else {
        ShopInsight.render();
      }
    }
    return { ok: true, productId: candidate.productId, qty, newStock: D.products[idx].stock };
  },

  // completeTrip(candidate) — WIRE Trip->Goods Receipt->Stock->Dashboard
  // sync (S207-208): tandai trip restock selesai (barang sudah sampai) ->
  // receiveGoods() -> dashboard di-refresh, SEMUA lewat fungsi yang SUDAH
  // ADA (receiveGoods()/this.render()/this.renderTab()/toast), 0 logic
  // baru. Kalau `candidate` tidak dikasih, pakai restockTripCandidate()
  // (kandidat paling urgent) — pola sama planTripForRestock().
  completeTrip(candidate) {
    const c = candidate || this.restockTripCandidate();
    if (!c) return { ok: false };
    const result = this.receiveGoods(c);
    if (result.ok) {
      this.render();
      this.renderTab();
      if (typeof toast === 'function') toast(`✅ Trip selesai — stok "${c.productName || ''}" +${c.qty}`);
    }
    return result;
  },

  // purchaseStatus() — WIRE Purchase Status (S207-208): status alur
  // restock murni DERIVED dari restockTripCandidate() (S198/S206) — TIDAK
  // ADA state/field D baru yang disimpan. 'pending' = masih ada kandidat
  // restock urgent (trip/goods-receipt belum selesai), 'clear' = sudah
  // tidak ada (stok semua produk aman / barang sudah diterima).
  purchaseStatus() {
    const candidate = this.restockTripCandidate();
    return candidate ? { status: 'pending', candidate } : { status: 'clear', candidate: null };
  },

  // orderStatus(cobekId) — WIRE Delivery->Payment (S209-210): status
  // gabungan {delivered,paid} murni DERIVED dari field D.cobek/D.piutang
  // yang SUDAH ADA (t.delivered dari SiapPulang, t.piutangLinkId ->
  // D.piutang[].lunas dari Order._saveInner/Piutang.save()) — 0 state
  // baru, 0 rumus baru.
  orderStatus(cobekId) {
    if (typeof D === 'undefined' || !D.cobek) return { ok: false };
    const t = D.cobek.find((c) => c.id === cobekId);
    if (!t) return { ok: false };
    const piutang = t.piutangLinkId ? (D.piutang || []).find((p) => p.id === t.piutangLinkId) : null;
    const paid = !piutang || !!piutang.lunas;
    return { ok: true, delivered: t.delivered !== false, paid, piutang };
  },

  // --- Business Lifecycle (Sesi 237) -----------------------------------
  // statusLabel(status) — label tampilan utk 1 status dari
  // BUSINESS_LIFECYCLE_STATUSES (case-insensitive). Balikin `status` apa
  // adanya (fallback tampilan, tidak crash) kalau key tidak dikenali.
  statusLabel(status) {
    const key = typeof status === 'string' ? status.trim().toUpperCase() : status;
    const found = BUSINESS_LIFECYCLE_STATUSES.find((s) => s.key === key);
    return found ? found.label : (typeof status === 'string' ? status : String(status));
  },

  // nextStatus(status) — status berikutnya dalam rantai, atau `null` kalau
  // `status` adalah status terakhir (COMPLETED) atau tidak dikenali. Murni
  // navigasi array BUSINESS_LIFECYCLE_STATUSES, 0 logic bisnis.
  nextStatus(status) {
    const key = typeof status === 'string' ? status.trim().toUpperCase() : status;
    const idx = BUSINESS_LIFECYCLE_STATUSES.findIndex((s) => s.key === key);
    if (idx === -1 || idx === BUSINESS_LIFECYCLE_STATUSES.length - 1) return null;
    return BUSINESS_LIFECYCLE_STATUSES[idx + 1].key;
  },

  // previousStatus(status) — status sebelumnya dalam rantai, atau `null`
  // kalau `status` adalah status pertama (DRAFT) atau tidak dikenali.
  previousStatus(status) {
    const key = typeof status === 'string' ? status.trim().toUpperCase() : status;
    const idx = BUSINESS_LIFECYCLE_STATUSES.findIndex((s) => s.key === key);
    if (idx <= 0) return null;
    return BUSINESS_LIFECYCLE_STATUSES[idx - 1].key;
  },

  // lifecycleStatus(cobekId) — WIRE (bukan CRUD/rumus baru): turunkan posisi
  // 1 transaksi Order di rantai lifecycle SEMATA dari orderStatus() yang
  // SUDAH ADA (S209-210, delivered/paid) — TIDAK ADA field D baru, TIDAK
  // mengubah transaksi lama. Data yang tersedia hari ini cuma 2 sinyal
  // (delivered/paid), jadi pemetaannya sengaja disederhanakan: belum
  // delivered = IN_TRANSIT (masih dalam perjalanan), delivered tapi belum
  // paid = SOLD (sudah terjual, uang belum lunas), delivered & paid =
  // COMPLETED. Tahap lain di rantai (PURCHASED/PICKED_UP/RECEIVED/
  // READY_FOR_SALE/PACKING/SHIPPED) tetap tampil di UI sbg referensi alur
  // standar, tapi highlight-nya mengikuti derivasi ini.
  lifecycleStatus(cobekId) {
    const os = this.orderStatus(cobekId);
    if (!os.ok) return { ok: false };
    if (!os.delivered) return { ok: true, status: 'IN_TRANSIT' };
    if (!os.paid) return { ok: true, status: 'SOLD' };
    return { ok: true, status: 'COMPLETED' };
  },

  // renderLifecycle(cobekId) — isi container '#orderBusinessStatusList'
  // (Detail Order / orderModal) dgn rantai 10 status BUSINESS_LIFECYCLE_
  // STATUSES, highlight status aktif dari lifecycleStatus(cobekId). Guard
  // container/typeof (pola sama presenter render() lain di project ini) ->
  // aman diam2, tidak throw.
  renderLifecycle(cobekId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('orderBusinessStatusList') : null;
    if (!el) return;
    const s = this.lifecycleStatus(cobekId);
    const activeKey = s.ok ? s.status : null;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    el.innerHTML = BUSINESS_LIFECYCLE_STATUSES.map((st, i) => {
      const active = st.key === activeKey;
      const arrow = i < BUSINESS_LIFECYCLE_STATUSES.length - 1 ? '<div class="u-t3" style="text-align:center">↓</div>' : '';
      return `<div class="setting-item" style="padding:6px 0${active ? ';background:var(--accent-soft);border-radius:8px' : ''}">
        <div class="setting-label"${active ? ' style="color:var(--accent);font-weight:800"' : ''}>${active ? '● ' : ''}${esc(st.label)}</div>
      </div>${arrow}`;
    }).join('');
  },

  // --- Inventory Movement (Sesi 238) -----------------------------------
  // INVENTORY_MOVEMENT_LOCATIONS — daftar lokasi barang standar, urutan
  // tetap sesuai spesifikasi eksplisit user: SUPPLIER -> MAGELANG_STORAGE
  // -> ON_MOTOR -> PEKALONGAN_STORAGE -> PACKING -> SHIPPED -> CUSTOMER.
  // MURNI daftar tampilan (0 field D baru, 0 stok baru, 0 CRUD baru per
  // produk) — sama pola persis BUSINESS_LIFECYCLE_STATUSES (S237) di atas.
  // movementLabel()/nextLocation() beroperasi murni terhadap array ini.
  //
  // _LIFECYCLE_TO_LOCATION — lookup tetap (bukan hitungan) yg memetakan tiap
  // status BUSINESS_LIFECYCLE_STATUSES (S237) ke 1 lokasi barang di rantai
  // di atas. Dipakai currentLocation() SUPAYA posisi barang tetap konsisten
  // dgn lifecycle transaksi yg SUDAH ADA (lifecycleStatus(), S237) — TIDAK
  // ADA business logic baru, cuma nama lain / pengelompokan utk status yg
  // sudah didapat.
  currentLocation(productId) {
    if (typeof D === 'undefined' || !D.products) return { ok: false };
    const product = D.products.find((p) => p.id === productId);
    if (!product) return { ok: false };
    const order = this._latestOrderForProduct(productId);
    if (order) {
      const ls = this.lifecycleStatus(order.id);
      if (ls.ok) {
        const loc = INVENTORY_LIFECYCLE_TO_LOCATION[ls.status] || 'PEKALONGAN_STORAGE';
        return { ok: true, location: loc, orderId: order.id };
      }
    }
    // Belum pernah ada transaksi Shop utk produk ini (belum ada order yg
    // memuat productId ini di D.cobek) — fallback derivasi murni dari stok
    // yg SUDAH ADA (product.stock, sama field dipakai InventoryEngine.
    // stockStatus()): ada stok -> dianggap sudah di gudang Pekalongan (siap
    // jual di etalase), belum ada stok -> dianggap masih di Supplier (belum
    // dibeli).
    const stock = (product && parseFloat(product.stock)) || 0;
    return { ok: true, location: stock > 0 ? 'PEKALONGAN_STORAGE' : 'SUPPLIER', orderId: null };
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
  renderMovement(productId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('productMovementList') : null;
    if (!el) return;
    const s = this.currentLocation(productId);
    const activeKey = s.ok ? s.location : null;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    el.innerHTML = INVENTORY_MOVEMENT_LOCATIONS.map((loc, i) => {
      const active = loc.key === activeKey;
      const arrow = i < INVENTORY_MOVEMENT_LOCATIONS.length - 1 ? '<div class="u-t3" style="text-align:center">↓</div>' : '';
      return `<div class="setting-item" style="padding:6px 0${active ? ';background:var(--accent-soft);border-radius:8px' : ''}">
        <div class="setting-label"${active ? ' style="color:var(--accent);font-weight:800"' : ''}>${active ? '● ' : ''}${esc(loc.label)}</div>
      </div>${arrow}`;
    }).join('');
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
      return {
        productId: p.id,
        name: p.name,
        qty,
        beratPerUnit: p.beratPerUnit || 0,
        panjang: p.panjang || 0,
        lebar: p.lebar || 0,
        tinggi: p.tinggi || 0,
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
    const resolved = this._transferItems(items);
    if (!resolved.length) return { ok: false, reason: 'Tidak ada item valid (produk harus sudah ada di Etalase)' };

    const totals = this.transferTotals(items);
    const transfer = {
      id: 'transfer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      from: from || 'MAGELANG_STORAGE',
      to: to || 'PEKALONGAN_STORAGE',
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
  receiveTransfer(transferId) {
    if (typeof D === 'undefined' || !D.inventoryTransfers) return { ok: false };
    const transfer = D.inventoryTransfers.find((t) => t.id === transferId);
    if (!transfer) return { ok: false, reason: 'Transfer tidak ditemukan' };
    if (transfer.status === 'RECEIVED') return { ok: true, transfer, alreadyReceived: true };
    transfer.status = 'RECEIVED';
    transfer.receivedDate = new Date().toISOString();
    if (typeof save === 'function') save();
    this.render();
    this.renderTab();
    if (typeof toast === 'function') toast(`✅ Barang sampai Pekalongan — ${transfer.totalPcs || 0} pcs diterima`);
    return { ok: true, transfer };
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
      return { productId: it.productId, name: p ? p.name : it.productId, qty: it.qty };
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
  locationSummary() {
    if (typeof D === 'undefined') return { ok: false };
    const transfers = D.inventoryTransfers || [];
    let onTripQty = 0;
    let pekalonganQty = 0;
    transfers.forEach((t) => {
      const qty = (t.items || []).reduce((s, it) => s + (it.qty || 0), 0);
      if (t.status === 'ON_TRIP') onTripQty += qty;
      else if (t.status === 'RECEIVED') pekalonganQty += qty;
    });
    const totalStockQty = (D.products || []).reduce((s, p) => s + (p.stock || 0), 0);
    const magelangQty = Math.max(0, totalStockQty - onTripQty - pekalonganQty);
    return { ok: true, magelangQty, onTripQty, pekalonganQty, totalStockQty };
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

  // openTransferModal() — isi <select> produk dari D.products (pola
  // PERSIS DeliveryPlanUI.open()), reset keranjang, buka modal. Origin/
  // Destination sudah punya default di HTML (MAGELANG_STORAGE ->
  // PEKALONGAN_STORAGE, sama default createInventoryTransfer()).
  openTransferModal() {
    if (typeof document === 'undefined') return;
    const prodSel = document.getElementById('itProduct');
    if (prodSel && typeof D !== 'undefined') {
      const inStock = (D.products || []).filter((p) => (parseFloat(p.stock) || 0) > 0);
      prodSel.innerHTML = inStock.length
        ? inStock.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.stock})</option>`).join('')
        : '<option value="">— Tidak ada produk dengan stok —</option>';
    }
    const qtyEl = document.getElementById('itQty');
    if (qtyEl) qtyEl.value = 1;
    this._transferCartState = [];
    this._renderTransferCart();
    if (typeof openModal === 'function') openModal('inventoryTransferModal');
  },

  // addTransferCartItem() — baca #itProduct/#itQty, tambah ke
  // _transferCartState (merge qty kalau produk sudah ada di keranjang).
  // 0 logic baru — cuma kumpulkan input, perhitungan totalnya tetap
  // 100% lewat transferTotals() (delegasi TripEngine.packing()) di
  // _renderTransferCart().
  addTransferCartItem() {
    if (typeof document === 'undefined') return;
    const prodSel = document.getElementById('itProduct');
    const qtyEl = document.getElementById('itQty');
    const productId = prodSel && prodSel.value;
    const qty = Math.max(0, parseFloat(qtyEl && qtyEl.value) || 0);
    if (!productId || qty <= 0) {
      if (typeof toast === 'function') toast('Pilih produk & isi qty dulu');
      return;
    }
    const product = (typeof D !== 'undefined' && (D.products || []).find((p) => p.id === productId)) || null;
    const stock = product ? (parseFloat(product.stock) || 0) : 0;
    const existing = this._transferCartState.find((it) => it.productId === productId);
    const alreadyInCart = existing ? existing.qty : 0;
    if (stock > 0 && (alreadyInCart + qty) > stock) {
      if (typeof toast === 'function') toast(`Stok tidak cukup (tersisa ${stock - alreadyInCart})`);
      return;
    }
    if (existing) existing.qty += qty;
    else this._transferCartState.push({ productId, qty });
    if (qtyEl) qtyEl.value = 1;
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

  // --- Trip Management (Sesi 239) ---------------------------------------
  // Trip = container rit pengiriman barang (S198 TripEngine/S204-A
  // TripPresenter/S203 DeliveryPlanUI yang SUDAH ADA). TIDAK ADA Trip
  // entity/CRUD/field D baru sesi ini — tripStatus()/nextTripStatus() murni
  // navigasi array statis TRIP_STATUSES (pola PERSIS statusLabel()/
  // nextStatus() S237 & movementLabel()/nextLocation() S238 di atas).
  // tripSummary() 100% REUSE TripPresenter.summary() (S204-A, field
  // D.cobek yang sudah tersimpan: delivered/ongkir/marginPct) — 0 rumus
  // baru, sama data yang sudah dipakai flow().trip di atas, cuma titik
  // akses langsung supaya tidak perlu lewat flow() kalau cuma butuh Trip.

  // tripStatus(status) — label tampilan utk 1 status Trip dari
  // TRIP_STATUSES (case-insensitive). Balikin `status` apa adanya
  // (fallback tampilan, tidak crash) kalau key tidak dikenali. Pola persis
  // statusLabel() (S237) / movementLabel() (S238) di atas.
  tripStatus(status) {
    const key = typeof status === 'string' ? status.trim().toUpperCase() : status;
    const found = TRIP_STATUSES.find((s) => s.key === key);
    return found ? found.label : (typeof status === 'string' ? status : String(status));
  },

  // nextTripStatus(status) — status Trip berikutnya dalam rantai, atau
  // `null` kalau `status` adalah status terakhir (COMPLETED) atau tidak
  // dikenali. Murni navigasi array TRIP_STATUSES, 0 logic bisnis. Pola
  // persis nextStatus() (S237) / nextLocation() (S238) di atas.
  nextTripStatus(status) {
    const key = typeof status === 'string' ? status.trim().toUpperCase() : status;
    const idx = TRIP_STATUSES.findIndex((s) => s.key === key);
    if (idx === -1 || idx === TRIP_STATUSES.length - 1) return null;
    return TRIP_STATUSES[idx + 1].key;
  },

  // tripSummary() — ringkasan Trip bulan berjalan, 100% delegasi PERSIS ke
  // TripPresenter.summary() (S204-A) — TIDAK ada hitungan baru di sini,
  // sama sumber angka yang sudah dipakai flow().trip/_tripCard() di atas
  // (satu sumber kebenaran, bukan dihitung ulang di 2 tempat).
  tripSummary() {
    return (typeof TripPresenter !== 'undefined') ? TripPresenter.summary() : { ok: false };
  },

  // --- Receive Goods (Sesi 240) ------------------------------------------
  // Receive Goods = penerimaan barang per Trip (D.cobek + items[] yang
  // SUDAH ADA, S239 Trip Management), bertahap (partial) atau sekaligus
  // (full). Stok TETAP ditambah lewat receiveGoods(candidate) yang SUDAH
  // ADA (S207-208, delegasi PERSIS formula StockRekoWidget.applyAll():
  // D.products[idx].stock += qty) — TIDAK ADA rumus stok baru/duplikat,
  // receiveItem() di bawah cuma memanggil ulang method itu per-item Trip.
  // Satu-satunya state baru yang ditulis: `items[].receivedQty` (progres
  // qty yang sudah diterima per item, supaya "bertahap" bisa dilacak lintas
  // panggilan) & `receiveDate` (kapan terakhir diterima) di objek Trip
  // (D.cobek) itu sendiri — extend field pada record yang SUDAH ADA, BUKAN
  // koleksi/database baru. InventoryEngine (status stok)/BusinessFlowPresenter
  // lain (currentLocation()/lifecycleStatus(), S237-238) semua baca ulang
  // D.products/D.cobek FRESH tiap dipanggil, jadi otomatis ikut sinkron
  // begitu stok/receivedQty berubah di sini — 0 wiring tambahan diperlukan.

  // _receiveStatusOf(trip) — internal WIRE: turunkan status Receive Goods
  // {NOT_RECEIVED,PARTIALLY_RECEIVED,FULLY_RECEIVED} murni dari
  // qty vs receivedQty item Trip yang sudah ada — 0 state baru dibaca,
  // cuma agregasi murni. Pola sama _latestOrderForProduct() (internal,
  // dipakai currentLocation()).
  _receiveStatusOf(trip) {
    const items = (trip && Array.isArray(trip.items)) ? trip.items : [];
    const totalQty = items.reduce((s, it) => s + (it.qty || 0), 0);
    const totalReceived = items.reduce((s, it) => s + Math.min(it.qty || 0, it.receivedQty || 0), 0);
    let key = 'NOT_RECEIVED';
    if (totalQty > 0 && totalReceived >= totalQty) key = 'FULLY_RECEIVED';
    else if (totalReceived > 0) key = 'PARTIALLY_RECEIVED';
    const found = RECEIVE_STATUSES.find((s) => s.key === key);
    return { status: key, statusLabel: found ? found.label : key };
  },

  // receiveItem(cobekId, productId, qty) — terima sebagian/seluruh qty utk
  // 1 item di 1 Trip (D.cobek). `qty` di-clamp ke sisa yang belum diterima
  // (item.qty - item.receivedQty) supaya tidak bisa menerima melebihi yang
  // dibawa (& tidak dobel-nambah stok kalau dipanggil ulang). Stok
  // ditambah via this.receiveGoods() yang SUDAH ADA (0 duplikat logic).
  receiveItem(cobekId, productId, qty) {
    if (typeof D === 'undefined' || !D.cobek) return { ok: false };
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip || !Array.isArray(trip.items)) return { ok: false };
    const item = trip.items.find((it) => it.productId === productId);
    if (!item) return { ok: false };

    const already = item.receivedQty || 0;
    const remaining = Math.max(0, (item.qty || 0) - already);
    const requested = Math.max(0, parseFloat(qty) || 0);
    const actual = Math.min(requested, remaining);

    if (actual > 0) {
      const result = this.receiveGoods({ productId, qty: actual });
      if (!result.ok) return result;
      item.receivedQty = already + actual;
      trip.receiveDate = new Date().toISOString();
      if (typeof save === 'function') save();
    }

    return Object.assign({
      ok: true, cobekId, productId, qtyReceived: actual,
      receivedQty: item.receivedQty || 0, itemQty: item.qty || 0,
    }, this._receiveStatusOf(trip));
  },

  // receiveAll(cobekId) — terima SISA qty semua item di 1 Trip sekaligus,
  // reuse PERSIS receiveItem() per item (0 logic baru) — pola sama
  // completeTrip() yang reuse receiveGoods() di atas.
  receiveAll(cobekId) {
    if (typeof D === 'undefined' || !D.cobek) return { ok: false };
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip || !Array.isArray(trip.items)) return { ok: false };
    const items = trip.items.map((it) => {
      const remaining = Math.max(0, (it.qty || 0) - (it.receivedQty || 0));
      return this.receiveItem(cobekId, it.productId, remaining);
    });
    return Object.assign({ ok: true, cobekId, items }, this._receiveStatusOf(trip));
  },

  // receiveSummary(cobekId) — ringkasan Receive Goods 1 Trip (Trip Number,
  // Items {productId, qty dibawa, qty diterima}, Status, Receive Date) —
  // murni baca ulang field yang SUDAH tersimpan (items[].qty/receivedQty,
  // trip.receiveDate), 0 rumus baru selain _receiveStatusOf() di atas.
  receiveSummary(cobekId) {
    if (typeof D === 'undefined' || !D.cobek) return { ok: false };
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip || !Array.isArray(trip.items)) return { ok: false };
    const items = trip.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      qty: it.qty || 0,
      receivedQty: it.receivedQty || 0,
    }));
    return Object.assign(
      { ok: true, cobekId, items, receiveDate: trip.receiveDate || null },
      this._receiveStatusOf(trip),
    );
  },

  // markPaymentReceived(cobekId) — WIRE Payment->Finance->Dashboard/AI
  // Insight sync (S209-210): tandai piutang terkait order ini LUNAS,
  // reuse PERSIS field `lunas` (sama field yang ditulis Piutang.save()/
  // toggle di piutang-utang.js) — TIDAK ADA rumus/nilai baru, cuma
  // menyalakan flag yang sudah ada + memicu render yang sudah ada.
  markPaymentReceived(cobekId) {
    const status = this.orderStatus(cobekId);
    if (!status.ok || !status.piutang) return { ok: false };
    status.piutang.lunas = true;
    if (typeof save === 'function') save();
    // S213-214 (Audit fix): toggle `lunas` di sini SAMA PERSIS efeknya dgn
    // toggle lewat Piutang.save() (piutang-utang.js) — tapi Piutang.save()
    // JUGA memanggil renderKekayaanBersih()/hitungZakatMaal()/
    // Piutang.renderList(), yang sebelumnya TIDAK ikut dipanggil di sini
    // (gap S209-210). Disamakan supaya kekayaan bersih & zakat maal tetap
    // akurat begitu piutang ditandai lunas lewat Business Flow.
    // S225-226 (dedup side-effect payment): fan-out renderKeuangan/
    // PiutangUtangInsight.render/renderDashboard/renderKekayaanBersih/
    // hitungZakatMaal/Piutang.renderList SEKARANG lewat
    // syncPiutangFinanceViews() (1 helper bersama, cobek-order.js) — blok
    // yang sama persis dipakai Laporan.delete() (cobek-order.js). 0 fungsi
    // dihapus/ditambah/urutan guard berubah, cuma dipindah ke 1 tempat.
    if (typeof syncPiutangFinanceViews === 'function') syncPiutangFinanceViews();
    this.renderTab();
    if (typeof toast === 'function') toast('✅ Pembayaran ditandai lunas');
    return { ok: true, piutangId: status.piutang.id };
  },

  // --- Payment Flow (Sesi 241) --------------------------------------------
  // Payment Flow = sinkronisasi status pembayaran ke Business Lifecycle,
  // 100% derived dari field yang SUDAH ADA: t.total (D.cobek, ditulis
  // Order._saveInner()) & Piutang terhubung (t.piutangLinkId ->
  // D.piutang[].nilai/lunas — nilai piutang = SISA tagihan, sudah
  // dihitung & disimpan sejak kw-shop-dp, cobek-order.js) — 0 rumus
  // pembayaran baru, 0 duplikat logic Piutang/FinanceIntelligence.
  // markPaid() 100% reuse markPaymentReceived() (S209-210) yang SUDAH
  // ADA utk update Piutang+fan-out sync Finance/Dashboard
  // (syncPiutangFinanceViews(), S225-226) — TIDAK ADA logic baru selain
  // pencatatan `paymentDate` (field tambahan pada record D.cobek yang
  // SUDAH ADA, sama prinsip `receiveDate`/S240).

  // paymentStatus(cobekId) — status Payment Flow murni dari orderStatus()
  // (S209-210, delivered/paid dari D.cobek/D.piutang) + t.total/piutang.nilai
  // yang SUDAH tersimpan. paid=true (tidak ada piutang aktif) -> PAID;
  // piutang aktif dgn sisa < total (sudah ada DP) -> PARTIAL; sisa >= total
  // (belum ada DP sama sekali) -> UNPAID.
  paymentStatus(cobekId) {
    const os = this.orderStatus(cobekId);
    if (!os.ok) return { ok: false };
    if (os.paid) return { ok: true, status: 'PAID' };
    const trip = (typeof D !== 'undefined' && D.cobek) ? D.cobek.find((c) => c.id === cobekId) : null;
    const total = (trip && trip.total) || 0;
    const sisa = (os.piutang && os.piutang.nilai) || 0;
    const status = (total > 0 && sisa < total) ? 'PARTIAL' : 'UNPAID';
    return { ok: true, status };
  },

  // markPaid(cobekId) — tandai transaksi LUNAS, 100% delegasi PERSIS ke
  // this.markPaymentReceived() (S209-210, sudah update Piutang.lunas +
  // fan-out syncPiutangFinanceViews()/renderTab()/toast) — TIDAK ADA
  // logic pembayaran baru di sini. Tambahan SATU-SATUNYA: catat
  // `paymentDate` (kapan ditandai lunas) di record Trip (D.cobek) itu
  // sendiri utk field "Payment Date" di UI Payment — field tambahan pada
  // record yang SUDAH ADA, BUKAN koleksi/database baru (sama prinsip
  // `receiveDate`/S240).
  markPaid(cobekId) {
    const result = this.markPaymentReceived(cobekId);
    if (result.ok) {
      const trip = (typeof D !== 'undefined' && D.cobek) ? D.cobek.find((c) => c.id === cobekId) : null;
      if (trip) {
        trip.paymentDate = new Date().toISOString();
        if (typeof save === 'function') save();
      }
      // S242 (Profit Realization sync): payment yang baru saja LUNAS bisa
      // langsung membuat transaksi ini REALIZED kalau barang juga sudah
      // diterima customer — reuse markRealized() apa adanya (no-op kalau
      // belum delivered, ps.status !== 'REALIZED').
      this.markRealized(cobekId);
    }
    return result;
  },

  // paymentSummary(cobekId) — ringkasan Payment 1 transaksi (Status, Total
  // Tagihan, Sudah Dibayar, Sisa Tagihan, Payment Date) — murni baca ulang
  // field yang SUDAH tersimpan (t.total/Piutang.nilai/lunas/paymentDate),
  // 0 rumus baru selain paymentStatus() di atas.
  paymentSummary(cobekId) {
    const os = this.orderStatus(cobekId);
    if (!os.ok) return { ok: false };
    const trip = (typeof D !== 'undefined' && D.cobek) ? D.cobek.find((c) => c.id === cobekId) : null;
    const totalTagihan = (trip && trip.total) || 0;
    const sisaTagihan = (os.piutang && !os.piutang.lunas) ? (os.piutang.nilai || 0) : 0;
    const sudahDibayar = Math.max(0, totalTagihan - sisaTagihan);
    const ps = this.paymentStatus(cobekId);
    const found = PAYMENT_STATUSES.find((s) => s.key === ps.status);
    return {
      ok: true,
      cobekId,
      status: ps.status,
      statusLabel: found ? found.label : ps.status,
      totalTagihan,
      sudahDibayar,
      sisaTagihan,
      paymentDate: (trip && trip.paymentDate) || null,
    };
  },

  // --- Profit Realization & Finance Sync (Sesi 242) -----------------------
  // Profit Realization = penanda 1 transaksi Shop dianggap "REALIZED"
  // (untung sudah benar-benar terwujud, bukan sekadar tercatat) semata saat
  // KEDUA syarat sudah terpenuhi: barang sudah diterima customer
  // (orderStatus().delivered, S209-210, dari t.delivered/SiapPulang) DAN
  // Payment = PAID (orderStatus().paid, S209-210, dari Piutang terhubung —
  // sama sumber PERSIS dgn paymentStatus(), S241). 100% derived, 0 rumus
  // profit baru, 0 duplikat logic Payment/Piutang — profitStatus() cuma
  // menggabungkan 2 sinyal yang SUDAH ADA jadi 1 status Object.freeze()
  // (REALIZATION_STATUSES di atas).
  //
  // markRealized() TIDAK mengubah delivered/paid (itu tetap lewat
  // SiapPulang.markDelivered()/markPaid() yang SUDAH ADA) — satu-satunya
  // tambahan: catat `realizedDate` (field baru pada record D.cobek yang
  // SUDAH ADA, sama prinsip `receiveDate`/S240 & `paymentDate`/S241) begitu
  // profitStatus() sudah REALIZED, lalu SYNC ulang tampilan yang sudah ada
  // (BusinessKPI/Dashboard Business lewat this.render()/this.renderTab(),
  // Finance Summary lewat syncPiutangFinanceViews() yang SUDAH ADA S225-226,
  // Trip Summary lewat TripPresenter.render()/renderTab() yang SUDAH ADA
  // S204-A) — 0 engine baru, 0 hitungan ulang profit (ProfitEngine/
  // FinanceIntelligence dipakai APA ADANYA lewat presenter2 yang sudah
  // memanggilnya).

  // profitStatus(cobekId) — status Profit Realization murni dari
  // orderStatus() (S209-210, delivered/paid) — 0 rumus baru selain
  // menggabungkan 2 boolean yang sudah tersedia jadi 1 status.
  profitStatus(cobekId) {
    const os = this.orderStatus(cobekId);
    if (!os.ok) return { ok: false };
    return { ok: true, status: (os.delivered && os.paid) ? 'REALIZED' : 'UNREALIZED' };
  },

  // markRealized(cobekId) — catat `realizedDate` begitu profitStatus() jadi
  // REALIZED, lalu SYNC Profit Status/Finance Summary/Business KPI/
  // Dashboard Business/Trip Summary — SEMUA lewat fungsi yang SUDAH ADA (0
  // logic baru selain penulisan 1 field tanggal). Idempotent: kalau
  // realizedDate sudah pernah tercatat, tidak ditimpa ulang (sama seperti
  // tanggal transaksi lain di app ini yang sekali tercatat).
  markRealized(cobekId) {
    const ps = this.profitStatus(cobekId);
    if (!ps.ok || ps.status !== 'REALIZED') return { ok: false, reason: ps.ok ? ps.status : 'not_found' };
    if (typeof D === 'undefined' || !D.cobek) return { ok: false };
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip) return { ok: false };
    if (!trip.realizedDate) {
      trip.realizedDate = new Date().toISOString();
      if (typeof save === 'function') save();
    }
    // SYNC (S242): Finance Summary/Business KPI lewat syncPiutangFinanceViews()
    // yang SUDAH ADA (S225-226, dipakai persis sama oleh markPaymentReceived()
    // di atas) — Dashboard Business lewat this.render()/this.renderTab() (S205)
    // — Trip Summary lewat TripPresenter yang SUDAH ADA (S204-A).
    if (typeof syncPiutangFinanceViews === 'function') syncPiutangFinanceViews();
    this.render();
    this.renderTab();
    if (typeof TripPresenter !== 'undefined') {
      if (TripPresenter.render) TripPresenter.render();
      if (TripPresenter.renderTab) TripPresenter.renderTab();
    }
    this.renderProfitSummary(cobekId);
    return { ok: true, cobekId, realizedDate: trip.realizedDate };
  },

  // realizedSummary(cobekId) — ringkasan Profit Summary 1 transaksi (Status,
  // Revenue, Cost, Profit, Margin, Realized Date) — 100% REPACKAGING dari
  // profitPerTrip() (S211-212, field t.total/t.profit yang SUDAH tersimpan)
  // + profitStatus() di atas, 0 rumus baru.
  realizedSummary(cobekId) {
    const ps = this.profitStatus(cobekId);
    if (!ps.ok) return { ok: false };
    const trip = this.profitPerTrip().find((t) => t.id === cobekId);
    if (!trip) return { ok: false };
    const found = REALIZATION_STATUSES.find((s) => s.key === ps.status);
    const cobekTrip = (typeof D !== 'undefined' && D.cobek) ? D.cobek.find((c) => c.id === cobekId) : null;
    return {
      ok: true,
      cobekId,
      status: ps.status,
      statusLabel: found ? found.label : ps.status,
      revenue: trip.omzet,
      cost: trip.cost,
      profit: trip.profit,
      marginPct: trip.marginPct,
      realizedDate: (cobekTrip && cobekTrip.realizedDate) || null,
    };
  },

  // renderProfitSummary(cobekId) — isi container '#orderProfitSummaryList'
  // (Detail Order / orderModal) dgn 6 field Profit Summary (Status/Revenue/
  // Cost/Profit/Margin/Realized Date) dari realizedSummary() di atas. Guard
  // container/typeof (pola sama renderLifecycle()/renderMovement() di atas)
  // -> aman diam2, tidak throw.
  renderProfitSummary(cobekId) {
    const el = (typeof document !== 'undefined') ? document.getElementById('orderProfitSummaryList') : null;
    if (!el) return;
    const s = this.realizedSummary(cobekId);
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    if (!s.ok) { el.innerHTML = ''; return; }
    const rows = [
      ['Status', s.statusLabel],
      ['Revenue', this._money(s.revenue)],
      ['Cost', this._money(s.cost)],
      ['Profit', this._money(s.profit)],
      ['Margin', Math.round(s.marginPct) + '%'],
      ['Realized Date', s.realizedDate ? new Date(s.realizedDate).toLocaleDateString('id-ID') : '—'],
    ];
    el.innerHTML = rows.map(([label, val]) => `<div class="setting-item" style="padding:6px 0">
      <div class="setting-label">${esc(label)}</div>
      <div class="u-fw700">${esc(String(val))}</div>
    </div>`).join('');
  },

  // processReturn(cobekId) — WIRE Return->Refund->Finance->Dashboard/AI
  // Insight sync (S209-210): 100% delegasi ke Laporan.delete(cobekId)
  // yang SUDAH ADA (mengembalikan stok, menghapus catatan keuangan &
  // membersihkan piutang terkait — cobek-order.js) — TIDAK ADA logic
  // baru di sini, murni titik masuk terdokumentasi dari Business Flow
  // supaya Return->Refund konsisten dipanggil lewat presenter yang sama
  // dengan tahap lain (Purchase/Trip/Payment).
  processReturn(cobekId) {
    if (typeof Laporan === 'undefined') return null;
    return Laporan.delete(cobekId);
  },

  // profitPerTrip() — WIRE Profit per Trip (S211-212): daftar untung per
  // transaksi Shop (D.cobek, ownership SELF), 100% dari field yang SUDAH
  // tersimpan (t.total/t.profit/t.ongkir/t.marginPct, ditulis
  // Order._saveInner()) — marginPct fallback pakai ProfitEngine.margin()
  // yang SUDAH ADA (S198) kalau field belum keisi (data lama), 0 rumus
  // baru. `cost` = total-profit (murni pengurangan 2 angka yang sudah
  // ada, sama makna dgn "modal+ongkir" di computeTotals() Order).
  profitPerTrip() {
    return this._memo('profitPerTrip', () => {
      if (typeof D === 'undefined' || !D.cobek) return [];
      const selfFilter = (typeof isCobekOwnershipSelf === 'function') ? isCobekOwnershipSelf : (() => true);
      return D.cobek.filter(selfFilter).map((t) => {
        const omzet = t.total || 0;
        const profit = t.profit || 0;
        const marginPct = (typeof t.marginPct === 'number')
          ? t.marginPct
          : ((typeof ProfitEngine !== 'undefined') ? ProfitEngine.margin(omzet, profit) : 0);
        return {
          id: t.id,
          date: t.date,
          omzet,
          profit,
          ongkir: t.ongkir || 0,
          cost: omzet - profit,
          marginPct,
        };
      });
    });
  },

  // costAllocation(cobekId) — WIRE Cost Allocation (S211-212): pecah
  // "cost" 1 trip (profitPerTrip().cost, = omzet-profit) jadi 2 komponen
  // yang SUDAH tersimpan terpisah — ongkir (t.ongkir) & sisanya modal
  // barang (cost-ongkir) — TIDAK ADA field/rumus baru, murni alokasi ulang
  // 2 angka yang sudah ada supaya kelihatan proporsinya per trip.
  costAllocation(cobekId) {
    const trip = this.profitPerTrip().find((t) => t.id === cobekId);
    if (!trip) return { ok: false };
    const ongkirCost = trip.ongkir;
    const modalCost = Math.max(0, trip.cost - ongkirCost);
    return { ok: true, id: trip.id, totalCost: trip.cost, modalCost, ongkirCost };
  },

  // costPerKg(cobekId) — WIRE Cost Analysis (S215-216): biaya per kg utk 1
  // trip, delegasi PERSIS ke TripEngine.weight() (S198, sendiri delegasi ke
  // weightCalculator() cobek-etalase.js) utk total berat tiap item
  // (product.beratPerUnit x qty, field yg SUDAH ADA di D.products) —
  // costAllocation() (S211-212) dipakai APA ADANYA utk totalCost. TIDAK ADA
  // rumus baru selain pembagian totalCost/totalKg.
  costPerKg(cobekId) {
    const cost = this.costAllocation(cobekId);
    if (!cost.ok) return { ok: false };
    if (typeof D === 'undefined' || !D.cobek) return { ok: false };
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip || !trip.items || !trip.items.length) return { ok: false, reason: 'items tidak ditemukan' };
    let totalKg = 0;
    trip.items.forEach((it) => {
      const product = (D.products || []).find((p) => p.id === it.productId);
      if (product && product.beratPerUnit > 0) {
        const w = (typeof TripEngine !== 'undefined') ? TripEngine.weight({ beratPerUnit: product.beratPerUnit, qty: it.qty }) : null;
        if (w && w.ok) totalKg += w.totalKg;
      }
    });
    if (totalKg <= 0) return { ok: false, reason: 'berat produk belum diisi' };
    return { ok: true, id: cobekId, totalCost: cost.totalCost, totalKg, costPerKg: cost.totalCost / totalKg };
  },

  // costPerProduct(cobekId) — WIRE Cost Analysis (S215-216): pecah modal
  // cost 1 trip per baris produk, 100% dari field yang SUDAH tersimpan di
  // t.items (productId/qty) + D.products[].hargaBeli — TIDAK ADA rumus
  // baru, murni qty x hargaBeli per baris (sama makna dgn modalCost di
  // costAllocation(), cuma dipecah per produk bukan digabung 1 trip).
  costPerProduct(cobekId) {
    if (typeof D === 'undefined' || !D.cobek) return [];
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip || !trip.items) return [];
    return trip.items.map((it) => {
      const product = (D.products || []).find((p) => p.id === it.productId);
      const modalCost = (product ? (product.hargaBeli || 0) : 0) * (it.qty || 0);
      return { productId: it.productId, name: it.name || (product ? product.name : ''), qty: it.qty || 0, modalCost };
    });
  },

  // netProfit(cobekId) — WIRE Cost Analysis (S215-216): untung bersih 1
  // trip, 100% REPACKAGING dari profitPerTrip() (S211-212, field
  // t.profit/t.total yang SUDAH tersimpan) — TIDAK ADA hitungan baru.
  netProfit(cobekId) {
    const trip = this.profitPerTrip().find((t) => t.id === cobekId);
    if (!trip) return { ok: false };
    return { ok: true, id: trip.id, omzet: trip.omzet, cost: trip.cost, netProfit: trip.profit, marginPct: trip.marginPct };
  },

  // minimumSellingPrice(params) — WIRE Pricing Analysis (S215-216): harga
  // jual titik impas (margin 0%), delegasi PERSIS ke
  // ProfitEngine.recommendPrice() (S198, rumus (modal+transport)*(1+margin/100))
  // dgn marginPct dipaksa 0 — 0 rumus baru.
  minimumSellingPrice({ modal, transport } = {}) {
    if (typeof ProfitEngine === 'undefined') return { ok: false };
    return Object.assign({ ok: true }, ProfitEngine.recommendPrice({ modal, transport, marginPct: 0 }));
  },

  // targetMarginPrice(params) — WIRE Pricing Analysis (S215-216): harga
  // jual utk target margin tertentu, delegasi PERSIS ke
  // ProfitEngine.recommendPrice() (S198) — sama fungsi dgn
  // minimumSellingPrice(), cuma marginPct dari pemanggil (bukan dipaksa 0).
  // 0 rumus baru.
  targetMarginPrice({ modal, transport, marginPct } = {}) {
    if (typeof ProfitEngine === 'undefined') return { ok: false };
    return Object.assign({ ok: true }, ProfitEngine.recommendPrice({ modal, transport, marginPct }));
  },

  // priceSimulation(params) — WIRE Pricing Analysis (S215-216): simulasi
  // untung/margin dari 1 harga jual hipotetis, reuse PERSIS
  // ProfitEngine.margin() (S198, rumus revenue>0?(profit/revenue)*100:0)
  // utk marginPct — profit = sellingPrice-modal-transport, sama rumus
  // calculateProfit() (cobek-pricing.js) tanpa perlu D.products/qty (murni
  // parameter). 0 rumus baru.
  priceSimulation({ modal, transport, sellingPrice } = {}) {
    const modalNum = parseFloat(modal) || 0;
    const transportNum = parseFloat(transport) || 0;
    const priceNum = parseFloat(sellingPrice) || 0;
    const cost = modalNum + transportNum;
    const profit = priceNum - cost;
    const marginPct = (typeof ProfitEngine !== 'undefined') ? ProfitEngine.margin(priceNum, profit) : (priceNum > 0 ? (profit / priceNum) * 100 : 0);
    return { ok: true, modal: modalNum, transport: transportNum, sellingPrice: priceNum, cost, profit, marginPct };
  },

  // costPricingKPI() — WIRE Cost/Pricing Analysis KPI (S215-216): ringkasan
  // rata2 cost-per-trip & margin lintas trip bulan ini, 100% REPACKAGING
  // dari profitPerTrip() (S211-212) — TIDAK ADA hitungan baru selain
  // rata-rata sederhana, pola sama businessKPI().
  costPricingKPI() {
    return this._memo('costPricingKPI', () => {
      const trips = this.profitPerTrip();
      if (!trips.length) return { ok: false };
      const avgCostPerTrip = trips.reduce((s, t) => s + t.cost, 0) / trips.length;
      const avgMarginPct = trips.reduce((s, t) => s + t.marginPct, 0) / trips.length;
      const thinMarginCount = trips.filter((t) => t.marginPct > 0 && t.marginPct < 10).length;
      return { ok: true, tripCount: trips.length, avgCostPerTrip, avgMarginPct, thinMarginCount };
    });
  },

  // tripLoadAnalysis(params) — WIRE Trip Load Analysis (S217-218): muatan
  // motor per rit, 100% delegasi ke TripEngine.vehicleCapacity() (S198,
  // sendiri delegasi ke calculateVehicleCapacity()/packingCalculator()) —
  // params sama persis {vehicleId,items,capacityKg,capacityM3,kmPerTrip}.
  // Field di sini murni RENAME dari field yang sudah dihitung
  // (percentUsed->motorLoadPct, totalKg->weightUsedKg, dst), 0 rumus baru.
  tripLoadAnalysis(params) {
    if (typeof TripEngine === 'undefined') return { ok: false, reason: 'TripEngine belum dimuat' };
    const cap = TripEngine.vehicleCapacity(params);
    if (!cap || !cap.ok) return { ok: false, reason: cap ? cap.reason : 'gagal menghitung kapasitas' };
    return {
      ok: true,
      status: cap.status,
      motorLoadPct: cap.percentUsed,
      weightUsedKg: cap.totalKg,
      volumeUsedM3: cap.totalM3,
      remainingKg: cap.sisaKapasitasKg,
      remainingM3: cap.sisaKapasitasM3,
      trips: cap.trips,
    };
  },

  // costPerKm(vehicleId) — WIRE Transportation Cost Analysis (S217-218):
  // biaya BBM per km, delegasi PERSIS ke TripEngine.fuel() (S198, sendiri
  // delegasi ke calculateFuel()->LogisticsEngine.fuel()->estimateRpPerKm())
  // — 0 rumus baru, murni RENAME rpPerKm->costPerKm.
  costPerKm(vehicleId) {
    if (typeof TripEngine === 'undefined') return { ok: false, reason: 'TripEngine belum dimuat' };
    const fuel = TripEngine.fuel(vehicleId);
    if (!fuel || !fuel.ok) return { ok: false, reason: fuel ? fuel.reason : 'data BBM belum cukup' };
    return { ok: true, vehicleId, costPerKm: fuel.rpPerKm, kmPerLiter: fuel.kmPerLiter };
  },

  // fuelCostPerKg(params) — WIRE Transportation Cost Analysis (S217-218):
  // biaya BBM per kg muatan sekali rit, reuse PERSIS
  // TripEngine.vehicleCapacity() (biayaBBMPerTrip & totalKg SUDAH dihitung
  // di sana) — TIDAK ADA rumus baru selain pembagian 2 angka yang sudah ada.
  fuelCostPerKg(params) {
    if (typeof TripEngine === 'undefined') return { ok: false, reason: 'TripEngine belum dimuat' };
    const cap = TripEngine.vehicleCapacity(params);
    if (!cap || !cap.ok) return { ok: false, reason: cap ? cap.reason : 'gagal menghitung kapasitas' };
    if (!cap.biayaBBMPerTrip || !(cap.totalKg > 0)) return { ok: false, reason: 'biaya BBM/berat belum cukup' };
    return { ok: true, biayaBBMPerTrip: cap.biayaBBMPerTrip, totalKg: cap.totalKg, fuelCostPerKg: cap.biayaBBMPerTrip / cap.totalKg };
  },

  // transportCostPerProduct(cobekId) — WIRE Transportation Cost Analysis
  // (S217-218): pecah ongkirCost 1 trip (costAllocation(), S211-212) per
  // baris produk, dialokasikan proporsional ke berat tiap item
  // (TripEngine.weight(), S198, dari product.beratPerUnit x qty yang SUDAH
  // ADA) — sama pola alokasi dgn costPerKg() (S215-216). TIDAK ADA rumus
  // baru selain pembagian proporsional berat.
  transportCostPerProduct(cobekId) {
    const cost = this.costAllocation(cobekId);
    if (!cost.ok) return [];
    if (typeof D === 'undefined' || !D.cobek) return [];
    const trip = D.cobek.find((c) => c.id === cobekId);
    if (!trip || !trip.items || !trip.items.length) return [];
    const weights = trip.items.map((it) => {
      const product = (D.products || []).find((p) => p.id === it.productId);
      let kg = 0;
      if (product && product.beratPerUnit > 0 && typeof TripEngine !== 'undefined') {
        const w = TripEngine.weight({ beratPerUnit: product.beratPerUnit, qty: it.qty });
        if (w && w.ok) kg = w.totalKg;
      }
      return { productId: it.productId, name: it.name || (product ? product.name : ''), qty: it.qty || 0, kg };
    });
    const totalKg = weights.reduce((s, w) => s + w.kg, 0);
    if (totalKg <= 0) {
      // Fallback: tidak ada data berat -> bagi rata per item (0 rumus baru,
      // cuma pembagi berbeda kalau berat belum diisi).
      return weights.map((w) => ({ productId: w.productId, name: w.name, qty: w.qty, transportCost: cost.ongkirCost / weights.length }));
    }
    return weights.map((w) => ({ productId: w.productId, name: w.name, qty: w.qty, transportCost: (w.kg / totalKg) * cost.ongkirCost }));
  },

  // tripEfficiency(cobekId) — WIRE Trip Efficiency (S217-218): rasio omzet
  // terhadap ongkir 1 trip, 100% dari field yang SUDAH tersimpan
  // (profitPerTrip(), S211-212) — TIDAK ADA rumus baru selain pembagian
  // omzet/ongkir (makin tinggi = makin efisien, ongkir kecil relatif omzet).
  tripEfficiency(cobekId) {
    const trip = this.profitPerTrip().find((t) => t.id === cobekId);
    if (!trip) return { ok: false };
    if (!(trip.ongkir > 0)) return { ok: true, id: trip.id, omzetPerOngkir: null, reason: 'ongkir 0' };
    return { ok: true, id: trip.id, omzet: trip.omzet, ongkir: trip.ongkir, omzetPerOngkir: trip.omzet / trip.ongkir };
  },

  // profitAfterTransport(cobekId) — WIRE Profit after Transport (S217-218):
  // alias eksplisit dari netProfit() (S215-216) — t.profit (Order.
  // computeTotals()/calculateProfit(), cobek-order.js/cobek-pricing.js)
  // SUDAH dihitung revenue-modal-ongkir, jadi sudah "profit setelah
  // transport" APA ADANYA — 0 rumus baru, murni nama yang lebih jelas utk
  // kartu Transportation Cost Analysis.
  profitAfterTransport(cobekId) {
    return this.netProfit(cobekId);
  },

  // loadCostKPI() — WIRE Trip Load / Transportation Cost KPI (S217-218):
  // ringkasan rata2 efisiensi (omzet/ongkir) lintas trip bulan ini, 100%
  // REPACKAGING dari profitPerTrip() (S211-212) — TIDAK ADA hitungan baru
  // selain rata-rata sederhana, pola sama costPricingKPI().
  loadCostKPI() {
    return this._memo('loadCostKPI', () => {
      const trips = this.profitPerTrip().filter((t) => t.ongkir > 0);
      if (!trips.length) return { ok: false };
      const ratios = trips.map((t) => t.omzet / t.ongkir);
      const avgOmzetPerOngkir = ratios.reduce((s, r) => s + r, 0) / ratios.length;
      const inefficientCount = ratios.filter((r) => r < 3).length;
      return { ok: true, tripCount: trips.length, avgOmzetPerOngkir, inefficientCount };
    });
  },

  // decisionDashboard() — WIRE Business Decision Dashboard (S221-222): satu
  // pintu masuk gabungan 6 ringkasan yang SUDAH ADA — Trip (flow().trip,
  // S205) + Cost (costPricingKPI(), S215-216) + Profit (flow().sale, S205)
  // + Stock (flow().stock, S205) + Delivery (loadCostKPI(), S217-218) +
  // Finance (FinanceIntelligence.summary(), S74, guard typeof kalau modul
  // Finance belum dimuat) — TIDAK ADA hitungan baru, murni REPACKAGING,
  // pola sama businessKPI()/costPricingKPI() di atas.
  decisionDashboard() {
    const f = this.flow();
    return {
      tripSummary: f.trip,
      costSummary: this.costPricingKPI(),
      profitSummary: f.sale,
      stockSummary: f.stock,
      deliverySummary: this.loadCostKPI(),
      financeSummary: (typeof FinanceIntelligence !== 'undefined') ? FinanceIntelligence.summary() : { ok: false },
    };
  },

  // aiDecisionSummary() — WIRE Business Decision Dashboard / AI Summary
  // (S221-222): Biggest Cost/Highest Profit/Lowest Margin murni cari
  // max/min dari profitPerTrip() (S211-212, field yang sudah tersimpan) —
  // Action Recommendation = recommendation() (S211-212/S215-216/S217-218)
  // APA ADANYA, satu sumber sama dgn kartu "💡 Insight" AI Insight (0
  // duplikasi rule, 0 hitungan baru selain reduce max/min sederhana).
  aiDecisionSummary() {
    return this._memo('aiDecisionSummary', () => {
      const trips = this.profitPerTrip();
      if (!trips.length) return { ok: false, actionRecommendation: this.recommendation() };
      const biggestCost = trips.reduce((max, t) => (t.cost > max.cost ? t : max), trips[0]);
      const highestProfit = trips.reduce((max, t) => (t.profit > max.profit ? t : max), trips[0]);
      const lowestMargin = trips.reduce((min, t) => (t.marginPct < min.marginPct ? t : min), trips[0]);
      return {
        ok: true,
        biggestCost,
        highestProfit,
        lowestMargin,
        actionRecommendation: this.recommendation(),
      };
    });
  },

  // businessKPI() — WIRE Business KPI / Dashboard KPI (S211-212): satu
  // ringkasan KPI lintas-tahap, 100% REPACKAGING dari presenter yang
  // SUDAH ADA — flow() (Purchase/Trip/Stock/Sale, S205) + purchaseStatus()
  // (S207-208) + TripPresenter.summary() (S204-A) — TIDAK ADA hitungan
  // baru, cuma menyusun field yang sudah dihitung jadi 1 objek KPI datar
  // supaya gampang dipakai kartu Dashboard/AI Insight tanpa masing2
  // manggil presenter terpisah.
  businessKPI() {
    return this._memo('businessKPI', () => {
      const f = this.flow();
      const purchase = this.purchaseStatus();
      const sale = f.sale;
      const trip = f.trip;
      return {
        omzetBulanIni: (sale && sale.ok) ? sale.omzet : 0,
        untungBulanIni: (sale && sale.ok) ? sale.untung : 0,
        marginPctBulanIni: (sale && sale.ok) ? sale.marginPct : 0,
        tripBulanIni: (trip && trip.ok) ? trip.trips : 0,
        thinMarginTripCount: (trip && trip.ok) ? trip.thinMarginCount : 0,
        totalOngkirBulanIni: (trip && trip.ok) ? trip.totalOngkir : 0,
        purchaseStatus: purchase.status,
      };
    });
  },

  // recommendation() — WIRE AI Recommendation (S211-212): rekomendasi
  // teks murni DERIVED dari businessKPI() (0 hitungan baru) — dipakai
  // ShopInsight.compute() (feature-insights.js) supaya kartu "💡 Insight"
  // Shop ikut menyuarakan sinyal Business Flow, satu sumber angka sama
  // persis dgn kartu Dashboard KPI.
  recommendation() {
    return this._memo('recommendation', () => this._recommendationCompute());
  },

  // _recommendationCompute() — badan asli recommendation() (S211-222), TIDAK
  // ADA logic yang berubah, cuma dipisah dari wrapper _memo() di atas.
  _recommendationCompute() {
    const kpi = this.businessKPI();
    const out = [];
    if (kpi.purchaseStatus === 'pending') {
      out.push({ id: 'bkpi-restock', level: 'warning', icon: '🧾', text: 'Ada produk yang perlu direstock — cek kartu Purchase di Business Flow.' });
    }
    if (kpi.thinMarginTripCount > 0) {
      out.push({ id: 'bkpi-thin-margin', level: 'warning', icon: '🚚', text: `${kpi.thinMarginTripCount} pengiriman bulan ini margin-nya tipis — cek ongkir/harga jualnya.` });
    }
    if (kpi.tripBulanIni > 0 && kpi.marginPctBulanIni > 0 && kpi.thinMarginTripCount === 0 && kpi.purchaseStatus === 'clear') {
      out.push({ id: 'bkpi-sehat', level: 'good', icon: '✅', text: `Alur bisnis Shop sehat bulan ini — margin rata-rata ${Math.round(kpi.marginPctBulanIni)}%, stok aman.` });
    }
    // S215-216 (Cost/Pricing Analysis): sinyal tambahan dari costPricingKPI()
    // — biaya rata2/trip yang sudah dihitung (0 hitungan baru di sini).
    const cp = this.costPricingKPI();
    if (cp.ok && cp.thinMarginCount > 0) {
      out.push({ id: 'bkpi-cost-thin', level: 'warning', icon: '💰', text: `${cp.thinMarginCount} trip dgn margin di bawah 10% — cek harga jual vs cost/trip (Cost Analysis).` });
    }
    // S217-218 (Trip Load / Transportation Cost Analysis): sinyal tambahan
    // dari loadCostKPI() — rasio omzet/ongkir yang sudah dihitung (0
    // hitungan baru di sini).
    const lc = this.loadCostKPI();
    if (lc.ok && lc.inefficientCount > 0) {
      out.push({ id: 'bkpi-load-inefficient', level: 'warning', icon: '🚛', text: `${lc.inefficientCount} trip dgn ongkir relatif besar dibanding omzet — cek muatan/rute (Transportation Cost Analysis).` });
    }
    // S221-222 (Business Decision Dashboard): sinyal trip margin terendah,
    // 100% dari profitPerTrip() (S211-212) — dihitung langsung di sini
    // (bukan lewat aiDecisionSummary(), supaya tidak rekursi balik ke
    // recommendation() lewat actionRecommendation), 0 hitungan baru.
    const allTrips = this.profitPerTrip();
    if (allTrips.length) {
      const lowest = allTrips.reduce((min, t) => (t.marginPct < min.marginPct ? t : min), allTrips[0]);
      if (lowest.marginPct < 10) {
        out.push({ id: 'bkpi-decision-lowest-margin', level: 'warning', icon: '🧭', text: `Trip margin terendah bulan ini ${Math.round(lowest.marginPct)}% — cek Business Decision Dashboard utk detail.` });
      }
    }
    return out;
  },

  // _purchaseCard(p) — p = flow().purchase = ShopBusinessEnginePresenter
  // summary().purchase, dipakai APA ADANYA (0 recompute). onClick (S251)
  // reuse CARD_NAV_TARGETS[0], pola SAMA PERSIS FinanceDashboard.
  // _sparepartCards() (finance-dashboard.js).
  _purchaseCard(p) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[0]] };
    if (!p || !p.ok) return { icon: '🧾', label: 'Purchase', value: 'Belum ada rekomendasi', cls: '', sub: '', onClick };
    if (p.itemCount === 0) return { icon: '🧾', label: 'Purchase', value: 'Stok semua produk aman', cls: '', sub: '', onClick };
    return {
      icon: '🧾',
      label: 'Purchase',
      value: `${p.itemCount} produk direstock`,
      cls: 'red',
      sub: `Estimasi modal ${this._money(p.totalCost)} (${p.totalQty} pcs)`,
      onClick,
    };
  },

  // _tripCard(t) — t = flow().trip = TripPresenter.summary(), dipakai APA
  // ADANYA (0 recompute). onClick (S251) delegasi ke openTripPage() (S249,
  // reuse dashHubNavigateToFeature + fallback DeliveryPlanUI) — bukan
  // dashHubNavigateToFeature langsung krn Trip butuh fallback tsb.
  _tripCard(t) {
    const onClick = { action: 'BusinessFlowPresenter.openTripPage', args: [] };
    if (!t || !t.ok || t.trips === 0) return { icon: '🚚', label: 'Trip', value: 'Belum ada pengiriman', cls: '', sub: '', onClick };
    return {
      icon: '🚚',
      label: 'Trip',
      value: `${t.trips} pengiriman`,
      cls: t.thinMarginCount > 0 ? 'red' : '',
      sub: `Total ongkir ${this._money(t.totalOngkir)}`,
      onClick,
    };
  },

  // _stockCard(inv) — inv = flow().stock = ShopBusinessEnginePresenter
  // summary().inventory, dipakai APA ADANYA (0 recompute). onClick (S251)
  // reuse CARD_NAV_TARGETS[2].
  _stockCard(inv) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[2]] };
    if (!inv || !inv.ok) return { icon: '📦', label: 'Stock', value: '—', cls: '', sub: 'InventoryEngine belum dimuat', onClick };
    return {
      icon: '📦',
      label: 'Stock',
      value: this._money(inv.totalModal),
      cls: '',
      sub: `Estimasi nilai jual ${this._money(inv.totalNilaiJual)}`,
      onClick,
    };
  },

  // _saleCard(pr) — pr = flow().sale = ShopBusinessEnginePresenter
  // summary().profit, dipakai APA ADANYA (0 recompute). onClick (S251)
  // reuse CARD_NAV_TARGETS[3].
  _saleCard(pr) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[3]] };
    if (!pr || !pr.ok) return { icon: '📈', label: 'Sale', value: '—', cls: '', sub: 'ProfitEngine belum dimuat', onClick };
    if (pr.trip === 0) return { icon: '📈', label: 'Sale', value: 'Belum ada transaksi', cls: '', sub: '', onClick };
    return {
      icon: '📈',
      label: 'Sale',
      value: Math.round(pr.marginPct) + '%',
      cls: '',
      sub: `Omzet ${this._money(pr.omzet)} · Untung ${this._money(pr.untung)}`,
      onClick,
    };
  },

  // _kpiCard(kpi) — kpi = businessKPI(), dipakai APA ADANYA (0 recompute).
  // Kartu ke-5 (Dashboard KPI, S211-212) yang merangkum lintas-tahap jadi
  // 1 angka utama (jumlah trip bulan ini) + sub margin/status restock.
  // onClick (S251) reuse CARD_NAV_TARGETS[4].
  _kpiCard(kpi) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[4]] };
    if (!kpi || kpi.tripBulanIni === 0) {
      return { icon: '📊', label: 'KPI Bulan Ini', value: 'Belum ada trip', cls: '', sub: kpi && kpi.purchaseStatus === 'pending' ? 'Ada produk perlu direstock' : '', onClick };
    }
    return {
      icon: '📊',
      label: 'KPI Bulan Ini',
      value: `${kpi.tripBulanIni} trip · margin ${Math.round(kpi.marginPctBulanIni)}%`,
      cls: (kpi.thinMarginTripCount > 0 || kpi.purchaseStatus === 'pending') ? 'red' : '',
      sub: `Untung ${this._money(kpi.untungBulanIni)}${kpi.purchaseStatus === 'pending' ? ' · perlu restock' : ''}`,
      onClick,
    };
  },

  // _costPricingCard(kpi) — kpi = costPricingKPI(), dipakai APA ADANYA (0
  // recompute). Kartu ke-6 (Cost Analysis / Pricing Analysis, S215-216)
  // yang merangkum rata2 cost per trip & margin lintas trip.
  // onClick (S251) reuse CARD_NAV_TARGETS[5].
  _costPricingCard(kpi) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[5]] };
    if (!kpi || !kpi.ok) {
      return { icon: '💰', label: 'Cost/Pricing', value: 'Belum ada trip', cls: '', sub: '', onClick };
    }
    return {
      icon: '💰',
      label: 'Cost/Pricing',
      value: `Cost/trip ${this._money(kpi.avgCostPerTrip)}`,
      cls: kpi.thinMarginCount > 0 ? 'red' : '',
      sub: `Margin rata-rata ${Math.round(kpi.avgMarginPct)}%${kpi.thinMarginCount > 0 ? ` · ${kpi.thinMarginCount} trip margin tipis` : ''}`,
      onClick,
    };
  },

  // _loadCostCard(kpi) — kpi = loadCostKPI(), dipakai APA ADANYA (0
  // recompute). Kartu ke-7 (Trip Load Analysis / Transportation Cost
  // Analysis, S217-218) yang merangkum rata2 efisiensi ongkir lintas trip.
  // onClick (S251) reuse CARD_NAV_TARGETS[6].
  _loadCostCard(kpi) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[6]] };
    if (!kpi || !kpi.ok) {
      return { icon: '🚛', label: 'Load/Transport', value: 'Belum ada data', cls: '', sub: '', onClick };
    }
    return {
      icon: '🚛',
      label: 'Load/Transport',
      value: `Omzet/Ongkir ${kpi.avgOmzetPerOngkir.toFixed(1)}x`,
      cls: kpi.inefficientCount > 0 ? 'red' : '',
      sub: kpi.inefficientCount > 0 ? `${kpi.inefficientCount} trip ongkirnya relatif besar` : 'Efisiensi ongkir sehat',
      onClick,
    };
  },

  // _decisionCard(ds) — ds = aiDecisionSummary(), dipakai APA ADANYA (0
  // recompute). Kartu ke-8 (Business Decision Dashboard, S221-222) yang
  // menyoroti trip margin terendah (sinyal paling actionable) + jumlah
  // rekomendasi aktif dari recommendation().
  // onClick (S251) reuse CARD_NAV_TARGETS[7].
  _decisionCard(ds) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[7]] };
    if (!ds || !ds.ok) {
      return { icon: '🧭', label: 'Decision', value: 'Belum ada trip', cls: '', sub: '', onClick };
    }
    return {
      icon: '🧭',
      label: 'Decision',
      value: `Margin terendah ${Math.round(ds.lowestMargin.marginPct)}%`,
      cls: ds.lowestMargin.marginPct < 10 ? 'red' : '',
      sub: `Cost terbesar ${this._money(ds.biggestCost.cost)} · Untung terbesar ${this._money(ds.highestProfit.profit)}`,
      onClick,
    };
  },

  // _financeCard(fs) — fs = decisionDashboard().financeSummary
  // (FinanceIntelligence.summary(), S74), dipakai APA ADANYA (0 recompute).
  // Kartu ke-9 (Business Decision Dashboard, S221-222) — SATU-SATUNYA dari
  // 6 ringkasan decisionDashboard() yang belum pernah dirender ke mana pun
  // sebelum sesi ini (Trip/Cost/Profit/Stock/Delivery sudah tampil lewat
  // _tripCard/_costPricingCard/_saleCard/_stockCard/_loadCostCard di atas).
  // onClick (S251) reuse CARD_NAV_TARGETS[8].
  _financeCard(fs) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGETS[8]] };
    if (!fs || !fs.healthScore) {
      return { icon: '🩺', label: 'Finance', value: 'Belum ada data', cls: '', sub: '', onClick };
    }
    const hs = fs.healthScore;
    return {
      icon: '🩺',
      label: 'Finance',
      value: `Skor Kesehatan ${hs.score}/100`,
      cls: hs.score < 60 ? 'red' : '',
      sub: hs.label,
      onClick,
    };
  },

};

if (typeof window !== 'undefined') {
  window.BusinessFlowPresenter = BusinessFlowPresenter;
}
