'use strict';
// tests/openmodal-stacked-no-anim-s510.test.js — regresi utk bugfix "dropdown
// Pilih Pemilik tidak bisa dipilih" (laporan user, screenshot: modal ⚖️ Atur
// Porsi Kepemilikan, opsi "kamera" tidak pernah bisa dipilih di <select>).
//
// Root cause (audit): `.modal` dianimasikan pakai CSS `transform` (slideUp,
// lihat styles.css). Saat sebuah modal dibuka SEBAGAI TUMPUKAN di atas modal
// lain yang masih terbuka (mis. assetOwnersModal dibuka dari dalam assetModal
// yang masih terbuka, lewat Aset.openOwnersModal() -> openModal()), sejumlah
// WebView Android menyisakan compositing layer dari `transform` modal PERTAMA
// yang belum sempat didemosikan sebelum modal KEDUA mulai animasi -- membuat
// native <select> di dalam modal KEDUA (mis. dropdown "Pilih pemilik") salah
// hitung koordinat popup opsinya: opsi termuat, tapi tap di opsi manapun
// selain yang sedang aktif tidak terdaftar.
//
// Fix: openModal() sekarang mendeteksi apakah sudah ada `.overlay.open` lain
// SEBELUM modal yang baru ditandai 'open', lalu memasang/melepas class
// `.no-anim` (lihat styles.css: `.modal.no-anim { animation:none; transform:
// none; }`) pada `.modal` di dalam overlay yang baru dibuka. Modal yang
// dibuka SENDIRIAN (tidak ada modal lain yang masih terbuka) tidak
// terpengaruh sama sekali -- animasi slideUp tetap seperti semula.

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

function makeFakeModalInner() {
  const classSet = new Set();
  return { classList: makeFakeClassList(classSet), _classSet: classSet };
}

function makeFakeOverlay(id, opts = {}) {
  const classSet = new Set(opts.open ? ['overlay', 'open'] : ['overlay']);
  const modalInner = opts.withModalChild === false ? null : makeFakeModalInner();
  return {
    id,
    classList: makeFakeClassList(classSet),
    _classSet: classSet,
    setAttribute() {},
    querySelector(sel) {
      if (sel === '.modal') return modalInner;
      return null;
    },
    _modalInner: modalInner,
  };
}

function makeFakeDocument(overlays) {
  const bodyClasses = new Set();
  return {
    body: { classList: makeFakeClassList(bodyClasses) },
    getElementById(id) {
      return overlays.find((o) => o.id === id) || null;
    },
    querySelector(sel) {
      // openModal() checks `.overlay.open` to know if this is a stacked open.
      if (sel === '.overlay.open') {
        return overlays.find((o) => o._classSet.has('open')) || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel.indexOf('.overlay') !== -1) return overlays.filter((o) => o._classSet.has('open'));
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadModalNavigasi(fakeDoc, fakeWindow) {
  return loadSource(
    ['modules/shared/modal-navigasi.js'],
    {
      document: fakeDoc,
      window: fakeWindow,
      setTimeout,
      clearTimeout,
      escapeHtml: (s) => String(s == null ? '' : s),
    },
  );
}

test('openModal() TIDAK memasang .no-anim kalau modal dibuka sendirian (tidak ada .overlay.open lain)', () => {
  const assetModal = makeFakeOverlay('assetModal');
  const fakeDoc = makeFakeDocument([assetModal]);
  const ctx = loadModalNavigasi(fakeDoc, {});

  ctx.openModal('assetModal');

  assert.equal(assetModal.classList.contains('open'), true, 'modal tetap terbuka seperti biasa');
  assert.equal(assetModal._modalInner.classList.contains('no-anim'), false, 'modal tunggal tidak boleh dapat .no-anim -- animasi slideUp normal tetap jalan');
});

test('openModal() MEMASANG .no-anim ke modal baru kalau ada .overlay.open lain (kasus tumpukan assetOwnersModal di atas assetModal)', () => {
  const assetModal = makeFakeOverlay('assetModal', { open: true }); // sudah terbuka lebih dulu
  const assetOwnersModal = makeFakeOverlay('assetOwnersModal');
  const fakeDoc = makeFakeDocument([assetModal, assetOwnersModal]);
  const ctx = loadModalNavigasi(fakeDoc, {});

  ctx.openModal('assetOwnersModal');

  assert.equal(assetOwnersModal.classList.contains('open'), true, 'modal kedua tetap berhasil terbuka');
  assert.equal(assetOwnersModal._modalInner.classList.contains('no-anim'), true, 'modal yang dibuka bertumpuk harus dapat .no-anim supaya tidak menambah compositing layer transform yang memicu bug native <select>');
});

test('openModal() tidak error kalau .modal child tidak ditemukan (guard typeof el.querySelector / _modalInner null)', () => {
  const bareOverlay = makeFakeOverlay('bareOverlay', { withModalChild: false });
  const fakeDoc = makeFakeDocument([bareOverlay]);
  const ctx = loadModalNavigasi(fakeDoc, {});

  assert.doesNotThrow(() => ctx.openModal('bareOverlay'));
  assert.equal(bareOverlay.classList.contains('open'), true);
});

test('openModal() tidak error kalau el.querySelector bukan fungsi (mock lama tanpa querySelector, mis. tests/scan-ocr-epoch-guard.test.js)', () => {
  const legacyEl = {
    classList: makeFakeClassList(new Set()),
  };
  const fakeDoc = {
    body: { classList: makeFakeClassList(new Set()) },
    getElementById() { return legacyEl; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  };
  const ctx = loadModalNavigasi(fakeDoc, {});

  assert.doesNotThrow(() => ctx.openModal('anyModal'));
  assert.equal(legacyEl.classList.contains('open'), true);
});
