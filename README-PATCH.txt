PATCH: fix "kegagalan bayar tagihan dari fitur transaksi"
================================================================
Build version baru: 1638 (s777-followup6-fuel-price-deviation-summary)

CARA PAKAI
----------
Timpa (overwrite) 15 file di zip ini ke lokasi yang SAMA PERSIS di
folder project kamu (struktur folder di zip ini sudah sama dengan
struktur repo). Setelah itu upload ULANG semua file ini ke hosting.

FILE INTI (perbaikan sesungguhnya)
-----------------------------------
- modules/finance/tx-list-cashflow.js
    Kartu tagihan "⏳ Terjadwal" di daftar transaksi sekarang tap ->
    markBillPaid() (alur Bayar yang benar), bukan lagi openBillModal()
    (yang bisa nyasar edit transaksi periode LAMA & bikin toast sukses
    semu tanpa transaksi baru).

FILE TEST (disesuaikan supaya cocok dgn perilaku baru)
-------------------------------------------------------
- tests/virtual-bill-manual-scenario-s468d.test.js
- tests/virtual-bill-txhtml-deltx-guard-s468b.test.js

FILE HASIL BUILD OTOMATIS (node scripts/build.js)
---------------------------------------------------
File-file ini WAJIB ikut di-upload bareng (bukan opsional) karena
app-bundle-*.min.js adalah file yang BENERAN dipakai app di browser,
dan versi ?v=/CACHE_NAME harus sinkron supaya browser user narik
file baru (bukan cache lama):
- app-bundle-a.min.js
- app-bundle-b.min.js
- app_production.html
- index.html
- sw.js
- chat-action-handlers.js               (versi konstanta disamakan)
- modules/shared/modals.js              (versi konstanta disamakan)
- modules/shared/modules-calc.js        (versi konstanta disamakan)
- modules/shared/modules-render.js      (versi konstanta disamakan)
- modules/shared/features-helpers-global-security.js (versi konstanta disamakan)
- docs/FILE-MAP.md                      (dokumentasi auto-generate)
- docs/COVERAGE-PER-MODULE.md           (dokumentasi auto-generate)

VERIFIKASI
----------
- node scripts/build.js -> sukses, sintaks bundle valid
- node --test "tests/**/*.test.js" -> 6005/6005 lulus, 0 gagal
