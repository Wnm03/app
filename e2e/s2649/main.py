import json, sys
from lib import *
W,H=int(sys.argv[1]),int(sys.argv[2])
R={'viewport':f'{W}x{H}'}
def hscroll(pg): return pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
def modal_box(pg,id):
    return pg.evaluate("""(id)=>{const o=document.getElementById(id);const m=o&&o.querySelector('.modal');if(!m)return null;const r=m.getBoundingClientRect();
    return {open:o.classList.contains('open'),w:Math.round(r.width),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right),sw:m.scrollWidth-m.clientWidth}}""",id)
with sync_playwright() as p:
    b,ctx,pg,errs=launch(p,W,H)
    onboard(pg)
    ids=['eieWrap','danaKelolaanWrap','personalOverviewWrap','crossWidgetsWrap','lifePriorityWrap','dashHubTickerModern','eieWatchlistCard','eieStatusCard','eieInsightFeed','danaKelolaanGrid','crossWidgetsGrid','lifePriorityBody','personalOverviewBody']
    R['beranda_id_ada']=pg.evaluate("(ids)=>Object.fromEntries(ids.map(i=>[i,!!document.getElementById(i)]))",ids)
    R['beranda_qa_cari_fitur']=pg.evaluate("!!document.querySelector('[data-action=dashHubQaFocusSearch]')")
    R['beranda_hscroll']=hscroll(pg)
    # ---- Tambah Produk (UI) ----
    pg.evaluate("openProductModal()"); pg.wait_for_timeout(700)
    R['produk_modal']=modal_box(pg,'productModal'); R['produk_hscroll']=hscroll(pg)
    pg.evaluate("""()=>{const s=(i,v)=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
      s('pName','Produk Uji E2E');s('pStock','10');s('pBeli','20000');s('pJual','30000');}""")
    pg.evaluate("document.querySelector('#productModal [data-action=saveProduct]').click()"); pg.wait_for_timeout(1200)
    R['produk_tersimpan']=pg.evaluate("D.products.map(x=>({name:x.name,stock:x.stock}))")
    R['produk_modal_tertutup']=not pg.evaluate("document.getElementById('productModal').classList.contains('open')")
    # ---- Order: buka, tambah keranjang, idle mutasi ----
    pg.evaluate("openOrderModal()"); pg.wait_for_timeout(900)
    R['order_modal']=modal_box(pg,'orderModal'); R['order_hscroll']=hscroll(pg)
    pid=pg.evaluate("D.products[0].id")
    pg.evaluate("(pid)=>{const s=document.getElementById('oProductSelect');s.value=pid;s.dispatchEvent(new Event('change',{bubbles:true}))}",pid)
    pg.evaluate("addOrderItem()"); pg.wait_for_timeout(700)
    pg.evaluate("addOrderItem()"); pg.wait_for_timeout(700)
    R['order_items']=pg.evaluate("Order.items.map(i=>({qty:i.qty}))")
    R['order_total']=pg.evaluate("document.getElementById('oTotalDisplay').textContent")
    pg.evaluate("window.__mut=0;new MutationObserver(m=>window.__mut+=m.length).observe(document.getElementById('orderModal'),{subtree:true,childList:true,characterData:true,attributes:true})")
    pg.wait_for_timeout(1500)
    R['order_idle_mutations']=pg.evaluate("window.__mut")
    t=pg.evaluate("(()=>{const a=performance.now();return a})()"); 
    import time; t0=time.time(); pg.evaluate("1+1"); R['order_responsive_ms']=round((time.time()-t0)*1000)
    R['order_hscroll_after']=hscroll(pg)
    # tombol simpan Order terlihat di viewport
    R['order_save_btn']=pg.evaluate("""()=>{const b=document.querySelector('#orderModal .modal > .btn.btn-primary');if(!b)return null;const r=b.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),inView:r.top>=0&&r.bottom<=innerHeight}}""")
    pg.evaluate("closeModal('orderModal')"); pg.wait_for_timeout(400)
    # ---- Renovasi dari form transaksi ----
    pg.evaluate("openTxModal('expense')"); pg.wait_for_timeout(900)
    R['tx_modal']=modal_box(pg,'txModal')
    pg.evaluate("""()=>{const s=(i,v)=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))};
      s('txAmt','250000');s('txNote','Semen E2E');}""")
    pg.evaluate("()=>{const e=document.getElementById('txCat');e.value='Renovasi';e.dispatchEvent(new Event('change',{bubbles:true}));updateTxVehiclePanels()}"); pg.wait_for_timeout(500)
    R['txCat_tag']=pg.evaluate("document.getElementById('txCat').tagName+':'+document.getElementById('txCat').value")
    R['renov_panel_tampil']=pg.evaluate("document.getElementById('txRenovPanel').style.display")
    pg.evaluate("()=>{const c=document.getElementById('txAddRenov');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));if(typeof toggleTxRenovFields==='function')toggleTxRenovFields()}"); pg.wait_for_timeout(500)
    R['renov_select_disabled_sebelum']=pg.evaluate("document.getElementById('txRenovProject').disabled")
    R['tombol_buat_proyek']=pg.evaluate("(()=>{const b=document.getElementById('txRenovCreateProjectBtn');if(!b)return null;const r=b.getBoundingClientRect();return {hiddenAttr:b.hidden,visible:r.width>0&&r.height>0,h:Math.round(r.height),w:Math.round(r.width)}})()")
    pg.evaluate("document.getElementById('txRenovCreateProjectBtn')&&document.getElementById('txRenovCreateProjectBtn').click()"); pg.wait_for_timeout(1200)
    R['proyek_modal_di_atas']=pg.evaluate("""()=>{const a=document.getElementById('renovProjectModal'),t=document.getElementById('txModal');
      return {open:a&&a.classList.contains('open'),z:+getComputedStyle(a).zIndex||0,tz:+getComputedStyle(t).zIndex||0}}""")
    pg.evaluate("""()=>{const e=document.getElementById('renovProjName');e.value='Proyek Uji E2E';e.dispatchEvent(new Event('input',{bubbles:true}))}""")
    t0=time.time(); pg.evaluate("Renov.saveProject()"); pg.wait_for_timeout(1200)
    R['simpan_proyek_ms']=round((time.time()-t0)*1000)
    R['renov_select_sesudah']=pg.evaluate("(()=>{const s=document.getElementById('txRenovProject');return {disabled:s.disabled,val:s.value,text:s.selectedOptions[0]&&s.selectedOptions[0].textContent}})()")
    R['tx_hscroll']=hscroll(pg)
    # simpan transaksi: klik tombol Simpan yang terlihat
    pg.evaluate("""()=>{const bs=[...document.querySelectorAll('#txModal [data-action=saveTx]')];(bs.find(b=>b.offsetParent)||bs[0]).click()}""")
    pg.wait_for_timeout(2500)
    R['toast_terakhir']=pg.evaluate("document.getElementById('toast').textContent")
    snap=lambda: pg.evaluate("""()=>({tx:D.transactions.filter(t=>t.renovProjectLinkId!=null).map(t=>({amt:t.amount||t.amt,link:String(t.renovProjectLinkId),item:t.renovItemLinkId!=null?String(t.renovItemLinkId):null,note:t.note||t.keterangan})),
      proj:D.renovProjects.map(p=>({id:String(p.id),name:p.name,items:(p.items||[]).map(i=>({id:String(i.id),paid:!!i.paid,txId:i.txId!=null?String(i.txId):null,amt:i.amount||i.total||i.harga}))})),nTx:D.transactions.length})""")
    R['sebelum_reload']=snap()
    pg.wait_for_timeout(1500)  # beri waktu persist
    pg.reload(); unlock(pg); pg.wait_for_timeout(1500)
    R['setelah_reload']=snap()
    R['semua_tx']=pg.evaluate("D.transactions.map(t=>({id:String(t.id),cat:t.cat||t.category,sub:t.sub||t.subCat,amt:t.amount||t.amt,type:t.type,note:t.note}))")
    R['produk_setelah_reload']=pg.evaluate("D.products.map(x=>x.name)")
    a,bb=R['sebelum_reload'],R['setelah_reload']
    R['persistensi_identik']=(a==bb)
    R['renovProjectLinkId_cocok']=bool(bb['tx']) and bb['tx'][0]['link']==bb['proj'][0]['id'] if bb['proj'] else False
    R['item_terhubung_tx']=bool(bb['proj'] and bb['proj'][0]['items'] and bb['tx'] and bb['proj'][0]['items'][0]['id']==bb['tx'][0]['item'])
    R['js_errors']=errs
    b.close()
print(json.dumps(R,indent=1,ensure_ascii=False))
