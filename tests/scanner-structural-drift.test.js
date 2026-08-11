'use strict';
/**
 * scanner-structural-drift.test.js — Housekeeping (dicatat di audit
 * AUDIT_BUG_PIN_BARCODE_2_SESI_CLAUDE_SESI2_HASIL.md, saran #2, dan
 * docs/architecture/ADR-028.md).
 *
 * Latar belakang:
 * `modules/vehicle/vehicle-scanner.js` & `modules/vehicle/sparepart-scanner.js`
 * SENGAJA duplikasi total pola lifecycle kamera (pauseCamera/resumeCamera/
 * attachLifecycle/stopMediaStream/timeout/debounce/dkk) — lihat ADR-028 utk
 * alasan isolasi risiko antar scanner. Tapi duplikasi yang disengaja ini
 * berarti kalau salah satu file diperbaiki (mis. tambah parameter baru ke
 * pauseCamera() saat memperbaiki bug), TIDAK ADA yang otomatis menangkap
 * kalau file satunya lupa disamakan — keduanya sama-sama valid secara
 * sintaks walau sudah divergen diam-diam.
 *
 * Test ini generik: parse nama fungsi "kembar" (nama sama minus prefix
 * VehicleScanner/SparepartScanner) di kedua file lewat regex terhadap
 * source ASLI (bukan re-implementasi manual), lalu pastikan tiap fungsi
 * kembar yang terdaftar di SCANNER_TWIN_FN_SUFFIXES ada di KEDUA file
 * dengan jumlah parameter yang sama.
 *
 * Lint versi build.js (berhenti otomatis saat `npm run build`) ada di
 * scripts/build.js -> lintScannerStructuralDrift().
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = {
  vehicleScanner: path.join('modules', 'vehicle', 'vehicle-scanner.js'),
  sparepartScanner: path.join('modules', 'vehicle', 'sparepart-scanner.js'),
};

// Sama persis dgn daftar di scripts/build.js (SCANNER_TWIN_FN_SUFFIXES) —
// kalau perlu diubah, ubah dua-duanya sekaligus & jelaskan alasannya di
// commit/CHANGELOG, karena daftar ini sendiri adalah kontrak yang
// disengaja, bukan hasil deteksi otomatis.
const SCANNER_TWIN_FN_SUFFIXES = [
  'WithCameraTimeout',
  'ShouldDebounce',
  'RecordScan',
  'StopMediaStream',
  'PauseCamera',
  'ResumeCamera',
  'AttachLifecycle',
  'DetachLifecycle',
  'ApplyTorchCapability',
  'IsHarmlessDecodeError',
  'BuildOverlay',
  'ErrorMessage',
];

function parseFunctions(prefix, relPath) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const fnRe = new RegExp(`(?:^|\\n)(?:async )?function ${prefix}([A-Za-z]+)\\(([^)]*)\\)`, 'g');
  const found = {};
  let m;
  while ((m = fnRe.exec(content)) !== null) {
    const suffix = m[1];
    const params = m[2].trim();
    found[suffix] = params === '' ? 0 : params.split(',').length;
  }
  return found;
}

const vehicleFns = parseFunctions('vehicleScanner', FILES.vehicleScanner);
const sparepartFns = parseFunctions('sparepartScanner', FILES.sparepartScanner);

test('sanity: parser regex ini benar-benar menemukan fungsi di kedua file (bukan false-negative)', () => {
  assert.ok(
    Object.keys(vehicleFns).length >= 10,
    `Cuma ${Object.keys(vehicleFns).length} fungsi vehicleScanner* ditemukan — kemungkinan regex parser test ini perlu diupdate mengikuti perubahan gaya kode di ${FILES.vehicleScanner}`
  );
  assert.ok(
    Object.keys(sparepartFns).length >= 10,
    `Cuma ${Object.keys(sparepartFns).length} fungsi sparepartScanner* ditemukan — kemungkinan regex parser test ini perlu diupdate mengikuti perubahan gaya kode di ${FILES.sparepartScanner}`
  );
});

for (const suffix of SCANNER_TWIN_FN_SUFFIXES) {
  test(`fungsi kembar "${suffix}": ada di kedua file dengan jumlah parameter yang sama`, () => {
    const a = vehicleFns[suffix];
    const b = sparepartFns[suffix];
    assert.notEqual(a, undefined, `vehicleScanner${suffix}() tidak ditemukan di ${FILES.vehicleScanner}`);
    assert.notEqual(b, undefined, `sparepartScanner${suffix}() tidak ditemukan di ${FILES.sparepartScanner}`);
    assert.equal(
      a,
      b,
      `Jumlah parameter berbeda: vehicleScanner${suffix}(${a} param) vs sparepartScanner${suffix}(${b} param) — kemungkinan salah satu diubah tanpa menyamakan yang lain`
    );
  });
}
