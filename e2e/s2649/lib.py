import json, sys, time
from playwright.sync_api import sync_playwright
CHROME='/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome'
import os
URL=os.environ.get('KW_URL','http://localhost:8765/index.html')
def launch(p, w, h):
    b=p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':w,'height':h}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('console', lambda m: errs.append('console.error: '+m.text[:200]) if m.type=='error' else None)
    return b, ctx, pg, errs
def onboard(pg):
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.fill('#ob_pin','1234')
    pg.evaluate("document.querySelector('[data-action=finishOnboard]').click()")
    pg.wait_for_function("!document.getElementById('mainApp').classList.contains('u-dnone')", timeout=20000)
def unlock(pg):
    pg.wait_for_timeout(2500)
    if pg.evaluate("!document.getElementById('pinScreen').classList.contains('u-dnone')"):
        for d in '1234':
            pg.evaluate(f"document.querySelector('#pinPad [data-action=pinPress][data-args=\\'[\"{d}\"]\\']').click()")
            pg.wait_for_timeout(150)
    pg.wait_for_function("!document.getElementById('mainApp').classList.contains('u-dnone')", timeout=20000)
