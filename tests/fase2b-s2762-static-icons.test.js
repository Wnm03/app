'use strict';
// Guard Fase 2B S2762: emoji ikon (⚙️ 💾 🔍 🔎) pada text node markup statis diganti ikon sprite.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Fase 2B: tidak ada emoji ⚙️/💾/🔍/🔎 di text node (placeholder atribut dikecualikan)', () => {
  const noAttr = h.replace(/placeholder="[^"]*"/g, '');
  assert.ok(!/>\s*(⚙️|💾|🔍|🔎)(?= |<)/.test(noAttr));
});

test('Fase 2B: ikon sprite dipakai di tombol Atur dan judul Pengaturan', () => {
  assert.match(h, /<button class="card-setting-btn"[^>]*><svg class="ico"[^>]*><use href="#i-settings"\/><\/svg> Atur<\/button>/);
  assert.match(h, /<div class="page-title"><svg class="ico"[^>]*><use href="#i-settings"\/><\/svg> Pengaturan<\/div>/);
});
