#!/usr/bin/env node
'use strict';
// S2733 — Merge baris stok kembar (kendaraan + kode part sama). Hanya hapus baris YATIM; baris valid tidak diubah.
// Baris yatim = catId kosong + catalogId tidak ada di katalog + qty 0 + id tidak dirujuk di bagian data mana pun.
// Grup dilewati (tidak disentuh) bila bukan tepat 1 valid + 1 yatim. Idempoten. Baris terhapus disimpan di laporan.
// Pakai: node scripts/merge-duplicate-stock-s2733.js <in.json> <out.json> [--report r.json]
const fs = require('fs'), crypto = require('crypto');
const inp = process.argv[2], out = process.argv[3];
if (!inp || !out) { console.error('Usage: node merge-duplicate-stock-s2733.js <in.json> <out.json> [--report r.json]'); process.exit(2); }
const repIdx = process.argv.indexOf('--report'); const repPath = repIdx > 0 ? process.argv[repIdx + 1] : null;
const sha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const sealHash = o => { const c = Object.assign({}, o); delete c._integrity; return sha(JSON.stringify(c)); };
const norm = c => String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '');

const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
const stock = Array.isArray(d.partsStock) ? d.partsStock : [];
const catalogIds = new Set(((d._vehicleCatalogStore && d._vehicleCatalogStore.items) || []).map(i => String(i && i.id)));
const rest = Object.assign({}, d); delete rest.partsStock; delete rest._integrity;
const restJson = JSON.stringify(rest);
const qtyBefore = stock.reduce((a, r) => a + (Number(r.qty) || 0), 0);

const isOrphan = r => !r.catId && !catalogIds.has(String(r.catalogId)) && !(Number(r.qty) > 0) && !restJson.includes(JSON.stringify(String(r.id)));
const groups = new Map();
stock.forEach(r => { const c = norm(r.code); if (!c) return; const k = r.vehicleId + '|' + c; (groups.get(k) || groups.set(k, []).get(k)).push(r); });

const removeIds = new Set(), report = { groupsFound: 0, removed: [], skipped: [], priceDiffPairs: 0, nameDiffPairs: 0 };
groups.forEach((rows, key) => {
  if (rows.length < 2) return;
  report.groupsFound++;
  const orphans = rows.filter(isOrphan), valid = rows.filter(r => !isOrphan(r));
  if (rows.length === 2 && orphans.length === 1 && valid.length === 1) {
    removeIds.add(orphans[0].id);
    if (Number(orphans[0].price) !== Number(valid[0].price)) report.priceDiffPairs++;
    if (String(orphans[0].name) !== String(valid[0].name)) report.nameDiffPairs++;
    report.removed.push({ key, keptId: valid[0].id, row: orphans[0] });
  } else report.skipped.push({ key, ids: rows.map(r => r.id) });
});

d.partsStock = stock.filter(r => !removeIds.has(r.id));
const qtyAfter = d.partsStock.reduce((a, r) => a + (Number(r.qty) || 0), 0);
if (qtyAfter !== qtyBefore) { console.error('ABORT: total qty berubah'); process.exit(5); }
const sealed = Object.assign({}, d); delete sealed._integrity;
sealed._integrity = { algorithm: 'SHA-256', payloadHash: sha(JSON.stringify(sealed)), createdAt: new Date().toISOString() };
fs.writeFileSync(out, JSON.stringify(sealed));
const summary = { stockBefore: stock.length, stockAfter: d.partsStock.length, groupsMerged: removeIds.size, groupsSkipped: report.skipped.length, priceDiffPairs: report.priceDiffPairs, nameDiffPairs: report.nameDiffPairs, qtyTotalUnchanged: true, outputHashValid: sealHash(sealed) === sealed._integrity.payloadHash };
console.log(JSON.stringify(summary, null, 2));
if (repPath) fs.writeFileSync(repPath, JSON.stringify(Object.assign({ summary }, report), null, 2));
