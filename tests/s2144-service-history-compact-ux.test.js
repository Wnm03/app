'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'modules/vehicle/servis-b.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const s2144 = css.slice(css.indexOf('S2144 —'));

function loadServis() {
  const ctx = { D: { servisLogs: [] }, curVehicleId: 'v1', Servis: { _selectedHistoryIds: new Set(), _selectedHistoryVehicleId: null }, toast() {}, console };
  ctx.renders = 0;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  ctx.Servis.renderList = () => { ctx.renders++; };
  return { S: ctx.Servis, ctx };
}

test('S2144 select mode toggles on, then off and clears the selection', () => {
  const { S, ctx } = loadServis();
  S.toggleHistorySelectMode();
  assert.equal(S._historySelectMode, true);
  S._selectedHistoryIds.add('a');
  S.toggleHistorySelectMode();
  assert.equal(S._historySelectMode, false);
  assert.equal(S._selectedHistoryIds.size, 0);
  assert.equal(ctx.renders, 2);
});

test('S2144 month toggle opens and closes a month key and re-renders', () => {
  const { S, ctx } = loadServis();
  S.toggleHistoryMonth('2026-08');
  assert.ok(S._openMonths.has('2026-08'));
  S.toggleHistoryMonth('2026-08');
  assert.ok(!S._openMonths.has('2026-08'));
  assert.equal(ctx.renders, 2);
});

test('S2144 render: zero cost parts are hidden, non-zero ones kept', () => {
  assert.match(src, /const _costChips=/);
  assert.match(src, /filter\(x=>Number\(x\[1\]\)>0\)/);
  assert.match(src, /const costBreakdownInfo=_costTxt\?/);
  assert.doesNotMatch(src, /Jasa \$\{fmt\(_historyCost\.labor\|\|0\)\}/);
});

test('S2144 render: actions are icon-only but keep accessible names', () => {
  assert.match(src, /aria-label="Edit Checklist Sesi Servis"[^>]*>✏️<\/button>/);
  assert.match(src, /aria-label="Edit Sesi"[^>]*>✏️<\/button>/);
  assert.match(src, /aria-label="Tambah Komponen"[^>]*>➕<\/button>/);
  assert.doesNotMatch(src, />✏️ Edit Checklist<\/button>/);
});

test('S2144 render: audit toolbar is compact until select mode, list gets servis-select-mode class', () => {
  assert.match(src, /const selectMode=!!Servis\._historySelectMode\|\|selectedCount>0/);
  assert.match(src, /el\.classList\.toggle\('servis-select-mode',selectMode\)/);
  assert.match(src, /data-action="Servis\.toggleHistorySelectMode"[^>]*>☑️ Pilih<\/button>/);
  assert.match(src, /Pilih semua tampil/);
});

test('S2144 render: long lists are grouped by month, latest month open by default', () => {
  assert.match(src, /logs\.length<=8/);
  assert.match(src, /servis-history-month-head/);
  assert.match(src, /new Set\(months\.length\?\[months\[0\]\.key\]:\[\]\)/);
  assert.match(src, /const open=selectMode\|\|Servis\._openMonths\.has\(b\.key\)/);
});

test('S2144 render: reminder chip drops the component name when it equals the card title', () => {
  assert.match(src, /const _remSameName=/);
  assert.match(src, /\$\{_remSameName\?'':escapeHtml\(linkedCat\.name\)\+' · '\}/);
});

test('S2144 CSS: icon layout, select-mode column, wrapping chips, month header', () => {
  assert.match(s2144, /"select icon info amount amount"\s*"select icon info edit del"/);
  assert.match(s2144, /#servisList:not\(\.servis-select-mode\) \.servis-history-item > label \{ display: none; \}/);
  assert.match(s2144, /"icon info amount amount"\s*"icon info edit del"/);
  assert.match(s2144, /"icon info amount amount amount"\s*"icon info edit add del"/);
  assert.match(s2144, /\.servis-history-month-body\[hidden\]/);
  assert.match(s2144, /\.servis-history-month-head/);
  assert.match(s2144, /\.tx-amount\s*\{[^}]*max-width:\s*none/s);
});

test('S2144 release: cache/build versions stay in sync', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sec = fs.readFileSync(path.join(root, 'modules/shared/features-helpers-global-security.js'), 'utf8');
  assert.match(sw, /kw-cache-v2142/);
  assert.match(idx, /styles\.css\?v=2142/);
  assert.match(sec, /APP_BUILD_VERSION = '[^']*-2142'/);
});
