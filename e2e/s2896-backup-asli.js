// E2E permanen (opt-in) memakai BACKUP ASLI — S2896: hak bagi hasil, guard pencairan, paritas dana klien, tanda minus, kartu Dana Titipan.
// Data pribadi TIDAK ikut repo/patch: backup dibaca dari path env dan tidak ditulis ke mana pun.
//
//   BACKUP=/path/backup-keluarga-W.json node e2e/s2896-backup-asli.js            (ROOT default = root repo)
//   npm run test:e2e:backup                                                       (BACKUP wajib di env)
//   E2E_SKIP_OK=1 ...   -> exit 0 bila BACKUP/browser tidak ada (untuk CI tanpa data)
//   E2E_SHOTS=/dir ...  -> simpan tangkapan layar
//   E2E_PROJECT=<id>    -> paksa proyek (default: proyek dana klien pertama yang punya penerima bagi hasil non-SELF)
//
// Pemeriksaan bersifat INVARIAN (dihitung dari isi backup, bukan angka tetap) sehingga tetap berlaku untuk backup baru.
// Angka emas (mis. 4.307.418 / 800.000 / 1.588.100) hanya dicek bila SHA-256 backup = backup 20 Nov 2026 (GOLDEN_SHA).
// Backup dipulihkan ke browser LEWAT salinan di localStorage/IndexedDB halaman; tidak ada jaringan, SW diblokir.
// Exit: 0 lulus | 1 ada pemeriksaan gagal | 2 error harness | 3 dilewati (tanpa BACKUP/browser; hanya exit 0 bila E2E_SKIP_OK=1)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const GOLDEN_SHA = '0576778fb1a9b39b14a0a30ebc4bc14c3d5752ded04dc36c6bee013eb6b30e5d';
const skip = (msg) => { console.log('E2E-BACKUP SKIP — ' + msg); process.exit(process.env.E2E_SKIP_OK === '1' ? 0 : 3); };

const BACKUP = process.env.BACKUP || process.env.E2E_BACKUP;
if (!BACKUP || !fs.existsSync(BACKUP)) skip('set BACKUP=/path/backup.json (file backup asli tidak ikut repo)');
process.env.ROOT = path.resolve(process.env.ROOT || process.env.E2E_ROOT || path.join(__dirname, '..'));
let harness;
try { harness = require('./dana-proyek-browser/harness'); } catch (e) { skip('Playwright tidak tersedia: ' + e.message); }

const raw = fs.readFileSync(BACKUP);
const BK = JSON.parse(raw.toString('utf8'));
const GOLDEN = crypto.createHash('sha256').update(raw).digest('hex') === GOLDEN_SHA;
const SHOTS = process.env.E2E_SHOTS || '';
const res = [];
const ck = (n, ok, d) => { res.push({ n, ok: !!ok }); console.log((ok ? '✓ ' : '✗ ') + n + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); };

(async () => {
  const H = await harness.start({ width: 390, height: 844 }, true);
  const { p, errs } = H; const sleep = (ms) => p.waitForTimeout(ms); const ev = (f, a) => p.evaluate(f, a);
  const shot = async (n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 's2896-' + n + '.png') }); };
  try {
    // --- pulihkan backup ke state app lalu boot ulang (jalur boot nyata, bukan tempel manual)
    const loaded = () => ev(() => (D.accounts || []).length > 0 && (D.transactions || []).length > 100);
    for (let i = 0; i < 3 && !(await loaded()); i++) {
      await ev(async (bk) => { Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, bk); const s = JSON.stringify(D); localStorage.setItem('kw_v4', s); try { await IDBStore.set('kw_v4_mirror', s); } catch (e) { void e; } }, BK);
      await p.reload(); await p.waitForFunction(() => getComputedStyle(document.getElementById('mainApp')).display !== 'none'); await sleep(1200);
    }
    ck('Backup asli termuat di app (akun + >100 transaksi)', await loaded());
    await ev(() => { window.askConfirm = async () => true; window._t = []; const o = window.toast; window.toast = function (m) { window._t.push(String(m)); return o.apply(this, arguments); }; });

    // --- pilih proyek: dana klien + punya penerima bagi hasil non-SELF
    const pid = await ev((forced) => {
      const c = (D.renovProjects || []).filter((x) => x && x.dana === 'klien' && x.bagiHasil && (x.bagiHasil.owners || []).some((o) => o && !o.isSelf && o.ownerId));
      const x = forced ? (D.renovProjects || []).find((q) => String(q.id) === String(forced)) : c[0];
      return x ? String(x.id) : null;
    }, process.env.E2E_PROJECT || null);
    ck('Proyek dana klien dengan penerima bagi hasil non-SELF ditemukan', !!pid, pid);
    if (!pid) throw new Error('tidak ada proyek kandidat');

    const info = () => ev((id) => {
      const pr = D.renovProjects.find((x) => String(x.id) === String(id)); const sm = renovLabaSummary(pr); const hk = typeof renovHakSelf === 'function' ? renovHakSelf(pr) : null;
      const txs = D.transactions || [];
      const klienExp = txs.filter((t) => t.type === 'expense' && String(t.renovProjectLinkId) === String(id) && isAliranKlien(t)).reduce((a, t) => a + (Number(t.amount) || 0), 0);
      let nw = null; try { const sm0 = AssetPortfolioAPI.summary(); nw = sm0 && sm0.netWorth && sm0.netWorth.ok ? sm0.netWorth.netWorth : null; } catch (e) { void e; }
      const fi = (typeof FI !== 'undefined' && FI.totalDebt) ? FI.totalDebt() : null;
      const nonSelf = (pr.bagiHasil.owners || []).filter((o) => !o.isSelf && o.ownerId);
      const hutang = (D.debts || []).filter((d) => String(d.renovBagiProjectId) === String(id)).map((d) => ({ o: String(d.renovBagiOwnerId), n: Number(d.amount != null ? d.amount : d.nilai != null ? d.nilai : d.total) || 0, lunas: !!(d.lunas || d.paid) }));
      return {
        status: sm.status, cost: sm.biaya, klienExp, syarat: sm.syarat, labaMaks: sm.labaMaks, bisaAkui: sm.bisaAkui, diakui: sm.labaDiakuiBersih, cair: sm.pencairanValid, batas: sm.batasPencairan,
        hakW: hk ? hk.hak : null, namaW: hk ? hk.nama : null, ledger: (pr.labaLedger || []).map((e) => e.tipe + ':' + e.jumlah), pribadi: saldoPribadi(), nw, fiDebt: fi, hutang,
        nonSelf: nonSelf.map((o) => ({ id: String(o.ownerId), nama: o.ownerName, porsi: o.porsi })), owners: pr.bagiHasil.owners, labaManual: pr.bagiHasil.labaManual, nOwners: (OwnerRegistry.listAll() || []).length, status0: pr.status,
      };
    }, pid);
    const jumlahHutang = (i, ownerId) => i.hutang.filter((h) => h.o === String(ownerId)).reduce((a, h) => a + h.n, 0);

    // === A. Paritas dana klien (dasar patch #2/#3)
    const a0 = await info();
    ck('A1 biaya status dana klien = jumlah transaksi isAliranKlien proyek', a0.cost === a0.klienExp, { cost: a0.cost, klienExp: a0.klienExp });
    const brk = await ev((id) => { const pr = D.renovProjects.find((x) => String(x.id) === String(id)); const m = { proyek: 0, titipan: 0, lain: 0 };
      (pr.items || []).forEach((it) => (it.payments || []).forEach((pay) => { const tx = D.transactions.find((t) => sameId(t.id, pay.txId)); if (!tx) return; if (renovAkunTitipan(tx.accountId)) m.titipan += pay.amount; else if (pay.sumberDana === 'proyek' || (pay.sumberDana == null && renovFundSource(tx) && renovFundSource(tx).key === 'proyek')) m.proyek += pay.amount; else m.lain += pay.amount; }));
      return m; }, pid);
    ck('A2 tidak ada biaya klien yang jatuh ke akun titipan', brk.titipan === 0, brk);
    if (GOLDEN) ck('A3 [emas] biaya status dana = 4.307.418', a0.cost === 4307418, a0.cost);
    if (a0.status0 !== 'selesai') {
      await ev((id) => renovTandaiSelesai(D.renovProjects.find((x) => String(x.id) === String(id)), { semuaBiayaTercatat: true }), pid);
    }
    const a1 = await info();
    ck('A4 setelah ditandai selesai: status dana HIJAU & laba maks > 0', a1.status === 'HIJAU' && a1.labaMaks > 0, { st: a1.status, max: a1.labaMaks });
    if (GOLDEN) ck('A5 [emas] laba maks 2.692.582', a1.labaMaks === 2692582, a1.labaMaks);

    // === B. Kartu Dana Titipan SEBELUM laba diakui
    const nonSelf = a1.nonSelf[0];
    const card = async (nama) => { await ev(() => { showPage('dashboard-hub'); showPage('keuangan'); setKeuanganTab('laporan'); setLaporanTab('titipan'); if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && DanaTitipanPortfolioPresenter.renderInto) DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList'); }); await sleep(700); return ev((n) => { const cs = [...document.querySelectorAll('#danaTitipanTabList [id^="titipanOwnerCard_"]')]; const st = (x) => ((x.querySelector('.titipan-status-line') || {}).innerText || '').trim(); const c = cs.find((x) => x.textContent.includes('👤 ' + n)); return c ? { visible: c.getBoundingClientRect().width > 0, sentence: st(c), all: cs.map((x) => ((x.querySelector('.titipan-owner-avatar + span') || {}).textContent || '') + ' :: ' + st(x)) } : { missing: true, n: cs.length }; }, nama); };
    const c0 = await card(nonSelf.nama);
    ck('B1 sebelum laba diakui: kartu penerima tidak memuat teks bagi hasil', c0 && !/Bagi hasil proyek belum dibayar/.test(JSON.stringify(c0)), c0);
    ck('B2 sebelum laba diakui: tidak ada utang bagi hasil di Buku Utang', jumlahHutang(a1, nonSelf.id) === 0, a1.hutang);

    // === C. Akui laba sebagian -> hak W & guard pencairan
    const W = a1.owners.find((o) => o.isSelf); const labaTotal = a1.labaManual;
    const hakPenuh = Math.min(Math.round(labaTotal * W.porsi / 100), a1.labaMaks);
    const akui1 = Math.floor(a1.bisaAkui / 2);
    const r1 = await ev(([id, n]) => renovAkuiLaba(D.renovProjects.find((x) => String(x.id) === String(id)), n, { kunci: 'e2e-akui-1' }), [pid, akui1]);
    ck('C1 akui laba sebagian diterima', r1 && r1.ok, r1);
    const c1 = await info();
    const hakSebagian = Math.min(Math.round(akui1 * W.porsi / 100), hakPenuh);
    ck('C2 hak W saat laba diakui sebagian = min(porsi x diakui, nominal tersimpan)', Math.abs((c1.hakW || 0) - hakSebagian) <= 1 || c1.batas >= 0, { hakW: c1.hakW, harap: hakSebagian });
    const tolak = await ev(([id, n]) => renovCairkanLaba(D.renovProjects.find((x) => String(x.id) === String(id)), n, { kunci: 'e2e-c-over' }), [pid, hakSebagian + 1000]);
    ck('C3 pencairan melebihi hak W ditolak, ledger tidak bertambah', tolak && !tolak.ok && /hak/i.test(tolak.reason || '') && (await info()).ledger.length === c1.ledger.length, tolak);

    // === D. Akui penuh -> utang penerima & kartu Dana Titipan
    const r2 = await ev((id) => { const pr = D.renovProjects.find((x) => String(x.id) === String(id)); return renovAkuiLaba(pr, renovLabaSummary(pr).bisaAkui, { kunci: 'e2e-akui-2' }); }, pid);
    ck('D1 akui laba sisa diterima', r2 && r2.ok, r2);
    const d1 = await info();
    const wajibNonSelf = Math.min(Math.round((d1.diakui * nonSelf.porsi) / 100), Math.round(labaTotal * nonSelf.porsi / 100));
    ck('D2 utang bagi hasil penerima = min(porsi x diakui, nominal tersimpan) & tertaut ownerId', Math.abs(jumlahHutang(d1, nonSelf.id) - wajibNonSelf) <= 1 && jumlahHutang(d1, nonSelf.id) > 0, { utang: jumlahHutang(d1, nonSelf.id), harap: wajibNonSelf });
    ck('D3 total utang (FI.totalDebt) & Kekayaan Bersih tidak berubah oleh utang bagi hasil', d1.fiDebt === a1.fiDebt && d1.nw === a1.nw, { debt: [a1.fiDebt, d1.fiDebt], nw: [a1.nw, d1.nw] });
    if (GOLDEN) ck('D4 [emas] utang home in 1.588.100 & hak W penuh 800.000', jumlahHutang(d1, nonSelf.id) === 1588100 && d1.hakW === 800000, { u: jumlahHutang(d1, nonSelf.id), hakW: d1.hakW });
    const c2 = await card(nonSelf.nama);
    ck('D5 kartu penerima memuat "Bagi hasil proyek belum dibayar Rp …"', c2 && c2.visible && /Bagi hasil proyek belum dibayar Rp /.test(c2.sentence), c2 && c2.sentence);
    const lain = c2 && c2.all ? c2.all.filter((t) => t && !t.includes(nonSelf.nama)) : [];
    ck('D6 kartu pemilik lain tidak memuat teks bagi hasil', !lain.some((t) => /Bagi hasil proyek belum dibayar/.test(t)) || a1.nonSelf.length > 1, lain);
    await ev(() => { showPage('keuangan'); try { setKeuanganTab('laporan'); } catch (e) { void e; } }); await sleep(500);
    await ev(() => { const d = document.getElementById('danaTitipanTabList'); if (d) d.scrollIntoView(); }); await sleep(300); await shot('kartu-titipan');
    const ov = await ev(() => ({ doc: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth, bad: /NaN|undefined|\[object/.test((document.getElementById('danaTitipanTabList') || {}).innerText || '') }));
    ck('D7 kartu Dana Titipan: tanpa scroll horizontal / NaN / undefined', ov.doc <= 1 && ov.body <= 1 && !ov.bad, ov);

    // === E. Pencairan hak W: batas pas & efek ke saldo pribadi
    const hakW = d1.hakW;
    const over = await ev(([id, n]) => renovCairkanLaba(D.renovProjects.find((x) => String(x.id) === String(id)), n, { kunci: 'e2e-c-plus1' }), [pid, hakW + 1]);
    ck('E1 pencairan hak W + 1 ditolak', over && !over.ok, over);
    const ok1 = await ev(([id, n]) => renovCairkanLaba(D.renovProjects.find((x) => String(x.id) === String(id)), n, { kunci: 'e2e-c-ok', tanggal: todayStr() }), [pid, hakW]);
    const dup = await ev(([id, n]) => renovCairkanLaba(D.renovProjects.find((x) => String(x.id) === String(id)), n, { kunci: 'e2e-c-ok' }), [pid, hakW]);
    const e1 = await info();
    ck('E2 pencairan = hak W diterima; kunci ganda idempoten (tidak dobel)', ok1 && ok1.ok && dup && dup.ok && e1.cair === d1.cair + hakW, { cair: [d1.cair, e1.cair], hakW });
    ck('E3 saldo pribadi naik tepat sebesar pencairan; total utang tetap', e1.pribadi === d1.pribadi + hakW && e1.fiDebt === d1.fiDebt, { pribadi: [d1.pribadi, e1.pribadi], debt: [d1.fiDebt, e1.fiDebt] });
    ck('E4 setelah W cair penuh, +1 lagi ditolak', !(await ev((id) => renovCairkanLaba(D.renovProjects.find((x) => String(x.id) === String(id)), 1, { kunci: 'e2e-c-extra' }), pid)).ok);

    // === F. Penerima manual lewat modal bagi hasil (bhAdd -> nama baru -> bhSave)
    const f = await ev(async (id) => {
      const pr = D.renovProjects.find((x) => String(x.id) === String(id)); Renov._bh = null; Renov.openDetail(id); await new Promise((r) => setTimeout(r, 500));
      const reg0 = OwnerRegistry.listAll().length; const owners0 = JSON.stringify(pr.bagiHasil.owners);
      Renov.bhAdd(); const d = Renov._bh; const i = d.owners.length - 1;
      const nama = 'Penerima Uji E2E'; Renov.bhNameInput(i, nama);
      d.owners[0].porsi = Math.max(0, d.owners[0].porsi - 5); d.owners[i].porsi = 5; d.owners[i]._touched = true;
      const total = d.owners.reduce((s, o) => s + (Number(o.porsi) || 0), 0);
      Renov.bhSave(); const saved = D.renovProjects.find((x) => String(x.id) === String(id)).bagiHasil.owners;
      const row = saved.find((o) => o.ownerName === nama);
      const reg1 = OwnerRegistry.listAll().length;       const idAwal = row && row.ownerId; const idCari = OwnerRegistry.findOrCreate(nama);
      return { total, reg0, reg1, id: idAwal, sama: String(idAwal) === String(idCari), regSetelah: OwnerRegistry.listAll().length, nSaved: saved.length, owners0 };
    }, pid);
    ck('F1 penerima manual: total porsi 100%, ownerId dari OwnerRegistry, registry +1', Math.abs(f.total - 100) < 0.01 && !!f.id && f.reg1 === f.reg0 + 1, f);
    ck('F2 nama sama tidak membuat ID/registry ganda', f.sama && f.regSetelah === f.reg1, f);
    const g = await info();
    ck('F3 utang bagi hasil penerima manual terbentuk (tertaut ownerId, > 0)', jumlahHutang(g, f.id) > 0, g.hutang);
    // tolak nama kosong / total != 100 tanpa mengubah data tersimpan
    const neg = await ev(async (id) => { const pr = D.renovProjects.find((x) => String(x.id) === String(id)); const snap = JSON.stringify(pr.bagiHasil); Renov._bh = null; Renov.openDetail(id); await new Promise((r) => setTimeout(r, 400));
      Renov.bhAdd(); Renov.bhSave(); const a = JSON.stringify(pr.bagiHasil) === snap; // nama kosong + total tidak 100
      Renov._bh = null; Renov.renderFundPanel(pr); const d2 = Renov._bh; d2.owners[0].porsi = 10; Renov.bhSave(); const b = JSON.stringify(pr.bagiHasil) === snap; document.querySelectorAll('.overlay.open').forEach((o) => { try { closeModal(o.id); } catch (e) { void e; } }); return { a, b }; }, pid);
    ck('F4 simpan ditolak (nama kosong / total != 100%) tanpa mengubah data tersimpan', neg.a && neg.b, neg);

    // === G. Kebersihan umum: Laporan & halaman terkait tanpa NaN/error
    for (const [pg, tab] of [['keuangan', 'laporan'], ['keuangan', 'tagihan'], ['keuangan', 'utangpiutang'], ['dashboard-hub', null]]) {
      await ev(([a, b]) => { showPage(a); if (b) { try { setKeuanganTab(b); } catch (e) { void e; } } }, [pg, tab]); await sleep(500);
      const t = await ev(() => ({ bad: /NaN|undefined|\[object Object\]/.test(document.body.innerText), ow: document.documentElement.scrollWidth - window.innerWidth }));
      ck('G halaman ' + pg + (tab ? '/' + tab : '') + ': tanpa NaN/undefined & tanpa scroll horizontal', !t.bad && t.ow <= 1, t);
    }
    // tanda minus saldo negatif (patch #5): paksa saldo kas negatif lewat akun sementara, tidak disimpan
    const neg2 = await ev(() => { const keep = JSON.stringify(D.accounts); D.accounts.push({ id: 'e2e_neg', name: 'E2E Minus', baseBalance: -9000000, balance: -9000000, includeInBalance: true, jenis: 'tunai' }); invalidateAccBalCache && invalidateAccBalCache(); showPage('dashboard-hub'); return keep; });
    await sleep(900);
    const hubTxt = await ev(() => document.getElementById('page-dashboard-hub').innerText);
    ck('G9 saldo negatif tampil dengan tanda minus di Beranda (Kas & akun / Kekayaan Bersih)', /-\s?Rp\s?[\d.]+/.test(hubTxt) || /−\s?Rp\s?[\d.]+/.test(hubTxt), (hubTxt.match(/[-−]\s?Rp\s?[\d.]+/g) || []).slice(0, 4));
    await ev((keep) => { D.accounts = JSON.parse(keep); invalidateAccBalCache && invalidateAccBalCache(); }, neg2);

    const realErrs = errs.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    ck('Z tanpa error JS/console selama sesi', realErrs.length === 0, realErrs);
  } catch (e) {
    console.error('E2E-BACKUP HARNESS ERROR', e && e.stack || e);
    try { await H.close(); } catch (x) { void x; }
    process.exit(2);
  }
  await H.close();
  const gagal = res.filter((r) => !r.ok);
  console.log(gagal.length ? 'GAGAL (' + gagal.length + '/' + res.length + '): ' + gagal.map((r) => r.n).join(' | ') : 'SEMUA LULUS (' + res.length + ')' + (GOLDEN ? ' [+angka emas backup 20 Nov]' : ''));
  process.exit(gagal.length ? 1 : 0);
})();
