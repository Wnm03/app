'use strict';
/**
 * S-ABS1 -- Absensi pribadi: (1) hari Minggu otomatis jenis "minggu" (tarif Minggu) tapi tetap bisa
 * diganti biasa/borongan, (2) jam template dari rutinitas (modus entri 'biasa' terbaru; pola hari
 * yg sama kalau >=2 sampel), (3) Simpan Cepat 1 ketukan, (4) anti-timpa tanggal terisi.
 * Murni logika Payroll (render/DOM di-stub), pola sama payroll-absensi-pokok-prorata-kurang-jam.test.js.
 * 2026-10-11 = Minggu, 2026-10-12 = Senin.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(o = {}) {
  const el = Object.assign({ value: '', checked: false, textContent: '', innerHTML: '', style: {}, scrollIntoView() {}, _hidden: false }, o);
  el.classList = { toggle(c, on) { if (c === 'u-dnone') el._hidden = !!on; }, add() {}, remove() {}, contains() { return false; } };
  return el;
}
const BASE = { whMasuk: '07:00', whPulang: '15:00', whIstMulai: '12:00', whIstSelesai: '13:00', whGaji: '65000',
  whPotongan: '', whTambahan: '', whBorTotal: '', whBorNote: '', whJenisHari: 'biasa', whDate: '2026-10-12' };

function setup(workDays = [], profile = {}, vals = {}) {
  const els = {};
  Object.entries({ ...BASE, ...vals }).forEach(([k, v]) => { els[k] = makeEl({ value: v }); });
  const document = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  const toasts = [];
  let n = 100;
  const D = { workDays, profile: Object.assign({ gajiPokok: 65000, lemburMultiplier: 1.5, tarifMinggu: 139000 }, profile) };
  const ctx = loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/shared/helper-teks.js', 'modules/business/payroll-absensi.js'],
    { document, D, uid: () => ++n, save() {}, toast: (m) => toasts.push(m),
      parsePzNum: (v) => parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0,
      fmtFull: (x) => String(x), fmt: (x) => String(x), askConfirm: async () => true, todayStr: () => '2026-10-12' },
    ['Payroll'],
  );
  ['renderWorkDays', 'renderDashMini', 'renderWeekGrid'].forEach((f) => { ctx.Payroll[f] = () => {}; });
  return { ctx, P: ctx.Payroll, els, D, toasts };
}
const wd = (id, date, masuk, pulang, extra = {}) => ({ id, date, masuk, pulang, istMulai: '12:00', istSelesai: '13:00',
  jenis: 'biasa', totalJam: 7, pokok: 65000, lembur: 0, potongan: 0, tambahan: 0, total: 65000, gajiHariInput: 65000, ...extra });

test('autoJenisForDate: Minggu -> minggu, hari lain & tanggal invalid -> biasa', () => {
  const { P } = setup();
  assert.equal(P.autoJenisForDate('2026-10-11'), 'minggu');
  assert.equal(P.autoJenisForDate('2026-10-12'), 'biasa');
  assert.equal(P.autoJenisForDate('2026-10-17'), 'biasa');
  assert.equal(P.autoJenisForDate(''), 'biasa');
});

test('jamTemplate: tanpa riwayat -> default 07:00-15:00 (source default)', () => {
  const { P } = setup();
  const t = P.jamTemplate('2026-10-12');
  assert.deepEqual([t.masuk, t.pulang, t.source], ['07:00', '15:00', 'default']);
});

test('jamTemplate: modus 5 entri biasa terakhir, bukan sekadar entri terakhir', () => {
  const rows = [
    wd(1, '2026-10-01', '08:00', '16:00'), wd(2, '2026-10-02', '08:00', '16:00'), wd(3, '2026-10-05', '08:00', '16:00'),
    wd(4, '2026-10-06', '07:00', '15:00'), wd(5, '2026-10-07', '09:00', '17:00'),
  ];
  const { P } = setup(rows);
  const t = P.jamTemplate('2026-10-12');
  assert.deepEqual([t.masuk, t.pulang, t.source], ['08:00', '16:00', 'umum']);
});

test('jamTemplate: entri Minggu & borongan TIDAK ikut template; tanggal yang sama dikecualikan', () => {
  const rows = [
    wd(1, '2026-10-05', '08:00', '16:00'),
    wd(2, '2026-10-11', '06:00', '10:00', { jenis: 'minggu' }),
    wd(3, '2026-10-10', '', '', { jenis: 'borongan' }),
    wd(4, '2026-10-12', '10:00', '18:00'),
  ];
  const { P } = setup(rows);
  const t = P.jamTemplate('2026-10-12');
  assert.deepEqual([t.masuk, t.pulang], ['08:00', '16:00']);
});

test('jamTemplate: seri -> yang paling baru menang', () => {
  const rows = [wd(1, '2026-10-05', '08:00', '16:00'), wd(2, '2026-10-06', '07:00', '15:00')];
  const { P } = setup(rows);
  const t = P.jamTemplate('2026-10-12');
  assert.deepEqual([t.masuk, t.pulang], ['07:00', '15:00']);
});

test('jamTemplate: hari yang sama (Sabtu) punya >=2 sampel -> pakai pola Sabtu (source hari)', () => {
  const rows = [
    wd(1, '2026-10-05', '08:00', '16:00'), wd(2, '2026-10-06', '08:00', '16:00'), wd(3, '2026-10-07', '08:00', '16:00'),
    wd(4, '2026-09-26', '07:00', '12:00'), wd(5, '2026-10-03', '07:00', '12:00'), // dua Sabtu
  ];
  const { P } = setup(rows);
  const t = P.jamTemplate('2026-10-10'); // Sabtu
  assert.deepEqual([t.masuk, t.pulang, t.source], ['07:00', '12:00', 'hari']);
  const senin = P.jamTemplate('2026-10-12');
  assert.equal(senin.source, 'umum');
});

test('applyDateDefaults: Minggu -> jenis minggu, jam form dari template, field jam disembunyikan (bisa dibuka lewat toggleJamManual)', () => {
  const rows = [wd(1, '2026-10-05', '08:00', '16:00'), wd(2, '2026-10-06', '08:00', '16:00')];
  const { P, els } = setup(rows);
  P.applyDateDefaults('2026-10-11');
  assert.equal(els.whJenisHari.value, 'minggu');
  assert.equal(els.whMasuk.value, '08:00');
  assert.equal(els.whJamFieldsWrap._hidden, true);
  assert.match(els.whAutoHint.innerHTML, /139000/);
  P.toggleJamManual();
  assert.equal(els.whJamFieldsWrap._hidden, false);
  P.applyDateDefaults('2026-10-12');
  assert.equal(els.whJenisHari.value, 'biasa');
  assert.equal(els.whJamFieldsWrap._hidden, false);
});

test('Minggu otomatis TETAP bisa diganti manual ke biasa / borongan', () => {
  const { P, els, D } = setup([]);
  els.whDate.value = '2026-10-11';
  P.applyDateDefaults('2026-10-11');
  els.whJenisHari.value = 'biasa'; // user override
  P.onJenisHariChange();
  P.addWorkDay();
  assert.equal(D.workDays[0].jenis, 'biasa');
  assert.equal(D.workDays[0].total, 65000);
  // borongan
  els.whDate.value = '2026-10-18'; els.whJenisHari.value = 'borongan'; els.whBorTotal.value = '250000';
  P.onJenisHariChange(); P.addWorkDay();
  assert.equal(D.workDays.find((w) => w.date === '2026-10-18').total, 250000);
});

test('quickSave: hari Minggu -> 1 ketukan tersimpan jenis minggu Rp139.000 (jam dari template)', () => {
  const rows = [wd(1, '2026-10-05', '08:00', '16:00')];
  const { P, els, D } = setup(rows, {}, { whDate: '2026-10-11' });
  P.quickSave();
  const w = D.workDays.find((x) => x.date === '2026-10-11');
  assert.equal(w.jenis, 'minggu');
  assert.equal(w.total, 139000);
  assert.equal(w.masuk, '08:00');
  assert.equal(w.jamLembur, 0);
});

test('quickSave: hari kerja -> jam template, prorata normal; tarif Minggu dari profil dipakai kalau diubah', () => {
  const rows = [wd(1, '2026-10-05', '08:00', '15:00'), wd(2, '2026-10-06', '08:00', '15:00')];
  const { P, D } = setup(rows, { tarifMinggu: 150000 }, { whDate: '2026-10-12' });
  P.quickSave();
  const w = D.workDays.find((x) => x.date === '2026-10-12');
  assert.equal(w.masuk, '08:00'); assert.equal(w.totalJam, 6); assert.equal(w.total, Math.round(65000 / 7 * 6));
  const s2 = setup([], { tarifMinggu: 150000 }, { whDate: '2026-10-11' });
  s2.P.quickSave();
  assert.equal(s2.D.workDays[0].total, 150000);
});

test('quickSave: tanggal sudah ada -> buka mode edit, TIDAK menimpa', () => {
  const rows = [wd(1, '2026-10-12', '09:00', '17:00', { total: 70000 })];
  const { P, D } = setup(rows, {}, { whDate: '2026-10-12' });
  P.quickSave();
  assert.equal(P.editId, 1);
  assert.equal(D.workDays.length, 1);
  assert.equal(D.workDays[0].masuk, '09:00');
});

test('anti-timpa: addWorkDay di tanggal terisi (mode tambah) -> masuk mode timpa, data lama utuh; ketukan kedua baru menimpa', () => {
  const rows = [wd(1, '2026-10-12', '08:00', '16:00', { total: 74000 })];
  const { P, D, els, toasts } = setup(rows, {}, { whDate: '2026-10-12', whMasuk: '07:00', whPulang: '11:00' });
  P.addWorkDay();
  assert.equal(D.workDays.length, 1);
  assert.equal(D.workDays[0].masuk, '08:00', 'data lama TIDAK boleh berubah di ketukan pertama');
  assert.equal(P.editId, 1);
  assert.equal(els.whMasuk.value, '07:00', 'isian user tidak hilang');
  assert.ok(toasts.some((m) => /sudah ada absensi/i.test(m)));
  P.addWorkDay();
  assert.equal(D.workDays.length, 1);
  assert.equal(D.workDays[0].masuk, '07:00');
});

test('anti-timpa: edit entri lalu ganti tanggal ke tanggal entri LAIN -> diblokir, entri lain tidak terhapus', () => {
  const rows = [wd(1, '2026-10-12', '08:00', '16:00'), wd(2, '2026-10-13', '09:00', '17:00')];
  const { P, D, els, toasts } = setup(rows, {}, { whDate: '2026-10-12' });
  P.editId = 1; els.whDate.value = '2026-10-13';
  P.addWorkDay();
  assert.equal(D.workDays.length, 2);
  assert.ok(D.workDays.find((w) => w.id === 2 && w.date === '2026-10-13'));
  assert.ok(toasts.some((m) => /tanggal itu sudah punya absensi/i.test(m)));
});

test('edit entri sendiri (tanggal tetap / pindah ke tanggal kosong) tetap normal', () => {
  const rows = [wd(1, '2026-10-12', '08:00', '16:00')];
  const { P, D, els } = setup(rows, {}, { whDate: '2026-10-12' });
  P.editId = 1; els.whMasuk.value = '07:00'; els.whPulang.value = '15:00';
  P.addWorkDay();
  assert.equal(D.workDays.length, 1); assert.equal(D.workDays[0].masuk, '07:00');
  P.editId = D.workDays[0].id; els.whDate.value = '2026-10-14';
  P.addWorkDay();
  assert.equal(D.workDays.length, 1); assert.equal(D.workDays[0].date, '2026-10-14');
});

test('onDateChange: ganti ke Minggu kosong -> jenis minggu; ke tanggal terisi -> mode edit; saat edit tidak mengubah jenis', () => {
  const rows = [wd(1, '2026-10-13', '08:00', '16:00')];
  const { P, els } = setup(rows, {}, { whDate: '2026-10-11' });
  P.onDateChange();
  assert.equal(els.whJenisHari.value, 'minggu');
  els.whDate.value = '2026-10-13'; P.onDateChange();
  assert.equal(P.editId, 1);
  els.whJenisHari.value = 'biasa'; els.whDate.value = '2026-10-18'; P.onDateChange();
  assert.equal(els.whJenisHari.value, 'biasa', 'saat mode edit, ganti tanggal tidak memaksa jenis');
});

test('cancelEditWorkDay / selectGridDay hari kosong memakai template (bukan hardcode 07:00-15:00)', () => {
  const rows = [wd(1, '2026-10-05', '08:00', '16:30'), wd(2, '2026-10-06', '08:00', '16:30')];
  const { P, els } = setup(rows);
  P.cancelEditWorkDay();
  assert.equal(els.whMasuk.value, '08:00'); assert.equal(els.whPulang.value, '16:30');
  P.selectGridDay('2026-10-11');
  assert.equal(els.whJenisHari.value, 'minggu');
  assert.equal(els.whDate.value, '2026-10-11');
});

test('hitungHari: satu rumus -- sama persis dengan hasil addWorkDay (lembur, kurang jam, Minggu flat)', () => {
  const { P, D, els } = setup([]);
  const h = P.hitungHari('biasa', '07:00', '18:00', '12:00', '13:00', 70000);
  assert.equal(h.totalJam, 10); assert.equal(h.jamLembur, 3); assert.equal(h.pokok, 70000);
  assert.equal(Math.round(h.lembur), Math.round(3 * 70000 / 7 * 1.5));
  els.whDate.value = '2026-10-12'; els.whPulang.value = '18:00'; els.whGaji.value = '70000';
  P.addWorkDay();
  assert.equal(D.workDays[0].total, Math.round(h.pokok + h.lembur));
  assert.equal(P.hitungHari('minggu', '07:00', '19:00', '12:00', '13:00', 70000).pokok, 139000);
});

test('renderAutoHint: tombol Simpan Cepat memakai data-action (CSP-safe), tanpa inline handler', () => {
  const { P, els } = setup([], {}, { whDate: '2026-10-11' });
  P.applyDateDefaults('2026-10-11');
  assert.match(els.whQuickBox.innerHTML, /data-action="Payroll\.quickSave"/);
  assert.match(els.whQuickBox.innerHTML, /139000/);
  assert.doesNotMatch(els.whQuickBox.innerHTML + els.whAutoHint.innerHTML, /\son(click|change|input)=/i);
});

test('DOM nyata-mini: hint disisipkan tepat setelah blok "Jenis Hari", Simpan Cepat setelah baris Tanggal/Gaji (bukan di dalam grid-nya) dan tidak dobel saat dipanggil ulang', () => {
  // pohon minimal: form > [whRow > [fgDate > whDate, fgGaji > whGaji], fgJenis > whJenisHari]
  const reg = {};
  function node(id, tag = 'div') {
    const n = { id, tag, parentNode: null, children: [], value: '', innerHTML: '', style: {}, textContent: '',
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      appendChild(c) { c.parentNode = n; n.children.push(c); return c; },
      insertBefore(c, ref) { c.parentNode = n; if (c.id) reg[c.id] = c; const i = ref ? n.children.indexOf(ref) : -1; if (i < 0) n.children.push(c); else n.children.splice(i, 0, c); return c; },
      get nextSibling() { const s = n.parentNode.children; return s[s.indexOf(n) + 1] || null; } };
    return n;
  }
  const mk = (id, parent) => { const n = node(id); reg[id] = n; if (parent) parent.appendChild(n); return n; };
  const form = mk('form'); const row = mk('whRow', form);
  const fgDate = mk('fgDate', row); const date = mk('whDate', fgDate); date.value = '2026-10-11';
  const fgGaji = mk('fgGaji', row); mk('whGaji', fgGaji).value = '65000';
  const fgJenis = mk('fgJenis', form); const jenis = mk('whJenisHari', fgJenis); jenis.value = 'minggu';
  ['whMasuk', 'whPulang', 'whIstMulai', 'whIstSelesai', 'whJamFieldsWrap', 'whBorFieldsWrap', 'whGajiWrap'].forEach((i) => mk(i, form));
  reg.whMasuk.value = '07:00'; reg.whPulang.value = '15:00'; reg.whIstMulai.value = '12:00'; reg.whIstSelesai.value = '13:00';
  const document = { getElementById: (id) => reg[id] || null, createElement: (t) => node('', t) };
  const D = { workDays: [], profile: { gajiPokok: 65000, tarifMinggu: 139000, lemburMultiplier: 1.5 } };
  const ctx = loadSource(['modules/business/reset-gaji-mingguan.js', 'modules/shared/helper-teks.js', 'modules/business/payroll-absensi.js'],
    { document, D, uid: () => 1, save() {}, toast() {}, parsePzNum: (v) => parseFloat(v) || 0, fmtFull: String, fmt: String, askConfirm: async () => true }, ['Payroll']);
  ctx.Payroll.renderAutoHint();
  ctx.Payroll.renderAutoHint();
  const order = form.children.map((c) => c.id);
  assert.deepEqual(order.slice(0, 4), ['whRow', 'whQuickBox', 'fgJenis', 'whAutoHint']);
  assert.equal(order.filter((i) => i === 'whAutoHint').length, 1);
  assert.equal(order.filter((i) => i === 'whQuickBox').length, 1);
  assert.deepEqual(row.children.map((c) => c.id), ['fgDate', 'fgGaji'], 'grid Tanggal/Gaji tidak boleh disisipi elemen baru');
});

test('alur lama utuh: edit entri Minggu & pilih "Minggu" manual di hari biasa -> field jam TETAP tampil (hanya Minggu otomatis yang menyembunyikan jam)', () => {
  const s = setup([], {}, { whDate: '2026-10-11' });
  s.P.quickSave();
  const id = s.D.workDays[0].id;
  s.P.editWorkDay(id);
  assert.equal(s.els.whJamFieldsWrap._hidden, false, 'edit entri Minggu: jam terlihat seperti sebelum patch');
  const m = setup([], {}, { whDate: '2026-10-12' });
  m.P.applyDateDefaults('2026-10-12');
  m.els.whJenisHari.value = 'minggu'; m.P.onJenisHariChange();
  assert.equal(m.els.whJamFieldsWrap._hidden, false, 'Minggu manual: jam terlihat');
  assert.doesNotMatch(m.els.whAutoHint.innerHTML, /toggleJamManual/, 'tanpa tombol ubah jam kalau jam sudah terlihat');
  // Minggu otomatis lalu user pindah ke biasa lalu kembali ke minggu -> jam terlihat (bukan auto lagi)
  const a = setup([], {}, { whDate: '2026-10-11' });
  a.P.applyDateDefaults('2026-10-11');
  assert.equal(a.els.whJamFieldsWrap._hidden, true);
  a.els.whJenisHari.value = 'biasa'; a.P.onJenisHariChange();
  a.els.whJenisHari.value = 'minggu'; a.P.onJenisHariChange();
  assert.equal(a.els.whJamFieldsWrap._hidden, false);
});

test('alur lama utuh: isi jam manual setelah template tetap dihormati; borongan & edit membersihkan Simpan Cepat', () => {
  const rows = [wd(1, '2026-10-05', '08:00', '16:00'), wd(2, '2026-10-06', '08:00', '16:00')];
  const { P, els, D } = setup(rows, {}, { whDate: '2026-10-12' });
  P.cancelEditWorkDay();
  els.whMasuk.value = '09:00'; els.whPulang.value = '17:00';
  P.addWorkDay();
  assert.equal(D.workDays.find((w) => w.date === '2026-10-12').masuk, '09:00');
  P.editWorkDay(D.workDays.find((w) => w.date === '2026-10-12').id);
  assert.equal(els.whQuickBox.innerHTML, '');
  P.cancelEditWorkDay();
  els.whJenisHari.value = 'borongan'; P.onJenisHariChange();
  assert.equal(els.whQuickBox.innerHTML, '');
});
