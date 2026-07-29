// ripple-position.js — ROADMAP-v1.1.md item #8 (KNOWN-ISSUES.md §5.2): ripple berbasis
// koordinat sentuh/klik ASLI, bukan selalu pulsa dari tengah elemen. Murni aditif: CSS ripple
// Tahap 7 (styles.css, radial-gradient via ::after) sebelumnya selalu `center/0% 0%`. Di sini
// kita HANYA men-set custom property --ripple-x/--ripple-y (posisi titik sentuh relatif thd
// elemen, dalam %) sesaat SEBELUM :active menyalakan animasi background-size di CSS — rule CSS
// itu sendiri tidak diubah selain baseline `var(--ripple-x,50%) var(--ripple-y,50%)` (fallback
// ke tengah kalau listener ini belum sempat set, mis. aktivasi via keyboard Enter/Space yang
// tidak punya titik koordinat sama sekali).
// Selector HARUS sama persis dengan daftar ripple Tahap 7 di styles.css (RIPPLE_SELECTOR) —
// kalau salah satu diubah, yang lain wajib ikut disesuaikan.
const RIPPLE_SELECTOR = '.btn,.chip-btn,.type-btn,.pm-btn,.qs-action,.bill-action-row,'+
'.card-collapse-toggle,.pin-key,.theme-card,.qs-btn,.kasir-tile,'+
'.dashhub-feature-card,.customer-card';

// Fungsi kalkulasi murni (testable tanpa DOM asli) — dipisah dari sisi event/DOM di bawah.
// rect: {left,top,width,height} (mis. hasil getBoundingClientRect()). clientX/clientY: posisi
// sentuh/klik dalam viewport coordinates (sama seperti event.clientX/clientY).
// Return null kalau rect tidak valid (elemen belum ke-layout / width|height 0 — dibiarkan
// fallback ke default CSS 50%/50%, bukan dipaksa angka yang salah).
function computeRipplePercent(rect, clientX, clientY) {
  if (!rect || !rect.width || !rect.height) return null;
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;
  // Clamp 0-100: titik sentuh di pinggir elemen (mis. touch sedikit meleset ke luar batas
  // akibat rounding subpixel) tidak boleh menghasilkan posisi ripple di luar kotak elemen.
  const clamp = (n) => Math.max(0, Math.min(100, n));
  return { x: clamp(xPct).toFixed(1) + '%', y: clamp(yPct).toFixed(1) + '%' };
}

function applyRipplePosition(el, clientX, clientY) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return;
  const pos = computeRipplePercent(el.getBoundingClientRect(), clientX, clientY);
  if (!pos) return;
  el.style.setProperty('--ripple-x', pos.x);
  el.style.setProperty('--ripple-y', pos.y);
}

function setupRipplePositionTracking(doc) {
  const d = doc || document;
  // Pointer Events menyatukan mouse+touch+pen di satu event — dipakai kalau tersedia
  // (semua browser modern). Fallback mousedown/touchstart cuma untuk browser sangat lama
  // yang belum dukung PointerEvent sama sekali.
  if (typeof PointerEvent !== 'undefined') {
    d.addEventListener('pointerdown', (e) => {
      const el = e.target.closest ? e.target.closest(RIPPLE_SELECTOR) : null;
      if (el) applyRipplePosition(el, e.clientX, e.clientY);
    }, true);
  } else {
    d.addEventListener('mousedown', (e) => {
      const el = e.target.closest ? e.target.closest(RIPPLE_SELECTOR) : null;
      if (el) applyRipplePosition(el, e.clientX, e.clientY);
    }, true);
    d.addEventListener('touchstart', (e) => {
      const t = e.touches && e.touches[0];
      const el = t && e.target.closest ? e.target.closest(RIPPLE_SELECTOR) : null;
      if (el) applyRipplePosition(el, t.clientX, t.clientY);
    }, { capture: true, passive: true });
  }
}

if (typeof document !== 'undefined') {
  setupRipplePositionTracking(document);
}
