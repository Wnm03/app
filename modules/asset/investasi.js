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
//
// AUD-008 (Sesi 462) — MULTI-OWNER TITIPAN: `fundSource`/`titipanOwner` di
// atas cuma "1 flag + 1 nama" — tidak bisa merepresentasikan 1 holding yang
// dititipkan >1 orang sekaligus (mis. 60% Ayah + 40% Budi). Ditambah opsional
// `h.owners` (array `{ownerId,porsi,ownerName,isSelf}`, format & validasi
// PERSIS sama dgn `a.owners` di aset.js) lewat MultiOwnerEngine (SUDAH ADA,
// modules/shared/multi-owner-engine.js, Sesi 390/406b/masih dipakai aset.js
// — 0 engine baru). `fundSource`/`titipanOwner` TETAP ada & tetap jadi jalur
// single-owner default (backward compatible, addHolding/updateHolding tidak
// berubah) — `h.owners` murni ADITIF, cuma diisi kalau user eksplisit pakai
// Investment.setOwners() (>1 baris pemilik). Investment.getOwners(h) adalah
// SATU titik baca yang tahu prioritas: h.owners valid (multi-owner) > sintesis
// dari fundSource/titipanOwner (single-owner legacy) > default 100% SELF —
// dipakai _syncTitipanDebt() supaya 1 holding titipan bisa menghasilkan LEBIH
// DARI 1 entry Buku Utang (1 per owner non-SELF, ditandai
// `linkedInvestmentId`+`linkedOwnerId` di object utangnya sendiri, pola SAMA
// PERSIS Aset._syncOwnerDebts()/`linkedAssetId`+`linkedOwnerId`), TANPA
// mengubah perilaku holding single-owner yang sudah ada (tetap 1 entry utang,
// 0 regresi).

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

  addHolding({ name, type, unit, avgPrice, currentPrice, notes, fundSource, titipanOwner, zakatable, purchaseDate } = {}) {
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
      // purchaseDate (s476a2 — lihat docs/s476-PLAN-migrate-investasi-to-holdings.md, bagian
      // "AUDIT ROI/CAGR lama vs baru"): field ADITIF opsional, dibawa dari a.tanggal saat
      // migrasi dari Buku Aset. Dipakai holdingYieldPct()/portfolioSummary().yieldPct utk
      // replikasi PERSIS formula CAGR lama (Aset.investmentPerformance(), aset.js) yang
      // sebelumnya HILANG total di sisi Investment.* karena skema Holding tidak pernah
      // punya field tanggal. null kalau tidak diisi (CAGR holding itu tidak bisa dihitung,
      // konsisten dgn perilaku lama yang skip aset tanpa a.tanggal).
      purchaseDate: purchaseDate || null,
      // zakatable (s476a, Blocker B — lihat docs/s476-PLAN-migrate-investasi-to-holdings.md):
      // field ADITIF, default false sama seperti aset baru di Buku Aset (a.zakatable).
      // Dibawa saat migrasi dari D.assets & diikutsertakan hitungan Zakat Maal
      // (pajak-pbb-zakat.js Zakat.hitungMaal()) & toggle FI "Hanya Zakatable"
      // (modules-calc.js FI.investmentAssetValue()) — lihat wiring di kedua file itu.
      zakatable: !!zakatable,
      // kw-invest-titipan: sumber dana holding ini. 'sendiri' (default) = modal sendiri, tidak
      // ada efek tambahan. 'titipan' = sebagian/seluruh dana ini bukan milik sendiri (dititipkan
      // orang lain buat diinvestasikan) — porsi titipan otomatis disinkronkan sbg 1 entry Buku
      // Utang (D.debts, modul yang SUDAH ADA, lihat piutang-utang.js) via _syncTitipanDebt() di
      // bawah, supaya Kekayaan Bersih = Nilai Investasi − Utang Titipan (tidak overstated), TANPA
      // rumus/ledger baru — nilai investasi sendiri tetap dicatat penuh & transparan.
      fundSource: fundSource === 'titipan' ? 'titipan' : 'sendiri',
      titipanOwner: titipanOwner || '',
      // custodianId (S540-B, Tahap 2/4 DESIGN-S540-CUSTODIAN-GROUPING.md):
      // referensi opsional ke `D.investmentCustodians[].id`
      // (CustodianRegistry, S540-A) — platform/kustodian tempat instrumen
      // ini dibeli (mis. semua reksadana yang dibeli lewat 🏦 Majoris).
      // Default `null` (belum ada kustodian) — TAHAP INI READ-ONLY, 0 UI
      // untuk mengisinya (itu S540-C). Holding lama otomatis tidak punya
      // field ini sama sekali (bukan cuma null — field-nya literally tidak
      // ada di object lama), `getHoldings()` tetap balikin apa adanya
      // (pass-through, 0 transformasi) — consumer lain yang belum tahu
      // soal field ini (investasi-list-view.js, invest-ai-widget.js, dana-
      // titipan-portfolio-presenter.js, dst) TIDAK terpengaruh sama sekali.
      custodianId: null,
      // assetId (S552, generalisasi rekomendasi B.2 dari audit S551 -- lihat
      // FIX-s551-asset-investasi-duplicate-name-owner-mismatch-audit.md &
      // FIX-s552-asset-investasi-link-badge.md): referensi opsional satu arah ke
      // D.assets[].id, mirror PERSIS pola D.vehicles[].assetId (S506
      // resolveVehicleAssetLink). TIDAK ada snapshot nilai/owners dari aset ke holding
      // ini -- murni pointer, supaya kedua sisi (Aset & Investasi) bisa saling
      // resolveInvestmentByAssetId()/resolveLinkedInvestmentAsset() (di bawah) & saling
      // tampilkan warning kepemilikan beda otomatis, tanpa harus buka 2 modal manual.
      assetId: null,
      // accountId (S601-3, DL-S601-3 — lihat AUDIT-S600-HOLDING-GAP-OWNER-DROPDOWNS.md
      // Temuan #1): referensi opsional satu arah ke D.accounts[].id, pola TULIS
      // PERSIS SAMA dengan assetId/custodianId di atas (falsy→null, 0 validasi id
      // valid, murni pointer). Dipakai findLinkedHoldingForAccount()/
      // resolveOwnerDefaultForAccount() (transaksi.js) supaya Holding yang
      // langsung tertaut akun (mis. akun brokerage "Majoris") bisa jadi sumber
      // resolusi Owner tanpa harus lewat Aset perantara. Default `null` (belum
      // ditautkan) — holding lama otomatis tidak berubah perilaku (pass-through).
      accountId: null,
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
    if (patch.zakatable !== undefined) h.zakatable = !!patch.zakatable;
    if (patch.purchaseDate !== undefined) h.purchaseDate = patch.purchaseDate || null;
    if (patch.fundSource !== undefined) h.fundSource = patch.fundSource === 'titipan' ? 'titipan' : 'sendiri';
    if (patch.titipanOwner !== undefined) h.titipanOwner = patch.titipanOwner || '';
    // custodianId (S540-C, Tahap 3/4 DESIGN-S540-CUSTODIAN-GROUPING.md):
    // jalur tulis BARU yang sengaja belum ada di S540-B (dicatat eksplisit
    // di komentar sesi itu sbg scope S540-C). Referensi opsional ke
    // `D.investmentCustodians[].id` (CustodianRegistry, S540-A) — diisi
    // lewat dropdown "Pilih/Buat Kustodian" di investmentModal
    // (InvestmentListUI, investasi-list-view.js). Nilai falsy (''/null)
    // ditulis sbg `null` (lepas kustodian) — pola sama persis
    // `patch.titipanOwner`/field opsional lain di atas. 0 validasi bahwa
    // id-nya benar-benar ada di registry (sama seperti `ownerId` di
    // getOwners() — caller/UI yang menjaga id valid, murni referensi).
    if (patch.custodianId !== undefined) h.custodianId = patch.custodianId || null;
    // assetId (S552) -- falsy ('' / null / '__unlinked__') dinormalisasi jadi null (lepas
    // tautan), pola sama persis custodianId di atas & saveVehicle() (S506).
    if (patch.assetId !== undefined) h.assetId = patch.assetId || null;
    // accountId (S601-3) -- falsy ('' / null / '__unlinked__') dinormalisasi jadi null
    // (lepas tautan), pola sama persis assetId/custodianId di atas.
    if (patch.accountId !== undefined) h.accountId = patch.accountId || null;
    Investment._syncTitipanDebt(h);
    _invSave();
    return h;
  },

  deleteHolding(id) {
    const h = Investment.getHolding(id);
    if (h && typeof D !== 'undefined' && D.debts) {
      // Hapus SEMUA entry utang tertaut, bukan cuma h.debtLinkId (yang cuma kepakai
      // di kasus single-owner) — multi-owner (AUD-008) bisa punya >1 entry per
      // holding, ditandai `linkedInvestmentId` di tiap object utangnya sendiri.
      D.debts = D.debts.filter((d) => d.linkedInvestmentId !== h.id && String(d.id) !== String(h.debtLinkId));
    }
    const before = (D.investments || []).length;
    D.investments = (D.investments || []).filter((h) => String(h.id) !== String(id));
    D.investmentTx = (D.investmentTx || []).filter((t) => String(t.investmentId) !== String(id));
    const deleted = (D.investments || []).length < before;
    if (deleted) _invSave();
    return deleted;
  },

  // getOwners(h) — AUD-008 (Sesi 462): SATU titik baca daftar pemilik EFEKTIF
  // sebuah holding, prioritas sama persis MultiOwnerEngine.getOwners() (aset.js):
  //   1. h.owners (array) valid lewat MultiOwnerEngine.validateOwners() -> dipakai
  //      apa adanya (multi-owner, hasil Investment.setOwners()).
  //   2. h.fundSource==='titipan' (single-owner legacy, field lama) -> disintesis
  //      1 baris owner non-SELF porsi 100%, nama dari h.titipanOwner.
  //   3. Selain itu -> default 1 baris SELF porsi 100% (selaras OwnershipEngine/
  //      MultiOwnerEngine default).
  // MultiOwnerEngine TIDAK bisa dipakai langsung buat cabang 2 (beda nama field
  // dari titipanAmount/nilai yang dibaca _synthesizeFromTitipan() punya aset.js —
  // lihat komentar di file itu), jadi disintesis manual di sini; cabang 1 & 3
  // tetap delegasi penuh ke MultiOwnerEngine (0 duplikasi validasi/porsi).
  getOwners(h) {
    if (!h) return [];
    if (Array.isArray(h.owners) && typeof MultiOwnerEngine !== 'undefined') {
      const res = MultiOwnerEngine.getOwners(h);
      if (res && res.ok && !res.isSynthesized) return res.owners;
    }
    if (h.fundSource === 'titipan') {
      const ownerName = (h.titipanOwner && String(h.titipanOwner).trim()) || 'Pemilik dana titipan';
      return [{ ownerId: 'titipan_investor', porsi: 100, ownerName, isSelf: false }];
    }
    return [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }];
  },

  // setOwners(id, owners) — AUD-008 (Sesi 462): tulis daftar pemilik MULTI-OWNER
  // (>=1 baris, total porsi 100%, divalidasi MultiOwnerEngine.validateOwners() —
  // 0 validasi baru) ke holding. Kasus balik ke 1 owner SELF 100%: `h.owners`
  // dihapus & fundSource direset ke 'sendiri' supaya cuma ADA SATU sumber
  // kebenaran aktif per holding (h.owners ATAU fundSource/titipanOwner, tidak
  // dua-duanya sekaligus) — getOwners() di atas sudah toleran baca kondisi ini.
  setOwners(id, owners) {
    const h = Investment.getHolding(id);
    if (!h) throw new Error('Holding tidak ditemukan');
    if (typeof MultiOwnerEngine === 'undefined') throw new Error('MultiOwnerEngine belum dimuat');
    const res = MultiOwnerEngine.setOwners(h, owners);
    if (!res.ok) throw new Error(res.reason);
    const nextOwners = res.entity.owners;
    if (nextOwners.length === 1 && nextOwners[0].isSelf) {
      delete h.owners;
      h.fundSource = 'sendiri';
      h.titipanOwner = '';
    } else {
      h.owners = nextOwners;
      h.fundSource = nextOwners.some((o) => !o.isSelf) ? 'titipan' : 'sendiri';
    }
    Investment._syncTitipanDebt(h);
    _invSave();
    return h;
  },

  // _syncTitipanDebt() — satu titik akses yang menjaga entry Buku Utang (D.debts) tetap sinkron
  // dgn holding 'titipan': nilai utang = holdingCost(h) (cost basis holding ini, angka yang SUDAH
  // ADA lewat holdingCost() di bawah — 0 rumus baru). Dipanggil tiap kali holding dibuat/diedit
  // ATAU cost basis-nya berubah lewat recomputeHolding() (buy/sell tx baru). fundSource='sendiri'
  // (atau balik dari 'titipan') otomatis menghapus entry utang yang tertaut, tidak menyisakan sampah.
  // `linkedInvestmentId` (Sesi 460): TAG di object utang itu sendiri (bukan cuma h.debtLinkId yang
  // nunjuk SATU ARAH dari holding ke utang) — pola SAMA PERSIS `linkedAssetId` di aset.js
  // (Aset._syncOwnerDebts()). Sebelum sesi ini, utang hasil titipan investasi TIDAK PUNYA penanda
  // apa pun di object-nya sendiri, jadi piutang-utang.js (badge "🔒 Titipan" & exclude dari
  // DebtStrategy) TIDAK BISA mengenalinya — cuma entri titipan ASET yang dikenali (S455).
  //
  // AUD-008 (Sesi 462): direvisi jadi 1 entry utang PER OWNER non-SELF dari
  // Investment.getOwners(h) — bukan cuma 1 entry per holding — pola SAMA PERSIS
  // Aset._syncOwnerDebts() (`linkedOwnerId` per baris). Holding single-owner lama
  // (fundSource='titipan', belum pernah pakai setOwners()) TETAP menghasilkan
  // TEPAT 1 entry (getOwners() sintesis 1 baris porsi 100%) dgn nilai yang SAMA
  // PERSIS seperti sebelumnya (holdingCost(h) * 100/100 = holdingCost(h)) — 0
  // regresi. h.debtLinkId (pointer lama, dipakai deleteHolding()/kode lama) tetap
  // diisi id-nya KALAU cuma ada 1 entry, supaya 100% backward compatible dgn
  // pemanggil yang masih baca field itu.
  _syncTitipanDebt(h) {
    if (!h || typeof D === 'undefined' || !D.debts) return;
    const owners = Investment.getOwners(h).filter((o) => !o.isSelf && o.porsi > 0);
    const cost = Investment.holdingCost(h);
    const catatan = `Dana titipan investasi: ${h.name}`;
    const existingLinked = D.debts.filter((d) => d.linkedInvestmentId === h.id);
    const keepIds = new Set();
    owners.forEach((o) => {
      const ownerId = o.ownerId || 'titipan_investor';
      const amount = cost * (o.porsi / 100);
      let debt = existingLinked.find((d) => (d.linkedOwnerId || 'titipan_investor') === ownerId);
      if (debt) {
        Object.assign(debt, { name: o.ownerName, nilai: amount, catatan, lunas: amount <= 0, linkedInvestmentId: h.id, linkedOwnerId: ownerId });
      } else {
        debt = { id: _invUid(), name: o.ownerName, nilai: amount, bunga: 0, cicilanBulanan: 0, tanggal: _invToday(), jatuhTempo: '', catatan, lunas: amount <= 0, linkedInvestmentId: h.id, linkedOwnerId: ownerId };
        D.debts.push(debt);
      }
      keepIds.add(ownerId);
    });
    D.debts = D.debts.filter((d) => !(d.linkedInvestmentId === h.id && !keepIds.has(d.linkedOwnerId || 'titipan_investor')));
    const linkedNow = D.debts.filter((d) => d.linkedInvestmentId === h.id);
    h.debtLinkId = linkedNow.length === 1 ? linkedNow[0].id : null;
  },

  // migrateLegacyTitipanOwners() — Sesi 545 (GAP3-AUD-001, docs/BUG_REGISTRY.md,
  // ditutup via audit dokumentasi s485f/PATCH-README-s485f-gap3-audit-closeout.md).
  // Migrasi SEKALI JALAN: holding legacy fundSource==='titipan' yang BELUM PERNAH
  // lewat setOwners() (h.owners belum array) selalu balik ownerId LITERAL
  // 'titipan_investor' dari getOwners() (branch sintesis di atas) — SEMUA holding
  // titipan legacy beda orang collapse jadi 1 identitas yang sama kalau
  // dibandingkan lintas holding/lintas domain (Aset pakai OwnerRegistry sejak
  // S490, baris baru Investasi pakai OwnerRegistry sejak S491 — HANYA jalur
  // sintesis legacy ini yang belum). Fungsi ini menulis h.owners eksplisit
  // (derive ownerId per NAMA via OwnerRegistry.findOrCreate(), API resmi S489,
  // 0 fungsi match baru) supaya holding lama masuk ke jalur MultiOwnerEngine
  // (cabang 1 getOwners(), bukan sintesis 'titipan_investor' lagi) — pola SAMA
  // PERSIS Investment.setOwners() yang sudah dipakai user lewat UI "⚖️ Atur
  // Porsi Kepemilikan", cuma dipanggil otomatis untuk data lama.
  //
  // KENAPA TIDAK lazy di DALAM getOwners() itu sendiri (opsi yang ditolak):
  // getOwners() dipanggil berkali-kali per render (getter murni, 0 side-effect
  // sejak awal file ini) — OwnerRegistry.findOrCreate() PUNYA side-effect (push
  // ke D.ownerRegistry + save()), itu pelanggaran kontrak getter kalau ditaruh
  // di sana. Lebih parah lagi: ownerId hasil sintesis lazy akan BEDA dari
  // 'titipan_investor' literal yang SUDAH tersimpan di D.debts[].linkedOwnerId
  // entri lama → _syncTitipanDebt() (dipanggil dari banyak titik) jadi salah
  // cocok, entri utang lama KEBUANG & dibuat ulang dgn `id` baru tiap kali beda
  // sesi render. Migrasi eksplisit sekali-jalan (fungsi ini) menghindari itu.
  //
  // KONTINUITAS UTANG: entri D.debts hasil _syncTitipanDebt() versi LAMA
  // tersimpan dgn `linkedOwnerId:'titipan_investor'` literal. Kalau field itu
  // tidak disesuaikan LEBIH DULU, _syncTitipanDebt() yang dipanggil dari
  // setOwners() di bawah TIDAK akan menemukan entri lama itu (karena mencari
  // `linkedOwnerId===ownerId baru dari registry`) → entri lama KEBUANG, entri
  // baru dibuat dgn `id` baru (histori/status `lunas` hilang). Makanya baris
  // `linkedOwnerId` di-relabel MANUAL di sini dulu (SEBELUM setOwners()
  // dipanggil) supaya _syncTitipanDebt() mencocokkan & meng-UPDATE entri
  // existing, bukan hapus+buat baru — 0 perubahan `id`/histori `lunas` pada
  // entri utang yang sudah ada.
  //
  // IDEMPOTENT: holding yang SUDAH punya `h.owners` (array) di-skip
  // (`Array.isArray(h.owners)` check) — jalan ulang fungsi ini aman, 0 efek
  // kalau dipanggil lagi setelah migrasi pertama.
  //
  // TIDAK di-wire ke boot/auto-run sesi ini (disiplin "1 task = 1 sesi" sama
  // persis S489: fondasi dulu, TANPA wiring) — keputusan KAPAN/DI MANA
  // dipanggil (mis. sekali saat boot, atau tombol manual) sengaja ditunda ke
  // sesi terpisah yang eksplisit memutuskan itu.
  //
  // Return: {migrated, skipped} — jumlah holding yang dimigrasi vs dilewati
  // (bukan 'titipan' atau sudah punya owners[]).
  migrateLegacyTitipanOwners() {
    if (typeof D === 'undefined' || !Array.isArray(D.investments)) return { migrated: 0, skipped: 0 };
    if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
      throw new Error('OwnerRegistry belum dimuat');
    }
    let migrated = 0;
    let skipped = 0;
    D.investments.forEach((h) => {
      if (!h || h.fundSource !== 'titipan' || Array.isArray(h.owners)) { skipped++; return; }
      const ownerName = (h.titipanOwner && String(h.titipanOwner).trim()) || 'Pemilik dana titipan';
      const ownerId = OwnerRegistry.findOrCreate(ownerName);
      if (Array.isArray(D.debts)) {
        D.debts.forEach((d) => {
          if (d && d.linkedInvestmentId === h.id && (d.linkedOwnerId || 'titipan_investor') === 'titipan_investor') {
            d.linkedOwnerId = ownerId;
          }
        });
      }
      Investment.setOwners(h.id, [{ ownerId, porsi: 100, ownerName, isSelf: false }]);
      migrated++;
    });
    return { migrated, skipped };
  },

  // migrateOwnersToRegistry() — R2 (audit ownership/titipan, lanjutan GAP3-AUD-001
  // S545/546): pola SAMA PERSIS Aset.migrateOwnersToRegistry() — baris h.owners[]
  // non-SELF yang dibuat SEBELUM investmentOwnersModal disambungkan ke
  // OwnerRegistry (S491) masih pakai ownerId lama (uid() ad-hoc); ini beda kasus
  // dari migrateLegacyTitipanOwners() di atas (yang menyasar fundSource==='titipan'
  // single-owner legacy, BELUM PERNAH punya h.owners[] array sama sekali).
  // Relabel D.debts[].linkedOwnerId LEBIH DULU (kontinuitas histori/lunas), baru
  // ganti ownerId baris. IDEMPOTENT. GUARD tabrakan sama persis versi Aset (skip
  // utuh 1 holding kalau konsolidasi bikin 2 baris ownerId sama).
  migrateOwnersToRegistry() {
    if (typeof D === 'undefined' || !Array.isArray(D.investments)) return { migrated: 0, skipped: 0, conflicts: 0 };
    if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
      throw new Error('OwnerRegistry belum dimuat');
    }
    let migrated = 0, skipped = 0, conflicts = 0;
    D.investments.forEach((h) => {
      if (!h || !Array.isArray(h.owners) || !h.owners.length) { skipped++; return; }
      const plan = [];
      let touched = false;
      h.owners.forEach((o) => {
        if (!o || o.isSelf || !o.ownerName) return;
        const canonical = OwnerRegistry.findOrCreate(String(o.ownerName).trim());
        if (canonical !== o.ownerId) { plan.push({ row: o, oldId: o.ownerId, newId: canonical }); touched = true; }
      });
      if (!touched) { skipped++; return; }
      const resultIds = h.owners.map((o) => (o && !o.isSelf && plan.some((p) => p.row === o)) ? plan.find((p) => p.row === o).newId : (o ? o.ownerId : null));
      const nonSelfResultIds = h.owners.map((o, i) => ({ o, id: resultIds[i] })).filter((x) => x.o && !x.o.isSelf).map((x) => x.id);
      if (new Set(nonSelfResultIds).size !== nonSelfResultIds.length) { conflicts++; return; }
      plan.forEach(({ row, oldId, newId }) => {
        if (Array.isArray(D.debts)) {
          D.debts.forEach((d) => { if (d && d.linkedInvestmentId === h.id && (d.linkedOwnerId || 'titipan_investor') === oldId) d.linkedOwnerId = newId; });
        }
        row.ownerId = newId;
      });
      Investment._syncTitipanDebt(h);
      migrated += plan.length;
    });
    return { migrated, skipped, conflicts };
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

  // AUD-INV-SRC (sesi ini) — parameter baru `accountId` (OPSIONAL, backward compatible:
  // pemanggil lama yang tidak mengirim field ini tetap jalan persis seperti sebelumnya, 0
  // regresi). Kalau diisi, tx Beli/Jual holding ini otomatis bikin 1 transaksi tertaut di
  // D.transactions (expense utk Beli, income utk Jual) -- pola SAMA PERSIS
  // Renov.saveItem()/togglePaid() (modules/home/renovasi.js, `accountId` -> D.transactions.push
  // dgn category/note/date, TANPA update saldo manual krn saldo akun selalu DITURUNKAN dari
  // D.transactions, bukan field tersendiri). `tx.linkedTxId` menyimpan id transaksi Keuangan
  // itu (dibaca UI utk refresh renderKeuangan()/renderDashboard() & pesan konfirmasi hapus,
  // dihapus otomatis oleh deleteTransaction() di bawah). Dividen SENGAJA tidak disinkron di
  // sesi ini (di luar scope "Beli/Jual" yang diminta) -- accountId utk tipe itu diabaikan.
  addTransaction({ investmentId, type, date, qty, price, fee, amount, notes, accountId } = {}) {
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
    const txDate = date || _invToday();
    const txFee = fee || 0;
    const tx = {
      id: _invUid(),
      investmentId: h.id,
      type,
      date: txDate,
      qty: (type === 'beli' || type === 'jual') ? qty : 0,
      price: (type === 'beli' || type === 'jual') ? (price || 0) : 0,
      fee: txFee,
      amount: type === 'dividen' ? amount : 0,
      notes: notes || '',
      realizedGain: 0,
      createdAt: Date.now(),
      accountId: accountId || '',
      linkedTxId: null,
    };
    if (accountId && (type === 'beli' || type === 'jual') && typeof D !== 'undefined' && D.accounts && D.accounts.some((a) => String(a.id) === String(accountId))) {
      D.transactions = D.transactions || [];
      const linked = {
        id: _invUid(),
        type: type === 'beli' ? 'expense' : 'income',
        amount: (qty * (price || 0)) + (type === 'beli' ? txFee : -txFee),
        category: 'Investasi',
        subcategory: h.name,
        accountId,
        payMethod: 'tunai',
        note: (type === 'beli' ? 'Beli Investasi: ' : 'Jual Investasi: ') + h.name + (notes ? ' (' + notes + ')' : ''),
        date: txDate,
        investmentTxLinkId: tx.id,
      };
      D.transactions.push(linked);
      tx.linkedTxId = linked.id;
    }
    D.investmentTx.push(tx);
    if (type === 'beli' || type === 'jual') Investment.recomputeHolding(h.id);
    else _invSave();
    return tx;
  },

  deleteTransaction(id) {
    const tx = (D.investmentTx || []).find((t) => String(t.id) === String(id));
    if (!tx) return false;
    if (tx.linkedTxId && typeof D !== 'undefined' && D.transactions) {
      D.transactions = D.transactions.filter((t) => String(t.id) !== String(tx.linkedTxId));
    }
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

  // holdingYieldPct(h) — s476a2: CAGR tahunan per-holding, REPLIKASI PERSIS formula lama
  // (Aset.investmentPerformance(), aset.js: ((nilai/buku)^(365/hari)-1)*100), cuma ganti
  // sumber nilai/buku ke holdingValue()/holdingCost() (SUDAH ADA, 0 rumus baru) & sumber
  // tanggal ke h.purchaseDate. null kalau purchaseDate belum diisi / cost<=0 / durasi <1
  // hari / hasil non-finite (pola guard SAMA PERSIS versi lama).
  holdingYieldPct(h) {
    if (!h || !h.purchaseDate) return null;
    const cost = Investment.holdingCost(h);
    if (!(cost > 0)) return null;
    const value = Investment.holdingValue(h);
    const days = (new Date(todayStr()).getTime() - new Date(h.purchaseDate).getTime()) / 86400000;
    if (!(days >= 1)) return null;
    const years = days / 365;
    const cagr = (Math.pow(value / cost, 1 / years) - 1) * 100;
    return isFinite(cagr) ? cagr : null;
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
    // yieldPct (s476a2) — rata-rata tertimbang (bobot=holdingCost) dari holdingYieldPct()
    // tiap holding, REPLIKASI PERSIS pola agregasi lama (aset.js investmentPerformance():
    // cagrSum+=cagr*buku; cagrWeight+=buku; yieldPct=cagrSum/cagrWeight). null kalau tidak
    // ada holding dgn purchaseDate valid (sama seperti lama: yieldPct null kalau
    // cagrWeight=0).
    let cagrSum = 0;
    let cagrWeight = 0;
    holdings.forEach((h) => {
      const y = Investment.holdingYieldPct(h);
      if (y != null) {
        const cost = Investment.holdingCost(h);
        cagrSum += y * cost;
        cagrWeight += cost;
      }
    });
    const yieldPct = cagrWeight ? (cagrSum / cagrWeight) : null;
    return {
      holdingsCount: holdings.length,
      totalValue,
      totalCost,
      totalGainLoss,
      roiPct,
      yieldPct,
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

  // zakatableValue() — s476a (Blocker B): total nilai holding investasi yang
  // `zakatable===true`, difilter isHoldingOwnershipSelf() dulu (pola sama
  // portfolioSummary()) & diskalakan per porsi SELF lewat
  // MultiOwnerEngine.selfOwnedValue() (pola SAMA PERSIS
  // Aset.totalValue()/Zakat.hitungMaal() di aset.js/pajak-pbb-zakat.js —
  // 0 rumus baru, cuma reuse). Dipakai Zakat.hitungMaal() &
  // FI.investmentAssetValue() (scope 'zakatable') supaya holding hasil
  // migrasi tetap ikut dihitung persis seperti waktu masih di Buku Aset.
  zakatableValue() {
    return Investment.getHoldings()
      .filter(isHoldingOwnershipSelf)
      .filter((h) => h.zakatable)
      .reduce((s, h) => s + (typeof MultiOwnerEngine !== 'undefined'
        ? MultiOwnerEngine.selfOwnedValue(h, Investment.holdingValue(h))
        : Investment.holdingValue(h)), 0);
  },

  // selfOwnedTotalValue() — s476a (Blocker A): total nilai SEMUA holding
  // (bukan cuma zakatable) yang ownership efektifnya SELF, diskalakan per
  // porsi SELF (pola sama zakatableValue() di atas). Dipakai
  // Aset.totalValue() supaya Kekayaan Bersih ikut menjumlah holding hasil
  // migrasi (sebelumnya Investment.portfolioSummary() tidak pernah masuk
  // formula Net Worth manapun — lihat Blocker A di
  // docs/s476-PLAN-migrate-investasi-to-holdings.md).
  selfOwnedTotalValue() {
    return Investment.getHoldings()
      .filter(isHoldingOwnershipSelf)
      .reduce((s, h) => s + (typeof MultiOwnerEngine !== 'undefined'
        ? MultiOwnerEngine.selfOwnedValue(h, Investment.holdingValue(h))
        : Investment.holdingValue(h)), 0);
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

// ============================================================================
// S552 -- Aset ↔ Investasi Link Resmi + Cross-Check Badge (generalisasi
// rekomendasi B hasil audit S551, lihat
// FIX-s551-asset-investasi-duplicate-name-owner-mismatch-audit.md &
// FIX-s552-asset-investasi-link-badge.md). Pola SAMA PERSIS S506 Vehicle<->Asset
// Identity Link (vehicle-core.js: resolveVehicleAssetLink/resolveVehicleByAssetId/
// vehicleAssetLinkOptionsHtml) -- 1 field referensi opsional satu arah
// (D.investments[].assetId -> D.assets[].id), TIDAK ada snapshot nilai/owners, TIDAK
// ada SSOT baru. Beda dari S506: assetId investasi TIDAK dibatasi
// jenis==='Kendaraan' (investasi bisa link ke aset jenis apa pun -- Saham/Reksadana/
// Deposito/Tanah/dll, sesuai kasus laporan user "Schorder").
// ============================================================================

// resolveInvestmentAssetLink(assetId) -- validasi PURE: assetId harus merujuk entry
// D.assets yang benar-benar ada, selain itu (kosong/tidak ditemukan) -> null.
// Dipanggil SEBELUM disimpan sbg h.assetId (InvestmentListUI.save()).
// FIX (laporan user Agustus 2026 -- "holding ditautkan ke Buku Aset, tapi di
// Buku Aset tidak tampil, malah dobel data di dropdown & toast 'Kepemilikan
// beda' muncul"): sebelum fix ini, fungsi ini balikin Aset apa pun asal
// id-nya ketemu -- termasuk Aset yang sudah dimigrasi otomatis ke Holding
// LAIN (`a._migratedToInvestmentId`, s476a) atau ditautkan manual dari sisi
// Aset ke Holding LAIN (`a.investmentId`, B1). Aset semacam ini SENGAJA
// disembunyikan dari Buku Aset & representasinya sudah pindah penuh ke
// holding lain itu (pola SAMA PERSIS guard yang sudah dipakai
// `Aset.totalValue()`/`_assetSplits()` dana-titipan/dst -- lihat daftar
// lengkap di komentar `investmentAssetLinkOptionsHtml()` di bawah) --
// meresolve-nya di sini bikin BADGE (`investmentCrossCheckWarning()`)
// membandingkan kepemilikan holding INI ke kepemilikan Aset ghost yang
// SUDAH TIDAK RELEVAN (kepemilikan sesungguhnya sekarang hidup di holding
// lain), jadi memicu "⚠️ Kepemilikan beda" palsu. Return null (dianggap
// TIDAK tertaut secara efektif) kalau Aset yang ditemukan adalah ghost
// semacam ini -- h.assetId sendiri TIDAK diubah/dibersihkan di sini (murni
// baca, 0 mutasi data existing), cuma tidak lagi dianggap tautan aktif.
function resolveInvestmentAssetLink(assetId) {
  if (!assetId || typeof D === 'undefined') return null;
  const a = (D.assets || []).find((x) => x && sameId(x.id, assetId)) || null;
  if (a && (a._migratedToInvestmentId || a.investmentId)) return null;
  return a;
}
// resolveLinkedInvestmentAsset(h) -- delegasi tipis, pola sama persis
// resolveLinkedVehicleAsset() (vehicle-core.js, S507).
function resolveLinkedInvestmentAsset(h) {
  if (!h) return null;
  return resolveInvestmentAssetLink(h.assetId);
}
// resolveInvestmentByAssetId(assetId) -- arah BALIK (Asset -> Investment), pola sama
// persis resolveVehicleByAssetId() (S509c). Dipakai badge/cross-check dari sisi Buku
// Aset. Match pertama yang ditemukan kalau ada >1 (edge case, tidak seharusnya
// terjadi lewat alur UI normal -- lihat komentar pola sama di vehicle-core.js).
function resolveInvestmentByAssetId(assetId) {
  if (!assetId || typeof D === 'undefined') return null;
  return (D.investments || []).find((h) => h && sameId(h.assetId, assetId)) || null;
}
// investmentAssetLinkOptionsHtml(currentAssetId) -- bangun <option> list utk dropdown
// "🔗 Hubungkan ke Buku Aset" di investmentModal. BEDA dari
// vehicleAssetLinkOptionsHtml(): TIDAK difilter jenis (investasi bisa link ke aset
// jenis apa pun), tapi entry yang SUDAH ditautkan ke holding LAIN disembunyikan (1
// aset cuma boleh 1 holding tertaut resmi -- guard sisi UI, data lama yang kebetulan
// sudah dobel tetap kebaca apa adanya lewat resolveInvestmentByAssetId(), tidak
// dipaksa).
// FIX (laporan user Agustus 2026 -- "dobel data di dropdown & toast 'Kepemilikan
// beda'"): tambah guard `_migratedToInvestmentId`/`investmentId`, pola SAMA PERSIS
// yang SUDAH dipakai belasan titik baca "aset ini masih dihitung/tampil di mana"
// lain di seluruh app (`Aset.renderList()`/`Aset.totalValue()` di aset.js,
// `_assetOptionsHtml()`/`_assetSplits()` dana-titipan (s594/s599), `FI.
// zakatableAssetValue()`, dst -- cari `_migratedToInvestmentId` di codebase utk
// daftar lengkap). Aset yang sudah dimigrasi otomatis ATAU ditautkan manual ke
// Holding LAIN representasinya SUDAH PINDAH ke holding itu & SENGAJA disembunyikan
// dari Buku Aset -- menawarkannya di sini sebagai target link BARU bikin 1
// instrumen fisik (mis. "Majoris") berakhir "dipegang" oleh 2 holding sekaligus:
// holding lama (lewat migrasi/tautan asal) DAN holding baru ini (lewat `h.assetId`)
// -- itulah sumber "Majoris tampil 2x di daftar Investasi" & kepemilikan holding
// baru dibandingkan ke kepemilikan Aset ghost yang sudah basi (toast mismatch
// palsu). Pengecualian TETAP berlaku (bukan currentAssetId) supaya data LAMA yang
// kebetulan sudah tertaut ke ghost seperti ini tetap kebaca/kepilih apa adanya di
// dropdown (0 hilang mendadak) -- resolveInvestmentAssetLink() di atas yang
// menangani sisi "dianggap tertaut efektif atau tidak"-nya, bukan di sini.
function investmentAssetLinkOptionsHtml(currentAssetId) {
  const opts = ['<option value="">— Tidak terhubung —</option>'];
  (D.assets || []).forEach((a) => {
    if (!a) return;
    if (!sameId(a.id, currentAssetId)) {
      if (resolveInvestmentByAssetId(a.id)) return;
      if (a._migratedToInvestmentId || a.investmentId) return;
    }
    opts.push('<option value="' + a.id + '"' + (sameId(a.id, currentAssetId) ? ' selected' : '') + '>' + escapeHtml(a.name || '?') + ' (' + escapeHtml(a.jenis || '?') + ')</option>');
  });
  return opts.join('');
}
// _aiOwnerSig(entity) / assetInvestmentMismatch(a, h) -- §D.2 AUDIT-UNIFIED-
// ASSET-INVESTMENT-FORM.md konsolidasi: formula owner-signature-comparison
// TIDAK lagi ditulis ulang di sini -- keduanya sekarang thin-wrapper ke
// ownerSignature()/ownerMismatch() di modules/shared/multi-owner-engine.js
// (layer shared yang SUDAH jadi dependency file ini lewat MultiOwnerEngine,
// jadi 0 dependency baru ditambahkan). Ini menggantikan implementasi lokal
// lama yang paralel & beda formula dari data-health-check.js punya sendiri
// (risiko drift kalau salah satu diperbaiki, yang lain diam-diam
// tertinggal -- lihat §D.2). Nama fungsi & window-export di bawah TETAP
// dipertahankan apa adanya supaya investasi-list-view.js, aset.js, & test
// yang sudah ada (investasi-asset-link-badge-s552.test.js) tidak perlu
// berubah sama sekali -- murni pemindahan lokasi implementasi, bukan
// perubahan API publik.
function _aiOwnerSig(entity) {
  return (typeof ownerSignature === 'function') ? ownerSignature(entity) : '';
}
// assetInvestmentMismatch(a, h) -- true kalau owner signature aset & holding BEDA
// (a/h null atau signature tidak terhitung -> false, tidak dianggap mismatch).
// Dipakai baik oleh link resmi (assetId) maupun fallback name-match (badge list &
// data-health-check rule S551) -- 1 titik baca yang sama utk kedua jalur.
function assetInvestmentMismatch(a, h) {
  return (typeof ownerMismatch === 'function') ? ownerMismatch(a, h) : false;
}
// investmentCrossCheckWarning(h) -- dipakai badge list Investasi
// (InvestmentListUI._renderList()) & bridge di investmentModal. Prioritas: (1) link
// resmi h.assetId -- kalau ada & resolve sukses, bandingkan langsung; (2) fallback
// name-match (SAMA PERSIS rule S551 data-health-check, exact match trim+lowercase)
// -- kalau holding belum ditautkan resmi tapi ada aset nama sama dgn owner beda.
// Return: null (aman) atau string pesan singkat siap tampil di badge.
function investmentCrossCheckWarning(h) {
  if (!h) return null;
  const linked = resolveLinkedInvestmentAsset(h);
  if (linked) {
    return assetInvestmentMismatch(linked, h) ? '⚠️ Kepemilikan beda dgn Buku Aset yang ditautkan' : null;
  }
  // assetId ada tapi orphan (aset sudah dihapus) -- itu tanggung jawab
  // data-health-check (cek orphan terpisah), badge kepemilikan tidak relevan di sini.
  if (h.assetId) return null;
  const key = (h.name || '').trim().toLowerCase();
  if (!key || typeof D === 'undefined') return null;
  const match = (D.assets || []).find((a) => a && (a.name || '').trim().toLowerCase() === key);
  if (!match) return null;
  return assetInvestmentMismatch(match, h) ? '⚠️ Nama sama dgn 1 entri Buku Aset, kepemilikan beda' : null;
}
// assetCrossCheckWarning(a) -- arah BALIK, dipakai badge list Buku Aset
// (Aset.renderList()). Pola sama persis investmentCrossCheckWarning() di atas.
function assetCrossCheckWarning(a) {
  if (!a) return null;
  const linked = resolveInvestmentByAssetId(a.id);
  if (linked) {
    return assetInvestmentMismatch(a, linked) ? '⚠️ Kepemilikan beda dgn holding Investasi yang ditautkan' : null;
  }
  const key = (a.name || '').trim().toLowerCase();
  if (!key || typeof D === 'undefined') return null;
  const match = (D.investments || []).find((h) => h && (h.name || '').trim().toLowerCase() === key);
  if (!match) return null;
  return assetInvestmentMismatch(a, match) ? '⚠️ Nama sama dgn 1 holding Investasi, kepemilikan beda' : null;
}

if (typeof window !== 'undefined') {
  window.Investment = Investment;
  window.INVESTMENT_TYPES = INVESTMENT_TYPES;
  window.resolveInvestmentAssetLink = resolveInvestmentAssetLink;
  window.resolveLinkedInvestmentAsset = resolveLinkedInvestmentAsset;
  window.resolveInvestmentByAssetId = resolveInvestmentByAssetId;
  window.investmentAssetLinkOptionsHtml = investmentAssetLinkOptionsHtml;
  window.assetInvestmentMismatch = assetInvestmentMismatch;
  window.investmentCrossCheckWarning = investmentCrossCheckWarning;
  window.assetCrossCheckWarning = assetCrossCheckWarning;
}
