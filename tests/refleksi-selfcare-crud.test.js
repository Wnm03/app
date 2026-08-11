'use strict';
// tests/refleksi-selfcare-crud.test.js — cakupan modules/home/refleksi-selfcare.js
// (Refleksi): family `modules/home` sebelumnya 0 test file (lihat
// docs/COVERAGE-PER-MODULE.md).
//
// Fokus: buka modal Refleksi (open/setTab), tombol Tambah/Hapus jurnal
// syukur, toggle checklist self-care, dan tombol Tambah/Hapus/Lihat catatan
// privat terenkripsi (fitur ini TIDAK punya tombol "Edit" terpisah di app —
// cuma Tambah/Hapus, sesuai kode aslinya).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}

function makeDoc(predefined = {}) {
  return { getElementById: (id) => predefined[id] || autoEl() };
}

function makeD(overrides = {}) {
  return Object.assign({ refleksi: {} }, overrides);
}

function makeCtx({ document, D, calls, confirmResult = true, sessionRawPin = null }) {
  return loadSource(
    ['modules/home/refleksi-selfcare.js'],
    {
      document, D,
      uid: (() => { let n = 1; return () => 'rf' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      todayStr: () => '2026-08-01',
      dateToISO: (d) => d.toISOString().slice(0, 10),
      save: () => calls.push('save'),
      openModal: (id) => calls.push('open:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      askConfirm: async () => { calls.push('askConfirm'); return confirmResult; },
      _sessionRawPin: sessionRawPin,
      encryptApiKeyWithPin: async (pin, plain) => 'ENC(' + plain + ')',
      decryptApiKeyWithPin: async (pin, enc) => (enc.startsWith('ENC(') ? enc.slice(4, -1) : null),
    },
    ['Refleksi'],
  );
}

// ===== Buka Modal Refleksi (open / setTab) =====

test('open() -> reset ke tab syukur, kosongkan _revealed, buka refleksiModal', () => {
  const calls = [];
  const { Refleksi } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  Refleksi._revealed = { n1: true };
  Refleksi.curTab = 'catatan';
  Refleksi.open();
  assert.equal(Refleksi.curTab, 'syukur');
  assert.deepEqual(Object.keys(Refleksi._revealed), []);
  assert.ok(calls.includes('open:refleksiModal'));
});

test('setTab("selfcare") -> curTab berpindah ke selfcare', () => {
  const calls = [];
  const { Refleksi } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  Refleksi.setTab('selfcare');
  assert.equal(Refleksi.curTab, 'selfcare');
});

// ===== Tombol Tambah/Hapus Jurnal Syukur =====

test('addGratitude() — teks kosong -> toast peringatan, TIDAK tersimpan', () => {
  const calls = [];
  const els = { refSyukurText: { value: '   ' } };
  const D = makeD();
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls });
  Refleksi.addGratitude();
  assert.equal((D.refleksi.gratitude || []).length, 0);
  assert.match(calls.join(','), /toast:.*Tulis dulu/);
});

test('addGratitude() — teks diisi -> masuk D.refleksi.gratitude, input dikosongkan', () => {
  const calls = [];
  const els = { refSyukurText: { value: 'Sehat hari ini' } };
  const D = makeD();
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls });
  Refleksi.addGratitude();
  assert.equal(D.refleksi.gratitude.length, 1);
  assert.equal(D.refleksi.gratitude[0].text, 'Sehat hari ini');
  assert.equal(els.refSyukurText.value, '');
  assert.ok(calls.includes('save'));
});

test('deleteGratitude() — dibatalkan -> catatan tetap ada', async () => {
  const calls = [];
  const D = makeD({ refleksi: { gratitude: [{ id: 'g1', date: '2026-07-30', text: 'x' }] } });
  const { Refleksi } = makeCtx({ document: makeDoc(), D, calls, confirmResult: false });
  await Refleksi.deleteGratitude('g1');
  assert.equal(D.refleksi.gratitude.length, 1);
});

test('deleteGratitude() — dikonfirmasi -> catatan terhapus', async () => {
  const calls = [];
  const D = makeD({ refleksi: { gratitude: [{ id: 'g1', date: '2026-07-30', text: 'x' }] } });
  const { Refleksi } = makeCtx({ document: makeDoc(), D, calls, confirmResult: true });
  await Refleksi.deleteGratitude('g1');
  assert.equal(D.refleksi.gratitude.length, 0);
});

// ===== Checklist Self-Care (toggle) =====

test('toggleSelfCare() — item belum dicentang -> ditambahkan ke log hari ini', () => {
  const calls = [];
  const D = makeD();
  const { Refleksi } = makeCtx({ document: makeDoc(), D, calls });
  Refleksi.toggleSelfCare('sc1');
  assert.equal(D.refleksi.selfCareLog['2026-08-01'].length, 1);
  assert.equal(D.refleksi.selfCareLog['2026-08-01'][0], 'sc1');
  assert.ok(calls.includes('save'));
});

test('toggleSelfCare() — item sudah dicentang -> dilepas dari log (array kosong -> key dihapus)', () => {
  const calls = [];
  const D = makeD({ refleksi: { selfCareLog: { '2026-08-01': ['sc1'] } } });
  const { Refleksi } = makeCtx({ document: makeDoc(), D, calls });
  Refleksi.toggleSelfCare('sc1');
  assert.equal(D.refleksi.selfCareLog['2026-08-01'], undefined);
});

// ===== Tombol Tambah/Hapus/Lihat Catatan Privat (terenkripsi) =====

test('addNote() — sesi PIN tidak aktif -> toast peringatan, TIDAK tersimpan', async () => {
  const calls = [];
  const els = { refCatatanJudul: { value: 'Judul' }, refCatatanText: { value: 'Isi rahasia' } };
  const D = makeD();
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls, sessionRawPin: null });
  await Refleksi.addNote();
  assert.equal((D.refleksi.privateNotes || []).length, 0);
  assert.match(calls.join(','), /toast:.*Sesi PIN/);
});

test('addNote() — teks kosong -> toast peringatan, TIDAK tersimpan (walau sesi PIN aktif)', async () => {
  const calls = [];
  const els = { refCatatanJudul: { value: '' }, refCatatanText: { value: '  ' } };
  const D = makeD();
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls, sessionRawPin: '123456' });
  await Refleksi.addNote();
  assert.equal((D.refleksi.privateNotes || []).length, 0);
});

test('addNote() — sesi PIN aktif & teks diisi -> catatan terenkripsi tersimpan, input dikosongkan', async () => {
  const calls = [];
  const els = { refCatatanJudul: { value: 'Rencana' }, refCatatanText: { value: 'Rahasia keluarga' } };
  const D = makeD();
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls, sessionRawPin: '123456' });
  await Refleksi.addNote();
  assert.equal(D.refleksi.privateNotes.length, 1);
  assert.match(D.refleksi.privateNotes[0].enc, /^ENC\(/);
  assert.equal(els.refCatatanJudul.value, '');
  assert.equal(els.refCatatanText.value, '');
  assert.ok(calls.includes('save'));
});

test('deleteNote() — dibatalkan -> catatan tetap ada', async () => {
  const calls = [];
  const D = makeD({ refleksi: { privateNotes: [{ id: 'n1', date: '2026-07-30', enc: 'ENC(x)' }] } });
  const { Refleksi } = makeCtx({ document: makeDoc(), D, calls, confirmResult: false });
  await Refleksi.deleteNote('n1');
  assert.equal(D.refleksi.privateNotes.length, 1);
});

test('deleteNote() — dikonfirmasi -> catatan terhapus & status _revealed ikut dibersihkan', async () => {
  const calls = [];
  const D = makeD({ refleksi: { privateNotes: [{ id: 'n1', date: '2026-07-30', enc: 'ENC(x)' }] } });
  const { Refleksi } = makeCtx({ document: makeDoc(), D, calls, confirmResult: true });
  Refleksi._revealed = { n1: true };
  await Refleksi.deleteNote('n1');
  assert.equal(D.refleksi.privateNotes.length, 0);
  assert.equal(Refleksi._revealed.n1, undefined);
});

test('toggleNoteView() — tap pertama -> dekripsi & tampilkan (revealed=true)', async () => {
  const calls = [];
  const els = { refNoteBody_n1: { textContent: '' }, refNoteEyeBtn_n1: { textContent: '👁' } };
  const D = makeD({ refleksi: { privateNotes: [{ id: 'n1', date: '2026-07-30', enc: 'ENC(' + JSON.stringify({ title: 'T', text: 'Isi' }) + ')' }] } });
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls, sessionRawPin: '123456' });
  await Refleksi.toggleNoteView('n1');
  assert.equal(Refleksi._revealed.n1, true);
  assert.equal(els.refNoteEyeBtn_n1.textContent, '🙈');
  assert.match(els.refNoteBody_n1.innerHTML, /Isi/);
});

test('toggleNoteView() — tap kedua (sudah revealed) -> disembunyikan lagi, TIDAK perlu dekripsi ulang', async () => {
  const calls = [];
  const els = { refNoteBody_n1: { textContent: '' }, refNoteEyeBtn_n1: { textContent: '🙈' } };
  const D = makeD({ refleksi: { privateNotes: [{ id: 'n1', date: '2026-07-30', enc: 'ENC(x)' }] } });
  const { Refleksi } = makeCtx({ document: makeDoc(els), D, calls, sessionRawPin: '123456' });
  Refleksi._revealed = { n1: true };
  await Refleksi.toggleNoteView('n1');
  assert.equal(Refleksi._revealed.n1, undefined);
  assert.equal(els.refNoteEyeBtn_n1.textContent, '👁');
  assert.match(els.refNoteBody_n1.textContent, /Terenkripsi/);
});
