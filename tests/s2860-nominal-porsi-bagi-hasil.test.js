'use strict';
/** S2860 — Porsi % <-> Nominal Rp (modal Akun, kartu), + Laba Bersih & Bagi Hasil di fitur Proyek. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const sameId = (a, b) => String(a) === String(b);

// ---------- helper bersama (modules-calc.js) ----------
test('ownerNominalFromPorsi / ownerPorsiFromNominal round-trip, dasar <=0 -> null', () => {
  const c = loadSource(['modules/shared/modules-calc.js'], { D: {} }, ['ownerNominalFromPorsi', 'ownerPorsiFromNominal', 'ownerShareLine']);
  assert.equal(c.ownerNominalFromPorsi(10000000, 37.5), 3750000);
  assert.equal(c.ownerPorsiFromNominal(10000000, 3750000), 37.5);
  assert.equal(c.ownerNominalFromPorsi(0, 50), null);
  assert.equal(c.ownerPorsiFromNominal(-5, 50), null);
  const line = c.ownerShareLine([{ ownerName: 'A', porsi: 60 }, { ownerName: 'B', porsi: 40 }, { ownerName: 'C', porsi: 0 }], 1000, { escape: String });
  assert.match(line, /^60% A \(.*600.*\) · 40% B \(.*400.*\)$/);
  assert.equal(c.ownerShareLine([{ ownerName: 'A', porsi: 100 }], 0, { escape: String }), '100% A');
});

// ---------- Proyek: laba bersih & bagi hasil ----------
function fx(extra) {
  const els = {};
  const el = (id) => (els[id] || (els[id] = { id, value: '', style: {}, textContent: '', innerHTML: '', disabled: false }));
  const p = Object.assign({ id: 'p1', name: 'Wallpanel', klien: 'Ibu I', dana: 'klien', rab: 7000000, status: 'aktif',
    items: [{ id: 'i1', harga: 5000000, paid: false }] }, extra || {});
  const D = { renovProjects: [p], accounts: [], transactions: [], piutang: [], profile: { nama: 'Wawan' } };
  const saved = [];
  const r = loadSource(['modules/home/renovasi.js'], {
    D, sameId, todayStr: () => '2026-11-20', uid: () => 'u', save: () => { saved.push(JSON.stringify(D.renovProjects[0].bagiHasil || null)); return true; },
    toast() {}, escapeHtml: String, fmt: (n) => 'Rp' + Math.round(n), fmtFull: (n) => 'Rp' + Math.round(n),
    document: { getElementById: el }, totalSaldoAkun: () => 0,
  }, ['Renov', 'renovLabaBersihAuto', 'renovLabaBersihEfektif', 'renovBagiHasilPanelHtml']);
  r.Renov.curId = 'p1';
  r.Renov.renderFundPanel = () => {};
  return { p, r, els, saved, D };
}

test('laba bersih otomatis = RAB - biaya (estimasi); manual menimpa; kosong kembali otomatis', () => {
  const { p, r } = fx();
  assert.equal(r.renovLabaBersihAuto(p).nilai, 2000000);
  assert.equal(r.renovLabaBersihEfektif(p, 1500000).nilai, 1500000);
  assert.equal(r.renovLabaBersihEfektif(p, null).nilai, 2000000);
});

test('panel tampil untuk proyek klien/RAB>0, tersembunyi untuk proyek pribadi tanpa RAB', () => {
  const a = fx();
  assert.match(a.r.renovBagiHasilPanelHtml(a.p), /Laba Bersih &amp; Bagi Hasil/);
  const b = fx({ dana: 'pribadi', rab: 0 });
  assert.equal(b.r.renovBagiHasilPanelHtml(b.p), '');
});

test('porsi -> nominal, nominal -> porsi, auto-fill sisa (2 penerima)', () => {
  const { p, r, els } = fx();
  r.renovBagiHasilPanelHtml(p); // init draft: Wawan 100%
  r.Renov.bhAdd();
  assert.equal(r.Renov._bh.owners.length, 2);
  els.renovBhP0 = { value: '' }; els.renovBhP1 = { value: '' }; els.renovBhN0 = { value: '' }; els.renovBhN1 = { value: '' };
  // ketik porsi 60 di baris 0 -> baris 1 otomatis 40; nominal dari laba 2.000.000
  r.Renov.bhPorsiInput(0, '60');
  assert.equal(r.Renov._bh.owners[1].porsi, 40);
  assert.equal(els.renovBhN0.value, 1200000);
  assert.equal(els.renovBhN1.value, 800000);
  // ketik nominal 500.000 di baris 1 -> porsi 25, baris 0 otomatis 75
  r.Renov.bhNominalInput(1, '500000');
  assert.equal(r.Renov._bh.owners[1].porsi, 25);
  assert.equal(r.Renov._bh.owners[0].porsi, 75);
  assert.equal(els.renovBhN0.value, 1500000);
});

test('laba manual diedit -> nominal semua baris ikut; reset -> kembali otomatis', () => {
  const { p, r, els } = fx();
  r.renovBagiHasilPanelHtml(p);
  r.Renov.bhAdd();
  els.renovBhP0 = { value: '' }; els.renovBhP1 = { value: '' }; els.renovBhN0 = { value: '' }; els.renovBhN1 = { value: '' };
  r.Renov.bhPorsiInput(0, '50');
  r.Renov.bhLabaInput('3.000.000'.replace(/\./g, ''));
  assert.equal(els.renovBhN0.value, 1500000);
  assert.equal(els.renovBhN1.value, 1500000);
  r.Renov.bhLabaInput('');
  assert.equal(r.Renov._bh.labaManual, null);
  assert.equal(els.renovBhN0.value, 1000000);
});

test('simpan: wajib 100% & nama terisi; tersimpan ke p.bagiHasil tanpa field nominal', () => {
  const { p, r, saved } = fx();
  r.renovBagiHasilPanelHtml(p);
  r.Renov.bhAdd();
  r.Renov._bh.owners[1].ownerName = '';
  r.Renov.bhSave();
  assert.equal(p.bagiHasil, undefined, 'nama kosong / total belum 100% tidak boleh tersimpan');
  r.Renov._bh.owners[0].porsi = 70; r.Renov._bh.owners[1].porsi = 30; r.Renov._bh.owners[1].ownerName = 'Mitra';
  r.Renov.bhSave();
  assert.equal(saved.length, 1);
  assert.equal(JSON.stringify(p.bagiHasil.owners.map((o) => [o.ownerName, o.porsi])), JSON.stringify([['Wawan', 70], ['Mitra', 30]]));
  assert.equal(p.bagiHasil.labaManual, null);
  assert.ok(!JSON.stringify(p.bagiHasil).includes('nominal'));
});

test('hapus penerima: porsi yang dihapus dibagikan ke sisanya (total tetap 100)', () => {
  const { p, r } = fx();
  r.renovBagiHasilPanelHtml(p);
  r.Renov._bh.owners = [{ ownerName: 'A', porsi: 50 }, { ownerName: 'B', porsi: 30 }, { ownerName: 'C', porsi: 20 }];
  r.Renov.bhRemove(2);
  assert.equal(r.Renov._bh.owners.reduce((s, o) => s + o.porsi, 0), 100);
});

test('bagi rata 3 penerima total tepat 100', () => {
  const { p, r } = fx();
  r.renovBagiHasilPanelHtml(p);
  r.Renov._bh.owners = [{ ownerName: 'A', porsi: 0 }, { ownerName: 'B', porsi: 0 }, { ownerName: 'C', porsi: 0 }];
  r.Renov.bhRata();
  assert.equal(Math.round(r.Renov._bh.owners.reduce((s, o) => s + o.porsi, 0) * 1e6) / 1e6, 100);
});

// ---------- Lanjutan: bagi hasil tersimpan (CSV/PDF/rincian), titipan expense ----------
test('renovBagiHasilRows: total nominal = laba (residu pembulatan ke porsi terbesar), cair/belum proporsional', () => {
  const { p, r } = fx({ rab: 1000, items: [{ id: 'i', harga: 1 }] });
  const rows = loadSource(['modules/home/renovasi.js'], {
    D: { renovProjects: [p], accounts: [], transactions: [], piutang: [] }, sameId, todayStr: () => 'x', uid: () => 'u', save: () => true, toast() {},
    escapeHtml: String, fmt: String, fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0,
  }, ['renovBagiHasilRows']).renovBagiHasilRows;
  p.bagiHasil = { labaManual: 100, owners: [{ ownerName: 'A', porsi: 33.3333 }, { ownerName: 'B', porsi: 33.3333 }, { ownerName: 'C', porsi: 33.3334 }] };
  const out = rows(p);
  assert.equal(out.rows.reduce((s, x) => s + x.nominal, 0), 100);
  assert.equal(out.manual, true);
  assert.equal(rows({ id: 'z' }), null);
  void r;
});

test('titipan expense: nominal <-> porsi dua arah mengikuti Jumlah, 2 owner saling melengkapi', () => {
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, value: '', textContent: '', tagName: 'INPUT' });
  const ui = loadSource(['modules/finance/titipan-expense-ui.js'], {
    D: {}, document: { getElementById: (id) => (id === 'titipanExpenseAmt' ? { value: '1000000' } : el(id)) },
    escapeHtml: String, fmt: String, toast() {}, sameId,
  }, ['TitipanExpenseUI']).TitipanExpenseUI;
  ui._updateSplitPreview = () => {};
  ui._draft = [{ ownerId: 'a', ownerName: 'A', selected: true, porsi: null }, { ownerId: 'b', ownerName: 'B', selected: true, porsi: null }];
  ui.onPorsiInput(0, '30');
  assert.equal(ui._draft[1].porsi, 70);
  assert.equal(els.titipanExpenseOwnerNominal0.value, 300000);
  assert.equal(els.titipanExpenseOwnerNominal1.value, 700000);
  ui.onNominalInput(1, '250000');
  assert.equal(ui._draft[1].porsi, 25);
  assert.equal(ui._draft[0].porsi, 75);
});
