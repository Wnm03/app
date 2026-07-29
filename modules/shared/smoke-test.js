/*!
// Dipindah ke modules/shared/smoke-test.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
 * smoke-test.js — validasi ringan otomatis (khusus mode dev)
 * ------------------------------------------------------------
 * Tujuan: menangkap kesalahan struktural SEBELUM kejadian di pemakaian nyata:
 *   1) Semua modul (const NamaModul={...}) yang dipakai lewat data-action="Modul.method"
 *      benar-benar ke-expose ke `window` dan method-nya ada.
 *   2) Semua elemen yang dirujuk lewat document.getElementById(id) di seluruh
 *      source (HTML + semua file .js yang dimuat) benar-benar ada di DOM.
 *
 * Cara kerja: script ini TIDAK pakai daftar id/modul yang di-hardcode, tapi
 * memindai ulang source aplikasi (HTML utama + semua <script src> se-origin)
 * setiap kali dijalankan. Jadi otomatis ikut update kalau ada id/modul baru
 * ditambahkan/dihapus di kemudian hari -- tidak perlu diubah manual.
 *
 * Hanya jalan kalau mode dev terdeteksi (lihat isDevMode()). Di produksi,
 * script ini langsung keluar tanpa melakukan apa-apa (nyaris tanpa biaya).
 *
 * Cara aktifkan manual kalau perlu: buka dengan ?dev=1 di URL, atau jalankan
 * `localStorage.setItem('kw_dev','1')` lalu refresh.
 */
(function () {
  'use strict';

  function isDevMode() {
    try {
      if (new URLSearchParams(location.search).get('dev') === '1') return true;
      if (localStorage.getItem('kw_dev') === '1') return true;
      if (location.protocol === 'file:') return true;
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
    } catch (e) { /* abaikan, anggap bukan dev */ }
    return false;
  }

  if (!isDevMode()) return;

  var LOG_PREFIX = '[smoke-test]';

  // --- 1. Kumpulkan semua source (HTML utama + script se-origin) ---------
  function collectSourceUrls() {
    var urls = [];
    var seen = {};
    function add(u) {
      if (u && !seen[u]) { seen[u] = true; urls.push(u); }
    }
    add(location.href.split('#')[0]);
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        var u = new URL(scripts[i].src, location.href);
        // Jangan ikutkan smoke-test.js sendiri: komentar dokumentasi di file ini
        // memuat contoh literal "Modul.method" & pola id="..." yang kalau ikut
        // di-scan akan salah kedeteksi sebagai referensi asli (false positive).
        if (/(^|\/)smoke-test\.js$/.test(u.pathname)) continue;
        if (u.origin === location.origin) add(u.href);
      } catch (e) { /* skip src yang tidak valid */ }
    }
    return urls;
  }

  function fetchAllSources(urls) {
    return Promise.all(urls.map(function (u) {
      return fetch(u, { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.text() : ''; })
        .catch(function () { return null; }); // null = gagal fetch (beda dari '' = kosong)
    })).then(function (results) {
      var okTexts = [];
      var failedCount = 0;
      results.forEach(function (r) {
        if (r === null) failedCount++; else okTexts.push(r);
      });
      return { text: okTexts.join('\n'), failedCount: failedCount, totalCount: urls.length };
    });
  }

  // --- 2. Ekstraksi referensi dari source ---------------------------------
  function extractGetElementByIdIds(src) {
    var re = /getElementById\(\s*(['"])([A-Za-z0-9_-]+)\1\s*\)/g;
    var ids = {};
    var m;
    while ((m = re.exec(src))) ids[m[2]] = true;
    return Object.keys(ids);
  }

  // Ambil semua "Modul.method" yang dipakai lewat data-action="Modul.method"
  // (ini jalur pemanggilan lewat window[...] di dispatcher klik global, jadi
  // Modul WAJIB ada sebagai properti window, bukan cuma const lokal.)
  function extractDataActionPaths(src) {
    var re = /data-action=(['"])([A-Za-z0-9_.]+)\1/g;
    // BUG NYATA ditemukan saat audit (2026-07-13, pra-existing sejak split
    // chat-action.js 2026-07-12): komentar dokumentasi gaya
    // `// ...data-action="..." di modal...` (mis. di aset-emas-impor.js)
    // ikut ke-match regex di atas krn "." termasuk dlm character class,
    // menghasilkan path palsu "..." (3 elemen kosong setelah displit "."),
    // yang lalu dianggap "modul/fungsi tidak ke-expose" (false positive).
    // Fix: setiap segmen hasil split HARUS berupa identifier JS yang valid
    // (huruf/underscore/$ di awal), bukan cuma "length>=2".
    var identifierRe = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    var paths = {};
    var m;
    while ((m = re.exec(src))) {
      var parts = m[2].split('.');
      var allValid = parts.length >= 2 && parts.every(function (p) { return identifierRe.test(p); });
      if (allValid) paths[m[2]] = parts; // hanya yang berbentuk Modul.method(.sub)
    }
    return paths;
  }

  // Ambil semua id yang "didefinisikan" di source, baik statis (id="xxx" di HTML/
  // template string) maupun dinamis (elemen.id='xxx' lewat assignment JS -- pola
  // umum dipakai buat elemen yang dibuat sekali lalu di-cache/reuse, mis. tombol
  // "muat lebih banyak" yang baru ada di DOM setelah tab/list terkait dirender).
  //
  // BUG NYATA ditemukan saat audit (2026-07-26): pola id="xxx" TANPA `\\?` di
  // depan tiap kutip tidak match id yang ditulis id=\"xxx\" (backslash-escaped) --
  // pola ini muncul di modules/shared/modals.js (MODAL_HTML disimpan sbg array
  // string JS, jadi kutip di dalamnya di-escape). Akibatnya id yang SAH ada &
  // aktif dipakai (mis. dpProduct/dpAiBox/dst di #deliveryPlanModal) salah
  // dilaporkan "hilang". Fix: `\\?` opsional sebelum tiap kutip pembuka/penutup,
  // backward-compatible 100% dgn id="xxx" biasa (0 backslash cocok juga).
  function extractDefinedIds(src) {
    var ids = {};
    var reAttr = /\bid=\\?(['"])([A-Za-z0-9_-]+)\\?\1/g;
    var reAssign = /\.id\s*=\s*\\?(['"])([A-Za-z0-9_-]+)\\?\1/g;
    var m;
    while ((m = reAttr.exec(src))) ids[m[2]] = true;
    while ((m = reAssign.exec(src))) ids[m[2]] = true;
    return ids;
  }

  // --- 3. Jalankan pengecekan ----------------------------------------------
  // "Hilang" hanya kalau id TIDAK ada di DOM sekarang DAN TIDAK ditemukan
  // didefinisikan di mana pun di source (HTML statis atau assignment JS).
  // Ini menghindari false positive utk elemen yang lazy-render (baru dibuat
  // saat tab/section terkait pertama kali dibuka).
  function checkDomIds(ids, definedIds) {
    var missing = [];
    for (var i = 0; i < ids.length; i++) {
      if (document.getElementById(ids[i])) continue;
      if (definedIds[ids[i]]) continue;
      missing.push(ids[i]);
    }
    return missing;
  }

  function checkDataActionPaths(pathsMap) {
    var missing = [];
    Object.keys(pathsMap).forEach(function (full) {
      var parts = pathsMap[full];
      var owner = window, fn = window, ok = true;
      for (var i = 0; i < parts.length; i++) {
        owner = fn;
        fn = fn ? fn[parts[i]] : undefined;
        if (fn === undefined) { ok = false; break; }
      }
      if (!ok || typeof fn !== 'function') missing.push(full);
    });
    return missing;
  }

  function showBanner(text) {
    try {
      var old = document.querySelector('[data-smoke-test-banner]');
      if (old) old.remove();
      var b = document.createElement('div');
      b.setAttribute('data-smoke-test-banner', '1');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
        'background:#c0392b;color:#fff;padding:9px 14px;' +
        'font:600 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.3);';
      b.textContent = text;
      var closeBtn = document.createElement('span');
      closeBtn.textContent = ' ✕';
      closeBtn.style.cssText = 'cursor:pointer;margin-left:12px;font-weight:900;float:right;';
      closeBtn.onclick = function () { b.remove(); };
      b.appendChild(closeBtn);
      (document.body || document.documentElement).appendChild(b);
    } catch (e) { /* jangan sampai banner sendiri bikin crash */ }
  }

  function run() {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    var urls = collectSourceUrls();

    fetchAllSources(urls).then(function (src) {
      var result = { domMissing: [], actionMissing: [], domChecked: 0, actionChecked: 0, skipped: false };

      if (src.failedCount === src.totalCount) {
        // Semua fetch gagal -- biasanya karena dibuka lewat file:// tanpa server lokal
        // (fetch file:// diblok CORS di banyak browser). Jangan klaim "OK" palsu.
        result.skipped = true;
        console.warn(
          LOG_PREFIX + ' Tidak bisa membaca ulang source (fetch gagal, ' +
          'mungkin dibuka via file:// tanpa server lokal). Pengecekan modul/DOM DILEWATI. ' +
          'Jalankan lewat server lokal kecil (mis. `npx serve` atau Live Server) supaya smoke test aktif penuh.'
        );
        return result;
      }
      if (src.failedCount > 0) {
        console.warn(LOG_PREFIX + ' ' + src.failedCount + ' dari ' + src.totalCount + ' file source gagal dibaca ulang; hasil di bawah mungkin tidak lengkap.');
      }

      var ids = extractGetElementByIdIds(src.text);
      var definedIds = extractDefinedIds(src.text);
      var actionPaths = extractDataActionPaths(src.text);

      result.domChecked = ids.length;
      result.actionChecked = Object.keys(actionPaths).length;
      result.domMissing = checkDomIds(ids, definedIds);
      result.actionMissing = checkDataActionPaths(actionPaths);

      return result;
    }).then(function (result) {
      var dt = Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - t0);
      window.__smokeTestResult = result;

      if (!result || result.skipped) return;

      var problems = result.domMissing.length + result.actionMissing.length;

      if (problems === 0) {
        console.log(
          '%c✅ ' + LOG_PREFIX + ' OK — ' + result.domChecked + ' referensi getElementById() & ' +
          result.actionChecked + ' data-action semuanya valid (' + dt + 'ms)',
          'color:#2ecc71;font-weight:700'
        );
        return;
      }

      console.error('❌ ' + LOG_PREFIX + ' Ditemukan ' + problems + ' masalah (' + dt + 'ms):');
      if (result.domMissing.length) {
        console.error(
          '  → ID dirujuk getElementById() tapi TIDAK ADA di HTML manapun (' + result.domMissing.length + '):',
          result.domMissing
        );
      }
      if (result.actionMissing.length) {
        console.error(
          '  → data-action merujuk modul/fungsi yang TIDAK ke-expose ke window / tidak ada (' + result.actionMissing.length + '):',
          result.actionMissing
        );
        console.error('    (Tombol dengan data-action ini akan diam/error saat diklik. Cek apakah modulnya sudah masuk Object.assign(window,{...}) di akhir app_production.html.)');
      }

      showBanner(
        '⚠️ [DEV] smoke-test: ' +
        (result.domMissing.length ? result.domMissing.length + ' ID DOM hilang' : '') +
        (result.domMissing.length && result.actionMissing.length ? ', ' : '') +
        (result.actionMissing.length ? result.actionMissing.length + ' data-action putus' : '') +
        ' — buka console untuk detail.'
      );
    }).catch(function (e) {
      console.warn(LOG_PREFIX + ' Gagal jalan:', e);
    });
  }

  if (document.readyState === 'complete') {
    run();
  } else {
    window.addEventListener('load', run);
  }
})();
