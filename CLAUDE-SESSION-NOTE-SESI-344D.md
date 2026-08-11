# Sesi 344d — Bulk Fill Berat Produk Lama (lanjutan item 🟡 Sesi 344c)

Item yang sebelumnya dicatat "belum digarap, worth dicek jumlahnya dulu di data"
(`CLAUDE-SESSION-NOTE-SESI-344C.md`) dikerjakan sesi ini. Sengaja TIDAK dibatasi ke
produk yang sudah dipakai Inventory Transfer/Rencana Pengiriman (itu ranah rule AI
`product-weight-missing` yang sudah ada) — widget baru ini men-scan SEMUA produk
ownership SELF yang `beratPerUnit`-nya kosong, supaya "produk lama" mana pun yang
belum pernah dipakai logistik pun ikut kelihatan.

## Perubahan
1. `modules/shop/cobek-pricing.js` — `WeightBulkWidget` baru:
   - `missing()` — PURE, daftar produk SELF tanpa `beratPerUnit`.
   - `render()` — render kartu + baris per produk (nama + input angka kg + tombol ✅).
   - `applyOne(id)` — simpan 1 baris.
   - `applyBulk()` — simpan semua baris yang SUDAH diisi angka sekaligus (baris kosong
     dilewati, bukan wajib isi semua dulu — bisa dicicil per sesi/per batch).
2. `modules/shop/cobek-io.js` — `renderProductList()` sekarang juga panggil
   `WeightBulkWidget.render()`.
3. `app-bootstrap.js` — `WeightBulkWidget` ditambahkan ke daftar `Object.assign(window,{...})`.
4. `index.html` — kartu baru "⚖️ Isi Berat Massal" di tab Etalase (di bawah kartu
   Rekomendasi Restock AI, sebelum daftar Etalase Produk), pola sama persis
   `stockRekoWidgetCard`/`priceRekoWidgetCard` (collapsible, `style="display:none"`
   default, muncul otomatis kalau ada target).

## Test baru
`tests/weight-bulk-widget.test.js` (5 test, cakupan: produk tanpa berat masuk daftar,
`beratPerUnit:0` tetap dianggap kosong, non-SELF dikecualikan konsisten pola S260,
fallback default SELF utk produk lama tanpa field ownership sama sekali, daftar kosong
kalau semua sudah terisi).

Efek samping: 3 file test lama yang men-stub `PriceRekoWidget`/`StockRekoWidget` manual
di `loadSource()` (`shop-import-katalog-reroute.test.js`, `shop-pdf-import.test.js`,
`shop-scan-ui.test.js`) perlu tambahan stub `WeightBulkWidget: { render: () => {} }`
karena `renderProductList()` sekarang juga memanggilnya — sudah ditambahkan.

## Tidak dikerjakan sesi ini
- 🟢 Dynamic fields per jenis (Akun, Kelola Kendaraan, SIM, Utang & Piutang, Worth It) —
  tetap di luar scope, sama seperti dicatat Sesi 344c.

## Verifikasi
- `node --test tests/*.test.js` → **1875/1875 PASS** (naik dari 1870, sebelum & sesudah build).
- `node --check` semua file yang diubah → OK.
- Build: `s344d-weight-bulk-widget` → versi **921**, sintaks bundle valid,
  `index.html` & `app_production.html` identik (auto oleh build.js).
