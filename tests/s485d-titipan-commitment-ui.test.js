'use strict';
// tests/s485d-titipan-commitment-ui.test.js — Sesi 485d (Gap #3 audit,
// langkah 4/5 dari rencana multi-sesi: RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md).
//
// Target: UI -- modal `titipanCommitmentModal` baru (`modals.js`) + extend
// `DanaTitipanPortfolioPresenter.render()` (tampilkan Pokok Dikomit/
// Teralokasi/Estimasi Belum Teralokasi/Nilai Saat Ini/Untung-Rugi per
// owner) + object baru `DanaTitipanCommitmentUI` (`open()`/`save()`, murni
// konsumsi API sesi 485a-c -- 0 logika CRUD/projection baru). Ini SATU-
// SATUNYA sesi dalam rencana Gap #3 yang mengubah markup/DOM nyata, jadi
// selain unit test murni-logika di bawah, wajib juga browser smoke test
// manual (lihat s485d-SESSION-NOTE.md) -- node:test TIDAK bisa
// menggantikan itu 100%, tapi lapis 1 & 2 di bawah (cross-check template
// HTML asli + simulasi DOM stateful, pola sama
// tests/asset-owners-flow-e2e-392a-to-392e.test.js) menutup gap-nya
// sejauh mungkin tanpa browser sungguhan.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// ============================================================
// Helper: DOM tiruan STATEFUL (bukan stub permisif default loadSource.js)
// -- sama alasan & pola tests/asset-owners-flow-e2e-392a-to-392e.test.js:
// open()/save() di sesi ini beneran baca/tulis .value/.innerHTML/
// .selectedOptions, jadi butuh mock yang benar-benar menyimpan state,
// termasuk <select> yang innerHTML-nya diisi <option> lalu dibaca lewat
// .value/.selectedOptions[0].textContent (dipakai DanaTitipanCommitmentUI
// buat isi & baca dropdown Owner).
// ============================================================
function makeElement(id) {
  let _innerHTML = '';
  let _value = '';
  let _options = [];
  const el = {
    id,
    textContent: '',
    placeholder: '',
    className: '',
    disabled: false,
    style: {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) {
      _innerHTML = String(html);
      _options = [];
      const re = /<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g;
      let m;
      while ((m = re.exec(_innerHTML))) _options.push({ value: m[1], textContent: m[2] });
    },
  });
  Object.defineProperty(el, 'value', {
    get() { return _value; },
    set(v) { _value = v; },
  });
  Object.defineProperty(el, 'selectedOptions', {
    get() {
      const found = _options.find((o) => o.value === _value);
      if (found) return [found];
      return _options.length ? [_options[0]] : [];
    },
  });
  Object.defineProperty(el, '_options', { get() { return _options; } });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD(investments, titipanCommitments) {
  return {
    investments: investments || [],
    investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [],
    titipanCommitments: titipanCommitments || [],
  };
}

function makeCtx(D, dom) {
  let _n = 0;
  const openModalCalls = [];
  const closeModalCalls = [];
  const toastMessages = [];
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/finance/dana-titipan-portfolio-render-b.js',
    ],
    {
      D,
      document: dom,
      uid: () => 'commit_' + (_n += 1),
      save: () => {},
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      openModal: (id) => { openModalCalls.push(id); },
      closeModal: (id) => { closeModalCalls.push(id); },
      toast: (msg) => { toastMessages.push(msg); },
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanCommitmentUI'],
  );
  ctx.openModalCalls = openModalCalls;
  ctx.closeModalCalls = closeModalCalls;
  ctx.toastMessages = toastMessages;
  return ctx;
}

function extractModalHtml() {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  const sandbox = {};
  const context = vm.createContext(sandbox);
  new vm.Script(modalsSrc + '\nthis.MODAL_HTML = MODAL_HTML;', { filename: 'modals.js' }).runInContext(context);
  const all = context.MODAL_HTML.join('\n');
  const m = /<div class="overlay" id="titipanCommitmentModal"[\s\S]*?\n\s*<\/div>\n<\/div>/.exec(all);
  assert.ok(m, 'titipanCommitmentModal harus ditemukan utuh di MODAL_HTML');
  return m[0];
}

// ============================================================
// LAPIS 1 -- cross-check TEMPLATE HTML asli (modals.js) vs id/data-action
// yang benar-benar dipanggil DanaTitipanCommitmentUI (presenter file).
// ============================================================

test('[gap-check] titipanCommitmentModal: semua id yang dipakai DanaTitipanCommitmentUI.open()/save() memang ada di template', () => {
  const html = extractModalHtml();
  const presenterSrc = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render-b.js'), 'utf8');
  const start = presenterSrc.indexOf('const DanaTitipanCommitmentUI');
  assert.notEqual(start, -1, 'DanaTitipanCommitmentUI harus ada di presenter file -- nama berubah? update test ini');
  // UPDATE Sesi 486 (Case F): file ini sekarang punya object tambahan
  // (`DanaTitipanReturnUI`) SETELAH `DanaTitipanCommitmentUI` -- slice
  // dibatasi supaya tidak ikut menangkap getElementById() milik object
  // baru itu (bukan bagian dari gap-check modal INI).
  const nextMarker = presenterSrc.indexOf('const DanaTitipanReturnUI');
  const uiCode = nextMarker === -1 ? presenterSrc.slice(start) : presenterSrc.slice(start, nextMarker);
  const idsUsed = [...uiCode.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(idsUsed.length >= 4, 'harus ada minimal beberapa getElementById dipanggil di DanaTitipanCommitmentUI');
  for (const id of new Set(idsUsed)) {
    assert.match(html, new RegExp(`id="${id}"`), `id="${id}" dipanggil DanaTitipanCommitmentUI tapi TIDAK ADA di template titipanCommitmentModal -- gap HTML/JS`);
  }
  assert.match(html, /data-action="DanaTitipanCommitmentUI\.save"/, 'tombol Simpan harus data-action="DanaTitipanCommitmentUI.save"');
});

test('[gap-check] titipanCommitmentModal: tag seimbang (div/label/select/button/input tidak dihitung karena void, fokus div/select/label)', () => {
  const html = extractModalHtml();
  for (const tag of ['div', 'label', 'select']) {
    const openCount = (html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
    const closeCount = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(openCount, closeCount, `titipanCommitmentModal: <${tag}> tidak seimbang (${openCount} buka vs ${closeCount} tutup)`);
  }
});

test('[gap-check] render(): tombol buka modal (data-action=DanaTitipanCommitmentUI.open) memang ada di render(), baik data-args global maupun per-owner', () => {
  // Presenter.render() ada di bagian PERTAMA (dana-titipan-portfolio-render.js),
  // sedangkan marker `const DanaTitipanCommitmentUI` sekarang di bagian KEDUA
  // (dana-titipan-portfolio-render-b.js) -- baca gabungan keduanya, sama
  // seperti build.js memuatnya berurutan.
  const presenterSrc = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render.js'), 'utf8')
    + fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render-b.js'), 'utf8');
  const renderStart = presenterSrc.indexOf('render() {');
  const renderEnd = presenterSrc.indexOf('};', presenterSrc.indexOf('const DanaTitipanCommitmentUI'));
  const renderCode = presenterSrc.slice(renderStart, presenterSrc.indexOf('const DanaTitipanCommitmentUI'));
  assert.match(renderCode, /data-action="DanaTitipanCommitmentUI\.open"/, 'render() harus punya minimal 1 pemicu DanaTitipanCommitmentUI.open');
  // Sesi 516 (BUG-S516-001): ownerId sekarang dikirim lewat
  // escapeHtml(JSON.stringify([...])) (bukan interpolasi mentah dlm
  // literal '["${o.ownerId}"]') -- ownerId apa pun (termasuk yang
  // mengandung tanda kutip) tidak lagi merusak atribut data-args.
  assert.match(renderCode, /data-args="\$\{escapeHtml\(JSON\.stringify\(\[o\.ownerId\]\)\)\}"/, 'render() per-owner harus kirim ownerId lewat data-args ter-escape ke DanaTitipanCommitmentUI.open (mode edit)');
});

// ============================================================
// LAPIS 2 -- unit murni-logika: _principalCell()/_unallocatedCell()
// (fungsi pure, tidak sentuh DOM sama sekali -- aman dites langsung).
// ============================================================

test('1. _principalCell(): principalAmount null -> "Belum dicatat" (bukan Rp0)', () => {
  const ctx = makeCtx(makeD());
  const html = ctx.DanaTitipanPortfolioPresenter._principalCell({ principalAmount: null });
  assert.match(html, /Belum dicatat/);
  assert.doesNotMatch(html, /Rp/);
});

test('2. _principalCell(): principalAmount terisi -> tampilkan nominal (bukan "Belum dicatat")', () => {
  const ctx = makeCtx(makeD());
  const html = ctx.DanaTitipanPortfolioPresenter._principalCell({ principalAmount: 5000000 });
  assert.doesNotMatch(html, /Belum dicatat/);
  assert.match(html, /5\.000\.000|5000000/);
});

test('3. _unallocatedCell(): allocationStatus PRINCIPAL_NOT_SET -> "Belum dicatat"', () => {
  const ctx = makeCtx(makeD());
  const html = ctx.DanaTitipanPortfolioPresenter._unallocatedCell({ allocationStatus: 'PRINCIPAL_NOT_SET' });
  assert.match(html, /Belum dicatat/);
});

test('4. _unallocatedCell(): allocationStatus OVER_ALLOCATED -> badge ⚠️ + overAllocatedAmount (BUKAN estimatedUnallocated)', () => {
  const ctx = makeCtx(makeD());
  const html = ctx.DanaTitipanPortfolioPresenter._unallocatedCell({ allocationStatus: 'OVER_ALLOCATED', overAllocatedAmount: 20000000, estimatedUnallocated: 0 });
  assert.match(html, /⚠️/);
  assert.match(html, /Lebih/);
  assert.match(html, /red/);
});

test('5. _unallocatedCell(): allocationStatus OK -> tampilkan estimatedUnallocated apa adanya, tanpa badge', () => {
  const ctx = makeCtx(makeD());
  const html = ctx.DanaTitipanPortfolioPresenter._unallocatedCell({ allocationStatus: 'OK', estimatedUnallocated: 30000000 });
  assert.doesNotMatch(html, /⚠️/);
  assert.doesNotMatch(html, /Belum dicatat/);
});

// ============================================================
// LAPIS 3 -- render() lewat DOM stateful (isi container list ASLI).
// ============================================================

test('6. render(): tidak ada owner sama sekali -> tetap tampilkan tombol "Catat/Update Pokok" + pesan kosong (bukan render kosong total)', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList'); // ensure exists
  const ctx = makeCtx(makeD(), dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /data-action="DanaTitipanCommitmentUI\.open"/);
  assert.match(html, /Belum ada porsi dana titipan/);
});

test('7. render(): owner PRINCIPAL_NOT_SET -> "Belum dicatat" tampil, tombol edit per-owner bawa ownerId lewat data-args', () => {
  const dom = makeStatefulDom();
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 9000000, currentPrice: 9500000, owners: [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah', isSelf: false }] }], []);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Belum dicatat/);
  // Sesi 516 (BUG-S516-001): data-args sekarang escapeHtml(JSON.stringify(...))
  // dlm atribut double-quote, bukan literal single-quote '["ayah"]'.
  assert.match(html, /data-args="\[&quot;ayah&quot;\]"/);
  assert.match(html, /Ayah/);
});

test('8. render(): owner OVER_ALLOCATED -> badge ⚠️ muncul di summary DAN totals baris "Total Kelebihan Alokasi" ikut tampil', () => {
  const dom = makeStatefulDom();
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  );
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /⚠️ 👤 Budi/);
  assert.match(html, /Total Kelebihan Alokasi/);
});

test('9. render(): owner OK (bukan over-allocated) -> baris "Total Kelebihan Alokasi" TIDAK muncul sama sekali', () => {
  const dom = makeStatefulDom();
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 100000000 }],
  );
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.doesNotMatch(html, /Total Kelebihan Alokasi/);
  assert.match(html, /Estimasi Belum Teralokasi/);
});

// ============================================================
// LAPIS 4 -- DanaTitipanCommitmentUI.open()/save() lewat DOM stateful.
// ============================================================

test('10. open() tanpa ownerId (tambah baru): dropdown terisi dari listExistingOwners(), field principal/tanggal/catatan KOSONG, openModal terpanggil', () => {
  const dom = makeStatefulDom();
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }], []);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open();
  const sel = dom.getElementById('titipanCommitOwner');
  assert.equal(sel._options.length, 1);
  assert.equal(sel._options[0].value, 'budi');
  assert.equal(dom.getElementById('titipanCommitPrincipal').value, '');
  assert.equal(dom.getElementById('titipanCommitDate').value, '');
  assert.equal(dom.getElementById('titipanCommitNotes').value, '');
  assert.deepEqual(ctx.openModalCalls, ['titipanCommitmentModal']);
});

test('11. open() dengan ownerId yang SUDAH punya commitment (mode edit): field ter-prefill dari getCommitments(), dropdown value = ownerId', () => {
  const dom = makeStatefulDom();
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 70000000, committedDate: '2026-01-15', notes: 'DP rumah' }],
  );
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('budi');
  assert.equal(dom.getElementById('titipanCommitOwner').value, 'budi');
  assert.equal(dom.getElementById('titipanCommitPrincipal').value, 70000000);
  assert.equal(dom.getElementById('titipanCommitDate').value, '2026-01-15');
  assert.equal(dom.getElementById('titipanCommitNotes').value, 'DP rumah');
});

test('12. open() dengan ownerId yang BELUM punya commitment (owner baru dari holding): field tetap kosong, dropdown ter-set ke ownerId itu', () => {
  const dom = makeStatefulDom();
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false }] }], []);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('cici');
  assert.equal(dom.getElementById('titipanCommitOwner').value, 'cici');
  assert.equal(dom.getElementById('titipanCommitPrincipal').value, '');
});

test('13. save(): tidak ada owner dipilih -> toast peringatan, saveCommitment TIDAK terpanggil (D.titipanCommitments tidak bertambah), modal TIDAK ditutup', () => {
  const dom = makeStatefulDom();
  const D = makeD([], []);
  const ctx = makeCtx(D, dom);
  dom.getElementById('titipanCommitOwner').value = ''; // no options at all
  ctx.DanaTitipanCommitmentUI.save();
  assert.equal(D.titipanCommitments.length, 0);
  assert.match(ctx.toastMessages.join(' '), /Owner wajib dipilih/);
  assert.deepEqual(ctx.closeModalCalls, []);
});

test('14. save(): alur sukses -- baca form, panggil saveCommitment(), tutup modal, panggil render() ulang, toast sukses', () => {
  const dom = makeStatefulDom();
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }], []);
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList'); // container harus ada supaya render() sukses
  let renderCalls = 0;
  const origRender = ctx.DanaTitipanPortfolioPresenter.render;
  ctx.DanaTitipanPortfolioPresenter.render = function () { renderCalls += 1; return origRender.call(this); };

  ctx.DanaTitipanCommitmentUI.open('budi');
  dom.getElementById('titipanCommitPrincipal').value = '75000000';
  dom.getElementById('titipanCommitDate').value = '2026-02-01';
  dom.getElementById('titipanCommitNotes').value = 'Modal usaha bareng';
  ctx.DanaTitipanCommitmentUI.save();

  assert.equal(D.titipanCommitments.length, 1);
  const saved = D.titipanCommitments[0];
  assert.equal(saved.ownerId, 'budi');
  assert.equal(saved.ownerName, 'Budi');
  assert.equal(saved.principalAmount, 75000000);
  assert.equal(saved.committedDate, '2026-02-01');
  assert.equal(saved.notes, 'Modal usaha bareng');
  assert.deepEqual(ctx.closeModalCalls, ['titipanCommitmentModal']);
  assert.equal(renderCalls, 1);
  assert.match(ctx.toastMessages.join(' '), /tersimpan/);
});

test('15. save(): saveCommitment() throw (mis. principal negatif) -> toast berisi pesan error, modal TIDAK ditutup, render() TIDAK dipanggil ulang', () => {
  const dom = makeStatefulDom();
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }], []);
  const ctx = makeCtx(D, dom);
  let renderCalls = 0;
  ctx.DanaTitipanPortfolioPresenter.render = () => { renderCalls += 1; };

  ctx.DanaTitipanCommitmentUI.open('budi');
  dom.getElementById('titipanCommitPrincipal').value = '-5000000';
  ctx.DanaTitipanCommitmentUI.save();

  assert.equal(D.titipanCommitments.length, 0, 'principal negatif harus ditolak saveCommitment(), tidak ada yang tersimpan');
  assert.deepEqual(ctx.closeModalCalls, []);
  assert.equal(renderCalls, 0);
  assert.match(ctx.toastMessages.join(' '), /⚠️/);
});

test('16. save(): upsert -- open(ownerId existing) lalu ubah nominal & save() lagi -> update in place, bukan duplikat', () => {
  const dom = makeStatefulDom();
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000, committedDate: '2026-01-01', notes: 'awal' }],
  );
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render = () => {};
  ctx.DanaTitipanCommitmentUI.open('budi');
  assert.equal(dom.getElementById('titipanCommitPrincipal').value, 50000000, 'field harus ter-prefill dari commitment lama sebelum diedit');
  dom.getElementById('titipanCommitPrincipal').value = '90000000';
  ctx.DanaTitipanCommitmentUI.save();
  assert.equal(D.titipanCommitments.length, 1, 'harus tetap 1 record (update in place), bukan jadi 2');
  assert.equal(D.titipanCommitments[0].principalAmount, 90000000);
});

// ============================================================
// LAPIS 5 -- end-to-end ringkas: open (tambah baru) -> isi -> save ->
// render() ulang -> owner baru itu benar-benar muncul di tampilan list.
// ============================================================

test('17. [flow] end-to-end: owner baru dari holding (belum pernah dicatat pokoknya) -> open() -> isi -> save() -> render() menampilkan Pokok Dikomit & status OK', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = makeD([{ id: 'h1', name: 'Reksa Dana Pasar Uang X', unit: 1, avgPrice: 40000000, currentPrice: 42000000, owners: [{ ownerId: 'wati', porsi: 100, ownerName: 'Wati', isSelf: false }] }], []);
  const ctx = makeCtx(D, dom);

  ctx.DanaTitipanCommitmentUI.open('wati');
  dom.getElementById('titipanCommitPrincipal').value = '60000000';
  ctx.DanaTitipanCommitmentUI.save();

  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Wati/);
  assert.doesNotMatch(html, /Belum dicatat/, 'setelah disimpan, "Belum dicatat" tidak boleh lagi muncul utk owner ini');
  assert.match(html, /Estimasi Belum Teralokasi/);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const wati = p.owners.find((o) => o.ownerId === 'wati');
  assert.equal(wati.allocationStatus, 'OK');
  assert.equal(wati.estimatedUnallocated, 20000000);
});
