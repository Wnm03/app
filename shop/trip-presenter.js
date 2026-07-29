// modules/shop/trip-presenter.js — Trip Presenter (Sesi 204-A). Menutup
// gap yang dicatat eksplisit di shop-business-engine-presenter.js:
// "TripEngine (S198) tidak dipakai di sini — tidak ada ringkasan
// 'pengiriman' yang relevan ditampilkan di Dashboard/Laporan". Sesi 203
// sudah menghubungkan TripEngine ke UI per-transaksi (DeliveryPlanUI),
// file ini menutup sisi AGREGAT-nya: Dashboard, Laporan, & AI hook.
//
// PRINSIP: UI HANYA presenter, 100% REUSE field yang SUDAH tersimpan di
// D.cobek (ongkir/delivered/marginPct — field ini sudah ada sejak
// Sesi 6/9, TIDAK ada field D baru sesi ini) & reuse
// getAIDeliveryThinMarginThreshold() (cobek-pricing.js, Sesi 9). TIDAK
// ada rumus baru — cuma agregasi bulan berjalan atas data yang sudah
// tersimpan, pola SAMA PERSIS ShopBusinessEnginePresenter.summary().
//
// Dipanggil dari (semua tambahan murni, 0 baris lain diubah):
//   - DashboardHub.render() (dashboard-hub.js) -> render() -> mengisi
//     #tripPresenterGrid, persis setelah ShopBusinessEnginePresenter.render().
//   - renderDashboard() live-wiring (_safeRender, modules/shared/
//     modules-render.js) -> render() lagi, pola sama.
//   - Laporan.renderTab() (modules/shop/cobek-order.js) -> renderTab() ->
//     mengisi #tripPresenterBody, persis setelah
//     ShopBusinessEnginePresenter.renderTab().
//   - ShopInsight.compute() (modules/ai/feature-insights.js) -> AI hook
//     baru 'shop-trip-thin-margin', 100% reuse summary() (satu sumber
//     angka, bukan dihitung ulang di 2 tempat).
// CARD_NAV_TARGET (Sesi 251, Business Flow Navigation Consistency) —
// tujuan navigasi kartu #tripPresenterGrid. MURNI DATA (0 logic navigasi
// baru), format {page,tab,goTo} SAMA PERSIS target yang dipakai
// BusinessFlowPresenter.openTripPage() (business-flow-presenter.js, S249)
// ke container yang SAMA (#tripPresenterBody, TIDAK ADA container baru),
// dieksekusi lewat dashHubNavigateToFeature() yang SUDAH ADA
// (dashboard-hub.js).
//
// BUGFIX (Sesi 264, audit navigasi shop — sama pola dgn kasus Finance
// Dashboard Sesi 263): SEBELUMNYA tab:'riwayat' — padahal
// #tripPresenterBody hidup di #shopTab-laporan (grep manual index.html),
// bukan #shopTab-riwayat. Efeknya klik kartu Trip melempar ke tab Riwayat
// yang tidak berisi ringkasan Trip-nya.
const CARD_NAV_TARGET = Object.freeze({ page: 'shop', tab: 'laporan', goTo: 'tripPresenterBody' });

const TripPresenter = {

  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },

  // _selfFilter() — reuse isCobekOwnershipSelf (S191/S194), pola SAMA
  // PERSIS ShopBusinessEnginePresenter._selfFilter().
  _selfFilter() {
    return (typeof isCobekOwnershipSelf === 'function') ? isCobekOwnershipSelf : (() => true);
  },

  // summary() — ringkasan pengiriman bulan berjalan (TIDAK menyentuh
  // DOM), murni membaca ulang field yang SUDAH tersimpan di D.cobek
  // (delivered/ongkir/marginPct) — 0 rumus baru. Dipisah dari
  // render()/renderTab() supaya bisa dites tanpa DOM & dipakai ulang
  // oleh AI hook tanpa duplikasi hitungan.
  summary() {
    const cobek = (typeof D !== 'undefined' && D.cobek) || [];
    if (!cobek.length) return { ok: false };

    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const selfFilter = this._selfFilter();
    const thinThreshold = (typeof getAIDeliveryThinMarginThreshold === 'function')
      ? getAIDeliveryThinMarginThreshold() : 10;

    const deliveredThis = cobek
      .filter((t) => t && t.delivered)
      .filter((t) => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; })
      .filter(selfFilter);

    if (!deliveredThis.length) {
      return { ok: true, trips: 0, totalOngkir: 0, avgMarginPct: null, thinMarginCount: 0, thinThreshold };
    }

    const totalOngkir = deliveredThis.reduce((s, t) => s + (t.ongkir || 0), 0);
    const withMargin = deliveredThis.filter((t) => typeof t.marginPct === 'number');
    const avgMarginPct = withMargin.length
      ? withMargin.reduce((s, t) => s + t.marginPct, 0) / withMargin.length
      : null;
    const thinMarginCount = withMargin.filter((t) => t.marginPct < thinThreshold).length;

    return {
      ok: true,
      trips: deliveredThis.length,
      totalOngkir,
      avgMarginPct,
      thinMarginCount,
      thinThreshold,
    };
  },

  // getAIHook() — wrapper tipis ke summary(), pola sama
  // VehicleDashboard.getAIHook()/FinanceDashboard.getAIHook() (Sesi
  // 75/77): satu titik akses generik kalau suatu saat dibutuhkan
  // Daily Briefing/ai-chat.js (belum diwiring ke sana sesi ini — di
  // luar scope S204-A, sama seperti kandidat lama VehicleAIHook).
  getAIHook() {
    return this.summary();
  },

  // render() — 1 kartu findash-card ke #tripPresenterGrid (Dashboard
  // Hub), pola SAMA PERSIS ShopBusinessEnginePresenter.render().
  render() {
    const el = (typeof document !== 'undefined') ? document.getElementById('tripPresenterGrid') : null;
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    const s = this.summary();
    const card = this._tripCard(s);
    // S251 (Business Flow Navigation Consistency): reuse `onClick:
    // {action,args}` per-kartu, SAMA PERSIS FinanceDashboard.render()/
    // BusinessFlowPresenter.render()/ShopBusinessEnginePresenter.render().
    el.innerHTML = `
      <div class="findash-card${card.onClick ? ' u-pointer' : ''}"${card.onClick ? ` data-action="${escapeHtml(card.onClick.action)}" data-args="${escapeHtml(JSON.stringify(card.onClick.args))}"` : ''}>
        <div class="findash-card-icon">${card.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(card.label)}</div>
          <div class="findash-card-val${card.cls ? ' ' + card.cls : ''}">${escapeHtml(card.value)}</div>
          ${card.sub ? `<div class="findash-card-sub">${escapeHtml(card.sub)}</div>` : ''}
        </div>
      </div>
    `;
  },

  // renderTab() — versi ringkas 1 baris teks ke #tripPresenterBody (tab
  // Laporan/Statistik Shop), pola SAMA PERSIS
  // ShopBusinessEnginePresenter.renderTab().
  renderTab() {
    const el = (typeof document !== 'undefined') ? document.getElementById('tripPresenterBody') : null;
    if (!el) return;

    const s = this.summary();
    if (!s.ok || s.trips === 0) {
      el.innerHTML = '<div class="u-fs12 u-t2">Belum ada pengiriman tercatat bulan ini</div>';
      return;
    }

    const marginLine = s.avgMarginPct !== null
      ? ` · rata-rata margin ${Math.round(s.avgMarginPct)}%${s.thinMarginCount > 0 ? ` (${s.thinMarginCount} margin tipis)` : ''}`
      : '';
    el.innerHTML = `<div class="u-fs12 u-lh15">${escapeHtml(`${s.trips} pengiriman · total ongkir ${this._money(s.totalOngkir)}${marginLine}`)}</div>`;
  },

  // _tripCard(s) — s = summary(), dipakai APA ADANYA (0 recompute).
  // onClick (S251) reuse CARD_NAV_TARGET (SAMA container dipakai
  // BusinessFlowPresenter.openTripPage()).
  _tripCard(s) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [CARD_NAV_TARGET] };
    if (!s.ok || s.trips === 0) {
      return { icon: '🚚', label: 'Pengiriman Bulan Ini', value: 'Belum ada pengiriman', cls: '', sub: '', onClick };
    }
    return {
      icon: '🚚',
      label: 'Pengiriman Bulan Ini',
      value: `${s.trips} trip`,
      cls: s.thinMarginCount > 0 ? 'red' : '',
      sub: `Total ongkir ${this._money(s.totalOngkir)}`
        + (s.avgMarginPct !== null ? ` · rata-rata margin ${Math.round(s.avgMarginPct)}%` : ''),
      onClick,
    };
  },

};
