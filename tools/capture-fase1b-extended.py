#!/usr/bin/env python3
"""Capture missing Finance/Shop sub-tabs and transaction/titipan modals.

Run from the app-main project root:
  python3 tools/capture-fase1b-extended.py
Requires: pip install playwright; installed Chromium via `playwright install chromium`.
The script uses synthetic in-memory seed data only. It does not export or mutate
real user data. Service workers are blocked, and screenshots/logs are written
under docs/screenshots-fase1b/.
"""
import asyncio
import json
import os
import subprocess
import time
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path.cwd()
OUT = ROOT / 'docs' / 'screenshots-fase1b'
BASE = 'http://127.0.0.1:8099/index.html'
VIEWPORTS = [('m', 390, 844, True), ('t', 768, 1024, False), ('d', 1440, 900, False)]
FINANCE = [
    ('kelola', 'Kelola'), ('tagihan', 'Tagihan'), ('budget', 'Budget'),
    ('utangpiutang', 'Piutang-Utang'), ('asetproyek', 'Aset-Proyek'),
    ('laporan', 'Laporan'), ('akun', 'Akun'),
]
REPORTS = [('ringkasan', 'Ringkasan'), ('aruskas', 'Arus-Kas'), ('transaksi', 'Transaksi'), ('titipan', 'Dana-Titipan')]
SHOP = [
    ('kasir', 'Kasir'), ('jual', 'Manual'), ('etalase', 'Etalase'), ('produsen', 'Produsen'),
    ('riwayat', 'Riwayat'), ('pelanggan', 'Pelanggan'), ('laporan', 'Laporan'), ('bi', 'Business-Intelligence'),
]
METRICS = r"""()=>{
 const vis=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&e.closest('[hidden]')===null};
 const act=document.querySelector('.page.active')||document.body;
 let small=0,tot=0; const w=document.createTreeWalker(act,NodeFilter.SHOW_TEXT);
 while(w.nextNode()){const n=w.currentNode; if(!n.textContent.trim())continue; const el=n.parentElement; if(!el||!vis(el))continue; tot++; if(parseFloat(getComputedStyle(el).fontSize)<12) small++;}
 const ctl=[...act.querySelectorAll('button,a[href],input,select,textarea,[role=button],[data-action]')].filter(vis);
 const tiny=ctl.filter(e=>{const r=e.getBoundingClientRect();return r.height<40||r.width<40}).length;
 const wide=[...act.querySelectorAll('*')].filter(e=>vis(e)&&e.getBoundingClientRect().right>innerWidth+1).length;
 return {text_lt12:small,text_total:tot,controls:ctl.length,controls_lt40:tiny,overflow_x:document.documentElement.scrollWidth>innerWidth,elements_past_viewport:wide};
}"""
SEED = r"""()=>{
 const t=(i,type,amt,cat,acc,d,note)=>({id:'t'+i,type,amount:amt,category:cat,subcategory:'',accountId:acc,payMethod:'tunai',note,date:d});
 const day=n=>{const x=new Date();x.setDate(x.getDate()-n);return x.toISOString().split('T')[0]};
 D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:1500000,balance:1500000,includeInBalance:true,jenis:'tunai',ownership:{type:'SELF'}},{id:'a2',name:'BCA',emoji:'🏦',baseBalance:8200000,balance:8200000,includeInBalance:true,jenis:'bank',ownership:{type:'SELF'}},{id:'a3',name:'GoPay',emoji:'📱',baseBalance:420000,balance:420000,includeInBalance:true,jenis:'ewallet',ownership:{type:'SELF'}}];
 const cats=['Makan','Transport','Listrik','Belanja','Bensin','Kesehatan']; D.transactions=[];
 for(let i=0;i<40;i++) D.transactions.push(t(i,i%7===0?'income':'expense',i%7===0?1200000+i*10000:15000+(i*7919)%180000,i%7===0?'Gaji':cats[i%6],['a1','a2','a3'][i%3],day(i),i%7===0?'Gaji mingguan':'Belanja '+cats[i%6]));
 D.vehicles=[{id:'vA',name:'Vario 125',emoji:'🏍️'},{id:'vB',name:'Avanza',emoji:'🚗'}];
 D.products=[1,2,3,4,5,6].map(i=>({id:'p'+i,name:['Cobek Batu 20cm','Ulekan Kayu','Sambal Terasi','Bumbu Pecel','Kerupuk Udang','Cobek Marmer'][i-1],stock:3+i*4,kategoriId:null,produsenId:null,hargaBeli:9000+i*2500,hargaJual:15000+i*5000,hargaReseller:12000+i*4000,diskonPersen:0}));
 D.piutang=[]; save();
}"""

async def boot(browser, width, height, mobile):
    context = await browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2 if mobile else 1,
                                        is_mobile=mobile, has_touch=mobile, service_workers='block')
    page = await context.new_page()
    page_errors, console_errors = [], []
    page.on('pageerror', lambda e: page_errors.append(str(e)))
    page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    await page.goto(BASE, wait_until='load', timeout=60000)
    await page.wait_for_timeout(1800)
    if await page.locator('#ob_pin').count():
        await page.fill('#ob_pin', '1234')
        if await page.locator('#ob_tema').count():
            await page.select_option('#ob_tema', 'light')
        await page.locator('[data-action="finishOnboard"]').click()
        await page.wait_for_timeout(1500)
    await page.evaluate(SEED)
    await page.wait_for_timeout(1200)
    return context, page, page_errors, console_errors

async def show_page(page, name):
    await page.evaluate("p => showPage(p, document.querySelector(`[data-action=showPage][data-args*=\\\"${p}\\\"]`))", name)
    await page.wait_for_timeout(700)

async def click_action_arg(page, action, arg):
    loc = page.locator(f'[data-action="{action}"]')
    count = await loc.count()
    for i in range(count):
        item = loc.nth(i)
        if not await item.is_visible():
            continue
        raw = await item.get_attribute('data-args') or ''
        try:
            args = json.loads(raw)
        except Exception:
            continue
        if args and args[0] == arg:
            await item.click(timeout=10000)
            await page.wait_for_timeout(650)
            return True
    return False

async def shot(page, name, report, errors):
    await page.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
    report['screenshots'].append(name + '.png')
    report['visible_page'] = await page.locator('.page.active').get_attribute('id') if await page.locator('.page.active').count() else None
    report['horizontal_overflow'] = await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    report.setdefault('metrics', {})[name] = await page.evaluate(METRICS)
    report['page_errors'] = errors[0][-10:]
    report['console_errors'] = errors[1][-10:]

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = subprocess.Popen(['python3', '-m', 'http.server', '8099', '--bind', '127.0.0.1'], cwd=str(ROOT),
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    results = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'synthetic_data_only': True,
               'screenshots': [], 'missing_controls': [], 'errors': []}
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            for prefix, width, height, mobile in VIEWPORTS:
                ctx, page, page_errors, console_errors = await boot(browser, width, height, mobile)
                errors = (page_errors, console_errors)
                await show_page(page, 'keuangan')
                for key, label in FINANCE:
                    ok = await click_action_arg(page, 'setKeuanganTab', key)
                    if not ok:
                        results['missing_controls'].append(f'{prefix}:finance:{key}')
                        continue
                    name = f'{prefix}-keuangan-{label}'
                    await shot(page, name, results, errors)
                    if key == 'laporan':
                        for rkey, rlabel in REPORTS:
                            rok = await click_action_arg(page, 'setLaporanTab', rkey)
                            if not rok:
                                results['missing_controls'].append(f'{prefix}:laporan:{rkey}')
                                continue
                            await shot(page, f'{prefix}-laporan-{rlabel}', results, errors)
                # Capture transaction modal from the Finance workspace.
                await show_page(page, 'keuangan')
                await click_action_arg(page, 'setKeuanganTab', 'kelola')
                # Tombol openTxModal hanya tampil di Kelola -> sub-tab Transaksi (tersembunyi di Ringkasan).
                await click_action_arg(page, 'setKelolaTab', 'transaksi')
                opened = await click_action_arg(page, 'openTxModal', 'income')
                if opened:
                    await shot(page, f'{prefix}-modal-tambah-transaksi', results, errors)
                    await page.keyboard.press('Escape')
                    await page.wait_for_timeout(300)
                else:
                    results['missing_controls'].append(f'{prefix}:modal:openTxModal-income')
                await show_page(page, 'shop')
                for key, label in SHOP:
                    ok = await click_action_arg(page, 'setShopTab', key)
                    if not ok:
                        results['missing_controls'].append(f'{prefix}:shop:{key}')
                        continue
                    await shot(page, f'{prefix}-shop-{label}', results, errors)
                await ctx.close()
            await browser.close()
    except Exception as exc:
        results['errors'].append(type(exc).__name__ + ': ' + str(exc))
    finally:
        server.terminate()
        try: server.wait(timeout=3)
        except subprocess.TimeoutExpired: server.kill()
    (OUT / 'capture-report.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: results[k] for k in ('screenshots', 'missing_controls', 'errors')}, ensure_ascii=False, indent=2))
    if results['errors'] or results['missing_controls']:
        raise SystemExit(1)

if __name__ == '__main__':
    asyncio.run(main())
