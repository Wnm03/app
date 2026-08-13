'use strict';
/**
 * bill-calendar-day-aria-label-s591.test.js — Sesi s591 (lanjutan diagnostik-versi.js)
 *
 * Diagnostik menemukan sel hari di billCalendarModal (renderBillCalendar(),
 * modules/shared/modules-render.js) tidak punya aria-label -- screen reader cuma
 * baca angka tanggal polos tanpa konteks "ada tagihan jatuh tempo atau tidak",
 * beda dari pola aria-label yang sudah dipakai tombol navigasi bulan
 * (data-action="navBillCalendar", lihat modals.js).
 *
 * Fix: tiap sel `.billcal-day` sekarang punya aria-label="Tanggal N" (polos)
 * atau "Tanggal N, ada tagihan jatuh tempo" (kalau hasBill true). Test ini
 * pagar permanen supaya regresi tidak lolos lagi: extract source ASLI
 * renderBillCalendar() (sama pola tests/bill-archive-actionbtn-parity.test.js),
 * jalankan di sandbox vm minimal, lalu cek aria-label di innerHTML hasil.
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

function loadSandbox(D, billCalYear, billCalMonth, billCalSelectedDate) {
  const els = {
    billCalLabel: makeFakeEl(),
    billCalGrid: makeFakeEl(),
    billCalTotal: makeFakeEl(),
    billCalDayList: makeFakeEl(),
  };
  const context = {
    console, Math, Date, JSON,
    escapeHtml: (s) => s,
    fmt: (n) => 'Rp ' + n,
    document: { getElementById: (id) => els[id] || null },
    D,
    MONTHS_FULL: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
    billCalYear,
    billCalMonth,
    billCalSelectedDate,
    // Stub minimal: bill tunggal jatuh tempo tanggal 10 bulan yang diuji.
    getBillOccurrencesInMonth: (b, year, month) => {
      if (b.id !== 'billX') return [];
      return [new Date(year, month, 10)];
    },
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('renderBillCalendar')}
this.renderBillCalendar = renderBillCalendar;`;
  vm.runInContext(snippet, context, { filename: 'bill-calendar-aria-label-extract.js' });
  return { context, els };
}

test('renderBillCalendar() — sel hari TANPA tagihan sama sekali tetap punya aria-label="Tanggal N" polos', () => {
  const D = { bills: [] };
  const { context, els } = loadSandbox(D, 2026, 7, null); // Agustus 2026, tanpa tagihan sama sekali
  context.renderBillCalendar();
  const html = els.billCalGrid.innerHTML;
  assert.match(
    html,
    /aria-label="Tanggal 1"[^,]/,
    'sel tanggal 1 (tanpa tagihan) harus tetap punya aria-label="Tanggal N" polos'
  );
  assert.doesNotMatch(
    html,
    /ada tagihan jatuh tempo/,
    'tidak boleh ada embel2 "ada tagihan jatuh tempo" kalau memang tidak ada tagihan bulan ini'
  );
});

test('renderBillCalendar() — sel hari dengan tagihan punya aria-label="Tanggal N, ada tagihan jatuh tempo"', () => {
  const D = { bills: [{ id: 'billX', name: 'Listrik', amount: 100000, freq: 'bulanan', kind: 'tagihan' }] };
  const { context, els } = loadSandbox(D, 2026, 7, null); // Agustus 2026
  context.renderBillCalendar();
  const html = els.billCalGrid.innerHTML;
  assert.match(
    html,
    /aria-label="Tanggal 10, ada tagihan jatuh tempo"/,
    'sel tanggal 10 (ada tagihan) harus punya aria-label lengkap dgn info tagihan'
  );
  // Sel tanpa tagihan (mis. tanggal 1) tetap punya aria-label polos, TIDAK kosong.
  assert.match(
    html,
    /aria-label="Tanggal 1"[^,]/,
    'sel tanpa tagihan tetap harus punya aria-label="Tanggal N" (tanpa embel2 tagihan)'
  );
});

test('renderBillCalendar() SUMBER: tiap sel .billcal-day WAJIB punya atribut aria-label (bukan cuma div polos)', () => {
  const fnSrc = extractFnSource('renderBillCalendar');
  assert.ok(
    /aria-label="\$\{ariaLbl\}"|aria-label="\$\{escapeHtml\(ariaLbl\)\}"/.test(fnSrc),
    'renderBillCalendar() harus menyisipkan aria-label di tiap sel .billcal-day -- kalau ini gagal, berarti ada yang menghapus lagi aria-label-nya (regresi diagnostik s591)'
  );
});
