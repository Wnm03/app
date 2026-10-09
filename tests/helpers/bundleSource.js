'use strict';
// S2552: teks bundle TANPA minify untuk tes yang mencocokkan pola source.
//
// Bundle terkirim (app-bundle-{a,b}.min.js) = esbuild.minify(group.map(readFile).join('\n')).
// Identifier diganti dan komentar dibuang, sehingga regex bergaya source tidak cocok.
// Helper ini menyusun ulang teks gabungan yang SAMA (tanpa minify) dan menolak
// dipakai jika bundle terkirim sudah tidak berasal dari source saat ini
// (hash marker). Kesamaan byte-per-byte dengan esbuild dijaga oleh
// tests/s2552-bundle-source-parity-gate.test.js. Tidak mengubah kode produksi.
const fs = require('node:fs');
const path = require('node:path');
const { computeGroupHash, extractEmbeddedHash } = require('../../scripts/bundle-hash');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFS = { a: ['GROUP_A', 'app-bundle-a.min.js'], b: ['GROUP_B', 'app-bundle-b.min.js'] };
const cache = {};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function groupFiles(name) {
  const [constName] = DEFS[name];
  const m = read('scripts/build.js').match(new RegExp(`const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`const ${constName} tidak ditemukan di scripts/build.js`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function shipped(name) { return read(DEFS[name][1]); }

function source(name) {
  if (!DEFS[name]) throw new Error(`bundle tidak dikenal: ${name}`);
  if (cache[name]) return cache[name];
  const files = groupFiles(name);
  const hash = computeGroupHash(files, read);
  const embedded = extractEmbeddedHash(shipped(name));
  if (embedded !== hash) {
    throw new Error(`${DEFS[name][1]} basi terhadap source (marker ${embedded} != ${hash}); jalankan node scripts/build.js`);
  }
  return (cache[name] = files.map(read).join('\n'));
}

module.exports = { source, shipped, groupFiles, ROOT };
