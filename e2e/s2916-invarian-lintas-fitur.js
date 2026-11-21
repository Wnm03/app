// E2E browser (opt-in) S2916 — INVARIAN sinkronisasi keuangan antar fitur/pemilik (saldo pribadi, dana tertahan proyek, rekening titipan, kartu Dana Titipan, gerbang health-check).
//
//   BACKUP=/path/backup-keluarga-W.json node e2e/s2916-invarian-lintas-fitur.js     (npm run test:e2e:invarian)
//   E2E_SHOTS=/dir  E2E_SKIP_OK=1 (exit 0 bila BACKUP/browser tidak ada)
//
// Pemeriksaan INVARIAN dari isi backup (tanpa angka tetap). Data pribadi tidak ditulis ke mana pun. Exit: 0 lulus | 1 gagal | 2 error harness | 3 dilewati.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const skip = (m) => { console.log('E2E-INVARIAN SKIP — ' + m); process.exit(process.env.E2E_SKIP_OK === '1' ? 0 : 3); };
const BACKUP = process.env.BACKUP || process.env.E2E_BACKUP;
if (!BACKUP || !fs.existsSync(BACKUP)) skip('set BACKUP=/path/backup.json (file backup asli tidak ikut repo)');
process.env.ROOT = path.resolve(process.env.ROOT || process.env.E2E_ROOT || path.join(__dirname, '..'));
let harness;
try { harness = require('./dana-proyek-browser/harness'); } catch (e) { skip('Playwright tidak tersedia: ' + e.message); }

const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
const SHOTS = process.env.E2E_SHOTS || '';
const res = [];
const ck = (n, ok, d) => { res.push(!!ok); console.log((ok ? '✓ ' : '✗ ') + n + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); };
const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

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

    const m = await ev(() => {
      const klien = (D.renovProjects || []).filter((x) => x && x.dana === 'klien');
      const tertahan = klien.reduce((n, x) => n + (typeof renovDanaTertahanDalamSaldo === 'function' ? renovDanaTertahanDalamSaldo(x) : 0), 0);
      const nonSelfOnly = (a) => Array.isArray(a.owners) && a.owners.length > 0 && a.owners.every((o) => o && !o.isSelf && o.ownerId !== 'SELF');
      const akunTitipan = D.accounts.filter(nonSelfOnly).reduce((n, a) => n + Math.max(0, recalcAccBalance(a.id)), 0);
      const tp = DanaTitipanPortfolioAPI.build();
      return {
        totalSaldoAkun: totalSaldoAkun(), saldoPribadi: saldoPribadi(), tertahan,
        akunTitipan, kartuAkun: tp.owners.reduce((n, o) => n + (o.akunTitipanTotal || 0), 0),
        owners: tp.owners.map((o) => ({ n: o.ownerName, akun: o.akunTitipanTotal, utang: o.akunTitipanDebtTotal, bagi: o.bagiHasilTotal, live: o.akunTitipanLive })),
      };
    });
    ck('I1 Saldo pribadi = total saldo akun - dana tertahan proyek klien', Math.round(m.totalSaldoAkun - m.tertahan) === Math.round(m.saldoPribadi), m);
    ck('I2 Total "Dana di rekening" di kartu = saldo rekening milik pemilik lain (non-SELF)', Math.round(m.kartuAkun) === Math.round(m.akunTitipan), { kartu: m.kartuAkun, akun: m.akunTitipan });
    ck('I3 Total saldo akun = jumlah saldo akun milik sendiri saja (rekening pemilik lain tidak ikut saldo pribadi)', await ev(() => {
      const nonSelf = (a) => Array.isArray(a.owners) && a.owners.length > 0 && a.owners.every((o) => o && !o.isSelf && o.ownerId !== 'SELF');
      return Math.round(totalSaldoAkun()) === Math.round(D.accounts.filter((a) => a.includeInBalance !== false && !nonSelf(a)).reduce((n, a) => n + recalcAccBalance(a.id), 0));
    }));
    ck('I4 Mode hitung langsung aktif & sama dengan baris Buku Utang (data tersinkron)', m.owners.every((o) => !o.akun || (o.live && Math.abs(o.akun - o.utang) <= 1)), m.owners);

    await ev(async () => { if (typeof runDataHealthCheck !== 'function' && typeof ensureDataHealthScripts === 'function') await ensureDataHealthScripts(); });
    const issues = await ev(() => runDataHealthCheck().map((i) => i.title));
    await ev(() => { try { closeModal('dataHealthModal'); } catch (e) { void e; } });
    ck('I5 Health-check: tidak ada "belum sinkron dengan Buku Utang" / "hak bagi hasil tercatat ganda"', !issues.some((t) => /belum sinkron dengan Buku Utang|tercatat ganda/.test(t)), issues.filter((t) => /Dana titipan|bagi hasil/i.test(t)));

    // I6 hak ganda: tidak ada pemilik yang sekaligus punya bagi hasil terbuka DAN bagiannya sudah masuk rekening (dari pencairan non-tahan)
    ck('I6 Tak ada hak ganda: bagian yang sudah dicairkan tidak punya utang bagi hasil terbuka', await ev(() => !(D.renovProjects || []).some((pr) => pr && pr.pencairanFinal && (pr.pencairanFinal.rows || []).some((r) => r && !r.isSelf && !r.tahan && r.jumlah > 0 && (D.debts || []).some((d) => d && !d.lunas && String(d.renovBagiProjectId) === String(pr.id) && String(d.renovBagiOwnerId) === String(r.ownerId) && d.nilai > 0)))));

    // I7 Total hak pemilik di kartu = kini + dana di rekening + bagi hasil
    const hak = await ev(() => { const R = DanaTitipanPortfolioPresenter; return DanaTitipanPortfolioAPI.build().owners.filter((o) => o.akunTitipanTotal > 0 || o.bagiHasilTotal > 0).map((o) => ({ n: o.ownerName, total: R._hakTotal(o), exp: R._ownerAlign(o).kini + o.akunTitipanTotal + o.bagiHasilTotal })); });
    ck('I7 Total hak pemilik = holding + rekening + bagi hasil', hak.every((x) => Math.round(x.total) === Math.round(x.exp)), hak);

    // I8 Guard lunas: tandai lunas manual ditolak bila laba belum dicairkan (utang bagi hasil dibuka kembali tanpa pencairanFinal)
    const g = await ev(() => {
      const pr = (D.renovProjects || []).find((x) => x && x.pencairanFinal && (D.debts || []).some((d) => d && String(d.renovBagiProjectId) === String(x.id)));
      if (!pr) return { skip: true };
      const d = D.debts.find((x) => x && String(x.renovBagiProjectId) === String(pr.id)); const sv = pr.pencairanFinal; d.lunas = false;
      delete pr.pencairanFinal; window._t = []; const o = window.toast; window.toast = function (mm) { window._t.push(String(mm)); return o.apply(this, arguments); };
      Debt.openModal(d.id); Debt._lunasState = true; let res; try { res = Debt._saveInner ? Debt._saveInner() : Debt.save(); } catch (e) { res = 'ERR ' + e.message; }
      const out = { lunas: d.lunas, toast: window._t.slice(-1)[0], res: String(res) }; pr.pencairanFinal = sv; d.lunas = true; window.toast = o; return out;
    });
    if (g.skip) console.log('· I8 dilewati (tidak ada proyek dengan pencairan + utang bagi hasil)');
    else ck('I8 Tandai lunas manual ditolak sebelum laba dicairkan', g.lunas === false && /belum dicairkan/.test(g.toast || ''), g);

    // I9-I12 (S2917): dana di rekening pemilik lain TIDAK boleh menggeser angka pribadi (Proyeksi Kas, Dana Aman, zakat/kekayaan, utang).
    // Uji sensitivitas: tambah Rp 10 jt ke rekening non-SELF lewat satu transaksi income, bandingkan sebelum dan sesudah, lalu kembalikan.
    const sens = await ev(() => {
      const nonSelfOnly = (a) => Array.isArray(a.owners) && a.owners.length > 0 && a.owners.every((o) => o && !o.isSelf && o.ownerId !== 'SELF');
      const acc = D.accounts.find((a) => nonSelfOnly(a) && !(a.linkedAssetId));
      if (!acc) return { skip: true };
      const J = (f) => { try { return JSON.stringify(f()); } catch (e) { return 'ERR ' + e.message; } };
      const grab = () => ({
        saldoPribadi: Math.round(saldoPribadi()),
        saldoSafe: typeof saldoPribadiSafe === 'function' ? Math.round(saldoPribadiSafe()) : null,
        forecast: J(() => computeCashflowForecast()),
        alokasi: J(() => FinanceAllocationAPI.summary()),
        utang: typeof totalDebtValue === 'function' ? Math.round(totalDebtValue()) : null,
        kartu: DanaTitipanPortfolioAPI.build().owners.reduce((n, o) => n + (o.akunTitipanTotal || 0), 0),
      });
      const inv = () => { if (typeof invalidateAccBalCache === 'function') invalidateAccBalCache(); };
      inv(); const a = grab();
      const tx = { id: 'e2e_sens_' + Date.now(), date: new Date().toISOString().slice(0, 10), type: 'income', amount: 10000000, category: (D.transactions.find((t) => t.type === 'income') || {}).category || 'Penghasilan', subcategory: '', accountId: acc.id, payMethod: 'tunai', note: 'e2e-sensitivity' };
      D.transactions.push(tx); inv();
      const b = grab();
      D.transactions.splice(D.transactions.indexOf(tx), 1); inv();
      const c = grab();
      return { acc: acc.name, a, b, c };
    });
    if (sens.skip) console.log('· I9-I12 dilewati (tidak ada rekening pemilik lain)');
    else {
      ck('I9 Saldo pribadi (dan versi aman) tak bergeser oleh dana rekening pemilik lain', sens.a.saldoPribadi === sens.b.saldoPribadi && sens.a.saldoSafe === sens.b.saldoSafe, { a: sens.a.saldoPribadi, b: sens.b.saldoPribadi });
      ck('I10 Proyeksi Kas tak bergeser', sens.a.forecast === sens.b.forecast);
      ck('I11 Alokasi Dana Aman dan total utang tak bergeser', sens.a.alokasi === sens.b.alokasi && sens.a.utang === sens.b.utang);
      ck('I12 Uji sensitif: kartu "Dana di rekening" naik tepat Rp 10 jt (bukti angka lain memang diperiksa) dan kembali setelah dibatalkan', Math.round(sens.b.kartu - sens.a.kartu) === 10000000 && Math.round(sens.c.kartu) === Math.round(sens.a.kartu), { acc: sens.acc, naik: sens.b.kartu - sens.a.kartu });
    }

    const realErrs = errs.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    ck('Tanpa error JS selama sesi', realErrs.length === 0, realErrs);
  } catch (e) { console.log('HARNESS ERROR', e.stack || e); process.exitCode = 2; }
  finally { try { await H.close(); } catch (x) { void x; } }
  const gagal = res.filter((x) => !x).length;
  console.log(gagal ? 'GAGAL (' + gagal + '/' + res.length + ')' : 'LULUS (' + res.length + '/' + res.length + ')');
  if (process.exitCode !== 2) process.exitCode = gagal ? 1 : 0;
})();
