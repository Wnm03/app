// dana-titipan-commitment-return-api.js — Dana Titipan: CRUD Commitment
// (pokok dikomit manual per owner, Sesi 485b/523) + CRUD Return (Sesi 486).
//
// SESI R5 — REALISASI (sesi ini). PECAHAN KEDUA dari
// `dana-titipan-portfolio-presenter.js` (versi produksi s597) — lihat
// header `dana-titipan-aggregation-api.js` utk latar belakang split
// lengkap. File ini MENAMBAH method ke object `DanaTitipanPortfolioAPI`
// yang SUDAH dideklarasikan `dana-titipan-aggregation-api.js` (lewat
// `Object.assign`, BUKAN redeclare `const` baru) — WAJIB dimuat SETELAH
// file itu di `scripts/build.js`. 0 rumus/logic diubah dari versi
// produksi s597, cuma dipindah apa adanya.
//
Object.assign(DanaTitipanPortfolioAPI, {

// getCommitments() — Sesi 485b, getter read-only. Init lazy (pola sama
// `D.investmentWatchlist`): TIDAK menulis `D.titipanCommitments` kalau
// belum ada, cuma balikin array kosong (biar getter murni tidak punya
// side-effect nulis ke `D`).
// Return: array `D.titipanCommitments` apa adanya (atau `[]`).
getCommitments() {
  return (D && D.titipanCommitments) || [];
},

// saveCommitment({ownerId, ownerName, principalAmount, committedDate,
// notes}) — Sesi 485b (Gap #3 audit, langkah 2/5). Upsert by `ownerId`
// ke `D.titipanCommitments[]`. **existing-owner-only**: `ownerId` WAJIB
// sudah muncul di `listExistingOwners()` (owner picker read-only, Sesi
// 485a) — fungsi ini TIDAK PERNAH membuat identity `ownerId` baru yang
// tidak dikenal sistem (mencegah user "ketik nama sendiri" bikin owner
// hantu yang tidak nyambung ke holding manapun).
//
// Validasi (throw Error kalau gagal, TIDAK menulis apa pun ke `D` kalau
// validasi gagal — atomic per panggilan):
//   - `ownerId` wajib diisi & harus ada di `listExistingOwners()`.
//   - `principalAmount` wajib numerik (`isFinite`) & >= 0 (dilarang
//     negatif — pokok dana titipan tidak bisa minus).
//
// Upsert: kalau sudah ada record dgn `ownerId` sama -> update in place
// (field yang di-pass `undefined` dipertahankan nilai lama, pola sama
// `Investment.updateWatch()`), TIDAK push duplikat. Kalau belum ada ->
// push record baru dgn `id: uid()`.
//
// ISOLASI TOTAL (HARD RULE sesi ini): fungsi ini HANYA menyentuh
// `D.titipanCommitments` (+ panggil `save()` kalau tersedia, pola sama
// semua CRUD lain di codebase ini) — 0 sentuhan ke `D.accounts`,
// `D.transactions`, `D.investmentTx`, `D.investments`, `D.debts` (lihat
// test regresi assert deep-equal sebelum/sesudah selain
// `titipanCommitments`).
//
// Return: record commitment yang tersimpan (`{id, ownerId, ownerName,
//   principalAmount, committedDate, notes, createdAt, updatedAt}`).
saveCommitment(input) {
    if (typeof _financeMutationBlockedByStaleState==='function' && _financeMutationBlockedByStaleState()) return {ok:false,code:'STALE_CROSS_TAB'};
  const params = input || {};
  const ownerId = params.ownerId;
  if (!ownerId) throw new Error('Owner wajib dipilih');
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) throw new Error('Owner tidak ditemukan pada daftar pemilik investasi yang ada');
  const principalAmount = Number(params.principalAmount);
  if (!isFinite(principalAmount) || principalAmount < 0) {
    throw new Error('Pokok dana titipan harus berupa angka >= 0');
  }
  // === POOL GUARD START (Sesi 3 — MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI
  // §8/§9). Cross-call SATU ARAH ke `DanaTitipanPoolAPI` (read-only, §14)
  // -- file ini TIDAK PERNAH menulis ke `D.titipanPool`. Guard HANYA
  // aktif kalau pool sudah pernah diisi (`getEntries().length > 0`);
  // kalau `NOT_MIGRATED` (pool kosong/fitur belum pernah dipakai) -> 0
  // guard, perilaku existing (sebelum fitur pool ada) tetap jalan apa
  // adanya, supaya data lama tidak terjebak validasi pool yang belum
  // diisi (§8 poin 2/4, §12 "tidak ada migrasi implisit").
  if (typeof DanaTitipanPoolAPI !== 'undefined' && DanaTitipanPoolAPI.getEntries().length > 0) {
    const existing = (D && Array.isArray(D.titipanCommitments)) ? D.titipanCommitments : [];
    // Simulasi upsert HIPOTETIS (§9): total baru memakai nilai BARU utk
    // ownerId ini (GANTI, bukan tambah) -- jumlahkan semua owner LAIN
    // (skip record ownerId ini kalau sudah ada) + principalAmount baru.
    // Berlaku sama utk create (owner belum ada di `existing`, jadi murni
    // owner lain + nilai baru) maupun edit (nilai lama owner ini dibuang,
    // diganti nilai baru) -- 0 double-count baik di create atau edit.
    const sudahDialokasikanBaru = existing.reduce((sum, c) => {
      if (c && c.ownerId === ownerId) return sum;
      return sum + (Number(c && c.principalAmount) || 0);
    }, principalAmount);
    const poolMasukTotal = DanaTitipanPoolAPI.poolMasukTotal();
    if (sudahDialokasikanBaru > poolMasukTotal) {
      // "sisa_sebelum_edit_ini" (§8 poin 3) = sisa yang SEDANG berlaku
      // saat ini (state `D.titipanCommitments` sebelum save ini commit,
      // belum diubah sama sekali di titik ini) -- BUKAN sisa hipotetis
      // seolah owner ini dibuang dulu. Pola format ikut §4 (fallback
      // fmtFull -> fmt -> 'Rp '+round, sama persis
      // `DanaTitipanPortfolioPresenter._money()`).
      const sisaSebelumEditIni = DanaTitipanPoolAPI.sisaAlokasi() || 0;
      const sisaText = (typeof fmtFull === 'function') ? fmtFull(sisaSebelumEditIni) : ((typeof fmt === 'function') ? fmt(sisaSebelumEditIni) : ('Rp ' + Math.round(sisaSebelumEditIni || 0)));
      throw new Error(`⚠️ Nominal melebihi dana yang tersedia. Sisa dana hanya ${sisaText}.`);
    }
  }
  // === POOL GUARD END ===
  const beforeCommitments = JSON.stringify(Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []);
  D.titipanCommitments = D.titipanCommitments || [];
  const ownerName = (params.ownerName && String(params.ownerName).trim()) || known.ownerName;
  const now = Date.now();
  let record = D.titipanCommitments.find((c) => c && c.ownerId === ownerId);
  const isEditCommitment = !!record;
  if (record) {
    record.ownerName = ownerName;
    record.principalAmount = principalAmount;
    if (params.committedDate !== undefined) record.committedDate = params.committedDate;
    if (params.notes !== undefined) record.notes = params.notes;
    record.updatedAt = now;
  } else {
    record = {
      id: (typeof uid === 'function') ? uid() : ('tc_' + now),
      ownerId,
      ownerName,
      principalAmount,
      committedDate: params.committedDate || '',
      notes: params.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    D.titipanCommitments.push(record);
  }
  if (typeof save === 'function') {
    const persisted = save();
    if (persisted === false) {
      D.titipanCommitments = JSON.parse(beforeCommitments);
      return {ok:false, code:'PERSISTENCE_FAILED'};
    }
  }
  if (typeof AIBus !== 'undefined') FinanceEventOutbox.emitOrEnqueue('titipan.updated', { kind: 'commitment', action: isEditCommitment ? 'edit' : 'create', ownerId: record.ownerId });
  return record;
},

// deleteCommitment(ownerId) — Sesi 522 (FIX-S521-DANA-TITIPAN-UI-
// MULTIOWNER, gap #2: "tidak ada delete function sama sekali" utk
// commitment — hanya `saveCommitment()`/`getCommitments()` yang ada
// sebelum sesi ini). Hapus record `D.titipanCommitments` by `ownerId`
// (bukan by `id` — 1 owner = maksimal 1 record commitment, pola upsert
// `saveCommitment()` di atas, jadi `ownerId` sudah unik & lebih gampang
// dipanggil dari UI yang cuma tahu owner yang sedang dibuka). Return
// `true` kalau ada yang terhapus, `false` kalau tidak ditemukan (TIDAK
// throw — pola SAMA PERSIS `deleteReturn(id)` di bawah). ISOLASI TOTAL:
// HANYA menyentuh `D.titipanCommitments` (+ `save()`), 0 sentuhan ke
// `D.titipanReturns`/holding/aset/akun/transaksi lain.
deleteCommitment(ownerId) {
    if (typeof _financeMutationBlockedByStaleState==='function' && _financeMutationBlockedByStaleState()) return {ok:false,code:'STALE_CROSS_TAB'};
  if (!(D && Array.isArray(D.titipanCommitments))) return false;
  if (!ownerId) return false;
  const idx = D.titipanCommitments.findIndex((c) => c && c.ownerId === ownerId);
  if (idx === -1) return false;
  const beforeCommitments = D.titipanCommitments.slice();
  D.titipanCommitments.splice(idx, 1);
  if (typeof save === 'function') {
    const persisted = save();
    if (persisted === false) {
      D.titipanCommitments = beforeCommitments;
      return {ok:false, code:'PERSISTENCE_FAILED'};
    }
  }
  if (typeof AIBus !== 'undefined') FinanceEventOutbox.emitOrEnqueue('titipan.updated', { kind: 'commitment', action: 'delete', ownerId });
  return true;
},

// removeOwnerLinkage(ownerId) — Sesi 523-C (BUG-02/BUG-06,
// AUDIT-S523-C-COMMITMENT-DELETE-VS-OWNER-LINKAGE.md). Operasi TERPISAH
// secara KONTRAK dari deleteCommitment() di atas & dari "global owner
// deletion" (SENGAJA TIDAK dibuat sesi ini, lihat catatan di bawah):
//
//   1. deleteCommitment(ownerId) — CRUD "hapus 1 record pokok dana
//      titipan", dipanggil dari modal edit pokok (tombol 🗑 Hapus,
//      Sesi 522). Fokusnya: koreksi/hapus ANGKA pokok yang salah catat.
//   2. removeOwnerLinkage(ownerId) — SCOPED REMOVAL "lepaskan
//      keterikatan owner ini dari Dana Titipan", dipanggil LANGSUNG dari
//      kartu owner di dashboard (tombol terpisah, TIDAK perlu buka modal
//      edit pokok dulu). Fokusnya: owner ini sudah tidak relevan lagi di
//      Dana Titipan (mis. dana sudah selesai dikembalikan semua & owner
//      mau "dibersihkan" dari daftar).
//   3. Global owner deletion (hapus `OwnerRegistry` entry sepenuhnya) —
//      SENGAJA TIDAK ADA di sesi ini. `OwnerRegistry` (owner-registry.js,
//      S489) belum punya API delete/remove resmi sama sekali (baru
//      listAll()/findOrCreate()) — menambah method delete ke situ MASUK
//      keputusan desain terpisah (lihat §4 dokumen rekomendasi S523,
//      "logic guard taruh di modul konsumen, BUKAN core registry, kecuali
//      >1 konsumen pasti butuh") yang TIDAK diambil sesi ini (di luar
//      fokus BUG-02/06/14, HARD RULE "Jangan global delete owner").
//
// SESI INI: (2) dipatch dgn REUSE 100% mekanisme (1) — keduanya
// menyentuh field `D` yang SAMA (`D.titipanCommitments`, satu-satunya
// data yang benar-benar dimiliki EKSKLUSIF oleh domain Dana Titipan),
// jadi 0 rumus/mutasi baru ditulis. Yang beda: nama, kontrak, dan titik
// panggil (kartu owner vs modal edit) — bukan implementasi. Kalau nanti
// scoped removal butuh membersihkan lebih dari `titipanCommitments`
// (mis. `D.titipanReturns`), itu keputusan desain terpisah (BUG-03) yang
// TIDAK diambil di sini (lihat larangan #7 di bawah).
//
// SENGAJA TIDAK disentuh (scoped removal HANYA melepas "keterikatan
// Dana Titipan", 0 efek samping ke domain lain):
//   - `D.titipanReturns` — riwayat pengembalian TETAP riwayat, TIDAK
//     dihapus diam-diam (linked history, beda dari `titipanCommitments`
//     yang murni angka pokok saat ini — pola sama alasan `deleteReturn()`
//     dibuat sbg fungsi terpisah eksplisit, bukan efek samping delete
//     lain).
//   - `D.assets`/`D.investments` (`owners[]`/porsi kepemilikan) — porsi
//     di holding/aset lain dikelola LEWAT modul masing-masing ("⚖️ Atur
//     Porsi Kepemilikan"), bukan di sini. Owner bisa saja tetap muncul
//     di kartu Dana Titipan setelah linkage dilepas KALAU dia masih
//     py porsi di suatu holding/aset — itu BUKAN bug (persis temuan
//     BUG-04 S523-A: isolasi domain yang disengaja).
//   - `D.transactions` (`tx.titipanLinkId`) — TIDAK dihapus/diubah
//     massal di sini. Link basi (ownerId yang sudah tidak dikenal)
//     sudah py mekanisme self-heal SENDIRI di `transaksi.js`
//     (`applyTxTitipanLinkageOnSave()`/`resolveTxTitipanOwner()`,
//     Sesi 519) yang otomatis membuang `titipanLinkId` begitu transaksi
//     itu sendiri disave ulang — 0 duplikasi guard di sini.
//   - `OwnerRegistry`/`D.ownerRegistry` — identitas global owner TETAP
//     ADA. "Lepas keterikatan dari Dana Titipan" secara definisi BUKAN
//     "hapus owner ini dari sistem".
//
// Return: `true` kalau ada linkage (record commitment) yang dilepas,
//   `false` kalau owner ini memang tidak punya commitment sama sekali
//   (no-op aman, TIDAK throw — pola sama deleteCommitment()/deleteReturn()).
removeOwnerLinkage(ownerId) {
    if (typeof _financeMutationBlockedByStaleState==='function' && _financeMutationBlockedByStaleState()) return {ok:false,code:'STALE_CROSS_TAB'};
  return this.deleteCommitment(ownerId);
},

// getReturns(ownerId) — Sesi 486 (Case F: Partial Return / Pengembalian
// Dana Titipan, lihat RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md).
// Getter read-only, pola sama getCommitments(). Tanpa `ownerId` -> semua
// record `D.titipanReturns`. Dengan `ownerId` -> difilter utk owner itu
// saja (dipakai render() riwayat per owner & DanaTitipanReturnUI).
getReturns(ownerId) {
  const all = (D && Array.isArray(D.titipanReturns)) ? D.titipanReturns : [];
  if (!ownerId) return all;
  return all.filter((r) => r && r.ownerId === ownerId);
},

// recordReturn({ownerId, ownerName, amount, returnDate, notes}) —
// Sesi 486 (Case F). Catat 1 baris pengembalian dana titipan ke
// `D.titipanReturns[]` — ini LOG/riwayat, BUKAN upsert seperti
// saveCommitment(): satu owner bisa punya banyak baris pengembalian dari
// waktu ke waktu, semua tersimpan apa adanya, tidak ada yang ditimpa.
//
// existing-owner-only, pola SAMA PERSIS saveCommitment() (Sesi 485b):
// `ownerId` wajib sudah ada di `listExistingOwners()` — fungsi ini TIDAK
// PERNAH membuat identity `ownerId` baru. Validasi (throw Error kalau
// gagal, TIDAK menulis apa pun ke `D` kalau gagal — atomic):
//   - `ownerId` wajib diisi & dikenal.
//   - `amount` wajib numerik (`isFinite`) & >= 0 (dilarang negatif —
//     kalau perlu koreksi, hapus baris via deleteReturn() lalu catat
//     ulang, pola sama "hapus lalu catat ulang" InvestmentTxUI.deleteTx()
//     — fungsi ini SENGAJA tidak punya updateReturn()).
//
// ISOLASI TOTAL (HARD RULE sesi ini, sama seperti saveCommitment()):
// fungsi ini HANYA menyentuh `D.titipanReturns` (+ panggil `save()` kalau
// tersedia) — 0 sentuhan ke `D.accounts`, `D.transactions`,
// `D.investmentTx`, `D.investments`, `D.debts`.
//
// Return: record pengembalian yang tersimpan (`{id, ownerId, ownerName,
//   amount, returnDate, notes, createdAt}`).
recordReturn(input) {
    if (typeof _financeMutationBlockedByStaleState==='function' && _financeMutationBlockedByStaleState()) return {ok:false,code:'STALE_CROSS_TAB'};
  const params = input || {};
  const ownerId = params.ownerId;
  if (!ownerId) throw new Error('Owner wajib dipilih');
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) throw new Error('Owner tidak ditemukan pada daftar pemilik investasi yang ada');
  const amount = Number(params.amount);
  if (!isFinite(amount) || amount < 0) {
    throw new Error('Nominal pengembalian harus berupa angka >= 0');
  }
  const beforeReturns = JSON.stringify(Array.isArray(D.titipanReturns) ? D.titipanReturns : []);
  D.titipanReturns = D.titipanReturns || [];
  const ownerName = (params.ownerName && String(params.ownerName).trim()) || known.ownerName;
  const now = Date.now();
  const record = {
    id: (typeof uid === 'function') ? uid() : ('tr_' + now),
    ownerId,
    ownerName,
    amount,
    returnDate: params.returnDate || '',
    notes: params.notes || '',
    createdAt: now,
  };
  D.titipanReturns.push(record);
  if (typeof save === 'function') {
    const persisted = save();
    if (persisted === false) {
      D.titipanReturns = JSON.parse(beforeReturns);
      return {ok:false, code:'PERSISTENCE_FAILED'};
    }
  }
  if (typeof AIBus !== 'undefined') FinanceEventOutbox.emitOrEnqueue('titipan.updated', { kind: 'return', action: 'create', returnId: record.id, ownerId: record.ownerId });
  return record;
},

// deleteReturn(id) — Sesi 486 (Case F). Hapus 1 baris riwayat
// pengembalian by `id`. Return `true` kalau ada yang terhapus, `false`
// kalau `id` tidak ditemukan (TIDAK throw — pola sama getter/delete
// read-only-safe lain di codebase ini). ISOLASI TOTAL: HANYA menyentuh
// `D.titipanReturns`.
deleteReturn(id) {
  if (typeof _financeMutationBlockedByStaleState==='function' && _financeMutationBlockedByStaleState()) return false;
  if (!(D && Array.isArray(D.titipanReturns))) return false;
  const idx = D.titipanReturns.findIndex((r) => r && String(r.id) === String(id));
  if (idx === -1) return false;
  const beforeReturns = D.titipanReturns.slice();
  const rec = D.titipanReturns[idx];
  // S2917: pengembalian dengan transfer/pengeluaran tertaut -> transaksinya ikut dibatalkan (atomik).
  const linked = Array.isArray(rec && rec.txIds) ? rec.txIds.map(String) : [];
  const beforeTx = linked.length && Array.isArray(D.transactions) ? D.transactions.slice() : null;
  D.titipanReturns.splice(idx, 1);
  if (linked.length) {
    if (typeof FinanceTxSOT !== 'undefined' && FinanceTxSOT && typeof FinanceTxSOT.removeWhere === 'function') FinanceTxSOT.removeWhere((t) => t && linked.includes(String(t.id)));
    if (typeof invalidateAccBalCache === 'function') invalidateAccBalCache();
  }
  if (typeof save === 'function') {
    const persisted = save();
    if (persisted === false) {
      D.titipanReturns = beforeReturns;
      if (beforeTx && typeof FinanceTxSOT !== 'undefined' && FinanceTxSOT && typeof FinanceTxSOT.replaceSnapshot === 'function') { FinanceTxSOT.replaceSnapshot(beforeTx); if (typeof invalidateAccBalCache === 'function') invalidateAccBalCache(); }
      return {ok:false, code:'PERSISTENCE_FAILED'};
    }
  }
  if (typeof AIBus !== 'undefined') FinanceEventOutbox.emitOrEnqueue('titipan.updated', { kind: 'return', action: 'delete', returnId: id });
  return true;
},

// S2917: recordReturnWithTransfer(input) — catat pengembalian + pindahan uangnya SEKALIGUS, atomik.
//   input: {ownerId, amount(>0), returnDate, notes, sourceAccountId, mode:'rekening'|'keluar', destAccountId, izinkanMinus}
//   sourceAccountId = rekening titipan yang memuat porsi pemilik itu (non-SELF).
//   mode 'rekening': transfer_out/transfer_in ke rekening LAIN yang 100% milik pemilik itu. Rekening milik sendiri DITOLAK
//     (akan menaikkan saldo pribadi dengan uang orang lain).
//   mode 'keluar': pengeluaran kategori "Dana Titipan" dari rekening sumber (uang diserahkan di luar aplikasi).
//   Gagal simpan/validasi -> tidak ada perubahan (catatan dan transaksi di-rollback).
// Return: record (sama bentuk recordReturn + txIds, mode, sourceAccountId, destAccountId) atau {ok:false, reason, minus?}.
recordReturnWithTransfer(input) {
  if (typeof _financeMutationBlockedByStaleState==='function' && _financeMutationBlockedByStaleState()) return {ok:false,code:'STALE_CROSS_TAB',reason:'Data berubah di tab lain'};
  const p = input || {};
  const ownerId = p.ownerId;
  if (!ownerId) return {ok:false,reason:'Owner wajib dipilih'};
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) return {ok:false,reason:'Owner tidak ditemukan pada daftar pemilik yang ada'};
  const amount = Math.round(Number(p.amount));
  if (!isFinite(amount) || amount <= 0) return {ok:false,reason:'Nominal harus lebih dari 0'};
  const mode = p.mode === 'keluar' ? 'keluar' : (p.mode === 'rekening' ? 'rekening' : null);
  if (!mode) return {ok:false,reason:'Tujuan uang wajib dipilih'};
  const accs = Array.isArray(D.accounts) ? D.accounts : [];
  const same = (a, b) => String(a) === String(b);
  const src = accs.find((a) => a && same(a.id, p.sourceAccountId));
  const ownsPortion = (a) => Array.isArray(a && a.owners) && a.owners.some((o) => o && !o.isSelf && same(o.ownerId, ownerId));
  if (!src || !ownsPortion(src)) return {ok:false,reason:'Rekening sumber harus memuat porsi pemilik ini'};
  let dest = null;
  if (mode === 'rekening') {
    dest = accs.find((a) => a && same(a.id, p.destAccountId));
    if (!dest) return {ok:false,reason:'Rekening tujuan wajib dipilih'};
    if (same(dest.id, src.id)) return {ok:false,reason:'Rekening tujuan harus berbeda dari rekening sumber'};
    const onlyOwner = Array.isArray(dest.owners) && dest.owners.length > 0 && dest.owners.every((o) => o && !o.isSelf && same(o.ownerId, ownerId));
    if (!onlyOwner) return {ok:false,reason:'Rekening tujuan harus milik pemilik ini sepenuhnya (rekening milik sendiri tidak boleh jadi tujuan)'};
  }
  const porsi = (src.owners.find((o) => o && !o.isSelf && same(o.ownerId, ownerId)) || {}).porsi;
  if (!p.izinkanMinus && typeof recalcAccBalance === 'function') {
    const saldo = Number(recalcAccBalance(src.id));
    const hak = Number.isFinite(saldo) ? saldo * (Number(porsi) || 0) / 100 : NaN;
    if (Number.isFinite(hak) && amount > hak + 0.5) return {ok:false,minus:true,keluar:amount,saldo:Math.round(hak),reason:'Nominal melebihi hak pemilik di rekening sumber (' + Math.round(hak) + ')'};
  }
  const hasSOT = typeof FinanceTxSOT !== 'undefined' && FinanceTxSOT && typeof FinanceTxSOT.createMany === 'function';
  if (!hasSOT) return {ok:false,reason:'Penyimpan transaksi belum siap'};
  const tgl = p.returnDate || (typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10));
  const ownerName = known.ownerName;
  const beforeReturns = JSON.stringify(Array.isArray(D.titipanReturns) ? D.titipanReturns : []);
  const recId = (typeof uid === 'function') ? uid() : ('tr_' + Date.now());
  const note = 'Pengembalian dana titipan - ' + ownerName + (p.notes ? ' (' + p.notes + ')' : '');
  const tag = { titipanReturnId: recId, deductionOwnerId: ownerId, titipanLinkId: ownerId };
  let txs;
  if (mode === 'rekening') {
    const pid = (typeof uid === 'function') ? uid() : ('pair_' + Date.now());
    txs = [
      { id: (typeof uid === 'function') ? uid() : (recId + 'o'), type: 'transfer_out', amount, category: 'Transfer', note, date: tgl, accountId: src.id, transferPairId: pid, ...tag },
      { id: (typeof uid === 'function') ? uid() : (recId + 'i'), type: 'transfer_in', amount, category: 'Transfer', note, date: tgl, accountId: dest.id, transferPairId: pid, titipanReturnId: recId },
    ];
  } else {
    if (typeof FinanceCategorySOT !== 'undefined' && FinanceCategorySOT && typeof FinanceCategorySOT.ensureCategory === 'function') {
      FinanceCategorySOT.ensureCategory('expense', { name: 'Dana Titipan', emoji: '📦', classification: 'NON_BELANJA' });
    }
    txs = [{ id: (typeof uid === 'function') ? uid() : (recId + 'x'), type: 'expense', amount, category: 'Dana Titipan', subcategory: '', accountId: src.id, payMethod: 'tunai', note, date: tgl, ...tag }];
  }
  const ids = txs.map((t) => t.id);
  const undo = () => {
    D.titipanReturns = JSON.parse(beforeReturns);
    FinanceTxSOT.removeWhere((t) => t && ids.includes(t.id));
    if (typeof invalidateAccBalCache === 'function') invalidateAccBalCache();
  };
  try {
    FinanceTxSOT.createMany(txs);
    D.titipanReturns = D.titipanReturns || [];
    const record = { id: recId, ownerId, ownerName, amount, returnDate: p.returnDate || tgl, notes: p.notes || '', createdAt: Date.now(), mode, sourceAccountId: src.id, destAccountId: dest ? dest.id : '', txIds: ids };
    D.titipanReturns.push(record);
    if (typeof invalidateAccBalCache === 'function') invalidateAccBalCache();
    if (typeof save === 'function' && save() === false) { undo(); return {ok:false,code:'PERSISTENCE_FAILED',reason:'Penyimpanan gagal'}; }
    if (typeof AIBus !== 'undefined') FinanceEventOutbox.emitOrEnqueue('titipan.updated', { kind: 'return', action: 'create', returnId: record.id, ownerId });
    return record;
  } catch (e) {
    undo();
    return {ok:false,reason:'Gagal: ' + ((e && e.message) || 'kesalahan')};
  }
},

});
