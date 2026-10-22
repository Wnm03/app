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

  // analyzeSale(params) — kalkulasi laba kontribusi/estimasi laba bersih tanpa
  // menyimpan data atau mengubah transaksi.
  //
  // KONTRAK INPUT OPSIONAL (S2628): SEMUA input boleh kosong
  // (undefined/null/''/NaN-string tidak dihitung sebagai angka). Kosong =
  // "belum diketahui" dan TIDAK PERNAH diam-diam jadi 0; angka 0 yang
  // sengaja diisi = pernyataan eksplisit "tidak ada biaya". Setiap angka
  // turunan hanya dihitung kalau SEMUA input pembentuknya terisi, kalau
  // tidak nilainya null (UI menampilkan "belum diisi"). Input yang
  // terisi tapi tidak valid (negatif, bukan angka, tarif >100%, dst) tetap
  // ditolak — itu berbeda dari kosong.
  // HPP historis dikirim sebagai unitCost; fallback master hargaBeli hanya
  // untuk simulasi dan ditandai ESTIMATED_MASTER_COST. Harga jual manual
  // (sellingPrice) menimpa harga master hanya untuk simulasi ini; ongkir
  // manual (deliveryCost, total pesanan) menimpa ongkir dari deliveryPlan.
  analyzeSale({
    productId, qty, unitCost, sellingPrice, deliveryPlan, deliveryCost: deliveryCostInput,
    sellerDiscount,
    marketplaceFeePct, marketplaceFixedFee,
    paymentFeePct, sellerShippingSubsidy,
    packagingCost, otherSellingCost,
    taxExpense, taxWithheld,
    taxStatus = 'UNKNOWN', settlementAmount,
  } = {}) {
    const products = (typeof D !== 'undefined' && Array.isArray(D.products)) ? D.products : [];
    // null = kosong/tidak terbaca sebagai angka; 0 tetap angka sah.
    const n = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const x = Number(v);
      return Number.isFinite(x) ? x : null;
    };
    const blank = (v) => v === null || v === undefined || v === '';
    let product = null;
    if (!blank(productId)) {
      product = products.find((p) => p && p.id === productId) || null;
      if (!product) return { ok: false, reason: 'Produk tidak ditemukan' };
    }

    // Tolak nilai yang SUDAH diisi tapi tidak valid; kosong dilewati.
    const provided = {
      qty, sellingPrice, unitCost, deliveryCost: deliveryCostInput, sellerDiscount,
      sellerShippingSubsidy, packagingCost, otherSellingCost, marketplaceFixedFee,
      taxExpense, taxWithheld, settlementAmount, marketplaceFeePct, paymentFeePct,
    };
    for (const [field, raw] of Object.entries(provided)) {
      if (blank(raw)) continue;
      const value = n(raw);
      if (field === 'qty') {
        if (value === null || value <= 0) return { ok: false, reason: 'Kuantitas harus lebih besar dari nol' };
        continue;
      }
      if (value === null || value < 0) return { ok: false, reason: `Nilai ${field} tidak valid` };
      if ((field === 'marketplaceFeePct' || field === 'paymentFeePct') && value > 100) {
        return { ok: false, reason: `Persentase ${field} tidak boleh melebihi 100%` };
      }
    }
    if (!['UNKNOWN', 'CONFIRMED', 'NOT_APPLICABLE'].includes(taxStatus)) {
      return { ok: false, reason: 'Status perlakuan pajak tidak valid' };
    }
    const sum = (list) => (list.some((v) => v === null) ? null : list.reduce((a, v) => a + v, 0));

    const q = n(qty);
    // Harga jual: input manual > harga master produk > belum diisi.
    const manualPrice = n(sellingPrice);
    const masterPrice = product ? n(product.hargaJual) : null;
    if (manualPrice === null && masterPrice !== null && masterPrice < 0) {
      return { ok: false, reason: 'Harga jual produk tidak valid' };
    }
    const price = manualPrice !== null ? manualPrice : masterPrice;
    const priceSource = manualPrice !== null ? 'MANUAL' : (masterPrice !== null ? 'MASTER' : 'MISSING');

    const explicitCost = n(unitCost);
    const masterCost = product ? n(product.hargaBeli) : null;
    const cost = explicitCost !== null ? explicitCost : masterCost;
    if (cost !== null && cost < 0) return { ok: false, reason: 'HPP tidak boleh negatif' };
    const costBasis = explicitCost !== null ? 'HISTORICAL_UNIT_COST' : (masterCost !== null ? 'ESTIMATED_MASTER_COST' : 'MISSING_COST');

    const discount = n(sellerDiscount);
    const grossSales = (price !== null && q !== null) ? price * q : null;
    if (discount !== null && grossSales !== null && discount > grossSales) {
      return { ok: false, reason: 'Diskon penjual tidak boleh melebihi penjualan kotor' };
    }
    const netSales = (grossSales !== null && discount !== null) ? grossSales - discount : null;
    const cogs = (cost !== null && q !== null) ? cost * q : null;

    // Ongkir: manual (total pesanan) > rencana pengiriman (per pcs x qty) > belum diisi.
    const manualDelivery = n(deliveryCostInput);
    let deliveryPerUnit = deliveryPlan && deliveryPlan.route ? n(deliveryPlan.route.totalPerPcs) : null;
    if (manualDelivery === null && deliveryPerUnit !== null && deliveryPerUnit < 0) {
      return { ok: false, reason: 'Biaya ongkir tidak boleh negatif' };
    }
    // LogisticsEngine.route() mengembalikan 0 untuk etape yang jarak/ongkos
    // per km-nya kosong, jadi 0 dari rencana pengiriman TIDAK bisa dibedakan
    // dari "belum diisi". Ongkir dari rencana hanya dianggap diketahui kalau
    // setiap etape yang dibutuhkan > 0 (produsen selalu; konsumen hanya
    // metode 'antar'). Ongkir gratis/nol yang sengaja diisi lewat
    // deliveryCost: 0 (input manual) tetap sah.
    if (manualDelivery === null && deliveryPerUnit !== null) {
      const route = deliveryPlan.route;
      const hasLegs = Object.prototype.hasOwnProperty.call(route, 'legProdusen');
      const legsKnown = hasLegs
        ? (Number(route.legProdusen) > 0 && (route.metode === 'ambil' || Number(route.legKonsumen) > 0))
        : deliveryPerUnit > 0;
      if (!legsKnown) deliveryPerUnit = null;
    }
    const deliveryCost = manualDelivery !== null ? manualDelivery
      : ((deliveryPerUnit !== null && q !== null) ? deliveryPerUnit * q : null);
    const deliveryKnown = manualDelivery !== null || deliveryPerUnit !== null;

    const sellerShip = n(sellerShippingSubsidy);
    const pack = n(packagingCost);
    const other = n(otherSellingCost);
    // Satu kelompok "kemasan & biaya lain": terisi kalau salah satunya diisi.
    const otherGroupKnown = pack !== null || other !== null;
    const marketplacePct = n(marketplaceFeePct);
    const paymentPct = n(paymentFeePct);
    const fixedFee = n(marketplaceFixedFee);
    const marketplaceFee = (marketplacePct === null || netSales === null) ? null : netSales * marketplacePct / 100;
    const paymentFee = (paymentPct === null || netSales === null) ? null : netSales * paymentPct / 100;
    // Status "Tidak berlaku" = pernyataan eksplisit tidak ada pajak; nilai
    // pajak yang kosong boleh dianggap 0 HANYA pada status itu.
    const taxNA = taxStatus === 'NOT_APPLICABLE';
    const expenseTax = n(taxExpense) !== null ? n(taxExpense) : (taxNA ? 0 : null);
    const withheldTax = n(taxWithheld) !== null ? n(taxWithheld) : (taxNA ? 0 : null);

    const missing = [];
    if (price === null) missing.push('HARGA_JUAL');
    if (q === null) missing.push('KUANTITAS');
    if (cost === null) missing.push('HPP');
    if (discount === null) missing.push('DISKON');
    if (!deliveryKnown) missing.push('ONGKIR');
    if (marketplacePct === null) missing.push('BIAYA_MARKETPLACE');
    if (fixedFee === null) missing.push('BIAYA_TETAP');
    if (paymentPct === null) missing.push('BIAYA_PEMBAYARAN');
    if (sellerShip === null) missing.push('SUBSIDI_ONGKIR');
    if (!otherGroupKnown) missing.push('BIAYA_LAIN');
    if (expenseTax === null) missing.push('PAJAK_BEBAN');
    if (withheldTax === null) missing.push('PAJAK_DIPUNGUT');
    if (taxStatus === 'UNKNOWN') missing.push('STATUS_PAJAK');

    const grossProfit = (netSales !== null && cogs !== null) ? netSales - cogs : null;
    const sellingCosts = sum([
      deliveryCost, sellerShip, marketplaceFee, fixedFee, paymentFee,
      otherGroupKnown ? (pack === null ? 0 : pack) : null,
      otherGroupKnown ? (other === null ? 0 : other) : null,
    ]);
    // Subtotal biaya yang SUDAH diisi saja — informasi sebagian, bukan hasil.
    // null kalau belum ada satu pun komponen biaya yang terisi (bukan Rp0).
    const knownParts = [deliveryCost, sellerShip, marketplaceFee, fixedFee, paymentFee,
      otherGroupKnown ? (pack || 0) + (other || 0) : null].filter((v) => v !== null);
    const knownSellingCosts = knownParts.length ? knownParts.reduce((a, v) => a + v, 0) : null;
    const contributionProfit = (grossProfit !== null && sellingCosts !== null) ? grossProfit - sellingCosts : null;
    const estimatedNetProfit = (contributionProfit !== null && expenseTax !== null) ? contributionProfit - expenseTax : null;
    const cashAfterWithholding = (netSales !== null && sellingCosts !== null && withheldTax !== null)
      ? netSales - sellingCosts - withheldTax : null;
    // Estimasi settlement hanya mengurangi potongan yang diasumsikan dipotong
    // dari payout; biaya internal seperti kemasan/ongkir sendiri bukan otomatis
    // potongan settlement. Subsidi ongkir dianggap potongan payout jika diinput.
    const payoutDeductions = sum([marketplaceFee, fixedFee, paymentFee, sellerShip, withheldTax]);
    const estimatedSettlement = (netSales !== null && payoutDeductions !== null) ? netSales - payoutDeductions : null;
    const settlement = n(settlementAmount);
    const status = (isBlank) => (isBlank ? 'EMPTY' : 'FILLED');
    const result = {
      ok: true, productId: product ? product.id : null, qty: q, costBasis, priceSource,
      sellingPrice: price,
      grossSales, sellerDiscount: discount, netSales,
      unitCost: cost, cogs, deliveryCost,
      marketplaceFeePct: marketplacePct, marketplaceFee,
      marketplaceFixedFee: fixedFee, paymentFeePct: paymentPct, paymentFee,
      sellerShippingSubsidy: sellerShip, packagingCost: pack, otherSellingCost: other,
      grossProfit, sellingCosts, knownSellingCosts, contributionProfit,
      taxStatus, taxExpense: expenseTax, taxWithheld: withheldTax,
      estimatedNetProfit,
      marginPct: (estimatedNetProfit !== null && netSales !== null && netSales > 0) ? estimatedNetProfit / netSales * 100 : null,
      cashAfterWithholding, estimatedSettlement,
      settlementAmount: settlement,
      settlementDelta: (settlement === null || estimatedSettlement === null) ? null : settlement - estimatedSettlement,
      missingInputs: missing,
      // Status per kolom: EMPTY (belum diisi) dibedakan dari FILLED (termasuk 0 eksplisit).
      inputStatus: {
        sellingPrice: status(price === null), qty: status(q === null), unitCost: status(cost === null),
        sellerDiscount: status(discount === null), deliveryCost: status(!deliveryKnown),
        marketplaceFeePct: status(marketplacePct === null), marketplaceFixedFee: status(fixedFee === null),
        paymentFeePct: status(paymentPct === null), sellerShippingSubsidy: status(sellerShip === null),
        otherSellingCost: status(!otherGroupKnown), taxExpense: status(expenseTax === null),
        taxWithheld: status(withheldTax === null), settlementAmount: status(settlement === null),
      },
      complete: missing.length === 0,
      // This is a simulator, not an actual settlement ledger. Mark actual
      // readiness separately so complete input fields cannot be mistaken for
      // a finalized accounting result.
      actualReady: costBasis === 'HISTORICAL_UNIT_COST' && missing.length === 0 && settlement !== null,
      resultMode: 'ESTIMATE',
      warnings: [
        ...(missing.length ? [`${missing.length} input belum diisi; angka yang bergantung padanya tidak dihitung (belum diisi, bukan Rp0).`] : []),
        ...(cost === null ? ['HPP tidak tersedia; laba tidak dihitung dan tidak layak dianggap final.'] : costBasis === 'ESTIMATED_MASTER_COST' ? ['HPP memakai harga master produk, bukan snapshot biaya historis transaksi.'] : []),
        ...(!deliveryKnown ? ['Ongkir belum diketahui; tidak dianggap Rp0, hasil belum final.'] : []),
        ...(marketplacePct === null || paymentPct === null ? ['Biaya marketplace/pembayaran belum lengkap; isi tarif aktual untuk estimasi yang lebih akurat.'] : []),
        ...(taxStatus === 'UNKNOWN' ? ['Perlakuan pajak belum dikonfirmasi; taxWithheld dipisahkan dari taxExpense dan tidak otomatis mengurangi laba.'] : []),
        ...(settlement === null ? ['Settlement aktual belum diberikan; nominal settlement yang ditampilkan adalah estimasi, bukan hasil rekonsiliasi.'] : []),
      ],
    };
    return result;
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
    const omzet = list.reduce((s, t) => s + (typeof Laporan !== 'undefined' && Laporan && typeof Laporan.revenueAmount === 'function' ? Laporan.revenueAmount(t) : (t.total || 0)), 0);
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
