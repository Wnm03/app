'use strict';
// S2834 — import memperingatkan tanggal tidak wajar pada konfirmasi (tanpa mengubah/membuang data).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function ctx() {
  return loadSource(['modules/finance/transaksi-b.js', 'modules/shared/backup-restore.js'], { D: { transactions: [], accounts: [] } }, ['_importImplausibleDateNote', 'isTxDateImplausible']);
}

test('S2834: baris wajar -> tanpa catatan; tanggal masa depan jauh / <2000 -> catatan dengan jumlah & contoh', () => {
  const c = ctx();
  const y = new Date().getFullYear();
  assert.equal(c._importImplausibleDateNote([{ date: `${y}-01-05` }, { date: `${y - 1}-12-31` }, { date: '' }, { date: 'bukan-tanggal' }]), '');
  const far = `${y + 5}-03-01`;
  const note = c._importImplausibleDateNote([{ date: far }, { date: '1999-12-31' }, { date: `${y}-02-01` }]);
  assert.match(note, /2 transaksi bertanggal tidak wajar/);
  assert.ok(note.includes(far) && note.includes('1999-12-31'));
  assert.equal(c._importImplausibleDateNote(null), '');
});

test('S2834: sumber — catatan ditambahkan ke konfirmasi, bukan menolak/membuang baris', () => {
  const s = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  const i = s.indexOf('confirmMsg+=_importImplausibleDateNote(imported);');
  const j = s.indexOf("const confirmed=await askConfirm(confirmMsg,{danger:false,okText:'Ya, Import'");
  assert.ok(i > 0 && j > i && j - i < 120);
  assert.doesNotMatch(s.slice(s.indexOf('function _importImplausibleDateNote'), s.indexOf('function handleImport')), /splice|filter\(r=>!/);
});
