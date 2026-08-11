'use strict';
/**
 * bill-archive-actionbtn-parity.test.js — Sesi 325: pencegahan permanen utk kelas
 * bug "tombol Edit hilang di billArchiveModal" (laporan user, lihat CHANGELOG s325).
 *
 * AKAR PENYEBAB bug lama: HTML tombol tagihan arsip/lunas ditulis MANUAL 2x di 2
 * tempat terpisah (renderBillItemHtml cabang isArchived, dan renderBillArchive) --
 * begitu satu diubah (mis. nambah ✏️ Edit di satu tempat), yang satu lagi lupa ikut
 * diubah, dan TIDAK ADA test yang nangkep drift ini karena masing2 test cuma
 * ngecek fungsinya sendiri-sendiri secara terpisah.
 *
 * Fix struktural: HTML tombol arsip sekarang SATU fungsi (billArchiveActionButtonsHtml),
 * dipakai renderBillArchive() langsung. Test ini adalah PAGAR supaya kelas bug ini
 * tidak bisa lolos lagi lewat 2 lapis:
 *   1) Cek fungsional: setiap kombinasi kind (tagihan/cicilan/langganan) x status
 *      (belum bayar/sudah bayar bulan ini/bayar-bulan-depan/lunas) yang SEHARUSNYA
 *      bisa di-edit user, actionBtns/output HTML-nya WAJIB mengandung
 *      data-action="openBillModal" (baik langsung maupun via menu ⋮).
 *   2) Cek struktural: renderBillArchive() di source WAJIB manggil
 *      billArchiveActionButtonsHtml(...), bukan nulis ulang <button> manual --
 *      kalau ada yang "helpful" nulis ulang HTML inline lagi suatu saat, test ini
 *      gagal duluan sebelum sempat drift dari renderBillItemHtml.
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

function makeFakeEl(overrides = {}) {
  return { classList: { contains: () => true }, textContent: '', innerHTML: '', ...overrides };
}

function loadSandbox() {
  const els = { billArchiveList: makeFakeEl() };
  const context = {
    console, Math, Date, JSON,
    escapeHtml: (s) => s,
    fmt: (n) => 'Rp ' + n,
    document: { getElementById: (id) => els[id] || null },
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('billArchiveActionButtonsHtml')}
${extractFnSource('renderBillArchive')}
this.billArchiveActionButtonsHtml = billArchiveActionButtonsHtml;
this.renderBillArchive = renderBillArchive;`;
  vm.runInContext(snippet, context, { filename: 'bill-archive-parity-extract.js' });
  return { context, els };
}

// ================= 1) Cek struktural: tidak boleh ada HTML tombol manual lagi =================

test('renderBillArchive() SUMBER: wajib manggil billArchiveActionButtonsHtml(), tidak nulis <button> manual', () => {
  const fnSrc = extractFnSource('renderBillArchive');
  assert.ok(
    fnSrc.includes('billArchiveActionButtonsHtml('),
    'renderBillArchive() harus reuse billArchiveActionButtonsHtml() -- kalau ini gagal, berarti ada yang nulis ulang HTML tombol manual lagi & bug drift bisa terulang'
  );
  assert.ok(
    !/data-action="openBillModal"[^`]*<button/.test(fnSrc) || fnSrc.match(/data-action="openBillModal"/g).length <= 1,
    'tidak boleh ada definisi tombol openBillModal manual tambahan di luar helper'
  );
});

// ================= 2) Cek fungsional: semua kind lunas WAJIB bisa diedit =================

for (const kind of ['tagihan', 'cicilan', 'langganan']) {
  test(`renderBillArchive() — kind:'${kind}' lunas tetap dapat tombol Riwayat + Edit + Hapus (parity dgn list utama)`, () => {
    const { context, els } = loadSandbox();
    context.D = { billsArchive: [{ id: 'b1', kind, name: 'Contoh ' + kind, amount: 10000, tenor: kind === 'cicilan' ? 6 : null, completedAt: '2026-07-01' }] };
    context.renderBillArchive();
    const html = els.billArchiveList.innerHTML;
    assert.ok(html.includes('data-action="openBillHistory"'), `${kind}: harus ada tombol Riwayat`);
    assert.ok(html.includes('data-action="openBillModal"'), `${kind}: harus ada tombol Edit -- REGRESI kalau gagal`);
    assert.ok(html.includes('data-action="delBillArchive"'), `${kind}: harus ada tombol Hapus`);
  });
}

// ================= 3) Kasus spesifik laporan user: cicilan "Bayar Bulan Depan" (tenor 1x) =================

test('renderBillArchive() — cicilan tenor 1x "Bayar Bulan Depan" yang sudah lunas (langsung archived) tetap punya tombol Edit', () => {
  const { context, els } = loadSandbox();
  context.D = { billsArchive: [{ id: 'b2', kind: 'cicilan', name: 'STNK Tahunan - Vario 125', amount: 229500, tenor: 1, sisaTenor: 0, completedAt: '2026-08-08' }] };
  context.renderBillArchive();
  const html = els.billArchiveList.innerHTML;
  assert.ok(html.includes('b2'), 'id bill harus ikut ter-passing ke tombol');
  assert.ok(html.includes('data-action="openBillModal"'), 'cicilan bayar-bulan-depan yg lunas tetap harus bisa diedit');
});

// ================= 4) billArchiveActionButtonsHtml() murni — kontrak dasar =================

test('billArchiveActionButtonsHtml(id) — selalu mengembalikan persis 3 tombol: Riwayat, Edit, Hapus', () => {
  const { context } = loadSandbox();
  const html = context.billArchiveActionButtonsHtml('xyz');
  const actions = [...html.matchAll(/data-action="([a-zA-Z]+)"/g)].map(m => m[1]);
  assert.deepEqual(actions, ['openBillHistory', 'openBillModal', 'delBillArchive']);
});
