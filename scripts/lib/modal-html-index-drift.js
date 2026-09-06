'use strict';
/**
 * modal-html-index-drift.js — logic bersama utk lint "MODAL_HTML index
 * drift" (dicatat di FIX-v982-s320, housekeeping; diupdate SA10a/v1568 &
 * SA10b/v1569).
 *
 * index.html/app_production.html menyuntik tiap modal balik ke posisi
 * aslinya. Sebelum SA10a lewat `<script>document.write(MODAL_HTML[N]);
 * </script><!-- modal:xxx -->` inline; sejak SA10a (eksternalisasi CSP
 * script-src) lewat `<script src="modules/shared/modal-write.js?v=N"
 * data-modal-index="N"></script><!-- modal:xxx -->`. Komentar "modal:xxx"
 * itu CUMA dokumentasi utk manusia -- kalau suatu saat ada modal baru
 * disisipkan di TENGAH array MODAL_HTML di modals.js (bukan di akhir),
 * semua index N sesudahnya geser diam-diam & HTML akan nge-render modal
 * yang SALAH di posisi itu tanpa error apa pun. Lint ini load MODAL_HTML
 * sungguhan lewat vm (bukan re-implementasi manual), lalu pastikan
 * id="..." pada elemen overlay di index N benar-benar sama dgn nama modal
 * di komentarnya.
 *
 * Modul ini dipakai OLEH DUA TEMPAT: `scripts/build.js` (gate blocking saat
 * build) dan `tests/modal-html-index-drift.test.js` (`npm test`) — supaya
 * keduanya selalu mengecek pola yang SAMA persis, tidak bisa diam-diam
 * drift satu sama lain seperti yang sempat terjadi di SA10a (build.js
 * sempat pakai regex lama sementara test-nya sendiri tidak pernah dibuat).
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Kenali KEDUA pola (lama & SA10a) lewat alternation, supaya kalau suatu
// saat ada campuran/rollback parsial pun drift tetap terdeteksi, bukan
// diam-diam berhenti berfungsi.
const WRITE_RE = /(?:document\.write\(MODAL_HTML\[(\d+)\]\);<\/script>|<script\s+src="modules\/shared\/modal-write\.js\?v=\d+"\s+data-modal-index="(\d+)"><\/script>)<!--\s*modal:([a-zA-Z0-9_-]+)/g;

function firstOverlayId(html) {
  const m = html.match(/<div\s+class="overlay"\s+id="([a-zA-Z0-9_-]+)"/);
  return m ? m[1] : null;
}

/**
 * @param {string} rootDir - path absolut ke root project (mis. path.join(__dirname, '..'))
 * @param {string[]} [htmlFiles] - path relatif file HTML yang dicek (default: index.html & app_production.html)
 * @returns {string[]} daftar masalah (kosong = lolos)
 */
function checkModalHtmlIndexDrift(rootDir, htmlFiles) {
  const HTML_FILES = htmlFiles || ['index.html', 'app_production.html'];
  const readFile = (f) => fs.readFileSync(path.join(rootDir, f), 'utf8');

  const modalsSrc = readFile('modules/shared/modals.js');
  const context = {};
  vm.createContext(context);
  vm.runInContext(modalsSrc + '\nthis.__MODAL_HTML__ = MODAL_HTML;', context, { filename: 'modals.js' });
  const MODAL_HTML = context.__MODAL_HTML__;
  if (!Array.isArray(MODAL_HTML)) {
    return ['modules/shared/modals.js — MODAL_HTML tidak ditemukan/bukan array, lint index drift tidak bisa jalan'];
  }

  const problems = [];
  for (const file of HTML_FILES) {
    const content = readFile(file);
    let entriesFound = 0;
    let m;
    WRITE_RE.lastIndex = 0;
    while ((m = WRITE_RE.exec(content)) !== null) {
      entriesFound++;
      const index = Number(m[1] !== undefined ? m[1] : m[2]);
      const commentName = m[3];
      const html = MODAL_HTML[index];
      if (html === undefined) {
        problems.push(`${file} — MODAL_HTML[${index}] di luar jangkauan array (panjang: ${MODAL_HTML.length}), dirujuk sbg "${commentName}"`);
        continue;
      }
      const actual = firstOverlayId(html);
      if (actual !== commentName) {
        problems.push(`${file} — MODAL_HTML[${index}] id sungguhan="${actual}" TIDAK COCOK dgn komentar "<!-- modal:${commentName} -->" (kemungkinan index geser krn ada modal baru disisipkan di tengah array)`);
      }
    }
    if (entriesFound < MODAL_HTML.length - 2) {
      problems.push(`${file} — cuma ${entriesFound} baris document.write(MODAL_HTML[N])/modal-write.js ditemukan, padahal MODAL_HTML punya ${MODAL_HTML.length} elemen (format komentar mungkin berubah, lint ini perlu diupdate)`);
    }
  }
  return problems;
}

module.exports = { checkModalHtmlIndexDrift, WRITE_RE };
