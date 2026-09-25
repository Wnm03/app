'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const servis = fs.readFileSync(path.join(root, 'modules/vehicle/servis.js'), 'utf8');
const modals = fs.readFileSync(path.join(root, 'modules/shared/modals.js'), 'utf8');

function extractMethod(source, name) {
  const marker = `\n${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `method ${name} not found`);
  const brace = source.indexOf('{', start);
  assert.notEqual(brace, -1, `method ${name} body not found`);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

test('multi-kategori: modal menyediakan chip kategori + panel checklist multi-grup', () => {
  assert.match(modals, /id=\\"servisMasterCategoryChips\\"/);
  assert.match(modals, /id=\\"servisChecklistPanel\\"/);
  assert.match(modals, /id=\\"servisLegacyInputSelectors\\" class=\\"u-dnone\\"/);
});

test('multi-kategori: state sesi memakai array kategori, bukan satu group sebagai SoT UI', () => {
  assert.match(servis, /_serviceChecklistMasterCategoryIds:\[\],/);
  const sync = extractMethod(servis, 'syncServiceChecklist');
  assert.match(sync, /Array\.isArray\(Servis\._serviceChecklistMasterCategoryIds\)/);
  assert.match(sync, /Servis\.renderServiceMasterCategoryChips\(\);/);
});

test('multi-kategori: chip toggle memvalidasi kategori, mempertahankan urutan, dan menyelaraskan selector legacy', () => {
  const toggle = extractMethod(servis, 'toggleServiceChecklistMasterCategory');
  assert.match(toggle, /findGroupByMasterCategoryId\(id\)/);
  assert.match(toggle, /ids\.splice\(idx,1\)/);
  assert.match(toggle, /ids\.push\(id\)/);
  assert.match(toggle, /servisCategory/);
  assert.match(toggle, /Servis\.renderServiceChecklist\(\);/);
});

test('multi-kategori: renderer melakukan loop semua kategori aktif dan semua action valid', () => {
  const render = extractMethod(servis, 'renderServiceChecklist');
  assert.match(render, /ids\.map\(id=>ServisChecklist\.findGroupByMasterCategoryId\(id\)\)/);
  assert.match(render, /groups\.map\(found=>/);
  assert.match(render, /v==='bersih'\?'🧹 Bersih'/);
  assert.match(render, /v==='periksa'\?'🔍 Periksa'/);
  assert.match(render, /data-action="Servis\.setServiceChecklistAction"/);
});

test('multi-kategori: openModal memulihkan semua masterCategoryId dari record checklist saat edit', () => {
  assert.match(servis, /sessionRows\.flatMap\(r=>Array\.isArray\(r\.checklist\)/);
  assert.match(servis, /Servis\._serviceChecklistMasterCategoryIds=\[\.\.\.new Set\(/);
});
