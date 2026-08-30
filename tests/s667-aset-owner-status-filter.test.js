'use strict';
// tests/s667-aset-owner-status-filter.test.js — Sesi 667 (fondasi single-select,
// sesi lanjutan eksplisit dari catatan "Belum dikerjakan" SESSION-NOTE-S666.md:
// "filter Owner+Status di daftar Buku Aset"), ditulis ulang PENUH S673 (item
// backlog dari catatan "Belum dikerjakan" SESSION-NOTE-S667.md: "multi-select
// owner Buku Aset/Dana Titipan") mengikuti bentuk final checkbox multi-select,
// pola SAMA PERSIS InvestmentListUI (S669 tests/s669-investmentlistui-
// multiselect-owner-filter.test.js + S671 tests/s671-investmentlistui-filter-
// select-all-clear.test.js, investasi-list-view.js), cuma domain Aset. Fondasi
// query (Aset.getOwnerSettlement()/assetsByOwnerSettlement()) dari S665, wiring
// toggle modal dari S666, dropdown single-select dari S667 — sesi ini (S673)
// mengganti dropdown owner jadi checkbox-list multi-select + tombol Pilih
// Semua/Bersihkan (kalau owner non-SELF >5), semantik OR, murni state UI
// (Aset.filterOwnerIds/filterSettlement, 0 tulis ke D), delegasi penuh ke
// MultiOwnerEngine.getOwners()/Aset.getOwnerSettlement() yang sudah ada (0
// rumus baru).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/aset.js. modules/asset/aset-owners.js (S665/S666) TIDAK
// disentuh — reuse penuh API yang sudah ada. tests/s639-aset-tabel-modern-
// list-padat.test.js TIDAK perlu diupdate — regex di sana cuma cek nama
// variabel wiring `ownerFilterBar`/`filteredList` yang TIDAK berubah sesi ini
// (hanya bentuk internal filterOwnerId->filterOwnerIds yang berubah).
//
// Cakupan test ini:
//   1. State awal filterOwnerIds — array kosong (bukan string '').
//   2. _renderFilterBar(list) — '' kalau 0 aset punya owner non-SELF; kalau
//      ada, render checkbox-list Pemilik (dgn badge "(N aset)", atribut
//      checked sesuai filterOwnerIds) + dropdown Status (disabled kalau
//      filterOwnerIds kosong); tombol Pilih Semua/Bersihkan HANYA muncul
//      kalau owner non-SELF > 5.
//   3. _assetMatchesFilter(a) — predicate murni, semantik OR: filterOwnerIds
//      kosong -> lolos semua; aset lolos kalau punya SALAH SATU owner dari
//      filterOwnerIds; filterSettlement (kalau diisi) harus cocok
//      Aset.getOwnerSettlement() milik owner yang match itu.
//   4. onFilterOwnerToggle()/onFilterSettlementChange()/
//      onFilterOwnerSelectAll()/onFilterOwnerClearAll() — murni state UI +
//      delegasi ke Aset.renderList() (di-spy, TIDAK dijalankan sungguhan --
//      loadSource() harness ini bukan utk fungsi yang baca/tulis DOM
//      sungguhan, lihat catatan di tests/helpers/loadSource.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let _n = 9000;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      uid: () => (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      todayStr: () => '2026-08-30',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset'],
  );
}

function baseD() {
  return {
    assets: [
      {
        id: 'as1',
        name: 'Rumah Warisan Istri',
        nilai: 500000000,
        owners: [
          { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'istri1', porsi: 50, ownerName: 'Istri' },
        ],
      },
      {
        id: 'as2',
        name: 'Motor Titipan Adik',
        nilai: 20000000,
        owners: [
          { ownerId: 'SELF', porsi: 10, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'adik1', porsi: 90, ownerName: 'Adik' },
        ],
      },
      {
        id: 'as3',
        name: 'Motor Sendiri',
        nilai: 15000000,
        owners: [
          { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
        ],
      },
    ],
    debts: [],
  };
}

// seedBanyakOwner(n) — n aset, tiap aset 1 owner non-SELF unik (owner1..ownerN),
// supaya ownerMap._renderFilterBar() punya persis n baris.
function seedBanyakOwner(n) {
  const assets = [];
  for (let i = 1; i <= n; i += 1) {
    assets.push({
      id: 'aB' + i,
      name: 'Aset ' + i,
      nilai: 1000000,
      owners: [
        { ownerId: 'SELF', porsi: 1, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'owner' + i, porsi: 99, ownerName: 'Owner ' + i },
      ],
    });
  }
  return { assets, debts: [] };
}

// --- state awal -----------------------------------------------------------

test('state awal: filterOwnerIds array kosong (bukan string)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(Array.isArray(ctx.Aset.filterOwnerIds), true);
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

// --- _renderFilterBar() ------------------------------------------------

test('_renderFilterBar(): balik "" kalau 0 aset punya owner non-SELF', () => {
  const D = { assets: [{ id: 'a1', name: 'Motor Sendiri', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }] };
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset._renderFilterBar(D.assets), '');
});

test('_renderFilterBar(): render checkbox Pemilik dgn badge "(N aset)" per owner non-SELF', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /Istri.*\(1 aset\)/);
  assert.match(html, /Adik.*\(1 aset\)/);
  assert.match(html, /Filter Pemilik \(bisa pilih lebih dari satu\)/);
  assert.match(html, /onFilterOwnerToggle\('istri1'\)/);
  assert.match(html, /onFilterOwnerToggle\('adik1'\)/);
});

test('_renderFilterBar(): checkbox owner yg sedang terpilih (filterOwnerIds) dirender checked', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1'];
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /onFilterOwnerToggle\('istri1'\)" checked>/);
  assert.doesNotMatch(html, /onFilterOwnerToggle\('adik1'\)" checked>/);
});

test('_renderFilterBar(): dropdown Status disabled kalau filterOwnerIds kosong', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = [];
  const html = ctx.Aset._renderFilterBar(D.assets);
  const statusSelectMatch = html.match(/<select[^>]*onchange="Aset\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelectMatch);
  assert.match(statusSelectMatch[0], / disabled/);
});

test('_renderFilterBar(): dropdown Status TIDAK disabled kalau >=1 owner terpilih, opsi terpilih sesuai state', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1'];
  ctx.Aset.filterSettlement = 'milik';
  const html = ctx.Aset._renderFilterBar(D.assets);
  const statusSelectMatch = html.match(/<select[^>]*onchange="Aset\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelectMatch);
  assert.doesNotMatch(statusSelectMatch[0], / disabled/);
  assert.match(html, /<option value="milik" selected>/);
});

test('_renderFilterBar(): owner yg sama muncul di 2 aset berbeda -> badge count "(2 aset)", bukan dijumlah per baris owner', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Aset 1', owners: [{ ownerId: 'SELF', porsi: 50, isSelf: true }, { ownerId: 'sama1', porsi: 50, ownerName: 'Sama' }] },
      { id: 'a2', name: 'Aset 2', owners: [{ ownerId: 'SELF', porsi: 50, isSelf: true }, { ownerId: 'sama1', porsi: 50, ownerName: 'Sama' }] },
    ],
  };
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /Sama.*\(2 aset\)/);
});

test('_renderFilterBar(): <=5 owner non-SELF -> tombol Pilih Semua/Bersihkan TIDAK dirender', () => {
  const D = seedBanyakOwner(5);
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.doesNotMatch(html, /Pilih Semua/);
  assert.doesNotMatch(html, /Bersihkan/);
});

test('_renderFilterBar(): >5 owner non-SELF -> tombol Pilih Semua & Bersihkan dirender', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /Aset\.onFilterOwnerSelectAll\(\)/);
  assert.match(html, /Aset\.onFilterOwnerClearAll\(\)/);
  assert.match(html, />Pilih Semua</);
  assert.match(html, />Bersihkan</);
});

// --- _assetMatchesFilter() ----------------------------------------------

test('_assetMatchesFilter(): filterOwnerIds kosong -> semua aset lolos', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = [];
  D.assets.forEach((a) => assert.equal(ctx.Aset._assetMatchesFilter(a), true));
});

test('_assetMatchesFilter(): owner terpilih tidak ada di aset -> false', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1'];
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), false); // as2 ownernya adik1
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[2]), false); // as3 0 owner non-SELF
});

test('_assetMatchesFilter(): 2 owner dipilih sekaligus (semantik OR) -> aset dgn SALAH SATU owner lolos', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1', 'adik1'];
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), true); // as1 owner istri1
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), true); // as2 owner adik1
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[2]), false); // as3 0 owner non-SELF
});

test('_assetMatchesFilter(): owner terpilih ada, 0 filterSettlement -> lolos apapun statusnya', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1'];
  ctx.Aset.filterSettlement = '';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), true);
});

test('_assetMatchesFilter(): filterSettlement diisi -> harus cocok Aset.getOwnerSettlement() (default "titipan")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['adik1'];
  ctx.Aset.filterSettlement = 'titipan';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), true); // default titipan, belum di-set
  ctx.Aset.filterSettlement = 'milik';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), false);
});

test('_assetMatchesFilter(): owner sudah di-set "milik" -> cocok filterSettlement "milik", tidak cocok "titipan"', () => {
  const D = baseD();
  D.assets[0].ownerSettlement = { istri1: 'milik' };
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1'];
  ctx.Aset.filterSettlement = 'milik';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), true);
  ctx.Aset.filterSettlement = 'titipan';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), false);
});

test('_assetMatchesFilter(): owners korup (getOwners() throw) -> false, tidak melempar', () => {
  const D = baseD();
  D.assets[0].owners = 'bukan-array-valid';
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerIds = ['istri1'];
  assert.doesNotThrow(() => assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), false));
});

// --- onFilterOwnerToggle() / onFilterSettlementChange() -----------------

test('onFilterOwnerToggle(id) pertama kali -> id masuk filterOwnerIds & panggil Aset.renderList()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = 0;
  ctx.Aset.renderList = () => { calls += 1; };
  ctx.Aset.onFilterOwnerToggle('istri1');
  assert.equal(ctx.Aset.filterOwnerIds.length, 1);
  assert.equal(ctx.Aset.filterOwnerIds[0], 'istri1');
  assert.equal(calls, 1);
});

test('onFilterOwnerToggle(id) yang sama 2x -> toggle off (dilepas dari array)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset.onFilterOwnerToggle('istri1');
  ctx.Aset.onFilterOwnerToggle('istri1');
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
});

test('onFilterOwnerToggle(): centang 2 owner -> filterOwnerIds berisi keduanya', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset.onFilterOwnerToggle('istri1');
  ctx.Aset.onFilterOwnerToggle('adik1');
  assert.equal(ctx.Aset.filterOwnerIds.length, 2);
  assert.equal(ctx.Aset.filterOwnerIds.indexOf('istri1') !== -1, true);
  assert.equal(ctx.Aset.filterOwnerIds.indexOf('adik1') !== -1, true);
});

test('onFilterOwnerToggle(): semua owner dilepas centang -> filterSettlement otomatis reset', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset.onFilterOwnerToggle('istri1');
  ctx.Aset.onFilterSettlementChange('milik');
  ctx.Aset.onFilterOwnerToggle('istri1'); // lepas centang terakhir
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

test('onFilterOwnerToggle("") / (undefined) tidak melempar & tidak mengubah state (guard id kosong)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset.onFilterOwnerToggle('istri1');
  assert.doesNotThrow(() => ctx.Aset.onFilterOwnerToggle(''));
  assert.doesNotThrow(() => ctx.Aset.onFilterOwnerToggle(undefined));
  assert.equal(ctx.Aset.filterOwnerIds.length, 1);
  assert.equal(ctx.Aset.filterOwnerIds[0], 'istri1');
});

test('onFilterSettlementChange(): hanya menerima "milik"/"titipan", nilai lain dinormalisasi ke ""', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = 0;
  ctx.Aset.renderList = () => { calls += 1; };
  ctx.Aset.onFilterSettlementChange('milik');
  assert.equal(ctx.Aset.filterSettlement, 'milik');
  ctx.Aset.onFilterSettlementChange('bukan-nilai-valid');
  assert.equal(ctx.Aset.filterSettlement, '');
  assert.equal(calls, 2);
});

// --- onFilterOwnerSelectAll() / onFilterOwnerClearAll() -----------------

test('onFilterOwnerSelectAll() -> filterOwnerIds terisi SEMUA owner non-SELF di D.assets & panggil Aset.renderList()', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  let calls = 0;
  ctx.Aset.renderList = () => { calls += 1; };
  ctx.Aset.onFilterOwnerSelectAll();
  assert.equal(ctx.Aset.filterOwnerIds.length, 6);
  for (let i = 1; i <= 6; i += 1) assert.equal(ctx.Aset.filterOwnerIds.indexOf('owner' + i) !== -1, true);
  assert.equal(calls, 1);
});

test('onFilterOwnerClearAll() setelah Select All -> filterOwnerIds & filterSettlement kosong lagi', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset.onFilterOwnerSelectAll();
  ctx.Aset.onFilterSettlementChange('milik');
  ctx.Aset.onFilterOwnerClearAll();
  assert.equal(ctx.Aset.filterOwnerIds.length, 0);
  assert.equal(ctx.Aset.filterSettlement, '');
});

test('onFilterOwnerSelectAll(): aset dgn owners korup (getOwners() throw) tidak menjatuhkan hasil, owner sehat lain tetap ke-include', () => {
  const D = seedBanyakOwner(6);
  D.assets.push({ id: 'aRusak', name: 'Aset Rusak', owners: 'bukan-array-valid' });
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  assert.doesNotThrow(() => ctx.Aset.onFilterOwnerSelectAll());
  assert.equal(ctx.Aset.filterOwnerIds.length, 6);
});

// --- wiring renderList() (source-check) ---------------------

test('wiring — renderList() membangun ownerFilterBar dari `list` (SEBELUM filter owner+status) & memfilter jadi `filteredList`', () => {
  const fs = require('fs');
  const path = require('path');
  const asetSrc = fs.readFileSync(path.join(__dirname, '..', 'modules/asset/aset.js'), 'utf8');
  assert.match(asetSrc, /const ownerFilterBar=Aset\._renderFilterBar\(list\);/);
  assert.match(asetSrc, /const filteredList=list\.filter\(Aset\._assetMatchesFilter\);/);
});

test('wiring — pesan kosong beda antara "belum ada aset tercatat" (list kosong) & "tidak ada aset cocok filter" (filteredList kosong)', () => {
  const fs = require('fs');
  const path = require('path');
  const asetSrc = fs.readFileSync(path.join(__dirname, '..', 'modules/asset/aset.js'), 'utf8');
  assert.match(asetSrc, /Belum ada aset tercatat/);
  assert.match(asetSrc, /Tidak ada aset yang cocok dengan filter ini/);
});
