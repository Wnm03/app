#!/usr/bin/env node
'use strict';
/**
 * S2433.1 — metadata kompatibilitas komponen servis (ADITIF & IDEMPOTEN).
 * Menambah field opsional ke data/database-kategori-komponen-servis.json:
 *   vehicleTypeScope : ['motor'|'mobil'|...] | null  (null = tidak membatasi tipe)
 *   bodyTypeScope    : ['matic'|...] | null          (opsional, hanya jika tipe sudah cocok)
 *   modelScope       : [modelId,...] | null          (opsional; belum dipakai item mana pun)
 *   universal        : true | false                  (true = terkonfirmasi berlaku lintas tipe)
 *   scopeStatus      : 'confirmed' | 'unverified'
 * Tidak menghapus/mengubah item, id, kategori, atau field lama. Item 'unverified'
 * TIDAK dianggap universal dan TIDAK disembunyikan (tetap tampil + diberi penanda).
 */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'database-kategori-komponen-servis.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const MOTOR = ['motor'];
const MATIC = ['matic'];
// Komponen khusus motor (terminologi/komponen tidak ada pada mobil)
const MOTOR_ONLY = new Set([
  'rantai-keteng-tensioner',
  'oli-shockbreaker', 'seal-shock-depan', 'dust-seal-shock-depan',
  'bushing-swingarm', 'bearing-swingarm',
  'stel-grease-komstir', 'bearing-komstir', 'race-komstir',
  'acg-starter', 'generator-stator',
  'standar-tengah-samping'
]);
// Khusus motor matic (grup Servis CVT: 18 komponen)
const MATIC_ONLY_GROUP = 'servis-cvt';
// Belum bisa dipastikan kompatibilitasnya -> tampil untuk semua, ditandai unverified
const UNVERIFIED = new Set([
  'filter-kawat-oli-mesin',      // oil strainer: umum di motor, ada varian di mobil
  'tromol-rem-belakang',         // tromol ada di motor & sebagian mobil
  'kabel-rem-belakang', 'kabel-rem-belakang-body', // kabel rem: motor / rem parkir mobil
  'shock-belakang',              // rear cushion (motor) vs shock mobil
  'gear-final-drive', 'drive-shaft', 'countershaft',
  'bearing-final-gear', 'oil-seal-final-gear', 'gasket-transmission-case',
  'kabel-gas-standar-kunci',     // komposit: memuat standar (motor) + kunci kontak (universal)
  'kabel-gas'                    // kabel gas: tidak ada pada throttle drive-by-wire
]);

let stats = { motor: 0, matic: 0, universal: 0, unverified: 0 };
for (const c of data.components) {
  let scope;
  if (c.masterCategoryId === MATIC_ONLY_GROUP) {
    scope = { vehicleTypeScope: MOTOR.slice(), bodyTypeScope: MATIC.slice(), modelScope: null, universal: false, scopeStatus: 'confirmed' };
    stats.matic++;
  } else if (MOTOR_ONLY.has(c.componentId)) {
    scope = { vehicleTypeScope: MOTOR.slice(), bodyTypeScope: null, modelScope: null, universal: false, scopeStatus: 'confirmed' };
    stats.motor++;
  } else if (UNVERIFIED.has(c.componentId)) {
    scope = { vehicleTypeScope: null, bodyTypeScope: null, modelScope: null, universal: false, scopeStatus: 'unverified' };
    stats.unverified++;
  } else {
    scope = { vehicleTypeScope: null, bodyTypeScope: null, modelScope: null, universal: true, scopeStatus: 'confirmed' };
    stats.universal++;
  }
  Object.assign(c, scope);
}
const ids = new Set(data.components.map(c => c.componentId));
for (const id of [...MOTOR_ONLY, ...UNVERIFIED]) if (!ids.has(id)) throw new Error('componentId tidak ada di master: ' + id);
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('S2433.1 scope applied', JSON.stringify(stats), 'total', data.components.length);
