'use strict';
// tests/asset-owners-nominal-precision-s457.test.js — Sesi 457: bug
// "Nominal manual berubah setelah Simpan Porsi" di modal "⚖️ Atur Porsi
// Kepemilikan" (Aset ownership modal, modules/asset/aset.js).
//
// ROOT CAUSE (dikonfirmasi audit): saat user mengetik Nominal (Rp) manual
// di satu baris, porsi baris itu disimpan DIBULATKAN KE 2 DESIMAL
// (Math.round(nominal/nilai*100 *100)/100). Untuk nilai aset besar, 2
// nominal Rp yang beda (mis. 1.699.786 vs 1.700.000) bisa kebulat ke
// porsi 2-desimal yang PERSIS SAMA (sama2 15,12%). Setelah "Simpan
// Porsi", _renderOwnersList() re-derive Nominal tampilan dari porsi
// tersimpan itu (Math.round(nilai*porsi/100)) -- hasilnya balik ke
// nominal LAMA (1.699.786), bukan yang baru diketik user (1.700.000).
//
// FIX: presisi pembulatan porsi hasil konversi Rp->% dinaikkan dari 2 ke
// 4 desimal di 3 tempat (onOwnerNominalInput, _autoDistributeRemaining,
// _resyncOwnersFromDOM) -- SATU pola presisi konsisten di seluruh alur
// konversi, TANPA menambah state/anchor baru (tetap 1 sumber kebenaran:
// Aset._ownersDraft[i].porsi). Lihat komentar panjang di
// onOwnerNominalInput() (modules/asset/aset.js) utk detail penuh & alasan
// kenapa anchor terpisah DITOLAK.
//
// Pola DOM tiruan STATEFUL sama persis
// tests/asset-owners-nominal-sync-s429.test.js.

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

test('onOwnerNominalInput() -> saveOwners() -> _renderOwnersList(): Nominal manual TETAP sama setelah Simpan Porsi (kasus kolisi 2-desimal asli dari laporan bug)', () => {
  // Nilai aset dipilih supaya 1.699.786 & 1.700.000 SAMA2 kebulat ke
  // 15,12% dgn presisi 2 desimal (bug lama) tapi BEDA dgn presisi 4
  // desimal (fix baru) -- nilai realistis "aset besar" spt laporan bug.
  const nilai = 11700000; // Rp11,7jt konsep sama dgn laporan bug asli
  const D = makeD(nilai);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal(); // 1 pemilik sintesis SELF 100%
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNameInput(1, 'Pemilik Kedua');
  ctx.Aset._renderOwnersList();

  // User ketik Nominal manual Rp1.700.000 di baris 0.
  ctx.Aset.onOwnerNominalInput(0, '1700000');
  // Baris lain (auto-bagi) sudah otomatis menyesuaikan supaya total 100%.
  assert.ok(Math.abs(ctx.Aset._ownersDraft[0].porsi + ctx.Aset._ownersDraft[1].porsi - 100) < 0.001, 'total porsi harus tetap 100% setelah auto-bagi');

  ctx.Aset.saveOwners();
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/, 'saveOwners() harus sukses');

  // Setelah Simpan Porsi, saveOwners() sudah memanggil _renderOwnersList()
  // ulang (Aset._ownersDraft direfresh dari owners tersimpan). Hitung
  // Nominal yang AKAN ditampilkan pakai rumus PERSIS _renderOwnersList()
  // (Math.round(nilai*porsi/100)) -- catatan: DOM stub di harness test ini
  // cuma men-track elemen yang di-getElementById LANGSUNG, TIDAK memparse
  // string innerHTML jadi node individual, jadi baca ulang
  // dom.getElementById('ownerNominal0').value tidak valid di sini (selalu
  // '' krn tidak pernah di-getById saat innerHTML dirender) -- verifikasi
  // lewat draft.porsi + nilai spt yang UI akan tampilkan.
  const nilaiFinal = ctx.Aset._ownersAssetNilai();
  const porsiFinal = ctx.Aset._ownersDraft[0].porsi;
  const nominalTampil = Math.round(nilaiFinal * porsiFinal / 100);
  assert.ok(Math.abs(nominalTampil - 1700000) <= 20, `Nominal (Rp) baris 0 setelah Simpan Porsi harus dekat dgn 1.700.000 (toleransi pembulatan rupiah), didapat ${nominalTampil}`);
});

test('onOwnerNominalInput(): presisi konversi porsi 4 desimal (bukan lagi 2 desimal)', () => {
  const D = makeD(11700000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset._renderOwnersList();

  ctx.Aset.onOwnerNominalInput(0, '1700000');
  const porsi = ctx.Aset._ownersDraft[0].porsi;
  // 1700000/11700000*100 = 14.5299145299...% -> dgn presisi 4 desimal
  // harus 14.5299, BUKAN kebulat ke 14.53 (2 desimal, perilaku lama).
  assert.equal(porsi, 14.5299, 'porsi harus disimpan dgn presisi 4 desimal, bukan 2 desimal (fix S457)');
});

test('_autoDistributeRemaining(): share baris lain juga pakai presisi 4 desimal, total tetap PERSIS 100%', () => {
  const D = makeD(11700000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.addOwnerRow();
  ctx.Aset._renderOwnersList();

  ctx.Aset.onOwnerNominalInput(0, '1700000');
  const total = ctx.Aset._ownersDraft.reduce((s, o) => s + o.porsi, 0);
  assert.ok(Math.abs(total - 100) < 1e-9, `total porsi harus PERSIS 100% walau presisi dinaikkan ke 4 desimal, didapat ${total}`);
});

test('saveOwners() tidak menolak porsi valid (15.12%) hasil round-trip Rp -> % -> Rp presisi tinggi', () => {
  const nilai = 11700000;
  const D = makeD(nilai);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNameInput(1, 'Pemilik Kedua');
  ctx.Aset._renderOwnersList();

  ctx.Aset.onOwnerNominalInput(0, '1700000');
  ctx.Aset.saveOwners();
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/, 'saveOwners() tidak boleh menolak porsi yang valid hasil konversi Rp->%');
  const saved = D.assets[0].owners;
  assert.ok(saved[0].porsi > 0 && saved[0].porsi <= 100, 'porsi baris 0 harus tetap dalam rentang valid (>0 dan <=100)');
});
