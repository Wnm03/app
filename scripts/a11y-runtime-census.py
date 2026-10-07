#!/usr/bin/env python3
"""S256AL runtime census for S256AG-AK a11y semantics. Usage: python3 scripts/a11y-runtime-census.py [app_production.html]. Exit code 1 bila ada temuan (S256AS)
Needs: pip install playwright && playwright install chromium. Serves the repo over http on a free port, 390x844."""
import sys, threading, http.server, socketserver, functools, os, json
from playwright.sync_api import sync_playwright
page_file = sys.argv[1] if len(sys.argv) > 1 else 'app_production.html'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
H.log_message = lambda *a, **k: None
http.server.SimpleHTTPRequestHandler.log_message = lambda *a, **k: None
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = """() => {
 const q = (s) => [...document.querySelectorAll(s)];
 const out = {};
 const nat = q('button.chip-btn[aria-pressed]');
 out.nativePressed = nat.length;
 out.nativeMismatch = nat.filter(b => (b.getAttribute('aria-pressed')==='true') !== b.classList.contains('active')).map(b => b.id || b.dataset.action);
 out.nativeNoState = q('button.chip-btn').filter(b => !b.hasAttribute('aria-pressed') && !b.closest('.segmented-control')).map(b => (b.id || '') + '|' + (b.dataset.action || '')).filter((v, i, a) => a.indexOf(v) === i);
 const div = q('[role=button][aria-pressed]');
 out.divPressed = div.length;
 out.divMismatch = div.filter(b => (b.getAttribute('aria-pressed')==='true') !== b.classList.contains('active')).length;
 const tabs = ['wiTabBtnSingle','wiTabBtnList','wiTabBtnWatch'].map(i => document.getElementById(i));
 out.worthItTabs = tabs.map(t => t && [t.getAttribute('role'), t.getAttribute('aria-selected'), t.getAttribute('tabindex'), t.getAttribute('aria-controls')].join('/'));
 out.expanders = ['dashCashProjSettingsToggle','cashflowProjSettingsToggle'].map(i => { const t = document.getElementById(i); return t ? t.getAttribute('aria-expanded') : null; });
 out.segmentedRootsUnprocessed = q('.segmented-control').filter(r => !r.querySelector('[aria-pressed],[aria-selected],[role]')).map(r => r.id || r.className).slice(0, 10);
 return out;
}"""
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/{page_file}'); pg.wait_for_timeout(3000)
    # Fresh profile stays on onboarding (#mainApp hidden) -> controls have zero size and cannot take focus; reveal it for the census only.
    pg.evaluate("() => { const m = document.getElementById('mainApp'); if (m) m.classList.remove('u-dnone'); }"); pg.wait_for_timeout(500)
    res = {'boot': pg.evaluate(JS)}
    try:
        for _ in range(3):  # open() can be swallowed while the boot sequence is still settling; retry until the overlay has class "open"
            pg.evaluate("() => { const m = document.getElementById('mainApp'); if (m) m.classList.remove('u-dnone'); WorthIt.open(); }"); pg.wait_for_timeout(1200)
            if pg.evaluate("() => document.getElementById('worthItModal').classList.contains('open') && !document.getElementById('worthItModal').classList.contains('closing')"): break
        res['worthItOpen'] = pg.evaluate(JS)['worthItTabs']
        pg.focus('#wiTabBtnSingle'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
        res['worthItAfterArrowRight'] = pg.evaluate(JS)['worthItTabs']
        res['focusedAfterArrow'] = pg.evaluate("() => document.activeElement && document.activeElement.id")
        pg.keyboard.press('End'); pg.wait_for_timeout(300)
        res['afterEnd'] = pg.evaluate(JS)['worthItTabs']
        pg.keyboard.press('Home'); pg.wait_for_timeout(300)
        res['afterHome'] = pg.evaluate(JS)['worthItTabs']
        pg.evaluate("() => { const t = document.getElementById('cashflowProjSettingsToggle'); if (t) t.click(); }"); pg.wait_for_timeout(300)
        res['expanderAfterClick'] = pg.evaluate(JS)['expanders']
        pg.evaluate("() => { const t = document.getElementById('cashflowProjSettingsToggle'); if (t) t.click(); }"); pg.wait_for_timeout(300)
        res['expanderAfterSecondClick'] = pg.evaluate(JS)['expanders']
    except Exception as e:
        res['worthItError'] = str(e)
    b.close()
res['pageErrors'] = errors
# S256AS: sebelumnya skrip ini TIDAK PERNAH gagal (tanpa sys.exit) sehingga temuan hanya dicetak. Kini exit 1 bila ada page error, error WorthIt,
# mismatch aria-pressed, atau urutan tab (ArrowRight/End/Home) / expander menyimpang dari kontrak S256AJ/AK.
def _census_findings(r):
    f = []; bt = r.get('boot') or {}
    if r.get('pageErrors'): f.append('pageErrors')
    if 'worthItError' in r: f.append('worthItError')
    if bt.get('nativeMismatch'): f.append('nativeMismatch')
    if bt.get('divMismatch'): f.append('divMismatch')
    if bt.get('segmentedRootsUnprocessed'): f.append('segmentedRootsUnprocessed')
    def tab_ok(key, idx):
        lst = r.get(key) or []
        return len(lst) == 3 and all(str(x).startswith('tab/true/0/' if i == idx else 'tab/false/-1/') for i, x in enumerate(lst))
    for key, idx in (('worthItOpen', 0), ('worthItAfterArrowRight', 1), ('afterEnd', 2), ('afterHome', 0)):
        if not tab_ok(key, idx): f.append('tab:' + key)
    if r.get('focusedAfterArrow') != 'wiTabBtnList': f.append('focusedAfterArrow')
    ex1 = (r.get('expanderAfterClick') or [None, None])[-1]; ex2 = (r.get('expanderAfterSecondClick') or [None, None])[-1]
    if ex1 != 'true' or ex2 != 'false': f.append('expander')
    return f
res['findings'] = _census_findings(res)
print(json.dumps(res, indent=1, ensure_ascii=False)); sys.exit(1 if res['findings'] else 0)
