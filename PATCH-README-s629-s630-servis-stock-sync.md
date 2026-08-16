# PATCH s629+s630 — Sinkron Stok/Kategori Sparepart & Checkbox Edit Transaksi

## Bug #1 — Stok & kategori sparepart tidak sinkron saat "beli + langsung pasang"
(Laporan pertama — sudah dijelaskan di PATCH sebelumnya, tetap termasuk di
sini krn `app-bundle-b.min.js` di-rebuild ulang.)

Saat checkbox **"📦 Tambah ke Stok Sparepart juga?"** DAN **"🔧 Sinkron ke
Catatan Servis juga?"** dicentang bersamaan:
1. Stok yang baru dibeli tidak ikut berkurang walau "dipakai" di servis yang sama (dobel).
2. Kategori Sparepart di baris Servis selalu kosong.

**Fix:** `modules/finance/tx-servis.js` — `recordServisLog()` sekarang
menautkan `usedPartId`/`usedPartQty` ke part yang baru dibeli (net efek
stok = 0) & mengisi `categoryId` otomatis (match nama item -> kategori,
fallback ke kategori part yang dipakai). Detail lengkap ada di komentar
file tsb.

## Bug #2 (BARU, laporan lanjutan) — Checkbox "Tambah ke Stok Sparepart" hilang saat Edit, dan Edit-Simpan diam-diam MEMBATALKAN stok

**Gejala yang dilaporkan:** transaksi yang sudah disimpan dengan centang
sparepart & servis aktif, begitu dibuka lagi lewat Edit, kedua checkbox
tampil KOSONG.

**Investigasi:**
- **Checkbox "🔧 Sinkron ke Catatan Servis"** — KOSONG saat Edit itu
  **disengaja** (bukan bug): field dasar (biaya/tanggal/akun) baris Servis
  yang tertaut tetap otomatis disinkron TANPA syarat setiap transaksi
  disimpan, dan link-nya (`servisLinkId`) tidak pernah dihapus hanya
  karena checkbox tidak dicentang ulang. Untuk edit detail (item/km/part
  yang dipakai), tombol **"✏️ Edit Detail Servis"** muncul otomatis
  membuka modal Servis yang sesungguhnya — jadi datanya aman, cuma
  representasi checkbox-nya memang selalu direset sebagai penanda "mode
  buat/re-sync tautan baru", bukan indikasi sinkron ulang tersedia.
- **Checkbox "📦 Tambah ke Stok Sparepart"** — ini **BUG SUNGGUHAN, dan
  lebih parah dari sekadar tampilan**. `editTx()` (`modules/finance/
  transaksi.js`) SELALU memaksa checkbox ini `checked=false` tanpa
  pernah mengecek apakah transaksi itu benar-benar sudah tertaut ke stok
  (`t.partStockId`) — beda dengan checkbox Stok Shop/Renovasi Rumah yang
  sudah benar sejak awal (mengecek link dulu). Akibatnya, blok kode di
  `_saveTxInner()` yang membaca status checkbox ini untuk memutuskan
  "apakah user mematikan sinkron stok" salah membaca kondisi terpaksa
  tersebut sebagai **niat user membatalkan pembelian stok** →
  **stok yang sudah ditambah otomatis DIKEMBALIKAN (qty dikurangi) &
  tautannya DIHAPUS**, setiap kali transaksi ini dibuka lewat Edit lalu
  disimpan — **APAPUN yang diubah**, termasuk cuma mengganti tanggal atau
  catatan, walau user tidak pernah menyentuh panel Stok Sparepart sama
  sekali. Ini murni kehilangan data stok yang tidak disengaja.

**Fix:** `modules/finance/transaksi.js` (`editTx()`) — sebelum menentukan
status checkbox, sekarang mengecek dulu `t.partStockId` & baris
`D.partsStock` terkait (masih ada / belum dihapus manual). Kalau memang
tertaut: checkbox dicentang ulang, dropdown "Pilih Sparepart" diarahkan ke
part yang sama, dan field "Jumlah Ditambah"/"Satuan" diisi ulang dari data
tersimpan — persis pola yang sudah benar untuk Stok Shop & Renovasi Rumah.
Dengan begitu, `_saveTxInner()` membaca kondisi yang benar & tidak lagi
salah-revert stok hanya karena tx dibuka Edit.

## Ada bug serupa lain?
Sudah diperiksa panel-panel lain yang memakai pola sama (checkbox +
link ke transaksi): **BBM/Catatan Mobil**, **Stok Shop**, **Penjualan
Shop**, dan **Renovasi Rumah** — semuanya SUDAH benar (mengecek link dulu
sebelum menentukan status checkbox saat Edit, dan/atau field dasar tetap
disinkron tanpa syarat seperti pola Servis di atas). Hanya panel Stok
Sparepart yang kena bug ini.

## File yang berubah/baru di patch ini
- `modules/finance/tx-servis.js` — fix Bug #1 (stok net + kategori)
- `modules/finance/transaksi.js` — **fix Bug #2 (BARU)**: restorasi
  checkbox/field Stok Sparepart saat Edit, mencegah revert stok yang
  tidak disengaja
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — REBUILD (bundle yang
  benar-benar dipakai app; keduanya berubah krn bump versi otomatis,
  perubahan logika sungguhan cuma ada di `app-bundle-b.min.js`)
- `index.html`, `app_production.html`, `sw.js` — bump versi otomatis
  (`?v=1364`, `kw-cache-v1364`)
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/modals.js` — bump konstanta versi otomatis (tidak ada
  perubahan logika)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `tests/tx-servis-purchase-stock-categorysync-s629.test.js` — 6 test
  (Bug #1)
- `tests/tx-stock-edit-checkbox-restore-s629b.test.js` — **BARU**, 4 test
  (Bug #2): restorasi checkbox/dropdown/qty/satuan saat Edit, regresi
  transaksi belum-tertaut & sudah-terhapus, dan test end-to-end yang
  benar-benar membuktikan stok TIDAK lagi ter-revert saat Edit-Simpan
  tanpa menyentuh panel stok.

Semua test lolos: `node --test tests/*.test.js` → **4485/4485 pass, 0
regresi** (baseline sebelumnya 4481, +4 test baru Bug #2; Bug #1 sudah
+6 sebelumnya).

## Cara pasang
1. Timpa (overwrite) semua file di atas ke lokasi yang sama.
2. **WAJIB upload ulang `app-bundle-a.min.js` DAN `app-bundle-b.min.js`**
   — keduanya berubah kali ini.
3. Tidak perlu migrasi data. Transaksi lama yang SUDAH kena Bug #2
   (stoknya sudah kejadian ter-revert & link terhapus sebelum patch ini
   dipasang) perlu ditambahkan ulang manual lewat Stok Sparepart (qty
   tidak bisa direkonstruksi otomatis krn link sudah hilang duluan).
   Transaksi yang belum pernah dibuka-Edit-simpan sejak dibuat AMAN, tidak
   terdampak.
