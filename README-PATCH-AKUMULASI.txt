Patch AKUMULASI SA1-SA10 (v1572) — HANYA FILE PERBAIKAN
=========================================================

Isi zip ini adalah SELURUH file yang berubah/baru dibanding baseline asli
`app-main__59_.zip`, hasil akumulasi 3 paket patch secara berurutan (tanpa
kehilangan perbaikan sesi manapun):

  1. patch-SA1-SA9-AKUMULASI.zip                              (s1-s9, v1568)
  2. patch-SA10a-eksternalisasi-script-block-v1571-akumulasi.zip
     (SA10a+SA10b+SA10c+SA10d, v1569-1571)

  DILEWATI SENGAJA:
  - patch-SA10a-eksternalisasi-script-block.zip (versi lama/standalone,
    TANPA folder scripts/, sudah tergantikan penuh oleh paket #2 di atas —
    memakainya lagi akan me-regresi 3 gate-fix dari SA10b/c/d).

Cara pakai: extract isi zip ini LANGSUNG DI ATAS folder app-main baseline
kamu (timpa file yang namanya sama, tambahkan file yang baru). Struktur
folder di dalam zip ini sudah sama persis dengan struktur project asli
(index.html di root, modules/shared/*, tests/*, dst) — tinggal copy-timpa.

Verifikasi setelah apply (WAJIB dijalankan urut):
  node scripts/build.js
  node --test tests/*.test.js        -> harus 5589/5589 pass, 0 fail
  node scripts/verify-window-expose.js
  node scripts/verify-bundle-freshness.js
  node scripts/verify-release-ready.js
    (di sandbox tanpa internet, override 2 gate berikut valid & konsisten
    dgn semua sesi sebelumnya:
     CONFIRM_LINT_UNAVAILABLE_REASON="..." CONFIRM_UNMINIFIED_REASON="..." )

Hasil verifikasi sesi ini (sudah dijalankan, lihat detail per sesi di
masing-masing SESSION-NOTE-*.md dan CHANGED-FILES-SA1-SA9-AKUMULASI.txt):
  - Build: sukses, versi 1572, sintaks bundle valid.
  - Test suite: 5589/5589 pass, 0 fail.
  - verify-window-expose: OK, 78 modul.
  - verify-bundle-freshness: kedua bundle segar (hash cocok).
  - verify-release-ready: LOLOS (lint+minify di-override, sandbox tanpa
    internet).

Daftar lengkap 34 file dalam patch ini:

BARU:
  SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE.md
  SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE-lanjutan.md
  SESSION-NOTE-SA9-script-src-attr.md
  SESSION-NOTE-SA10b-gate-fixes-sebelum-merge.md
  SESSION-NOTE-SA10c-modal-test-coverage.md
  SESSION-NOTE-SA10d-boot-early-test-coverage.md
  CHANGED-FILES-SA1-SA9-AKUMULASI.txt
  modules/shared/bundle-load-guard.js
  modules/shared/modal-write.js
  modules/shared/boot-early.js
  scripts/lib/modal-html-index-drift.js
  tests/data-oninput-onchange-dispatcher.test.js
  tests/csp-script-src-attr-sa9.test.js
  tests/csp-script-src-sa10a.test.js
  tests/modal-write.test.js
  tests/boot-early.test.js
  tests/modal-html-index-drift.test.js

BERUBAH (menimpa file baseline dgn nama sama):
  index.html
  app_production.html
  sw.js
  ai-chat.js
  chat-action-handlers.js
  app-bundle-a.min.js
  app-bundle-b.min.js
  modules/shared/features-helpers-global-security.js
  modules/shared/modals.js
  modules/shared/modules-calc.js
  modules/shared/modules-render.js
  modules/dashboard-hub/dashboard-hub-settings.js
  scripts/build.js
  tests/boot-pin-idempotent.test.js
  docs/FILE-MAP.md
  docs/COVERAGE-PER-MODULE.md
  docs/RELEASE-GATE-LOG.md

Detail perubahan logic per file: lihat SESSION-NOTE-*.md &
CHANGED-FILES-SA1-SA9-AKUMULASI.txt di dalam zip ini.
