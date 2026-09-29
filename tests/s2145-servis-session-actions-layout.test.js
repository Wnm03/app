'use strict';
// S2145: tombol Edit/Tambah/Hapus pada baris sesi servis harus sejajar (satu baris grid),
// bukan menumpuk vertikal. Penyebab lama: grid-template-areas ber-!important yang memberi
// tiap tombol baris sendiri. Tes ini mengunci sumber tunggal layout di blok "S2145".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

function rulesFor(selectorFragment) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) if (m[1].includes(selectorFragment)) out.push({ sel: m[1].trim(), body: m[2] });
  return out;
}

test('S2145: tidak ada grid-template ber-!important pada .servis-history-session-summary', () => {
  const bad = rulesFor('servis-history-session-summary')
    .filter(r => !r.sel.includes('>'))
    .filter(r => /grid-template-(columns|areas)[^;]*!important/.test(r.body));
  assert.deepEqual(bad.map(r => r.sel), []);
});

test('S2145: blok final menaruh edit/add/del pada SATU baris grid yang sama', () => {
  const idx = css.lastIndexOf('#servisList .servis-history-session-summary {');
  assert.ok(idx > css.indexOf('S2145'), 'blok final S2145 harus ada');
  const body = css.slice(idx, css.indexOf('}', idx));
  const areas = /grid-template-areas:([^;]+);/.exec(body)[1].match(/"[^"]+"/g).map(x => x.replace(/"/g, '').trim().split(/\s+/));
  assert.equal(areas.length, 2, 'dua baris: info+amount, lalu tombol');
  const row = areas[1];
  for (const a of ['edit', 'add', 'del']) assert.ok(row.includes(a), a + ' harus di baris tombol');
  assert.ok(areas[0].includes('info') && areas[0].includes('amount'));
  assert.equal(new Set(areas.map(r => r.length)).size, 1, 'jumlah kolom tiap baris harus sama');
});

test('S2145b: tombol aksi riwayat servis berukuran seragam 36x36', () => {
  const idx = css.lastIndexOf('S2145b');
  assert.ok(idx > 0, 'blok S2145b harus ada');
  const block = css.slice(idx);
  for (const sel of ['.servis-history-item > .servis-history-edit', '.servis-history-item > .servis-history-delete',
    '.servis-history-edit-session', '.servis-history-add-session'])
    assert.ok(block.includes(sel), sel + ' harus diseragamkan');
  assert.match(block, /width:\s*36px;\s*height:\s*36px/);
});
