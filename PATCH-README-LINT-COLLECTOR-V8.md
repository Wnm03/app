# V8 — lint collector/build manifest repair

Tanggal: 2026-10-08

## Tujuan
Memperbaiki `npm run check`/`npm run release-check` pada lint tanpa mem-bypass gate.

## Temuan dari log
- `build.js` diperlakukan sebagai browser script sehingga `require` dianggap undefined.
- Collector membaca `scripts/build.js` saja, sementara source/build manifest canonical ada di root `build.js` dan beberapa SOT/lazy-loader entry masih hanya tercantum pada generated `scripts/build.js`.
- Global runtime dari lazy-loaded module (`Renov`, `SewaKios`, katalog import UI, dll.) belum seluruhnya terkumpul.
- Deklarasi compact multi-variable seperti `let txEditId=null, catModalCallback=null, txEditLinkedBillId=null;` hanya menangkap identifier pertama.

## Perubahan
1. `scripts/collect-app-globals.js`
   - membaca root `build.js` sebagai manifest utama;
   - meng-union entry existing dari generated `scripts/build.js` agar SOT yang memang masuk runtime tidak hilang dari lint collector;
   - menemukan script lazy-load dari loader yang ada;
   - mengumpulkan declarator tambahan pada deklarasi `const/let/var` multi-variable;
   - mempertahankan fallback global export dan compact function dari V7.
2. `eslint.config.js`
   - `build.js` dimasukkan ke Node/CommonJS override agar `require`, `module`, `process`, dll. diperlakukan sesuai runtime script build.

## Tidak dilakukan
- Tidak mengubah `scripts/verify-release-ready.js`.
- Tidak menurunkan `no-undef`/`no-redeclare` menjadi warning/off.
- Tidak mengubah bundle, HTML, service worker, SOT runtime, atau UI.
- Tidak menghapus error lint dengan disable/override massal.

## Verifikasi lokal
- Collector berhasil mengenali: `VehicleCatalogImportUI`, `SparepartOcrCatalogDetail`, `HondaPdfImportUI`, `VehicleCatalogWebImportUI`, `RenovAI`, `RenovCalc`, `SewaKios`, `Renov`, `ensureRenov`, `ensureSewaKios`, `txEditLinkedBillId`, `save`, `PPh21`, `PajakUMKM`, `FinanceCategorySOT`.
- Full `eslint .` belum dapat dijalankan di sandbox karena `npm install --package-lock=false --no-audit --no-fund` timeout. Jadi V8 tidak mengklaim lint/CI remote sudah PASS.

## Acceptance
Setelah patch diterapkan, jalankan:

```bash
npm run check
npm run release-check
```

Jika masih ada `no-undef`, itu harus ditelusuri ke deklarasi/load-order yang nyata; jangan meng-override release gate.
