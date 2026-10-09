#!/usr/bin/env node
'use strict';
/**
 * e2e/run-e2e.js — S2551. Uji E2E headless OPT-IN (bukan bagian `npm test`).
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
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket CDP gagal')); });
  let id = 0; const pending = new Map(); const pageErrors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') pageErrors.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(${expr})`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`evaluate gagal: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  return { send, evaluate, pageErrors, close: () => ws.close() };
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

const STATE = `(() => {
  const act = document.querySelector('.page.active');
  const wrap = (id) => { const e = document.getElementById(id); return e ? e.hidden : null; };
  return {
    active: act && act.id,
    // "Tertahan" = role-hidden yang TIDAK tercantum di daftar hide role halaman aktif,
    // atau elemen milik daftar keep role itu yang ikut tersembunyi.
    stuck: (() => {
      if (!act) return ['(tidak ada halaman aktif)'];
      const rule = DashboardInsightDedup.ROLE_RULES[act.id.replace(/^page-/, '')] || { keep: [], hide: [] };
      const bad = [...document.querySelectorAll('[data-dashboard-role-hidden="1"]')].filter((e) => !rule.hide.includes(e.id)).map((e) => e.id || e.className);
      const keptHidden = (rule.keep || []).filter((id) => { const e = document.getElementById(id); return e && e.hidden; });
      return bad.concat(keptHidden);
    })(),
    fuelHidden: ${JSON.stringify(FUEL_CARDS)}.map(wrap),
    gauge: document.querySelectorAll('.fuelcard-gauge').length,
    text: act ? act.innerText : ''
  };
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
    await waitFor(() => b.evaluate(`typeof D === 'object' && typeof showPage === 'function' && typeof FuelTankProfile !== 'undefined'`), 'app siap');
    // Jalur masuk resmi: kw_setup + kw_v4 lalu muat ulang (bukan memaksa mainApp tampil).
    await b.evaluate(`(() => { localStorage.setItem('kw_v4', JSON.stringify(D)); localStorage.setItem('kw_setup', '1'); })()`);
    await b.send('Page.navigate', { url: base });
    await waitFor(() => b.evaluate(`getComputedStyle(document.getElementById('mainApp')).display !== 'none'`), 'mainApp tampil lewat jalur setup resmi');
    check('masuk lewat jalur setup resmi (tanpa memaksa mainApp)', true);

    // Fixture sintetis: kendaraan tanpa profil tangki, tanpa log BBM.
    const vid = await b.evaluate(`(() => { D.vehicles = [{ id: 'e2e_veh', name: 'Motor E2E', emoji: '🏍️', modelId: 'vario-125' }]; D.bbmLogs = []; save(); return D.vehicles[0].id; })()`);

    await gotoPage(b, 'dashboard-hub');
    for (const p of ['keuangan', 'shop', 'aset', 'pajak']) {
      await gotoPage(b, p);
      const s = await b.evaluate(STATE);
      check(`halaman ${p}: tidak ada elemen role-hidden tertahan (di luar daftar hide role)`, s.active === `page-${p}` && s.stuck.length === 0, `active=${s.active} stuck=${JSON.stringify(s.stuck)}`);
    }

    await gotoPage(b, 'dashboard-hub');
    await gotoPage(b, 'carnotes');
    let s = await b.evaluate(STATE);
    check('Dashboard Hub -> Car Notes: 4 kartu fuel hidden=false', s.active === 'page-carnotes' && s.fuelHidden.every((h) => h === false), JSON.stringify(s.fuelHidden));
    check('Car Notes: tidak ada elemen role-hidden tertahan', s.stuck.length === 0, JSON.stringify(s.stuck));
    check('kendaraan tanpa profil tangki: petunjuk "profil tangki" tampil', s.gauge === 0 && /profil tangki/i.test(s.text));

    await b.evaluate(`FuelTankProfile.save(${JSON.stringify(vid)}, { tankCapacityLiter: 5.5, reserveLiter: 1, fuelBarCount: 8 })`);
    await gotoPage(b, 'aset');
    await gotoPage(b, 'carnotes');
    s = await b.evaluate(STATE);
    check('kendaraan berprofil tangki: fuel bar atau petunjuk koreksi tampil', s.gauge > 0 || /belum ada estimasi/i.test(s.text), s.text.slice(0, 120));
    check('Car Notes (kunjungan ke-2): kartu fuel tetap hidden=false', s.fuelHidden.every((h) => h === false), JSON.stringify(s.fuelHidden));

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
