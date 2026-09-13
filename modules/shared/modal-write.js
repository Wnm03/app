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
  var raw = cur.getAttribute('data-modal-index');
  var idx = parseInt(raw, 10);
  if (isNaN(idx)) return;
  if (typeof MODAL_HTML === 'undefined' || !MODAL_HTML || MODAL_HTML[idx] === undefined) {
    // Gagal senyap TAPI kelihatan: banner __moduleLoadFail sudah dipasang oleh
    // boot-early.js kalau bundle-nya sendiri gagal load; ini lapisan jaga-jaga
    // tambahan kalau index-nya di luar jangkauan array (mis. typo saat migrasi).
    try {
      console.error('[modal-write] MODAL_HTML[' + raw + '] tidak ditemukan -- 1 modal tidak akan tampil.');
    } catch(_e){void _e;}
    return;
  }
  document.write(MODAL_HTML[idx]);
})();
