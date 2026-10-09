'use strict';
// Regresi: sub-tab Insight AI / BBM dirender malas (S2263: renderCnTab hanya
// mengisi pane yang terlihat). Pengganti sub-tab HARUS memicu renderCnTab(),
// kalau tidak Fuel Intelligence / Analisis Lanjutan / Rekomendasi & Tren kosong.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'vehicle', 'vehicle-core.js'), 'utf8');

function bodyOf(name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} tidak ditemukan`);
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`${name}: kurung tidak seimbang`);
}

for (const fn of ['setCnInsightTab', 'setCnBbmTab']) {
  test(`S2550 ${fn} memicu renderCnTab() setelah ganti sub-tab`, () => {
    assert.match(bodyOf(fn), /renderCnTab\(\)/, `${fn} harus memanggil renderCnTab()`);
  });
}
