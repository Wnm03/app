'use strict';
// tests/aset-reports-penyusutan-aibus-emit-sesi-c.test.js — Sesi C
// (lanjutan AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan #9, Aset
// non-core): Penyusutan.toggleAktif()/updateParam()
// (modules/asset/aset-reports.js) SEBELUMNYA 0% emit AIBus sama sekali
// meski keduanya menulis field `a.penyusutan` langsung ke D.assets --
// beda dari aset.js/aset-owners.js yang sudah emit "asset.updated".
//
// Fix: 1 baris emit AIBus.emit("asset.updated",{penyusutanUpdated:true,
// editId:id}) di kedua method, setelah save() -- pola payload konsisten
// dgn aset-owners.js ({ownersUpdated:true,editId}), bukan field baru yg
// asing dari domain ini. 0 logic penyusutan lain diubah.
//
// PajakAset.updateSetting() (save() ke-3 di file ini) SENGAJA TIDAK
// diberi event -- itu murni pengaturan global (D.pajakAsetSettings,
// NJOPTKP/tarif PBB), bukan data per-aset, pola sama seperti
// GoldZakat.onHargaInput() (aset-emas-impor.js, sesi ini juga) &
// format-tema.js yang ditandai RENDAH di audit.
//
// Harness loadSource() load SOURCE ASLI (aset-reports.js), globals
// di-stub minimal sesuai kebutuhan toggleAktif()/updateParam(), bukan
// re-implement logic penyusutan di test ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, overrides = {}) {
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/asset/aset-reports.js'],
    {
      D,
      Aset: { ICON: {} },
      parsePzNum: (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0,
      parseDecStr: (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0,
      fmtFull: (n) => String(n),
      escapeHtml: (s) => String(s),
      isAssetOwnershipSelf: () => true,
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      todayStr: () => '2026-08-07',
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
    ['Penyusutan', 'PajakAset'],
  );
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Motor Vario', jenis: 'Kendaraan', nilai: 20000000 },
    ],
  };
}

test('Penyusutan.toggleAktif(): nyalakan penyusutan -> emit AIBus asset.updated {penyusutanUpdated:true,editId}', () => {
  const D = makeD();
  const ctx = makeCtx(D);

  ctx.Penyusutan.toggleAktif('a1');

  assert.equal(D.assets[0].penyusutan.aktif, true, '0 regresi: field penyusutan.aktif tetap ditulis spt sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'asset.updated');
  assert.ok(ev, 'AIBus.emit("asset.updated", ...) harus terpanggil');
  assert.equal(ev.payload.penyusutanUpdated, true);
  assert.equal(ev.payload.editId, 'a1');
});

test('Penyusutan.toggleAktif(): id tidak ditemukan -> no-op, TIDAK emit apa pun', () => {
  const D = makeD();
  const ctx = makeCtx(D);

  ctx.Penyusutan.toggleAktif('id_tidak_ada');

  assert.equal(ctx.__aibusEvents.length, 0);
});

test('Penyusutan.updateParam(): ubah umurManfaatTahun -> emit AIBus asset.updated {penyusutanUpdated:true,editId}', () => {
  const D = makeD();
  D.assets[0].penyusutan = { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 0, tarifPersen: 0 };
  const ctx = makeCtx(D);

  ctx.Penyusutan.updateParam('a1', 'umurManfaatTahun', '5');

  assert.equal(D.assets[0].penyusutan.umurManfaatTahun, 5, '0 regresi: field tetap terupdate spt sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'asset.updated');
  assert.ok(ev, 'AIBus.emit("asset.updated", ...) harus terpanggil');
  assert.equal(ev.payload.penyusutanUpdated, true);
  assert.equal(ev.payload.editId, 'a1');
});

test('Penyusutan.updateParam(): aset belum punya .penyusutan (belum diaktifkan) -> no-op, TIDAK emit apa pun', () => {
  const D = makeD();
  const ctx = makeCtx(D);

  ctx.Penyusutan.updateParam('a1', 'umurManfaatTahun', '5');

  assert.equal(D.assets[0].penyusutan, undefined);
  assert.equal(ctx.__aibusEvents.length, 0);
});

test('Penyusutan.toggleAktif()/updateParam(): AIBus tidak ada -> tetap tidak throw, field tetap tersimpan', () => {
  const D = makeD();
  const ctx = makeCtx(D, { AIBus: undefined });

  assert.doesNotThrow(() => ctx.Penyusutan.toggleAktif('a1'));
  assert.equal(D.assets[0].penyusutan.aktif, true);
  assert.doesNotThrow(() => ctx.Penyusutan.updateParam('a1', 'nilaiResidu', '1000000'));
  assert.equal(D.assets[0].penyusutan.nilaiResidu, 1000000);
});

test('PajakAset.updateSetting(): ubah NJOPTKP -> TIDAK emit apa pun (pengaturan global, bukan data per-aset)', () => {
  const D = makeD();
  const ctx = makeCtx(D);

  ctx.PajakAset.updateSetting('njoptkp', '15000000');

  assert.equal(D.pajakAsetSettings.njoptkp, 15000000);
  assert.equal(ctx.__aibusEvents.length, 0, 'pengaturan global (NJOPTKP/tarif) sengaja tidak diberi event');
});
