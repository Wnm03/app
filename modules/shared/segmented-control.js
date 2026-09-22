/* S1934 — Segmented Control accessibility + interaction contract.
 * Presentation/interaction hardening only. Existing data-action handlers remain the SOT.
 * This helper deliberately does NOT call page renderers or mutate application state.
 */
(function(global, document){
  'use strict';
  if (!document) return;

  const NAV_CLASSES = ['kel-subtabs','lap-subtabs','pjk-subtabs','cni-subtabs','budget-tabbar','cn-tabs'];

  function isNav(root){
    return NAV_CLASSES.some(c => root.classList && root.classList.contains(c));
  }

  function items(root){
    return Array.from(root.children).filter(el => {
      if (!el || el.nodeType !== 1) return false;
      if (el.matches('[disabled], [aria-disabled="true"]')) return false;
      return el.matches('button,[role="tab"],[role="button"],[data-action],.chip-btn,.cn-tab,.kel-subtab,.lap-subtab,.pjk-subtab,.cni-subtab,.budget-tab-btn,.type-btn,.pm-btn');
    });
  }

  function sync(root){
    if (!root || !root.matches || !root.matches('.segmented-control')) return;
    const nav = isNav(root) || root.dataset.segmentedVariant === 'nav';
    const role = nav ? 'tablist' : 'group';
    root.setAttribute('role', role);
    const els = items(root);
    els.forEach((el, i) => {
      const active = el.classList.contains('active');
      if (nav) {
        el.setAttribute('role','tab');
        el.setAttribute('aria-selected', active ? 'true' : 'false');
        el.setAttribute('tabindex', active ? '0' : '-1');
      } else {
        el.setAttribute('role','button');
        el.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
      }
      if (!el.hasAttribute('aria-disabled') && el.disabled) el.setAttribute('aria-disabled','true');
      if (i === 0 && !root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
        root.setAttribute('aria-label','Pilihan');
      }
    });
  }

  function mount(root){
    if (!root || root.dataset.segmentedMounted === '1') return;
    root.dataset.segmentedMounted = '1';
    sync(root);

    root.addEventListener('keydown', function(ev){
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End' && ev.key !== 'Enter' && ev.key !== ' ') return;
      const els = items(root);
      if (!els.length) return;
      const current = document.activeElement;
      const idx = els.indexOf(current);
      if (ev.key === 'Enter' || ev.key === ' ') {
        if (idx >= 0 && current) { ev.preventDefault(); current.click(); setTimeout(() => sync(root), 0); }
        return;
      }
      let next = idx < 0 ? 0 : idx;
      if (ev.key === 'ArrowLeft') next = (next - 1 + els.length) % els.length;
      if (ev.key === 'ArrowRight') next = (next + 1) % els.length;
      if (ev.key === 'Home') next = 0;
      if (ev.key === 'End') next = els.length - 1;
      ev.preventDefault();
      els[next].focus({preventScroll:true});
      if (isNav(root)) els[next].scrollIntoView({block:'nearest',inline:'nearest'});
    });

    root.addEventListener('click', function(){ setTimeout(() => sync(root), 0); }, true);
    const observer = new MutationObserver(function(){ sync(root); });
    observer.observe(root, {subtree:true, attributes:true, attributeFilter:['class','disabled']});
  }

  function scan(scope){
    const roots = [];
    if (scope && scope.matches && scope.matches('.segmented-control')) roots.push(scope);
    if (scope && scope.querySelectorAll) scope.querySelectorAll('.segmented-control').forEach(r => roots.push(r));
    roots.forEach(mount);
  }

  global.SegmentedControl = Object.freeze({mount, sync, scan});
  function boot(){ scan(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})(window, document);
