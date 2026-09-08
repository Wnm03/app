'use strict';
// tests/fuel-price-ref.test.js — cakupan modules/vehicle/fuel-price-ref.js (Sesi 749)
// Pola sama persis tests/pajak-pbb-zakat-crud.test.js (RefAI): harness loadSource,
// stub document permisif + predefined element, tanpa jsdom. Fokus ke logic murni:
//   - ITEMS (6 jenis BBM) & systemPrompt() (skema JSON mencakup semua key)
//   - check() (sukses/gagal API, reuse RefAI._parseJSON, set lastCheckedAt)
//   - renderDraft()/applySelected() (checkbox terpilih -> tulis ke D.fuelPriceRef)
//   - populateSelect()/onSelectChange() (dropdown "Jenis BBM", tanpa DOM nyata)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop === 'dispatchEvent') return () => true;
      if (prop === 'matches') return () => false;
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}

function makeDoc(predefined = {}, queryAllResult = []) {
  return {
    getElementById: (id) => (id in predefined ? predefined[id] : autoEl()),
    querySelectorAll: () => queryAllResult,
  };
}

function makeD(overrides = {}) {
  return Object.assign(
    {
      profile: { apiKey: 'k', apiProvider: 'claude' },
      fuelPriceRef: {
        pertalite: 10000, pertamax: 12500, pertamaxTurbo: 14000,
        pertaminaDex: 13800, dexlite: 13600, solar: 6800,
        lastType: 'pertalite', lastCheckedAt: null, refSources: {},
      },
    },
    overrides,
  );
}

function makeRefAIStub(parseImpl) {
  return { _parseJSON: parseImpl || ((t) => { try { return JSON.parse(t); } catch (e) { return null; } }) };
}

function makeCtx({ document, D, calls, callAIProviderRaw, RefAI }) {
  return loadSource(
    ['modules/vehicle/fuel-price-ref.js'],
    {
      document, D,
      escapeHtml: (s) => String(s),
      fmtFull: (n) => 'RpFull' + n,
      save: () => calls.push('save'),
      toast: (msg) => calls.push('toast:' + msg),
      openModal: (id) => calls.push('open:' + id),
      closeModal: (id) => calls.push('close:' + id),
      todayStr: () => '2026-09-07',
      aiErrorHint: () => '',
      callAIProviderRaw: callAIProviderRaw || (async () => ({ ok: true, text: '{}' })),
      RefAI: RefAI || makeRefAIStub(),
    },
    ['FuelPriceRef'],
  );
}

// ---------------------------------------------------------------------------
// ITEMS & systemPrompt()
// ---------------------------------------------------------------------------

test('FuelPriceRef.ITEMS berisi persis 6 jenis BBM sesuai data model D.fuelPriceRef', () => {
  const calls = [];
  const ctx = makeCtx({ document: makeDoc(), D: makeD(), calls });
  // objek/array dari vm sandbox = realm asing (beda Object/Array prototype dari Node
  // realm) -> deepEqual lintas-realm bisa gagal biar pun isinya sama; JSON roundtrip
  // dulu supaya dibandingkan sbg plain value di realm Node.
  const keys = JSON.parse(JSON.stringify(ctx.FuelPriceRef.ITEMS.map((it) => it.key)));
  assert.deepEqual(keys, ['pertalite', 'pertamax', 'pertamaxTurbo', 'pertaminaDex', 'dexlite', 'solar']);
  ctx.FuelPriceRef.ITEMS.forEach((it) => assert.equal(typeof it.label, 'string'));
});

test('FuelPriceRef.systemPrompt() menyertakan skema JSON utk semua 6 key', () => {
  const calls = [];
  const ctx = makeCtx({ document: makeDoc(), D: makeD(), calls });
  const prompt = ctx.FuelPriceRef.systemPrompt();
  ctx.FuelPriceRef.ITEMS.forEach((it) => {
    assert.ok(prompt.includes(`"${it.key}"`), `prompt harus menyebut key ${it.key}`);
  });
  assert.ok(/JSON/.test(prompt));
});

// ---------------------------------------------------------------------------
// check()
// ---------------------------------------------------------------------------

test('check() tanpa API key -> toast peringatan, tidak buka modal', async () => {
  const calls = [];
  const D = makeD({ profile: { apiKey: '', apiProvider: 'claude' } });
  const ctx = makeCtx({ document: makeDoc(), D, calls });
  await ctx.FuelPriceRef.check();
  assert.ok(calls.some((c) => c.startsWith('toast:⚠️ Belum ada API Key')));
  assert.ok(!calls.some((c) => c.startsWith('open:')));
});

test('check() sukses -> parse via RefAI._parseJSON, simpan draft, render, set lastCheckedAt', async () => {
  const calls = [];
  const D = makeD();
  const draftPayload = { pertalite: { value: 10500, source: 'Pertamina', tanggal: '2026-09-01' } };
  const els = { fuelRefBody: autoEl(), fuelRefApplyBtn: { disabled: false }, fuelRefCheckBtn: { disabled: false, textContent: '' } };
  let parseCalledWith = null;
  const RefAI = makeRefAIStub((t) => { parseCalledWith = t; return draftPayload; });
  const ctx = makeCtx({
    document: makeDoc(els),
    D, calls, RefAI,
    callAIProviderRaw: async () => ({ ok: true, text: 'RAW_TEXT' }),
  });
  await ctx.FuelPriceRef.check();
  assert.equal(parseCalledWith, 'RAW_TEXT');
  assert.deepEqual(ctx.FuelPriceRef._draft, draftPayload);
  assert.equal(D.fuelPriceRef.lastCheckedAt, '2026-09-07');
  assert.ok(calls.includes('open:fuelRefModal'));
  assert.ok(calls.includes('save'));
});

test('check() gagal API (r.ok=false) -> body diisi pesan error, draft tetap null', async () => {
  const calls = [];
  const D = makeD();
  const els = { fuelRefBody: autoEl(), fuelRefApplyBtn: { disabled: false }, fuelRefCheckBtn: { disabled: false, textContent: '' } };
  const ctx = makeCtx({
    document: makeDoc(els),
    D, calls,
    callAIProviderRaw: async () => ({ ok: false, errMsg: 'timeout', status: 500 }),
  });
  await ctx.FuelPriceRef.check();
  assert.equal(ctx.FuelPriceRef._draft, null);
  assert.ok(String(els.fuelRefBody.innerHTML).includes('Gagal hubungi'));
});

test('check() balasan tidak bisa di-parse -> pesan error, draft tetap null', async () => {
  const calls = [];
  const D = makeD();
  const els = { fuelRefBody: autoEl(), fuelRefApplyBtn: { disabled: false }, fuelRefCheckBtn: { disabled: false, textContent: '' } };
  const RefAI = makeRefAIStub(() => null);
  const ctx = makeCtx({
    document: makeDoc(els),
    D, calls, RefAI,
    callAIProviderRaw: async () => ({ ok: true, text: 'bukan json' }),
  });
  await ctx.FuelPriceRef.check();
  assert.equal(ctx.FuelPriceRef._draft, null);
  assert.ok(String(els.fuelRefBody.innerHTML).includes('tidak bisa dibaca'));
});

// ---------------------------------------------------------------------------
// applySelected()
// ---------------------------------------------------------------------------

test('applySelected() tanpa draft -> toast peringatan, tidak mengubah D.fuelPriceRef', () => {
  const calls = [];
  const D = makeD();
  const before = JSON.stringify(D.fuelPriceRef);
  const ctx = makeCtx({ document: makeDoc(), D, calls });
  ctx.FuelPriceRef.applySelected();
  assert.ok(calls.some((c) => c.startsWith('toast:⚠️ Belum ada hasil cek')));
  assert.equal(JSON.stringify(D.fuelPriceRef), before);
});

test('applySelected() tanpa checkbox tercentang -> toast peringatan, 0 perubahan', () => {
  const calls = [];
  const D = makeD();
  const ctx = makeCtx({ document: makeDoc({}, []), D, calls });
  ctx.FuelPriceRef._draft = { pertalite: { value: 10500, source: 'X', tanggal: 'Y' } };
  ctx.FuelPriceRef.applySelected();
  assert.ok(calls.some((c) => c.startsWith('toast:⚠️ Centang minimal 1 jenis BBM')));
  assert.equal(D.fuelPriceRef.pertalite, 10000);
});

test('applySelected() dgn checkbox tercentang -> tulis harga + refSources, save(), tutup modal, toast sukses', () => {
  const calls = [];
  const D = makeD();
  const checkboxes = [
    { dataset: { refkey: 'pertalite' } },
    { dataset: { refkey: 'solar' } },
  ];
  const ctx = makeCtx({ document: makeDoc({}, checkboxes), D, calls });
  ctx.FuelPriceRef._draft = {
    pertalite: { value: 10500, source: 'Pertamina', tanggal: '2026-09-01' },
    solar: { value: null, source: 'tidak ketemu', tanggal: '' }, // invalid -> dilewati
  };
  ctx.FuelPriceRef.applySelected();
  assert.equal(D.fuelPriceRef.pertalite, 10500);
  assert.deepEqual(JSON.parse(JSON.stringify(D.fuelPriceRef.refSources.pertalite)), { source: 'Pertamina', tanggal: '2026-09-01' });
  assert.equal(D.fuelPriceRef.solar, 6800); // tidak berubah krn value null
  assert.ok(!('solar' in D.fuelPriceRef.refSources));
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('close:fuelRefModal'));
  assert.ok(calls.some((c) => c.startsWith('toast:✅ 1 harga BBM')));
});

// ---------------------------------------------------------------------------
// populateSelect() / onSelectChange()
// ---------------------------------------------------------------------------

test('populateSelect() mengisi 6 <option> & set value ke lastType tersimpan', () => {
  const calls = [];
  const D = makeD({ fuelPriceRef: Object.assign(makeD().fuelPriceRef, { lastType: 'pertamax' }) });
  const sel = { innerHTML: '', value: '' };
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel }), D, calls });
  ctx.FuelPriceRef.populateSelect('jenisBbmSelect');
  assert.equal((sel.innerHTML.match(/<option/g) || []).length, 6);
  assert.equal(sel.value, 'pertamax');
});

test('populateSelect() fallback ke "pertalite" kalau lastType belum pernah diisi', () => {
  const calls = [];
  const D = makeD();
  delete D.fuelPriceRef.lastType;
  const sel = { innerHTML: '', value: '' };
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel }), D, calls });
  ctx.FuelPriceRef.populateSelect('jenisBbmSelect');
  assert.equal(sel.value, 'pertalite');
});

test('onSelectChange() menyimpan lastType & mengisi field harga dari referensi tersimpan', () => {
  const calls = [];
  const D = makeD();
  const sel = { value: 'pertamax' };
  const harga = { value: '' };
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel, bbmHarga: harga }), D, calls });
  ctx.FuelPriceRef.onSelectChange('jenisBbmSelect', 'bbmHarga');
  assert.equal(D.fuelPriceRef.lastType, 'pertamax');
  assert.ok(calls.includes('save'));
  assert.equal(harga.value, 12500);
});

test('onSelectChange() tanpa hargaId -> tetap simpan lastType, tidak menyentuh field harga', () => {
  const calls = [];
  const D = makeD();
  const sel = { value: 'solar' };
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel }), D, calls });
  ctx.FuelPriceRef.onSelectChange('jenisBbmSelect');
  assert.equal(D.fuelPriceRef.lastType, 'solar');
  assert.ok(calls.includes('save'));
});

test('onSelectChange() jenis BBM belum ada harga referensi -> field harga tidak diubah', () => {
  const calls = [];
  const D = makeD({ fuelPriceRef: Object.assign(makeD().fuelPriceRef, { pertamaxTurbo: null }) });
  const sel = { value: 'pertamaxTurbo' };
  const harga = { value: 'ORIGINAL' };
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel, bbmHarga: harga }), D, calls });
  ctx.FuelPriceRef.onSelectChange('jenisBbmSelect', 'bbmHarga');
  assert.equal(D.fuelPriceRef.lastType, 'pertamaxTurbo');
  assert.equal(harga.value, 'ORIGINAL');
});

// ---------------------------------------------------------------------------
// Sesi fix: check(selectId,hargaId) -> _activeCtx -> applySelected() me-refresh
// field Harga/Liter yg SEDANG DIBUKA (laporan user: "Rekomendasi Harga BBM
// tidak sync ke Harga/Liter" -- lihat komentar _refreshActiveHargaField()).
// ---------------------------------------------------------------------------

test('check(selectId,hargaId) menyimpan _activeCtx supaya applySelected() tau field mana yg direfresh', async () => {
  const calls = [];
  const D = makeD();
  const els = { fuelRefBody: autoEl(), fuelRefApplyBtn: { disabled: false }, fuelRefCheckBtn: { disabled: false, textContent: '' } };
  const ctx = makeCtx({ document: makeDoc(els), D, calls, callAIProviderRaw: async () => ({ ok: true, text: '{}' }) });
  await ctx.FuelPriceRef.check('txBbmJenis', 'txBbmHargaL');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.FuelPriceRef._activeCtx)), { selectId: 'txBbmJenis', hargaId: 'txBbmHargaL' });
});

test('check() tanpa argumen (dipanggil dari pemanggil lama) -> _activeCtx null, tidak error', async () => {
  const calls = [];
  const D = makeD();
  const els = { fuelRefBody: autoEl(), fuelRefApplyBtn: { disabled: false }, fuelRefCheckBtn: { disabled: false, textContent: '' } };
  const ctx = makeCtx({ document: makeDoc(els), D, calls, callAIProviderRaw: async () => ({ ok: true, text: '{}' }) });
  await ctx.FuelPriceRef.check();
  assert.equal(ctx.FuelPriceRef._activeCtx, null);
});

test('applySelected() dgn _activeCtx aktif & jenis dropdown = jenis yg diapply -> field Harga/Liter ikut terisi nilai baru', () => {
  const calls = [];
  const D = makeD();
  const checkboxes = [{ dataset: { refkey: 'pertalite' } }];
  const sel = { value: 'pertalite' };
  const harga = { value: '' };
  const ctx = makeCtx({
    document: makeDoc({ txBbmJenis: sel, txBbmHargaL: harga }, checkboxes),
    D, calls,
  });
  ctx.FuelPriceRef._activeCtx = { selectId: 'txBbmJenis', hargaId: 'txBbmHargaL' };
  ctx.FuelPriceRef._draft = { pertalite: { value: 10500, source: 'Pertamina', tanggal: '2026-09-01' } };
  ctx.FuelPriceRef.applySelected();
  assert.equal(D.fuelPriceRef.pertalite, 10500);
  assert.equal(harga.value, 10500);
});

test('applySelected() dgn _activeCtx & dropdown Jenis BBM menunjuk jenis LAIN dari yg dicentang -> field Harga/Liter tetap disinkronkan ke nilai tersimpan utk jenis yg SEDANG DIPILIH (bukan yg dicentang)', () => {
  const calls = [];
  const D = makeD(); // pertalite tersimpan = 10000, tidak berubah ronde ini
  const checkboxes = [{ dataset: { refkey: 'pertamax' } }];
  const sel = { value: 'pertalite' }; // dropdown lagi nunjuk pertalite, bukan pertamax yg diapply
  const harga = { value: 'ORIGINAL' };
  const ctx = makeCtx({
    document: makeDoc({ txBbmJenis: sel, txBbmHargaL: harga }, checkboxes),
    D, calls,
  });
  ctx.FuelPriceRef._activeCtx = { selectId: 'txBbmJenis', hargaId: 'txBbmHargaL' };
  ctx.FuelPriceRef._draft = { pertamax: { value: 13000, source: 'Pertamina', tanggal: '2026-09-01' } };
  ctx.FuelPriceRef.applySelected();
  assert.equal(D.fuelPriceRef.pertamax, 13000); // referensi tersimpan pertamax tetap ke-update
  assert.equal(harga.value, 10000); // field disinkronkan ke harga pertalite TERSIMPAN (yg sedang dipilih di dropdown)
});

test('applySelected() tanpa _activeCtx (pemanggil lama tanpa selectId/hargaId) -> tidak error, tidak menyentuh field manapun', () => {
  const calls = [];
  const D = makeD();
  const checkboxes = [{ dataset: { refkey: 'pertalite' } }];
  const ctx = makeCtx({ document: makeDoc({}, checkboxes), D, calls });
  ctx.FuelPriceRef._draft = { pertalite: { value: 10500, source: 'Pertamina', tanggal: '2026-09-01' } };
  assert.doesNotThrow(() => ctx.FuelPriceRef.applySelected());
  assert.equal(D.fuelPriceRef.pertalite, 10500);
});
