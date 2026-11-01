# PATCH-AKUMULASI v2737 (kumulatif)
- Urutan: baseline app-main -> FINAL -> v2728 -> v2731 -> v2732 -> A-F-H (GPT) -> fix tombol Penuhi 320px -> build ulang (2737).
- Fix: tombol Penuhi/Batal antrean preorder tidak terpotong di 320 px (preorder.js kelas preorder-act + styles.css #preorderPanel .tx-del.preorder-act). Test baru: tests/preorder-antrean-aksi-320-regression.test.js.
- A,B,C,D,E,F,H diterapkan. G (barcode) BELUM (menunggu persetujuan field barcode). P4 desain saja.
- HAPUS MANUAL 5 orphan: modules/modals.js, modules/shop/modals.js, modules/asset|finance|shop/features-helpers-global-security.js (atau node scripts/apply-delete-manifest.js).
- Verifikasi: build --require-minify PASS; hash 59 ok/0 basi; bundle fresh; full suite 9418 test -> 9417 PASS, 0 FAIL, 1 SKIP; browser Chromium 390 & 320 px: 27/27 PASS, 0 pageerror.
- Belum: perangkat fisik/PWA, kembalian > total & teks struk di browser, backup-restore ulang di browser.
