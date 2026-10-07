/* a11y-action-controls.js (S256AG) -- keyboard reachability for whitelisted <div>/<span data-action> controls.
   Standalone: no dependency on other modules. Enter/Space activation lives in features-helpers-global-security.js (S256AF). */
// S256AG: make whitelisted <div>/<span data-action> controls keyboard-reachable (role=button + tabindex=0).
// Whitelist only (leaf-like controls); rows that contain other controls (e.g. .tx-item, .cat-bar) are NOT touched.
// A control nested inside an already-enhanced control is skipped to avoid nested interactive roles.
const _A11Y_ACTION_SELECTOR='.chip[data-action],.ai-q[data-action],.vehicle-chip[data-action],.theme-card[data-action],.card-collapse-toggle[data-action],.card-setting-btn[data-action],.stat-box.clickable[data-action],.shop-stat.clickable[data-action],.bbm-stat.clickable[data-action],.kasir-floatbar[data-action],.sv-tap[data-action],.stat-val[data-action]';
function _a11yEnhanceActionControls(root){
try{
if(!root||!root.querySelectorAll) return 0;
let n=0;
const list=root.querySelectorAll(_A11Y_ACTION_SELECTOR);
for(let i=0;i<list.length;i++){
const el=list[i];
if(/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) continue;
if(el.hasAttribute('role')||el.hasAttribute('tabindex')) continue;
if(el.parentElement&&el.parentElement.closest&&el.parentElement.closest('[role="button"][data-action]')) continue;
el.setAttribute('role','button');
el.setAttribute('tabindex','0');
n++;
}
return n;
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y enhance gagal:', err&&err.message); return 0; }
}
function _installActionControlA11y(){
try{
if(typeof document==='undefined'||!document.body) return;
_a11yEnhanceActionControls(document);
if(typeof _a11yPressedSyncAll==='function') _a11yPressedSyncAll(document); // S256AH hook (aria-pressed lives in a11y-pressed-state.js)
if(typeof _a11yNativePressedSyncAll==='function') _a11yNativePressedSyncAll(document); // S256AI hook (native chip-btn; a11y-pressed-native.js)
if(typeof _a11yWorthItTabsSync==='function') _a11yWorthItTabsSync(); // S256AJ hook (a11y-tabs-worthit.js)
if(typeof _a11yExpandedTogglesSync==='function') _a11yExpandedTogglesSync(); // S256AK hook (a11y-expanded-toggles.js)
if(typeof MutationObserver==='undefined') return;
let queued=false;
new MutationObserver(function(){
if(queued) return;
queued=true;
const run=function(){ queued=false; _a11yEnhanceActionControls(document); if(typeof _a11yPressedSyncAll==='function') _a11yPressedSyncAll(document); if(typeof _a11yNativePressedSyncAll==='function') _a11yNativePressedSyncAll(document); if(typeof _a11yWorthItTabsSync==='function') _a11yWorthItTabsSync(); if(typeof _a11yExpandedTogglesSync==='function') _a11yExpandedTogglesSync(); };
if(typeof requestAnimationFrame==='function') requestAnimationFrame(run); else setTimeout(run,16);
}).observe(document.body,{childList:true,subtree:true});
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y observer gagal:', err&&err.message); }
}
if(typeof document!=='undefined'){
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_installActionControlA11y);
else _installActionControlA11y();
}
