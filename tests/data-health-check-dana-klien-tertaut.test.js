'use strict';
// Data Health Check: peringatan "akun tertaut aset memuat dana klien" (dana proyek klien, audit konsumen).
// Sebelumnya peringatan ini hanya ada di halaman Akun. Di sini dipindah/ditambah ke Hasil Pemindaian Data.
// CATATAN: tampilan modal dirender SEKALI di tengah runDataHealthCheck(); issue yang di-push sesudah blok
// render hanya masuk nilai kembalian. Karena itu tes ini memeriksa DOM (dataHealthList), bukan hanya array.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TITLE = 'Akun tertaut aset memuat dana klien';

function makeD(accounts) {
  return {
    accounts: accounts || [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [],
  };
}
function mkDom() {
  const els = {
    dataHealthSummary: { innerHTML: '' },
    dataHealthList: { innerHTML: '' },
    dataHealthModal: { classList: { _o: false, contains() { return this._o; }, add() { this._o = true; }, remove() { this._o = false; } } },
  };
  return { els, document: { getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [] } };
}
function run(D, extra) {
  const dom = mkDom();
  const calls = { openModal: 0 };
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    Object.assign({ D, document: dom.document, openModal: () => { calls.openModal++; } }, extra || {})
  );
  return { ctx, dom, calls, issues: ctx.runDataHealthCheck() };
}
const D2 = () => makeD([{ id: 'a1', name: 'BCA' }, { id: 'a2', name: 'Mandiri' }, { id: 'a3', name: 'Kas' }]);

test('akun tertaut berisi dana klien -> 1 peringatan warn per akun, tampil di DOM', () => {
  const D = D2();
  const { issues, dom } = run(D, { akunTertautBerisiKlienSafe: () => [{ accountId: 'a1', nama: 'BCA' }, { accountId: 'a3', nama: 'Kas' }] });
  const f = issues.filter((i) => i.title === TITLE);
  assert.equal(f.length, 2);
  assert.equal(f[0].level, 'warn');
  assert.match(f[0].detail, /BCA/);
  assert.match(f[1].detail, /Kas/);
  assert.match(dom.els.dataHealthList.innerHTML, /Akun tertaut aset memuat dana klien/);
  assert.match(dom.els.dataHealthList.innerHTML, /BCA/);
});

test('detail memuat langkah manual (pindahkan dana klien / lepas tautan), tanpa migrasi otomatis', () => {
  const { issues } = run(D2(), { akunTertautBerisiKlienSafe: () => [{ accountId: 'a1', nama: 'BCA' }] });
  const f = issues.find((i) => i.title === TITLE);
  assert.match(f.detail, /lepas tautan/i);
  assert.match(f.detail, /dana klien/i);
  assert.ok(!(f.actions || []).some((a) => /repair|fix|migr/i.test(String(a.action))), 'tidak boleh ada aksi perbaikan otomatis');
});

test('tombol buka akun memakai INDEX asli di D.accounts (openAccModal)', () => {
  const { issues } = run(D2(), { akunTertautBerisiKlienSafe: () => [{ accountId: 'a3', nama: 'Kas' }] });
  const f = issues.find((i) => i.title === TITLE);
  assert.equal(f.actions.length, 1);
  assert.equal(f.actions[0].action, 'openAccModal');
  assert.equal(JSON.stringify(f.actions[0].args), JSON.stringify([2]));
});

test('tanpa akun tertaut berisi klien: tidak ada peringatan (tampilan identik)', () => {
  const { issues, dom } = run(D2(), { akunTertautBerisiKlienSafe: () => [] });
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
  assert.match(dom.els.dataHealthSummary.innerHTML, /Tidak ditemukan masalah/);
});

test('helper belum ada (modul lama): tidak error, tidak ada peringatan', () => {
  const { issues } = run(D2());
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('helper melempar error: cek lain tetap jalan (tidak menjatuhkan Data Health Check)', () => {
  const D = D2();
  D.transactions = [{ id: 't1', accountId: 'a1', amount: 0, date: '2026-01-01' }];
  const { issues } = run(D, { akunTertautBerisiKlienSafe: () => { throw new Error('boom'); } });
  assert.ok(issues.some((i) => i.title === 'Transaksi dengan jumlah tidak valid'));
  assert.equal(issues.filter((i) => i.title === TITLE).length, 0);
});

test('proyek klien ada + mesin belum dimuat: muat mesin, lalu pindai ulang bila modal masih terbuka', async () => {
  let resolve; const p = new Promise((r) => { resolve = r; });
  let ensure = 0;
  const { ctx, dom, calls } = run(D2(), { adaProyekKlienSafe: () => true, ensureKlienEngineSafe: () => { ensure++; return p; } });
  assert.equal(ensure, 1);
  const awal = calls.openModal;
  dom.els.dataHealthModal.classList.add();           // modal terbuka
  ctx.saldoPribadi = () => 0;                        // mesin selesai dimuat
  resolve(); await new Promise((r) => setImmediate(r));
  assert.equal(calls.openModal, awal + 1, 'pindai ulang sekali');
});

test('modal sudah ditutup saat mesin selesai dimuat: TIDAK pindai ulang', async () => {
  let resolve; const p = new Promise((r) => { resolve = r; });
  const { ctx, calls } = run(D2(), { adaProyekKlienSafe: () => true, ensureKlienEngineSafe: () => p });
  const awal = calls.openModal;
  ctx.saldoPribadi = () => 0;
  resolve(); await new Promise((r) => setImmediate(r));
  assert.equal(calls.openModal, awal);
});

test('mesin sudah dimuat atau tanpa proyek klien: tidak memicu pemuatan', () => {
  let ensure = 0;
  run(D2(), { adaProyekKlienSafe: () => true, saldoPribadi: () => 0, ensureKlienEngineSafe: () => { ensure++; return null; } });
  run(D2(), { adaProyekKlienSafe: () => false, ensureKlienEngineSafe: () => { ensure++; return null; } });
  assert.equal(ensure, 0);
});
