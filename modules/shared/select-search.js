/* S2799 — Select Search: panel pencarian untuk SEMUA <select> (semua domain).
 *
 * Prinsip:
 *  - <select> asli tetap SoT nilai. Kode lama yang membaca select.value atau memantau event
 *    `change`/`input` tidak berubah; modul ini hanya mengganti PICKER-nya (bukan datanya).
 *  - Satu listener delegasi di document => select yang dirender dinamis lewat JS ikut tercakup
 *    tanpa perlu didaftarkan satu per satu.
 *  - Tanpa handler inline & tanpa innerHTML dari data (aman untuk CSP; teks opsi lewat textContent).
 *  - Dedupe hanya di tampilan panel (DOM <select> tidak diubah): opsi dengan `value` kembar dilebur;
 *    opsi kosong dilebur hanya bila labelnya sama. Dua data BERBEDA yang senama TIDAK disembunyikan.
 *  - Dikecualikan: select[multiple], select[size>1], select[disabled], [data-native-select], .no-select-search.
 */
(function (global, document) {
  'use strict';
  if (!document || global.SelectSearch) return;

  const VERSION = 'S2799.1';
  const MAX_PANEL_H = 380;
  const SEARCH_H = 56;
  const state = { sel: null, panel: null, input: null, list: null, items: [], rows: [], active: -1, observer: null, raf: 0 };

  function normalize(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function eligible(sel) {
    if (!sel || sel.nodeName !== 'SELECT') return false;
    if (sel.multiple || sel.disabled) return false;
    if (Number(sel.size) > 1) return false;
    if (sel.hasAttribute('data-native-select') || sel.classList.contains('no-select-search')) return false;
    if (sel.closest('.ss-panel')) return false;
    return true;
  }

  /* Bangun daftar item panel dari <select>. Murni baca; tidak mengubah DOM. */
  function buildItems(sel) {
    const items = [];
    const byValue = new Map();
    const selectedValue = sel.value;
    function addOption(opt, group) {
      if (opt.hidden) return;
      const value = opt.value;
      const label = (opt.label || opt.textContent || '').replace(/\s+/g, ' ').trim();
      const prev = byValue.get(value);
      if (prev && (value !== '' || normalize(prev.label) === normalize(label))) return;
      const item = { type: 'option', value, label, group, disabled: opt.disabled, selected: value === selectedValue, norm: normalize(label + ' ' + (group || '')) };
      if (!prev) byValue.set(value, item);
      items.push(item);
    }
    Array.from(sel.children).forEach(function (node) {
      if (node.nodeName === 'OPTION') addOption(node, '');
      else if (node.nodeName === 'OPTGROUP') {
        if (node.hidden) return;
        const g = node.label || '';
        Array.from(node.children).forEach(function (o) { if (o.nodeName === 'OPTION') addOption(o, g); });
      }
    });
    return items;
  }

  function filterItems(items, query) {
    const tokens = normalize(query).split(' ').filter(Boolean);
    if (!tokens.length) return items.slice();
    return items.filter(function (it) { return tokens.every(function (t) { return it.norm.indexOf(t) !== -1; }); });
  }

  function renderList() {
    const list = state.list;
    const shown = filterItems(state.items, state.input.value);
    list.textContent = '';
    state.rows = [];
    state.active = -1;
    if (!shown.length) {
      const empty = document.createElement('div');
      empty.className = 'ss-empty';
      empty.setAttribute('role', 'status');
      empty.textContent = 'Tidak ada hasil';
      list.appendChild(empty);
      state.input.removeAttribute('aria-activedescendant');
      return;
    }
    let lastGroup = '';
    shown.forEach(function (it, i) {
      if (it.group && it.group !== lastGroup) {
        const gh = document.createElement('div');
        gh.className = 'ss-group';
        gh.setAttribute('role', 'presentation');
        gh.textContent = it.group;
        list.appendChild(gh);
      }
      lastGroup = it.group;
      const row = document.createElement('div');
      row.className = 'ss-opt' + (it.selected ? ' is-selected' : '') + (it.disabled ? ' is-disabled' : '');
      row.id = 'ss-opt-' + i;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', it.selected ? 'true' : 'false');
      if (it.disabled) row.setAttribute('aria-disabled', 'true');
      row.textContent = it.label || ' ';
      row.dataset.value = it.value;
      row.dataset.idx = String(i);
      list.appendChild(row);
      state.rows.push({ el: row, item: it });
    });
    const start = state.rows.findIndex(function (r) { return r.item.selected && !r.item.disabled; });
    setActive(start >= 0 ? start : state.rows.findIndex(function (r) { return !r.item.disabled; }), true);
  }

  function setActive(i, center) {
    if (state.active >= 0 && state.rows[state.active]) state.rows[state.active].el.classList.remove('is-active');
    state.active = i;
    const r = state.rows[i];
    if (!r) { state.input.removeAttribute('aria-activedescendant'); return; }
    r.el.classList.add('is-active');
    state.input.setAttribute('aria-activedescendant', r.el.id);
    if (typeof r.el.scrollIntoView === 'function') r.el.scrollIntoView({ block: center ? 'center' : 'nearest' });
  }

  function move(delta) {
    const n = state.rows.length;
    if (!n) return;
    let i = state.active;
    for (let step = 0; step < n; step++) {
      i = (i + delta + n) % n;
      if (!state.rows[i].item.disabled) { setActive(i, false); return; }
    }
  }

  function position() {
    const sel = state.sel, panel = state.panel;
    if (!sel || !panel) return;
    if (!sel.isConnected) { close(); return; }
    const r = sel.getBoundingClientRect();
    const vv = global.visualViewport;
    const vw = vv ? vv.width : global.innerWidth;
    const vh = vv ? vv.height : global.innerHeight;
    const width = Math.min(Math.max(r.width, 240), vw - 16);
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    const useBelow = below >= 220 || below >= above;
    const maxH = Math.max(160, Math.min(MAX_PANEL_H, useBelow ? below : above));
    panel.style.width = width + 'px';
    panel.style.left = left + 'px';
    panel.style.maxHeight = maxH + 'px';
    state.list.style.maxHeight = (maxH - SEARCH_H) + 'px';
    if (useBelow) { panel.style.top = (r.bottom + 4) + 'px'; panel.style.bottom = 'auto'; }
    else { panel.style.bottom = (vh - r.top + 4) + 'px'; panel.style.top = 'auto'; }
  }

  function schedulePosition() {
    if (state.raf) return;
    state.raf = global.requestAnimationFrame(function () { state.raf = 0; position(); });
  }

  function open(sel) {
    if (!eligible(sel)) return false;
    if (state.sel === sel) return true;
    close();
    state.sel = sel;
    state.items = buildItems(sel);

    const panel = document.createElement('div');
    panel.className = 'ss-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Pilih opsi');
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'ss-input';
    input.placeholder = 'Cari…';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Cari');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'ss-list');
    const list = document.createElement('div');
    list.className = 'ss-list';
    list.id = 'ss-list';
    list.setAttribute('role', 'listbox');
    panel.appendChild(input);
    panel.appendChild(list);
    document.body.appendChild(panel);
    Object.assign(state, { panel: panel, input: input, list: list });

    input.addEventListener('input', function () { renderList(); });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) {
      const row = e.target.closest ? e.target.closest('.ss-opt') : null;
      if (!row || row.classList.contains('is-disabled')) return;
      choose(row.dataset.value);
    });

    renderList();
    position();
    sel.setAttribute('aria-expanded', 'true');
    const coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    if (!coarse || state.items.length > 8) input.focus({ preventScroll: true });

    state.observer = new MutationObserver(function () { if (!sel.isConnected) close(); });
    state.observer.observe(document.body, { childList: true, subtree: true });
    return true;
  }

  function close(restoreFocus) {
    const sel = state.sel;
    if (state.observer) { state.observer.disconnect(); state.observer = null; }
    if (state.raf) { global.cancelAnimationFrame(state.raf); state.raf = 0; }
    if (state.panel && state.panel.parentNode) state.panel.parentNode.removeChild(state.panel);
    Object.assign(state, { sel: null, panel: null, input: null, list: null, items: [], rows: [], active: -1 });
    if (sel) {
      sel.removeAttribute('aria-expanded');
      if (restoreFocus !== false && sel.isConnected && typeof sel.focus === 'function') sel.focus({ preventScroll: true });
    }
  }

  function choose(value) {
    const sel = state.sel;
    if (!sel) return;
    const changed = sel.value !== value;
    sel.value = value;
    close();
    if (changed) {
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /* ---- listener delegasi ---- */
  // Cegah picker native; panel dibuka di click supaya mouse, touch & pointer lain konsisten.
  document.addEventListener('mousedown', function (e) {
    const t = e.target;
    if (state.panel && !(t.closest && (t.closest('.ss-panel') || t === state.sel))) close(false);
    if (eligible(t) && e.button === 0) e.preventDefault();
  }, true);

  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!eligible(t)) return;
    e.preventDefault();
    if (state.sel === t) { close(); return; }
    open(t);
  }, true);

  global.addEventListener('keydown', function (e) {
    if (state.panel) {
      if (e.key === 'Escape') {
        // Tutup panel saja; modal di bawahnya tidak ikut tertutup.
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        close();
        return;
      }
      if (state.panel.contains(e.target)) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Home' && state.rows.length) { e.preventDefault(); setActive(state.rows.findIndex(function (r) { return !r.item.disabled; }), false); }
        else if (e.key === 'End' && state.rows.length) { e.preventDefault(); setActive(state.rows.length - 1 - state.rows.slice().reverse().findIndex(function (r) { return !r.item.disabled; }), false); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          const r = state.rows[state.active];
          if (r && !r.item.disabled) choose(r.item.value);
        } else if (e.key === 'Tab') close();
        return;
      }
    }
    const t = e.target;
    if (eligible(t) && (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown'))) {
      e.preventDefault();
      open(t);
    }
  }, true);

  global.addEventListener('resize', schedulePosition);
  if (global.visualViewport) global.visualViewport.addEventListener('resize', schedulePosition);
  document.addEventListener('scroll', function (e) {
    if (state.panel && !(e.target && e.target.nodeType === 1 && state.panel.contains(e.target))) schedulePosition();
  }, true);

  global.SelectSearch = { version: VERSION, open: open, close: close, isOpen: function () { return !!state.panel; }, normalize: normalize, buildItems: buildItems, filterItems: filterItems, eligible: eligible };
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
