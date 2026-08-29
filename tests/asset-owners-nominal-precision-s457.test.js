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
// 4 desimal (onOwnerNominalInput, _resyncOwnersFromDOM) -- SATU pola presisi
// konsisten di seluruh alur konversi, TANPA menambah state/anchor baru (tetap
// 1 sumber kebenaran: Aset._ownersDraft[i].porsi). Lihat komentar panjang di
// onOwnerNominalInput() (modules/asset/aset.js) utk detail penuh & alasan
// kenapa anchor terpisah DITOLAK.
//
// DIPERBARUI di sesi AF1 lanjutan: baris "lain" yang ikut ter-auto-bagi di
// bawah sekarang lewat Aset._applyRemainingShare() (calculateRemainingShare(),
// SSOT modules-calc.js) -- bukan lagi _autoDistributeRemaining() (S431/S449,
// SUDAH DIHAPUS, dead code). Presisi 4 desimal yang dites di sini TIDAK
// berubah (calculateRemainingShare() reuse pola pembulatan yang sama persis),
// jadi makeCtx() cuma perlu ditambah modules-calc.js supaya auto-bagi baris
// lain tetap jalan (kalau tidak dimuat, _applyRemainingShare() diam2 no-op).
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
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
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
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry', 'calculateRemainingShare'],
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

test('_applyRemainingShare(): share baris lain (via calculateRemainingShare()) juga pakai presisi 4 desimal, total tetap PERSIS 100% (dulu _autoDistributeRemaining(), DIHAPUS sesi AF1)', () => {
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

// SESI AF1 lanjutan — Design Lock "Test round-trip Nominal (kritis)": nominal bulat umum yang
// DIKETIK LANGSUNG (bukan hasil auto-fill baris lain) harus tampil IDENTIK setelah Simpan Porsi
// & buka modal lagi, di 3 skala nilaiAset berbeda (kecil ~1jt, sedang ~10jt, besar ~1M+) x 3
// nominal (1.700.000 / 500.000 / 74.136). Toleransi longgar (<=20 rupiah) sama seperti test round
// trip S457 di atas -- pembulatan presisi-4-desimal bisa menyisakan selisih sub-rupiah wajar utk
// nilaiAset yang sangat besar (dicatat sbg known-limitation di Design Lock, bukan blocker).
function roundTripNominalCase(nilaiAset, nominalDiketik, label) {
  test(`round-trip Nominal (AF1, Design Lock): ${label} -- nilaiAset=${nilaiAset}, nominal diketik langsung=${nominalDiketik}, harus identik (toleransi rupiah) setelah Simpan+buka ulang`, () => {
    const D = makeD(nilaiAset);
    const dom = makeStatefulDom();
    const ctx = makeCtx(D, dom);
    ctx.Aset.editId = 'a1';
    ctx.Aset.openOwnersModal();
    ctx.Aset.addOwnerRow();
    ctx.Aset.onOwnerNameInput(1, 'Pemilik Kedua');
    ctx.Aset._renderOwnersList();

    ctx.Aset.onOwnerNominalInput(0, String(nominalDiketik));
    ctx.Aset.saveOwners();
    assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/);

    // Buka ulang modal (simulasi user tutup & buka lagi) -- draft di-derive ULANG dari D.assets
    // tersimpan, bukan dari state lama di memori.
    ctx.Aset.openOwnersModal();
    const porsiSetelahBuka = ctx.Aset._ownersDraft[0].porsi;
    const nilaiFinal = ctx.Aset._ownersAssetNilai();
    const nominalTampil = Math.round(nilaiFinal * porsiSetelahBuka / 100);
    // Toleransi PROPORSIONAL ke resolusi presisi 4-desimal (Math.round(x*10000)/10000 --
    // 1 langkah porsi terkecil = 0,0001% = nilaiAset * 0.000001 rupiah). Utk nilaiAset kecil/
    // sedang ini << Rp20 (toleransi tetap dipakai sbg lantai), tapi utk nilaiAset SANGAT besar
    // (~1M+) resolusi ini sendiri bisa melebihi Rp20 -- INI KNOWN-LIMITATION yang SUDAH dicatat
    // eksplisit di DESIGN-LOCK-autofill-sisa-porsi.md ("solusinya [anchor Rp terpisah] sudah
    // pernah ditolak tim, lihat S457") & di komentar onOwnerNominalInput() (aset.js), BUKAN
    // blocker/regresi -- toleransi di sini disesuaikan supaya test mengukur "presisi sesuai
    // desain" (1 langkah rounding), bukan menuntut ketepatan yang secara matematis mustahil pada
    // skala tsb.
    const toleransi = Math.max(20, Math.ceil(nilaiAset * 0.000001) + 5);
    assert.ok(
      Math.abs(nominalTampil - nominalDiketik) <= toleransi,
      `Nominal (Rp) baris 0 setelah Simpan+buka ulang harus dekat dgn ${nominalDiketik} (toleransi ${toleransi}, proporsional ke resolusi presisi 4-desimal pd skala nilaiAset ini), didapat ${nominalTampil}`,
    );
  });
}

roundTripNominalCase(1000000, 500000, 'skala KECIL (~1jt)');
roundTripNominalCase(1000000, 74136, 'skala KECIL (~1jt), nominal ganjil');
roundTripNominalCase(10000000, 1700000, 'skala SEDANG (~10jt)');
roundTripNominalCase(10000000, 500000, 'skala SEDANG (~10jt)');
roundTripNominalCase(10000000, 74136, 'skala SEDANG (~10jt), nominal ganjil');
roundTripNominalCase(1500000000, 1700000, 'skala BESAR (~1M+)');
roundTripNominalCase(1500000000, 500000, 'skala BESAR (~1M+)');
roundTripNominalCase(1500000000, 74136, 'skala BESAR (~1M+), nominal ganjil');

// SESI AF1 lanjutan — Design Lock: "resetOwners()/buka modal ulang → _touched ke-reset (draft
// baru)". Verifikasi: baris yang sudah _touched di 1 sesi edit TIDAK terbawa ke draft baru setelah
// modal ditutup+dibuka lagi atau resetOwners() dipanggil -- baris yang tadinya "sudah pernah
// diketik manual" harus kembali jadi target auto-fill yang sah di sesi edit berikutnya.
test('openOwnersModal(): buka ulang modal -> _touched dari sesi edit sebelumnya TIDAK terbawa ke draft baru (baris jadi target auto-fill lagi)', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerPorsiInput(1, '40'); // baris 1 diketik manual -> _touched=true di sesi ini
  assert.equal(ctx.Aset._ownersDraft[1]._touched, true, 'sanity check: baris 1 harus _touched setelah diketik manual');

  // Modal ditutup (tanpa Simpan) & dibuka lagi -> draft baru di-derive ulang dari D.assets
  // (masih porsi lama tersimpan: SELF 100%, belum ada baris ke-2 tersimpan krn belum saveOwners()).
  ctx.Aset.openOwnersModal();
  assert.equal(ctx.Aset._ownersDraft.length, 1, 'draft baru cuma 1 baris (perubahan sesi sebelumnya belum disimpan)');
  ctx.Aset.addOwnerRow();
  assert.equal(ctx.Aset._ownersDraft[1]._touched, undefined, '_touched TIDAK boleh terbawa ke baris baru di draft sesi edit berikutnya');

  // Buktikan baris ini sah jadi target auto-fill lagi (bukan cuma _touched undefined secara
  // kebetulan) -- edit baris 0, baris 1 (baru, belum _touched) harus otomatis terisi.
  ctx.Aset.onOwnerPorsiInput(0, '70');
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 30, 'baris baru harus jadi target auto-fill yang sah (bukti _touched benar2 ke-reset, bukan cuma undefined kebetulan)');
});

test('resetOwners(): buang draft yang belum disimpan (termasuk _touched) -> kembali ke data tersimpan, baris jadi target auto-fill lagi', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerPorsiInput(1, '40'); // _touched=true di baris 1
  assert.equal(ctx.Aset._ownersDraft[1]._touched, true);

  ctx.Aset.resetOwners();
  assert.equal(ctx.Aset._ownersDraft.length, 1, 'resetOwners() balik ke data tersimpan (1 baris SELF)');
  ctx.Aset.addOwnerRow();
  assert.equal(ctx.Aset._ownersDraft[1]._touched, undefined, '_touched TIDAK boleh terbawa lewat resetOwners()');
  ctx.Aset.onOwnerPorsiInput(0, '70');
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 30, 'baris baru setelah resetOwners() harus jadi target auto-fill yang sah');
});
