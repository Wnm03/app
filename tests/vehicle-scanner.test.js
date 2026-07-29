'use strict';
// tests/vehicle-scanner.test.js — cakupan modules/vehicle/vehicle-scanner.js
// Hanya bagian LOGIC MURNI (vehicleScannerErrorMessage, vehicleScannerBuildHints)
// yang dites di sini — bagian kamera/decode fullscreen live-video
// (vehicleScannerScan, vehicleScannerBuildOverlay) butuh DOM/MediaStream/ZXing
// asli browser, sama seperti scanKmOdometer dkk di scan-ocr.js TIDAK dites
// lewat harness node:vm ini (lihat catatan di tests/scan-ocr-wallet.test.js —
// hanya parseWalletScreen() yang murni logic yang dites, bukan scan
// trigger-nya). Konsisten dengan pola existing, bukan lubang baru.
//
// vehicleScannerBuildHints() dites dgn stub ZXing minimal (bukan library asli
// dari CDN) — cukup untuk memverifikasi format yang di-request (Barcode/QR/
// DataMatrix) tanpa butuh browser/network.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ZXING_STUB = {
  DecodeHintType: { POSSIBLE_FORMATS: 'POSSIBLE_FORMATS', TRY_HARDER: 'TRY_HARDER' },
  BarcodeFormat: {
    QR_CODE: 'QR_CODE', DATA_MATRIX: 'DATA_MATRIX', CODE_128: 'CODE_128',
    CODE_39: 'CODE_39', EAN_13: 'EAN_13', EAN_8: 'EAN_8', UPC_A: 'UPC_A',
    UPC_E: 'UPC_E', ITF: 'ITF', CODABAR: 'CODABAR',
  },
};

function makeCtx() {
  return loadSource(
    ['modules/vehicle/vehicle-scanner.js'],
    { _loadScriptOnce: () => Promise.resolve(), toast: () => {}, ZXing: ZXING_STUB },
    ['vehicleScannerErrorMessage', 'vehicleScannerBuildHints']
  );
}

test('vehicleScannerBuildHints() — QR Code diaktifkan', () => {
  const ctx = makeCtx();
  const hints = ctx.vehicleScannerBuildHints();
  const formats = hints.get('POSSIBLE_FORMATS');
  assert.ok(formats.includes('QR_CODE'));
});

test('vehicleScannerBuildHints() — DataMatrix diaktifkan eksplisit (tidak default di ZXing)', () => {
  const ctx = makeCtx();
  const hints = ctx.vehicleScannerBuildHints();
  const formats = hints.get('POSSIBLE_FORMATS');
  assert.ok(formats.includes('DATA_MATRIX'));
});

test('vehicleScannerBuildHints() — Barcode 1D umum diaktifkan (mis. CODE_128, EAN_13)', () => {
  const ctx = makeCtx();
  const hints = ctx.vehicleScannerBuildHints();
  const formats = hints.get('POSSIBLE_FORMATS');
  assert.ok(formats.includes('CODE_128'));
  assert.ok(formats.includes('EAN_13'));
});

test('vehicleScannerBuildHints() — TRY_HARDER diaktifkan utk akurasi scan live', () => {
  const ctx = makeCtx();
  const hints = ctx.vehicleScannerBuildHints();
  assert.equal(hints.get('TRY_HARDER'), true);
});

test('vehicleScannerErrorMessage() — error jaringan dikasih pesan jelas', () => {
  const ctx = makeCtx();
  const msg = ctx.vehicleScannerErrorMessage(new Error('failed to fetch'));
  assert.match(msg, /koneksi internet/);
});

test('vehicleScannerErrorMessage() — NotFoundException (kode tidak terdeteksi) dikasih pesan jelas', () => {
  const ctx = makeCtx();
  const msg = ctx.vehicleScannerErrorMessage({ message: 'NotFoundException: No code found' });
  assert.match(msg, /tidak terdeteksi/);
});

test('vehicleScannerErrorMessage() — izin kamera ditolak dikasih pesan jelas', () => {
  const ctx = makeCtx();
  const msg = ctx.vehicleScannerErrorMessage({ message: 'NotAllowedError: Permission denied' });
  assert.match(msg, /izin kamera/);
});

test('vehicleScannerErrorMessage() — error lain apa adanya', () => {
  const ctx = makeCtx();
  const msg = ctx.vehicleScannerErrorMessage(new Error('Something else broke'));
  assert.equal(msg, 'Something else broke');
});

test('vehicleScannerErrorMessage() — tanpa error message sama sekali, fallback generik', () => {
  const ctx = makeCtx();
  const msg = ctx.vehicleScannerErrorMessage(undefined);
  assert.match(msg, /error tidak diketahui/);
});

// ============================================================
// shouldDebounce()/recordScan() — Target Implementasi #6 (Scan Debounce)
// ============================================================

function makeVSCtx() {
  return loadSource(
    ['modules/vehicle/vehicle-scanner.js'],
    { _loadScriptOnce: () => Promise.resolve(), toast: () => {}, ZXing: ZXING_STUB },
    ['VehicleScanner']
  );
}

test('shouldDebounce() — kode BARU (belum pernah direkam) -> false, boleh diproses', () => {
  const ctx = makeVSCtx();
  assert.equal(ctx.VehicleScanner.shouldDebounce('ABC123', 1000), false);
});

test('shouldDebounce() — kode SAMA, masih di dalam window -> true, diabaikan', () => {
  const ctx = makeVSCtx();
  ctx.VehicleScanner.recordScan('ABC123', 1000);
  assert.equal(ctx.VehicleScanner.shouldDebounce('ABC123', 1500), true, '500ms setelah scan, masih dalam window 1500ms');
});

test('shouldDebounce() — kode SAMA, tapi window sudah lewat -> false, boleh diproses lagi', () => {
  const ctx = makeVSCtx();
  ctx.VehicleScanner.recordScan('ABC123', 1000);
  assert.equal(ctx.VehicleScanner.shouldDebounce('ABC123', 3000), false, '2000ms setelah scan, sudah lewat window 1500ms');
});

test('shouldDebounce() — kode BERBEDA walau di dalam window waktu -> false, tidak didebounce', () => {
  const ctx = makeVSCtx();
  ctx.VehicleScanner.recordScan('ABC123', 1000);
  assert.equal(ctx.VehicleScanner.shouldDebounce('XYZ999', 1200), false);
});

// ============================================================
// stopMediaStream() — Target Implementasi #3 (MediaStream Cleanup)
// ============================================================

test('stopMediaStream() — memanggil track.stop() utk SEMUA track di stream & set video.srcObject=null', () => {
  const ctx = makeVSCtx();
  const stopped = [];
  const video = {
    srcObject: {
      getTracks: () => [
        { stop: () => stopped.push('t1') },
        { stop: () => stopped.push('t2') },
      ],
    },
  };
  ctx.VehicleScanner.stopMediaStream(video);
  assert.deepEqual(stopped, ['t1', 't2']);
  assert.equal(video.srcObject, null);
});

test('stopMediaStream() — video tanpa srcObject/stream -> tidak throw', () => {
  const ctx = makeVSCtx();
  assert.doesNotThrow(() => ctx.VehicleScanner.stopMediaStream(null));
  assert.doesNotThrow(() => ctx.VehicleScanner.stopMediaStream({ srcObject: null }));
});

test('stopMediaStream() — track.stop() melempar error -> tetap lanjut, tidak throw ke pemanggil', () => {
  const ctx = makeVSCtx();
  const video = { srcObject: { getTracks: () => [{ stop: () => { throw new Error('boom'); } }] } };
  assert.doesNotThrow(() => ctx.VehicleScanner.stopMediaStream(video));
  assert.equal(video.srcObject, null);
});

// ============================================================
// applyTorchCapability() — Target Implementasi #7 (Torch Capability)
// ============================================================

function makeFlashBtn() {
  const classes = [];
  return {
    style: { display: 'none' },
    classList: {
      contains: (c) => classes.includes(c),
      toggle: (c, force) => {
        const has = classes.includes(c);
        const want = typeof force === 'boolean' ? force : !has;
        if (want && !has) classes.push(c);
        if (!want && has) classes.splice(classes.indexOf(c), 1);
      },
    },
    onclick: null,
  };
}

test('applyTorchCapability() — track punya kapabilitas torch -> tombol ditampilkan (display kosong)', () => {
  const ctx = makeVSCtx();
  const flashBtn = makeFlashBtn();
  const video = { srcObject: { getVideoTracks: () => [{ getCapabilities: () => ({ torch: true }) }] } };
  const result = ctx.VehicleScanner.applyTorchCapability(video, flashBtn);
  assert.equal(result, true);
  assert.equal(flashBtn.style.display, '');
});

test('applyTorchCapability() — track TIDAK punya kapabilitas torch -> tombol tetap disembunyikan', () => {
  const ctx = makeVSCtx();
  const flashBtn = makeFlashBtn();
  const video = { srcObject: { getVideoTracks: () => [{ getCapabilities: () => ({ torch: false }) }] } };
  const result = ctx.VehicleScanner.applyTorchCapability(video, flashBtn);
  assert.equal(result, false);
  assert.equal(flashBtn.style.display, 'none');
});

test('applyTorchCapability() — track tidak punya getCapabilities() sama sekali (browser lama) -> tidak throw, tombol disembunyikan', () => {
  const ctx = makeVSCtx();
  const flashBtn = makeFlashBtn();
  const video = { srcObject: { getVideoTracks: () => [{}] } };
  assert.doesNotThrow(() => ctx.VehicleScanner.applyTorchCapability(video, flashBtn));
  assert.equal(flashBtn.style.display, 'none');
});

test('applyTorchCapability() — video/stream null -> tidak throw, return false', () => {
  const ctx = makeVSCtx();
  const flashBtn = makeFlashBtn();
  assert.doesNotThrow(() => {
    const result = ctx.VehicleScanner.applyTorchCapability(null, flashBtn);
    assert.equal(result, false);
  });
});

// ============================================================
// pauseCamera()/resumeCamera() — Target Implementasi #5 (Visibility Lifecycle)
// ============================================================

test('pauseCamera() — semua video track di-nonaktifkan (enabled=false) & video.pause() dipanggil', () => {
  const ctx = makeVSCtx();
  let paused = false;
  const tracks = [{ enabled: true }, { enabled: true }];
  const video = { srcObject: { getVideoTracks: () => tracks }, pause: () => { paused = true; } };
  ctx.VehicleScanner.pauseCamera(video);
  assert.ok(tracks.every((t) => t.enabled === false));
  assert.equal(paused, true);
});

test('resumeCamera() — semua video track diaktifkan lagi (enabled=true) & video.play() dipanggil', () => {
  const ctx = makeVSCtx();
  let played = false;
  const tracks = [{ enabled: false }, { enabled: false }];
  const video = { srcObject: { getVideoTracks: () => tracks }, play: () => { played = true; return Promise.resolve(); } };
  ctx.VehicleScanner.resumeCamera(video);
  assert.ok(tracks.every((t) => t.enabled === true));
  assert.equal(played, true);
});

test('pauseCamera()/resumeCamera() — video null atau tanpa srcObject -> tidak throw', () => {
  const ctx = makeVSCtx();
  assert.doesNotThrow(() => ctx.VehicleScanner.pauseCamera(null));
  assert.doesNotThrow(() => ctx.VehicleScanner.resumeCamera(null));
  assert.doesNotThrow(() => ctx.VehicleScanner.pauseCamera({ srcObject: null }));
  assert.doesNotThrow(() => ctx.VehicleScanner.resumeCamera({ srcObject: null }));
});

// ============================================================
// scan() — Cross-Scanner Guard (ScannerSession.isActive()): dicek SEBELUM
// enter()/buka kamera, supaya tidak ada 2 overlay fullscreen + 2 stream
// kamera menumpuk kalau scanner lain (mis. SparepartScanner) lagi aktif.
// Hanya menguji jalur guard (return sebelum sentuh DOM/kamera) — bukan
// alur scan penuh (lihat catatan harness di kepala file ini).
// ============================================================

test('scan() — ScannerSession.isActive()=true -> batal, toast peringatan, TIDAK panggil enter()', async () => {
  let entered = false;
  const toasts = [];
  const ctx = loadSource(
    ['modules/vehicle/vehicle-scanner.js'],
    {
      _loadScriptOnce: () => Promise.resolve(),
      toast: (msg) => toasts.push(msg),
      ZXing: ZXING_STUB,
      ScannerSession: { isActive: () => true, enter: () => { entered = true; }, exit: () => {} },
    },
    ['VehicleScanner']
  );
  await ctx.VehicleScanner.scan();
  assert.equal(entered, false);
  assert.ok(toasts.some((m) => m.includes('Scanner lain sedang aktif')));
});

test('scan() — ScannerSession.isActive()=false -> lanjut, enter() terpanggil', async () => {
  let entered = false;
  const ctx = loadSource(
    ['modules/vehicle/vehicle-scanner.js'],
    {
      _loadScriptOnce: () => Promise.reject(new Error('stop di sini, cukup utk cek enter() terpanggil')),
      toast: () => {},
      ZXing: ZXING_STUB,
      ScannerSession: { isActive: () => false, enter: () => { entered = true; }, exit: () => {} },
    },
    ['VehicleScanner']
  );
  await ctx.VehicleScanner.scan();
  assert.equal(entered, true);
});

test('scan() — guard tidak dobel-blokir dirinya sendiri: _vehicleScannerBusy direset ke false setelah ditolak guard cross-scanner', async () => {
  const toasts = [];
  let sessionActive = true;
  const ctx = loadSource(
    ['modules/vehicle/vehicle-scanner.js'],
    {
      _loadScriptOnce: () => Promise.reject(new Error('stop, cukup utk cek busy reset')),
      toast: (msg) => toasts.push(msg),
      ZXing: ZXING_STUB,
      ScannerSession: { isActive: () => sessionActive, enter: () => {}, exit: () => {} },
    },
    ['VehicleScanner']
  );
  await ctx.VehicleScanner.scan(); // ditolak guard, busy harus balik false
  sessionActive = false;
  await ctx.VehicleScanner.scan(); // kalau busy tidak direset, panggilan ini akan langsung return tanpa nyentuh _loadScriptOnce
  assert.equal(toasts.filter((m) => m.includes('Scanner lain sedang aktif')).length, 1);
});
