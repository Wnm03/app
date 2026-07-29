// investasi.js — Domain Investment: Portfolio, Dividend, Capital Gain/Loss, ROI,
// Dipindah ke modules/asset/investasi.js (Sesi 9 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Asset Allocation, Watchlist, Riwayat Transaksi. MODUL BARU — tidak mengubah
// API/modul yang sudah ada; hanya MEMBACA/MENULIS D.investments/D.investmentTx/
// D.investmentWatchlist (field baru, dibaca via `D.investments||[]` dst dengan
// fallback array kosong — pola sama dgn D.selfReward di self-reward-engine.js),
// jadi TIDAK perlu menyentuh literal default `D={...}` di
// features-helpers-global-security.js maupun DEFAULT_* di data-default.js.
// Dependency opsional (uid()/save()) dibaca lewat guard `typeof x!=='undefined'`
// sama seperti modul lain, supaya file ini aman dimuat/dites berdiri sendiri.
//
// Tidak ada DOM/render di file ini — kalau nanti mau ada UI, taruh di file
// terpisah (pola sama dgn dashboard-hub-favorit.js vs
// dashboard-hub-favorit-view.js) supaya logika murni ini tetap gampang dites
// lewat loadSource().
//
// DATA MODEL
// ----------
// Holding (D.investments[]): satu baris = satu posisi/instrumen yang dipegang.
//   { id, name, type, unit, avgPrice, currentPrice, notes, createdAt }
//     - unit        : jumlah unit/lembar/gram yang dipegang saat ini
//     - avgPrice    : harga rata-rata perolehan per unit (cost basis / unit)
//     - currentPrice: harga pasar terkini per unit (dipakai hitung nilai & ROI)
// Transaksi (D.investmentTx[]): riwayat beli/jual/dividen per holding.
//   { id, investmentId, type:'beli'|'jual'|'dividen', date, qty, price, fee,
//     amount, notes, realizedGain, createdAt }
//     - 'beli'   : qty & price wajib; fee opsional. Menambah unit & cost basis.
//     - 'jual'   : qty & price wajib; fee opsional. Mengurangi unit; realizedGain
//                  dihitung metode average cost: (price-avgPriceSaatItu)*qty-fee.
//     - 'dividen': amount wajib (nominal dividen diterima); tidak mengubah unit.
// Watchlist (D.investmentWatchlist[]): instrumen yang dipantau, BELUM dibeli.
//   { id, name, type, lastPrice, targetPrice, notes, createdAt }
//
// unit/avgPrice pada Holding SELALU diturunkan ulang (recompute) dari riwayat
// transaksi 'beli'/'jual' via recomputeHolding() setiap kali ada
// tambah/ubah/hapus transaksi — bukan ditulis manual — supaya konsisten &
// tidak pernah "nyasar" walau transaksi diedit/dihapus belakangan.

const INVESTMENT_TYPES = ['Saham', 'Reksa Dana', 'Obligasi', 'Deposito', 'Kripto', 'Emas', 'Lainnya'];

// isHoldingOwnershipSelf(h) — helper REUSE dari OwnershipEngine (Sesi 193,
// Ownership Sync Asset & Investasi). Balikin true kalau kepemilikan EFEKTIF
// holding investasi ini SELF (termasuk holding lama yg belum punya field
// `ownership` sama sekali — via OwnershipEngine.resolve() otomatis fallback
// ke SELF/DEFAULT, 100% backward compatible). Balikin false utk INVESTOR/
// CUSTOMER/THIRD_PARTY/FAMILY — holding2 tipe ini WAJIB dikecualikan dari
// agregat Investment.portfolioSummary()/assetAllocation() (dipakai jg oleh
// AssetPortfolioAPI "Portfolio") sesuai spesifikasi sesi ini, TAPI TIDAK
// dari Investment.getHoldings() — holding & riwayat transaksinya tetap ada
// & tetap bisa diakses/diedit apa adanya, cuma tidak ikut dijumlah ke total.
// Guard typeof OwnershipEngine: kalau engine belum dimuat, fallback true
// (anggap SELF/tidak exclude apa pun) — pola sama persis
// isAccOwnershipSelf()/isAssetOwnershipSelf() (Sesi 192/193).
function isHoldingOwnershipSelf(h) {
  if (typeof OwnershipEngine === 'undefined') return true;
  return OwnershipEngine.resolve(h).type === 'SELF';
}
function _invUid() {
  return typeof uid === 'function' ? uid() : Date.now() + Math.random();
}
function _invSave() {
  if (typeof save === 'function') save();
}
function _invToday() {
  return new Date().toISOString().slice(0, 10);
}

const Investment = {
  TYPES: INVESTMENT_TYPES,

  // ---------- Holding (Portfolio) ----------

  getHoldings() {
    return D.investments || [];
  },

  getHolding(id) {
    return Investment.getHoldings().find((h) => String(h.id) === String(id)) || null;
  },

  addHolding({ name, type, unit, avgPrice, currentPrice, notes, fundSource, titipanOwner } = {}) {
    if (!name || !String(name).trim()) throw new Error('Nama instrumen wajib diisi');
    D.investments = D.investments || [];
    const holding = {
      id: _invUid(),
      name: String(name).trim(),
      type: INVESTMENT_TYPES.includes(type) ? type : 'Lainnya',
      unit: isFinite(unit) && unit > 0 ? unit : 0,
      avgPrice: isFinite(avgPrice) && avgPrice > 0 ? avgPrice : 0,
      currentPrice: isFinite(currentPrice) && currentPrice > 0 ? currentPrice : (isFinite(avgPrice) ? avgPrice : 0),
      notes: notes || '',
      // kw-invest-titipan: sumber dana holding ini. 'sendiri' (default) = modal sendiri, tidak
      // ada efek tambahan. 'titipan' = sebagian/seluruh dana ini bukan milik sendiri (dititipkan
      // orang lain buat diinvestasikan) — porsi titipan otomatis disinkronkan sbg 1 entry Buku
      // Utang (D.debts, modul yang SUDAH ADA, lihat piutang-utang.js) via _syncTitipanDebt() di
      // bawah, supaya Kekayaan Bersih = Nilai Investasi − Utang Titipan (tidak overstated), TANPA
      // rumus/ledger baru — nilai investasi sendiri tetap dicatat penuh & transparan.
      fundSource: fundSource === 'titipan' ? 'titipan' : 'sendiri',
      titipanOwner: titipanOwner || '',
      debtLinkId: null,
      createdAt: Date.now(),
    };
    D.investments.push(holding);
    Investment._syncTitipanDebt(holding);
    _invSave();
    return holding;
  },

  updateHolding(id, patch = {}) {
    const h = Investment.getHolding(id);
    if (!h) throw new Error('Holding tidak ditemukan');
    if (patch.name !== undefined) h.name = String(patch.name).trim() || h.name;
    if (patch.type !== undefined) h.type = INVESTMENT_TYPES.includes(patch.type) ? patch.type : h.type;
    if (patch.currentPrice !== undefined && isFinite(patch.currentPrice) && patch.currentPrice >= 0) {
      h.currentPrice = patch.currentPrice;
    }
    if (patch.notes !== undefined) h.notes = patch.notes;
    if (patch.fundSource !== undefined) h.fundSource = patch.fundSource === 'titipan' ? 'titipan' : 'sendiri';
    if (patch.titipanOwner !== undefined) h.titipanOwner = patch.titipanOwner || '';
    Investment._syncTitipanDebt(h);
    _invSave();
    return h;
  },

  deleteHolding(id) {
    const h = Investment.getHolding(id);
    if (h && h.debtLinkId && typeof D !== 'undefined' && D.debts) {
      D.debts = D.debts.filter((d) => String(d.id) !== String(h.debtLinkId));
    }
    const before = (D.investments || []).length;
    D.investments = (D.investments || []).filter((h) => String(h.id) !== String(id));
    D.investmentTx = (D.investmentTx || []).filter((t) => String(t.investmentId) !== String(id));
    const deleted = (D.investments || []).length < before;
    if (deleted) _invSave();
    return deleted;
  },

  // _syncTitipanDebt() — satu titik akses yang menjaga entry Buku Utang (D.debts) tetap sinkron
  // dgn holding 'titipan': nilai utang = holdingCost(h) (cost basis holding ini, angka yang SUDAH
  // ADA lewat holdingCost() di bawah — 0 rumus baru). Dipanggil tiap kali holding dibuat/diedit
  // ATAU cost basis-nya berubah lewat recomputeHolding() (buy/sell tx baru). fundSource='sendiri'
  // (atau balik dari 'titipan') otomatis menghapus entry utang yang tertaut, tidak menyisakan sampah.
  _syncTitipanDebt(h) {
    if (!h || typeof D === 'undefined' || !D.debts) return;
    if (h.fundSource === 'titipan') {
      const amount = Investment.holdingCost(h);
      const owner = (h.titipanOwner && String(h.titipanOwner).trim()) || 'Pemilik dana titipan';
      const catatan = `Dana titipan investasi: ${h.name}`;
      let debt = h.debtLinkId ? D.debts.find((d) => String(d.id) === String(h.debtLinkId)) : null;
      if (debt) {
        Object.assign(debt, { name: owner, nilai: amount, catatan, lunas: amount <= 0 });
      } else {
        debt = { id: _invUid(), name: owner, nilai: amount, bunga: 0, cicilanBulanan: 0, tanggal: _invToday(), jatuhTempo: '', catatan, lunas: amount <= 0 };
        D.debts.push(debt);
        h.debtLinkId = debt.id;
      }
    } else if (h.debtLinkId) {
      D.debts = D.debts.filter((d) => String(d.id) !== String(h.debtLinkId));
      h.debtLinkId = null;
    }
  },

  // Hitung ulang unit & avgPrice sebuah holding murni dari riwayat transaksi
  // 'beli'/'jual' (metode average cost), diurutkan berdasarkan tanggal lalu
  // createdAt sebagai tie-breaker supaya urutan input yang tanggalnya sama
  // tetap deterministik.
  recomputeHolding(investmentId) {
    const h = Investment.getHolding(investmentId);
    if (!h) return null;
    const txs = Investment.getTransactions({ investmentId })
      .filter((t) => t.type === 'beli' || t.type === 'jual')
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0)));
    let unit = 0;
    let totalCost = 0;
    let avgPrice = 0;
    for (const t of txs) {
      const qty = Math.max(0, t.qty || 0);
      const fee = t.fee || 0;
      if (t.type === 'beli') {
        totalCost += qty * (t.price || 0) + fee;
        unit += qty;
        avgPrice = unit > 0 ? totalCost / unit : 0;
      } else {
        const sellQty = Math.min(qty, unit);
        t.realizedGain = (t.price || 0) * sellQty - avgPrice * sellQty - fee;
        totalCost -= avgPrice * sellQty;
        unit -= sellQty;
        if (unit <= 0) { unit = 0; totalCost = 0; avgPrice = 0; }
      }
    }
    h.unit = unit;
    h.avgPrice = avgPrice;
    Investment._syncTitipanDebt(h);
    _invSave();
    return h;
  },

  // ---------- Transaksi (Beli / Jual / Dividen) ----------

  getTransactions({ investmentId, type, from, to } = {}) {
    let list = D.investmentTx || [];
    if (investmentId !== undefined) list = list.filter((t) => String(t.investmentId) === String(investmentId));
    if (type) list = list.filter((t) => t.type === type);
    if (from) list = list.filter((t) => t.date >= from);
    if (to) list = list.filter((t) => t.date <= to);
    return list.slice().sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
  },

  addTransaction({ investmentId, type, date, qty, price, fee, amount, notes } = {}) {
    const h = Investment.getHolding(investmentId);
    if (!h) throw new Error('Holding tidak ditemukan');
    if (!['beli', 'jual', 'dividen'].includes(type)) throw new Error('Jenis transaksi tidak valid');
    if ((type === 'beli' || type === 'jual') && (!isFinite(qty) || qty <= 0)) {
      throw new Error('Jumlah unit wajib diisi & lebih dari 0');
    }
    if (type === 'jual' && qty > h.unit) {
      throw new Error(`Jumlah jual (${qty}) melebihi unit yang dipegang (${h.unit})`);
    }
    if (type === 'dividen' && (!isFinite(amount) || amount <= 0)) {
      throw new Error('Nominal dividen wajib diisi & lebih dari 0');
    }
    D.investmentTx = D.investmentTx || [];
    const tx = {
      id: _invUid(),
      investmentId: h.id,
      type,
      date: date || _invToday(),
      qty: (type === 'beli' || type === 'jual') ? qty : 0,
      price: (type === 'beli' || type === 'jual') ? (price || 0) : 0,
      fee: fee || 0,
      amount: type === 'dividen' ? amount : 0,
      notes: notes || '',
      realizedGain: 0,
      createdAt: Date.now(),
    };
    D.investmentTx.push(tx);
    if (type === 'beli' || type === 'jual') Investment.recomputeHolding(h.id);
    else _invSave();
    return tx;
  },

  deleteTransaction(id) {
    const tx = (D.investmentTx || []).find((t) => String(t.id) === String(id));
    if (!tx) return false;
    D.investmentTx = (D.investmentTx || []).filter((t) => String(t.id) !== String(id));
    if (tx.type === 'beli' || tx.type === 'jual') Investment.recomputeHolding(tx.investmentId);
    else _invSave();
    return true;
  },

  // ---------- Nilai / Capital Gain-Loss / ROI ----------

  holdingValue(h) {
    return (h.unit || 0) * (h.currentPrice || h.avgPrice || 0);
  },
  holdingCost(h) {
    return (h.unit || 0) * (h.avgPrice || 0);
  },
  holdingGainLoss(h) {
    return Investment.holdingValue(h) - Investment.holdingCost(h);
  },
  holdingROI(h) {
    const cost = Investment.holdingCost(h);
    return cost > 0 ? (Investment.holdingGainLoss(h) / cost) * 100 : 0;
  },

  // Total capital gain/loss yang SUDAH direalisasikan lewat transaksi 'jual'
  // (opsional difilter per holding).
  realizedGainLoss(investmentId) {
    return Investment.getTransactions({ investmentId, type: 'jual' })
      .reduce((s, t) => s + (t.realizedGain || 0), 0);
  },

  dividendTotal(investmentId, year) {
    let list = Investment.getTransactions({ investmentId, type: 'dividen' });
    if (year) list = list.filter((t) => String(t.date).slice(0, 4) === String(year));
    return list.reduce((s, t) => s + (t.amount || 0), 0);
  },

  // ---------- Ringkasan Portofolio & Alokasi Aset ----------

  // portfolioSummary() — Sesi 193 (Ownership Sync): holdings difilter
  // isHoldingOwnershipSelf() dulu (0 rumus baru, cuma nambah 1 filter di
  // awal). totalDividend/totalRealizedGain SEBELUMNYA dihitung lewat
  // dividendTotal()/realizedGainLoss() TANPA investmentId (agregat semua
  // holding sekaligus) — sekarang dijumlah PER holding SELF yang lolos
  // filter (Investment.dividendTotal(h.id)/realizedGainLoss(h.id), fungsi
  // yang SUDAH ADA, 0 logic baru), supaya holding non-SELF ikut
  // dikecualikan dari kedua total itu juga.
  portfolioSummary() {
    const holdings = Investment.getHoldings().filter(isHoldingOwnershipSelf);
    const totalValue = holdings.reduce((s, h) => s + Investment.holdingValue(h), 0);
    const totalCost = holdings.reduce((s, h) => s + Investment.holdingCost(h), 0);
    const totalGainLoss = totalValue - totalCost;
    const roiPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const totalDividend = holdings.reduce((s, h) => s + Investment.dividendTotal(h.id), 0);
    const totalRealizedGain = holdings.reduce((s, h) => s + Investment.realizedGainLoss(h.id), 0);
    return {
      holdingsCount: holdings.length,
      totalValue,
      totalCost,
      totalGainLoss,
      roiPct,
      totalDividend,
      totalRealizedGain,
    };
  },

  // assetAllocation() — Sesi 193 (Ownership Sync): holdings difilter
  // isHoldingOwnershipSelf() dulu (0 rumus baru, cuma nambah 1 filter).
  assetAllocation() {
    const holdings = Investment.getHoldings().filter(isHoldingOwnershipSelf);
    const totalValue = holdings.reduce((s, h) => s + Investment.holdingValue(h), 0);
    const byType = new Map();
    for (const h of holdings) {
      const v = Investment.holdingValue(h);
      byType.set(h.type, (byType.get(h.type) || 0) + v);
    }
    return Array.from(byType.entries())
      .map(([type, value]) => ({ type, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  },

  // ---------- Watchlist ----------

  getWatchlist() {
    return D.investmentWatchlist || [];
  },

  addWatch({ name, type, lastPrice, targetPrice, notes } = {}) {
    if (!name || !String(name).trim()) throw new Error('Nama instrumen wajib diisi');
    D.investmentWatchlist = D.investmentWatchlist || [];
    const item = {
      id: _invUid(),
      name: String(name).trim(),
      type: INVESTMENT_TYPES.includes(type) ? type : 'Lainnya',
      lastPrice: isFinite(lastPrice) && lastPrice >= 0 ? lastPrice : 0,
      targetPrice: isFinite(targetPrice) && targetPrice >= 0 ? targetPrice : 0,
      notes: notes || '',
      createdAt: Date.now(),
    };
    D.investmentWatchlist.push(item);
    _invSave();
    return item;
  },

  updateWatch(id, patch = {}) {
    const item = Investment.getWatchlist().find((w) => String(w.id) === String(id));
    if (!item) throw new Error('Item watchlist tidak ditemukan');
    if (patch.name !== undefined) item.name = String(patch.name).trim() || item.name;
    if (patch.type !== undefined) item.type = INVESTMENT_TYPES.includes(patch.type) ? patch.type : item.type;
    if (patch.lastPrice !== undefined && isFinite(patch.lastPrice) && patch.lastPrice >= 0) item.lastPrice = patch.lastPrice;
    if (patch.targetPrice !== undefined && isFinite(patch.targetPrice) && patch.targetPrice >= 0) item.targetPrice = patch.targetPrice;
    if (patch.notes !== undefined) item.notes = patch.notes;
    _invSave();
    return item;
  },

  removeWatch(id) {
    const before = Investment.getWatchlist().length;
    D.investmentWatchlist = Investment.getWatchlist().filter((w) => String(w.id) !== String(id));
    const deleted = D.investmentWatchlist.length < before;
    if (deleted) _invSave();
    return deleted;
  },

  // Watchlist yang harga terakhirnya sudah menyentuh/lewat harga target beli
  // (lastPrice <= targetPrice, asumsi targetPrice = harga incaran utk beli).
  watchlistAlerts() {
    return Investment.getWatchlist().filter((w) => w.targetPrice > 0 && w.lastPrice > 0 && w.lastPrice <= w.targetPrice);
  },
};

if (typeof window !== 'undefined') {
  window.Investment = Investment;
  window.INVESTMENT_TYPES = INVESTMENT_TYPES;
}
