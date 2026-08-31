'use strict';
// tests/sesi-d2-asset-owners-bagi-rata-hardening-part2.test.js — Sesi D2
// (bagian 2/2), lanjutan docs/SESSION-NOTE-sesiD2-part1.md § "Lanjut ke Sesi
// D2 bagian 2/2". MURNI test tambahan -- 0 file source disentuh sesi ini,
// ketiga area sisa ternyata SUDAH ditangani benar oleh kode existing (lihat
// audit per skenario di komentar tiap test), jadi kerjaan sesi ini adalah
// mengonfirmasi via test eksplisit, bukan fix.
//
// 3 area yang diuji (persis daftar "Sisa cakupan D2" di SESSION-NOTE-sesiD2-part1.md):
//   1. S-D2-4: interaksi _applyRemainingShare() dgn baris hasil
//      bagiRataUnallocated() -- baris yg BERHASIL diisi bagi-rata (porsi>0 &
//      _touched=true, ditulis applyQuotaToRow()) otomatis TIDAK bisa jadi
//      target _applyRemainingShare() lagi krn KEDUA syarat
//      calculateRemainingShare() (!_touched && p<=0) sudah gagal -- 0 gap
//      ditemukan, test ini murni bukti eksplisit yg diminta.
//   2. S-D2-5/5b: _renderOwnersUnallocatedBox() (Sesi C) ikut ter-refresh
//      pasca bagiRataUnallocated() -- karena applyQuotaToRow() per baris
//      (dipanggil bagiRataUnallocated() dlm loop) sudah memanggil
//      _renderOwnersList(), yg SATU-satunya titik render itu SUDAH memanggil
//      _renderOwnersUnallocatedBox() (baris ~453 aset-owners.js) tiap kali --
//      box otomatis ikut segar selama minimal 1 baris berhasil ditulis (box
//      selalu baca draft LIVE, bukan snapshot lama, jadi urutan sukses/gagal
//      antar baris tidak masalah).
//   3. S-D2-6: skala 10+ owner -- FIFO/cap/box tetap benar & konsisten saat
//      sebagian besar baris kehabisan ruang porsi (cap<=0, di-skip tanpa
//      nulis apa pun) di ekor daftar.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '',
      placeholder: '', disabled: false, style: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeCtx(D, dom, toastSpy) {
  const ctx = loadSource(
    ['modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/investasi-view.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/shared/modules-calc.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      uid: () => 'owner_x',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: toastSpy || (() => {}),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-31',
    },
    ['Aset', 'MultiOwnerEngine', 'Investment', 'InvestmentUI', 'DanaTitipanPortfolioAPI', 'calculateRebalance'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

function baseD({ assets, investments, titipanCommitments }) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [], titipanReturns: [],
  };
}

// ---- Area 1: interaksi dgn _applyRemainingShare() ----
test('S-D2-4: baris hasil bagiRataUnallocated() (porsi>0 & _touched) tidak jadi target _applyRemainingShare() saat user lanjut mengetik manual di baris lain', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Ruko', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 30000000 }, // kuota ow1 = 30%
      // ow2 SENGAJA tidak punya commitment tercatat -> applyQuotaToRow()
      // gagal (toast "belum punya pokok titipan tercatat"), TIDAK menulis
      // porsi/_touched baris ow2 sama sekali -- baris ini yg jadi bukti
      // "benar-benar kosong" pembanding thd baris ow1 yg "kosong tapi sudah
      // disentuh bagi-rata".
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 0, isSelf: true },
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draft = Aset._ownersDraft;
  assert.equal(draft[1].porsi, 30);
  assert.equal(draft[1]._touched, true);
  assert.equal(draft[2].porsi, 0);
  assert.ok(!draft[2]._touched);

  // User lanjut mengetik manual porsi SELF (index 0) -- memicu
  // _applyRemainingShare(0) yg mencari baris kosong PERTAMA selain index 0.
  Aset.onOwnerPorsiInput(0, '50');

  // Target HARUS ow2 (index 2, benar2 kosong & !_touched), BUKAN ow1 (index
  // 1, sudah porsi>0 & _touched=true dari bagi-rata) -- kedua syarat
  // calculateRemainingShare() (!_touched && p<=0) sudah gagal utk ow1.
  assert.equal(draft[1].porsi, 30, 'baris ow1 (hasil bagi-rata) tidak boleh tertimpa _applyRemainingShare');
  assert.equal(draft[2].porsi, 20, 'ow2 (baris kosong sebenarnya) yg jadi target, sisa 100-50-30=20');
  assert.equal(draft[2]._autoFilled, undefined, '_applyRemainingShare() tidak menandai _touched/_autoFilled -- beda dgn applyQuotaToRow()');
});

// ---- Area 2: refresh box "Sesi C" pasca bagi-rata ----
test('S-D2-5: box "💰 Total sisa belum terinvest" (Sesi C) ikut ter-refresh (bukan angka basi) pasca bagiRataUnallocated() menghabiskan kuota', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 50000000 }, // kuota mentah = 50%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
  ];
  Aset._renderOwnersList();
  const boxBefore = dom.getElementById('assetOwnersUnallocatedBox');
  assert.match(boxBefore.innerHTML, /50000000/); // sisa penuh, belum ada porsi terisi

  Aset.bagiRataUnallocated();

  // ow1 terisi 50% dari holding 100jt -> draftNominal 50jt menyerap seluruh
  // pokok 50jt -> sisa jadi 0 -- box HARUS berubah, bukan tetap 50000000 lama.
  const boxAfter = dom.getElementById('assetOwnersUnallocatedBox');
  assert.doesNotMatch(boxAfter.innerHTML, /50000000/);
  assert.match(boxAfter.innerHTML, /Rp 0/);
  // Tombol "Bagi rata" tetap ada (owner masih punya commitment tercatat,
  // hanya sisanya yg jadi 0 -- kriteria tampil box/tombol adalah hasValid,
  // bukan sisa>0), klik ulang harus aman (no-op, cap<=0 -> toast, 0 crash).
  assert.match(boxAfter.innerHTML, /Bagi rata/);
  assert.doesNotThrow(() => Aset.bagiRataUnallocated());
});

test('S-D2-5b: box tetap konsisten (sum benar, bukan Rp 0 salah) saat bagi-rata cuma menghabiskan SEBAGIAN kuota multi-owner', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Gudang', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 40000000 }, // kuota mentah 40%
      { ownerId: 'ow2', principalAmount: 40000000 }, // kuota mentah 40%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  // SELF disisakan 30% -- ruang tersisa utk ow1/ow2 cuma 70% total, ow2 (diproses
  // ke-2, index 1) bakal di-cap ke 30% (bukan 40% kuota mentahnya).
  Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 30, isSelf: true },
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draft = Aset._ownersDraft;
  assert.equal(draft[1].porsi, 40); // ow1 ambil penuh kuotanya (ruang 70% cukup)
  assert.equal(draft[2].porsi, 30); // ow2 di-cap (ruang sisa 100-30-40=30 < kuota 40%)

  // sisa ow1: 40jt-(100jt*40%)=0. sisa ow2: 40jt-(100jt*30%)=10jt. Total sisa
  // yg ditampilkan box HARUS 10jt (sum yg live, bukan angka pra-bagi-rata).
  const box = dom.getElementById('assetOwnersUnallocatedBox');
  assert.match(box.innerHTML, /10000000/);
  assert.doesNotMatch(box.innerHTML, /40000000/); // angka kuota mentah lama tidak boleh nyasar tampil
});

// ---- Area 3: skala 10+ owner ----
test('S-D2-6: bagiRataUnallocated() tetap benar (FIFO, cap, box) pada skala 12 owner, termasuk ekor yg kuotanya sudah habis', () => {
  const dom = makeStatefulDom();
  const N = 12;
  const owners = [];
  const commitments = [];
  for (let idx = 0; idx < N; idx++) {
    owners.push({ ownerId: 'ow' + idx, porsi: 0, ownerName: 'Owner ' + idx, isSelf: false });
    commitments.push({ ownerId: 'ow' + idx, principalAmount: 30000000 }); // tiap owner kuota mentah 15% (30jt/200jt)
  }
  const D = baseD({
    assets: [{ id: 'as1', name: 'Aset Besar', nilai: 200000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }],
    titipanCommitments: commitments,
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = owners;

  const t0 = Date.now();
  Aset.bagiRataUnallocated();
  const elapsedMs = Date.now() - t0;
  // Guard degradasi kasar -- 12 owner x re-render list penuh per baris SEHARUSNYA
  // tetap sub-detik jauh; ambang longgar (bukan benchmark presisi) sekadar
  // menangkap regresi drastis (mis. re-render O(n^2) tidak sengaja).
  assert.ok(elapsedMs < 2000, 'bagiRataUnallocated() 12 owner selesai jauh di bawah 2 detik, ditemukan ' + elapsedMs + 'ms');

  const draft = Aset._ownersDraft;
  // Ruang porsi 100% / kuota 15% per owner -> 6 owner pertama ambil penuh 15%
  // (90%), owner ke-7 (index 6) di-cap ke sisa 10%, owner ke-8..12 (index
  // 7..11) kuota sudah habis (cap<=0) -> TIDAK tersentuh sama sekali.
  for (let idx = 0; idx < 6; idx++) {
    assert.equal(draft[idx].porsi, 15, 'owner index ' + idx + ' harus 15%');
    assert.equal(draft[idx]._touched, true);
  }
  assert.equal(draft[6].porsi, 10, 'owner index 6 di-cap ke sisa ruang 10%');
  assert.equal(draft[6]._touched, true);
  for (let idx = 7; idx < N; idx++) {
    assert.equal(draft[idx].porsi, 0, 'owner index ' + idx + ' kuota sudah habis, tidak tersentuh');
    assert.ok(!draft[idx]._touched, 'owner index ' + idx + ' tidak boleh _touched krn applyQuotaToRow() return awal (cap<=0)');
  }
  const total = draft.reduce((s, o) => s + (o.porsi || 0), 0);
  assert.equal(total, 100);

  // Box "Sesi C": sisa ow0..5 masing2 0 (kuota terserap penuh), ow6 sisa
  // 30jt-(200jt*10%)=10jt, ow7..11 sisa PENUH 30jt tiap owner (5 owner x
  // 30jt=150jt) -- total 10jt+150jt=160jt.
  const box = dom.getElementById('assetOwnersUnallocatedBox');
  assert.match(box.innerHTML, /160000000/);

  // _applyRemainingShare() pada skala ini juga tidak boleh nyasar menulis
  // apa pun: re-ketik baris 0 (nilai sama, 15%) tetap memicu
  // _applyRemainingShare(0), yg mencari baris kosong pertama (index 7,
  // !_touched & porsi<=0) -- TAPI karena total draft sudah PAS 100% (sisa=0),
  // calculateRemainingShare() balikin null (sisa<=0) sebelum sempat menulis
  // apa pun ke index 7 -- baris ekor yg kuotanya habis tetap 0/untouched.
  Aset.onOwnerPorsiInput(0, '15');
  assert.equal(draft[7].porsi, 0, 'total sudah 100% -- _applyRemainingShare tidak boleh menulis apa pun ke baris ekor');
});
