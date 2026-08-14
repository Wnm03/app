PATCH GABUNGAN — 2026-08-14 — Dana Titipan Sync + Renovasi Deduction Owner
===========================================================================
Gabungan dari 2 patch sesi terpisah (hasil merge, sudah dicek tidak ada
yang saling menimpa/hilang):

  1) PATCH-2026-08-14 — Dana Titipan "Estimasi Belum Teralokasi" tidak sinkron
     (v1335 -> v1337)
  2) PATCH-2026-08-14-b — Renovasi: item lunas/tautan lama tidak pernah isi
     deductionOwnerId di akun Dana Titipan multi-owner
     (v1337 -> v1339)

Versi akhir bundle: v1339 / MODAL_VERSION s612-owner-registry-mandatory-lookup

CARA PAKAI
----------
Extract isi zip ini LANGSUNG ke root folder project (timpa file yang
sudah ada). Jangan extract sebagian — semua file di bawah saling
bergantung (versi build harus sinkron satu sama lain).

FILE INTI (perubahan logic, dari kedua sesi):
  modules/finance/dana-titipan-aggregation-api.js   (sesi 1)
  modules/finance/dana-titipan-portfolio-render.js  (sesi 1)
  modules/home/renovasi.js                          (sesi 2)
  modules/shared/modals.js  (gabungan sesi 1 + 2 — sudah dicek keduanya
                              ada: dropdown "Pemilik Sumber Potongan" &
                              field "Ditanggung Oleh")

FILE TEST BARU (sesi 1):
  tests/patch-2026-08-14-titipan-unallocated-linked-expense.test.js
  tests/patch-2026-08-14-b-majoris-deductionowner-sync.test.js

DOKUMENTASI AUDIT:
  AUDIT-estimasi-belum-teralokasi.md   (sesi 1, root cause + sesi 2 juga
                                         merujuk dokumen ini sbg sinyal ke-3)

FILE HASIL BUILD (regenerasi otomatis via `node scripts/build.js`,
versi final v1339 — WAJIB ikut ditimpa supaya bundle & versi tetap
sinkron dgn source; sudah termasuk gabungan sesi 1 & 2):
  app-bundle-a.min.js
  app-bundle-b.min.js
  app_production.html
  index.html
  sw.js
  chat-action-handlers.js
  modules/shared/features-helpers-global-security.js
  modules/shared/modules-calc.js
  modules/shared/modules-render.js
  docs/COVERAGE-PER-MODULE.md
  docs/FILE-MAP.md

CATATAN MERGE
-------------
- Semua file build (app-bundle-*, app_production.html, index.html, dll)
  diambil dari sesi 2 (versi terbaru, v1339) karena builder Anda
  meng-konkatenasi source secara kumulatif — otomatis sudah membawa
  perubahan sesi 1 juga.
- File source yang HANYA diubah di sesi 1 (dana-titipan-aggregation-api.js,
  dana-titipan-portfolio-render.js) diambil apa adanya dari sesi 1 karena
  sesi 2 tidak menyentuhnya.
- File source yang diubah di KEDUA sesi (modules/shared/modals.js) sudah
  diverifikasi mengandung perubahan dari kedua sesi (dicek via grep,
  masing-masing penanda field muncul tepat 1x).

Ringkasan fix: lihat AUDIT-estimasi-belum-teralokasi.md untuk sesi 1.
Fix sesi 2: modal "Tambah/Edit Item Biaya" Renovasi sekarang menampilkan
dropdown "Ditanggung Oleh" (reuse getAccOwnersRaw()) begitu akun yang
dipilih punya >=1 pemilik eksplisit, ditulis ke item.deductionOwnerId &
t.deductionOwnerId saat togglePaid(), confirmLinkTx(), dan saveItem().

Full test suite (dilaporkan tiap sesi): 4242/4242 pass, 0 regresi.
