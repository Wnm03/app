/* a11y-pressed-state.js (S256AH) -- single writer of aria-pressed for whitelisted <div>/<span data-action> toggle controls.
   Direction is one-way: class "active" -> aria-pressed. Never writes class. Runs after S256AG enhancer (hooked from its existing observer; no extra global observer). */
// S256AH: allowlist is strict. Native controls (button.chip / button.chip-btn -> S256AI), controls inside .segmented-control (owned by S1934)
// and controls without role="button" (not enhanced by S256AG) are skipped.
const _A11Y_PRESSED_SELECTOR='.chip[data-action],.vehicle-chip[data-action],.theme-card[data-action]';
function _a11yPressedEligible(el){
if(!el||!el.tagName||/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return false;
if(!el.getAttribute||el.getAttribute('role')!=='button') return false;
if(el.closest&&el.closest('.segmented-control')) return false;
return true;
}
function _a11yPressedSyncList(list){
let n=0;
for(let i=0;i<list.length;i++){
const el=list[i];
if(!_a11yPressedEligible(el)) continue;
const v=(el.classList&&el.classList.contains('active'))?'true':'false';
if(el.getAttribute('aria-pressed')!==v){ el.setAttribute('aria-pressed',v); n++; }
}
return n;
}
function _a11yPressedSync(root){
try{
if(!root||!root.querySelectorAll) return 0;
return _a11yPressedSyncList(root.querySelectorAll(_A11Y_PRESSED_SELECTOR));
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y pressed sync gagal:', err&&err.message); return 0; }
}
// Theme cards are toggled with classList (no childList mutation), so exactly one class-only observer watches #themeGrid.
let _a11yThemeObs=null,_a11yThemeObsTarget=null;
function _a11yPressedObserveThemeGrid(){
try{
if(typeof document==='undefined'||typeof MutationObserver==='undefined') return false;
const grid=document.getElementById('themeGrid');
if(!grid) return false;
if(_a11yThemeObs&&_a11yThemeObsTarget===grid) return true;
if(_a11yThemeObs) _a11yThemeObs.disconnect();
_a11yThemeObs=new MutationObserver(function(){ _a11yPressedSyncList(grid.querySelectorAll('.theme-card[data-action]')); });
_a11yThemeObs.observe(grid,{attributes:true,attributeFilter:['class'],subtree:true});
_a11yThemeObsTarget=grid;
return true;
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y theme observer gagal:', err&&err.message); return false; }
}
// Single entry point, called by the S256AG enhancer right after it sets role/tabindex.
function _a11yPressedSyncAll(root){
const n=_a11yPressedSync(root);
_a11yPressedObserveThemeGrid();
return n;
}
