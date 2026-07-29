'use strict';
/**
 * dash-card-show-hide.test.js — Regresi bugfix "kartu Beranda (Kebebasan
 * Finansial/Dana Pensiun/Absensi Harian/Refleksi & Self-Care) tidak muncul
 * lagi setelah dimatikan lalu dinyalakan ulang lewat Pengaturan -> Tampilan
 * -> Kartu di Beranda".
 *
 * Root cause (lihat komentar showDashCardEl() di modules/shared/modules-render.js):
 * hideDashCardEl(elId) menyembunyikan elemen lewat DUA jalur -- classList
 * 'u-dnone' DAN inline style.display='none'. toggleDashCardPref(key,true)/
 * setAllDashCardPrefs(true) sudah benar memanggil save()+renderDashboard()
 * ulang, dan loop DASH_RENDER_ORDER di renderDashboard() sudah benar SKIP
 * hideDashCardEl() begitu isDashCardOn() balik jadi true -- tapi sebelum
 * fix ini TIDAK ADA fungsi kebalikan yang pernah melepas inline
 * style.display='none' yang sudah kadung ditulis. Inline style attribute
 * punya spesifisitas lebih tinggi dari class CSS (.u-dnone{display:none},
 * lihat styles.css), jadi elemen tetap invisible selamanya walau
 * D.dashCardPrefs & checkbox Pengaturan sudah benar menunjukkan "aktif".
 *
 * Test ini load fungsi ASLI (bukan copy-paste logic) langsung dari
 * modules/shared/modules-render.js lewat brace-counting manual (pola sama
 * tests/helpers/loadSource.js#extractFunction, ditulis ulang di sini supaya
 * bisa suntik `document` tiruan ke SATU vm context yang sama dipakai kedua
 * fungsi -- extractFunction() bawaan bikin context baru tiap panggil tanpa
 * cara menyuntik `document`, tidak cocok utk fungsi yang baca DOM).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'),
  'utf8'
);

function extractFnSource(fnName) {
  const marker = `function ${fnName}(`;
  const start = SRC.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') depth--;
    i++;
  }
  return SRC.slice(start, i);
}

function makeEl(id) {
  const el = {
    id,
    _classes: new Set(),
    style: { display: '' },
    classList: {
      add(...c) { c.forEach((x) => el._classes.add(x)); },
      remove(...c) { c.forEach((x) => el._classes.delete(x)); },
      contains(c) { return el._classes.has(c); },
    },
  };
  return el;
}

function loadSandbox() {
  const byId = Object.create(null);
  const context = {
    console,
    document: { getElementById: (id) => byId[id] || null },
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('hideDashCardEl')}
${extractFnSource('showDashCardEl')}
this.hideDashCardEl = hideDashCardEl;
this.showDashCardEl = showDashCardEl;`;
  vm.runInContext(snippet, context, { filename: 'dash-card-show-hide-extract.js' });
  return { context, byId };
}

test('hideDashCardEl(): menambah class u-dnone DAN inline style.display="none"', () => {
  const { context, byId } = loadSandbox();
  const el = makeEl('dashFiCard');
  byId[el.id] = el;
  context.hideDashCardEl('dashFiCard');
  assert.equal(el.classList.contains('u-dnone'), true);
  assert.equal(el.style.display, 'none');
});

test('hideDashCardEl(): id tidak ada di DOM -> tidak throw', () => {
  const { context } = loadSandbox();
  assert.doesNotThrow(() => context.hideDashCardEl('id-tidak-ada'));
});

test('showDashCardEl(): kebalikan simetris hideDashCardEl() -- melepas class u-dnone DAN inline style.display (bug utama: sebelumnya inline style TIDAK PERNAH dilepas)', () => {
  const { context, byId } = loadSandbox();
  const el = makeEl('refleksiCard');
  byId[el.id] = el;

  context.hideDashCardEl('refleksiCard');
  assert.equal(el.classList.contains('u-dnone'), true);
  assert.equal(el.style.display, 'none');

  context.showDashCardEl('refleksiCard');
  assert.equal(el.classList.contains('u-dnone'), false, 'class u-dnone harus lepas');
  assert.equal(el.style.display, '', 'inline style.display harus dikosongkan, bukan cuma class yang lepas (root cause bug)');
});

test('showDashCardEl(): dipanggil di elemen yang tidak pernah disembunyikan (default state, card selalu ON) -> aman/idempotent, tidak mengubah apa pun', () => {
  const { context, byId } = loadSandbox();
  const el = makeEl('dashAbsensiCard');
  byId[el.id] = el;
  context.showDashCardEl('dashAbsensiCard');
  assert.equal(el.classList.contains('u-dnone'), false);
  assert.equal(el.style.display, '');
});

test('showDashCardEl(): id tidak ada di DOM -> tidak throw', () => {
  const { context } = loadSandbox();
  assert.doesNotThrow(() => context.showDashCardEl('id-tidak-ada'));
});

test('showDashCardEl(): dipanggil 2x berturut-turut (idempotent, mis. renderDashboard() dipanggil berkali-kali saat card aktif)', () => {
  const { context, byId } = loadSandbox();
  const el = makeEl('dashFiCard');
  byId[el.id] = el;
  context.hideDashCardEl('dashFiCard');
  context.showDashCardEl('dashFiCard');
  context.showDashCardEl('dashFiCard');
  assert.equal(el.classList.contains('u-dnone'), false);
  assert.equal(el.style.display, '');
});

test('renderDashboard() loop (modules-render.js): showDashCardEl(cardDef.elId) dipanggil SETELAH guard isDashCardOn() dan SEBELUM cardDef.render() -- reuse loop asli lewat DASH_RENDER_ORDER/DASH_CARD_BY_KEY', () => {
  // Regresi tingkat-integrasi: pastikan patch di loop renderDashboard()
  // (`showDashCardEl(cardDef.elId)` ditambah SEBELUM `cardDef.render(...)`)
  // benar-benar ada di source, bukan cuma fungsi showDashCardEl() berdiri
  // sendiri tanpa pernah dipanggil dari alur render nyata.
  const loopStart = SRC.indexOf('for(const key of dashCardRenderOrder)');
  const loopSection = SRC.slice(loopStart, loopStart + 400);
  assert.match(loopSection, /if\(!isDashCardOn\(key\)\)\{hideDashCardEl\(cardDef\.elId\);continue;\}/);
  assert.match(loopSection, /showDashCardEl\(cardDef\.elId\);/);
  const idxGuard = loopSection.indexOf('if(!isDashCardOn(key))');
  const idxShow = loopSection.indexOf('showDashCardEl(cardDef.elId);');
  const idxRender = loopSection.indexOf('cardDef.render(');
  assert.ok(idxGuard < idxShow && idxShow < idxRender, 'urutan harus: guard isDashCardOn -> showDashCardEl -> cardDef.render');
});
