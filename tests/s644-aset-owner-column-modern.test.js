'use strict';
// tests/s644-aset-owner-column-modern.test.js — cakupan Sesi s644 (lanjutan
// s639, RENCANA-MODERNISASI-UI.md): kolom "Pemilik" di tabel Aset tema
// modern, mengikuti mockup Ledger Pro ("W · 70%", "Sen", "Bersama").
// REUSE MultiOwnerEngine.getOwners() 100% apa adanya (0 rumus kepemilikan
// baru) -- proof-test terpisah krn assetOwnerCellHtml() adalah fungsi baru
// murni format tampilan, bukan bagian assetTableRowHTML() lama.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      assetCrossCheckWarning: () => null,
    },
  );
}

test('assetOwnerCellHtml() — aset tanpa data owners eksplisit (default sintesis SELF) -> "Saya"', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetOwnerCellHtml({ id: 'a1', name: 'Motor', nilai: 1000 });
  assert.equal(html, 'Saya');
});

test('assetOwnerCellHtml() — 1 pemilik non-self, porsi 100% -> nama singkat, TANPA persen', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetOwnerCellHtml({ id: 'a1', name: 'Rumah', nilai: 1, owners: [{ ownerId: 'wati', ownerName: 'Wati', porsi: 100 }] });
  assert.equal(html, 'Wat');
});

test('assetOwnerCellHtml() — owners tidak valid (total porsi != 100) -> fallback sintesis SELF -> "Saya"', () => {
  // MultiOwnerEngine.getOwners() mensyaratkan total porsi PERSIS 100
  // (validateOwners()); array owners yang tidak valid jatuh ke fallback
  // sintesis default (getOwners() poin 4), bukan dibaca apa adanya.
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetOwnerCellHtml({ id: 'a1', name: 'Rumah', nilai: 1, owners: [{ ownerId: 'wati', ownerName: 'Wati Sujono', porsi: 70 }] });
  assert.equal(html, 'Saya');
});

test('assetOwnerCellHtml() — 2 pemilik dgn 1 dominan, nama dominan 2 kata -> inisial + persen', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetOwnerCellHtml({
    id: 'a1', name: 'Rumah', nilai: 1,
    owners: [{ ownerId: 'wati', ownerName: 'Wati Sujono', porsi: 70 }, { ownerId: 'budi', ownerName: 'Budi', porsi: 30 }],
  });
  assert.equal(html, 'WS · 70%');
});

test('assetOwnerCellHtml() — 2 pemilik dgn 1 dominan (porsi>=60) -> nama dominan + persen', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetOwnerCellHtml({
    id: 'a1', name: 'Emas', nilai: 1,
    owners: [{ ownerId: 'wati', ownerName: 'Wati', porsi: 70 }, { ownerId: 'budi', ownerName: 'Budi', porsi: 30 }],
  });
  assert.equal(html, 'Wat · 70%');
});

test('assetOwnerCellHtml() — 2 pemilik tanpa yang dominan (mis. 50/50) -> "Bersama"', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetOwnerCellHtml({
    id: 'a1', name: 'Emas', nilai: 1,
    owners: [{ ownerId: 'wati', ownerName: 'Wati', porsi: 50 }, { ownerId: 'budi', ownerName: 'Budi', porsi: 50 }],
  });
  assert.equal(html, 'Bersama');
});

test('assetTableRowHTML() — kolom Pemilik terselip di antara Aset dan Nilai', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetTableRowHTML({ id: 'a1', name: 'Motor Beat', jenis: 'Kendaraan', nilai: 15000000, owners: [{ ownerId: 'wati', ownerName: 'Wati', porsi: 100 }] });
  assert.match(html, /<td class="num u-fs11 u-t2">Wat<\/td>/);
  const ownerIdx = html.indexOf('u-fs11 u-t2');
  const nilaiIdx = html.indexOf('tx-amount num');
  assert.ok(ownerIdx > 0 && nilaiIdx > ownerIdx, 'kolom Pemilik harus sebelum kolom Nilai');
});
