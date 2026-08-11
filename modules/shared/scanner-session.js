// modules/shared/scanner-session.js — ScannerSession (Tahap 5, docs/
// PRODUCT_DECISIONS.md § "Scanner — Exclusive Scanner Mode via ScannerSession
// (FINAL — Sesi 316, PD-007)").
//
// PD-007 — Scanner WAJIB berjalan lewat ScannerSession.enter()/exit():
// - Ini SATU-SATUNYA titik masuk/keluar utk membuka scanner apa pun
//   (VehicleScanner, SparepartScanner, & scanner masa depan) — tidak ada
//   jalur lain yang boleh suspend/resume UI global (modal/toast/dashboard)
//   di luar file ini.
// - Scanner Engine (lapisan ZXing/decode di vehicle-scanner.js/
//   sparepart-scanner.js) TIDAK BOLEH menyentuh modal/toast/dashboard sama
//   sekali lagi — tanggung jawab itu 100% pindah ke sini. Alur wajib:
//     ScannerSession.enter()  ->  Scanner.start() (mis. VehicleScanner.scan())
//     ->  ScannerSession.exit()
// - State "scanner aktif" adalah state EKSPLISIT (_active di bawah), di-set
//   sendiri oleh enter()/exit() — BUKAN disimpulkan dari keberadaan elemen
//   <video> di DOM (itu cara lama yang diganti, lihat catatan di
//   modules/shared/modal-navigasi.js soal blok camera-scan-active yang
//   dihapus sesi ini).
// - Urutan enter(): suspend UI global (pauseUI()) dulu, BARU scanner engine
//   boleh membangun overlay & mulai decode. Urutan exit(): scanner engine
//   teardown dulu (overlay sudah dilepas SEBELUM exit() dipanggil), baru UI
//   global di-resume (resumeUI()) — kebalikan dari enter(), supaya tidak ada
//   jendela waktu di mana keduanya aktif bersamaan.
//
// pauseUI()/resumeUI() REUSE PENUH teknik yang sudah ada sebelum sesi ini
// (vehicleScannerHideChrome()/vehicleScannerRestoreChrome() di
// vehicle-scanner.js, & style injection ala _camScanFixStyle di
// modal-navigasi.js) — 0 CSS/selector baru, cuma dipindah ke sini & dipanggil
// EKSPLISIT (bukan lewat MutationObserver/setInterval/querySelector('video')
// lagi).
//
// HOTFIX Scanner Session/FAB (lanjutan Tahap 6): FAB (`.keu-fab`,
// position:fixed — keuFab/shopFab/laporanFab/shopLaporanFab/carNotesFab, dst)
// ikut disembunyikan pauseUI() & dikembalikan resumeUI(), pola & guard SAMA
// PERSIS #mainNav/#mainHeader (simpan style.display asli, restore persis,
// idempotent). TIDAK ada ID FAB yang di-hardcode — pakai
// `document.querySelectorAll('.keu-fab')` supaya FAB apa pun (termasuk yang
// ditambah di masa depan) otomatis tercakup. 0 perubahan API publik
// ScannerSession, 0 perubahan ke enter()/exit()/isActive(), 0 sentuhan ke
// Scanner Engine (vehicle-scanner.js/sparepart-scanner.js) atau modals.js.

let _scannerSessionActive = false;
let _scannerSessionPrevChrome = null;

// AUDIT (Reference Counter): enter()/exit() DULU murni boolean (_active),
// jadi rentan race kalau ada 2 pemanggil yang saling tidak tahu (mis.
// sparepartScannerScan() orkestrasi enter() lalu adapter camera-nya sendiri
// juga sempat enter() di path lain) — exit() pertama yang jalan akan
// langsung resumeUI() walau pemanggil lain masih menganggap sesi aktif.
// Sekarang pakai internal reference counter (_scannerSessionCount):
// enter() menaikkan counter, HANYA pauseUI() kalau counter naik dari 0->1;
// exit() menurunkan counter, HANYA resumeUI() kalau counter turun ke 0.
// Public API TIDAK berubah (enter()/exit()/isActive() tetap sama, tetap
// return boolean) — murni penguatan internal, 0 breaking change ke
// pemanggil existing (vehicle-scanner.js/sparepart-scanner.js).
let _scannerSessionCount = 0;

// AUDIT (lanjutan PD-007): CSS sekarang jadi mekanisme UTAMA utk
// menyembunyikan overlay & FAB selama Exclusive Scanner Mode aktif — bukan
// lagi JS snapshot/restore per elemen (pola lama _scannerSessionQueryFabs()+
// _scannerSessionPrevFabDisplay yang DIHAPUS sesi ini). Alasan: selector
// generik (`.overlay.open`, `.keu-fab`, dst) otomatis meng-cover elemen yang
// di-mount SETELAH enter() dipanggil (mis. FAB/modal baru), yang TIDAK bisa
// dicover snapshot sekali-jalan berbasis querySelectorAll di pauseUI().
// pauseUI()/resumeUI() jadi HANYA menangani state global sejati (toggle
// class body + #mainNav/#mainHeader, yang memang butuh restore nilai
// display ASLI, bukan sekadar '' vs 'none').
//
// Selector diperluas dari `.overlay.open` saja jadi mencakup SEMUA varian
// overlay/modal fixed yang ada di app (root cause bug ditemukan saat audit:
// `.qs-modal-overlay` & `.calc-overlay` PAKAI CLASS BERBEDA dari `.overlay`,
// jadi TIDAK ke-cover rule lama — modal QuickSelect/Kalkulator bisa tetap
// aktif di belakang scanner). Child combinator `>` juga DIHAPUS (rule lama
// `body.scanner-session-active > .overlay.open` cuma match kalau `.overlay`
// direct child <body> — modal yang nested di wrapper lain lolos dari
// suppression).
function _scannerSessionEnsureStyle() {
  if (document.getElementById('_scannerSessionStyle')) return;
  const style = document.createElement('style');
  style.id = '_scannerSessionStyle';
  style.textContent = [
    'body.scanner-session-active .overlay.open{display:none !important;}',
    'body.scanner-session-active .qs-modal-overlay{display:none !important;}',
    'body.scanner-session-active .calc-overlay{display:none !important;}',
    'body.scanner-session-active .keu-fab{display:none !important;}',
    'body.scanner-session-active #toast{display:none !important;}',
  ].join('');
  document.head.appendChild(style);
}

// pauseUI() — suspend UI global (modal/toast/dashboard chrome) SEBELUM
// scanner engine membangun overlay-nya sendiri. "Dashboard" di sini = chrome
// #mainNav/#mainHeader (REUSE penuh vehicleScannerHideChrome() lama — z-index
// #mainNav ternyata tetap kepaint di atas overlay scanner di sebagian
// browser/mode non-PWA, lihat catatan asli di vehicle-scanner.js), "modal/
// toast" = .overlay.open manapun & #toast (REUSE penuh aturan CSS
// camera-scan-active lama).
function scannerSessionPauseUI() {
  _scannerSessionEnsureStyle();
  const nav = document.getElementById('mainNav');
  const header = document.getElementById('mainHeader');
  _scannerSessionPrevChrome = {
    navDisplay: nav ? nav.style.display : null,
    headerDisplay: header ? header.style.display : null,
  };
  if (nav) nav.style.display = 'none';
  if (header) header.style.display = 'none';
  // FAB (.keu-fab) TIDAK lagi di-snapshot/di-hide di sini — ditangani CSS
  // (`_scannerSessionEnsureStyle()`) via class body.scanner-session-active,
  // di-toggle di baris berikut.
  document.body.classList.add('scanner-session-active');
}

// resumeUI() — kebalikan pauseUI(), dipanggil SESUDAH scanner engine teardown
// (overlay-nya sendiri sudah dilepas dari DOM) supaya tidak ada jendela waktu
// scanner & UI global aktif bersamaan.
function scannerSessionResumeUI() {
  const nav = document.getElementById('mainNav');
  const header = document.getElementById('mainHeader');
  if (_scannerSessionPrevChrome) {
    if (nav) nav.style.display = _scannerSessionPrevChrome.navDisplay || '';
    if (header) header.style.display = _scannerSessionPrevChrome.headerDisplay || '';
  }
  _scannerSessionPrevChrome = null;
  document.body.classList.remove('scanner-session-active');
}

// enter() — satu-satunya titik masuk Exclusive Scanner Mode. Guard anti-
// dobel (mis. Scanner.start() ke-trigger 2x sebelum exit() pertama sempat
// jalan) — no-op kalau sudah aktif, supaya _scannerSessionPrevChrome asli
// tidak ketiban nilai 'none' dari sesi scanner sebelumnya.
function scannerSessionEnter() {
  // Jaring pengaman kedua: kalau pemanggil langsung enter() tanpa cek
  // isActive() dulu (jalur lain di masa depan), tetap self-heal di sini
  // sebelum counter dinaikkan, supaya enter() baru ini tidak numpuk di atas
  // state nyangkut lama.
  _scannerSessionSelfHeal();
  _scannerSessionCount++;
  if (_scannerSessionCount > 1) {
    // Sudah ada sesi aktif (nested enter()) — cuma naikkan counter, TIDAK
    // pauseUI() lagi (supaya _scannerSessionPrevChrome asli tidak ketiban
    // nilai dari enter() ke-2), no-op sama seperti guard lama.
    return false;
  }
  _scannerSessionActive = true;
  scannerSessionPauseUI();
  if (typeof AIBus !== 'undefined' && AIBus && typeof AIBus.emit === 'function') {
    AIBus.emit('Scanner:opened', {});
  }
  return true;
}

// exit() — satu-satunya titik keluar Exclusive Scanner Mode. Aman dipanggil
// walau enter() belum pernah/gagal (mis. Scanner Engine error sebelum sempat
// enter()) — no-op kalau memang belum aktif.
function scannerSessionExit() {
  if (_scannerSessionCount <= 0) {
    // exit() dipanggil walau tidak ada enter() yang "berhutang" (belum
    // pernah enter(), atau sudah di-exit() sampai 0 sebelumnya) — no-op,
    // JANGAN turun ke negatif (kalau tidak, enter() berikutnya butuh 2x
    // exit() baru resumeUI(), padahal counter seharusnya sudah balik ke 0).
    return false;
  }
  _scannerSessionCount--;
  if (_scannerSessionCount > 0) {
    // Masih ada sesi lain yang "berhutang" exit() (nested enter()) — belum
    // boleh resumeUI(), tunggu exit() yang menurunkan counter ke 0.
    return false;
  }
  _scannerSessionActive = false;
  scannerSessionResumeUI();
  if (typeof AIBus !== 'undefined' && AIBus && typeof AIBus.emit === 'function') {
    AIBus.emit('Scanner:closed', {});
  }
  return true;
}

// SELF-HEALING GUARD (bugfix: ScannerSession nyangkut aktif selamanya) —
// _scannerSessionActive bisa nyangkut `true` PERMANEN kalau proses tutup
// kamera terputus di tengah jalan (app di-minimize pas prompt izin kamera
// muncul, tab di-suspend browser, dll): finally{} di Scanner Engine (vehicle-
// scanner.js/sparepart-scanner.js) tidak sempat jalan sampai selesai ->
// ScannerSession.exit() tidak pernah terpanggil, TAPI overlay scanner-nya
// (.vehicle-scanner-fullscreen) sudah lenyap dari DOM (browser sudah
// mematikan halaman/stream duluan). Akibatnya body.scanner-session-active
// nempel permanen -> CSS (_scannerSessionEnsureStyle) men-display:none SEMUA
// .overlay/.qs-modal-overlay/.calc-overlay/.keu-fab/#toast SELAMANYA, dan
// isActive() selalu return true -> scanner baru pun ditolak terus ("Scanner
// lain sedang aktif", lihat vehicle-scanner.js/sparepart-scanner.js) tanpa
// jalan keluar selain reload penuh.
//
// Guard: overlay scanner (VehicleScanner & SparepartScanner PAKAI CLASS SAMA
// PERSIS, `.vehicle-scanner-fullscreen`, lihat vehicleScannerBuildOverlay())
// adalah bukti fisik satu-satunya bahwa sesi scanner BENERAN masih hidup di
// layar. Kalau flag bilang aktif tapi overlay itu sudah tidak ada -> state
// dianggap nyangkut, paksa reset PENUH (counter, flag, class body, restore
// chrome via resumeUI()) sebelum lanjut. Dipanggil di titik-titik yang
// dicek pemanggil SEBELUM membuka scanner baru (isActive()) & di awal
// enter() itu sendiri, supaya pemanggil manapun tidak pernah ketiban state
// nyangkut ini.
function _scannerSessionHasLiveOverlay() {
  if (typeof document === 'undefined' || !document.querySelector) return true;
  return !!document.querySelector('.vehicle-scanner-fullscreen');
}

function _scannerSessionSelfHeal() {
  if (_scannerSessionActive && !_scannerSessionHasLiveOverlay()) {
    _scannerSessionCount = 0;
    _scannerSessionActive = false;
    scannerSessionResumeUI();
    return true;
  }
  return false;
}

function scannerSessionIsActive() {
  _scannerSessionSelfHeal();
  return _scannerSessionActive;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis VehicleScanner/SparepartScanner (const
// object, expose eksplisit ke window krn Node vm & browser non-module script
// TIDAK otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const ScannerSession = {
  enter: scannerSessionEnter,
  exit: scannerSessionExit,
  pauseUI: scannerSessionPauseUI,
  resumeUI: scannerSessionResumeUI,
  isActive: scannerSessionIsActive,
};

if (typeof window !== 'undefined') {
  window.ScannerSession = ScannerSession;
}

// WATCHDOG GLOBAL (audit lanjutan v1027 — rekomendasi tier-1, gap "whack-a-
// mole"): fix v1026 (openModal()) & v1027 (_queueDialog()/openQS()) menutup
// celah dengan menambahkan panggilan self-heal SATU PER SATU di titik masuk
// overlay yang SUDAH DIKETAHUI. Pola ini rapuh — kalau ADA titik masuk baru
// di masa depan (mis. modul fitur baru yang buka overlay-nya sendiri tanpa
// lewat openModal()/_queueDialog()/openQS()), state nyangkut yang sama bisa
// lolos lagi tanpa terdeteksi sampai ada laporan user berikutnya.
//
// Root cause aslinya adalah TIMING: proses tutup kamera terputus paling
// sering terjadi persis saat app di-minimize/tab di-suspend (browser
// mematikan halaman sebelum finally{} sempat jalan). Titik paling andal
// untuk self-heal BUKAN "setiap fungsi yang buka overlay", tapi "setiap kali
// app kembali terlihat/aktif" — karena itu momen paling mungkin state
// nyangkut baru saja terjadi, TERLEPAS dari overlay/modul mana yang nanti
// mau dibuka user. Guard ini mencakup SEMUA jalur (termasuk yang belum
// ditulis) tanpa perlu tahu titik masuk spesifiknya.
//
// 0 perubahan API ScannerSession, 0 breaking change — cuma memanggil
// isActive() (yang sudah idempotent & aman dipanggil kapan saja) di momen
// tambahan. Tidak menggantikan guard yang sudah ada di openModal()/
// _queueDialog()/openQS() (defense-in-depth, bukan pengganti).
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') scannerSessionIsActive();
  });
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pageshow', function () { scannerSessionIsActive(); });
  window.addEventListener('focus', function () { scannerSessionIsActive(); });
}

// RECOVERY BANNER (tier-3, rekomendasi FIX-s362-scannersession-global-
// watchdog.md yg belum dikerjakan sesi s363-s365): watchdog Tier-1 di atas
// sudah mengurangi kemungkinan state nyangkut lolos, TAPI kalau user
// kejadian PERSIS di celah kecil sebelum watchdog sempat jalan (mis.
// browser sangat lawas tanpa visibilitychange/pageshow/focus), satu-satunya
// jalan keluar user awam SEBELUMNYA adalah reload penuh atau trik console
// manual (lihat "Unblock cepat" di FIX-s360). Elemen di bawah kasih jalan
// keluar VISUAL yang TIDAK ikut disembunyikan CSS suppression
// (body.scanner-session-active .overlay/.qs-modal-overlay/.calc-overlay/
// #toast{display:none!important}) krn SENGAJA dibuat bukan .overlay/
// .qs-modal-overlay/.calc-overlay/#toast — style-nya inline, bukan lewat
// class apa pun.
//
// Poll ringan tiap RECOVERY_POLL_MS: tampil HANYA kalau _scannerSessionActive
// sudah true LEBIH LAMA dari RECOVERY_STUCK_MS **dan** overlay scanner
// sungguhan (.vehicle-scanner-fullscreen) sudah tidak ada di DOM (indikator
// fisik sesi memang nyangkut, dipakai bareng _scannerSessionHasLiveOverlay()
// yang sudah ada — 0 logic baru soal "apa itu nyangkut", REUSE penuh).
// Sesi scanner yang BENERAN aktif (overlay masih hidup) TIDAK pernah
// memicu banner ini, berapa lama pun durasinya.
const RECOVERY_STUCK_MS = 10000; // 10 detik -- jauh di atas durasi wajar buka kamera/render overlay
const RECOVERY_POLL_MS = 3000;
let _scannerSessionEnteredAt = null;
let _scannerSessionRecoveryEl = null;

function _scannerSessionShowRecoveryBanner() {
  if (typeof document === 'undefined' || _scannerSessionRecoveryEl) return;
  const el = document.createElement('div');
  el.id = '_scannerSessionRecoveryBanner';
  el.textContent = '⚠️ Gangguan terdeteksi — ketuk untuk reset tampilan';
  el.setAttribute('role', 'button');
  // Inline style murni (BUKAN class .overlay/.qs-modal-overlay/.calc-overlay/
  // #toast) -- itu SATU-SATUNYA alasan elemen ini lolos dari suppression
  // CSS. Jangan ganti jadi class card/modal/toast apa pun yang sudah ada.
  el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:16px;z-index:999999;' +
    'background:#b91c1c;color:#fff;padding:12px 16px;border-radius:10px;' +
    'font:14px/1.4 -apple-system,system-ui,sans-serif;text-align:center;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:pointer;';
  el.onclick = function () {
    _scannerSessionEnteredAt = null;
    scannerSessionIsActive(); // trigger self-heal (overlay sudah tidak live -> pasti reset)
    if (el.parentNode) el.parentNode.removeChild(el);
    _scannerSessionRecoveryEl = null;
  };
  (document.body || document.documentElement).appendChild(el);
  _scannerSessionRecoveryEl = el;
}

function _scannerSessionHideRecoveryBanner() {
  if (_scannerSessionRecoveryEl && _scannerSessionRecoveryEl.parentNode) {
    _scannerSessionRecoveryEl.parentNode.removeChild(_scannerSessionRecoveryEl);
  }
  _scannerSessionRecoveryEl = null;
}

function _scannerSessionRecoveryTick() {
  if (!_scannerSessionActive) { _scannerSessionEnteredAt = null; _scannerSessionHideRecoveryBanner(); return; }
  if (_scannerSessionEnteredAt === null) { _scannerSessionEnteredAt = Date.now(); return; }
  const stuckLongEnough = (Date.now() - _scannerSessionEnteredAt) >= RECOVERY_STUCK_MS;
  const overlayGone = !_scannerSessionHasLiveOverlay();
  if (stuckLongEnough && overlayGone) _scannerSessionShowRecoveryBanner();
}

if (typeof window !== 'undefined' && typeof window.setInterval === 'function') {
  window.setInterval(_scannerSessionRecoveryTick, RECOVERY_POLL_MS);
}
