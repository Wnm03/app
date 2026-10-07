/* a11y-expanded-toggles.js (S256AK) -- aria-expanded/aria-controls for the "⚙️ Atur" panel toggles of the two cash-projection cards.
   One-way: panel visibility (class "u-dnone" absent) -> aria-expanded on the toggle. Never writes class. Class-only observer on the panels. */
const _A11Y_EXPAND_PAIRS=[['dashCashProjSettingsToggle','dashCashProjSettingsPanel'],['cashflowProjSettingsToggle','cashflowProjSettingsPanel']];
let _a11yExpObs=null;
const _a11yExpSeen=(typeof WeakSet!=='undefined')?new WeakSet():null;
function _a11yExpSyncPair(t,p){
if(!t||!p) return 0;
let n=0;
const v=p.classList.contains('u-dnone')?'false':'true';
if(t.getAttribute('aria-expanded')!==v){ t.setAttribute('aria-expanded',v); n++; }
if(t.getAttribute('aria-controls')!==p.id){ t.setAttribute('aria-controls',p.id); n++; }
return n;
}
function _a11yExpandedTogglesSync(){
try{
if(typeof document==='undefined') return 0;
let n=0;
for(let i=0;i<_A11Y_EXPAND_PAIRS.length;i++){
const t=document.getElementById(_A11Y_EXPAND_PAIRS[i][0]), p=document.getElementById(_A11Y_EXPAND_PAIRS[i][1]);
if(!t||!p) continue;
n+=_a11yExpSyncPair(t,p);
if(_a11yExpSeen&&!_a11yExpSeen.has(p)&&typeof MutationObserver!=='undefined'){
if(!_a11yExpObs) _a11yExpObs=new MutationObserver(function(recs){
for(let k=0;k<recs.length;k++){
const tp=recs[k].target;
for(let j=0;j<_A11Y_EXPAND_PAIRS.length;j++){ if(tp&&tp.id===_A11Y_EXPAND_PAIRS[j][1]) _a11yExpSyncPair(document.getElementById(_A11Y_EXPAND_PAIRS[j][0]),tp); }
}
});
_a11yExpObs.observe(p,{attributes:true,attributeFilter:['class']});
_a11yExpSeen.add(p);
}
}
return n;
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y expanded toggles gagal:', err&&err.message); return 0; }
}
