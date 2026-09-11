'use strict';
// tests/aset-goldimport-aibus-emit-sesi-c.test.js — Sesi C (lanjutan
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan #9, Aset non-core):
// GoldImport.commit() (modules/asset/aset-emas-impor.js) SEBELUMNYA 0%
// emit AIBus sama sekali -- beda dari aset.js/aset-owners.js yang sudah
// emit "asset.updated" (pola tanpa wrapper kind/action, field langsung).
//
// Fix: 1 baris emit AIBus.emit("asset.updated",{imported:count}) setelah
// save() di commit(), payload minimal (jumlah item yg baru diimpor) --
// konsisten pola aset.js (editId/deletedId), bukan pola kind/action
// (finance.updated/product.updated) krn domain asset.updated sendiri
// belum pernah pakai wrapper itu. 0 logic import lain diubah.
//
// GoldZakat.onHargaInput() (save() ke-2 di file ini) SENGAJA TIDAK diberi
// event -- itu murni pengaturan lokal (D.goldZakatSettings, harga acuan
// per gram), bukan data aset transaksional, pola sama seperti
// format-tema.js/features-helpers-global-security.js yang ditandai
// RENDAH di audit (§ "Ditandai RENDAH").
//
// Harness loadSource() load SOURCE ASLI (aset-emas-impor.js), globals
// (Aset.ICON, uid, save, toast, dst) di-stub minimal sesuai kebutuhan
// commit(), bukan re-implement logic import di test ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, overrides = {}) {
  const toastMessages = [];
  const aibusEvents = [];
  let uidCounter = 0;
  const ctx = loadSource(
    ['modules/asset/aset-emas-impor.js'],
    {
      D,
      Aset: { ICON: {}, renderList: () => {} },
      uid: () => 'gold_' + (uidCounter++),
      todayStr: () => '2026-08-07',
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      closeModal: () => {},
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      parsePzNum: (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0,
      fmtFull: (n) => String(n),
      evalAmtExpr: () => {},
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
    ['GoldImport', 'GoldZakat'],
  );
  ctx.toastMessages = toastMessages;
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

test('GoldImport.commit(): sukses impor 2 item -> emit AIBus asset.updated {imported:2}', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D);
  ctx.GoldImport.parsed = [
    { jenis: 'Cincin', kadar: 750, nama: 'Toko A', berat: 5, total: 5000000, hargaPerGram: 1000000, tanggal: '2026-08-01' },
    { jenis: 'Kalung', kadar: 916, nama: '', berat: 10, total: 12000000, hargaPerGram: 1200000, tanggal: '2026-08-02' },
  ];

  ctx.GoldImport.commit();

  assert.equal(D.assets.length, 2, '0 regresi: 2 item tetap masuk D.assets seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'asset.updated');
  assert.ok(ev, 'AIBus.emit("asset.updated", ...) harus terpanggil setelah commit sukses');
  assert.equal(ev.payload.imported, 2);
});

test('GoldImport.commit(): belum ada yg dipratinjau (parsed kosong) -> guard toast, TIDAK emit apa pun', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D);
  ctx.GoldImport.parsed = [];

  ctx.GoldImport.commit();

  assert.equal(D.assets.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0, 'guard gagal (0 item) -> 0 emit');
});

test('GoldImport.commit(): AIBus tidak ada (typeof AIBus==="undefined") -> tetap tidak throw, item tetap tersimpan', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D, { AIBus: undefined });
  ctx.GoldImport.parsed = [
    { jenis: 'Gelang', kadar: 700, nama: '', berat: 3, total: 2100000, hargaPerGram: 700000, tanggal: '2026-08-03' },
  ];

  assert.doesNotThrow(() => ctx.GoldImport.commit());
  assert.equal(D.assets.length, 1, 'import tetap berjalan normal walau AIBus tidak ada');
});

test('GoldZakat.onHargaInput(): update harga acuan gram -> TIDAK emit apa pun (pengaturan lokal, bukan data aset)', () => {
  const D = { assets: [] };
  const ctx = makeCtx(D, {
    document: {
      getElementById(id) {
        if (id === 'gzHargaGram') return { value: '1350000' };
        return { textContent: '', innerHTML: '' };
      },
    },
  });

  ctx.GoldZakat.onHargaInput();

  assert.equal(D.goldZakatSettings.hargaPerGram24k, 1350000);
  assert.equal(ctx.__aibusEvents.length, 0, 'pengaturan lokal (harga acuan) sengaja tidak diberi event');
});
