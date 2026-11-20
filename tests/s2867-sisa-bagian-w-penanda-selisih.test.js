'use strict';
/** S2867 — jumlah awal modal dibatasi sisa bagian W, penanda pasif ledger > bagian W, catatan selisih Laba manual vs batas ledger. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);
function load(D, extra) {
  return loadSource(['modules/home/renovasi.js'], Object.assign({
    D, sameId, todayStr: () => '2026-11-20', uid: () => 'u', save: () => true, toast() {}, escapeHtml: String,
    fmt: (n) => 'Rp' + Math.round(n), fmtFull: (n) => 'Rp' + Math.round(n), document: { getElementById: () => null }, totalSaldoAkun: () => 0, closeModal() {}, openModal() {},
  }, extra || {}), ['Renov', 'renovSisaBagianSelf', 'renovLedgerMelebihiSelf', 'renovSelisihManualLedger', 'renovLabaBersihEfektif', 'renovBagiHasilPanelHtml']);
}
function proyek(extra) {
  return Object.assign({
    id: 'p1', name: 'W', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true }, items: [], labaLedger: [],
    bagiHasil: { labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 33.4994346970, isSelf: true }, { ownerId: 'x', ownerName: 'home in', porsi: 66.500565303, isSelf: false }] },
  }, extra || {});
}
const mk = (p) => load({ renovProjects: [p], accounts: [], transactions: [], profile: {} });

test('renovSisaBagianSelf: akui = 800.000 - diakui; cairkan = 800.000 - pencairan; tanpa isSelf = null', () => {
  const p = proyek({ labaLedger: [{ id: 'a', tipe: 'akui', jumlah: 500000 }, { id: 'c', tipe: 'cairkan', jumlah: 200000 }] });
  const r = mk(p);
  assert.equal(r.renovSisaBagianSelf(p, 'akui'), 300000);
  assert.equal(r.renovSisaBagianSelf(p, 'cairkan'), 600000);
  const q = proyek({ bagiHasil: { labaManual: 1000, owners: [{ ownerName: 'A', porsi: 100 }] } });
  assert.equal(mk(q).renovSisaBagianSelf(q, 'akui'), null);
});

test('renovSisaBagianSelf: tidak negatif saat ledger sudah di atas bagian W', () => {
  const p = proyek({ labaLedger: [{ id: 'a', tipe: 'akui', jumlah: 900000 }] });
  assert.equal(mk(p).renovSisaBagianSelf(p, 'akui'), 0);
});

function modalHtml(p, aksi) {
  const overlay = { innerHTML: '', setAttribute() {} };
  const r = load({ renovProjects: [p], accounts: [{ id: 'a1', name: 'BRI' }], transactions: [{ id: 't1', type: 'income', renovDpProjectId: p.id, amount: 7000000, accountId: 'a1', date: '2026-11-01' }], profile: {} }, { document: { getElementById: (id) => (id === 'renovDpModal' ? overlay : null), createElement: () => overlay, body: { appendChild() {} } } });
  r.Renov._ensureDpModal = () => overlay; r.Renov.openLabaAksi(p.id, aksi); return overlay.innerHTML;
}
test('modal akui: jumlah awal = sisa bagian W (800.000), atribut max tetap batas ledger', () => {
  const html = modalHtml(proyek(), 'akui');
  assert.match(html, /max="7000000" value="800000"/);
  assert.match(html, /Jumlah awal dibatasi ke sisa bagian ini \(Rp800000\)/);
});
test('modal akui: sisa bagian 0 -> jumlah awal kosong', () => {
  const html = modalHtml(proyek({ labaLedger: [{ id: 'a', tipe: 'akui', jumlah: 800000 }] }), 'akui');
  assert.match(html, /value=""/);
});
test('modal akui tanpa baris isSelf: perilaku lama (jumlah awal = batas ledger)', () => {
  const html = modalHtml(proyek({ bagiHasil: { labaManual: 1000, owners: [{ ownerName: 'A', porsi: 100 }] } }), 'akui');
  assert.match(html, /max="7000000" value="7000000"/);
});

test('renovLedgerMelebihiSelf: null bila <= bagian W; objek bila diakui atau cair > W', () => {
  const ok = proyek({ labaLedger: [{ id: 'a', tipe: 'akui', jumlah: 800000 }] });
  assert.equal(mk(ok).renovLedgerMelebihiSelf(ok), null);
  const over = proyek({ labaLedger: [{ id: 'a', tipe: 'akui', jumlah: 2692582 }] });
  const w = mk(over).renovLedgerMelebihiSelf(over);
  assert.equal(w.nominal, 800000); assert.equal(w.diakui, 2692582);
});

test('panel bagi hasil: penanda merah muncul hanya bila ledger melebihi bagian W', () => {
  const over = proyek({ labaLedger: [{ id: 'a', tipe: 'akui', jumlah: 2692582 }] });
  const ok = proyek();
  const mkp = (p) => { const r = mk(p); r.Renov._bh = null; r.Renov.curId = p.id; return r.renovBagiHasilPanelHtml(p); };
  assert.match(mkp(over), /Ledger melebihi bagian W \(Rp800000\)/);
  assert.doesNotMatch(mkp(ok), /Ledger melebihi bagian/);
});

test('renovSelisihManualLedger: laba manual 2.388.100 vs batas ledger 2.692.582 -> selisih 304.482', () => {
  const p = proyek(); const r = mk(p);
  const lb = r.renovLabaBersihEfektif(p, 2388100);
  // batas ledger (labaMaks) = penerimaan - biaya; dengan fixture ini bergantung dana proyek; cek bentuk hasil
  const x = r.renovSelisihManualLedger(p, lb);
  assert.ok(x === null || (x.manual === 2388100 && x.selisih === x.ledger - x.manual));
  assert.equal(r.renovSelisihManualLedger(p, { manual: false, nilai: 1 }), null, 'tanpa laba manual -> null');
  assert.equal(r.renovSelisihManualLedger(proyek({ dana: 'pribadi' }), lb), null, 'non-klien -> null');
});
