// modules/shop/business-intelligence-presenter.js — Business Intelligence
// Presenter (Sesi 251, lanjutan tab "🧠 Business Intelligence" Shop yang
// dibuat Sesi 250, lihat docs/SESI-250-BUSINESS-INTELLIGENCE-MIGRATION.md).
//
// Sesi 252 (Drill Down): tambah openDrillDown(section, sub) + _drillContent/
// _drillHealth/_drillDecision/_drillTrend/_drillExec/_drillInsight/
// _showDrillModal — SEMUA murni merangkai ulang (repackage) hasil
// healthScore()/decisionPanel()/trend()/executiveSummary()/aiInsight() yang
// SUDAH ADA di atas, 0 rumus baru, 0 field D baru, read-only (0 save()).
// Tiap kartu yang di-render 5 kontainer #shopTab-bi sekarang klik-able
// (data-action generik yang SUDAH ADA) -> buka `#biDrillDownModal` (baru,
// ditulis langsung di index.html, 100% pakai class .overlay/.modal/dst yang
// SUDAH ADA — 0 CSS baru). Lihat docs/SESI-252-BUSINESS-INTELLIGENCE-DRILLDOWN.md.
//
// PRINSIP (RULE #1 sesi ini, sama seperti sesi-sesi Business Engine
// sebelumnya): UI HANYA presenter, 100% REUSE seluruh engine/presenter
// yang SUDAH ADA — TIDAK ADA rumus/business logic baru, TIDAK ADA field D
// baru, TIDAK membaca D langsung kecuali murni untuk filter/kelompokkan
// transaksi (D.cobek) sebelum dioper ke ProfitEngine.summarize() yang
// SUDAH ADA (persis pola ShopBusinessEnginePresenter.summary() memfilter
// D.cobek per bulan sebelum memanggil ProfitEngine.summarize()). Semua
// analitik di sini READ-ONLY (tidak pernah memanggil save()).
//
// Sumber data (SEMUA sudah ada sebelum sesi ini):
//   - ShopBusinessEnginePresenter.summary()   (S199 — purchase/inventory/profit)
//   - TripPresenter.summary()                 (S204-A — trip/ongkir/margin)
//   - BusinessFlowPresenter.businessKPI()/costPricingKPI()/loadCostKPI()/
//     aiDecisionSummary()/decisionDashboard() (S211-S222)
//   - InventoryEngine.restockScan()           (S198, via StockRekoWidget.scan())
//   - PurchaseEngine.produsenPrice()          (S198)
//   - ProfitEngine.summarize()/margin()       (S198) — SATU-SATUNYA fungsi
//     yang menghitung omzet/untung/marginPct dari daftar transaksi, dipakai
//     ulang APA ADANYA di tiap bucket (hari/minggu/bulan/tahun/7d/30d) di
//     bawah — TIDAK ada rumus omzet/untung/margin baru yang ditulis di sini.
//   - ShopInsight.compute()                   (modules/ai/feature-insights.js)
//   - isCobekOwnershipSelf()                  (modules/shared/ownership-engine.js)
//
// 5 kebutuhan sesi ini (semua MURNI REPACKAGING dari sumber di atas):
//   1. Business Health Score (0-100) — komposit dari 4 sinyal yang SUDAH
//      dihitung (margin bulan ini, status restock, cost/pricing, load/
//      transport), pola bobot SAMA PERSIS FinanceIntelligence.healthScore()
//      (modules/finance/finance-intelligence.js, S16): tiap komponen bobot
//      25, HANYA disertakan kalau sumbernya tersedia & ada data, skor akhir
//      diskalakan ulang dari bobot yang benar-benar tersedia.
//   2. Decision Panel (Restock/Pricing/Inventory/Supplier) — 4 kartu
//      keputusan, murni derivasi ambang dari summary()/costPricingKPI()/
//      restockScan()/produsenPrice() yang sudah ada.
//   3. Trend Analytics (7/30 hari) — kelompokkan D.cobek (SELF, sudah
//      tersimpan) per tanggal, tiap bucket harian dihitung lewat
//      ProfitEngine.summarize() yang sama (0 rumus baru).
//   4. Executive Summary (Hari/Minggu/Bulan/Tahun) — Bulan 100% reuse
//      BusinessFlowPresenter.businessKPI() APA ADANYA (0 recompute); Hari/
//      Minggu/Tahun pakai metodologi bucket SAMA PERSIS trendAnalytics()
//      di atas (Minggu bahkan reuse trend(7).total langsung).
//   5. AI Insight (maks. 3) — 100% reuse ShopInsight.compute() (satu sumber
//      sama dgn kartu Insight Shop yang sudah ada), diurutkan berdasar
//      level (danger>warning>good>info) lalu dipotong 3 teratas — TIDAK
//      ada rule/insight baru yang ditulis di sini.
//
// Dipanggil dari (tambahan murni, 0 baris lain diubah):
//   - setShopTab('bi', ...) (cobek-io.js), persis setelah 3 render() lain.
//   - _safeRender (modules/shared/modules-render.js), pola sama 3 presenter
//     Business Intelligence lain, supaya tetap live-update.
const BusinessIntelligencePresenter = {

  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },

  _selfFilter() {
    return (typeof isCobekOwnershipSelf === 'function') ? isCobekOwnershipSelf : (() => true);
  },

  // _cobekBetween(from, to) — D.cobek (ownership SELF, pola S194) dengan
  // t.date di rentang [from, to) — HANYA filter/kelompokkan, 0 rumus baru.
  _cobekBetween(from, to) {
    const cobek = (typeof D !== 'undefined' && D.cobek) || [];
    const selfFilter = this._selfFilter();
    return cobek
      .filter((t) => { const d = new Date(t.date); return d >= from && d < to; })
      .filter(selfFilter);
  },

  // _dateKey(d) — kunci tanggal lokal YYYY-MM-DD, murni format tampilan
  // (bukan hitungan bisnis), dipakai buat mengelompokkan trend harian.
  _dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // === 1. Business Health Score (0-100) =================================
  // Pola bobot SAMA PERSIS FinanceIntelligence.healthScore() (S16): 4
  // komponen bobot 25 dari sumber yang SUDAH dihitung, skor diskalakan
  // ulang dari bobot yang benar-benar tersedia.
  healthScore() {
    const parts = [];

    if (typeof BusinessFlowPresenter !== 'undefined') {
      const kpi = BusinessFlowPresenter.businessKPI();
      // (a) Margin bulan ini — full skor (25) pada margin >=20% (ambang
      // sama dgn referensi "margin sehat" yang sudah dipakai
      // BusinessFlowPresenter._recommendationCompute() ["bkpi-sehat"]).
      if (kpi.tripBulanIni > 0) {
        parts.push({ key: 'margin', weight: 25, score: Math.max(0, Math.min(1, kpi.marginPctBulanIni / 20)) * 25 });
      }
      // (b) Status restock — 'clear' skor penuh, 'pending' skor 0. Selalu
      // tersedia (purchaseStatus() tidak butuh data transaksi).
      parts.push({ key: 'restock', weight: 25, score: kpi.purchaseStatus === 'clear' ? 25 : 0 });

      const cp = BusinessFlowPresenter.costPricingKPI();
      if (cp.ok) {
        // (c) Cost/Pricing — proporsi trip yang TIDAK bermargin tipis (<10%).
        parts.push({ key: 'pricing', weight: 25, score: Math.max(0, 1 - cp.thinMarginCount / cp.tripCount) * 25 });
      }

      const lc = BusinessFlowPresenter.loadCostKPI();
      if (lc.ok) {
        // (d) Load/Transport — proporsi trip yang efisien (omzet/ongkir >= 3x).
        parts.push({ key: 'delivery', weight: 25, score: Math.max(0, 1 - lc.inefficientCount / lc.tripCount) * 25 });
      }
    }

    const maxScore = parts.reduce((s, p) => s + p.weight, 0);
    const rawScore = parts.reduce((s, p) => s + p.score, 0);
    const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : null;
    const label = score == null ? 'Belum ada data'
      : score >= 80 ? 'Sehat' : score >= 60 ? 'Cukup Sehat' : score >= 40 ? 'Waspada' : 'Perlu Perhatian';
    return { ok: score != null, score, label, parts };
  },

  // === 2. Decision Panel (Restock/Pricing/Inventory/Supplier) ===========
  decisionPanel() {
    return {
      restock: this._restockDecision(),
      pricing: this._pricingDecision(),
      inventory: this._inventoryDecision(),
      supplier: this._supplierDecision(),
    };
  },

  // _restockDecision() — 100% reuse ShopBusinessEnginePresenter.summary().purchase
  // (S198/S199, InventoryEngine.restockScan()+PurchaseEngine.estimatedCost()).
  _restockDecision() {
    if (typeof ShopBusinessEnginePresenter === 'undefined') return { ok: false };
    const p = ShopBusinessEnginePresenter.summary().purchase;
    if (!p.ok) return { ok: false };
    return { ok: true, needed: p.itemCount > 0, itemCount: p.itemCount, totalQty: p.totalQty, totalCost: p.totalCost };
  },

  // _pricingDecision() — 100% reuse BusinessFlowPresenter.costPricingKPI() (S215-216).
  _pricingDecision() {
    if (typeof BusinessFlowPresenter === 'undefined') return { ok: false };
    const cp = BusinessFlowPresenter.costPricingKPI();
    if (!cp.ok) return { ok: false };
    return { ok: true, review: cp.thinMarginCount > 0, thinMarginCount: cp.thinMarginCount, tripCount: cp.tripCount, avgCostPerTrip: cp.avgCostPerTrip, avgMarginPct: cp.avgMarginPct };
  },

  // _inventoryDecision() — 100% reuse ShopBusinessEnginePresenter.summary().inventory
  // (S198/S199). "Potensi margin stok" pakai ProfitEngine.margin() APA
  // ADANYA (fungsi margin generik yang SUDAH ADA, bukan rumus baru) atas
  // 2 angka yang sudah dihitung (totalNilaiJual-totalModal / totalNilaiJual).
  _inventoryDecision() {
    if (typeof ShopBusinessEnginePresenter === 'undefined') return { ok: false };
    const inv = ShopBusinessEnginePresenter.summary().inventory;
    if (!inv.ok) return { ok: false };
    const potensiMarginPct = (typeof ProfitEngine !== 'undefined')
      ? ProfitEngine.margin(inv.totalNilaiJual, inv.totalNilaiJual - inv.totalModal) : 0;
    return { ok: true, totalModal: inv.totalModal, totalNilaiJual: inv.totalNilaiJual, potensiMarginPct };
  },

  // _supplierDecision() — 100% reuse InventoryEngine.restockScan()
  // (S198, via StockRekoWidget.scan()) + PurchaseEngine.produsenPrice()
  // (S198, lookup product.hargaByProdusen[produsenId] yang SUDAH ADA) +
  // D.produsen (SUDAH ADA). TIDAK ADA rumus baru selain Math.min() harga
  // supplier yang sudah tersimpan per produk, dipakai untuk menjawab
  // "beli restock ini dari produsen mana yang paling murah".
  _supplierDecision() {
    if (typeof InventoryEngine === 'undefined' || typeof PurchaseEngine === 'undefined') return { ok: false };
    const scan = InventoryEngine.restockScan();
    if (!scan.ok || !scan.items.length) return { ok: true, itemCount: 0, withPriceCount: 0, missingPriceCount: 0, cheapestSupplier: null };
    const produsenList = (typeof D !== 'undefined' && D.produsen) || [];
    let withPriceCount = 0;
    const cheapestCount = {};
    scan.items.forEach(({ product }) => {
      const prices = produsenList
        .map((pr) => ({ produsen: pr, price: PurchaseEngine.produsenPrice(product, pr.id) }))
        .filter((x) => x.price != null);
      if (!prices.length) return;
      withPriceCount++;
      const cheapest = prices.reduce((min, x) => (x.price < min.price ? x : min), prices[0]);
      const name = cheapest.produsen.name || cheapest.produsen.id;
      cheapestCount[name] = (cheapestCount[name] || 0) + 1;
    });
    const ranked = Object.keys(cheapestCount).sort((a, b) => cheapestCount[b] - cheapestCount[a]);
    return {
      ok: true,
      itemCount: scan.items.length,
      withPriceCount,
      missingPriceCount: scan.items.length - withPriceCount,
      cheapestSupplier: ranked.length ? { name: ranked[0], count: cheapestCount[ranked[0]] } : null,
    };
  },

  // === 3. Trend Analytics (7/30 hari) ====================================
  // trend(days) — kelompokkan D.cobek (SELF) `days` hari terakhir
  // (termasuk hari ini) per tanggal, tiap bucket harian & totalnya dihitung
  // lewat ProfitEngine.summarize() yang SUDAH ADA — 0 rumus omzet/untung/
  // margin baru.
  trend(days) {
    if (typeof ProfitEngine === 'undefined') return { ok: false };
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const from = new Date(todayEnd.getTime() - days * 24 * 60 * 60 * 1000);
    const list = this._cobekBetween(from, todayEnd);

    const buckets = {};
    list.forEach((t) => {
      const key = this._dateKey(new Date(t.date));
      (buckets[key] = buckets[key] || []).push(t);
    });
    const series = Object.keys(buckets).sort().map((date) => Object.assign({ date }, ProfitEngine.summarize(buckets[date])));
    const total = ProfitEngine.summarize(list);
    return { ok: true, days, from: from.toISOString(), to: todayEnd.toISOString(), series, total };
  },

  // === 4. Executive Summary (Hari/Minggu/Bulan/Tahun) ====================
  executiveSummary() {
    if (typeof ProfitEngine === 'undefined') return { ok: false };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

    const hari = ProfitEngine.summarize(this._cobekBetween(todayStart, todayEnd));
    // Minggu: reuse trend(7).total (metodologi bucket SAMA, 0 filter baru).
    const trend7 = this.trend(7);
    const minggu = trend7.ok ? trend7.total : ProfitEngine.summarize([]);
    // Bulan: 100% reuse BusinessFlowPresenter.businessKPI() APA ADANYA (0 recompute).
    let bulan = null;
    if (typeof BusinessFlowPresenter !== 'undefined') {
      const kpi = BusinessFlowPresenter.businessKPI();
      bulan = { trip: kpi.tripBulanIni, omzet: kpi.omzetBulanIni, untung: kpi.untungBulanIni, marginPct: kpi.marginPctBulanIni };
    } else {
      bulan = ProfitEngine.summarize(this._cobekBetween(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)));
    }
    const tahun = ProfitEngine.summarize(this._cobekBetween(yearStart, yearEnd));

    return { ok: true, hari, minggu, bulan, tahun };
  },

  // === 5. AI Insight (maks. 3) ===========================================
  // 100% reuse ShopInsight.compute() (modules/ai/feature-insights.js, satu
  // sumber sama dgn kartu "💡 Insight Bisnis Shop" yang sudah ada) — TIDAK
  // ADA rule/insight baru ditulis di sini, murni prioritaskan &  potong 3.
  aiInsight() {
    if (typeof ShopInsight === 'undefined') return [];
    const LEVEL_ORDER = { danger: 0, warning: 1, good: 2, info: 3 };
    const items = ShopInsight.compute().slice();
    items.sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9));
    return items.slice(0, 3);
  },

  // === Drill Down (Sesi 252) =============================================
  // PRINSIP (sama seperti presenter murni di atas): drill down HANYA
  // merangkai ulang (repackage) hasil healthScore()/decisionPanel()/trend()/
  // executiveSummary()/aiInsight() yang SUDAH dihitung di atas — 0 rumus
  // baru, 0 field D baru, TIDAK PERNAH memanggil save() (read-only). Modal
  // detailnya sendiri (`#biDrillDownModal`) ditulis LANGSUNG di index.html
  // (bukan lewat modals.js/MODAL_HTML) supaya tetap 1 file kontainer per
  // sesi ini, tapi 100% pakai class CSS yang SUDAH ADA (.overlay/.modal/
  // .modal-handle/.modal-title/.modal-close) — 0 CSS baru. `openModal()`/
  // `closeModal()` yang dipanggil di sini juga SUDAH ADA (modal-navigasi.js).
  //
  // openDrillDown(section, sub) — dipanggil dari data-action pada tiap
  // card yang di-render _renderHealthScore/_renderDecisionPanel/_renderTrend/
  // _renderExecutiveSummary/_renderAiInsight di bawah.
  //   section: 'health' | 'decision' | 'trend' | 'exec' | 'insight'
  //   sub: tergantung section ('restock'/'pricing'/'inventory'/'supplier'
  //        utk 'decision'; 7/30 utk 'trend'; 'hari'/'minggu'/'bulan'/'tahun'
  //        utk 'exec'; tidak dipakai utk 'health'/'insight').
  openDrillDown(section, sub) {
    const { title, html } = this._drillContent(section, sub);
    this._showDrillModal(title, html);
  },

  // _drillContent(section, sub) — fungsi MURNI (tanpa DOM), gampang dites:
  // menerima kunci section/sub, balikin {title, html} siap-tampil dari data
  // yang SUDAH dihitung healthScore()/decisionPanel()/trend()/
  // executiveSummary()/aiInsight()/ShopInsight.compute() — 0 hitungan baru.
  _drillContent(section, sub) {
    if (section === 'health') return this._drillHealth();
    if (section === 'decision') return this._drillDecision(sub);
    if (section === 'trend') return this._drillTrend(sub);
    if (section === 'exec') return this._drillExec(sub);
    if (section === 'insight') return this._drillInsight();
    return { title: 'Detail', html: '<div class="u-fs12 u-t2">Data tidak tersedia.</div>' };
  },

  _drillHealth() {
    const hs = this.healthScore();
    if (!hs.ok) {
      return { title: '❤️ Detail Business Health Score', html: '<div class="u-fs12 u-t2 u-lh15">Belum ada data transaksi Shop bulan ini.</div>' };
    }
    const rows = hs.parts.map((p) => {
      const pct = Math.round((p.score / p.weight) * 100);
      return `<div class="u-fs12 u-lh15 u-mb8">${escapeHtml(this._partLabel(p.key))}: <b>${pct}%</b> (bobot ${p.weight})</div>`;
    }).join('');
    const header = `<div class="u-fs12 u-lh15 u-mb8">Skor total: <b>${hs.score}/100</b> — ${escapeHtml(hs.label)}</div>`;
    return { title: '❤️ Detail Business Health Score', html: header + rows };
  },

  // _drillDecision(sub) — 100% reuse decisionPanel() (sudah 100% reuse
  // summary()/costPricingKPI()/restockScan()/produsenPrice()), murni
  // menampilkan field yang sudah ada per sub-kartu, tidak menghitung ulang.
  _drillDecision(sub) {
    const d = this.decisionPanel();
    if (sub === 'pricing') {
      const p = d.pricing;
      const html = !p.ok ? 'Belum ada data trip.'
        : `Jumlah trip: <b>${p.tripCount}</b><br>Margin rata-rata: <b>${Math.round(p.avgMarginPct)}%</b><br>Cost rata-rata/trip: <b>${escapeHtml(this._money(p.avgCostPerTrip))}</b><br>Trip bermargin tipis (&lt;10%): <b>${p.thinMarginCount}</b>`;
      return { title: '💰 Detail Decision: Pricing', html: `<div class="u-fs12 u-lh15">${html}</div>` };
    }
    if (sub === 'inventory') {
      const inv = d.inventory;
      const html = !inv.ok ? 'Data belum tersedia.'
        : `Total modal stok: <b>${escapeHtml(this._money(inv.totalModal))}</b><br>Total nilai jual stok: <b>${escapeHtml(this._money(inv.totalNilaiJual))}</b><br>Potensi margin: <b>${Math.round(inv.potensiMarginPct)}%</b>`;
      return { title: '📦 Detail Decision: Inventory', html: `<div class="u-fs12 u-lh15">${html}</div>` };
    }
    if (sub === 'supplier') {
      const s = d.supplier;
      const html = (!s.ok || s.itemCount === 0) ? 'Tidak ada restock aktif saat ini.'
        : `Produk perlu restock: <b>${s.itemCount}</b><br>Sudah ada harga supplier: <b>${s.withPriceCount}</b><br>Belum ada harga supplier: <b>${s.missingPriceCount}</b>${s.cheapestSupplier ? `<br>Produsen termurah: <b>${escapeHtml(s.cheapestSupplier.name)}</b> (unggul di ${s.cheapestSupplier.count}/${s.withPriceCount} produk)` : ''}`;
      return { title: '🏭 Detail Decision: Supplier', html: `<div class="u-fs12 u-lh15">${html}</div>` };
    }
    // default: restock
    const r = d.restock;
    const html = !r.ok ? 'Data belum tersedia.'
      : (!r.needed ? 'Semua stok produk aman, tidak perlu restock saat ini.'
        : `Perlu restock <b>${r.itemCount}</b> produk (total <b>${r.totalQty}</b> pcs).<br>Estimasi modal: <b>${escapeHtml(this._money(r.totalCost))}</b>.`);
    return { title: '🧾 Detail Decision: Restock', html: `<div class="u-fs12 u-lh15">${html}</div>` };
  },

  // _drillTrend(days) — 100% reuse trend(days) (bucket harian sudah
  // dihitung lewat ProfitEngine.summarize()), murni ditampilkan per-hari.
  _drillTrend(days) {
    const t = this.trend(Number(days) || 7);
    if (!t.ok) return { title: '📈 Detail Trend', html: '<div class="u-fs12 u-t2">Data belum tersedia.</div>' };
    const header = `<div class="u-fs12 u-lh15 u-mb8">Total ${t.days} hari terakhir: ${t.total.trip} trip · Omzet <b>${escapeHtml(this._money(t.total.omzet))}</b> · Untung <b>${escapeHtml(this._money(t.total.untung))}</b> · Margin <b>${Math.round(t.total.marginPct)}%</b></div>`;
    const rows = t.series.length
      ? t.series.map((s) => `<div class="u-fs12 u-lh15 u-mb8">${escapeHtml(s.date)} — ${s.trip} trip · ${escapeHtml(this._money(s.omzet))} · untung ${escapeHtml(this._money(s.untung))} · margin ${Math.round(s.marginPct)}%</div>`).join('')
      : '<div class="u-fs12 u-t2">Belum ada transaksi di periode ini.</div>';
    return { title: `📈 Detail Trend ${t.days} Hari Terakhir`, html: header + rows };
  },

  // _drillExec(period) — 100% reuse executiveSummary() (Bulan reuse
  // businessKPI() apa adanya, Minggu reuse trend(7).total, Hari/Tahun
  // dihitung lewat ProfitEngine.summarize() yang sama) — 0 recompute.
  _drillExec(period) {
    const s = this.executiveSummary();
    if (!s.ok) return { title: '🗂️ Detail Executive Summary', html: '<div class="u-fs12 u-t2">Data belum tersedia.</div>' };
    const labels = { hari: '📅 Detail Hari Ini', minggu: '🗓️ Detail Minggu Ini (7 hari)', bulan: '📆 Detail Bulan Ini', tahun: '🧭 Detail Tahun Ini' };
    const data = s[period] || s.hari;
    // BUGFIX (drilldown): utk period 'bulan', field `trip` = jumlah trip
    // PENGIRIMAN (businessKPI().tripBulanIni, TripPresenter) — beda makna
    // dgn hari/minggu/tahun yang field `trip`-nya = jumlah TRANSAKSI
    // (ProfitEngine.summarize().trip). Bulan ini bisa saja ada omzet/
    // untung penjualan real tapi 0 trip pengiriman — cek presence data
    // TIDAK BOLEH cuma lihat `trip`, harus ikut cek omzet/untung juga
    // supaya tidak salah bilang "belum ada transaksi" padahal ada.
    const hasData = !!(data && (data.trip || data.omzet || data.untung));
    const html = !hasData
      ? 'Belum ada transaksi di periode ini.'
      : `Jumlah trip: <b>${data.trip}</b><br>Omzet: <b>${escapeHtml(this._money(data.omzet))}</b><br>Untung: <b>${escapeHtml(this._money(data.untung))}</b><br>Margin: <b>${Math.round(data.marginPct)}%</b>`;
    return { title: labels[period] || 'Detail Executive Summary', html: `<div class="u-fs12 u-lh15">${html}</div>` };
  },

  // _drillInsight() — 100% reuse ShopInsight.compute() TANPA dipotong 3
  // (beda dgn aiInsight() yang dipotong 3 utk kartu ringkas) — TIDAK ADA
  // rule/insight baru, murni menampilkan daftar lengkap yang sama.
  _drillInsight() {
    if (typeof ShopInsight === 'undefined') return { title: '💡 Detail AI Insight', html: '<div class="u-fs12 u-t2">Belum ada data.</div>' };
    const items = ShopInsight.compute();
    if (!items.length) return { title: '💡 Detail AI Insight', html: '<div class="u-fs12 u-t2 u-lh15">Belum ada rekomendasi khusus — data Shop bulan ini terlihat wajar.</div>' };
    const html = items.map((x) => `<div class="u-fs12 u-lh15 u-mb8">${x.icon} ${x.text}</div>`).join('');
    return { title: '💡 Semua Insight Bisnis Shop', html };
  },

  // _showDrillModal(title, html) — satu-satunya titik sentuh DOM utk drill
  // down: isi #biDrillDownTitle/#biDrillDownBody lalu openModal() (SUDAH
  // ADA, modal-navigasi.js). Guard permisif kalau document/openModal tidak
  // ada (mis. dites tanpa DOM) supaya TIDAK throw.
  _showDrillModal(title, html) {
    if (typeof document === 'undefined') return;
    const titleEl = document.getElementById('biDrillDownTitle');
    const bodyEl = document.getElementById('biDrillDownBody');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;
    if (typeof openModal === 'function') openModal('biDrillDownModal');
  },

  // === render() — isi seluruh 5 kontainer di #shopTab-bi =================
  render() {
    this._renderHealthScore();
    this._renderDecisionPanel();
    this._renderTrend();
    this._renderExecutiveSummary();
    this._renderAiInsight();
  },

  _renderHealthScore() {
    const el = (typeof document !== 'undefined') ? document.getElementById('biHealthScoreGrid') : null;
    if (!el) return;
    const hs = this.healthScore();
    if (!hs.ok) {
      el.innerHTML = `<div class="findash-card u-pointer" data-action="BusinessIntelligencePresenter.openDrillDown" data-args="${escapeHtml(JSON.stringify(['health']))}"><div class="findash-card-icon">❤️</div><div class="findash-card-body"><div class="findash-card-label">Business Health Score</div><div class="findash-card-val">—</div><div class="findash-card-sub">Belum ada data transaksi Shop bulan ini</div></div></div>`;
      return;
    }
    const cls = hs.score >= 80 ? 'green' : hs.score >= 60 ? '' : hs.score >= 40 ? 'orange' : 'red';
    const breakdown = hs.parts.map((p) => `${this._partLabel(p.key)} ${Math.round((p.score / p.weight) * 100)}%`).join(' · ');
    // Sesi 252 (Drill Down): kartu jadi klik-able (data-action generik yang
    // SUDAH ADA, lihat dispatcher document.addEventListener('click',...) di
    // app-bootstrap.js) -> BusinessIntelligencePresenter.openDrillDown('health').
    // 0 modal/logic baru dipanggil di sini, murni atribut HTML.
    el.innerHTML = `
      <div class="findash-card u-pointer" data-action="BusinessIntelligencePresenter.openDrillDown" data-args="${escapeHtml(JSON.stringify(['health']))}">
        <div class="findash-card-icon">❤️</div>
        <div class="findash-card-body">
          <div class="findash-card-label">Business Health Score</div>
          <div class="findash-card-val${cls ? ' ' + cls : ''}">${hs.score}/100 · ${escapeHtml(hs.label)}</div>
          <div class="findash-card-sub">${escapeHtml(breakdown)}</div>
        </div>
      </div>`;
  },

  _partLabel(key) {
    return { margin: 'Margin', restock: 'Restock', pricing: 'Pricing', delivery: 'Delivery' }[key] || key;
  },

  _renderDecisionPanel() {
    const el = (typeof document !== 'undefined') ? document.getElementById('biDecisionPanelGrid') : null;
    if (!el) return;
    const d = this.decisionPanel();
    const cards = [
      this._restockCard(d.restock),
      this._pricingCard(d.pricing),
      this._inventoryCard(d.inventory),
      this._supplierCard(d.supplier),
    ];
    // Sesi 252 (Drill Down): tiap kartu klik-able -> openDrillDown('decision', sub)
    // pakai data-action generik yang SUDAH ADA — 0 modal/logic baru di sini.
    el.innerHTML = cards.map((c) => `
      <div class="findash-card u-pointer" data-action="BusinessIntelligencePresenter.openDrillDown" data-args="${escapeHtml(JSON.stringify(['decision', c.drillSub]))}">
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  _restockCard(r) {
    if (!r.ok) return { icon: '🧾', label: 'Decision: Restock', value: '—', cls: '', sub: '', drillSub: 'restock' };
    if (!r.needed) return { icon: '🧾', label: 'Decision: Restock', value: 'Tidak perlu restock', cls: '', sub: 'Stok semua produk aman', drillSub: 'restock' };
    return { icon: '🧾', label: 'Decision: Restock', value: `Restock ${r.itemCount} produk sekarang`, cls: 'red', sub: `Estimasi modal ${this._money(r.totalCost)} (${r.totalQty} pcs)`, drillSub: 'restock' };
  },

  _pricingCard(p) {
    if (!p.ok) return { icon: '💰', label: 'Decision: Pricing', value: 'Belum ada trip', cls: '', sub: '', drillSub: 'pricing' };
    if (!p.review) return { icon: '💰', label: 'Decision: Pricing', value: 'Harga jual sehat', cls: '', sub: `Margin rata-rata ${Math.round(p.avgMarginPct)}%`, drillSub: 'pricing' };
    return { icon: '💰', label: 'Decision: Pricing', value: `Review harga — ${p.thinMarginCount} trip margin tipis`, cls: 'red', sub: `Cost/trip rata-rata ${this._money(p.avgCostPerTrip)}`, drillSub: 'pricing' };
  },

  _inventoryCard(inv) {
    if (!inv.ok) return { icon: '📦', label: 'Decision: Inventory', value: '—', cls: '', sub: '', drillSub: 'inventory' };
    return { icon: '📦', label: 'Decision: Inventory', value: `Potensi margin stok ${Math.round(inv.potensiMarginPct)}%`, cls: '', sub: `Modal ${this._money(inv.totalModal)} · Nilai jual ${this._money(inv.totalNilaiJual)}`, drillSub: 'inventory' };
  },

  _supplierCard(s) {
    if (!s.ok || s.itemCount === 0) return { icon: '🏭', label: 'Decision: Supplier', value: 'Tidak ada restock aktif', cls: '', sub: '', drillSub: 'supplier' };
    if (!s.cheapestSupplier) return { icon: '🏭', label: 'Decision: Supplier', value: `${s.missingPriceCount} produk belum ada harga supplier`, cls: 'orange', sub: 'Lengkapi harga produsen per produk', drillSub: 'supplier' };
    return { icon: '🏭', label: 'Decision: Supplier', value: `Termurah: ${s.cheapestSupplier.name}`, cls: '', sub: `Unggul di ${s.cheapestSupplier.count}/${s.withPriceCount} produk berharga${s.missingPriceCount ? ` · ${s.missingPriceCount} produk belum ada harga` : ''}`, drillSub: 'supplier' };
  },

  _renderTrend() {
    const el = (typeof document !== 'undefined') ? document.getElementById('biTrendGrid') : null;
    if (!el) return;
    const t7 = this.trend(7);
    const t30 = this.trend(30);
    const cards = [this._trendCard('7 Hari Terakhir', t7, 7), this._trendCard('30 Hari Terakhir', t30, 30)];
    // Sesi 252 (Drill Down): kartu klik-able -> openDrillDown('trend', days).
    el.innerHTML = cards.map((c) => `
      <div class="findash-card u-pointer" data-action="BusinessIntelligencePresenter.openDrillDown" data-args="${escapeHtml(JSON.stringify(['trend', c.days]))}">
        <div class="findash-card-icon">📈</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  _trendCard(label, t, days) {
    if (!t.ok || t.total.trip === 0) return { label, value: 'Belum ada transaksi', sub: '', days };
    return { label, value: `${t.total.trip} trip · margin ${Math.round(t.total.marginPct)}%`, sub: `Omzet ${this._money(t.total.omzet)} · Untung ${this._money(t.total.untung)} · ${t.series.length} hari aktif`, days };
  },

  _renderExecutiveSummary() {
    const el = (typeof document !== 'undefined') ? document.getElementById('biExecSummaryGrid') : null;
    if (!el) return;
    const s = this.executiveSummary();
    if (!s.ok) { el.innerHTML = ''; return; }
    const cards = [
      this._execCard('📅 Hari Ini', s.hari, 'hari'),
      this._execCard('🗓️ Minggu Ini (7 hari)', s.minggu, 'minggu'),
      this._execCard('📆 Bulan Ini', s.bulan, 'bulan'),
      this._execCard('🧭 Tahun Ini', s.tahun, 'tahun'),
    ];
    // Sesi 252 (Drill Down): kartu klik-able -> openDrillDown('exec', period).
    el.innerHTML = cards.map((c) => `
      <div class="findash-card u-pointer" data-action="BusinessIntelligencePresenter.openDrillDown" data-args="${escapeHtml(JSON.stringify(['exec', c.period]))}">
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  _execCard(labelWithIcon, s, period) {
    const [icon, ...rest] = labelWithIcon.split(' ');
    const label = rest.join(' ');
    if (!s || !s.trip) return { icon, label, value: 'Belum ada transaksi', sub: '', period };
    return { icon, label, value: `${s.trip} trip · ${this._money(s.omzet)}`, sub: `Untung ${this._money(s.untung)} · Margin ${Math.round(s.marginPct)}%`, period };
  },

  // Sesi 252 (Drill Down): seluruh body kartu jadi klik-able -> openDrillDown
  // ('insight') yang menampilkan SEMUA insight (bukan cuma 3 teratas), masih
  // 100% reuse ShopInsight.compute() (0 rule baru), lihat _drillInsight().
  _renderAiInsight() {
    const el = (typeof document !== 'undefined') ? document.getElementById('biAiInsightBody') : null;
    if (!el) return;
    el.setAttribute('data-action', 'BusinessIntelligencePresenter.openDrillDown');
    el.setAttribute('data-args', JSON.stringify(['insight']));
    el.classList.add('u-pointer');
    const items = this.aiInsight();
    if (!items.length) { el.innerHTML = '<div class="u-fs12 u-t2 u-lh15">Belum ada rekomendasi khusus — data Shop bulan ini terlihat wajar.</div>'; return; }
    el.innerHTML = items.map((x) => `<div class="u-fs12 u-lh15 u-mb8">${x.icon} ${x.text}</div>`).join('');
  },

};

if (typeof window !== 'undefined') {
  window.BusinessIntelligencePresenter = BusinessIntelligencePresenter;
}
