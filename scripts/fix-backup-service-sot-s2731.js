#!/usr/bin/env node
'use strict';
// S2731 — Perbaikan data backup agar nama/identitas servis mengikuti SOT komponen (service-master-data.generated.js).
// Aturan: ADDITIVE & deterministik. Tidak menghapus baris, tidak mengubah id existing, tidak menebak yang ambigu.
// Pakai: node scripts/fix-backup-service-sot-s2731.js <input.json> <output.json> [--report laporan.json]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { SERVICE_CHECKLIST_GROUPS: GROUPS } = require(path.join(__dirname, '..', 'modules/vehicle/service-master-data.generated.js'));

const inp = process.argv[2], out = process.argv[3];
if (!inp || !out) { console.error('Usage: node fix-backup-service-sot-s2731.js <in.json> <out.json> [--report r.json]'); process.exit(2); }
const repIdx = process.argv.indexOf('--report'); const repPath = repIdx > 0 ? process.argv[repIdx + 1] : null;

const sha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const sealHash = o => { const c = Object.assign({}, o); delete c._integrity; return sha(JSON.stringify(c)); };

// Ikon grup: master generated tidak membawa ikon; sumbernya DatabaseAPI.masterCategory (modules/engine/database-api.js).
const ICONS = { 'servis-mesin': '🔧', 'servis-cvt': '🔗', 'sistem-injeksi-pgmfi': '💉', 'sistem-bahan-bakar': '⛽', 'sistem-pendingin': '🌡️', 'sistem-pengereman': '🛑', 'suspensi': '🌀', 'sistem-kemudi': '🎯', 'kelistrikan': '🔌', 'roda': '🛞', 'filter-udara': '🌬️', 'final-gear': '⚙️', 'body-kontrol': '🧰' };
const cat = {}, comp = {};
GROUPS.forEach(g => { cat[g.masterCategoryId] = g; (g.items || []).forEach(it => { comp[it.id] = Object.assign({}, it, { cat: g.masterCategoryId, catName: g.group, catIcon: ICONS[g.masterCategoryId] }); }); });

const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
const report = { inputHashValid: d._integrity ? sealHash(d) === d._integrity.payloadHash : null, changes: {}, skipped: {} };
const add = (k, n = 1) => { report.changes[k] = (report.changes[k] || 0) + n; };

// Keputusan yang SENGAJA tidak disentuh (ambigu / butuh keputusan pemilik data).
const AMBIGUOUS_LOG_IDS = new Set([1783591790535 /* ganti shock belakang */, 1782820344534 /* Gasket Stator Base */, 1786360137081 /* pentil ban */]);

const walk = (o, fn) => { if (Array.isArray(o)) o.forEach(x => walk(x, fn)); else if (o && typeof o === 'object') { fn(o); Object.keys(o).forEach(k => walk(o[k], fn)); } };
const vehById = Object.fromEntries((d.vehicles || []).map(v => [v.id, v]));
const catEntries = id => { const r = (d.sparepartCats || []).filter(c => c.id === id); (d.vehicles || []).forEach(v => ((v.sot && v.sot.serviceCategories) || []).forEach(c => { if (c && c.id === id) r.push(c); })); return r; };

// ---- A. Urai "Sasis & Kaki-Kaki" yang salah terikat ke komponen Aki (akar masalah: infer() substring "kaki" ⊃ "aki") ----
(function untangle() {
  const OLD = 'sp_1787742991500_reko_18', NEW = 'sp_component_aki_veh_1', VID = 'veh_1';
  const oldRow = (d.sparepartCats || []).find(c => c.id === OLD);
  if (!oldRow || oldRow.serviceComponentId !== 'aki') { report.skipped.untangleAki = 'tidak perlu / sudah beres'; return; }
  const aki = comp.aki, body = cat['body-kontrol'];
  // 1) kategori Aki khusus kendaraan (konvensi id: sp_component_<komponen>_<vehicleId>)
  const newCat = { id: NEW, name: aki.name, code: 'AKI', intervalKm: 15000, intervalBulan: 0, masterCategoryId: aki.cat, serviceComponentId: 'aki', showInReminder: true, group: aki.catName, groupIcon: aki.catIcon, vehicleId: VID };
  const insertAfter = (arr, afterId, row) => { if (arr.some(c => c && c.id === row.id && c.vehicleId === row.vehicleId)) return false; const i = arr.findIndex(c => c && c.id === afterId); arr.splice(i < 0 ? arr.length : i + 1, 0, JSON.parse(JSON.stringify(row))); return true; };
  if (insertAfter(d.sparepartCats, OLD, newCat)) add('kategori Aki veh_1 dibuat (sparepartCats)');
  const v = vehById[VID];
  if (v && v.sot && Array.isArray(v.sot.serviceCategories) && insertAfter(v.sot.serviceCategories, OLD, newCat)) add('kategori Aki veh_1 dibuat (vehicle.sot.serviceCategories)');
  // 2) pindahkan semua referensi AKI dari OLD -> NEW (hanya objek yang komponennya 'aki')
  const repoint = root => walk(root, o => { if (o.categoryId === OLD && o.serviceComponentId === 'aki') { o.categoryId = NEW; add('referensi Aki dipindah ke kategori Aki'); } });
  repoint(d.servisLogs); if (v && v.sot) repoint(v.sot);
  // 3) OLD = kategori Body & Kontrol tanpa komponen kanonik (kaki-kaki bukan komponen SOT tunggal)
  catEntries(OLD).forEach(c => { delete c.serviceComponentId; c.masterCategoryId = body.masterCategoryId; c.group = body.group; c.groupIcon = ICONS['body-kontrol']; add('Sasis & Kaki-Kaki -> Body & Kontrol'); });
})();

// ---- B. Isi serviceComponentId pada kategori yang namanya persis komponen SOT ----
const EXACT = { 'pembersihan rumah cvt': 'pembersihan-rumah-cvt', 'kampas rem depan': 'kampas-rem-depan', 'oli gardan/final drive': 'oli-gardan' };
(d.sparepartCats || []).forEach(c => {
  if (c.serviceComponentId) return;
  const id = EXACT[String(c.name || '').trim().toLowerCase()]; const k = id && comp[id]; if (!k) return;
  c.serviceComponentId = id; c.masterCategoryId = k.cat; c.group = k.catName; c.groupIcon = k.catIcon; add('kategori diberi serviceComponentId');
});

// ---- C. Judul grup basi pada kategori yang komponennya sudah valid ----
catEntries; (d.sparepartCats || []).concat(...(d.vehicles || []).map(v => (v.sot && v.sot.serviceCategories) || [])).forEach(c => {
  const k = c && c.serviceComponentId && comp[c.serviceComponentId]; if (!k) return;
  if (c.group && c.group !== k.catName) { c.group = k.catName; c.groupIcon = k.catIcon; add('group basi diselaraskan'); }
});

// ---- D. Log servis: snapshot nama kanonik (teks `item` asli TIDAK diubah) + categoryId yang kosong/yatim ----
const catIds = new Set((d.sparepartCats || []).map(c => c.id));
(d.servisLogs || []).forEach(l => {
  const k = l.serviceComponentId && comp[l.serviceComponentId]; if (!k || AMBIGUOUS_LOG_IDS.has(l.id)) return;
  if (l.item !== k.name && !l.serviceComponentNameSnapshot) { l.serviceComponentNameSnapshot = k.name; add('log: serviceComponentNameSnapshot ditambah'); }
  if (!l.categoryId || !catIds.has(l.categoryId)) {
    const cands = [...new Set((d.sparepartCats || []).filter(c => c.serviceComponentId === l.serviceComponentId && c.vehicleId === l.vehicleId).map(c => c.id))];
    if (cands.length === 1) {
      const was = l.categoryId || null; l.categoryId = cands[0]; add(was ? 'log: categoryId yatim diperbaiki' : 'log: categoryId kosong diisi');
      (l.checklist || []).forEach(ch => { if ((ch.serviceComponentId || ch.itemId) === l.serviceComponentId && (!ch.categoryId || !catIds.has(ch.categoryId))) ch.categoryId = cands[0]; });
      (d.vehicles || []).forEach(v => v.sot && walk(v.sot, o => { if (o.id === l.id && typeof o.item === 'string' && o.categoryId === was) o.categoryId = cands[0]; }));
    } else report.skipped['log tanpa kandidat kategori unik'] = (report.skipped['log tanpa kandidat kategori unik'] || 0) + 1;
  }
});

// ---- E. Keputusan pemilik data (S2731.1): pemetaan log yang disetujui. Idempoten. ----
const DECISIONS = {
  1782820344525: 'slide-piece-cvt', 1782820344567: 'slide-piece-cvt',   // Slidepiece
  1783591790533: 'driven-face-cvt',                                     // Pully (sama dgn log Pully lain)
  1782820344537: 'kruk-as-bearing',                                     // Seal Kruk As
  1782820344538: 'piston-ring',                                         // Korter Piston
  1783591790535: 'shock-belakang',                                      // ganti shock belakang (tindakan = ganti)
  // S2731.2 — penjelasan pemilik data:
  1782971607738: 'pelumasan-cvt-grease',                                // Grmuk cvt = gemuk/grease pin pully belakang
  1782820344573: 'pembersihan-rumah-cvt', 1782820344607: 'pembersihan-rumah-cvt', 1783591790538: 'pembersihan-rumah-cvt', // Servis Cvt = pembersihan CVT
  1783591790594: 'driven-face-cvt',                                     // Tutup Pully = tutup pin pully belakang CVT
  // S2731.3 — Seal Head = packing/gasket tutup head (part 12391-KZR-600), master baru gasket-tutup-head:
  1783591790532: 'gasket-tutup-head'
};
(d.servisLogs || []).forEach(l => {
  const target = DECISIONS[l.id]; const k = target && comp[target];
  if (!k || l.serviceComponentId === target) return;
  const was = l.categoryId || null;
  l.serviceComponentId = target; l.masterCategoryId = k.cat;
  if (l.item !== k.name) l.serviceComponentNameSnapshot = k.name;
  const cands = [...new Set((d.sparepartCats || []).filter(c => c.serviceComponentId === target && c.vehicleId === l.vehicleId).map(c => c.id))];
  if (cands.length === 1) l.categoryId = cands[0];
  (d.vehicles || []).forEach(v => v.sot && walk(v.sot, o => { if (o.id === l.id && typeof o.item === 'string') { o.serviceComponentId = target; o.masterCategoryId = k.cat; if (cands.length === 1 && o.categoryId === was) o.categoryId = cands[0]; } }));
  add('keputusan: log dipetakan ke komponen SOT');
});
// ---- E2. S2731.3: alias ID komponen -> ID kanonik (kabel-rem-belakang-body -> kabel-rem-belakang). Idempoten; 0 perubahan bila tak ada referensi lama. ----
const ID_ALIASES = require(path.join(__dirname, '..', 'modules/vehicle/service-master-data.generated.js')).SERVICE_COMPONENT_ID_ALIASES || {};
walk(d, o => { if (typeof o.serviceComponentId === 'string' && ID_ALIASES[o.serviceComponentId]) { o.serviceComponentId = ID_ALIASES[o.serviceComponentId]; add('alias komponen -> ID kanonik'); } });
// "Gasket Stator Base" (1782820344534): salah terpetakan ke Cylinder & Gasket; samakan dgn log kembarannya (1782820344535): tanpa komponen, tetap Servis Mesin.
(d.servisLogs || []).forEach(l => {
  if (l.id !== 1782820344534 || l.serviceComponentId !== 'cylinder-gasket') return;
  delete l.serviceComponentId; l.masterCategoryId = 'servis-mesin'; l.checklist = []; delete l.serviceComponentNameSnapshot;
  (d.vehicles || []).forEach(v => v.sot && walk(v.sot, o => { if (o.id === l.id && typeof o.item === 'string') { delete o.serviceComponentId; o.checklist = []; } }));
  add('keputusan: Gasket Stator Base dilepas dari komponen salah');
});

// ---- Segel ulang checksum (algoritma sama dgn sealBackupPayload) ----
const sealed = Object.assign({}, d); delete sealed._integrity;
sealed._integrity = { algorithm: 'SHA-256', payloadHash: sha(JSON.stringify(sealed)), createdAt: new Date().toISOString() };
fs.writeFileSync(out, JSON.stringify(sealed));
report.outputHashValid = sealHash(sealed) === sealed._integrity.payloadHash;
console.log(JSON.stringify(report, null, 2));
if (repPath) fs.writeFileSync(repPath, JSON.stringify(report, null, 2));
