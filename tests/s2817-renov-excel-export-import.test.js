'use strict';
// S2817 — Export/Import Excel proyek Renovasi (layout sheet REKAP). Pustaka SheetJS di-stub: yang diuji
// adalah pembangun/pembaca baris (murni) dan alur tombol; fixture = sheet REKAP asli RAB_2_panel_final_update_v18.xlsx.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');
const AOA = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 's2817-rekap-aoa.json'), 'utf8'));

function mk(D, extra) {
  const calls = [];
  let n = 0;
  const ctx = loadSource(['modules/home/renovasi.js'], Object.assign({
    D, sameId: (a, b) => String(a) === String(b), escapeHtml: s => String(s), fmt: x => String(x), fmtFull: x => String(x),
    toast: m => calls.push(m), save: () => true, uid: () => 'n' + (++n), askConfirm: async () => true,
  }, extra || {}), ['Renov']);
  return { ctx, calls };
}
const plain = rows => rows.map(r => r.map(c => (c && typeof c === 'object' && 'v' in c) ? c.v : c));

test('S2817 import: sheet REKAP asli terbaca per kategori, harga 0 dilewati, berhenti sebelum TOTAL JMLH/DIVIDEN', () => {
  const { ctx } = mk({ renovProjects: [], transactions: [], accounts: [] });
  const r = ctx.Renov._xlsxParse(AOA, []);
  assert.equal(r.ok, true);
  assert.equal(r.valid.length, 13); // S2818: baris PROFIT bukan item biaya
  assert.equal(r.zero, 7);
  assert.equal(r.invalid.length, 0);
  assert.ok(!r.valid.some(i => /AGUNG|SIHAB|WISNU|HJK/i.test(i.name)), 'baris dividen/HJK tidak boleh ikut');
  assert.equal(r.valid.filter(i => i.grup === 'BAHAN').length, 9);
  assert.equal(JSON.stringify([...new Set(r.valid.map(i => i.grup))]), JSON.stringify(['BAHAN', 'BAUT,LISTRIK,DLL', 'JASA']));
  assert.ok(r.meta.hjk > 0, 'HJK terbaca sebagai nilai kontrak: ' + r.meta.hjk);
  assert.equal(r.meta.lokasi, 'MAGELANG');
  const wpc = r.valid[0];
  assert.equal(wpc.harga, 1200000); assert.equal(wpc.qty, 12); assert.equal(wpc.hargaSatuan, 100000);
  const fisher = r.valid.find(i => /FISHER/.test(i.name));
  assert.equal(fisher.harga, 33080, 'desimal Excel dibulatkan ke rupiah (S2818 F3)');
  const sum = r.valid.reduce((s, i) => s + i.harga, 0);
  assert.ok(Math.abs(sum - 5327664.4) < 15, 'biaya riil tanpa PROFIT, dapat ' + sum);
  assert.ok(r.valid.every(i => Number.isInteger(i.harga)), 'semua nominal bulat');
  assert.ok(r.meta.profit > 970000 && r.meta.profit < 971000, 'PROFIT masuk meta: ' + r.meta.profit);
  assert.ok(r.valid.every(i => i.category === 'Renovasi'), 'kategori item valid untuk Keuangan');
});

test('S2817 import: duplikat terhadap item yang sudah ada dilewati; header hilang ditolak', () => {
  const { ctx } = mk({ renovProjects: [], transactions: [], accounts: [] });
  const first = ctx.Renov._xlsxParse(AOA, []).valid;
  const again = ctx.Renov._xlsxParse(AOA, first);
  assert.equal(again.valid.length, 0);
  assert.equal(again.invalid.length, 13);
  const bad = ctx.Renov._xlsxParse([['a', 'b'], [1, 2]], []);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /Header/);
  assert.equal(ctx.Renov._xlsxParse([['Item', 'Harga'], ['Semen', -5], ['Pasir', 'abc'], ['Cat', '1.250.000']], []).valid.length, 1);
});

test('S2817 export->import bolak-balik: item, kategori dan total tetap, hanya proyek ini', () => {
  const D = { renovProjects: [
    { id: 1, name: 'Dapur', klien: 'Pak A', lokasi: 'Magelang', rab: 5000000, createdAt: '2026-07-07', items: [
      { id: 'a', name: 'Keramik', category: 'Bahan', harga: 1500000, qty: 30, hargaSatuan: 50000, paid: false },
      { id: 'b', name: 'Tukang', category: 'Jasa', harga: 800000, paid: true, txId: 't1', paidDate: '2026-07-10' },
    ] },
    { id: 2, name: 'Rahasia', items: [{ id: 'x', name: 'Tidak boleh ikut', harga: 999, category: 'Bahan' }] },
  ], transactions: [{ id: 'dp1', type: 'income', amount: 2000000, renovDpProjectId: 1, renovDpKind: 'dp', date: '2026-07-01', accountId: 'a1' }], accounts: [{ id: 'a1', name: 'BCA' }] };
  const { ctx } = mk(D);
  const sheets = ctx.Renov._xlsxBuild(D.renovProjects[0]);
  assert.equal(JSON.stringify(sheets.map(s => s.name)), JSON.stringify(['REKAP', 'Ringkasan', 'DP-Termin', 'Cicilan']));
  const rek = sheets[0].rows;
  assert.ok(JSON.stringify(rek).includes('"JUMLAH HARGA"'));
  assert.ok(!JSON.stringify(sheets).includes('Rahasia'));
  assert.equal(JSON.stringify(rek.find(r => r[0] === 'LOKASI')), JSON.stringify(['LOKASI', '', 'Magelang']));
  const hasFormula = rek.some(r => r.some(c => c && typeof c === 'object' && /^\(D\d+\*E\d+\)\+F\d+$/.test(c.f || '')));
  assert.ok(hasFormula, 'JUMLAH HARGA memakai rumus seperti file contoh');
  const back = ctx.Renov._xlsxParse(plain(rek), []);
  assert.equal(back.ok, true);
  assert.equal(JSON.stringify(back.valid.map(i => [i.name, i.grup, i.harga])), JSON.stringify([['Keramik', 'BAHAN', 1500000], ['Tukang', 'JASA', 800000]]));
  assert.equal(back.valid[0].qty, 30);
  const ring = plain(sheets[1].rows);
  assert.equal(JSON.stringify(ring.find(r => r[0] === 'Terbayar')), JSON.stringify(['Terbayar', 800000]));
  assert.equal(JSON.stringify(ring.find(r => r[0] === 'DP + Termin Masuk')), JSON.stringify(['DP + Termin Masuk', 2000000]));
  assert.equal(sheets[2].rows[1][3], 'BCA');
});

test('S2817 alur tombol: exportXLSX menulis file; importXLSX konfirmasi, simpan, dan rollback bila simpan gagal', async () => {
  let written = null; const sheetsOut = [];
  const XLSX = {
    utils: { book_new: () => ({ s: [] }), aoa_to_sheet: rows => ({ rows }), book_append_sheet: (wb, ws, n) => { wb.s.push(n); sheetsOut.push(n); },
      sheet_to_json: () => AOA },
    writeFile: (wb, name) => { written = name; },
    read: () => ({ SheetNames: ['Harga Bahan', 'REKAP'], Sheets: { REKAP: {} } }),
  };
  const files = [];
  const input = { files, style: {}, addEventListener(t, fn) { if (t === 'change') input._chg = fn; }, click() { input._chg(); }, remove() {} };
  const document = { createElement: () => input, body: { appendChild() {} } };
  const D = { renovProjects: [{ id: 1, name: 'Panel TV!', items: [] }], transactions: [], accounts: [] };
  const { ctx, calls } = mk(D, { XLSX, document });
  ctx.Renov.render = () => {}; ctx.Renov.renderDetail = () => {};
  assert.equal(await ctx.Renov.exportXLSX(1), true);
  assert.equal(written, 'renovasi-panel-tv.xlsx');
  assert.equal(sheetsOut.length, 4);
  files.push({ size: 100, arrayBuffer: async () => new ArrayBuffer(8) });
  await ctx.Renov.importXLSX(1); await new Promise(r => setTimeout(r, 20));
  assert.equal(D.renovProjects[0].items.length, 13);
  assert.match(calls.join('|'), /13 item rencana berhasil diimpor dari Excel/);
  // simpan gagal -> dikembalikan
  const D2 = { renovProjects: [{ id: 1, name: 'P', items: [] }], transactions: [], accounts: [] };
  const m2 = mk(D2, { XLSX, document, save: () => false });
  m2.ctx.Renov.render = () => {};
  await m2.ctx.Renov.importXLSX(1); await new Promise(r => setTimeout(r, 20));
  assert.equal(D2.renovProjects[0].items.length, 0);
  assert.match(m2.calls.join('|'), /dibatalkan karena penyimpanan gagal/);
});

test('S2817 tombol Export Excel / Import Excel ada di detail proyek', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'home', 'renovasi.js'), 'utf8');
  assert.match(src, /data-action="Renov\.exportXLSX"/);
  assert.match(src, /data-action="Renov\.importXLSX"/);
});

test('S2817 importXLSX: sheet bukan REKAP dilewati sampai ketemu yang bisa dibaca; RAB kosong diisi HJK, RAB terisi tidak ditimpa', async () => {
  const mkXlsx = (sheetsMap) => ({ utils: { sheet_to_json: (ws) => ws.aoa }, read: () => ({ SheetNames: Object.keys(sheetsMap), Sheets: Object.fromEntries(Object.entries(sheetsMap).map(([k, v]) => [k, { aoa: v }])) }), writeFile() {} });
  const run = async (rab) => {
    const files = [{ size: 10, arrayBuffer: async () => new ArrayBuffer(4) }];
    const input = { files, style: {}, addEventListener(t, fn) { if (t === 'change') input._c = fn; }, click() { input._c(); }, remove() {} };
    const D = { renovProjects: [{ id: 1, name: 'P', rab, items: [] }], transactions: [], accounts: [] };
    const m = mk(D, { XLSX: mkXlsx({ 'Harga Bahan': [['x', 'y'], [1, 2]], Hitungan: [['z']], REKAP: AOA }), document: { createElement: () => input, body: { appendChild() {} } } });
    m.ctx.Renov.render = () => {};
    await m.ctx.Renov.importXLSX(1); await new Promise(r => setTimeout(r, 20));
    return { p: D.renovProjects[0], calls: m.calls };
  };
  const a = await run(0);
  assert.equal(a.p.items.length, 13);
  assert.ok(a.p.rab > 0);
  assert.equal(a.p.lokasi, 'MAGELANG');
  assert.match(a.calls.join('|'), /RAB diisi/);
  const b = await run(9000000);
  assert.equal(b.p.rab, 9000000);
  assert.doesNotMatch(b.calls.join('|'), /RAB diisi/);
});

test('S2817 form proyek: field Lokasi ada dan disimpan', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'home', 'renovasi.js'), 'utf8');
  assert.match(src, /id="renovProjLokasi"/);
  assert.match(src, /if\(lokasiEl\)p\.lokasi=lokasi/);
});

test('S2818 F1: kategori pembayaran item hasil impor selalu kategori pengeluaran yang ada', () => {
  const D = { categories: { expense: [{ name: 'Makan' }, { name: 'Renov' }] }, renovProjects: [], transactions: [], accounts: [] };
  const { ctx } = mk(D);
  assert.equal(ctx.Renov._renovExpenseCategory('BAHAN'), 'Renov');
  assert.equal(ctx.Renov._renovExpenseCategory('makan'), 'Makan');
  assert.equal(ctx.Renov._renovExpenseCategory(''), 'Renov');
  const r = ctx.Renov._xlsxParse(AOA, []);
  assert.ok(r.valid.every(i => i.category === 'Renov' && i.grup));
});

test('S2818 F4: arah delta sinkron utang/piutang titipan = nilai + baru - lama', () => {
  const D = { debts: [{ id: 'd1', autoTxId: 't1', lunas: false, nilai: 827247 }], piutang: [{ id: 'p1', autoTxId: 't1', lunas: false, nilai: 100000 }] };
  const ctx = loadSource(['modules/finance/piutang-utang.js'], { D, BillDebtPiutangCanonicalWriter: { updateById: (k, id, fn) => fn(D[k].find(x => x.id === id)) } }, ['syncTitipanPinjamUtangOnEdit', 'syncTitipanTalanganPiutangOnEdit']);
  ctx.syncTitipanPinjamUtangOnEdit('t1', 377247, 300000);
  assert.equal(D.debts[0].nilai, 750000);
  ctx.syncTitipanTalanganPiutangOnEdit('t1', 100000, 130000);
  assert.equal(D.piutang[0].nilai, 130000);
});
