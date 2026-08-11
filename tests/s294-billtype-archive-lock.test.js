'use strict';
/**
 * s294-billtype-archive-lock.test.js — Sesi 294: kunci toggle Tagihan/
 * Langganan di modal generik (billModal) saat edit tagihan cicilan/utang
 * yang sudah diarsipkan (modules/finance/tagihan-kalender.js).
 *
 * Ini "Catatan kecil (belum dikerjakan)" dari FIX-v953-s293-billpaid-
 * doublepay-guard.md yang sengaja ditunda sesi lalu (aturan "1 prioritas
 * per sesi").
 *
 * Bug: openBillModal() manggil setBillType(b.kind) saat edit tagihan
 * cicilan/utang yang diarsipkan (billEditFromArchive) supaya curBillType
 * kebentuk benar -- tapi toggle di modal ini cuma py 2 opsi (Tagihan/
 * Langganan), TIDAK ADA indikator visual utk cicilan/utang. Klik salah
 * satu tombol itu (kelihatan valid krn tidak ada yg nyala "active") diam-
 * diam ganti curBillType jadi 'tagihan'/'langganan' -> _saveBillInner()
 * nyimpen kind yg salah ke record arsip.
 *
 * Fix: setBillType() sekarang mengunci (disabled) toggle Tagihan/Langganan
 * kalau kind yang di-render adalah 'cicilan'/'utang', dgn hint teks
 * penjelasan -- tombol disabled tidak bisa trigger data-action sama
 * sekali, jadi curBillType TIDAK BISA ke-timpa lewat toggle itu.
 *
 * Test ini fokus ke isBillTypeLocked() -- fungsi murni (tidak baca/tulis
 * DOM) yang dipisah khusus supaya bisa dites tanpa DOM lewat loadSource()
 * (lihat tests/helpers/loadSource.js). Wiring DOM di setBillType()
 * (disabled attribute, hint text) SENGAJA TIDAK dites di sini sesuai
 * batasan loadSource.js, cukup diverifikasi manual/smoke-test -- pola sama
 * tests/worthit-jenis.test.js & tests/vehicle-jenis.test.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/finance/tagihan-kalender.js'], {}, ['isBillTypeLocked']);
}

test('isBillTypeLocked("cicilan") -> true (toggle harus dikunci)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.isBillTypeLocked('cicilan'), true);
});

test('isBillTypeLocked("utang") -> true (toggle harus dikunci)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.isBillTypeLocked('utang'), true);
});

test('isBillTypeLocked("tagihan") -> false (toggle tetap aktif seperti biasa)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.isBillTypeLocked('tagihan'), false);
});

test('isBillTypeLocked("langganan") -> false (toggle tetap aktif seperti biasa)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.isBillTypeLocked('langganan'), false);
});

test('isBillTypeLocked() -> false untuk kind tak dikenal/kosong (fail-safe, bukan nge-lock diam-diam)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.isBillTypeLocked(undefined), false);
  assert.equal(ctx.isBillTypeLocked(''), false);
  assert.equal(ctx.isBillTypeLocked('lainnya'), false);
});
