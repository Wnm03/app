const fs=require('fs');
const assert=require('assert');
for(const file of ['modules/shared/modal-navigasi.js','modules/asset/modal-navigasi.js']){
  const s=fs.readFileSync(file,'utf8');
  assert(s.includes("const _swipeDismissCloseTimers=typeof WeakMap==='function'?new WeakMap():null;"), `${file}: timer registry missing`);
  assert(s.includes('function _clearSwipeDismissCloseTimer(overlay)'), `${file}: clear helper missing`);
  assert(s.includes('_clearSwipeDismissCloseTimer(el);'), `${file}: open/close timer cancellation missing`);
  assert(s.includes('if(_swipeDismissCloseTimers&&_swipeDismissCloseTimers.get(overlay)===timer)'), `${file}: stale timer identity guard missing`);
  assert(!s.includes("setTimeout(()=>{ closeModal(overlayId); sheet.style.transform=''; },160);"), `${file}: old uncancellable swipe timer remains`);
}
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
assert(bundle.includes('_swipeDismissCloseTimers'), 'bundle B: timer registry missing');
assert(bundle.includes('_clearSwipeDismissCloseTimer(overlay)'), 'bundle B: timer clear helper missing');
assert(bundle.includes('get(overlay)===timer'), 'bundle B: stale timer identity guard missing');
console.log('S29 modal swipe stale-timer guard: 3/3 PASS');
