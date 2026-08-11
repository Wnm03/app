'use strict';
/**
 * s314-billhistory-render-checklist-helper.test.js — Sesi 314: rekomendasi #1
 * lanjutan audit s313 ("saveBillHistoryEdit() tidak refresh Daftar Tagihan").
 *
 * s313 kejadian karena saveBillHistoryEdit() & deleteBillHistoryTx() -- dua
 * fungsi SEBELAH PERSIS di modal yang sama (billHistoryEditModal) -- masing-
 * masing nulis SENDIRI-SENDIRI daftar pemanggilan render, dan salah satu
 * ketinggalan renderBillList()/checkBills() tanpa ketauan sampai user lapor.
 * Fix s313 cuma nambal gejalanya (nambah 2 panggilan yang kelewat) -- root
 * cause STRUKTURAL-nya (dua daftar render terpisah yang bisa diam-diam beda)
 * belum dibenerin.
 *
 * Fix s314: tarik daftar render yang SELALU sama itu ke satu fungsi murni,
 * refreshBillHistoryModalViews(), dipanggil dari KEDUA fungsi. Test ini
 * memverifikasi:
 *   1. refreshBillHistoryModalViews() sendiri memanggil ke-6 render yang
 *      relevan (renderDashboard/renderKeuangan/renderBillList/checkBills/
 *      renderBillHistory/renderBillArchive).
 *   2. Source saveBillHistoryEdit() & deleteBillHistoryTx() SAMA-SAMA
 *      memanggil refreshBillHistoryModalViews() -- dicek langsung dari teks
 *      sumber (bukan cuma perilaku hasil eksekusi), supaya kalau nanti ada
 *      yang REVERT balik ke pola tulis-manual-sendiri-sendiri, test ini
 *      GAGAL walau kebetulan daftar render manual itu masih lengkap saat
 *      ditulis ulang.
 *
 * Pola load fungsi ASLI lewat brace-counting manual sama seperti
 * tests/s313-billhistoryedit-list-refresh.test.js / s304.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'),
  'utf8'
);

function extractFnSource(fnName) {
  const asyncMarker = `async function ${fnName}(`;
  const plainMarker = `function ${fnName}(`;
  let start = SRC.indexOf(asyncMarker);
  if (start === -1) start = SRC.indexOf(plainMarker);
  if (start === -1) throw new Error(`"${plainMarker}" tidak ditemukan`);
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

test('refreshBillHistoryModalViews() — memanggil ke-6 render inti (dashboard/keuangan/billList/checkBills/billHistory/billArchive)', () => {
  const calls = [];
  const context = {
    renderDashboard: () => calls.push('renderDashboard'),
    renderKeuangan: () => calls.push('renderKeuangan'),
    renderBillList: () => calls.push('renderBillList'),
    checkBills: () => calls.push('checkBills'),
    renderBillHistory: () => calls.push('renderBillHistory'),
    renderBillArchive: () => calls.push('renderBillArchive'),
  };
  vm.createContext(context);
  vm.runInContext(
    `${extractFnSource('refreshBillHistoryModalViews')}\nthis.refreshBillHistoryModalViews = refreshBillHistoryModalViews;`,
    context,
    { filename: 's314-extract.js' }
  );
  context.refreshBillHistoryModalViews();
  assert.deepEqual(
    calls,
    ['renderDashboard', 'renderKeuangan', 'renderBillList', 'checkBills', 'renderBillHistory', 'renderBillArchive'],
    'refreshBillHistoryModalViews() harus memanggil ke-6 render inti, urutan & kelengkapan tetap'
  );
});

test('saveBillHistoryEdit() — source-nya memanggil refreshBillHistoryModalViews() (bukan nulis render satu-satu sendiri)', () => {
  const fnSrc = extractFnSource('saveBillHistoryEdit');
  assert.ok(
    fnSrc.includes('refreshBillHistoryModalViews()'),
    'saveBillHistoryEdit() harus delegasi ke refreshBillHistoryModalViews() -- kalau ini gagal, kemungkinan ada yang revert ke pola tulis-manual lama (resiko lupa satu render lagi seperti s313)'
  );
});

test('deleteBillHistoryTx() — source-nya memanggil refreshBillHistoryModalViews() DAN tetap renderSettings() terpisah', () => {
  const fnSrc = extractFnSource('deleteBillHistoryTx');
  assert.ok(
    fnSrc.includes('refreshBillHistoryModalViews()'),
    'deleteBillHistoryTx() harus delegasi ke refreshBillHistoryModalViews() juga -- satu sumber kebenaran dipakai bareng saveBillHistoryEdit()'
  );
  assert.ok(
    fnSrc.includes('renderSettings()'),
    'renderSettings() harus tetap dipanggil di deleteBillHistoryTx() -- cakupannya lebih besar dari edit (bisa reaktivasi tagihan dari arsip), sengaja tidak dimasukkan ke helper bersama'
  );
});

function stripLineComments(src) {
  // Naif tapi cukup utk file ini: buang isi baris setelah "//" (tidak perlu
  // handle string literal berisi "//" -- kedua fungsi target tidak punya itu).
  return src.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

test('saveBillHistoryEdit() & deleteBillHistoryTx() — TIDAK ADA lagi daftar render manual yang ditulis dua kali secara terpisah', () => {
  const saveSrc = stripLineComments(extractFnSource('saveBillHistoryEdit'));
  const delSrc = stripLineComments(extractFnSource('deleteBillHistoryTx'));
  // Pola lama yang jadi root cause s313: renderBillList() dipanggil langsung
  // (bukan lewat helper) di salah satu fungsi tapi tidak di fungsi sebelah.
  // Setelah fix s314, renderBillList() TIDAK BOLEH lagi muncul sebagai
  // panggilan langsung di kedua fungsi ini (di luar komentar) -- harus lewat
  // refreshBillHistoryModalViews(). Komentar prosa yang menyebut nama fungsi
  // ini apa adanya (mis. dokumentasi historis bug s313) sengaja di-strip
  // dulu supaya tidak jadi false positive.
  assert.equal(saveSrc.includes('renderBillList()'), false, 'saveBillHistoryEdit() tidak boleh panggil renderBillList() langsung lagi -- harus lewat helper bersama');
  assert.equal(delSrc.includes('renderBillList()'), false, 'deleteBillHistoryTx() tidak boleh panggil renderBillList() langsung lagi -- harus lewat helper bersama');
});
