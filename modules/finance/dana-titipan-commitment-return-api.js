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
  const params = input || {};
  const ownerId = params.ownerId;
  if (!ownerId) throw new Error('Owner wajib dipilih');
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) throw new Error('Owner tidak ditemukan pada daftar pemilik investasi yang ada');
  const principalAmount = Number(params.principalAmount);
  if (!isFinite(principalAmount) || principalAmount < 0) {
    throw new Error('Pokok dana titipan harus berupa angka >= 0');
  }
  D.titipanCommitments = D.titipanCommitments || [];
  const ownerName = (params.ownerName && String(params.ownerName).trim()) || known.ownerName;
  const now = Date.now();
  let record = D.titipanCommitments.find((c) => c && c.ownerId === ownerId);
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
  if (typeof save === 'function') save();
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
  if (!(D && Array.isArray(D.titipanCommitments))) return false;
  if (!ownerId) return false;
  const idx = D.titipanCommitments.findIndex((c) => c && c.ownerId === ownerId);
  if (idx === -1) return false;
  D.titipanCommitments.splice(idx, 1);
  if (typeof save === 'function') save();
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
  const params = input || {};
  const ownerId = params.ownerId;
  if (!ownerId) throw new Error('Owner wajib dipilih');
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) throw new Error('Owner tidak ditemukan pada daftar pemilik investasi yang ada');
  const amount = Number(params.amount);
  if (!isFinite(amount) || amount < 0) {
    throw new Error('Nominal pengembalian harus berupa angka >= 0');
  }
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
  if (typeof save === 'function') save();
  return record;
},

// deleteReturn(id) — Sesi 486 (Case F). Hapus 1 baris riwayat
// pengembalian by `id`. Return `true` kalau ada yang terhapus, `false`
// kalau `id` tidak ditemukan (TIDAK throw — pola sama getter/delete
// read-only-safe lain di codebase ini). ISOLASI TOTAL: HANYA menyentuh
// `D.titipanReturns`.
deleteReturn(id) {
  if (!(D && Array.isArray(D.titipanReturns))) return false;
  const idx = D.titipanReturns.findIndex((r) => r && String(r.id) === String(id));
  if (idx === -1) return false;
  D.titipanReturns.splice(idx, 1);
  if (typeof save === 'function') save();
  return true;
},

});
