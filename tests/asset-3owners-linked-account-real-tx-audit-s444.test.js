'use strict';
// tests/asset-3owners-linked-account-real-tx-audit-s444.test.js — AUDIT (s444):
// skenario nyata diminta user -- 1 aset di Buku Aset dgn 3 pemegang porsi
// (SELF + 2 pihak lain), salah satu porsi (porsi SELF) ditautkan ke Akun
// Keuangan yang BENERAN dipakai transaksi (riwayat pemasukan & pengeluaran
// nyata di D.transactions, bukan cuma baseBalance kosong), lalu diverifikasi
// sync OTOMATIS antar data: Aset<->Akun (nilai/saldo) DAN Aset->Utang (dana
// titipan 2 pemilik non-SELF, dari _syncOwnerDebts()).
//
// HASIL AUDIT -- 2 BUG DITEMUKAN (keduanya direproduksi di bawah, RED sebelum
// fix diterapkan):
//
// BUG-OWN-001: syncLinkedAssetNilaiFromAkun() (Sesi 422f, dipanggil dari
// save() TIAP mutasi data) sudah BENAR menarik balik a.nilai dari transaksi
// riwayat nyata yang terjadi di akun tertaut (arah Akun->Aset) -- TAPI tidak
// ikut memanggil Aset._syncOwnerDebts(). Akibat: begitu nilai aset naik/turun
// krn transaksi nyata (income/expense) di akun tertaut, utang "dana titipan"
// milik 2 pemegang porsi non-SELF (Budi/Siti) TIDAK ikut disesuaikan --
// jadi basi, merefleksikan nilai aset LAMA. Ini bikin Kekayaan Bersih (Nilai
// Aset - Utang titipan) & Zakat Maal jadi salah hitung (utang titipan
// understated relatif ke nilai aset yang sudah naik).
//
// BUG-OWN-002: Aset.saveOwners() (modal ⚖️ Atur Porsi Kepemilikan, Sesi
// 392d/422e) sudah BENAR resync saldo akun tertaut ke ownPortion porsi BARU
// -- TAPI juga tidak memanggil Aset._syncOwnerDebts(). Akibat: user ubah
// split porsi 3 pemilik (mis. Budi 30%->40%, Siti 20%->30%), saldo akun
// tertaut ikut benar, tapi utang titipan Budi/Siti di Buku Utang TETAP di
// angka porsi LAMA -- 2 sumber kebenaran (owners[] vs debts[]) jadi
// tidak sinkron sampai user tidak sengaja membuka+simpan ulang modal Edit
// Aset utama (satu-satunya jalur yang MEMANG memanggil _syncOwnerDebts(),
// lihat _saveInner() baris ~938).
//
// Scope fix DITUNDA sesi ini (sesuai instruksi user: audit + test real dulu)
// -- kedua test bug di bawah SENGAJA ditulis assert nilai BENAR (bukan
// snapshot bug), jadi tetap RED sampai _syncOwnerDebts() dipanggil juga dari
// syncLinkedAssetNilaiFromAkun() & saveOwners().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let _n = 9000;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      uid: () => (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      todayStr: () => '2026-08-07',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset', 'recalcAccBalance', 'syncLinkedAssetNilaiFromAkun', 'invalidateAccBalCache'],
  );
}

// D dasar: aset Ruko 10.000.000, 3 pemilik (SELF 50%, Budi 30%, Siti 20%),
// tertaut ke akun 'acc1' yang baseBalance-nya SUDAH konsisten dgn NILAI
// PENUH instrumen (10.000.000 -- SESI 449, akun tertaut tidak lagi cuma
// nyimpen porsi SELF) -- persis kondisi SETELAH Aset.save() normal (pola
// txDelta yang sama dgn _saveInner()/saveOwners()).
function baseD() {
  return {
    assets: [{
      id: 'as1',
      name: 'Ruko 3 Pemilik',
      nilai: 10000000,
      accountId: 'acc1',
      owners: [
        { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'budi', porsi: 30, ownerName: 'Budi' },
        { ownerId: 'siti', porsi: 20, ownerName: 'Siti' },
      ],
    }],
    accounts: [{ id: 'acc1', name: 'Rek Ruko', baseBalance: 10000000, includeInBalance: true }],
    transactions: [],
    debts: [],
  };
}

test('AUDIT — setup: recalcAccBalance() akun tertaut benar utk 3-owner + riwayat tx campuran income/expense', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  D.transactions.push({ id: 1, accountId: 'acc1', type: 'income', amount: 2000000, date: '2026-08-01', note: 'Sewa masuk' });
  D.transactions.push({ id: 2, accountId: 'acc1', type: 'expense', amount: 500000, date: '2026-08-02', note: 'Biaya perawatan' });
  ctx.invalidateAccBalCache();
  // 10.000.000 (baseBalance, nilai penuh) + 2.000.000 (income) - 500.000 (expense) = 11.500.000
  assert.equal(ctx.recalcAccBalance('acc1'), 11500000);
});

test('AUDIT — setup: _syncOwnerDebts() bikin 2 entri utang titipan (Budi 30% & Siti 20%) sesuai porsi awal', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset._syncOwnerDebts(D.assets[0]);
  const budi = D.debts.find((d) => d.linkedOwnerId === 'budi');
  const siti = D.debts.find((d) => d.linkedOwnerId === 'siti');
  assert.equal(budi.nilai, 3000000); // 30% dari 10jt
  assert.equal(siti.nilai, 2000000); // 20% dari 10jt
  assert.equal(D.debts.filter((d) => d.linkedAssetId === 'as1').length, 2);
});

test('BUG-OWN-001 — riwayat transaksi NYATA (income+expense) di akun tertaut menaikkan a.nilai via syncLinkedAssetNilaiFromAkun(), tapi utang titipan Budi/Siti HARUS ikut disesuaikan', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset._syncOwnerDebts(D.assets[0]); // state awal: Budi 3jt, Siti 2jt (konsisten dgn nilai 10jt)

  // Riwayat transaksi NYATA di akun tertaut (bukan simulasi/mock) -- pemasukan
  // sewa 2jt, pengeluaran perawatan 500rb, PERSIS pola user (ada pengeluaran
  // & pemasukan, sync otomatis antar data).
  D.transactions.push({ id: 1, accountId: 'acc1', type: 'income', amount: 2000000, date: '2026-08-01', note: 'Sewa masuk' });
  D.transactions.push({ id: 2, accountId: 'acc1', type: 'expense', amount: 500000, date: '2026-08-02', note: 'Biaya perawatan' });

  // Titik tunggal yang app panggil TIAP mutasi data (features-helpers-global-security.js: save())
  ctx.invalidateAccBalCache();
  ctx.syncLinkedAssetNilaiFromAkun();

  // SESI 449: saldo akun tertaut = 11.500.000 ditarik APA ADANYA ke a.nilai
  // (0 scaling porsi lagi -- akun tertaut nyimpen nilai PENUH, bukan
  // ownPortion SELF saja).
  assert.equal(D.assets[0].nilai, 11500000, 'a.nilai harus ikut naik dari transaksi riwayat nyata di akun tertaut');

  // FIX YANG DIHARAPKAN: utang titipan Budi/Siti ikut disesuaikan ke nilai BARU
  // (30%/20% dari 11.5jt), bukan tetap di nilai lama (30%/20% dari 10jt).
  const budi = D.debts.find((d) => d.linkedOwnerId === 'budi');
  const siti = D.debts.find((d) => d.linkedOwnerId === 'siti');
  assert.equal(budi.nilai, 3450000, 'BUG-OWN-001: utang titipan Budi basi -- tidak ikut sync dari syncLinkedAssetNilaiFromAkun()');
  assert.equal(siti.nilai, 2300000, 'BUG-OWN-001: utang titipan Siti basi -- tidak ikut sync dari syncLinkedAssetNilaiFromAkun()');
});

test('BUG-OWN-002 — ubah split porsi 3 pemilik lewat saveOwners() HARUS ikut menyesuaikan utang titipan Budi/Siti', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {}; // stub render DOM (harness ini bukan browser, lihat loadSource.js)
  ctx.Aset._syncOwnerDebts(D.assets[0]); // state awal: Budi 3jt, Siti 2jt

  // User buka ⚖️ Atur Porsi Kepemilikan, ubah split: SELF 30%, Budi 40%, Siti 30%
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 30, isSelf: true },
    { ownerId: 'budi', ownerName: 'Budi', porsi: 40, isSelf: false },
    { ownerId: 'siti', ownerName: 'Siti', porsi: 30, isSelf: false },
  ];
  ctx.Aset.saveOwners();

  // SESI 449: saldo akun tertaut disync ke NILAI PENUH (a.nilai = 10jt, TIDAK
  // berubah oleh perubahan split porsi) -- bukan ownPortion SELF lagi.
  const acc = D.accounts.find((a) => a.id === 'acc1');
  assert.equal(acc.balance, 10000000, 'sanity check: resync saldo akun tertaut S422e/S449 harus tetap berfungsi (nilai penuh)');

  // FIX YANG DIHARAPKAN: utang titipan Budi/Siti ikut disesuaikan ke SPLIT BARU
  // (40%/30% dari nilai 10jt yang TIDAK berubah oleh saveOwners()).
  const budi = D.debts.find((d) => d.linkedOwnerId === 'budi');
  const siti = D.debts.find((d) => d.linkedOwnerId === 'siti');
  assert.equal(budi.nilai, 4000000, 'BUG-OWN-002: utang titipan Budi basi -- saveOwners() tidak memanggil _syncOwnerDebts()');
  assert.equal(siti.nilai, 3000000, 'BUG-OWN-002: utang titipan Siti basi -- saveOwners() tidak memanggil _syncOwnerDebts()');
});

test('AUDIT — jalur _saveInner() (Edit Aset utama) TIDAK kena bug ini: _syncOwnerDebts() sudah dipanggil di titik itu (0 regresi)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset._syncOwnerDebts(D.assets[0]);
  // Simulasikan _saveInner() cukup dgn memanggil ulang _syncOwnerDebts() setelah
  // nilai berubah manual (pola persis baris ~938 aset.js) -- pembanding "jalur
  // yang SUDAH benar" vs 2 bug di atas.
  D.assets[0].nilai = 20000000;
  ctx.Aset._syncOwnerDebts(D.assets[0]);
  const budi = D.debts.find((d) => d.linkedOwnerId === 'budi');
  const siti = D.debts.find((d) => d.linkedOwnerId === 'siti');
  assert.equal(budi.nilai, 6000000);
  assert.equal(siti.nilai, 4000000);
});
