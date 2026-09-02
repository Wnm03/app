'use strict';
// tests/s543-titipan-asset-pick-preserve-selection.test.js — Sesi 543 (fix
// laporan user: dropdown "Pilih Aset" per kartu owner di Dana Titipan
// "belum sinkron" — user pilih aset, tapi klik "Atur Porsi Aset" balik
// bilang "Pilih aset dulu").
//
// ROOT CAUSE: `_renderNow()` mengganti SELURUH `el.innerHTML` (termasuk
// semua `<select id="titipanAssetPick_N">`) tiap kali dipanggil ulang —
// dan `_assetOptionsHtml()` SELALU generate opsi placeholder pertama
// TANPA `selected`. `render()`/`renderInto()` dipanggil ulang dari
// `renderLaporan()` tiap ada perubahan lain di halaman (mis. harga
// investasi live update), jadi pilihan dropdown user diam2 ke-reset
// SEBELUM sempat klik tombol.
//
// FIX: `_captureAssetPickSelections()`/`_restoreAssetPickSelections()`
// preservasi pilihan PER ownerId (via `data-owner-id` di tiap <select>,
// BUKAN index oi — index bisa berubah antar render kalau urutan owners
// berubah, build() sort by allocatedPrincipal desc).
//
// Semua test di bawah menjalankan SOURCE ASLI lewat loadSource (pola sama
// tests/s541-titipan-custodian-group-subtotal.test.js) — 0 re-implementasi
// logic presenter di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- DOM tiruan STATEFUL + querySelectorAll('select[id^="..."]') ringan,
// cukup buat kebutuhan capture/restore di atas (BUKAN DOM lengkap/jsdom).
// innerHTML setter parse ulang daftar <select id="..."> yg ada di markup
// baru dan RESET value-nya ke '' (meniru elemen DOM baru hasil ganti
// innerHTML yang belum pernah disentuh user) — .value getter/setter
// disimpan di `selectValues` per container (bukan di string HTML), supaya
// simulasi "user pilih opsi" (`sel.value = 'a2'`) beneran nyambung antar
// panggilan querySelectorAll().
function makeElement(id) {
  let _innerHTML = '';
  let selectValues = {};
  const el = { id, className: '', style: {}, textContent: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) {
      _innerHTML = String(html);
      const fresh = {};
      const re = /<select\s+id="([^"]+)"/g;
      let m;
      while ((m = re.exec(_innerHTML))) { fresh[m[1]] = ''; }
      selectValues = fresh;
    },
  });
  el.querySelectorAll = (selector) => {
    if (selector !== 'select[id^="titipanAssetPick_"]') return [];
    const results = [];
    const re = /<select\s+id="(titipanAssetPick_\d+)"\s+data-owner-id="([^"]*)"/g;
    let m;
    while ((m = re.exec(_innerHTML))) {
      const selId = m[1];
      const ownerId = m[2];
      results.push({
        id: selId,
        getAttribute(name) {
          if (name === 'data-owner-id') return ownerId;
          if (name === 'id') return selId;
          return null;
        },
        get value() { return selectValues[selId] || ''; },
        set value(v) { selectValues[selId] = v; },
      });
    }
    return results;
  };
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

// --- DOM tiruan TANPA querySelectorAll (pola sama
// tests/s515-dana-titipan-owner-nominal-asset-kuota-porsi.test.js) — buat
// pastikan guard defensif di _captureAssetPickSelections()/
// _restoreAssetPickSelections() aman di harness ringan ini (0 crash).
function makeNoQuerySelectorDom() {
  const registry = new Map();
  function makeEl(id) {
    return { id, value: '', textContent: '', innerHTML: '', className: '', style: {} };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); } };
}

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/shared/custodian-registry.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom,
      uid: (() => { let n = 0; return () => 'u' + (n += 1); })(), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'CustodianRegistry', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

function baseD(investments, assets) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: assets || [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  };
}

test('1. render() ulang TANPA interaksi apa pun -> semua select tetap placeholder kosong (baseline, 0 regresi)', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'a1', name: 'Rumah' }, { id: 'a2', name: 'Motor' }],
  );
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  ctx.DanaTitipanPortfolioPresenter.render();
  const el = dom.getElementById('danaTitipanPortfolioList');
  const sel = el.querySelectorAll('select[id^="titipanAssetPick_"]')[0];
  assert.equal(sel.value, '', 'tanpa interaksi, value harus tetap placeholder kosong');
});

test('2. user pilih aset -> render ulang (background, mis. harga live update) -> pilihan TIDAK hilang (root cause fix)', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'a1', name: 'Rumah' }, { id: 'a2', name: 'Motor' }],
  );
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const el = dom.getElementById('danaTitipanPortfolioList');
  let sel = el.querySelectorAll('select[id^="titipanAssetPick_"]')[0];
  assert.equal(sel.getAttribute('data-owner-id'), 'budi');
  sel.value = 'a2'; // simulasi user pilih "Motor"

  // simulasi render ulang di background (harga investasi live update, dst)
  // -- BELUM sempat klik tombol "Atur Porsi Aset".
  D.investments[0].currentPrice = 1150;
  ctx.DanaTitipanPortfolioPresenter.render();

  sel = el.querySelectorAll('select[id^="titipanAssetPick_"]')[0];
  assert.equal(sel.value, 'a2', 'pilihan dropdown harus tetap "a2" setelah render ulang, TIDAK reset ke placeholder');
});

test('3. urutan owners berubah antar render (owner baru masuk dgn allocatedPrincipal lebih besar, geser index) -> pilihan tetap ikut ownerId yang benar, BUKAN index lama', () => {
  const D = baseD(
    [
      { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h2', name: 'BNI AM Dana Likuid', unit: 10, avgPrice: 5000, currentPrice: 5000, owners: [{ ownerId: 'siti', porsi: 100, ownerName: 'Siti', isSelf: false }] },
    ],
    [{ id: 'a1', name: 'Rumah' }, { id: 'a2', name: 'Motor' }],
  );
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const el = dom.getElementById('danaTitipanPortfolioList');

  // budi (allocatedPrincipal 100000) harus index 0 (sort desc, > siti 50000).
  let selects = el.querySelectorAll('select[id^="titipanAssetPick_"]');
  const budiSelBefore = selects.find((s) => s.getAttribute('data-owner-id') === 'budi');
  assert.equal(budiSelBefore.id, 'titipanAssetPick_0');
  budiSelBefore.value = 'a2'; // budi pilih "Motor"

  // owner baru "andi" masuk dgn allocatedPrincipal JAUH lebih besar ->
  // geser budi dari index 0 ke index 1 di render berikutnya.
  D.investments.push({ id: 'h3', name: 'Schroder Dana Prestasi', unit: 1000, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'andi', porsi: 100, ownerName: 'Andi', isSelf: false }] });
  ctx.DanaTitipanPortfolioPresenter.render();

  selects = el.querySelectorAll('select[id^="titipanAssetPick_"]');
  const andiSel = selects.find((s) => s.getAttribute('data-owner-id') === 'andi');
  const budiSelAfter = selects.find((s) => s.getAttribute('data-owner-id') === 'budi');
  assert.equal(andiSel.id, 'titipanAssetPick_0', 'andi (allocatedPrincipal terbesar) sekarang index 0');
  assert.equal(budiSelAfter.id, 'titipanAssetPick_1', 'budi tergeser ke index 1');
  assert.equal(budiSelAfter.value, 'a2', 'pilihan budi harus tetap ikut ownerId-nya walau index-nya berubah');
  assert.equal(andiSel.value, '', 'select owner baru (andi) harus tetap placeholder kosong, TIDAK ikut ke-isi dari owner lain');
});

test('4. harness DOM TANPA querySelectorAll (mis. tests/s515-*) -> render() tetap jalan normal, 0 crash (guard defensif)', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'a1', name: 'Rumah' }],
  );
  const dom = makeNoQuerySelectorDom();
  const ctx = makeCtx(D, dom);
  assert.doesNotThrow(() => {
    ctx.DanaTitipanPortfolioPresenter.render();
    ctx.DanaTitipanPortfolioPresenter.render();
  });
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /titipanAssetPick_0/);
});
