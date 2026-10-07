/* a11y-tabs-worthit.js (S256AJ) -- tab semantics for the Worth It? modal (WorthIt.switchTab): tablist/tab/tabpanel, aria-selected, roving tabindex, arrow keys.
   One-way: class "active" -> aria-selected/tabindex. Never writes class; activation = click() on the tab (existing data-action dispatcher). */
const _A11Y_WI_TABS=[['wiTabBtnSingle','wiTabSingle'],['wiTabBtnList','wiTabList'],['wiTabBtnWatch','wiTabWatch']];
let _a11yWiObs=null,_a11yWiObsSeen=false;
function _a11yWiSyncSelection(btns){
let n=0;
for(let i=0;i<btns.length;i++){
const b=btns[i]; if(!b) continue;
const on=b.classList.contains('active');
const sel=on?'true':'false', ti=on?'0':'-1';
if(b.getAttribute('aria-selected')!==sel){ b.setAttribute('aria-selected',sel); n++; }
if(b.getAttribute('tabindex')!==ti){ b.setAttribute('tabindex',ti); n++; }
}
return n;
}
function _a11yWiKey(ev){
const k=ev&&ev.key; if(!k) return false;
const btns=_A11Y_WI_TABS.map(function(p){return document.getElementById(p[0]);}).filter(Boolean);
const cur=btns.indexOf(ev.target); if(cur<0||!btns.length) return false;
let nx=-1;
if(k==='ArrowRight') nx=(cur+1)%btns.length; else if(k==='ArrowLeft') nx=(cur-1+btns.length)%btns.length; else if(k==='Home') nx=0; else if(k==='End') nx=btns.length-1; else return false;
if(ev.preventDefault) ev.preventDefault();
btns[nx].click(); if(btns[nx].focus) btns[nx].focus();
return true;
}
function _a11yWorthItTabsSync(){
try{
if(typeof document==='undefined') return 0;
const btns=_A11Y_WI_TABS.map(function(p){return document.getElementById(p[0]);});
if(!btns[0]||!btns[1]||!btns[2]) return 0;
let n=0;
const list=btns[0].parentElement;
if(list&&list.getAttribute('role')!=='tablist'){ list.setAttribute('role','tablist'); list.setAttribute('aria-label','Mode Worth It'); n++; }
for(let i=0;i<_A11Y_WI_TABS.length;i++){
const b=btns[i], p=document.getElementById(_A11Y_WI_TABS[i][1]);
if(b.getAttribute('role')!=='tab'){ b.setAttribute('role','tab'); b.setAttribute('aria-controls',_A11Y_WI_TABS[i][1]); n++; }
if(p&&p.getAttribute('role')!=='tabpanel'){ p.setAttribute('role','tabpanel'); p.setAttribute('aria-labelledby',_A11Y_WI_TABS[i][0]); n++; }
}
n+=_a11yWiSyncSelection(btns);
if(!_a11yWiObsSeen&&list&&typeof MutationObserver!=='undefined'){
_a11yWiObs=new MutationObserver(function(){ _a11yWiSyncSelection(btns); });
_a11yWiObs.observe(list,{attributes:true,attributeFilter:['class'],subtree:true});
if(list.addEventListener) list.addEventListener('keydown',_a11yWiKey);
_a11yWiObsSeen=true;
}
return n;
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y worthit tabs gagal:', err&&err.message); return 0; }
}
