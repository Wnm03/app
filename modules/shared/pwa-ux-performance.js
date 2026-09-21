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
  PWAUX.markRendered=function(root){
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){PWAUX.refreshLargeLists(root);});
    else PWAUX.refreshLargeLists(root);
  };
  PWAUX.installStatus();
})(typeof window!=='undefined'?window:globalThis);
