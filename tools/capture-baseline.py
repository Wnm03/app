import asyncio, subprocess, time, json, sys
from playwright.async_api import async_playwright
BASE="http://localhost:8099/index.html"
srv = subprocess.Popen(["python3","-m","http.server","8099","--directory","."],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1.5)
SEED = """()=>{
 const t=(i,type,amt,cat,acc,d,note)=>({id:'t'+i,type,amount:amt,category:cat,subcategory:'',accountId:acc,payMethod:'tunai',note,date:d});
 const day=n=>{const x=new Date();x.setDate(x.getDate()-n);return x.toISOString().split('T')[0]};
 D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:1500000,balance:1500000,includeInBalance:true,jenis:'tunai',ownership:{type:'SELF'}},{id:'a2',name:'BCA',emoji:'🏦',baseBalance:8200000,balance:8200000,includeInBalance:true,jenis:'bank',ownership:{type:'SELF'}},{id:'a3',name:'GoPay',emoji:'📱',baseBalance:420000,balance:420000,includeInBalance:true,jenis:'ewallet',ownership:{type:'SELF'}}];
 const cats=['Makan','Transport','Listrik','Belanja','Bensin','Kesehatan'];
 D.transactions=[];
 for(let i=0;i<40;i++){D.transactions.push(t(i,i%7==0?'income':'expense',i%7==0?(1200000+i*10000):(15000+(i*7919)%180000),i%7==0?'Gaji':cats[i%6],['a1','a2','a3'][i%3],day(i),i%7==0?'Gaji mingguan':'Belanja '+cats[i%6]))}
 D.vehicles=[{id:'vA',name:'Vario 125',emoji:'🏍️'},{id:'vB',name:'Avanza',emoji:'🚗'}];
 D.products=[1,2,3,4,5,6].map(i=>({id:'p'+i,name:['Cobek Batu 20cm','Ulekan Kayu','Sambal Terasi','Bumbu Pecel','Kerupuk Udang','Cobek Marmer'][i-1],stock:3+i*4,kategoriId:null,produsenId:null,hargaBeli:9000+i*2500,hargaJual:15000+i*5000,hargaReseller:12000+i*4000,diskonPersen:0}));
 D.piutang=[];
 save();
}"""
async def boot(b, vw, vh, mob, theme=None):
    ctx = await b.new_context(viewport={"width":vw,"height":vh}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob, service_workers="block")
    pg = await ctx.new_page(); pg.errs=[]
    pg.on("pageerror", lambda e: pg.errs.append("PAGEERR "+str(e)[:160]))
    pg.on("console", lambda m: pg.errs.append(m.text[:140]) if m.type=="error" else None)
    await pg.goto(BASE, wait_until="load"); await pg.wait_for_timeout(1800)
    await pg.fill("#ob_pin","1234")
    if theme: await pg.select_option("#ob_tema", theme)
    await pg.click("[data-action=finishOnboard]"); await pg.wait_for_timeout(1500)
    await pg.evaluate(SEED); await pg.wait_for_timeout(1500)
    return ctx, pg
METRIC = """()=>{let small=0,tot=0,ex=[];document.querySelectorAll('button,select,input,[data-action]').forEach(e=>{const r=e.getBoundingClientRect();if(!e.offsetParent||!r.width||!r.height)return;tot++;if(r.height<40||r.width<40){small++;if(ex.length<4)ex.push((e.innerText||e.id||e.className||'').toString().trim().slice(0,18)+' '+Math.round(r.width)+'x'+Math.round(r.height))}});
 const fs={};document.querySelectorAll('body *').forEach(e=>{if(!e.offsetParent||!e.childNodes.length)return;const has=[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim());if(!has)return;const s=Math.round(parseFloat(getComputedStyle(e).fontSize));fs[s]=(fs[s]||0)+1});
 return {hscroll:document.documentElement.scrollWidth>innerWidth,small,tot,ex,fs}}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        res={}
        for name,vw,vh,mob in [("m",390,844,True),("t",768,1024,False),("d",1440,900,False)]:
            ctx,pg = await boot(b,vw,vh,mob)
            for page in ["dashboard-hub","keuangan","shop","aset","carnotes","pajak","settings","ai"]:
                await pg.evaluate("(p)=>showPage(p, document.querySelector(`[data-action=showPage][data-args*='\"${p}\"']`))", page)
                await pg.wait_for_timeout(900)
                await pg.screenshot(path=f"shots/{name}-{page}.png")
                m = await pg.evaluate(METRIC); res[f"{name}-{page}"]=m
                tabs = await pg.evaluate("(p)=>[...document.querySelectorAll('#page-'+p+' [data-action]')].filter(e=>e.offsetParent).map(e=>e.getAttribute('data-action')+':'+(e.getAttribute('data-args')||'').slice(0,22)+':'+(e.innerText||'').trim().slice(0,14)).slice(0,14)", page)
                if name=="m": print(page, "| tabs:", tabs)
            res[name+"-errs"]=pg.errs[:6]
            await ctx.close()
        for k,v in res.items():
            if isinstance(v,dict): print(k,"hscroll" if v["hscroll"] else "", "small",v["small"],"/",v["tot"],v["ex"][:3], "fs",dict(sorted(v["fs"].items(),key=lambda x:int(x[0]))))
            else: print(k,v)
        await b.close()
asyncio.run(main()); srv.terminate()
