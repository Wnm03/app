'use strict';
// tests/asset-zakatable-owner-autofill.test.js — FIX (laporan user: form
// Tambah/Edit Aset, toggle "Hitung ke Zakat Maal" — saat dinyalakan, dropdown
// "Kepemilikan" (#assetOwnership) seharusnya otomatis ke "Milik Sendiri"
// (SELF), tapi sebelumnya TIDAK — Aset.toggleZakatable() dulu cuma
// mengubah state tombol zakatable, tidak pernah menyentuh #assetOwnership.
//
// Fix: Aset.toggleZakatable() sekarang ikut set ownSel.value='SELF' HANYA
// saat toggle dinyalakan (state jadi true) — toggle OFF tidak mengubah
// dropdown balik (0 field baru, 0 validasi baru, murni auto-fill).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(fields) {
  const document = {
    getElementById: (id) => {
      if (!(id in fields)) return null;
      return fields[id];
    },
  };
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    { D: { assets: [] }, document },
    ['Aset']
  );
}

test('toggleZakatable() — dari OFF ke ON -> dropdown Kepemilikan otomatis diset ke SELF', () => {
  const fields = {
    assetZakatableBtn: { textContent: '', className: '' },
    assetOwnership: { value: 'INVESTOR' },
  };
  const ctx = makeCtx(fields);
  ctx.Aset._zakatableState = false;
  ctx.Aset.toggleZakatable();
  assert.equal(ctx.Aset._zakatableState, true);
  assert.equal(fields.assetOwnership.value, 'SELF');
  assert.equal(fields.assetZakatableBtn.textContent, '✓ Aktif');
});

test('toggleZakatable() — dari ON ke OFF -> dropdown Kepemilikan TIDAK diubah (tetap apa adanya)', () => {
  const fields = {
    assetZakatableBtn: { textContent: '', className: '' },
    assetOwnership: { value: 'CUSTOMER' },
  };
  const ctx = makeCtx(fields);
  ctx.Aset._zakatableState = true;
  ctx.Aset.toggleZakatable();
  assert.equal(ctx.Aset._zakatableState, false);
  assert.equal(fields.assetOwnership.value, 'CUSTOMER');
  assert.equal(fields.assetZakatableBtn.textContent, 'Nonaktif');
});

test('toggleZakatable() — aman kalau #assetOwnership belum ada di DOM (0 crash)', () => {
  const fields = {
    assetZakatableBtn: { textContent: '', className: '' },
  };
  const ctx = makeCtx(fields);
  ctx.Aset._zakatableState = false;
  assert.doesNotThrow(() => ctx.Aset.toggleZakatable());
  assert.equal(ctx.Aset._zakatableState, true);
});
