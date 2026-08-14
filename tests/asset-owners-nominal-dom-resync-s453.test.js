'use strict';
// tests/asset-owners-nominal-dom-resync-s453.test.js — laporan user: field
// "Nominal (Rp)" di modal "⚖️ Atur Porsi Kepemilikan" kadang ketikan
// TERAKHIR tidak ke-commit ke Aset._ownersDraft[i].porsi -- di video
// kelihatan toolbar quick-action browser (mis. Brave, salah deteksi field
// Nominal sbg form checkout/belanja) muncul di atas keyboard tepat saat
// mengetik, mengganggu event `oninput` ketikan terakhir sebelum tap Simpan.
//
// ROOT CAUSE (dugaan, sesuai laporan): kalau satu event `oninput` kelewat,
// Aset._ownersDraft[i].porsi berhenti di ketikan SEBELUM yang terakhir --
// padahal `#ownerNominal{i}`.value di DOM sudah menampilkan angka yang
// benar (yang dilihat user sebelum tap Simpan). saveOwners() sebelumnya
// 100% percaya draft di memori, jadi angka yang benar-benar di layar bisa
// tidak ikut tersimpan.
//
// FIX: Aset._resyncOwnersFromDOM() (baru) dipanggil saveOwners() PALING
// AWAL -- baca ulang value asli tiap #ownerNominal{i} langsung dari DOM,
// bandingkan dgn nominal tersirat dari draft[i].porsi saat ini, kalau beda
// (ketikan terakhir belum ke-commit) recompute porsi dari nominal DOM
// tsb (rumus sama persis onOwnerNominalInput() cabang normal) & timpa
// draft[i].porsi SEBELUM validasi/MultiOwnerEngine.setOwners() dipanggil.

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
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset.js'],
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

test('saveOwners(): ketikan terakhir di Nominal yang "kelewat" oninput tetap tersimpan (dibaca ulang dari DOM)', () => {
  const D = makeD(200000000); // Rp200jt
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal(); // 1 pemilik sintesis SELF 100%
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNameInput(1, 'Pemilik Kedua');
  ctx.Aset._renderOwnersList();
  // Set porsi awal 50/50 lewat jalur normal (oninput benar-benar terpanggil).
  ctx.Aset.onOwnerPorsiInput(0, '50');
  ctx.Aset.onOwnerPorsiInput(1, '50');
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 50);
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 50);

  // Simulasikan ketikan TERAKHIR user di baris 0 yang oninput-nya kelewat:
  // value DOM berubah jadi 150jt (porsi seharusnya 75%), TAPI
  // onOwnerNominalInput(0,...) SENGAJA TIDAK dipanggil (mensimulasikan
  // event yang tidak ke-trigger) -- draft[0].porsi masih basi di 50.
  dom.getElementById('ownerNominal0').value = '150000000';
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 50, 'sanity: draft memang belum ter-update sebelum saveOwners()');

  // Baris lain (index 1) disesuaikan manual dulu spt user beneran akan
  // lakukan (baris ini oninput-nya BERHASIL terpanggil) supaya total match
  // 100% persis sama seperti nilai yang tampil di DOM (75% + 25%).
  ctx.Aset.onOwnerPorsiInput(1, '25');
  dom.getElementById('ownerNominal0').value = '150000000'; // set ulang, krn onOwnerPorsiInput(1,..) baris di atas tidak menyentuh baris 0

  ctx.Aset.saveOwners();

  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/, 'saveOwners() harus sukses (total 100% setelah resync dari DOM)');
  const saved = D.assets[0].owners;
  assert.equal(saved[0].porsi, 75, 'porsi baris 0 harus mengikuti nilai Nominal yang BENAR-BENAR ada di DOM (150jt/200jt=75%), bukan draft basi (50%)');
  assert.equal(saved[1].porsi, 25);
});

test('saveOwners(): baris yang Nominal DOM-nya SAMA dgn draft (tidak ada ketikan kelewat) tidak ikut berubah', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNameInput(1, 'Pemilik Kedua');
  ctx.Aset._renderOwnersList();
  ctx.Aset.onOwnerPorsiInput(0, '60');
  ctx.Aset.onOwnerPorsiInput(1, '40');

  ctx.Aset.saveOwners();

  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/);
  assert.equal(D.assets[0].owners[0].porsi, 60, 'perilaku normal (oninput selalu ke-trigger) tidak boleh regresi');
  assert.equal(D.assets[0].owners[1].porsi, 40);
});

test('_resyncOwnersFromDOM(): tidak melakukan apa pun kalau aset belum punya nilai (cabang nilai-tersirat S451 tidak disentuh)', () => {
  const D = makeD(0); // aset belum punya "Estimasi Nilai Saat Ini"
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset._ownersDraft[0].porsi = 100;
  dom.getElementById('ownerNominal0').value = '999999';

  ctx.Aset._resyncOwnersFromDOM();

  assert.equal(ctx.Aset._ownersDraft[0].porsi, 100, 'porsi tidak boleh ditimpa saat nilai aset masih 0/kosong (guard nilai<=0)');
});

// FIX S457 (audit "Nominal berubah setelah Simpan Porsi" -> bug KEDUA yang
// ditemukan saat investigasi: saveOwners() menolak dgn "porsi harus lebih
// dari 0" padahal porsi baris itu SUDAH valid): test ini SEBELUMNYA
// meng-encode perilaku yang justru SALAH -- field Nominal yang DOM-nya
// kosong (mis. belum pernah di-render / auto-vivify oleh stateful DOM
// stub di test harness) ditafsirkan _resyncOwnersFromDOM() sbg "user
// mengosongkan Nominal ke 0", lalu porsi baris itu DITIMPA jadi 0% --
// walau tidak ada satu pun ketikan user yang beneran terjadi. Itu persis
// akar bug KEDUA: baris yang porsinya sudah valid (mis. 15,12%, diisi
// lewat auto-bagi/Porsi%, BUKAN diketik langsung ke Nominal) bisa gagal
// validasi kalau elemen DOM Nominal-nya somehow kosong/belum ter-render
// saat saveOwners() dipanggil. "Kosong" (value='') != "user mengetik 0"
// (value='0') -- keduanya harus diperlakukan beda. Fix di
// _resyncOwnersFromDOM(): field kosong (setelah trim) SEKARANG di-skip
// total, tidak lagi ditafsirkan sbg 0 Rp eksplisit.
test('saveOwners(): field Nominal yang DOM-nya kosong (belum pernah dirender / disabled) TIDAK menimpa porsi draft yang sudah valid (fix S457)', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset._ownersDraft[0].porsi = 100;
  // TIDAK ada _renderOwnersList()/getElementById('ownerNominal0') dipanggil
  // sebelumnya -- DOM tiruan ini auto-vivify apa saja yang di-getById
  // (termasuk oleh _resyncOwnersFromDOM() sendiri) dgn value='' (default).
  // Field kosong yang TIDAK PERNAH DIKETIK APA PUN oleh user harus di-skip
  // (bukan ditafsirkan sbg "0 Rp eksplisit") -- porsi 100% yang sudah ada
  // di draft harus tetap tersimpan apa adanya.
  ctx.Aset.saveOwners();
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/, 'field Nominal kosong (belum pernah dirender) tidak boleh menimpa porsi draft yang sudah valid (100%) jadi 0%');
  assert.equal(D.assets[0].owners[0].porsi, 100, 'porsi harus tetap 100%, TIDAK ketimpa 0 oleh field DOM kosong');
});

test('saveOwners(): field Nominal yang DIKETIK EKSPLISIT "0" (bukan kosong) tetap diproses normal -> porsi baris itu jadi 0% -> validasi tetap menolak (bukan 100%)', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset._ownersDraft[0].porsi = 100;
  // Beda dgn test di atas: value DIISI STRING "0" secara eksplisit (bukan
  // '' kosong) -- ini harus tetap diproses spt biasa (bukan di-skip),
  // supaya guard field-kosong yang baru TIDAK menutupi kasus user beneran
  // mengetik nominal 0.
  dom.getElementById('ownerNominal0').value = '0';
  ctx.Aset.saveOwners();
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /⚠️/, 'Nominal "0" eksplisit -> porsi 0% -> tetap harus ditolak validasi (porsi harus >0)');
});
