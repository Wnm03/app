#!/usr/bin/env node
'use strict';
// S2708 — apply-check: pemeriksaan BACA-SAJA sebelum overlay patch dipasang.
// Membandingkan SHA-256 tiap file di folder tujuan dengan BASELINE-HASHES.json yang dibawa patch:
//   - sama dengan baseline  -> aman ditimpa
//   - sama dengan patch     -> sudah terpasang
//   - selain itu            -> KONFLIK (file diubah di luar rantai; overlay akan menimpanya)
//   - file baru yang sudah ada dengan isi berbeda -> KONFLIK
// Juga memeriksa isi folder patch cocok dengan hash patch (patch tidak rusak/terpotong).
// Tidak pernah menulis/mengubah file apa pun. Exit 0 = aman, 1 = ada konflik/hilang/rusak, 2 = salah pakai.
// Pakai:  node scripts/apply-check.js <folder-aplikasi-tujuan> [--patch-dir <folder-patch>]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function check(patchDir, targetDir) {
  const mp = path.join(patchDir, 'BASELINE-HASHES.json');
  if (!fs.existsSync(mp)) throw new Error('BASELINE-HASHES.json tidak ditemukan di ' + patchDir);
  const manifest = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const same = path.resolve(patchDir) === path.resolve(targetDir);
  const r = { patch: manifest.patch || '', ok: [], applied: [], newOk: [], conflict: [], missing: [], corrupt: [] };
  for (const [rel, e] of Object.entries(manifest.files || {})) {
    if (!same) {
      const pf = path.join(patchDir, rel);
      if (!fs.existsSync(pf) || sha(pf) !== e.patch) { r.corrupt.push(rel); continue; }
    }
    const t = path.join(targetDir, rel);
    const exists = fs.existsSync(t);
    if (e.baseline === null) {
      if (!exists) r.newOk.push(rel);
      else if (sha(t) === e.patch) r.applied.push(rel);
      else r.conflict.push({ rel, reason: 'file baru sudah ada dengan isi berbeda' });
      continue;
    }
    if (!exists) { r.missing.push(rel); continue; }
    const h = sha(t);
    if (h === e.baseline) r.ok.push(rel);
    else if (h === e.patch) r.applied.push(rel);
    else r.conflict.push({ rel, reason: 'berbeda dari baseline dan patch (diubah di luar rantai?)' });
  }
  r.safe = !r.conflict.length && !r.missing.length && !r.corrupt.length;
  return r;
}

function main(argv) {
  const args = argv.slice(2);
  let patchDir = path.resolve(__dirname, '..'), target = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--patch-dir') patchDir = path.resolve(args[++i] || '');
    else if (!target) target = path.resolve(args[i]);
  }
  if (!target) { console.error('Pakai: node scripts/apply-check.js <folder-aplikasi-tujuan> [--patch-dir <folder-patch>]'); return 2; }
  let r;
  try { r = check(patchDir, target); } catch (e) { console.error('✗ ' + e.message); return 2; }
  console.log('apply-check ' + r.patch + ' → ' + target);
  console.log('  siap ditimpa (sama baseline) : ' + r.ok.length);
  console.log('  file baru (belum ada)        : ' + r.newOk.length);
  console.log('  sudah terpasang              : ' + r.applied.length);
  r.conflict.forEach((c) => console.log('  ✗ KONFLIK ' + c.rel + ' — ' + c.reason));
  r.missing.forEach((f) => console.log('  ✗ HILANG di tujuan (seharusnya ada di baseline): ' + f));
  r.corrupt.forEach((f) => console.log('  ✗ PATCH RUSAK/TIDAK LENGKAP: ' + f));
  console.log(r.safe ? '✅ Aman dipasang (tidak ada file yang akan menimpa perubahan lain).' : '⛔ JANGAN pasang dulu — selesaikan item ✗ di atas.');
  return r.safe ? 0 : 1;
}

if (require.main === module) process.exit(main(process.argv));
module.exports = { check, main };
