# Session Note — Sesi C-lanjutan: Shop/Cobek, 5 titik sisa (v1662)

Ref: `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §7 Sesi C / §2d "Urutan
sesi ringan berikutnya" poin 2 ("5 titik sisa Shop/Cobek — BUKAN Dana
Titipan").

## Konteks

Sesuai urutan yang sudah diputuskan di §2d roadmap: Sesi B (gap (a)
literal `VEHICLE_DB_RECORDS`) masih terbuka (ditunda ke sesi desain
tersendiri per `SESSION-NOTE-sesi-b-followup-ensureloaded-dedup.md`,
v1661) — jadi Fase 1 BELUM 100% tuntas, larangan §6 "jangan loncat ke
Fase 2 sebelum Fase 1 tuntas" masih berlaku untuk Sesi D
(`service_categories`). Sesi D tetap TIDAK dikerjakan sesi ini.

Sesi ini murni melanjutkan Sesi C (Event Bus umum, bukan Fase 2):
menuntaskan 5 titik sisa Shop/Cobek yang sengaja ditunda dari
`PATCH-v1642-sesi-c-shop-cobek-product-updated.zip` (CRUD inti produk &
kategori sudah emit `product.updated` sejak v1642).

## Checkout / akumulasi

ZIP ini delta di atas akumulasi: `app-main__76_.zip` (baseline hasil
rekonsiliasi v1639) + `PATCH-v1642-sesi-c-shop-cobek-product-updated.zip`
+ `PATCH-v1660-sesi-f2-badge-foto-riwayat-servis.zip` +
`PATCH-v1661-sesi-b-followup-ensureloaded-dedup.zip` (diterapkan
berurutan) — BUKAN checkout penuh baru.

## Implementasi — 5 titik, semua `product.updated`, guard `typeof AIBus!=="undefined"`

1. **`cobek-order.js` — `Produsen.saveHarga()`** (harga produsen batch):
   1 emit SETELAH loop (menutupi seluruh baris yang disentuh sekali
   jalan, pola sama `_saveBillInner()`/CRUD inti v1642) —
   `{kind:"harga-produsen",action:"batch",produsenId,productIds,count}`.
   0 emit kalau 0 baris valid tersentuh.
2. **`cobek-pricing.js` — `PriceRekoWidget.applyOne()`/`applyBulk()`**
   (price reko): `apply-one` 1 emit per produk
   (`{kind:"price-reko",action:"apply-one",productId,name,hargaJual}`);
   `apply-bulk` 1 emit menutupi seluruh batch
   (`{...,action:"apply-bulk",productIds,count,transport,margin}`).
3. **`cobek-pricing.js` — `StockRekoWidget.applyAll()`** (stock reko): 1
   emit menutupi seluruh batch, HANYA produk yang benar-benar diterapkan
   (index valid) yang masuk `productIds` —
   `{kind:"stock-reko",action:"apply-all",productIds,count,totalQty}`. 0
   emit kalau 0 produk diterapkan.
4. **`cobek-pricing.js` — `WeightBulkWidget.applyOne()`/`applyBulk()`**
   (weight-bulk): pola sama poin 2 —
   `{kind:"weight-bulk",action:"apply-one"|"apply-bulk",...}`.
5. **`cobek-tx-cart.js` — `onTxShopStockProdusenChange()`**
   (inline-produsen-di-cart): 1 emit saat produsen baru dibuat lewat
   opsi "➕ Produsen Baru" di dropdown keranjang transaksi —
   `{kind:"produsen",action:"create",produsenId,name}`. **Catatan**:
   `Etalase.onProdusenChange()` (pola serupa di `cobek-etalase.js`)
   SENGAJA TIDAK disentuh — di luar 5 titik yang disepakati roadmap,
   backlog terpisah kalau mau disamakan nanti.
6. **`cobek-io.js` — `ImportShopExcel.commit()`** (bulk import Excel, 2
   cabang independen): masing-masing 1 emit menutupi seluruh batch
   (bisa ratusan baris per file) —
   `{kind:"import-excel",action:"produsen"|"etalase",created,updated}`.
   0 emit kalau `created===0 && updated===0` (parsedRows kosong, jalur
   toast peringatan lama tidak berubah).

**Kind BARU**: `"harga-produsen"`, `"price-reko"`, `"stock-reko"`,
`"weight-bulk"`, `"produsen"`, `"import-excel"` — event `product.updated`
sendiri sudah ada sejak v1642, payload tetap konsisten skema
`kind`/`action` yang sama.

**0 perubahan business logic** di titik manapun — semua edit murni
menambah 1 baris emit (+ variabel lokal kecil untuk menampung
id/count yang diemit) setelah `save()`/sebelum atau sesudah `toast()`,
pola identik sesi-sesi Sesi C sebelumnya.

## Sengaja TIDAK dikerjakan sesi ini

- Sesi B gap (a) (hapus literal `VEHICLE_DB_RECORDS`) — tetap ditunda,
  di luar cakupan (lihat catatan v1661).
- Sesi D (`service_categories`) — belum aman mulai (larangan §6, Fase 1
  belum tuntas).
- Wiring listener `AIService.wireEvents()` ke SEMUA event Sesi C
  (termasuk `product.updated` yang sekarang genap 9/9 titik) — masih
  0%, direkomendasikan sesi TERSENDIRI berikutnya (sudah diputuskan di
  §2d poin 3: SEBELUM Dana Titipan, SETELAH 5 titik ini).
- Dana Titipan, `investasi.js` dasar, Aset non-core — domain Event Bus
  lain, tetap backlog sesuai urutan §2d.
- `Etalase.onProdusenChange()` — pola inline-create-produsen serupa di
  file lain, di luar 5 titik yang disepakati.

## Test

- Baru: `tests/cobek-shop-5-titik-sisa-sesi-c.test.js` — 14 test,
  mencakup ke-5 titik (jalur emit + jalur "0 perubahan tidak emit" utk
  batch/bulk yang applicable-nya kosong) + 1 test guard gabungan
  `typeof AIBus==="undefined"` tidak throw di ke-5 titik sekaligus.
  Semua **14/14 pass**.
- Full suite (`node --test tests/*.test.js`) setelah edit: **6353/6357
  pass, 4 fail** — 4 kegagalan IDENTIK dengan yang sudah didokumentasikan
  sesi-sesi sebelumnya (`verify-release-ready` eslint-override,
  `checkBundleFreshness()`, 2× `txHTML()`/S468d virtual-bill — semua
  pre-existing, tidak terkait file yang diedit sesi ini). **0 regresi
  baru.**
- `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION` dibump manual ke
  `s-sesi-c-shop-cobek-5-titik-sisa-1662` (pola sama F1/F2/Sesi
  B-followup — delta zip tidak membawa seluruh file GROUP_A, `node
  scripts/build.js` tidak aman dijalankan penuh di sini).
- **Belum dijalankan** sesi ini: `node scripts/build.js` rebuild bundle
  penuh (`app-bundle-b.min.js`) — perlu checkout lengkap; dan
  `node scripts/verify-release-ready.js` end-to-end (butuh eslint/esbuild
  yang tidak tersedia di sandbox ini, konsisten sesi-sesi sebelumnya).

## Skor update

Sesi C Prioritas Sedang, domain Shop/Cobek: **9/9 titik TUNTAS** (4 CRUD
inti v1642 + 5 titik sesi ini). Domain lain Prioritas Sedang (Dana
Titipan, `investasi.js` dasar, Aset non-core) masih 0%, tidak berubah
sesi ini.

## Catatan untuk sesi berikutnya

Sesuai §2d poin 3 (sudah diputuskan sebelum sesi ini dimulai): urutan
berikutnya adalah **wiring listener `AIService.wireEvents()`** untuk
SEMUA event yang sudah ada (`vehicle.updated`, `account.updated`,
`finance.updated{kind:zakat}`, `product.updated` — sekarang 9/9 titik
Shop/Cobek ikut), SEBELUM membuka domain Event Bus baru (Dana Titipan
dkk). Sesi D (`service_categories`) tetap menunggu sampai Sesi B gap (a)
selesai — belum berubah dari catatan v1661.
