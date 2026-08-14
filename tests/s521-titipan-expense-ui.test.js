'use strict';
// tests/s521-titipan-expense-ui.test.js — Sesi 521 (S521-B2), targeted test
// utk modules/finance/titipan-expense-ui.js (`TitipanExpenseUI`) sesuai
// DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md. Pola SAMA PERSIS
// tests/s485d-titipan-commitment-ui.test.js (gap-check template vs
// getElementById + DOM stateful tiruan, LAPIS 1-3), TIDAK menyalin logic
// TitipanExpenseFlow (S521-A) -- semua lewat loadSource() source ASLI.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// ============================================================
// DOM tiruan STATEFUL minimal -- id, value, innerHTML, checked, style,
// disabled. Cukup buat TitipanExpenseUI (getElementById saja, TIDAK ada
// querySelectorAll di controller ini -- lihat catatan file source).
// ============================================================
function makeElement(id) {
  let _innerHTML = '';
  let _value = '';
  const el = {
    id,
    checked: false,
    disabled: false,
    style: {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) { _innerHTML = String(html); },
  });
  Object.defineProperty(el, 'value', {
    get() { return _value; },
    set(v) { _value = v; },
  });
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

function extractModalHtml() {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  const sandbox = {};
  const context = vm.createContext(sandbox);
  new vm.Script(modalsSrc + '\nthis.MODAL_HTML = MODAL_HTML;', { filename: 'modals.js' }).runInContext(context);
  const all = context.MODAL_HTML.join('\n');
  const m = /<div class="overlay" id="titipanExpenseModal"[\s\S]*?\n\s*<\/div>\n<\/div>/.exec(all);
  assert.ok(m, 'titipanExpenseModal harus ditemukan utuh di MODAL_HTML');
  return m[0];
}

function baseD(overrides) {
  return Object.assign({
    investments: [
      {
        id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
        owners: [
          { ownerId: 'budi', porsi: 60, ownerName: 'Budi', isSelf: false },
          { ownerId: 'cici', porsi: 40, ownerName: 'Cici', isSelf: false },
        ],
      },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
    accounts: [{ id: 'acc1', name: 'Cash' }],
    titipanCommitments: [], titipanReturns: [], transactions: [], piutang: [], assets: [],
  }, overrides || {});
}

function makeCtx(D, dom) {
  let saveCalls = 0;
  const toastMessages = [];
  const openModalCalls = [];
  const closeModalCalls = [];
  const renderCalls = { presenter: 0, keuangan: 0 };
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/finance/piutang-utang.js',
      'modules/finance/transaksi.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/finance/titipan-expense-flow.js',
      'modules/finance/titipan-expense-ui.js',
    ],
    {
      D,
      document: dom,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      todayStr: () => '2026-08-09',
      save: () => { saveCalls++; },
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp' + Math.round(n || 0),
      fmtFull: (n) => 'Rp' + Math.round(n || 0),
      sameId: (a, b) => a === b,
      askConfirm: async () => true,
      toast: (msg) => { toastMessages.push(msg); },
      openModal: (id) => { openModalCalls.push(id); },
      closeModal: (id) => { closeModalCalls.push(id); },
      updateAmtPreview: () => {},
      evalAmtExpr: () => {},
      withSaveGuardAsync: async (key, modalId, fn) => fn(),
      renderDashboard: () => {}, renderKeuangan: () => { renderCalls.keuangan++; },
      renderCnTab: () => {}, renderProductList: () => {}, renderShop: () => {},
      renderShopRecent: () => {}, renderStockList: () => {},
    },
    [
      'DanaTitipanPortfolioAPI', 'resolveTxTitipanOwner', 'applyTxTitipanLinkageOnSave',
      'maybeCreateTitipanTalanganPiutang', 'syncTitipanTalanganPiutangOnEdit',
      'removeUnpaidTitipanTalanganPiutangForTx', 'delTx', 'MultiOwnerEngine',
      'TitipanExpenseFlow', 'TitipanExpenseUI', 'DanaTitipanPortfolioPresenter',
    ],
  );
  const origRender = ctx.DanaTitipanPortfolioPresenter.render.bind(ctx.DanaTitipanPortfolioPresenter);
  ctx.DanaTitipanPortfolioPresenter.render = (...args) => { renderCalls.presenter++; return origRender(...args); };
  ctx._saveCalls = () => saveCalls;
  ctx._toastMessages = toastMessages;
  ctx._openModalCalls = openModalCalls;
  ctx._closeModalCalls = closeModalCalls;
  ctx._renderCalls = renderCalls;
  return ctx;
}

// ============================================================
// LAPIS 1 -- gap-check: semua id yang dipakai TitipanExpenseUI (getElementById)
// memang ada di template titipanExpenseModal (S521-B1), & tombol Simpan/Hapus
// punya data-action yang benar.
// ============================================================

test('[gap-check] titipanExpenseModal: semua id yang dipakai TitipanExpenseUI memang ada di template', () => {
  const html = extractModalHtml();
  const uiSrc = fs.readFileSync(path.join(ROOT, 'modules/finance/titipan-expense-ui.js'), 'utf8');
  const idsUsed = [...uiSrc.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  // id dinamis (titipanExpenseOwnerPorsi${i}) tidak match template statis
  // apa adanya -- dikecualikan dari cross-check (di-generate runtime, sudah
  // dites lewat DOM stateful di LAPIS 3).
  const staticIds = new Set(idsUsed.filter((id) => !id.includes('${')));
  assert.ok(staticIds.size >= 5, 'harus ada minimal beberapa getElementById statis dipanggil TitipanExpenseUI');
  for (const id of staticIds) {
    assert.match(html, new RegExp(`id="${id}"`), `id="${id}" dipanggil TitipanExpenseUI tapi TIDAK ADA di template titipanExpenseModal -- gap HTML/JS`);
  }
  assert.match(html, /data-action="TitipanExpenseUI\.save"/, 'tombol Simpan harus data-action="TitipanExpenseUI.save"');
  assert.match(html, /data-action="TitipanExpenseUI\.deleteFromModal"/, 'tombol Hapus harus data-action="TitipanExpenseUI.deleteFromModal"');
});

test('[gap-check] titipanExpenseAmt: oninput/onblur nyambung ke TitipanExpenseUI.onAmtInput (wiring S521-B2)', () => {
  const html = extractModalHtml();
  assert.match(html, /id="titipanExpenseAmt"[^>]*oninput="[^"]*TitipanExpenseUI\.onAmtInput\(\)/);
  assert.match(html, /id="titipanExpenseAmt"[^>]*onblur="[^"]*TitipanExpenseUI\.onAmtInput\(\)/);
});

test('[gap-check] titipanExpenseNote: oninput nyambung ke TitipanExpenseUI.onNoteInput (auto-suggest owner)', () => {
  const html = extractModalHtml();
  assert.match(html, /id="titipanExpenseNote"[^>]*oninput="[^"]*TitipanExpenseUI\.onNoteInput\(\)/);
});

test('[gap-check] render() Dana Titipan tab: tombol pemicu TitipanExpenseUI.open ada', () => {
  const presenterSrc = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render.js'), 'utf8');
  assert.match(presenterSrc, /data-action="TitipanExpenseUI\.open"/);
});

test('[gap-check] build.js: titipan-expense-flow.js dan titipan-expense-ui.js terdaftar di GROUP_B', () => {
  const buildSrc = fs.readFileSync(path.join(ROOT, 'scripts/build.js'), 'utf8');
  assert.match(buildSrc, /'modules\/finance\/titipan-expense-flow\.js'/);
  assert.match(buildSrc, /'modules\/finance\/titipan-expense-ui\.js'/);
});

// ============================================================
// LAPIS 2 -- open(): reset form, isi draft owner, buka modal.
// ============================================================

test('1. open(): tidak ada owner sama sekali -> pesan kosong, TIDAK error', () => {
  const dom = makeStatefulDom();
  const D = baseD({ investments: [] });
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.match(html, /Belum ada owner/);
  assert.deepEqual(ctx._openModalCalls, ['titipanExpenseModal']);
});

test('2. open(): owner ada -> daftar owner tampil, form direset (amt kosong, tanggal = todayStr(), tombol Hapus disembunyikan)', () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  dom.getElementById('titipanExpenseAmt').value = 'sisa lama';
  ctx.TitipanExpenseUI.open();
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.match(html, /Budi/);
  assert.match(html, /Cici/);
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '');
  assert.equal(dom.getElementById('titipanExpenseDate').value, '2026-08-09');
  assert.equal(dom.getElementById('titipanExpenseDelBtn').style.display, 'none');
});

// ============================================================
// LAPIS 3 -- toggleOwner()/onPorsiInput(): kolom porsi HANYA muncul saat
// >1 owner tercentang (Design Lock §7).
// ============================================================

test('3. toggleOwner(): 1 owner tercentang -> TIDAK ada input porsi di list', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.doesNotMatch(html, /titipanExpenseOwnerPorsi0/);
});

test('4. toggleOwner(): 2 owner tercentang -> input porsi muncul utk masing2 baris tercentang', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.match(html, /titipanExpenseOwnerPorsi0/);
  assert.match(html, /titipanExpenseOwnerPorsi1/);
});

// ============================================================
// _splitMode ('rata'/'manual') -- dropdown bagi porsi (baru, lanjutan
// auto-suggest owner). Default 'manual' (behavior lama dipertahankan
// persis, test 3 & 4 di atas TIDAK berubah); 'rata' murni opsi tambahan.
// ============================================================

test('9. onSplitModeChange("rata"): 2 owner tercentang -> porsi otomatis 50/50, field porsi jadi teks (bukan input)', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  ctx.TitipanExpenseUI.onSplitModeChange('rata');
  assert.equal(ctx.TitipanExpenseUI._draft[0].porsi, 50);
  assert.equal(ctx.TitipanExpenseUI._draft[1].porsi, 50);
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.doesNotMatch(html, /titipanExpenseOwnerPorsi0/);
  assert.doesNotMatch(html, /titipanExpenseOwnerPorsi1/);
  assert.match(html, /50%/);
});

test('10. onSplitModeChange("rata"): 3 owner tercentang -> total porsi tetap persis 100 (residual ke baris terakhir)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    investments: [{
      id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
      owners: [
        { ownerId: 'a', porsi: 34, ownerName: 'Ani', isSelf: false },
        { ownerId: 'b', porsi: 33, ownerName: 'Budi', isSelf: false },
        { ownerId: 'c', porsi: 33, ownerName: 'Cici', isSelf: false },
      ],
    }],
  });
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  ctx.TitipanExpenseUI.toggleOwner(2, true);
  ctx.TitipanExpenseUI.onSplitModeChange('rata');
  const total = ctx.TitipanExpenseUI._draft.reduce((s, o) => s + (o.porsi || 0), 0);
  assert.equal(Math.round(total * 100) / 100, 100);
});

test('11. toggleOwner() saat mode "rata": tambah owner ketiga -> porsi otomatis dihitung ulang rata (bukan cuma dipertahankan dari sebelumnya)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    investments: [{
      id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
      owners: [
        { ownerId: 'a', porsi: 34, ownerName: 'Ani', isSelf: false },
        { ownerId: 'b', porsi: 33, ownerName: 'Budi', isSelf: false },
        { ownerId: 'c', porsi: 33, ownerName: 'Cici', isSelf: false },
      ],
    }],
  });
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  ctx.TitipanExpenseUI.onSplitModeChange('rata');
  assert.equal(ctx.TitipanExpenseUI._draft[0].porsi, 50);
  ctx.TitipanExpenseUI.toggleOwner(2, true); // masih mode 'rata' -> harus dihitung ulang jadi ~33.33 tiap owner
  const total = ctx.TitipanExpenseUI._draft.reduce((s, o) => s + (o.porsi || 0), 0);
  assert.equal(Math.round(total * 100) / 100, 100);
  assert.ok(ctx.TitipanExpenseUI._draft[0].porsi < 40, 'porsi owner pertama harus turun setelah owner ke-3 ditambah di mode rata');
});

test('12. onSplitModeChange("manual") setelah "rata": angka porsi terakhir dipertahankan, field kembali jadi input editable', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  ctx.TitipanExpenseUI.onSplitModeChange('rata');
  ctx.TitipanExpenseUI.onSplitModeChange('manual');
  assert.equal(ctx.TitipanExpenseUI._draft[0].porsi, 50);
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.match(html, /titipanExpenseOwnerPorsi0/);
  assert.match(html, /titipanExpenseOwnerPorsi1/);
});

test('13. dropdown bagi porsi TIDAK muncul kalau cuma 1 owner tercentang', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.doesNotMatch(html, /TitipanExpenseUI\.onSplitModeChange/);
});

// ============================================================
// onNoteInput() -- auto-suggest owner dari catatan (baru).
// ============================================================

test('5. onNoteInput(): catatan mengandung nama 1 owner -> owner itu otomatis tercentang', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  dom.getElementById('titipanExpenseNote').value = 'Bayar renov punya Budi';
  ctx.TitipanExpenseUI.onNoteInput();
  assert.equal(ctx.TitipanExpenseUI._draft[0].selected, true);
  assert.equal(ctx.TitipanExpenseUI._draft[1].selected, false);
});

test('6. onNoteInput(): catatan cocok ke 2 nama owner sekaligus (ambigu) -> TIDAK ada yang dicentang otomatis', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  dom.getElementById('titipanExpenseNote').value = 'Patungan Budi dan Cici beli galon';
  ctx.TitipanExpenseUI.onNoteInput();
  assert.equal(ctx.TitipanExpenseUI._draft[0].selected, false);
  assert.equal(ctx.TitipanExpenseUI._draft[1].selected, false);
});

test('7. onNoteInput(): owner sudah dicentang manual -> TIDAK ditimpa oleh auto-suggest', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(1, true); // Cici dicentang manual
  dom.getElementById('titipanExpenseNote').value = 'Beli galon buat Budi';
  ctx.TitipanExpenseUI.onNoteInput();
  assert.equal(ctx.TitipanExpenseUI._draft[0].selected, false);
  assert.equal(ctx.TitipanExpenseUI._draft[1].selected, true);
});

test('8. onNoteInput(): catatan tidak cocok nama manapun -> tidak error, tidak ada yang dicentang', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  dom.getElementById('titipanExpenseNote').value = 'Beli galon warung';
  ctx.TitipanExpenseUI.onNoteInput();
  assert.equal(ctx.TitipanExpenseUI._draft[0].selected, false);
  assert.equal(ctx.TitipanExpenseUI._draft[1].selected, false);
});

// ============================================================
// S521-E hardening: _renderOwnersList() HARUS escapeHtml() nama owner --
// belum pernah dites eksplisit dgn payload XSS sebelumnya (cuma dites
// implisit lewat gap-check id template). ownerName di sini SENGAJA
// mengandung karakter HTML-unsafe (bukan skenario realistis biasa,
// tapi memverifikasi tidak ada raw-injection kalau data lama/aneh).
// ============================================================
test('[hardening] _renderOwnersList(): nama owner di-escapeHtml(), TIDAK raw-inject ke DOM', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    investments: [
      {
        id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
        owners: [
          { ownerId: 'evil', porsi: 100, ownerName: '<img src=x onerror=alert(1)>', isSelf: false },
        ],
      },
    ],
  });
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  const html = dom.getElementById('titipanExpenseOwnersList').innerHTML;
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

// ============================================================
// LAPIS 4 -- preview split real-time (murni panggil TitipanExpenseFlow.
// computeSplitRows() yang sudah ada, 0 rumus baru).
// ============================================================

test('5. preview split: single owner + amt -> preview tampilkan nama & nominal penuh', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  dom.getElementById('titipanExpenseAmt').value = '100000';
  ctx.TitipanExpenseUI.onAmtInput();
  const preview = dom.getElementById('titipanExpenseSplitPreview').innerHTML;
  assert.match(preview, /Budi/);
  assert.match(preview, /100000/);
});

test('6. preview split: multi owner + porsi -> preview tampilkan hasil split proporsional', () => {
  const dom = makeStatefulDom();
  const ctx = makeCtx(baseD(), dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  ctx.TitipanExpenseUI.onPorsiInput(0, '60');
  ctx.TitipanExpenseUI.onPorsiInput(1, '40');
  dom.getElementById('titipanExpenseAmt').value = '100000';
  ctx.TitipanExpenseUI.onAmtInput();
  const preview = dom.getElementById('titipanExpenseSplitPreview').innerHTML;
  assert.match(preview, /Budi/);
  assert.match(preview, /60000/);
  assert.match(preview, /Cici/);
  assert.match(preview, /40000/);
});

// ============================================================
// LAPIS 5 -- save(): delegasi penuh ke TitipanExpenseFlow.submit(), 0
// logic tulis-D baru di sini.
// ============================================================

test('7. save(): single owner -> TitipanExpenseFlow.submit() dipanggil, 1 transaksi tersimpan, modal ditutup, presenter/keuangan di-render ulang', async () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  dom.getElementById('titipanExpenseAmt').value = '100000';
  dom.getElementById('titipanExpenseNote').value = 'Beli galon';
  await ctx.TitipanExpenseUI.save();
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].amount, 100000);
  assert.equal(D.transactions[0].titipanLinkId, 'budi');
  assert.equal(D.transactions[0].accountId, 'acc1');
  // FIX (audit "Pemilik Sumber Potongan" tidak sync): deductionOwnerId
  // sekarang WAJIB terisi sama dengan titipanLinkId (1 baris split = 1
  // owner) supaya badge "Ditanggung"/"Porsi per Pemilik"/"Estimasi dari
  // Transaksi Akun" di dashboard Dana Titipan (resolveTxOwnerAssignment(),
  // filter-laporan.js) tidak jatuh ke fallback owner pertama.
  assert.equal(D.transactions[0].deductionOwnerId, 'budi');
  assert.equal(D.transactions[0].category, 'Beli galon');
  assert.deepEqual(ctx._closeModalCalls, ['titipanExpenseModal']);
  assert.equal(ctx._renderCalls.presenter, 1);
  assert.equal(ctx._renderCalls.keuangan, 1);
});

test('7b. open(): dropdown #titipanExpenseAcc terisi semua D.accounts & default ke akun pertama', () => {
  const dom = makeStatefulDom();
  const D = baseD({ accounts: [{ id: 'acc1', name: 'Cash' }, { id: 'acc2', name: 'Seabank' }] });
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  const accEl = dom.getElementById('titipanExpenseAcc');
  assert.match(accEl.innerHTML, /value="acc1"/);
  assert.match(accEl.innerHTML, /value="acc2"/);
  assert.equal(accEl.value, 'acc1');
});

test('7c. save(): ganti #titipanExpenseAcc ke akun lain -> transaksi tersimpan pakai akun yang dipilih, BUKAN hardcode akun pertama', async () => {
  const dom = makeStatefulDom();
  const D = baseD({ accounts: [{ id: 'acc1', name: 'Cash' }, { id: 'acc2', name: 'Seabank' }] });
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  dom.getElementById('titipanExpenseAmt').value = '100000';
  dom.getElementById('titipanExpenseAcc').value = 'acc2';
  await ctx.TitipanExpenseUI.save();
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].accountId, 'acc2');
});

test('8. save(): tidak ada owner tercentang -> toast peringatan, TIDAK memanggil submit (0 transaksi)', async () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  dom.getElementById('titipanExpenseAmt').value = '100000';
  await ctx.TitipanExpenseUI.save();
  assert.equal(D.transactions.length, 0);
  assert.ok(ctx._toastMessages.some((m) => /pemilik/i.test(m)));
  assert.equal(ctx._closeModalCalls.length, 0);
});

test('9. save(): TitipanExpenseFlow.submit() gagal (nominal 0) -> toast reason, modal TIDAK ditutup, 0 transaksi', async () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  dom.getElementById('titipanExpenseAmt').value = '0';
  await ctx.TitipanExpenseUI.save();
  assert.equal(D.transactions.length, 0);
  assert.equal(ctx._closeModalCalls.length, 0);
  assert.ok(ctx._toastMessages.length > 0);
});

test('10. save(): talangan dicentang -> tx.titipanTalangan true & piutang otomatis tercatat (delegasi S519, 0 logic baru)', async () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  dom.getElementById('titipanExpenseAmt').value = '50000';
  dom.getElementById('titipanExpenseTalangan').checked = true;
  await ctx.TitipanExpenseUI.save();
  assert.equal(D.transactions[0].titipanTalangan, true);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].nilai, 50000);
});

test('11. save(): multi owner -> N transaksi terpisah tersimpan (delegasi TitipanExpenseFlow, 0 logic split baru di UI)', async () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  ctx.TitipanExpenseUI.toggleOwner(1, true);
  ctx.TitipanExpenseUI.onPorsiInput(0, '60');
  ctx.TitipanExpenseUI.onPorsiInput(1, '40');
  dom.getElementById('titipanExpenseAmt').value = '100000';
  await ctx.TitipanExpenseUI.save();
  assert.equal(D.transactions.length, 2);
  const linkIds = D.transactions.map((t) => t.titipanLinkId).sort();
  assert.deepEqual(linkIds, ['budi', 'cici']);
});

test('12. deleteFromModal(): TIDAK memanggil delTx(), cuma toast informasi (Design Lock §14 -- DELETE tetap lewat Riwayat Transaksi)', async () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  ctx.TitipanExpenseUI.open();
  ctx.TitipanExpenseUI.toggleOwner(0, true);
  dom.getElementById('titipanExpenseAmt').value = '50000';
  await ctx.TitipanExpenseUI.save();
  const txCountBefore = D.transactions.length;
  await ctx.TitipanExpenseUI.deleteFromModal();
  assert.equal(D.transactions.length, txCountBefore);
  assert.ok(ctx._toastMessages.some((m) => /Riwayat Transaksi/.test(m)));
});
