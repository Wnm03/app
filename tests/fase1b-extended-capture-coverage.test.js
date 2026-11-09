'use strict';
// Static guard: the extended capture runner must cover the documented missing UI states.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const runner = fs.readFileSync(path.join(__dirname, '..', 'tools', 'capture-fase1b-extended.py'), 'utf8');

test('Fase 1B capture: all seven Finance tabs are represented in source and runner', () => {
  for (const tab of ['kelola', 'tagihan', 'budget', 'utangpiutang', 'asetproyek', 'laporan', 'akun']) {
    assert.match(html, new RegExp(`data-action="setKeuanganTab"[^>]*data-args='\\["${tab}"`), tab);
    assert.ok(runner.includes(`('${tab}'`), `runner missing Finance tab ${tab}`);
  }
});

test('Fase 1B capture: all eight Shop tabs are represented in source and runner', () => {
  for (const tab of ['kasir', 'jual', 'etalase', 'produsen', 'riwayat', 'pelanggan', 'laporan', 'bi']) {
    assert.ok(html.includes(`data-args='["${tab}", "$el"]'`), `HTML missing Shop tab ${tab}`);
    assert.ok(runner.includes(`('${tab}'`), `runner missing Shop tab ${tab}`);
  }
});

test('Fase 1B capture: report subtabs, transaction modal, viewport and evidence log are covered', () => {
  for (const tab of ['ringkasan', 'aruskas', 'transaksi', 'titipan']) assert.ok(runner.includes(`('${tab}'`));
  assert.match(runner, /openTxModal/);
  for (const vp of [390, 768, 1440]) assert.ok(runner.includes(String(vp)));
  assert.match(runner, /capture-report\.json/);
});
