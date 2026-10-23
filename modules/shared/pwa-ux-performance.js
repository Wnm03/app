/* S1891 — PWA UX/performance helpers. Presentation/runtime-safe only. */
(function(g){
  'use strict';
  const PWAUX=g.PWAUX=g.PWAUX||{};
  const timers=new WeakMap();
  PWAUX.debounce=function(fn,wait,key){
    if(typeof fn!=='function')return function(){};
    const slot=key&&typeof key==='object'?key:fn;
    return function(){
      const ctx=this,args=arguments,old=timers.get(slot);
      if(old)clearTimeout(old);
      const id=setTimeout(function(){timers.delete(slot);fn.apply(ctx,args);},Math.max(0,wait||0));
      timers.set(slot,id);
    };
  };
  PWAUX.optimizeLargeList=function(el,threshold){
    if(!el||!el.children)return;
    const n=el.children.length,limit=Number(threshold)||120;
    if(n>=limit){
      el.dataset.pwaLargeList='true';
      el.style.contentVisibility='auto';
      el.style.containIntrinsicSize='320px';
    }else{
      delete el.dataset.pwaLargeList;
      el.style.contentVisibility='';
      el.style.containIntrinsicSize='';
    }
  };
  PWAUX.refreshLargeLists=function(root){
    const scope=root||document;
    scope.querySelectorAll('[data-pwa-large-list-target]').forEach(function(el){PWAUX.optimizeLargeList(el,Number(el.dataset.pwaLargeListThreshold)||120);});
  };
  PWAUX.openDomainTab=function(page,tab){const el=document.querySelector('#'+page+' .cn-tab[data-args*=\"'+tab+'\"]');if(el)el.click();};
  PWAUX.installViewportState=function(){
    if(typeof window==='undefined'||window.__pwaViewportStateInstalled)return;
    window.__pwaViewportStateInstalled=true;
    const root=document.documentElement;
    let viewportFrame=0;
    let viewportTimer=0;
    const update=function(){
      const w=Math.max(0,Math.round(window.innerWidth||root.clientWidth||0));
      const h=Math.max(0,Math.round(window.innerHeight||root.clientHeight||0));
      const vv=window.visualViewport;
      const vh=Math.max(0,Math.round(vv&&vv.height||h));
      const keyboard=!!(h&&vh<h*0.78&&w<900);
      root.style.setProperty('--pwa-vw',w+'px');
      root.style.setProperty('--pwa-vh',vh+'px');
      const body=document.body;
      if(!body)return;
      body.classList.toggle('pwa-landscape',w>h&&w<900);
      body.classList.toggle('pwa-keyboard-open',keyboard);
    };
    // Resize/orientation/keyboard events can burst on mobile WebView. Coalesce
    // them to one visual update per frame instead of repeating style writes.
    const scheduleUpdate=function(){
      if(typeof requestAnimationFrame==='function'){
        if(viewportFrame)return;
        viewportFrame=requestAnimationFrame(function(){viewportFrame=0;update();});
        return;
      }
      if(viewportTimer)return;
      viewportTimer=setTimeout(function(){viewportTimer=0;update();},16);
    };
    window.addEventListener('resize',scheduleUpdate,{passive:true});
    window.addEventListener('orientationchange',scheduleUpdate,{passive:true});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleUpdate,{passive:true});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleUpdate,{once:true});else update();
  };
  PWAUX.resetOverlayGeometry=function(overlay){
    if(!overlay||!overlay.querySelector)return;
    const sheets=overlay.querySelectorAll('.modal,.qs-modal,.calc-modal');
    sheets.forEach(function(sheet){if(!sheet||!sheet.style)return;sheet.style.transform='';sheet.style.transition='';});
  };
  // S1987: reusable modal geometry isolation. Opt-in callers can restore the
  // canonical modal/overlay flow geometry after a specialized mode (e.g. an
  // Edit sheet) has written inline height/overflow/flex values. This helper is
  // deliberately explicit about panel IDs so ordinary modals with intentional
  // inline scroll contracts are never touched.
  PWAUX.restoreReusableModalGeometry=function(overlay,panelIds){
    if(!overlay||!overlay.querySelector)return;
    PWAUX.resetOverlayGeometry(overlay);
    const modal=overlay.querySelector('.modal');
    if(modal&&modal.style){
      ['width','maxWidth','minWidth','height','maxHeight','margin','boxSizing','overflowX','overflowY','display','flexDirection'].forEach(function(k){modal.style[k]='';});
      modal.style.transform='';
      modal.style.transition='';
    }
    if(overlay.style){
      ['position','inset','width','maxWidth','height','left','right','bottom','top','padding','boxSizing'].forEach(function(k){overlay.style[k]='';});
    }
    (Array.isArray(panelIds)?panelIds:[]).forEach(function(id){
      const panel=document.getElementById(id);
      if(!panel||!panel.style)return;
      ['flex','minHeight','overflowY','overflowX'].forEach(function(k){panel.style[k]='';});
    });
  };
  PWAUX.installStatus=function(){
    if(typeof window==='undefined'||window.__pwaUxStatusInstalled)return;
    window.__pwaUxStatusInstalled=true;
    const update=function(){
      const offline=navigator.onLine===false;
      document.querySelectorAll('[data-pwa-status]').forEach(function(el){
        el.textContent=offline?'Offline • data lokal':'Online • tersimpan lokal';
        el.classList.toggle('is-offline',offline);
      });
    };
    window.addEventListener('online',update,{passive:true});
    window.addEventListener('offline',update,{passive:true});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});else update();
  };
  PWAUX.installStorageMonitor=function(){
    if(typeof window==='undefined'||window.__pwaStorageMonitorInstalled)return;
    window.__pwaStorageMonitorInstalled=true;
    let timer=0;
    const id='pwaStorageNotice';
    const render=function(usage,quota){
      if(!document.body||!quota||usage<0)return;
      const pct=Math.round((usage/quota)*100);
      let el=document.getElementById(id);
      if(pct<80){if(el)el.remove();return;}
      if(!el){
        el=document.createElement('div');el.id=id;el.className='pwa-runtime-notice pwa-runtime-notice-storage';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
        document.body.appendChild(el);
      }
      const label=pct>=90?'Penyimpanan hampir penuh':'Penyimpanan mulai penuh';
      el.textContent='⚠️ '+label+' · '+pct+'% terpakai';
      el.dataset.level=pct>=90?'critical':'warn';
    };
    const check=function(){
      if(!navigator.storage||typeof navigator.storage.estimate!=='function')return;
      navigator.storage.estimate().then(function(est){
        if(typeof est.usage==='number'&&typeof est.quota==='number'&&est.quota>0)render(est.usage,est.quota);
      }).catch(function(){ /* storage estimate unavailable; keep the PWA usable without the notice */ });
    };
    const PERIOD=300000;
    const schedule=function(){clearTimeout(timer);timer=setTimeout(check,250);if(timer&&typeof timer.unref==='function')timer.unref();};
    let periodicTimer=null;
    const schedulePeriodic=function(){clearTimeout(periodicTimer);periodicTimer=setTimeout(function(){if(document.visibilityState==='hidden'){schedulePeriodic();return;}check();schedulePeriodic();},PERIOD);if(periodicTimer&&typeof periodicTimer.unref==='function')periodicTimer.unref();};
    const onVisibility=function(){if(document.visibilityState==='visible')schedule();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
    window.addEventListener('focus',schedule,{passive:true});
    window.addEventListener('online',schedule,{passive:true});
    document.addEventListener('visibilitychange',onVisibility,{passive:true});
    schedulePeriodic();
  };
  PWAUX.markRendered=function(root){
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){PWAUX.refreshLargeLists(root);});
    else PWAUX.refreshLargeLists(root);
  };
  // S2641 P0-7: --kb-h = tinggi keyboard layar (visual viewport). Baca-saja; tidak menyentuh update() di atas.
  // Dipakai CSS modal (modern-ui-layer.css) agar sheet + tombol Simpan naik di atas keyboard (mode resizes-visual).
  PWAUX.installKeyboardInset=function(){
    if(typeof window==='undefined'||window.__pwaKbInsetInstalled)return;
    window.__pwaKbInsetInstalled=true;
    const root=document.documentElement;
    let last=0; // bawaan CSS = 0px (fallback var(--kb-h,0px)), jadi tidak menulis selama keyboard tertutup
    // Sinkron: visualViewport resize/scroll sudah selaras frame oleh peramban, dan keluar cepat bila nilai tidak berubah.
    const apply=function(){
      const vv=window.visualViewport;
      let kb=0;
      if(vv&&!(vv.scale>1.01)){
        kb=Math.max(0,Math.round((window.innerHeight||0)-vv.height-(vv.offsetTop||0)));
        if(kb<80)kb=0;
      }
      if(kb===last)return;
      last=kb;
      root.style.setProperty('--kb-h',kb+'px');
    };
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',apply,{passive:true});
      window.visualViewport.addEventListener('scroll',apply,{passive:true});
    }
    apply();
  };
  // S2641 P0-9: lipatan "Status & ringkasan untung" di modal Order tertutup untuk transaksi baru,
  // dibuka otomatis hanya saat mode edit (tombol Hapus tampil). Pembaca saja: hanya mengatur atribut open.
  PWAUX.installOrderStatusFold=function(){
    if(typeof document==='undefined'||window.__pwaOrderFoldInstalled)return;
    const setup=function(){
      const btn=document.getElementById('orderDelBtn');
      const fold=document.getElementById('orderStatusFold');
      if(!btn||!fold||window.__pwaOrderFoldInstalled)return;
      window.__pwaOrderFoldInstalled=true;
      let wasEdit=null;
      const sync=function(){
        const edit=getComputedStyle(btn).display!=='none';
        if(edit===wasEdit)return;
        wasEdit=edit;
        fold.open=edit;
      };
      if(typeof MutationObserver==='function'){
        const overlay=document.getElementById('orderModal');let buttonObserver=null;
        const syncObserver=function(){const open=!!(overlay&&overlay.classList.contains('open'));if(open&&!buttonObserver){buttonObserver=new MutationObserver(sync);buttonObserver.observe(btn,{attributes:true,attributeFilter:['style']});sync();}else if(!open&&buttonObserver){buttonObserver.disconnect();buttonObserver=null;wasEdit=null;fold.open=false;}};
        if(overlay){new MutationObserver(syncObserver).observe(overlay,{attributes:true,attributeFilter:['class']});syncObserver();}else sync();
      }else sync();
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  };
  // S2643 P1-13: bilah "Total" sticky di atas tombol Simpan (Order, PO Multi-Produk). Pembaca saja:
  // menyalin teks sumber lewat MutationObserver pada elemen sumber (bukan pada bilah, jadi tanpa loop).
  // Tombol Simpan asli (saveOrder / savePurchaseOrderBatchFromModal) tidak diganti atau digandakan.
  PWAUX.installStickyTotals=function(){
    if(typeof document==='undefined'||window.__pwaStickyTotalsInstalled)return;
    const specs=[
      {modal:'orderModal',src:'oTotalDisplay',label:function(){return 'Total tagihan';},value:function(t){return t;}},
      {modal:'purchaseOrderBatchModal',src:'pobCartSummary',
        label:function(t){const m=/Total Produk:\s*(\d+)/.exec(t);return m?m[1]+' produk':'Estimasi';},
        value:function(t){const m=/Estimasi Biaya:\s*(.+)$/.exec(t);return m?m[1]:'Rp 0';}}
    ];
    const setup=function(){
      if(window.__pwaStickyTotalsInstalled)return;
      window.__pwaStickyTotalsInstalled=true;
      specs.forEach(function(sp){
        const overlay=document.getElementById(sp.modal),src=document.getElementById(sp.src);
        if(!overlay||!src)return;
        const btn=overlay.querySelector('.modal > .btn.btn-primary.btn-full');
        if(!btn||!btn.parentNode)return;
        const bar=document.createElement('div');
        bar.className='sheet-total-bar sheet-footer';
        bar.setAttribute('aria-live','polite');
        const l=document.createElement('span'),v=document.createElement('b');
        bar.appendChild(l);bar.appendChild(v);
        btn.parentNode.insertBefore(bar,btn);
        const sync=function(){
          const t=(src.textContent||'').replace(/\s+/g,' ').trim();
          l.textContent=sp.label(t);v.textContent=sp.value(t)||'';
          const h=btn.offsetHeight;
          if(h)bar.style.bottom=(h+8)+'px';
        };
        if(typeof MutationObserver==='function'){
          let sourceObserver=null;
          const syncObserver=function(){const open=overlay.classList.contains('open');if(open&&!sourceObserver){sourceObserver=new MutationObserver(sync);sourceObserver.observe(src,{childList:true,characterData:true,subtree:true});sync();}else if(!open&&sourceObserver){sourceObserver.disconnect();sourceObserver=null;}};
          new MutationObserver(syncObserver).observe(overlay,{attributes:true,attributeFilter:['class']});syncObserver();
        }
        sync();
      });
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  };
  // S2645 P0-1..3: read-only hints for linked transaction panels. Does not alter save/SOT paths.
  PWAUX.installTxLinkHints=function(){
    if(typeof document==='undefined'||window.__pwaTxLinkHintsInstalled)return;
    const setup=function(){
      if(window.__pwaTxLinkHintsInstalled)return;
      window.__pwaTxLinkHintsInstalled=true;
      const byId=function(id){return document.getElementById(id);};
      const txModal=byId('txModal');
      const txObserverGroup=window.__pwaTxModalWatchers||(window.__pwaTxModalWatchers={items:[],observer:null,modal:txModal,sync:null});
      if(txModal&&!txObserverGroup.observer){txObserverGroup.modal=txModal;txObserverGroup.sync=function(){const open=txModal.classList.contains('open');txObserverGroup.items.forEach(function(item){if(open&&!item.observer){item.observer=new MutationObserver(item.callback);item.observer.observe(item.target,item.options);item.callback();}else if(!open&&item.observer){item.observer.disconnect();item.observer=null;}});syncWarnings&&syncWarnings();syncAmountHint&&syncAmountHint();};if(typeof MutationObserver==='function'){txObserverGroup.observer=new MutationObserver(txObserverGroup.sync);txObserverGroup.observer.observe(txModal,{attributes:true,attributeFilter:['class']});}}
      const observeTxModalWhileOpen=function(target,callback,options){if(!target||typeof MutationObserver!=='function')return;const item={target:target,callback:callback,options:options,observer:null};txObserverGroup.items.push(item);if(txObserverGroup.sync)txObserverGroup.sync();};
      const cartHasItems=function(kind){
        const list=byId(kind==='stock'?'txShopStockCartList':'txShopSaleCartList');
        // Empty-state wrappers are not products; count only rows carrying the existing remove action.
        const action=kind==='stock'?'removeShopStockCartItem':'removeTxShopSaleCartItem';
        return !!(list&&list.querySelector('[data-action="'+action+'"]'));
      };
      const syncWarnings=function(){
        [['stock','txAddShopStock','txShopStockLinkWarn'],['sale','txAddShopSale','txShopSaleLinkWarn']].forEach(function(row){
          const check=byId(row[1]),warn=byId(row[2]);if(!check||!warn)return;
          warn.hidden=!(check.checked&&!cartHasItems(row[0]));
        });
      };
      let lastTypedAmount=null;
      const amount=byId('txAmt'),hint=byId('txAmtSourceHint');
      const toNumber=function(v){
        const raw=String(v==null?'':v).trim();if(!raw)return 0;
        const n=Number(raw.replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
        return Number.isFinite(n)?n:0;
      };
      const rupiah=function(n){return 'Rp '+Math.round(n).toLocaleString('id-ID');};
      // The amount field is written by the existing cart-total functions; read it rather than
      // duplicating their pricing rules or reaching into another bundle's private cart state.
      const syncAmountHint=function(){
        if(!amount||!hint)return;
        const stockOn=!!(byId('txAddShopStock')&&byId('txAddShopStock').checked);
        const saleOn=!!(byId('txAddShopSale')&&byId('txAddShopSale').checked);
        const hasStock=stockOn&&cartHasItems('stock'),hasSale=saleOn&&cartHasItems('sale');
        const current=toNumber(amount.value),typed=lastTypedAmount;
        if(!(hasStock||hasSale)||!current){hint.hidden=true;hint.textContent='';return;}
        const deleteButton=byId('txDelBtn'),isEdit=!!(deleteButton&&getComputedStyle(deleteButton).display!=='none');
        let text;
        if(typed!==null&&Math.abs(typed-current)<=0.5)text='Nominal diisi manual: '+rupiah(current);
        else if(isEdit&&typed===null)text='Nominal transaksi: '+rupiah(current);
        else text='Dihitung dari daftar produk: '+rupiah(current);
        if(typed!==null&&Math.abs(typed-current)>0.5)text+=' (sebelumnya '+rupiah(typed)+')';
        hint.textContent=text;hint.hidden=false;
      };
      if(amount)amount.addEventListener('input',function(){lastTypedAmount=toNumber(amount.value);syncAmountHint();});
      document.addEventListener('change',function(e){if(e.target&&['txAddShopStock','txAddShopSale','txStockItem','txShopStockItem','txShopSaleItem'].includes(e.target.id)){syncWarnings();syncAmountHint();}});
      document.addEventListener('click',function(e){
        const action=e.target&&e.target.closest?e.target.closest('[data-action]'):null;
        if(action&&['addShopStockCartItem','addTxShopSaleCartItem','removeShopStockCartItem','removeTxShopSaleCartItem'].includes(action.dataset.action))setTimeout(function(){syncWarnings();syncAmountHint();},0);
        if(action&&action.dataset.action==='closeModal'&&action.dataset.args&&action.dataset.args.indexOf('renovProjectModal')>=0)setTimeout(function(){
          const projectModal=byId('renovProjectModal');
          if(projectModal&&projectModal.classList.contains('open') )return;
          if(typeof populateTxRenovSelect==='function')populateTxRenovSelect();
          syncRenovCreateButton();
        },50);
      });
      const syncRenovCreateButton=function(){
        const select=byId('txRenovProject'),button=byId('txRenovCreateProjectBtn');
        if(!select||!button)return;
        button.hidden=!(select.disabled||select.options.length<=1||!Array.from(select.options).some(function(o){return o.value&&!o.disabled;}));
      };
      window.__pwaSyncRenovCreateButton=syncRenovCreateButton;
      const renovSelect=byId('txRenovProject');
      if(renovSelect)observeTxModalWhileOpen(renovSelect,syncRenovCreateButton,{childList:true,attributes:true,attributeFilter:['disabled']});
      if(renovSelect)renovSelect.addEventListener('change',syncRenovCreateButton);
      // Explicit action is intentionally isolated from transaction-save handlers.
      window.txRenovCreateProject=function(){
        const load=typeof ensureRenov==='function'?ensureRenov():Promise.reject(new Error('Modul Renovasi belum tersedia'));
        return Promise.resolve(load).then(function(){
          if(!window.Renov||typeof window.Renov.openProjectModal!=='function')throw new Error('Form proyek Renovasi belum tersedia');
          window.Renov.openProjectModal();
        }).catch(function(err){if(typeof toast==='function')toast('Tidak bisa membuka proyek Renovasi: '+(err&&err.message?err.message:'coba lagi'),4500);});
      };
      syncWarnings();syncAmountHint();syncRenovCreateButton();
      ['txShopStockCartList','txShopSaleCartList','txShopStockFields','txShopSaleFields'].forEach(function(id){const el=byId(id);if(el)observeTxModalWhileOpen(el,function(){syncWarnings();syncAmountHint();},{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});});
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  };
  // S2646 P1-14..17 + P1-20: presentation-only Order/PO decorators.
  // Keeps the original select values, data-action handlers, presenter state and save paths intact.
  PWAUX.installOrderPoPresentation=function(){
    if(typeof document==='undefined'||window.__pwaOrderPoPresentationInstalled)return;
    const setup=function(){
      if(window.__pwaOrderPoPresentationInstalled)return;
      const byId=function(id){return document.getElementById(id);};
      // The modal registry may append its HTML late during boot. Wait for both source modals
      // rather than permanently marking the decorator installed against an empty document.
      if(!byId('orderModal')||!byId('purchaseOrderBatchModal')){
        if(document.body&&typeof MutationObserver==='function'&&!window.__pwaOrderPoWaitObserver){
          window.__pwaOrderPoWaitObserver=new MutationObserver(function(){if(byId('orderModal')&&byId('purchaseOrderBatchModal')){window.__pwaOrderPoWaitObserver.disconnect();window.__pwaOrderPoWaitObserver=null;setup();}});
          window.__pwaOrderPoWaitObserver.observe(document.body,{childList:true,subtree:true});
        }
        return;
      }
      window.__pwaOrderPoPresentationInstalled=true;
      const make=function(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
      const money=function(v){const n=Number(v);return 'Rp '+Math.round(Number.isFinite(n)?n:0).toLocaleString('id-ID');};
      const num=function(v){const n=Number(String(v==null?'':v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
      const products=function(){return typeof D!=='undefined'&&Array.isArray(D.products)?D.products:[];};
      // Keep subtree observers detached while a modal is closed; one lightweight class observer per modal
      // reconnects the needed observers on open and disconnects them on close.
      const modalWatchers=window.__pwaOrderPoModalWatchers||(window.__pwaOrderPoModalWatchers={});
      const observeWhileOpen=function(modalId,target,callback,options){
        if(!target||typeof MutationObserver!=='function')return null;
        let group=modalWatchers[modalId];
        if(!group){const modal=byId(modalId);if(!modal)return null;group=modalWatchers[modalId]={modal:modal,items:[],stateObserver:null};group.sync=function(){const open=group.modal.classList.contains('open');group.items.forEach(function(item){if(open&&!item.observer){item.observer=new MutationObserver(item.callback);item.observer.observe(item.target,item.options);item.callback();}else if(!open&&item.observer){item.observer.disconnect();item.observer=null;}});};group.stateObserver=new MutationObserver(group.sync);group.stateObserver.observe(modal,{attributes:true,attributeFilter:['class']});}
        const item={target:target,callback:callback,options:options,observer:null};group.items.push(item);group.sync();return item;
      };
      const productById=function(id){return products().find(function(p){return p&&String(p.id)===String(id);})||null;};
      const stockOf=function(p){return num(p&&(p.stock!=null?p.stock:p.stok));};
      const priceOf=function(p){const sel=byId('oPriceType');return num(p&&(sel&&sel.value==='reseller'?(p.hargaReseller||p.hargaJual):p.hargaJual));};

      // Order: keep the native select in DOM as the canonical value source, visually hide only.
      const orderSelect=byId('oProductSelect');
      ['oPriceType','oAcc','oProductSelect'].forEach(function(id){const el=byId(id);if(el)el.style.fontSize='16px';});
      const poSupplierInput=byId('pobSupplier');if(poSupplierInput){poSupplierInput.setAttribute('enterkeyhint','done');poSupplierInput.setAttribute('autocapitalize','words');poSupplierInput.setAttribute('autocomplete','off');}
      const excelFileInput=byId('importShopExcelFile');if(excelFileInput)excelFileInput.style.fontSize='16px';
      if(orderSelect){
        const fg=orderSelect.closest('.fg');
        if(fg&&!byId('orderProductSearch')){
          const label=fg.querySelector('label');
          const search=make('input','fi sheet-product-search');search.type='search';search.id='orderProductSearch';search.placeholder='Cari nama produk…';search.setAttribute('aria-label','Cari produk untuk Order');search.autocomplete='off';
          const results=make('div','sheet-product-results');results.id='orderProductSearchResults';results.setAttribute('aria-live','polite');
          if(label)label.insertAdjacentElement('afterend',search);else fg.insertBefore(search,orderSelect);
          fg.insertBefore(results,orderSelect);
          orderSelect.classList.add('sheet-source-select');
          const render=function(){
            const q=String(search.value||'').trim().toLocaleLowerCase('id');results.replaceChildren();
            if(!q){results.appendChild(make('div','u-hint10','Ketik nama produk untuk mencari.'));return;}
            const opts=Array.from(orderSelect.options||[]).filter(function(o){return o.value&&String(o.textContent||'').toLocaleLowerCase('id').includes(q);}).slice(0,20);
            if(!opts.length){results.appendChild(make('div','u-hint10','Produk tidak ditemukan.'));return;}
            opts.forEach(function(o){const prod=productById(o.value);const btn=make('button','sheet-product-result');btn.type='button';btn.setAttribute('data-product-id',o.value);btn.appendChild(make('span','sheet-product-name',o.textContent.trim()));btn.appendChild(make('span','sheet-product-meta','Stok '+stockOf(prod)+' · '+money(priceOf(prod))));results.appendChild(btn);});
          };
          search.addEventListener('input',render);
          results.addEventListener('click',function(e){const btn=e.target.closest('[data-product-id]');if(!btn)return;orderSelect.value=btn.getAttribute('data-product-id');const add=document.querySelector('#orderModal [data-action="addOrderItem"]');if(add)add.click();search.value='';render();});
          observeWhileOpen('orderModal',orderSelect,render,{childList:true,subtree:true,characterData:true});
          const priceType=byId('oPriceType');if(priceType)priceType.addEventListener('change',render);
          render();
        }
      }

      // Order: compact but readable cart rows and row subtotals, derived only from visible row values.
      const list=byId('orderItemList');if(list)list.classList.add('sheet-section');
      if(list){
        const decorateRows=function(){
          list.querySelectorAll('.tx-item').forEach(function(row){
            const input=row.querySelector('input[type="number"]');
            const meta=row.querySelector('.tx-meta');
            const name=(row.querySelector('.tx-name')||{}).textContent||'produk';
            if(input){input.style.minHeight='40px';input.style.width='104px';input.style.fontSize='16px';input.setAttribute('aria-label','Harga satuan '+name.trim());}
            row.querySelectorAll('[data-action="changeOrderQty"]').forEach(function(btn){btn.style.minWidth='40px';btn.style.minHeight='40px';});
            const qtyMatch=meta&&String(meta.textContent||'').match(/x\s*(\d+)/i);
            const qty=qtyMatch?Number(qtyMatch[1]):Number((row.querySelector('.u-flex.u-aic.u-gap6 span')||{}).textContent)||1;
            if(!input||!meta)return;
            let sub=row.querySelector('.sheet-row-subtotal');if(!sub){sub=make('div','sheet-row-subtotal kv-row');meta.insertAdjacentElement('afterend',sub);}else sub.classList.add('kv-row');
            const subtotalText=qty+' × '+money(num(input.value))+' = '+money(num(input.value)*qty);
             // Avoid self-triggering MutationObserver loops on unchanged subtotal text.
             if(sub.textContent!==subtotalText)sub.textContent=subtotalText;
          });
        };
        observeWhileOpen('orderModal',list,decorateRows,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['value']});
        list.addEventListener('input',function(e){if(e.target.matches('input[type="number"]'))decorateRows();});
        decorateRows();
      }
      // Order: preview the three money fields without rewriting their values.
      ['oDiskon','oOngkir','oDP'].forEach(function(id){const input=byId(id);if(!input)return;let preview=byId(id+'Preview');if(!preview){preview=make('div','sheet-money-preview');preview.id=id+'Preview';input.insertAdjacentElement('afterend',preview);}const sync=function(){preview.textContent=input.value.trim()?'Pratinjau: '+money(num(input.value)):' ';};input.addEventListener('input',sync);input.addEventListener('change',sync);sync();});

      // Order: group existing controls without renaming IDs or changing data-action attributes.
      const modal=byId('orderModal');if(modal){const statusHeadings=Array.from(modal.querySelectorAll('#orderStatusFold .sheet-fold-body > div'));if(statusHeadings[0]&&statusHeadings[0].textContent.trim()==='Business Status')statusHeadings[0].textContent='Status pesanan';if(statusHeadings[2]&&statusHeadings[2].textContent.trim()==='Profit Summary')statusHeadings[2].textContent='Ringkasan untung';}
      if(modal&&!modal.querySelector('#orderCustomerFold')){
        const heading=Array.from(modal.children).find(function(n){return n.tagName==='DIV'&&/Info Konsumen/.test(n.textContent||'');});
        const name=byId('oCustName'),phone=byId('oCustPhone'),addr=byId('oCustAddr'),hint=byId('oCustHint'),delivered=byId('oDelivered');
        const customerNodes=[];[name,phone,addr].forEach(function(n){if(n&&n.closest('.fg'))customerNodes.push(n.closest('.fg'));});if(hint)customerNodes.push(hint);if(delivered&&delivered.closest('.setting-item'))customerNodes.push(delivered.closest('.setting-item'));
        // Only move explicitly identified customer fields. Never move a broad
         // heading match: it can be a wrapper containing the entire modal.
         const first=customerNodes[0];
         if(first&&customerNodes.length){const fold=make('details','sheet-fold hint-fold');fold.id='orderCustomerFold';const summary=make('summary','','ⓘ Pelanggan (opsional)');fold.appendChild(summary);if(first.parentNode)first.parentNode.insertBefore(fold,first);customerNodes.forEach(function(n){if(n&&!fold.contains(n))fold.appendChild(n);});}
        const note=byId('oNote'),discount=byId('oDiskon'),dp=byId('oDP'),acc=byId('oAcc');
        const discountGroup=discount&&discount.closest('.u-grid2');
        const payAnchor=discountGroup||dp&&dp.closest('.fg')||acc&&acc.closest('.fg');
        if(payAnchor&&modal.contains(payAnchor)){
          const section=make('section','sheet-section');section.id='orderPaymentSection';section.appendChild(make('div','sheet-section-title','Pembayaran'));
          payAnchor.parentNode.insertBefore(section,payAnchor);
          if(discountGroup)section.appendChild(discountGroup);
          if(dp&&dp.closest('.fg'))section.appendChild(dp.closest('.fg'));
          if(acc&&acc.closest('.fg'))section.appendChild(acc.closest('.fg'));
          if(note&&note.closest('.fg')){const noteGroup=note.closest('.fg');section.parentNode.insertBefore(noteGroup,section);}
        }
        const dpField=dp&&dp.closest('.fg');const dpHint=dpField&&Array.from(dpField.children).find(function(n){return n.tagName==='DIV'&&/Kalau diisi lebih kecil/.test(n.textContent||'');});
        if(dpHint&&!dpHint.closest('.hint-fold')){const fold=make('details','hint-fold');fold.appendChild(make('summary','','ⓘ Tentang DP'));fold.appendChild(dpHint);dpField.appendChild(fold);}
      }

      // PO: searchable chip filtering, stock/restock badges, supplier suggestions, and accessible remove targets.
      const pobCartForSection=byId('pobCartList');if(pobCartForSection)pobCartForSection.classList.add('sheet-section');
      const pobList=byId('pobProductList'),supplier=byId('pobSupplier');
      if(pobList){
        const parent=pobList.parentElement;
        if(parent&&!byId('pobProductSearch')){const label=parent.querySelector('label');const search=make('input','fi sheet-product-search');search.type='search';search.id='pobProductSearch';search.placeholder='Cari produk…';search.setAttribute('aria-label','Cari produk untuk PO');search.autocomplete='off';if(label)label.insertAdjacentElement('afterend',search);else parent.insertBefore(search,pobList);}
        const decorate=function(){
          const q=String((byId('pobProductSearch')||{}).value||'').trim().toLocaleLowerCase('id');
          let restockIds=new Set();try{const r=typeof BusinessFlowPresenter!=='undefined'&&BusinessFlowPresenter.restockCandidatesForBatch();if(Array.isArray(r))r.forEach(function(x){if(x&&x.productId!=null)restockIds.add(String(x.productId));});}catch(_e){if(typeof console!=='undefined'&&console.warn)console.warn('PWAUX helper parse failed',_e);}
          pobList.querySelectorAll('button[data-action="BusinessFlowPresenter.tapPurchaseOrderBatchChip"]').forEach(function(btn){
            const args=btn.getAttribute('data-args')||'';let id='';try{id=JSON.parse(args)[0];}catch(_e){if(typeof console!=='undefined'&&console.warn)console.warn('PWAUX helper parse failed',_e);}
            const prod=productById(id);const title=String((prod&&prod.name)||btn.textContent||'');btn.hidden=!!q&&!title.toLocaleLowerCase('id').includes(q);
            if(!btn.querySelector('.pob-chip-meta')){const meta=make('span','pob-chip-meta kv-row');meta.textContent='Stok '+stockOf(prod)+(restockIds.has(String(id))?' · Perlu restock':'');btn.appendChild(meta);}
          });
          const empty=pobList.querySelector('.pob-search-empty');const any=Array.from(pobList.querySelectorAll('button[data-action="BusinessFlowPresenter.tapPurchaseOrderBatchChip"]')).some(function(b){return !b.hidden;});
          if(q&&!any&&!empty)pobList.appendChild(make('div','u-hint10 pob-search-empty','Produk tidak ditemukan.'));else if((!q||any)&&empty)empty.remove();
          pobList.querySelectorAll('button[data-action="BusinessFlowPresenter.tapPurchaseOrderBatchChip"]').forEach(function(b){if(!b.querySelector('.pob-chip-meta'))return;});
        };
        observeWhileOpen('purchaseOrderBatchModal',pobList,decorate,{childList:true,subtree:true});
        const search=byId('pobProductSearch');if(search)search.addEventListener('input',decorate);
        decorate();
      }
      if(supplier){
        supplier.setAttribute('list','pobSupplierList');let dl=byId('pobSupplierList');if(!dl){dl=make('datalist');dl.id='pobSupplierList';supplier.insertAdjacentElement('afterend',dl);}const syncSuppliers=function(){const names=typeof D!=='undefined'&&Array.isArray(D.produsen)?D.produsen:[];const old=Array.from(dl.options||[]).map(function(o){return o.value;}).join('\n');const next=names.map(function(p){return String(p&&p.name||'').trim();}).filter(Boolean);if(old!==next.join('\n')){dl.replaceChildren();next.forEach(function(n){const o=make('option');o.value=n;dl.appendChild(o);});}};syncSuppliers();}
      const po=byId('purchaseOrderBatchModal');
      if(po){const label=Array.from(po.querySelectorAll('label')).find(function(n){return /Produk \(ketuk chip/.test(n.textContent||'');});if(label)label.textContent='Produk — ketuk untuk menambah 1 pcs';const intro=po.querySelector('.u-hint12');if(intro&&!intro.closest('.hint-fold')){const fold=make('details','hint-fold');fold.appendChild(make('summary','','ⓘ Tentang PO'));fold.appendChild(intro.cloneNode(true));intro.replaceWith(fold);}po.querySelectorAll('#pobCartList [data-action="BusinessFlowPresenter.removePurchaseOrderBatchCartItem"]').forEach(function(btn){btn.style.minWidth='40px';btn.style.minHeight='40px';});}
      const poCart=byId('pobCartList');if(poCart)observeWhileOpen('purchaseOrderBatchModal',poCart,function(){poCart.querySelectorAll('[data-action="BusinessFlowPresenter.removePurchaseOrderBatchCartItem"]').forEach(function(btn){btn.style.minWidth='40px';btn.style.minHeight='40px';});},{childList:true,subtree:true});
      // P1-1: fold existing-part scan controls so new-part entry does not dominate the form.
      const stockPanel=byId('txStockPanel'),stockSelect=byId('txStockItem');
      if(stockPanel&&stockSelect){
        const scanRow=Array.from(stockPanel.querySelectorAll('button[data-action="txStockScanPart"],button[data-action="txStockScanPartGallery"]'));
        let stockFold=byId('txStockExistingFold');
        if(scanRow.length&&!stockFold){const row=scanRow[0].parentElement;stockFold=make('details','tx-stock-existing');stockFold.id='txStockExistingFold';stockFold.appendChild(make('summary','','Cari part yang sudah ada'));if(row)stockFold.appendChild(row);const field=stockSelect.closest('.fg');if(field)field.parentNode.insertBefore(stockFold,field);}
        if(stockFold){Array.from(stockPanel.querySelectorAll('label,div,span')).filter(function(el){return /Filter Kategori|Filter Komponen|Hanya tampilkan stok tersedia/i.test(String(el.textContent||''));}).forEach(function(el){const wrap=el.closest('.fg,.setting-item')||el;if(!stockFold.contains(wrap))stockFold.appendChild(wrap);});}
        const syncStockMode=function(){const mode=stockSelect.value==='__new__'?'new':'existing';stockPanel.setAttribute('data-mode',mode);};stockSelect.addEventListener('change',syncStockMode);syncStockMode();
      }

      // P1-7: move odometer before the service-category chips and make the chips horizontally scrollable.
      const serviceModal=byId('servisModal'),serviceKm=byId('servisKm'),serviceCategories=byId('servisServiceCategoryPanel');
      if(serviceModal&&serviceKm&&serviceCategories){const kmField=serviceKm.closest('.fg');if(kmField&&kmField.parentNode===serviceCategories.parentNode&&serviceCategories.previousElementSibling!==kmField)serviceCategories.parentNode.insertBefore(kmField,serviceCategories);serviceKm.setAttribute('aria-label','Odometer kendaraan dalam kilometer');const chips=byId('servisMasterCategoryChips');if(chips)chips.classList.add('servis-category-chip-strip');}

      // P1-8: keep transaction search visible; put the less-used filters and long intro in folds.
      const linkModal=byId('linkTxModal'),linkBox=byId('linkTxFilterBox');
      if(linkModal&&linkBox&&!byId('linkTxFiltersFold')){
        const search=byId('linkTxSearch'),searchField=search&&search.closest('.fg');
        const desc=byId('linkTxModalDesc'),kat=byId('linkTxKat'),sub=byId('linkTxSub'),from=byId('linkTxDari'),to=byId('linkTxSampai'),account=byId('linkTxAkun');
        const rowOne=kat&&kat.closest('.fg')&&kat.closest('.fg').parentElement,rowTwo=from&&from.closest('.fg')&&from.closest('.fg').parentElement,accountField=account&&account.closest('.fg');
        const anchor=rowOne||desc||searchField;
        if(anchor&&anchor.parentNode){const fold=make('details','sheet-fold hint-fold');fold.id='linkTxFiltersFold';const summary=make('summary','','Filter (0)');fold.appendChild(summary);anchor.parentNode.insertBefore(fold,anchor);
          if(desc){const help=make('details','hint-fold');help.appendChild(make('summary','','ⓘ Petunjuk pengaitan'));const copy=desc.cloneNode(true);help.appendChild(copy);fold.appendChild(help);desc.remove();}
          [rowOne,rowTwo,accountField].forEach(function(n){if(n&&!fold.contains(n))fold.appendChild(n);});
          if(searchField&&searchField.parentNode===linkBox)linkBox.insertBefore(searchField,fold);
          const syncFilterCount=function(){const active=[kat,sub,from,to,account].filter(function(el){return el&&String(el.value||'').trim()&&String(el.value)!=='semua';}).length;summary.textContent='Filter ('+active+')';};
          [kat,sub,from,to,account].forEach(function(el){if(el){el.addEventListener('change',syncFilterCount);el.addEventListener('input',syncFilterCount);}});syncFilterCount();
        }
      }

      // P1-2: decorate Renovasi cards from existing D.renovProjects only; never write back to SOT.
      const renovationProjects=function(){return typeof D!=='undefined'&&Array.isArray(D.renovProjects)?D.renovProjects:[];};
      const renovationMoney=function(v){return 'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');};
      const projectForNode=function(node){const list=renovationProjects();const candidates=[];if(node){[node].concat(Array.from(node.querySelectorAll('[data-args]'))).forEach(function(el){const raw=el.getAttribute&&el.getAttribute('data-args');if(!raw)return;try{const args=JSON.parse(raw);if(Array.isArray(args))args.forEach(function(v){if(v!=null)candidates.push(String(v));});}catch(_e){if(typeof console!=='undefined'&&console.warn)console.warn('PWAUX helper parse failed',_e);}});}return list.find(function(project){return project&&candidates.includes(String(project.id));})||list.find(function(project){return project&&project.name&&String(node&&node.textContent||'').includes(String(project.name));})||null;};
      const decorateRenovation=function(){
        const list=byId('renovList');
        if(list){Array.from(list.children).forEach(function(card){if(card.classList.contains('empty'))return;const project=projectForNode(card);if(!project)return;const items=Array.isArray(project.items)?project.items:[];const unpaid=items.filter(function(item){return item&&!item.paid;});const remaining=unpaid.reduce(function(sum,item){return sum+Math.max(0,Number(item.hargaTotal!=null?item.hargaTotal:item.harga)||0);},0);let summary=card.querySelector('.sheet-renov-project-summary');if(!summary){summary=make('div','sheet-renov-project-summary');summary.setAttribute('data-renov-summary-for',String(project.id));const title=card.querySelector('.card-title,[data-project-title]');if(title)title.insertAdjacentElement('afterend',summary);else card.insertBefore(summary,card.firstChild);}const summaryText='Sisa '+renovationMoney(remaining)+' · '+unpaid.length+' item belum dibeli';summary.classList.add('kv-row');summary.setAttribute('data-summary-state',String(remaining)+'|'+String(unpaid.length));if(summary.getAttribute('data-summary-rendered')!==summary.getAttribute('data-summary-state')){summary.replaceChildren(make('span','', 'Sisa '+renovationMoney(remaining)),make('span','', ' · '+unpaid.length+' item belum dibeli'));summary.setAttribute('data-summary-rendered',summary.getAttribute('data-summary-state'));}
          const deleteBtn=Array.from(card.querySelectorAll('button,[role="button"]')).find(function(btn){return /Renov\.deleteProject/.test(btn.getAttribute('data-action')||'')||/Hapus Proyek Ini/i.test(btn.textContent||'');});if(deleteBtn&&!deleteBtn.closest('.renov-overflow-menu')){const parent=deleteBtn.parentElement;if(parent){const menu=make('details','renov-overflow-menu');menu.appendChild(make('summary','','⋯'));parent.insertBefore(menu,deleteBtn);menu.appendChild(deleteBtn);deleteBtn.classList.add('renov-menu-delete');}}
        });}
        const detail=byId('renovDetailModal'),itemList=byId('renovItemList');
        if(detail){const detDelete=detail.querySelector('[data-action="renovDeleteProjectCur"]');const detHead=detail.querySelector('.modal-title > span:last-child');if(detDelete&&detHead&&!detDelete.closest('.renov-overflow-menu')){const detMenu=make('details','renov-overflow-menu');detMenu.appendChild(make('summary','','⋯'));detMenu.querySelector('summary').setAttribute('aria-label','Menu proyek');detHead.insertBefore(detMenu,detHead.lastElementChild);detMenu.appendChild(detDelete);detDelete.classList.add('renov-menu-delete');}}
        if(detail&&itemList){const current=typeof Renov!=='undefined'&&Renov.curId!=null?String(Renov.curId):'';const project=renovationProjects().find(function(p){return p&&String(p.id)===current;})||projectForNode(detail);const items=Array.isArray(project&&project.items)?project.items:[];let rows=Array.from(itemList.querySelectorAll('.tx-item,[data-renov-item-id],.renov-item-row'));if(!rows.length)rows=Array.from(itemList.children).filter(function(row){return !row.classList.contains('empty')&&!/^(Total|Sisa|Belum ada item)/i.test(String(row.textContent||'').trim());});
          rows.forEach(function(row,index){const rowId=row.getAttribute('data-renov-item-id');const item=rowId?items.find(function(i){return i&&String(i.id)===String(rowId);}):items[index];if(!item)return;if(item.paid){row.classList.add('renov-paid-item');let chip=row.querySelector('.renov-paid-chip');if(!chip){chip=make('span','renov-paid-chip','Lunas');const date=item.paidDate||item.tglBayar||'';if(date)chip.textContent='Lunas · '+String(date);const name=row.querySelector('.tx-name')||row.firstElementChild;if(name)name.insertAdjacentElement('afterend',chip);else row.appendChild(chip);}}
            const category=String(item.category||'').trim();const sameAll=items.length>0&&items.every(function(i){return i&&String(i.category||'').trim()===category;});if(category&&(category===String(project&&project.name||'').trim()||sameAll)){row.querySelectorAll('.chip,.chip-btn,.tag,.badge,[class*="cat-chip"],[class*="category-chip"]').forEach(function(chip){if(String(chip.textContent||'').trim()===category)chip.hidden=true;});}
          });
        }
      };
      const renovList=byId('renovList'),renovItems=byId('renovItemList');
      if(renovList&&typeof MutationObserver==='function'){new MutationObserver(decorateRenovation).observe(renovList,{childList:true,subtree:true});decorateRenovation();}
      if(renovItems)observeWhileOpen('renovDetailModal',renovItems,decorateRenovation,{childList:true,subtree:true});
      const renovIntro=byId('keuRenovCard-cbody')&&byId('keuRenovCard-cbody').querySelector(':scope > .u-hint10');
      if(renovIntro&&!renovIntro.closest('.hint-fold')){const fold=make('details','hint-fold');fold.appendChild(make('summary','','ⓘ Tentang proyek renovasi'));fold.appendChild(renovIntro.cloneNode(true));renovIntro.replaceWith(fold);}

      // P1-5: normalize the presentation shell for all linked transaction panels; inner state/actions remain intact.
      ['txStockPanel','txServisPanel','txBbmPanel','txRenovPanel','txShopStockPanel','txShopSalePanel'].forEach(function(id){const panel=byId(id);if(!panel)return;panel.classList.add('sheet-linked-panel');const body=panel.firstElementChild;if(body)body.classList.add('sheet-linked-panel-body');const toggle=panel.querySelector('label > input[type="checkbox"]');if(toggle){const label=toggle.closest('label');if(label)label.classList.add('sheet-linked-panel-heading');}});
      // P1-9: recommend the existing Renovasi category as guidance only; do not set the select value.
      const renovCategory=byId('renovItemCat');
      if(renovCategory&&!byId('renovItemCategoryHint')){const hint=make('div','sheet-money-preview','Untuk item proyek renovasi, kategori yang disarankan adalah “Renovasi” jika tersedia.');hint.id='renovItemCategoryHint';renovCategory.insertAdjacentElement('afterend',hint);}

      // P1-10: collapse long forms into semantic sections while keeping every original field in its modal.
      const directChild=function(owner,el){if(!owner||!el)return null;while(el.parentElement&&el.parentElement!==owner)el=el.parentElement;return el.parentElement===owner?el:null;};
      const groupDirectFields=function(owner,foldId,summaryText,ids,open){
        if(!owner||byId(foldId))return;
        const nodes=[];ids.forEach(function(id){const el=byId(id);const n=directChild(owner,el);if(n&&n!==owner&&!nodes.includes(n))nodes.push(n);});
        if(!nodes.length)return;const fold=make('details','sheet-fold modal-section-fold');fold.id=foldId;if(open)fold.open=true;fold.appendChild(make('summary','',summaryText));
        const first=nodes[0];first.parentNode.insertBefore(fold,first);nodes.forEach(function(n){fold.appendChild(n);});
      };
      const vehicleModal=byId('vehicleModal');
      if(vehicleModal){groupDirectFields(vehicleModal,'vehicleIdentityFold','Identitas kendaraan',['vehName','vehEmoji','vehJenis','vehJenisFieldsWrap','vehMaintenanceTemplateWrap','vehKmAwalWrap'],true);groupDirectFields(vehicleModal,'vehicleOwnershipFold','Kepemilikan & aset terkait',['vehOwnership','vehAssetId','vehNilaiWrap'],false);}
      const productModal=byId('productModal');
      if(productModal){groupDirectFields(productModal,'productIdentityFold','Identitas & stok',['pName','pStock','pKategori','pProdusen'],true);const priceToggle=productModal.querySelector('[data-action="PriceReko.toggle"]');const priceToggleGroup=priceToggle&&priceToggle.closest('.fg');const priceIds=['pBeli','pReseller','pDiskon','pBeratPerUnit','pPanjang','pAccWrap'];let priceNodes=[];priceIds.forEach(function(id){const n=directChild(productModal,byId(id));if(n&&!priceNodes.includes(n))priceNodes.push(n);});[priceToggleGroup,byId('priceRekoPanel')].forEach(function(el){const n=directChild(productModal,el);if(n&&!priceNodes.includes(n))priceNodes.push(n);});if(priceNodes.length&&!byId('productPriceFold')){priceNodes=priceNodes.filter(function(n){return n!==productModal&&!n.contains(productModal)&&!n.classList.contains('modal')&&!n.querySelector('.modal');});priceNodes.sort(function(a,b){return Array.prototype.indexOf.call(a.parentNode.children,a)-Array.prototype.indexOf.call(b.parentNode.children,b);});if(priceNodes.length){const parent=priceNodes[0].parentNode;const fold=make('details','sheet-fold modal-section-fold');fold.id='productPriceFold';fold.appendChild(make('summary','','Harga & biaya tambahan'));parent.insertBefore(fold,priceNodes[0]);priceNodes.forEach(function(n){if(n!==fold&&!n.contains(fold))fold.appendChild(n);});}}}
      const taxModal=byId('vehTaxModal');
      if(taxModal&&!byId('vehTaxAnnualFold')){
        const headings=Array.from(taxModal.children).filter(function(n){return n.tagName==='DIV'&&/(STNK Tahunan|Ganti Plat|Uji Kelayakan)/.test(String(n.textContent||'').trim());});
        headings.map(function(header,index){return{header:header,index:index};}).reverse().forEach(function(entry){const header=entry.header,index=entry.index;const fold=make('details','sheet-fold modal-section-fold');fold.id=['vehTaxAnnualFold','vehTaxPlateFold','vehTaxInspectionFold'][index]||('vehTaxSectionFold'+index);if(index===0)fold.open=true;fold.appendChild(make('summary','',String(header.textContent||'').trim()));header.parentNode.insertBefore(fold,header);let node=header;const nextHeader=headings[index+1]||null;while(node&&node!==nextHeader&&node!==(nextHeader&&nextHeader.previousElementSibling)&&node!==taxModal.querySelector('[data-action="saveVehTax"]')){const next=node.nextSibling;fold.appendChild(node);node=next;}});
      }

      // P1-3: align Shop settings and compose the hero + four KPI cards as a compact strip.
      const shopPage=byId('page-shop'),shopSettings=shopPage&&shopPage.querySelector('.page-settings-btn'),shopQuickSettings=shopPage&&shopPage.querySelector('.pwa-domain-shop > .qs-btn');
      if(shopSettings&&shopQuickSettings&&!shopSettings.contains(shopQuickSettings))shopSettings.appendChild(shopQuickSettings);
      const shopHero=shopPage&&shopPage.querySelector('.pwa-domain-hero'),shopKpis=shopPage&&shopPage.querySelector('.pwa-domain-kpis'),shopStock=byId('shopModalStokCard');
      if(shopPage&&shopHero&&shopKpis&&shopStock&&!byId('shopKpiStrip')){const strip=make('section','shop-kpi-strip');strip.id='shopKpiStrip';shopHero.parentNode.insertBefore(strip,shopHero);strip.appendChild(shopHero);strip.appendChild(shopKpis);shopKpis.appendChild(shopStock);}
      const shopCrumb=byId('shopBreadcrumbSub');if(shopCrumb){const syncCrumb=function(){const wrap=shopCrumb.closest('.page-breadcrumb');if(wrap)wrap.hidden=String(shopCrumb.textContent||'').trim()==='Kasir AI';};if(typeof MutationObserver==='function')new MutationObserver(syncCrumb).observe(shopCrumb,{childList:true,characterData:true,subtree:true});syncCrumb();}
      const kasirTitle=shopPage&&shopPage.querySelector('#shopTab-kasir .pwa-workspace-head h2');if(kasirTitle&&kasirTitle.textContent.trim()==='Kasir AI')kasirTitle.textContent='Transaksi';

      // P1-4: the large add-vehicle hero is for the first-run empty state only.
      const carPage=byId('page-carnotes'),carHeroAdd=carPage&&carPage.querySelector('.pwa-domain-hero-actions [data-action="openVehicleModal"]'),carSummary=carPage&&carPage.querySelector('.cn-vehicle-summary-head'),carManage=carSummary&&carSummary.querySelector('.cn-summary-link'),vehicleSelect=byId('vehicleSelect'),curKm=byId('cnCurKm');
      const syncCarFirstRun=function(){const vehicles=typeof D!=='undefined'&&Array.isArray(D.vehicles)?D.vehicles:[];const empty=vehicles.length===0;if(carHeroAdd)carHeroAdd.hidden=!empty;if(carManage){if(empty){carManage.hidden=true;}else{carManage.hidden=false;carManage.textContent='＋';carManage.setAttribute('aria-label','Tambah kendaraan');carManage.title='Tambah kendaraan';}}};
      if(carPage){syncCarFirstRun();if(vehicleSelect&&typeof MutationObserver==='function')new MutationObserver(syncCarFirstRun).observe(vehicleSelect,{childList:true,subtree:true});}
      if(curKm){const syncKmHint=function(){const zero=/^\s*0(?:[.,]0+)?\s*(?:km)?\s*$/i.test(String(curKm.textContent||''));let link=byId('cnKmInitialLink');if(zero&&typeof D!=='undefined'&&Array.isArray(D.vehicles)&&D.vehicles.length){if(!link){link=make('button','cn-km-initial-link','Isi KM awal');link.type='button';link.id='cnKmInitialLink';link.setAttribute('data-action','openKmModal');link.setAttribute('aria-label','Isi kilometer awal kendaraan');curKm.insertAdjacentElement('afterend',link);}curKm.hidden=true;link.hidden=false;}else{curKm.hidden=false;if(link)link.hidden=true;}};if(typeof MutationObserver==='function'){new MutationObserver(syncKmHint).observe(curKm,{childList:true,characterData:true,subtree:true});if(vehicleSelect)new MutationObserver(syncKmHint).observe(vehicleSelect,{childList:true,subtree:true});}syncKmHint();}
      const bbmHeading=carPage&&carPage.querySelector('#cnTab-bbm .pwa-workspace-head h2');if(bbmHeading&&bbmHeading.textContent.trim()==='BBM')bbmHeading.textContent='Isi Bahan Bakar';
      // Move period chips into the BBM Ringkasan sub-tab, and into Servis when Servis is active.
      const periodWrap=byId('cnPeriodeWrap'),bbmTab=byId('cnTab-bbm'),servisTab=byId('cnTab-servis'),bbmSummary=byId('cnbTab-ringkasan');
      if(periodWrap&&bbmTab&&servisTab&&bbmSummary){const movePeriodWrap=function(){if(!bbmTab.classList.contains('u-dnone')){if(periodWrap.parentElement!==bbmSummary)bbmSummary.insertBefore(periodWrap,bbmSummary.firstChild);}else if(!servisTab.classList.contains('u-dnone')){const head=servisTab.querySelector('.pwa-workspace-head');const target=head&&head.parentNode;if(target&&periodWrap.parentElement!==target){head.insertAdjacentElement('afterend',periodWrap);}}};movePeriodWrap();if(typeof MutationObserver==='function'){new MutationObserver(movePeriodWrap).observe(bbmTab,{attributes:true,attributeFilter:['class']});new MutationObserver(movePeriodWrap).observe(servisTab,{attributes:true,attributeFilter:['class']});}}
      // P1-18: one scroll area for Scan Nota, accessible row controls and bulk selection.
      const scan=byId('shopScanModal'),scanPreview=byId('shopScanPreview'),scanStatus=byId('shopScanStatus');
      if(scan&&scanPreview){
        scanPreview.classList.add('sheet-section');scanPreview.style.maxHeight='none';scanPreview.style.overflow='visible';
        let tools=byId('shopScanBulkTools');
        if(!tools){tools=make('div','shop-scan-tools');tools.id='shopScanBulkTools';const selectAll=make('button','btn btn-ghost btn-sm','Pilih semua');selectAll.type='button';selectAll.id='shopScanSelectAll';const clear=make('button','btn btn-ghost btn-sm','Kosongkan');clear.type='button';clear.id='shopScanClearAll';const count=make('span','shop-scan-count kv-row','0 dari 0 dicentang');count.id='shopScanSelectedCount';tools.append(selectAll,clear,count);scanPreview.parentNode.insertBefore(tools,scanPreview);
          const setIncluded=function(target){let guard=0;const max=scanPreview.querySelectorAll('input[type="checkbox"]').length+10;while(guard++<max){const rows=Array.from(scanPreview.querySelectorAll('input[type="checkbox"]'));const next=rows.find(function(cb){return cb.checked!==target;});if(!next)break;next.click();}};
          selectAll.addEventListener('click',function(){setIncluded(true);});clear.addEventListener('click',function(){setIncluded(false);});
        }
        const decorateScan=function(){
          const boxes=Array.from(scanPreview.querySelectorAll('input[type="checkbox"]'));
          boxes.forEach(function(cb){cb.style.width='20px';cb.style.height='20px';if(!cb.closest('.shop-scan-check-target')){const label=make('label','shop-scan-check-target');cb.parentNode.insertBefore(label,cb);label.appendChild(cb);}});
          scanPreview.querySelectorAll('.tx-item').forEach(function(row,i){const fields=Array.from(row.querySelectorAll('input:not([type="checkbox"])'));if(fields[0]){if(!fields[0].getAttribute('aria-label'))fields[0].setAttribute('aria-label','Nama produk baris '+(i+1));fields[0].setAttribute('enterkeyhint','next');fields[0].style.fontSize='16px';}if(fields[1]){if(!fields[1].getAttribute('aria-label'))fields[1].setAttribute('aria-label','Kategori baris '+(i+1));fields[1].setAttribute('enterkeyhint','next');fields[1].style.fontSize='16px';}if(fields[2]){if(!fields[2].getAttribute('aria-label'))fields[2].setAttribute('aria-label','Harga baris '+(i+1));fields[2].setAttribute('enterkeyhint','done');fields[2].style.fontSize='16px';}});
          const old=scanPreview.querySelector('.u-fs12.u-t2.u-mb8');if(old)old.hidden=true;
          const checked=boxes.filter(function(cb){return cb.checked;}).length;const count=byId('shopScanSelectedCount');if(count)count.textContent=checked+' dari '+boxes.length+' dicentang';
          const commit=byId('shopScanCommitBtn');if(commit&&commit.disabled){let reason=byId('shopScanDisabledReason');if(!reason){reason=make('div','sheet-disabled-reason','Centang minimal satu baris untuk mengimpor.');reason.id='shopScanDisabledReason';commit.parentNode.insertBefore(reason,commit);}reason.hidden=false;}else{const reason=byId('shopScanDisabledReason');if(reason)reason.hidden=true;}
        };
        observeWhileOpen('shopScanModal',scanPreview,decorateScan,{childList:true,subtree:true});
        scanPreview.addEventListener('change',decorateScan);decorateScan();
      }
      if(scanStatus){const syncBusy=function(){scanStatus.classList.toggle('scan-busy',/^\s*🔍/.test(scanStatus.textContent||''));};observeWhileOpen('shopScanModal',scanStatus,syncBusy,{childList:true,characterData:true,subtree:true});syncBusy();}

      // P1-19: accessible styled file-picker labels; keep original file inputs and handlers intact.
      [['importShopExcelFile','importShopExcelModal','.xlsx'],['shopCsvImportFile','shopCsvImportModal','.csv']].forEach(function(spec){
        const input=byId(spec[0]),owner=byId(spec[1]);if(!input||!owner)return;input.classList.add('sheet-file-source');input.style.fontSize='16px';
        let label=byId(spec[0]+'Picker');if(!label){label=make('label','sheet-file-picker','Pilih file '+spec[2]);label.id=spec[0]+'Picker';label.htmlFor=spec[0];const oldLabel=owner.querySelector('label[for="'+spec[0]+'"]');if(oldLabel)oldLabel.insertAdjacentElement('afterend',label);else input.insertAdjacentElement('beforebegin',label);}
        let name=byId(spec[0]+'FileName');if(!name){name=make('div','sheet-file-name','Belum ada file dipilih');name.id=spec[0]+'FileName';label.insertAdjacentElement('afterend',name);}const sync=function(){const file=input.files&&input.files[0];name.textContent=file?file.name:'Belum ada file dipilih';};input.addEventListener('change',sync);sync();
      });

      // P1-20: collapse long explanatory copy into a single accessible information row.
      ['shopScanModal','shopPdfImportModal','importShopExcelModal','shopCsvImportModal','quickScanModal','billMultiScanModal','billFallbackScanModal','billModal','linkTxModal','sparepartModal','stockModal','hondaPdfImportModal'].forEach(function(id){
        const owner=byId(id);if(!owner)return;const intro=owner.querySelector('.u-hint12');if(!intro||intro.closest('.hint-fold'))return;
        const fold=make('details','hint-fold');const summary=make('summary','','ⓘ Petunjuk');fold.appendChild(summary);fold.appendChild(intro.cloneNode(true));intro.replaceWith(fold);
      });

      ['shopScanModal','shopPdfImportModal','importShopExcelModal','shopCsvImportModal'].forEach(function(id){const owner=byId(id);if(!owner)return;Array.from(owner.querySelectorAll('div')).filter(function(el){return el.children.length===0&&!el.closest('.hint-fold')&&/supplier/i.test(el.textContent||'')&&/biasanya/i.test(el.textContent||'')&&/harga/i.test(el.textContent||'');}).forEach(function(intro){const fold=make('details','hint-fold');fold.appendChild(make('summary','','ⓘ Petunjuk harga'));intro.parentNode.insertBefore(fold,intro);fold.appendChild(intro);});});

      // P2-1/P2-2: make empty carts and disabled import actions understandable without changing disabled state.
      [['orderItemList','Pilih produk di atas untuk memulai Order.'],['pobCartList','Pilih produk di atas untuk menyusun PO.']].forEach(function(spec){const box=byId(spec[0]);if(!box)return;const sync=function(){const empty=box.querySelector('.empty');if(empty){const label=empty.querySelector('.empty-text');if(label){if(label.textContent!==spec[1])label.textContent=spec[1];}else if(!empty.querySelector('.sheet-empty-guidance'))empty.appendChild(make('div','sheet-empty-guidance',spec[1]));}};const ownerModal=box.closest('.overlay');if(ownerModal)observeWhileOpen(ownerModal.id,box,sync,{childList:true,subtree:true});else sync();});
      ['importShopExcelCommitBtn','shopCsvImportCommitBtn'].forEach(function(id){const btn=byId(id);if(!btn)return;const sync=function(){let reason=byId(id+'Reason');if(btn.disabled){if(!reason){reason=make('div','sheet-disabled-reason',id==='shopScanCommitBtn'?'Centang minimal satu baris untuk mengimpor.':'Pilih file dulu dan tunggu pratinjau sebelum mengimpor.');reason.id=id+'Reason';btn.parentNode.insertBefore(reason,btn);}reason.hidden=false;}else if(reason)reason.hidden=true;};const ownerId=id==='importShopExcelCommitBtn'?'importShopExcelModal':'shopCsvImportModal';observeWhileOpen(ownerId,btn,sync,{attributes:true,attributeFilter:['disabled']});sync();});
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  };
  PWAUX.installTxLinkHints();
  PWAUX.installOrderPoPresentation();
  PWAUX.installStatus();
  PWAUX.installViewportState();
  PWAUX.installStorageMonitor();
  PWAUX.installKeyboardInset();
  PWAUX.installOrderStatusFold();
  PWAUX.installStickyTotals();
})(typeof window!=='undefined'?window:globalThis);
