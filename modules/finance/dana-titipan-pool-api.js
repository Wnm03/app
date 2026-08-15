// dana-titipan-pool-api.js — Dana Titipan: Pool (dana masuk aktual),
// entitas BARU terpisah dari `D.titipanCommitments[]` (porsi/alokasi per
// owner, sudah ada). Lihat `MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md` §5
// (New Data Model), §14 (API Specification), §15 (File Dependency Map)
// utk konteks lengkap.
//
// SESI 1 — DATA LAYER (Session Plan Dana Titipan Pool & Porsi). Scope
// SENGAJA dibatasi ke CRUD murni + validasi dasar:
//   - getEntries()
//   - addOpeningBalance()
//   - addDeposit()
//   - deleteEntry()
// TIDAK termasuk sesi ini (lihat MASTER_HANDOFF §20):
//   - poolMasukTotal()/sisaAlokasi()/status() (derived/aggregation) ->
//     Sesi 2.
//   - Guard terhadap `D.titipanCommitments` (validasi commitment vs pool)
//     -> Sesi 3. File ini TIDAK PERNAH membaca/menulis
//     `D.titipanCommitments` sama sekali.
//   - UI/modal -> Sesi 4/5.
//
// OBJECT INDEPENDEN (BUKAN Object.assign ke `DanaTitipanPortfolioAPI`):
// `dana-titipan-aggregation-api.js` (mendeklarasikan `const
// DanaTitipanPortfolioAPI = {...}`) dan `dana-titipan-commitment-return-
// api.js` (`Object.assign(DanaTitipanPortfolioAPI, {...})`) membentuk
// rantai 3-file yang WAJIB dimuat berurutan persis (lihat komentar di
// kedua file itu). File ini SENGAJA didesain sebagai `const
// DanaTitipanPoolAPI = {...}` yang berdiri sendiri supaya:
//   1. Tidak menambah kerapuhan urutan pada rantai Object.assign yang
//      sudah ada.
//   2. Bisa dites terisolasi di Sesi 1 tanpa perlu me-load
//      `dana-titipan-aggregation-api.js`/`dana-titipan-commitment-
//      return-api.js` sama sekali.
//   3. Guard commitment (Sesi 3) akan memanggil `DanaTitipanPoolAPI.xxx()`
//      dari `dana-titipan-commitment-return-api.js` (read-only,
//      cross-call satu arah) — bukan sebaliknya. Pool-api TIDAK PERNAH
//      tahu apa-apa soal commitment.
//
// ISOLASI TOTAL (HARD RULE sesi ini): fungsi-fungsi di file ini HANYA
// menyentuh `D.titipanPool` (+ panggil `save()` kalau tersedia, pola sama
// semua CRUD lain di codebase ini) — 0 sentuhan ke `D.titipanCommitments`,
// `D.accounts`, `D.transactions`, `D.investments`, `D.debts`, dst.
//
// TIDAK ADA MIGRASI OTOMATIS (MASTER_HANDOFF §12, HARD RULE): file ini
// TIDAK PERNAH membuat entry `D.titipanPool` secara implisit (mis. dari
// total `D.titipanCommitments` yang sudah ada). `D.titipanPool` hanya
// terisi lewat pemanggilan eksplisit `addOpeningBalance()`/`addDeposit()`
// oleh user.

const DanaTitipanPoolAPI = {

// getEntries() — getter read-only. Init lazy (pola sama
// `DanaTitipanPortfolioAPI.getCommitments()`/`D.investmentWatchlist`):
// TIDAK menulis `D.titipanPool` kalau belum ada, cuma balikin array
// kosong (getter murni, 0 side-effect nulis ke `D`).
// Return: array `D.titipanPool` apa adanya (atau `[]`).
getEntries() {
  return (D && D.titipanPool) || [];
},

// _validateAmount(amount) — helper validasi dasar dipakai bersama oleh
// addOpeningBalance()/addDeposit(). Throw Error kalau gagal (TIDAK
// menulis apa pun ke `D` kalau validasi gagal — atomic per panggilan,
// pola sama `saveCommitment()`).
//   - `amount` wajib numerik (`isFinite`) & >= 0 (dilarang negatif; pool
//     hanya bertambah lewat entry positif, berkurang lewat
//     `deleteEntry()`, bukan entry bertanda negatif — MASTER_HANDOFF §5).
_validateAmount(amount) {
  const n = Number(amount);
  if (!isFinite(n) || n < 0) {
    throw new Error('Nominal dana titipan harus berupa angka >= 0');
  }
  return n;
},

// _addEntry(type, params) — helper internal bersama, push 1 entry baru
// ke `D.titipanPool[]` dengan `type` yang sudah ditentukan caller
// (`addOpeningBalance()`/`addDeposit()` — user tidak pernah memilih
// `type` secara bebas, MASTER_HANDOFF §5: hanya 2 nilai yang sah).
// Idempotency (Test Matrix skenario O): setiap panggilan SELALU push
// entry baru dengan `id` unik (`uid()`) walau `amount`/`date`/`notes`
// persis sama dengan entry sebelumnya -- TIDAK ADA upsert/merge di sini
// (beda dari `saveCommitment()` yang upsert-by-`ownerId`; entry pool
// tidak punya identity alami untuk di-upsert, tiap submit = 1 transaksi
// baru, sama seperti pola `D.transactions`/`D.investmentTx`).
_addEntry(type, input) {
  const params = input || {};
  const amount = this._validateAmount(params.amount);
  D.titipanPool = D.titipanPool || [];
  const record = {
    id: (typeof uid === 'function') ? uid() : ('tp_' + Date.now()),
    amount,
    date: params.date || '',
    notes: params.notes || '',
    type,
    createdAt: Date.now(),
  };
  D.titipanPool.push(record);
  if (typeof save === 'function') save();
  return record;
},

// addOpeningBalance({amount, date, notes}) — MASTER_HANDOFF §14, §24
// [OPEN #2]. Rekomendasi handoff DIPAKAI di sesi ini (belum ada
// konfirmasi eksplisit user): fungsi ini BOLEH dipanggil berkali-kali,
// TIDAK menolak kalau sudah ada entry `type: 'opening_balance'`
// sebelumnya -- secara data, `opening_balance` dan `deposit` sama-sama
// masuk `poolMasukTotal` (dihitung Sesi 2), beda `type` murni label
// histori/UI ("Set Saldo Awal" vs "+ Tambah Deposit"). Pembatasan
// "hanya sekali" (kalau memang diinginkan) adalah keputusan UI di
// Sesi 4, BUKAN guard di data layer -- lihat SESSION-NOTES.md sesi ini
// utk detail asumsi ini.
// Return: record yang tersimpan (`{id, amount, date, notes, type:
//   'opening_balance', createdAt}`).
addOpeningBalance(params) {
  return this._addEntry('opening_balance', params);
},

// addDeposit({amount, date, notes}) — MASTER_HANDOFF §14. Selalu boleh
// dipanggil, tidak ada batasan jumlah panggilan.
// Return: record yang tersimpan (`{id, amount, date, notes, type:
//   'deposit', createdAt}`).
addDeposit(params) {
  return this._addEntry('deposit', params);
},

// deleteEntry(id) — MASTER_HANDOFF §10. Hapus 1 entry `D.titipanPool`
// by `id`. Return `true` kalau ada yang terhapus, `false` kalau tidak
// ditemukan (TIDAK throw — pola sama `deleteCommitment()`/
// `deleteReturn()`). ISOLASI TOTAL: HANYA menyentuh `D.titipanPool`
// (+ `save()`), 0 sentuhan ke `D.titipanCommitments` atau entity lain.
// Efek turunan (sisa pool bertambah/berkurang, status berubah) SENGAJA
// tidak dihitung di sini -- itu derived murni dari `getEntries()` di
// Sesi 2 (`poolMasukTotal()`/`status()`), fungsi ini tidak perlu tahu
// apa-apa soal itu (MASTER_HANDOFF §6: "belumDialokasikan harus derived
// murni ... setiap kali dipanggil, tidak ada caching/field tersimpan").
deleteEntry(id) {
  if (!(D && Array.isArray(D.titipanPool))) return false;
  if (!id) return false;
  const idx = D.titipanPool.findIndex((e) => e && e.id === id);
  if (idx === -1) return false;
  D.titipanPool.splice(idx, 1);
  if (typeof save === 'function') save();
  return true;
},

// ===== SESI 2 — AGGREGATION / STATUS (derived, read-only) =====
// Titik PERTAMA pool-api boleh membaca D.titipanCommitments (read-only,
// HANYA di 3 fungsi derived di bawah ini) -- CRUD Sesi 1 di atas TETAP
// isolasi total, tidak diubah. Semua derived dihitung ULANG setiap
// panggilan (MASTER_HANDOFF §6: "TIDAK ADA caching/field tersimpan"),
// supaya delete commitment/pool entry otomatis konsisten tanpa logic
// tambahan (Test Matrix F/G).

// poolMasukTotal() — SUM(D.titipanPool[].amount). MASTER_HANDOFF §6.
poolMasukTotal() {
  return this.getEntries().reduce((sum, e) => sum + (Number(e && e.amount) || 0), 0);
},

// _sudahDialokasikan() — helper internal, SUM(D.titipanCommitments[].
// principalAmount). READ-ONLY, tidak pernah menulis D.titipanCommitments.
_sudahDialokasikan() {
  const commitments = (D && Array.isArray(D.titipanCommitments)) ? D.titipanCommitments : [];
  return commitments.reduce((sum, c) => sum + (Number(c && c.principalAmount) || 0), 0);
},

// sisaAlokasi() — MASTER_HANDOFF §6. `null` (BUKAN 0) kalau pool masih
// kosong (NOT_MIGRATED, belum ada baseline) -- tidak pernah negatif.
sisaAlokasi() {
  if (this.getEntries().length === 0) return null;
  return Math.max(0, this.poolMasukTotal() - this._sudahDialokasikan());
},

// overAllocatedAmount() — MASTER_HANDOFF §6. 0 kalau NOT_MIGRATED atau
// tidak over-allocated.
overAllocatedAmount() {
  if (this.getEntries().length === 0) return 0;
  return Math.max(0, this._sudahDialokasikan() - this.poolMasukTotal());
},

// status() — MASTER_HANDOFF §7. 'NOT_MIGRATED' | 'OK' | 'OVER_ALLOCATED'.
// Field `poolStatus` (level pool) -- SENGAJA TERPISAH dari
// `allocationStatus` per-owner existing di dana-titipan-aggregation-
// api.js walau 2 dari 3 nilai string kebetulan sama ('OK'/
// 'OVER_ALLOCATED'). Tidak menimpa/rename field existing manapun.
status() {
  if (this.getEntries().length === 0) return 'NOT_MIGRATED';
  return (this._sudahDialokasikan() > this.poolMasukTotal()) ? 'OVER_ALLOCATED' : 'OK';
},

};

if (typeof window !== 'undefined') window.DanaTitipanPoolAPI = DanaTitipanPoolAPI;
