'use strict';
// tests/showpage-overlay-cleanup-v1025.test.js — regresi utk bugfix "semua
// tombol di Car Notes tidak respon" (laporan user, v1025).
//
// Root cause: showPage() (dipanggil tiap pindah tab bawah) tidak pernah
// membersihkan overlay/modal yang masih class="open" (mis. catalogModal
// ditinggal terbuka krn user pindah tab lewat nav/gesture back, bukan lewat
// tombol ✕ / closeModal() eksplisit). Overlay full-viewport yang nyangkut
// itu selalu jadi target klik duluan (lewat e.target.closest('[data-action]')
// di dispatcher global) & tidak match [data-action], jadi SEMUA tombol di
// halaman manapun diam-diam tidak merespon (nol error, nol toast).
//
// Test ini memuat modal-navigasi.js ASLI (bukan re-implementasi) lewat
// harness vm loadSource(), dengan fake DOM minimal yang cukup buat
// mensimulasikan overlay yang "nyangkut open" + memanggil showPage(), lalu
// memverifikasi overlay itu benar-benar tertutup paksa setelahnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

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
  return {
    id,
    _classSet: classSet,
    classList: makeFakeClassList(classSet),
    setAttribute() {},
    querySelector() { return null; },
  };
}

// Fake document yang cukup pintar untuk resolve selector gabungan model
// ".overlay.open,.calc-overlay.open,.qs-modal-overlay.open" dan ".page" /
// ".nav-item" -- cukup untuk kebutuhan showPage(), bukan implementasi DOM
// penuh.
function makeFakeDocument({ overlays, pages }) {
  const bodyClasses = new Set();
  function matchesSimpleSelector(el, sel) {
    // sel spt ".overlay.open" -> semua class harus ada di elemen.
    const wanted = sel.split('.').filter(Boolean);
    return wanted.every((c) => el._classSet.has(c));
  }
  return {
    body: { classList: makeFakeClassList(bodyClasses) },
    _overlays: overlays,
    _pages: pages,
    getElementById(id) {
      if (overlays[id]) return overlays[id];
      if (pages[id]) return pages[id];
      return null;
    },
    querySelectorAll(selector) {
      const parts = selector.split(',').map((s) => s.trim());
      if (parts[0].startsWith('.overlay') || parts[0].startsWith('.calc-overlay') || parts[0].startsWith('.qs-modal-overlay')) {
        const matched = [];
        for (const el of Object.values(overlays)) {
          if (parts.some((p) => matchesSimpleSelector(el, p))) matched.push(el);
        }
        return matched;
      }
      if (selector === '.page') return Object.values(pages);
      if (selector === '.nav-item') return [];
      return [];
    },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadModalNavigasi(fakeDoc) {
  return loadSource(
    ['modules/shared/modal-navigasi.js'],
    {
      document: fakeDoc,
      setTimeout,
      clearTimeout,
      renderPageContent: () => {},
      escapeHtml: (s) => String(s == null ? '' : s),
    },
  );
}

test('showPage() — overlay yang nyangkut "open" (mis. catalogModal) dipaksa tertutup saat pindah tab', () => {
  const catalogModal = makeFakeEl('catalogModal', ['overlay', 'open']);
  const pageCarnotes = makeFakeEl('page-carnotes', []);
  const fakeDoc = makeFakeDocument({
    overlays: { catalogModal },
    pages: { 'page-carnotes': pageCarnotes },
  });
  const ctx = loadModalNavigasi(fakeDoc);

  // Sebelum fix: overlay ini akan TETAP 'open' setelah showPage() dipanggil.
  assert.equal(catalogModal.classList.contains('open'), true);

  ctx.showPage('carnotes');

  assert.equal(catalogModal.classList.contains('open'), false, 'overlay yang nyangkut open harus dipaksa tertutup oleh showPage()');
  assert.equal(catalogModal.classList.contains('closing'), false, 'class closing juga harus dibersihkan (bukan cuma open)');
  assert.equal(pageCarnotes.classList.contains('active'), true, 'halaman tujuan tetap aktif seperti biasa');
});

test('showPage() — beberapa overlay nyangkut sekaligus (overlay/calc-overlay/qs-modal-overlay) semuanya tertutup', () => {
  const overlays = {
    torsiModal: makeFakeEl('torsiModal', ['overlay', 'open']),
    calcModal: makeFakeEl('calcModal', ['calc-overlay', 'open']),
    qsModal: makeFakeEl('qsModal', ['qs-modal-overlay', 'open']),
  };
  const pages = { 'page-shop': makeFakeEl('page-shop', []) };
  const fakeDoc = makeFakeDocument({ overlays, pages });
  const ctx = loadModalNavigasi(fakeDoc);

  ctx.showPage('shop');

  for (const el of Object.values(overlays)) {
    assert.equal(el.classList.contains('open'), false, `${el.id} harus tertutup`);
  }
});

test('showPage() — tidak ada overlay nyangkut (kondisi normal) tetap jalan seperti biasa, tidak error', () => {
  const pages = { 'page-beranda': makeFakeEl('page-beranda', []) };
  const fakeDoc = makeFakeDocument({ overlays: {}, pages });
  const ctx = loadModalNavigasi(fakeDoc);

  assert.doesNotThrow(() => ctx.showPage('beranda'));
  assert.equal(pages['page-beranda'].classList.contains('active'), true);
});
