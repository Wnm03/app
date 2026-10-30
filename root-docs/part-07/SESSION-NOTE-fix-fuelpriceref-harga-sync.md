# Fix: "Rekomendasi Harga BBM tidak sync ke Harga/Liter"

## Laporan user
Setelah tap "🔄 Cek Update Harga BBM via AI" lalu "✅ Terapkan yang Dicentang" di
`txBbmFields` (form Tambah Transaksi) atau `bbmModal` (Catat Isi BBM), field
**Harga/Liter** yang sedang dibuka tetap menunjukkan harga lama — kelihatan
seperti hasil cek AI tidak "sync".

## Root cause
`FuelPriceRef.applySelected()` (`modules/vehicle/fuel-price-ref.js`) hanya
menulis harga baru ke tabel referensi tersimpan (`D.fuelPriceRef`), tapi tidak
pernah mengisi ulang field harga (`txBbmHargaL` / `bbmHarga`) yang sedang
dibuka di form. Harga baru sebenarnya SUDAH tersimpan dengan benar — field di
form saja yang tidak ikut ter-refresh sampai dropdown "Jenis BBM" diganti-ganti
manual (yang baru men-trigger `FuelPriceRef.onSelectChange()`).

Kategori/subkategori di form Tambah Transaksi (dispatcher `focus` event) sudah
dicek terpisah dan fix-nya memang sudah ada di source — bukan bug baru.

## Fix
1. **`modules/vehicle/fuel-price-ref.js`**
   - `check(selectId, hargaId)` sekarang menerima 2 parameter opsional dan
     menyimpannya ke `FuelPriceRef._activeCtx` — field mana yang sedang aktif
     saat modal "Cek Update Harga BBM via AI" dibuka.
   - `applySelected()` memanggil method baru `_refreshActiveHargaField()`
     setelah `D.fuelPriceRef` ditulis & disimpan.
   - `_refreshActiveHargaField()`: baca jenis BBM yang SEDANG DIPILIH di
     dropdown (`_activeCtx.selectId`), lalu isi ulang field harga
     (`_activeCtx.hargaId`) dari `D.fuelPriceRef[type]` yang terbaru + dispatch
     event `input` (pola sama persis akhir `onSelectChange()`) supaya
     `syncTxBbmAmt()` / `syncBbmHargaChanged()` ikut jalan dan Jumlah Rp
     ke-update otomatis.
   - Kalau `_activeCtx` tidak diisi (pemanggil lama tanpa argumen) atau
     elemen dropdown/field tidak ada, fungsi no-op — tidak breaking pemanggil
     lama.

2. **`modules/shared/modals.js`**
   - Tombol `#txFuelRefCheckBtn` (di `txBbmFields`) sekarang mengirim
     `data-args='["txBbmJenis","txBbmHargaL"]'`.
   - Tombol `#fuelRefCheckBtn` (di `bbmModal`) sekarang mengirim
     `data-args='["bbmJenis","bbmHarga"]'`.
   - (Bonus, minor) `check()` juga fallback cari tombol via `txFuelRefCheckBtn`
     kalau `fuelRefCheckBtn` tidak ditemukan, supaya state disable/spinner
     tombol saat mencari juga berlaku benar dari `txBbmFields` (sebelumnya
     `check()` selalu cari `fuelRefCheckBtn` saja, jadi tombol di form
     Transaksi tidak pernah menampilkan teks "🔍 Mencari...").

3. **`tests/fuel-price-ref.test.js`**
   - 5 test baru: `check()` menyimpan `_activeCtx`, `check()` tanpa argumen
     tetap aman, `applySelected()` merefresh field aktif, `applySelected()`
     tetap sinkron ke jenis yang SEDANG DIPILIH di dropdown (bukan yang
     dicentang di ronde cek itu), dan `applySelected()` tanpa `_activeCtx`
     tidak error.

## Hasil
`node --test tests/**/*.test.js` → 5661 pass, 0 fail (termasuk 19 test di
`fuel-price-ref.test.js`, 5 di antaranya baru).
