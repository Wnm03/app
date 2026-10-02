#!/usr/bin/env node
/**
 * S2252 — Bundle-B residency/dependency audit.
 * Read-only: tidak mengubah build manifest atau runtime loading.
 * Tujuan: memberi bukti ukuran/cluster dan memisahkan kandidat lazy-load
 * dari source yang harus dianggap startup/core sampai dependency runtime dibuktikan.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const build = fs.readFileSync(path.join(ROOT, 'scripts/build.js'), 'utf8');
const m = build.match(/const GROUP_B = \[(.*?)\n\];/s);
if (!m) { console.error('S2252: GROUP_B tidak ditemukan'); process.exit(1); }
const files = [...m[1].matchAll(/'([^']+\.js)'/g)].map(x => x[1]);
const duplicate = files.filter((f, i) => files.indexOf(f) !== i);
if (duplicate.length) { console.error('S2252: duplicate GROUP_B:', duplicate.join(', ')); process.exit(1); }
const rows = files.map(file => {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) throw new Error(`source hilang: ${file}`);
  const bytes = fs.statSync(p).size;
  let cluster = 'OTHER';
  if (/self-test|data-health-check/.test(file)) cluster = 'DIAGNOSTIC';
  else if (/ocr|scan|pdf-import|catalog-import/.test(file)) cluster = 'IMPORT-OCR';
  else if (/^ai-chat\.js$|modules\/ai\//.test(file)) cluster = 'AI';
  else if (/backup|gdrive-backup/.test(file)) cluster = 'BACKUP';
  else if (/service-(?:history|session|maintenance|event|checklist)|^modules\/vehicle\/(servis|service|sparepart)/.test(file)) cluster = 'VEHICLE-SERVICE';
  else if (/^modules\/finance\//.test(file)) cluster = 'FINANCE';
  const protectedCore = /(?:sot|repository|database-api|finance-event-outbox|finance-cross-entity-atomic|app-init-runtime|service-runtime-projection)/.test(file);
  return { file, bytes, cluster, protectedCore };
});
const total = rows.reduce((n, r) => n + r.bytes, 0);
const byCluster = {};
for (const r of rows) {
  const x = byCluster[r.cluster] || { files: 0, bytes: 0, protected: 0 };
  x.files++; x.bytes += r.bytes; if (r.protectedCore) x.protected++;
  byCluster[r.cluster] = x;
}
console.log(`S2252 GROUP_B: PASS — files=${rows.length}, sourceBytes=${total}`);
for (const [cluster, v] of Object.entries(byCluster).sort((a,b) => b[1].bytes-a[1].bytes)) {
  console.log(`${cluster}: files=${v.files}, bytes=${v.bytes}, protected=${v.protected}`);
}
console.log('\nTOP 40 SOURCE FILES:');
for (const r of [...rows].sort((a,b)=>b.bytes-a.bytes).slice(0,40)) {
  console.log(`${String(r.bytes).padStart(8)} ${r.protectedCore ? 'PROTECTED' : 'CANDIDATE-REVIEW'} ${r.file}`);
}
console.log('\nDECISION: read-only audit only; no GROUP_B relocation is justified by size alone.');
