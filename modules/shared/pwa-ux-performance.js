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
    window.addEventListener('resize',update,{passive:true});
    window.addEventListener('orientationchange',update,{passive:true});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',update,{passive:true});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});else update();
  };
  PWAUX.resetOverlayGeometry=function(overlay){
    if(!overlay||!overlay.querySelector)return;
    const sheets=overlay.querySelectorAll('.modal,.qs-modal,.calc-modal');
    sheets.forEach(function(sheet){if(!sheet||!sheet.style)return;sheet.style.transform='';sheet.style.transition='';});
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
    const schedule=function(){clearTimeout(timer);timer=setTimeout(check,250);};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
    window.addEventListener('focus',schedule,{passive:true});
    window.addEventListener('online',schedule,{passive:true});
    setInterval(check,60000);
  };
  PWAUX.markRendered=function(root){
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){PWAUX.refreshLargeLists(root);});
    else PWAUX.refreshLargeLists(root);
  };
  PWAUX.installStatus();
  PWAUX.installViewportState();
  PWAUX.installStorageMonitor();
})(typeof window!=='undefined'?window:globalThis);
