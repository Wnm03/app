#!/usr/bin/env node
'use strict';
// S2732 — Tautkan 2 log "Gasket Stator Base" ke part katalog 11363KWN900 lewat `catalogPartRefs` (BUKAN serviceComponentId).
// ADDITIVE & idempoten. TIDAK menyentuh partsStock, usedPartId, catalogPartLinkedStockId, biaya, atau teks log.
// Alasan aman stok: pemotongan stok hanya terjadi di jalur simpan/edit-sesi app (Servis.applyStockUsages / replaceStockUsages);
// skrip data ini tidak memanggilnya. Hapus-log mengembalikan stok hanya dari usedPartId/catalogPartLinkedStockId (dibiarkan null).
// Pakai: node scripts/link-gasket-stator-base-part-s2732.js <in.json> <out.json> [--report r.json]
const fs = require('fs'), crypto = require('crypto');
const inp = process.argv[2], out = process.argv[3];
if (!inp || !out) { console.error('Usage: node link-gasket-stator-base-part-s2732.js <in.json> <out.json> [--report r.json]'); process.exit(2); }
const repIdx = process.argv.indexOf('--report'); const repPath = repIdx > 0 ? process.argv[repIdx + 1] : null;
const sha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const sealHash = o => { const c = Object.assign({}, o); delete c._integrity; return sha(JSON.stringify(c)); };

const OEM = '11363KWN900', LOG_IDS = [1782820344534, 1782820344535];
const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
const stockBefore = JSON.stringify(d.partsStock);
const items = (d._vehicleCatalogStore && d._vehicleCatalogStore.items) || [];
const parts = items.filter(p => p && p.oemCode === OEM);
if (parts.length !== 1) { console.error('ABORT: katalog part ' + OEM + ' harus tepat 1, ditemukan ' + parts.length); process.exit(3); }
const catalogId = String(parts[0].id);
const report = { catalogId, oemCode: OEM, linked: [], alreadyLinked: [], missing: [] };

LOG_IDS.forEach(id => {
  const l = (d.servisLogs || []).find(x => x && x.id === id);
  if (!l) { report.missing.push(id); return; }
  if (l.item !== 'Gasket Stator Base') { console.error('ABORT: log ' + id + ' bukan Gasket Stator Base'); process.exit(4); }
  const refs = Array.isArray(l.catalogPartRefs) ? l.catalogPartRefs : [];
  if (refs.some(r => String(r.catalogId) === catalogId)) { report.alreadyLinked.push(id); return; }
  l.catalogPartRefs = refs.concat([{ catalogId, qty: 1 }]);
  report.linked.push(id);
});

if (JSON.stringify(d.partsStock) !== stockBefore) { console.error('ABORT: partsStock berubah (tidak boleh)'); process.exit(5); }
const sealed = Object.assign({}, d); delete sealed._integrity;
sealed._integrity = { algorithm: 'SHA-256', payloadHash: sha(JSON.stringify(sealed)), createdAt: new Date().toISOString() };
fs.writeFileSync(out, JSON.stringify(sealed));
report.partsStockUnchanged = true;
report.outputHashValid = sealHash(sealed) === sealed._integrity.payloadHash;
console.log(JSON.stringify(report, null, 2));
if (repPath) fs.writeFileSync(repPath, JSON.stringify(report, null, 2));
