'use strict';
// tests/sparepart-scanner.test.js — cakupan modules/vehicle/sparepart-scanner.js
// (Tahap 7B-1, Fondasi Scanner Sparepart). Hanya bagian LOGIC MURNI yang
// dites di sini (registry adapter, orkestrasi scan()/handleCode(),
// errorMessage()) — bagian pilih-file-dari-galeri & decode ZXing beneran
// (sparepartScannerPickImageFile, sparepartScannerDecodeFromFile) butuh
// DOM/File/ZXing asli browser, TIDAK dites lewat harness node:vm ini, pola
// SAMA PERSIS tests/vehicle-scanner.test.js (vehicleScannerScan/
// buildOverlay juga tidak dites di sana dengan alasan yang sama).
//
// VehicleCatalog.handleScan() DI-STUB (bukan load vehicle-catalog.js asli)
// supaya test ini murni menguji ORKESTRASI sparepart-scanner.js (adapter ->
// handleCode -> VehicleCatalog.handleScan -> toast/UI hook), terpisah dari
// detail implementasi VehicleCatalog itu sendiri (sudah ada test sendiri di
// tests/vehicle-catalog.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts) {
  opts = opts || {};
  const toasts = [];
  const handleScanCalls = [];
  const handleScanResult = opts.handleScanResult || (() => ({ found: true, item: { id: 'p1', partName: 'Kampas Rem' } }));
  const vehicleScannerStub = Object.assign({
    ensureZXing: () => Promise.resolve(),
    buildHints: () => ({}),
    errorMessage: (err) => 'VS:' + ((err && err.message) || String(err)),
  }, opts.vehicleScanner || {});
  const extraGlobals = {
    toast: (msg) => toasts.push(msg),
    VehicleScanner: vehicleScannerStub,
    VehicleCatalog: {
      handleScan: async (code) => {
        handleScanCalls.push(code);
        return handleScanResult(code);
      },
    },
  };
  if (opts.scannerSession) extraGlobals.ScannerSession = opts.scannerSession;
  const ctx = loadSource(
    ['modules/vehicle/sparepart-scanner.js'],
    extraGlobals,
    ['SparepartScanner']
  );
  return { ctx, toasts, handleScanCalls };
}

// ------------------------------------------------------------------------
// Adapter registry
// ------------------------------------------------------------------------
test('registerAdapter()/getAdapter() — adapter "gallery" terdaftar otomatis sesi ini', () => {
  const { ctx } = makeCtx();
  assert.equal(typeof ctx.SparepartScanner.getAdapter('gallery'), 'function');
});

test('listAdapters() — memuat "gallery" (Tahap 7B-1)', () => {
  const { ctx } = makeCtx();
  assert.ok(ctx.SparepartScanner.listAdapters().includes('gallery'));
});

test('listAdapters() — memuat "camera" (Tahap 7B-2, terdaftar otomatis)', () => {
  const { ctx } = makeCtx();
  assert.ok(ctx.SparepartScanner.listAdapters().includes('camera'));
});

test('getAdapter("camera") — mengembalikan fungsi (adapter kamera Tahap 7B-2)', () => {
  const { ctx } = makeCtx();
  assert.equal(typeof ctx.SparepartScanner.getAdapter('camera'), 'function');
});

test('cameraAdapter — diekspos di namespace publik (konsisten dgn pickImageFile/decodeFromFile)', () => {
  const { ctx } = makeCtx();
  assert.equal(typeof ctx.SparepartScanner.cameraAdapter, 'function');
});

test('registerAdapter() — bisa daftar adapter baru (mis. simulasi "camera" utk tahap berikutnya)', () => {
  const { ctx } = makeCtx();
  const ok = ctx.SparepartScanner.registerAdapter('camera', () => Promise.resolve('CAM123'));
  assert.equal(ok, true);
  assert.equal(typeof ctx.SparepartScanner.getAdapter('camera'), 'function');
});

test('registerAdapter() — nama kosong/fn bukan fungsi ditolak (tidak menimpa registry)', () => {
  const { ctx } = makeCtx();
  const ok1 = ctx.SparepartScanner.registerAdapter('', () => {});
  const ok2 = ctx.SparepartScanner.registerAdapter('foo', 'bukan-fungsi');
  assert.equal(ok1, false);
  assert.equal(ok2, false);
  assert.equal(ctx.SparepartScanner.getAdapter('foo'), null);
});

test('getAdapter() — nama tidak terdaftar mengembalikan null', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.SparepartScanner.getAdapter('tidak-ada'), null);
});

// ------------------------------------------------------------------------
// errorMessage() — reuse VehicleScanner.errorMessage()
// ------------------------------------------------------------------------
test('errorMessage() — reuse penuh VehicleScanner.errorMessage() kalau tersedia', () => {
  const { ctx } = makeCtx();
  const msg = ctx.SparepartScanner.errorMessage(new Error('boom'));
  assert.equal(msg, 'VS:boom');
});

test('errorMessage() — fallback generik kalau VehicleScanner tidak tersedia', () => {
  const ctx = loadSource(
    ['modules/vehicle/sparepart-scanner.js'],
    { toast: () => {}, VehicleCatalog: { handleScan: async () => ({}) } },
    ['SparepartScanner']
  );
  const msg = ctx.SparepartScanner.errorMessage(undefined);
  assert.match(msg, /error tidak diketahui/);
});

// ------------------------------------------------------------------------
// handleCode() — orkestrasi murni: reuse VehicleCatalog.handleScan()
// ------------------------------------------------------------------------
test('handleCode() — kode kosong TIDAK memanggil VehicleCatalog.handleScan(), toast peringatan', async () => {
  const { ctx, toasts, handleScanCalls } = makeCtx();
  const result = await ctx.SparepartScanner.handleCode('   ');
  assert.equal(handleScanCalls.length, 0);
  assert.equal(result.found, false);
  assert.ok(toasts.some((t) => /Tidak ada kode terbaca/.test(t)));
});

test('handleCode() — kode ditemukan (found:true) diteruskan apa adanya dari VehicleCatalog.handleScan()', async () => {
  const { ctx, toasts, handleScanCalls } = makeCtx({
    handleScanResult: () => ({ found: true, item: { id: 'p9', partName: 'Busi NGK' } }),
  });
  const result = await ctx.SparepartScanner.handleCode('BARCODE123');
  assert.deepEqual(handleScanCalls, ['BARCODE123']);
  assert.equal(result.found, true);
  assert.equal(result.item.partName, 'Busi NGK');
  assert.ok(toasts.some((t) => /Part ditemukan/.test(t) && /Busi NGK/.test(t)));
});

test('handleCode() — kode tidak ditemukan (draft:true) diteruskan apa adanya, toast draft', async () => {
  const { ctx, toasts } = makeCtx({
    handleScanResult: () => ({ found: false, item: { id: 'd1', partName: 'Draft — belum diberi nama', barcode: 'XYZ999' }, draft: true }),
  });
  const result = await ctx.SparepartScanner.handleCode('XYZ999');
  assert.equal(result.found, false);
  assert.equal(result.draft, true);
  assert.equal(result.item.barcode, 'XYZ999');
  assert.ok(toasts.some((t) => /draft dibuat/.test(t)));
});

// ------------------------------------------------------------------------
// scan() — orkestrasi penuh lewat adapter registry (adapter di-stub, TIDAK
// menyentuh ZXing/DOM asli)
// ------------------------------------------------------------------------
test('scan() — adapter tidak terdaftar -> toast peringatan, return null, TIDAK memanggil handleScan', async () => {
  const { ctx, toasts, handleScanCalls } = makeCtx();
  const result = await ctx.SparepartScanner.scan('adapter-ngawur');
  assert.equal(result, null);
  assert.equal(handleScanCalls.length, 0);
  assert.ok(toasts.some((t) => /belum tersedia/.test(t)));
});

test('scan() — adapter mengembalikan null (user batal pilih gambar) -> return null, tidak lanjut ke handleScan', async () => {
  const { ctx, handleScanCalls } = makeCtx();
  ctx.SparepartScanner.registerAdapter('stub-empty', () => Promise.resolve(null));
  const result = await ctx.SparepartScanner.scan('stub-empty');
  assert.equal(result, null);
  assert.equal(handleScanCalls.length, 0);
});

test('scan() — adapter sukses mengembalikan kode -> lanjut ke VehicleCatalog.handleScan() via handleCode()', async () => {
  const { ctx, handleScanCalls } = makeCtx({
    handleScanResult: () => ({ found: true, item: { id: 'p1', partName: 'Rantai Motor' } }),
  });
  ctx.SparepartScanner.registerAdapter('stub-ok', () => Promise.resolve('CODE-ABC'));
  const result = await ctx.SparepartScanner.scan('stub-ok');
  assert.deepEqual(handleScanCalls, ['CODE-ABC']);
  assert.equal(result.found, true);
});

test('scan() — default ke adapter "gallery" kalau nama tidak diberikan (dipanggil via registered stub)', async () => {
  const { ctx, handleScanCalls } = makeCtx({
    handleScanResult: () => ({ found: false, item: { id: 'd2' }, draft: true }),
  });
  // Timpa adapter gallery bawaan dengan stub, supaya tidak menyentuh
  // DOM/File input asli — tetap menguji bahwa scan() TANPA argumen
  // memanggil adapter bernama 'gallery'.
  ctx.SparepartScanner.registerAdapter('gallery', () => Promise.resolve('DEFAULT-CODE'));
  const result = await ctx.SparepartScanner.scan();
  assert.deepEqual(handleScanCalls, ['DEFAULT-CODE']);
  assert.equal(result.draft, true);
});

test('scan() — adapter melempar error -> toast pesan gagal (reuse errorMessage()), return null', async () => {
  const { ctx, toasts } = makeCtx();
  ctx.SparepartScanner.registerAdapter('stub-throw', () => Promise.reject(new Error('gagal dekode')));
  const result = await ctx.SparepartScanner.scan('stub-throw');
  assert.equal(result, null);
  assert.ok(toasts.some((t) => /Gagal scan/.test(t) && /gagal dekode/.test(t)));
});

// ------------------------------------------------------------------------
// scan() — double-open protection (_sparepartScannerBusy), existing guard,
// dites lewat efek sampingnya (adapter kedua TIDAK dipanggil selagi yang
// pertama masih pending)
// ------------------------------------------------------------------------
test('scan() — dipanggil dobel selagi scan pertama masih pending -> panggilan kedua diabaikan (return null, adapter tidak dipanggil 2x)', async () => {
  const { ctx } = makeCtx();
  let resolveFirst;
  const calls = [];
  ctx.SparepartScanner.registerAdapter('slow', () => {
    calls.push(1);
    return new Promise((resolve) => { resolveFirst = resolve; });
  });
  const p1 = ctx.SparepartScanner.scan('slow');
  const p2 = ctx.SparepartScanner.scan('slow');
  const r2 = await p2;
  assert.equal(r2, null, 'panggilan kedua selagi masih busy harus diabaikan');
  assert.equal(calls.length, 1, 'adapter hanya dipanggil 1x, bukan 2x');
  resolveFirst('CODE-1');
  await p1;
});

// ------------------------------------------------------------------------
// scan('camera') — Cross-Scanner Guard (ScannerSession.isActive()): pola
// SAMA PERSIS vehicleScannerScan() — dicek sebelum enter(), supaya tidak
// ada 2 overlay/stream kamera menumpuk kalau VehicleScanner kebetulan lagi
// aktif. Adapter 'gallery' TIDAK pakai ScannerSession sama sekali, jadi
// tidak kena guard ini (dites terpisah di bawah).
// ------------------------------------------------------------------------
test('scan("camera") — ScannerSession.isActive()=true -> batal, toast peringatan, adapter TIDAK dipanggil, enter() TIDAK terpanggil', async () => {
  let entered = false;
  const cameraCalls = [];
  const { ctx, toasts } = makeCtx({
    scannerSession: { isActive: () => true, enter: () => { entered = true; }, exit: () => {} },
  });
  ctx.SparepartScanner.registerAdapter('camera', () => { cameraCalls.push(1); return Promise.resolve('CODE'); });
  const result = await ctx.SparepartScanner.scan('camera');
  assert.equal(result, null);
  assert.equal(entered, false);
  assert.equal(cameraCalls.length, 0);
  assert.ok(toasts.some((t) => t.includes('Scanner lain sedang aktif')));
});

test('scan("camera") — ScannerSession.isActive()=false -> lanjut, enter() & adapter terpanggil', async () => {
  let entered = false;
  const { ctx, handleScanCalls } = makeCtx({
    scannerSession: { isActive: () => false, enter: () => { entered = true; }, exit: () => {} },
  });
  ctx.SparepartScanner.registerAdapter('camera', () => Promise.resolve('CODE-CAM'));
  await ctx.SparepartScanner.scan('camera');
  assert.equal(entered, true);
  assert.deepEqual(handleScanCalls, ['CODE-CAM']);
});

test('scan("gallery") — tidak kena guard ScannerSession sama sekali (adapter tetap dipanggil walau isActive()=true)', async () => {
  const isActiveCalls = [];
  const { ctx, handleScanCalls } = makeCtx({
    scannerSession: { isActive: () => { isActiveCalls.push(1); return true; }, enter: () => {}, exit: () => {} },
  });
  ctx.SparepartScanner.registerAdapter('gallery', () => Promise.resolve('CODE-GAL'));
  await ctx.SparepartScanner.scan('gallery');
  assert.deepEqual(handleScanCalls, ['CODE-GAL']);
});

// ------------------------------------------------------------------------
// shouldDebounce()/recordScan() — Target Implementasi #6 (Scan Debounce)
// ------------------------------------------------------------------------
test('shouldDebounce() — kode baru -> false', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.SparepartScanner.shouldDebounce('SP001', 1000), false);
});

test('shouldDebounce() — kode sama, di dalam window -> true', () => {
  const { ctx } = makeCtx();
  ctx.SparepartScanner.recordScan('SP001', 1000);
  assert.equal(ctx.SparepartScanner.shouldDebounce('SP001', 1400), true);
});

test('shouldDebounce() — kode sama, window sudah lewat -> false', () => {
  const { ctx } = makeCtx();
  ctx.SparepartScanner.recordScan('SP001', 1000);
  assert.equal(ctx.SparepartScanner.shouldDebounce('SP001', 3000), false);
});

// ------------------------------------------------------------------------
// stopMediaStream() — Target Implementasi #3 (MediaStream Cleanup)
// ------------------------------------------------------------------------
test('stopMediaStream() — stop() dipanggil di semua track, srcObject di-null-kan', () => {
  const { ctx } = makeCtx();
  const stopped = [];
  const video = { srcObject: { getTracks: () => [{ stop: () => stopped.push('a') }, { stop: () => stopped.push('b') }] } };
  ctx.SparepartScanner.stopMediaStream(video);
  assert.deepEqual(stopped, ['a', 'b']);
  assert.equal(video.srcObject, null);
});

test('stopMediaStream() — video/stream kosong -> tidak throw', () => {
  const { ctx } = makeCtx();
  assert.doesNotThrow(() => ctx.SparepartScanner.stopMediaStream(null));
});

// ------------------------------------------------------------------------
// applyTorchCapability() — Target Implementasi #7 (Torch Capability)
// ------------------------------------------------------------------------
function makeFlashBtnSp() {
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

test('applyTorchCapability() — caps.torch true -> tombol ditampilkan', () => {
  const { ctx } = makeCtx();
  const flashBtn = makeFlashBtnSp();
  const video = { srcObject: { getVideoTracks: () => [{ getCapabilities: () => ({ torch: true }) }] } };
  assert.equal(ctx.SparepartScanner.applyTorchCapability(video, flashBtn), true);
  assert.equal(flashBtn.style.display, '');
});

test('applyTorchCapability() — caps.torch false/tidak ada -> tombol disembunyikan', () => {
  const { ctx } = makeCtx();
  const flashBtn = makeFlashBtnSp();
  const video = { srcObject: { getVideoTracks: () => [{ getCapabilities: () => ({}) }] } };
  assert.equal(ctx.SparepartScanner.applyTorchCapability(video, flashBtn), false);
  assert.equal(flashBtn.style.display, 'none');
});

// ------------------------------------------------------------------------
// pauseCamera()/resumeCamera() — Target Implementasi #5 (Visibility Lifecycle)
// ------------------------------------------------------------------------
test('pauseCamera() — track dinonaktifkan & video.pause() dipanggil', () => {
  const { ctx } = makeCtx();
  let paused = false;
  const tracks = [{ enabled: true }];
  const video = { srcObject: { getVideoTracks: () => tracks }, pause: () => { paused = true; } };
  ctx.SparepartScanner.pauseCamera(video);
  assert.equal(tracks[0].enabled, false);
  assert.equal(paused, true);
});

test('resumeCamera() — track diaktifkan & video.play() dipanggil', () => {
  const { ctx } = makeCtx();
  let played = false;
  const tracks = [{ enabled: false }];
  const video = { srcObject: { getVideoTracks: () => tracks }, play: () => { played = true; return Promise.resolve(); } };
  ctx.SparepartScanner.resumeCamera(video);
  assert.equal(tracks[0].enabled, true);
  assert.equal(played, true);
});
