'use strict';
// tests/pajak-pbb-zakat-aibus-emit-sesi-c.test.js — Sesi C-lanjutan
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 / AUDIT-SESI-C-EVENTBUS-
// D-WRITES-NO-EMIT.md, Prioritas Sedang "Zakat/PBB, 9 titik save()"):
// dari 9 titik save() di pajak-pbb-zakat.js, HANYA 3 yang benar2 aksi
// diskrit/relevan lintas-modul (create/edit/delete data finansial nyata)
// yang ditambah emit sesi ini -- REPLIKASI pola finance.updated yang sudah
// ada (kind:"tagihan" persis skema tagihan-kalender.js, kind:"zakat" BARU
// tapi payload-nya konsisten skema kind yang sudah ada):
//
// - PBB.ikatTagihan(): create tagihan PBB baru & update tagihan existing
//   -> finance.updated {kind:"tagihan",action,billId,amount,source:"pbb"}
// - Zakat.catatDibayar(): create log+transaksi zakat
//   -> finance.updated {kind:"zakat",action:"create",jenis,amount}
// - Zakat.delLog(): hapus log zakat
//   -> finance.updated {kind:"zakat",action:"delete",deletedId}
//
// SENGAJA TIDAK disentuh (6 titik save() sisa) -- semua dipanggil
// berulang tiap render/kalkulasi (bukan aksi diskrit user), emit di sini
// beresiko SPAM event tiap kali angka di-render ulang:
// PBB.hitung(), Zakat.hitungMaal(), Zakat.hitungPenghasilan() (baca-saja,
// malah 0 save()), RefAI.check() (refCheckedAt timestamp), RefAI.
// applySelected() (borderline -- ditinjau ulang sesi lain kalau perlu),
// PPh21.hitung().
//
// Harness: reuse pola makeD()/makeDoc()/autoEl() dari
// tests/pajak-pbb-zakat-crud.test.js, + AIBus event collector.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop === 'matches') return () => false;
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
function makeDoc(predefined = {}) {
  return {
    getElementById: (id) => (id in predefined ? predefined[id] : autoEl()),
    querySelectorAll: () => [],
  };
}
function parsePzNum(v) {
  if (v === null || v === undefined) return 0;
  const str = String(v);
  const negative = /-/.test(str);
  const digits = str.replace(/[^0-9]/g, '');
  const n = Number(digits);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
}
function makeD(overrides = {}) {
  return Object.assign(
    {
      assets: [], bills: [], accounts: [{ id: 'a1', name: 'Cash' }],
      transactions: [], cobek: [],
      profile: { apiKey: 'k', apiProvider: 'claude' },
      pajakZakat: {
        pbb: { njoptkp: 5000000, tarifPersen: 0.2 },
        nisabPenghasilanBulan: 5000000, hargaEmasPerGram: 1000000,
        zakatFitrahPerJiwa: 45000, zakatLog: [], utangJT: 0,
        haulMaalMulai: null, pphBrutoBulan: 0, pphIuranBulan: 0,
      },
    },
    overrides,
  );
}

function makeCtx({ document, D, extra }) {
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/finance/pajak-pbb-zakat.js'],
    Object.assign({
      document, D,
      uid: (() => { let n = 1; return () => 'pz' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + n,
      fmtFull: (n) => 'RpFull' + n,
      parsePzNum,
      save() {},
      toast() {},
      askConfirm: async () => true,
      openModal() {}, closeModal() {},
      refreshBillEverywhere() {}, renderDashboard() {}, renderKeuangan() {},
      renderPajakZakat() {}, renderRefCheckReminder() {}, renderKekayaanBersih() {},
      totalSaldoAkun: () => 1000000, totalPiutangValue: () => 0,
      totalDebtValue: () => 0, totalCicilanOutstanding: () => 0,
      todayStr: () => '2026-08-01',
      aiErrorHint: () => '', callAIProviderRaw: async () => ({ ok: true, text: '{}' }),
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
    }, extra || {}),
    ['PBB', 'Zakat', 'RefAI', 'PajakUMKM', 'PPh21'],
  );
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

test('PBB.ikatTagihan() — buat tagihan PBB baru emit finance.updated {kind:"tagihan",action:"create",source:"pbb"}', () => {
  const D = makeD();
  const els = { pbbTerutang: { textContent: 'RpFull280000' }, pbbJatuhTempo: { value: '2027-03-01' } };
  const ctx = makeCtx({ document: makeDoc(els), D });

  ctx.PBB.ikatTagihan();

  assert.equal(D.bills.length, 1, '0 regresi: tagihan tetap dibuat seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil saat tagihan PBB dibuat');
  assert.equal(ev.payload.kind, 'tagihan');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.source, 'pbb');
  assert.equal(ev.payload.billId, D.bills[0].id);
});

test('PBB.ikatTagihan() — update tagihan PBB existing emit finance.updated {action:"edit"}', () => {
  const D = makeD({ bills: [{ id: 'bill_1', pbbLink: true, amount: 100000, nextDue: '2026-03-01', freq: 'tahunan', name: 'PBB' }] });
  const els = { pbbTerutang: { textContent: 'RpFull280000' }, pbbJatuhTempo: { value: '2027-03-01' } };
  const ctx = makeCtx({ document: makeDoc(els), D });

  ctx.PBB.ikatTagihan();

  assert.equal(D.bills[0].amount, 280000, '0 regresi: nominal tetap ter-update seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil saat tagihan PBB diupdate');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.billId, 'bill_1');
});

test('Zakat.catatDibayar() — catat zakat dibayar emit finance.updated {kind:"zakat",action:"create"}', async () => {
  const D = makeD();
  const els = { zpJumlah: { textContent: 'RpFull125000' } };
  const ctx = makeCtx({ document: makeDoc(els), D });

  await ctx.Zakat.catatDibayar('penghasilan');

  assert.equal(D.pajakZakat.zakatLog.length, 1, '0 regresi: log zakat tetap tercatat seperti sebelumnya');
  assert.equal(D.transactions.length, 1, '0 regresi: transaksi pengeluaran tetap tercatat seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil saat zakat dicatat');
  assert.equal(ev.payload.kind, 'zakat');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.jenis, 'penghasilan');
});

test('Zakat.delLog() — hapus log zakat emit finance.updated {kind:"zakat",action:"delete",deletedId}', async () => {
  const D = makeD({ pajakZakat: Object.assign(makeD().pajakZakat, { zakatLog: [{ id: 'zl_1', jenis: 'maal', tanggal: '2026-01-01', jumlah: 50000 }] }) });
  const ctx = makeCtx({ document: makeDoc(), D });

  await ctx.Zakat.delLog('zl_1');

  assert.equal(D.pajakZakat.zakatLog.length, 0, '0 regresi: log tetap terhapus seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil saat log zakat dihapus');
  assert.equal(ev.payload.kind, 'zakat');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'zl_1');
});

test('AIBus tidak ada (typeof AIBus==="undefined") — 3 fungsi tetap tidak throw (guard konsisten pola lama)', async () => {
  const D = makeD();
  const els = { pbbTerutang: { textContent: 'RpFull1000' }, pbbJatuhTempo: { value: '2027-01-01' }, zpJumlah: { textContent: 'RpFull1000' } };
  const ctx = makeCtx({ document: makeDoc(els), D, extra: { AIBus: undefined } });

  assert.doesNotThrow(() => ctx.PBB.ikatTagihan());
  await assert.doesNotReject(async () => { await ctx.Zakat.catatDibayar('penghasilan'); });
});
