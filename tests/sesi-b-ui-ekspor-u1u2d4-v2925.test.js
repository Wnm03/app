'use strict';
/**
 * Sesi B (audit browser v2925): U1 tombol Excel Laporan Shop, U2 opsi "— Pilih akun —" pada
 * sinkron arus kas piutang/utang, D4 kolom penanda catatan-saja/aliran-klien pada CSV Laporan.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');
const read = (f) => fs.readFileSync(f, 'utf8');

test('U1: tab Laporan Shop punya tombol Excel yang memanggil exportLaporanShopXLSX', () => {
  for (const file of ['index.html', 'app_production.html']) {
    const html = read(file);
    const a = html.indexOf('id="shopTab-laporan"');
    const b = html.indexOf('id="shopTab-', a + 10);
    const seg = html.slice(a, b > 0 ? b : a + 20000);
    assert.match(seg, /data-action="exportLaporanShopXLSX"/, file);
    assert.match(html, /id="shopLaporanFab" aria-hidden="true" inert/, file + ': FAB lama tetap pensiun');
  }
  assert.match(read('modules/shop/cobek-io.js'), /function exportLaporanShopXLSX\(\)\{return ShopExport\.exportLaporan\(\);\}/);
});

test('U2: dropdown akun sinkron diawali "— Pilih akun —" bernilai kosong sehingga guard terjangkau', () => {
  const src = read('modules/finance/piutang-utang.js');
  const i = src.indexOf('function populateSyncTxAccSelect');
  const body = src.slice(i, src.indexOf('}\n', i) + 1);
  const el = { innerHTML: '' };
  const ctx = loadSource([], { D: { accounts: [{ id: 'acc_cash', emoji: '💵', name: 'Cash' }, { id: 'a2', emoji: '🏦', name: 'BCA' }] },
    escapeHtml: (s) => String(s), document: { getElementById: () => el } });
  new (require('vm').Script)(body + ';globalThis.__f=populateSyncTxAccSelect;').runInContext(ctx);
  ctx.__f('x');
  assert.match(el.innerHTML, /^<option value="">— Pilih akun —<\/option>/);
  assert.equal((el.innerHTML.match(/<option /g) || []).length, 3);
  assert.match(src, /if\(doSyncTx&&!syncTxAcc\)\{toast\('⚠️ Pilih Akun dulu/);
  assert.match(src, /if\(dDoSyncTx&&!dSyncTxAcc\)\{toast\('⚠️ Pilih Akun dulu/);
});

function csvCtx(txs) {
  let captured = '';
  const ctx = loadSource(['modules/shared/backup-restore.js'], {
    D: { transactions: txs, accounts: [{ id: 'acc_cash', name: 'Cash' }] },
    getRange: () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31') }),
    uid: () => 'u1', getLaporanFilters: () => ({}), txMatchesFilters: () => true,
    isAliranKlienSafe: (t) => t.aliran === true,
    Blob: class { constructor(p) { captured = p.join(''); } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
  }, ['exportCSV', 'parseCSVImport']);
  return { ctx, get csv() { return captured; } };
}

test('D4: CSV Laporan menambah kolom Hitung Kas & Aliran Klien di akhir; kolom lama tidak bergeser', () => {
  const h = csvCtx([
    { id: 't1', date: '2026-11-01', type: 'expense', category: 'Makan', amount: 5000, accountId: 'acc_cash' },
    { id: 't2', date: '2026-11-02', type: 'expense', category: 'Makan', amount: 7000, accountId: 'acc_cash', hitungKas: false },
    { id: 't3', date: '2026-11-03', type: 'income', category: 'Gaji', amount: 9000, accountId: 'acc_cash', aliran: true },
  ]);
  h.ctx.exportCSV();
  const lines = h.csv.split('\n');
  const head = lines[0].split(',');
  assert.deepEqual(head.slice(-3), ['Import Idempotency Key', 'Hitung Kas', 'Aliran Klien']);
  assert.equal(head.indexOf('Transaction ID'), 10);
  assert.deepEqual(lines[1].split(',').slice(-2), ['Ya', 'Tidak']);
  assert.deepEqual(lines[2].split(',').slice(-2), ['Tidak', 'Tidak']);
  assert.deepEqual(lines[3].split(',').slice(-2), ['Ya', 'Ya']);
});

test('D4: CSV hasil ekspor tetap bisa diimpor (kolom baru tidak merusak parser)', () => {
  const h = csvCtx([{ id: 't1', date: '2026-11-01', type: 'expense', category: 'Makan', amount: 5000, accountId: 'acc_cash', note: 'nasi' }]);
  h.ctx.exportCSV();
  const rows = h.ctx.parseCSVImport(h.csv, 'generic');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 5000);
  assert.equal(rows[0].type, 'expense');
  assert.equal(rows[0].category, 'Makan');
  assert.equal(rows[0].note, 'nasi');
  assert.equal(rows[0].accountId, 'acc_cash');
});
