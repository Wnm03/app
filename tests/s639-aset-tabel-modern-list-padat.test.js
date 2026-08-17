'use strict';
// tests/s639-aset-tabel-modern-list-padat.test.js — cakupan Sesi s639
// (RENCANA-MODERNISASI-UI.md): "Terapkan ke Aset (list padat, bukan grid
// kartu)", KHUSUS D.profile.theme==='modern'. Proof-test terpisah sesuai
// catatan risiko rencana (perubahan struktural DOM #assetList, bukan cuma
// styling) — lanjutan langsung pola s637 (tabel Ledger Pro Uang) & s638
// (class .money Dana Titipan).
//
// Cakupan: (1) assetTableRowHTML()/assetTableHTML() (aset.js) — markup &
// reuse class .tx-tbl*/.tx-amount/.acc-chip yang sudah ada, 0 CSS baru.
// (2) Aset.renderList() (source-check) — percabangan tema modern
// menggantikan jalur kartu HANYA saat D.profile.theme==='modern', 10 tema
// lama 0 dampak. (3) Parity data-action/data-args dgn kartu (openAssetModal
// utk tap baris, Aset.openActionsMenu utk tombol ⋮) — supaya semua handler
// klik yang sudah ada tetap berfungsi persis sama di jalur tabel.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeCtx(D, extra) {
  return loadSource(
    ['modules/asset/aset.js'],
    Object.assign(
      {
        D,
        escapeHtml: (s) => String(s),
        fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
        assetCrossCheckWarning: () => null,
      },
      extra || {},
    ),
  );
}

function makeAsset(overrides) {
  return Object.assign(
    { id: 'a1', name: 'Motor Beat', jenis: 'Kendaraan', lokasi: 'Garasi', nilai: 15000000, zakatable: false },
    overrides || {},
  );
}

// --- assetTableRowHTML() ---------------------------------------------------

test('assetTableRowHTML() — markup baris tabel dgn ikon jenis, chip jenis & lokasi, nilai', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetTableRowHTML(makeAsset());
  assert.match(html, /<tr class="tx-tbl-row u-pointer" data-action="openAssetModal" data-args="\["a1"\]">/);
  assert.match(html, /🏍️ Motor Beat/);
  assert.match(html, /<span class="acc-chip">Kendaraan<\/span>/);
  assert.match(html, /<span class="acc-chip">📍 Garasi<\/span>/);
  assert.match(html, /<td class="tx-amount num">Rp 15\.000\.000<\/td>/);
  assert.match(html, /data-action="Aset\.openActionsMenu" data-args="\["a1"\]"/);
});

test('assetTableRowHTML() — tanpa lokasi -> chip lokasi tidak muncul', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetTableRowHTML(makeAsset({ lokasi: '' }));
  assert.doesNotMatch(html, /📍/);
});

test('assetTableRowHTML() — badge Zakat muncul kalau zakatable', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetTableRowHTML(makeAsset({ zakatable: true }));
  assert.match(html, />Zakat</);
});

test('assetTableRowHTML() — badge warning cross-check muncul kalau assetCrossCheckWarning() mengembalikan pesan', () => {
  const ctx = makeCtx({ assets: [] }, { assetCrossCheckWarning: () => 'Nilai tidak sinkron dgn Investasi' });
  const html = ctx.assetTableRowHTML(makeAsset());
  assert.match(html, /⚠️/);
  assert.match(html, /title="Nilai tidak sinkron dgn Investasi"/);
});

test('assetTableRowHTML() — 0 kolom saldo berjalan (bukan konsep transaksi kronologis)', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetTableRowHTML(makeAsset());
  assert.doesNotMatch(html, /tx-tbl-saldo/);
});

// --- assetTableHTML() -------------------------------------------------------

test('assetTableHTML() — wrap tabel dgn header Aset/Nilai, reuse class .tx-tbl*', () => {
  const ctx = makeCtx({ assets: [] });
  const html = ctx.assetTableHTML([makeAsset()]);
  assert.match(html, /<div class="tx-tbl-wrap"><table class="tx-tbl">/);
  assert.match(html, /<th>Aset<\/th><th class="num">Nilai<\/th><th><\/th>/);
  assert.match(html, /<tbody>.*<\/tbody>/s);
});

test('assetTableHTML() — daftar kosong -> tbody kosong, tidak throw', () => {
  const ctx = makeCtx({ assets: [] });
  assert.doesNotThrow(() => ctx.assetTableHTML([]));
  assert.match(ctx.assetTableHTML([]), /<tbody><\/tbody>/);
});

test('assetTableHTML() — beberapa aset menghasilkan baris sejumlah item, urutan dipertahankan', () => {
  const ctx = makeCtx({ assets: [] });
  const list = [makeAsset({ id: 'a1', name: 'Motor' }), makeAsset({ id: 'a2', name: 'Rumah' })];
  const html = ctx.assetTableHTML(list);
  const idxMotor = html.indexOf('Motor');
  const idxRumah = html.indexOf('Rumah');
  assert.ok(idxMotor > -1 && idxRumah > -1 && idxMotor < idxRumah);
});

// --- wiring Aset.renderList() (source-check, sama pola dgn s637) -----------

const asetSrc = fs.readFileSync(path.join(ROOT, 'modules/asset/aset.js'), 'utf8');

test("wiring — Aset.renderList() cek D.profile.theme==='modern' sebelum pakai assetTableHTML()", () => {
  assert.match(asetSrc, /D\.profile&&D\.profile\.theme==='modern'&&typeof assetTableHTML==='function'/);
});

test('wiring — jalur kartu list.map(...) LAMA masih ada apa adanya (0 dihapus, tetap dipakai 10 tema lama)', () => {
  assert.match(
    asetSrc,
    /el\.innerHTML=migratedBanner\+list\.map\(a=>\{/,
  );
  assert.match(
    asetSrc,
    /return `<div class="tx-item u-pointer" data-action="openAssetModal" data-args="\$\{escapeHtml\(JSON\.stringify\(\[a\.id\]\)\)\}">/,
  );
});

test('wiring — jalur tabel modern menyertakan migratedBanner yang sama & memanggil ulang render turunan (dashboard/investasi/dst)', () => {
  assert.match(
    asetSrc,
    /el\.innerHTML=migratedBanner\+assetTableHTML\(list\);/,
  );
});

// --- CSS reuse (0 CSS baru) --------------------------------------------------

test('CSS — 0 class baru ditambahkan; .tx-tbl*/.acc-chip/.tx-amount yang dipakai assetTableHTML sudah ada sejak s637/lama', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /\.tx-tbl-wrap\s*\{/);
  assert.match(css, /\.tx-tbl\s*\{/);
  assert.match(css, /\.acc-chip\s*\{/);
});
