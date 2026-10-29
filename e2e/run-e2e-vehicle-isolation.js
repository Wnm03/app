#!/usr/bin/env node
'use strict';
/**
 * e2e/run-e2e-vehicle-isolation.js — S2730 (turunan harness run-e2e.js).
 * (sisa komentar harness asli) Uji E2E headless OPT-IN (bukan bagian `npm test`).
 *
 * Tanpa dependensi baru: memakai Chromium/Chrome yang sudah terpasang lewat
 * Chrome DevTools Protocol (WebSocket global Node >= 22). Tidak mengubah
 * package-lock.json. Fixture sintetis dibuat di dalam halaman; tidak ada
 * backup/data pribadi yang dibaca atau di-commit.
 *
 *   npm run test:e2e
 *   E2E_CHROME=/path/ke/chrome npm run test:e2e
 *   E2E_SKIP_OK=1 npm run test:e2e   # exit 0 bila browser/Node tidak tersedia
 *
 * Skenario S2550: kartu fuel Car Notes tidak boleh tertahan role-hide setelah
 * berpindah halaman, dan fuel bar/petunjuk tampil sesuai profil tangki.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const cp = require('node:child_process');
const { findPolicyBlockedFailure } = require('./diagnostics');

const ROOT = path.resolve(process.env.E2E_ROOT || path.join(__dirname, '..'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const FUEL_CARDS = ['fuelIntelWrap', 'fuelDashWrap', 'fuelCompareWrap', 'fuelTrendWrap'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function skip(msg) {
  console.log(`E2E SKIP — ${msg}`);
  process.exit(process.env.E2E_SKIP_OK === '1' ? 0 : 3);
}

function findChrome() {
  const cands = [process.env.E2E_CHROME, process.env.CHROME_BIN];
  for (const base of ['/opt/pw-browsers', path.join(os.homedir(), '.cache/ms-playwright')]) {
    try {
      for (const d of fs.readdirSync(base).sort().reverse()) {
        cands.push(path.join(base, d, 'chrome-linux/chrome'), path.join(base, d, 'chrome-linux/headless_shell'));
      }
    } catch (_e) { void _e; }
  }
  cands.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  return cands.find((c) => c && fs.existsSync(c));
}

function serveRoot() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function launchChrome(chrome) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-e2e-'));
  const proc = cp.spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=0',
    `--user-data-dir=${dir}`, '--window-size=390,800', 'about:blank'], { stdio: 'ignore' });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    try { port = Number(fs.readFileSync(path.join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (_e) { void _e; }
  }
  if (!port) { proc.kill(); throw new Error('Chrome tidak membuka port DevTools'); }
  return { proc, port, dir };
}

async function connect(port) {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch (_e) { void _e; }
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('Target halaman Chrome tidak ditemukan');
  const ws = new WebSocket(target.webSocketDebuggerUrl); const networkFailures = []; const requestUrls = new Map();
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket CDP gagal')); });
  let id = 0; const pending = new Map(); const pageErrors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') pageErrors.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
    else if (m.method === 'Network.requestWillBeSent') requestUrls.set(m.params.requestId, m.params.request.url);
    else if (m.method === 'Network.loadingFailed') networkFailures.push({ requestId: m.params.requestId, url: requestUrls.get(m.params.requestId) || '', errorText: String(m.params.errorText || ''), type: m.params.type || '' });
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(${expr})`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`evaluate gagal: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  return { send, evaluate, pageErrors, networkFailures, close: () => ws.close() };
}

async function waitFor(fn, label, ms = 15000) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (_e) { void _e; } await sleep(150); }
  throw new Error(`timeout menunggu: ${label}`);
}

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`); }

async function gotoPage(b, name) {
  // showPage() pada halaman lazy bisa tertunda; ulangi pemanggilan sampai TEPAT satu halaman aktif = target dan stabil.
  const only = `(() => { const a = [...document.querySelectorAll('.page.active')].map((e) => e.id); return a.length === 1 && a[0] === 'page-${name}'; })()`;
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    await b.evaluate(`showPage(${JSON.stringify(name)})`);
    for (let i = 0; i < 20; i++) { if (await b.evaluate(only)) break; await sleep(150); }
    if (await b.evaluate(only)) {
      await sleep(1200); // beri waktu render lazy + DashboardInsightDedup
      if (await b.evaluate(only)) return;
    }
  }
  throw new Error(`halaman ${name} tidak stabil aktif dalam 20 dtk`);
}


const TX_FIXTURE = `(() => {
  D.vehicles = [
    { id: 'e2e_vA', name: 'Motor A', emoji: '🏍️' },
    { id: 'e2e_vB', name: 'Motor B', emoji: '🏍️' },
    { id: 'e2e_vC', name: 'Mobil C', emoji: '🚗' }];
  D.bbmLogs = []; D.servisLogs = []; D.transactions = [];
  D.accounts = [{ id: 'e2e_acc', name: 'Dompet', emoji: '💵', baseBalance: 5000000, balance: 5000000, includeInBalance: true, jenis: 'tunai', ownership: { type: 'SELF' } }];
  const mk = (id, name, vid) => ({ id, name, emoji: '🏍️', classification: 'WAJIB', linkedVehicleId: vid,
    subs: [{ id: id + '_bensin', name: 'Bensin', classification: 'WAJIB' }, { id: id + '_servis', name: 'Servis & Oli', classification: 'WAJIB' }] });
  const keep = D.categories.expense.filter((c) => !['Motor A', 'Motor B', 'Mobil C'].includes(c.name));
  D.categories.expense = keep.concat([mk('cat_e2e_a', 'Motor A', 'e2e_vA'), mk('cat_e2e_b', 'Motor B', 'e2e_vB')]);
  if (typeof curVehicleId !== 'undefined') curVehicleId = 'e2e_vA';
  save();
  return true;
})()`;

const SET_FORM = (cat, sub) => `(() => {
  const c = document.getElementById('txCat'); const s = document.getElementById('txSubCat');
  c.value = ${JSON.stringify(cat)}; s.value = ${JSON.stringify(sub)};
  c.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('input', { bubbles: true }));
  updateTxVehiclePanels();
  return { bbm: document.getElementById('txBbmVehicle').value, bbmShown: document.getElementById('txBbmPanel').style.display, servisShown: document.getElementById('txServisPanel').style.display };
})()`;

const FILL_AND_SAVE_BBM = (vehId) => `(async () => {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  document.getElementById('txBbmVehicle').value = ${JSON.stringify(vehId)};
  set('txAmt', '50000'); set('txAcc', 'e2e_acc');
  const chk = document.getElementById('txSyncBbm'); chk.checked = true; toggleTxBbmFields();
  document.getElementById('txBbmVehicle').value = ${JSON.stringify(vehId)};
  set('txBbmKm', '12345'); set('txBbmLiter', '5'); set('txBbmHargaL', '10000');
  await saveTx();
  return { logs: D.bbmLogs.map((l) => ({ v: l.vehicleId, km: l.km, tx: l.txLinkId })), tx: D.transactions.length };
})()`;

async function main() {
  if (typeof WebSocket === 'undefined') skip('butuh Node >= 22 (WebSocket global).');
  const chrome = findChrome();
  if (!chrome) skip('Chrome/Chromium tidak ditemukan; set E2E_CHROME=/path/ke/chrome.');
  const server = await serveRoot();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const br = await launchChrome(chrome);
  let b;
  try {
    b = await connect(br.port);
    await b.send('Page.navigate', { url: base });
    await waitFor(() => b.evaluate(`typeof D === 'object' && typeof showPage === 'function' && typeof saveTx === 'function'`), 'app siap');
    await b.evaluate(`(() => { localStorage.setItem('kw_v4', JSON.stringify(D)); localStorage.setItem('kw_setup', '1'); })()`);
    await b.send('Page.navigate', { url: base });
    await waitFor(() => b.evaluate(`getComputedStyle(document.getElementById('mainApp')).display !== 'none'`), 'mainApp tampil');
    await b.evaluate(TX_FIXTURE);
    await gotoPage(b, 'keuangan');

    // 1. konteks kategori terhubung memilih kendaraan kategori (bukan kendaraan aktif)
    await b.evaluate(`openTxModal('expense')`); await sleep(400);
    let r = await b.evaluate(SET_FORM('Motor B', 'Bensin'));
    check('kategori Motor B/Bensin: panel BBM tampil dan kendaraan = Motor B (bukan kendaraan aktif A)', r.bbmShown === 'block' && r.bbm === 'e2e_vB', JSON.stringify(r));

    // 2. pilihan manual dipertahankan setelah updateTxVehiclePanels() (awal _saveTxInner / blur)
    await b.evaluate(`document.getElementById('txBbmVehicle').value = 'e2e_vC'`);
    const kept = await b.evaluate(`(() => { updateTxVehiclePanels(); updateTxVehiclePanels(); return document.getElementById('txBbmVehicle').value; })()`);
    check('pilihan manual (Mobil C) tidak ditimpa saat panel dihitung ulang', kept === 'e2e_vC', kept);

    // 3. ganti kategori ke kendaraan lain -> konteks baru diterapkan
    r = await b.evaluate(SET_FORM('Motor A', 'Bensin'));
    check('ganti kategori ke Motor A: kendaraan mengikuti konteks baru (Motor A)', r.bbm === 'e2e_vA', JSON.stringify(r));

    // 4. simpan nyata: pilihan manual -> log BBM tersimpan ke kendaraan pilihan, tx tertaut, saldo turun sekali
    await b.evaluate(`openTxModal('expense')`); await sleep(400);
    await b.evaluate(SET_FORM('Motor A', 'Bensin'));
    const saved = await b.evaluate(FILL_AND_SAVE_BBM('e2e_vC'));
    check('simpan nyata: log BBM tersimpan ke kendaraan pilihan manual (Mobil C), bukan kategori', saved.logs.length === 1 && saved.logs[0].v === 'e2e_vC' && !!saved.logs[0].tx, JSON.stringify(saved));
    check('simpan nyata: tepat 1 transaksi dibuat', saved.tx === 1, JSON.stringify(saved));
    const bal = await b.evaluate(`(() => { invalidateAccBalCache(); return recalcAccBalance('e2e_acc'); })()`);
    check('simpan nyata: saldo akun berkurang tepat sekali (5.000.000 -> 4.950.000)', bal === 4950000, String(bal));

    // 5. buka ulang transaksi historis (kategori Motor A, log Mobil C) lalu simpan tanpa mengubah kendaraan
    const txId = await b.evaluate(`D.transactions[0].id`);
    await b.evaluate(`editTx(${JSON.stringify(txId)})`); await sleep(600);
    const reopened = await b.evaluate(`document.getElementById('txBbmVehicle').value`);
    check('edit transaksi historis: dropdown kendaraan = kendaraan log (Mobil C)', reopened === 'e2e_vC', reopened);
    await b.evaluate(`saveTx()`); await sleep(800);
    const after = await b.evaluate(`({ logs: D.bbmLogs.map((l) => l.vehicleId), n: D.bbmLogs.length, tx: D.transactions.length })`);
    check('edit + simpan tanpa perubahan: kendaraan log tidak berpindah ke kendaraan kategori', after.n === 1 && after.logs[0] === 'e2e_vC' && after.tx === 1, JSON.stringify(after));

    check('tidak ada pageerror selama skenario', b.pageErrors.length === 0, b.pageErrors.slice(0, 3).join(' | '));
  } finally {
    try { b && b.close(); } catch (_e) { void _e; }
    br.proc.kill('SIGKILL');
    server.close();
    try { fs.rmSync(br.dir, { recursive: true, force: true }); } catch (_e) { void _e; }
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\nE2E ${failed.length ? 'FAIL' : 'PASS'} — ${results.length - failed.length}/${results.length} cek lulus`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(`E2E ERROR — ${e.message}`); process.exit(2); });
