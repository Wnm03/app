# Patch s482 → s483 (build v1207 → v1208)

## Fitur baru: "Akun Sumber Dana" (opsional) di form Beli/Jual investasi

**Saran user:** tambah field opsional "Akun Sumber Dana" di form Beli/Jual
investasi (`investmentTxModal`) — pola sama seperti BBM/Renov yang sudah
auto-sinkron ke transaksi, supaya alur "titipan masuk → sebagian ke
investasi, sebagian ke renov" jadi satu jalur tercatat penuh, tidak ada
langkah manual ganda.

### Apa yang berubah

- **`modules/shared/modals.js`** — `investmentTxModal` dapat field baru
  opsional `investTxAcc` ("Akun Sumber Dana"), muncul di bawah field
  Nominal Dividen / di atas Fee, dengan hint singkat. Opsi pertama selalu
  "— Tidak disinkronkan —" (default), diikuti daftar akun (`D.accounts`).
- **`modules/asset/investasi.js`** — `Investment.addTransaction()` dapat
  parameter opsional baru `accountId` (100% backward compatible — pemanggil
  lama yang tidak mengirim field ini tetap jalan persis seperti sebelumnya).
  Kalau `accountId` diisi & valid, DAN tipe transaksi Beli/Jual, satu
  transaksi tertaut otomatis dibuat di `D.transactions`
  (expense untuk Beli, income untuk Jual, kategori "Investasi") — pola SAMA
  PERSIS `Renov.saveItem()`/`togglePaid()` (`renovItemAcc` →
  `D.transactions.push()`). Id transaksi itu disimpan di `tx.linkedTxId`
  (analog `renovItemLinkId`/`renovProjectLinkId`). `Investment.deleteTransaction()`
  ikut menghapus transaksi Keuangan tertaut kalau ada. Dividen SENGAJA
  tidak disinkron di sesi ini (di luar scope "Beli/Jual" yang diminta).
- **`modules/asset/investasi-tx-view.js`** (`InvestmentTxUI`) — populate
  dropdown `investTxAcc` dari `D.accounts` saat modal dibuka
  (`_populateAccOptions()`), selalu direset ke "" (bukan default akun
  pertama, supaya benar-benar opsional & tidak ada transaksi Keuangan
  ke-buat tanpa disadari). `save()` mengirim `accountId` ke
  `Investment.addTransaction()` & memanggil `renderKeuangan()`/
  `renderDashboard()` kalau tersinkron. `deleteTx()` menyesuaikan pesan
  konfirmasi & refresh Keuangan/Dashboard kalau transaksi yang dihapus
  tersinkron.
- **Test baru:** `tests/s483-investment-tx-akun-sumber-dana.test.js` (12
  test — domain layer `Investment.addTransaction()`/`deleteTransaction()` +
  UI layer `InvestmentTxUI`).

### File lain yang ikut berubah (hasil `node scripts/build.js`)

Version bump s482→s483 (build 1207→1208): `modules/shared/modules-render.js`,
`modules/shared/modules-calc.js`, `chat-action-handlers.js`,
`modules/shared/features-helpers-global-security.js` (konstanta versi saja,
tidak ada perubahan logic), bundle ulang
`app-bundle-a.min.js`/`app-bundle-b.min.js`, `?v=` di
`index.html`/`app_production.html`, `CACHE_NAME` di `sw.js`, dan
`docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md`.

## Hasil test & build

- `node --test tests/*.test.js` → **3076/3076 PASS** (termasuk 12 test baru
  di atas), 0 gagal.
- `node scripts/build.js` → sukses, sintaks kedua bundle valid
  (`node --check`), `index.html`/`app_production.html` sinkron.
- Release gate (`scripts/verify-release-ready.js`): lint & minify
  di-override manual (lihat `docs/RELEASE-GATE-LOG.md`, sandbox tanpa akses
  jaringan — `eslint`/`esbuild` tidak bisa dipasang); gate html-sync LOLOS
  tanpa override. Bundle valid & lolos `node --check`, hanya belum
  diminify (ukuran lebih besar dari versi resmi).

## Cara pakai

Timpakan semua file di patch ini ke folder release (path relatif sama
persis), lalu upload ulang SEMUA file yang berubah ke hosting.
