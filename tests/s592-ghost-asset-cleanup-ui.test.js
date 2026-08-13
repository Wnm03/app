'use strict';
// tests/s592-ghost-asset-cleanup-ui.test.js — Sesi 592 (lanjutan
// PATCH-ghost-asset-migrated-investment.md). Patch S591/ghost-asset sudah
// menyaring record ber-flag `_migratedToInvestmentId` dari dropdown
// "Kaitkan ke Aset Multi-Owner" (getMultiOwnerAssets(), piutang-utang.js),
// TAPI record lama itu tetap ada di `D.assets` selamanya kecuali dibersihkan
// manual lewat Backup/Restore. Sesi ini nambah `GhostAssetCleanupUI`
// (modules/shared/ghost-asset-cleanup-ui.js) — 1 kartu di Settings -> tab
// Kepemilikan yang menampilkan record ghost + tombol hapus permanen,
// delegasi PENUH ke `Aset.delete()` yang sudah ada (0 logic hapus baru
// ditulis di sini — test ini fokus ke LOGIC PRESENTER: filter/render/
// wiring delegasi, BUKAN mengulang test Aset.delete() itu sendiri).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      innerHTML: '',
      textContent: '',
      className: '',
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeD(overrides) {
  return Object.assign({ assets: [], debts: [] }, overrides || {});
}

function makeCtx(D, dom, mocks) {
  return loadSource(
    ['modules/shared/ghost-asset-cleanup-ui.js'],
    Object.assign({
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + n,
      toast: (msg) => { (D._toasts = D._toasts || []).push(msg); },
      Aset: {
        delete: async (id) => {
          D._deleteAssetCalls = (D._deleteAssetCalls || []).push(id);
          D.assets = D.assets.filter((a) => String(a.id) !== String(id));
        },
      },
    }, mocks || {}),
    ['GhostAssetCleanupUI'],
  );
}

test('1. render(): container tidak ada -> aman, 0 crash', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  assert.doesNotThrow(() => ctx.GhostAssetCleanupUI.render());
});

test('2. render(): 0 ghost record -> kartu disembunyikan (classList u-dnone), list kosong', () => {
  const D = makeD({ assets: [{ id: 'a1', name: 'Rumah', nilai: 500000 }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.GhostAssetCleanupUI.render();
  assert.equal(dom.getElementById('ghostAssetCleanupList').innerHTML, '');
  assert.ok(dom.getElementById('ghostAssetCleanupCard').classList.contains('u-dnone'));
});

test('3. render(): ada ghost record -> kartu ditampilkan (u-dnone dilepas), nama & nilai tampil, aset non-ghost tidak ikut', () => {
  const D = makeD({
    assets: [
      { id: 'a1', name: 'Rumah', nilai: 500000 },
      { id: 'a2', name: 'Majoris', nilai: 12000000, _migratedToInvestmentId: 'h1' },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.GhostAssetCleanupUI.render();
  const html = dom.getElementById('ghostAssetCleanupList').innerHTML;
  assert.match(html, /Majoris/);
  assert.doesNotMatch(html, /Rumah/);
  assert.ok(!dom.getElementById('ghostAssetCleanupCard').classList.contains('u-dnone'));
});

test('4. deleteGhost(): delegasi penuh ke Aset.delete(), lalu re-render list ghost', async () => {
  const D = makeD({
    assets: [
      { id: 'a2', name: 'Majoris', nilai: 12000000, _migratedToInvestmentId: 'h1' },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.GhostAssetCleanupUI.render();
  assert.match(dom.getElementById('ghostAssetCleanupList').innerHTML, /Majoris/);
  await ctx.GhostAssetCleanupUI.deleteGhost('a2');
  assert.equal(D._deleteAssetCalls, 1);
  assert.equal(D.assets.length, 0);
  // list ghost ikut refresh setelah delete -- kartu kembali disembunyikan
  assert.equal(dom.getElementById('ghostAssetCleanupList').innerHTML, '');
  assert.ok(dom.getElementById('ghostAssetCleanupCard').classList.contains('u-dnone'));
});

test('5. deleteGhost(): Aset belum termuat -> toast error, 0 crash', async () => {
  const D = makeD({ assets: [{ id: 'a2', name: 'Majoris', nilai: 1, _migratedToInvestmentId: 'h1' }] });
  const ctx = makeCtx(D, makeStatefulDom(), { Aset: undefined });
  await ctx.GhostAssetCleanupUI.deleteGhost('a2');
  assert.ok(D._toasts.some((t) => /belum siap dimuat/.test(t)));
  assert.equal(D.assets.length, 1); // tidak terhapus
});

test('6. deleteGhost(): user batal konfirmasi (Aset.delete() no-op) -> list tetap tampil, 0 crash', async () => {
  const D = makeD({ assets: [{ id: 'a2', name: 'Majoris', nilai: 1, _migratedToInvestmentId: 'h1' }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, {
    Aset: { delete: async () => { /* user batal -- Aset.delete() asli tidak mengubah apa pun */ } },
  });
  ctx.GhostAssetCleanupUI.render();
  await ctx.GhostAssetCleanupUI.deleteGhost('a2');
  assert.equal(D.assets.length, 1);
  assert.match(dom.getElementById('ghostAssetCleanupList').innerHTML, /Majoris/);
});
