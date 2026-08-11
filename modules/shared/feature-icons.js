// feature-icons.js — Migrasi Icon Emoji -> SVG (KNOWN-ISSUES.md §4.1 / ROADMAP-v1.1.md #3)
// Dipindah ke modules/shared/feature-icons.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
//
// LATAR: field `icon:` di FEATURE_REGISTRY (dashboard-hub-registry.js) & registry
// serupa berisi emoji literal, tidak konsisten dengan SVG inline yang sudah dipakai
// di tempat lain (search icon, grid icon, dst — lihat UI-ICON-AUDIT.md). Mengganti
// field `icon:` itu sendiri ke SVG berarti mengubah bentuk data (breaking change ke
// seluruh kode yang baca `.icon`), jadi file ini SENGAJA tidak menyentuh
// dashboard-hub-registry.js / struktur data manapun — murni layer RENDER tambahan:
// emoji yang sudah ada dipakai sebagai KUNCI lookup ke markup SVG, hanya di titik
// tempat ia dirender ke DOM.
//
// Gaya SVG mengikuti pola yang SUDAH ada di index.html (search icon, grid icon,
// dst.): fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24",
// garis geometris sederhana (bukan icon font pihak ketiga) supaya ringan & mewarisi
// warna teks sekitar via `currentColor` (otomatis ikut tema gelap/terang).
//
// PENTING: file ini HARUS dimuat sebelum dashboard-hub.js / dashboard-hub-search.js /
// dashboard-hub-favorit-view.js dipanggil render()-nya (lihat scripts/build.js —
// ditempatkan di awal grup dashboard-hub). Karena FeatureIcons cuma dipanggil
// langsung sbg variabel global (bukan lewat data-action), TIDAK perlu di-expose ke
// `window` (beda dgn pola bug di tests/window-expose-audit.test.js).

const FeatureIcons = {
  // emoji -> inner SVG path markup (tanpa tag <svg> pembungkus, supaya konsisten
  // dipasang lewat renderSvgIcon() di bawah).
  _MAP: {
    '🏠': '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    '🏦': '<path d="M3 21h18"/><path d="M4 10h16"/><path d="M12 3l9 5H3z"/><path d="M6 10v8"/><path d="M12 10v8"/><path d="M18 10v8"/>',
    '🏪': '<path d="M4 8l1-4h14l1 4"/><path d="M4 8v12h16V8"/><path d="M4 8a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0"/><path d="M10 20v-6h4v6"/>',
    '🏭': '<path d="M3 20h18v-8l-5 3v-3l-5 3v-3l-5 3v-1H3z"/><path d="M6 12V8"/><path d="M11 9V6"/>',
    '🏷️': '<path d="M3 11V4h7l10 10-7 7z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    '🛒': '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.3a2 2 0 002 1.7h8.8a2 2 0 002-1.6L21 8H6"/>',
    '🚗': '<path d="M4 16V9l2.5-4h9L18 9v7"/><path d="M2 16h20v3H2z"/><circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
    '⛽': '<rect x="4" y="4" width="9" height="17" rx="1"/><path d="M4 11h9"/><path d="M15 8h2l3 3v7a1.5 1.5 0 01-3 0v-3h-2"/>',
    '🕌': '<path d="M4 21V11l8-6 8 6v10"/><path d="M9 21v-6h6v6"/><circle cx="12" cy="6" r="1.5"/><path d="M12 4V2"/>',
    '👨‍👩‍👧': '<circle cx="7" cy="7" r="2.5"/><path d="M2 21c0-3.5 2-5.5 5-5.5s5 2 5 5.5"/><circle cx="17" cy="7" r="2.5"/><path d="M12 21c0-3.5 2-5.5 5-5.5s5 2 5 5.5"/><circle cx="12" cy="16" r="1.8"/><path d="M9 22c0-2 1.2-3 3-3s3 1 3 3"/>',
    '🏃': '<circle cx="14.5" cy="4" r="1.7"/><path d="M9.5 21l2.5-6 2.5 2 3 5"/><path d="M6 15l4-3 1.5-5-2.5-1.5-3 4"/><path d="M11.5 12.5l3 1 3-2"/>',
    '📦': '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13V22"/>',
    '🌱': '<path d="M12 21V11"/><path d="M12 11C12 6 8 4 4 4c0 5 3 8 8 8z"/><path d="M12 14c0-4 3-6 7-6 0 4-2 7-7 7z"/>',
    '💡': '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7c.6.4 1 1.2 1 2.1V17h6v-.2c0-.9.4-1.7 1-2.1A7 7 0 0012 2z"/>',
    '🤖': '<rect x="5" y="8" width="14" height="11" rx="2"/><circle cx="9.5" cy="13.5" r="1.2"/><circle cx="14.5" cy="13.5" r="1.2"/><path d="M9 17h6"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/>',
    '☁️': '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.5A4.5 4.5 0 0117.5 18H7z"/>',
    '⚙️': '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.5 7.5 0 000-3l1.9-1.5-2-3.4-2.3.7a7.6 7.6 0 00-2.6-1.5L14 2h-4l-.4 2.3a7.6 7.6 0 00-2.6 1.5l-2.3-.7-2 3.4L4.6 10a7.5 7.5 0 000 3l-1.9 1.5 2 3.4 2.3-.7c.8.6 1.6 1.1 2.6 1.5L10 22h4l.4-2.3a7.6 7.6 0 002.6-1.5l2.3.7 2-3.4z"/>',
    '💰': '<ellipse cx="12" cy="7" rx="8" ry="4"/><path d="M4 7v5c0 2.2 3.6 4 8 4s8-1.8 8-4V7"/><path d="M4 12v5c0 2.2 3.6 4 8 4s8-1.8 8-4v-5"/>',
    '💳': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
    '💸': '<ellipse cx="12" cy="12" rx="9" ry="6"/><circle cx="12" cy="12" r="2.2"/><path d="M4 9l3 6M20 9l-3 6"/>',
    '💹': '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
    '💾': '<path d="M4 4h13l3 3v13H4z"/><path d="M7 4v6h9V4"/><path d="M7 14h10v6H7z"/>',
    '📈': '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
    '📉': '<path d="M3 7l6 6 4-4 8 9"/><path d="M15 18h6v-6"/>',
    '📊': '<path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/><path d="M2 20h20"/>',
    '📋': '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 11h8"/><path d="M8 15h8"/><path d="M8 19h5"/>',
    '📚': '<path d="M4 5a2 2 0 012-2h3v18H6a2 2 0 01-2-2z"/><path d="M9 3h4v18H9z"/><path d="M13 5l5-1 2 16-5 1z"/>',
    '📜': '<path d="M6 3h13v15a3 3 0 01-3 3H6a3 3 0 003-3V6a3 3 0 00-3-3z"/><path d="M9 8h7"/><path d="M9 12h7"/>',
    '📝': '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17z"/><path d="M13 6.5l3 3"/>',
    '📤': '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4"/>',
    '📱': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    '📸': '<path d="M4 8h3l1.5-2h7L17 8h3v12H4z"/><circle cx="12" cy="14" r="3.5"/>',
    '🔄': '<path d="M3 11a9 9 0 0115-6.7L21 7"/><path d="M21 3v4h-4"/><path d="M21 13a9 9 0 01-15 6.7L3 17"/><path d="M3 21v-4h4"/>',
    '🔍': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.5-4.5"/>',
    '🔑': '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M16 7l3 3"/><path d="M13 10l2.5 2.5"/>',
    '🔒': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    '🔔': '<path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 004 0"/>',
    '🔧': '<path d="M15 6a4 4 0 00-5.4 4.3L3 17l3 3 6.7-6.6A4 4 0 0018 9z"/>',
    '🕒': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    '🗂️': '<path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h5l1 2"/>',
    '🛠️': '<path d="M15 6a4 4 0 00-5.4 4.3L3 17l3 3 6.7-6.6A4 4 0 0018 9z"/>',
    '🤔': '<circle cx="12" cy="12" r="9"/><path d="M9 10a2 2 0 013.8-1"/><path d="M11 15h2"/>',
    '🤝': '<path d="M2 12l4-4h4l3 3"/><path d="M22 12l-4-4h-4l-3 3"/><path d="M9 11l3 3 3-3"/><path d="M6 15l2 2M18 15l-2 2"/>',
    'ℹ️': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none"/>',
    '⚖️': '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M4 7h6M14 7h6"/><path d="M4 7l-3 6a3 3 0 006 0z"/><path d="M20 7l-3 6a3 3 0 006 0z"/>',
    '✅': '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    '🌊': '<path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    '🌙': '<path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z"/>',
    '🎁': '<rect x="4" y="9" width="16" height="12" rx="1"/><path d="M2 6h20v4H2z"/><path d="M12 6v15"/><path d="M12 6c-2 0-4-1.5-4-3.2C8 1.5 9.2 1 10 1.5c1.2.8 2 2.8 2 4.5zM12 6c2 0 4-1.5 4-3.2 0-1.3-1.2-1.8-2-1.3-1.2.8-2 2.8-2 4.5z"/>',
    '🎓': '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    '🎨': '<path d="M12 3a9 9 0 100 18c1.4 0 2-1 2-2s-.6-1.4-.6-2.2c0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="9.5" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/><circle cx="17" cy="11" r="1"/>',
    '🎯': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    '👤': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    '👥': '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.8 3-6 7-6s7 2.2 7 6"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M17 15c3 .4 5 2.3 5 6"/>',
    '👴': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/><path d="M9 6.5c1 .8 4 .8 5 0"/>',
    '👶': '<circle cx="12" cy="9" r="5"/><path d="M9 9.5c.5.7 1.3 1 3 1s2.5-.3 3-1"/><path d="M8 21c0-3.3 1.8-5 4-5s4 1.7 4 5"/>',
    '💬': '<path d="M4 4h16v12H9l-5 4z"/>',
    '🧠': '<path d="M9 4a3 3 0 00-3 3 3 3 0 000 6 3 3 0 003 3v3a3 3 0 006 0v-3a3 3 0 003-3 3 3 0 000-6 3 3 0 00-3-3 3 3 0 00-6 0z"/>',
    '🧭': '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6z"/>',
    '🧮': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v5"/><path d="M4 12h16"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>',
    '🧾': '<path d="M6 2h12v20l-2.5-1.5L13 22l-1.5-1.5L10 22l-2.5-1.5L6 22z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/>',
    '🪪': '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.3"/><path d="M14 10h5"/><path d="M14 14h5"/><path d="M5 17c.5-1.7 1.8-2.5 3-2.5s2.5.8 3 2.5"/>',
    '🥇': '<circle cx="12" cy="15" r="6"/><path d="M12 12l2 3-2 1.5-2-1.5z" fill="currentColor" stroke="none"/><path d="M7 4l3 7M17 4l-3 7"/>',
    '🐞': '<circle cx="12" cy="14" r="7"/><path d="M12 7v3"/><path d="M9 6l1.5 2M15 6l-1.5 2"/><path d="M5 14h3M16 14h3"/><path d="M6 18l2.5-1.5M18 18l-2.5-1.5"/><path d="M12 10v11"/>',
  },

  svg(emoji, opts) {
    const inner = this._MAP[emoji];
    if (!inner) return null; // fallback: pemanggil pakai emoji apa adanya
    const size = (opts && opts.size) || 20;
    return `<svg aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  },

  // Dipakai di titik render: kembalikan SVG kalau ada mapping, kalau tidak
  // fallback ke emoji aslinya apa adanya (tidak pernah kosong/pecah untuk
  // emoji baru yang belum sempat dipetakan).
  render(emoji, opts) {
    return this.svg(emoji, opts) || (emoji || '');
  },
};
