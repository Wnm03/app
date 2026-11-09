'use strict';
// Guard Fase 2A S2761: sprite ikon SVG tunggal menggantikan emoji di header + FAB; lantai 12px teks inline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Fase 2A: sprite SVG memuat simbol yang dipakai header/FAB/backup', () => {
  const h = read('index.html');
  for (const id of ['i-search', 'i-settings', 'i-backup', 'i-alert', 'i-plus']) {
    assert.ok(h.includes('<symbol id="' + id + '"'), 'symbol ' + id);
  }
});

test('Fase 2A: header & FAB memakai <use href> dan tidak lagi emoji; atribut a11y dipertahankan', () => {
  const h = read('index.html');
  const hdr = h.slice(h.indexOf('id="mainHeader"'), h.indexOf('<!-- NAV -->'));
  const head = hdr.slice(0, hdr.indexOf('</div>\n</div>') > 0 ? hdr.indexOf('</div>\n</div>') : 1500);
  assert.ok(!/🔎|⚙️|💾/.test(head.slice(0, 1500)), 'tidak ada emoji ikon di header');
  assert.match(h, /data-action="openGlobalSearch" aria-label="Buka pencarian"[^>]*><svg class="ico"/);
  assert.match(h, /id="backupBadge"[^>]*aria-label="Cadangkan data sekarang"><svg class="ico"/);
  assert.match(h, /id="selfTestNavBadge"/);
  assert.match(h, /<span class="nav-fab-icon" aria-hidden="true"><svg class="ico"[^>]*><use href="#i-plus"/);
});

test('Fase 2A: backup-restore.js memakai innerHTML + ikon (tidak menimpa dengan emoji textContent)', () => {
  const j = read('modules/shared/backup-restore.js');
  assert.ok(!/backupBadge'\)\.textContent=/.test(j));
  assert.ok(!/_backupBadgeEl\.textContent=/.test(j));
  assert.ok(!/btn\.textContent=done\.includes/.test(j));
  assert.ok(j.includes('#i-backup') && j.includes('#i-alert'));
});

test('Fase 2A: CSS ikon di tokens.css (tanpa !important) + lantai 12px inline di modern-ui-layer.css', () => {
  const t = read('tokens.css');
  assert.match(t, /\.ico\{/);
  assert.ok(!/!important/.test(t));
  const c = read('modern-ui-layer.css');
  const b = c.slice(c.indexOf('FASE 2A (S2761)'));
  assert.match(b, /\[style\*="font-size:11px"\]/);
  assert.match(b, /font-size:var\(--fs-xs\)!important/);
});

test('Fase 2A: parity index.html == app_production.html (selain penanda AUTO-GENERATED)', () => {
  const norm = (h) => h.replace(/<!-- AUTO-GENERATED[\s\S]*?-->/, '').replace(/<head>\s*/, '<head>');
  assert.equal(norm(read('index.html')), norm(read('app_production.html')));
});

test('Fase 2A: pwa-ui-layer.css tidak lagi menyuntik emoji 💾 lewat ::before pada #backupBadge', () => {
  const c = read('pwa-ui-layer.css');
  assert.ok(!c.includes("content:'💾'"));
  assert.match(c, /#backupBadge::before\{content:none\}/);
});
