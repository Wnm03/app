// vehicle-scanner.js — Scan Barcode/QR/DataMatrix untuk Vehicle Catalog
// (lanjutan dari ACR-001/Tahap 2 — lihat komentar handleScan() di
// vehicle-catalog.js: "itu butuh keputusan produk terpisah: pilih library,
// izin kamera, dsb — di luar cakupan 'ringkas'" — keputusan itu sudah
// diambil di sesi ini, file ini isinya).
//
// KEPUTUSAN PRODUK SESI INI (Project Decision — dipakai tanpa klarifikasi
// ulang, lihat catatan di kepala file):
// - Library: ZXing-JS (@zxing/library), CDN jsDelivr + lazy-load via
//   _loadScriptOnce() — pola yg SUDAH ADA (sama seperti ensureTesseract()
//   dkk di index.html/app_production.html/keluarga-w-preview.html).
// - Format: Barcode (1D umum: CODE_128/CODE_39/EAN_13/EAN_8/UPC_A/UPC_E/
//   ITF/CODABAR), QR Code, dan DataMatrix — via ZXing.DecodeHintType +
//   BarcodeFormat, bukan default reader (default BrowserMultiFormatReader
//   TIDAK mengaktifkan DATA_MATRIX kecuali di-hint eksplisit).
// - Metode capture: kamera FULLSCREEN, live continuous scan (bukan lagi
//   1 foto/file input seperti versi sebelumnya) — pakai
//   reader.decodeFromConstraints({video:{facingMode:'environment'}}, ...)
//   dgn fallback ke decodeFromVideoDevice(undefined,...) kalau constraints
//   ditolak browser, supaya tetap prioritas kamera belakang di HP.
// - Overlay dibuat dinamis lewat JS (createElement), BUKAN markup statis
//   index.html/app_production.html — konsisten dgn pola elemen dinamis
//   lain di repo (input file dinamis di scan-ocr.js), CSS-nya di
//   styles.css (.vehicle-scanner-fullscreen dkk, token existing saja).
// - Namespace: window.VehicleScanner (bukan class/factory BP-015),
//   ikut ACR-001 Opsi A yang sudah accepted utk fitur Vehicle Catalog ini.
// - File TERPISAH dari vehicle-catalog.js: modul ini HANYA lapisan
//   kamera/decode, tidak menyentuh logic cari-atau-draft (itu sudah ada
//   di VehicleCatalog.handleScan(code), dipanggil dari sini, tidak
//   diduplikasi/diubah).

const VEHICLE_SCANNER_LIB_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';

// AUDIT (Target Implementasi #6 — Scan Debounce): kode yang sama TIDAK boleh
// diproses berkali-kali dalam window singkat. State module-level (bukan
// per-panggilan) supaya bertahan sepanjang 1 sesi decode continuous.
const VEHICLE_SCANNER_DEBOUNCE_MS = 1500;
let _vehicleScannerLastValue = null;
let _vehicleScannerLastTimestamp = 0;

// AUDIT (Target Implementasi #4 — Double Open Protection): guard sederhana
// module-level, pola SAMA PERSIS _sparepartScannerBusy di sparepart-
// scanner.js — cegah double-tap membuka 2 overlay/2 stream kamera sekaligus.
let _vehicleScannerBusy = false;

function ensureZXing() {
  return _loadScriptOnce(VEHICLE_SCANNER_LIB_URL);
}

// vehicleScannerShouldDebounce(code, now) — true kalau `code` sama dengan
// hasil decode sebelumnya DAN masih dalam window VEHICLE_SCANNER_DEBOUNCE_MS
// (default: fungsi murni, gampang dites terisolasi tanpa DOM/ZXing asli).
function vehicleScannerShouldDebounce(code, now) {
  const ts = typeof now === 'number' ? now : Date.now();
  if (_vehicleScannerLastValue === code && (ts - _vehicleScannerLastTimestamp) < VEHICLE_SCANNER_DEBOUNCE_MS) {
    return true;
  }
  return false;
}

function vehicleScannerRecordScan(code, now) {
  _vehicleScannerLastValue = code;
  _vehicleScannerLastTimestamp = typeof now === 'number' ? now : Date.now();
}

// vehicleScannerStopMediaStream(video) — Target Implementasi #3: reader.reset()
// SAJA TIDAK CUKUP utk memastikan kamera benar2 mati (beberapa browser tetap
// menyalakan LED kamera walau reader sudah di-reset kalau MediaStreamTrack-nya
// sendiri tidak di-stop() eksplisit). Fungsi murni (terima `video`, bukan baca
// global) supaya gampang dites dgn stub video/stream palsu.
function vehicleScannerStopMediaStream(video) {
  try {
    const stream = video && video.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* no-op — track mungkin sudah stopped */ }
      });
    }
  } catch (e) { /* no-op */ }
  try { if (video) video.srcObject = null; } catch (e) { /* no-op */ }
}

// vehicleScannerApplyTorchCapability(video, flashBtn) — Target Implementasi
// #7: tombol Flash TIDAK selalu tampil — hanya kalau device/track ybs
// benar2 punya kapabilitas torch (track.getCapabilities().torch). Dipanggil
// setelah stream ter-attach ke <video> (event 'loadedmetadata').
function vehicleScannerApplyTorchCapability(video, flashBtn) {
  if (!flashBtn) return false;
  try {
    const stream = video && video.srcObject;
    const track = stream && typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks()[0] : null;
    const caps = track && typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
    if (caps && caps.torch) {
      flashBtn.style.display = '';
      flashBtn.onclick = () => {
        const isOn = flashBtn.classList.contains('active');
        if (typeof track.applyConstraints === 'function') {
          track.applyConstraints({ advanced: [{ torch: !isOn }] }).then(() => {
            flashBtn.classList.toggle('active', !isOn);
          }).catch(() => { /* no-op — sebagian browser reject walau caps.torch true */ });
        }
      };
      return true;
    }
  } catch (e) { /* no-op */ }
  flashBtn.style.display = 'none';
  return false;
}

// BUGFIX (sesi ini, PD-007 lanjutan — laporan reproduksi: fatal error kadang
// dikirim ZXing lewat parameter `err` callback per-frame onDecode(), BUKAN
// lewat reject() promise decodeFromConstraints()/decodeFromVideoDevice() —
// satu-satunya jalur yang sebelumnya ditangkap catch block. onDecode() lama
// TIDAK PERNAH membaca `err` sama sekali, jadi kalau ZXing lewat jalur ini
// (mis. NotAllowedError izin kamera ditolak), reader "hidup" terus tanpa
// hasil/toast/exit() — overlay+kamera nyangkut permanen. Exception decode-
// per-attempt (NotFoundException/ChecksumException/FormatException) TETAP
// harus diabaikan — itu normal, dilempar terus-menerus tiap frame selama
// belum ada kode yang kebaca, BUKAN error sungguhan.
function vehicleScannerIsHarmlessDecodeError(err) {
  if (!err) return true;
  const name = err.name || '';
  if (name === 'NotFoundException' || name === 'ChecksumException' || name === 'FormatException') return true;
  // BUGFIX (laporan user: scan gagal di frame PERTAMA, toast "Gagal scan: No
  // MultiFormat Readers were able to detect the code." -- padahal pesan itu
  // sendiri adalah NotFoundException ZXing yang NORMAL/harus diabaikan tiap
  // frame). Root cause: build @zxing/library tertentu yang dimuat lewat CDN
  // tidak menyetel `err.name` pada instance exception-nya (console menunjukkan
  // objek anonim/constructor termangling, mis. "N {}"), jadi cek `err.name`
  // di atas SELALU gagal cocok & exception normal ini dianggap fatal. Dua
  // lapis fallback: (1) instanceof terhadap kelas exception ZXing sendiri
  // (tetap tersedia di namespace global ZXing walau instance-nya diminify),
  // (2) cocokkan teks pesan resmi yang dilempar ZXing utk ketiga exception
  // ini, kalau instanceof pun tidak tersedia (mis. versi library berbeda).
  try {
    if (typeof ZXing !== 'undefined' && ZXing) {
      if ((ZXing.NotFoundException && err instanceof ZXing.NotFoundException) ||
          (ZXing.ChecksumException && err instanceof ZXing.ChecksumException) ||
          (ZXing.FormatException && err instanceof ZXing.FormatException)) {
        return true;
      }
    }
  } catch (e) { /* no-op */ }
  const msg = (err.message || '') + '';
  return /no multiformat readers? were able to detect the code/i.test(msg);
}

function vehicleScannerErrorMessage(err) {
  // BUGFIX (sesi ini): ZXing melempar kelas exception (NotFoundException,
  // ChecksumException, FormatException, dll) yang seringkali punya
  // `.message` KOSONG ('') — sebelumnya raw jadi '' (falsy) & fungsi ini
  // jatuh ke pesan generik "error tidak diketahui", padahal `err.name`
  // sebenarnya sudah cukup informatif (mis. kamera tidak ketemu/kode tidak
  // terbaca). Sekarang `.name` dipakai sbg fallback sebelum menyerah.
  const raw = (err && err.message) || (err && err.name) || (typeof err === 'string' ? err : '');
  if (raw && /fetch|network|load/i.test(raw)) return 'gagal mengunduh modul scanner, cek koneksi internet & coba lagi';
  if (raw && /notfound/i.test(raw)) return 'kode tidak terdeteksi — coba lebih dekat, lebih jelas, & pencahayaan lebih terang';
  if (raw && /notallowed|permission|security/i.test(raw)) return 'izin kamera ditolak — aktifkan izin kamera di pengaturan browser lalu coba lagi';
  if (raw && /notreadable|overconstrained|constraint/i.test(raw)) return 'kamera tidak bisa diakses (mungkin dipakai app lain) — tutup app lain yg pakai kamera, lalu coba lagi';
  if (raw) return raw;
  return 'error tidak diketahui — cek koneksi internet, lalu coba lagi';
}

function vehicleScannerHandleResult(code) {
  if (!code) return;
  toast('✅ Kode terbaca: ' + code);
  if (typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.handleScan === 'function') {
    const p = VehicleCatalog.handleScan(code);
    // Jembatan opsional ke UI (vehicle-catalog-ui.js), kalau sudah dimuat & modalnya lagi
    // dibuka — guard typeof, pola sama adapter tipis existing lain (_aiContext*() dkk).
    // vehicle-scanner.js TETAP tidak tahu apa pun soal DOM/UI modul lain selain guard ini.
    if (p && typeof p.then === 'function') {
      p.then((result) => {
        if (typeof VehicleCatalogUI !== 'undefined' && VehicleCatalogUI && typeof VehicleCatalogUI.onScanResult === 'function') {
          VehicleCatalogUI.onScanResult(result, code);
        }
      });
    }
  }
}

// Hints ZXing: aktifkan Barcode (1D umum) + QR + DataMatrix eksplisit —
// default reader ZXing TIDAK mengaktifkan DATA_MATRIX tanpa hint ini.
function vehicleScannerBuildHints() {
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.QR_CODE,
    ZXing.BarcodeFormat.DATA_MATRIX,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.ITF,
    ZXing.BarcodeFormat.CODABAR,
  ]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  return hints;
}

// PD-007 (docs/PRODUCT_DECISIONS.md "Scanner — Exclusive Scanner Mode via
// ScannerSession"): vehicleScannerHideChrome()/vehicleScannerRestoreChrome()
// yang DULU ada di sini (sembunyikan #mainNav/#mainHeader selama scanner
// terbuka — root cause & riwayat bugfix z-index #mainNav vs overlay scanner
// TETAP sama seperti catatan asli, cuma dipindah) SEKARANG jadi tanggung
// jawab ScannerSession.pauseUI()/resumeUI() (modules/shared/scanner-
// session.js), dipanggil dari ScannerSession.enter()/exit() di
// vehicleScannerScan() di bawah. Scanner Engine (file ini) TIDAK lagi
// menyentuh #mainNav/#mainHeader langsung.

// Bangun overlay fullscreen (video + bingkai target + tombol tutup),
// dilepas total dari DOM saat scan selesai/dibatalkan — tidak ada elemen
// nempel/bocor di belakang.
function vehicleScannerBuildOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'vehicle-scanner-fullscreen';
  // BUGFIX (pola SAMA PERSIS sparepart-scanner.js, laporan user di scanner
  // sparepart tapi resiko sama persis di sini krn class CSS identik): jaring
  // pengaman posisi fixed+fullscreen independen dari stylesheet eksternal.
  overlay.style.cssText = 'position:fixed;inset:0;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;z-index:2147483000;background:#000;';

  const video = document.createElement('video');
  video.className = 'vehicle-scanner-video';
  video.setAttribute('playsinline', 'true');
  video.setAttribute('muted', 'true');
  video.muted = true;

  const frame = document.createElement('div');
  frame.className = 'vehicle-scanner-frame';

  const hint = document.createElement('div');
  hint.className = 'vehicle-scanner-hint';
  hint.textContent = 'Arahkan kamera ke barcode / QR / DataMatrix';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'vehicle-scanner-close';
  closeBtn.setAttribute('aria-label', 'Tutup scanner');
  closeBtn.textContent = '✕';

  // Tombol Flash/Torch (Target Implementasi #7) — disembunyikan by default,
  // hanya ditampilkan kalau vehicleScannerApplyTorchCapability() konfirmasi
  // track punya kapabilitas torch (dicek setelah stream ter-attach).
  const flashBtn = document.createElement('button');
  flashBtn.type = 'button';
  flashBtn.className = 'vehicle-scanner-flash';
  flashBtn.setAttribute('aria-label', 'Nyalakan/matikan senter');
  flashBtn.textContent = '🔦';
  flashBtn.style.display = 'none';

  overlay.appendChild(video);
  overlay.appendChild(frame);
  overlay.appendChild(hint);
  overlay.appendChild(closeBtn);
  overlay.appendChild(flashBtn);
  document.body.appendChild(overlay);

  video.addEventListener('loadedmetadata', () => {
    vehicleScannerApplyTorchCapability(video, flashBtn);
  });

  return { overlay, video, closeBtn, flashBtn };
}

// AUDIT (Target Implementasi #5 — Visibility Lifecycle): saat tab/app pindah
// background (visibilitychange/pagehide/freeze - Page Lifecycle API), track
// kamera di-nonaktifkan sementara (bukan di-stop total) supaya baterai/­
// resource tidak terbuang & indikator kamera browser tidak terus menyala
// selagi user tidak melihat scanner sama sekali; saat kembali (visible/
// resume) track diaktifkan lagi KALAU scanner masih sesi yang sama (guard
// `stopped`, dicek oleh pemanggil lewat closure).
function vehicleScannerPauseCamera(video) {
  try {
    const stream = video && video.srcObject;
    if (stream && typeof stream.getVideoTracks === 'function') {
      stream.getVideoTracks().forEach((t) => { try { t.enabled = false; } catch (e) { /* no-op */ } });
    }
  } catch (e) { /* no-op */ }
  try { if (video && typeof video.pause === 'function') video.pause(); } catch (e) { /* no-op */ }
}

function vehicleScannerResumeCamera(video) {
  try {
    const stream = video && video.srcObject;
    if (stream && typeof stream.getVideoTracks === 'function') {
      stream.getVideoTracks().forEach((t) => { try { t.enabled = true; } catch (e) { /* no-op */ } });
    }
  } catch (e) { /* no-op */ }
  try { if (video && typeof video.play === 'function') video.play().catch(() => { /* no-op — autoplay policy dsb */ }); } catch (e) { /* no-op */ }
}

// vehicleScannerAttachLifecycle()/DetachLifecycle() — pasang/lepas listener
// visibilitychange, pagehide, freeze, resume (Page Lifecycle API) SELAMA
// scanner aktif saja, dilepas di teardown supaya tidak ada listener bocor
// menempel ke document/window setelah scanner ditutup.
function vehicleScannerAttachLifecycle(video, onPageHide) {
  const onVisibility = () => {
    if (typeof document === 'undefined' || typeof document.hidden === 'undefined') return;
    if (document.hidden) vehicleScannerPauseCamera(video);
    else vehicleScannerResumeCamera(video);
  };
  const onFreeze = () => vehicleScannerPauseCamera(video);
  const onResume = () => vehicleScannerResumeCamera(video);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('freeze', onFreeze);
    document.addEventListener('resume', onResume);
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', onPageHide);
  }
  return { onVisibility, onFreeze, onResume, onPageHide };
}

function vehicleScannerDetachLifecycle(handlers) {
  if (!handlers) return;
  if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
    document.removeEventListener('visibilitychange', handlers.onVisibility);
    document.removeEventListener('freeze', handlers.onFreeze);
    document.removeEventListener('resume', handlers.onResume);
  }
  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('pagehide', handlers.onPageHide);
  }
}

// Teardown overlay scanner ITU SENDIRI (video/frame/hint/closeBtn) — TIDAK
// lagi memanggil resume UI global di sini, itu tanggung jawab
// ScannerSession.exit() (dipanggil SETELAH teardown ini, lihat
// vehicleScannerScan(), sesuai urutan PD-007: scanner engine teardown dulu,
// baru UI global di-resume).
//
// AUDIT (Target Implementasi #3 — MediaStream Cleanup): reader.reset() SAJA
// TIDAK CUKUP utk memastikan kamera benar2 mati di semua browser — sekarang
// juga eksplisit stream.getTracks().forEach(track=>track.stop()) &
// video.srcObject=null lewat vehicleScannerStopMediaStream(). AUDIT (#5):
// lifecycle listener (visibilitychange dkk) juga dilepas di sini supaya
// tidak bocor setelah overlay dilepas dari DOM. Idempotent (aman dipanggil
// berkali-kali) — dipakai jadi jaring pengaman finally{} di
// vehicleScannerScan().
function vehicleScannerTeardown(reader, ui, lifecycleHandlers) {
  try { if (reader && typeof reader.reset === 'function') reader.reset(); } catch (e) { /* no-op, sama pola try/catch existing di modul lain */ }
  vehicleScannerStopMediaStream(ui && ui.video);
  vehicleScannerDetachLifecycle(lifecycleHandlers);
  const overlay = ui && ui.overlay;
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

async function vehicleScannerScan() {
  // AUDIT (Target Implementasi #4 — Double Open Protection): guard anti-
  // dobel-tap SEBELUM apa pun lain jalan (termasuk ScannerSession.enter()) —
  // kalau scanner engine ini sendiri masih sibuk, return langsung, tidak
  // membuka overlay/stream kamera kedua.
  if (_vehicleScannerBusy) return;
  _vehicleScannerBusy = true;

  // ScannerSession.enter() — satu-satunya titik masuk Exclusive Scanner Mode
  // (PD-007): suspend UI global (modal/toast/dashboard chrome) DULU, baru
  // apa pun lain (termasuk toast pembuka & ZXing) boleh jalan. Guard typeof
  // supaya tetap aman kalau scanner-session.js belum/tidak dimuat (mis.
  // environment test terisolasi) — fallback: skip suspend, scan tetap jalan
  // seperti sebelum PD-007 (tanpa proteksi ketiban modal/toast).
  //
  // AUDIT: enter() dipanggil SEBELUM toast() (dulu terbalik) — race lama:
  // toast '🔍 Membuka kamera...' bisa sempat ke-render 1 frame SEBELUM class
  // scanner-session-active ke-attach ke <body>, jadi rule suppression CSS
  // (#toast{display:none}) belum berlaku saat toast itu muncul. Urutan baru
  // menjamin class sudah aktif sebelum elemen apa pun (toast/ZXing) mulai.
  const _session = (typeof ScannerSession !== 'undefined' && ScannerSession) ? ScannerSession : null;
  // AUDIT (Cross-Scanner Guard): _vehicleScannerBusy di atas hanya melindungi
  // dari dobel-buka VehicleScanner ITU SENDIRI — TIDAK mencegah scanner lain
  // (mis. SparepartScanner adapter 'camera') yang kebetulan sedang aktif di
  // saat bersamaan (dua tombol scan beda modul ke-trigger hampir bersamaan).
  // ScannerSession.isActive() adalah sumber kebenaran tunggal soal "ada
  // scanner mana pun yang sedang buka overlay/stream" — dicek di sini
  // SEBELUM enter(), supaya tidak ada 2 overlay fullscreen + 2 stream kamera
  // menumpuk (yang kedua akan menutupi yang pertama, & stream pertama bocor
  // krn tidak ada yang men-stop()-nya).
  if (_session && _session.isActive()) {
    _vehicleScannerBusy = false;
    toast('⚠️ Scanner lain sedang aktif — tutup dulu, lalu coba lagi');
    return;
  }
  if (_session) _session.enter();
  toast('🔍 Membuka kamera...', 4000);
  let reader = null;
  let ui = null;
  let lifecycleHandlers = null;
  let stopped = false;
  // AUDIT (Target Implementasi #2 — Fail-safe Cleanup): try/finally di
  // LUAR try/catch existing — apa pun jalur keluarnya (sukses/cancel/izin
  // ditolak/exception ZXing/error kamera lain yang mungkin belum tercakup
  // catch block di bawah), finally{} di sini JADI JARING PENGAMAN TERAKHIR:
  // vehicleScannerTeardown()/ScannerSession.exit() SELALU jalan minimal 1x.
  // Aman dipanggil dobel dengan stop()/catch block di bawah krn keduanya
  // idempotent (guard `stopped`, teardown & ScannerSession.exit() sendiri
  // sudah idempotent).
  try {
    try {
      await ensureZXing();
      reader = new ZXing.BrowserMultiFormatReader(vehicleScannerBuildHints());
      ui = vehicleScannerBuildOverlay();

      const stop = () => {
        if (stopped) return;
        stopped = true;
        vehicleScannerTeardown(reader, ui, lifecycleHandlers);
        if (_session) _session.exit();
      };
      ui.closeBtn.onclick = stop;
      // pagehide (Target Implementasi #5) — tutup scanner total (bukan cuma
      // pause) saat halaman benar2 ditinggalkan/di-unload.
      lifecycleHandlers = vehicleScannerAttachLifecycle(ui.video, () => stop());

      const onDecode = (result, err) => {
        if (stopped) return;
        if (result && typeof result.getText === 'function') {
          const code = result.getText();
          // AUDIT (Target Implementasi #6 — Scan Debounce): kode identik yang
          // masuk berkali-kali dalam window singkat (continuous scan bisa
          // memanggil callback ini berkali-kali utk frame yang sama) TIDAK
          // diproses ulang — biarkan reader terus jalan (jangan stop()) sampai
          // kode BARU/berbeda masuk, atau window debounce sudah lewat.
          if (vehicleScannerShouldDebounce(code, Date.now())) return;
          vehicleScannerRecordScan(code, Date.now());
          stop();
          vehicleScannerHandleResult(code);
          return;
        }
        // NotFoundException dilempar terus-menerus selama belum ada kode di
        // frame — itu normal utk continuous scan, BUKAN error, jadi diabaikan
        // di sini (bukan ditampilkan sebagai toast per-frame). Selain itu
        // (fatal, mis. izin kamera ditolak lewat jalur callback ini) — lihat
        // catatan vehicleScannerIsHarmlessDecodeError() di atas.
        if (err && !vehicleScannerIsHarmlessDecodeError(err)) {
          console.error('[VehicleScanner] gagal scan (per-frame):', err);
          stop();
          toast('❌ Gagal scan: ' + vehicleScannerErrorMessage(err));
        }
      };

      try {
        await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, ui.video, onDecode);
      } catch (constraintsErr) {
        // Fallback: browser/ZXing versi tertentu tidak dukung decodeFromConstraints
        // atau facingMode environment ditolak — coba device default.
        if (stopped) return;
        await reader.decodeFromVideoDevice(undefined, ui.video, onDecode);
      }
    } catch (err) {
      console.error('[VehicleScanner] gagal scan:', err);
      vehicleScannerTeardown(reader, ui, lifecycleHandlers);
      if (!stopped) { stopped = true; if (_session) _session.exit(); }
      toast('❌ Gagal scan: ' + vehicleScannerErrorMessage(err));
    }
  } finally {
    // Jaring pengaman terakhir (lihat catatan di atas) — idempotent.
    vehicleScannerTeardown(reader, ui, lifecycleHandlers);
    if (_session) _session.exit();
    _vehicleScannerBusy = false;
  }
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama seperti VehicleCatalog (const object, expose
// eksplisit ke window krn Node vm & browser non-module script TIDAK
// otomatis menempelkan binding const/let ke global object — lihat catatan
// recurring bug di vehicle-catalog.js/AIBus/AIContext).
// ------------------------------------------------------------------------
const VehicleScanner = {
  scan: vehicleScannerScan,
  errorMessage: vehicleScannerErrorMessage,
  ensureZXing,
  buildHints: vehicleScannerBuildHints,
  // Diekspos utk test murni (Target Implementasi #9) — semuanya fungsi murni,
  // tidak butuh browser/ZXing asli utk dites, pola sama seperti errorMessage/
  // buildHints yang sudah ada.
  shouldDebounce: vehicleScannerShouldDebounce,
  recordScan: vehicleScannerRecordScan,
  isHarmlessDecodeError: vehicleScannerIsHarmlessDecodeError,
  stopMediaStream: vehicleScannerStopMediaStream,
  applyTorchCapability: vehicleScannerApplyTorchCapability,
  pauseCamera: vehicleScannerPauseCamera,
  resumeCamera: vehicleScannerResumeCamera,
};

if (typeof window !== 'undefined') {
  window.VehicleScanner = VehicleScanner;
}
