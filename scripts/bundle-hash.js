'use strict';
// scripts/bundle-hash.js — helper kecil dipakai bareng oleh build.js (nulis
// marker hash) & verify-bundle-freshness.js (verifikasi marker, TANPA
// nge-build ulang). Dipisah dari build.js supaya verify-bundle-freshness.js
// bisa jalan ringan (tidak perlu import seluruh build.js) di CI/pre-deploy.
const crypto = require('crypto');

const MARKER_PREFIX = '// __BUNDLE_SRC_HASH__:';

// Hash SHA-256 dari gabungan isi file source (urutan & isi persis sama
// dengan cara buildBundle() menggabungkan `group.map(readFile).join('\n')`)
// — kalau SATU KARAKTER saja berubah di source manapun dalam grup itu,
// hash berubah, ketahuan tanpa perlu build ulang / minify ulang.
function computeGroupHash(group, readFile) {
  const combined = group.map(readFile).join('\n');
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex').slice(0, 16);
}

function markerLine(hash) {
  return `${MARKER_PREFIX}${hash}\n`;
}

// Ambil hash yang tertanam di baris pertama bundle hasil build. null kalau
// bundle belum pernah dibangun dgn marker ini (build lama sebelum s365, atau
// file tidak ada / rusak).
function extractEmbeddedHash(bundleContent) {
  const firstLine = bundleContent.split('\n', 1)[0] || '';
  if (!firstLine.startsWith(MARKER_PREFIX)) return null;
  return firstLine.slice(MARKER_PREFIX.length).trim();
}

module.exports = { computeGroupHash, markerLine, extractEmbeddedHash, MARKER_PREFIX };
