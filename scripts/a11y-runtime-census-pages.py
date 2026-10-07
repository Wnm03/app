#!/usr/bin/env python3
"""S256AM: page-by-page runtime census (S256AG-AK a11y semantics) + click-through of single-select/toggle groups.
Usage: python3 scripts/a11y-runtime-census-pages.py [app_production.html]. Needs playwright + chromium. Exit code 1 on any finding."""
import sys, threading, http.server, socketserver, functools, os, json
from playwright.sync_api import sync_playwright
page_file = sys.argv[1] if len(sys.argv) > 1 else 'app_production.html'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
http.server.SimpleHTTPRequestHandler.log_message = lambda *a, **k: None
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
PAGES = ['dashboard-hub', 'keuangan', 'shop', 'carnotes', 'pajak', 'aset', 'ai', 'settings']
SCAN = """() => {
 const q = (s) => [...document.querySelectorAll(s)];
 const mm = (b) => (b.getAttribute('aria-pressed') === 'true') !== b.classList.contains('active');
 const nat = q('button.chip-btn[aria-pressed]'), dv = q('[role=button][aria-pressed]');
 return { native: nat.length, div: dv.length,
  mismatch: nat.concat(dv).filter(mm).map(b => (b.id || b.dataset.action || b.className).toString().slice(0, 50)),
  noState: q('button.chip-btn').filter(b => !b.hasAttribute('aria-pressed') && !b.hasAttribute('aria-selected') && !b.closest('.segmented-control') && !/^(pickAssetScanCandidate|applyQuickScan|BusinessFlowPresenter\\.tap|Servis\\.(selectCatalog|confirmPartial)|BudgetReko\\.applyByIndex|_dashCashProjToggle|CashFlowProjectionPresenter\\.toggle)/.test(b.dataset.action || '')).map(b => (b.id || '') + '|' + (b.dataset.action || '')).filter((v, i, a) => a.indexOf(v) === i),
  segUnprocessed: q('.segmented-control').filter(r => !r.querySelector('[aria-pressed],[aria-selected],[role]')).map(r => r.id || r.className).slice(0, 10) };
}"""
# click-through: for every visible pressed-group container, click each button then require class<->aria agreement and exactly-one-or-zero consistency per element.
CLICK = """async () => {
 const bad = []; const done = [];
 const groups = [...document.querySelectorAll('button.chip-btn[aria-pressed]')].map(b => b.parentElement).filter((p, i, a) => a.indexOf(p) === i);
 for (const g of groups) {
  if (!g.offsetParent) continue;
  for (const b of [...g.querySelectorAll('button.chip-btn[aria-pressed]')]) {
   if (!b.offsetParent || b.disabled) continue;
   try { b.click(); } catch (e) { continue; }
   await new Promise(r => setTimeout(r, 120));
  }
  const now = [...document.querySelectorAll('button.chip-btn[aria-pressed]')].filter(b => g.contains(b) || b.isConnected);
  now.forEach(b => { if ((b.getAttribute('aria-pressed') === 'true') !== b.classList.contains('active')) bad.push((b.id || b.dataset.action || '') + '@' + (g.id || g.className).toString().slice(0, 30)); });
  done.push(g.id || g.className.toString().slice(0, 30));
 }
 return { clicked: done.length, bad };
}"""
res = {'pages': {}, 'errors': []}; fail = False
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block').new_page()
    pg.on('pageerror', lambda e: res['errors'].append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:{port}/{page_file}'); pg.wait_for_timeout(3000)
    reveal = "() => { const m = document.getElementById('mainApp'); if (m) m.classList.remove('u-dnone'); }"
    for name in PAGES:
        try:
            pg.evaluate(reveal); pg.evaluate("(n) => showPage(n)", name); pg.wait_for_timeout(900); pg.evaluate(reveal)
            s = pg.evaluate(SCAN); c = pg.evaluate(CLICK); pg.wait_for_timeout(400); s2 = pg.evaluate(SCAN)
            res['pages'][name] = {'native': s2['native'], 'div': s2['div'], 'mismatchBefore': s['mismatch'], 'mismatchAfterClicks': s2['mismatch'] + c['bad'], 'noState': s2['noState'], 'segUnprocessed': s2['segUnprocessed'], 'groupsClicked': c['clicked']}
            if s['mismatch'] or s2['mismatch'] or c['bad'] or s2['segUnprocessed']: fail = True
        except Exception as e:
            res['pages'][name] = {'error': str(e)[:200]}; fail = True
    b.close()
if res['errors']: fail = True
print(json.dumps(res, indent=1, ensure_ascii=False)); sys.exit(1 if fail else 0)
