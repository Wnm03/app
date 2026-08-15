'use strict';
// tests/session01-dana-titipan-pool-data-layer.test.js — SESI 1 (Dana
// Titipan Pool & Porsi, lihat MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md).
//
// Target: `DanaTitipanPoolAPI.getEntries()/addOpeningBalance()/
// addDeposit()/deleteEntry()` — CRUD data layer murni. Sesi ini SENGAJA
// belum menguji `poolMasukTotal()`/`sisaAlokasi()`/`status()` (belum
// diimplementasi, itu Sesi 2) dan belum menguji guard commitment (Sesi 3).
//
// Cakupan Test Matrix (MASTER_HANDOFF §18), diinterpretasikan pada level
// data layer (bukan level UI/status -- itu di sesi lanjutan):
//   A -- pool kosong + commitment lama: getEntries() balikin [], dan
//        DanaTitipanPoolAPI TIDAK PERNAH menyentuh D.titipanCommitments.
//   B -- set opening balance: entry tersimpan benar dgn field lengkap.
//   H -- multiple deposit: semua entry tersimpan, jumlah manual (reduce
//        di test, BUKAN lewat method aggregation yg belum ada) benar.
//   O -- duplicate save / idempotency: tiap panggilan push entry BARU
//        dgn id unik, tidak upsert/merge walau params identik.
//
// File source yang di-load HANYA `dana-titipan-pool-api.js` sendiri --
// membuktikan desain "object independen, 0 dependency ke commitment/
// aggregation" (MASTER_HANDOFF §3 AUDIT NOTE, §14) benar-benar isolated
// dan testable tanpa perlu me-load 2 file titipan lain sama sekali.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let saveCalls = 0;
  let uidCounter = 0;
  const ctx = loadSource(
    ['modules/finance/dana-titipan-pool-api.js'],
    { D, uid: () => 'p' + (++uidCounter), save: () => { saveCalls++; } },
    ['DanaTitipanPoolAPI'],
  );
  ctx._saveCalls = () => saveCalls;
  return ctx;
}

function baseD(overrides) {
  return Object.assign({
    titipanCommitments: [
      { id: 'tc1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 7000000, committedDate: '2026-01-01', notes: '', createdAt: 1, updatedAt: 1 },
      { id: 'tc2', ownerId: 'sari', ownerName: 'Sari', principalAmount: 2500000, committedDate: '2026-01-02', notes: '', createdAt: 2, updatedAt: 2 },
    ],
  }, overrides);
}

// --- Skenario A: pool kosong + commitment lama, isolasi total ---------

test('A1. getEntries() balikin [] kalau D.titipanPool belum pernah diisi (tidak auto-init nulis ke D)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const entries = ctx.DanaTitipanPoolAPI.getEntries();
  // Catatan: array kosong dibuat di dalam vm sandbox (realm berbeda dari
  // test) -- deepStrictEqual lintas-realm bisa gagal walau isinya sama,
  // jadi dibandingkan via length + Array.isArray (pola aman lintas-vm).
  assert.ok(Array.isArray(entries));
  assert.equal(entries.length, 0);
  assert.equal(D.titipanPool, undefined, 'getEntries() harus getter murni, tidak menulis D.titipanPool');
});

test('A2. DanaTitipanPoolAPI tidak pernah membaca/mengubah D.titipanCommitments (isolasi total)', () => {
  const D = baseD();
  const before = JSON.stringify(D.titipanCommitments);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000, date: '2026-02-01' });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000 });
  ctx.DanaTitipanPoolAPI.deleteEntry(D.titipanPool[0].id);
  assert.equal(JSON.stringify(D.titipanCommitments), before, 'titipanCommitments harus persis sama sebelum/sesudah operasi pool');
});

test('A3. Tidak ada migrasi otomatis: D.titipanPool TIDAK PERNAH otomatis terisi dari total titipanCommitments existing', () => {
  const D = baseD(); // A=7jt, B=2,5jt di titipanCommitments, titipanPool belum ada sama sekali
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.getEntries();
  assert.equal(D.titipanPool, undefined);
});

// --- Skenario B: set opening balance -----------------------------------

test('B1. addOpeningBalance(): push entry baru dgn field lengkap & type benar, panggil save()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000, date: '2026-02-01', notes: 'saldo awal' });
  assert.equal(D.titipanPool.length, 1);
  assert.equal(rec.amount, 10000000);
  assert.equal(rec.date, '2026-02-01');
  assert.equal(rec.notes, 'saldo awal');
  assert.equal(rec.type, 'opening_balance');
  assert.ok(rec.id);
  assert.ok(rec.createdAt);
  assert.equal(ctx._saveCalls(), 1);
});

test('B2. addOpeningBalance(): date/notes opsional, default string kosong', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 5000000 });
  assert.equal(rec.date, '');
  assert.equal(rec.notes, '');
});

test('B3. addOpeningBalance(): amount negatif -> throw, TIDAK menulis apa pun ke D', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: -100 }));
  assert.equal(D.titipanPool, undefined);
});

test('B4. addOpeningBalance(): amount non-numerik (NaN/string bukan angka) -> throw', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 'seratus' }));
  assert.throws(() => ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: undefined }));
  assert.equal((D.titipanPool || []).length, 0);
});

test('B5. addOpeningBalance(): amount = 0 diterima (bukan negatif, valid)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 0 });
  assert.equal(rec.amount, 0);
});

test('[OPEN-#2, didokumentasikan] addOpeningBalance() dipanggil 2x tetap diterima (tidak reject "sudah ada opening balance") -- rekomendasi handoff dipakai, lihat SESSION-NOTES.md', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  const rec2 = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 2000000 });
  assert.equal(D.titipanPool.length, 2, 'kedua opening_balance harus tersimpan sbg 2 entry terpisah, bukan upsert');
  assert.equal(rec2.type, 'opening_balance');
});

// --- Skenario H: multiple deposit, jumlah benar ------------------------

test('H1. Multiple addDeposit(): semua entry tersimpan, tidak saling menimpa', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000, date: '2026-03-01' });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 2500000, date: '2026-03-05' });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 500000, date: '2026-03-10' });
  const entries = ctx.DanaTitipanPoolAPI.getEntries();
  assert.equal(entries.length, 3);
  entries.forEach((e) => assert.equal(e.type, 'deposit'));
});

test('H2. Jumlah manual (reduce) atas getEntries() sesuai total yang di-input -- aggregation method sendiri (poolMasukTotal) belum ada, itu Sesi 2', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000 });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 500000 });
  const total = ctx.DanaTitipanPoolAPI.getEntries().reduce((sum, e) => sum + e.amount, 0);
  assert.equal(total, 11500000);
  // CATATAN SESI 2: poolMasukTotal() sudah diimplementasikan (Sesi 2,
  // Aggregation/Status) -- assertion "belum ada" di sesi 1 sudah usang,
  // diganti verifikasi bahwa hasilnya konsisten dgn reduce manual di atas.
  assert.equal(ctx.DanaTitipanPoolAPI.poolMasukTotal(), 11500000);
});

test('H3. Campuran opening_balance + deposit tetap terhitung benar & type masing-masing terjaga', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000 });
  const entries = ctx.DanaTitipanPoolAPI.getEntries();
  assert.equal(entries.filter((e) => e.type === 'opening_balance').length, 1);
  assert.equal(entries.filter((e) => e.type === 'deposit').length, 1);
});

// --- Skenario O: duplicate save / idempotency ---------------------------

test('O1. addDeposit() 2x dgn params identik -> 2 entry terpisah dgn id unik (bukan merge/upsert)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec1 = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 500000, date: '2026-04-01', notes: 'sama' });
  const rec2 = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 500000, date: '2026-04-01', notes: 'sama' });
  assert.equal(D.titipanPool.length, 2);
  assert.notEqual(rec1.id, rec2.id);
});

test('O2. addOpeningBalance() 2x dgn params identik -> juga 2 entry terpisah dgn id unik', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec1 = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  const rec2 = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  assert.notEqual(rec1.id, rec2.id);
});

test('O3. save() dipanggil tepat 1x per operasi tulis (add/delete), tidak dipanggil sama sekali oleh getEntries()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.getEntries();
  assert.equal(ctx._saveCalls(), 0);
  const rec = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000 });
  assert.equal(ctx._saveCalls(), 1);
  ctx.DanaTitipanPoolAPI.deleteEntry(rec.id);
  assert.equal(ctx._saveCalls(), 2);
});

// --- deleteEntry(): basic behaviour (dibutuhkan sbg dasar Sesi 2/3) ----

test('D1. deleteEntry(id) yg valid -> terhapus, balikin true', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000 });
  const ok = ctx.DanaTitipanPoolAPI.deleteEntry(rec.id);
  assert.equal(ok, true);
  assert.equal(D.titipanPool.length, 0);
});

test('D2. deleteEntry(id) yg tidak ditemukan -> balikin false, tidak throw, array tidak berubah', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000 });
  const ok = ctx.DanaTitipanPoolAPI.deleteEntry('ghost-id');
  assert.equal(ok, false);
  assert.equal(D.titipanPool.length, 1);
});

test('D3. deleteEntry() dipanggil sebelum D.titipanPool pernah diisi -> balikin false, tidak throw', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const ok = ctx.DanaTitipanPoolAPI.deleteEntry('anything');
  assert.equal(ok, false);
});

test('D4. deleteEntry(id) menghapus 1 entry saja, entry lain tidak terganggu (hanya menyentuh D.titipanPool)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const rec1 = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1000000 });
  const rec2 = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 2000000 });
  ctx.DanaTitipanPoolAPI.deleteEntry(rec1.id);
  assert.equal(D.titipanPool.length, 1);
  assert.equal(D.titipanPool[0].id, rec2.id);
});
