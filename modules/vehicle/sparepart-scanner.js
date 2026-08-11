// sparepart-scanner.js — Scanner Sparepart (Tahap 7B-1 Fondasi + Tahap 7B-2
// Kamera Real-Time)
//
// CAKUPAN TAHAP 7B-1 (fondasi, disepakati eksplisit — RULE #1: 100% reuse,
// TIDAK ada formula/skema baru, UI presenter layer saja):
// - Adapter "gallery": pilih 1 foto dari galeri (input file), decode
//   barcode/QR/DataMatrix dari foto statis itu lewat ZXing — REUSE PENUH
//   library/hints/error-message yang SUDAH ADA di VehicleScanner
//   (vehicle-scanner.js, Tahap 2 ACR-001): ensureZXing() (lazy-load CDN),
//   buildHints() (format Barcode/QR/DataMatrix + TRY_HARDER), errorMessage()
//   (pesan error jelas). File ini TIDAK mendefinisikan ulang URL CDN/format
//   list-nya sendiri.
// - Hasil decode (STRING kode) diteruskan ke VehicleCatalog.handleScan(code)
//   — REUSE PENUH logic "cari atau draft" yang SUDAH ADA sejak Tahap 2
//   vehicle-catalog.js (kode ketemu -> { found:true, item }, tidak ketemu ->
//   otomatis draft { found:false, item, draft:true }). TIDAK ada logic
//   pencarian/draft baru di sini.
// - Registry adapter (`registerAdapter()`/`getAdapter()`): dibuat di tahap
//   ini supaya adapter kamera bisa ditambah tanpa mengubah orkestrasi
//   scan()/handleCode() — terbukti dipakai di bawah utk adapter 'camera'.
//
// CAKUPAN TAHAP 7B-2 (kamera real-time, SESI INI):
// - Adapter "camera": live continuous scan via kamera fullscreen — pola
//   SAMA PERSIS vehicleScannerScan() (vehicle-scanner.js, Tahap 2 ACR-001):
//   reader.decodeFromConstraints({video:{facingMode:'environment'}}, ...)
//   dgn fallback ke decodeFromVideoDevice(undefined,...), overlay dibuat
//   dinamis lewat JS (createElement) pakai CSS class YANG SUDAH ADA
//   (.vehicle-scanner-fullscreen dkk di styles.css, Tahap 2) — TIDAK ada
//   class/style baru. REUSE PENUH VehicleScanner.ensureZXing()/buildHints()
//   (library/format Barcode 1D/QR/DataMatrix sama seperti adapter gallery,
//   TIDAK didefinisikan ulang). Bedanya dari vehicleScannerScan(): adapter
//   ini me-resolve Promise dgn STRING kode (bukan langsung memanggil
//   VehicleCatalog.handleScan()), supaya tetap lewat orkestrasi
//   scan()->handleCode() yang sama dgn adapter gallery (toast/UI hook
//   SparepartScannerUI.onScanResult() konsisten utk kedua adapter).
// - SENGAJA TIDAK dikerjakan (di luar cakupan): OCR, import PDF — itu sudah
//   ada di modul lain (vehicle-catalog-import.js utk PDF), TIDAK
//   diduplikasi/disentuh di sini.
//
// Dependency: VehicleScanner (vehicle-scanner.js, utk ensureZXing/buildHints/
// errorMessage) & VehicleCatalog (vehicle-catalog.js, utk handleScan) HARUS
// sudah dimuat lebih dulu (lihat urutan di scripts/build.js).

// ------------------------------------------------------------------------
// Adapter registry — murni Map nama->fungsi, supaya sumber kode scan (galeri
// foto sekarang, kamera nanti) bisa ditambah tanpa mengubah orkestrasi
// scan()/handleCode() di bawah.
// ------------------------------------------------------------------------
const _sparepartScannerAdapters = {};

// Guard anti-dobel — cegah 2 instance adapter (mis. cameraAdapter, 2 stream
// kamera + video.play() dobel) jalan bersamaan kalau sparepartScannerScan()
// ke-trigger 2x (double-tap/event delegation nembak 2x). Satu flag di titik
// orkestrasi ini otomatis melindungi semua adapter (camera & gallery),
// TIDAK perlu ubah logic masing-masing adapter.
let _sparepartScannerBusy = false;

// AUDIT (Target Implementasi #6 — Scan Debounce): state debounce TERPISAH
// dari VehicleScanner (module-level sendiri di sini) — sengaja TIDAK
// berbagi state dgn vehicle-scanner.js krn keduanya scanner independen
// (scan sparepart X lalu scan kendaraan Y beda konteks, tidak boleh
// saling debounce). Window & mekanisme SAMA PERSIS vehicleScannerShouldDebounce().
const SPAREPART_SCANNER_DEBOUNCE_MS = 1500;
let _sparepartScannerLastValue = null;
let _sparepartScannerLastTimestamp = 0;

// BUGFIX (fungsi kembar vehicleScannerWithCameraTimeout() di vehicle-
// scanner.js — lihat catatan lengkap di sana): decodeFromConstraints()/
// decodeFromVideoDevice() (ZXing) bisa menggantung SELAMANYA (tidak
// resolve maupun reject) kalau browser/OS diam-diam block izin kamera
// tanpa menampilkan prompt. Tanpa timeout guard, sparepartScannerScan()
// nyangkut permanen (overlay hitam, _sparepartScannerBusy tidak pernah
// direset) — SAMA PERSIS root cause yang sudah diperbaiki di
// vehicle-scanner.js. Fix: race melawan timeout di sini juga.
const SPAREPART_SCANNER_CAMERA_INIT_TIMEOUT_MS = 10000;

function sparepartScannerWithCameraTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Kamera tidak merespons — cek izin kamera untuk situs ini di pengaturan browser/OS, lalu coba lagi.');
      err.sparepartScannerCameraTimeout = true;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sparepartScannerShouldDebounce(code, now) {
  const ts = typeof now === 'number' ? now : Date.now();
  if (_sparepartScannerLastValue === code && (ts - _sparepartScannerLastTimestamp) < SPAREPART_SCANNER_DEBOUNCE_MS) {
    return true;
  }
  return false;
}

function sparepartScannerRecordScan(code, now) {
  _sparepartScannerLastValue = code;
  _sparepartScannerLastTimestamp = typeof now === 'number' ? now : Date.now();
}

// AUDIT (Target Implementasi #3 — MediaStream Cleanup): pola SAMA PERSIS
// vehicleScannerStopMediaStream() (vehicle-scanner.js) — reader.reset() saja
// tidak menjamin kamera benar2 mati di semua browser.
function sparepartScannerStopMediaStream(video) {
  try {
    const stream = video && video.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* no-op */ }
      });
    }
  } catch (e) { /* no-op */ }
  try { if (video) video.srcObject = null; } catch (e) { /* no-op */ }
}

// AUDIT (Target Implementasi #5 — Visibility Lifecycle): pola SAMA PERSIS
// vehicleScannerPauseCamera()/ResumeCamera()/AttachLifecycle()/
// DetachLifecycle() (vehicle-scanner.js) — duplikasi sengaja (konsisten dgn
// pola existing file ini yang sudah duplikasi overlay/teardown, bukan
// share module, lihat catatan kepala file soal "pola SAMA PERSIS").
function sparepartScannerPauseCamera(video) {
  try {
    const stream = video && video.srcObject;
    if (stream && typeof stream.getVideoTracks === 'function') {
      stream.getVideoTracks().forEach((t) => { try { t.enabled = false; } catch (e) { /* no-op */ } });
    }
  } catch (e) { /* no-op */ }
  try { if (video && typeof video.pause === 'function') video.pause(); } catch (e) { /* no-op */ }
}

function sparepartScannerResumeCamera(video) {
  try {
    const stream = video && video.srcObject;
    if (stream && typeof stream.getVideoTracks === 'function') {
      stream.getVideoTracks().forEach((t) => { try { t.enabled = true; } catch (e) { /* no-op */ } });
    }
  } catch (e) { /* no-op */ }
  try { if (video && typeof video.play === 'function') video.play().catch(() => { /* no-op */ }); } catch (e) { /* no-op */ }
}

function sparepartScannerAttachLifecycle(video, onPageHide) {
  const onVisibility = () => {
    if (typeof document === 'undefined' || typeof document.hidden === 'undefined') return;
    if (document.hidden) sparepartScannerPauseCamera(video);
    else sparepartScannerResumeCamera(video);
  };
  const onFreeze = () => sparepartScannerPauseCamera(video);
  const onResume = () => sparepartScannerResumeCamera(video);
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

function sparepartScannerDetachLifecycle(handlers) {
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

// AUDIT (Target Implementasi #7 — Torch Capability): pola SAMA PERSIS
// vehicleScannerApplyTorchCapability().
function sparepartScannerApplyTorchCapability(video, flashBtn) {
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
          }).catch(() => { /* no-op */ });
        }
      };
      return true;
    }
  } catch (e) { /* no-op */ }
  flashBtn.style.display = 'none';
  return false;
}

// Reuse VehicleScanner.isHarmlessDecodeError() (vehicle-scanner.js) — pola
// guard typeof SAMA PERSIS sparepartScannerErrorMessage() di bawah, fallback
// aman kalau VehicleScanner belum/tidak dimuat (mis. test terisolasi): TIDAK
// tahu -> anggap fatal (lebih aman drpd diam-diam menelan error sungguhan).
function sparepartScannerIsHarmlessDecodeError(err) {
  if (typeof VehicleScanner !== 'undefined' && VehicleScanner && typeof VehicleScanner.isHarmlessDecodeError === 'function') {
    return VehicleScanner.isHarmlessDecodeError(err);
  }
  return false;
}

function sparepartScannerRegisterAdapter(name, fn) {
  if (!name || typeof fn !== 'function') return false;
  _sparepartScannerAdapters[name] = fn;
  return true;
}

function sparepartScannerGetAdapter(name) {
  return _sparepartScannerAdapters[name] || null;
}

function sparepartScannerListAdapters() {
  return Object.keys(_sparepartScannerAdapters);
}

// ------------------------------------------------------------------------
// Adapter "gallery" — upload gambar dari galeri, decode 1x (bukan continuous
// live scan seperti vehicle-scanner.js). Reuse penuh ZXing lib/hints milik
// VehicleScanner supaya tidak ada 2 sumber kebenaran format/keputusan
// library scan di app ini.
// ------------------------------------------------------------------------
function sparepartScannerPickImageFile() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    let settled = false;
    const finish = (file) => {
      if (settled) return;
      settled = true;
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('focus', onFocus);
      }
      resolve(file || null);
    };
    inp.onchange = (e) => {
      const file = (e && e.target && e.target.files) ? e.target.files[0] : null;
      finish(file);
    };
    // AUDIT (Target Implementasi #4 lanjutan): browser Chromium modern
    // (termasuk Brave) mengirim event 'cancel' kalau dialog file ditutup
    // TANPA pilih file — sebelumnya TIDAK ditangani, Promise tergantung
    // selamanya & _sparepartScannerBusy tersangkut permanen (lihat catatan
    // audit). onchange TIDAK pernah terpanggil di jalur ini, jadi ditangani
    // terpisah di sini.
    inp.oncancel = () => finish(null);
    // Fallback utk browser yang belum kirim event 'cancel' sama sekali:
    // window balik dapat focus segera setelah dialog file manapun ditutup
    // (baik pilih file maupun batal). Kalau file benar-benar dipilih,
    // onchange sudah keburu resolve duluan (guard `settled`) — delay kecil
    // supaya onchange (yang browser jamin terpanggil sebelum/segera setelah
    // focus balik) sempat jalan lebih dulu.
    const onFocus = () => { setTimeout(() => finish(null), 300); };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', onFocus);
    }
    inp.click();
  });
}

async function sparepartScannerDecodeFromFile(file) {
  if (!file) return null;
  await VehicleScanner.ensureZXing();
  const reader = new ZXing.BrowserMultiFormatReader(VehicleScanner.buildHints());
  const url = URL.createObjectURL(file);
  try {
    const result = await reader.decodeFromImageUrl(url);
    return (result && typeof result.getText === 'function') ? result.getText() : null;
  } finally {
    URL.revokeObjectURL(url);
    // no-op kalau reset() tidak ada/gagal, pola sama vehicleScannerTeardown()
    try { if (reader && typeof reader.reset === 'function') reader.reset(); } catch (e) { /* no-op */ }
  }
}

async function sparepartScannerGalleryAdapter() {
  const file = await sparepartScannerPickImageFile();
  if (!file) return null;
  return sparepartScannerDecodeFromFile(file);
}

// ------------------------------------------------------------------------
// Adapter "camera" — live continuous scan lewat kamera fullscreen. Pola SAMA
// PERSIS vehicleScannerBuildOverlay()/vehicleScannerScan() (vehicle-scanner.js)
// — overlay dibuat dinamis (createElement), CSS class REUSE apa adanya
// (.vehicle-scanner-fullscreen dkk, styles.css, TIDAK ada class baru), &
// dilepas total dari DOM saat scan selesai/dibatalkan. Bedanya: fungsi ini
// me-resolve Promise dgn STRING kode (bukan langsung panggil
// VehicleCatalog.handleScan() seperti vehicleScannerHandleResult()), supaya
// tetap lewat orkestrasi sparepartScannerScan()->sparepartScannerHandleCode()
// yang sama dgn adapter gallery di atas (satu jalur toast/UI hook utk kedua
// adapter, bukan 2 jalur berbeda).
// ------------------------------------------------------------------------
function sparepartScannerBuildOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'vehicle-scanner-fullscreen';
  // BUGFIX (laporan user: kamera scan sparepart terbuka sbg kotak kecil di
  // tengah, dashboard tetap kelihatan di sekitarnya alih-alih fullscreen
  // hitam menutupi semuanya) -- kalau stylesheet .vehicle-scanner-fullscreen
  // gagal ke-apply (mis. Service Worker/PWA masih nyimpen styles.css versi
  // lama yg belum punya class ini, kejadian umum di GitHub Pages sebelum
  // hard refresh/update cache), overlay jatuh ke posisi STATIC & ukurannya
  // cuma shrink-wrap ke konten (video+frame+hint), BUKAN fixed fullscreen.
  // Inline style di sini jadi jaring pengaman independen dari CSS eksternal
  // -- selalu fixed+inset:0+z-index tinggi apa pun keadaan stylesheet-nya,
  // tanpa mengubah/duplikasi definisi visual lain (warna dll tetap dari
  // class CSS, cuma properti pemosisian yang di-pastikan di sini).
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
  hint.textContent = 'Arahkan kamera ke barcode / QR / DataMatrix sparepart';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'vehicle-scanner-close';
  closeBtn.setAttribute('aria-label', 'Tutup scanner');
  closeBtn.textContent = '✕';

  // Tombol Flash/Torch (Target Implementasi #7) — pola SAMA PERSIS
  // vehicleScannerBuildOverlay(), CSS class direuse (.vehicle-scanner-flash).
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
    sparepartScannerApplyTorchCapability(video, flashBtn);
  });

  return { overlay, video, closeBtn, flashBtn };
}

// Teardown overlay scanner ITU SENDIRI — TIDAK lagi memanggil resume UI
// global di sini (lihat catatan vehicleScannerTeardown() di vehicle-
// scanner.js, pola SAMA PERSIS): itu tanggung jawab ScannerSession.exit(),
// dipanggil SETELAH teardown ini di sparepartScannerCameraAdapter() di bawah.
// AUDIT (Target Implementasi #3 & #5): sekarang juga stop MediaStream track
// eksplisit & lepas listener lifecycle — pola SAMA PERSIS
// vehicleScannerTeardown(). Idempotent, dipakai jadi jaring pengaman
// finally{} di sparepartScannerCameraAdapter().
function sparepartScannerTeardownOverlay(reader, ui, lifecycleHandlers) {
  try { if (reader && typeof reader.reset === 'function') reader.reset(); } catch (e) { /* no-op, sama pola try/catch existing di modul lain */ }
  sparepartScannerStopMediaStream(ui && ui.video);
  sparepartScannerDetachLifecycle(lifecycleHandlers);
  const overlay = ui && ui.overlay;
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

function sparepartScannerCameraAdapter() {
  return new Promise((resolve, reject) => {
    // ScannerSession.enter() TIDAK lagi dipanggil di sini — sudah dipanggil
    // lebih dulu oleh sparepartScannerScan() (orkestrasi), SEBELUM toast
    // "Membuka kamera..." & sebelum adapter ini jalan (lihat catatan audit
    // di sana). enter() idempotent (no-op kalau sudah aktif) jadi aman kalau
    // suatu saat dipanggil dari 2 tempat. exit() TETAP di sini (bukan di
    // orkestrasi) krn PD-007 mewajibkan exit() jalan SETELAH overlay
    // scanner ini di-teardown, & orkestrasi tidak tahu momen itu.
    const _session = (typeof ScannerSession !== 'undefined' && ScannerSession) ? ScannerSession : null;
    let reader = null;
    let ui = null;
    let lifecycleHandlers = null;
    let stopped = false;

    const stop = (code) => {
      if (stopped) return;
      stopped = true;
      sparepartScannerTeardownOverlay(reader, ui, lifecycleHandlers);
      if (_session) _session.exit();
      resolve(code || null);
    };

    (async () => {
      // AUDIT (Target Implementasi #2 — Fail-safe Cleanup): try/finally
      // sebagai jaring pengaman terakhir, sama seperti vehicleScannerScan()
      // — idempotent, aman dipanggil dobel dgn stop()/catch block di bawah.
      try {
        try {
          await VehicleScanner.ensureZXing();
          if (stopped) return;
          reader = new ZXing.BrowserMultiFormatReader(VehicleScanner.buildHints());
          ui = sparepartScannerBuildOverlay();
          ui.closeBtn.onclick = () => stop(null);
          lifecycleHandlers = sparepartScannerAttachLifecycle(ui.video, () => stop(null));

          const onDecode = (result, err) => {
            if (stopped) return;
            if (result && typeof result.getText === 'function') {
              const code = result.getText();
              // AUDIT (Target Implementasi #6 — Scan Debounce): sama seperti
              // vehicleScannerScan(), kode identik dalam window singkat
              // diabaikan, reader terus jalan sampai kode baru/berbeda masuk.
              if (sparepartScannerShouldDebounce(code, Date.now())) return;
              sparepartScannerRecordScan(code, Date.now());
              stop(code);
              return;
            }
            // NotFoundException dilempar terus-menerus selama belum ada kode di
            // frame — normal utk continuous scan, BUKAN error, diabaikan sama
            // seperti vehicleScannerScan().
            //
            // BUGFIX (sesi ini — lihat vehicleScannerIsHarmlessDecodeError()
            // di vehicle-scanner.js): `err` di sini SEBELUMNYA tidak pernah
            // dibaca — kalau ZXing mengirim error FATAL (mis. izin kamera
            // ditolak) lewat parameter callback per-frame ini (bukan lewat
            // reject() decodeFromConstraints/decodeFromVideoDevice, satu-
            // satunya jalur yang tertangkap catch block di bawah sebelum fix
            // ini), reader "hidup" terus tanpa hasil/toast/exit() — overlay+
            // kamera nyangkut permanen. Lebih riskan di sini drpd
            // vehicleScannerScan(): stop()/toast() di sana 1 fungsi yang
            // sama, di sini exit()/reject() (adapter ini) terpisah dari
            // toast (sparepartScannerScan(), pemanggilnya) — reject() TETAP
            // dipakai (bukan resolve(null)) supaya lewat catch block yang
            // sudah ada di sana & tampil errorMessage() yang benar, sama
            // seperti jalur reject() lain di adapter ini.
            if (err && !stopped && !sparepartScannerIsHarmlessDecodeError(err)) {
              stopped = true;
              console.error('[SparepartScanner] gagal scan (per-frame):', err);
              sparepartScannerTeardownOverlay(reader, ui, lifecycleHandlers);
              if (_session) _session.exit();
              reject(err);
            }
          };

          try {
            await sparepartScannerWithCameraTimeout(
              reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, ui.video, onDecode),
              SPAREPART_SCANNER_CAMERA_INIT_TIMEOUT_MS
            );
          } catch (constraintsErr) {
            if (stopped) return;
            // Timeout sudah pasti gagal (getUserMedia menggantung) — fallback
            // ke device default TIDAK akan lebih baik (sama-sama nunggu
            // getUserMedia), langsung lempar supaya user cepat dapat toast
            // error, tidak nunggu 2x timeout. Sama seperti vehicleScannerScan().
            if (constraintsErr && constraintsErr.sparepartScannerCameraTimeout) throw constraintsErr;
            // Fallback: browser/ZXing versi tertentu tidak dukung
            // decodeFromConstraints atau facingMode environment ditolak —
            // coba device default, sama seperti vehicleScannerScan().
            await sparepartScannerWithCameraTimeout(
              reader.decodeFromVideoDevice(undefined, ui.video, onDecode),
              SPAREPART_SCANNER_CAMERA_INIT_TIMEOUT_MS
            );
          }
        } catch (err) {
          // TIDAK di-resolve(null) — dilempar (reject) supaya
          // sparepartScannerScan() (catch block yang SUDAH ADA) menampilkan
          // errorMessage() yang benar (izin kamera/jaringan), bukan toast
          // generik "kode tidak terbaca".
          if (stopped) return;
          stopped = true;
          sparepartScannerTeardownOverlay(reader, ui, lifecycleHandlers);
          if (_session) _session.exit();
          reject(err);
        }
      } finally {
        // Jaring pengaman terakhir — idempotent, tidak menimpa resolve/reject
        // yang sudah dipanggil di atas (stop()/reject() sudah jalan duluan).
        sparepartScannerTeardownOverlay(reader, ui, lifecycleHandlers);
        if (_session) _session.exit();
      }
    })();
  });
}

// ------------------------------------------------------------------------
// Error message — reuse penuh VehicleScanner.errorMessage() (pesan jaringan/
// izin/"kode tidak terdeteksi" yang SUDAH ADA), fallback minimal kalau
// dipanggil dari konteks VehicleScanner belum ter-load (mis. test terisolasi).
// ------------------------------------------------------------------------
function sparepartScannerErrorMessage(err) {
  if (typeof VehicleScanner !== 'undefined' && VehicleScanner && typeof VehicleScanner.errorMessage === 'function') {
    return VehicleScanner.errorMessage(err);
  }
  const raw = (err && err.message) || (err && err.name) || (typeof err === 'string' ? err : '');
  if (raw) return raw;
  return 'error tidak diketahui — cek koneksi internet, lalu coba lagi';
}

// ------------------------------------------------------------------------
// Orkestrasi utama — terima STRING kode dari adapter mana pun (gallery
// sekarang, camera nanti), reuse VehicleCatalog.handleScan(code) apa adanya
// (pola SAMA PERSIS vehicleScannerHandleResult() di vehicle-scanner.js).
// ------------------------------------------------------------------------
async function sparepartScannerHandleCode(code) {
  const trimmed = (code || '').toString().trim();
  if (!trimmed) {
    toast('⚠️ Tidak ada kode terbaca dari gambar — coba foto lebih dekat/jelas');
    return { found: false, item: null, error: 'Kode tidak terdeteksi.' };
  }
  const result = await VehicleCatalog.handleScan(trimmed);
  if (result && result.found) {
    toast('✅ Part ditemukan: ' + (result.item && result.item.partName ? result.item.partName : trimmed));
  } else if (result && result.draft) {
    toast('📦 Part belum ada di katalog — draft dibuat, lengkapi datanya');
  }
  // Jembatan opsional ke UI (sparepart-scanner-ui.js), guard typeof sama
  // persis pola vehicleScannerHandleResult() -> VehicleCatalogUI.onScanResult().
  if (typeof SparepartScannerUI !== 'undefined' && SparepartScannerUI && typeof SparepartScannerUI.onScanResult === 'function') {
    SparepartScannerUI.onScanResult(result, trimmed);
  }
  return result;
}

async function sparepartScannerScan(adapterName) {
  if (_sparepartScannerBusy) {
    // Scan lain masih berjalan (double-tap/event dobel) — abaikan trigger
    // kedua, tidak toast error supaya tidak berisik ke user.
    return null;
  }
  const name = adapterName || 'gallery';
  const adapter = sparepartScannerGetAdapter(name);
  if (!adapter) {
    toast('⚠️ Metode scan "' + name + '" belum tersedia');
    return null;
  }
  _sparepartScannerBusy = true;
  // AUDIT: enter() dipanggil di sini (orkestrasi), SEBELUM toast & sebelum
  // adapter() jalan — hanya utk adapter 'camera' (satu-satunya yang
  // membangun overlay fullscreen; adapter 'gallery' pakai <input type=file>
  // native, tidak butuh suspend UI). Dulu enter() baru dipanggil di dalam
  // sparepartScannerCameraAdapter(), SETELAH toast ini — race yang sama
  // seperti vehicleScannerScan() (lihat catatan di sana): toast bisa sempat
  // ke-render sebelum class scanner-session-active aktif. exit() TETAP
  // tanggung jawab cameraAdapter (harus jalan setelah overlay-nya sendiri
  // di-teardown, PD-007).
  const _session = (name === 'camera' && typeof ScannerSession !== 'undefined' && ScannerSession) ? ScannerSession : null;
  // AUDIT (Cross-Scanner Guard): pola SAMA PERSIS vehicleScannerScan() —
  // _sparepartScannerBusy hanya melindungi dari dobel-buka modul ini
  // sendiri, TIDAK dari VehicleScanner yang kebetulan sedang aktif
  // bersamaan. Cek ScannerSession.isActive() dulu sebelum enter() supaya
  // tidak ada 2 overlay fullscreen + 2 stream kamera menumpuk. Adapter
  // 'gallery' tidak kena guard ini (tidak pakai ScannerSession sama sekali).
  if (_session && _session.isActive()) {
    _sparepartScannerBusy = false;
    toast('⚠️ Scanner lain sedang aktif — tutup dulu, lalu coba lagi');
    return null;
  }
  if (_session) _session.enter();
  toast(name === 'camera' ? '🔍 Membuka kamera...' : '🔍 Memindai gambar...', 4000);
  try {
    const code = await adapter();
    if (!code) {
      toast(name === 'camera' ? '⚠️ Scan dibatalkan/kode tidak terbaca' : '⚠️ Tidak ada gambar dipilih/kode tidak terbaca');
      return null;
    }
    return await sparepartScannerHandleCode(code);
  } catch (err) {
    console.error('[SparepartScanner] gagal scan:', err);
    toast('❌ Gagal scan: ' + sparepartScannerErrorMessage(err));
    return null;
  } finally {
    _sparepartScannerBusy = false;
  }
}

// Daftarkan adapter 'gallery' (Tahap 7B-1) & 'camera' (Tahap 7B-2) — dua-
// duanya lewat registry yang sama, tanpa mengubah orkestrasi scan()/
// handleCode() di atas.
sparepartScannerRegisterAdapter('gallery', sparepartScannerGalleryAdapter);
sparepartScannerRegisterAdapter('camera', sparepartScannerCameraAdapter);

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis VehicleScanner/VehicleCatalog (const
// object, expose eksplisit ke window krn Node vm & browser non-module script
// TIDAK otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const SparepartScanner = {
  scan: sparepartScannerScan,
  handleCode: sparepartScannerHandleCode,
  registerAdapter: sparepartScannerRegisterAdapter,
  getAdapter: sparepartScannerGetAdapter,
  listAdapters: sparepartScannerListAdapters,
  errorMessage: sparepartScannerErrorMessage,
  pickImageFile: sparepartScannerPickImageFile,
  decodeFromFile: sparepartScannerDecodeFromFile,
  cameraAdapter: sparepartScannerCameraAdapter,
  // Diekspos utk test murni (Target Implementasi #9) — pola sama seperti
  // VehicleScanner.shouldDebounce/stopMediaStream/dst.
  shouldDebounce: sparepartScannerShouldDebounce,
  recordScan: sparepartScannerRecordScan,
  stopMediaStream: sparepartScannerStopMediaStream,
  applyTorchCapability: sparepartScannerApplyTorchCapability,
  pauseCamera: sparepartScannerPauseCamera,
  resumeCamera: sparepartScannerResumeCamera,
  isHarmlessDecodeError: sparepartScannerIsHarmlessDecodeError,
  withCameraTimeout: sparepartScannerWithCameraTimeout,
};

if (typeof window !== 'undefined') {
  window.SparepartScanner = SparepartScanner;
}
