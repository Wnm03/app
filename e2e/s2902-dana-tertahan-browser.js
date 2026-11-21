// E2E browser (opt-in) S2902 — pencairan final + dana tertahan 3 item tagihan pada BACKUP ASLI.
//   BACKUP=/path/backup-keluarga-W.json node e2e/s2902-dana-tertahan-browser.js   (E2E_SHOTS=/dir untuk tangkapan layar)
// Backup dipulihkan lewat localStorage halaman; tidak ada jaringan. Pemeriksaan memakai angka backup 21 Nov 2026 (wallpanel).
'use strict';
const fs = require('node:fs'); const path = require('node:path');
const BACKUP = process.env.BACKUP; if (!BACKUP || !fs.existsSync(BACKUP)) { console.log('SKIP: set BACKUP'); process.exit(3); }
process.env.ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '..'));
const harness = require('./dana-proyek-browser/harness');
const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8')); const SHOTS = process.env.E2E_SHOTS || '';
const res = []; const ck = (n, ok, d) => { res.push(!!ok); console.log((ok ? '✓ ' : '✗ ') + n + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); };
(async () => {
  const H = await harness.start({ width: 390, height: 844 }, true); const { p, errs } = H; const sleep = (ms) => p.waitForTimeout(ms); const ev = (f, a) => p.evaluate(f, a);
  const shot = async (n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 's2902-' + n + '.png'), fullPage: false }); };
  try {
    const loaded = () => ev(() => (D.accounts || []).length > 0 && (D.transactions || []).length > 100);
    for (let i = 0; i < 3 && !(await loaded()); i++) {
      await ev(async (bk) => { Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, bk); localStorage.setItem('kw_v4', JSON.stringify(D)); try { await IDBStore.set('kw_v4_mirror', JSON.stringify(D)); } catch (e) { void e; } }, BK);
      await p.reload(); await p.waitForFunction(() => getComputedStyle(document.getElementById('mainApp')).display !== 'none'); await sleep(1500);
    }
    ck('Backup asli termuat', await loaded());
    await ev(() => { window.askConfirm = async () => true; window._t = []; const o = window.toast; window.toast = function (m) { window._t.push(String(m)); return o.apply(this, arguments); }; });
    const pid = await ev(() => String(D.renovProjects.find((x) => x.name === 'wallpanel').id));
    const snap = () => ev((id) => { const pr = D.renovProjects.find((x) => String(x.id) === id); const st = renovClientFundState(pr), sm = renovLabaSummary(pr);
      const bal = (a) => Math.round(recalcAccBalance(a)); const hi = D.accounts.find((a) => /home in/i.test(a.name || '') && a.id !== 'acc_bri');
      return { status: st.status, reason: st.reason, tertahan: st.danaTertahan, belum: sm.labaBelumDicairkan, kelebihan: sm.kelebihanPencairan, rincian: renovSaldoRincian(), bri: bal('acc_bri'), hi: hi ? bal(hi.id) : null, hiName: hi && hi.name, final: !!pr.pencairanFinal, pribadi: Math.round(saldoPribadi()), fiDebt: (typeof FI !== 'undefined' && FI.totalDebt) ? FI.totalDebt() : null, nw: (() => { try { const x = AssetPortfolioAPI.summary(); return x && x.netWorth && x.netWorth.ok ? Math.round(x.netWorth.netWorth) : null; } catch (e) { return null; } })(), belumBayar: renovItemBelumTerbayar(pr).map((x) => x.sisa), utang: D.debts.filter((d) => d.renovBagiProjectId != null).map((d) => [d.nilai, !!d.lunas]) }; }, pid);
    const s0 = await snap();
    ck('Awal: HIJAU, dana tertahan 2.667.582, BRI 2.667.582', s0.status === 'HIJAU' && s0.tertahan === 2667582 && s0.bri === 2667582, s0);
    // buka detail proyek lewat UI
    await ev((id) => { showPage('home'); try { showPage('renovasi'); } catch (e) { void e; } Renov.openDetail(isNaN(id) ? id : Number(id)); }, pid); await sleep(800);
    let txt = await ev(() => document.body.innerText);
    ck('Panel laba tampil dengan tombol "Cairkan laba (sekali)"', /Cairkan laba \(sekali\)/.test(txt));
    await shot('1-panel-sebelum');
    // klik tombol asli
    await p.getByText('Cairkan laba (sekali)').first().click(); await sleep(600);
    txt = await ev(() => document.getElementById('renovDpModal') ? document.getElementById('renovDpModal').innerText : '');
    ck('Modal pencairan: laba 2.363.100, W 800.000, home in 1.563.100', /2\.363\.100/.test(txt) && /800\.000/.test(txt) && /1\.563\.100/.test(txt), txt.slice(0, 300));
    ck('Modal menawarkan "Buat rekening home in"', /Buat rekening home in/.test(txt)); await shot('2-modal');
    await p.getByText(/Buat rekening home in/).first().click(); await sleep(800);
    const opts = await ev(() => ({ w: [...document.querySelectorAll('#renovFinalAcc0 option')].map((o) => o.textContent), h: [...document.querySelectorAll('#renovFinalAcc1 option')].map((o) => o.textContent) }));
    ck('Rekening home in terbuat & terpilih untuk baris home in', opts.h.some((x) => /home in/i.test(x)), opts);
    await ev(() => { const w = document.getElementById('renovFinalAcc0'); w.value = 'acc_bri'; document.getElementById('renovFinalSrc').value = 'acc_bri'; });
    await shot('3-modal-rekening');
    await p.getByText('Cairkan Sekarang').click(); await sleep(1200);
    const s1 = await snap();
    ck('Setelah final: HIJAU, final tercatat, tidak ada kelebihan pencairan', s1.status === 'HIJAU' && s1.final && !s1.kelebihan, s1);
    ck('BRI 1.104.482 & Rekening home in 1.563.100', s1.bri === 1104482 && s1.hi === 1563100, { bri: s1.bri, hi: s1.hi });
    ck('Dana tertahan 304.482 = 3 item belum terbayar; profit 0, proyek 304.482', s1.tertahan === 304482 && s1.belumBayar.length === 3 && s1.rincian.profit === 0 && s1.rincian.proyek === 304482, { t: s1.tertahan, bb: s1.belumBayar, r: s1.rincian });
    ck('Laba belum dicairkan = 0', s1.belum === 0, s1.belum);
    ck('Saldo pribadi naik TEPAT 800.000 (bagian W) oleh pencairan final', s1.pribadi - s0.pribadi === 800000, { sebelum: s0.pribadi, sesudah: s1.pribadi });
    ck('Total utang (FI) tidak berubah oleh pencairan final', s1.fiDebt === s0.fiDebt, [s0.fiDebt, s1.fiDebt]);
    ck('Utang bagi hasil home in lunas (1.563.100)', s1.utang.length === 1 && s1.utang[0][0] === 1563100 && s1.utang[0][1] === true, s1.utang);
    txt = await ev(() => document.body.innerText);
    ck('Panel: "3 item biaya belum terbayar" + Rp 304.482', /3 item biaya belum terbayar/.test(txt) && /304\.482/.test(txt), (txt.match(/Sisa dana proyek tertahan[^\n]*/) || [])[0]);
    await shot('4-panel-sesudah');
    // bayar 3 tagihan dari BRI lewat jalur tagihan -> payment proyek
    const s2 = await ev(async (id) => { const pr = D.renovProjects.find((x) => String(x.id) === id);
      for (const [bid, amt] of [[1795000000033, 212000], [1795000000035, 52078], [1795000000037, 40404]]) {
        const bill = D.bills.find((b) => b.id === bid); const tx = { id: 'e2e' + bid, type: 'expense', amount: amt, accountId: 'acc_bri', date: '2026-11-21', category: 'Renov', note: 'bayar ' + bid, billLinkId: bid };
        FinanceTxSOT.createMany([tx]); applyRenovBillPayment(bill, tx);
      }
      invalidateAccBalCache(); refreshAfterMutation && refreshAfterMutation({ dashboard: true, finance: true }); const txs = D.transactions.filter((t) => String(t.id).startsWith('e2e')).length;
      const st = renovClientFundState(pr); return { status: st.status, reason: st.reason, tertahan: st.danaTertahan, bb: renovItemBelumTerbayar(pr).length, bri: Math.round(recalcAccBalance('acc_bri')), rincian: renovSaldoRincian(), txs, balAcc: D.accounts.find((a) => a.id === 'acc_bri').balance }; }, pid);
    ck('Saldo pribadi tidak berubah saat 3 tagihan dibayar dari dana proyek', (await snap()).pribadi === s1.pribadi, [s1.pribadi, (await snap()).pribadi]);
    ck('Setelah 3 tagihan dibayar dari BRI: HIJAU, dana tertahan 0, BRI 800.000 (milik W)', s2.status === 'HIJAU' && s2.tertahan === 0 && s2.bb === 0 && s2.bri === 800000, s2);
    // penjaga: tandai satu biaya ditanggung home in
    const g = await ev((id) => { const pr = D.renovProjects.find((x) => String(x.id) === id); const hiId = pr.bagiHasil.owners.find((o) => !o.isSelf).ownerId;
      const t = D.transactions.find((x) => x.id === 1795000000003); const old = t.deductionOwnerId; t.deductionOwnerId = hiId; const st = renovClientFundState(pr); t.deductionOwnerId = old; return { status: st.status, reason: st.reason }; }, pid);
    ck('Penjaga: "ditanggung home in" -> KUNING dgn alasan spesifik', g.status === 'KUNING' && /ditanggung home in/.test(g.reason) && /WPC PANEL/.test(g.reason), g);
    const app = errs.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(e)); // font/CDN luar tak terjangkau di sandbox tanpa jaringan
    ck('Tidak ada error halaman/konsol (selain sumber luar tanpa jaringan)', app.length === 0, app);
  } catch (e) { console.log('ERROR HARNESS', e.message); res.push(false); }
  await H.close(); const f = res.filter((x) => !x).length; console.log(f ? `\nGAGAL ${f}/${res.length}` : `\nLULUS ${res.length}/${res.length}`); process.exit(f ? 1 : 0);
})();
