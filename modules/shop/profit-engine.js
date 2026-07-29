// profit-engine.js — Shop Business Engine, S198 (Business Engine untuk Shop).
//
// ProfitEngine = lapisan profit/margin (untung per transaksi, rekap omzet
// periode, & rekomendasi harga jual). SAMA POLA dgn PurchaseEngine/
// TripEngine/InventoryEngine (file sebelah): pure wrapper, TIDAK ADA rumus
// baru — semuanya delegasi ke fungsi Shop existing (calculateProfit di
// cobek-pricing.js; Laporan.getStats-style agregasi & PriceReko.roundNice di
// cobek-order.js/cobek-pricing.js).
//
// TIDAK PERNAH menyentuh D sendiri, TIDAK PERNAH panggil save(). Method di
// bawah memanggil fungsi Shop yang MEMANG membaca D read-only (mis.
// calculateProfit baca D.products) — perilaku ASLI fungsi tsb.
//
// Belum digunakan UI. Belum dihubungkan ke Shop (tidak dipanggil dari
// cobek-*.js mana pun sesi ini).
const ProfitEngine = {

  // profit(params) — delegasi PERSIS ke calculateProfit() (cobek-pricing.js):
  // revenue - modal - ongkir dari qty unit produk tertentu.
  profit(params) {
    if (typeof calculateProfit !== 'function') {
      return null;
    }
    return calculateProfit(params);
  },

  // margin(revenue, profitAmount) — persentase margin, PERSIS rumus yang
  // dipakai berulang di cobek-order.js (mis. `omzet>0?Math.round((untung/omzet)*100):0`
  // di Laporan.renderTab()/renderTabLap()) & calculateProfit()
  // (`revenue>0?(profit/revenue)*100:0`). Dibungkus jadi satu fungsi murni
  // supaya tidak perlu duplikat guard "revenue>0" di banyak tempat.
  margin(revenue, profitAmount) {
    const rev = parseFloat(revenue) || 0;
    const p = parseFloat(profitAmount) || 0;
    return rev > 0 ? (p / rev) * 100 : 0;
  },

  // summarize(transactions) — omzet/untung/margin dari daftar transaksi
  // Shop (D.cobek), PERSIS agregasi Laporan.renderTab() (cobek-order.js):
  // `omzet=inRangeSelf.reduce((s,t)=>s+(t.total||0),0)`,
  // `untung=inRangeSelf.reduce((s,t)=>s+(t.profit||0),0)`. Pemanggil yang
  // menentukan filter periode/kepemilikan (isCobekOwnershipSelf, dst) —
  // fungsi ini murni mengagregasi array yang sudah difilter, tidak
  // menduplikasi logic filter tsb.
  summarize(transactions) {
    const list = transactions || [];
    const omzet = list.reduce((s, t) => s + (t.total || 0), 0);
    const untung = list.reduce((s, t) => s + (t.profit || 0), 0);
    return {
      trip: list.length,
      omzet,
      untung,
      marginPct: this.margin(omzet, untung),
    };
  },

  // recommendPrice(params) — rekomendasi harga jual, delegasi PERSIS ke
  // PriceReko.roundNice() (pembulatan) dgn rumus yang sama persis
  // `(modal+transport)*(1+marginPct/100)` dari PriceReko.calc()
  // (cobek-pricing.js) — dibungkus jadi parameter murni (bukan baca
  // #pBeli/#prkTransport/#prkMargin dari DOM).
  recommendPrice({ modal, transport, marginPct } = {}) {
    const modalNum = parseFloat(modal) || 0;
    const transportNum = parseFloat(transport) || 0;
    const marginNum = parseFloat(marginPct) || 0;
    const base = modalNum + transportNum;
    const raw = base * (1 + marginNum / 100);
    const rounded = (typeof PriceReko !== 'undefined' && typeof PriceReko.roundNice === 'function')
      ? PriceReko.roundNice(raw)
      : Math.round(raw / 100) * 100;
    return { modal: modalNum, transport: transportNum, marginPct: marginNum, base, result: rounded };
  },
};
