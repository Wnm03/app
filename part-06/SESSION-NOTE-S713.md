# SESSION-NOTE-S713 (AKUMULASI S707+S708+S709+S710+S711+S712+S713) — Fix
# akar penyebab priceHistory dobel di partsStock (guard di titik tulis)

Base: app-main snapshot v1515 (S706). Patch ini **menumpuk (akumulasi)**
S707 + S708 + S709 + S710 + S711 + S712 + S713 — semuanya tidak hilang,
tetap aktif & sudah diverifikasi lolos test yang sama. Upload patch ini
menggantikan `PATCH-v1523-s712-AKUMULASI`; tidak perlu upload keduanya.

**Versi aplikasi: 1521 → 1522.** S711/S712 (data cleanup + scan, lihat
di bawah) tidak mengubah kode aplikasi. **S713 (bagian paling bawah)
yang mengubah versi** — satu-satunya perubahan kode di seluruh patch
akumulasi ini: 1 baris guard di titik tulis `priceHistory`, lihat
detail di bagian S713.

## S707 — Merge fix S700 (zakat owner autofill) & S702 (collapse 26 kartu)
## S708 — Restore dead file `modules/modules-render.js`
## S709 — Tombol "📤 Catat Dana Keluar" di baris "Total Estimasi Belum Teralokasi"

(Lihat detail lengkap di `SESSION-NOTE-S709.md` / `CHANGELOG.md` —
0 perubahan lagi di sesi ini, tetap aktif apa adanya.)

## S710 — Fix checkbox "🔧 Sinkron ke Catatan Servis" kosong saat
## re-centang di Edit (laporan user, screenshot: bug tersisa dari audit
## bersamaan dengan dobel stok sparepart)

**Konteks:** User melaporkan 2 bug lewat screenshot. Bug 1 (dobel entri
stok sparepart "ban belakang 90/90"/"pentil tubles") ternyata sudah
diperbaiki di kode saat ini (fix lama, kemungkinan data lama yang
kebobolan sebelum fix masuk — bukan bug aktif, cuma perlu bersih-bersih
manual). Bug 2 (field servis kosong pas re-centang di Edit) **masih
aktif** — inilah target sesi ini.

**Root cause (`modules/finance/transaksi.js`, `editTx()`):**
Checkbox `#txSyncServis` **SELALU** dipaksa `checked=false` tanpa syarat
& field Kendaraan/Jenis Servis-Item/Odometer-KM **TIDAK PERNAH** diisi
ulang dari `D.servisLogs` — beda dengan pola `txAddRenov`/`hasShopStock`
tepat di atasnya di fungsi yang sama (yang sudah benar: cek dulu apakah
transaksi ini ter-link sebelum tentukan status checkbox + isi ulang
datanya, lihat fix S452 utk Renov). Desain awal memang mengarahkan user
ke tombol "✏️ Edit Detail Servis" untuk transaksi yang sudah tertaut
(bukan re-centang panel ringkas ini), TAPI kalau user tetap re-centang
manual, dropdown Kendaraan cuma default ke kendaraan aktif & field
Jenis Servis/Item + KM tampil kosong — data-nya aman di `D.servisLogs`,
cuma representasi form Edit yang tidak pernah disinkronkan balik.

**Perubahan:**

1. `modules/finance/transaksi.js` — `editTx()`: sekarang cari baris
   `D.servisLogs` yang match `t.servisLinkId` SEBELUM menentukan status
   checkbox `txSyncServis` (pola sama persis dgn `renovChkEdit`). Kalau
   ketemu (baris belum dihapus manual dari tab Servis):
   - `checked=true` (bukan selalu `false`)
   - dropdown `#txServisVehicle` diisi ulang ke `linkedServisLog.vehicleId`
     (opsi ditambahkan dulu kalau belum ada di daftar, sama pola dgn
     `stockSelEdit`)
   - `#txServisItem` diisi ulang ke `linkedServisLog.item`
   - `#txServisKm` diisi ulang ke `linkedServisLog.km`
   Kalau transaksi belum ter-link/baris Servis-nya sudah dihapus manual,
   checkbox tetap `false` & field tetap kosong — **0 regresi** ke
   perilaku lama untuk transaksi yang memang belum pernah disinkron.
2. Tombol "✏️ Edit Detail Servis" (`t.servisLinkId` + baris `D.servisLogs`
   masih ada) **tetap** ditampilkan seperti sebelumnya — tetap jalur
   utama untuk edit detail lanjutan (part terpakai, interval, dll) yang
   tidak ada di panel ringkas ini.
3. **0 perubahan** ke `_saveTxInner()`/`applyTxServisFromTx()` — murni
   fix restorasi tampilan form Edit, sama seperti fix S452 (Renov) &
   audit sesi sebelumnya (Stok Sparepart).

File yang berubah: `modules/finance/transaksi.js`.

## S711 — Skrip pembersih `priceHistory` dobel di `partsStock` (data
## lama, bukan bug kode aktif — lihat "Belum dikerjakan" di bawah S710)

**Konteks:** Bug 1 dari laporan user (dobel entri stok sparepart "ban
belakang 90/90" / "pentil tubles") dikonfirmasi ulang lewat backup
(`backup-keluarga-W-2026-09-01.json`, field `partsStock`): kedua item
punya array `priceHistory` berisi 2 entri yang **identik persis**
(txId, tanggal, qty, harga, qtyBefore, avgPriceBefore semuanya sama) —
bukan 2 transaksi beda yang kebetulan mirip, tapi baris yang sama
tersimpan dobel. Sisa 294 item lain di `partsStock` **tidak** kena
(sudah dicek satu-satu, cocok dengan klaim S710 bahwa kode saat ini
sudah punya fix, ini murni sisa data sebelum fix masuk).

**Perubahan:**

1. **Baru:** `scripts/cleanup-duplicate-pricehistory.js` — skrip Node.js
   offline (dijalankan manual oleh user via `node`, bukan bagian dari
   aplikasi/bundle) yang:
   - Membaca file backup JSON hasil export.
   - Untuk tiap item `partsStock`, membuang entri `priceHistory` yang
     duplikat persis (deep-equal), menyisakan kemunculan pertama.
   - **Tidak** menyentuh `qty`, `price`, `avgPrice`, `txRefs`, atau
     field lain — 0 dampak ke saldo/stok, murni bersih-bersih log
     riwayat.
   - Menulis ke file baru (default `<input>.cleaned.json`), file asli
     tidak ditimpa.
   - Aman dijalankan berkali-kali (idempotent).
2. **0 perubahan** ke file aplikasi manapun (lihat catatan versi di
   atas) — sesuai catatan S710, ini murni backlog pembersihan data,
   bukan fix kode.

**Sudah dijalankan sekali** terhadap
`backup-keluarga-W-2026-09-01.json` yang dilampirkan user sebagai
verifikasi: 2 item dibersihkan (`ban belakang 90/90`: 2→1 entri,
`pentil tubles`: 2→1 entri). Hasil bersih dikirim terpisah ke user
sebagai `backup-keluarga-W-2026-09-01.cleaned.json` untuk diimpor
balik ke aplikasi kalau mau. Diff sudah diverifikasi hanya menyentuh
2 field `priceHistory` tsb, tidak ada field lain yang berubah.

## Test

- `tests/s710-tx-servis-edit-checkbox-restore.test.js` (baru, 3 test) —
  transaksi ter-link ke Servis -> checkbox tercentang & Kendaraan/Jenis
  Servis/KM terisi ulang; transaksi belum ter-link -> checkbox tetap
  kosong (regresi lama tidak berubah); baris Servis sudah terhapus ->
  checkbox jatuh ke kosong, tidak error.
- `tests/s452-tx-renov-edit-checkbox-restore.test.js` — 3/3 pass (pola
  Renov tetap aktif, 0 regresi).
- `tests/tx-stock-edit-checkbox-restore-s629b.test.js` — pass (pola
  Stok Sparepart tetap aktif, 0 regresi).
- `tests/s709-titipan-catat-dana-keluar-button.test.js` — 7/7 pass
  (S709 tetap aktif).
- Full suite: **5295/5295 pass, 0 fail**.
- Build: `node scripts/build.js s710-fix-servis-restore-saat-edit` —
  semua gate lolos, versi → 1521.
- `node scripts/verify-release-ready.js` — gate `lint`/`minify`
  di-override manual (sandbox tanpa akses jaringan, sama seperti
  sesi-sesi sebelumnya, dicatat di `docs/RELEASE-GATE-LOG.md`).

## File yang berubah di patch ini (akumulasi S707+S708+S709+S710+S711+S712+S713)

- `modules/finance/tx-stok-sparepart.js` (S713 — **baru disentuh di
  patch ini**, guard anti-dobel `priceHistory`; file ini TIDAK pernah
  diubah di S707–S712 sebelumnya)
- `scripts/cleanup-duplicate-pricehistory.js` (S711, tetap aktif,
  tidak disentuh sesi ini)
- `scripts/scan-duplicate-entries.js` (S712, tetap aktif, tidak
  disentuh sesi ini)
- `modules/asset/aset.js` (S700, S705 tetap aktif, tidak disentuh)
- `modules/modules-render.js` (S708 — dead file, tidak disentuh)
- `modules/finance/dana-titipan-portfolio-render.js` (S709, tidak
  disentuh)
- `modules/finance/titipan-expense-ui.js` (S709, tidak disentuh)
- `modules/finance/transaksi.js` (S710, tidak disentuh)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild, versi 1522)
- `index.html`, `app_production.html`, `sw.js` (version bump → 1522)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerated)
- `docs/RELEASE-GATE-LOG.md` (entri baru: override gate lint/minify
  sesi S713)
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js`
  (version-constant sync otomatis, 0 perubahan logika)
- `tests/s709-titipan-catat-dana-keluar-button.test.js` (dari S709,
  tidak disentuh)
- `tests/s710-tx-servis-edit-checkbox-restore.test.js` (dari S710,
  tidak disentuh)
- `tests/s713-stock-pricehistory-duplicate-push-guard.test.js` (baru)
- `SESSION-NOTE-S713.md` (catatan ini, menggantikan
  `SESSION-NOTE-S712.md` — riwayat S707–S712 tetap ada di atas)

## Belum dikerjakan (backlog eksplisit)

- Bug 1 dari laporan user (dobel entri stok sparepart "ban belakang
  90/90"/"pentil tubles"): **selesai tuntas.** S711 membersihkan data
  lama, S712 memastikan tidak ada lokasi lain yang terdampak, S713
  menutup akar penyebabnya di kode (guard anti-dobel). Tidak ada
  backlog tersisa dari bug ini.

## S712 — Skrip scan umum (semua array log, bukan cuma partsStock)

**Baru:** `scripts/scan-duplicate-entries.js` — read-only, scan SEMUA
array-of-object di backup JSON, laporkan yang punya entri deep-equal
dobel. Beda dari skrip S711 (yang hanya fix `partsStock.priceHistory`),
ini murni alat deteksi, tidak mengubah apapun.

**Hasil scan terhadap `backup-keluarga-W-2026-09-01.json`:**
- `partsStock[293].priceHistory`, `partsStock[294].priceHistory` — sudah
  ditangani S711.
- `transactions[1040].stockItems` (indeks 0 & 9, item "Muntu" qty 3 @
  Rp4.000) — **dicek manual, BUKAN bug**: total 11 baris `stockItems`
  di transaksi itu berjumlah persis Rp241.000 = `amount` transaksi
  tsb. Kalau baris index 9 dibuang, totalnya jadi Rp229.000 (tidak
  cocok lagi). Jadi ini pembelian "Muntu" dicatat 2 baris terpisah
  dengan harga sama (bukan artefak bug penyimpanan dobel) — **tidak
  perlu/tidak boleh dibersihkan**.

Kesimpulan: 0 lokasi tambahan yang perlu dibersihkan di luar S711.

## S713 — Fix akar penyebab: guard anti-dobel di titik tulis `priceHistory`
## (`applyStockPurchase()`, `modules/finance/tx-stok-sparepart.js`)

**Konteks:** Lanjutan investigasi Bug 1 (S710/S711/S712). S711 sudah
membersihkan 2 data lama yang dobel; S712 (scan menyeluruh) memastikan
tidak ada lokasi lain yang perlu dibersihkan. Tapi belum ada yang
menutup CARA data itu bisa dobel dari awal — sesi ini menutup celahnya.

**Root cause:** Di `applyStockPurchase(p,qty,unitPrice,purchaseDate,txId)`,
`txRefs` sudah dijaga anti-dobel (`if(!p.txRefs.includes(txId))
p.txRefs.push(txId)`), tapi baris tepat di atasnya —
`p.priceHistory.push(...)` — **tidak** ada pengecekan serupa, push
tanpa syarat. Kalau fungsi ini somehow terpanggil 2× untuk `txId` yang
SAMA tanpa `revertStockPurchase()` di antaranya (jalur edit normal
SELALU revert dulu baru apply lagi, jadi aman — kemungkinan besar
penyebabnya double-submit/double-klik tombol Simpan sebelum ada
debounce, di versi aplikasi yang lebih lama), `priceHistory` numpuk 2
entri yang identik persis. Ini cocok dengan temuan di backup user:
kedua entri "ban belakang 90/90"/"pentil tubles" punya `txId` yang
sama persis, bukan 2 transaksi beda.

**Perubahan:**

1. `modules/finance/tx-stok-sparepart.js` — `applyStockPurchase()`:
   sebelum `priceHistory.push()`, cek dulu apakah sudah ada entry
   dengan `txId` yang sama (`p.priceHistory.some(h=>h.txId===txId)`).
   Kalau sudah ada, skip push (pola sama persis dgn guard `txRefs` tepat
   di bawahnya). `txId` bernilai `null`/`undefined` (jalur lama tanpa
   txId) TIDAK kena guard ini — tetap push seperti perilaku lama, 0
   regresi.
2. **0 perubahan** ke rumus `qty`/`avgPrice`/`price`/`lastPrice` yang
   sudah ada — guard ini murni di titik tulis log riwayat.

**Test:** `tests/s713-stock-pricehistory-duplicate-push-guard.test.js`
(baru, 4 test) — double-call txId sama -> priceHistory tetap 1 entry;
jalur edit normal (revert->apply) tetap jalan seperti biasa; txId beda
tetap dicatat terpisah (guard tidak menelan pembelian lain); txId null
tidak kena guard (backward-compat).

Full suite (source app-main v1515 + S707–S710 diterapkan + S713):
**5299/5299 pass, 0 fail** (5295 sebelumnya + 4 test baru).

Build: `node scripts/build.js s713-fix-pricehistory-dup-guard` — semua
gate lolos, versi → 1522. `esbuild` tidak tersedia di sandbox (tanpa
akses jaringan) jadi bundle belum diminify (sama seperti sesi-sesi
sebelumnya, dicatat di `docs/RELEASE-GATE-LOG.md`) — bundle tetap
valid (`node --check` lolos) & 100% aman dipakai, cuma ukurannya
sedikit lebih besar dari versi terminify.
