// modules/shared/modal-write.js
// SA10a (v1568) — pengganti 101 blok inline `<script>document.write(MODAL_
// HTML[N]);</script>` yang sebelumnya tersebar di index.html/app_production.html.
//
// KENAPA INI ADA: 101 blok itu masing-masing HANYA berbeda di angka index-nya
// (0..100), sisanya identik. document.write() WAJIB dipanggil sinkron persis
// di titik parse HTML yang bersangkutan (supaya markup modal ke-insert di
// posisi yang benar dalam DOM) -- makanya dulu ditulis inline, bukan lewat
// event listener biasa (yang baru jalan setelah parsing/DOM selesai, sudah
// terlambat utk document.write).
//
// FIX (SA10a): script TETAP dipanggil sinkron di posisi yang sama persis
// (tanpa defer/async), tapi lewat SRC eksternal + 1 atribut data-modal-index
// per tag -- bukan lewat kode inline. Ini membebaskan 101 titik itu dari
// kebutuhan `unsafe-inline` di CSP script-src, karena browser menilai
// <script src="..."> lewat allowlist origin (script-src 'self' dkk), BUKAN
// lewat izin unsafe-inline (yang cuma berlaku utk kode inline/atribut).
//
// SYARAT: MODAL_HTML (array, didefinisikan di modules/shared/modals.js, saat
// build masuk ke app-bundle-a.min.js) HARUS sudah ada di window sebelum tag
// <script src="modal-write.js" data-modal-index="N"> manapun dieksekusi --
// makanya <script src="...bundle-load-guard.js" data-guard-src="app-bundle-
// a.min.js"> WAJIB tetap muncul di index.html SEBELUM tag modal-write.js yang
// pertama (posisi ini TIDAK diubah oleh SA10a, cuma dicek ulang oleh test).
//
// Pemakaian di HTML (lihat index.html):
//   <script src="modules/shared/modal-write.js?v=1568" data-modal-index="0"></script>
(function () {
  'use strict';
  var cur = document.currentScript;
  if (!cur) return;

  // S1810: support a compact batch/range so the 103 parser-blocking
  // modal-write tags can be reduced to one synchronous script execution.
  // Single-index mode remains backward-compatible for older HTML overlays.
  var rawRange = cur.getAttribute('data-modal-range');
  var rawIndex = cur.getAttribute('data-modal-index');
  var indexes = [];

  if (rawRange) {
    var parts = rawRange.split(',');
    for (var p = 0; p < parts.length; p++) {
      var token = parts[p].trim();
      if (!token) continue;
      var dash = token.indexOf('-');
      if (dash > 0) {
        var first = parseInt(token.slice(0, dash), 10);
        var last = parseInt(token.slice(dash + 1), 10);
        if (!isNaN(first) && !isNaN(last)) {
          var step = first <= last ? 1 : -1;
          for (var n = first; step > 0 ? n <= last : n >= last; n += step) indexes.push(n);
        }
      } else {
        var one = parseInt(token, 10);
        if (!isNaN(one)) indexes.push(one);
      }
    }
  } else if (rawIndex !== null) {
    var idx = parseInt(rawIndex, 10);
    if (!isNaN(idx)) indexes.push(idx);
  }

  if (!indexes.length) return;
  if (typeof MODAL_HTML === 'undefined' || !MODAL_HTML) {
    try { console.error('[modal-write] MODAL_HTML tidak ditemukan.'); } catch(_e){void _e;}
    return;
  }

  var output = '';
  for (var i = 0; i < indexes.length; i++) {
    var index = indexes[i];
    if (MODAL_HTML[index] === undefined) {
      try { console.error('[modal-write] MODAL_HTML[' + index + '] tidak ditemukan -- modal dilewati.'); } catch(_e2){void _e2;}
      continue;
    }
    output += MODAL_HTML[index];
  }
  if (output) document.write(output);
})();
