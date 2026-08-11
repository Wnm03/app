'use strict';
// tests/dashboard-hub-dana-titipan-s512.test.js — Sesi 512 (Dashboard Hub
// entry untuk Dana Titipan, lanjutan audit S511 —
// "Dana Titipan Navigation & Entry Point"). Dana Titipan sebelumnya cuma
// bisa dijangkau lewat Keuangan > Laporan > Dana Titipan (sub-tab ke-4).
// Sesi ini MURNI menambah 1 entry FEATURE_REGISTRY (dashboard-hub-registry.js)
// — 0 file navigasi/presenter/API diubah, reuse penuh
// dashHubNavigateToFeature() & DanaTitipanPortfolioPresenter yang sudah ada
// (lihat AUDIT S511). Test ini HANYA menguji entry registry baru & bahwa
// entry tersebut resolve lewat mekanisme search existing — TIDAK menguji
// ulang dashHubNavigateToFeature()/setLaporanTab() (sudah dicover
// tests/s498-dana-titipan-tab-terpadu.test.js &
// tests/dashboard-hub-registry.test.js, sengaja tidak diduplikasi di sini).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

const regSrc = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub-registry.js'), 'utf8');
const dashHubSrc = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');

const FEATURE_REGISTRY = new Function('return ' + regSrc.match(/const FEATURE_REGISTRY = (\[[\s\S]*\]);/)[1])();
const LAPORAN_SUBTAB_IDX = new Function('return ' + dashHubSrc.match(/const LAPORAN_SUBTAB_IDX = (\{[\s\S]*?\});/)[1])();

function findEntry() {
  for (const cat of FEATURE_REGISTRY) {
    for (const f of (cat.features || [])) {
      if (f && f.key === 'keu-dana-titipan') return { cat, feature: f };
    }
  }
  return null;
}

test('1. [registry] entry "keu-dana-titipan" ada di FEATURE_REGISTRY', () => {
  const found = findEntry();
  assert.ok(found, 'entry key "keu-dana-titipan" harus ada di FEATURE_REGISTRY');
});

test('2. [registry] target entry persis {page:keuangan, tab:laporan, subtab:titipan, goTo:danaTitipanTabList}', () => {
  const { feature } = findEntry();
  assert.deepEqual(feature.target, {
    page: 'keuangan',
    tab: 'laporan',
    subtab: 'titipan',
    goTo: 'danaTitipanTabList',
  });
});

test('3. [registry] entry berada di kategori "keuangan"', () => {
  const { cat } = findEntry();
  assert.equal(cat.key, 'keuangan');
});

test('4. [registry] target.subtab "titipan" valid di LAPORAN_SUBTAB_IDX (dashboard-hub.js) — dispatcher existing sudah mendukung, tidak ada perubahan navigasi baru', () => {
  const { feature } = findEntry();
  assert.ok(feature.target.subtab in LAPORAN_SUBTAB_IDX, 'subtab harus terdaftar di LAPORAN_SUBTAB_IDX existing');
  assert.equal(LAPORAN_SUBTAB_IDX[feature.target.subtab], 3, 'index sub-tab titipan (ke-4) harus tetap 3, tidak berubah oleh sesi ini');
});

test('5. [search] query "Dana Titipan" menemukan entry lewat dashHubSearchFeatures() existing (0 wiring search baru)', () => {
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub-search.js']);
  const results = ctx.dashHubSearchFeatures('Dana Titipan', FEATURE_REGISTRY);
  assert.ok(results.some((r) => r.key === 'keu-dana-titipan'), 'pencarian "Dana Titipan" harus menemukan entry keu-dana-titipan');
});

test('6. [navigation identifiers unchanged] identifier existing "titipan" / "laporanTab-titipan" / "danaTitipanTabList" tidak berubah oleh sesi ini', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /data-action="setLaporanTab" data-args='\["titipan", "\$el"\]'/);
  assert.match(html, /<div id="laporanTab-titipan"/);
  assert.match(html, /id="danaTitipanTabList"/);
});

test('7. [no duplicate key] "keu-dana-titipan" hanya muncul sekali di seluruh FEATURE_REGISTRY', () => {
  let count = 0;
  FEATURE_REGISTRY.forEach((cat) => {
    (cat.features || []).forEach((f) => { if (f && f.key === 'keu-dana-titipan') count += 1; });
  });
  assert.equal(count, 1);
});
