#!/usr/bin/env node
/**
 * scan-duplicate-entries.js
 * Scan SEMUA array-of-object di backup JSON (bukan cuma partsStock),
 * laporkan array mana yang punya entri deep-equal dobel.
 * Read-only — tidak menulis/mengubah apapun, murni laporan.
 *
 * Pakai: node scan-duplicate-entries.js <backup.json>
 */
const fs = require('fs');
const [, , inputPath] = process.argv;
if (!inputPath) {
  console.error('Cara pakai: node scan-duplicate-entries.js <backup.json>');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const findings = [];

function walk(node, path) {
  if (Array.isArray(node)) {
    if (node.length >= 2 && node.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
      const seen = new Map();
      node.forEach((entry, i) => {
        const key = JSON.stringify(entry);
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(i);
      });
      for (const [, idxs] of seen) {
        if (idxs.length > 1) {
          findings.push({ path, count: idxs.length, indices: idxs });
        }
      }
    }
    node.forEach((v, i) => walk(v, `${path}[${i}]`));
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) walk(node[k], path ? `${path}.${k}` : k);
  }
}

walk(data, '');

console.log(`=== Scan duplikat entri di semua array (${inputPath}) ===`);
if (findings.length === 0) {
  console.log('Tidak ada array dengan entri duplikat persis. Bersih.');
} else {
  // Group by top-level array path to avoid noise from nested duplicates already counted
  const byPath = {};
  for (const f of findings) {
    byPath[f.path] = byPath[f.path] || [];
    byPath[f.path].push(f);
  }
  for (const path of Object.keys(byPath)) {
    const groups = byPath[path];
    console.log(`- ${path}: ${groups.length} kelompok duplikat (indeks: ${groups.map(g => g.indices.join('/')).join(', ')})`);
  }
  console.log(`\nTotal: ${Object.keys(byPath).length} lokasi array punya duplikat. Jalankan cleanup manual/skrip khusus per lokasi jika perlu.`);
}
