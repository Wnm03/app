# Patch s480 → s481 (build v1206)

Isi dari 2 hasil Tes Otomatis / Tes Buka-Tutup Modal di tab Pengaturan:

## 1. (Ringan) 3 modal investasi belum terdaftar di sweep
**File:** `self-test.js`

`investmentModal`, `investmentTxModal`, `investmentWatchModal` (holding investasi,
dibuat sesi 476-477) ada di halaman tapi belum masuk daftar Tes Buka/Tutup Modal —
selalu muncul ❌ "(kelengkapan cakupan) modal belum terdaftar" walau modalnya
sendiri berfungsi normal. Ditambahkan 3 entri ke `MODULE_METHOD_MODAL_SPECS`
(pola sama persis `investmentOwnersModal` yang sudah ada) yang memanggil
`InvestmentListUI.openModal()`, `InvestmentTxUI.open()`,
`InvestmentWatchUI.openModal()` tanpa argumen — aman 100% dijalankan kapan saja
(0 mutasi data), sama seperti spec lain di daftar itu.

## 2. WorthIt.computeScore(): kebutuhan+mendesak bisa jatuh di bawah 70
**File:** `modules/finance/worthit.js`

Skor dasar kebutuhan (40) + mendesak (30) = 70, pas di ambang badge
"Prioritas Tinggi". Tapi penalti keterjangkauan (harga >50% saldo → -15) bisa
menggeret item yang BENERAN kebutuhan mendesak turun ke 55 — badge prioritasnya
jadi salah mencerminkan urgensi, walau catatan/reason peringatan
keterjangkauannya sendiri tetap benar & tetap ditampilkan apa adanya. Ditambah
`score=Math.max(score,70)` khusus utk item kebutuhan+mendesak, diterapkan
SETELAH semua penambahan/pengurangan lain (jadi tidak menghapus peringatan
keterjangkauan dari daftar alasan, cuma memastikan badge prioritasnya tidak
salah).

## File lain yang ikut berubah
Hasil `node scripts/build.js` (WAJIB dijalankan tiap ada perubahan source,
bukan opsional): version bump s480→s481 (build 1205→1206) ke
`modules-render.js`/`modals.js`/`modules-calc.js`/`chat-action-handlers.js`/
`features-helpers-global-security.js`, bundle ulang
`app-bundle-a.min.js`/`app-bundle-b.min.js`, `?v=` di
`index.html`/`app_production.html`, `CACHE_NAME` di `sw.js`, dan
`docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md`.

## ⚠️ Catatan minifikasi
Environment yang dipakai bikin patch ini TIDAK punya akses internet, jadi
`esbuild` tidak bisa ter-install dan kedua bundle ditulis **tanpa minifikasi**
(ukurannya lebih besar dari build sebelumnya, tapi sintaksnya sudah lolos
`node --check` dan seluruh 3064 test otomatis di `tests/*.test.js` tetap PASS).
Kalau mau ukuran sekecil versi lama: jalankan `npm install --save-dev esbuild`
lalu `node scripts/build.js` sekali lagi di environment yang ada internetnya —
otomatis kepakai.

## Cara pakai
Timpakan semua file di patch ini ke folder release (path relatif sama persis),
lalu upload ulang SEMUA file yang berubah ke hosting (bukan cuma HTML/sw.js —
ini pesan bawaan dari `build.js` sendiri).
