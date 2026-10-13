#!/usr/bin/env node
'use strict';
// S2433.3 (AUDIT READ-ONLY): populasi jenis vs vehicleType pada backup JSON Anda.
// Pemakaian: node audit-populasi-jenis-vehicletype.js <backup.json>
// Tidak menulis apa pun: hanya membaca file & mencetak ringkasan. Tidak memodifikasi backup.
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('Pemakaian: node audit-populasi-jenis-vehicletype.js <backup.json>'); process.exit(2); }
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const vehicles = Array.isArray(raw) ? raw : Array.isArray(raw.vehicles) ? raw.vehicles : (raw.D && Array.isArray(raw.D.vehicles) ? raw.D.vehicles : null);
if (!vehicles) { console.error('Tidak menemukan array kendaraan (vehicles / D.vehicles).'); process.exit(2); }
const n = (x) => { const t = String(x == null ? '' : x).trim().toLowerCase(); return t || null; };
const KNOWN = new Set(['motor', 'mobil', 'listrik']);
const cat = { total: 0, hanyaJenis: [], hanyaVehicleType: [], keduanyaSama: [], keduanyaBeda: [], tanpaKeduanya: [] };
const flags = { jenisTakDikenal: [], vehicleTypeTakDikenal: [], snapshotBeda: [], snapshotAda_tanpaTipe: [], tampilSalahDiShopTorsi: [], jenisListrik: [], punyaModelId: [] };
const row = (v) => ({ id: v && v.id, nama: v && v.name, jenis: n(v && v.jenis), vehicleType: n(v && v.vehicleType), sot: n(v && v.sot && v.sot.vehicleType), modelId: (v && v.modelId) || null });
for (const v of vehicles) {
  if (!v || typeof v !== 'object') continue;
  cat.total++; const r = row(v);
  if (r.jenis && r.vehicleType) (r.jenis === r.vehicleType ? cat.keduanyaSama : cat.keduanyaBeda).push(r);
  else if (r.jenis) cat.hanyaJenis.push(r); else if (r.vehicleType) cat.hanyaVehicleType.push(r); else cat.tanpaKeduanya.push(r);
  if (r.jenis && !KNOWN.has(r.jenis)) flags.jenisTakDikenal.push(r);
  if (r.vehicleType && !KNOWN.has(r.vehicleType)) flags.vehicleTypeTakDikenal.push(r);
  const efektif = r.vehicleType || r.jenis; // urutan yang dipakai audit SOT Car Notes
  if (r.sot && efektif && r.sot !== efektif) flags.snapshotBeda.push(r);
  if (r.sot && !efektif) flags.snapshotAda_tanpaTipe.push(r);
  if (!r.jenis && r.vehicleType && r.vehicleType !== 'motor') flags.tampilSalahDiShopTorsi.push(r); // Shop-Katalog/Torsi: jenis||'motor'
  if (r.jenis && r.vehicleType && r.jenis !== r.vehicleType && (r.jenis === 'motor' || r.jenis === 'mobil') && (r.vehicleType === 'motor' || r.vehicleType === 'mobil')) { /* konflik motor/mobil nyata: proyeksi S2433 membaca jenis, SOT lain membaca vehicleType */ }
  if (r.jenis === 'listrik') flags.jenisListrik.push(r);
  if (r.modelId) flags.punyaModelId.push(r);
}
const konflikMotorMobil = cat.keduanyaBeda.filter((r) => ['motor', 'mobil'].includes(r.jenis) && ['motor', 'mobil'].includes(r.vehicleType));
const out = {
  totalKendaraan: cat.total,
  sebaran: { hanyaJenis: cat.hanyaJenis.length, hanyaVehicleType: cat.hanyaVehicleType.length, keduanyaSama: cat.keduanyaSama.length, keduanyaBeda: cat.keduanyaBeda.length, tanpaKeduanya: cat.tanpaKeduanya.length },
  konflikMotorMobilNyata: konflikMotorMobil.length,
  catatan: 'jenis=listrik vs vehicleType=mobil/motor dihitung sebagai "beda" tetapi BELUM tentu konflik domain (konsep berbeda); lihat daftar terpisah.',
  bendera: Object.fromEntries(Object.entries(flags).map(([k, a]) => [k, a.length])),
  rincian: { konflikMotorMobil, keduanyaBedaLainnya: cat.keduanyaBeda.filter((r) => !konflikMotorMobil.includes(r)), snapshotBeda: flags.snapshotBeda, tampilSalahDiShopTorsi: flags.tampilSalahDiShopTorsi, jenisTakDikenal: flags.jenisTakDikenal, vehicleTypeTakDikenal: flags.vehicleTypeTakDikenal }
};
console.log(JSON.stringify(out, null, 2));
