'use strict';
/**
 * Regression test s325: Edit cicilan tanpa transaksi billLinkId tidak boleh
 * berhenti di toast "Riwayat pembayaran ... tidak ditemukan".
 *
 * Konteks: data lama / transaksi manual dapat membuat cicilan aktif tidak punya
 * transaksi tertaut. Dalam kondisi itu openBillModal() harus jatuh ke editor
 * tagihan generik, bukan dead-end return.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'modules', 'finance', 'tagihan-kalender.js'), 'utf8');

test('s325 — cicilan tanpa linked payment tidak dead-end di toast error', () => {
  assert.match(
    SRC,
    /if\(b\.kind==='cicilan'&&!cicilanBelumPernahDibayar\)\{[\s\S]*?Biarkan flow jatuh ke modal generik[\s\S]*?\}/,
    'guard fallback cicilan s325 tidak ditemukan'
  );
  assert.doesNotMatch(
    SRC,
    /if\(b\.kind==='cicilan'&&!cicilanBelumPernahDibayar\)\{\s*toast\([^\n]+Riwayat pembayaran cicilan[\s\S]*?return;/,
    'guard lama masih membuat dead-end toast + return'
  );
});
