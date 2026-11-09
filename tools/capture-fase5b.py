#!/usr/bin/env python3
"""Fase 5B (S2769): capture Keuangan 4 tema x 2 viewport (mobile 390, desktop 1440) + metrik token kartu/font angka.
Jalankan dari akar proyek: python3 tools/capture-fase5b.py   (butuh playwright + Chromium; data seed sintetis, in-memory).
Output: docs/screenshots-fase5b/after/*.png dan docs/screenshots-fase5b/after-metrics.json"""
import asyncio, json, subprocess, time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path.cwd(); OUT = ROOT / 'docs' / 'screenshots-fase5b' / 'after'; PORT = 8131
THEMES = ['dark', 'light', 'graphite', 'modern']; VPS = {'m': (390, 844, True), 'd': (1440, 900, False)}
SEED = r"""()=>{
 const t=(i,type,amt,cat,acc,d,note)=>({id:'t'+i,type,amount:amt,category:cat,subcategory:'',accountId:acc,payMethod:'tunai',note,date:d});
 const day=n=>{const x=new Date();x.setDate(x.getDate()-n);return x.toISOString().split('T')[0]};
 D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:1500000,balance:1500000,includeInBalance:true,jenis:'tunai',ownership:{type:'SELF'}},{id:'a2',name:'BCA',emoji:'🏦',baseBalance:8200000,balance:8200000,includeInBalance:true,jenis:'bank',ownership:{type:'SELF'}}];
 const cats=['Makan','Transport','Listrik','Belanja','Bensin','Kesehatan']; D.transactions=[];
 for(let i=0;i<40;i++) D.transactions.push(t(i,i%7===0?'income':'expense',i%7===0?1200000+i*10000:15000+(i*7919)%180000,i%7===0?'Gaji':cats[i%6],['a1','a2'][i%2],day(i),'x'));
 D.vehicles=[{id:'vA',name:'Vario 125',emoji:'🏍️'}];
 D.products=[1,2,3,4].map(i=>({id:'p'+i,name:'P'+i,stock:3+i*4,kategoriId:null,produsenId:null,hargaBeli:9000+i*2500,hargaJual:15000+i*5000,hargaReseller:12000+i*4000,diskonPersen:0}));
 D.piutang=[]; save();}"""
SHOW = """()=>showPage('keuangan', document.querySelector('[data-action=showPage][data-args*=\"keuangan\"]'))"""
METR = r"""()=>{const cs=(e,p)=>getComputedStyle(e).getPropertyValue(p).trim();const b=document.body;
 const c=document.querySelector('.page.active .card'),n=document.querySelector('.page.active .stat-val');
 return {density:cs(b,'--density'),font_num:cs(b,'--font-num').slice(0,40),card_pad:cs(c,'padding-top'),card_radius:cs(c,'border-top-left-radius'),
  card_gap:cs(c,'margin-bottom'),num_font:n?cs(n,'font-family').slice(0,32):null,overflow_x:document.documentElement.scrollWidth>innerWidth}}"""
async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
    res = {}
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch()
            for vp, (w, h, m) in VPS.items():
                ctx = await br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if m else 1, is_mobile=m, has_touch=m, service_workers='block')
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda x: errs.append(x.text) if x.type == 'error' else None)
                await pg.goto(f'http://127.0.0.1:{PORT}/index.html', wait_until='load', timeout=60000); await pg.wait_for_timeout(1800)
                if await pg.locator('#ob_pin').count():
                    await pg.fill('#ob_pin', '1234'); await pg.locator('[data-action="finishOnboard"]').click(); await pg.wait_for_timeout(1500)
                await pg.evaluate(SEED); await pg.wait_for_timeout(900)
                for t in THEMES:
                    await pg.evaluate("t=>{D.profile.theme=t;applyEffectiveTheme();}", t)
                    await pg.evaluate(SHOW); await pg.wait_for_timeout(700)
                    await pg.screenshot(path=str(OUT / f'{vp}-keuangan-{t}.png'), full_page=True)
                    res[f'{vp}-{t}'] = await pg.evaluate(METR)
                res[f'{vp}-errors'] = errs
            await br.close()
    finally:
        srv.terminate()
    (OUT.parent / 'after-metrics.json').write_text(json.dumps(res, indent=1))
    print(json.dumps(res, indent=1))
asyncio.run(main())
