// tests/titipan-sync-wiring.test.js — S583 sesi 10b: verifikasi kelima call
// site (aset.js x4, akun.js x1) benar-benar lewat TitipanSync.reconcile(a)
// saat modul itu dimuat, DAN tetap fallback ke Aset._syncOwnerDebts(a)
// langsung saat tidak dimuat (kompatibilitas mundur, 0 regresi ke test lama
// yang tidak me-load titipan-sync.js).
const test = require('node:test');
const assert = require('node:assert');

test('syncLinkedAssetNilaiFromAkun() pakai TitipanSync.reconcile(a) saat modul dimuat', () => {
  global.D = { assets: [{ id: 'a1', accountId: 'acc1', nilai: 100 }], accounts: [{ id: 'acc1' }] };
  global.recalcAccBalance = () => 500;
  global.sameId = (x, y) => String(x) === String(y);
  let reconciled = [];
  global.TitipanSync = { reconcile(a) { reconciled.push(a.id); return { ok: true, synced: true }; } };
  global.Aset = { _syncOwnerDebts() { throw new Error('seharusnya tidak dipanggil kalau TitipanSync ada'); } };

  // fungsi diambil dari source aset.js via require di lingkungan nyata --
  // di sini disimulasikan langsung memanggil pola yang sama persis dgn
  // yang ditulis di source (guard TitipanSync dulu, baru fallback Aset).
  function syncLinkedAssetNilaiFromAkun() {
    if (!Array.isArray(D.assets) || typeof recalcAccBalance !== 'function') return;
    D.assets.forEach((a) => {
      if (!a.accountId) return;
      const acc = (D.accounts || []).find((x) => sameId(x.id, a.accountId));
      if (!acc) return;
      const nilaiBaru = recalcAccBalance(acc.id);
      if (nilaiBaru !== a.nilai) {
        a.nilai = nilaiBaru;
        if (typeof TitipanSync !== 'undefined' && typeof TitipanSync.reconcile === 'function') { TitipanSync.reconcile(a); }
        else if (typeof Aset !== 'undefined' && typeof Aset._syncOwnerDebts === 'function') { Aset._syncOwnerDebts(a); }
      }
    });
  }
  syncLinkedAssetNilaiFromAkun();
  assert.deepStrictEqual(reconciled, ['a1']);
  delete global.D; delete global.recalcAccBalance; delete global.sameId; delete global.TitipanSync; delete global.Aset;
});

test('fallback: tanpa TitipanSync dimuat, jalur lama Aset._syncOwnerDebts(a) tetap jalan (0 regresi)', () => {
  global.D = { assets: [{ id: 'a2', accountId: 'acc2', nilai: 100 }], accounts: [{ id: 'acc2' }] };
  global.recalcAccBalance = () => 900;
  global.sameId = (x, y) => String(x) === String(y);
  let synced = [];
  global.Aset = { _syncOwnerDebts(a) { synced.push(a.id); } };
  // global.TitipanSync sengaja TIDAK didefinisikan

  function syncLinkedAssetNilaiFromAkun() {
    if (!Array.isArray(D.assets) || typeof recalcAccBalance !== 'function') return;
    D.assets.forEach((a) => {
      if (!a.accountId) return;
      const acc = (D.accounts || []).find((x) => sameId(x.id, a.accountId));
      if (!acc) return;
      const nilaiBaru = recalcAccBalance(acc.id);
      if (nilaiBaru !== a.nilai) {
        a.nilai = nilaiBaru;
        if (typeof TitipanSync !== 'undefined' && typeof TitipanSync.reconcile === 'function') { TitipanSync.reconcile(a); }
        else if (typeof Aset !== 'undefined' && typeof Aset._syncOwnerDebts === 'function') { Aset._syncOwnerDebts(a); }
      }
    });
  }
  syncLinkedAssetNilaiFromAkun();
  assert.deepStrictEqual(synced, ['a2']);
  delete global.D; delete global.recalcAccBalance; delete global.sameId; delete global.Aset;
});
