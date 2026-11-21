// E2E browser (opt-in) S2903 — Pencairan Final dengan "Tahan di rekening dana proyek (titipan)" lalu "Cairkan titipan", pada BACKUP ASLI.
//   BACKUP=/path/backup-keluarga-W.json node e2e/s2903-titipan-tahan-browser.js   (E2E_SHOTS=/dir untuk tangkapan layar)
'use strict';
const fs = require('node:fs'); const path = require('node:path');
const BACKUP = process.env.BACKUP; if (!BACKUP || !fs.existsSync(BACKUP)) { console.log('SKIP: set BACKUP'); process.exit(3); }
process.env.ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '..'));
const harness = require('./dana-proyek-browser/harness');
const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8')); const SHOTS = process.env.E2E_SHOTS || '';
const res = []; const ck = (n, ok, d) => { res.push(!!ok); console.log((ok ? '✓ ' : '✗ ') + n + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 500) : '')); };

async function boot() {
  const H = await harness.start({ width: 390, height: 844 }, true); const { p } = H; H.failed = []; p.on('requestfailed', (r) => H.failed.push(r.url())); const sleep = (ms) => p.waitForTimeout(ms); const ev = (f, a) => p.evaluate(f, a);
  const loaded = () => ev(() => (D.accounts || []).length > 0 && (D.transactions || []).length > 100);
  for (let i = 0; i < 3 && !(await loaded()); i++) {
    await ev(async (bk) => { Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, bk); localStorage.setItem('kw_v4', JSON.stringify(D)); try { await IDBStore.set('kw_v4_mirror', JSON.stringify(D)); } catch (e) { void e; } }, BK);
    await p.reload(); await p.waitForFunction(() => getComputedStyle(document.getElementById('mainApp')).display !== 'none'); await sleep(1500);
  }
  await ev(() => { window.askConfirm = async () => true; window._t = []; const o = window.toast; window.toast = function (m) { window._t.push(String(m)); return o.apply(this, arguments); }; });
  const pid = await ev(() => String(D.renovProjects.find((x) => x.name === 'wallpanel').id));
  const snap = () => ev((id) => { const pr = D.renovProjects.find((x) => String(x.id) === id); const st = renovClientFundState(pr), sm = renovLabaSummary(pr);
    const bal = (a) => Math.round(recalcAccBalance(a)); const hi = D.accounts.find((a) => /home in/i.test(a.name || '') && a.id !== 'acc_bri');
    return { loaded: true, status: st.status, reason: st.reason, tertahan: st.danaTertahan, belum: sm.labaBelumDicairkan, kelebihan: sm.kelebihanPencairan, rincian: renovSaldoRincian(), titipan: renovTitipanDitahanTotal(pr), bri: bal('acc_bri'), hi: hi ? bal(hi.id) : null, final: !!pr.pencairanFinal, rows: pr.pencairanFinal ? pr.pencairanFinal.rows.map((r) => ({ o: r.ownerName, j: r.jumlah, tahan: !!r.tahan, acc: r.accountId })) : null, pribadi: Math.round(saldoPribadi()), fiDebt: (typeof FI !== 'undefined' && FI.totalDebt) ? FI.totalDebt() : null, nTx: D.transactions.length, nAcc: D.accounts.length, utang: D.debts.filter((d) => d.renovBagiProjectId != null).map((d) => [d.nilai, !!d.lunas]) }; }, pid);
  const openDetail = async () => { await ev((id) => { showPage('home'); try { showPage('renovasi'); } catch (e) { void e; } Renov.openDetail(isNaN(id) ? id : Number(id)); }, pid); await sleep(800); };
  return { H, p, sleep, ev, pid, snap, openDetail };
}

(async () => {
  let C = await boot(); let { H, p, sleep, ev, pid, snap, openDetail } = C;
  const shot = async (n) => { if (SHOTS) await C.p.screenshot({ path: path.join(SHOTS, 's2903-' + n + '.png'), fullPage: false }); };
  try {
    ck('Backup asli termuat', (await snap()).loaded);
    const s0 = await snap();
    ck('Awal: HIJAU, dana tertahan 2.667.582, BRI 2.667.582, belum final', s0.status === 'HIJAU' && s0.tertahan === 2667582 && s0.bri === 2667582 && !s0.final, s0);
    await openDetail(); await shot('1-panel-sebelum');
    await p.getByText('Cairkan laba (sekali)').first().click(); await sleep(600);
    const m = await ev(() => { const el = document.getElementById('renovDpModal'); return { txt: el ? el.innerText : '', w: [...document.querySelectorAll('#renovFinalAcc0 option')].map((o) => o.value), h: [...document.querySelectorAll('#renovFinalAcc1 option')].map((o) => o.value + '|' + o.textContent) }; });
    ck('Baris W TIDAK punya opsi tahan', !m.w.includes('__tahan__'), m.w);
    ck('Baris home in punya opsi "Tahan di rekening dana proyek (titipan)"', m.h.some((x) => x.startsWith('__tahan__') && /Tahan di rekening dana proyek/.test(x)), m.h);
    await shot('2-modal-opsi-tahan');
    await ev(() => { document.getElementById('renovFinalAcc0').value = 'acc_bri'; document.getElementById('renovFinalAcc1').value = '__tahan__'; document.getElementById('renovFinalSrc').value = 'acc_bri'; });
    await p.getByText('Cairkan Sekarang').click(); await sleep(1200);
    const s1 = await snap();
    ck('Final tercatat; baris home in tahan:true, W tidak tahan', s1.final && s1.rows.find((r) => /home in/i.test(r.o)).tahan === true && s1.rows.find((r) => !/home in/i.test(r.o)).tahan === false, s1.rows);
    ck('Tidak ada transfer baru (jumlah transaksi & rekening sama; BRI tetap 2.667.582)', s1.nTx === s0.nTx && s1.nAcc === s0.nAcc && s1.bri === s0.bri, { tx: [s0.nTx, s1.nTx], bri: s1.bri });
    ck('Saldo pribadi naik TEPAT 800.000', s1.pribadi - s0.pribadi === 800000, [s0.pribadi, s1.pribadi]);
    ck('Total utang kas (FI) tidak berubah', s1.fiDebt === s0.fiDebt, [s0.fiDebt, s1.fiDebt]);
    ck('Utang bagi hasil home in 1.563.100 TETAP terbuka', s1.utang.length === 1 && s1.utang[0][0] === 1563100 && s1.utang[0][1] === false, s1.utang);
    ck('Dana tertahan 1.867.582 = titipan 1.563.100 + proyek 304.482; profit 0', s1.tertahan === 1867582 && s1.titipan === 1563100 && s1.rincian.titipan === 1563100 && s1.rincian.proyek === 304482 && s1.rincian.profit === 0, { t: s1.tertahan, r: s1.rincian });
    ck('Tidak ada kelebihan pencairan; status HIJAU', !s1.kelebihan && s1.status === 'HIJAU', [s1.kelebihan, s1.status]);
    let txt = await ev(() => document.body.innerText);
    ck('Panel: "ditahan di ... (titipan)" + tombol "Cairkan titipan home in"', /ditahan di .*\(titipan\)/.test(txt) && /Cairkan titipan home in/i.test(txt));
    ck('Panel: ringkasan "Titipan ditahan ... home in 1.563.100"', /Titipan ditahan di rekening dana proyek: home in Rp 1\.563\.100/i.test(txt), (txt.match(/Titipan ditahan[^\n]*/) || [])[0]);
    ck('Panel: sisa tertahan 304.482 (tanpa titipan) untuk 3 item', /Sisa dana proyek tertahan[^\n]*304\.482[^\n]*3 item/.test(txt), (txt.match(/Sisa dana proyek tertahan[^\n]*/) || [])[0]);
    await shot('3-panel-setelah-tahan');
    // tombol Cairkan laba sekali sudah tidak ada
    ck('Tombol "Cairkan laba (sekali)" hilang (sekali saja)', !/Cairkan laba \(sekali\)/.test(txt));

    // ---- Rilis titipan lewat UI ----
    await p.getByText(/Cairkan titipan home in/i).first().click(); await sleep(600);
    let rm = await ev(() => { const el = document.getElementById('renovDpModal'); return el ? el.innerText : ''; });
    ck('Modal rilis: 1.563.100 dari rekening dana proyek ke rekening home in', /Cairkan Titipan home in/i.test(rm) && /1\.563\.100/.test(rm), rm.slice(0, 250));
    ck('Belum ada rekening home in -> tawarkan "Buat rekening home in"', /Buat rekening home in/i.test(rm));
    await shot('4-modal-rilis');
    await p.getByText(/Buat rekening home in/i).first().click(); await sleep(800);
    const opt = await ev(() => [...document.querySelectorAll('#renovRilisAcc option')].map((o) => o.textContent));
    ck('Rekening home in terbuat & muncul di pilihan tujuan', opt.some((x) => /home in/i.test(x)), opt);
    await ev(() => { const s = document.getElementById('renovRilisAcc'); const o = [...s.options].find((x) => /home in/i.test(x.textContent)); s.value = o.value; });
    await p.getByText('Cairkan Titipan', { exact: true }).last().click(); await sleep(1200);
    const s2 = await snap();
    ck('Rilis: BRI 1.104.482 & Rekening home in 1.563.100', s2.bri === 1104482 && s2.hi === 1563100, { bri: s2.bri, hi: s2.hi });
    ck('Rilis: dana tertahan 304.482, titipan 0, profit 0, proyek 304.482', s2.tertahan === 304482 && s2.titipan === 0 && s2.rincian.titipan === 0 && s2.rincian.profit === 0 && s2.rincian.proyek === 304482, { t: s2.tertahan, r: s2.rincian });
    ck('Rilis: utang bagi hasil home in lunas', s2.utang.length === 1 && s2.utang[0][1] === true, s2.utang);
    ck('Rilis: saldo pribadi tidak bergeser (tetap +800.000) & utang kas tetap', s2.pribadi === s1.pribadi && s2.fiDebt === s0.fiDebt, [s1.pribadi, s2.pribadi, s2.fiDebt]);
    ck('Rilis: baris tidak lagi tahan (accountId = rekening home in)', s2.rows.every((r) => !r.tahan), s2.rows);
    txt = await ev(() => document.body.innerText);
    ck('Panel: tombol "Cairkan titipan" hilang, toast sukses', !/Cairkan titipan home in/i.test(txt) && (await ev(() => window._t)).some((t) => /Titipan dicairkan/.test(t)));
    await shot('5-panel-setelah-rilis');
    const app = H.errs.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL_CONNECTION_FAILED/.test(e));
    ck('Alur 1: tidak ada error halaman/konsol', app.length === 0, app);
    ck('Alur 1: semua request gagal = sumber luar (bukan file app)', H.failed.every((u) => !/127\.0\.0\.1/.test(u)), H.failed.map((u) => u.slice(0, 80)));
    await H.close();

    // ---- Rollback nyata: simpan gagal saat rilis ----
    C = await boot(); ({ H, p, sleep, ev, pid, snap, openDetail } = C);
    await openDetail();
    await p.getByText('Cairkan laba (sekali)').first().click(); await sleep(600);
    await ev(() => { document.getElementById('renovFinalAcc0').value = 'acc_bri'; document.getElementById('renovFinalAcc1').value = '__tahan__'; document.getElementById('renovFinalSrc').value = 'acc_bri'; });
    await p.getByText('Cairkan Sekarang').click(); await sleep(1200);
    // buat rekening home in lewat helper, lalu paksa save() gagal pada rilis
    const pre = await ev((id) => { const pr = D.renovProjects.find((x) => String(x.id) === id); const row = pr.pencairanFinal.rows.find((r) => r.tahan); const x = renovBuatRekeningPemilik(row.ownerId, row.ownerName); return { ok: x.ok, acc: x.account.id, ownerId: row.ownerId }; }, pid);
    const b = await snap();
    const rb = await ev((a) => { const pr = D.renovProjects.find((x) => String(x.id) === a.pid); const orig = window.save; window.save = () => false; let r; try { r = renovCairkanTahan(pr, { ownerId: a.ownerId, rekeningId: a.acc, tanggal: todayStr() }); } finally { window.save = orig; } return r; }, { pid, ownerId: pre.ownerId, acc: pre.acc });
    const a2 = await snap();
    ck('Rollback: save() gagal -> ok:false "Penyimpanan gagal"', rb.ok === false && /Penyimpanan gagal/.test(rb.reason), rb);
    ck('Rollback: transaksi, saldo, utang, baris tahan kembali persis', a2.nTx === b.nTx && a2.bri === b.bri && a2.hi === b.hi && JSON.stringify(a2.utang) === JSON.stringify(b.utang) && a2.rows.find((r) => /home in/i.test(r.o)).tahan === true && a2.tertahan === b.tertahan, { b: [b.nTx, b.bri, b.hi, b.utang], a: [a2.nTx, a2.bri, a2.hi, a2.utang] });
    // setelah rollback, rilis normal tetap bisa
    const ok = await ev((a) => { const pr = D.renovProjects.find((x) => String(x.id) === a.pid); return renovCairkanTahan(pr, { ownerId: a.ownerId, rekeningId: a.acc, tanggal: todayStr() }).ok; }, { pid, ownerId: pre.ownerId, acc: pre.acc });
    ck('Setelah rollback, rilis normal berhasil (tidak ada sisa keadaan rusak)', ok === true && (await snap()).bri === 1104482);
    // guard: rilis ulang ditolak; rekening tujuan = sumber ditolak
    const g = await ev((a) => { const pr = D.renovProjects.find((x) => String(x.id) === a.pid); return renovCairkanTahan(pr, { ownerId: a.ownerId, rekeningId: a.acc }); }, { pid, ownerId: pre.ownerId, acc: pre.acc });
    ck('Rilis dua kali ditolak (tidak ada titipan tertahan lagi)', g.ok === false && /Tidak ada titipan/.test(g.reason), g);
    const app2 = H.errs.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL_CONNECTION_FAILED/.test(e));
    ck('Alur 2: tidak ada error halaman/konsol', app2.length === 0, app2);
    ck('Alur 2: semua request gagal = sumber luar (bukan file app)', H.failed.every((u) => !/127\.0\.0\.1/.test(u)), H.failed.map((u) => u.slice(0, 80)));
  } catch (e) { console.log('ERROR HARNESS', e.message); res.push(false); }
  await H.close(); const f = res.filter((x) => !x).length; console.log(f ? `\nGAGAL ${f}/${res.length}` : `\nLULUS ${res.length}/${res.length}`); process.exit(f ? 1 : 0);
})();
