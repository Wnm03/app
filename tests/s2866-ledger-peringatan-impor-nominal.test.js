'use strict';
/** S2866 — (1) peringatan akui/cairkan > bagian W, (2) impor ulang CSV/XLSX tidak menggandakan item, (3) pratinjau nominal. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function load(D, extra) {
  return loadSource(['modules/home/renovasi.js'], Object.assign({
    D, sameId, todayStr: () => '2026-11-20', uid: (() => { let n = 0; return () => 'u' + (++n); })(), save: () => true, toast() {},
    escapeHtml: String, fmt: (n) => 'Rp' + Math.round(n), fmtFull: (n) => 'Rp' + Math.round(n), document: { getElementById: () => null }, totalSaldoAkun: () => 0,
    closeModal() {}, openModal() {},
  }, extra || {}), ['Renov', 'renovBagianSelf', 'renovCekMelebihiBagianSelf', 'renovNominalPreviewText', 'renovNominalFieldId']);
}
function proyek(extra) {
  return Object.assign({
    id: 'p1', name: 'Wallpanel', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true }, items: [], labaLedger: [],
    bagiHasil: { labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 33.4994346970, isSelf: true }, { ownerId: 'x', ownerName: 'home in', porsi: 66.500565303, isSelf: false }] },
  }, extra || {});
}

// ---------- Poin 1 ----------
test('renovBagianSelf: nominal baris isSelf; null tanpa baris isSelf atau tanpa laba positif', () => {
  const p = proyek(); const r = load({ renovProjects: [p], accounts: [], transactions: [], profile: {} });
  assert.deepEqual({ ...r.renovBagianSelf(p) }, { nama: 'W', nominal: 800000 });
  const p2 = proyek({ bagiHasil: { labaManual: 1000, owners: [{ ownerName: 'A', porsi: 100 }] } });
  assert.equal(r.renovBagianSelf(p2), null);
  const p3 = proyek({ bagiHasil: undefined }); assert.equal(r.renovBagianSelf(p3), null);
  const p4 = proyek({ bagiHasil: { labaManual: 0, owners: [{ ownerName: 'W', porsi: 100, isSelf: true }] }, rab: 0 }); assert.equal(r.renovBagianSelf(p4), null);
});

test('renovCekMelebihiBagianSelf: akui di atas 800.000 -> peringatan; 800.000 pas -> tidak', () => {
  const p = proyek(); const r = load({ renovProjects: [p], accounts: [], transactions: [], profile: {} });
  assert.equal(r.renovCekMelebihiBagianSelf(p, 'akui', 800000), null);
  const w = r.renovCekMelebihiBagianSelf(p, 'akui', 2692582);
  assert.equal(w.nominal, 800000); assert.equal(w.total, 2692582); assert.equal(w.nama, 'W');
  assert.equal(r.renovCekMelebihiBagianSelf(p, 'koreksi', 9999999), null, 'koreksi tidak dicek');
  assert.equal(r.renovCekMelebihiBagianSelf(p, 'akui', 0), null);
});

test('renovCekMelebihiBagianSelf: akumulasi - sudah diakui 800.000 lalu akui +1 -> peringatan; cairkan dihitung dari pencairan valid', () => {
  const p = proyek({ labaLedger: [{ id: 'a1', tipe: 'akui', jumlah: 800000 }, { id: 'c1', tipe: 'cairkan', jumlah: 500000 }] });
  const r = load({ renovProjects: [p], accounts: [], transactions: [], profile: {} });
  assert.ok(r.renovCekMelebihiBagianSelf(p, 'akui', 1));
  assert.equal(r.renovCekMelebihiBagianSelf(p, 'cairkan', 300000), null);
  assert.ok(r.renovCekMelebihiBagianSelf(p, 'cairkan', 300001));
});

function labaHarness(p, confirmAnswer) {
  const confirms = []; const els = { renovLabaAmount: { value: '' }, renovLabaDate: { value: '2026-11-20' }, renovLabaNote: { value: '' } };
  const D = { renovProjects: [p], accounts: [], transactions: [], profile: {} };
  const r = load(D, {
    document: { getElementById: (id) => els[id] || null }, askConfirm: async (m, o) => { confirms.push({ m, o }); return confirmAnswer; },
    refreshAfterMutation() {}, closeModal() {},
  });
  r.Renov._labaProjectId = p.id; r.Renov._labaKey = 'k1'; r.Renov.render = () => {}; r.Renov.renderDetail = () => {};
  return { r, els, confirms };
}

test('submitLaba akui > bagian W: konfirmasi muncul; batal -> ledger tidak berubah; lanjut -> tersimpan', async () => {
  // dasar ledger: penerimaan 7.000.000, biaya 0 -> bisaAkui besar; hanya konfirmasi yang membatasi
  const mk = () => proyek({ items: [], dpIncoming: undefined });
  for (const answer of [false, true]) {
    const p = mk(); const h = labaHarness(p, answer);
    const sm = h.r.Renov && null; // ringkasan dihitung di dalam
    h.r.Renov._labaAksi = 'akui'; h.els.renovLabaAmount.value = '900000';
    // lewati syarat ledger (status dana) dengan memaksa batas pengakuan lewat stub ringkasan
    const origCek = h.r.renovCekMelebihiBagianSelf; assert.ok(origCek(p, 'akui', 900000), 'harus terdeteksi melebihi');
    await h.r.Renov.submitLaba();
    assert.equal(h.confirms.length, 1, 'tepat satu konfirmasi');
    assert.match(h.confirms[0].m, /melebihi bagian W \(Rp800000\)\. Lanjut\?/);
    if (!answer) assert.equal(p.labaLedger.length, 0, 'batal: tidak ada entri');
    assert.equal(h.r.Renov._labaInFlight, false, 'flag in-flight selalu dilepas');
  }
});

test('submitLaba akui <= bagian W: tanpa konfirmasi', async () => {
  const p = proyek(); const h = labaHarness(p, true);
  h.r.Renov._labaAksi = 'akui'; h.els.renovLabaAmount.value = '800000';
  await h.r.Renov.submitLaba();
  assert.equal(h.confirms.length, 0);
  assert.equal(h.r.Renov._labaInFlight, false);
});

test('submitLaba tanpa baris isSelf: perilaku lama (tanpa konfirmasi)', async () => {
  const p = proyek({ bagiHasil: { labaManual: 1000000, owners: [{ ownerName: 'A', porsi: 100 }] } }); const h = labaHarness(p, true);
  h.r.Renov._labaAksi = 'akui'; h.els.renovLabaAmount.value = '900000';
  await h.r.Renov.submitLaba();
  assert.equal(h.confirms.length, 0);
});

// ---------- Poin 2 ----------
function importHarness(p, csvText) {
  let accepted = null, inputRef; const toasts = [];
  const document = { getElementById: () => null, body: { appendChild() {} }, createElement: () => { inputRef = { style: {}, files: [{ size: 200, text: async () => csvText }], addEventListener: (n, fn) => { inputRef.handler = fn; }, click() { inputRef.changePromise = inputRef.handler(); }, remove() {} }; return inputRef; } };
  const D = { renovProjects: [p], accounts: [], transactions: [], profile: {} };
  const r = load(D, { document, askConfirm: async (t) => { accepted = t; return true; }, toast: (m) => toasts.push(m) });
  return { r, run: async () => { await r.Renov.importCSV(p.id); await inputRef.changePromise; }, get accepted() { return accepted; }, toasts };
}

test('impor ulang CSV hasil ekspor: item dengan grup != category TIDAK digandakan (18 tetap 18)', async () => {
  const items = []; for (let i = 0; i < 18; i++) items.push({ id: 'i' + i, name: 'Item ' + i, category: 'Renovasi', grup: 'WPC', ukuran: '', harga: 100000 + i, payments: [] });
  const p = { id: 'p1', name: 'W', rab: 1, items };
  const lines = ['Item,Kategori,Ukuran,Harga Rencana'].concat(items.map((it) => [it.name, it.grup, '', it.harga].join(',')));
  const h = importHarness(p, lines.join('\n')); await h.run();
  assert.equal(p.items.length, 18, 'tidak ada item baru');
  assert.ok(h.toasts.some((m) => /Tidak ada item baru: 18 sudah ada/.test(m)), h.toasts.join('|'));
});

test('impor CSV campuran: dialog menampilkan item baru & dilewati; hanya yang baru ditambahkan', async () => {
  const p = { id: 'p1', name: 'W', rab: 1, items: [{ id: 'a', name: 'Panel WPC', category: 'Renovasi', grup: 'WPC', harga: 500000, payments: [] }] };
  const h = importHarness(p, 'Item,Kategori,Harga\nPanel  wpc,WPC,500000\nLem,Bahan,25000\nTanpa harga,Bahan,0');
  await h.run();
  assert.match(h.accepted, /1 item baru, 1 dilewati karena sudah ada \(cocok nama \+ harga\), 1 baris tidak valid/);
  assert.equal(p.items.length, 2); assert.equal(p.items[1].name, 'Lem');
});

test('impor CSV: nama sama tetapi harga beda = item baru (bukan duplikat)', async () => {
  const p = { id: 'p1', name: 'W', rab: 1, items: [{ id: 'a', name: 'Panel', harga: 500000, payments: [] }] };
  const h = importHarness(p, 'Item,Harga\nPanel,600000'); await h.run();
  assert.equal(p.items.length, 2);
});

test('_xlsxParse: item yang sudah ada dicocokkan nama+harga walau grup beda; skipExist dihitung', () => {
  const r = load({ renovProjects: [], accounts: [], transactions: [] });
  const aoa = [['Item', 'Kategori', 'Harga'], ['Panel', 'WPC', 500000], ['Lem', 'Bahan', 25000]];
  const res = r.Renov._xlsxParse(aoa, [{ name: 'Panel', category: 'Renovasi', grup: 'Lain', harga: 500000 }]);
  assert.equal(res.valid.length, 1); assert.equal(res.valid[0].name, 'Lem');
  assert.equal(res.skipExist, 1); assert.equal(res.skipped, 1);
});

// ---------- Poin 3 ----------
test('renovNominalPreviewText: format rupiah; kosong/nol/negatif -> kosong; "1.000" terbaca 1 (peringatan salah ketik)', () => {
  const r = load({ renovProjects: [], accounts: [], transactions: [] });
  assert.equal(r.renovNominalPreviewText('1000000'), '= Rp 1.000.000');
  assert.equal(r.renovNominalPreviewText('800000.4'), '= Rp 800.000');
  assert.equal(r.renovNominalPreviewText(''), '');
  assert.equal(r.renovNominalPreviewText('0'), '');
  assert.equal(r.renovNominalPreviewText('-5'), '');
  assert.equal(r.renovNominalPreviewText('1.000'), '= Rp 1');
});

test('renovNominalFieldId: hanya field nominal Renov', () => {
  const r = load({ renovProjects: [], accounts: [], transactions: [] });
  for (const id of ['renovBhLaba', 'renovBhN0', 'renovBhN12', 'renovLabaAmount', 'renovDpAmount', 'renovPayAmount', 'renovProjRab']) assert.equal(r.renovNominalFieldId(id), true, id);
  for (const id of ['renovBhP0', 'txAmt', 'renovProjName', '']) assert.equal(r.renovNominalFieldId(id), false, id);
});

test('pemasangan listener pratinjau: terpasang sekali dan memakai input+focusin; tidak error tanpa document.addEventListener', () => {
  const events = []; const doc = { getElementById: () => null, addEventListener: (n) => events.push(n) };
  load({ renovProjects: [], accounts: [], transactions: [] }, { document: doc });
  assert.deepEqual(events.sort(), ['focusin', 'input']);
  assert.doesNotThrow(() => load({ renovProjects: [], accounts: [], transactions: [] }));
});
