'use strict';
// tests/s564-owner-registry-settings-ui-r4.test.js — Sesi 564
// (AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md R4, menutup OWNREG-GATE3-001
// SEPENUHNYA). `OwnerRegistry.rename()`/`merge()` (owner-registry.js) sudah
// ada & diuji sejak S561 (tests/s561-owner-registry-rename-merge-r4.test.js)
// TAPI 0 UI memanggilnya. Sesi ini nambah `OwnerRegistrySettingsUI`
// (modules/shared/owner-registry-settings-ui.js) — 1 layar terpusat di
// Settings -> tab Kepemilikan yang mewiring rename()/merge() ke tombol
// nyata. Test ini fokus ke LOGIC presenter (render/usage-counts/wiring
// alur async modal), BUKAN mengulang test OwnerRegistry itu sendiri (sudah
// dikover penuh S561/S489 — 0 duplikasi assertion).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, innerHTML: '', textContent: '' };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeD(overrides) {
  return Object.assign({
    ownerRegistry: [],
    assets: [],
    investments: [],
    titipanCommitments: [],
    debts: [],
  }, overrides || {});
}

function makeCtx(D, dom, mocks) {
  return loadSource(
    ['modules/shared/owner-registry.js', 'modules/shared/owner-registry-settings-ui.js'],
    Object.assign({
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      uid: () => 'gen_' + (D._n = (D._n || 0) + 1),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: (msg) => { (D._toasts = D._toasts || []).push(msg); },
    }, mocks || {}),
    ['OwnerRegistry', 'OwnerRegistrySettingsUI'],
  );
}

test('1. render(): container tidak ada -> aman, 0 crash', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  assert.doesNotThrow(() => ctx.OwnerRegistrySettingsUI.render());
});

test('2. render(): registry kosong -> pesan hint kosong, bukan crash/blank', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.OwnerRegistrySettingsUI.render();
  assert.match(dom.getElementById('ownerRegistrySettingsList').innerHTML, /Belum ada pemilik/);
});

test('3. render(): 1 entri dipakai di 2 Aset + 1 Investasi -> tampil nama & ringkasan usage benar, urut nama', () => {
  const D = makeD({
    ownerRegistry: [{ id: 'o2', name: 'Cici' }, { id: 'o1', name: 'Budi' }],
    assets: [
      { id: 'a1', owners: [{ ownerId: 'SELF', isSelf: true, porsi: 50 }, { ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 50 }] },
      { id: 'a2', owners: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 100 }] },
    ],
    investments: [
      { id: 'h1', owners: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 100 }] },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.OwnerRegistrySettingsUI.render();
  const html = dom.getElementById('ownerRegistrySettingsList').innerHTML;
  // urut nama: Budi sebelum Cici
  assert.ok(html.indexOf('Budi') < html.indexOf('Cici'));
  assert.match(html, /2 Aset/);
  assert.match(html, /1 Investasi/);
  assert.match(html, /Belum dipakai di mana pun/); // Cici belum dipakai
});

test('4. renameOwner(): prompt prefill nama lama, sukses -> re-render + toast ringkasan jumlah baris', async () => {
  const D = makeD({
    ownerRegistry: [{ id: 'o1', name: 'Budi' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 100 }] }],
  });
  const dom = makeStatefulDom();
  let promptedDefault = null;
  const ctx = makeCtx(D, dom, {
    showPromptModal: async (opts) => { promptedDefault = opts.defaultValue; return 'Budi Santoso'; },
  });
  await ctx.OwnerRegistrySettingsUI.renameOwner('o1');
  assert.equal(promptedDefault, 'Budi');
  assert.equal(D.ownerRegistry[0].name, 'Budi Santoso');
  assert.equal(D.assets[0].owners[0].ownerName, 'Budi Santoso'); // propagasi via OwnerRegistry.rename()
  assert.match(dom.getElementById('ownerRegistrySettingsList').innerHTML, /Budi Santoso/); // re-render terpanggil
  assert.ok(D._toasts.some((t) => /diubah ke "Budi Santoso"/.test(t)));
});

test('5. renameOwner(): prompt dibatalkan (null/kosong) -> 0 perubahan, 0 toast', async () => {
  const D = makeD({ ownerRegistry: [{ id: 'o1', name: 'Budi' }] });
  const ctx = makeCtx(D, makeStatefulDom(), { showPromptModal: async () => null });
  await ctx.OwnerRegistrySettingsUI.renameOwner('o1');
  assert.equal(D.ownerRegistry[0].name, 'Budi');
  assert.equal(D._toasts, undefined);
});

test('6. renameOwner(): id tidak ditemukan -> toast error, 0 crash', async () => {
  const D = makeD({ ownerRegistry: [{ id: 'o1', name: 'Budi' }] });
  const ctx = makeCtx(D, makeStatefulDom(), { showPromptModal: async () => 'X' });
  await ctx.OwnerRegistrySettingsUI.renameOwner('o-tidak-ada');
  assert.ok(D._toasts.some((t) => /tidak ditemukan/.test(t)));
});

test('7. mergeOwner(): pilih target via showChoiceModal (choices = semua entri LAIN, bukan diri sendiri), konfirmasi, sukses -> propagasi + entri sumber hilang + toast', async () => {
  const D = makeD({
    ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Budi W' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 100 }] }],
  });
  let seenChoices = null;
  const ctx = makeCtx(D, makeStatefulDom(), {
    showChoiceModal: async (opts) => { seenChoices = opts.choices; return 0; }, // pilih others[0]
    askConfirm: async () => true,
  });
  await ctx.OwnerRegistrySettingsUI.mergeOwner('o1');
  assert.equal(seenChoices.length, 1);
  assert.equal(seenChoices[0].label, 'Budi W'); // TIDAK termasuk diri sendiri ("o1")
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].id, 'o2');
  assert.equal(D.assets[0].owners[0].ownerId, 'o2');
  assert.equal(D.assets[0].owners[0].ownerName, 'Budi W');
  assert.ok(D._toasts.some((t) => /digabung ke "Budi W"/.test(t)));
});

test('8. mergeOwner(): showChoiceModal dibatalkan (null) -> merge() TIDAK dipanggil, 0 perubahan', async () => {
  const D = makeD({ ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Cici' }] });
  const ctx = makeCtx(D, makeStatefulDom(), { showChoiceModal: async () => null, askConfirm: async () => true });
  await ctx.OwnerRegistrySettingsUI.mergeOwner('o1');
  assert.equal(D.ownerRegistry.length, 2);
});

test('9. mergeOwner(): askConfirm ditolak (false) SETELAH pilih target -> merge() TIDAK dipanggil, 0 perubahan', async () => {
  const D = makeD({ ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Cici' }] });
  const ctx = makeCtx(D, makeStatefulDom(), { showChoiceModal: async () => 0, askConfirm: async () => false });
  await ctx.OwnerRegistrySettingsUI.mergeOwner('o1');
  assert.equal(D.ownerRegistry.length, 2);
});

test('10. mergeOwner(): tidak ada pemilik lain (registry cuma 1 entri) -> toast, showChoiceModal TIDAK dipanggil', async () => {
  const D = makeD({ ownerRegistry: [{ id: 'o1', name: 'Budi' }] });
  let choiceCalled = false;
  const ctx = makeCtx(D, makeStatefulDom(), { showChoiceModal: async () => { choiceCalled = true; return 0; } });
  await ctx.OwnerRegistrySettingsUI.mergeOwner('o1');
  assert.equal(choiceCalled, false);
  assert.ok(D._toasts.some((t) => /Tidak ada pemilik lain/.test(t)));
});

test('11. mergeOwner(): konflik (1 aset punya source & target sekaligus) -> merge() BATAL TOTAL (0 perubahan registry/assets), showAlertModal dipanggil dgn jumlah konflik', async () => {
  const D = makeD({
    ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Cici' }],
    assets: [{
      id: 'a1',
      owners: [
        { ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 40 },
        { ownerId: 'o2', ownerName: 'Cici', isSelf: false, porsi: 60 },
      ],
    }],
  });
  let alertMsg = null;
  const ctx = makeCtx(D, makeStatefulDom(), {
    showChoiceModal: async () => 0,
    askConfirm: async () => true,
    showAlertModal: async (msg) => { alertMsg = msg; },
  });
  await ctx.OwnerRegistrySettingsUI.mergeOwner('o1');
  assert.equal(D.ownerRegistry.length, 2); // TIDAK ada yang terhapus
  assert.equal(D.assets[0].owners[0].ownerId, 'o1'); // TIDAK berubah
  assert.match(alertMsg, /1 Aset\/Investasi/);
  assert.equal(D._toasts, undefined); // sukses-toast TIDAK ikut terpanggil
});

test('12. mergeOwner(): id sumber tidak ditemukan -> toast error, showChoiceModal TIDAK dipanggil', async () => {
  const D = makeD({ ownerRegistry: [{ id: 'o1', name: 'Budi' }, { id: 'o2', name: 'Cici' }] });
  let choiceCalled = false;
  const ctx = makeCtx(D, makeStatefulDom(), { showChoiceModal: async () => { choiceCalled = true; return 0; } });
  await ctx.OwnerRegistrySettingsUI.mergeOwner('o-tidak-ada');
  assert.equal(choiceCalled, false);
  assert.ok(D._toasts.some((t) => /tidak ditemukan/.test(t)));
});

test('13. _usageCounts(): hitung 3 domain terpisah + total, abaikan baris isSelf', () => {
  const D = makeD({
    ownerRegistry: [{ id: 'o1', name: 'Budi' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'SELF', isSelf: true, porsi: 50 }, { ownerId: 'o1', isSelf: false, porsi: 50 }] }],
    investments: [{ id: 'h1', owners: [{ ownerId: 'o1', isSelf: false, porsi: 100 }] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'o1' }, { id: 'c2', ownerId: 'o1' }],
  });
  const ctx = makeCtx(D, makeStatefulDom());
  const usage = ctx.OwnerRegistrySettingsUI._usageCounts('o1');
  assert.equal(usage.assets, 1);
  assert.equal(usage.investments, 1);
  assert.equal(usage.commitments, 2);
  assert.equal(usage.total, 4);
});
