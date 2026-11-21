// E2E browser (opt-in) S2917 poin 1 — Catat Pengembalian + transfer/pengeluaran lewat modal asli.
//   BACKUP=/path/backup.json node e2e/s2917-catat-pengembalian-browser.js     Exit: 0 lulus | 1 gagal | 2 error | 3 dilewati
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const skip = (m) => { console.log('E2E-PENGEMBALIAN SKIP — ' + m); process.exit(process.env.E2E_SKIP_OK === '1' ? 0 : 3); };
const BACKUP = process.env.BACKUP || process.env.E2E_BACKUP;
if (!BACKUP || !fs.existsSync(BACKUP)) skip('set BACKUP=/path/backup.json');
process.env.ROOT = path.resolve(process.env.ROOT || process.env.E2E_ROOT || path.join(__dirname, '..'));
let harness;
try { harness = require('./dana-proyek-browser/harness'); } catch (e) { skip('Playwright tidak tersedia: ' + e.message); }
const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
const res = [];
const ck = (n, ok, d) => { res.push(!!ok); console.log((ok ? '✓ ' : '✗ ') + n + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); };
(async () => {
  const H = await harness.start({ width: 390, height: 844 }, true);
  const { p, errs } = H; const sleep = (ms) => p.waitForTimeout(ms); const ev = (f, a) => p.evaluate(f, a);
  try {
    const loaded = () => ev(() => (D.accounts || []).length > 0 && (D.transactions || []).length > 100);
    for (let i = 0; i < 3 && !(await loaded()); i++) {
      await ev(async (bk) => { Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, bk); const s = JSON.stringify(D); localStorage.setItem('kw_v4', s); try { await IDBStore.set('kw_v4_mirror', s); } catch (e) { void e; } }, BK);
      await p.reload(); await p.waitForFunction(() => getComputedStyle(document.getElementById('mainApp')).display !== 'none'); await sleep(1200);
    }
    ck('Backup termuat', await loaded());
    const snap = () => ev(() => ({ pribadi: Math.round(saldoPribadi()), kartu: DanaTitipanPortfolioAPI.build().owners.reduce((n, o) => n + (o.akunTitipanTotal || 0), 0), tx: D.transactions.length, ret: (D.titipanReturns || []).length }));
    const owner = await ev(() => { const o = DanaTitipanPortfolioAPI.build().owners.find((x) => x.akunTitipanTotal > 0); return o ? { id: o.ownerId, n: o.ownerName } : null; });
    if (!owner) { console.log('· dilewati (tidak ada pemilik dengan dana di rekening)'); process.exit(0); }
    const a = await snap();
    // Modal asli: pilihan sumber terisi, mode keluar
    await ev((id) => { DanaTitipanReturnUI.open(id); }, owner.id);
    await sleep(300);
    const ui = await ev(() => ({ srcOpts: document.getElementById('titipanReturnSrc').options.length, srcHidden: document.getElementById('titipanReturnSrcWrap').hidden }));
    ck('Modal: mode awal "riwayat" menyembunyikan pilihan rekening', ui.srcHidden === true && ui.srcOpts > 0, ui);
    await ev(() => { const m = document.getElementById('titipanReturnMode'); m.value = 'keluar'; m.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('titipanReturnAmount').value = '100000'; });
    await sleep(200);
    ck('Modal: mode "keluar" menampilkan rekening sumber', await ev(() => document.getElementById('titipanReturnSrcWrap').hidden === false));
    await ev(() => DanaTitipanReturnUI.save()); await sleep(600);
    const b = await snap();
    ck('Pengembalian "keluar": dana di rekening turun tepat Rp 100.000, saldo pribadi tak berubah, 1 transaksi + 1 catatan', Math.round(a.kartu - b.kartu) === 100000 && a.pribadi === b.pribadi && b.tx === a.tx + 1 && b.ret === a.ret + 1, { a, b });
    const rid = await ev(() => D.titipanReturns[D.titipanReturns.length - 1].id);
    await ev((id) => { window.askConfirm = async () => true; return DanaTitipanReturnUI.deleteEntry(id); }, rid); await sleep(600);
    const c = await snap();
    ck('Hapus riwayat membatalkan transaksinya (angka kembali ke semula)', c.tx === a.tx && c.ret === a.ret && Math.round(c.kartu) === Math.round(a.kartu) && c.pribadi === a.pribadi, { a, c });
    // Lebih dari hak -> ditolak
    const big = await ev((id) => { const accId = D.accounts.find((x) => (x.owners || []).some((o) => o.ownerId === id)).id; return DanaTitipanPortfolioAPI.recordReturnWithTransfer({ ownerId: id, amount: 9e12, sourceAccountId: accId, mode: 'keluar' }); }, owner.id);
    ck('Melebihi hak pemilik ditolak tanpa perubahan', big.ok === false && (await snap()).tx === a.tx, big);
    const realErrs = errs.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    ck('Tanpa error JS selama sesi', realErrs.length === 0, realErrs);
  } catch (e) { console.log('HARNESS ERROR', e.stack || e); process.exitCode = 2; }
  await H.close && H.close();
  if (process.exitCode === 2) process.exit(2);
  const bad = res.filter((x) => !x).length; console.log(bad ? 'GAGAL (' + bad + '/' + res.length + ')' : 'LULUS (' + res.length + '/' + res.length + ')'); process.exit(bad ? 1 : 0);
})();
