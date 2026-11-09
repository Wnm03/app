'use strict';
// Fase 3D (S2772) — Keuangan maks. 2 baris tab: chip periode Transaksi & Laporan jadi dropdown di dalam konten.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function extractFold() {
  const src = read('modules/shared/pwa-ux-performance.js');
  const a = src.indexOf('// S2772 (Fase 3D');
  const b = src.indexOf('// S2765 (Fase 3C, Rencana §A#8)');
  assert.ok(a > 0 && b > a, 'blok S2772 harus ada sebelum blok pencarian 3C');
  return src.slice(a, b);
}

// DOM palsu minimal: cukup untuk createElement/appendChild/insertBefore/addEventListener/classList.
function fakeEl(tag) {
  const el = {
    tagName: tag, children: [], attrs: {}, listeners: {}, value: '', textContent: '', parentNode: null, id: '', className: '',
    _cls: new Set(),
    classList: { add(c) { el._cls.add(c); }, contains(c) { return el._cls.has(c); }, remove(c) { el._cls.delete(c); } },
    setAttribute(k, v) { el.attrs[k] = v; },
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    insertBefore(c, ref) { c.parentNode = el; el.children.splice(el.children.indexOf(ref), 0, c); return c; },
    addEventListener(t, f) { el.listeners[t] = f; },
    querySelectorAll() { return el.children.filter((c) => c.tagName === 'button'); },
    click() { el.clicked = (el.clicked || 0) + 1; },
  };
  return el;
}
function setup(ids) {
  const reg = {};
  const parent = fakeEl('div');
  ids.forEach((id) => {
    const chips = fakeEl('div'); chips.id = id; parent.appendChild(chips); reg[id] = chips;
    ['Hari Ini', 'Bulan Ini', 'Custom'].forEach((t, i) => { const b = fakeEl('button'); b.textContent = t; if (i === 1) b.classList.add('active'); chips.appendChild(b); });
  });
  const document = { createElement: fakeEl };
  const ctx = vm.createContext({ byId: (id) => reg[id] || (parent.children.find((c) => c.id === id) || null), document, MutationObserver: undefined });
  vm.runInContext(extractFold(), ctx);
  return { reg, parent, ctx };
}

test('S2772: dropdown dibuat di depan chip, chip dilipat tapi tetap ada di DOM', () => {
  const { reg, parent } = setup(['txListPeriodeChips', 'periodeChips']);
  const sels = parent.children.filter((c) => c.tagName === 'select');
  assert.equal(sels.length, 2);
  assert.deepEqual(sels.map((s) => s.id).sort(), ['laporanPeriodeSelect', 'txListPeriodeSelect']);
  assert.ok(reg.txListPeriodeChips.classList.contains('kw-chips-folded'));
  assert.ok(parent.children.indexOf(sels.find((s) => s.id === 'txListPeriodeSelect')) < parent.children.indexOf(reg.txListPeriodeChips));
  assert.equal(reg.periodeChips.children.length, 3, 'chip asli tidak dihapus');
});

test('S2772: nilai awal mengikuti chip aktif; perubahan dropdown meneruskan klik ke chip asli', () => {
  const { reg, parent } = setup(['periodeChips']);
  const sel = parent.children.find((c) => c.tagName === 'select');
  assert.equal(sel.value, '1');
  sel.value = '2'; sel.listeners.change();
  assert.equal(reg.periodeChips.children[2].clicked, 1);
  assert.equal(reg.periodeChips.children[0].clicked, undefined);
});

test('S2772: idempoten (panggilan kedua tidak menggandakan dropdown) dan aman tanpa chip', () => {
  const { parent, ctx } = setup(['periodeChips']);
  vm.runInContext(extractFold(), ctx);
  assert.equal(parent.children.filter((c) => c.tagName === 'select').length, 1);
  assert.doesNotThrow(() => setup([]));
});

test('S2772: markup chip, data-action, dan handler periode tidak berubah', () => {
  const html = read('index.html');
  assert.match(html, /id="txListPeriodeChips"/);
  assert.match(html, /id="periodeChips"/);
  assert.match(html, /data-action="setTxListPeriode"/);
  assert.match(html, /data-action="setPeriode"/);
  assert.match(read('modules/shared/action-wrappers.js'), /#periodeChips \.chip-btn/);
});

test('S2772: CSS Fase 3D tanpa !important; bundle hasil build memuat perubahan', () => {
  const css = read('tokens.css');
  const blk = css.slice(css.indexOf('FASE 3D (S2772)'));
  assert.match(blk, /\.kw-chips-folded\{display:none\}/);
  assert.match(blk, /\.kw-periode-select\{[^}]*min-height:44px/);
  assert.doesNotMatch(blk, /!important/);
  assert.ok(['app-bundle-a.min.js', 'app-bundle-b.min.js'].some((f) => read(f).includes('laporanPeriodeSelect')), 'laporanPeriodeSelect tidak ada di bundle');
});
