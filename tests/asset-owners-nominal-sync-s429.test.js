'use strict';
// tests/asset-owners-nominal-sync-s429.test.js — Sesi 429: field "Nominal
// (Rp)" baru di modal "⚖️ Atur Porsi Kepemilikan" (assetOwnersModal),
// otomatis terhitung dari "Porsi (%)" x nilai aset (dua arah), 0 field D
// baru (Nominal murni tampilan turunan dari `owners[].porsi` yang sudah
// ada, TIDAK pernah disimpan sendiri -- lihat komentar
// Aset._ownersAssetNilai()/onOwnerNominalInput() di modules/asset/aset.js).
//
// Pola DOM tiruan STATEFUL sama persis
// tests/asset-owners-flow-e2e-392a-to-392e.test.js (getElementById
// auto-vivify + simpan state), dipersempit ke skenario nominal<->porsi saja.

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

function makeCtx(D, dom) {
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      uid: () => 'owner_x',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-07',
    },
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
  ctx.Aset.renderList = () => {};
  ctx.toastMessages = toastMessages;
  return ctx;
}

function makeD(nilai) {
  return {
    assets: [{ id: 'a1', name: 'Tanah Patungan', nilai, keuntungan: 0 }],
    accounts: [], transactions: [], debts: [],
  };
}

test('_renderOwnersList(): field Nominal terisi otomatis dari porsi% x nilai aset saat modal dibuka', () => {
  const D = makeD(200000000); // Rp200jt
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal(); // 1 pemilik sintesis SELF 100%
  // Catatan: DOM tiruan ini auto-vivify elemen lewat getElementById(), TIDAK
  // betulan mem-parsing string innerHTML jadi elemen anak sungguhan (beda
  // dari browser asli) -- jadi konten hasil render awal (value/disabled
  // dari _renderOwnersList) HANYA bisa diverifikasi lewat string innerHTML
  // #assetOwnersList langsung. Update SESUDAH interaksi (mis.
  // onOwnerPorsiInput menulis nomEl.value=... langsung ke elemen) tetap bisa
  // dicek lewat .value seperti biasa (lihat test berikutnya).
  const rowHtml = dom.getElementById('assetOwnersList').innerHTML;
  const inputTag = /<input[^>]*id="ownerNominal0"[^>]*>/.exec(rowHtml)[0];
  assert.match(inputTag, /value="200000000"/, 'porsi 100% dari nilai 200jt harus tampil sbg nominal 200000000');
  assert.doesNotMatch(inputTag, /\bdisabled\b/, 'field nominal harus AKTIF (tanpa atribut disabled) krn aset sudah punya nilai');
});

test('onOwnerPorsiInput(): ubah porsi% -> field Nominal ikut update realtime (tanpa render ulang list)', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.onOwnerPorsiInput(0, '35');
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 35, 'draft porsi harus ikut ke-update');
  assert.equal(dom.getElementById('ownerNominal0').value, 70000000, '35% dari 200jt = 70jt harus tampil di field nominal');
});

test('onOwnerNominalInput(): ubah Nominal (Rp) -> porsi% ikut dihitung ulang & ditulis ke draft', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.onOwnerNominalInput(0, '50000000'); // Rp50jt dari 200jt = 25%
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 25, 'porsi draft harus dihitung ulang dari nominal/nilai*100');
  assert.equal(dom.getElementById('ownerPorsi0').value, 25, 'field porsi% harus ikut ter-update di DOM');
});

test('onOwnerNominalInput(): field porsi hasil sync tetap dipakai saveOwners() (bukan cuma tampilan)', () => {
  const D = makeD(100000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.onOwnerNameInput(0, 'Saya Sendiri');
  // SESI 453: set .value DOM langsung sebelum panggil handler, mensimulasikan
  // typing sungguhan (lihat komentar sama di
  // asset-owners-nominal-autodistribute-s431.test.js) -- saveOwners() sekarang
  // membaca ulang value ini via Aset._resyncOwnersFromDOM().
  dom.getElementById('ownerNominal0').value = '60000000';
  ctx.Aset.onOwnerNominalInput(0, '60000000'); // 60% dari 100jt
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNameInput(1, 'Investor B');
  dom.getElementById('ownerNominal1').value = '40000000';
  ctx.Aset.onOwnerNominalInput(1, '40000000'); // 40%
  ctx.Aset.saveOwners();
  // loadSource() jalan di vm.createContext terpisah -- array/object yang
  // dibuat DI DALAM sana beda realm dari literal Node biasa, jadi
  // deepEqual (strict) butuh normalisasi round-trip JSON dulu (pola sama
  // persis tests/asset-owners-flow-e2e-392a-to-392e.test.js § norm()).
  assert.deepEqual(
    JSON.parse(JSON.stringify(D.assets[0].owners.map((o) => [o.ownerName, o.porsi]))),
    [['Saya Sendiri', 60], ['Investor B', 40]],
    'porsi hasil input via field Nominal harus tersimpan benar ke D.assets (60/40), bukan cuma berubah di tampilan',
  );
});


// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// 4 test di bawah ini GANTIKAN test lama "field Nominal DINONAKTIFKAN kalau
// aset belum punya nilai" & "onOwnerNominalInput(): no-op kalau nilai aset
// 0" -- perilaku lama (blokir input Nominal sampai "Estimasi Nilai Saat
// Ini" diisi di form Aset) TERNYATA salah utk skenario nyata dilaporkan
// user: Porsi (%) tiap pemilik SUDAH diisi manual (total 100%), tapi field
// Nominal tetap terkunci cuma krn nilai dasar aset belum ada -- padahal
// user justru mau ISI Nominal dulu utk MENURUNKAN nilai total instrumennya.
// Field sekarang SELALU enabled; arah derivasi baru (Nominal+Porsi->nilai
// dasar) ditangani _ownersDraftNilai, lihat komentar onOwnerNominalInput()
// & _ownersAssetNilai() di aset.js.

test('_renderOwnersList(): field Nominal SELALU AKTIF (tidak pernah disabled), termasuk saat aset belum punya nilai', () => {
  const D = makeD(undefined); // nilai belum diisi
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  const rowHtml = dom.getElementById('assetOwnersList').innerHTML;
  const inputTag = /<input[^>]*id="ownerNominal0"[^>]*>/.exec(rowHtml)[0];
  assert.doesNotMatch(inputTag, /\bdisabled\b/, 'field nominal harus tetap AKTIF walau aset.nilai belum diisi/0 -- user boleh isi Nominal duluan');
});

test('onOwnerNominalInput(): nilai aset 0 TAPI porsi baris ini sudah diisi (kasus 3-pemilik dilaporkan user) -> nilai dasar tersirat dihitung, field Nominal baris LAIN ikut tersinkron', () => {
  const D = makeD(undefined);
  D.assets[0].owners = [
    { ownerId: 'self', ownerName: 'mas sihab (Keluarga)', porsi: 15.15, isSelf: false },
    { ownerId: 'kamera', ownerName: 'Kamera', porsi: 84.85, isSelf: false },
  ];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  // User isi Nominal baris ke-2 (Kamera, porsi 84.85%) = Rp10.000.000
  // -> nilai total tersirat = 10.000.000 / 0.8485 = 11.786.682 (dibulatkan)
  ctx.Aset.onOwnerNominalInput(1, '10000000');
  assert.equal(ctx.Aset._ownersDraftNilai, 11785504, 'nilai dasar instrumen harus tersirat dari nominal/porsi baris yang diisi');
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 15.15, 'porsi baris lain TIDAK berubah -- cuma tampilan Nominal Rp-nya yang menyusul');
  assert.equal(dom.getElementById('ownerNominal0').value, Math.round(11785504 * 0.1515), 'field Nominal baris lain harus ikut update ke nilai tersirat baru');
});

test('onOwnerNominalInput(): nilai aset 0 DAN porsi baris ini JUGA belum diisi -> no-op (0 persamaan 2 unknown, tidak ada cara aman menebak)', () => {
  const D = makeD(0);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset._ownersDraft[0].porsi = null; // simulasikan baris yang porsinya juga belum diisi
  ctx.Aset.onOwnerNominalInput(0, '999999');
  assert.equal(ctx.Aset._ownersDraftNilai, null, 'nilai dasar tidak boleh tersirat kalau porsi baris ini JUGA tidak diketahui');
});

test('saveOwners(): nilai dasar tersirat dari Nominal (Rp) ikut tersimpan ke a.nilai (bukan cuma draft sementara)', () => {
  const D = makeD(undefined);
  D.assets[0].owners = [
    { ownerId: 'self', ownerName: 'mas sihab (Keluarga)', porsi: 15.15, isSelf: false },
    { ownerId: 'kamera', ownerName: 'Kamera', porsi: 84.85, isSelf: false },
  ];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  // SESI 453: lihat komentar sama di test lain -- set .value DOM langsung
  // sebelum panggil handler, mensimulasikan typing sungguhan.
  dom.getElementById('ownerNominal1').value = '10000000';
  ctx.Aset.onOwnerNominalInput(1, '10000000');
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].nilai, 11785504, 'a.nilai (Estimasi Nilai Saat Ini) harus ikut terisi otomatis dari nilai tersirat, TIDAK perlu user isi manual di form Aset lagi');
});
