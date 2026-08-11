'use strict';
// tests/modal-reduced-motion-visibility.test.js — regresi utk bug audit
// "modal tidak muncul" (vehicleModal & modal .overlay lain) saat OS/browser
// mengaktifkan prefers-reduced-motion: reduce.
//
// Root cause (temuan audit): aturan global di styles.css
//   @media (prefers-reduced-motion: reduce) {
//     *, *::before, *::after { animation-duration: .01ms !important; ... }
//   }
// memangkas DURASI animasi overlayIn jadi nyaris nol, TAPI animasi
// (keyframe opacity 0 -> 1) TETAP JALAN dalam jendela ~0.01ms itu. openModal()
// sendiri sudah benar (class 'open' ditambahkan, display:flex, z-index
// normal) — tapi computed opacity yang kebaca browser bisa masih 0 (keyframe
// "from") kalau terbaca tepat di window super-singkat itu, sebelum animasi
// selesai. Akibatnya modal "berhasil dibuka" secara JS tapi computed-invisible
// (opacity:0) bagi user dengan reduced-motion aktif.
//
// Fix (CSS-only, lihat styles.css): khusus utk .overlay.open / .calc-overlay.open
// / .qs-modal-overlay.open, matikan animasinya SAMA SEKALI (animation: none
// !important) & pertahankan opacity: 1 !important saat reduced-motion aktif —
// tidak ada lagi keyframe yang bisa "ketangkep" di tengah jalan.
//
// Test ini TIDAK menyalin ulang logic CSS/JS secara manual:
//   1. openModal() ASLI (modules/shared/modal-navigasi.js) dijalankan lewat
//      harness vm loadSource() yang sudah dipakai test lain di suite ini —
//      business logic modal engine 100% tidak disentuh/dimodifikasi.
//   2. styles.css ASLI dibaca dari disk & di-resolve lewat mini cascade
//      resolver (bukan full CSS engine — proyek ini tidak punya dependency
//      jsdom/browser — tapi cukup utk menghormati !important & source order
//      utk 2 rule yang relevan: base `.overlay.open` & override-nya di dalam
//      @media (prefers-reduced-motion: reduce)), supaya reintroduce bug (mis.
//      override dihapus, atau !important-nya dicabut) bikin test ini gagal.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');
// Comment CSS dibuang duluan (bisa berisi koma/kata bebas yg mengacaukan
// pemisahan selector kalau ikut ke-parse sbg bagian dari rule berikutnya).
const CSS_SRC = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// ---------------------------------------------------------------------
// Bagian 1: mini CSS extractor/resolver (khusus kebutuhan test ini, bukan
// full CSS parser).
// ---------------------------------------------------------------------

/** Cari isi @media (prefers-reduced-motion: reduce) { ... } via brace counting
 * (aman thd nested rule di dalamnya), & kembalikan juga sisa CSS di luar blok
 * itu supaya rule dasar (non-media) bisa dicari terpisah. */
function splitReducedMotionBlock(css) {
  const mediaStart = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(mediaStart !== -1, 'styles.css harus punya blok @media (prefers-reduced-motion: reduce)');
  const braceOpen = css.indexOf('{', mediaStart);
  let depth = 0;
  let mediaEnd = -1;
  for (let i = braceOpen; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) { mediaEnd = i; break; }
    }
  }
  assert.ok(mediaEnd !== -1, 'blok @media (prefers-reduced-motion: reduce) tidak ketutup dengan benar (brace mismatch)');
  return {
    mediaBody: css.slice(braceOpen + 1, mediaEnd),
    outsideMedia: css.slice(0, mediaStart) + '\n' + css.slice(mediaEnd + 1),
  };
}

/** Cari declaration block PERTAMA yang selector-nya (dipisah koma) persis
 * `selectorText` (mis. ".overlay.open"), dalam satu chunk CSS flat (tanpa
 * nested @media di dalamnya). */
function findDeclsForSelector(cssChunk, selectorText) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cssChunk))) {
    const selectors = m[1].split(',').map((s) => s.trim());
    if (selectors.includes(selectorText)) return m[2];
  }
  return null;
}

function parseDecls(declStr) {
  const out = {};
  declStr.split(';').forEach((part) => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const prop = part.slice(0, idx).trim();
    let value = part.slice(idx + 1).trim();
    const important = /!important/i.test(value);
    value = value.replace(/!important/i, '').trim();
    if (prop) out[prop] = { value, important };
  });
  return out;
}

/** Ambil nama animasi dari shorthand `animation` (mis.
 * "overlayIn var(--dur-moderate) var(--ease-standard)" -> "overlayIn",
 * "none" -> "none"). */
function animationNameOf(shorthandValue) {
  const first = shorthandValue.trim().split(/\s+/)[0];
  return first || 'none';
}

/** Resolve nilai akhir 1 properti dari sepasang rule (base di luar media,
 * override di dalam media reduced-motion jika reducedMotionActive), dengan
 * urutan prioritas CSS yang benar: !important menang mutlak atas non-important
 * (spesifisitas/source order cuma dipakai kalau importance-nya sama). Base &
 * override di sini sengaja punya selector persis sama (`.overlay.open` dkk),
 * jadi spesifisitas sama -> importance-lah yang memutuskan. */
function resolveProp(baseDecls, overrideDecls, prop, reducedMotionActive) {
  const base = baseDecls[prop];
  const override = reducedMotionActive ? overrideDecls[prop] : undefined;
  if (!override) return base;
  if (!base) return override;
  if (override.important && !base.important) return override;
  if (base.important && !override.important) return base;
  // Importance sama -> source order menang; override (dari media block)
  // dalam kasus nyata proyek ini ditulis LEBIH AWAL di file drpd base rule,
  // jadi kalau importance-nya sama, base (belakangan) yang menang -- itulah
  // justru sebabnya fix ini WAJIB pakai !important (lihat komentar di
  // styles.css).
  return base;
}

function resolveOverlayOpenStyle(selectorText, reducedMotionActive) {
  const { mediaBody, outsideMedia } = splitReducedMotionBlock(CSS_SRC);
  const baseDeclStr = findDeclsForSelector(outsideMedia, selectorText);
  assert.ok(baseDeclStr, `rule dasar "${selectorText}" harus ada di styles.css (di luar media reduced-motion)`);
  const baseDecls = parseDecls(baseDeclStr);

  const overrideDeclStr = findDeclsForSelector(mediaBody, selectorText);
  const overrideDecls = overrideDeclStr ? parseDecls(overrideDeclStr) : {};

  const opacity = resolveProp(baseDecls, overrideDecls, 'opacity', reducedMotionActive);
  const animation = resolveProp(baseDecls, overrideDecls, 'animation', reducedMotionActive);
  const display = resolveProp(baseDecls, overrideDecls, 'display', reducedMotionActive);

  return {
    opacity: opacity ? opacity.value : undefined,
    animationName: animation ? animationNameOf(animation.value) : undefined,
    display: display ? display.value : undefined,
    hasReducedMotionOverride: !!overrideDeclStr,
  };
}

// ---------------------------------------------------------------------
// Bagian 2: harness openModal() ASLI (business logic tidak disentuh).
// ---------------------------------------------------------------------

function makeFakeClassList(set) {
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      const has = set.has(c);
      const shouldHave = force === undefined ? !has : !!force;
      if (shouldHave) set.add(c); else set.delete(c);
      return shouldHave;
    },
  };
}

function makeFakeEl(id, classes = []) {
  const classSet = new Set(classes);
  return { id, classList: makeFakeClassList(classSet), setAttribute() {}, querySelector() { return null; } };
}

function makeFakeDocument(modalEl) {
  const bodyClasses = new Set();
  return {
    body: { classList: makeFakeClassList(bodyClasses) },
    getElementById(id) { return modalEl.id === id ? modalEl : null; },
    querySelectorAll(sel) { return sel.indexOf('.overlay') !== -1 ? [] : []; },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
}

function openVehicleModalViaRealEngine() {
  const vehicleModal = makeFakeEl('vehicleModal', ['overlay']);
  const fakeDoc = makeFakeDocument(vehicleModal);
  const ctx = loadSource(
    ['modules/shared/modal-navigasi.js'],
    { document: fakeDoc, window: {}, setTimeout, clearTimeout, escapeHtml: (s) => String(s == null ? '' : s) },
  );
  ctx.openModal('vehicleModal');
  return vehicleModal;
}

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

test('openModal("vehicleModal") — business logic asli tetap menambahkan class .open (0 perubahan JS)', () => {
  const vehicleModal = openVehicleModalViaRealEngine();
  assert.equal(vehicleModal.classList.contains('open'), true);
  assert.equal(vehicleModal.classList.contains('overlay'), true);
});

test('reduced-motion AKTIF — .overlay.open (vehicleModal) computed opacity final = 1, animasi dimatikan (bukan cuma dipercepat)', () => {
  const vehicleModal = openVehicleModalViaRealEngine();
  assert.equal(vehicleModal.classList.contains('open'), true, 'prasyarat: openModal() sudah menambahkan .open');

  const style = resolveOverlayOpenStyle('.overlay.open', /* reducedMotionActive */ true);
  assert.ok(style.hasReducedMotionOverride, 'harus ada override khusus .overlay.open di dalam @media (prefers-reduced-motion: reduce)');
  assert.equal(style.opacity, '1', 'opacity final harus 1 -- modal harus tetap terlihat penuh, bukan 0 dari keyframe "from" yang ketangkep');
  assert.equal(style.animationName, 'none', 'animasi entrance harus benar-benar dimatikan (bukan cuma diperpendek ke .01ms) supaya tidak ada race pembacaan opacity mid-keyframe');
  assert.equal(style.display, 'flex', 'modal tetap harus flex/visible (display tidak boleh ikut ternegasi oleh fix ini)');
});

test('reduced-motion TIDAK aktif — perilaku normal (animasi overlayIn + opacity 1) tidak ikut berubah oleh fix ini', () => {
  const style = resolveOverlayOpenStyle('.overlay.open', /* reducedMotionActive */ false);
  assert.equal(style.opacity, '1');
  assert.equal(style.animationName, 'overlayIn', 'utk user tanpa reduced-motion, entrance animation overlayIn harus tetap jalan seperti semula');
});

test('override reduced-motion juga berlaku utk .calc-overlay.open & .qs-modal-overlay.open (konsisten, bukan cuma vehicleModal)', () => {
  for (const selector of ['.calc-overlay.open', '.qs-modal-overlay.open']) {
    const style = resolveOverlayOpenStyle(selector, true);
    assert.ok(style.hasReducedMotionOverride, `${selector} harus punya override reduced-motion juga`);
    assert.equal(style.opacity, '1', `${selector}: opacity final harus 1 saat reduced-motion aktif`);
    assert.equal(style.animationName, 'none', `${selector}: animasi harus dimatikan saat reduced-motion aktif`);
  }
});
