'use strict';
// scripts/build-preview.js — bikin 1 file HTML self-contained (semua JS
// di-inline langsung, tidak ada <script src="...">) dari index.html, supaya
// bisa dibuka/di-preview langsung tanpa server statis (mis. sbg artifact).
// TIDAK dipanggil otomatis dari build.js/npm run check -- ini murni
// tooling preview, dijalankan manual: `node scripts/build-preview.js`.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'index.html');
const OUT_HTML = path.join(ROOT, 'keluarga-w-preview.html');

// Urutan HARUS sama dgn urutan <script src=...> di index.html.
const INLINE_FILES = ['app-bundle-a.min.js', 'modules/shared/smoke-test.js', 'app-bundle-b.min.js'];

// CSS juga WAJIB di-inline (bukan cuma JS) -- kalau tidak, preview yang
// dibuka sbg file standalone/artifact (bukan diserver dari folder proyek)
// tidak bisa fetch "styles.css"/"modern-ui-layer.css" krn tidak ada base
// path relatif yg valid, jadi tampil polos tanpa styling sama sekali
// (BUG yg ditemukan manual dari screenshot preview tanpa CSS, 2026-07-17).
// Urutan HARUS sama dgn urutan <link rel="stylesheet" href=...> di index.html.
const INLINE_CSS_FILES = ['styles.css', 'modern-ui-layer.css'];

function main() {
  let html = fs.readFileSync(SRC_HTML, 'utf8');
  let count = 0;

  for (const file of INLINE_CSS_FILES) {
    const cssPath = path.join(ROOT, file);
    const css = fs.readFileSync(cssPath, 'utf8');
    // Cocokkan <link rel="stylesheet" href="FILE?v=NNN"> apa pun atribut lainnya/urutan atribut.
    const re = new RegExp(`<link rel="stylesheet" href="${file.replace(/\./g, '\\.')}\\?v=\\d+">`);
    if (!re.test(html)) {
      throw new Error(`build-preview: tag <link rel="stylesheet" href="${file}?v=..."> tidak ditemukan di index.html`);
    }
    // PENTING: pakai replacer FUNGSI (bukan string) -- kalau replacement
    // adalah string, JS men-treat pola khusus di dalamnya (mis. $&, $`, $',
    // $1) sebagai substitusi pattern, BUKAN teks literal. CSS/JS yang
    // di-inline sering mengandung sekuens seperti itu secara kebetulan
    // (mis. dari kode regex-escaping `'\\'+...` atau semacamnya), yang
    // kalau lolos ke replace() akan meng-corrupt HTML hasil build TANPA
    // ada error apa pun saat build -- baru ketahuan sbg SyntaxError aneh
    // pas file HTML dibuka di browser (BUG ditemukan manual, 2026-07-21,
    // gejala: tombol/aksi apa pun tidak merespons krn <script> jadi tidak
    // valid & gagal total dieksekusi).
    html = html.replace(re, () => `<style>\n${css}\n</style>`);
    count++;
  }

  for (const file of INLINE_FILES) {
    const jsPath = path.join(ROOT, file);
    const js = fs.readFileSync(jsPath, 'utf8');
    // Cocokkan <script src="FILE?v=NNN" ...></script> apa pun atribut lainnya (onerror/defer).
    const re = new RegExp(`<script src="${file.replace(/\./g, '\\.')}\\?v=\\d+"[^>]*></script>`);
    if (!re.test(html)) {
      throw new Error(`build-preview: tag <script src="${file}?v=..."> tidak ditemukan di index.html`);
    }
    // Replacer fungsi -- lihat catatan PENTING di atas (blok CSS).
    html = html.replace(re, () => `<script>\n${js}\n</script>`);
    count++;
  }
  fs.writeFileSync(OUT_HTML, html, 'utf8');
  console.log(`✓ ${OUT_HTML} ditulis (${count} file di-inline: ${INLINE_CSS_FILES.concat(INLINE_FILES).join(', ')})`);
}

main();
