'use strict';
// tests/s667-aset-owner-status-filter.test.js — Sesi 667 (sesi lanjutan
// eksplisit dari catatan "Belum dikerjakan" SESSION-NOTE-S666.md: "filter
// Owner+Status di daftar Buku Aset (Aset.renderList(), aset.js), pola sama
// investasi-list-view.js S662"). Fondasi query (Aset.getOwnerSettlement()/
// assetsByOwnerSettlement()) dari S665, wiring toggle modal dari S666 —
// sesi ini menyambungkan ke UI daftar Buku Aset (Aset.renderList(),
// aset.js): dropdown "Pemilik" + "Status" di atas daftar, murni state UI
// (Aset.filterOwnerId/filterSettlement, 0 tulis ke D), delegasi penuh ke
// MultiOwnerEngine.getOwners()/Aset.getOwnerSettlement() yang sudah ada (0
// rumus baru) — pola SAMA PERSIS InvestmentListUI (S662,
// investasi-list-view.js), cuma domain Aset.
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/aset.js. modules/asset/aset-owners.js (S665/S666) TIDAK
// disentuh — reuse penuh API yang sudah ada. tests/s639-aset-tabel-modern-
// list-padat.test.js (source-check renderList()) diupdate mengikuti
// pergantian nama variabel `list`->`filteredList`+`ownerFilterBar` (lihat
// SESSION-NOTE-S667.md), bukan file source kedua.
//
// Cakupan test ini:
//   1. _renderFilterBar(list) — '' kalau 0 aset punya owner non-SELF; kalau
//      ada, render dropdown Pemilik (dgn badge "(N aset)") + dropdown Status
//      (disabled kalau filterOwnerId kosong).
//   2. _assetMatchesFilter(a) — predicate murni: filterOwnerId kosong ->
//      lolos semua; owner harus match; filterSettlement (kalau diisi) harus
//      cocok Aset.getOwnerSettlement().
//   3. onFilterOwnerChange()/onFilterSettlementChange() — murni state UI +
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

// --- _renderFilterBar() ------------------------------------------------

test('_renderFilterBar(): balik "" kalau 0 aset punya owner non-SELF', () => {
  const D = { assets: [{ id: 'a1', name: 'Motor Sendiri', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }] };
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset._renderFilterBar(D.assets), '');
});

test('_renderFilterBar(): render dropdown Pemilik dgn badge "(N aset)" per owner non-SELF', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /Istri \(1 aset\)/);
  assert.match(html, /Adik \(1 aset\)/);
  assert.match(html, /👥 Semua Pemilik/);
});

test('_renderFilterBar(): dropdown Status disabled kalau filterOwnerId kosong', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = '';
  const html = ctx.Aset._renderFilterBar(D.assets);
  assert.match(html, /Aset\.onFilterSettlementChange\(this\.value\)">[^<]*<option value="">Semua Status/);
  // select Status ada atribut disabled
  const statusSelectMatch = html.match(/<select[^>]*onchange="Aset\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelectMatch);
  assert.match(statusSelectMatch[0], / disabled/);
});

test('_renderFilterBar(): dropdown Status TIDAK disabled kalau filterOwnerId terisi, opsi terpilih sesuai state', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = 'istri1';
  ctx.Aset.filterSettlement = 'milik';
  const html = ctx.Aset._renderFilterBar(D.assets);
  const statusSelectMatch = html.match(/<select[^>]*onchange="Aset\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelectMatch);
  assert.doesNotMatch(statusSelectMatch[0], / disabled/);
  assert.match(html, /<option value="milik" selected>/);
  assert.match(html, /<option value="istri1" selected>/);
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
  assert.match(html, /Sama \(2 aset\)/);
});

// --- _assetMatchesFilter() ----------------------------------------------

test('_assetMatchesFilter(): filterOwnerId kosong -> semua aset lolos', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = '';
  D.assets.forEach((a) => assert.equal(ctx.Aset._assetMatchesFilter(a), true));
});

test('_assetMatchesFilter(): owner terpilih tidak ada di aset -> false', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = 'istri1';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), false); // as2 ownernya adik1
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[2]), false); // as3 0 owner non-SELF
});

test('_assetMatchesFilter(): owner terpilih ada, 0 filterSettlement -> lolos apapun statusnya', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = 'istri1';
  ctx.Aset.filterSettlement = '';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), true);
});

test('_assetMatchesFilter(): filterSettlement diisi -> harus cocok Aset.getOwnerSettlement() (default "titipan")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = 'adik1';
  ctx.Aset.filterSettlement = 'titipan';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), true); // default titipan, belum di-set
  ctx.Aset.filterSettlement = 'milik';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[1]), false);
});

test('_assetMatchesFilter(): owner sudah di-set "milik" -> cocok filterSettlement "milik", tidak cocok "titipan"', () => {
  const D = baseD();
  D.assets[0].ownerSettlement = { istri1: 'milik' };
  const ctx = makeCtx(D);
  ctx.Aset.filterOwnerId = 'istri1';
  ctx.Aset.filterSettlement = 'milik';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), true);
  ctx.Aset.filterSettlement = 'titipan';
  assert.equal(ctx.Aset._assetMatchesFilter(D.assets[0]), false);
});

// --- onFilterOwnerChange() / onFilterSettlementChange() -----------------

test('onFilterOwnerChange(): set filterOwnerId & panggil Aset.renderList()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = 0;
  ctx.Aset.renderList = () => { calls += 1; };
  ctx.Aset.onFilterOwnerChange('istri1');
  assert.equal(ctx.Aset.filterOwnerId, 'istri1');
  assert.equal(calls, 1);
});

test('onFilterOwnerChange(""): balik ke Semua Pemilik JUGA mengosongkan filterSettlement', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset.filterOwnerId = 'istri1';
  ctx.Aset.filterSettlement = 'milik';
  ctx.Aset.onFilterOwnerChange('');
  assert.equal(ctx.Aset.filterOwnerId, '');
  assert.equal(ctx.Aset.filterSettlement, '');
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

// --- state awal & wiring renderList() (source-check) ---------------------

test('state awal: filterOwnerId/filterSettlement default ""', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset.filterOwnerId, '');
  assert.equal(ctx.Aset.filterSettlement, '');
});

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
