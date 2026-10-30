# Audit: Sesi D — Perluasan Dana Titipan ke Domain Kendaraan/Shop

**Tanggal audit:** 2026-08-09
**Status:** AUDIT — 0 kode diimplementasikan sesi ini.
**Konteks:** Sesi A (v1229), B1 (v1230), B2 (v1231), F3 (v1232), Audit Sesi
C (v1233) sudah shipped/ditutup. Sesi ini audit untuk Sesi D
("perluasan ke Kendaraan/Shop, opsional, hanya kalau ada use-case
nyata") — belum pernah diperiksa sampai level kode sebelum ini.

---

## 1. RINGKASAN TEMUAN

| # | Temuan | Severity | Implikasi |
|---|---|---|---|
| D1 | **Kendaraan (`D.vehicles`) tidak punya field nilai uang sama sekali** — cuma `ownership` (whole-entity), TANPA `nilai`/`harga`/apa pun yang merepresentasikan nilai finansial kendaraan itu. Modul Kendaraan murni operasional (BBM, servis, pajak, KM) | 🔴 TINGGI | Tidak ada angka Rp untuk dialokasikan ke owner — perluasan Dana Titipan ke Kendaraan tidak punya bahan baku sama sekali sebelum ada field nilai baru |
| D2 | **Kendaraan JUGA tidak punya `owners[]` (porsi majemuk)** — cuma dropdown `ownership` tunggal (`vehicleModal`, field `vehOwnership`), TIDAK ada tombol "⚖️ Atur Porsi Kepemilikan" atau wiring `MultiOwnerEngine` sama sekali (beda dari Aset & Investasi) | 🔴 TINGGI | Bahkan kalau D1 diselesaikan, guard F1 (`_asetOwnersForTitipan`-setara) akan SELALU balik `[]` untuk 100% record Kendaraan — perluasan jadi no-op sampai UI porsi majemuk dibangun dari nol |
| D3 | **Sudah ada jalur yang mencapai hasil yang sama, 0 kode baru**: `assetModal` (Buku Aset) SUDAH punya opsi jenis `"Kendaraan"` (🏍️, baris 300 & 382 `aset.js`) — kendaraan yang dicatat lewat Buku Aset otomatis punya `a.nilai`, `owners[]` (via tombol "⚖️ Atur Porsi Kepemilikan" yang SUDAH ADA), dan otomatis ikut ke tab Dana Titipan lewat source Aset (Sesi B1, sudah shipped) — TANPA 1 baris kode tambahan | ℹ️ INFO | Baca §3 |
| D4 | **Shop (`D.cobek`/produk) punya `ownership` (whole-entity, `pOwnership` di `productModal`) TAPI TIDAK punya `owners[]`** — pola identik D2, sama sekali tidak ada tombol "Atur Porsi Kepemilikan" untuk produk/transaksi Shop | 🔴 TINGGI | Sama seperti D2 — guard F1-setara akan selalu `[]`, perluasan jadi no-op tanpa membangun UI porsi majemuk dulu |
| D5 | `DanaKelolaan.sumShop(type)` SUDAH menjumlah `t.total` per transaksi Shop berdasar `ownership` whole-entity (pola SAMA seperti `sumAssets()` SEBELUM fix F1 Sesi B1) — kalau Sesi D "asal" reuse `MultiOwnerEngine.getOwners()` mentah tanpa guard, muncul bug class YANG SAMA PERSIS seperti temuan F1 audit Sesi B, tapi blast radius-nya berpotensi LEBIH BESAR (volume transaksi Shop biasanya jauh lebih banyak dari jumlah Aset) | 🟡 SEDANG | Kalau Sesi D tetap dikerjakan suatu saat, guard F1 WAJIB direplikasi persis (bukan opsional) |
| D6 | Semantik Shop beda dari Aset/Investasi: transaksi Shop = penjualan SELESAI (`t.total` = omzet 1 transaksi historis), bukan "aset yang sedang dipegang dengan nilai kini" — konsep "titipan" (dana orang lain masih tertanam di dalamnya) kurang pas secara bisnis utk transaksi yang sudah closed; lebih mirip **bagi hasil/profit-share** partner bisnis, kasus pemakaian beda dari Dana Titipan aset/investasi | ℹ️ INFO | Baca §4 |

---

## 2. DETAIL D1+D2 (Kendaraan — 2 blocker berlapis)

`vehicleModal` (modals.js) HANYA punya:
```html
<div class="fg"><label class="fl">Kepemilikan</label><select class="fs" id="vehOwnership"></select></div>
```
Dibandingkan `assetModal` yang punya KEDUANYA:
```html
<div class="fg"><label class="fl">Estimasi Nilai Saat Ini (Rp)</label>...<input id="assetNilai">...</div>
...
<button data-action="Aset.openOwnersModal">⚖️ Atur Porsi Kepemilikan</button>
<div class="fg"><label class="fl">Kepemilikan</label><select id="assetOwnership"></select></div>
```
`vehicle-core.js` juga tidak punya field nilai apa pun — `grep -n "nilai\|harga\|price" modules/vehicle/vehicle-core.js` cuma menemukan referensi ke `hargaEmasPerGram` (Zakat) dan harga/liter BBM, TIDAK ADA representasi nilai kendaraan itu sendiri. Kendaraan dirancang sebagai modul **operasional** (jadwal servis, BBM, pajak) — bukan modul **finansial** (nilai kekayaan), beda tujuan dari Aset sejak awal.

Mengerjakan Sesi D untuk Kendaraan LANGSUNG (tanpa D3) berarti harus: (a) tambah field nilai baru ke `D.vehicles`, (b) bangun UI+wiring "Atur Porsi Kepemilikan" dari nol (modal baru, tombol baru, `_syncOwnerDebts()`-setara) — 2 pekerjaan besar SEBELUM baris kode `build()` mana pun bisa ditulis.

---

## 3. SOLUSI YANG SUDAH ADA (D3) — 0 kode

`Aset.jenis` sudah punya opsi `"Kendaraan"` (`assetModal` dropdown `assetJenis`, ikon 🏍️). Kendaraan yang dicatat lewat **Buku Aset** (bukan modul Kendaraan/Car Notes yang terpisah) otomatis mendapat:
- `a.nilai` (estimasi nilai saat ini) — sudah ada sejak Aset dibuat.
- `a.owners[]` via tombol "⚖️ Atur Porsi Kepemilikan" (`Aset.openOwnersModal`) — sudah ada sejak Sesi 390-410.
- Otomatis masuk ke tab Dana Titipan lewat source Aset (`_asetOwnersForTitipan()`, Sesi B1, v1230) — **0 kode tambahan, sudah jalan hari ini**.

Trade-off: kendaraan yang dicatat lewat Buku Aset TIDAK dapat fitur operasional modul Kendaraan (jadwal servis, log BBM, pengingat pajak/STNK/SIM, Torsi Sparepart, dst) — kedua modul memang didesain terpisah (operasional vs finansial). Untuk motor/mobil yang **dititipkan modalnya oleh orang lain** (jarang dipakai harian, lebih ke instrumen "investasi kendaraan") dan TIDAK butuh tracking BBM/servis rutin, Buku Aset sudah menutupi 100% kebutuhan Dana Titipan-nya hari ini. Untuk kendaraan yang dipakai harian (butuh BBM/servis) SEKALIGUS ada unsur titipan modal, user perlu double-entry manual (1 entri di modul Kendaraan utk operasional, 1 entri di Buku Aset utk sisi finansial) — bukan solusi sempurna, tapi BUKAN gap fungsional yang menghalangi (hanya sedikit kurang mulus).

---

## 4. SHOP (D4-D6) — beda kasus dari Kendaraan

Shop TIDAK punya jalur pintas sesederhana D3 (tidak ada opsi "catat produk sbg Aset"). Kalau demand nyata muncul (mis. ada partner bisnis yang modalnya tertanam di stok Shop), pekerjaan yang dibutuhkan:
1. Bangun UI "Atur Porsi Kepemilikan" utk produk/kategori Shop (modal baru, mirror `assetOwnersModal`).
2. Putuskan level granularitas: per-produk (kompleks, banyak SKU), per-transaksi (`D.cobek`, high-volume), atau di level modal/kas Shop secara keseluruhan (paling sederhana, tapi kurang presisi kalau cuma sebagian modal Shop yang titipan).
3. Replikasi guard F1 (WAJIB, lihat D5) di titik mana pun `MultiOwnerEngine.getOwners()` dipanggil.
4. Definisikan ulang semantik "titipan" utk Shop — apakah ini pokok modal (principal, seperti Aset/Investasi) atau bagi hasil berkelanjutan (profit-share, beda mekanisme sama sekali, lebih dekat ke kemitraan bisnis daripada "dana dititipkan")?

Ini bukan pekerjaan kecil — realistis **lebih besar** dari Sesi B1 (yang cuma perlu 1 guard + 1 source baru, karena `owners[]` UI-nya SUDAH ADA sejak Sesi 390-410). Untuk Shop, semuanya harus dibangun dari nol.

---

## 5. REKOMENDASI

### 5.1 Kendaraan — **tutup, gunakan D3 (Buku Aset)**
Tidak perlu kode baru. Rekomendasi: dokumentasikan D3 sbg jawaban kalau user (pemilik app) menemukan kasus nyata kendaraan titipan — arahkan ke Buku Aset (jenis Kendaraan), bukan modul Kendaraan/Car Notes.

### 5.2 Shop — **jangan bangun sekarang, sama seperti keputusan Sesi C**
Alasan sama persis pola Sesi C: belum ada laporan pengguna nyata yang butuh ini, pekerjaannya besar (UI baru dari nol + guard F1 wajib), dan risikonya (D5 — bug class F1 versi Shop, blast radius lebih besar) cukup serius kalau dikerjakan terburu-buru. Konsisten dengan prinsip project "driven by laporan konkret, bukan cakupan lengkap di muka".

### 5.3 Kalau Shop tetap mau dilanjutkan ke depan
Wajib audit kecil TERPISAH lagi sebelum coding (sama pola Sesi C) — fokus khusus ke §4 poin 2 & 4 (granularitas & semantik titipan vs profit-share), karena itu keputusan PRODUK dulu, bukan teknis, dan salah pilih di awal akan mahal diubah nanti.

---

## 6. KEPUTUSAN YANG PERLU DIKONFIRMASI USER

1. Setuju Kendaraan **ditutup** (pakai D3 — Buku Aset jenis Kendaraan, 0 kode)?
2. Setuju Shop **tidak dibangun sekarang** (§5.2)?
3. Perlu dokumentasi singkat (tooltip/FAQ) yang mengarahkan ke D3 untuk kasus kendaraan titipan? (independen dari #1/#2, 0 risiko)

Dengan ini, **Sesi D selesai diaudit** dan seluruh rencana 4-sesi awal (A/B/C/D) sudah tuntas ditinjau — status akhir:
- Sesi A: ✅ shipped (v1229)
- Sesi B1: ✅ shipped (v1230)
- Sesi B2: ✅ shipped (v1231)
- F3: ✅ shipped (v1232)
- Sesi C: ❌ ditutup, audited & deliberately not built (v1233)
- Sesi D — Kendaraan: ✅ tidak perlu kode, solusi sudah ada (D3)
- Sesi D — Shop: ❌ ditutup untuk saat ini, sama alasan Sesi C, menunggu laporan nyata
