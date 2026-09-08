'use strict';
// tests/sa18a-aset-reports-penyusutan-dynamic-inline-attr.test.js — SA18a,
// sesi pertama epic lanjutan (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md,
// rekomendasi #3) setelah audit ulang SA18 (lihat
// SESSION-NOTE-SA18a-aset-reports-penyusutan-dynamic-inline-attr.md untuk
// ringkasan audit ulang lengkap: 41 "titik" tercatat lama di 20 file sisa
// ternyata cuma 31 titik nyata setelah difilter baris komentar, pola sama
// persis seperti temuan SA17).
//
// Cakupan sesi ini: modules/asset/aset-reports.js, objek Penyusutan
// (kartu "📉 Penyusutan Aset"), 6 titik — SEMUA pola 3-arg/1-arg literal +
// $value yang SUDAH ADA di SA15/SA16/SA17 (tidak ada varian baru):
//   1-4. 4x input/select onchange="Penyusutan.updateParam('id','field',this.value)"
//        -> data-onchange="Penyusutan.updateParam"
//           data-onchange-args='[id,"field","$value"]' (id & field literal,
//           escapeHtml(JSON.stringify([...])), token $value)
//   5. checkbox onchange="Penyusutan.toggleAktif('id')"
//      -> data-onchange="Penyusutan.toggleAktif"
//         data-onchange-args='["id"]' (1 literal, toggleAktif baca/tulis
//         state internal sendiri, TIDAK butuh $checked)
//
// 0 perubahan logic — updateParam()/toggleAktif() tidak disentuh.
//
// 2 lapis yang dikunci (pola sama SA11-SA17):
//   A. Gate statis permanen -- 0 kemunculan onchange=/onclick=/dst (bukan
//      data-*) di file ini.
//   B. Fungsional end-to-end -- markup nyata hasil Penyusutan.renderList()
//      punya data-onchange(-args) yang BENAR, DAN diproses lewat dispatcher
//      ASLI (_dataActionInputChangeHandler, diekstrak dari
//      modules/shared/features-helpers-global-security.js, TIDAK diubah)
//      benar-benar memanggil Penyusutan.updateParam()/toggleAktif() dengan
//      argumen yang tepat, mengubah state D.assets[].penyusutan sungguhan.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const SRC_PATH = path.join(__dirname, '..', 'modules', 'asset', 'aset-reports.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

// ---- Lapis A: gate statis (regex sama persis dgn audit S1588 & SA11-SA17) ----

test('SA18a gate: 0 atribut event inline (onclick=/onchange=/oninput=/dst) tersisa di aset-reports.js', () => {
  const matches = SRC.match(/(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g) || [];
  assert.deepEqual(matches, []);
});

test('SA18a gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=', () => {
  const positive = 'onchange="Penyusutan.updateParam(\'a1\',\'metode\',this.value)"';
  const negative = 'data-onchange="Penyusutan.updateParam"';
  const re = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g;
  assert.equal((positive.match(re) || []).length, 1);
  assert.equal((negative.match(re) || []).length, 0);
});

test('SA18a gate: tepat 6 titik data-onchange baru tersedia di source (5x updateParam + 1x toggleAktif)', () => {
  const updateParamCount = (SRC.match(/data-onchange="Penyusutan\.updateParam"/g) || []).length;
  const toggleAktifCount = (SRC.match(/data-onchange="Penyusutan\.toggleAktif"/g) || []).length;
  assert.equal(updateParamCount, 5);
  assert.equal(toggleAktifCount, 1);
  assert.equal(updateParamCount + toggleAktifCount, 6);
});

// ---- Lapis B: markup nyata + dispatcher asli end-to-end ----

function extractFnSource(src, fnName) {
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource(DISPATCHER_SRC, '_dataActionResolveArgs')}
${extractFnSource(DISPATCHER_SRC, '_dataActionInputChangeHandler')}
this._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa18a-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeElement(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

function makeCapturedEl() {
  return { innerHTML: '', textContent: '', classList: { remove: () => {}, add: () => {}, toggle: () => {} } };
}

function makeCtx(D) {
  const els = {
    assetPenyusutanDashboard: makeCapturedEl(),
    assetPenyusutanList: makeCapturedEl(),
    assetPenyusutanTotalAkumulasi: makeCapturedEl(),
    assetPenyusutanTotalBuku: makeCapturedEl(),
  };
  return {
    ctx: loadSource(
      ['modules/asset/aset-reports.js'],
      {
        D,
        Aset: { ICON: { Kendaraan: '🚗' } },
        escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c])),
        fmtFull: (n) => 'Rp ' + Math.round(n || 0),
        parsePzNum: (s) => Number(String(s).replace(/[^0-9.-]/g, '')) || 0,
        parseDecStr: (s) => Number(String(s).replace(/[^0-9.-]/g, '')) || 0,
        sameId: (a, b) => String(a) === String(b),
        save: () => {},
        todayStr: () => '2026-09-08',
        document: { getElementById: (id) => els[id] || null },
      },
      ['Penyusutan'],
    ),
    els,
  };
}

function makeD() {
  return {
    assets: [
      {
        id: 'a1',
        name: 'Motor Vario',
        jenis: 'Kendaraan',
        nilai: 15000000,
        modalInvestasi: 15000000,
        tanggal: '2024-01-01',
        penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 1000000, tarifPersen: 25 },
      },
    ],
  };
}

test('SA18a: markup input Umur Manfaat/Nilai Residu (garisLurus) pakai data-onchange, bukan onchange=', () => {
  const D = makeD();
  const { ctx, els } = makeCtx(D);
  ctx.Penyusutan.renderList();
  const html = els.assetPenyusutanList.innerHTML;
  assert.doesNotMatch(html, /(?<!data-)\bonchange=/);
  assert.match(html, /data-onchange="Penyusutan\.updateParam" data-onchange-args='\[&quot;a1&quot;,&quot;umurManfaatTahun&quot;,&quot;\$value&quot;\]'/);
  assert.match(html, /data-onchange="Penyusutan\.updateParam" data-onchange-args='\[&quot;a1&quot;,&quot;nilaiResidu&quot;,&quot;\$value&quot;\]'/);
});

test('SA18a: markup select Metode & checkbox Aktif berisi data-onchange dgn args yang benar', () => {
  const D = makeD();
  const { ctx, els } = makeCtx(D);
  ctx.Penyusutan.renderList();
  const html = els.assetPenyusutanList.innerHTML;
  assert.match(html, /data-onchange="Penyusutan\.updateParam" data-onchange-args='\[&quot;a1&quot;,&quot;metode&quot;,&quot;\$value&quot;\]'/);
  assert.match(html, /data-onchange="Penyusutan\.toggleAktif" data-onchange-args='\[&quot;a1&quot;\]'/);
});

test('SA18a: markup input Tarif per Tahun (saldoMenurun) pakai data-onchange dgn field literal benar', () => {
  const D = makeD();
  D.assets[0].penyusutan.metode = 'saldoMenurun';
  const { ctx, els } = makeCtx(D);
  ctx.Penyusutan.renderList();
  const html = els.assetPenyusutanList.innerHTML;
  assert.match(html, /data-onchange="Penyusutan\.updateParam" data-onchange-args='\[&quot;a1&quot;,&quot;tarifPersen&quot;,&quot;\$value&quot;\]'/);
});

test('SA18a end-to-end (change): dataset persis hasil migrasi -> updateParam("a1","umurManfaatTahun",$value) benar-benar mengubah D.assets[0].penyusutan', () => {
  const D = makeD();
  const { ctx } = makeCtx(D);

  const dispatchChange = makeChangeDispatcher({ Penyusutan: ctx.Penyusutan });
  const el = makeFakeElement({ onchange: 'Penyusutan.updateParam', onchangeArgs: '["a1","umurManfaatTahun","$value"]' });
  el.value = '6';
  dispatchChange({ type: 'change', target: el });

  assert.equal(D.assets[0].penyusutan.umurManfaatTahun, 6);
});

test('SA18a end-to-end (change): dataset persis hasil migrasi -> updateParam("a1","metode",$value) benar-benar mengganti metode', () => {
  const D = makeD();
  const { ctx } = makeCtx(D);

  const dispatchChange = makeChangeDispatcher({ Penyusutan: ctx.Penyusutan });
  const el = makeFakeElement({ onchange: 'Penyusutan.updateParam', onchangeArgs: '["a1","metode","$value"]' });
  el.value = 'manual';
  dispatchChange({ type: 'change', target: el });

  assert.equal(D.assets[0].penyusutan.metode, 'manual');
});

test('SA18a end-to-end (change): dataset persis hasil migrasi -> toggleAktif("a1") benar-benar membalik status aktif', () => {
  const D = makeD();
  D.assets[0].penyusutan.aktif = true;
  const { ctx } = makeCtx(D);

  const dispatchChange = makeChangeDispatcher({ Penyusutan: ctx.Penyusutan });
  const el = makeFakeElement({ onchange: 'Penyusutan.toggleAktif', onchangeArgs: '["a1"]' });
  dispatchChange({ type: 'change', target: el });

  assert.equal(D.assets[0].penyusutan.aktif, false);
});

test('SA18a end-to-end (change): toggleAktif() TIDAK butuh $checked -- args cuma 1 literal id, tetap benar walau el.checked tidak diisi', () => {
  const D = makeD();
  D.assets[0].penyusutan.aktif = false;
  const { ctx } = makeCtx(D);

  const dispatchChange = makeChangeDispatcher({ Penyusutan: ctx.Penyusutan });
  const el = makeFakeElement({ onchange: 'Penyusutan.toggleAktif', onchangeArgs: '["a1"]' });
  // sengaja TIDAK set el.checked sama sekali
  dispatchChange({ type: 'change', target: el });

  assert.equal(D.assets[0].penyusutan.aktif, true);
});
