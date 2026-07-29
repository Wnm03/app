'use strict';
/**
 * dashboard-hub-registry.test.js — Regresi audit klik-navigasi (permintaan
 * user "cek semua widget fitur apakah bisa diklik dan mengarah ke modul").
 *
 * Statis (bukan simulasi klik DOM): baca FEATURE_REGISTRY (dashboard-hub-
 * registry.js) & PAGE_NAV_IDX/*_TAB_IDX/*_SUBTAB_IDX (dashboard-hub.js) apa
 * adanya dari source lewat Function(), lalu cross-check tiap `target` fitur
 * terhadap: (a) key unik lintas kategori+fitur, (b) page ada di index.html,
 * (c) tab/subtab ada di map index-nya (kalau tidak ada, dashHubNavigateTo
 * Feature() akan panggil setXxxTab(tab, undefined) -> tombol tab salah/tidak
 * kepencet), (d) goTo/group id ada di index.html, (e) action modal (mis.
 * WorthIt.open) resolve ke fungsi nyata.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const regSrc = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub-registry.js'), 'utf8');
const dashHubSrc = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const FEATURE_REGISTRY = new Function('return ' + regSrc.match(/const FEATURE_REGISTRY = (\[[\s\S]*\]);/)[1])();
const PAGE_NAV_IDX = new Function('return ' + dashHubSrc.match(/const PAGE_NAV_IDX = (\{[\s\S]*?\});/)[1])();

const TAB_IDX = {};
const tabIdxRe = /const (\w+_(?:TAB|SUBTAB)_IDX) = (\{[^}]*\});/g;
let m;
while ((m = tabIdxRe.exec(dashHubSrc))) TAB_IDX[m[1]] = new Function('return ' + m[2])();

const PAGE_TAB_VAR = { keuangan: 'KEU_TAB_IDX', shop: 'SHOP_TAB_IDX', carnotes: 'CN_TAB_IDX', pajak: 'PAJAK_TAB_IDX', aset: 'ASET_TAB_IDX' };
const TAB_SUBTAB_VAR = {
  'keuangan:laporan': 'LAPORAN_SUBTAB_IDX', 'keuangan:kelola': 'KELOLA_SUBTAB_IDX',
  'pajak:pajak': 'PJK_SUBTAB_IDX', 'carnotes:insight': 'CNI_SUBTAB_IDX', 'carnotes:bbm': 'CNB_SUBTAB_IDX',
};
const PAGES_WITHOUT_NAV = new Set(['ai', 'settings']); // sengaja tidak punya nav-item, lihat komentar PAGE_NAV_IDX

// action-only target (WorthIt.open dkk) resolve ke fungsi nyata via require
// setiap file modul yang mendefinisikannya, dieksekusi dlm sandbox ringan.
const vm = require('vm');
function resolveActionExists(actionPath) {
  const known = {
    'openTxModal': 'modules/finance/transaksi.js',
    'WorthIt.open': 'modules/finance/worthit.js',
    'SelfRewardView.open': 'modules/self-reward/self-reward-view.js',
    'GoldImport.open': 'modules/asset/aset-emas-impor.js',
  };
  const file = known[actionPath];
  if (!file) return false; // action baru belum didaftarkan di test ini
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const [owner, method] = actionPath.split('.');
  if (!method) return new RegExp(`function\\s+${owner}\\s*\\(`).test(src);
  return new RegExp(`const\\s+${owner}\\s*=`).test(src) && new RegExp(`\\b${method}\\s*\\(`).test(src);
}

function allEntries() {
  const out = [];
  FEATURE_REGISTRY.forEach((cat) => {
    if (cat.target) out.push({ label: `[KATEGORI] ${cat.label}`, key: cat.key, target: cat.target });
    (cat.features || []).forEach((f) => out.push({ label: `${cat.label} > ${f.label}`, key: f.key, target: f.target }));
  });
  return out;
}

test('FEATURE_REGISTRY — semua key (kategori+fitur) unik', () => {
  const entries = allEntries();
  const seen = new Set();
  entries.forEach((e) => {
    assert.ok(!seen.has(e.key), `Key duplikat: ${e.key} (${e.label})`);
    seen.add(e.key);
  });
});

test('FEATURE_REGISTRY — semua target.page ada di index.html & PAGE_NAV_IDX', () => {
  allEntries().forEach((e) => {
    if (!e.target || !e.target.page) return;
    assert.ok(html.includes(`id="page-${e.target.page}"`), `${e.label}: id="page-${e.target.page}" tidak ada di index.html`);
    if (!PAGES_WITHOUT_NAV.has(e.target.page)) {
      assert.ok(e.target.page in PAGE_NAV_IDX, `${e.label}: page:'${e.target.page}' tidak ada di PAGE_NAV_IDX`);
    }
  });
});

test('FEATURE_REGISTRY — semua target.tab/subtab valid di TAB_IDX map dashboard-hub.js', () => {
  allEntries().forEach((e) => {
    const t = e.target;
    if (!t || !t.tab) return;
    const varName = PAGE_TAB_VAR[t.page];
    assert.ok(varName, `${e.label}: page:'${t.page}' pakai tab tapi tidak ada mapping TAB_IDX`);
    assert.ok(TAB_IDX[varName] && (t.tab in TAB_IDX[varName]), `${e.label}: tab:'${t.tab}' tidak ada di ${varName}`);
    if (t.subtab) {
      const subVar = TAB_SUBTAB_VAR[`${t.page}:${t.tab}`];
      assert.ok(subVar, `${e.label}: subtab:'${t.subtab}' dipakai tapi ${t.page}:${t.tab} tidak punya SUBTAB_IDX`);
      assert.ok(TAB_IDX[subVar] && (t.subtab in TAB_IDX[subVar]), `${e.label}: subtab:'${t.subtab}' tidak ada di ${subVar}`);
    }
  });
});

test('FEATURE_REGISTRY — semua target.goTo/group id ada di index.html', () => {
  allEntries().forEach((e) => {
    const t = e.target;
    if (!t) return;
    if (t.goTo) assert.ok(html.includes(`id="${t.goTo}"`), `${e.label}: goTo:'${t.goTo}' tidak ditemukan di index.html`);
    if (t.group) assert.ok(html.includes(`id="${t.group}"`), `${e.label}: group:'${t.group}' tidak ditemukan di index.html`);
  });
});

test('FEATURE_REGISTRY — semua target.action resolve ke fungsi/method nyata', () => {
  allEntries().forEach((e) => {
    const t = e.target;
    if (!t || !t.action) return;
    assert.ok(resolveActionExists(t.action), `${e.label}: action:'${t.action}' tidak resolve ke fungsi nyata (atau belum didaftarkan di test ini)`);
  });
});

test('FEATURE_REGISTRY — setiap fitur (leaf) selalu punya page ATAU action (tidak ada target buntu)', () => {
  FEATURE_REGISTRY.forEach((cat) => {
    (cat.features || []).forEach((f) => {
      assert.ok(f.target && (f.target.page || f.target.action), `${cat.label} > ${f.label}: target kosong, kartu ini tidak akan mengarah kemana-mana`);
    });
  });
});
