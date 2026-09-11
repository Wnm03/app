# Audit Sesi C — Titik yang Menulis `D` Langsung Tanpa `AIBus.emit()`

> Per `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §6/§7 Sesi C: **audit
> dulu, jangan langsung ubah**. Dokumen ini murni daftar konsumen (0 kode
> diubah, 0 file source disentuh). Checkout: v1651 (setelah 5 patch sesi
> A1/A2/B/followup diterapkan berurutan).

## Metode

1. `grep -rn "AIBus.emit(" modules/` → peta semua titik emit yang **sudah**
   ada, untuk tahu pola/nama event yang sudah dipakai (baseline).
2. Per domain (`finance/`, `asset/`, `vehicle/`, `shop/`), hitung file yang
   punya pemanggilan `save();` (fungsi persist global) tapi **0** kemunculan
   `AIBus` — kandidat "menulis D tanpa emit".
3. Tiap kandidat di-cek manual: nama fungsi save/delete, apa yang ditulis ke
   `D`, dan apakah memang sejenis dengan titik yang sudah emit (bukan
   sekadar helper baca/render).
4. Tidak semua kandidat dari langkah 2 relevan — file settings/UI murni
   (tanpa konsumen lintas modul yang masuk akal) ditandai **rendah** dan
   sengaja tidak direkomendasikan dapat event baru.

## Baseline: pola emit yang sudah ada (jangan diduplikasi, dijadikan acuan)

| Event | Emitter | Contoh titik |
|---|---|---|
| `finance.updated` | `modules/finance/transaksi-b.js` (`_saveTxInner`, per kind: utang/tagihan/cicilan-lama/cicilan-baru/langganan/umum), `car-notes.js` (`BBM._saveInner`, `Servis._saveInner`, `Servis.markServiced`) | transaksi umum + BBM + servis (SUDAH ke-3nya, ini yang bikin domain finance.updated paling matang) |
| `asset.updated` | `modules/asset/aset.js` (save+delete), `modules/asset/aset-owners.js` (2 titik edit owner) | |
| `investment.updated` | `investasi-list-view.js` (save+delete holding), `investasi-tx-view.js` (2×, transaksi holding), `investasi-view.js` (edit owner) | |
| `vehicle.updated` | `modules/vehicle/sparepart-servis-b.js` (servis selesai), `car-notes.js Servis.markServiced()` | **HANYA servis**, bukan CRUD kendaraan itu sendiri (lihat gap #1 di bawah) |
| `delivery.created` | `modules/shop/cobek-order.js` | hanya order/pengiriman, bukan produk/stok |
| `Scanner:opened/closed` | `modules/shared/scanner-session.js` | infra, bukan domain data |
| `ai:decision-made` | `modules/ai/ai-decision-engine.js` | infra AI |

**Catatan penting dari AUDIT-AI-WIRING-GAP.md (sesi B1, masih berlaku):**
`AIService.wireEvents()` TIDAK subscribe ke `investment.updated` meski 5
titik emit sudah ada — jadi menambah emitter baru di Sesi C **tidak
otomatis bikin sesuatu reaktif** kalau listener-nya juga belum
ditambahkan. Ini di luar scope audit-titik-tulis (§7 Sesi C murni soal
sisi emit), tapi perlu diingat saat translate temuan ini jadi keputusan
coding.

====================================================

## Temuan — Prioritas Tinggi (domain sudah punya event, tapi ada jalur sejenis yang bolong)

Ini yang paling murah/rendah-risiko untuk Sesi C: pola sudah ada di file
yang sama/domain yang sama, tinggal direplikasi persis (sama seperti pola
"wiring 3 literal" yang sudah terbukti 4× sebelumnya).

### 1. `vehicle.updated` — CRUD kendaraan itu sendiri BELUM emit (`modules/vehicle/vehicle-core.js`)
- `saveVehicle()` (baris ~341): tambah/edit `D.vehicles` — 0 emit.
- `delVehicle(i)` (baris ~489): hapus `D.vehicles` — 0 emit.
- `saveKm()` (baris ~478): update KM kendaraan — 0 emit.
- Kontras: `vehicle.updated` SUDAH ada tapi cuma dari sisi servis
  (`sparepart-servis-b.js`, `Servis.markServiced()`). Tambah/edit/hapus
  kendaraan sendiri — perubahan yang jelas relevan buat konsumen event ini
  (reminder scheduler, dashboard) — masih 0%.

### 2. `finance.updated` — beberapa jenis transaksi khusus BELUM emit
Transaksi umum (`transaksi-b.js`), BBM & servis (`car-notes.js`) sudah
emit. Yang belum, semua di `modules/finance/`:
- `tx-transfer.js` — `saveTransfer()` (baris 50): transfer antar akun,
  bikin sepasang transaksi `transfer_out`/`transfer_in`, 0 emit sama
  sekali untuk jenis transaksi ini.
- `tx-renov.js` — jalur `applyTxRenovFromTx()`/`handleTxRenovBelumDibeli()`:
  transaksi renovasi, 0 emit.
- `tx-stok-sparepart.js` — `applyStockPurchase()`/`revertStockPurchase()`:
  transaksi pembelian stok sparepart, 0 emit.
- `tx-target.js` — `saveTarget()`, `addTarget(i)`, `delTarget(i)`: transaksi
  tabungan/target, 0 emit.
- **`tx-list-cashflow.js` — `delTx(id)` (baris 286): jalur HAPUS transaksi
  UMUM (dipanggil dari `deleteTxFromModal()` di `transaksi.js`) — 0 emit
  sama sekali.** Ini gap paling signifikan di kelompok ini: `saveTx()`/
  `_saveTxInner()` (create/edit) sudah emit per-kind di `transaksi-b.js`,
  tapi path DELETE-nya (file lain, `tx-list-cashflow.js`) tidak — cascade
  besar (transfer pair, titipan talangan/pinjam, dst) berjalan sunyi tanpa
  event apa pun.

### 3. Utang/Piutang & Tagihan — domain finance yang sepenuhnya belum emit
- `modules/finance/piutang-utang.js` — 6 titik `save()`. Tidak ada
  fungsi persis bernama `savePiutang`/`saveUtang` di top-level file ini
  (kemungkinan tersebar sbg method object atau di file lain yang
  meng-include ini) tapi fungsi sync yang ADA di sini
  (`syncOutstandingSharedPiutang`, `syncDebtBalanceOnPaymentEdit`,
  `syncSharedPiutangOnPaymentEdit`, `maybeCreateTitipanTalanganPiutang`,
  `maybeCreateTitipanPinjamUtang`, dan cascade removalnya) semua menulis
  `D.debts`/`D.piutangs` langsung, 0 emit.
- `modules/finance/tagihan-kalender.js` — 10 titik `save()`:
  `_saveBillInner()` (baris 444, dibungkus `saveBill()` via
  `withSaveGuard`) dan `delBill(id)` (baris 578) — CRUD tagihan penuh, 0
  emit sama sekali.

### 4. Akun — `modules/finance/akun.js`
- `_saveAccInner()` (dibungkus `saveAcc()`) — CRUD akun (5 titik `save()`
  di file ini termasuk `setAccOwners()`). Tidak ada event `account.updated`
  sama sekali di codebase — ini domain BARU, bukan sekadar bolong di
  event yang sudah ada.

====================================================

## Temuan — Prioritas Sedang (domain besar, 0 event sama sekali, bukan cuma bolong)

### 5. Dana Titipan — SELURUH domain 0% Event Bus
File dengan `save()` tapi 0 `AIBus`: `dana-titipan-pool-api.js` (2x),
`dana-titipan-commitment-return-api.js` (4x), `titipan-reconcile.js` (3x),
`titipan-expense-flow.js` (1x). Ini domain yang sudah kompleks (lihat
`/areas/app-main.md` — commitment guard, ownership reconciliation,
`TitipanReconcile`) dan sudah beberapa kali kena bug lintas-modul (ghost
asset, orphan debt sync) — kandidat kuat untuk event baru
(`titipan.updated`, belum ada presedennya sama sekali, beda dari 4 domain
lain yang tinggal REPLIKASI pola, ini perlu keputusan nama event baru).

### 6. Shop / Cobek — produk & stok, hanya order yang emit
`delivery.created` cuma dari `cobek-order.js`. Sisanya 0 emit sama
sekali meski aktif menulis `D`:
- `cobek-etalase.js` — `Etalase._saveInner()` (baris 460), `delete(i)`
  (baris 580, produk), `Produsen.save()/delete()` (Modul 7, harga
  produsen).
- `cobek-io.js` — wrapper tipis ke atas (`saveProdusen`, `delProdusen`,
  `delShop`→`Laporan.delete()`), 4 titik `save()`.
- `cobek-pricing.js` (6x), `cobek-tx-cart.js` (2x) — perhitungan
  harga/keranjang yang menulis balik ke `D`.

### 7. Zakat/PBB — `modules/finance/pajak-pbb-zakat.js`
9 titik `save()`, 0 emit. Relevan karena `PriorityEngine.getItems()` (lihat
`/topics/recent-work.md`) sudah punya kind `zakat` — kalau ada consumer
Event Bus lain yang mau reaktif ke perubahan zakat/PBB, sumbernya belum
mengirim apa pun.

### 8. Investasi — file dasar `investasi.js` (beda dari 3 file view yang sudah emit)
`_invSave()` (baris 81) dipakai oleh banyak method holding di file ini;
`investasi-list-view.js`/`investasi-tx-view.js`/`investasi-view.js` SUDAH
emit `investment.updated`, tapi kalau ada method di `investasi.js` sendiri
yang menulis holding TANPA lewat 3 file view itu, jalurnya tidak ke-cover
— perlu ditelusuri lebih detail method mana saja yang dipanggil langsung
dari sini vs selalu lewat view (belum dipastikan di audit level ini,
tandai untuk verifikasi sesi coding).

### 9. Aset — bagian non-`aset.js`
`aset-misc.js` (4x `save()`), `aset-emas-impor.js` (2x, import emas),
`aset-reports.js` (3x) — `aset.js` sendiri sudah emit `asset.updated`,
tapi 3 file "adjacent" ini menulis `D.assets`/data terkait tanpa emit.

====================================================

## Ditandai RENDAH (sengaja tidak direkomendasikan dapat event)

File dengan `save()` tapi murni UI/pengaturan lokal, tanpa konsumen
lintas-modul yang masuk akal untuk event: `cashflow-projection-settings.js`,
`edukasi-dana.js` (materi edukasi, bukan data transaksional),
`format-tema.js`/`features-helpers-global-security.js` (pengaturan
tema/global), `fuel-intelligence-ui.js`/`fuel-tank-profile.js` (draft UI
lokal), `sparepart-ocr-catalog-add.js` (bagian dari alur OCR yang lebih
besar, entrypoint akhirnya kemungkinan sudah lewat `sparepart-servis*`),
`torsi-vehicle-api.js`/`vehicle-catalog-import-stock-push.js` (baca/tulis
katalog referensi, bukan data transaksi user), `linktx.js` (link
antar-transaksi, turunan dari tx yang sudah emit), `worthit.js` (kalkulator
"worth it", output lokal ke widget-nya sendiri).

Kalau ternyata ada yang salah kategori di sini (misal `worthit.js` di masa
depan ikut membuat transaksi nyata), pindahkan ke tingkat Sedang/Tinggi di
sesi berikutnya — bukan hal yang final, cuma penilaian saat ini.

====================================================

## Ringkasan Keputusan yang Perlu W Ambil Sebelum Coding

1. **Cakupan Sesi C pertama**: semua 9 titik Prioritas Tinggi+Sedang
   sekaligus (besar), atau dipecah lagi per-domain (kemungkinan lebih
   sesuai prinsip "1 sesi = 1 fokus kecil" §7)? Rekomendasi: mulai dari
   §1+§2 (vehicle CRUD + `delTx()`) karena murni REPLIKASI pola yang sudah
   terbukti jalan, risiko paling rendah.
2. **Nama event baru** untuk domain yang 0% (akun → `account.updated`?,
   dana titipan → `titipan.updated`?, tagihan/piutang-utang → gabung ke
   `finance.updated` existing atau event terpisah `debt.updated`/
   `bill.updated`?, produk/stok shop → `product.updated`/`stock.updated`?)
   — belum ada keputusan W, jangan ditebak sepihak saat coding.
3. **Listener gap** (dari AUDIT-AI-WIRING-GAP.md, B1): menambah emit baru
   tanpa menambah subscriber di `AIService.wireEvents()` cuma menambah
   "pemancar tanpa radio" — perlu diputuskan apakah Sesi C juga mencakup
   wiring listener, atau murni sisi emit dulu (matching scope asli §7:
   "Perluas pola ... ke titik-titik lain" — bisa dibaca cuma sisi emit).

**0 kode diubah di sesi ini.** Full suite tidak dijalankan ulang (audit
dokumen murni, tidak menyentuh test), tapi build terakhir (v1651) sudah
diverifikasi sebelumnya (lihat baseline check di bawah).

====================================================

## Verifikasi Baseline (v1651, sebelum audit ini)

`node --test tests/*.test.js`: 6158 test, 6147 pass, 11 fail — 11
kegagalan **identik** dengan yang sudah didokumentasikan di
`CHANGELOG.md` v1651 (1 `MANUFACTURERS`/`VEHICLE_MODELS` cross-realm
`deepStrictEqual`, 8 migrasi `toVersion:11` `DEFAULT_SPAREPARTS is not
defined` di stub test, 2 `verify-release-ready`/bundle-freshness karena
sandbox tanpa eslint/esbuild). **0 regresi baru dari proses apply 5 patch
zip berurutan (v1647→v1648→v1649→v1650→v1651) di sesi ini** — sama persis
dengan angka yang sudah dicatat sesi sebelumnya di CHANGELOG.
