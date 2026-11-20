'use strict';
// S2893 — (1) kalimat status per pemilik & ringkasan pool, (2) kelas tabel utk layout HP, (3) form pengeluaran:
// hanya pemilik berkartu nyata, centang otomatis bila 1 pemilik, akun ikut pemilik kecuali dipilih manual.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');

// ---------- render ----------
function render() {
  const ctx = loadSource(['modules/finance/dana-titipan-portfolio-render.js'], {
    escapeHtml: (x) => String(x),
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID'),
  }, ['DanaTitipanPortfolioPresenter']);
  return ctx.DanaTitipanPortfolioPresenter;
}
test('_moneyShort: jt, rb, dan angka kecil', () => {
  const r = render();
  assert.equal(r._moneyShort(11000000), 'Rp 11 jt');
  assert.equal(r._moneyShort(11050000), 'Rp 11,05 jt');
  assert.equal(r._moneyShort(50000), 'Rp 50 rb');
  assert.equal(r._moneyShort(900), 'Rp 900');
  assert.equal(r._moneyShort(0), 'Rp 0');
});
test('kalimat status: kelebihan (renov dari backup)', () => {
  const r = render();
  const t = r._ownerStatusSentence({ principalAmount: 11000000, allocationStatus: 'OVER_ALLOCATED', overAllocatedAmount: 50000, estimatedUnallocated: 0 });
  assert.equal(t, 'Pokok Rp 11 jt, terpakai Rp 11,05 jt, kelebihan Rp 50 rb');
});
test('kalimat status: normal memakai sisa; pokok belum dicatat', () => {
  const r = render();
  assert.equal(r._ownerStatusSentence({ principalAmount: 10000000, allocationStatus: 'OK', overAllocatedAmount: 0, estimatedUnallocated: 4000000 }), 'Pokok Rp 10 jt, terpakai Rp 6 jt, sisa Rp 4 jt');
  assert.equal(r._ownerStatusSentence({ principalAmount: null, allocationStatus: 'PRINCIPAL_NOT_SET' }), 'Pokok belum dicatat');
});
test('kartu pemilik memuat kalimat status & label detail lama tetap ada', () => {
  const r = render();
  const html = r._ownerCardHtml({ ownerId: 'o1', ownerName: 'renov', principalAmount: 11000000, allocationStatus: 'OVER_ALLOCATED', overAllocatedAmount: 50000, estimatedUnallocated: 0, allocatedPrincipal: 0, currentValue: 0, gain: 0, holdings: [], usedTotal: 0, returnedTotal: 0, outstandingPrincipal: 0 }, 0);
  assert.match(html, /titipan-status-line[^>]*>Pokok Rp 11 jt, terpakai Rp 11,05 jt, kelebihan Rp 50 rb</);
  assert.match(html, /Pokok Dikomit/);
});
test('ringkasan pool: satu kalimat + "Rincian angka" berisi label lama', () => {
  const ctx = loadSource(['modules/finance/dana-titipan-portfolio-render.js'], {
    escapeHtml: (x) => String(x),
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID'),
    DanaTitipanPoolAPI: { status: () => 'OK', poolMasukTotal: () => 20000000, sisaAlokasi: () => 5000000, overAllocatedAmount: () => 0 },
  }, ['DanaTitipanPortfolioPresenter']);
  const html = ctx.DanaTitipanPortfolioPresenter._poolSummaryHtml(15000000);
  assert.match(html, /titipan-pool-sentence[^>]*>Masuk Rp 20 jt, dialokasikan Rp 15 jt, sisa Rp 5 jt</);
  assert.match(html, /<summary[^>]*>Rincian angka<\/summary>/);
  assert.match(html, /Sudah Dialokasikan/);
  assert.match(html, /Belum Dialokasikan/);
});
test('CSS HP: header tabel disembunyikan & baris blok; tabel pemilik punya kelas', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*640px\)\s*\{[^@]*\.titipan-owner-tbl thead\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(fs.readFileSync('modules/finance/dana-titipan-portfolio-render.js', 'utf8'), /class="tx-tbl titipan-owner-tbl"/);
});

// ---------- form pengeluaran ----------
function form({ build, owners, accounts, resolver }) {
  const accEl = { value: '', innerHTML: '', addEventListener() {} };
  const els = { titipanExpenseAcc: accEl };
  const ctx = loadSource(['modules/finance/titipan-expense-ui.js'], {
    D: { accounts: accounts || [], transactions: [] },
    escapeHtml: (x) => String(x),
    resolveOwnerDefaultForAccount: resolver,
    TitipanExpenseFlow: {},
    DanaTitipanPortfolioAPI: { listExistingOwners: () => owners, build },
    document: { getElementById: (id) => els[id] || null },
  });
  return { ui: ctx.TitipanExpenseUI, accEl };
}
const OWNERS = [{ ownerId: 'o1', ownerName: 'renov' }, { ownerId: 'o2', ownerName: 'mas sihab' }, { ownerId: 'o3', ownerName: 'Aku' }];
const ACCS = [{ id: 'cash', name: 'Cash' }, { id: 'bri', name: 'BRI' }, { id: 'bca', name: 'BCA' }];
const RES = (id) => ({ ok: true, owners: id === 'bri' ? [{ ownerId: 'o1' }] : id === 'bca' ? [{ ownerId: 'o2' }] : [{ ownerId: 'SELF' }] });

test('daftar pemilik hanya yang punya kartu nyata', () => {
  const { ui } = form({ build: () => ({ owners: [{ ownerId: 'o1' }, { ownerId: 'o2' }] }), owners: OWNERS, accounts: ACCS, resolver: RES });
  ui.open();
  assert.deepEqual(ui._draft.map((o) => o.ownerName), ['renov', 'mas sihab']);
});
test('build() gagal -> daftar penuh (perilaku lama)', () => {
  const { ui } = form({ build: () => { throw new Error('x'); }, owners: OWNERS, accounts: ACCS, resolver: RES });
  ui.open();
  assert.equal(ui._draft.length, 3);
  assert.ok(ui._draft.every((o) => !o.selected));
});
test('satu pemilik -> otomatis tercentang & akun pindah ke akun miliknya', () => {
  const { ui, accEl } = form({ build: () => ({ owners: [{ ownerId: 'o1' }] }), owners: OWNERS, accounts: ACCS, resolver: RES });
  ui.open();
  assert.equal(ui._draft.length, 1);
  assert.equal(ui._draft[0].selected, true);
  assert.equal(accEl.value, 'bri');
});
test('centang pemilik -> akun ikut; akun dipilih manual tidak ditimpa', () => {
  const { ui, accEl } = form({ build: () => ({ owners: [{ ownerId: 'o1' }, { ownerId: 'o2' }] }), owners: OWNERS, accounts: ACCS, resolver: RES });
  ui.open();
  ui.toggleOwner(1, true);
  assert.equal(accEl.value, 'bca');
  ui.toggleOwner(1, false);
  ui.onAccountPick();
  accEl.value = 'cash';
  ui.toggleOwner(0, true);
  assert.equal(accEl.value, 'cash');
});
test('dua pemilik tercentang -> akun tidak diubah; tanpa akun milik -> akun dibiarkan', () => {
  const { ui, accEl } = form({ build: () => ({ owners: [{ ownerId: 'o1' }, { ownerId: 'o2' }] }), owners: OWNERS, accounts: ACCS, resolver: RES });
  ui.open();
  ui.toggleOwner(0, true);
  assert.equal(accEl.value, 'bri');
  ui.toggleOwner(1, true);
  assert.equal(accEl.value, 'bri');
  const f2 = form({ build: () => ({ owners: [{ ownerId: 'o3' }] }), owners: OWNERS, accounts: ACCS, resolver: RES });
  f2.ui.open();
  assert.equal(f2.accEl.value, 'cash');
});
test('konfirmasi "Tetap Simpan" masih ada di save()', () => {
  assert.match(fs.readFileSync('modules/finance/titipan-expense-ui.js', 'utf8'), /Tetap simpan\?/);
});
