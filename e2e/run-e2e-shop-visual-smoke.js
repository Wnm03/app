// run-e2e-shop-visual-smoke.js — S2727 uji tampilan Shop di browser nyata (Playwright/Chromium).
// Hanya MEMBACA tampilan: data uji = sandbox baru (onboarding + 8 produk contoh lewat ShopCanonicalWriter).
// Pemakaian:  BASE=http://localhost:8765 node e2e/run-e2e-shop-visual-smoke.js [--assert]
//   --assert  => exit 1 bila ambang "setelah perapian" dilanggar (default: hanya cetak metrik baseline).
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const ASSERT = process.argv.includes('--assert');
const TARGET = { kasirPaneTop: 400, etalaseFirstProductY: 1100, etalasePaneH: 2600, maxSmallTap: 0, maxConsoleErrors: 0 };
const TABS = ['kasir','jual','etalase','produsen','riwayat','pelanggan','laporan','bi'];

async function boot(browser, vw, vh) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.__errs = [];
  p.on('pageerror', e => p.__errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') p.__errs.push(m.text().slice(0, 160)); });
  await p.goto(BASE + '/app_production.html', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const pin = await p.$('#onboard input[maxlength="4"]'); if (pin) await pin.fill('1234');
  await p.click('#onboard button:has-text("Mulai Sekarang")'); await p.waitForTimeout(1800);
  await p.evaluate(() => {
    ['Cobek Batu 20cm','Cobek Batu 25cm','Ulekan Kayu','Cobek Marmer','Sambal Terasi 200g','Sambal Bawang 200g','Bumbu Pecel','Kerupuk Udang']
      .forEach((n, i) => ShopCanonicalWriter.create({ name: n, hargaJual: 15000 + i * 5000, hargaReseller: 12000 + i * 4000, hargaBeli: 9000 + i * 2500, stock: 5 + i * 3, category: i < 4 ? 'Cobek' : 'Sambal' }));
    showPage('shop', document.querySelector('[data-action=showPage][data-args*=\'"shop"\']'));
  });
  await p.waitForTimeout(1000); return p;
}
const tab = async (p, t) => { await p.evaluate(t => { const b = [...document.querySelectorAll('#page-shop .cn-tab')].find(x => (x.getAttribute('data-args') || '').includes('"' + t + '"')); setShopTab(t, b); }, t); await p.waitForTimeout(800); };
const scrollTo = async (p, y) => { await p.evaluate(y => { document.getElementById('scrollRoot').scrollTop = y; }, y); await p.waitForTimeout(300); };

(async () => {
  const browser = await chromium.launch(); const res = { viewports: [], tabs: {}, modals: {}, fails: [] };
  for (const [vw, vh] of [[360, 640], [390, 844], [768, 1024]]) {
    const p = await boot(browser, vw, vh);
    const m = await p.evaluate(() => {
      const pg = document.getElementById('page-shop'); let small = 0, tot = 0; const ex = [];
      pg.querySelectorAll('button,select,input,[data-action]').forEach(e => { const r = e.getBoundingClientRect(); if (!e.offsetParent || !r.width || !r.height) return; tot++; if (r.height < 40 || r.width < 40) { small++; if (ex.length < 5) ex.push((e.textContent || e.id).trim().slice(0, 16)); } });
      return { vw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth, smallTap: small, totalTap: tot, smallEx: ex };
    });
    m.consoleErrors = p.__errs.length; res.viewports.push(m);
    if (m.hscroll) res.fails.push('hscroll @' + vw);
    if (vw === 390) {
      for (const t of TABS) {
        await tab(p, t);
        res.tabs[t] = await p.evaluate(t => { const pane = document.getElementById('shopTab-' + t); const r = pane.getBoundingClientRect(); return { paneTop: Math.round(r.top), paneH: Math.round(r.height), visibleCards: [...pane.querySelectorAll('.card')].filter(c => c.offsetParent).length }; }, t);
      }
      await tab(p, 'etalase'); await scrollTo(p, 0);
      res.tabs.etalase.firstProductY = await p.evaluate(() => { const c = document.querySelector('#shopTab-etalase .shop-product-card'); return c ? Math.round(c.getBoundingClientRect().top + document.getElementById('scrollRoot').scrollTop) : null; });
      await tab(p, 'riwayat'); const a = await p.evaluate(() => document.querySelectorAll('#shopTab-riwayat [id*=rafik]').length);
      await tab(p, 'laporan'); const b2 = await p.evaluate(() => document.querySelectorAll('#shopTab-laporan [id*=rafik]').length);
      res.tabs.trenChartCount = a + b2;
      for (const [k, fn] of [['product', 'openProductModal'], ['order', 'openOrderModal']]) {
        await p.evaluate(fn => window[fn](), fn); await p.waitForTimeout(800);
        res.modals[k] = await p.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].find(x => x.offsetHeight > 0 && getComputedStyle(x).display !== 'none'); if (!o) return null; const sc = [...o.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)); return { id: o.id, fields: [...o.querySelectorAll('input,select,textarea')].filter(e => e.offsetParent && e.type !== 'hidden').length, scrollH: sc ? sc.scrollHeight : null, clientH: sc ? sc.clientHeight : null }; });
        await p.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show', 'open', 'active')); }); await p.waitForTimeout(300);
      }
    }
    await p.context().close();
  }
  await browser.close();
  const k = res.tabs.kasir || {}, e = res.tabs.etalase || {}, v390 = res.viewports.find(v => v.vw === 390) || {};
  if (ASSERT) {
    if (k.paneTop > TARGET.kasirPaneTop) res.fails.push(`kasir.paneTop ${k.paneTop} > ${TARGET.kasirPaneTop}`);
    if (e.firstProductY > TARGET.etalaseFirstProductY) res.fails.push(`etalase.firstProductY ${e.firstProductY} > ${TARGET.etalaseFirstProductY}`);
    if (e.paneH > TARGET.etalasePaneH) res.fails.push(`etalase.paneH ${e.paneH} > ${TARGET.etalasePaneH}`);
    if (v390.smallTap > TARGET.maxSmallTap) res.fails.push(`smallTap ${v390.smallTap} > ${TARGET.maxSmallTap}`);
    if (res.tabs.trenChartCount > 1) res.fails.push('kartu tren ganda: ' + res.tabs.trenChartCount);
  }
  res.viewports.forEach(v => { if (v.consoleErrors > TARGET.maxConsoleErrors) res.fails.push(`console error @${v.vw}: ${v.consoleErrors}`); });
  console.log(JSON.stringify(res, null, 1));
  process.exit(ASSERT && res.fails.length ? 1 : 0);
})();
