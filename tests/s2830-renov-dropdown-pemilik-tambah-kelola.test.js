'use strict';
// S2830 — Dropdown pemilik/penanggung Proyek Renovasi: opsi "➕ Tambah / kelola pemilik akun…" + tampil walau akun
// belum punya pemilik. Sebelumnya dropdown HANYA berisi pemilik akun terpilih dan disembunyikan bila akun tanpa pemilik.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function mkEl(id, value) {
  const attrs = {};
  return {
    id, value: value || '', innerHTML: '', attrs,
    style: {}, classList: { remove() {} },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
  };
}
function mkCtx(accOwners, extra) {
  const els = {};
  const get = (id) => els[id] || (els[id] = mkEl(id));
  const opened = [];
  const toasts = [];
  const base = {
    D: { renovProjects: [], accounts: [] },
    sameId: (a, b) => String(a) === String(b),
    escapeHtml: (x) => String(x),
    toast: (m) => toasts.push(m),
    document: { getElementById: get },
    getAccOwnersRaw: (id) => ({ ok: true, owners: accOwners[id] || [] }),
    AccOwners: { open: (id, cb) => opened.push({ id, cb }) },
    ...extra,
  };
  const ctx = loadSource(['modules/finance/tx-renov.js'], base);
  ctx.window = ctx;
  return { ctx, els, get, opened, toasts };
}
const OWN = { A: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 100 }], B: [] };

test('S2830: renovFillOwnerSelect — selalu ada opsi tambah/kelola; akun tanpa pemilik dapat placeholder "Tanpa pemilik"', () => {
  const { ctx, get } = mkCtx(OWN);
  const s1 = get('s1');
  ctx.renovFillOwnerSelect(s1, OWN.A, 'acc', 'fnX');
  assert.match(s1.innerHTML, /Pilih pemilik/);
  assert.match(s1.innerHTML, /value="o1">Budi/);
  assert.match(s1.innerHTML, /value="__manage_owners__">➕ Tambah \/ kelola pemilik akun/);
  assert.equal(s1.attrs['data-onchange'], 'renovOwnerSelectChange');
  assert.deepEqual(JSON.parse(s1.attrs['data-onchange-args']), ['s1', '$value', 'acc', 'fnX']);
  const s2 = get('s2');
  ctx.renovFillOwnerSelect(s2, [], 'acc', 'fnX');
  assert.match(s2.innerHTML, /Tanpa pemilik/);
  assert.match(s2.innerHTML, /__manage_owners__/);
});

test('S2830: memilih opsi kelola mengembalikan nilai sebelumnya, membuka AccOwners utk akun terpilih, lalu refresh via callback', () => {
  const { ctx, get, opened } = mkCtx(OWN);
  const refreshed = [];
  ctx.fnX = (prev) => refreshed.push(prev);
  get('acc').value = 'A';
  const sel = get('s1'); sel.value = 'o1';
  ctx.renovOwnerSelectChange('s1', 'o1', 'acc', 'fnX');          // pilihan biasa -> dicatat sbg "sebelumnya"
  assert.equal(sel.attrs['data-prev-owner'], 'o1');
  sel.value = '__manage_owners__';
  ctx.renovOwnerSelectChange('s1', '__manage_owners__', 'acc', 'fnX');
  assert.equal(sel.value, 'o1', 'penanda tidak boleh tersisa sebagai nilai terpilih');
  assert.equal(opened.length, 1);
  assert.equal(opened[0].id, 'A');
  opened[0].cb([]);
  assert.deepEqual(refreshed, ['o1']);
});

test('S2830: tanpa akun terpilih -> toast, AccOwners tidak dibuka', () => {
  const { ctx, get, opened, toasts } = mkCtx(OWN);
  get('acc').value = '';
  get('s1').value = '__manage_owners__';
  ctx.renovOwnerSelectChange('s1', '__manage_owners__', 'acc', 'fnX');
  assert.equal(opened.length, 0);
  assert.equal(toasts.length, 1);
});

test('S2830: dropdown pemilik Tagihan tampil juga utk akun tanpa pemilik (ada opsi tambah), tersembunyi bila belum ada akun', () => {
  const { ctx, get } = mkCtx(OWN);
  get('billAcc').value = 'B';
  ctx.updateBillRenovOwnerVisibility('');
  assert.equal(get('billRenovOwnerWrap').style.display, 'block');
  assert.match(get('billRenovOwner').innerHTML, /__manage_owners__/);
  get('billAcc').value = 'A';
  ctx.updateBillRenovOwnerVisibility('');
  assert.match(get('billRenovOwner').innerHTML, /Pilih saat bayar/);
  assert.equal(get('billRenovOwner').value, 'o1', 'pemilik tunggal tetap terpilih otomatis');
  get('billAcc').value = '';
  ctx.updateBillRenovOwnerVisibility('');
  assert.equal(get('billRenovOwnerWrap').style.display, 'none');
});

test('S2830: resolveRenovBillOwner — pilihan "Tambah / kelola" membuka AccOwners & membatalkan pembayaran dgn penanda _managing', async () => {
  const multi = { M: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Sari' }] };
  let seenChoices = null, pick = 2;
  const { ctx, opened } = mkCtx(multi, { showChoiceModal: async (o) => { seenChoices = o.choices; return pick; } });
  const r = await ctx.resolveRenovBillOwner({ name: 'Keramik' }, 'M');
  assert.equal(r, null);
  assert.equal(ctx.resolveRenovBillOwner._managing, true);
  assert.equal(seenChoices.length, 3);
  assert.match(seenChoices[2].label, /Tambah \/ kelola pemilik akun/);
  assert.equal(opened[0].id, 'M');
  pick = 1;
  const r2 = await ctx.resolveRenovBillOwner({ name: 'Keramik' }, 'M');
  assert.equal(r2, 'o2');
  assert.equal(ctx.resolveRenovBillOwner._managing, false);
  assert.equal(opened.length, 1);
});

test('S2830: sumber — 4 dropdown Renovasi memakai helper bersama & AccOwners.open menerima accId + onSaved', () => {
  const reno = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.equal((reno.match(/renovFillOwnerSelect\(/g) || []).length, 3);
  assert.match(reno, /'renovItemAcc','Renov\.updateDeductionOwnerVisibility'/);
  assert.match(reno, /'renovDpAccount','Renov\.updateDpOwnerVisibility'/);
  assert.match(reno, /'renovPayAccount','Renov\.updatePayOwnerVisibility'/);
  const akun = fs.readFileSync('modules/finance/akun.js', 'utf8');
  assert.match(akun, /open\(accId,onSaved\)\{/);
  assert.match(akun, /AccOwners\._onSaved=\(_ext&&typeof onSaved==='function'\)\?onSaved:null/);
  assert.match(akun, /closeModal\('accountOwnersModal'\)/);
  const tag = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  assert.match(tag, /resolveRenovBillOwner\._managing/);
});

// ===== S2831 — 1 SOT pemilik Renovasi + perbaikan penanggung asing =====
test('S2831: 1 SOT — modul Renovasi tidak membaca getAccOwnersRaw langsung (hanya di fallback renovAccountOwners)', () => {
  const reno = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.doesNotMatch(reno.replace(/\/\/.*$/gm, ''), /getAccOwnersRaw\(/);
  const tx = fs.readFileSync('modules/finance/tx-renov.js', 'utf8').replace(/\/\/.*$/gm, '');
  assert.equal((tx.match(/getAccOwnersRaw\(/g) || []).length, 1, 'hanya fallback di dalam renovAccountOwners');
  assert.equal((reno.match(/renovAccountOwners\(/g) || []).length >= 5, true);
});

test('S2831: renovAccountOwners memakai resolveOwnerDefaultForAccount (Holding/Aset) lebih dulu, alias _renovBillOwners sama hasilnya', () => {
  const { ctx } = mkCtx({ A: [{ ownerId: 'raw', ownerName: 'Mentah' }] }, {
    resolveOwnerDefaultForAccount: (id) => ({ ok: true, owners: id === 'H' ? [{ ownerId: 'live', ownerName: 'Live' }] : [] }),
  });
  assert.deepEqual(ctx.renovAccountOwners('H').map(o => o.ownerId), ['live']);
  assert.deepEqual(ctx.renovAccountOwners('A').map(o => o.ownerId), ['raw'], 'fallback acc.owners bila resolver kosong');
  assert.deepEqual(ctx._renovBillOwners('H').map(o => o.ownerId), ['live']);
  assert.equal(ctx.renovAccountOwners('').length, 0);
});

test('S2831: dropdown item/DP/bayar mengikuti SOT yang sama (akun tertaut Holding menampilkan pemilik live)', () => {
  const { ctx, get } = mkCtx({}, {
    resolveOwnerDefaultForAccount: () => ({ ok: true, owners: [{ ownerId: 'live', ownerName: 'Live' }, { ownerId: 'l2', ownerName: 'Dua' }] }),
  });
  get('renovItemAcc').value = 'H';
  const reno = loadSource(['modules/finance/tx-renov.js', 'modules/home/renovasi.js'], {
    D: { renovProjects: [], accounts: [] }, sameId: (a, b) => String(a) === String(b), escapeHtml: (x) => String(x), toast() {},
    document: { getElementById: (id) => (id === 'renovItemAcc' ? { value: 'H' } : get(id)) },
    resolveOwnerDefaultForAccount: () => ({ ok: true, owners: [{ ownerId: 'live', ownerName: 'Live' }, { ownerId: 'l2', ownerName: 'Dua' }] }),
  });
  reno.Renov.updateDeductionOwnerVisibility();
  assert.match(get('renovItemDeductionOwner').innerHTML, /value="live">Live/);
  assert.match(get('renovItemDeductionOwner').innerHTML, /value="l2">Dua/);
});

test('S2831: penanggung asing yang namanya sama dgn tepat 1 pemilik akun bisa diperbaiki otomatis; ambigu/tak dikenal tetap manual', () => {
  const D = {
    renovProjects: [{ id: 7, name: 'Dapur', items: [] }],
    accounts: [{ id: 'a1', owners: [{ ownerId: 'new-budi', ownerName: 'Budi' }, { ownerId: 'x2', ownerName: 'Sari' }] }],
    assets: [{ owners: [{ ownerId: 'old-budi', ownerName: ' budi ' }, { ownerId: 'ghost', ownerName: 'Tidak Ada' }] }],
    transactions: [
      { id: 1, type: 'expense', accountId: 'a1', renovProjectLinkId: 7, deductionOwnerId: 'old-budi' },
      { id: 2, type: 'expense', accountId: 'a1', renovProjectLinkId: 7, deductionOwnerId: 'ghost' },
      { id: 3, type: 'expense', accountId: 'a1', renovProjectLinkId: 7, deductionOwnerId: 'unknown-id' },
    ],
  };
  const patched = [];
  const { ctx } = mkCtx({}, {
    D, FinanceTxSOT: { patchMetaById: (id, m) => { patched.push([id, m.deductionOwnerId]); return true; } },
    getAccOwnersRaw: (id) => ({ ok: true, owners: (D.accounts.find(a => a.id === id) || {}).owners || [] }),
  });
  const audit = ctx.renovMarkerAudit().filter(m => m.kind === 'penanggung-asing');
  assert.equal(audit.length, 3);
  assert.equal(JSON.stringify(audit.map(m => m.fixable)), '[true,false,false]');
  const r = ctx.renovRepairMarkers();
  assert.equal(r.fixed, 1);
  assert.deepEqual(patched, [[1, 'new-budi']]);
  assert.equal(r.remaining, 2);
});

// ===== S2832 — refresh via Holding + validasi penanggung item lunas =====
test('S2832: renovFlushOwnerRefresh memanggil refresh tertunda SEKALI (jalur Holding tanpa onSaved)', () => {
  const { ctx, get, opened } = mkCtx(OWN);
  const refreshed = [];
  ctx.fnX = (prev) => refreshed.push(prev);
  get('acc').value = 'A';
  get('s1').setAttribute('data-prev-owner', 'o1');
  ctx.renovOwnerSelectChange('s1', '__manage_owners__', 'acc', 'fnX');
  assert.equal(refreshed.length, 0, 'belum ada refresh sebelum simpan');
  ctx.renovFlushOwnerRefresh();                                  // dipanggil InvestmentUI.saveOwners()
  ctx.renovFlushOwnerRefresh();
  assert.deepEqual(Array.from(refreshed), ['o1']);
  opened[0].cb();                                                // callback AccOwners juga aman (tidak dobel)
  assert.equal(refreshed.length, 1);
});

test('S2832: sumber — InvestmentUI.saveOwners memicu refresh & saveItem menolak item lunas multi-pemilik tanpa penanggung', () => {
  const inv = fs.readFileSync('modules/asset/investasi-view.js', 'utf8');
  assert.match(inv, /toast\('✅ Porsi kepemilikan tersimpan'\);\s*\/\/ S2832[^\n]*\n\s*if \(typeof renovFlushOwnerRefresh === 'function'\) renovFlushOwnerRefresh\(\);/);
  const reno = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.match(reno, /_eit&&_eit\.paid&&_eit\.txId&&!Array\.isArray\(_eit\.payments\)\)\{toast\('⚠️ Pilih pemilik\/penanggung akun'\);return;\}/);
});
