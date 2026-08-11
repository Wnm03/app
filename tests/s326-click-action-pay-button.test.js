'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');

// S326 introduced a `billActionPayNow` wrapper around markBillPaid(id,false) and asserted
// the render layer must use it. S328 found that substitution caused the Bayar/Riwayat
// buttons to go unresponsive when the bundle hadn't been rebuilt, and reverted the render
// mapping back to the native `markBillPaid`/`openBillHistory` handlers. The wrapper was
// left behind as dead code (never referenced by any render path) with a test that
// contradicted the S328 fix -- asserting the wrapper's presence while S328 asserted its
// absence from render. Removed the wrapper and the stale S326 assertions here; S328 below
// is now the single source of truth for this click path.

test('S328 — Bayar dan Riwayat memakai handler native yang sudah ada', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'modules-render.js'), 'utf8');
  assert.match(src, /data-action=["']markBillPaid["']/,
    'Aksi Bayar harus tetap menuju markBillPaid');
  assert.match(src, /data-action=["']openBillHistory["']/,
    'Aksi Riwayat harus tetap menuju openBillHistory');
});

test('S328 — billActionPayNow (wrapper S326 yang menyebabkan regresi) tidak lagi ada', () => {
  const wrappers = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'action-wrappers.js'), 'utf8');
  assert.doesNotMatch(wrappers, /function billActionPayNow/,
    'Wrapper mati peninggalan S326 harus sudah dihapus, bukan cuma tidak dipakai');
});
