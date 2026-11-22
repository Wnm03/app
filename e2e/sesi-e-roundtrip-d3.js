// E2E permanen (opt-in) Sesi E (v2925+): memakai BACKUP ASLI. Data pribadi TIDAK ikut repo/patch (dibaca dari env, tidak ditulis ke mana pun).
//
//   BACKUP=/path/backup-keluarga-W.json node e2e/sesi-e-roundtrip-d3.js      (npm run test:e2e:sesi-e)
//   E2E_SKIP_OK=1 ...  -> exit 0 bila BACKUP/browser tidak ada (CI tanpa data)
//
// Menutup tiga celah "belum teruji" dari verifikasi Sesi A-C:
//   A. Round-trip backup JSON penuh: buildBackupPayload -> importData (input file nyata) -> saldo/koleksi/hash sama, ekspor ulang identik.
//   B. D3 lewat PEMBAYARAN TAGIHAN nyata (markBillPaid), bukan data langsung: piutang otomatis 200.000 -> dialog akun -> BRI / buka lagi / batal.
//   C. Varian backup (bukan hanya satu backup): akun tanpa field kepemilikan, semua akun INVESTOR (fallback), tanpa kategori Piutang/Utang.
// Pemeriksaan INVARIAN (dibandingkan dengan keadaan sebelum/sesudah), bukan angka tetap. Exit: 0 lulus | 1 gagal | 2 error harness | 3 dilewati.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const skip = (msg) => { console.log('E2E-SESI-E SKIP — ' + msg); process.exit(process.env.E2E_SKIP_OK === '1' ? 0 : 3); };

const BACKUP = process.env.BACKUP || process.env.E2E_BACKUP;
if (!BACKUP || !fs.existsSync(BACKUP)) skip('set BACKUP=/path/backup.json (file backup asli tidak ikut repo)');
process.env.ROOT = path.resolve(process.env.ROOT || process.env.E2E_ROOT || path.join(__dirname, '..'));
let harness;
try { harness = require('./dana-proyek-browser/harness'); } catch (e) { skip('Playwright tidak tersedia: ' + e.message); }

const RAW = fs.readFileSync(BACKUP, 'utf8');
const clone = () => JSON.parse(RAW);
const res = [];
const ck = (n, ok, d) => { res.push(!!ok); console.log((ok ? '✓ ' : '✗ ') + n + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); };
const pageErrs = (H) => H.errs.filter((e) => e.startsWith('pageerror'));

// Muat backup ke state app lalu boot ulang (jalur boot nyata). Syarat ">4 akun & >100 transaksi" mencegah data default dianggap termuat.
async function load(H, bk) {
  const { p } = H;
  for (let i = 0; i < 3; i++) {
    await p.evaluate(async (b) => { Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, b); const s = JSON.stringify(D); localStorage.setItem('kw_v4', s); try { await IDBStore.set('kw_v4_mirror', s); } catch (e) { void e; } }, bk);
    await p.reload(); await p.waitForFunction(() => getComputedStyle(document.getElementById('mainApp')).display !== 'none'); await p.waitForTimeout(1200);
    if (await p.evaluate(() => (D.accounts || []).length > 4 && (D.transactions || []).length > 100)) return true;
  }
  return false;
}
const prep = (p) => p.evaluate(() => {
  window.askConfirm = async () => true; window._t = [];
  const o = window.toast; window.toast = function (m) { window._t.push(String(m)); return o.apply(this, arguments); };
  window.getAccBalance = (id) => { invalidateAccBalCache(); return recalcAccBalance(id); };
});
const snap = () => {
  const h = (o) => { const s = JSON.stringify(o) || ''; let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; };
  const bal = {}; (D.accounts || []).forEach((a) => { bal[a.id] = getAccBalance(a.id); });
  const cnt = {}; Object.keys(D).forEach((k) => { if (Array.isArray(D[k]) && !k.startsWith('_')) cnt[k] = D[k].length; });
  return { bal, cnt, h: [D.transactions, D.accounts, D.piutang, D.utang, D.bills].map(h) };
};
// Kanonik: urut kunci, buang cap waktu pembuatan (_integrity.createdAt dkk) agar ekspor-ulang bisa dibandingkan.
const canon = (s) => {
  const w = (x) => { if (Array.isArray(x)) return x.map(w); if (x && typeof x === 'object') { const r = {}; Object.keys(x).sort().forEach((k) => { if (k === 'createdAt' || /^(lastBackup|exportedAt|exportDate|_exportedAt|backupAt|savedAt|updatedAt|ts)$/i.test(k)) return; r[k] = w(x[k]); }); return r; } return x; };
  return JSON.stringify(w(JSON.parse(s)));
};

async function roundTrip() {
  console.log('--- A. Round-trip backup JSON penuh');
  const A = await harness.start({ width: 390, height: 844 }, true);
  ck('A: backup termuat', await load(A, clone()));
  await prep(A.p);
  const before = await A.p.evaluate(snap);
  const payload = await A.p.evaluate(async () => JSON.stringify(await buildBackupPayload()));
  ck('A: buildBackupPayload menghasilkan JSON', payload.length > 100000, payload.length);
  await A.close();
  const B = await harness.start({ width: 390, height: 844 }, true);
  await prep(B.p);
  await B.p.setInputFiles('#restoreFileInput', { name: 'rt.json', mimeType: 'application/json', buffer: Buffer.from(payload, 'utf8') });
  await B.p.waitForFunction(() => window._t.some((m) => /Data di-restore/.test(m)), null, { timeout: 30000 }).catch(() => {});
  await B.p.waitForTimeout(1500);
  ck('B: toast restore sukses', await B.p.evaluate(() => window._t.some((m) => m.includes('✅ Data di-restore'))));
  const after = await B.p.evaluate(snap);
  const dk = Object.keys(Object.assign({}, before.cnt, after.cnt)).filter((k) => before.cnt[k] !== after.cnt[k]);
  ck('B: jumlah semua koleksi sama', dk.length === 0, dk);
  ck('B: saldo semua akun sama', JSON.stringify(before.bal) === JSON.stringify(after.bal));
  ck('B: hash transaksi/akun/piutang/utang/tagihan sama', JSON.stringify(before.h) === JSON.stringify(after.h));
  const again = await B.p.evaluate(async () => JSON.stringify(await buildBackupPayload()));
  const c1 = canon(payload), c2 = canon(again);
  ck('B: ekspor -> impor -> ekspor identik (kanonik)', c1 === c2, { len1: c1.length, len2: c2.length });
  ck('B: tanpa pageerror', pageErrs(B).length === 0, pageErrs(B));
  await B.close();
}

// D3 lewat pembayaran tagihan nyata. opts.expectList(labels) memeriksa isi dialog; hasilnya selalu: pelunasan ke BRI = 1 pemasukan Piutang 200.000.
async function d3Flow(label, bk, opts) {
  console.log('--- ' + label);
  const H = await harness.start({ width: 390, height: 844 }, true); const { p } = H;
  ck('termuat', await load(H, bk)); await prep(p);
  const ids = await p.evaluate(() => {
    const cash = D.accounts.find((a) => a.id === 'acc_cash') || D.accounts[0]; const bri = D.accounts.find((a) => /^bri$/i.test(a.name));
    const b = { id: 'bill_e2e_d3', name: 'Listrik Bersama E2E', amount: 100000, totalAmount: 300000, shared: true, sharedAutoPiutang: true, sharedOtherName: 'Teman E2E', nextDue: todayStr(), freq: 'bulanan', kind: 'tagihan', category: D.categories.expense[0].name, accountId: cash.id, sisaTenor: null };
    BillDebtPiutangCanonicalWriter.add('bills', b); save(); return { cash: cash.id, bri: bri && bri.id, briName: bri && bri.name };
  });
  ck('akun BRI ada', !!ids.bri);
  const bal = () => p.evaluate((i) => ({ cash: getAccBalance(i.cash), bri: getAccBalance(i.bri), nTx: D.transactions.length }), ids);
  const pre = await bal();
  // markBillPaid menanyakan tanggal bayar lewat showPromptModal: konfirmasi lewat tombol, seperti pengguna.
  await p.evaluate(() => { window._bp = markBillPaid('bill_e2e_d3'); }); await p.waitForTimeout(700);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(OK|Ya|Bayar|Simpan|Lanjut|✓)/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
  await p.evaluate(() => window._bp).catch(() => {}); await p.waitForTimeout(1000);
  const pi = await p.evaluate(() => { const x = (D.piutang || []).find((q) => q.autoBillId === 'bill_e2e_d3'); return x ? { id: x.id, nilai: x.nilai, lunas: x.lunas } : null; });
  ck('bayar tagihan -> piutang otomatis 200.000 (belum lunas)', pi && pi.nilai === 200000 && pi.lunas === false, pi);
  if (!pi) { await H.close(); return; }
  const mid = await bal();
  ck('saldo akun tagihan turun 100.000 (porsi sendiri)', mid.cash === pre.cash - 100000, { pre: pre.cash, mid: mid.cash });
  const openLunas = async () => { await p.evaluate((id) => { Piutang.openModal(id); }, pi.id); await p.waitForTimeout(300); await p.evaluate(() => { Piutang.toggleLunas(); }); return p.evaluate(() => Piutang._saveInner()); };
  const dialog = () => p.evaluate(() => ({ open: /Piutang lunas/.test((document.getElementById('choiceModalTitle') || {}).textContent || ''), l: [...document.querySelectorAll('#choiceModalList button')].map((b) => b.innerText.trim()) }));
  // 1) pilih BRI
  let sp = openLunas(); await p.waitForTimeout(700); const dl = await dialog();
  ck('dialog tampil, ada "Jangan catat pemasukan", tidak buntu', dl.open && dl.l.length >= 2 && dl.l.some((x) => /Jangan catat/.test(x)), dl.l);
  if (opts.expectList) opts.expectList(dl.l, ck);
  await p.evaluate((i) => _choiceModalAnswer(i), dl.l.findIndex((x) => /BRI/.test(x))); await sp.catch(() => {}); await p.waitForTimeout(900);
  const po = await p.evaluate((i) => { const x = (D.piutang || []).find((q) => q.autoBillId === 'bill_e2e_d3'); const t = D.transactions.filter((q) => q.category === 'Piutang' && q.type === 'income' && /Teman E2E/.test(q.note || '')); return { lunas: x.lunas, n: t.length, a: t[0] && t[0].amount, acc: t[0] && t[0].accountId, bri: getAccBalance(i.bri), cash: getAccBalance(i.cash) }; }, ids);
  ck('lunas -> 1 pemasukan Piutang 200.000 ke BRI; saldo BRI +200.000; Cash tetap', po.lunas && po.n === 1 && po.a === 200000 && po.acc === ids.bri && po.bri === mid.bri + 200000 && po.cash === mid.cash, { mid, po });
  // 2) buka lagi
  await p.evaluate((id) => { Piutang.openModal(id); }, pi.id); await p.waitForTimeout(300);
  await p.evaluate(() => { Piutang.toggleLunas(); }); await p.evaluate(() => Piutang._saveInner()); await p.waitForTimeout(800);
  const re = await p.evaluate((i) => ({ lunas: (D.piutang || []).find((q) => q.autoBillId === 'bill_e2e_d3').lunas, bri: getAccBalance(i.bri), cash: getAccBalance(i.cash), nTx: D.transactions.length }), ids);
  ck('buka lagi -> pemasukan dibatalkan, saldo & jumlah transaksi kembali', re.lunas === false && re.bri === mid.bri && re.cash === mid.cash && re.nTx === mid.nTx, { re, mid });
  // 3) batal dialog
  sp = openLunas(); await p.waitForTimeout(600); await p.evaluate(() => { _choiceModalAnswer(null); }); await sp.catch(() => {}); await p.waitForTimeout(600);
  const cx = await bal(); const cl = await p.evaluate(() => (D.piutang || []).find((q) => q.autoBillId === 'bill_e2e_d3').lunas);
  ck('batal dialog -> tidak tersimpan, tak ada transaksi baru', cl === false && cx.bri === mid.bri && cx.nTx === mid.nTx, { cl, cx });
  ck('tanpa pageerror', pageErrs(H).length === 0, pageErrs(H));
  await H.close();
}

const nAcc = () => clone().accounts.length;
const isSelfLabel = (l) => /Saldo tagihan|Rekening home in/.test(l);

(async () => {
  await roundTrip();
  await d3Flow('B. D3 lewat pembayaran tagihan nyata (backup asli)', clone(), {
    expectList: (l, ck2) => ck2('dialog hanya memuat akun milik sendiri (tanpa akun INVESTOR)', !l.some(isSelfLabel), l.filter(isSelfLabel)),
  });
  await d3Flow('C1. akun tanpa field kepemilikan (backup lama) -> dianggap milik sendiri', (() => { const b = clone(); b.accounts.forEach((a) => { delete a.ownership; delete a.owners; }); return b; })(), {
    expectList: (l, ck2) => ck2('C1: semua akun + "Jangan catat" tampil', l.length === nAcc() + 1, l.length),
  });
  await d3Flow('C2. semua akun INVESTOR -> fallback ke semua akun (tidak buntu)', (() => { const b = clone(); b.accounts.forEach((a) => { a.ownership = 'INVESTOR'; a.owners = [{ ownerId: 'x1', ownerName: 'Pihak', porsi: 100 }]; }); return b; })(), {
    expectList: (l, ck2) => ck2('C2: semua akun + "Jangan catat" tampil', l.length === nAcc() + 1, l.length),
  });
  await d3Flow('C3. tanpa kategori Piutang/Utang -> dipulihkan saat boot', (() => { const b = clone(); ['income', 'expense'].forEach((t) => { b.categories[t] = (b.categories[t] || []).filter((c) => !/^(piutang|utang)$/i.test(c.name)); }); return b; })(), {});
  const ok = res.every(Boolean);
  console.log(ok ? 'E2E-SESI-E LULUS (' + res.length + ' pemeriksaan)' : 'E2E-SESI-E ADA GAGAL (' + res.filter((x) => !x).length + ')');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('E2E-SESI-E ERROR harness:', e && e.message); process.exit(2); });
