'use strict';
// tests/sesi-d2-asset-owners-bagi-rata-hardening.test.js — Sesi D2 (bagian
// 1/2), lanjutan Sesi D1 (lihat docs/SESSION-NOTE-sesiD1.md § "Lanjutan ke
// Sesi D2"): hardening interaksi Aset.bagiRataUnallocated() dgn flag
// _touched/_autoFilled per baris & interaksi dgn Auto-Rebalance Panel
// (Aset._rebalancePending/_checkRebalanceTrigger/_renderRebalancePanel).
//
// 1 file source disentuh sesi ini: modules/asset/aset-owners.js
//   - bagiRataUnallocated(): tambah 1 baris `Aset._rebalancePending=null;`
//     SEBELUM loop applyQuotaToRow() (pola sama removeOwnerRow()/
//     resetOwners() yang sudah ada) -- 0 rumus porsi baru, murni bersih2
//     state panel supaya tidak ada panel BASI yang nyasar tampil pasca
//     normalisasi (lihat komentar panjang di source utk alasan lengkap:
//     tanpa reset ini, panel yg sudah ter-trigger SEBELUM tombol "Bagi rata"
//     ditekan -- baik dari migrasi data lama overflow >100% [openOwnersModal/
//     resetOwners] MAUPUN dari user sempat mengetik manual >100% sebelum
//     berubah pikiran -- akan tetap dirender ulang dgn pending LAMA tiap
//     applyQuotaToRow() memanggil _renderOwnersList(), dan begitu total
//     benar2 <=100% pasca bagi-rata, calculateRebalance() balikin
//     {ok:false,error:'no_reduction_needed'} yang oleh _renderRebalancePanel()
//     KELIRU ditampilkan sbg pesan "⚠️ Porsi pemilik lain tidak cukup...").
//
// Kontrak yang diuji (3 skenario yang disarankan eksplisit di
// SESSION-NOTE-sesiD1.md § "Lanjutan ke Sesi D2"):
//   1. Panel rebalance yang SUDAH tampil (pending ter-set, mis. simulasi
//      kondisi migrasi data lama overflow) SEBELUM bagiRataUnallocated()
//      dipanggil -- pasca panggilan, panel HARUS bersih (tidak nyasar
//      tampil pesan keliru), Aset._rebalancePending null, total akhir
//      <=100%.
//   2. Owner yang SUDAH py porsi manual (_touched=true) sebelum bagi-rata
//      -- applyQuotaToRow() (dipanggil bagiRataUnallocated() per baris)
//      TETAP menimpa porsinya ke kuota terkini (bukan di-skip), sesuai
//      perilaku applyQuotaToRow() existing yang sengaja TIDAK mengecek
//      _touched (beda dgn cabang auto-fill pasif onOwnerSelectChange()).
//   3. 3+ owner sekaligus -- urutan pemanggilan applyQuotaToRow() per baris
//      KONSISTEN dgn urutan literal Aset._ownersDraft (FIFO array, BUKAN
//      diurutkan besar-kecil kuota) -- dibuktikan lewat 2 urutan draft
//      berbeda (isi owner sama, urutan baris ditukar) yang menghasilkan
//      alokasi akhir BERBEDA, sesuai efek "remainingPorsi menyempit tiap
//      baris" yang dijelaskan di komentar bagiRataUnallocated().

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

// ---- Skenario 1: panel rebalance basi harus bersih pasca bagi-rata ----
test('S-D2-1: panel rebalance yang sudah tampil (pending basi, mis. migrasi overflow) dibersihkan bagiRataUnallocated(), tidak nyasar tampil pesan keliru', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 40, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 60, ownerName: 'Pak Budi' },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 20000000 }, // kuota ow1 = 20jt/100jt = 20%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  // Simulasikan kondisi "draft SUDAH overflow >100% SEBELUM bagi-rata
  // dipanggil" (mis. migrasi data lama) -- ganti draft manual jadi overflow,
  // lalu panggil _checkRebalanceTrigger() SAMA PERSIS seperti yang dilakukan
  // openOwnersModal()/resetOwners() otomatis utk kasus migrasi (lihat
  // komentar "MIGRASI data lama" di kedua fungsi itu).
  Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 50, isSelf: true },
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 70, isSelf: false }, // total 120%, overflow 20%
  ];
  Aset._checkRebalanceTrigger(Aset._ownersDraft.length - 1);
  // Pra-kondisi: panel HARUS sudah ter-trigger (pending ter-set) sebelum
  // tombol "Bagi rata" ditekan -- kalau tidak, skenario ini tidak menguji
  // apa-apa (self-check supaya test tidak diam-diam jadi no-op).
  assert.ok(Aset._rebalancePending, 'pra-kondisi: rebalance panel harus sudah pending sebelum bagi-rata dipanggil');
  const boxBefore = dom.getElementById('assetOwnersRebalanceBox');
  assert.match(boxBefore.innerHTML, /melebihi 100%/);

  Aset.bagiRataUnallocated();

  // Pasca bagi-rata: total sudah ternormalisasi <=100% (ow1 di-cap ke kuota
  // 20%, SELF tetap 50% -> total 70%) -- panel HARUS bersih, bukan nyasar
  // menampilkan pesan "tidak cukup" yang keliru (calculateRebalance() akan
  // balikin no_reduction_needed kalau pending lama sempat dipakai render ulang).
  assert.equal(Aset._rebalancePending, null);
  const boxAfter = dom.getElementById('assetOwnersRebalanceBox');
  assert.equal(boxAfter.innerHTML, '');
  const draft = Aset._ownersDraft;
  const total = draft.reduce((s, o) => s + (o.porsi || 0), 0);
  assert.ok(total <= 100);
  assert.equal(draft.find((o) => o.ownerId === 'ow1').porsi, 20);
});

// ---- Skenario 1b: pending yang muncul DI TENGAH proses (baris pertama
// applyQuotaToRow sempat memicu overflow sesaat sebelum baris berikutnya
// menormalkan) juga tidak boleh nyasar tampil di akhir ----
test('S-D2-1b: bagiRataUnallocated() tetap membersihkan panel walau dipanggil saat draft masih dalam kondisi 1-baris-saja terisi (bukan hanya migrasi 2+ baris)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Ruko', nilai: 50000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 10000000 }, // kuota = 20%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 100, isSelf: true },
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
  ];
  // Manual set pending seolah-olah user sempat mengetik sesuatu yang
  // memicu panel (index 0 = SELF, method proporsional default) sebelum
  // berubah pikiran & pakai "Bagi rata".
  Aset._rebalancePending = { editedIndex: 0, method: 'proporsional', manualIndex: null };
  Aset._renderRebalancePanel();

  Aset.bagiRataUnallocated();

  assert.equal(Aset._rebalancePending, null);
  assert.equal(dom.getElementById('assetOwnersRebalanceBox').innerHTML, '');
});

// ---- Skenario 2: owner dgn _touched=true (porsi manual) tetap ditimpa ----
test('S-D2-2: owner yang sudah punya porsi manual (_touched=true) TETAP ditimpa bagiRataUnallocated(), bukan di-skip', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 20000000 }, // kuota = 20%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    // ow1 sudah diisi manual (mis. iseng ketik 5%) & sudah _touched=true --
    // BUKAN baris kosong seperti test D1 (S-D-3 dkk) yang porsi awalnya 0.
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 5, isSelf: false, _touched: true },
  ];
  Aset.bagiRataUnallocated();
  const row = Aset._ownersDraft.find((o) => o.ownerId === 'ow1');
  // Ditimpa ke kuota terkini (20%), BUKAN dipertahankan di 5% manual lama --
  // sesuai perilaku applyQuotaToRow() existing (tombol "🔄 Isi dari kuota
  // sisa" per baris SENGAJA tidak mengecek _touched, beda dgn auto-fill
  // pasif onOwnerSelectChange()).
  assert.equal(row.porsi, 20);
  // Flag _touched/_autoFilled tetap true setelahnya (field masih bisa
  // diedit manual lagi kapan saja -- aturan #15, tidak ada penguncian
  // input) -- konsisten dgn efek applyQuotaToRow() yang sudah ada.
  assert.equal(row._touched, true);
  assert.equal(row._autoFilled, true);
});

// ---- Skenario 2b: _touched=true TIDAK menghalangi auto-fill pasif lain
// (onOwnerSelectChange) melihat baris SUDAH terisi porsi>0 pasca bagi-rata,
// jadi tidak dobel-isi kalau owner yang sama dipilih ulang di baris baru ----
test('S-D2-2b: pasca bagiRataUnallocated(), baris yang sudah keisi (porsi>0 & _touched) tidak lagi jadi target auto-fill pasif onOwnerSelectChange lain', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 20000000 }, // kuota = 20%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  assert.equal(Aset._ownersDraft[0].porsi, 20);
  // onOwnerSelectChange() cabang auto-fill pasif SENGAJA mengecek
  // `!_touched` DAN `curPorsi<=0` sebelum mengisi -- baris ini sekarang
  // gagal kedua syarat itu (porsi=20>0, _touched=true), jadi re-select
  // owner yang sama di baris ini TIDAK akan menimpa ulang porsinya diam2
  // lewat jalur auto-fill pasif (beda dgn tombol manual "Isi dari kuota
  // sisa"/"Bagi rata" yang memang boleh menimpa).
  Aset.onOwnerSelectChange(0, 'ow1');
  assert.equal(Aset._ownersDraft[0].porsi, 20, 'auto-fill pasif tidak boleh menimpa ulang baris yg sudah terisi bagi-rata');
});

// ---- Skenario 3: urutan pemanggilan konsisten dgn urutan draft (3+ owner) ----
test('S-D2-3: bagiRataUnallocated() 3+ owner -- alokasi mengikuti urutan literal draft (FIFO), bukan diurutkan besar-kecil kuota', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Ruko 3 Lantai', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 50000000 }, // kuota mentah = 50%
      { ownerId: 'ow2', principalAmount: 40000000 }, // kuota mentah = 40%
      { ownerId: 'ow3', principalAmount: 30000000 }, // kuota mentah = 30% (total mentah 120% > 100%)
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');

  // Urutan A: ow1, ow2, ow3 (SELF dilepas dari draft -- ruang porsi penuh
  // 100% dibagi ketiganya, murni utk memperjelas efek FIFO tanpa sisa SELF).
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
    { ownerId: 'ow3', ownerName: 'Pak Joko', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draftA = Aset._ownersDraft;
  const a1 = draftA.find((o) => o.ownerId === 'ow1').porsi;
  const a2 = draftA.find((o) => o.ownerId === 'ow2').porsi;
  const a3 = draftA.find((o) => o.ownerId === 'ow3').porsi;
  // ow1 diproses duluan (index 0): ruang penuh 100% -> ambil penuh kuotanya 50%.
  assert.equal(a1, 50);
  // ow2 diproses ke-2 (index 1): ruang tersisa 100-50=50% -> ambil penuh kuotanya 40%.
  assert.equal(a2, 40);
  // ow3 diproses terakhir (index 2): ruang tersisa 100-50-40=10% -> di-cap ke 10%
  // (BUKAN 30% kuota mentahnya, krn ruang sudah habis duluan diambil ow1/ow2).
  assert.equal(a3, 10);
  assert.equal(a1 + a2 + a3, 100);

  // Urutan B: TUKAR urutan draft (ow3, ow2, ow1) -- owner & kuota sama
  // persis, cuma urutan barisnya dibalik -- hasil akhir HARUS berbeda dari
  // Urutan A, membuktikan alokasi murni ikut urutan draft literal (bukan
  // logic tersembunyi yang mengurutkan berdasar besar kuota).
  Aset._ownersDraft = [
    { ownerId: 'ow3', ownerName: 'Pak Joko', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draftB = Aset._ownersDraft;
  const b3 = draftB.find((o) => o.ownerId === 'ow3').porsi;
  const b2 = draftB.find((o) => o.ownerId === 'ow2').porsi;
  const b1 = draftB.find((o) => o.ownerId === 'ow1').porsi;
  // ow3 diproses duluan sekarang: ruang penuh 100% -> ambil penuh kuotanya 30%.
  assert.equal(b3, 30);
  // ow2 ke-2: ruang tersisa 100-30=70% -> ambil penuh kuotanya 40%.
  assert.equal(b2, 40);
  // ow1 terakhir: ruang tersisa 100-30-40=30% -> di-cap ke 30% (bukan 50% kuota mentahnya).
  assert.equal(b1, 30);
  assert.equal(b1 + b2 + b3, 100);

  // Bukti eksplisit "urutan berpengaruh": hasil ow1 & ow3 di Urutan A vs B berbeda.
  assert.notEqual(a1, b1);
  assert.notEqual(a3, b3);
});

// ---- Skenario 3b: urutan konsisten juga saat diselingi baris SELF di tengah draft ----
test('S-D2-3b: urutan FIFO tetap konsisten dgn urutan draft walau baris SELF ada di tengah (bukan selalu index 0)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Gudang', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 40000000 }, // kuota mentah = 40%
      { ownerId: 'ow2', principalAmount: 40000000 }, // kuota mentah = 40%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  // SELF (30%) disisipkan DI TENGAH antara ow1 & ow2 -- ruang tersisa utk
  // owner non-SELF cuma 70% total, tapi indices non-SELF yg dikumpulkan
  // bagiRataUnallocated() (lihat source: `.map((o,k)=>...).filter(...)`)
  // tetap mengikuti posisi index ASLINYA di draft (0 dan 2), bukan
  // dikompaksi ulang jadi 0/1.
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 30, isSelf: true },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draft = Aset._ownersDraft;
  // ow1 (index 0, diproses duluan): ruang tersisa 100-30(SELF)=70% -> ambil penuh 40%.
  assert.equal(draft[0].porsi, 40);
  assert.equal(draft[1].porsi, 30); // SELF tidak tersentuh sama sekali
  // ow2 (index 2, diproses ke-2): ruang tersisa 100-30-40=30% -> di-cap ke 30% (bukan 40%).
  assert.equal(draft[2].porsi, 30);
  const total = draft.reduce((s, o) => s + (o.porsi || 0), 0);
  assert.ok(total <= 100);
});
