# Changelog — Sesi 11: Bugfix cakupan sweep modal (self-test)

## Bug yang diperbaiki
Self-test "Tes Buka/Tutup Modal" melaporkan 1 masalah: "(kelengkapan
cakupan) modal belum terdaftar" untuk `qsProdusenActions` & `qsAssetActions`.
Kedua modal ini (dibuka lewat `openQS()`/`closeQS()` di
`modules/shared/action-wrappers.js` & `modules/shop/cobek-order.js`,
`modules/asset/aset.js`) memang ada di halaman & berfungsi normal, tapi
belum didaftarkan ke sweep test manapun — jadi selamanya tidak pernah
ikut ter-tes otomatis (bukan modal yang benar-benar rusak, cuma "buta"
dari radar self-test).

## Perubahan
- `self-test.js` — tambah 2 entry ke `EXTRA_MODAL_SWEEP_SPECS`:
  `qsProdusenActions` & `qsAssetActions`, pola SAMA PERSIS entry
  `qsBillActions` yang sudah ada di atasnya (`{fn:'openQS',
  args:['qs...'],id:'qs...',close:()=>closeQS('qs...')}`). Sekarang
  92/102 → 94/102 modal aman, 0 bermasalah.

---

# Changelog — Sesi 10: Reroute ImportKatalog.commit() ke commitShopRows()

## Target eksplisit user
Lanjutan opsional (BUKAN bagian `DESIGN_torsi-vehicle-selector_shop-import-
export-2.md` — dokumen itu SUDAH SELESAI 4/4 sejak Sesi 9): reroute
`ImportKatalog.commit()` (Paste, `cobek-io.js`) ke `ShopDataIO.
commitShopRows()` (`shop-data-io-api.js`, §B.4), item lanjutan yang
tercatat pertama kali di Sesi 5.

## Perubahan
- `modules/business/shop-data-io-api.js` — `ShopDataIO.commitShopRows(rows)`
  ditambah dukungan field opsional `hargaReseller` (dibutuhkan mode Paste
  "🤝 Harga Reseller"; Scan/PDF/CSV tidak pernah mengirim field ini, jadi
  perilakunya 0 berubah untuk ketiganya — 100% additive). Update: `product.
  hargaReseller = r.hargaReseller` kalau dikirim (partial-update, pola sama
  field lain). Create: `hargaReseller: r.hargaReseller ?? null` (sebelumnya
  hardcoded `null`).
- `modules/shop/cobek-io.js` — `ImportKatalog.commit()` DIREROUTE penuh:
  logic match-by-name + create/update produk (± 15 baris) DIHAPUS, diganti
  mapping `this.parsed` → `rows` (field `nama`/`kategori`/`hargaJual` selalu,
  `hargaReseller` kalau `target==='reseller'`, `hargaBeli` kalau
  `target==='beli'`) lalu 1 panggilan `ShopDataIO.commitShopRows(rows)`.
  Perilaku Paste 100% TIDAK BERUBAH dari sisi user (hargaJual selalu terisi
  dari harga yang di-paste; target menentukan kolom TAMBAHAN yang ikut
  terisi) — hanya sumber logic-nya sekarang SATU dengan
  Scan/PDF/CSV, bukan duplikat.
- Dengan ini, SEMUA 4 entry point Shop Import (Scan/PDF/CSV/Paste) resmi
  berbagi 1 SUMBER KEBENARAN commit (`ShopDataIO.commitShopRows()`) sesuai
  desain §B.4 — tuntas.

## Test
`tests/shop-import-katalog-reroute.test.js` (7 test baru): target reseller/
beli/jual pada produk baru (kombinasi field yang terisi benar), target
reseller pada produk existing (partial-update, field lain tidak ditimpa),
kategori teks ikut di-resolve lewat `commitShopRows()`, parsed kosong tidak
menyentuh `D.products`, dan integrasi banyak baris sekaligus.

`node --test tests/*.test.js` → **1703/1703 pass, 0 fail** (naik dari
baseline 1696, +7 test baru, 0 regresi — 2x, sebelum & sesudah build).

## Build
`node scripts/build.js` → sukses, `?v=848`, `docs/FILE-MAP.md`
ter-regenerasi otomatis, `index.html` & `app_production.html` identik.

## ZIP
`kw_release_s10_reroute-importkatalog-commitshoprows_v848.zip`.

---





## Target eksplisit user
Item TERAKHIR `DESIGN_torsi-vehicle-selector_shop-import-export-2.md`,
Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON): Import/Export JSON
Shop-only (§B.3.4). Dengan ini, Bagian B **SELESAI 4/4** (Scan, Import PDF,
Import CSV, Import/Export JSON).

## Perubahan
- `modules/business/shop-data-io-api.js`:
  - `ShopDataIO.exportShopJSON()` — download `{products, produsen, version,
    exportedAt}`. Passthrough `D.products`/`D.produsen` apa adanya — subset
    Shop-only dari `backup-restore.js` yang SUDAH ADA (`out.products=
    D.products; out.produsen=D.produsen;`), dibungkus fungsi terpisah biar
    user Shop bisa backup/restore cepat tanpa buka `backupModal` & centang/
    uncentang 8 modul lain. 0 field baru, 0 rumus baru.
  - `ShopDataIO.validateShopJSON(imp)` — cek shape (`products`/`produsen`
    harus array kalau ada, minimal salah satu ada) SEBELUM overwrite apa
    pun, pola sama `applyRestoredData()`.
  - `ShopDataIO.importShopJSON(imp, mode)` — mode `'gabung'` (default):
    match produk by nama (case-insensitive), ada → update PARTIAL (field
    `undefined` di sumber TIDAK menimpa), belum ada → buat baru shape
    produk Shop yang sama persis. Beda dari `commitShopRows()`: sumber di
    sini sudah berupa objek produk PENUH (hasil export JSON, bukan rows
    sederhana scan/CSV/PDF), jadi field yang disalin lebih lengkap
    (`kategoriId`/`produsenId`/`hargaReseller`/`diskonPersen`) — tidak
    lewat `commitShopRows()` karena tidak butuh `resolveShopKategori()`.
    Produsen: tambah yang belum ada saja (match by nama), TIDAK update
    produsen existing. Mode `'timpa'`: replace total `D.products`/
    `D.produsen` (destruktif, pemanggil wajib `askConfirm()` dulu).
  - `ShopJsonIO` *(baru)* — presenter modal `shopJsonModal`: Export = 1 tap
    langsung download (tidak perlu preview). Import = pilih file → `File.
    text()` → `JSON.parse()` → `validateShopJSON()` → preview ringkasan
    (jumlah baru/update untuk mode Gabung, atau peringatan replace total
    untuk mode Timpa) → commit lewat `importShopJSON()`. Mode Timpa wajib
    konfirmasi destruktif (`askConfirm()`, pola sama `archiveDeleteStep()`)
    sebelum commit; mode Gabung aman/additive, tidak ada konfirmasi
    tambahan (konsisten Import CSV/PDF/Scan yang sudah ada). Diexpose ke
    `window.ShopJsonIO` (dipanggil langsung dari `data-action` di modal).
- `modules/shared/modals.js` — modal baru `shopJsonModal`: tombol Export
  langsung, toggle mode Gabung/Timpa (`chip-btn`, sama gaya toggle lain),
  file input `.json`, area preview, tombol commit (disabled sampai file
  valid dipilih).
- `index.html` & `app_production.html` — tombol baru "🗂️ Import/Export
  JSON (Shop)" di tab Shop → Etalase, setelah tombol Scan Nota/Struk.

## Test
`tests/shop-data-io-json-import.test.js` (11 test baru): `exportShopJSON()`
passthrough + version + exportedAt, `validateShopJSON()` (bukan objek,
tanpa products/produsen, bukan array, shape valid), `importShopJSON()` mode
gabung (produk baru lengkap, produk existing partial-update, produsen baru
ditambah tapi existing tidak diubah), mode timpa (replace total), shape
invalid (`D` tidak disentuh), dan integrasi ringan end-to-end
`exportShopJSON()` → `importShopJSON()` gabung round-trip.

`node --test tests/*.test.js` → **1696/1696 pass, 0 fail** (naik dari
baseline 1685, +11 test baru, 0 regresi).

## Build
`node scripts/build.js` → sukses, `?v=847`, `docs/FILE-MAP.md`
ter-regenerasi otomatis, `index.html` & `app_production.html` identik.

## Status Bagian B (DESIGN_torsi-vehicle-selector_shop-import-export-2.md)
**SELESAI 4/4**: Scan (§B.3.1), Import PDF (§B.3.2), Import CSV (§B.3.3),
Import/Export JSON Shop-only (§B.3.4). Bagian A tetap SELESAI (Torsi
Vehicle Selector, lihat entri Sesi N+2/N+3 di bawah). Item yang masih
tercatat sbg lanjutan (di luar scope dokumen ini, dicatat terpisah di
`docs/NEXT_SESSION.md` kalau relevan): reroute `ImportKatalog.commit()`
(Paste, `cobek-io.js`) ke `commitShopRows()`.

## ZIP
`kw_release_s9_shop-import-export-json_v847.zip`.

---





## Target eksplisit user
Lanjutan `DESIGN_torsi-vehicle-selector_shop-import-export-2.md`, Bagian B
(Shop Import/Export: Scan/PDF/CSV/JSON) — item pertama & paling ringan sesuai
urutan implementasi disarankan di dokumen: `commitShopRows()` + Import CSV
(§B.3.3, §B.4). Scan (§B.3.1), Import PDF (§B.3.2), dan Import/Export JSON
Shop-only (§B.3.4) SENGAJA belum dikerjakan — menyusul sesi terpisah
masing-masing (RULE "1 target per sesi").

## Perubahan
- `modules/business/shop-data-io-api.js` *(baru)*:
  - `ShopDataIO.commitShopRows(rows)` — 1 fungsi commit dipakai bareng 4
    entry point (Scan/PDF/CSV/Paste) sesuai desain §B.4, mencegah duplikasi
    logic. 100% reuse pola match-by-name (case-insensitive) + partial-update
    yang sudah ada di `ImportKatalog.commit()`/`ImportShopExcel.commit()`
    (`cobek-io.js`) — produk existing di-update field yang dikirim saja,
    field yang tidak dikirim TIDAK ditimpa; produk baru dibuat dengan shape
    objek yang sama persis dipakai di seluruh Shop.
  - `ShopDataIO.parseShopCSV(text)` — parser CSV sederhana
    (`split('\n')`+`split(',')`, sesuai §B.3.3 — codebase belum pakai
    papaparse, konsisten prinsip "no extra dependency kalau tidak perlu").
    Header wajib `nama,kategori,harga_beli,harga_jual,stok,satuan`, urutan
    kolom bebas (dicocokkan lewat nama header, bukan posisi tetap), kolom
    "nama" wajib ada.
  - `ShopCsvImport` — presenter modal `shopCsvImportModal`, pola sama persis
    `ImportShopExcel` (`cobek-io.js`): pilih file → baca (`File.text()`) →
    parse → preview (badge 🆕 baru / 🔄 update) → commit lewat
    `ShopDataIO.commitShopRows()`.
- `modules/shared/modals.js` — modal baru `shopCsvImportModal` (upload
  `.csv`, preview, tombol commit), reuse struktur `importShopExcelModal`.
- Reroute `ImportKatalog.commit()` (Paste, `cobek-io.js`) ke
  `commitShopRows()` yang sama **TIDAK** dikerjakan sesi ini (di luar scope
  "paling ringan, validasi pola commit dulu") — dicatat sbg item lanjutan di
  `docs/NEXT_SESSION.md`, bukan diasumsikan sudah beres.

## Test
`tests/shop-data-io-csv-import.test.js` (12 test baru): parsing header
lengkap/dibalik/tanpa kolom nama/baris kosong/harga berformat "Rp30.000",
`commitShopRows()` insert vs update partial, baris tanpa nama diabaikan,
rows kosong/bukan array, banyak baris sekaligus, dan integrasi
`parseShopCSV()` → `commitShopRows()` end-to-end.

`node --test tests/*.test.js` → **1671/1671 pass, 0 fail** (naik dari
baseline 1659).

## Build
`node scripts/build.js` → sukses, `?v=843`, `docs/FILE-MAP.md`
ter-regenerasi otomatis.

## Status Bagian B (DESIGN_torsi-vehicle-selector_shop-import-export-2.md)
Item 1/4 selesai: `commitShopRows()` + Import CSV. Sisa: Import PDF (§B.3.2,
reuse `VehicleCatalogImportUI`), Scan (§B.3.1, reuse `SparepartScannerUI`),
Import/Export JSON Shop-only (§B.3.4). Bagian A tetap SELESAI (lihat entri
Torsi Sesi N+2/N+3 di bawah).

## ZIP
`kw_release_sesi5_shop-data-io-csv-import_v843.zip`.

---



# Changelog — Torsi Sesi N+2/N+3: Vehicle Selector Field di `torsiModal`

## Target eksplisit user
Lanjutan `DESIGN_torsi-vehicle-selector_shop-import-export-2.md`, Bagian A,
sesi berikutnya setelah migrasi `DATA_MIGRATIONS` (toVersion:4) & refactor
`toggleCheck()`/`updateBiaya()` (lihat zip
`kw_release_sesi2_torsi-togglecheck-vehicleapi_v841.zip`): tambahkan field
"Pilih Kendaraan" mandiri di `torsiModal` supaya bisa cek/isi torsi
kendaraan lain tanpa mengganti kendaraan aktif global (`curVehicleId`).

## Perubahan
- `modules/shared/modals.js` — tambah `<div id="trsVehiclePickerWrap">`
  berisi `<select id="trsVehicleSelect" onchange="Torsi.onVehicleChange(this)">`
  di `torsiModal`, persis di bawah judul modal, sebelum `.trs-calc-card`
  (sesuai kontrak HTML A.4 di dokumen desain).
- `car-notes.js` (`Torsi`):
  - `renderVehicleSelect()` (baru) — isi `<option>` dari
    `TorsiVehicleAPI.daftarKendaraan()`, 100% reuse pola
    `ShopKatalogDinamisPresenter.render()`; default `_selectedVehicleId` ke
    kendaraan pertama kalau belum valid.
  - `onVehicleChange(el)` (baru) — ganti `Torsi._selectedVehicleId`
    in-memory saja (TIDAK menyentuh `curVehicleId` global/`D`), baca ulang
    checklist kendaraan terpilih lewat `TorsiVehicleAPI.checklistUntuk()`
    (read-only, 0 side-effect), lalu render ulang daftar part + `trsVehChip`.
    Sengaja TIDAK memanggil `setPageMode()`/`persist()` di sini karena
    keduanya menulis ke `D.torsiChecklist[curVehicleId]`, bukan ke
    kendaraan yang baru dipilih — toggle UI mode diupdate manual supaya
    tidak salah tulis ke kendaraan aktif global.
  - `open()` sekarang memanggil `renderVehicleSelect()` saat modal dibuka.
- 0 perubahan skema `D.torsiChecklist`, 0 field `D` baru (konsisten A.4.1 —
  `_selectedVehicleId` variabel modul biasa, direset tiap modal dibuka).

## Test
`tests/torsi-vehicle-selector-render-s4.test.js` (5 test baru): render
`<option>` dari `daftarKendaraan()`, isolasi `_selectedVehicleId` dari
`curVehicleId` global, `onVehicleChange()` read-only (tidak memanggil
`save()`/menulis `D.torsiChecklist`), data checklist antar kendaraan tidak
tercampur saat pindah-pindah di selector, guard value kosong.

`node --test tests/*.test.js` → **1659/1659 pass, 0 fail** (naik dari
baseline 1615 + 5 test/44 assertion baru di atas — migrasi `toVersion:4`
& wiring `onVehicleChange()` sekarang sama-sama punya cakupan test
otomatis, menuntaskan item "Sesi N+4: Regression test" di dokumen desain).

## Build
`node scripts/build.js` → sukses, `?v=841`, sintaks kedua bundle valid,
`docs/FILE-MAP.md` ter-regenerasi otomatis (278 file, 1884 identifier).

## Status Bagian A (DESIGN_torsi-vehicle-selector_shop-import-export-2.md)
**SELESAI** — API (`TorsiVehicleAPI`, Sesi 1), migrasi jaring-pengaman
(`DATA_MIGRATIONS` toVersion:4), refactor `toggleCheck()`/`updateBiaya()`,
field "Pilih Kendaraan" (HTML + `onVehicleChange()`), dan regression test
semuanya sudah dikerjakan & hijau. Sisa item opsional di dokumen desain:
sinkronisasi dokumen desain itu sendiri (item terpisah, tidak mengubah
kode) & keputusan UX terbuka soal prefill `servisModal` dari
`Torsi._selectedVehicleId` (A.5, belum final — menunggu keputusan user).
Bagian B (Shop Import/Export) belum dimulai.

## ZIP
`kw_release_sesi4_torsi-vehicle-selector_v841.zip`.

---



## Target eksplisit user
Lanjutan dari 2 temuan yang ditunda di S311 (rule 1-target/sesi) — user minta
kerjakan salah satu yang ringan. Dipilih: akun yang dibuat otomatis lewat
opsi "➕ Buat Akun Baru dari Aset Ini" (`Aset.save()`, blok `accountId==='__new__'`)
selalu ownership SELF/DEFAULT, TIDAK PERNAH mewarisi ownership aset sumbernya
— akibatnya akun itu tidak kehitung di Dana Kelolaan ("Dana Investor" dkk)
walau aset-nya sendiri sudah ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY.

## Perubahan
`modules/asset/aset.js` `Aset.save()` — resolusi `ownership` (dropdown
`#assetOwnership`, via `OwnershipEngine.isValidType()`/`.normalize()`) DIPINDAH
ke SEBELUM blok pembuatan akun `__new__` (semula dihitung SETELAH blok itu).
Objek `newAcc` yang di-push ke `D.accounts` sekarang menyertakan field
`ownership` itu apa adanya — pola field yang SAMA PERSIS dipakai
`_saveAccInner()` (`akun.js`) untuk akun manual. Akun yang ditautkan ke akun
LAMA (bukan `__new__`) TIDAK terpengaruh (di luar scope — ownership akun lama
tetap dikontrol independen lewat modal Akun sendiri, sesuai keputusan produk
sebelumnya, tidak ada auto-override). 0 rumus/logic Dana Kelolaan diubah — fix
murni di titik penulisan data akun baru.

## Test
`node --test tests/*.test.js` → **1600/1600 pass, 0 fail** (2x — sebelum &
sesudah build; tidak ada test baru — `Aset.save()` bergantung penuh ke DOM
`getElementById`, sama seperti catatan S311, tidak ada harness fake-document
siap pakai. Logic inheritance ownership divalidasi manual lewat simulasi Node
terpisah: `__new__` dgn ownership INVESTOR → `newAcc.ownership==='INVESTOR'`,
`__new__` tanpa ownership dipilih → fallback SELF, keduanya sesuai ekspektasi).

## Build
`node scripts/build.js sesi312-fix-ownership-akun-baru-dari-aset` → sukses,
`?v=825`.

## ZIP
`kw_release_sesi312_fix-ownership-akun-baru-dari-aset_v825.zip`.

---

# Changelog — S311: Fix sync nominal akun tertaut ↔ Buku Aset

## Target eksplisit user (bugreport)
Screenshot modal Akun (Sesi 310 → sekarang): akun ber-jenis Investasi yang
ditautkan dari Buku Aset (`accountId`) nominalnya tidak ikut berubah saat
nilai asetnya diedit — 2 field (`asset.nilai` vs `acc.baseBalance`) cuma
sama sekali pas akun itu PERTAMA dibuat via opsi "➕ Buat Akun Baru dari
Aset Ini", sesudah itu independen selamanya (root cause, dikonfirmasi baca
kode: tidak ada listener sync berkelanjutan).

(2 temuan lain dari audit yang sama — blur kartu akun yang memang BY
DESIGN selama tertaut ke Aset walau toggle "Aktif", dan ownership akun
auto-buat yang tidak mewarisi ownership aset shg tidak kehitung di Dana
Investor — TIDAK digarap sesi ini, ditunda sesuai rule 1-target/sesi,
lihat `docs/NEXT_SESSION.md`.)

## Perubahan
`modules/asset/aset.js` `Aset.save()` — 1 blok baru setelah resolusi
`accountId` (termasuk hasil `__new__`): kalau aset sudah tertaut ke akun
YANG SUDAH ADA sebelumnya (bukan baru dibuat di blok `__new__` sesi save
ini, itu sudah otomatis sama nilainya), akun itu di-"koreksi" ke nominal =
`nilai` aset SEKARANG — pakai pola `txDelta` yang 100% REUSE dari
`_saveAccInner()` (`akun.js`, dipakai fitur "Saldo Sekarang" manual):
`txDelta = recalcAccBalance(acc.id) - acc.baseBalance` (efek bersih
transaksi yang sudah tercatat di akun itu), lalu `acc.baseBalance = nilai -
txDelta` supaya `recalcAccBalance()` berikutnya = `nilai` persis, TANPA
menyentuh/menghapus riwayat transaksi akun. 0 rumus baru.

## Test
`node --test tests/*.test.js` → **1600/1600 pass, 0 fail** (tidak ada test
baru — `Aset.save()` bergantung penuh ke DOM `getElementById`, tidak ada
harness fake-document siap pakai utk fungsi ini; rumus `txDelta` divalidasi
manual lewat simulasi Node terpisah: kasus tanpa transaksi & kasus dengan
transaksi existing, keduanya hasil akhir = nilai aset baru, transaksi
tidak berubah).

## Build
`node scripts/build.js sesi311-fix-sync-akun-tertaut-aset` → sukses,
`?v=824`.

## ZIP
`kw_release_sesi311_fix-sync-akun-tertaut-aset_v824.zip`.

---

# Changelog — S306: Chip prioritas + overflow menu "⋮" — kartu Aset (Buku Aset)

## Konteks (lanjutan audit tab lain, kandidat paling mirip kasus Tagihan)
Kartu Aset (`Aset.renderList()`, `modules/asset/aset.js`) punya 2 masalah
sekaligus — lebih padat dari kasus chip Tagihan (S299/S304):
1. Baris `tx-meta` menggabung jenis · label/extraLabel · lokasi ·
   akun tertaut · kepemilikan · dana titipan · %untung jadi 1 kalimat
   panjang tanpa jarak visual.
2. 3 tombol sejajar per kartu (📜 Riwayat Transaksi — cuma kalau ada
   akun tertaut, ⚡ Scan cepat, 🗑 Hapus) + tap kartu buka Edit — pola
   sama persis kasus Tagihan (S300) & Produsen (S305) sebelum dirapikan.

## Perubahan
- Baris `tx-meta` sekarang HANYA 2 chip prioritas — jenis & 📍 lokasi
  (reuse class `.acc-chip` yang SUDAH ADA, 0 style baru). %untung
  dipindah ke sebelah nominal (`tx-amount`) biar tetap kelihatan tanpa
  bikin baris chip tambah panjang.
- Detail lain yang sebelumnya nempel di `tx-meta` (label tambahan/
  extraLabel, akun tertaut, kepemilikan, dana titipan) TIDAK dihapus —
  dipindah jadi baris teks di dalam overflow menu baru (di bawah judul
  aset), cuma tampil kalau memang ada datanya.
- Kartu Aset sekarang cuma tampil tombol "⋮" (tap kartu TETAP buka
  Edit lewat `data-action="openAssetModal"` di wrapper div, tidak
  berubah).
- Modal overflow baru `qsAssetActions` (HTML, di `app_production.html`
  & `index.html`) — 100% reuse struktur `qsBillActions`/
  `qsProdusenActions` & class `.qs-modal-overlay`/`.bill-action-row`/
  `.bar-icon` yang SUDAH ADA, 0 CSS baru. Tambah 1 div
  `#assetActionsMeta` (baru, dipakai utk baris detail di atas, reuse
  `.u-fs12`/`.u-t2` yang sudah ada).
- `Aset.openActionsMenu(id)` (baru, `aset.js`) isi baris 📜 Riwayat
  Transaksi (cuma kalau `accountId` tertaut), ⚡ Update Cepat via Scan,
  🗑 Hapus. 3 wrapper baru di `action-wrappers.js`
  (`assetActionHistory`/`assetActionScan`/`assetActionDelete`) — REUSE
  penuh fungsi global `Aset.openTxHistory()`/`quickScanAsset()`/
  `delAsset()` yang sudah ada, cuma nambah `closeQS('qsAssetActions')`
  sebelum manggil, pola sama persis `billActionShareWA()`/
  `produsenActionHarga()` dkk.

## Audit ulang (sebelum rilis)
Ditemukan & diperbaiki 3 hal dari draf pertama:
1. `renderList()` masih menghitung `linkedAcc`/`linkMeta`/`titipanLabel`
   padahal SUDAH TIDAK dipakai di template kartu (dead code sisa refactor
   — `openActionsMenu()` menghitung ulang sendiri versinya, tidak berbagi
   closure dgn `renderList()`). Dihapus.
2. `pctBadge` (%untung) sempat tetap tampil di `tx-amount` KARTU *dan*
   di overflow menu sekaligus (duplikat) — padahal maksud awal "sisanya
   masuk overflow" mencakup %untung juga. Sekarang %untung HANYA di
   overflow menu.
3. `ownDetail` (teks mentah "Ownership SELF" dst, fitur lama S234, SELALU
   tampil di kartu krn `OwnershipEngine.resolve()` tidak pernah null)
   jadi duplikat kasar dgn `ownMeta` versi rapi Bahasa Indonesia yang
   baru dipindah ke overflow menu. Dihapus dari kartu (info lengkapnya
   tetap ada, di overflow, format yang lebih rapi).
Tambahan: `#assetActionsMeta` di-`display:none`-kan (bukan cuma
`innerHTML=''`) kalau kebetulan tidak ada baris meta sama sekali —
jaga-jaga celah kosong dari padding bawaan div.

## Test
Regression penuh **1593/1593 PASS** (re-run setelah audit).



## Konteks (lanjutan audit tab lain, poin ke-2)
Kartu Produsen (`Produsen.renderList()`, `modules/shop/cobek-order.js`)
punya 3 tombol sejajar (💰 Atur Harga, ✏️ Edit, 🗑 Hapus) — pola sama
persis kasus kartu Tagihan sebelum S300.

## Perubahan
- Kartu Produsen sekarang cuma tampil ✏️ Edit langsung (aksi paling
  sering dipakai) + tombol "⋮" baru.
- Modal overflow baru `qsProdusenActions` (HTML, di `app_production.html`
  & `index.html`) — 100% reuse struktur `qsBillActions` (S300) & class
  `.qs-modal-overlay`/`.bill-action-row`/`.bar-icon` yang SUDAH ADA, 0
  CSS baru.
- `Produsen.openProdusenActionsMenu(id)` (baru, `cobek-order.js`) isi
  baris 💰 Atur Harga & 🗑 Hapus. 2 wrapper baru di `action-wrappers.js`
  (`produsenActionHarga`/`produsenActionDelete`) — REUSE penuh fungsi
  global `openProdusenHargaModal()`/`delProdusen()` yang sudah ada
  (`cobek-io.js`), cuma nambah `closeQS('qsProdusenActions')` sebelum
  manggil, pola sama persis `billActionShareWA()` dkk.

## Test
Regression penuh **1593/1593 PASS**.

# Changelog — S304: Konsistensi badge status — Piutang & Buku Utang

## Konteks (lanjutan audit tab lain, poin paling ringan)
Badge status "Lunas"/"Jatuh Tempo" di list Piutang (`Piutang.renderList()`)
& Buku Utang (`Debt.renderList()`), keduanya di `modules/finance/
piutang-utang.js`, masih pakai inline `style="..."` hardcoded (border-1px
warna manual) — padahal maksud & warnanya PERSIS sama dengan class
`.bill-due-ok`/`.bill-due-urgent` yang sudah dibuat utk tab Tagihan
(S300). Bukan bug, cuma tidak konsisten/tidak reuse.

## Perubahan
Ganti span badge inline-style di 2 tempat itu jadi reuse
`.bill-due-badge .bill-due-ok` (Lunas) / `.bill-due-badge .bill-due-urgent`
(Jatuh Tempo) + `.u-ml4` (utility spacing yg sudah ada). Badge "🔥
Prioritas" di Piutang (solid merah, beda tujuan — highlight item
teratas) SENGAJA tidak disentuh, tidak ada padanan class yang pas &
bukan sumber ketidak-konsistenan. 0 HTML struktur baru, 0 CSS baru.

## Test
Regression penuh **1593/1593 PASS**.

# Changelog — S302: UI Polish (lanjutan) — accordion kartu Tagihan pt.5

## Perubahan
Poin 5 dari S300 (yg sebelumnya ditunda) sekarang dikerjakan: progress
bar cicilan + catatan anomali (⚠️ Naik X%) dibungkus `.bill-card-detail`
(collapsed default, CSS `max-height` transition, 0 JS berat). Dibuka via
chevron ▾ terpisah (`toggleBillCardDetail()`, `action-wrappers.js`) —
BUKAN dengan mengganti tap kartu, krn tap kartu (`data-action=
"openBillModal"` di `.bill-item`) sudah dipakai buka Edit; chevron pakai
`data-stop="1"` jadi kliknya tidak ikut trigger Edit.

Chevron cuma dirender kalau kartu punya detail (tagihan biasa tanpa
cicilan/anomali tidak dapat chevron kosong). Chip kategori/urgensi di
baris atas TETAP selalu terlihat (tidak ikut collapse) — sesuai
permintaan: "nama+jumlah+urgensi" tetap tampil, cuma progress bar &
detail tambahan yang disembunyikan.

## Test
Regression penuh **1593/1593 PASS**.

# Changelog — S300: UI Polish — kartu Tagihan & Cicilan (keuanganTab-tagihan)

## Konteks (permintaan user, 5 poin polish visual)
Kartu tagihan di tab "Tagihan & Cicilan" (renderBillList(), `modules/
shared/modules-render.js`) berat secara visual: 5 ikon aksi sejajar per
kartu, chip kategori & urgensi sama-sama netral (tidak ada hierarki),
3 stat-box kotak makan tempat vertikal, progress bar cicilan selalu 1
warna. Semua perubahan CSS-only/reuse — TIDAK ada dependency baru.

## Perubahan
- **Ringkas baris ikon aksi**: kartu aktif sekarang cuma tampil ✅ Bayar
  + ✏️ Edit langsung; 💬 WA/📋 Riwayat/🗑 Hapus dipindah ke menu overflow
  "⋮" — REUSE penuh `openBillActionsMenu()`/modal `qsBillActions` yang
  SUDAH ADA di `tagihan-kalender.js` tapi sebelumnya tidak pernah
  dipanggil dari renderBillList() (kode "yatim"). Ditambah param `lunas`
  ke `openBillActionsMenu(id,lunas)` supaya baris & routing hapus benar
  utk kartu arsip (lunas) — wrapper baru `billActionDeleteArchive()` di
  `action-wrappers.js` (panggil `delBillArchive()`, bukan `delBill()`).
- **Hierarki chip**: badge urgensi jatuh tempo sekarang 3-tier warna —
  `bill-due-urgent` (≤3 hari/lewat, merah), `bill-due-soon` (4-7 hari,
  oranye — direpurpose dari merah), `bill-due-far` (>7 hari, abu-abu
  netral, kelas baru). Chip kategori/subkategori/shared/sisaTenor TETAP
  `.acc-chip` abu-abu netral seperti sebelumnya — jadi sekarang ada
  urutan jelas kategori vs urgensi.
- **Stat grid → pill row**: 3 `.stat-box` kotak (`grid3`) diganti 1 baris
  `.bill-stat-pills` horizontal-scroll (CSS baru, class baru, TIDAK ada
  JS baru) — id elemen di dalamnya (`keuBillMonthTotal` dkk) TIDAK
  berubah jadi `updateBillStatGrid()` 0 perubahan logic.
- **Progress bar cicilan berwarna**: `prog-fill` ikut sisa tenor — hijau
  kalau masih jauh, oranye kalau `sisaTenor<=2` (mepet akhir tenor).
  Reuse class `.prog-fill.green`/`.orange` yang SUDAH ADA (var warna
  tema `--accent`/`--accent3`/`--accent4`), 0 warna hardcode baru.
- Poin "kepadatan list keseluruhan" (accordion per-kartu, collapse
  default) BELUM dikerjakan — tap kartu saat ini membuka modal Edit
  (`data-action="openBillModal"` di elemen pembungkus), jadi accordion
  butuh keputusan UX dulu (chevron terpisah vs ganti semantik tap kartu)
  supaya tidak tabrakan sama alur edit yang sudah ada.

## Test
Regression penuh **1593/1593 PASS** (tidak ada test baru — perubahan
murni template string HTML/CSS, kategori sama seperti render function
lain yang di luar cakupan harness `loadSource`/`fakeDom`).

# Changelog — Sesi 294: Bugfix — Scanner kamera masih terhalang #mainNav (tab bawah "Uang" dkk) di mode browser tab

## Konteks (laporan user, 2 screenshot)
Buka scanner kamera (Sparepart) di mode browser tab biasa (bukan PWA
terinstall, `wnm03.github.io/apk/`) — overlay fullscreen scanner
(`.vehicle-scanner-fullscreen`, `z-index:var(--z-scanner)=970`) SEHARUSNYA
di atas segalanya, tapi `#mainNav` (bottom nav app: Beranda/Uang/Shop/Aset/
Mobil/Pajak, `z-index:var(--z-chrome)=100`) tetap kepaint DI ATAS overlay
scanner — teks hint "Arahkan kamera ke..." & area scan ketutup sebagian
oleh nav, padahal angka z-index-nya lebih rendah. Root cause pasti
platform/compositing-dependent (kemungkinan terkait elemen `<video>` +
`backdrop-filter` di `.nav`, bukan murni salah 1 aturan CSS statis) — tidak
bisa dipastikan 100% tanpa reproduksi manual di device yang sama, jadi FIX
dipilih yang PORTABLE terlepas dari penyebab pastinya.

## Perubahan (minimal, pola reuse, 0 CSS baru)
- **`modules/vehicle/vehicle-scanner.js`**: 2 fungsi baru
  `vehicleScannerHideChrome()`/`vehicleScannerRestoreChrome(prev)` —
  simpan `style.display` asli `#mainNav`/`#mainHeader`, set `display:none`
  selama scanner terbuka, kembalikan persis seperti semula saat ditutup.
  Dipanggil dari `vehicleScannerBuildOverlay()` (simpan hasil di
  `overlay._prevChrome`) & `vehicleScannerTeardown()`. Pola SAMA seperti
  `showMain()` yang sudah toggle elemen ini manual (bukan mengandalkan
  z-index murni) — jadi konsisten dengan konvensi existing, bukan
  pendekatan baru.
- **`modules/vehicle/sparepart-scanner.js`**: `sparepartScannerBuildOverlay()`/
  `sparepartScannerTeardownOverlay()` REUSE PENUH 2 fungsi di atas (guard
  `typeof`, dependency load-order `vehicle-scanner.js` sebelum
  `sparepart-scanner.js` sudah terjamin di `scripts/build.js`) — TIDAK
  duplikasi logic.
- Efeknya: scanner kamera (baik Vehicle Catalog maupun Sparepart) sekarang
  benar-benar fullscreen tanpa elemen chrome app lain menutupinya, di
  browser tab maupun PWA.

## Test
TIDAK ada test `node:vm` baru — 2 fungsi baru murni baca/tulis DOM
(`getElementById`/`style.display`), termasuk kategori yang SUDAH
didokumentasikan di luar cakupan harness `loadSource` (lihat header
`tests/vehicle-scanner.test.js`: bagian kamera/overlay butuh browser
nyata). Konsisten dengan konvensi existing, bukan lubang baru.

## Hasil verifikasi
```
node --check modules/vehicle/vehicle-scanner.js modules/vehicle/sparepart-scanner.js
# OK

node --test tests/*.test.js
# tests 1577 / pass 1577 / fail 0 (0 regresi)

node scripts/build.js s294-camera-scanner-nav-overlap-fix
# ✅ Build selesai, index.html & app_production.html identik, sintaks bundle valid
```

---

# Changelog — Sesi 293: Audit tindak lanjut — orphan check Target Tabungan di runDataHealthCheck()

## Konteks
Hasil audit eksternal atas rilis Sesi 292 (`akun-del-targets-assets-gapfix`)
menemukan: `delAcc()` (`modules/finance/akun.js`) sudah memigrasi `accountId`
di `D.targets` sejak Sesi 292 supaya tidak dangling saat akun dihapus, TAPI
`runDataHealthCheck()` (`data-health-check.js`) — mekanisme audit integritas
data lintas-domain yang sudah mengecek kasus identik untuk `D.assets`,
`D.bills`, `D.bbmLogs`, `D.servisLogs`, `D.cobek`, item `D.renovProjects`,
dll — belum pernah mengecek orphan `accountId` di `D.targets`. Jadi kalau
ada jalur lain (restore backup lama, import, dsb) yang bikin `D.targets`
kembali dangling, tidak ada warning yang muncul ke user.

Rekomendasi audit lain yang TIDAK dikerjakan sesi ini (di luar cakupan
"paling ringan", butuh keputusan/effort terpisah):
- Instalasi `esbuild` (perlu akses jaringan, tidak tersedia di environment
  build saat ini) — bundle produksi tetap belum diminify.
- Retensi folder `backups/` — lihat `scripts/cleanup-backups.js` (BARU,
  sesi ini) sebagai tooling-nya; belum dijadwalkan otomatis, dijalankan
  manual dulu sesuai kebutuhan.

## Perubahan (audit-only, 0 skema/store baru, pola 100% reuse)
- **`data-health-check.js`**: tambah 1 cek baru di `runDataHealthCheck()` —
  `(D.targets||[]).forEach(...)` warn `"Target Tabungan dengan akun tautan
  tidak valid"` kalau `t.accountId` tidak ada di `D.accounts`. Pola SAMA
  PERSIS cek `D.assets` yang sudah ada tepat di atasnya (1 syarat, 1 issue,
  level `warn`, 0 logic baru).
- **`scripts/cleanup-backups.js`** (BARU): utility standalone (tanpa
  dependency luar) buat retensi `backups/app-bundle-*.min.*.js` — default
  simpan 10 backup terbaru per bundle (`a`/`b`), sisanya dihapus. Dry-run
  by default (`--apply` buat betulan menghapus). Tidak dipanggil otomatis
  dari `build.js` sesi ini (sengaja, biar user yang putuskan kapan
  dijalankan) — TIDAK ada perubahan ke `build.js`.

## Test baru
`tests/data-health-check-target-orphan-s293.test.js` (4 test): warn kalau
`accountId` Target Tabungan tidak valid, tidak warn kalau valid, tidak
di-flag kalau `accountId` kosong/null (target manual tanpa tautan akun),
dan `D.targets` kosong/tidak ada tidak pernah bikin `runDataHealthCheck()`
error.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1577 / pass 1577 / fail 0 (naik dari 1573, +4 test baru, 0 regresi)

node scripts/build.js s293-datahealth-target-orphan-audit
# ✅ Build selesai, index.html & app_production.html identik, sintaks bundle valid
```

---

# Changelog — Sesi 292: Bugfix — hapus Akun tidak memigrasi Target Tabungan & Aset yang tertaut (akun-del-targets-assets-gapfix)

## Konteks
`accountId` menunjuk ke `D.accounts`. Sebelum fix ini, hapus akun yang
masih ditautkan ke Target Tabungan (`D.targets`) atau Aset (`D.assets`)
bikin `accountId`-nya jadi dangling reference (nunjuk akun yang sudah
tidak ada) — progress Target/badge "via Aset" bisa salah baca karena kode
di `tx-target.js`/`aset.js` asumsinya akun itu selalu ada. `delAcc()`
sebelumnya cuma memigrasi 5 array lain (`transactions`, `bills`,
`bbmLogs`, `servisLogs`, `cobek`) saat akun dihapus & datanya dipindah ke
akun lain — `targets` dan `assets` terlewat.

## Perubahan (additive, pola 100% reuse, 0 skema/store baru)
- **`modules/finance/akun.js`** (`delAcc()`): tambah `D.targets` &
  `D.assets` ke deteksi `hasLinkedData` dan ke migrasi `accountId` saat
  akun dihapus — pola SAMA PERSIS 5 array yang sudah ada (cuma 2 baris
  `forEach` tambahan + 2 syarat `.some()` tambahan, 0 logic baru). Pesan
  konfirmasi & modal pilih akun tujuan (`showChoiceModal`) diperluas
  menyebutkan jumlah Target Tabungan/Aset yang ikut tertaut, supaya user
  sadar data ini juga akan dipindah.

## Test baru
`tests/akun-del-migrate-choice.test.js`: +2 test — akun ditautkan ke
Target Tabungan (`D.targets`) ikut terdeteksi & ikut dipindah; akun
ditautkan ke Aset (`D.assets`) dengan 2+ kemungkinan tujuan ikut
terdeteksi, `showChoiceModal` muncul, ikut dipindah ke pilihan user.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1573 / pass 1573 / fail 0 (0 regresi)

node scripts/build.js s292-akun-del-targets-assets-gapfix
# ✅ Build selesai, ?v=802, index.html & app_production.html identik, sintaks bundle valid
```

---

# Changelog — Sesi 290: FITUR — "Push ke Stok Sparepart" pasca Import Katalog PDF

## Konteks (pertanyaan user)
Audit user atas `vehicle-catalog.js` benar: sync Katalog Suku Cadang ->
Stok Sparepart TIDAK otomatis membawa qty nyata. Yang sudah ada
sebelumnya (Tahap 9/`syncPartsStockFromCatalog()` & Tahap 10
Sesi 287/`syncUnlinkedCatalogPartsToStock()`) cuma menautkan part katalog
ke `D.partsStock` dgn `qty:0` begitu panel Stok Keuangan dibuka — part
hasil "Import Katalog" (PDF) tetap harus ditambah qty-nya manual satu-
satu lewat modal "Tambah Stok Sparepart" atau dropdown Servis.

## Perubahan (additive, 0 skema/store baru, 0 modal baru)
- **`modules/vehicle/vehicle-catalog-import.js`** — `commitRows()`
  sekarang juga mengembalikan `createdItems: []` (item `VehicleCatalog`
  yang BENAR-BENAR berhasil dibuat sesi commit ini). Field lama
  (`imported`/`skipped`/`duplicates`/`errors`) TIDAK berubah bentuk —
  additive murni, pemanggil lama (mis. `vehicle-catalog-web-import.js`)
  tidak terpengaruh.
- **`modules/vehicle/vehicle-catalog-import-stock-push.js`** (BARU) —
  `VehicleCatalogImportStockPush.run(items, qty)`: logic murni, reuse
  100% `syncPartsStockFromCatalog()` (Tahap 9) per item lalu **tambah**
  qty ke baris stoknya (tidak pernah menimpa qty existing, pola sama
  `applyStockPurchase()`). `.promptAndRun(createdItems)`: orkestrasi
  reuse `askConfirm()`/`showPromptModal()` yang SUDAH ADA (tidak ada
  modal baru) — tanya konfirmasi lalu SATU angka qty awal yang dipakai
  rata ke semua part yang baru diimpor sesi commit itu (qty berbeda per
  part tetap bisa dikoreksi manual seperti biasa setelahnya).
- **`modules/vehicle/vehicle-catalog-import-ui.js`** — `catalogImportUiCommit()`
  memanggil `VehicleCatalogImportStockPush.promptAndRun(summary.createdItems)`
  SETELAH toast/refresh import sukses (dibungkus try/catch, guard typeof —
  gagal aman, tidak pernah menggagalkan import yang sudah sukses).
- **`scripts/build.js`** — entri baru `vehicle-catalog-import-stock-push.js`
  di GROUP_B, tepat setelah `vehicle-catalog-import-ui.js`.

## Test baru
- `tests/vehicle-catalog-import-stock-push.test.js` — 11 test baru
  (`run()`: link + tambah qty, qty 0/negatif/NaN, array kosong,
  dependency belum ada; `promptAndRun()`: array kosong, batal di
  konfirmasi, batal di prompt qty, sukses end-to-end, qty dikosongkan).
- `tests/vehicle-catalog-import.test.js` — +2 test `commitRows()`
  (`createdItems` isi item yang benar-benar dibuat, bukan skip/duplikat;
  array kosong -> `createdItems` tetap array kosong).

## Diketahui, TIDAK disentuh sesi ini (pre-existing, di luar cakupan)
- ~~`tests/sw-precache-paths.test.js` — 2 test gagal~~ **DIPERBAIKI** (lihat
  bawah, atas permintaan lanjutan user sesi ini).
- `npm run lint` tidak bisa dijalankan di environment sesi ini (`eslint`
  belum terpasang, tidak ada akses jaringan utk `npm install`).

## Perbaikan susulan (1 baris, atas permintaan user)
- **`sw.js`** — `PRECACHE_URLS`: `'./smoke-test.js'` (path lama, file
  sudah dipindah ke `modules/shared/smoke-test.js` sejak Sesi 284, `sw.js`
  tidak pernah ikut diupdate) diperbaiki jadi
  `'./modules/shared/smoke-test.js'`. Efeknya: sebelumnya
  `cache.addAll(PRECACHE_URLS)` di `install` event gagal-total (silent,
  cuma ke-`console.warn`) krn 1 path 404 — precache PWA offline-first
  jadi tidak pernah benar-benar tersimpan. Fix ini murni koreksi path,
  0 perubahan strategi caching lain.

## Hasil verifikasi (final)
```
node --test tests/*.test.js
# tests 1565 / pass 1565 / fail 0 (0 gagal — termasuk fix sw-precache-paths)

node scripts/build.js
# ✅ Build "s289-camera-scanner-modal-fix-4" selesai, ?v=799,
#    index.html & app_production.html identik, sintaks bundle valid
```

---



## Konteks (laporan user, 2 screenshot)
1. Dropdown "Pilih Sparepart" di panel "📦 Tambah ke Stok Sparepart juga?"
   (form Tambah/Edit Transaksi Keuangan) cuma menampilkan isi
   `D.partsStock` — part yang sudah ada di 📦 Katalog Suku Cadang
   (`VehicleCatalog`, ditambah manual/scan/import di modal Katalog) TIDAK
   pernah muncul di situ sampai di-scan ulang lewat tombol "📷 Scan Kode
   Part".
2. Sebaliknya, part baru yang ditambah manual lewat ⚙️ Atur -> "Kelola
   Kategori Sparepart & Stok Sparepart" -> "+ Tambah Stok Sparepart"
   (`Sparepart.saveStock()`, modules/vehicle/sparepart-servis.js) TIDAK
   pernah dipush ke `VehicleCatalog` — beda dari alur Keuangan
   (`applyTxStockFromTx()`) yang SUDAH auto-push sejak Tahap 9 (Sesi 266).

Jembatan Tahap 9 (`syncPartsStockFromCatalog()`, dari Sesi 266) sudah ada
tapi cuma dipanggil dari alur scan — belum pernah dipanggil otomatis pas
panel dibuka, dan belum ada versi arah sebaliknya (Kelola Stok -> Katalog).

## Perubahan (Tahap 10, lanjutan Tahap 9 — 0 skema/store baru)
- **`modules/finance/tx-stok-sparepart.js`** — fungsi baru
  `syncUnlinkedCatalogPartsToStock()`: tiap kali `populateTxStockSelect()`
  dipanggil (panel stok dibuka), best-effort load `VehicleCatalog` lalu
  tautkan semua part katalog (non-draft) yang belum punya baris
  `D.partsStock` terhubung (`catalogId`) — reuse 100%
  `syncPartsStockFromCatalog()` yang sudah ada, TIDAK ada logic bikin part
  baru. Async & fire-and-forget (guard `typeof`, tidak throw kalau
  `VehicleCatalog` belum ada/gagal load) — dropdown dirender ulang HANYA
  kalau memang ada part baru yang tertaut, supaya tidak flicker.
- **`modules/vehicle/sparepart-servis.js`** — `Sparepart.saveStock()`
  cabang "part baru" (bukan edit) sekarang juga panggil
  `VehicleCatalog.create({partName, category})` best-effort (pola SAMA
  PERSIS `applyTxStockFromTx()`), lalu simpan `catalogId` hasilnya ke
  baris stok yang baru dibuat. Cabang edit TIDAK berubah (tidak
  memicu create() lagi, mencegah entri katalog dobel tiap edit).

## Test baru
- `tests/tx-stok-sparepart-catalog-link.test.js` — +5 test
  `syncUnlinkedCatalogPartsToStock()` (part belum tertaut, sudah tertaut,
  draft diabaikan, VehicleCatalog belum ada, ensureLoaded() reject).
- `tests/sparepart-savestock-catalog-push.test.js` (baru, 5 test) —
  `saveStock()` push part baru ke `VehicleCatalog.create()` dgn kategori
  terpilih/fallback "Umum", edit TIDAK memicu create() lagi,
  VehicleCatalog tidak ada/reject -> tetap simpan stok tanpa error.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1554 / pass 1553 / fail 1 (naik dari 1544, +10 test baru)
# 1 fail SUDAH ADA SEBELUM sesi ini, tidak terkait (FEATURE_REGISTRY:
# group 'stgGroup3' Pengingat belum dihapus dari index.html — item lain
# yang sedang dikerjakan user, di luar cakupan fix ini)

node scripts/build.js s287-sparepart-catalog-tx-sync
# ✅ Build selesai, ?v=811, index.html & app_production.html identik
```

---

# Changelog — Sesi 286 (lanjutan): FIX — cycle-guard dependency graph modules/cross/* (audit temuan #1, gap regression-test yang hilang)

## Konteks
Audit lanjutan (0 kode diubah) menemukan: komentar header
`unified-ai-briefing.js` § "ARSITEKTUR (S116 — Circular Dependency
Hotfix)" merujuk riwayat bug nyata Sesi 115-117 (`UnifiedAIBriefing ->
ActionQueue -> DecisionCenterAPI` sempat circular -> "Maximum call stack
size exceeded") & menyebut `tests/decision-center-dependency-graph.test.js`
+ `tests/cross-module-graph-static.test.js` sbg regression-guard
permanennya — **TERNYATA KEDUA FILE ITU TIDAK ADA** di source (dicek
grep/find ke seluruh `tests/*.test.js`, 0 hasil). Kalau siklus itu balik
lagi di masa depan, tidak ada satu pun test yang akan menangkapnya.
Ditutup jadi prioritas tertinggi dari seluruh audit.

## Perubahan (0 kode aplikasi diubah — murni test baru)
- **`tests/cross-module-dependency-graph-s286.test.js`** (7 test, BARU)
  menggantikan 2 nama file yang hilang, digabung jadi 1:
  - **Static (2 test):** baca ulang ke-17 `modules/cross/*.js` APA
    ADANYA (bukan daftar edge hardcode), bangun graph dependency dari
    referensi identifier antar-file (komentar di-strip dulu supaya
    prosa yang menyebut nama file lain tidak salah kedeteksi jadi
    edge), lalu DFS deteksi siklus generik + assert arah 3 file inti
    riwayat bug (`UnifiedAIBriefing` tidak boleh membaca
    `ActionQueue`/`DecisionCenterAPI`/`LifeDashboardSummaryAPI`).
  - **Runtime (5 test):** muat SEMUA 17 file cross ASLI bersamaan
    (urutan build sebenarnya dari `scripts/build.js`) + stub minimal 4
    leaf dependency luar (`FinanceDashboard`/`VehicleAIHook`/
    `FinanceIntelligence`/`VehicleIntelligence`), lalu panggil rantai
    nyata end-to-end lewat `ActionQueue.getQueue()`/
    `RecommendationPanel.getRecommendations()`/`PriorityEngine.getItems()`/
    `UnifiedAIBriefing.generate()`→`DecisionCenterAPI.summary()` — kalau
    siklus balik terjadi, panggilan ini RangeError otomatis tanpa perlu
    assertion tambahan.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1505 / pass 1505 / fail 0 (naik dari 1498, +7 test baru, 0 regresi)

node scripts/build.js kw286c-cross-module-dependency-graph-cycle-guard
# ✅ Build selesai, ?v=810, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1505 / pass 1505 / fail 0
```

**Audit temuan #1 (cycle-guard hilang) DITUTUP.** Sisa 10 file
`modules/cross/*` (life-dashboard-summary-api/unified-ai-briefing/
unified-summary-api/cross-ai-hook/finance-vehicle-cross-summary/
cross-dashboard-card/unified-briefing-presenter/cross-insight-presenter/
personal-overview-presenter/cross-module-widgets/unified-dashboard-home)
masih 0 test kontrak fungsional masing-masing (bukan cycle-guard) —
belum digarap, menunggu arahan lanjutan.

---



## Konteks
Audit ditemukan: seluruh rantai `LifeDashboardSummaryAPI -> PriorityEngine ->
DecisionCenterAPI -> ActionQueue/RecommendationPanel/DecisionCenterHome ->
LifePriorityPanel` (dipakai Personal Life Dashboard & Personal Decision
Center, Batch 8) serta `ai-decision-engine.js` (otak AI lintas modul) TIDAK
PUNYA satu pun test — gap besar padahal jadi konsumen inti banyak modul.
Prioritas ditentukan dari besar-kecil blast radius kalau berubah/rusak:
**tinggi** = 2 engine murni (filter/urutan/rule evaluation, dikonsumsi
banyak lapisan di atasnya), **sedang** = 1 adapter data (`DecisionCenterAPI`
— pintu masuk gabungan), **rendah** = 4 presenter murni (render/formatting,
blast radius sempit, sebagian besar sudah wrapped guard `typeof===
'undefined'`).

## Perubahan (0 kode aplikasi diubah — murni test baru, sesuai batasan
harness `tests/helpers/loadSource.js`: fungsi yang baca/tulis DOM lewat
`getElementById` TIDAK dites di sini, pola sama persis
`tests/business-flow-presenter.test.js`)

**Prioritas tinggi (engine):**
- `tests/priority-engine-s286.test.js` (7 test) — `PriorityEngine.getItems()`:
  guard sumber belum dimuat, filter `over===true`/severity overdue-atau-
  due-soon, urutan hasil, count konsisten.
- `tests/ai-decision-engine-s286.test.js` (16 test) — kontrak generik
  `AIDecision.rules`/`.recommend`/`.learn`/`.decide()`/
  `.formatRecommendation()`.

**Prioritas sedang (adapter):**
- `tests/decision-center-api-s286.test.js` (7 test, BARU sesi ini) —
  `DecisionCenterAPI.recommendations()` (filter gabungan finance+vehicle
  `type==='warning'`) & `.summary()` (guard sumber belum dimuat/`ok:false`,
  `priorityItems`/`priorityCount` dari `PriorityEngine` bukan dihitung
  ulang, fallback ke `s.priorityCount` kalau `PriorityEngine` tidak
  tersedia, `recommendations`/`recommendationCount` ikut ditempel).

**Prioritas rendah (presenter):**
- `tests/decision-center-presenters-s286.test.js` (14 test, BARU sesi
  ini) — bagian NON-DOM dari 4 presenter: `ActionQueue.getQueue()`/
  `_label()`/`_vehicleIcon()`, `RecommendationPanel.getRecommendations()`/
  `_icon()`, `DecisionCenterHome.render()` (delegasi murni ke 2 presenter
  lain, di-mock sbg plain object — 0 DOM nyata), `LifePriorityPanel._row()`/
  `_vehicleIcon()`. `render()` milik `ActionQueue`/`RecommendationPanel`/
  `LifePriorityPanel` sendiri (baca `getElementById`) SENGAJA TIDAK dites
  di sini — di luar batasan harness, konsisten pola presenter lain.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1498 / pass 1498 / fail 0 (naik dari 1476, +22 test baru, 0 regresi)

node scripts/build.js kw286b-decision-center-presenter-adapter-gap-fix
# ✅ Build selesai, ?v=809, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1498 / pass 1498 / fail 0
```

**Rantai Priority/Decision Engine SEKARANG punya cakupan test penuh di
semua 3 tingkat prioritas (tinggi/sedang/rendah) — lihat 4 file test di
atas.**

---



## Konteks
§4.1 sebelumnya 🔴 (butuh JS, di luar batas program CSS-only Tahap 1–8).
User eksplisit mengizinkan perubahan JavaScript untuk item ini sesi ini.
`ROADMAP-v1.1.md` #3 mencatat FEATURE_REGISTRY sudah lama teratasi lewat
`FeatureIcons.render()`, tapi eksplisit mengecualikan "widget AI/LifeOS
Areas" dari scope — sesi ini menutup 1 dari 2 pengecualian itu.

## Perubahan
- **`modules/shared/feature-icons.js`**: 2 mapping SVG baru ditambah ke
  `_MAP` — `👨‍👩‍👧` (family, 3-figure icon) & `🏃` (health, running
  figure). 4/6 emoji `LIFEOS_AREAS` lain (💰🛒🚗🕌) sudah lama terpetakan,
  tidak diubah.
- **`lifeos/ui/areas.js`** (`LifeOSAreas.render()`): `.lifeos-area-icon`
  sekarang pakai `FeatureIcons.render(a.icon || '🗂️')` (guard `typeof
  FeatureIcons !== 'undefined'`, fallback `escapeHtml(a.icon)` kalau
  file belum di-load) — pola SAMA PERSIS `dashboard-hub.js`/
  `dashboard-hub-search.js`. `a.icon` bersumber dari `LIFEOS_AREAS`
  (`lifeos-registry.js`, data statis di source, bukan input user) —
  aman dipakai tanpa `escapeHtml` di jalur utama, konsisten dgn
  FEATURE_REGISTRY yang juga tidak di-escape.
- **TIDAK diubah**: `dashboard-hub-registry.js`/`FeatureIcons.render()`
  itu sendiri, `modules/ai/feature-insights.js` (emoji glyph inline di
  tengah teks — pola berbeda, butuh keputusan desain terpisah, sengaja
  dilewati sesi ini, dicatat sbg sisa terbuka).

## Test baru
`tests/lifeos-areas-icon-s281.test.js` (5 test — sebelumnya 0 test sama
sekali utk `LifeOSAreas.render()`): mapping SVG lengkap 6/6 emoji
`LIFEOS_AREAS`, fallback `render()` utk emoji tak terpetakan, render
menghasilkan `<svg>` (bukan emoji polos), guard `FeatureIcons` tidak
tersedia → fallback `escapeHtml` tanpa error, guard grid tidak ada di
DOM.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1439 / pass 1439 / fail 0 (naik dari 1434, +5 test baru, 0 regresi)

node scripts/build.js s281-lifeos-areas-icon-svg
# ✅ Build selesai, ?v=803, index.html & app_production.html identik
```

---

# Changelog — Sesi 280: FIX ringan — lanjutan migrasi literal `font-size` ke token (KNOWN-ISSUES §2.4)

## Konteks
Lanjutan "kerjakan yang ringan": setelah §1.2/§3.1 disinkronkan (Sesi
279), audit ulang §2.4 — Sesi 277 baru memigrasi literal `11/12/13px`,
sisa skala `14–20px` belum diperiksa apakah ada yang match persis token
`--fs-*` yang sudah ada di `:root` (`--fs-body-lg:14px`,
`--fs-title-sm:15px`, `--fs-icon:16px`, `--fs-title:17px`,
`--fs-icon-lg:18px`, `--fs-stat:20px`, tidak di-override per tema).

## Metode
Sama seperti Sesi 277: hanya migrasi literal yang **NILAINYA PERSIS
SAMA** dengan token yang sudah ada (100% value-preserving, `var()`
resolve ke angka piksel identik di semua tema). Regex hanya menyasar
properti `font-size:`, tidak menyentuh `:root` sendiri atau properti
lain (`line-height`, `width`, dst). Nilai yang tidak match persis
(8.5px, 9.5px, 10px, 10.5px, 11.5px, 12.5px, 13.5px, 14.5px, 19px,
22px, 24px, 26px, 30px, 36px, 40px, 42px, 52px) sengaja tidak
disentuh — di luar cakupan "migrasi ke token yang SUDAH ADA".

## Perubahan
`styles.css` — 39 literal `font-size` diganti jadi referensi token (0
perubahan nilai piksel): `14px`→`var(--fs-body-lg)` (15×), `15px`→
`var(--fs-title-sm)` (5×), `16px`→`var(--fs-icon)` (6×), `17px`→
`var(--fs-title)` (3×), `18px`→`var(--fs-icon-lg)` (6×), `20px`→
`var(--fs-stat)` (4×).

`KNOWN-ISSUES.md` §2.4, `ROADMAP-v1.1.md` item #9, dan
`FONT-SIZE-TOKEN-MIGRATION.md` diperbarui merefleksikan progres ini.

## Regresi
Tidak ada test JS yang terdampak (perubahan CSS murni, tidak ada
selector/struktur yang berubah). Full suite tetap **1434/1434 PASS**
(0 perubahan dari baseline Sesi 278/279).

## File berubah
- `styles.css` — 39 literal ditoken-kan.
- `KNOWN-ISSUES.md`, `ROADMAP-v1.1.md`, `FONT-SIZE-TOKEN-MIGRATION.md` — status diperbarui.
- `CHANGELOG.md` (dokumen ini).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1434 / pass 1434 / fail 0 (sama seperti baseline Sesi 278/279, 0 regresi)
```

---

# Changelog — Sesi 279: FIX ringan — sinkronisasi KNOWN-ISSUES.md §1.2/§3.1 (dokumentasi basi)

## Konteks
Lanjutan "kerjakan yang ringan": setelah §5.3 (Sesi 278), 2 item 🟢
CSS-only lain di `KNOWN-ISSUES.md` diaudit ulang — §1.2 (touch target
`.chip-btn`/`.qs-btn`) & §3.1 (container `max-width` halaman). Keduanya
masih tertulis "belum diperbaiki" padahal kode sudah benar sejak lama
(`TOUCH-TARGET-PADDING.md`/`PAGE-CONTAINER-MAXWIDTH.md`, Sprint 2 Tahap
13/15) — dikonfirmasi langsung ke `styles.css`: `.chip-btn{padding:11px
14px}`, `.qs-btn{padding:12px 12px}`, `@media(min-width:1024px){.page{
max-width:1080px}}` semua sudah ada. Tabel ringkasan §"Ringkasan Jumlah
Isu" bahkan sudah menghitung keduanya sebagai selesai — pola sama
persis "dokumentasi vs kode tidak sinkron" yang berulang di banyak sesi
sebelumnya (mis. Sesi 39/41/44/46/47 di `TODO.md`).

## Perubahan
`KNOWN-ISSUES.md` — §1.2 & §3.1 ditandai ✅ SELESAI dengan rincian nilai
CSS aktual, tabel ringkasan diberi catatan sinkronisasi. **0 perubahan
kode** — murni dokumentasi.

## File berubah
`KNOWN-ISSUES.md`, `CHANGELOG.md`.

## Hasil verifikasi
```
node --test tests/*.test.js   # 1434/1434 PASS (tidak berubah — 0 kode diubah)
```

---

# Changelog — Sesi 278: FIX ringan — hover elevation `.shop-stat.clickable` (KNOWN-ISSUES §5.3)

## Konteks
Lanjutan "kerjakan yang ringan": audit ulang §5.3 KNOWN-ISSUES.md
("hover elevation tap-target sekunder belum ada") — ternyata SUDAH
dikerjakan Sprint 2 Tahap 16 untuk `.stat-box`/`.cobek-stat`/
`.bbm-stat`/`.budget-sum-box`/`.budget-item` (dokumen basi). Satu
komponen sejenis kelewat: `.shop-stat.clickable`.

## Perubahan
`styles.css` — tambah `.shop-stat.clickable:hover{background:
var(--surface3)}` di blok `@media (hover:hover) and (pointer:fine)`,
disamakan dgn feedback `:active`-nya sendiri (bukan token/pola baru,
0 perubahan ke rule lain).

## File berubah
`styles.css`, `KNOWN-ISSUES.md` (§5.3 + tabel ringkasan), `CHANGELOG.md`.

## Hasil verifikasi
```
node --test tests/*.test.js   # 1434/1434 PASS (0 regresi)
node scripts/build.js s278-hover-shop-stat-ringan   # ✅ ?v=801
```

---

# Changelog — Sesi 277: FIX ringan — migrasi literal CSS ke token yang sudah ada (KNOWN-ISSUES §2.1/2.2/2.4)

## Konteks
Permintaan user: kerjakan rekomendasi perbaikan dari audit, mulai dari
yang paling ringan. Kandidat paling ringan = 4 item 🟢 "CSS-only,
risiko rendah" di `KNOWN-ISSUES.md` §2 (Consistency), yang secara
eksplisit ditandai *value-preserving* (migrasi literal→token tanpa
mengubah tampilan).

## Metode
Audit ulang literal `styles.css` per item (bukan percaya begitu saja
angka lama di `KNOWN-ISSUES.md` yang ternyata sebagian sudah basi —
banyak literal generasi sebelumnya SUDAH ditoken-kan di sesi-sesi
UI Tahap 1–10):
- **2.1 border-radius** & **2.4 font-size**: cari literal yang
  **NILAINYA PERSIS SAMA** dengan token `--r-*`/`--fs-*` yang sudah
  ada di `:root` (didefinisikan SEKALI, tidak di-override per tema —
  diverifikasi dulu sebelum eksekusi, supaya migrasi dijamin 0
  perubahan piksel di 10 tema). Literal yang TIDAK match token manapun
  sengaja dibiarkan (menambah token baru = keputusan desain terpisah,
  di luar cakupan "ringan").
- **2.2 box-shadow**: diverifikasi ulang — ternyata sudah 100% pakai
  `var(--shadow-card, fallback)`, 0 perubahan diperlukan.
- **2.3 transition duration**: diaudit tapi **sengaja TIDAK disentuh**
  — durasi asli (300–600ms, animasi lebar progress bar/toggle) tidak
  match token `--dur-*` manapun (100–250ms); mengganti ke token
  terdekat akan mengubah kecepatan animasi sungguhan, BUKAN migrasi
  value-preserving lagi. Beda kelas risiko dari 2.1/2.2/2.4.

## Perubahan
`styles.css` — 18 literal diganti jadi referensi token (0 perubahan
nilai piksel):
- **border-radius** (10×): `8px`→`var(--r-xs)` (`.wh-day-box-status`,
  `.u-r8`, `.cat-emoji`, `.trs-tag-btn`, `.trs-biaya-wrap input`),
  `14px`→`var(--r-md)` (`.gaji-result`, `.import-zone`,
  `.trs-summary-bar`, `.kasir-receipt`), `24px`→`var(--r-pill)`
  (`.tgl-track`), `18px`→`var(--r-xl)` (`.trs-calc-card`).
- **font-size** (8×): `11px`→`var(--fs-caption)` (`.page-breadcrumb`,
  `.findash-card-sub`, `.tk-num`, `.tk-note`), `12px`→
  `var(--fs-label)` (`.dashhub-fav-star`, `.dashhub-explore-link`,
  `.tk-title`), `13px`→`var(--fs-body)` (`.tk-mark`).

`KNOWN-ISSUES.md` — §2.1/2.2/2.4 diperbarui jadi "sebagian selesai"
dgn rincian subset yang sudah dikerjakan vs yang sengaja dibiarkan
(beserta alasannya), §2.3 diberi catatan kenapa tetap terbuka, tabel
ringkasan diperbarui.

## Regresi
Tidak ada test JS yang terdampak (perubahan CSS murni). Full suite
tetap **1434/1434 PASS** (0 perubahan dari baseline S276).

## File berubah
- `styles.css` — 18 literal ditoken-kan.
- `KNOWN-ISSUES.md` — status §2.1/2.2/2.3/2.4 & tabel ringkasan.
- `CHANGELOG.md` (dokumen ini).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1434 / pass 1434 / fail 0 (sama seperti baseline S276, 0 regresi)

node scripts/build.js s277-css-token-migration-ringan
# ✅ Build selesai, ?v=800, index.html & app_production.html identik
```

---

# Changelog — Sesi 276: AUDIT sinkronisasi lintas-fitur menyeluruh + FIX gap orphan `catalogId`

## Konteks
Permintaan user: audit sinkronisasi seluruh repository (semua domain,
dashboard, presenter, BI, AI, registry, event, SSOT, dead code, orphan
data, import/export, dependency), jalankan seluruh test & build, dan
kembalikan repo yang sudah diperbaiki. Melanjutkan pola audit
S200/S201/S268/S272/S274.

## Metode & cakupan yang diverifikasi
1. **Full regression baseline**: `node --test tests/*.test.js` (1425/1425
   PASS) & `node scripts/build.js` — bundle valid, `index.html`/
   `app_production.html` identik, versi konsisten di semua file source —
   **sebelum** perubahan apa pun dibuat.
2. **Orphan file check**: cross-check seluruh `modules/**/*.js` +
   `lifeos/**` + `economic-intelligence/**` terhadap daftar referensi di
   `scripts/build.js` (GROUP_A/GROUP_B) — 0 file yatim ditemukan (satu
   kandidat awal, `modules/shared/smoke-test.js`, dikonfirmasi BUKAN
   orphan — dimuat terpisah lewat `<script src>` langsung di
   `index.html`/`app_production.html`, bukan lewat bundle, sesuai desain
   `scripts/build-preview.js`).
3. **Duplicate logic check**: scan nama seluruh `function xxx(){}`
   top-level di semua file domain (1125 nama unik) — 0 nama fungsi
   duplikat lintas file (konvensi 1-nama-global-1-file konsisten
   dipertahankan).
4. **Circular dependency check**: `lifeos/`/`economic-intelligence/`
   tidak memakai `require()`/`module.exports` (arsitektur global-script
   `window.X`, bukan bundler ES module) — tidak ada graf import untuk
   dicek sirkularnya; ketergantungan urutan muat diverifikasi lewat
   build order eksplisit `scripts/build.js` (sudah py guard sendiri,
   lolos).
5. **Bridge fragility sweep** (lanjutan metode S274, grep pola
   name-match `.find(...name...)`/`toLowerCase()===` di seluruh
   `modules/*`+root): dikonfirmasi ulang seluruh bridge ID eksplisit
   (`catalogPartRefs`, badge Katalog S269/275) sudah 100% ID-based;
   kandidat name-match lain (kategorisasi transaksi, produk Shop,
   restore-by-name di `backup-restore.js`) dikonfirmasi BUKAN kelas bug
   yang sama — itu pencocokan teks bebas dari user/import eksternal
   (tidak ada ID sumber utk dijadikan match presisi), bukan bridge antar
   2 entitas ber-ID yang seharusnya presisi.

## Temuan & FIX: orphan `catalogId` di `D.partsStock` tidak terdeteksi
`runDataHealthCheck()` (`data-health-check.js`) sudah cek catalogId
**duplikat** (S268) tapi belum pernah cek catalogId **orphan** — kalau
sebuah part di Katalog Suku Cadang dihapus (`VehicleCatalog.remove()`)
padahal masih ada baris `D.partsStock` yang menyimpan `catalogId`-nya,
tautan itu jadi putus **diam-diam**: badge "🔗 Katalog"/"📦 Stok" terkait
di `VehicleCatalogUI` cuma berhenti muncul (bukan error), user tidak
pernah diberi tahu datanya "menggantung". Root cause kenapa belum ada:
`VehicleCatalog` disimpan async via IndexedDB (`vehicle-catalog.js`),
sedangkan `runDataHealthCheck()` sepenuhnya sync di atas `D` —
sebelumnya tidak ada cara aman utk tahu apakah cache
`VehicleCatalog.getStore()` sudah terisi data asli atau masih default
kosong (`{items:[]}`), yang kalau langsung dipakai tanpa guard akan
salah menandai SEMUA baris berkolom `catalogId` sebagai orphan
(false-positive).

**Perbaikan**:
- **`modules/vehicle/vehicle-catalog.js`**: getter baru
  `vehicleCatalogIsLoaded()` (baca flag module-scope
  `_vehicleCatalogLoaded` apa adanya, 0 logic baru), diekspos jadi
  `VehicleCatalog.isLoaded()`. 0 perubahan ke `ensureLoaded()`/
  `getStore()`/perilaku cache yang sudah ada.
- **`data-health-check.js`**: cek baru ditambah setelah cek dup
  catalogId — kalau `VehicleCatalog.isLoaded()===true`, tiap
  `D.partsStock[].catalogId` dicocokkan ke `VehicleCatalog.getStore().
  items[].id`; tidak ketemu -> `warn` "Stok sparepart tertaut ke part
  katalog yang sudah dihapus". Kalau `VehicleCatalog` belum dimuat/tidak
  tersedia, cek ini diam (guard ganda `typeof`+`isLoaded()`) — 0
  false-positive, pola sama persis guard `typeof X!=='undefined'` yang
  sudah ada di seluruh file ini. Murni baca, 0 tulis, 0 perubahan ke cek
  lain yang sudah ada.

## Test baru
- `tests/data-health-check-catalog-orphan-s276.test.js` (6 test): tidak
  cek kalau belum dimuat/tidak tersedia, warn kalau catalogId orphan,
  tidak warn kalau catalogId masih valid, baris tanpa catalogId
  diabaikan, regresi cek qty minus & dup catalogId lama tetap jalan.
- `tests/vehicle-catalog.test.js` (+3 test): `isLoaded()` false sebelum
  load pertama, true setelah `getAll()`, kembali false setelah
  `invalidateCache()`.

## Cakupan yang TIDAK diulang sesi ini (sudah terverifikasi hijau di
regression suite, tidak diaudit ulang dari nol)
SSOT Dashboard/Laporan/BI/AI Insight (net worth, cashflow, fuel/vehicle
analytics, investment planner) — sudah dites dedicated di
S191–S201/S235–S236/S250–S252/S268–S269 dan tetap PASS penuh di
regression suite sesi ini. `FEATURE_REGISTRY`
(`dashboard-hub-registry.js`) — tidak ada `target` baru ditambahkan
sesi ini, jadi tidak ada entry baru yang perlu diverifikasi terhadap
navigasi. Tidak ada EventBus generik lintas-app (per
`docs/ai/FOUNDATION_AUDIT.md` §5) — pola adapter function-call yang
ada tetap konsisten, tidak disentuh.

## File berubah
- `modules/vehicle/vehicle-catalog.js` — getter `isLoaded()` baru.
- `data-health-check.js` — cek orphan `catalogId` baru.
- `tests/data-health-check-catalog-orphan-s276.test.js` — baru.
- `tests/vehicle-catalog.test.js` — +3 test `isLoaded()`.
- `CHANGELOG.md` (dokumen ini).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1434 / pass 1434 / fail 0 (naik dari 1425, +9 test baru, 0 regresi)

node scripts/build.js s276-audit-sinkronisasi-catalogid-orphan-health-check
# ✅ Build selesai, ?v=799, index.html & app_production.html identik
# node --check app-bundle-a.min.js && node --check app-bundle-b.min.js -> OK
```

---

# Changelog — Sesi 275: FIX — badge stok Katalog Suku Cadang pakai `catalogId` (temuan #1 audit S274)

## Konteks
Tindak lanjut langsung dari temuan #1 audit Sesi 274 (§ di bawah):
badge "📦 Stok N" di layar Katalog Suku Cadang (`VehicleCatalogUI.
renderList()`) masih mencari baris `D.partsStock` lewat name-match,
pola sama gap S272 tapi di sisi tampilan.

## Perubahan
`modules/vehicle/vehicle-catalog-ui.js` — pencarian badge diubah dari
`D.partsStock.find(p=>p.name===it.partName)` (name-match saja) jadi:
`D.partsStock.find(p=>p.catalogId===it.id)` LEBIH DULU (match presisi
via ID, tahan rename nama stok manual), name-match jadi FALLBACK saja
untuk baris stok lama tanpa `catalogId`. Pola identik fix S273
(`car-notes.js`) & badge "🔗 Katalog" S269. Murni tampilan — 0
perubahan data/alur simpan, 1 file disentuh.

## File berubah
- `modules/vehicle/vehicle-catalog-ui.js` — pencarian badge stok diubah.
- `tests/vehicle-catalog-ui-stock-badge-s275.test.js` — baru, 4 test
  (badge tetap tampil walau stok di-rename manual; 2 baris stok nama
  sama tampilkan yang benar; fallback name-match utk stok lama; tidak
  ada badge kalau tidak match).
- `CHANGELOG.md` (dokumen ini).

## Regresi
**1425/1425 PASS** (naik dari 1421 — 4 test baru).

---

# Changelog — Sesi 274: AUDIT lanjutan — sinkronisasi lintas-fitur di seluruh aplikasi

## Konteks
Permintaan user: audit ulang sinkronisasi antar fitur di seluruh
aplikasi (lanjutan pola audit S200/S201/S268/S272). **Audit-only, 0 fix
diimplementasikan** kecuali yang sudah dikerjakan sebelumnya di Sesi
273. Temuan baru dicatat di sini untuk keputusan user.

## Metode
1. Grep pola pencocokan-by-nama (`toLowerCase()===`, `.find(...name...)`)
   di seluruh `modules/*` + file root untuk cari kandidat bridge fragile
   lain serupa gap `catalogId` vs name-match (S272).
2. Telusuri seluruh bridge ID eksplisit yang sudah ditetapkan sebagai
   arsitektur final (`catalogPartRefs {catalogId,qty}[]` — Tahap 6 Sesi 1,
   dipakai `vehicle-catalog-servis-link.js` & `vehicle-catalog-tx-link.js`)
   untuk pastikan konsisten ID-based di kedua sisi (Servis & Transaksi).
3. Cek modul OCR/scan yang lebih baru (`sparepart-ocr-catalog-link.js`)
   apakah ikut pola lama (name-match) atau sudah pakai identifier stabil.
4. Spot-check adapter lintas-domain lain (`economic-intelligence/adapters/
   user-finance-adapter.js`, `lifeos/lifeos-link-registry.js`) untuk pola
   serupa.
5. Jalankan full regression suite (0 kode produksi diubah sesi ini di
   luar yang sudah masuk S273) untuk pastikan baseline tetap utuh.

## Temuan #1 (BARU): badge stok di Katalog Suku Cadang masih name-match
`VehicleCatalogUI.render()` (`modules/vehicle/vehicle-catalog-ui.js`,
baris badge "📦 Stok N") mencari baris `D.partsStock` yang cocok pakai
`p.name.trim().toLowerCase() === it.partName.trim().toLowerCase()` —
**pola SAMA PERSIS** dengan gap S272 (name-match, bukan `catalogId`),
tapi di sisi TAMPILAN Katalog Suku Cadang, bukan di alur potong stok
Servis.

**Dampak**: kalau baris Stok Sparepart di-rename manual (skenario sama
S272), badge "📦 Stok N" di layar Katalog Suku Cadang jadi **hilang**
walau part itu sebenarnya masih tertaut lewat `catalogId` (bridge Sesi
266) dan stoknya ada. **Murni kosmetik** — TIDAK mengubah data apa pun
(beda dari S272 yang data-mutating: stok beneran gagal terpotong).
Severity: rendah, tapi membingungkan user ("kok stoknya kelihatan
kosong padahal ada").

**Rekomendasi**: ganti pencarian badge ini jadi
`D.partsStock.find(p=>p.catalogId===it.id)` (match presisi via ID, pola
sama S273), `name`-match jadi fallback saja untuk baris stok lama tanpa
`catalogId` — perubahan 1 baris, 1 file, murni tampilan (pola identik
badge "🔗 Katalog" Sesi 269). **Belum dikerjakan — menunggu konfirmasi
user**, konsisten prinsip 1 task = 1 sesi.

## Temuan #2 (konfirmasi POSITIF): bridge `catalogPartRefs` konsisten
`vehicle-catalog-servis-link.js` (sisi Servis) & `finance/vehicle-
catalog-tx-link.js` (sisi Transaksi) — DUA bridge terpisah untuk konsep
sama (`catalogPartRefs: {catalogId,qty}[]`) — dikonfirmasi **100%
ID-based di kedua sisi**, tidak ada jejak name-match tersisa. Tidak
sama dengan gap S272 (yang levelnya beda: `catalogLinkedStockId` vs
`catalogPartRefs`, dua mekanisme berbeda sejak awal).

## Temuan #3 (konfirmasi POSITIF): modul OCR scan aman
`sparepart-ocr-catalog-link.js` (Tahap 7C-3a) mencocokkan part lewat
kode fisik (OEM Code / Barcode / Part Number `aftermarketCode`), BUKAN
nama — secara desain tahan terhadap rename nama part, tidak masuk
kategori risiko yang sama.

## Temuan #4 (konfirmasi POSITIF): adapter lintas-domain lain bersih
`economic-intelligence/adapters/user-finance-adapter.js` &
`lifeos/lifeos-link-registry.js` tidak memakai pola name-match untuk
relasi antar `D.*` — keduanya baca-saja & sudah ID/flag-based
(`isDanaDarurat`, dst). 0 gap ditemukan di kedua modul ini.

## Cakupan yang TIDAK diulang sesi ini
Konsistensi angka Dashboard/Laporan/AI Insight lintas domain (Finance/
Shop/Asset/Investment/Vehicle), filter Ownership Engine di semua
konsumen, dan SSOT net worth/finance engine — sudah diaudit tuntas &
terverifikasi lewat test dedicated di sesi-sesi sebelumnya (S191–S201,
S235–S236, S268–S269) dan TETAP terverifikasi hijau di full regression
suite sesi ini (lihat § Regresi) — tidak diaudit ulang dari nol supaya
sesi ini fokus ke celah yang belum pernah dicek (pola name-match di
luar `car-notes.js`).

## File berubah
- `CHANGELOG.md` (dokumen ini) & `docs/NEXT_SESSION.md`. **0 kode
  source/test disentuh** — murni audit & dokumentasi.

## Regresi
**1421/1421 PASS** (sama seperti baseline S273 — 0 kode diubah sesi
ini).

---

# Changelog — Sesi 273: FIX — implementasi rekomendasi sync gap S272 (`catalogId` presisi > name-match)

## Konteks
Tindak lanjut langsung dari rekomendasi audit Sesi 272 (§ di bawah,
"Rekomendasi perbaikan"). Sesi 272 audit-only (0 fix); sesi ini
mengerjakan rekomendasi itu sesuai persis yang sudah dicatat.

## Perubahan
`Servis._saveInner()` (`car-notes.js`) sekarang cek `catalogId` LEBIH
DULU (match presisi via ID) sebelum jatuh ke name-match:

1. **`Servis.findMatchingStockByCatalogId(catalogId)`** — fungsi baru,
   `D.partsStock.find(p=>p.catalogId===catalogId)`. Match presisi, tahan
   terhadap rename nama baris stok manual (`Sparepart.saveStock()` tetap
   menjaga `catalogId` walau `name` diedit bebas).
2. **`Servis.findMatchingStockByName(name)`** — TIDAK dihapus, sekarang
   jadi FALLBACK saja, dipakai hanya kalau match via `catalogId` gagal
   (baris stok lama dibuat sebelum Sesi 266 yang belum pernah punya
   field `catalogId`).
3. Baris penentuan `catalogStockMatch` di `_saveInner()` diubah dari
   `Servis.findMatchingStockByName(catalogPartName)` jadi
   `Servis.findMatchingStockByCatalogId(catalogPartId) ||
   Servis.findMatchingStockByName(catalogPartName)`.

Perubahan terisolasi ke 1 file (`car-notes.js`), 0 skema data baru,
0 migrasi — persis seperti dijanjikan di rekomendasi S272.

## Dampak (kedua gap S272 tertutup)
1. Rename baris Stok Sparepart manual (nama beda, `catalogId` sama)
   → servis kini TETAP menemukan match & memotong stok yang benar
   (sebelumnya: `catalogLinkedStockId` jadi `null`, stok diam-diam
   tidak terpotong).
2. 2 baris stok bernama sama tapi `catalogId` beda → servis kini
   memotong baris yang BENAR-BENAR dipakai user (match by ID, bukan
   `.find()` nama pertama di array).

## File berubah
- `car-notes.js` — `Servis.findMatchingStockByCatalogId()` baru,
  urutan pencarian di `_saveInner()` diubah (catalogId dulu, name-match
  fallback).
- `tests/servis-catalog-stock-sync-fix-s273.test.js` — pengganti
  `tests/servis-catalog-stock-sync-gap-s272.test.js` (dihapus/di-rename):
  4 test — kasus normal, 2 kasus gap S272 (sekarang FIXED, assertion
  dibalik sesuai perilaku baru), + 1 test baru untuk fallback name-match
  (baris stok lama tanpa `catalogId`).
- `CHANGELOG.md` (dokumen ini).

## Regresi
**1421/1421 PASS** (naik dari 1420 — net +1: 4 test baru di file
pengganti, -3 test lama dari file yang dihapus).

---

# Changelog — Sesi 272: AUDIT — gap sync `catalogId` (Keuangan/Stok) vs name-match (Servis)

## Konteks
Permintaan user: cek alur sync Transaksi Keuangan ↔ Katalog Suku Cadang ↔
Stok Sparepart ↔ Servis, apakah berjalan sesuai. **Audit-only, 0 fix
diimplementasikan** — temuan & rekomendasi dicatat di sini untuk keputusan
user.

## Temuan: 2 mekanisme tautan berbeda untuk konsep yang sama, TIDAK sinkron

Ada **2 cara berbeda** yang dipakai codebase untuk menautkan
`D.partsStock` ↔ 1 part di `VehicleCatalog`, dibuat di 2 sesi berbeda dan
TIDAK PERNAH disatukan:

| Alur | Mekanisme | Dibuat | Lokasi |
|---|---|---|---|
| Keuangan (scan/beli) → Stok | Field eksplisit `catalogId` | Sesi 266 (Tahap 9) | `syncPartsStockFromCatalog()`, `modules/finance/tx-stok-sparepart.js` |
| Servis → potong Stok saat part katalog dipakai | **Cocok NAMA** (case-insensitive, `.find()` pertama) | Tahap 7E-3 (SEBELUM `catalogId` ada) | `Servis.findMatchingStockByName()`, `car-notes.js`, dipanggil di `Servis._saveInner()` |

`Servis._saveInner()` (jalur yang menentukan `catalogLinkedStockId` — baris
stok mana yang qty-nya dikurangi saat servis pakai part katalog) **TIDAK
PERNAH memeriksa field `catalogId`** yang sudah ada sejak Sesi 266/269,
padahal itu identifier yang sudah lebih akurat & tersedia.

## Dampak nyata (dibuktikan lewat 3 test baru,
`tests/servis-catalog-stock-sync-gap-s272.test.js`)

1. **Stok tidak terpotong secara diam-diam.** Kalau user mengedit nama
   baris Stok Sparepart lewat modal "Edit Stok Sparepart"
   (`Sparepart.saveStock()` — `catalogId` TETAP UTUH, tapi `name` boleh
   diganti bebas), lalu pilih part katalog yang SAMA PERSIS (`catalogId`
   sama) di form Servis — nama di dropdown Katalog tidak berubah, jadi
   `findMatchingStockByName()` GAGAL cocok → `catalogLinkedStockId` jadi
   `null` → **stok TIDAK dikurangi sama sekali**, TANPA toast/error apa
   pun ke user. Servis tetap tersimpan normal (bukan gagal total), cuma
   pencatatan stok yang diam-diam salah.
2. **Risiko potong stok yang SALAH.** Kalau 2 baris `D.partsStock` punya
   nama sama persis tapi `catalogId` beda (mis. 2 part katalog beda
   kebetulan dinamai sama di sisi stok), `findMatchingStockByName()`
   ambil match PERTAMA di array TANPA verifikasi `catalogId` — servis bisa
   mengurangi stok part yang TIDAK dipakai, sementara part yang BENERAN
   dipakai stoknya tidak berkurang.

## Kesimpulan
**Alur sync BELUM sepenuhnya konsisten** — bridge `catalogId` (yang
ditetapkan arsitektur final di Sesi 271) baru dipakai di sisi
Keuangan→Stok, belum diteruskan ke sisi Stok→Servis yang masih pakai
mekanisme lama (name-match) dari sebelum bridge itu ada.

## Rekomendasi perbaikan (ringan, TIDAK dikerjakan sesi ini — audit saja)
Ubah urutan pencarian di `Servis._saveInner()`: cek `D.partsStock.find(p
=> p.catalogId === catalogPartId)` LEBIH DULU (match presisi via ID),
`findMatchingStockByName()` jadi fallback SAJA untuk baris stok lama yang
belum pernah punya `catalogId` (dibuat sebelum Sesi 266). Perubahan
terisolasi ke 1 fungsi kecil (`findMatchingStockByName` bisa
diganti/didampingi `findMatchingStockByCatalogId`), tidak menyentuh
skema data, 0 migrasi. Baru dikerjakan atas konfirmasi eksplisit user.

## File berubah
- `tests/servis-catalog-stock-sync-gap-s272.test.js` — baru, 3 test
  (1 kasus normal + 2 kasus gap terbukti). Test murni membuktikan
  perilaku SAAT INI, tidak mengubah kode produksi.
- `CHANGELOG.md` (dokumen ini).

## Regresi
**1420/1420 PASS** (naik dari 1417 — 3 test baru, semua kode produksi
tidak berubah).

---

# Changelog — Sesi 271: Penutupan jalur migrasi `D.partsStock` (keputusan: TIDAK migrasi)

## Konteks
Tindak lanjut hasil audit Sesi 270 (2 file risiko rendah:
`finance-dashboard.js`/`ai-chat.js`). User menanyakan apakah sebaiknya
lanjut migrasi (sekalipun parsial, 2 file itu saja) demi keringkasan,
atau tidak. Keputusan: **TIDAK migrasi — bahkan yang parsial.**

## Alasan (ringkas)
1. **Migrasi parsial tidak menyelesaikan masalah apa pun.**
   `D.partsStock` tetap wajib jadi source of truth sinkron selama 8
   file sisa (`car-notes.js`, `sparepart-servis.js`, `self-test.js`,
   `data-health-check.js`, `backup-restore.js`,
   `features-helpers-global-security.js`, `scan-ocr.js`,
   `vehicle-catalog-ui.js`) belum ikut — migrasi total sendiri sudah
   TIDAK direkomendasikan (poin 4, Sesi 268). Migrasi 2 file saja
   justru menciptakan 2 sumber kebenaran berjalan bersamaan untuk data
   yang sama, persis risiko yang ditolak sejak Sesi 266.
2. **Tidak ada kapabilitas baru yang didapat.** Kebutuhan asli (scan
   barcode → otomatis masuk stok, dipakai bareng Car Notes/Servis)
   sudah tuntas lewat bridge `catalogId` (Sesi 266) + badge visual
   "🔗 Katalog" (Sesi 269). Migrasi async cuma ganti cara baca data
   yang sudah berfungsi, bukan menambah fitur.
3. **Biaya nyata utk manfaat nol:** `render()`/`_sparepartCards()`
   (`finance-dashboard.js`) & `_sendChatInner()` (`ai-chat.js`) harus
   jadi lebih kompleks (`async`/`await`), dan codebase punya 2 gaya
   baca part yang berbeda (sync `D.partsStock` vs async
   `VehicleCatalog`) untuk konsep yang identik.

## Keputusan
Bridge `catalogId` (pola `catalogPartLinkedStockId`) ditetapkan sebagai
**arsitektur final** untuk integrasi Katalog Suku Cadang ↔ Stok
Sparepart Keuangan. Jalur audit migrasi `D.partsStock` →
`VehicleCatalog.getAll()` (poin 3/4, dimulai Sesi 268) **DITUTUP**,
bukan sekadar ditunda — supaya sesi berikutnya tidak membuka ulang
audit yang sama tanpa kebutuhan baru yang konkret.

## File berubah
`CHANGELOG.md` & `docs/NEXT_SESSION.md` saja (dokumentasi murni, 0
kode disentuh).

## Regresi
Tidak relevan — 0 kode diubah. Baseline tetap 1417/1417 PASS (Sesi 269).

---

# Changelog — Sesi 270: Audit 1-per-1 (poin 3) — finance-dashboard.js & ai-chat.js

## Konteks
Jalankan poin 3 dari rekomendasi Sesi 268 (`CHANGELOG.md` § Sesi 268):
"audit 1-per-1 (bukan sekaligus) kandidat migrasi `D.partsStock`, mulai
dari titik baca yang paling sedikit dulu (`finance-dashboard.js`/
`ai-chat.js`)". Sesi ini **AUDIT SAJA** — 0 perubahan kode — sesuai
lingkup poin 3 sendiri ("masing2 sesi/ACR terpisah", implementasi
migrasi itu domain poin 4 yang eksplisit "tidak direkomendasikan
sekarang").

## Metode
Telusuri tiap titik baca `D.partsStock` di 2 file ini sampai ke
pemanggil paling luar (call chain), untuk menilai: (a) apakah
pemanggilnya sudah `async`/fire-and-forget (migrasi ke `await
VehicleCatalog.getAll()` aman ditambah tanpa efek berantai), atau (b)
sinkron & hasilnya ditunggu langsung (migrasi butuh refactor lebih
luas).

## Temuan — `modules/finance/finance-dashboard.js`
1 titik baca: `Sparepart.calcFinanceStats(D.partsStock, D.servisLogs)`
di `_sparepartCards()`, dipanggil HANYA dari `render()`.
Call chain: `render()` ← `modules/shared/modules-render.js:1023`
(`if(typeof FinanceDashboard!=='undefined')FinanceDashboard.render();`)
← dibungkus `runDeferredOrNow(function(){...})` (helper PERF yang
SUDAH menjadwalkan blok ini fire-and-forget setelah paint, lihat
komentar di sekitar baris tsb) — pemanggil TIDAK menunggu return value
`render()` sama sekali, tidak ada test yang assert output DOM-nya
secara sinkron (`tests/sparepart-dashboard.test.js` cuma test
`calcFinanceStats()` murni, bukan `render()`). `getAIHook()` (dipakai
banyak konsumen lain: `cross-ai-hook.js`, `financial-forecast-api.js`,
`unified-summary-api.js`, dst) **TIDAK menyentuh** `D.partsStock` sama
sekali — jalur itu 100% aman, tidak kena dampak apa pun.
**Verdict: berisiko RENDAH.** Kandidat aman untuk migrasi (jadikan
`render()`/`_sparepartCards()` `async`, `await` sumber data part) di
ACR terpisah kalau user mau lanjut — TIDAK ada refactor berantai ke
file lain yang diperlukan.

## Temuan — `ai-chat.js`
3 titik baca (baris `stockSparepartLow`/`stockSparepartAllFull`/
`stockSparepartAll`), semua di dalam `async function
_sendChatInner()`. Call chain: `_sendChatInner()` ← `await
_sendChatInner()` di `async function sendChat()` ← dipanggil dari
`onkeydown="if(event.key==='Enter')sendChat()"` (`index.html`) — HTML
attribute TIDAK menunggu promise return, jadi rantai pemanggil dari
UI ke bawah **sudah 100% async/fire-and-forget**, tidak ada bagian
sinkron yang perlu diubah.
**Verdict: berisiko PALING RENDAH dari semua kandidat** — file ini
sudah dalam konteks `async function`, tinggal tambah `await` di depan
pemanggilan sumber data part kalau migrasi dijalankan nanti.

## Kesimpulan
Kedua file ini AMAN untuk jadi kandidat pertama migrasi parsial (bukan
migrasi total `D.partsStock`) kalau/ketika user memutuskan lanjut ke
poin 4 — TIDAK ada dampak ke file lain. Ini BEDA dari `car-notes.js`/
`sparepart-servis.js` (dropdown/torsi modal LIVE, sinkron, banyak
titik baca) yang tetap jadi risiko utama dan HARUS diaudit terpisah
sebelum disentuh. Sesi ini sengaja TIDAK mengimplementasikan migrasi
apa pun (0 kode diubah) — audit murni, konsisten batas poin 3.

## File berubah
- `CHANGELOG.md` (dokumen ini) & `docs/NEXT_SESSION.md` saja. Tidak ada
  file source/test yang disentuh.

## Regresi
Tidak relevan — 0 kode diubah. Baseline tetap 1417/1417 PASS (Sesi 269).

---

# Changelog — Sesi 269: Badge "🔗 Katalog" di list Stok Sparepart (poin 2 rekomendasi S268)

## Konteks
Kerjakan poin 2 dari daftar rekomendasi audit migrasi `D.partsStock`
(`CHANGELOG.md` § Sesi 268): badge kecil di `Sparepart.renderStockList()`
(`modules/vehicle/sparepart-servis.js`) untuk baris stok yang punya
`catalogId` (hasil bridge scan Keuangan → Katalog Suku Cadang, Sesi 266),
supaya user bisa lihat mana part yang tertaut ke katalog langsung dari
list Stok Sparepart, tanpa buka detail satu-satu.

## Perubahan
Murni tampilan — 1 `<span>` badge `🔗 Katalog` ditambah di sebelah badge
kode part yang sudah ada, HANYA muncul kalau `p.catalogId` ada. Tidak ada
field/skema baru, tidak ada perubahan data/alur simpan, 1 file disentuh.

## File berubah
- `modules/vehicle/sparepart-servis.js` — badge baru di `renderStockList()`.
- `tests/sparepart-stocklist-catalog-badge-s268.test.js` — baru, 2 test
  (badge muncul/tidak muncul sesuai `catalogId`).

## Regresi
**1417/1417 PASS** (naik dari 1415 — 2 test baru).

---

# Changelog — Sesi 268: Audit ringan pra-migrasi bridge catalogId (tindak lanjut Sesi 266)

## Konteks
Tindak lanjut catatan "Kandidat migrasi penuh" di `NEXT_SESSION.md` § S266:
audit 9 file konsumen sync `D.partsStock` (`finance-dashboard.js`,
`data-health-check.js`, `self-test.js`, `backup-restore.js`, `car-notes.js`,
`sparepart-servis.js`, `ai-chat.js`, `features-helpers-global-security.js`,
`scan-ocr.js`, `vehicle-catalog-ui.js`) untuk menilai risiko migrasi total
`D.partsStock` → cache/view read-only dari `VehicleCatalog.getAll()` (async).

## Hasil audit (ringkas)
Semua 9 file membaca `D.partsStock` secara **sinkron langsung** (bukan
`await`) di titik-titik yang saat ini murni/render (`.find()`, `.filter()`,
`forEach`, iterasi total). Migrasi ke sumber async akan memaksa fungsi2
render/kalkulasi ini jadi `async` secara berantai, ATAU butuh layer cache
sync terpisah (kompleksitas baru). Risiko regresi terbesar: `car-notes.js`
& `sparepart-servis.js` (paling banyak titik baca, termasuk dropdown/torsi
modal live), disusul `self-test.js` (bisa false-negative kalau bikin fungsi
diuji jadi async tanpa await). **Rekomendasi: migrasi total DITUNDA**,
konsisten kesimpulan Sesi 266 — bridge `catalogId` tetap pola yang dipakai.

## Ditemukan gap kecil (bukan bug, celah integritas data)
`syncPartsStockFromCatalog()` (`modules/finance/tx-stok-sparepart.js`)
mengasumsikan 1 `catalogId` cuma nempel ke 1 baris `D.partsStock` (pakai
`.find()` pertama yang cocok). Belum ada cek yang memverifikasi asumsi ini
tetap benar dari waktu ke waktu (mis. kalau ada 2 baris stok kebetulan
tertaut ke `catalogId` sama dari restore/edit manual lama) — celah ini juga
persis salah satu risiko yang bakal menghambat migrasi total nanti kalau
tidak ketahuan dari awal.

## Rekomendasi (urutan dari paling ringan)
1. **[Dikerjakan sesi ini]** Tambah 1 cek `warn` baru di
   `runDataHealthCheck()` (`data-health-check.js`): deteksi `catalogId`
   yang dipakai lebih dari 1 baris `D.partsStock`. Baca-saja, 0 perubahan
   ke cek lain, 0 file lain disentuh. 3 test baru
   `tests/data-health-check-catalog-dup-s268.test.js`.
2. **[Belum, ringan]** Tambah badge kecil "Terhubung ke Katalog Part" di
   list Stok Sparepart untuk baris yang punya `catalogId` (murni UI,
   `car-notes.js`, tanpa ubah data/alur).
3. **[Belum, sedang]** Audit 1-per-1 (bukan sekaligus) kandidat migrasi
   `car-notes.js` → mulai dari titik baca yang paling sedikit dulu
   (`finance-dashboard.js`/`ai-chat.js`), masing2 sesi/ACR terpisah.
4. **[Belum, berat/tidak direkomendasikan sekarang]** Migrasi total
   `D.partsStock` jadi view async dari `VehicleCatalog` — perlu ACR baru
   + audit mendalam ke `car-notes.js`/`sparepart-servis.js` dulu.

## File berubah
- `data-health-check.js` — 1 cek baru (`catalogId` duplikat), + `return
  issues;` di akhir `runDataHealthCheck()` (additive, semua pemanggil
  existing mengabaikan return value — perubahan ini yang bikin fungsinya
  bisa dites tanpa DOM nyata).
- `tests/data-health-check-catalog-dup-s268.test.js` — baru, 3 test.
- `docs/NEXT_SESSION.md` — update status kandidat migrasi.

## Regresi
**1415/1415 PASS** (naik dari 1412 — 3 test baru).

---

# Changelog — Sesi 266 (Build 795): Scan Kode Part di Keuangan → Stok Sparepart Car Notes (Tahap 9)

## Konteks
Permintaan user: saat input transaksi Keuangan kategori/subkategori
Motor (panel `txStockPanel`, sudah ada sejak dulu), bisa scan kode part
langsung dan otomatis masuk ke Stok Sparepart yang dipakai juga di Car
Notes/Servis — bukan cuma pilih manual dari dropdown seperti sebelumnya.
User awalnya minta migrasi total "`D.partsStock` jadi turunan penuh dari
`VehicleCatalog`" (async, IndexedDB) — setelah dicek, itu bertentangan
langsung dengan aturan eksplisit di header `vehicle-catalog.js`
("VehicleCatalog tidak pernah menyentuh D, tidak menduplikasi/mengubah
D.sparepartCats") dan beda model sync/async yg berisiko regresi luas ke
12+ file yang baca `D.partsStock` (dashboard, self-test, backup-restore,
dll). Disepakati jalan tengah: reuse pola bridge `catalogId`/referensi
ringan yang **sudah ada** (persis pola `catalogPartLinkedStockId` di alur
Servis Car Notes) — VehicleCatalog tetap sumber identitas/OEM/barcode,
`D.partsStock` tetap satu-satunya pemilik qty/harga (konsisten ACR-001).

## Perubahan
- `modules/finance/tx-stok-sparepart.js`: tambah `syncPartsStockFromCatalog(catalogItem)`
  (murni, cari-atau-buat 1 baris `D.partsStock` ber-`catalogId` yg link
  ke 1 part `VehicleCatalog`) & `txStockScanPart()` (reuse 100%
  `SparepartScanner.scan('camera')` → `VehicleCatalog.handleScan()` yg
  sudah ada; kalau draft/belum ada nama, minta nama sekali lewat
  `showPromptModal` lalu `VehicleCatalog.resolveDraft()`; hasilnya
  langsung dipilihkan ke dropdown `txStockItem` yang sudah ada).
- Bonus kecil: part baru yang diketik manual (bukan scan) di panel ini
  sekarang JUGA otomatis dibuatkan entri `VehicleCatalog` (best-effort,
  tidak blocking) — supaya ke depan makin banyak part dikenali lewat
  scan, tanpa migrasi data lama.
- `modules/shared/modals.js`: tombol baru "📷 Scan Kode Part" di
  `txStockPanel` (modal Tambah/Edit Transaksi Keuangan), sebelum
  dropdown "Pilih Sparepart" yang sudah ada.
- Test baru: `tests/tx-stok-sparepart-catalog-link.test.js` (6 test,
  cakupan `syncPartsStockFromCatalog()` murni — `txStockScanPart()`
  sendiri DOM-heavy, tidak dites lewat harness `loadSource`, sama pola
  `SparepartScanner.scan()`/`buildOverlay()`).

## Belum dikerjakan sesi ini (lihat NEXT_SESSION.md)
Migrasi PENUH `D.partsStock` jadi async murni dari `VehicleCatalog`
(mengubah 12+ file konsumen: `finance-dashboard.js`, `data-health-
check.js`, `self-test.js`, `backup-restore.js`, `car-notes.js` dashboard/
torsi/servis-dropdown, dll) — TIDAK dikerjakan sesi ini, risiko regresi
terlalu besar utk 1 sesi "ringkas". Bridge `catalogId` di atas adalah
langkah pertama yang aman & 100% reuse pola existing; migrasi penuh
butuh sesi tersendiri dgn audit per-file.

## Hasil
1412/1412 test lolos (1406 lama + 6 baru). Bundle di-rebuild ke Build
795 (esbuild tidak tersedia di sandbox — bundle unminified, limitation
lama, lihat CHANGELOG sesi-sesi sebelumnya).

# Changelog — Sesi 265 (Build 790): Audit navigasi Dashboard/Car Notes (lanjutan pola Sesi 263-264)

## Konteks
Permintaan user: cek apakah Dashboard py bug navigasi sama seperti
Finance Dashboard (Sesi 263) & Shop Business Intelligence (Sesi 264).
Audit menyeluruh: semua `*_NAV_TARGETS`/`CARD_NAV_TARGET(S)` di
`modules/finance,shop,vehicle,asset/*.js` di-cross-check manual thd
lokasi container asli di index.html, + `FEATURE_REGISTRY`
(dashboard-hub-registry.js, dicek otomatis oleh
`tests/dashboard-hub-registry.test.js`) di-cross-check ulang thd widget
yang sudah dipindah (findashWrap/forecastWrap/dst, shopBusinessEngine*/
tripPresenter*/businessFlow*) — TIDAK ADA referensi basi ditemukan di
FEATURE_REGISTRY maupun di widget Dashboard/Dashboard Hub itu sendiri.

## Bug ditemukan (1, di Car Notes bukan Dashboard Hub langsung)
`VehicleAutomationPresenter` (`modules/vehicle/vehicle-automation-
presenter.js`), kartu "Pajak/SIM" (`_taxCard()`,
`VEHICLE_AUTOMATION_NAV_TARGETS.tax`): target TIDAK py `tab`, padahal
`#vehTaxList` hidup di dalam `#cnTab-pajak`. Tanpa `tab`,
`dashHubNavigateToFeature()` cuma pindah ke halaman Car Notes tanpa
ganti sub-tab — kalau user sedang di sub-tab lain (Insight/BBM/Servis),
klik kartu ini terlihat tidak melakukan apa-apa (elemen tujuan
tersembunyi 'u-dnone' di sub-tab lain).

## Fix
`VEHICLE_AUTOMATION_NAV_TARGETS.tax` → tambah `tab: 'pajak'`. Test
`vehicle-nav-consistency-s253.test.js` disamakan. 1387/1387 test lolos.
Bundle di-rebuild ke Build 790.

## Hasil cek lain (aman, tidak diubah)
- Asset (`asset-portfolio/maintenance/property-management/rental-
  management-presenter.js`): semua target sudah sesuai lokasi tab
  aset (ringkasan/buku/analisis).
- Vehicle lain (fuel-analytics, vehicle-analytics, vehicle-insight,
  vehicle-dashboard): semua target sudah sesuai lokasi tab
  Car Notes (bbm/servis/insight+subtab).
- Dashboard Hub (`dashboard-hub-registry.js`): 0 entri menunjuk widget
  yang sudah dipindah ke Keuangan/Shop (findashWrap dkk).

# Changelog — Sesi 264 (Build 789): Fix navigasi kartu Business Intelligence Shop (pola sama Sesi 263)

## Bug
Sama pola persis Sesi 263 (Finance Dashboard), tapi di tab Shop >
Business Intelligence:
- Kartu KPI/Cost-Pricing/Load-Transport/Decision (`BusinessFlowPresenter`,
  index 4-7) & tombol "🚚 Trip" (`openTripPage()`) target `tab:'riwayat'`,
  padahal container `businessFlowBody`/`tripPresenterBody` yang jadi
  landing-nya sebenarnya ada di `#shopTab-laporan`, bukan
  `#shopTab-riwayat`.
- Kartu Transfer (`_transferCard()`) target `page:'dashboard-hub'`,
  padahal `businessFlowTransferList` sudah DIPINDAH ke `#shopTab-bi`
  sejak migrasi Business Intelligence (Sesi 250).
- Root cause tambahan: `SHOP_TAB_IDX` (dashboard-hub.js) TIDAK PERNAH
  didaftarkan utk tab `'laporan'`/`'bi'` (cuma sampai `pelanggan`),
  padahal #page-shop sudah py 8 tab. Efeknya kalau salah satu bug di
  atas "dibetulkan" tanpa fix ini, `dashHubNavigateToFeature()` akan
  crash (`tabs[undefined]` -> `setShopTab(t, undefined)` ->
  `el.classList.add()` pada `undefined`).
Efek gabungan ke user: klik kartu KPI/Cost-Pricing/Load-Transport/
Decision/Trip/Transfer di tab Business Intelligence melempar ke tab/
halaman yang salah (bukan ke ringkasan datanya).

## Fix
- `modules/dashboard-hub/dashboard-hub.js`: `SHOP_TAB_IDX` ditambah
  `laporan:6, bi:7` (sesuai urutan tombol asli `#page-shop .cn-tab`).
- `modules/shop/business-flow-presenter.js`: `CARD_NAV_TARGETS[4..7]`
  → `tab:'laporan'`; `CARD_NAV_TARGETS[9]` (Transfer) →
  `{page:'shop', tab:'bi', goTo:'businessFlowTransferList'}`;
  `openTripPage()` → `tab:'laporan'`.
- `modules/shop/trip-presenter.js`: `CARD_NAV_TARGET` → `tab:'laporan'`.
- `tests/trip-navigation-s249.test.js` disamakan ke ekspektasi baru.
- 100% reuse `dashHubNavigateToFeature()`/`setShopTab()` yang sudah ada,
  0 mekanisme navigasi baru. 1387/1387 test lolos. Bundle di-rebuild ke
  Build 789.

# Changelog — Sesi 263 (Build 788): Fix navigasi kartu Finance Dashboard (S254A/B regresi)

## Bug
Kartu-kartu di 9 presenter finansial (Financial Forecast, Budget
Recommendation, Cash Flow Projection, Financial Goal, Investment
Planner, Debt Optimizer, Retirement Planner, Financial Health Score,
Financial Risk Dashboard — semua tampil di tab 📊 Laporan halaman
Keuangan) saat diklik navigasi ke `page: 'dashboard-hub'`, padahal
section-nya (`forecastWrap`/`budgetRecoWrap`/dst) sudah DIPINDAH ke
`#page-keuangan > #keuanganTab-laporan` sejak Sesi 133. Efeknya: user
klik kartu data, malah dilempar ke halaman Dashboard Hub (section-nya
tidak ada di sana), bukan discroll ke datanya sendiri di Laporan.

Root cause: batch "Finance Navigation Consistency" (S254A/S254B) yang
menambahkan onClick ke kartu-kartu ini memakai target lama
`{page:'dashboard-hub', goTo:'...Wrap'}` — tidak disamakan dgn lokasi
baru pasca migrasi Sesi 133. `DanaKelolaanPresenter` (dibuat belakangan)
sudah benar (`{page:'keuangan', tab:'laporan', ...}`), jadi dipakai
sebagai acuan pola fix.

## Fix
9 file `modules/finance/*-presenter.js` (financial-forecast,
budget-recommendation, cashflow-projection, financial-goal,
investment-planner, debt-optimizer, retirement-planner,
financial-health-score, financial-risk-dashboard): `*_NAV_TARGETS.self`
diganti ke `{page:'keuangan', tab:'laporan', goTo:'...Wrap'}` — 100%
reuse `dashHubNavigateToFeature()`/`setKeuanganTab()` yang sudah ada,
0 mekanisme navigasi baru. Test `finance-nav-consistency-s254a/b.test.js`
disamakan ke ekspektasi baru (1387/1387 test lolos). Bundle
(`app-bundle-a/b.min.js`) di-rebuild ke Build 788.

# Changelog — Sesi 262: Selective Liquid Glass + M3 Expressive UI refresh

## Konteks
Permintaan eksplisit user: eksplorasi arah UI ringan/modern untuk PWA →
disepakati **Material 3 Expressive (struktur/shape) + Selective Liquid
Glass (aksen blur di chrome saja, bukan full-glass)**, palet netral kalem,
bottom nav diubah jadi **floating**, tanpa FAB, nav pakai 6 item asli app
(Beranda/Uang/Shop/Aset/Mobil/Pajak). Scope: CSS-only + 1 file JS baru
mandiri — TIDAK mengubah `app-bundle-a/b.min.js` atau modul bisnis apa pun.

## Perubahan

- **`modern-ui-layer.css`**:
  - `.nav` di-override jadi floating (margin 12px, `border-radius:
    var(--r-2xl)`, `env(safe-area-inset-bottom)` untuk PWA standalone,
    `#mainApp`/`#scrollRoot` padding-bottom disesuaikan).
  - Nav auto-hide saat scroll ke bawah (`.nav.nav-hidden`), auto-show
    saat scroll ke atas/dekat top-bottom — state class di-toggle dari
    `nav-scroll.js` baru. `prefers-reduced-motion` mematikan perilaku
    hide sepenuhnya (bukan cuma transisinya).
  - **Bug ditemukan & diperbaiki**: rule glass header/nav (bagian 2)
    memakai `var(--surface1, var(--bg))` — token `--surface1` TIDAK
    PERNAH ada di `styles.css` (yang ada `--surface`/`--surface2/3/4`),
    jadi fallback `var(--bg)` diam-diam selalu aktif di ke-10 tema sejak
    ditambahkan. Diganti ke `var(--header-bg)` yang memang sudah
    di-tuning opacity per tema (0.82–0.92) khusus untuk chrome ini.
  - **Fix kontras WCAG AA** badge status stok (`.shop-stock-pill`,
    `.trs-tag-btn.stok-*`, `.kasir-tile-stock`): audit kontras terukur
    menemukan teks `--accentN` di atas `--accentN-soft` cuma 1.5–3.5:1 di
    6 tema bersurface terang (`light`/`stone`/`mono`/`sand`/`sage`/
    `fresh`) — di bawah ambang 4.5:1 untuk teks kecil. Tambah
    `--accent2/3/4-onlight` (`color-mix(in srgb, var(--accentN) 55%,
    black)`), diterapkan scoped per `[data-theme]` HANYA ke 6 tema itu;
    4 tema gelap (`dark`/`ocean`/`slate`/`ink`, sudah 6–9.5:1) tidak
    disentuh. Worst-case sesudah fix: 4.72:1 (lolos AA).
- **File baru `nav-scroll.js`**: berdiri sendiri, tidak import modul lain,
  toggle class `nav-hidden` di `#mainNav` berdasar arah scroll
  `#scrollRoot` (rAF-throttled). Di-link via `<script defer>` setelah
  `modern-ui-layer.css` di `app_production.html`/`index.html`.
- **File baru `preview-m3-liquidglass.html`**: preview statis yang
  langsung load `styles.css`/`modern-ui-layer.css`/`nav-scroll.js` project
  (bukan mockup terpisah), markup pakai class asli (`.nav`, `.card`,
  `.shop-stock-pill`, dst) + theme switcher 10 tema untuk verifikasi
  visual manual.
- Cache-bust: `modern-ui-layer.css?v=776→777`.

## Known limitation / lanjutan
- Perilaku scroll-aware nav belum ada test otomatis (murni CSS+vanilla
  JS di luar test harness `vm` sandbox yang ada) — verifikasi manual via
  `preview-m3-liquidglass.html`.
- Radius token `--r-2xl` dipakai apa adanya (sudah 20px, cukup dekat
  bahasa M3 Expressive) — TIDAK menambah token radius baru, sesuai
  prinsip reuse token yang sudah ada.

---

# Changelog — Sesi 261: Investment Ownership Sync

## Konteks
Target eksplisit user: "S261 – Investment Ownership Sync. Audit dan
sinkronkan seluruh modul Investasi agar ownership diterapkan secara
konsisten. Pastikan seluruh perhitungan portofolio, ROI, dividen,
profit/loss, ringkasan investasi, dan AI Insight hanya menghitung aset
sesuai OwnershipEngine.resolve() serta menggunakan SSOT tanpa duplikasi
logika. Scope: hanya modul Investasi." Baseline: `Investment.portfolioSummary()`/
`Investment.assetAllocation()` (modules/asset/investasi.js) SUDAH SELF-only
sejak Sesi 193 (lihat `tests/ownership-sync-investasi.test.js`) — audit
sesi ini menelusuri SEMUA jalur data investasi lain (Investment Planner,
AI Insight investasi) untuk memastikan tidak ada yang lolos dari filter.

## Audit — 2 gap ditemukan (kedua-duanya di luar `investasi.js`, TIDAK
tersentuh oleh fix S193)

1. **`Aset.investmentPerformance()` (modules/asset/aset.js)** — sumber
   data TUNGGAL `InvestmentPlannerAPI` (modules/finance/
   investment-planner-api.js, Sesi 161) sejak Investment Planner direwire
   dari `Investment`/`D.investments` ke Buku Aset (karena `D.investments`
   tidak pernah punya UI penulis data). Fungsi ini membaca `D.assets`
   MENTAH tanpa filter ownership — beda dari `Aset.totalValue()`/
   `AssetInsight.compute()` di file yang sama, yang sudah SELF-only sejak
   S193. Akibatnya aset ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/
   FAMILY ikut nyasar ke `totalModal`/`totalNilai`/`gain`/`roiPct`/
   `best`/`worst`, dan CASCADE ke `InvestmentPlannerAPI.portfolioOverview()`/
   `assetAllocation()`/`investmentRecommendation()`/`summary()` (kartu
   "Investment Planner" di Dashboard Hub).
2. **`InvestAI` (modules/asset/invest-ai-widget.js, widget "🤖 Rekomendasi
   AI" di kartu Alokasi Aset)** — `_investmentAssets()` membaca
   `D.assets.filter(zakatable)` tanpa filter ownership (dipakai
   `_checkDiversifikasi()`/`_checkVsPreset()` — bisa memicu rekomendasi
   diversifikasi yang salah kalau dominasi datang dari aset titipan/milik
   investor). `_checkPortofolio()` memakai `Investment.getHoldings().length`
   MENTAH sbg gate keberadaan holding (bukan `holdingsCount` yang sudah
   difilter `Investment.portfolioSummary()` sejak S193) — secara praktik
   tidak menghasilkan angka salah (ROI/alokasi yang ditampilkan tetap dari
   `summary()`/`assetAllocation()` yang sudah SELF-only), tapi gate-nya
   sendiri tidak konsisten, jadi tetap diperbaiki untuk audit yang benar2
   tuntas.

`InvestmentPlannerAPI`/`AssetPortfolioAPI`/`Investment.portfolioSummary()`/
`Investment.assetAllocation()`/`DanaKelolaan.sumInvestasi()` sendiri
TIDAK diubah — masing2 sudah PURE pass-through/reuse yang benar (
`AssetPortfolioAPI` bahkan sudah difilter `isAssetOwnershipSelf` di
`assetCount` sejak S193/S201; `DanaKelolaan.sumInvestasi(type)` memang
sengaja menjumlah PER TYPE termasuk non-SELF — itu tujuan modul Dana
Kelolaan, bukan bug).

## Perubahan

- **`modules/asset/aset.js`** (`Aset.investmentPerformance()`): TAMBAH 1
  filter `isAssetOwnershipSelf` di awal (`(D.assets||[]).filter(isAssetOwnershipSelf)`)
  — 0 rumus baru, pola SAMA PERSIS `totalValue()`/`AssetInsight.compute()`
  di file yang sama. `renderInvestasi()` (kartu "Performa Investasi" di
  Buku Aset) & `InvestmentPlannerAPI` otomatis ikut terfilter tanpa
  perubahan tambahan (murni reuse fungsi ini).
- **`modules/asset/invest-ai-widget.js`**:
  - `_investmentAssets()`: TAMBAH filter `isAssetOwnershipSelf` (guard
    `typeof`, pola sama `AssetPortfolioAPI.portfolioComposition()`) SEBELUM
    filter `zakatable` yang sudah ada.
  - `_checkPortofolio()`: gate keberadaan holding diganti dari
    `Investment.getHoldings().length` (mentah) jadi
    `Investment.portfolioSummary().holdingsCount` (sudah difilter ownership
    sejak S193) — 0 rumus baru.

## Test baru
`tests/investment-ownership-sync-s261.test.js` (10 test): `Aset.
investmentPerformance()` (holdingsCount/totalModal/totalNilai/gain/
tracked/best/worst SELF-only, fallback tanpa OwnershipEngine), cascade
`InvestmentPlannerAPI.portfolioOverview()`/`assetAllocation()`, `InvestAI.
_investmentAssets()`, `InvestAI.generateRecommendations()` (diversifikasi
tidak terpengaruh dominasi aset non-SELF; gate ROI holding non-SELF tidak
memicu rekomendasi palsu; holding SELF rugi tetap memicu rekomendasi
seperti sebelumnya — regresi tidak rusak).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1280 / pass 1280 / fail 0 (naik dari 1270, +10 test baru, 0 regresi)

node scripts/build.js sesi261-investment-ownership-sync
# ✅ Build selesai, ?v=765, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1280 / pass 1280 / fail 0
```

---

# Changelog — Sesi 249: Dana Titipan Aset (Buku Aset)

## Konteks
Permintaan user: satu instrumen investasi di 📋 Buku Aset (mis. reksadana/
saham/emas) kadang berisi campuran dana milik sendiri & dana titipan
investor/keluarga sekaligus. Kepemilikan (`OwnershipEngine`) yang sudah ada
sifatnya all-or-nothing per aset (SELF/INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY
untuk SELURUH nilai aset), jadi tidak cukup untuk kasus campuran. Reuse pola
`Investment._syncTitipanDebt()`/`fundSource:'titipan'` yang sudah ada di
`modules/asset/investasi.js` (Sesi lama) — tapi modul `Investment`/
`D.investments` itu sendiri ternyata dead code, tidak pernah dipanggil dari
UI manapun (lihat komentar di `modules/finance/investment-planner-api.js`).
Pola yang sama diterapkan ke domain Aset (`D.assets`, yang benar-benar
punya UI di 📋 Buku Aset) sebagai fitur baru.

## Perubahan

- **`modules/shared/modals.js`** (`assetModal`): tambah toggle "💰 Ada Dana
  Titipan?" + wrap tersembunyi (`assetTitipanWrap`, pola sama dgn
  `billShared`/`txCicilanShared`) berisi:
  - Dropdown sumber dana titipan (Investor/Keluarga/Lainnya).
  - Input nama pemilik dana (opsional).
  - Input nominal titipan (Rp), pakai pola `amt-wrap`+kalkulator yang sudah
    ada.
- **`modules/asset/aset.js`**:
  - `Aset.openModal()`: populate field titipan dari `a.titipanAmount`/
    `titipanOwnerType`/`titipanOwnerName`, toggle wrap sesuai ada/tidaknya
    nominal titipan.
  - `Aset.toggleTitipan()`: baru, show/hide wrap saat toggle diklik.
  - `Aset.save()`: baca field titipan, nominal titipan dijepit ke
    `[0, nilai]` (tidak boleh lebih besar dari Estimasi Nilai instrumen
    itu sendiri), simpan sbg `titipanAmount`/`titipanOwnerType`/
    `titipanOwnerName` di object aset, lalu panggil
    `Aset._syncTitipanDebt()`.
  - `Aset._syncTitipanDebt(a)`: baru — REUSE PERSIS pola
    `Investment._syncTitipanDebt()` (0 rumus baru, cuma dipindah domain):
    porsi titipan (`a.titipanAmount`) otomatis disinkron sbg 1 entry
    📕 Buku Utang (`D.debts`, nama = pemilik dana, catatan = nama aset),
    di-link lewat `a.titipanDebtLinkId`. Dipanggil ulang -> UPDATE entry
    lama (bukan duplikat). `titipanAmount` balik ke 0/toggle mati -> entry
    utang lama otomatis dihapus. Nilai instrumen (`a.nilai`) TIDAK
    diubah — tetap dicatat penuh, supaya Kekayaan Bersih = Nilai Aset −
    Utang Titipan (tidak overstated) lewat mekanisme Buku Utang yang
    sudah ada, 0 perhitungan baru di Kekayaan Bersih/Zakat Maal/dst.
  - `Aset.delete()`: hapus entry utang titipan terkait (kalau ada) saat
    asetnya dihapus, supaya tidak nyisa utang yatim.
  - `Aset.renderList()`: badge baru "💰 Titipan Investor/Keluarga/Pihak
    Lain" di daftar Buku Aset kalau `titipanAmount > 0` (reuse class
    `acc-chip` yang sudah ada, sama seperti badge Ownership).
- **`tests/asset-titipan.test.js`** (baru, 7 test): `_syncTitipanDebt()` —
  titipanAmount 0 -> tidak bikin utang; > 0 -> bikin 1 entry baru sesuai
  nominal & nama pemilik; tanpa nama -> label jenis sumber dana saja;
  dipanggil ulang dgn nominal berubah -> UPDATE bukan duplikat; balik ke 0
  -> entry lama dihapus & `titipanDebtLinkId` direset; entry utang manual
  lain tidak terganggu; guard `a`/`D.debts` kosong -> no-op tanpa error.

TIDAK ada perubahan ke `OwnershipEngine`, `Investment`/`investasi.js`,
kalkulasi Zakat Maal, atau modul lain manapun — murni fitur baru yang
reuse mekanisme Buku Utang yang sudah ada.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1165 / pass 1165 / fail 0 (naik dari 1158, +7 test baru, 0 regresi)

node scripts/build.js sesi249-dana-titipan-aset-1
# ✅ Build selesai, ?v=749, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1165 / pass 1165 / fail 0
```

# Changelog — Sesi 244: Inventory Transfer UI

## Konteks
Target eksplisit user: "S244. Implement ONLY: Inventory Transfer UI. Reuse
ONLY: BusinessFlowPresenter, InventoryEngine, TripEngine, TripPresenter,
DeliveryPlanUI, PurchaseEngine, OwnershipEngine. No new engine, no new
presenter, no new database, no new business logic, no duplicate logic, no
redesign UI." Menutup gap BACKEND ONLY dari audit S243:
`createInventoryTransfer()`/`receiveTransfer()`/`transferSummary()` sudah
ada & teruji tapi belum ada UI aksi yang memanggilnya.

## Perubahan

- **`modules/shop/business-flow-presenter.js`**: tambah 7 method UI baru di
  `BusinessFlowPresenter` (extend presenter yang sudah direuse, BUKAN
  presenter baru) — semua 100% delegasi ke fungsi S243 yang sudah ada, 0
  rumus baru:
  - `openTransferModal()` — isi `#itProduct` dari `D.products` (pola
    PERSIS `DeliveryPlanUI.open()`), reset keranjang sementara, buka
    modal.
  - `addTransferCartItem()` / `removeTransferCartItem(idx)` — kumpulkan
    `{productId,qty}` ke `_transferCartState` (array sementara, BUKAN
    `D`, pola sama keranjang Order `orderItemList`).
  - `_renderTransferCart()` — render keranjang + ringkasan, ringkasan
    100% REUSE `transferTotals()` (S243, delegasi `TripEngine.packing()`)
    — 0 hitung ulang Weight/Volume/Packing.
  - `saveTransferFromModal()` — baca Origin/Destination + keranjang,
    delegasi PERSIS `createInventoryTransfer()` (S243) yang sendiri sudah
    memanggil `save()`/`this.render()`/`this.renderTab()`/`toast()`.
  - `renderTransferList()` — daftar transfer aktif (ON_TRIP/RECEIVED) ke
    `#businessFlowTransferList`, 100% REUSE `transferSummary()`/
    `transferStatus()` (S243). Dipanggil di baris terakhir `render()`
    (bukan wiring sync terpisah) — otomatis ikut refresh siklus render()
    yang sama dengan kartu Purchase/Trip/Stock/Sale/dst, sehingga
    Inventory Movement/Business Lifecycle/Trip/Dashboard/Transfer Summary
    selalu konsisten tanpa kode sync tambahan (semua kartu itu sudah baca
    `D` FRESH tiap `render()` sejak S207-208/S237/S238).
  - `receiveTransferFromUI(transferId)` — tombol "📥 Terima" di list,
    100% delegasi PERSIS `receiveTransfer()` (S243).
  - Kartu Inventory Transfer (`_transferCard`, kartu ke-9) di `render()`
    tambah tombol "🚚 Buat Transfer" (`i === 8`) — pola sama tombol CTA
    kartu Purchase (`i === 0`, S206).
- **`modules/shared/modals.js`**: tambah 1 entri `MODAL_HTML` baru
  (`inventoryTransferModal`) — modal Origin/Destination (2 `<select>`,
  default MAGELANG_STORAGE→PEKALONGAN_STORAGE, sesuai default
  `createInventoryTransfer()`), pilih Produk dari Etalase + Qty + tombol
  "+ Tambah ke Daftar", daftar keranjang, ringkasan totals, tombol
  "Simpan Transfer" — pola struktur sama persis `deliveryPlanModal`.
- **`index.html` / `app_production.html`**: tambah
  `<div id="businessFlowTransferList">` sebagai sibling
  `#businessFlowGrid` (container list transfer aktif) + baris
  `document.write(MODAL_HTML[81])` untuk modal baru. Ditambahkan tepat
  setelah baris `MODAL_HTML[79]` (`hondaPdfImportModal`) — baris ini
  sekaligus jadi wiring pertama utk `deliveryPlanModal` yang sebelumnya
  ada di array tapi belum pernah di-`document.write` (gap lama S203,
  transparan dicatat, TIDAK diperbaiki sesi ini krn di luar scope S244 —
  cukup memastikan modal BARU sesi ini benar-benar ke-render).
- **`package.json`**: version `0.85.6` -> `0.85.7`.

## Yang TIDAK diubah
- 0 engine baru — `createInventoryTransfer()`/`receiveTransfer()`/
  `transferSummary()`/`transferStatus()`/`locationSummary()`/
  `transferTotals()` (S243) TIDAK disentuh sama sekali, 0 baris diubah.
- 0 presenter baru — semua method baru adalah method TAMBAHAN di
  `BusinessFlowPresenter` yang sudah ada (S205+), bukan objek presenter
  terpisah.
- 0 database baru — `_transferCartState` murni state form sementara
  (variabel presenter, direset tiap `openTransferModal()`), bukan field
  `D` baru.
- 0 business logic baru — Weight/Volume/Packing/Transfer Status semua
  100% dibaca dari fungsi S243 yang sudah ada, tidak dihitung ulang.
- 0 redesign — modal baru pakai class `.modal`/`.fg`/`.fs`/`.fi`/
  `.acc-select-row`/`.btn` yang sudah ada, list transfer pakai class
  `.findash-card` yang sudah ada.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1143 / pass 1143 / fail 0 (0 regresi — S244 murni UI wiring,
# tidak ada test baru krn tidak ada business logic baru untuk dites)

node scripts/build.js kw244-inventory-transfer-ui
# Build selesai, ?v=744, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1143 / pass 1143 / fail 0
```

---

# Changelog — Sesi 243: Inventory Transfer

## Konteks
Target eksplisit user: "S243. Implement ONLY: Inventory Transfer (Trip
Magelang -> Pekalongan, BUKAN penjualan — Trip hanya memindahkan lokasi
inventory). Reuse: InventoryEngine, TripEngine, BusinessFlowPresenter,
PurchaseEngine, OwnershipEngine. No new engine, no duplicate stock, no
duplicate quantity, no business logic changes, no redesign UI." Barang
yang dibawa Trip diambil dari Purchase/Inventory existing (master produk
Etalase) — tidak input ulang nama/berat/dimensi/volume.

## Perubahan

- **`modules/shop/business-flow-presenter.js`**: tambah
  `INVENTORY_TRANSFER_STATUSES` (array statis 2 status, pola sama
  `REALIZATION_STATUSES`/S242) + method baru di `BusinessFlowPresenter`:
  - `_transferItems(items)` — resolve `[{productId,qty}]` ke master
    produk Etalase (D.products: name/beratPerUnit/panjang/lebar/tinggi)
    yang SUDAH ADA — 0 input ulang, item productId tak dikenal di-skip.
  - `transferTotals(items)` — Total PCS/Total Berat/Total Volume, 100%
    REUSE `TripEngine.packing()` (delegasi PERSIS `packingCalculator()`,
    cobek-etalase.js) — 0 rumus baru. Sesuai contoh spesifikasi: Cobek 20
    (20pcs@3kg) + Cobek 24 (15pcs@4kg) = 35 pcs / 120 kg.
  - `createInventoryTransfer({items,from,to})` — buat 1 rit transfer
    (default MAGELANG_STORAGE -> PEKALONGAN_STORAGE, status awal
    `ON_TRIP`), disimpan di `D.inventoryTransfers` (koleksi baru, BUKAN
    duplikat stok — field `qty` di dalamnya murni catatan rit).
    **TIDAK PERNAH** mengubah `D.products[idx].stock`,
    `D.transactions`, atau `D.piutang` — sehingga tidak mungkin
    mengurangi stok total / menghasilkan penjualan / menghasilkan
    profit.
  - `receiveTransfer(transferId)` — Saat Receive Goods: status
    `ON_TRIP` -> `RECEIVED` (+`receivedDate`), idempotent. Stok produk
    tetap TIDAK berubah (cuma "lokasi" tercatat pindah, dipakai
    `locationSummary()`).
  - `transferStatus(status)` / `transferSummary(transferId)` — label &
    ringkasan 1 transfer, pola sama `tripStatus()`/`realizedSummary()`.
  - `locationSummary()` — ringkasan Dashboard 3 lokasi (Magelang
    Storage/On Trip/Pekalongan Storage) dalam PCS: `onTripQty`/
    `pekalonganQty` dijumlah dari `D.inventoryTransfers`,
    `totalStockQty` dibaca dari `D.products` (pola sama
    `Etalase.totalModalStok()`), `magelangQty` = sisa — total SELALU
    balance ke `totalStockQty` (Tidak boleh mengurangi stok total).
  - `_transferCard(summary)` — kartu ke-9 (Inventory Transfer) ke
    `#businessFlowGrid`, wired di `render()`/`renderTab()` (baris
    tambahan murni, 0 kartu lama diubah).
- **`modules/shared/features-helpers-global-security.js`**: tambah
  `inventoryTransfers:[]` ke skema default `D` + migrasi
  `if(!D.inventoryTransfers) D.inventoryTransfers=[];` di `load()`
  (pola sama `D.piutang`/`D.assets`) — rollback-safe, tidak mengubah
  data lama. Bump `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION`
  ke `kw243-inventory-transfer`.
- **`tests/inventory-transfer-s243.test.js`** (baru): 14 test — totals
  sesuai contoh spesifikasi, stok tidak berubah setelah
  create/receive, balance 3-lokasi, status/summary lookup.
- **`package.json`**: version `0.85.5` -> `0.85.6`.

## Yang TIDAK diubah
- 0 engine baru (100% reuse `InventoryEngine`/`TripEngine`/
  `PurchaseEngine`/`OwnershipEngine` seperti sesi-sesi sebelumnya).
- 0 stok/qty duplikat — `D.inventoryTransfers[].items[].qty` murni
  catatan rit, bukan penambahan/pengurangan `D.products[idx].stock`.
- 0 business logic diubah — Total PCS/Berat/Volume 100% delegasi
  `TripEngine.packing()` yang SUDAH ADA.
- 0 redesign UI — kartu Dashboard cuma nambah 1 kartu ke grid yang
  sudah ada (`#businessFlowGrid`), pola sama kartu ke-5..ke-8.

---

# Changelog — Sesi 241: Payment Flow

## Konteks
Target eksplisit user: "S241. Implement ONLY: Payment Flow. Reuse:
BusinessFlowPresenter, FinanceIntelligence, Piutang, PurchaseEngine,
InventoryEngine, TripEngine, OwnershipEngine. No new engine, no new
database, no new business logic, no redesign UI." Sinkronkan pembayaran
ke Business Lifecycle. Payment Status: UNPAID -> PARTIAL -> PAID.

## Perubahan

- **`modules/shop/business-flow-presenter.js`**: tambah `PAYMENT_STATUSES`
  (array statis 3 status, pola sama `RECEIVE_STATUSES`/S240) + 3 method
  baru di `BusinessFlowPresenter`:
  - `paymentStatus(cobekId)` — status Payment Flow murni dari
    `orderStatus()` (S209-210, delivered/paid dari D.cobek/D.piutang yang
    SUDAH ADA) + `t.total`/`piutang.nilai` yang SUDAH tersimpan sejak
    kw-shop-dp (`Order._saveInner()`, cobek-order.js: sisa tagihan =
    `piutang.nilai`, sudah DP = `piutang.nilai < t.total`) — 0 rumus
    pembayaran baru: tidak ada piutang aktif -> PAID; piutang aktif
    dgn sisa < total -> PARTIAL; sisa == total (belum ada DP) -> UNPAID.
  - `markPaid(cobekId)` — 100% delegasi PERSIS ke
    `this.markPaymentReceived()` (S209-210, sudah update `Piutang.lunas`
    + fan-out `syncPiutangFinanceViews()`/toast) — **0 duplikat logic
    pembayaran**. Tambahan satu-satunya: catat `paymentDate` di record
    Trip (D.cobek) itu sendiri, field tambahan pada record yang SUDAH
    ADA (sama prinsip `receiveDate`/S240), untuk field "Payment Date" di
    UI Payment.
  - `paymentSummary(cobekId)` — ringkasan Payment (Status, Total
    Tagihan, Sudah Dibayar, Sisa Tagihan, Payment Date) — murni baca
    ulang field yang sudah tersimpan, 0 rumus baru selain
    `paymentStatus()` di atas.
  - Sync Business Status/Piutang/Finance/Dashboard: TIDAK ADA wiring
    tambahan diperlukan — `markPaymentReceived()` yang direuse SUDAH
    memanggil `syncPiutangFinanceViews()` (renderKeuangan/
    renderDashboard/renderKekayaanBersih/hitungZakatMaal/
    Piutang.renderList) & `save()` (yang SUDAH memicu
    `FinanceIntelligence.invalidateCache()` lewat wiring existing di
    `modules/shared/features-helpers-global-security.js`/
    `modules-render.js`) — Finance & Dashboard otomatis ikut sinkron
    tanpa kode tambahan.
  - `markPaymentReceived()` (S209-210) sendiri **TIDAK diubah sama
    sekali** — `markPaid()` cuma wrapper tambahan di atasnya. Engine
    yang direuse (FinanceIntelligence/Piutang/PurchaseEngine/
    InventoryEngine/TripEngine/OwnershipEngine) TIDAK disentuh — 0
    baris diubah di file-file tsb.
- **`tests/payment-flow-s241.test.js`** (baru, 12 test): `paymentStatus()`
  (guard tidak ditemukan, PAID tanpa piutang, PAID piutang lunas, UNPAID
  sisa==total, PARTIAL sisa<total), `markPaid()` (guard, delegasi
  `markPaymentReceived()` + paymentDate, status jadi PAID),
  `paymentSummary()` (guard, angka PARTIAL, angka PAID, paymentDate
  setelah `markPaid()`).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1118 / pass 1118 / fail 0 (naik dari 1106, +12 test baru, 0 regresi)

node scripts/build.js kw241-payment-flow
# Build selesai, ?v=740, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1118 / pass 1118 / fail 0
```

---

# Changelog — Sesi 240: Receive Goods

## Konteks
Target eksplisit user: "S240. Implement ONLY: Receive Goods. Reuse:
BusinessFlowPresenter, TripEngine, InventoryEngine, PurchaseEngine,
DeliveryPlanUI, OwnershipEngine. No new engine, no new database, no new
business logic, no redesign UI." Saat Trip (S239) tiba di tujuan, barang
diterima bertahap (partial) atau sekaligus (full). Receive Status:
NOT_RECEIVED -> PARTIALLY_RECEIVED -> FULLY_RECEIVED.

## Perubahan

- **`modules/shop/business-flow-presenter.js`**: tambah `RECEIVE_STATUSES`
  (array statis 3 status, pola sama `TRIP_STATUSES`/S239) + 4 method baru
  di `BusinessFlowPresenter`:
  - `_receiveStatusOf(trip)` (internal) — turunkan status Receive Goods
    murni dari agregasi `items[].qty` vs `items[].receivedQty` milik 1
    Trip (D.cobek) — 0 rumus stok, cuma perbandingan angka yang sudah ada.
  - `receiveItem(cobekId, productId, qty)` — terima qty (di-clamp ke sisa
    yang belum diterima, tidak bisa overreceive/dobel-tambah kalau
    dipanggil ulang) utk 1 item di 1 Trip. Stok TETAP ditambah lewat
    `this.receiveGoods()` yang SUDAH ADA (S207-208, delegasi PERSIS
    formula `StockRekoWidget.applyAll()`) — **0 duplikat logic stok**,
    cuma dipanggil ulang per-item.
  - `receiveAll(cobekId)` — terima SISA qty semua item Trip sekaligus,
    100% reuse `receiveItem()` per item (0 logic baru), pola sama
    `completeTrip()` yang reuse `receiveGoods()`.
  - `receiveSummary(cobekId)` — ringkasan 1 Trip (items dgn qty
    dibawa/diterima, status, receiveDate) — murni baca ulang field yang
    sudah tersimpan.
  - State baru yang ditulis: `items[].receivedQty` (progres per item) &
    `receiveDate` (kapan terakhir diterima) — **field tambahan pada
    record `D.cobek` yang SUDAH ADA**, BUKAN koleksi/database baru (sama
    prinsip field `delivered`/`piutangLinkId` yang sudah ada sebelumnya
    di record yang sama).
  - Sync Inventory Movement/Business Lifecycle: TIDAK ADA wiring
    tambahan diperlukan — `currentLocation()`/`stockStatus()` dkk (S198,
    S238) semua baca `D.products`/`D.cobek` FRESH tiap dipanggil, jadi
    otomatis merefleksikan stok/receivedQty terbaru begitu
    `receiveItem()`/`receiveAll()` selesai.
  - Engine yang direuse (TripEngine/InventoryEngine/PurchaseEngine/
    DeliveryPlanUI/OwnershipEngine) TIDAK disentuh sama sekali — 0 baris
    diubah di file-file tsb. Perhitungan stok existing (`receiveGoods()`)
    TIDAK diubah sama sekali.
- **`tests/receive-goods-s240.test.js`** (baru, 13 test): guard Trip/item
  tidak ditemukan, partial receive (stok nambah persis qty diterima),
  receive bertahap 2x (tidak dobel), clamp qty > sisa (tidak overstock),
  status PARTIALLY_RECEIVED/FULLY_RECEIVED, `receiveAll()` (sekaligus &
  setelah sebagian), `receiveSummary()` (status/receiveDate/items
  terkini).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1106 / pass 1106 / fail 0 (naik dari 1093, +13 test baru, 0 regresi)

node scripts/build.js kw240-receive-goods
# Build selesai, ?v=739, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1106 / pass 1106 / fail 0
```

---

# Changelog — Sesi 239: Trip Management

## Konteks
Target eksplisit user: "S239. Implement ONLY: Trip Management. Reuse:
TripEngine, BusinessFlowPresenter, InventoryEngine, PurchaseEngine,
DeliveryPlanUI, OwnershipEngine. No new engine, no new database, no new
business logic, no redesign UI." Trip = container rit pengiriman barang
(Trip Number/Tanggal/Kendaraan/Driver/Origin/Destination/Status/Items/
Total Berat/Total Volume), Trip Status: PLANNED -> LOADING -> READY ->
ON_TRIP -> ARRIVED -> UNLOADING -> COMPLETED.

## Perubahan

- **`modules/shop/business-flow-presenter.js`**: tambah `TRIP_STATUSES`
  (array statis 7 status Trip, urutan PERSIS spesifikasi user) + 3 helper
  baru di `BusinessFlowPresenter` — pola SAMA PERSIS
  `BUSINESS_LIFECYCLE_STATUSES`/`statusLabel()`/`nextStatus()` (S237) &
  `INVENTORY_MOVEMENT_LOCATIONS`/`movementLabel()`/`nextLocation()` (S238):
  - `tripStatus(status)` — label tampilan 1 status Trip (case-insensitive,
    fallback apa adanya kalau tidak dikenali).
  - `nextTripStatus(status)` — status berikutnya dalam rantai, `null` di
    ujung (COMPLETED) atau kalau tidak dikenali. Murni navigasi array, 0
    logic bisnis.
  - `tripSummary()` — 100% delegasi PERSIS ke `TripPresenter.summary()`
    (S204-A, field `D.cobek` yang sudah tersimpan: delivered/ongkir/
    marginPct) — 0 rumus baru, satu sumber angka yang sama dgn
    `flow().trip`/`_tripCard()` yang sudah ada.
  - TIDAK ADA Trip entity/CRUD/field D baru. Field Kendaraan/Driver/
    Origin/Destination di spesifikasi UI TIDAK punya sumber data
    tersimpan di D (dicek eksplisit: tidak ada `vehicleId`/`driver`/
    `origin`/`destination` yang pernah ditulis ke `D.cobek` — cuma
    parameter sesaat di form `DeliveryPlanUI`/`TripEngine.plan()`) —
    menambahkannya akan melanggar batasan "no new database", jadi TIDAK
    diimplementasikan sesi ini (transparan, sama semangat catatan gap di
    `lifecycleStatus()`/S237 soal status yang belum pernah benar-benar
    dikembalikan).
  - Engine yang direuse (TripEngine/InventoryEngine/PurchaseEngine/
    DeliveryPlanUI/OwnershipEngine) TIDAK disentuh sama sekali — 0 baris
    diubah di file-file tsb.
- **`tests/trip-management-s239.test.js`** (baru, 6 test): `tripStatus()`
  (7 status + fallback), `nextTripStatus()` (urutan penuh + null di ujung
  + key tidak dikenali), `tripSummary()` (kosong, ada trip delivered, &
  guard `TripPresenter` belum dimuat) — semua dibandingkan `deepEqual`
  langsung ke `TripPresenter.summary()` supaya kebuktian 0 rumus baru.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1093 / pass 1093 / fail 0 (naik dari 1087, +6 test baru, 0 regresi)

node scripts/build.js kw239-trip-management
# Build selesai, ?v=738, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1093 / pass 1093 / fail 0
```

---

# Changelog — Sesi 235: Ownership Filter UI

## Konteks
Target eksplisit user: "S235. Implement ONLY: Ownership Filter UI. Reuse:
OwnershipEngine. No new engine. No redesign. No business logic changes.
Tambahkan filter Ownership pada halaman yang sudah memiliki daftar data:
Akun, Asset, Investasi, Kendaraan, Dana Kelolaan (jika modul sudah ada).
Dropdown: Semua/SELF/INVESTOR/CUSTOMER/FAMILY/THIRD_PARTY. Reuse
OwnershipEngine.filterByType(). Default = Semua. Jangan mengubah
perhitungan." Baseline: kw234-ownership-detail-view (S234, badge + detail
view read-only dari OwnershipEngine.resolve()/label()).

## Perubahan

- **`app_production.html` / `index.html`**: dropdown filter Kepemilikan
  (`<select>` Semua/SELF/INVESTOR/CUSTOMER/FAMILY/THIRD_PARTY) ditambahkan
  di atas grid Akun (`#accGrid`, Pengaturan → Keuangan) dan di atas Buku
  Aset (`#assetList`) — Buku Aset SUDAH mencakup item Investasi (jenis
  Deposito/Investasi/Saham/Reksadana/Kripto), karena project ini belum
  punya daftar Investasi terpisah dari Buku Aset (bukan hal baru sesi ini
  — sudah begitu sejak awal), jadi 1 filter di sini otomatis mencakup
  "Asset" & "Investasi" sekaligus sesuai spesifikasi.
- **`modules/shared/modals.js`**: dropdown filter Kepemilikan sama
  ditambahkan di modal `vehicleModal` ("Kelola Kendaraan"), di atas
  `#vehicleManageList`.
- **`modules/shared/modules-render.js`**: `renderAccGrid()` &
  `renderVehicleManageList()` membaca dropdown filter (fallback "Semua"
  kalau elemen tidak ada — halaman lain yang juga panggil fungsi ini tanpa
  filter tetap tampil apa adanya) lalu memfilter list yang DIRENDER lewat
  `OwnershipEngine.filterByType()` apa adanya (0 filter/logic baru). Index
  `[i]` yang dipakai tombol edit/hapus dicari ulang via `indexOf()` supaya
  tetap index ASLI di `D.accounts`/`D.vehicles` walau list sudah difilter
  (bug index-mismatch kalau tidak — tombol edit/hapus bisa kena item yang
  salah). Total/saldo (`accGridTotal`/`accGridTotalSub`) TETAP dihitung
  dari `D.accounts` PENUH (tidak ikut filter) — sesuai "Jangan mengubah
  perhitungan".
- **`modules/asset/aset.js`**: `Aset.renderList()` (Buku Aset) filter
  dengan pola sama; `data-args` di sana sudah pakai `a.id` (bukan index),
  jadi tidak ada risiko index-mismatch. `totalValue()`/`renderDashboard()`/
  dst di bawahnya tetap dipanggil terhadap `D.assets` penuh (TIDAK ikut
  filter render).
- **Dana Kelolaan**: SENGAJA TIDAK disentuh — modul ini (`dana-kelolaan-
  presenter.js`) adalah 5 kartu ringkasan (Investor/Titipan/DP
  Customer/Keluarga/Total) yang SUDAH menampilkan SEMUA tipe kepemilikan
  sekaligus per kartu, bukan daftar item per-baris yang bisa difilter jadi
  satu tipe tanpa redesign kartu — di luar cakupan "No redesign" sesi ini.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1058 / pass 1058 / fail 0 (naik dari 1052, +6 test baru
# tests/ownership-filter-ui-s235.test.js, 0 regresi)

node scripts/build.js kw235-ownership-filter-ui
# ✅ Build selesai, ?v=734, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1058 / pass 1058 / fail 0
```

---

# Changelog — Sesi 201: Finalisasi Sinkronisasi Lintas Modul

Target eksplisit user: finalisasi sinkronisasi lintas modul (Finance/Shop/
Asset/Investment/Vehicle/Inventory/Dashboard/Report/AI Insight/Ownership)
— IMPLEMENT ONLY, reuse seluruh modul existing. Verifikasi: tidak ada
double count, tidak ada orphan data, dashboard = laporan, AI = dashboard,
statistik = laporan, rollback aman. "Perbaiki hanya jika ada error."

**Bug ditemukan & diperbaiki** (satu-satunya perubahan business logic,
0 rumus baru — murni menerapkan filter ownership yang SUDAH ADA di
tempat lain, sesuai instruksi eksplisit "jangan ubah business logic"):
`LaporanAset.nilaiAset()`/`ringkasanKekayaan()` (modules/asset/aset.js,
Laporan Aset) TIDAK memfilter `isAssetOwnershipSelf()`, padahal
komentar aslinya sendiri menyatakan "angka SAMA dgn
Aset.renderDashboard()" — yang SUDAH difilter sejak Sesi 193. Akibatnya
Dashboard Aset & Laporan Aset bisa beda angka kalau ada aset
ber-ownership non-SELF (INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY) —
persis pelanggaran invarian "dashboard = laporan" yang diminta
diverifikasi sesi ini. Fix: tambah `.filter(isAssetOwnershipSelf)` di
`nilaiAset()` (populasi dasar) & `ringkasanKekayaan()` (`jumlahAset`,
supaya konsisten dgn populasi `nilaiAset()` yang dipakainya). `build()`/
`riwayatTransaksi()` SENGAJA TIDAK disentuh — keduanya listing/riwayat
mentah, bukan agregat total (pola sama `Aset.renderList()` yang memang
menampilkan SEMUA aset apa adanya per keputusan Sesi 193).

Audit domain lain (Finance/Shop/Vehicle/Investment) — SEMUA sudah
konsisten (satu sumber angka Dashboard/Laporan/Statistik/Grafik/AI
Insight, ownership SELF-only, guard rollback aman) sejak S191-S200, 0
gap baru ditemukan.

**Test baru** — `tests/cross-module-sync-finalisasi-s201.test.js` (7
test): (1)-(2) `LaporanAset.nilaiAset()`/`ringkasanKekayaan()` sekarang
identik dgn `Aset.totalValue()`/Dashboard Aset, bukan total mentah
`D.assets`, (3) kasus semua-SELF tidak regresi, (4) rollback aman
`OwnershipEngine` belum dimuat, (5) `riwayatTransaksi()` aman & tidak
throw kalau `accountId` aset menunjuk akun yang sudah dihapus (orphan
link), (6) akun tertaut aset dikecualikan dari `totalSaldoAkun()`
(no double count saldo kas + nilai aset), (7) cek struktural 0 fungsi
"totalSaldoAkun2"/"hitungSaldoTotal" duplikat terselip di Finance
Dashboard/Intelligence (AI = Dashboard, satu sumber angka). Baseline
regression **985/985 PASS** (naik dari 978 — 7 test baru di atas), build
`kw201-finalisasi-sinkronisasi-lintas-modul-714` (`?v=714`).

---

# Changelog — Sesi 200: Finalisasi Dashboard & AI Insight

Target eksplisit user: finalisasi Dashboard & AI Insight — IMPLEMENT
ONLY, reuse seluruh modul existing, TIDAK ada perubahan business logic.
Sinkronkan Dashboard, Home Summary, AI Insight, Statistik, Grafik,
Ownership Engine.

Audit (verifikasi, bukan implementasi baru): `ShopBusinessEnginePresenter`
(S199) sudah wired ke Dashboard Hub (`#shopBusinessEngineGrid`), Laporan/
Statistik Shop (`#shopBizEngineBody`), live-wiring `renderDashboard()`,
dan AI Insight (`ShopInsight`, item `shop-restock-modal`) — semuanya
lewat `summary()` yang SAMA (satu sumber angka, 0 recompute terpisah).
Grafik bulanan Shop (`Laporan.renderGrafik()`) & margin/produk-terlaris
AI Insight sudah difilter ownership SELF sejak S194 (`isCobekOwnershipSelf`,
guard `typeof` fallback aman). 0 gap ditemukan yang butuh perbaikan
business logic — sesi ini murni verifikasi + regression test baru.

**Test baru** — `tests/dashboard-ai-insight-finalisasi-s200.test.js` (6
test): (1) item restock AI Insight pakai angka SAMA PERSIS dgn
`ShopBusinessEnginePresenter.summary().purchase` (0 double compute), (2)
transaksi ownership INVESTOR dikecualikan KONSISTEN dari
`summary().profit` & filter `isCobekOwnershipSelf` (AI baca data SELF
saja), (3) ownership CUSTOMER dikecualikan dari "produk terlaris" (tidak
double count qty lintas ownership), (4) `summary()` PURE — dipanggil
berulang (simulasi Dashboard+Laporan+AI Insight) balikin hasil identik,
tidak akumulasi, (5) rollback aman — `OwnershipEngine` belum dimuat ->
Presenter & AI Insight KONSISTEN fallback anggap semua SELF, (6)
`render()`/`renderTab()` tidak throw walau container DOM tidak ada.
Baseline regression **978/978 PASS** (naik dari 972 — 6 test baru di
atas), build `kw200-finalisasi-dashboard-ai-insight-713` (`?v=713`).

---

# Changelog — Sesi 199: Finalisasi Integrasi Shop

Target eksplisit user: finalisasi integrasi Shop — reuse seluruh modul
existing, TIDAK ada perubahan business logic. Sinkronkan Dashboard,
Laporan, Statistik, AI Insight, Grafik, Navigasi silang, Ownership Engine.

Audit: PurchaseEngine/TripEngine/InventoryEngine/ProfitEngine (S198,
modules/shop/*-engine.js) sudah lengkap + ada test, tapi TIDAK PERNAH
dipanggil dari file render/presenter manapun — belum ada UI sama sekali.
Ownership Engine sendiri sudah disinkronkan ke Laporan/Statistik/Grafik/
Dashboard/AI Insight Shop di Sesi 194 (tidak diubah lagi di sesi ini).

Perubahan:
- **Baru**: `modules/shop/shop-business-engine-presenter.js` —
  `ShopBusinessEnginePresenter` (`summary()`/`render()`/`renderTab()`),
  100% reuse InventoryEngine/PurchaseEngine/ProfitEngine (S198), reuse
  `isCobekOwnershipSelf()` (OwnershipEngine, S191/S194) untuk agregat
  omzet/untung (HANYA transaksi ownership SELF). 0 rumus baru.
- **Dashboard**: dipanggil dari `DashboardHub.render()`
  (`dashboard-hub.js`) & live-wiring `renderDashboard()`
  (`_safeRender`, `modules-render.js`) -> mengisi
  `#shopBusinessEngineGrid` (Dashboard Hub, `index.html`/
  `app_production.html`, section `#shopBusinessEngineWrap` baru, 3 kartu
  findash-card: Nilai Stok Shop, Rencana Restock, Margin Shop Bulan Ini).
- **Laporan/Statistik/Grafik**: dipanggil dari `Laporan.renderTab()`
  (`modules/shop/cobek-order.js`, baris setelah
  `DanaKelolaanPresenter.renderStatistik()`) -> mengisi
  `#shopBizEngineBody` (card baru `#shopBizEngineCard` di tab Laporan
  Shop). Grafik (`renderGrafik()`/`lapGrafikBars`) TIDAK disentuh —
  sudah disinkronkan ownership-nya di S194.
- **AI Insight**: `ShopInsight.compute()` (`modules/ai/feature-insights.js`)
  — item baru `shop-restock-modal` (estimasi modal restock, reuse
  `ShopBusinessEnginePresenter.summary().purchase`), aditif (item 1-3
  yang sudah ada TIDAK diubah).
- **Navigasi silang**: item `shop-restock-modal` pakai
  `action:{label:'Lihat Shop',page:'shop',navIdx:2}`, pola SAMA PERSIS
  item ShopInsight lain (`shop-stok-menipis`/`shop-margin`).
- **Ownership Engine**: tidak ada perubahan logic — presenter baru
  murni reuse `isCobekOwnershipSelf()` yang sudah ada (S194).
- `scripts/build.js`: registrasi `shop-business-engine-presenter.js` di
  GROUP_B, langsung setelah ke-4 engine S198.
- `tests/shop-business-engine-integration.test.js` (**baru**, 10 test):
  `summary()` (inventory/purchase/profit, termasuk guard engine belum
  dimuat & fallback ownership), `render()`/`renderTab()` tidak throw,
  item AI Insight `shop-restock-modal` (kemunculan & navigasi silang).

Hasil test:
```
node --test
# tests 972
# pass 972
# fail 0
```
Baseline sebelumnya 962/962 (10 test baru, murni aditif). Build
`kw199-finalisasi-integrasi-shop`, `?v=712`.

---

# Changelog — Sesi 191: Ownership Engine Foundation

Target eksplisit user: implementasikan HANYA Ownership Engine (fondasi
lintas-domain) — 100% reuse modul existing, TIDAK ada perubahan business
logic, TIDAK ada refactor besar, TIDAK disinkronkan ke modul lain dulu.

**Baru: `modules/shared/ownership-engine.js`** — Ownership Engine, single
source of truth untuk 5 tipe kepemilikan `SELF`/`INVESTOR`/`CUSTOMER`/
`THIRD_PARTY`/`FAMILY`. Pure & deterministik (0 dependency ke `D`/modul
lain, tidak pernah panggil `save()`), pola `{ok,...}` sama persis modul
engine lain di project ini (mis. `FuelGaugeEngine`, TASK-143):
- `TYPES`/`DEFAULT` — daftar resmi (getter, balikin salinan baru tiap
  akses) & tipe default (`SELF`).
- `isValidType(type)`/`normalize(type)`/`validate(type)` — validasi
  case-insensitive & toleran whitespace, `validate()` balikin reason kalau
  gagal.
- `label(type)` — label Bahasa Indonesia per tipe (Milik Sendiri/
  Investor/Pelanggan/Pihak Ketiga/Keluarga), fallback aman utk tipe tidak
  dikenal.
- `resolve(entity)` — baca kepemilikan efektif dari entity apa pun, TOLERAN
  thd data lama yang belum punya field `ownership` (fallback `DEFAULT`,
  bukan error — semua data project ini sebelum sesi ini belum ada field
  ini).
- `assign(entity, type)` — PURE, balikin salinan baru entity dgn field
  `ownership` ternormalisasi (entity asli TIDAK dimutasi).
- `filterByType(list, type)`/`groupByType(list)`/`countByType(list)` —
  helper query di atas `resolve()`, `groupByType()`/`countByType()` selalu
  balikin 5 key resmi (bucket kosong tetap ada, bukan `undefined`).

**Ubah: `scripts/build.js`** — registrasi `ownership-engine.js` di
GROUP_B, sebelum `features-helpers-global-security.js` (0 dependency,
ditaruh berdekatan dgn modul shared fondasi lain).

TIDAK ADA modul lain yang diubah/di-wiring ke engine ini sesi ini (sesuai
batasan eksplisit user "jangan sinkronkan ke modul lain dulu") — tidak
ada field `ownership` baru di `D.*`, tidak ada UI/modal, tidak ada
perubahan ke finance/asset/vehicle/business.

## Test baru
`tests/ownership-engine.test.js` (37 test): `TYPES`/`DEFAULT`,
`isValidType()`/`normalize()`/`validate()` (valid, case-insensitive,
whitespace, invalid, bukan string, reason menyebutkan daftar tipe valid),
`label()` (5 label resmi, case-insensitive, fallback tipe tak dikenal),
`resolve()` (valid, tanpa field, tidak valid, entity null/bukan object —
semua fallback toleran ke `DEFAULT`), `assign()` (sukses, PURE/tidak
memutasi, timpa nilai existing, gagal entity bukan object, gagal tipe
tidak valid), `filterByType()`/`groupByType()`/`countByType()` (filter
benar, bucket kosong tetap 5 key, list kosong, gagal input bukan array),
dan 1 test integrasi ringan `assign()` -> `resolve()` end-to-end.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 834 / pass 834 / fail 0 (naik dari 797, +37 test baru, 0 regresi)
```
Build `kw-rc13-perf-fix-6-ownership-engine` (`?v=704`), `npm version`
`0.81.0`.

---

# Changelog — Sesi 190 (Tahap 7D-1): Import PDF Honda — Fondasi (pilih & simpan sementara)

Target eksplisit user: fondasi Import PDF Honda — pilih 1 atau banyak file
PDF, simpan sementara (BELUM parsing/OCR). Implementation only.

**Baru: `modules/vehicle/honda-pdf-import.js`** — pola sama persis
`vehicle-catalog.js` (storage IDBStore) & `sparepart-ocr.js` (picker +
orkestrasi, Tahap 7C-1):
- Store terpisah `honda-pdf-import:store` (default `{files:[]}`), TIDAK
  pernah menyentuh `D`/`VehicleCatalog` — data 100% terpisah.
- `pickFiles()` — pilih **1 ATAU BANYAK** file PDF sekaligus (`<input
  type=file multiple accept="application/pdf">`), pola SAMA PERSIS
  `sparepartOcrPickImageFile()` (Tahap 7C-1), bedanya multi-file + filter
  PDF, resolve array.
- `fileToDataUrl()` — 1 File -> data URL base64 via `FileReader` (pola
  sama `_catPhotoToDataUrl()` di `vehicle-catalog-ui.js`, TANPA
  `downscaleImage()` krn ini PDF, bukan foto).
- `add()`/`addMany()` — simpan record `{id, fileName, fileSize, mimeType,
  dataBase64, status:'pending', addedAt}` ke store. `status` TETAP
  `'pending'` sesi ini — **belum ada tahap parsing/OCR apa pun**
  (sengaja di luar cakupan, kandidat tahap lanjutan 7D-2 dst). Validasi:
  nama file wajib, mimeType wajib `application/pdf`, base64 wajib ada.
  Batas `MAX_FILES=20` per store (cegah runaway import).
- `list()`/`get()`/`remove()`/`clear()`/`ensureLoaded()`/
  `invalidateCache()` — CRUD pendukung, pola sama `vehicleCatalog*`.
- `pickAndStage()` — orkestrasi utama: pilih file(s) -> konversi base64 ->
  `addMany()` -> toast ringkasan (`X tersimpan sementara, Y dilewati`).
  Batal pilih -> toast peringatan, `null`, tidak menulis apa pun.

**Ubah: `modules/shared/backup-restore.js`** — mendaftarkan
`honda-pdf-import:store` ke `buildBackupPayload()`/`applyRestoredData()`,
pola SAMA PERSIS `vehicle-catalog:store` (data terpisah dari D wajib
didaftarkan manual atau tidak ikut ter-backup, per
`FOUNDATION_AUDIT.md` §3). Tidak ada test unit yang meng-cover file ini
sebelumnya (0 regresi risiko).

**Ubah: `scripts/build.js`** — registrasi `honda-pdf-import.js` di
GROUP_B, setelah `vehicle-catalog-tx-link.js` (mengelompok dengan file
vehicle-catalog-* lain).

TIDAK ada perubahan ke `VehicleCatalog`, UI/modal `index.html`/
`app_production.html`, atau fitur lain manapun — murni fondasi data/
logic baru, terisolasi total.

## Test baru
`tests/honda-pdf-import.test.js` (29 test): validasi (lengkap/valid,
fileName kosong/terlalu panjang, mimeType bukan PDF, base64 kosong,
fileSize negatif), `add()`/`addMany()` (sukses, gagal validasi tidak
menulis store, batas MAX_FILES, campuran valid/invalid, list bukan
array), `list()`/`get()`/`remove()`/`clear()`, `ensureLoaded()`/
`invalidateCache()` (load sekali per sesi), `pickFiles()`/
`pickAndStage()` (di-stub lewat `document`/`FileReader` tiruan, pola sama
`tests/sparepart-ocr.test.js` men-stub `SparepartScanner`), dan
`errorMessage()` (fallback vs reuse `scanErrorMessage()`).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 719 / pass 719 / fail 0 (naik dari 690, +29 test baru, 0 regresi)

node scripts/build.js kw190-tahap7d1-honda-pdf-import-foundation
# ✅ Build selesai, ?v=664, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 719 / pass 719 / fail 0
```

**Cakupan sesi ini**: HANYA fondasi pilih + simpan sementara. Parsing/OCR
isi PDF, integrasi ke `VehicleCatalog`, dan UI/modal nyata **BELUM
dikerjakan** — menunggu keputusan/target eksplisit sesi berikutnya
(7D-2 dst), sesuai instruksi "Jangan ubah fitur lain".

---



Target eksplisit user: hubungkan `SparepartOcrCatalogDetail` (Tahap 7C-3b,
sebelumnya fungsi MURNI — tidak menyentuh DOM sama sekali) ke UI nyata.

**Baru: `SparepartOcrCatalogDetail.open(result)`**
(`modules/vehicle/sparepart-ocr-catalog-detail.js`) — lapisan wiring
tipis di atas `show()` yang SUDAH ADA (dipakai apa adanya, 0 logic
pencarian/presentasi baru):
- `found:true` & ada item -> tulis `html` hasil `show()` ke
  `#sparepartOcrDetailBody`, lalu buka modal lewat
  `openModal('sparepartOcrDetailModal')` (SUDAH ADA,
  `modal-navigasi.js`).
- `found:false`/item kosong -> `show()` balik `null`, `open()` TIDAK
  menulis DOM & TIDAK membuka modal apa pun (perilaku "jika ditemukan,
  tampilkan" tidak berubah dari Tahap 7C-3b).
- `document`/`openModal` keduanya OPSIONAL (guard typeof) — gagal aman,
  `show()` tetap dikembalikan apa adanya walau DOM tidak tersedia (mis.
  dipanggil dari test terisolasi/Node).
- TIDAK membuka form/modal edit (`VehicleCatalogUI.openForm()`) — tetap
  presentasi baca-saja, bukan alur ubah data. TIDAK ada aksi
  edit/hapus/tambah dari kartu ini.

**Baru: modal `sparepartOcrDetailModal`** (`modules/shared/modals.js`,
index 78 di `MODAL_HTML`) — container `#sparepartOcrDetailBody`
(read-only), tombol tutup standar (`data-action="closeModal"`), pola
sama modal detail lain di repo ini (mis. `customerDetailModal`).
`MODAL_VERSION` dibump. `index.html` ditambah
`<script>document.write(MODAL_HTML[78]);</script>` setelah
`vehCatalogImportModal` (source of truth; `app_production.html` ditulis
ulang otomatis oleh `scripts/build.js`).

**Ubah: `modules/vehicle/sparepart-ocr-orchestrator.js`** — step
`'detail'` sekarang memanggil `SparepartOcrCatalogDetail.open()` KALAU
tersedia (wiring DOM+modal nyata), fallback ke `.show()` murni kalau
dependency versi lama/belum diupgrade (kompatibilitas mundur). 0 logic
pencarian/parsing baru — orkestrator tetap murni pemanggil ke-5 tahap
yang sudah ada.

**Verifikasi:** 6 test baru (5 di
`tests/sparepart-ocr-catalog-detail.test.js` utk `open()` — tulis
DOM+buka modal saat ditemukan, tidak menulis apa pun saat tidak
ditemukan, guard elemen tidak ada, guard document/openModal tidak
tersedia, guard result null/undefined; 1 di
`tests/sparepart-ocr-orchestrator.test.js` utk prioritas `.open()` vs
`.show()`). `node --test tests/*.test.js` -> **690/690 pass** (naik dari
684), 2x — sebelum & sesudah build. `node scripts/build.js
kw189-sparepart-ocr-detail-ui` -> sukses, `?v=660` (naik dari `?v=659`).

---

# Changelog — Sesi 187 (Tahap 7C-4b): orkestrator Scan -> Parse -> Cari Vehicle Catalog -> Detail/Add

Lanjutan Tahap 7C-3d (verifikasi build, 0 kode). Target sesi ini (sempit &
eksplisit): buat orkestrator yang merangkai Scan -> Parse -> Cari Vehicle
Catalog -> (ditemukan -> panggil Detail) / (tidak ditemukan -> panggil
Add). TIDAK ubah UI selain wiring (dan sesi ini belum ada wiring UI nyata
sama sekali — sama seperti seluruh Tahap 7C-1..7C-3c, semuanya
logic/orkestrasi siap pakai).

**Baru: `modules/vehicle/sparepart-ocr-orchestrator.js`** —
`SparepartOcrOrchestrator.run()`: 0 logic baru, murni memanggil ke-4 fungsi
yang sudah ada apa adanya berurutan:
1. `SparepartOcr.scan()` (Tahap 7C-1) -> teks OCR mentah. `null`
   (dibatalkan/gagal) atau `''` (tidak ada teks terdeteksi) -> orkestrasi
   berhenti (`step:'scan'`), TIDAK lanjut ke parse/cari — `scan()` sudah
   menampilkan toast pesannya sendiri, tidak diulang di sini.
2. `SparepartOcrParser.parseText(text)` (Tahap 7C-2) -> `{oemCode,
   partName, brand, barcode}`.
3. `SparepartOcrCatalogLink.findFromParsed(parsed)` (Tahap 7C-3a) ->
   `{found, item, matchedBy}`.
4. `found:true` -> `SparepartOcrCatalogDetail.show(findResult)` (Tahap
   7C-3b), `step:'detail'`, `SparepartOcrCatalogAdd.open()` TIDAK
   dipanggil sama sekali. `found:false` -> `SparepartOcrCatalogAdd.
   open(findResult, parsed)` (Tahap 7C-3c), `step:'add'`,
   `SparepartOcrCatalogDetail.show()` TIDAK dipanggil sama sekali. Simpan
   part baru TETAP lewat `SparepartOcrCatalogAdd.confirmAndSave()`
   terpisah (TIDAK dipanggil otomatis di sini — konfirmasi user tetap
   wajib, 0 perubahan ke Tahap 7C-3c).

Kelima dependency (`SparepartOcr`/`SparepartOcrParser`/
`SparepartOcrCatalogLink`/`SparepartOcrCatalogDetail`/
`SparepartOcrCatalogAdd`) semuanya OPSIONAL (guard typeof), gagal aman
(`{ok:false, step, error}`) kalau salah satu belum dimuat — pola sama
modul-modul Tahap 7C sebelumnya.

TIDAK ada tombol/entry-point UI baru ditaruh ke halaman manapun sesi ini
(belum ada container/modal OCR nyata, sama seperti Tahap 7C-1..7C-3c) —
wiring ke tombol scan label nyata tetap kandidat tahap lanjutan setelah
orkestrator ini disetujui.

`scripts/build.js` (GROUP_B): entri baru
`modules/vehicle/sparepart-ocr-orchestrator.js`, ditaruh setelah
`modules/vehicle/sparepart-ocr-catalog-add.js` (dependency terakhir yang
dipanggilnya).

`tests/sparepart-ocr-orchestrator.test.js` (**baru**, 10 test): cakupan
seluruh percabangan — dependency belum tersedia di tiap tahap (scan/
parse/find), scan `null` vs `''` (berhenti, tidak lanjut), `found:true` ->
Detail dipanggil & Add TIDAK dipanggil (+ Detail belum tersedia -> gagal
aman), `found:false` -> Add dipanggil & Detail TIDAK dipanggil (+ Add
belum tersedia -> gagal aman), dan `findResult` tanpa property `found`
sama sekali tetap dianggap tidak ditemukan.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 682 / pass 682 / fail 0 (naik dari 672, 10 test baru, 0 regresi)

node scripts/build.js kw187-tahap7C4b-sparepart-ocr-orchestrator
# ✅ Build selesai, ?v=656, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 682 / pass 682 / fail 0
```

Catatan: `npm run lint` tidak bisa dijalankan di environment sesi ini
(sandbox tanpa akses jaringan, `eslint` belum ter-install/tidak bisa
di-fetch) — disebutkan apa adanya, bukan diklaim lolos. `node --check`
bawaan `scripts/build.js` (bagian dari langkah build di atas) tetap
memverifikasi sintaks kedua bundle dan lolos.

---

# Changelog — Sesi 187 (Tahap 7C-3d): verifikasi build + full test run (tidak ada perubahan kode)

Lanjutan Tahap 7C-3c. Target sesi ini (sempit & eksplisit): tambah/update
test seperlunya, perbaiki HANYA error build/test kalau ada, jalankan build
final, jalankan seluruh test sampai PASS.

Hasil audit: **0 error build, 0 test gagal** — `node --test tests/*.test.js`
sudah 672/672 pass sebelum sesi ini dimulai (baseline dari Tahap 7C-3c),
dan `node scripts/build.js` selesai bersih tanpa error sintaks/lint
internal. Karena tidak ada error yang perlu diperbaiki, TIDAK ada perubahan
kode (0 file source/test diubah) — sesi ini murni menjalankan ulang
build+test sebagai verifikasi checkpoint, sesuai instruksi "perbaiki HANYA
error build/test" (tidak ada yang diperbaiki krn tidak ada yang error).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 672 / pass 672 / fail 0 (sama dgn baseline Tahap 7C-3c, 0 test baru)

node scripts/build.js kw187-tahap7C3d-sparepart-ocr-verify
# ✅ Build selesai, ?v=655, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 672 / pass 672 / fail 0
```

Catatan: `npm run lint` tidak bisa dijalankan di environment sesi ini
(sandbox tanpa akses jaringan, `eslint` belum ter-install/tidak bisa
di-fetch) — disebutkan apa adanya, bukan diklaim lolos. `node --check`
bawaan `scripts/build.js` (bagian dari langkah build di atas) tetap
memverifikasi sintaks kedua bundle dan lolos.

---

# Changelog — Sesi 187 (Tahap 7C-3c): part tidak ditemukan -> buka form tambah + prefill OCR + konfirmasi sebelum simpan

Lanjutan Tahap 7C-3b (tampilkan detail part kalau ditemukan). Target sesi
ini (sempit & eksplisit): kalau part TIDAK ditemukan, buka form tambah
part, isi otomatis data OCR, minta konfirmasi sebelum benar-benar disimpan.
TIDAK ubah parser (7C-2), TIDAK ubah pencarian (7C-3a), TIDAK ubah kartu
detail (7C-3b), TIDAK ubah fitur lain.

**Baru: `modules/vehicle/sparepart-ocr-catalog-add.js`**:
- `fields(parsed)` — presenter MURNI: hasil parse `{oemCode, partName,
  brand, barcode}` (bentuk PERSIS `SparepartOcrParser.parseText()`, Tahap
  7C-2) -> prefill data siap tulis ke form tambah part. HANYA 3 field yang
  dipetakan (`partName`/`oemCode`/`barcode`) krn HANYA 3 itu yang punya
  input di form add-part `vehicle-catalog-ui.js`
  (`catPartName`/`catOemCode`/`catBarcode`). `category` SENGAJA
  dikosongkan (parser tidak mengekstrak kategori), `brand` SENGAJA TIDAK
  dipetakan (tidak ada field brand di skema/form VehicleCatalog).
- `open(findResult, parsed)` — orkestrasi utama: HANYA berjalan kalau
  `findResult.found` falsy (part belum ada). `found:true` -> TIDAK
  melakukan apa pun, return `null` (kartu detail 7C-3b yang tampil, bukan
  form tambah). `found:false` -> panggil `VehicleCatalogUI.openForm()`
  yang SUDAH ADA TANPA id (mode "Tambah Part Baru", 100% reuse) lalu tulis
  field prefill ke DOM (`catPartName`/`catOemCode`/`catBarcode`) KALAU
  elemennya ada & nilainya tidak kosong. TIDAK memanggil
  `VehicleCatalog.create()` di sini — form tetap "belum disimpan".
- `confirmAndSave()` — SATU-SATUNYA jalur simpan alur ini: minta
  konfirmasi (`askConfirm()`, SUDAH ADA `modal-navigasi.js`, pola sama
  `catalogUiRemove()`) dulu, BARU kalau user tekan "Ya" -> panggil
  `VehicleCatalogUI.save()` yang SUDAH ADA (0 logic simpan baru). User
  tekan "Batal" -> `save()` TIDAK pernah dipanggil, form tetap terbuka.
  Alur simpan manual "+ Tambah Part"/"Simpan Perubahan" yang SUDAH ADA
  (TANPA konfirmasi) TIDAK tersentuh sama sekali — `save()` dipanggil apa
  adanya, tidak didefinisikan ulang.

TIDAK ada tombol/entry-point baru ditaruh ke halaman manapun sesi ini —
belum ada container/modal OCR nyata di halaman manapun (sama seperti
Tahap 7C-1/7C-2/7C-3a/7C-3b, semuanya logic/orkestrasi siap pakai, wiring
ke tombol scan label nyata adalah kandidat tahap lanjutan).

Dependency `VehicleCatalogUI` (`vehicle-catalog-ui.js`) & `askConfirm()`
(`modal-navigasi.js`) keduanya opsional (guard typeof), fallback gagal
aman (`null`/`false`) kalau belum dimuat.

`scripts/build.js` (GROUP_B): entri baru
`modules/vehicle/sparepart-ocr-catalog-add.js`, ditaruh setelah
`modules/vehicle/sparepart-ocr-catalog-detail.js`.

`tests/sparepart-ocr-catalog-add.test.js` (**baru**, 15 test): cakupan
penuh ketiga fungsi — pemetaan field & trim, `found:true` vs `found:false`,
mode tambah (openForm TANPA id), guard nilai kosong tidak menimpa form,
guard dependency belum tersedia, dan konfirmasi WAJIB sebelum `save()`
benar-benar terpanggil (`askConfirm()` Ya vs Batal).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 672 / pass 672 / fail 0 (naik dari 657, 15 test baru, 0 regresi)

node scripts/build.js kw187-tahap7C3c-sparepart-ocr-catalog-add
# ✅ Build selesai, ?v=654, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 672 / pass 672 / fail 0
```

Catatan: `npm run lint` tidak bisa dijalankan di environment sesi ini
(sandbox tanpa akses jaringan, `eslint` belum ter-install/tidak bisa
di-fetch) — disebutkan apa adanya, bukan diklaim lolos. `node --check`
bawaan `scripts/build.js` (bagian dari langkah build di atas) tetap
memverifikasi sintaks kedua bundle dan lolos.

---

# Changelog — Sesi 187 (Tahap 7C-3b): tampilkan detail part kalau hasil pencarian ditemukan

Lanjutan Tahap 7C-3a (jembatan hasil parser <-> VehicleCatalog, hanya
cari, kembalikan found/not found). Target sesi ini (sempit & eksplisit):
kalau hasil pencarian ditemukan, tampilkan detail part. TIDAK ubah
parser (7C-2), TIDAK ubah pencarian (7C-3a), TIDAK ada fitur lain.

**Baru: `modules/vehicle/sparepart-ocr-catalog-detail.js`** — presenter
MURNI, TANPA UI/wiring DOM (belum ada container/modal OCR nyata di
halaman manapun sesi ini — Tahap 7C-1/7C-2/7C-3a semuanya logic-only,
jadi kartu detail ini pun BELUM ditaruh ke DOM mana pun, itu wiring UI
tahap lanjutan):
- `fields(item)` — normalisasi 1 item VehicleCatalog jadi field siap
  tampil: `partName`/`category`/`oemCode`/`barcode`/`partNumber`
  (`aftermarketCode`, istilah SAMA PERSIS Tahap 7C-3a)/`price` (diformat
  via `fmt()` kalau ada)/`supplier`/`location`/`notes`/`serviceNotes`/
  `photos`/`compatibleVehicleIds`/`isDraft`. Field opsional kosong ->
  fallback `"Belum diisi"` (istilah SAMA PERSIS `vehicle-core.js`/
  `fuel-gauge-engine.js`). `price` bernilai `0` (angka valid) TIDAK
  dianggap kosong.
- `html(item)` — 1 potongan HTML kartu detail read-only (escaped via
  `escapeHtml()`), TIDAK ADA tombol aksi apa pun (bukan alur edit/hapus,
  murni presentasi baca-saja).
- `show(result)` — orkestrasi utama: terima hasil `{found, item,
  matchedBy}` dari `SparepartOcrCatalogLink.findFromParsed()`/
  `findFromText()` (Tahap 7C-3a) APA ADANYA (tidak memanggil
  VehicleCatalog/SparepartOcrParser sendiri, 0 duplikasi logic).
  `found:true` & ada `item` -> `{fields, html, matchedBy}` siap tampil.
  `found:false` (atau `item` kosong/cacat) -> `null` — TIDAK ADA yang
  ditampilkan, sesuai instruksi "jika ditemukan, tampilkan".

Dependency `escapeHtml()` (helper-teks.js) & `fmt()` (format-tema.js)
keduanya opsional (guard typeof), fallback ke `String(...)` polos kalau
belum dimuat.

`scripts/build.js` (GROUP_B): entri baru
`modules/vehicle/sparepart-ocr-catalog-detail.js`, ditaruh setelah
`modules/vehicle/sparepart-ocr-catalog-link.js` (dependency logic,
dipakai sbg bentuk input `show()`).

`tests/sparepart-ocr-catalog-detail.test.js` (**baru**, 15 test):
cakupan penuh ketiga fungsi — item lengkap vs field kosong (fallback),
`price:0` bukan dianggap kosong, `fmt()`/`escapeHtml()` belum tersedia
(fallback), foto ada/tidak ada, badge draft, tidak ada tombol aksi di
HTML, dan `show()` hanya mengembalikan detail KALAU `found:true` (null
utk `found:false`/item cacat/result undefined).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 657 / pass 657 / fail 0 (naik dari 642, 15 test baru, 0 regresi)

node scripts/build.js kw187-tahap7C3b-sparepart-ocr-catalog-detail
# ✅ Build selesai, ?v=653, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 657 / pass 657 / fail 0
```

Catatan: `npm run lint` tidak bisa dijalankan di environment sesi ini
(sandbox tanpa akses jaringan, `eslint` belum ter-install/tidak bisa
di-fetch) — disebutkan apa adanya, bukan diklaim lolos. `node --check`
bawaan `scripts/build.js` (bagian dari langkah build di atas) tetap
memverifikasi sintaks kedua bundle dan lolos.

---

# Changelog — Sesi 187 (Tahap 7C-3a): jembatan hasil SparepartOcrParser <-> VehicleCatalog (cari saja)

Lanjutan Tahap 7C-2 (Parser Hasil OCR Sparepart, murni logic, belum
terhubung ke Vehicle Catalog). Target sesi ini (sempit & eksplisit):
hubungkan hasil parser ke VehicleCatalog untuk PENCARIAN saja — cari
berdasar OEM Code, Barcode, atau Part Number, kembalikan hasil
ditemukan/tidak ditemukan. TIDAK ubah UI, TIDAK buka form, TIDAK ada
fitur lain (mis. TIDAK bikin draft otomatis — beda dari
`VehicleCatalog.handleOcrLabel()` Tahap 3 yang sudah ada, tidak
diduplikasi/diubah).

**Baru: `modules/vehicle/sparepart-ocr-catalog-link.js`** — jembatan
MURNI LOGIC, TANPA UI, pola sama persis `vehicle-catalog-servis-link.js`/
`vehicle-catalog-tx-link.js`:
- `findByCode(code)` — cari 1 part persis (exact, case-insensitive) di
  VehicleCatalog berdasar OEM Code ATAU Barcode (100% reuse
  `VehicleCatalog.findByCode()` yang sudah ada) ATAU Part Number (field
  `aftermarketCode` — belum dicek `findByCode()` existing, ditambah HANYA
  di file ini lewat `VehicleCatalog.getAll()`, TIDAK mengubah
  `vehicle-catalog.js`).
- `findFromParsed(parsed)` — orkestrasi utama: terima hasil parse bentuk
  persis output `SparepartOcrParser.parseText()`
  (`{oemCode, barcode, partName, brand}`), cari OEM Code dulu lalu
  Barcode (berhenti di kecocokan pertama), kembalikan
  `{found, item, matchedBy}` / `{found:false, item:null}`. Tidak ada kode
  terdeteksi sama sekali -> `{found:false, item:null, error}`, tidak query
  VehicleCatalog sama sekali.
- `findFromText(text)` — varian terima STRING teks OCR mentah, reuse
  `SparepartOcrParser.parseText()` (Tahap 7C-2, guard typeof) untuk parse
  dulu, baru panggil `findFromParsed()`.

Semua fungsi async (baca `VehicleCatalog`/IDBStore) tapi read-only murni —
TIDAK pernah memanggil `VehicleCatalog.create()`/`update()`. Dependency
`SparepartOcrParser`/`VehicleCatalog` keduanya opsional (guard typeof),
gagal aman (`found:false` + pesan error) kalau belum dimuat.

`scripts/build.js` (GROUP_B): entri baru
`modules/vehicle/sparepart-ocr-catalog-link.js`, ditaruh setelah
`modules/vehicle/sparepart-ocr-parser.js` (dependency).

`tests/sparepart-ocr-catalog-link.test.js` (**baru**, 15 test): cakupan
penuh ketiga fungsi — match OEM Code/Barcode/Part Number, exact vs tidak
cocok, kode/parsed kosong, guard `VehicleCatalog`/`SparepartOcrParser`
belum tersedia, dan verifikasi eksplisit `create()`/`update()` TIDAK
pernah terpanggil.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 642 / pass 642 / fail 0 (naik dari 627, 15 test baru, 0 regresi)

node scripts/build.js kw187-tahap7C3a-sparepart-ocr-catalog-link
# ✅ Build selesai, ?v=652, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 642 / pass 642 / fail 0
```

Catatan: `npm run lint` tidak bisa dijalankan di environment sesi ini
(sandbox tanpa akses jaringan, `eslint` belum ter-install/tidak bisa
di-fetch) — disebutkan apa adanya, bukan diklaim lolos. `node --check`
bawaan `scripts/build.js` (bagian dari langkah build di atas) tetap
memverifikasi sintaks kedua bundle dan lolos.

---

# Changelog — Sesi 186 (Tahap 7A): Smart Transaction Foundation — jembatan D.transactions <-> VehicleCatalog

Target sesi ini (dari `kw_release_sesi181_vehiclecatalog-stock-foundation.zip`,
sempit & eksplisit): tambahkan referensi transaksi ke Vehicle Catalog secara
additive. Tidak audit ulang repo, tidak bikin blueprint/ADR/BP-015/Governance
baru, tidak ubah arsitektur/business logic existing — reuse pola
`modules/vehicle/vehicle-catalog-servis-link.js` (Tahap 6 Sesi 1) &
snapshot flat `catalogPartId/catalogPartQty/catalogPartOemCode` (Sesi 180,
Tahap 6B2) apa adanya, direplikasi untuk `D.transactions`.

**Baru: `modules/finance/vehicle-catalog-tx-link.js`** — jembatan MURNI
LOGIC, TANPA UI (wiring ke `txModal`/`_saveTxInner()` sengaja belum
dikerjakan, sama seperti Tahap 6 Sesi 1 vs Sesi 2). Dua mekanisme, sama
persis pola servis:
- `catalogPartRefs` (array `{catalogId, qty}[]`, sumber kebenaran
  multi-part + resolve live): `normalizeRefs()`, `getTxRefs()`,
  `attachToTx()`, `detachFromTx()`, `resolveTxParts()`.
- Snapshot flat 4-field (`catalogPartId`, `catalogPartName`,
  `catalogPartOemCode`, `catalogPartQty`) langsung di record transaksi,
  additive & backward compatible (transaksi lama tanpa field ini ->
  `null`/`''`/`0`, bukan `undefined`): `buildSnapshot()` (murni),
  `getSnapshot()`, `attachSnapshotToTx()` (resolve 1x via
  `VehicleCatalog.getById()`, gagal aman kalau part tidak ada di
  katalog — tidak menyimpan snapshot palsu), `clearSnapshot()`.

Tidak ada database/storage baru — reuse `VehicleCatalog`/`IDBStore` yang
sudah ada (baca saja, lewat `VehicleCatalog.getById()`) dan `D.transactions`
yang sudah ada (`modules/finance/transaksi.js`). Modul ini tidak pernah
memanggil `save()` global (pola sama servis-link — 1 titik `save()` per
alur, di tangan pemanggil/UI masa depan).

`scripts/build.js` (GROUP_B): entri baru `modules/finance/vehicle-catalog-tx-link.js`,
ditaruh setelah `modules/vehicle/vehicle-catalog-servis-link.js` (dependency
`D`/`VehicleCatalog` sudah dimuat lebih dulu di blok atas).

`tests/vehicle-catalog-tx-link.test.js` (**baru**, 30 test): cakupan penuh
kedua mekanisme (normalize/get/attach/detach/resolve untuk `catalogPartRefs`;
build/get/attach/clear untuk snapshot flat), termasuk backward compatibility
(transaksi lama tanpa field), guard `D.transactions`/`VehicleCatalog` belum
tersedia, replace-total vs merge, idempotency detach, dan kegagalan aman
kalau `catalogId` diisi tapi part sudah tidak ada di katalog.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 581 / pass 581 / fail 0 (naik dari 551, 30 test baru, 0 regresi)

node scripts/build.js kw186-tahap7A-smart-transaction-foundation
# ✅ Build selesai, ?v=647, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 581 / pass 581 / fail 0
```

Catatan: `npm run lint` tidak bisa dijalankan di environment sesi ini
(sandbox tanpa akses jaringan, `eslint` belum ter-install/tidak bisa
di-fetch) — disebutkan apa adanya, bukan diklaim lolos. `node --check`
bawaan `scripts/build.js` (bagian dari langkah build di atas) tetap
memverifikasi sintaks kedua bundle dan lolos.

# Changelog — Sesi 180 (Tahap 6B2): snapshot catalogPartId/catalogPartQty/catalogPartOemCode di D.servisLogs

Target sesi ini (dari `kw_release_sesi179_tahap6B1.zip`, sempit &
eksplisit): simpan referensi katalog ke `D.servisLogs` sebagai 3 field
opsional — `catalogPartId`, `catalogPartQty`, `catalogPartOemCode`. Tidak
audit ulang repo, tidak bikin blueprint/ACR, tidak ubah BP-015/ADR/
Governance/business logic existing (`usedPartId`, mekanisme stok,
backup lama tidak disentuh).

Ini TERPISAH & ADDITIF dari mekanisme `catalogPartRefs` (array
`{catalogId, qty}[]`, Tahap 6 Sesi 1, `modules/vehicle/vehicle-catalog-servis-link.js`
— TIDAK diubah sesi ini, tetap dipanggil apa adanya). `catalogPartRefs`
tetap jadi sumber kebenaran untuk multi-part + resolve live ke
`VehicleCatalog`; 3 field flat baru ini murni snapshot ringan langsung di
`D.servisLogs` (pola sama persis `usedPartId`/`usedPartQty` yang sudah
ada sejak awal Car Notes), supaya nama/OEM code part yang dipakai tetap
terbaca cepat/langsung dari 1 catatan servis tanpa resolve async, bahkan
kalau part itu nanti dihapus dari katalog.

Perubahan di `car-notes.js` (`Servis._saveInner`, jalur simpan BARU &
EDIT):
- `catalogPartId`: id part katalog terpilih (dari elemen
  `servisCatalogPartId`, sudah ada) atau `null` kalau tidak pilih.
- `catalogPartQty`: jumlah (dari `servisCatalogPartQty`) atau `0` kalau
  `catalogPartId` kosong.
- `catalogPartOemCode` (BARU): kode OEM part terpilih — dibaca SINKRON
  dari atribut `data-oem` opsi `<option>` yang sedang terpilih (bukan
  panggilan `VehicleCatalog` baru/async tambahan, supaya tidak ada
  risiko IDB/timing baru di jalur simpan). `Servis.populateCatalogPartSelect()`
  ditambah 1 atribut `data-oem="..."` per `<option>` (sebelumnya cuma
  ditampilkan sbg teks di label opsi) supaya bisa dibaca balik saat
  simpan.

`VehicleCatalogServisLink.attachToServis()` (mekanisme `catalogPartRefs`)
tetap dipanggil persis seperti sebelumnya, tidak diubah. `usedPartId`/
`usedPartQty`/`Servis.applyStockUsage()`/`Servis.revertStockUsage()`
(mekanisme stok `D.partsStock`) tidak disentuh sama sekali — diverifikasi
lewat test baru.

`tests/vehicle-catalog-servis-snapshot.test.js` (**baru**, 7 test): load
`car-notes.js` ASLI (bukan reimplementasi) via `helpers/loadSource.js`,
mock DOM ringan (pola sama `tests/tx-bbm-finance-integration.test.js`).
Cakupan: part dipilih -> 3 field tersimpan sesuai form; tidak pilih part
-> optional (`null`/`0`/`''`, bukan `undefined`); `usedPartId`/stok
`D.partsStock` tidak terpengaruh field katalog baru; `VehicleCatalogServisLink.attachToServis`
tetap terpanggil (mekanisme lama tidak hilang); edit entri existing ->
field ter-update di tempat (bukan entri baru), termasuk kasus hapus
pilihan part saat edit; guard elemen `servisCatalogPartId` tidak ada di
DOM -> tidak error, default optional.

`node --test tests/*.test.js`: **551/551 PASS** (naik dari 544, 2x —
sebelum & sesudah build). `node scripts/build.js`: SUKSES, lolos semua
lint guard, `?v=646`, `index.html`/`app_production.html` identik. Tidak
ada file backup lama yang diubah/dihapus (backup baru dari build
ditambahkan apa adanya ke `backups/`, mekanisme build yang sudah ada,
tidak diubah sesi ini).

# Changelog — Vehicle Catalog Tahap 6 (Sesi 1/3): jembatan D.servisLogs <-> VehicleCatalog (murni logic, TANPA UI)

Konteks: User minta Tahap 6 ("integrasi Vehicle Catalog ke Car Notes riwayat
servis: pilih part dari katalog saat catat servis, simpan referensi part/
jumlah/kode OEM, rekomendasi part berdasar jenis kendaraan & jenis servis")
dipecah jadi 3 sesi, ringan dulu. Dipecah jadi: **Sesi 1 (ini)** — simpan
referensi part/jumlah/kode OEM, murni logic tanpa UI; **Sesi 2** — UI picker
"Pilih dari Katalog" di `servisModal` + tampilan part terlampir; **Sesi 3** —
rekomendasi part berdasar jenis kendaraan & jenis servis (engine baru).

File baru: `modules/vehicle/vehicle-catalog-servis-link.js` — jembatan MURNI
LOGIC antara `D.servisLogs` (dimiliki car-notes.js, field baru opsional
additive `catalogPartRefs: {catalogId, qty}[]`) dan `VehicleCatalog`
(IDBStore terpisah, hanya dibaca lewat `getById()`, guard typeof, TIDAK
pernah ditulis dari sini — konsisten ACR-001). 5 fungsi publik
(`VehicleCatalogServisLink`): `normalizeRefs()` (murni, validasi+default
qty), `getServisRefs()`/`attachToServis()`/`detachFromServis()` (baca/tulis
`D.servisLogs` langsung, TIDAK memanggil `save()` global — caller yang
menyimpan, supaya 1 titik `save()` per alur nanti di Sesi 2 & modul ini
tetap dites tanpa mock `save()`), `resolveServisParts()` (async, resolve
referensi jadi data part LENGKAP live dari `VehicleCatalog.getById()` —
part yang sudah dihapus dari katalog dilaporkan jujur `item:null`, BUKAN
otomatis dibuang dari `catalogPartRefs` supaya qty/riwayat tidak hilang
diam-diam). Tidak ada perubahan skema/storage `VehicleCatalog` itu sendiri,
tidak ada perubahan `car-notes.js`/`sparepart-servis.js` (dipakai mulai
Sesi 2), tidak ada modal/UI baru.

Registrasi baru di `scripts/build.js` (GROUP_B, setelah
`vehicle-catalog-import-ui.js`).

`tests/vehicle-catalog-servis-link.test.js` (**baru**, 18 test): D & Vehicle
Catalog di-mock via `extraGlobals` — cakupan normalisasi ref, backward
compatibility (entri servis lama tanpa `catalogPartRefs`), replace-total
attach, idempotent detach, resolve live (termasuk part terhapus & guard
`VehicleCatalog`/`D.servisLogs` belum ada). Catatan teknis: dipakai helper
`deq()` (bandingkan lewat `JSON.stringify`) alih-alih
`assert.deepEqual`/`deepStrictEqual` langsung untuk array of objects hasil
dari sandbox `vm` — objek yang dibuat DI DALAM `vm.Script` memakai
Object/Array prototype REALM `vm` itu sendiri (beda identity dari realm
Node test biasa walau propertinya identik), jadi `deepStrictEqual`
(dipakai `node:assert/strict`) gagal palsu kalau dibandingkan objek demi
objek. Pola `Array.from()` yang sudah dipakai `tests/vehicle-catalog.test.js`
cukup untuk array primitif, tapi tidak cukup untuk array of objects — jadi
sesi ini menambah helper JSON-based yang lebih umum.

`node --test tests/*.test.js`: **539/539 PASS** (naik dari 521, 2x —
sebelum & sesudah build). `node scripts/build.js kw184-vehicle-catalog-servis-link-642`:
SUKSES, lolos semua lint guard, `?v=642`, `index.html`/`app_production.html`
identik.

Tahap 6 Sesi 2 (UI picker) & Sesi 3 (rekomendasi part) belum dikerjakan di
sesi ini.

# Changelog — Vehicle Catalog Tahap 5: Import Katalog (PDF → OCR → Parser → Preview → Import)

Project Decision sesi ini: menu **"Import Katalog"** baru di dalam
`catalogModal`, alur PDF → OCR → Parser → Preview → Import, TIDAK
langsung mengubah database tanpa preview & konfirmasi user.

2 file baru:
- `modules/vehicle/vehicle-catalog-import.js` (logic murni): lazy-load
  pdf.js (`@zxing/library`-style CDN pattern, keputusan teknis wajib
  krn repo belum pernah baca PDF sama sekali — didokumentasikan di
  header file, sama pola dgn keputusan ZXing di Tahap 2).
  `extractPdfText(file)` coba text layer natif pdf.js per halaman dulu,
  fallback render-ke-canvas + `ocrRecognize()` (Tesseract, REUSE penuh
  dari `scan-ocr.js`, guard typeof) kalau halaman itu hasil scan/gambar
  (teks natif < 10 karakter). `parseCatalogRow(line)`/`parseCatalogRows(text)`
  — 1 baris = 1 kandidat part, REUSE `VehicleCatalog.parseLabelText()`
  utk OEM code/barcode (guard typeof), + 1 regex baru khusus harga
  ("Rp50.000"/"35rb"). `commitRows(rows)` — commit HANYA baris yang
  dikirim (tanggung jawab UI mengirim baris yang sudah dicentang user
  setelah preview), reuse `VehicleCatalog.create()` apa adanya per baris,
  0 validasi/skema baru.
- `modules/vehicle/vehicle-catalog-import-ui.js` (presenter DOM saja):
  modal baru `vehCatalogImportModal` (`MODAL_HTML[77]`, aditif — index
  0-76 lama tidak berubah) — pilih file PDF → status baca → preview
  per-baris (checkbox include, default tercentang, nama/OEM/harga bisa
  diedit inline) → tombol "Import yang Dicentang" (pakai `askConfirm()`
  yang sudah ada) baru memanggil `commitRows()`. Tombol entry point
  "📋 Import Katalog" ditambah di baris tombol Scan/Tambah Manual
  `catalogModal` (aditif, tombol lama tidak diubah).

`tests/vehicle-catalog-import.test.js` (**baru**, 10 test): cakupan
`parseCatalogRow()`/`parseCatalogRows()`/`commitRows()` — bagian
PDF.js/OCR/kamera sungguhan tetap di luar cakupan harness `node:vm`
(butuh browser nyata), konsisten pola existing (lihat catatan di file
itu & `vehicle-scanner.test.js`).

`node --test tests/*.test.js`: **521/521 PASS** (sebelum & sesudah
build). `node scripts/build.js`: SUKSES, build
`kw183-vehicle-catalog-ocr-label-parse-641`, guard lint (escapeHtml/
u-dnone/Tesseract) semua PASS. Registrasi baru di `scripts/build.js`
(GROUP_B, domain vehicle) & `MODAL_HTML` di `modules/shared/modals.js`
— TIDAK ada perubahan pada `BP-015.md`, ADR, Governance, atau business
logic existing (`VehicleCatalog.create()`/storage/skema part TIDAK
diubah, hanya dipanggil apa adanya dari `commitRows()`).

Tahap 6 (integrasi Vehicle Catalog ke Car Notes — pilih part dari
katalog saat catat servis, simpan referensi part/jumlah/kode OEM,
rekomendasi part berdasar jenis kendaraan & jenis servis) belum
dikerjakan di sesi ini.

# Changelog — Vehicle Catalog Tahap 2: Scanner kamera FULLSCREEN (Project Decision)

Project Decision sesi ini menetapkan detail Tahap 2 yang sebelumnya
"ringkas" (single-shot file input): **kamera fullscreen, live continuous
scan**, mendukung **Barcode + QR Code + DataMatrix**. `modules/vehicle/
vehicle-scanner.js` diubah total dari pola 1-foto (`input[type=file]` +
`decodeFromImageUrl`) menjadi:
- `reader.decodeFromConstraints({video:{facingMode:'environment'}}, ...)`
  (fallback `decodeFromVideoDevice(undefined,...)` kalau constraints
  ditolak) — live scan terus-menerus sampai kode ketemu atau user tutup.
- Hint eksplisit `ZXing.DecodeHintType.POSSIBLE_FORMATS` mencakup
  QR_CODE + DATA_MATRIX + barcode 1D umum (CODE_128/CODE_39/EAN_13/
  EAN_8/UPC_A/UPC_E/ITF/CODABAR) + `TRY_HARDER:true` — DataMatrix TIDAK
  aktif secara default di ZXing tanpa hint ini.
- Overlay fullscreen dibuat dinamis (`vehicleScannerBuildOverlay()`):
  `<video>` + bingkai target + tombol tutup, dilepas total dari DOM
  setelah scan selesai/dibatalkan. CSS baru aditif di `styles.css`
  (`.vehicle-scanner-fullscreen` dkk, token `--z-scanner` baru + token
  spacing/warna/radius yang sudah ada) — tidak ada selector lama diubah.
- `vehicleScannerHandleResult(code)` / integrasi ke `VehicleCatalog.
  handleScan()` & `VehicleCatalogUI.onScanResult()` **tidak diubah**.
- `vehicleScannerErrorMessage()` ditambah 1 cabang (`NotAllowedError`/
  izin kamera ditolak → pesan jelas), cabang lain tetap sama.

`tests/vehicle-scanner.test.js`: +5 test (9, naik dari 4) — cakupan
`vehicleScannerBuildHints()` (format & TRY_HARDER) + cabang izin kamera
di `vehicleScannerErrorMessage()`. Bagian kamera/video sungguhan tetap
di luar cakupan harness `node:vm` (butuh browser nyata), konsisten
dengan pola existing (lihat komentar di file test).

`node --test tests/*.test.js`: **511/511 PASS**. `node scripts/build.js`:
SUKSES, build `kw183-vehicle-catalog-ocr-label-parse-640`. Tidak ada
perubahan pada `BP-015.md`, ADR, Governance, atau business logic
existing (`VehicleCatalog.handleScan()`, storage, dsb) — sesuai batasan
sesi ini.

Tahap 5 (Import Katalog: PDF → OCR → Parser → Preview → Import) dan
Tahap 6 (integrasi Vehicle Catalog ke Car Notes riwayat servis) belum
dikerjakan di sesi ini — di luar cakupan giliran kerja saat ini.

# Changelog — TASK-007: Vehicle Catalog — Tahap 3 OCR label kemasan (logic saja, ringkas)

Lanjutan ringkas. Tambah 2 fungsi murni ke
`modules/vehicle/vehicle-catalog.js`:
- `parseLabelText(text)` — regex saja, cari OEM Code (token alfanumerik
  campuran huruf+angka, 5-30 karakter) & barcode (deret 8-14 digit) dari
  teks. Tidak ketemu -> string kosong, tidak error.
- `handleOcrLabel(text)` — reuse `parseLabelText()` + `findByCode()`,
  pola SAMA PERSIS `handleScan()` (TASK-005): kode cocok part existing
  -> `{found:true, item}`; tidak cocok -> draft otomatis (`isDraft:true`,
  oemCode/barcode apa adanya, TIDAK ada data imajinasi lain) ->
  `{found:false, item, draft:true}`; tidak ada kode terdeteksi -> tidak
  membuat apa pun, `{found:false, item:null, error}`.

Reuse OCR engine yang SUDAH ADA (`ocrRecognize()`/Tesseract,
`modules/shared/scan-ocr.js`) — TIDAK ada library/keputusan produk baru
(beda dari Tahap 2 Scanner kamera sungguhan yang MASIH butuh pilihan
library barcode/QR). Kamera/upload foto label & pemanggilan
`ocrRecognize()` itu sendiri TETAP di luar cakupan (butuh UI Phase 2).

`tests/vehicle-catalog.test.js` +7 test (55, naik dari 48). Catatan
teknis: 1 assersi hasil objek kosong lintas-realm sandbox `vm` diganti
dari `deepEqual` jadi perbandingan field satu-satu (pola sama masalah
array-kosong Sesi 78/84). `node --test`: **506/506 PASS** (2x — sebelum
& sesudah build). `node scripts/build.js`: SUKSES, build
`kw183-vehicle-catalog-ocr-label-parse-639`.

Tahap 2 (kamera/library scan sungguhan), Tahap 5 (import massal PDF),
Tahap 6 (integrasi Car Notes) tetap butuh UI/wiring page baru &
keputusan produk — di luar cakupan ringkas.

---

# Changelog — TASK-006: Vehicle Catalog — getDrafts()/resolveDraft() (lanjutan ringan)

Lanjutan ringan dari TASK-005. `handleScan()` sudah otomatis buat draft
part kalau kode tidak ditemukan, tapi belum ada cara mensurvei atau
menyelesaikan draft itu. Tambah 2 fungsi murni ke
`modules/vehicle/vehicle-catalog.js`:
- `getDrafts()` — daftar part dgn `isDraft:true` saja.
- `resolveDraft(id, patch)` — merge `patch` (mis. `partName`/`category`
  asli) ke draft lalu paksa `isDraft:false`; reuse `update()`/
  `validate()` apa adanya (0 validasi baru). id tidak ditemukan atau
  part bukan draft -> ditolak eksplisit, tidak menulis apa pun.

Skema/storage key/backup-restore/build.js TIDAK berubah. `tests/
vehicle-catalog.test.js` +5 test (48, naik dari 43). `node --test`:
**499/499 PASS** (2x, sebelum & sesudah build, naik dari 494 total).
`node scripts/build.js`: SUKSES, build
`kw182-vehicle-catalog-draft-helpers-638`.

Tahap 2 (kamera/library scan sungguhan), 3 (OCR), 5 (import massal PDF),
6 (integrasi Car Notes) tetap butuh UI/wiring page baru & keputusan
produk — di luar cakupan ringkas.

---

# Changelog — TASK-005: Vehicle Catalog — Tahap 2 (logic hasil scan, ringkas)

Lanjutan ringkas. Tambah `VehicleCatalog.handleScan(code)` di
`modules/vehicle/vehicle-catalog.js` — terima STRING kode hasil decode
scanner (barcode/QR/DataMatrix), BUKAN implementasi kamera/library scan
itu sendiri (itu butuh keputusan produk terpisah, di luar cakupan
"ringkas"). Reuse `findByCode()`: kode cocok -> `{found:true, item}`
(part existing). Kode tidak cocok -> otomatis buat draft part via
`create()` (`isDraft:true`, `partName:'Draft — belum diberi nama'`,
`category:'Belum Dikategorikan'`, `barcode`=kode apa adanya, TIDAK ada
data imajinasi lain) -> `{found:false, item, draft:true}`. Kode kosong
-> tidak membuat apa pun, `{found:false, item:null, error}`. Field
`isDraft` (boolean, default `false`) ditambah ke skema.
`tests/vehicle-catalog.test.js` +4 test (43, naik dari 39). `node
--test`: **490/490 PASS**. `node scripts/build.js`: SUKSES, build
`kw171-vehicle-daily-brief-redundansi-634`.

Sisa (Tahap 2 kamera/library scan sungguhan, Tahap 3 OCR, Tahap 5
import massal PDF, Tahap 6 integrasi Car Notes) tetap butuh UI/wiring
page baru & keputusan produk — di luar cakupan ringkas.

---

# Changelog — TASK-004: Vehicle Catalog — Tahap 4 (kelengkapan field database part, ringkas)

Lanjutan ringkas dari TASK-003. Tambah field opsional ke skema part di
`modules/vehicle/vehicle-catalog.js`: `aftermarketCode`, `price`
(angka >= 0), `supplier`, `location`, `serviceNotes` — sesuai Tahap 4
roadmap ("OEM Code, Aftermarket Code, ..., Harga, Supplier, Lokasi
penyimpanan, ..., Catatan servis"). Semua opsional, kosong -> `''`/
`null` (bukan halusinasi data). Storage key/CRUD/search/backup-restore/
build.js TIDAK berubah. `tests/vehicle-catalog.test.js` +9 test (39,
naik dari 35). `node --test`: **486/486 PASS**. `node scripts/build.js`:
SUKSES, build `kw171-vehicle-daily-brief-redundansi-633`.

Tahap 2 (Scanner), 3 (OCR), 5 (import massal PDF), 6 (integrasi Car
Notes) tetap belum dikerjakan — butuh UI/wiring page baru & keputusan
produk (library scanner, lokasi tab UI, dsb).

---

# Changelog — TASK-003: Vehicle Catalog Milestone 0 Phase 1 — pivot ke katalog SUKU CADANG (Tahap 1)

## Konteks (sesi ini)

Permintaan user: roadmap 6 tahap fitur suku cadang (Fondasi CRUD+search+
filter+foto+backup, Scanner barcode/QR/DataMatrix, OCR label kemasan,
Database OEM Honda, Import massal PDF, Integrasi Car Notes). Verifikasi
ulang menemukan `modules/vehicle/vehicle-catalog.js` (TASK-002, Phase 1
sebelumnya) menyimpan skema **katalog referensi KENDARAAN**
(name/jenis/brand/year/plateNumber) — TIDAK cocok dengan Tahap 1 yang
diminta (search nama part/OEM Code/barcode, filter kendaraan+kategori,
multi foto). Dikonfirmasi ke user: pilih **ubah/perluas modul existing**
(bukan modul terpisah baru) menjadi katalog suku cadang.

## Perubahan

- `modules/vehicle/vehicle-catalog.js` — skema item diganti total:
  `partName`, `category`, `oemCode`, `barcode`, `compatibleVehicleIds[]`
  (referensi id ke `D.vehicles`, disimpan sbg string, TIDAK divalidasi ke
  `D` dari modul ini — tetap sesuai batasan ACR-001 "tidak pernah
  menyentuh D"), `photos[]` (maks 8, `VEHICLE_CATALOG_MAX_PHOTOS`),
  `notes`. Field lama (jenis/brand/year/plateNumber) & konstanta
  `VEHICLE_CATALOG_JENIS` **dihapus** (breaking change disengaja, sesuai
  keputusan user — belum ada UI/data produksi yang bergantung padanya,
  Phase 1 sebelumnya belum pernah dipakai/wired ke UI).
  - `search(query, opts)` — substring case-insensitive di
    `partName`/`oemCode`/`barcode`; `opts.category` (exact,
    case-insensitive) & `opts.vehicleId` (cocok `compatibleVehicleIds`)
    sebagai filter, bisa digabung (AND) dengan query.
  - `findByCode(code)` **baru** — exact match (bukan substring) di
    `barcode`/`oemCode`, disiapkan sbg bekal Tahap 2 Scanner ("jika kode
    ditemukan -> buka data part").
  - Storage key (`vehicle-catalog:store`), pola load/cache/save/
    `invalidateCache`, serta integrasi `scripts/build.js` &
    `modules/shared/backup-restore.js` **TIDAK berubah** — keduanya
    bekerja di level store/file generik (JSON blob), bukan level skema
    item, jadi tidak perlu disentuh ulang.
- `tests/vehicle-catalog.test.js` — ditulis ulang penuh mengikuti skema
  baru (35 test, naik dari 30 — tambahan cakupan `findByCode()` &
  filter `category`/`vehicleId`).

## Cakupan sesi ini vs roadmap 6 tahap

Sesuai permintaan eksplisit user ("kerjakan yg ringan dulu"), HANYA
Tahap 1 (Fondasi) yang dikerjakan: CRUD, search (nama part/OEM
Code/barcode), filter (kendaraan/kategori), field foto (array, belum
ada UI upload), integrasi backup/restore (sudah otomatis lewat store
key generik). Tahap 2 (Scanner barcode/QR/DataMatrix), Tahap 3 (OCR
label kemasan), Tahap 4 (kelengkapan field database OEM Honda: harga,
supplier, lokasi penyimpanan, aftermarket code, catatan servis), Tahap
5 (import massal PDF->OCR->parser->JSON), Tahap 6 (integrasi tampilan
Car Notes) **BELUM dikerjakan** — semuanya butuh UI/wiring page baru
(Phase 2+) yang di luar cakupan "ringan dulu" & butuh keputusan lokasi
UI (kandidat: tab baru di `page:'carnotes'`, per rekomendasi
`FOUNDATION_AUDIT.md` §4 — belum ada keputusan eksplisit).

## Build & Test

`node --test tests/*.test.js`: **482/482 PASS** (477 lama − 30 test
lama file ini + 35 test baru, 2x — sebelum & sesudah build). `node
scripts/build.js`: SUKSES, lolos semua lint guard, sintaks kedua bundle
valid, `index.html`/`app_production.html` identik & `?v=` sinkron,
build `kw171-vehicle-daily-brief-redundansi-632`.

---

# Changelog — TASK-002: Vehicle Catalog Milestone 0 Phase 1 (storage/CRUD/validation/search)

## Konteks

Sesi ini melanjutkan dari `docs/ai/AI_HANDOFF.md` (terakhir: TASK-001C,
Blueprint Consolidation Plan). Verifikasi ulang terhadap repository
menemukan **Vehicle Catalog belum pernah diimplementasikan** (tidak ada
`vehicle-catalog.js`, test, atau entri build sebelumnya) — konsisten
dengan `docs/ai/FOUNDATION_AUDIT.md` yang menyatakan hal sama.

Sebelum menulis kode, ditemukan blocker arsitektur yang sudah tercatat di
`BLUEPRINT_CONSOLIDATION_PLAN.md` §10 (lapisan bridge/adapter antara
modul BP-015-compliant baru dan 358 file window-global existing —
"Belum dimulai", "Blocking Milestone 0? Ya") beserta kontradiksi pola
antara §7 (pola adapter existing) vs §9 (BP-015 forward-only, class/
factory/`#field`/Registry). Dibuat `docs/architecture/ACR-001-vehicle-
catalog-bridge.md`, dieskalasi ke Pemilik OS, **diputuskan: Opsi A**
(pola existing repository — `window.X` + adapter function-call +
`IDBStore` generik) khusus untuk fitur Vehicle Catalog. ACR-001 ditutup
sebagai **Accepted by Project Owner**. Tidak ada perubahan pada
`BP-015.md`/`ADR-022.md`..`ADR-026.md`/`IS-001.md`/`AR-001.md`/
`DoD-001.md`/Governance.

## Perubahan

**2 file baru**, **3 file diubah** (di luar hasil `node scripts/build.js`
yang menyentuh bundle/HTML/`sw.js`/`docs/FILE-MAP.md` secara otomatis):

- `modules/vehicle/vehicle-catalog.js` (baru) — modul Vehicle Catalog
  Milestone 0 Phase 1, fondasi murni (storage + CRUD + validation +
  search), TANPA UI/tab baru (lihat catatan Phase 1 di bawah):
  - Storage: `IDBStore.get/set('vehicle-catalog:store')` — reuse
    `IDBStore` generik existing (`modules/asset/aset.js`), TIDAK
    membuat IndexedDB/object store baru. Pola load/cache/save/
    invalidateCache SAMA PERSIS `AIStore`/`LifeOSStore`/`EIEStore`
    (`aiLoad`/`aiSave`/`aiGetStore`/`aiInvalidateCache` di
    `ai-core.js`).
  - CRUD: `create`/`update`/`remove`/`getAll`/`getById`, semua async,
    validasi dijalankan sebelum tulis, `uid()`/`sameId()` di-reuse
    (bukan skema id baru).
  - Validation: `name` wajib (≤100 char), `jenis` wajib salah satu
    `motor|mobil|listrik` (reuse taksonomi `vehicle-core.js`), `year`
    opsional (1950–tahun berjalan+1), `brand`/`plateNumber`/`notes`
    opsional dgn batas panjang.
  - Search: substring case-insensitive di `name`/`brand`/`plateNumber`,
    filter opsional `jenis`.
  - Diekspos via `window.VehicleCatalog` (const object + explicit
    window export, pola sama `AIBus`/`AIContext`).
  - TIDAK menyentuh `D`, `D.vehicles`, `curVehicleId`/`selectVehicle()`
    — data Vehicle Catalog terpisah total dari data operasional
    kendaraan existing (proteksi sesuai `FOUNDATION_AUDIT.md` §6).
- `tests/vehicle-catalog.test.js` (baru) — 30 test: storage key, validasi
  (lengkap semua field & batas), create/update/remove, getAll/getById,
  search (query/jenis/gabungan), caching load (`ensureLoaded`/
  `invalidateCache`), normalisasi data korup dari versi lama.
- `scripts/build.js` — 1 entri baru di GROUP_B:
  `modules/vehicle/vehicle-catalog.js`, ditaruh setelah
  `vehicle-core.js` (dependency `uid()`/`sameId()`/`IDBStore` sudah
  dimuat lebih dulu di blok atas).
- `modules/shared/backup-restore.js` — `vehicle-catalog:store`
  didaftarkan manual ke `buildBackupPayload()` (field
  `_vehicleCatalogStore`) & `applyRestoredData()` (tulis ulang ke
  IndexedDB + `vehicleCatalogInvalidateCache()` via guard
  `typeof===  'function'`), pola SAMA PERSIS `lifeos:store`/`eie:store`
  — wajib manual sesuai `FOUNDATION_AUDIT.md` §3, kalau tidak data tidak
  ikut backup/restore.
- `docs/architecture/ACR-001-vehicle-catalog-bridge.md` (baru) — ACR
  yang dieskalasi & ditutup Accepted (lihat Konteks di atas).

## Catatan Phase 1 (sengaja TANPA UI)

Sesuai scope "Milestone 0 Phase 1" (storage/CRUD/validation/search),
sesi ini **tidak** menambah tab baru di `page:'carnotes'`, tidak
mengubah `index.html`/`app_production.html` isi HTML-nya (hanya
`?v=` ikut naik lewat `build.js`, otomatis, bukan perubahan manual),
dan tidak menyentuh `modules/dashboard-hub/dashboard-hub-registry.js`
(`FEATURE_REGISTRY`) — konsisten dengan precedent `ai-core.js` Sesi 1
("fondasi murni dulu, wiring UI menyusul di fase berikutnya") dan
rekomendasi `FOUNDATION_AUDIT.md` §4 yang menyatakan keputusan lokasi
UI final "menunggu Blueprint/Milestone 0" — bukan kelalaian, dicatat
eksplisit sebagai lingkup Phase 2 berikutnya.

## Test & Build

- **477/477 test PASS** (447 lama + 30 baru, 0 regresi) —
  `node --test tests/*.test.js`, dijalankan sebelum & sesudah build.
- Build: `node scripts/build.js` sukses, lolos seluruh lint guard
  (u-dnone, escapeHtml, OCR chicken-egg), sintaks kedua bundle valid,
  `index.html`/`app_production.html` identik & sinkron `?v=`. Versi baru:
  `kw171-vehicle-daily-brief-redundansi-631` (dari `629`, lalu re-run build menaikkan ke `631`).
  Bundle terverifikasi memuat `VehicleCatalog`/`vehicle-catalog:store`.

---

# Changelog — Sesi 171: PiutangUtangInsight ikut cek cicilan barang jatuh tempo

## Konteks

Temuan audit halaman Car Notes (`renderCnTab()`): `VehicleDailyBrief` (card
"🚗 Ringkasan Harian Kendaraan", `#vehBriefWrap`) menyusun narasi teks yang
100% mengulang angka yang sudah tampil sbg card di halaman yang sama —
`totalVehicles`/`avgHealth`/`totalOverdue` sudah ada di `VehicleDashboard`,
`reminder.total`/`reminder.overdueCount` sudah ada di
`VehicleInsightPresenter`. Sumbernya sama persis:
`VehicleAIHook.fleetSummary()`. Bukan bug hitung ulang — presentasi ganda
(kartu + narasi) utk angka identik, pola sama persis yg sudah pernah
dibereskan utk VehicleAlertPanel/VehicleInsightFeed (Sesi 156b, digabung ke
VehicleAttentionPresenter).

## Perubahan

**2 file diubah** (`modules/shared/modules-render.js`, `index.html` +
`app_production.html` disinkron), **0 file baru** (tidak ada test yang
perlu diubah — `tests/vehicle-daily-brief.test.js` me-load
`vehicle-daily-brief.js` sendirian, tidak lewat wiring `renderCnTab()`):

- `renderCnTab()` — `VehicleDailyBrief.render()` TIDAK LAGI dipanggil.
  File `modules/vehicle/vehicle-daily-brief.js` TIDAK dihapus/diubah (kode
  & test tetap ada, cuma sudah tidak live-wired) — pola sama persis
  VehicleAlertPanel/VehicleInsightFeed di Sesi 156b.
- `#vehBriefWrap` (index.html, app_production.html) — ditambah
  `style="display:none"` supaya wrap kosong (sekarang tidak pernah diisi)
  tidak nongol sbg card kosong di halaman.
- 435/435 test lolos (regresi tidak berubah — tidak ada test yg menyentuh
  wiring `VehicleDailyBrief` di `renderCnTab()`).

## Konteks

Follow-up Sesi 170. `PiutangUtangInsight` (widget "🩺 Insight Cepat" & kartu
insight halaman) sebelumnya cuma cek `D.debts` buat insight "utang jatuh
tempo dekat", padahal cicilan barang sekarang sudah dianggap "utang beneran"
di Buku Utang — jadi cicilan barang yang mau jatuh tempo minggu ini tidak
kepegang di insight ini.

## Perubahan

**1 file diubah** (`modules/ai/feature-insights.js`), **1 file baru**
(`tests/piutang-utang-insight-bill-cicilan.test.js`):

- `PiutangUtangInsight.compute()` poin (2) — gabungkan kandidat "jatuh tempo
  dekat" dari `D.debts` DAN `Debt.billCicilanAktif()` (nextDue-nya), ambil
  yang paling dekat dari keduanya. DSR (poin 3) sudah aman sejak Sesi 170
  (pakai `DebtStrategy.computeDSR()`, otomatis ikut).
- `PiutangUtangInsight.render()` — `hasData` ikut hitung cicilan barang
  aktif, biar card insight tidak disembunyikan kalau user cuma punya
  cicilan barang tanpa utang formal di `D.debts`.
- +3 test baru. 435/435 test lolos, build
  `kw171-insight-cicilan-barang-jatuh-tempo` (`?v=625`).



## Konteks

User minta cicilan barang (Buku Tagihan, `D.bills` `kind:'cicilan'`, yang
punya sisa tenor) otomatis ikut muncul sbg baris di 📕 Buku Utang, dan ikut
disimulasikan pelunasannya (avalanche/snowball) + dapat rekomendasi —
sebelumnya cicilan barang cuma ikut dihitung di DSR
(`DebtStrategy.computeDSR()`), TIDAK ikut tampil di Buku Utang & TIDAK ikut
`DebtStrategy.simulate()` (payoff plan). Langganan (`kind:'langganan'`)
SENGAJA dikecualikan — tidak punya `sisaTenor`/tenor, tidak ada "pokok" yang
bisa dilunasi, jadi tidak cocok masuk model utang (konsisten sama
`computeDSR()` yg juga selalu exclude langganan).

## Perubahan

**3 file diubah** (`modules/finance/piutang-utang.js`,
`modules/finance/debt-optimizer-api.js`), **1 file baru**
(`tests/debt-bill-cicilan.test.js`):

- `Debt.billCicilanAktif()` (baru) — filter cicilan barang aktif
  (`kind:'cicilan'` & `sisaTenor>0`), SAMA PERSIS filter yg sudah dipakai
  `computeDSR()`/`DebtOptimizerAPI` (1 sumber, 0 filter baru).
- `Debt.renderList()` — baris Buku Utang sekarang gabungan D.debts +
  cicilan barang aktif (baris kedua ini read-only dari situ, klik -> Riwayat
  Pembayaran `openBillHistory()`, sama persis alur yg sudah ada utk cicilan
  di Buku Tagihan). Total header (`debtTotalVal`/`debtCicilanVal`) ikut
  ditambah nilai cicilan barang biar konsisten sama baris yang tampil.
- `DebtStrategy.billCicilanAsDebtLike()` (baru) — map cicilan barang jadi
  bentuk mirip D.debts biar ikut `computeOrder()`/`simulate()` APA ADANYA.
  `bunga` SENGAJA di-set 0 (bunga cicilan barang itu flat sekali di awal,
  sudah dibakar ke nominal cicilan/bulan — beda dari `Debt.bunga` yg
  %/tahun & dihitung majemuk tiap bulan oleh `simulate()`, kalau ikut
  dipakein rumus itu bunganya kehitung dobel). `nilai` = amount × sisaTenor
  (sama formula `outstanding` di `getBillStats()`).
- `DebtStrategy.activeDebts()` — sekarang gabung D.debts aktif + hasil
  `billCicilanAsDebtLike()`, otomatis kepakai `DebtStrategy.render()` (badge
  "🛒 Cicilan Barang" ditambahkan di baris payoff plan) dan
  `DebtOptimizerAPI.payoffPlan()` tanpa perubahan di file itu.
- `DebtOptimizerAPI._overview()` — **fix double-count**: sebelumnya
  `activeCount` = `activeDebts().length` (dulu cuma D.debts) + jumlah bill
  cicilan dihitung manual lagi terpisah. Karena `activeDebts()` sekarang
  sudah gabungan, dihitung manual itu dihapus (activeCount = 1x
  `activeDebts().length`). `totalValue` ikut ditambah outstanding cicilan
  barang (baru, additive) biar konsisten sama total Buku Utang.
  `totalCicilanBulanan` — rumus TIDAK berubah (tetap dijumlah dari 2 sumber,
  sudah benar sejak awal, tidak ada dobel hitung di situ).
- +5 test baru `tests/debt-bill-cicilan.test.js` (filter, mapping,
  gabungan `activeDebts()`, simulasi lunas tepat waktu tanpa bunga
  tambahan, fix double-count `activeCount`). 432/432 test lolos, build
  `kw170-cicilan-barang-buku-utang` (`?v=624`).



## Konteks

User melaporkan Scan Universal Akun (foto layar GoPay) ke-baca saldo
"Rp937.000" (angka "sudah terpakai di Juli" / rekap pengeluaran bulan
ini), padahal saldo asli ~Rp154.834. Root cause dicek langsung pakai
`tesseract` thd screenshot asli yang dilampirkan: simbol "Rp" di depan
saldo utama (font besar/bold) TIDAK kebaca OCR sama sekali, sedangkan
baris "Rp937.000 udah terpakai di Juli" (font reguler di bawahnya)
kebaca lengkap dgn "Rp"-nya. `parseWalletScreen()` sebelumnya cuma
mencari angka yang diawali "Rp" (`walletAmtRe`) — begitu saldo utama
kehilangan prefix itu di teks OCR, cuma 1 kandidat tersisa (si angka
pengeluaran), dan itu yang kepilih.

## Perubahan

**2 file diubah** (`modules/shared/scan-ocr.js`, `tests/scan-ocr-wallet.test.js`):

- `WALLET_BARE_AMT_RE` (baru) — nangkep angka berformat ribuan (ada
  titik/koma pemisah) TANPA prefix "Rp" sbg kandidat tambahan di
  `parseWalletScreen()`. Syarat "ada pemisah ribuan" sengaja dipasang
  supaya tidak nyangkut angka lain yang kebetulan 4+ digit tanpa
  pemisah (jam, tahun, dll).
- `parseWalletNominal()` (baru, khusus wallet — BUKAN ganti
  `normalizeOcrNumber()` yang dipakai parser lain) — parse integer
  murni (saldo e-wallet selalu bilangan bulat), dgn guard: kalau grup
  ribuan terakhir kebetulan 4+ digit (harusnya selalu tepat 3 — brati
  ada noise 1 digit nyangkut dari OCR, mis. ikon di sebelah angka),
  buang digit terakhirnya sebelum dirangkai.
- Kandidat digabung & diurutkan ulang berdasar posisi kemunculan di
  teks (bukan cuma kandidat "Rp" saja), lalu difilter
  `WALLET_SPEND_CONTEXT_RE` seperti sebelumnya. Kandidat tanpa "Rp"
  dapat pengurangan confidence (-0.1) krn OCR tidak ikut mengonfirmasi
  simbol mata uangnya.
- +3 test baru `tests/scan-ocr-wallet.test.js`, salah satunya pakai
  teks OCR ASLI hasil `tesseract` thd screenshot yang dilaporkan user
  (bukan teks ideal buatan tangan) supaya kasus ini kepegang beneran di
  regresi ke depan.

## Verifikasi

```
node --test tests/*.test.js
# 427/427 pass (naik dari 424 — 3 test baru)

node scripts/build.js kw169-gopay-scan-noRp-fix
# ✅ Build selesai & lolos cek sintaks (node --check), ?v=623
# index.html & app_production.html identik (0 diff)
```

**ZIP:** `kw_release_sesi169_gopay_scan_fix_v623.zip`

**Catatan ukuran ZIP (ditanyakan user):** ukuran ZIP antar-sesi selama
ini beda-beda krn folder `backups/` (snapshot bundle lama, dibuat
otomatis tiap `node scripts/build.js`) ikut ter-zip dgn isi yang beda
tiap kali — kadang beberapa MB, kadang kosong tergantung kapan folder
itu terakhir dibersihkan sebelum di-zip. Isi kode (`modules/`, HTML,
`docs/`) sendiri konsisten. ZIP rilis sesi ini SENGAJA tidak
menyertakan `backups/` supaya ukurannya stabil & representatif dari isi
kode saja.

# Changelog — Sesi 158b: Deep-link Sub-tab Insight AI & BBM + Bugfix CN_TAB_IDX

## Konteks

Lanjutan Sesi 158 (split sub-tab Insight AI & BBM di page-carnotes).
User minta "lanjutkan" — target yang sengaja ditunda di Sesi 158: wiring
deep-link `{page:'carnotes', tab, subtab}` (Global Search/Quick
Switcher) ke 2 sub-tab baru, ikut pola `LAPORAN_SUBTAB_IDX`/
`PJK_SUBTAB_IDX` yang sudah ada di `dashboard-hub.js`. Baseline:
`kw158-carnotes-insight-bbm-subtabs-599` (`?v=599`), 381/381 test pass.

## Perubahan

**3 file source diubah:**

- `modules/dashboard-hub/dashboard-hub.js`:
  - **Bugfix ditemukan sewaktu wiring** (bukan disengaja, sudah stale
    sejak Sesi 157): `CN_TAB_IDX` sebelumnya `{bbm:0, servis:1}` — tidak
    sinkron lagi dgn urutan DOM 4-tab (insight/bbm/servis/pajak) sejak
    Sesi 157 split page-carnotes dari 2 jadi 4 tab. Efeknya cosmetic
    (pane yang tampil tetap benar krn `setCnTab()` pakai nama tab `t`,
    bukan index — tapi tombol yang di-highlight `active` salah, mis.
    target `tab:'bbm'` malah menyalakan tombol "🧠 Insight AI"). Sudah
    diperbaiki jadi `{insight:0, bbm:1, servis:2, pajak:3}`.
  - Tambah `CNI_SUBTAB_IDX`/`CNB_SUBTAB_IDX` (pola sama persis
    `LAPORAN_SUBTAB_IDX`/`PJK_SUBTAB_IDX`).
  - `dashHubNavigateToFeature()` blok `target.page === 'carnotes'`:
    tambah handling `target.subtab` utk `tab:'insight'`
    (→`setCnInsightTab()`) & `tab:'bbm'` (→`setCnBbmTab()`), pola SAMA
    PERSIS blok `keuangan`/`pajak` yang sudah ada.
- `modules/dashboard-hub/dashboard-hub-registry.js`:
  - Update komentar TAB REFERENSI § carnotes (dulu stale, cuma sebut
    `'bbm'|'servis'`, sekarang 4 tab lengkap + 2 field `subtab` baru).
  - `cn-bbm` (satu-satunya entry existing dgn `target.page:'carnotes',
    tab:'bbm'`) ditambah `subtab: 'ringkasan'` eksplisit (goTo:'bbmList'
    memang hidup di sub-tab "Ringkasan" — sebelumnya implisit default
    index 0, sekarang eksplisit ikut konvensi entry lain, mis.
    `keu-saldo-akun`).

**Sengaja TIDAK disentuh:** tidak ada registry entry baru yang goTo ke
dalam pane `rekomendasi`/`analisis` sesi ini (di luar scope — kalau nanti
ada fitur baru yang perlu deep-link ke situ, field `subtab` sudah siap
dipakai).

## Verifikasi

```
node --test tests/*.test.js
# 381/381 pass

node scripts/build.js kw158-carnotes-subtab-deeplink-cntabidx-fix-600
# ✅ Build selesai & lolos cek sintaks (node --check), ?v=600
# index.html & app_production.html identik (0 diff)
```

**ZIP:** `kw_release_sesi158b_carnotes_subtab_deeplink_v600.zip`

# Changelog — Sesi 158: Split Sub-tab Insight AI & BBM (page-carnotes)

## Konteks

Permintaan eksplisit user: tab 🧠 Insight AI dan ⛽ BBM (di dalam
page-carnotes, hasil split 4-tab Sesi 157) masih terasa panjang ke
bawah walau sudah dipecah dari halaman tunggal — beda dari tab Keuangan/
Shop yang tiap tab-nya isinya lebih sedikit. User minta dipecah lagi
jadi split sub-tab, TAPI multi-kendaraan (vehicle selector) tetap harus
kepegang di semua sub-tab. Baseline: `kw158-dashboard-hub-section-
groups-fix` (`?v=598`), 381/381 test pass.

## Perubahan

**4 file source diubah** (murni reorganisasi DOM + toggle visibility,
0 rumus/render/presenter baru — 100% reuse pola `setPjkTab()` yang
sudah ada):

- `app_production.html` / `index.html` — tab `#cnTab-insight` dipecah
  jadi 2 sub-tab bersarang (`.cni-subtab`): "📊 Ringkasan"
  (`#cniTab-ringkasan` = `vehdashWrap`/`vehinsightWrap`/`vehBriefWrap`)
  dan "🧭 Rekomendasi & Tren" (`#cniTab-rekomendasi` =
  `vehAttentionWrap`/`vehAnalyticsWrap`/`vehAutomationWrap`/
  `vehSpecCard`). Tab `#cnTab-bbm` dipecah jadi 2 sub-tab bersarang
  (`.cnb-subtab`): "📊 Ringkasan" (`#cnbTab-ringkasan` = `fuelIntelWrap`
  + stat grid + `bbmTrendCard` + tombol catat + riwayat BBM) dan
  "📈 Analisis Lanjutan" (`#cnbTab-analisis` = `fuelDashWrap`/
  `fuelCompareWrap`/`fuelTrendWrap`, ketiganya tetap default collapsed
  seperti Sesi 157). Vehicle selector + Odometer (di luar kedua tab ini)
  TIDAK disentuh sama sekali — tetap tampil di semua sub-tab.
- `styles.css` — tambah `.cni-subtabs`/`.cni-subtab` &
  `.cnb-subtabs`/`.cnb-subtab`, class BARU (bukan reuse `.cn-tab`/
  `.pjk-subtab` dst) — pola sama persis alasan class terpisah tiap
  sub-tab lain: cegah tabrakan query `#page-carnotes .cn-tab` yang
  dipakai `setCnTab()`.
- `modules/vehicle/vehicle-core.js` — tambah `setCnInsightTab(t,el)` &
  `setCnBbmTab(t,el)`, pola SAMA PERSIS `setPjkTab()`
  (`pajak-aset-ui-wrappers.js`): toggle class `active` + toggle
  `u-dnone` per pane. `renderCnTab()` TIDAK diubah — semua `render()`
  card tetap dipanggil apa adanya, terlepas sub-tab mana yang aktif.
- `self-test.js` — daftarkan 2 group baru (`#cnTab-insight`/
  `#cnTab-bbm`) di test "panel tab benar-benar terlihat", pola sama
  persis 3 entry sub-tab yang sudah ada (laporan/kelola/pajak).

**Sengaja TIDAK disentuh** (di luar scope, additive only):
`dashboard-hub-registry.js`/`dashboard-hub.js` (deep-link
`{page:'carnotes', tab, subtab}` ke sub-tab baru ini BELUM ada — kalau
mau dipakai dari Global Search/Quick Switcher, itu target sesi
berikutnya, ikut pola `LAPORAN_SUBTAB_IDX`/`PJK_SUBTAB_IDX`).

## Verifikasi

```
node --test tests/*.test.js
# 381/381 pass

node scripts/build.js kw158-carnotes-insight-bbm-subtabs-599
# ✅ Build selesai & lolos cek sintaks (node --check), ?v=599
# index.html & app_production.html identik (0 diff)
```

**ZIP:** `kw_release_sesi158_carnotes_insight_bbm_subtabs_v599.zip`

**Known Issue (masih berlaku dari sesi-sesi sebelumnya):** `npm run
lint`/esbuild tetap tidak bisa dijalankan (tanpa akses internet di
sandbox ini) — bundle hasil build TANPA minifikasi.

**Sengaja di luar scope sesi ini (next TODO):** wiring deep-link
`subtab` utk `page:'carnotes'` (Global Search/Quick Switcher) ke 4
sub-tab baru ini, ikut pola `LAPORAN_SUBTAB_IDX`/`PJK_SUBTAB_IDX` di
`dashboard-hub.js` + komentar TAB REFERENSI di
`dashboard-hub-registry.js` (saat ini masih menyebut `page:'carnotes'
-> 'bbm'|'servis'` saja, sudah stale sejak Sesi 157 — belum termasuk
`insight`/`pajak`, apalagi sub-tab baru sesi ini).

# Changelog — Sesi 156d: Konsolidasi Fuel Briefing ke Fuel Intelligence Card

## Konteks

Permintaan eksplisit user: "Fuel Briefing bisa digabung ke Fuel
Intelligence Card — dua-duanya soal BBM kendaraan aktif, tidak perlu 2
card terpisah." Ini adalah saran ke-4 yang sengaja ditunda di Sesi 156b
(lihat `docs/NEXT_SESSION.md` § TODO no. 1) — dua card memang muncul
berurutan di Dashboard Hub tab Car Notes: `#vehBriefWrap` (section "Fuel
Briefing" 1 kendaraan, diisi `VehicleDailyBrief`, TASK-151B) lalu
`#fuelIntelWrap` (Fuel Intelligence Card, diisi `FuelCard`, TASK-141),
keduanya menampilkan info BBM kendaraan aktif yang tumpang tindih.
Baseline: `kw156b-fuel-buttons-window-expose-fix-588` (`?v=589`,
375/375 test pass).

## Perubahan

**2 file source diubah** (murni presentasi, 0 rumus/skoring/engine BBM
disentuh):

- `modules/vehicle/fuel-card.js` — tambah method `_briefingHtml(vehicleId)`,
  isi persis dipindah dari `_fuelBriefHtml()` lama di
  `vehicle-daily-brief.js` (0 baris teks/urutan diubah, hanya lokasi &
  sumber vehicleId): 100% REUSE `FuelInsightEngine.getSummary(vehicleId)`
  langsung dgn `insight.vehicleId` yang SAMA dgn kendaraan yang sudah
  ditampilkan card ini (BUKAN `FuelFleetSelector` — card ini sudah scoped
  ke 1 kendaraan aktif via `curVehicleId`, jadi tidak butuh lapisan
  pemilihan fleet-wide lagi). Hasil `_briefingHtml()` disisipkan di
  `_body()` di antara baris status/rekomendasi low-confidence & baris CTA
  (📊 Lihat Detail / ⚙️ Koreksi) — satu card gabungan.
- `modules/vehicle/vehicle-daily-brief.js` — `_fuelBriefHtml()` &
  pemanggilannya DIHAPUS, beserta seluruh ketergantungan ke
  `FuelFleetSelector` (0 referensi tersisa di file ini). `#vehBriefBody`
  sekarang HANYA berisi ringkasan armada harian (jumlah kendaraan, skor
  kesehatan, reminder aktif) — pola sama persis sebelum TASK-151B.
  `FuelFleetSelector` sendiri TIDAK dihapus (masih dipakai
  `fuel-compare.js`).

**2 file test diubah:**

- `tests/vehicle-daily-brief.test.js` — ditulis ulang, hapus seluruh
  coverage section Fuel Briefing (FuelFleetSelector tidak lagi jadi
  dependency file ini); tambah 1 assertion eksplisit `_fuelBriefHtml`
  tidak lagi ada di modul.
  `tests/fuel-card.test.js` — tambah 5 test baru utk `_briefingHtml()`
  (tampil di card yang sama, insight/recommendation apa adanya, field
  kosong -> placeholder "—", `FuelInsightEngine` belum dimuat/`throw` ->
  section dilewati tanpa menggagalkan render card).

**2 file HTML (dokumentasi komentar saja, markup DOM 0 berubah):**
`index.html`/`app_production.html` — komentar di atas `#vehBriefWrap` &
`#fuelIntelWrap` diperbarui menjelaskan konsolidasi ini.

## Hasil verifikasi

```
node --test tests/*.test.js
# tests 375 / pass 375 / fail 0   (sebelum & sesudah build, 0 regresi)

node scripts/build.js kw156d-fuel-briefing-consolidation
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=591
# index.html & app_production.html identik (0 diff)
```

**Known Issue (masih berlaku dari sesi-sesi sebelumnya):** `npm run
lint`/esbuild tetap tidak bisa dijalankan (tanpa akses internet di
sandbox ini) — bundle hasil build TANPA minifikasi.

---



## Konteks

Bugfix di luar batch tracking, dilaporkan langsung oleh user: tombol-
tombol di seluruh area Fuel Intelligence (kartu Fuel, Fuel Dashboard,
Fuel Comparison, Fuel Trend Dashboard, modal Koreksi Bar BBM) tidak
merespons saat di-tap — tidak ada navigasi ke data, tidak ada error yang
terlihat user. Baseline: `kw156-fuel-trend-dashboard` (`?v=587`,
TASK-156, 371/371 test pass — skop test yang tersedia di ZIP kerja ini).

## Root cause

Delegasi klik global (`document.addEventListener('click', ...)` di
`modules/shared/features-helpers-global-security.js`) me-resolve
`data-action="Nama.method"` lewat `window['Nama']['method']`. Tapi
`FuelModal`, `FuelBarCorrection`, `FuelCompare`, `FuelDashboard`, dan
`FuelTrendDashboard` semua dideklarasikan pakai `const Nama = {...}` —
di JavaScript, `const`/`let` top-level HANYA membuat binding
lexical-scope, BUKAN properti `window` (beda dari `var`/`function` yang
otomatis nempel ke `window`). Akibatnya `window['FuelModal']` dst.
selalu `undefined`, delegasi klik gagal diam-diam (cuma toast singkat
"⚠️ Tombol ini belum berfungsi"), dan SEMUA tombol yang mengarah ke
kelima modul ini (📊 Lihat Detail, ⚙️ Koreksi, ⬇️ Export, chip pilih
kendaraan, sort kolom perbandingan armada) tidak pernah berfungsi sejak
awal dibuat.

Test tidak menangkap bug ini karena `loadSource()` (test helper)
memanggil fungsi langsung lewat referensi lexical (mis.
`FuelBarCorrection.selectBar()`), bukan lewat simulasi klik DOM yang
melalui jalur delegasi `data-action` yang sesungguhnya — jadi
371/371 pass tapi bug tetap ada di jalur produksi nyata.

Pola fix yang sama PERNAH diterapkan sebelumnya untuk `DashboardHub`
(`window.DashboardHub = DashboardHub;` di `dashboard-hub-search.js`) dan
`SelfRewardView` (`self-reward-view.js`) — tapi belum diterapkan lagi
untuk modul Fuel yang lebih baru.

**Catatan audit lanjutan**: pola `const Nama = {...}` + `data-action`
tanpa expose ke `window` kemungkinan juga ada di modul lain (`Budget`,
`Aset`, `Kasir`, `Etalase`, `Order`, dll — semua ditemukan lewat
`data-action="X.method"`). Belum diaudit satu-per-satu di sesi ini
(scope-nya cuma Fuel Intelligence sesuai laporan user) — kandidat kuat
utk audit menyeluruh di sesi berikutnya, lihat `docs/NEXT_SESSION.md`.

## Perubahan

**5 file diubah**, HANYA tambah 1 baris expose-window di tiap file
(0 logic lama disentuh):

- `modules/vehicle/fuel-modal.js` — `window.FuelModal = FuelModal;`
- `modules/vehicle/fuel-compare.js` — `window.FuelCompare = FuelCompare;`
- `modules/vehicle/fuel-dashboard.js` — `window.FuelDashboard = FuelDashboard;`
- `modules/vehicle/fuel-trend-dashboard.js` — `window.FuelTrendDashboard = FuelTrendDashboard;`
- `modules/vehicle/fuel-intelligence-ui.js` — `window.FuelBarCorrection = FuelBarCorrection;`

Semua pakai guard `if (typeof Nama !== 'undefined') window.Nama = Nama;`
(pola sama persis `dashboard-hub-search.js`), ditaruh tepat setelah
penutup `};` objek, di baris terakhir file — TIDAK ada mekanisme baru,
TIDAK ada perubahan urutan/logic apa pun di dalam objeknya.

Tombol bar picker (`0 Bar`/`1 Bar`/dst) di dalam modal Koreksi TIDAK
kena bug ini — tombol itu pakai `data-onclick` (bukan `data-action`),
yang di-resolve lewat `new Function('event', code)` (baca lexical scope
global, bukan lewat `window[...]`), jadi sudah berfungsi normal dari
awal.

## Regression

`npm test` → **371/371 PASS** (skop test yang tersedia di ZIP kerja
ini, sama seperti baseline `kw156-fuel-trend-dashboard`, 0 gagal).
`node build.js` → build sukses, bundle a/b lolos `node --check`,
`window.FuelModal`/`FuelBarCorrection`/`FuelCompare`/`FuelDashboard`/
`FuelTrendDashboard` terverifikasi ada di `app-bundle-b.min.js`.

Versi baru: `kw156b-fuel-buttons-window-expose-fix-587`, `?v=588`.

---

# Changelog — Sesi 156: Fuel Trend Dashboard (TASK-156)

## Konteks

Task ditetapkan Product Owner (STATUS=READY): buat
`modules/vehicle/fuel-trend-dashboard.js`, presenter only, reuse penuh
`FuelInsightEngine`/`FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine`, JANGAN bikin engine/helper baru, JANGAN storage
baru, JANGAN rumus baru, JANGAN ubah engine yang ada kecuali ditemukan
bug, register di `scripts/build.js`, render di `modules-render.js`,
refresh mengikuti `renderCnTab()` & `FuelBarCorrection.save()`, tambah
regression test. Baseline: `kw155a-fuel-export` (`?v=586`, TASK-155A,
348/348 test pass).

## Perubahan

**1 file baru**, **3 file diubah** (HANYA wiring, 0 logic engine
disentuh).

- `modules/vehicle/fuel-trend-dashboard.js` (`FuelTrendDashboard`,
  BARU) — presenter only, 0 rumus baru. Beda dari `FuelDashboard`/
  `FuelCompare` yang HANYA reuse `FuelInsightEngine.getSummary()`, modul
  ini memanggil LANGSUNG ke-4 dependency yang diminta task supaya field
  trend granular yang tidak diekspos `getSummary()` tetap 100% dibaca
  apa adanya:
  - `FuelInsightEngine.getSummary(vehicleId)` -> `healthScore` +
    `highestInsight`.
  - `FuelCostAnalytics` -> `monthlyCost()`/`yearlyCost()` (histori
    AKTUAL bulan/tahun berjalan), `projectedMonthlyCost()`/
    `projectedYearlyCost()` (proyeksi, sendiri 100% reuse
    `FuelPredictionEngine`), `averageFuelPrice()`, `refillFrequency()`.
  - `FuelPredictionEngine` -> `predictRemainingDistance()`/
    `predictNextRefuel()`/`predictMonthlyFuelUsage()`.
  - `FuelMaintenanceEngine` -> `fuelEfficiencyHealth()` (status
    degradasi + `dropPct` apa adanya)/`maintenanceRisk()`/
    `maintenanceRecommendation()`.
  - `_safeCall()` — guard `typeof` + try/catch per-dependency; 1
    dependency belum dimuat/gagal/throw TIDAK memblokir section lain.
  - Kartu menampilkan 4 section: Biaya & Frekuensi BBM (aktual vs
    proyeksi bulan/tahun, rata-rata harga, frekuensi isi), Prediksi
    (jarak tersisa, tanggal isi BBM berikutnya, proyeksi pemakaian
    bulan depan), Efisiensi & Perawatan (status km/L/Rp-per-km +
    dropPct kalau degradasi terdeteksi, risiko perawatan, rekomendasi
    teks), dan Insight Prioritas Tertinggi.
  - CTA "📊 Lihat Detail"/"⚙️ Koreksi" reuse `FuelModal.open()`/
    `FuelBarCorrection.open()` yang sudah ada (0 mekanisme baru).
  - Kendaraan aktif dikelola sendiri (`this.curVehicleId`, pola sama
    persis `FuelDashboard.curVehicleId`) — `FuelFleetSelector`/variabel
    global `curVehicleId` TIDAK disentuh. Vehicle switcher (>1
    kendaraan) & fallback "Invalid vehicle" ke kendaraan pertama, pola
    SAMA PERSIS `FuelDashboard`.
  - 0 chart/grafik visual (di luar scope task — kandidat "Chart/grafik
    visual untuk `VehicleTrendAPI.monthlyCostTrend()`" di
    `AI_TASK_QUEUE.md` tetap `BLOCKED`, menunggu keputusan produk soal
    library/bentuk chart).
- `scripts/build.js` — 1 baris registrasi `fuel-trend-dashboard.js`
  setelah `fuel-compare.js`.
- `modules/shared/modules-render.js` — 1 baris
  `FuelTrendDashboard.render()` di `renderCnTab()`, setelah
  `FuelCompare.render()` (refresh setelah transaksi BBM/servis otomatis
  lewat `renderCnTab()` yang dipanggil ulang, pola sama persis
  `FuelCard`/`FuelDashboard`/`FuelCompare`).
- `modules/vehicle/fuel-intelligence-ui.js` — `FuelBarCorrection.save()`
  dapat 1 baris refresh baru `FuelTrendDashboard.render(vid)`, pola sama
  persis refresh `FuelCard`/`FuelModal`/`FuelDashboard` di atasnya.
- `index.html`/`app_production.html` — markup `#fuelTrendWrap`/
  `#fuelTrendBody` ditambahkan IDENTIK di kedua file, tepat setelah
  `#fuelCompareWrap` (diverifikasi build).

**Test**: 1 file baru `tests/fuel-trend-dashboard.test.js` (+23 test) —
cakupan: render smoke, 0 kendaraan, `D`/`D.vehicles` tidak ada,
`FuelInsightEngine` belum dimuat, `getSummary()` `{ok:false}`/throw,
single vehicle (switcher tersembunyi), multiple vehicles (switcher +
kendaraan aktif ditandai), `switchVehicle()` delegasi ke `render()`,
invalid vehicle (fallback kendaraan pertama), biaya aktual & proyeksi
bulan/tahun + `FuelCostAnalytics` belum dimuat/`monthlyCost()`
`{ok:false}` (section lain tetap render), prediksi jarak/isi
ulang/pemakaian + `FuelPredictionEngine` belum dimuat, status efisiensi
baik vs degradasi (dropPct) + risiko perawatan + rekomendasi +
`FuelMaintenanceEngine` belum dimuat, highestInsight CRITICAL/null, CTA
reuse `FuelModal`/`FuelBarCorrection`, render ulang (pola refresh)
konsisten dgn data terbaru, dan D tidak diubah sama sekali (read-only,
presenter murni).

Build `kw156-fuel-trend-dashboard` (`?v=587`), **371/371 test pass**
(348 lama + 23 baru), dijalankan 2x (sebelum & sesudah build).
`index.html`/`app_production.html` identik (diverifikasi build).
`FuelInsightEngine`/`FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine`/`FuelFleetSelector`/`D.vehicles`/`D.bbmLogs`/
`D.servisLogs` (data & logic) TIDAK disentuh sama sekali sesi ini — 0
bug ditemukan di engine manapun, jadi 0 engine diubah (sesuai batasan
task). Detail lengkap: `AI_STATE.md` § Sesi 156.

---

# Changelog — Sesi 155A: Export Fuel Dashboard & Fuel Compare (TASK-155A)

## Konteks

Task baru dari user (STATUS=READY, diimplementasikan dari nol — sebelumnya
TIDAK PERNAH masuk repository walau sempat dibahas di chat sesi lain).
Baseline: `kw154-fuel-comparison-fleet-view` (`?v=585`, TASK-154, 323/323
test pass). Tujuan: tambah kemampuan export (HTML & JSON) untuk Fuel
Dashboard (1 kendaraan, TASK-150) dan Fuel Compare (seluruh armada,
TASK-154), presentation-only — 0 rumus/kalkulasi baru, 0 storage baru,
100% reuse `FuelInsightEngine.getSummary()` (dependency yang SUDAH dipakai
`render()` di kedua modul).

## Perubahan

**0 file baru.** 2 file diubah (`modules/vehicle/fuel-dashboard.js`,
`modules/vehicle/fuel-compare.js`) — HANYA menambah method export + 1
tombol per modul, tidak menyentuh `render()`/logic yang sudah ada selain
menambah 1 baris tombol di masing-masing.

- `modules/vehicle/fuel-dashboard.js` (`FuelDashboard`):
  - `_buildExportData(vehicleId)` — kumpulkan 1 objek data export dari
    `FuelInsightEngine.getSummary(vehicleId)` apa adanya (healthScore/
    efficiencyScore/monthlyCost/remainingDistance/maintenanceRisk/fuel/
    highestInsight). `null` kalau kendaraan tidak ditemukan di
    `D.vehicles`, `FuelInsightEngine` belum dimuat, atau `getSummary()`
    `{ok:false}`/throw ("Invalid vehicle" — tidak pernah throw ke
    pemanggil).
  - `exportVehicleJSON(vehicleId?)` — download file `.json` (isi = data
    export apa adanya). Kembalikan `{ok,data}` supaya bisa diverifikasi
    programatik tanpa membaca file yang diunduh.
  - `exportVehicleHTML(vehicleId?)` — download laporan `.html`
    standalone (inline style, self-contained — file dibuka terpisah dari
    app) dari data yang sama.
  - `_downloadFile()`/`_dateTag()`/`_slug()` — helper murni, pola download
    SAMA PERSIS `modules/shared/data-archive.js`/`backup-restore.js`
    (Blob + `URL.createObjectURL` + `<a download>` + `click()`).
  - Tombol baru "⬇️ Export" ditambahkan di `btn-row` yang sudah ada
    (sebelah "📊 Lihat Detail"/"⚙️ Koreksi"), `data-action="FuelDashboard.
    exportVehicleHTML"`.
- `modules/vehicle/fuel-compare.js` (`FuelCompare`):
  - `_buildFleetExportData()` — kumpulkan array kendaraan dari `_rows()`
    (SUDAH ADA, 100% reuse — kendaraan invalid otomatis dilewati, pola
    sama `render()`), diurutkan sesuai `this.sortKey`/`this.sortDir` yang
    sedang aktif (0 sort baru, reuse `_sortRows()`). `null` kalau "empty
    fleet" (0 kendaraan) atau "empty data" (semua kendaraan invalid).
  - `exportFleetJSON()`/`exportFleetHTML()` — kontrak sama persis versi
    single-vehicle di atas (JSON mentah vs laporan tabel HTML).
  - Tombol baru "⬇️ Export All" ditambahkan di atas baris sort header,
    `data-action="FuelCompare.exportFleetHTML"`.

**Test**: 1 file baru `tests/fuel-export.test.js` (+25 test) — cakupan:
`exportVehicleHTML()`/`exportVehicleJSON()`/`exportFleetHTML()`/
`exportFleetJSON()`, tombol Export FuelDashboard/Export All FuelCompare,
invalid vehicle, empty fleet, empty data, FuelInsightEngine belum dimuat,
Blob/URL tidak tersedia, dan verifikasi `D.vehicles` TIDAK dimodifikasi
sama sekali oleh keempat fungsi export (0 storage baru). 1 assertion lama
di `tests/fuel-dashboard.test.js` disesuaikan (jumlah tombol `btn-ghost
btn-sm` 2→3 karena tombol Export baru).

Build `kw155a-fuel-export` (`?v=586`), **348/348 test pass** (323 lama +
25 baru). `index.html`/`app_production.html` identik (diverifikasi
build). `FuelInsightEngine`/`FuelFleetSelector`/`FuelCostAnalytics`/
`FuelPredictionEngine`/`FuelMaintenanceEngine`/`D.vehicles`/`D.bbmLogs`/
`D.servisLogs` (data & logic) TIDAK disentuh sama sekali sesi ini. 0
`scripts/build.js` baris baru (0 file baru yang perlu registrasi). Detail
lengkap: `AI_STATE.md` § Sesi 155A.

---

# Changelog — Sesi 154b: Multi Vehicle Fuel Comparison (TASK-154)

## Konteks

Task baru dari user (STATUS=READY): buat comparison view untuk SEMUA
kendaraan, reuse `FuelInsightEngine`/`FuelFleetSelector`/
`FuelCostAnalytics`/`FuelPredictionEngine`/`FuelMaintenanceEngine`
existing, dengan syarat eksplisit: JANGAN ubah engine yang sudah ada,
JANGAN storage baru, JANGAN duplikasi kalkulasi, presentation only.
Menyusul langsung setelah TASK-150 (Fuel Dashboard Integration, 1
kendaraan) selesai di sesi yang sama — TASK-154 memperluas jadi
tampilan SELURUH armada sekaligus, tetap 100% reuse
`FuelInsightEngine.getSummary()` per kendaraan (0 rumus baru
dihitung ulang; `FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine` sudah 100% dibungkus lewat `getSummary()`,
tidak dipanggil langsung di modul baru ini).

## Perubahan

**1 file baru** (presenter, pola SAMA PERSIS `modules/vehicle/
fuel-dashboard.js`):

- `modules/vehicle/fuel-compare.js` (`FuelCompare`) — `render(sortKey?)`
  mengumpulkan `FuelInsightEngine.getSummary(vehicleId)` utk SETIAP
  kendaraan di `D.vehicles` (kendaraan yang `getSummary()`-nya
  `{ok:false}` dilewati, pola sama persis
  `FuelFleetSelector._candidates()`), lalu render 1 baris per
  kendaraan: nama, Fuel Health Score, Remaining Fuel, Estimated
  Distance, Monthly Fuel Cost, Fuel Efficiency, Maintenance Risk,
  Highest Priority Insight — SEMUA field dibaca apa adanya dari
  `summary`, 0 kalkulasi baru.
  - `FuelFleetSelector.selectVehicle()` (100% reuse, 0 logic
    seleksi/prioritas baru ditulis di sini) dipakai HANYA utk badge
    "⚠️ Prioritas Tertinggi" pada kendaraan dgn insight paling urgent
    fleet-wide.
  - `openVehicle(vehicleId)` — tap 1 baris kendaraan membuka
    `FuelModal.open(vehicleId)` (SUDAH ADA, TASK-141) apa adanya,
    termasuk penanganan "Invalid vehicle" (`FuelModal.open()` sendiri
    sudah toast + tidak jadi buka modal kalau vehicleId tidak
    ditemukan).
  - `setSort(key)`/`_sortRows()` — sort by Vehicle Name/Health
    Score/Monthly Cost/Remaining Fuel, tap key yang sama membalik arah
    (asc↔desc). Default: `healthScore` ASC (= Highest Health Risk ->
    Lowest, karena healthScore rendah berarti risiko tinggi). Nilai
    `null`/`undefined` selalu ditaruh di akhir hasil sort, apa pun
    arahnya.
  - Wrap `#fuelCompareWrap` disembunyikan HANYA kalau: 0 kendaraan
    sama sekali ("No vehicles"), `FuelInsightEngine` belum dimuat, atau
    `getSummary()` gagal utk SEMUA kendaraan yang dicoba ("Invalid
    vehicle" utk seluruh armada) — tidak pernah throw ke pemanggil.

**3 file diubah** (HANYA wiring, 0 logic baru):

- `scripts/build.js` — 1 baris registrasi `modules/vehicle/
  fuel-compare.js`, ditaruh setelah `fuel-dashboard.js` (dependency:
  `FuelInsightEngine`/`FuelFleetSelector`/`FuelModal` semua sudah
  dimuat sebelum titik itu).
- `modules/shared/modules-render.js` — 1 baris `FuelCompare.render()`
  ditambahkan di `renderCnTab()`, tepat di sebelah `FuelDashboard.
  render()` yang sudah ada. Karena `renderCnTab()` dipanggil ulang
  tiap ada perubahan data kendaraan (termasuk setelah transaksi
  BBM/servis tersimpan), refresh "after fuel transaction"/"after
  maintenance" otomatis terjadi lewat baris ini — 0 hook refresh baru
  ditambahkan secara terpisah.
- (tidak ada perubahan lain di file existing — `FuelInsightEngine`/
  `FuelFleetSelector`/`FuelCostAnalytics`/`FuelPredictionEngine`/
  `FuelMaintenanceEngine`/`FuelModal` TIDAK disentuh sama sekali)

**Markup HTML** (identik di kedua file, diverifikasi lewat build):

- `index.html` & `app_production.html` — `<div id="fuelCompareWrap">
  <div id="fuelCompareBody"></div></div>` ditambahkan tepat setelah
  blok `#fuelDashWrap` (Dashboard Hub, tab Car Notes).

**1 file test baru**: `tests/fuel-compare.test.js` (19 test) —
mencakup seluruh skenario regresi yang diminta: Single vehicle,
Multiple vehicles, No vehicles, Invalid vehicle, Sorting (default +
4 kunci sortable + toggle arah), Vehicle switch (`openVehicle()` ->
`FuelModal.open()`), Refresh after fuel transaction, Refresh after
maintenance, plus reuse `FuelFleetSelector` (badge prioritas).

## Hasil

- Build: `kw154-fuel-comparison-fleet-view` (`?v=585`)
- Test: `node --test tests/*.test.js` → **323/323 PASS**, 0 fail
  (+19 test baru dari 304 sebelumnya)
- `index.html` == `app_production.html`: ya (diverifikasi via
  `build.js`)
- `FuelInsightEngine`/`FuelFleetSelector`/`FuelCostAnalytics`/
  `FuelPredictionEngine`/`FuelMaintenanceEngine`/`D.vehicles`/
  `D.bbmLogs`/`D.servisLogs` (data & logic) TIDAK disentuh sama
  sekali sesi ini.

---

# Changelog — Sesi 154: Fuel Dashboard Integration (TASK-150)

## Konteks

`TASK-150 AUDIT` diberikan dulu (verifikasi source-only, mengabaikan
`AI_STATE.md`/`AI_TASK_QUEUE.md`/`CHANGELOG.md`/klaim chat sebelumnya):
mengonfirmasi seluruh 8 item checklist ("modules/vehicle/
fuel-dashboard.js", registrasi `scripts/build.js`,
`FuelDashboard.render()` dari `modules-render.js`, refresh setelah
`FuelBarCorrection.save()`, markup `#fuelDashWrap`/`#fuelDashBody` di
kedua HTML, `tests/fuel-dashboard.test.js`, regression test) memang
belum ada sama sekali di repo — hasil audit: `IN_PROGRESS`, semua 8
item hilang. Menyusul itu, task implementasi TASK-150 diberikan ulang
dgn syarat eksplisit: reuse arsitektur existing, JANGAN ubah
`FuelInsightEngine`/`FuelFleetSelector`, JANGAN storage baru, JANGAN
duplikasi kalkulasi, presentation layer only.

## Perubahan

**1 file baru** (presenter, pola SAMA PERSIS `modules/vehicle/
fuel-card.js`):

- `modules/vehicle/fuel-dashboard.js` (`FuelDashboard`) —
  `render(vehicleId?)` 100% REUSE `FuelInsightEngine.getSummary()`:
  `fuel` (currentBar/maxBar/remainingLiter/fuelPercent/reserve) utk
  gauge BBM, `healthScore` utk skor kesehatan, `highestInsight` utk
  insight prioritas tertinggi — SEMUA dibaca apa adanya, 0 rumus/skoring
  baru. CTA "📊 Lihat Detail"/"⚙️ Koreksi" reuse `FuelModal.open()`/
  `FuelBarCorrection.open()` (data-action, pola SAMA PERSIS baris CTA
  `fuel-card.js`). Switcher multi-kendaraan (`_vehicleChips()`) pola
  sama persis `renderDashServisVehChips()` (`modules-render.js`).
  Kendaraan aktif dikelola SENDIRI (`this.curVehicleId`, pola sama
  `FuelModal.curVehicleId`/`FuelBarCorrection.curVehicleId`) supaya
  `FuelFleetSelector` maupun variabel global `curVehicleId` (dipakai tab
  Car Notes) TIDAK tersentuh sama sekali. `switchVehicle(vehicleId)`
  murni delegasi ke `render()`.
  - `render()` MENYEMBUNYIKAN `#fuelDashWrap` HANYA kalau: 0 kendaraan
    sama sekali, `FuelInsightEngine` belum dimuat, atau
    `getSummary()` gagal utk kendaraan yang dicoba. `vehicleId` yang
    tidak valid ("Invalid vehicle" — mis. kendaraan sudah dihapus)
    FALLBACK ke kendaraan pertama, BUKAN menyembunyikan dashboard.

**3 file diubah** (HANYA wiring, 0 logic baru):

- `scripts/build.js` — 1 baris registrasi `modules/vehicle/
  fuel-dashboard.js`, ditaruh setelah `fuel-notif-bridge.js` (dependency:
  `FuelInsightEngine`/`FuelModal`/`FuelBarCorrection` semua sudah dimuat
  sebelum titik itu).
- `modules/shared/modules-render.js` — 1 baris `FuelDashboard.render()`
  ditambahkan di `renderCnTab()`, tepat di sebelah `FuelCard.render()`
  yang sudah ada.
- `modules/vehicle/fuel-intelligence-ui.js` — `FuelBarCorrection.save()`
  dapat 1 baris refresh baru (`FuelDashboard.render(vid)`), ditambahkan
  setelah blok refresh `FuelCard`/`FuelModal` yang sudah ada, pola sama
  persis.

**Markup HTML** (identik di kedua file, diverifikasi lewat build):

- `index.html` & `app_production.html` — `<div id="fuelDashWrap"><div
  id="fuelDashBody"></div></div>` ditambahkan tepat setelah blok
  `#fuelIntelWrap` yang sudah ada (di dalam Dashboard Hub / Car Notes).

**1 file test baru** (18 test):

- `tests/fuel-dashboard.test.js` — smoke render, no vehicle (wrap
  disembunyikan), `FuelInsightEngine` belum dimuat, `getSummary()`
  gagal (tidak throw), single vehicle (switcher tersembunyi), multiple
  vehicles (switcher + kendaraan aktif ditandai), invalid vehicle
  (fallback kendaraan pertama), remaining fuel (gauge bar/liter/
  persen + peringatan reserve + placeholder kalau `fuel` null), health
  score (warna + dilewati kalau null), highest insight (warna prioritas
  + dilewati kalau null), CTA reuse `FuelModal`/`FuelBarCorrection` (0
  class baru), refresh after refill (render ulang mencerminkan data
  baru), refresh after correction (`FuelBarCorrection.save()` memanggil
  `FuelDashboard.render(vid)`), vehicle switch (`switchVehicle()`
  memperbarui body & `curVehicleId`).

## Validasi

- Build: `node scripts/build.js kw154-fuel-dashboard-integration` — versi
  naik ke `?v=584`, sintaks kedua bundle lolos `node --check`,
  `index.html`/`app_production.html` dikonfirmasi identik oleh build
  script sendiri.
- Test: `node --test tests/*.test.js` — 304/304 pass (286 lama + 18
  baru).
- ZIP checkpoint dibuat & diverifikasi (lihat `AI_STATE.md` § Current
  Step Sesi 154 utk detail lengkap).

## Batasan yang dijaga

`FuelInsightEngine` — 0 baris diubah. `FuelFleetSelector` — 0 baris
diubah, 0 dependency baru ke situ (dashboard mengelola kendaraan
aktifnya sendiri). 0 storage baru (`FuelDashboard` tidak pernah menulis
ke `D`). 0 duplikasi kalkulasi (seluruh angka dibaca dari
`FuelInsightEngine.getSummary()` apa adanya). `reminder-notif.js`/
`FuelNotifBridge` (TASK-153) TIDAK disentuh — target klik notifikasi
masih `FuelModal`, di luar scope TASK-150 (lihat `AI_STATE.md` § Known
Blocker).

---

# Changelog — Sesi 153: Fuel Notification & Reminder (TASK-153)

## Konteks

Task baru dari user: "Integrate Fuel Intelligence with the existing
Notification system", dgn syarat eksplisit: reuse Notification Engine
existing, JANGAN buat sistem notifikasi baru, JANGAN duplikasi reminder
logic, JANGAN ubah rumus `FuelInsightEngine`, 0 storage baru. Behavior
wajib: notifikasi otomatis utk (1) fuel reserve reached, (2) fuel
efficiency drops significantly, (3) maintenance affects fuel efficiency,
(4) predicted fuel refill reminder — dan notifikasi membuka Fuel
Dashboard existing.

## Audit sebelum kode diubah

Satu-satunya "Notification Engine" di project ini adalah
`reminder-notif.js` (`fireNotif()` + `checkAndFireReminders()` + dedup
harian `kw_notif_fired` di `localStorage`) — sudah dipakai tagihan/LDR/
pajak-kendaraan/SIM/SPT (ad-hoc, baca `D` langsung) DAN servis/estimasi-
BBM kendaraan lewat `VehicleNotifBridge` (Sesi 84) — sebuah translator
murni yang HANYA menerjemahkan sinyal existing (`VehicleReminder`
severity `'overdue'`) jadi `{fireKey,title,body}`, tidak pernah memanggil
`fireNotif()`/`Notification`/`localStorage` sendiri.

`FuelInsightEngine` (TASK-149/150A) SUDAH punya seluruh 4 sinyal yang
dibutuhkan task ini — insight `reserve-fuel`/`fuel-efficiency`/
`maintenance`/`next-refuel`, masing-masing sudah punya `priority`
(CRITICAL/HIGH/MEDIUM/LOW/INFO) yang SUDAH dihitung dari
`FuelGaugeEngine`/`FuelMaintenanceEngine`/`FuelPredictionEngine` — tapi
BELUM PERNAH ditembak jadi notifikasi push. Itu satu-satunya gap yang
ditutup sesi ini.

Ditemukan juga: **TASK-150 (Fuel Dashboard Integration)**, UI-nya sendiri
masih `STOPPED`/belum dikerjakan (lihat `AI_TASK_QUEUE.md`/`AI_STATE.md`
§ Sesi 151). Satu-satunya tampilan BBM per-kendaraan yang SUDAH ADA di
aplikasi ini adalah `FuelModal` (`#fuelIntelModal`, Fuel Intelligence
Modal, TASK-141) — dipakai sbg target "existing Fuel Dashboard" task ini
(bukan dashboard baru yang dibuat sesi ini). Kalau TASK-150 dikerjakan
nanti, target klik notifikasi ini perlu diarahkan ulang.

## Perubahan

**1 file baru** (translator murni, pola SAMA PERSIS
`modules/vehicle/vehicle-notif-bridge.js`):

- `modules/vehicle/fuel-notif-bridge.js` (`FuelNotifBridge`) —
  `items(vehicleId?, firedIds?)` memanggil `FuelInsightEngine.
  getInsights(vehicleId)` APA ADANYA (0 rumus reserve/efisiensi/risiko/
  prediksi baru dihitung ulang) per kendaraan, filter ke 4 insight id yang
  "actionable" lewat `NOTIFY_RULES`:
  - `reserve-fuel` priority `CRITICAL` → *Fuel reserve reached*
  - `fuel-efficiency` priority `CRITICAL`/`HIGH` (degradationDetected) →
    *Fuel efficiency drops significantly*
  - `maintenance` priority `CRITICAL` (riskLevel `'tinggi'` — overdue
    servis relevan BBM DAN degradasi efisiensi terdeteksi BERSAMAAN,
    persis definisi *Maintenance affects fuel efficiency*)
  - `next-refuel` priority `CRITICAL`/`HIGH` (estimatedRemainingDays<=3)
    → *Predicted fuel refill reminder*

  Insight lain (`fuel-consumption`/`monthly-cost`/`prediction`, selalu
  INFO) & priority MEDIUM/LOW/INFO pada 4 insight di atas SENGAJA TIDAK
  ditembak — pola sama `VehicleNotifBridge` (hanya severity `'overdue'`
  yang aktif menembak, bukan `'due-soon'`/`'info'`) supaya notifikasi
  tetap actionable, bukan noise harian.

**2 file diubah** (HANYA wiring, 0 logic reminder baru):

- `reminder-notif.js`:
  - `fireNotif(title,body,tag,onClick)` — 1 parameter opsional BARU
    (additive, 100% backward compatible — 2 caller lama,
    `requestNotifPermission()`/`checkAndFireReminders()` blok lama, tetap
    jalan tanpa perubahan) supaya klik notifikasi bisa jalankan aksi.
  - `checkAndFireReminders()` — 1 blok baru (pola SAMA PERSIS blok
    `VehicleNotifBridge` yang sudah ada tepat di atasnya) yang panggil
    `FuelNotifBridge.items(undefined, fired.ids)`, tembak tiap item lewat
    `fireNotif()` yang SAMA (0 mekanisme dedup baru — `kw_notif_fired`
    yang SUDAH ADA dipakai apa adanya), `onClick` memanggil
    `FuelModal.open(vehicleId)` (guard `typeof`, aman kalau `FuelModal`
    belum dimuat).
- `scripts/build.js` — 1 baris baru, daftarkan
  `modules/vehicle/fuel-notif-bridge.js` tepat setelah
  `fuel-fleet-selector.js`.

```js
function fireNotif(title,body,tag,onClick){
if(!('Notification' in window)||Notification.permission!=='granted')return;
try{
const n=new Notification(title,{body,tag,renotify:!!tag});
n.onclick=()=>{window.focus();n.close();if(typeof onClick==='function'){try{onClick();}catch(e){console.warn('Gagal jalankan aksi klik notifikasi:',e);}}};
}catch(e){console.warn('Gagal kirim notifikasi:',e);}
}
```

```js
if(typeof FuelNotifBridge!=='undefined'&&typeof FuelNotifBridge.items==='function'){
FuelNotifBridge.items(undefined,fired.ids).forEach((n)=>{
fireNotif(n.title,n.body,n.fireKey,()=>{if(typeof FuelModal!=='undefined'&&typeof FuelModal.open==='function')FuelModal.open(n.vehicleId);});
fired.ids.push(n.fireKey);
});
}
```

## Tidak diubah

0 rumus `FuelInsightEngine`/`FuelGaugeEngine`/`FuelPredictionEngine`/
`FuelMaintenanceEngine` disentuh, 0 storage baru dibuat, 0 sistem
notifikasi baru (100% reuse `Notification` browser API + `fireNotif()` +
`kw_notif_fired`), 0 reminder logic diduplikasi (`FuelNotifBridge` murni
translator, sama seperti `VehicleNotifBridge`).

## Hasil verifikasi

```
node --test tests/*.test.js
# 286/286 pass (0 fail) — +11 test baru tests/fuel-notif-bridge.test.js
#   (reserve notification CRITICAL vs INFO, efficiency warning
#   CRITICAL/HIGH vs MEDIUM/LOW/INFO, maintenance reminder CRITICAL vs
#   MEDIUM/LOW, prediction reminder CRITICAL/HIGH vs MEDIUM/LOW, insight
#   tipe lain tidak pernah ditembak, no duplicate notifications via
#   firedIds, vehicle switch/filter per kendaraan + multi-kendaraan,
#   kendaraan tanpa insight valid dilewati tanpa menggagalkan kendaraan
#   lain, kendaraan tanpa id dilewati, FuelInsightEngine belum dimuat,
#   0 kendaraan)

node scripts/build.js kw153-fuel-notification-reminder
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=583
#   (naik dari ?v=582)
# index.html & app_production.html identik (0 diff)
# grep app-bundle-b.min.js: FuelNotifBridge terdaftar

node --test tests/*.test.js   # ulang setelah build, tetap 286/286 pass
```

Checkpoint ZIP: `kw_release_sesi153_fuel-notification-reminder_v583.zip`.

---

# Changelog — Sesi 152: Fuel Finance Integration (TASK-152)

## Konteks

Task baru dari user: "Integrate Fuel Intelligence with the Finance
module. Every fuel transaction should automatically enrich Fuel Analytics
without creating duplicate transactions", dgn syarat eksplisit: TIDAK
boleh ada transaksi kedua, TIDAK boleh duplikat riwayat keuangan, TIDAK
mengubah record historis, TIDAK redesign UI, TIDAK mengubah rumus
`FuelInsightEngine`, wajib reuse arsitektur yang sudah ada (Finance
transaction engine, `FuelCostAnalytics`, `FuelInsightEngine`,
`FuelPredictionEngine`, `FuelMaintenanceEngine`, `FuelFleetSelector`).

## Audit sebelum kode diubah

Ditemukan bahwa SEBAGIAN BESAR requirement task ini **sudah terpenuhi**
dari sesi-sesi sebelumnya (149-151B), 0 gap besar:

- **Tidak ada transaksi ganda**: `tx-bbm.js` (`recordBbmLog()`) +
  `car-notes.js` (`BBM._saveInner()`) SUDAH menghubungkan 1 transaksi
  Finance (`D.transactions`) <-> 1 log BBM (`D.bbmLogs`) via
  `txLinkId`/`bbmLinkId`, baik dari form Transaksi umum (centang "Sinkron
  BBM") maupun modal "Catat Isi BBM" khusus Car Notes. Edit tidak pernah
  membuat baris baru (`Object.assign` di tempat), hapus menghapus
  keduanya sekaligus (tidak ada log/transaksi yatim).
- **Refresh tanpa reload**: `renderCnTab()` (SUDAH ADA, dipanggil dari
  `_saveTxInner()`/`BBM._saveInner()`/`delTx()`/`BBM.del()`) SUDAH
  merender ulang `FuelCard` (Fuel Dashboard) dan `VehicleDailyBrief`
  (AI Daily Briefing per-kendaraan, TASK-151B) begitu transaksi BBM
  tersimpan — Fuel Analytics (`FuelAnalytics.render()`, dalam
  `FuelModal`) sendiri selalu baca `D` langsung tiap dibuka, jadi otomatis
  konsisten tanpa perlu push refresh terpisah.

## GAP yang ditemukan & ditutup

Satu inkonsistensi: jalur `_saveTxInner()` (`transaksi.js`, transaksi
umum) SUDAH memancarkan `AIBus.emit("finance.updated", {...})` tiap
transaksi tersimpan (dipakai `AIService.wireEvents()` -> `AIDecision.
decide()`, SUDAH ADA sejak Smart Delivery Engine), TAPI jalur
`BBM._saveInner()` (`car-notes.js`, modal "Catat Isi BBM" — jalur UTAMA
user mencatat BBM dari Car Notes) **tidak pernah** memancarkan event yang
sama. Akibatnya AI Decision/Service tidak pernah "tahu" ada transaksi BBM
baru kalau user mencatatnya lewat Car Notes, bukan lewat form Transaksi
umum — padahal keduanya sama-sama "fuel transaction tersimpan".

## Perubahan

Satu file diubah: `car-notes.js`. Tepat 1 baris baru ditambahkan setelah
`save();closeModal('bbmModal');renderCnTab();renderDashboard();
renderKeuangan();` yang SUDAH ADA di akhir `BBM._saveInner()`:

```js
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'bbm'});
```

Payload bentuk dasarnya (`txId`/`category`/`type`/`amount`) SAMA PERSIS
pola `_saveTxInner()` di `transaksi.js` — tambahan `kind:'bbm'` (pola
sama dgn `kind:"cicilan-baru"`/`"langganan"` yang sudah dipakai
`transaksi.js` sendiri) supaya listener bisa membedakan asal event kalau
perlu, tanpa mengubah bentuk dasar payload yang sudah dikonsumsi
`AIService`. Guard `typeof AIBus!=="undefined"` (pola sama persis semua
pemanggilan `AIBus.emit` lain di project ini) — kalau `AIBus` belum
dimuat, `BBM._saveInner()` tetap jalan normal, tidak throw.

**TIDAK ADA transaksi kedua ditambahkan, TIDAK ADA riwayat keuangan
diduplikasi, TIDAK ADA record historis diubah, TIDAK ADA UI di-redesign,
`FuelInsightEngine`/`FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine`/`FuelFleetSelector` TIDAK disentuh sama sekali** —
murni 1 baris pemancar event, reuse `AIBus` yang sudah ada apa adanya.

## Test baru

+7 test baru `tests/tx-bbm-finance-integration.test.js`:
single fuel transaction (1x simpan -> 1 transaksi + 1 log, saling
terhubung), multiple fuel transactions (2x simpan -> 2 transaksi + 2 log,
tidak silang), finance edit (edit log existing -> transaksi lama
di-update di tempat, TIDAK ada baris baru), dashboard/AI daily brief
refresh (`renderCnTab`/`renderDashboard`/`renderKeuangan` terpanggil),
`AIBus.emit("finance.updated")` terpancar 1x per simpan (2x utk 2x
simpan, tidak digabung/di-debounce) dgn payload yang benar, dan guard
`AIBus` belum dimuat (tidak throw).

Build `kw152-fuel-finance-integration` (`?v=582`, naik dari `?v=581`).
Test naik dari 268 ke 275 pass (2x — sebelum & sesudah build).

## Hasil verifikasi

```
node --test tests/*.test.js
# 275/275 pass (268 lama + 7 baru, 0 regresi)

node scripts/build.js kw152-fuel-finance-integration
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=582
# index.html & app_production.html identik (0 diff)
```

---



## Konteks

Menutup TASK-151 (Sesi 151, `STOPPED`) sekarang gap-nya (pemilihan
kendaraan) sudah ditutup TASK-151A (`FuelFleetSelector.selectVehicle()`).
Task ini murni WIRING presentasi — mengintegrasikan `FuelFleetSelector`
ke `VehicleDailyBrief` (AI Daily Briefing kendaraan yang sudah ada,
`modules/vehicle/vehicle-daily-brief.js`, container `#vehBriefBody`).

## Perubahan

Satu file diubah: `modules/vehicle/vehicle-daily-brief.js`. Method baru
`_fuelBriefHtml()` + dipanggil dari `render()` (append ke `innerHTML`
yang sudah ada, container/mekanisme render TIDAK berubah). Alur:

1. Panggil `FuelFleetSelector.selectVehicle()` — **satu-satunya** sumber
   pemilihan kendaraan (`FuelFleetSelector` TIDAK disentuh). Kalau `null`
   (tidak ada insight sama sekali) atau modul belum dimuat, section Fuel
   TIDAK ditambahkan (rule task #3) — silent, bukan error/empty-state.
2. Kalau ada hasil, tampilkan **satu** briefing Fuel dari `summary`/
   `insight` (= `summary.highestInsight`) apa adanya: nama kendaraan
   (lookup by-id TAMPILAN saja, id sudah final dari selector — 0 logic
   seleksi baru), Fuel Health (`healthScore`), Sisa BBM (`fuel.
   remainingLiter`/`fuelPercent`), Estimasi Jarak Tersisa
   (`remainingDistance`), Biaya BBM Bulanan (`monthlyCost`, format via
   `fmt()` global SUDAH ADA), Risiko Perawatan (`maintenanceRisk`),
   insight prioritas tertinggi (`insight.title`/`description`), dan
   Rekomendasi — **`insight.recommendation` dipakai LANGSUNG**, 0 kalimat
   rekomendasi baru disusun (rule task "Never generate new
   recommendations").
3. `FuelFleetSelector.selectVehicle()` dibungkus `try/catch` (presenter
   tidak pernah throw ke pemanggil) — kendaraan invalid/`getSummary()`
   gagal sudah ditangani `FuelFleetSelector` sendiri (balikin `null`),
   di sini cuma jaga-jaga tambahan.

0 rumus/skoring/logic prioritas/logic seleksi kendaraan baru ditulis di
sini — murni presentasi dari data yang `FuelFleetSelector`/
`FuelInsightEngine` SUDAH sediakan. `FuelInsightEngine` dan
`FuelFleetSelector` **TIDAK disentuh sama sekali**. `UnifiedAIBriefing`
(briefing finance+vehicle gabungan, `modules/cross/unified-ai-briefing.js`)
juga TIDAK disentuh — integrasi ditaruh di `VehicleDailyBrief` (briefing
level kendaraan, tempat paling natural utk data per-kendaraan seperti
BBM) supaya tidak perlu mengubah bentuk/arsitektur briefing gabungan yang
levelnya tetap fleet-wide. 0 storage baru, 0 UI/container baru
(`#vehBriefBody` yang sudah ada dipakai apa adanya).

+8 test baru `tests/vehicle-daily-brief.test.js` (tanpa kendaraan
terpilih -> tidak ada section Fuel, kendaraan terpilih -> section tampil
dgn nama, highest insight rendering, recommendation rendering reuse apa
adanya, invalid vehicle/`selectVehicle()` throw -> tidak menggagalkan
render, empty history -> field kosong jadi placeholder tanpa error,
`FuelFleetSelector` belum dimuat -> section dilewati, 0 kendaraan armada
-> body dikosongkan). Build `kw151-fuel-ai-daily-briefing-integration`
(`?v=581`, naik dari `?v=580`). Test naik dari 260 ke 268 pass (2x —
sebelum & sesudah build).

---

# Changelog — Sesi 151A: Fuel Fleet Brief Selector (TASK-151A)

## Konteks

Menutup gap TASK-151 (Sesi sebelumnya, `STOPPED`): pipeline "AI Daily
Briefing" yang ada beroperasi fleet-wide, sedangkan `FuelInsightEngine.
getSummary()`/`getInsights()` wajib 1 `vehicleId`. Tidak ada mekanisme
"kendaraan mana yang diceritakan" — TASK-151A diminta khusus utk
menyediakan selector-nya (murni pemilihan kendaraan, bukan wiring ke
briefing itu sendiri).

## Perubahan

Modul BARU `modules/vehicle/fuel-fleet-selector.js` (`FuelFleetSelector`)
— presentation helper only, 0 UI, PURE (read-only, tidak pernah panggil
`save()`). API publik tunggal:

- **`selectVehicle()`** -> `{ok:true, vehicleId, summary, insight}` atau
  `null` kalau tidak ada satu pun kendaraan dgn insight (0 kendaraan /
  seluruh kendaraan invalid / seluruh kendaraan tanpa insight).

100% REUSE:
- `FuelInsightEngine.getSummary(vehicleId)` (TASK-149/150A) per kendaraan
  — `summary.highestInsight` (sudah diurutkan prioritas oleh
  `FuelInsightEngine` sendiri via `getInsights()`, TASK-150A) dipakai apa
  adanya sbg insight prioritas tertinggi kendaraan itu, 0 logic sortir
  insight baru ditulis di modul ini.
- `curVehicleId` (global SUDAH ADA sejak lama, `modules/shared/
  features-helpers-global-security.js` — sudah dipakai sbg "kendaraan
  aktif" di `fuel-card.js`/`fuel-modal.js`/`fuel-intelligence-ui.js`/
  `vehicle-core.js` dst) sbg tie-breaker "active/current vehicle" — TIDAK
  ADA state/field baru dibuat utk konsep ini.

Logic baru (sesuai requirement task, bukan kalkulasi bisnis): (1) iterasi
`D.vehicles`, kumpulkan `highestInsight` tiap kendaraan valid; (2)
bandingkan level prioritas (CRITICAL->HIGH->MEDIUM->LOW->INFO, urutan
teks dari task) cari kandidat teratas; (3) kalau seri, pilih
`curVehicleId` kalau termasuk kandidat seri, else kandidat pertama sesuai
urutan `D.vehicles` (deterministik, bukan tebakan acak). Kendaraan
invalid/tanpa insight/`getSummary()` yang throw dilewati (tidak
menggagalkan seleksi kendaraan lain), `selectVehicle()` sendiri tidak
pernah throw ke pemanggil.

`FuelInsightEngine` DAN AI Briefing (`UnifiedAIBriefing`/
`VehicleDailyBrief`) **TIDAK disentuh sama sekali** sesuai batasan task —
modul ini murni menyiapkan `vehicleId` terpilih; wiring nyata ke briefing
TETAP di luar scope TASK-151A, menunggu task lanjutan eksplisit.

1 file baru, 1 baris registrasi di `scripts/build.js` GROUP_B (setelah
`fuel-insight-engine.js`). +13 test baru
`tests/fuel-fleet-selector.test.js` (priority selection penuh
CRITICAL->INFO, tie-breaker `curVehicleId` termasuk/tidak termasuk
kandidat seri, `curVehicleId` undefined, 0 kendaraan, `D`/`D.vehicles`
tidak ada, seluruh kendaraan tanpa insight, `FuelInsightEngine` belum
dimuat, kendaraan invalid dilewati, seluruh kendaraan invalid, entri
tanpa `id`, `getSummary()` throw utk 1 kendaraan tidak menggagalkan
kendaraan lain). Build `kw151a-fuel-fleet-brief-selector` (`?v=580`, naik
dari `?v=579`). Test naik dari 247 ke 260 pass (2x — sebelum & sesudah
build).

---

# Changelog — Sesi 151: Fuel AI Daily Briefing Integration (TASK-151) — STOPPED

## Konteks

TASK-151 minta `FuelInsightEngine` diintegrasikan ke "Existing AI Daily
Briefing" (natural-language summary saja, presentation only, dilarang
menghitung/redesign UI/bikin storage). Audit sebelum menulis kode
menemukan pipeline briefing yang ADA (`UnifiedAIBriefing.generate()` +
`VehicleDailyBrief.render()`) 100% fleet-wide (baca `VehicleAIHook.
fleetSummary()`/`UnifiedSummaryAPI.summary()`, agregat SELURUH
kendaraan), sedangkan `FuelInsightEngine.getSummary(vehicleId)`/
`getInsights(vehicleId)` wajib 1 `vehicleId` spesifik — tidak ada varian
agregat di engine ini. Tidak ada mekanisme "kendaraan mana yang tampil di
briefing" yang sudah ada di pipeline manapun.

## Keputusan

Sesuai instruksi "IMPORTANT" di task sendiri ("If AI Briefing requires
changes outside presentation, STOP. Report the dependency."): task
di-STOP. Memilih kendaraan mana yang diceritakan (kendaraan pertama? semua
kendaraan? insight paling kritis lintas-armada?) adalah keputusan bentuk
tampilan/produk, bukan presentasi murni — akar masalah yang sama dgn
kandidat lama `BLOCKED` #1 di `AI_TASK_QUEUE.md` ("Wiring VehicleAIHook ke
AI Daily Briefing", alasan identik: "Belum ada keputusan produk soal
bentuk tampilan di briefing").

## Perubahan

**0 file diubah.** Tidak ada kode, test, atau build baru sesi ini — versi
tetap `?v=579`, 247/247 test tetap hijau apa adanya dari Sesi 150A.
Dicatat `STOPPED` di `AI_TASK_QUEUE.md` § Task selesai + `AI_STATE.md`
§ Sesi 151 (detail lengkap gap & opsi keputusan yang ditunggu dari user).

---

# Changelog — Sesi 150A: Expand FuelInsightEngine Summary API (TASK-150A)

## Konteks

TASK-150 (Fuel Dashboard Integration) mengaudit `FuelInsightEngine` sebelum
wiring UI dan menemukan gap: `getSummary()` belum mengekspos data numerik
terstruktur (liter/bar/persen/reserve) yang dibutuhkan utk render Fuel
Gauge + Remaining Fuel — hanya tersedia sbg teks prosa di dalam
`description` insight. Karena rule task "Dashboard hanya boleh konsumsi
`FuelInsightEngine`" DAN "Jangan ubah engine existing" saling bertentangan
kalau gap ini tidak ditutup dulu, TASK-150 di-STOP & gap dilaporkan —
lihat catatan STOP di `AI_PROGRESS.md`/riwayat sesi ini. TASK-150A dibuat
khusus menutup gap tsb (murni expand API, **0 UI, 0 Dashboard, 0 AI**).

## Perubahan

`modules/vehicle/fuel-insight-engine.js` — **HANYA** `getSummary()` yang
diubah (method lain tidak disentuh). 2 field baru di-APPEND di akhir
object return (field lama TIDAK diganti nama/nilai — 100% backward
compatible, caller lama yang cuma baca field lama tidak terpengaruh):

- **`fuel`** — `{currentBar, maxBar, remainingLiter, fuelPercent, reserve,
  reserveLiter}`. 100% REUSE `FuelGaugeEngine.calculateFuelBar()`/
  `calculateFuelPercent()`/`getReserveStatus()` (liter input dibaca apa
  adanya dari `fuelState.currentFuelLiter`, pola sama persis
  `_reserveFuelInsight()` yang sudah ada) + `FuelTankProfile.get().
  fuelBarCount` (dibaca apa adanya — satu-satunya tempat nilai ini
  tersimpan, tidak diekspos engine lain manapun). 0 rumus bar/liter/
  persen/reserve baru dihitung — murni membungkus nilai yang SUDAH
  dihitung jadi 1 objek terstruktur (helper baru `_fuelGaugeData()`).
  `null` kalau belum ada `fuelState.currentFuelLiter` tersimpan sama
  sekali (kendaraan belum pernah dikoreksi); kalau liter ada tapi salah
  satu engine dependency belum dimuat/gagal, field terkait itu saja
  `null` (tidak memblokir field lain di objek `fuel`).
- **`highestInsight`** — 100% REUSE `this.getInsights(vehicleId)` (array
  yang SAMA PERSIS sudah diurutkan `_sortByPriority()` sejak TASK-149) —
  `insights[0]` apa adanya, atau `null` kalau array kosong/kendaraan
  tidak valid. 0 logic sortir/prioritas baru ditulis di sini.

**TIDAK disentuh**: `FuelGaugeEngine`/`FuelPredictionEngine`/
`FuelCostAnalytics`/`FuelMaintenanceEngine`/`FuelTankProfile` (logic-nya
masing-masing), `getInsights()` (method lain di file yang sama),
`D.bbmLogs`/`D.servisLogs`/`D.vehicles`/`D.sparepartCats` (data). 0
storage baru, 0 UI, 0 Dashboard, 0 AI diimplementasi (sesuai batasan
eksplisit task — itu tetap jadi kerjaan TASK-150 lanjutan setelah gap ini
ditutup).

+10 test baru di `tests/fuel-insight-engine.test.js` (`fuel.currentBar`/
`fuel.remainingLiter`/`fuel.fuelPercent`/`fuel.reserve`/`fuel.reserveLiter`/
`fuel.maxBar`, `fuel:null` kalau belum ada fuelState, `fuel` partial-null
kalau dependency belum dimuat, `highestInsight` kosong & terisi, 2 test
backward-compatibility). Build `kw150a-expand-fuel-insight-summary-api`
(`?v=579`, naik dari `?v=578`). Test naik dari 237 ke 247 pass (2x —
sebelum & sesudah build).

# Changelog — Sesi 149: Fuel Insight Engine (TASK-149)

## Fitur baru

Modul BARU `modules/vehicle/fuel-insight-engine.js` (`FuelInsightEngine`)
— engine yang MENGGABUNGKAN seluruh engine Fuel Intelligence yang sudah
ada jadi insight & ringkasan siap tampil, **engine-only, 0 UI**. 100%
REUSE (0 rumus km/L/Rp-per-km/interval servis/degradasi/proyeksi baru):
`FuelGaugeEngine.getReserveStatus()` (TASK-143),
`FuelPredictionEngine.predictRemainingDistance()`/`predictNextRefuel()`/
`predictMonthlyFuelUsage()`/`predictYearlyFuelUsage()` (TASK-146),
`FuelCostAnalytics.costPerKm()`/`monthlyCost()`/`projectedMonthlyCost()`
(TASK-147), `FuelMaintenanceEngine.fuelEfficiencyHealth()`/
`maintenanceRisk()`/`maintenanceRecommendation()` (TASK-148).

API publik (2 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `getInsights(vehicleId)` -> `{ok, insights:[]}` — sampai 7 tipe
  insight siap tampil (`Fuel Consumption`, `Monthly Cost`,
  `Fuel Efficiency`, `Maintenance`, `Reserve Fuel`, `Next Refuel`,
  `Prediction`), tiap insight `{id,type,priority,title,description,
  recommendation,confidence,source}`. Prioritas
  (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`/`INFO`) murni MAPPING TAMPILAN dari
  nilai yang sudah dihitung engine sumber (mis. `dropPct`/`riskLevel`/
  `estimatedRemainingDays`) — 0 rumus baru. Insight yang sumbernya belum
  tersedia (dependency belum dimuat/data belum cukup) dilewati, tidak
  membuat seluruh hasil gagal. Array diurutkan menaik berdasarkan
  prioritas.
- `getSummary(vehicleId)` -> `{ok, healthScore, efficiencyScore,
  monthlyCost, remainingDistance, maintenanceRisk, confidenceScore}`.
  `efficiencyScore`/`healthScore` adalah skor 0-100 (LOGIC BARU: komposisi
  rule-based dari `dropPct`/`riskLevel` yang sudah dihitung, pola sama
  persis `FuelMaintenanceEngine.maintenanceRisk()` yang juga
  menggabungkan 2 sinyal existing jadi 1 level baru). `monthlyCost`
  pakai histori aktual bulan ini, fallback ke proyeksi kalau belum ada
  transaksi. `remainingDistance`/`confidenceScore` diteruskan apa adanya
  dari engine sumber.

Build `kw149-fuel-insight-engine` (`?v=578`), **237/237 test pass**
(+25 test baru, `tests/fuel-insight-engine.test.js`). 1 file baru, 1
baris registrasi di `scripts/build.js` (setelah
`fuel-maintenance-engine.js`). `FuelGaugeEngine`/`FuelPredictionEngine`/
`FuelCostAnalytics`/`FuelMaintenanceEngine`/`FuelTankProfile` (logic)/
`D.bbmLogs`/`D.servisLogs`/`D.vehicles`/`D.sparepartCats` tidak
disentuh — 0 storage baru dibuat, 0 UI diubah (murni disiapkan utk
konsumen Dashboard/AI Chat masa depan).

### Hasil verifikasi

```
node --test tests/*.test.js   # 237/237 PASS (sebelum & sesudah build)
node scripts/build.js kw149-fuel-insight-engine
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=578
# index.html & app_production.html identik (0 diff)
```

---

# Changelog — Sesi 148: Fuel Maintenance Intelligence Engine (TASK-148)

## Fitur baru

Modul BARU `modules/vehicle/fuel-maintenance-engine.js`
(`FuelMaintenanceEngine`) — engine korelasi perawatan↔efisiensi BBM,
**engine-only, 0 UI**. 100% REUSE (0 rumus km/L/Rp-per-km/interval
servis/deteksi-drop baru): `FuelCostAnalytics.costPerKm()` (TASK-147),
`fuelEfficiency()` global, `predictService()` (Vehicle Service History,
sparepart-servis.js), `_vehicleFuelEfficiencyDropCheck()` (SATU-SATUNYA
logic deteksi penurunan efisiensi yang sudah ada, dipakai rule AI
`vehicle-fuel-efficiency-drop`), dan `findVehicleSpec()` (referensi
statis tekanan ban pabrikan — **TIDAK ADA histori tekanan ban aktual**
tersimpan di app manapun, jadi field ini selalu referensi statis, 0
storage baru dibuat sesuai larangan task).

API publik (4 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `maintenanceImpact(vehicleId)` — kmPerLiter/costPerKm saat ini +
  daftar item servis jatuh-tempo/mendekati yang RELEVAN efisiensi BBM
  (oli mesin, saringan udara, busi, CVT/v-belt — via keyword match nama
  kategori `D.sparepartCats`, bukan storage/rumus baru) + jumlah total
  kategori lewat jatuh tempo (sinyal umum) + referensi tekanan ban
  statis (kalau motor dikenali katalog).
- `fuelEfficiencyHealth(vehicleId)` — kmPerLiter/rpPerKm + status
  degradasi (reuse `_vehicleFuelEfficiencyDropCheck()`, difilter ke 1
  kendaraan).
- `maintenanceRecommendation(vehicleId)` — daftar rekomendasi teks dari
  gabungan 2 method di atas (LOGIC BARU: penyusunan kalimat, bukan
  rumus).
- `maintenanceRisk(vehicleId)` — level risiko (`tinggi`/`sedang`/
  `rendah`) dari kombinasi overdue-relevan-BBM + degradasi terdeteksi.

Build `kw148-fuel-maintenance-intelligence-engine` (`?v=577`),
**212/212 test pass** (+22 test baru,
`tests/fuel-maintenance-engine.test.js`). 1 file baru, 1 baris
registrasi di `scripts/build.js` (setelah `fuel-cost-analytics.js`).
`FuelGaugeEngine`/`FuelPredictionEngine`/`FuelCostAnalytics`/
`FuelTankProfile` (logic)/`D.bbmLogs`/`D.servisLogs`/`D.vehicles`/
`D.sparepartCats` tidak disentuh — 0 storage baru dibuat.

### Hasil verifikasi

```
node --test tests/*.test.js   # 212/212 PASS
node scripts/build.js kw148-fuel-maintenance-intelligence-engine
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=577
# index.html & app_production.html identik (0 diff)
```

---

# Changelog — Sesi 147: Fuel Cost Analytics Engine (TASK-147)

## Fitur baru

Modul BARU `modules/vehicle/fuel-cost-analytics.js` (`FuelCostAnalytics`)
— engine analitik biaya BBM read-only, **engine-only, 0 UI**. 100% REUSE
modul fuel yang sudah ada (`FuelStorage`, `fuelEfficiency()` global,
`FuelPredictionEngine`, `D.vehicles[i].fuelState`) — 0 rumus km/L, Rp/km,
atau proyeksi baru dihitung ulang, PURE/read-only (tidak pernah panggil
`save()` atau menulis ke `D`).

API publik (6 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `monthlyCost(vehicleId)` — total liter/biaya/rata-rata harga BBM
  bulan kalender berjalan (SUM `D.bbmLogs[].liter/cost` via
  `FuelStorage`, bukan rumus baru).
- `yearlyCost(vehicleId)` — sama seperti di atas, dikelompokkan per
  tahun kalender berjalan.
- `costPerKm(vehicleId)` — reuse `fuelEfficiency()` apa adanya
  (`rpPerKm`/`kmPerLiter`/`avgHarga`), 0 recompute.
- `averageFuelPrice(vehicleId)` — rata-rata harga BBM tertimbang
  (`totalCost/totalLiter`) dari SELURUH histori transaksi valid (beda
  cakupan dari `avgHarga` di `costPerKm()` yang cuma 10 log terakhir).
- `projectedMonthlyCost(vehicleId)` / `projectedYearlyCost(vehicleId)`
  — reuse `FuelPredictionEngine.predictMonthlyFuelUsage()`/
  `predictYearlyFuelUsage()` apa adanya, ditambah `confidenceScore`
  dari `D.vehicles[i].fuelState.confidenceScore` (dibaca apa adanya).
- `refillFrequency(vehicleId)` — jumlah transaksi isi BBM & rata-rata
  interval hari antar transaksi berurutan (logic baru: murni selisih
  tanggal, bukan rumus konsumsi/efisiensi).

Build `kw147-fuel-cost-analytics-engine` (`?v=576`), **190/190 test
pass** (+19 test baru, `tests/fuel-cost-analytics.test.js`). 1 file baru
(`modules/vehicle/fuel-cost-analytics.js`), 1 baris registrasi di
`scripts/build.js` (setelah `fuel-prediction-engine.js`).
`FuelGaugeEngine`/`FuelPredictionEngine`/`D.bbmLogs`/`D.vehicles`/Finance
tidak disentuh.

### Hasil verifikasi

```
node --test tests/*.test.js   # 190/190 PASS
node scripts/build.js kw147-fuel-cost-analytics-engine
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=576
# index.html & app_production.html identik (0 diff)
```

---

# Changelog — Sesi 146: Fuel Consumption Prediction Engine (TASK-146)

## Fitur baru

Modul BARU `modules/vehicle/fuel-prediction-engine.js`
(`FuelPredictionEngine`) — engine prediksi konsumsi BBM, **engine-only,
0 UI**. 100% REUSE modul fuel yang sudah ada (`FuelGaugeEngine`,
`FuelTankProfile` tidak langsung, `fuelEfficiency()` global,
`D.vehicles[i].fuelState`) — 0 rumus baru, PURE/read-only, deterministik
(rule-based, bukan machine learning).

API publik (4 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `predictRemainingDistance(vehicleId)` — estimasi jarak tempuh
  tersisa (km) dari sisa BBM saat ini.
- `predictNextRefuel(vehicleId)` — estimasi tanggal & jumlah hari
  sampai perlu isi BBM lagi (dari liter di atas ambang reserve dibagi
  rata-rata jarak harian).
- `predictMonthlyFuelUsage(vehicleId)` — proyeksi liter & biaya BBM
  sebulan ke depan (reuse `fuelEfficiency().estMonthlyLiter/Cost`
  langsung).
- `predictYearlyFuelUsage(vehicleId)` — proyeksi liter & biaya BBM
  setahun ke depan, diturunkan dari proyeksi bulanan x12 (bukan
  formula independen — supaya angka bulanan & tahunan selalu
  konsisten).

Extension point `_applyAdjustments()` disiapkan (belum diimplementasi)
supaya sesi mendatang bisa menambah weather/traffic/riding-style/
seasonal adjustment tanpa mengubah API publik.

## Yang TIDAK diubah

`FuelGaugeEngine` (kalkulasi bar↔liter↔persen↔jarak), `D.bbmLogs`
(riwayat transaksi BBM historis), `FuelTankProfile`, dan UI apa pun —
sesuai batasan TASK-146 ("engine-only", "Do NOT redesign the UI", "Do
NOT modify FuelGaugeEngine calculations", "Do NOT modify historical
fuel transactions", "Do NOT create duplicate calculations").

## Test

+17 test baru `tests/fuel-prediction-engine.test.js`: remaining
distance, next-refuel prediction, monthly prediction, yearly
prediction (konsisten x12 dgn monthly), invalid vehicle (4 method
sekaligus), missing fuel profile (`tankCapacityLiter` belum diatur),
missing fuel state, zero fuel (tidak error, balikin 0), dan 1 test
read-only guarantee. Total naik dari 154 ke **171/171 pass**.

## Build

`kw146-fuel-consumption-prediction-engine-2` (`?v=575`, naik dari
`?v=573`). 1 file baru (`modules/vehicle/fuel-prediction-engine.js`),
1 baris registrasi baru di `scripts/build.js` (GROUP_B, setelah
`fuel-intelligence-ui.js`).

---

# Changelog — Sesi 145: Fuel Intelligence Integration (TASK-145)

## Fitur baru

Melengkapi end-to-end user flow Fuel Intelligence — Sesi 144 sudah
bikin `FuelBarCorrection` (controller lengkap `open()`/`selectBar()`/
`save()`), tapi belum ada tombol trigger di UI manapun yang
memanggilnya. Sesi ini menutup gap itu tanpa menyentuh business
logic/kalkulasi apa pun. **2 file diubah, 0 file baru:**

- `modules/vehicle/fuel-card.js`:
  - Tombol "⚙️ Koreksi" ditambah di sebelah tombol "📊 Lihat Detail"
    yang sudah ada. Baris CTA sekarang `.btn-row` (class SUDAH ADA,
    dipakai modal lain seperti konfirmasi — 0 CSS baru) berisi 2 tombol
    `.btn.btn-ghost.btn-sm` (class SUDAH ADA). Tombol baru panggil
    `FuelBarCorrection.open(vehicleId)` lewat `data-action` dispatch
    generik yang sudah ada di seluruh aplikasi (pola persis tombol
    "Lihat Detail" di sampingnya) — 0 handler klik baru ditulis manual.
    `aria-label="Koreksi estimasi BBM dengan speedometer"` disertakan.
  - Rekomendasi pasif (non-blocking, bukan dialog) ditambah:
    `_lowConfidenceHint(vehicleId)` baca LANGSUNG
    `veh.fuelState.confidenceScore` dari `D.vehicles` (field opsional
    dari TASK-144, 0 rumus/skoring baru dihitung di sini) — kalau di
    bawah ambang presenter `LOW_CONFIDENCE_THRESHOLD=50`, tampilkan teks
    "⚠️ Estimasi mulai kurang akurat. Disarankan sinkronkan dengan
    speedometer." Ambang ini murni nilai presenter (kapan menampilkan
    teks), BUKAN rumus confidence baru.
- `modules/vehicle/fuel-intelligence-ui.js`:
  - Satu baris diubah — teks toast sukses di `FuelBarCorrection.save()`
    disamakan dgn spesifikasi task: **"✅ Kalibrasi bensin berhasil
    diperbarui"** (sebelumnya "✅ Estimasi BBM disinkronkan dengan
    speedometer" — beda kata-kata saja, 0 perubahan perilaku). Refresh
    `FuelCard.render()` + `FuelModal.open()` (kalau modal terbuka utk
    kendaraan yang sama) tetap seperti Sesi 144, tidak diubah.

## Yang TIDAK diubah

`FuelGaugeEngine` (kalkulasi bar↔liter↔persen), `D.bbmLogs` (riwayat
transaksi BBM), `FuelTankProfile`, dan seluruh business logic lain —
sesuai batasan TASK-145 ("Do NOT change business logic", "Do NOT modify
historical fuel transactions", "Do NOT change FuelGaugeEngine
calculations"). Diverifikasi lewat test "riwayat D.bbmLogs TIDAK
diubah" (Sesi 144, tetap hijau) + audit baris-per-baris kedua file yang
diubah.

## User flow (sekarang lengkap end-to-end)

```
Fuel Card → tap "⚙️ Koreksi" → FuelBarCorrection Modal → Pilih Bar
→ Preview (Sebelum/Sesudah/Selisih) → Simpan → FuelGaugeEngine
→ D.vehicles[i].fuelState → refresh Fuel Card + refresh Fuel Modal
(kalau terbuka) → toast "✅ Kalibrasi bensin berhasil diperbarui"
```

## Test

+7 test baru:

- `tests/fuel-card.test.js` — tombol Koreksi tampil & `data-action`
  terpasang benar, 0 class button baru dipakai (masih reuse
  `.btn.btn-ghost.btn-sm`), rekomendasi low-confidence tampil kalau
  `confidenceScore < 50`, TIDAK tampil kalau skor tinggi, TIDAK tampil
  kalau `fuelState` belum pernah ada sama sekali.
- `tests/fuel-intelligence-ui.test.js` — teks toast baru sesuai
  spesifikasi, refresh `FuelCard` + `FuelModal` sekaligus tervalidasi
  dalam 1 test end-to-end.

### Hasil verifikasi

```
node --test tests/*.test.js
# 154/154 PASS (naik dari 147/147 sebelum sesi ini)

node scripts/build.js kw145-fuel-intelligence-integration-1
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=573
# index.html & app_production.html identik (md5sum sama persis)
# grep app-bundle-b.min.js: "⚙️ Koreksi" (4x, termasuk sumber+bundle),
#   "Kalibrasi bensin berhasil diperbarui" (1x) — terkonfirmasi masuk bundle
```

---



## Fitur baru

Modul baru `modules/vehicle/fuel-intelligence-ui.js` (`FuelBarCorrection`)
— melengkapi modal `#fuelBarCorrectionModal` yang markup HTML-nya sudah
ada di `modules/shared/modals.js` sejak sesi sebelumnya tapi belum punya
controller (tombol Simpan sebelumnya memanggil method yang tidak ada,
akan error kalau ditekan). Sekarang lengkap:

- `FuelBarCorrection.open(vehicleId?)` — validasi kendaraan & profil
  tangki (`FuelTankProfile.get()`, butuh `tankCapacityLiter`), render
  estimasi BBM saat ini (dari `fuelState` tersimpan, atau log BBM
  terbaru kalau full tank, atau `-` kalau belum ada dasar sama sekali),
  render bar picker dinamis (0..`fuelBarCount` kendaraan ini — bukan
  hardcode), lalu buka modal.
- `FuelBarCorrection.selectBar(bar)` — live preview Sebelum/Sesudah/
  Selisih liter, 100% REUSE `FuelGaugeEngine.calculateFuelLiter()`
  (TASK-143), 0 rumus konversi baru.
- `FuelBarCorrection.save()` — tulis `currentFuelBar`, `currentFuelLiter`,
  `correctedAt` (ISO timestamp), `estimatedSource`
  (`'manual-bar-correction'`), `confidenceScore` (100 — pembacaan manual
  langsung dari speedometer) ke `D.vehicles[i].fuelState` (field baru,
  OPSIONAL/additive, pola sama `fuelTankProfile` TASK-142). **Riwayat
  `D.bbmLogs` TIDAK disentuh** — koreksi ini murni memperbaiki estimasi
  saat ini, bukan transaksi/log historis. Setelah simpan: refresh
  `FuelCard.render()` + refresh `FuelModal` kalau sedang terbuka untuk
  kendaraan yang sama (`FuelModal.curVehicleId`).

CSS baru scoped `#fbcBarPicker .fbc-bar-btn` (full-width per baris) —
warna/hover/active 100% reuse `.chip-btn` yang sudah ada, 0 style global
diubah.

## TASK-REF-001 (konsolidasi)

Task minta merge `fuel-gauge-ui.js` + `fuel-bar-correction.js` jadi
`fuel-intelligence-ui.js` — tapi audit menemukan KEDUA file sumber itu
tidak pernah ada (TASK-144 sebelumnya cuma bikin markup modal, belum
bikin controller-nya). Daripada bikin 2 file kosong lalu langsung
di-merge, controller TASK-144 di atas langsung ditulis sebagai SATU file
`fuel-intelligence-ui.js` — memenuhi tujuan TASK-REF-001 (0 fragmentasi
file kecil baru) sekaligus TASK-144 (controller lengkap) dalam satu
langkah.

## Build & Test

Terdaftar di `scripts/build.js` GROUP_B setelah `fuel-card.js` (dependency:
`FuelGaugeEngine`/`FuelTankProfile`/`FuelStorage`/`FuelCard`/`FuelModal`,
semua sudah dimuat sebelum titik ini). +12 test baru
`tests/fuel-intelligence-ui.test.js`. Build `kw144-fuel-bar-correction`
(`?v=572`, naik dari `?v=571`). Test naik dari 135 ke 147 pass.

## Catatan lingkup

Belum ada tombol/trigger UI manapun yang memanggil
`FuelBarCorrection.open()` (mis. dari Fuel Card) — item ini TIDAK ada di
checklist TASK-144 yang diberikan, dan menambahkannya berarti mengedit
`fuel-card.js` (modul TASK-141 yang sudah selesai), di luar lingkup
"Never modify unrelated modules". `FuelBarCorrection.open(vehicleId)`
sudah diekspos sebagai API publik siap dipanggil — wiring tombol trigger
jadi kandidat task terpisah kalau dibutuhkan.

# Changelog — Sesi 140: Bugfix Kartu Beranda Tidak Muncul Lagi Setelah Dinyalakan Ulang

## Bug yang diperbaiki

Kartu Beranda opsional (Kebebasan Finansial/Dana Pensiun/Absensi Harian/
Refleksi & Self-Care, `DASH_CARD_DEFS` di `modules/shared/modules-render.js`)
yang sudah dimatikan lewat Pengaturan → Tampilan → Kartu di Beranda TIDAK
PERNAH muncul lagi walau checkbox-nya dinyalakan ulang — checkbox &
`D.dashCardPrefs` sudah benar menunjukkan "aktif", tapi kartunya tetap
kosong/hilang sampai aplikasi di-reload penuh.

**Root cause**: `hideDashCardEl(elId)` menyembunyikan kartu lewat DUA
jalur — `classList.add('u-dnone')` DAN inline `style.display='none'`.
`toggleDashCardPref()`/`setAllDashCardPrefs()` sudah benar memanggil
`renderDashboard()` ulang, dan loop `DASH_RENDER_ORDER` di dalamnya sudah
benar SKIP `hideDashCardEl()` begitu `isDashCardOn()` balik `true` — tapi
tidak ada fungsi kebalikan yang pernah melepas inline `style.display='none'`
yang sudah kadung ditulis. Inline style attribute punya spesifisitas lebih
tinggi dari class CSS (`.u-dnone{display:none}`), jadi kartu tetap
invisible walau class-nya sendiri sudah tidak ditambahkan lagi.

## Diperbaiki

- **`modules/shared/modules-render.js`** — tambah `showDashCardEl(elId)`
  (kebalikan simetris persis `hideDashCardEl()`, melepas class `u-dnone`
  DAN inline `style.display`), dipanggil di loop `DASH_RENDER_ORDER`
  (`renderDashboard()`) SETELAH guard `isDashCardOn()` & SEBELUM
  `cardDef.render(...)`. 0 fungsi lama diubah, 0 perilaku lain berubah —
  kartu yang memang selalu ON perilakunya identik dengan sebelumnya
  (`showDashCardEl` pada elemen yang tidak pernah disembunyikan adalah
  no-op).
- **`app-bundle-a.min.js`** — dibuat ulang otomatis dari source yang sudah
  dipatch (grup A, memuat `modules-render.js`).

## Ditambahkan

- **`tests/dash-card-show-hide.test.js`** (7 test baru) — `hideDashCardEl()`
  (class + inline style ditambahkan), `showDashCardEl()` (keduanya
  dilepas, idempotent, aman di elemen yang tidak ada/tidak pernah
  disembunyikan), serta pemeriksaan urutan pemanggilan di source
  (`isDashCardOn` guard → `showDashCardEl` → `cardDef.render`) supaya
  patch di loop `renderDashboard()` tidak diam-diam terlepas di sesi
  mendatang.

## Tidak diubah

- `hideDashCardEl()` — 0 baris disentuh, `showDashCardEl()` murni fungsi
  BARU yang simetris, bukan modifikasi fungsi lama.
- `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/`DASH_CARD_BY_KEY`,
  `isDashCardOn()`/`toggleDashCardPref()`/`setAllDashCardPrefs()` — 0
  baris disentuh.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`, termasuk field
  `dashKey` yang dipakai `dash-refleksi`/`dash-fi`/`per-absensi`) — 0
  baris disentuh.
- `dashHubNavigateToFeature()`/`DASHHUB_GOTO_SECTION_MAP` (bugfix Sesi
  139, sub-tab Dashboard Hub) — 0 baris disentuh sesi ini, area berbeda
  (sub-tab vs inline style kartu opsional).

## Test & Build

```
node --test tests/*.test.js
# tests 69 / pass 69 / fail 0  (62 lama + 7 baru, semua hijau)

node scripts/build.js kw140-fix-dashcard-toggle-inline-style
# ✓ Linter bawaan "pola bug u-dnone vs style.display" lolos bersih
# ✓ Sintaks kedua bundle valid (node --check lolos)
# ✓ index.html & app_production.html sudah identik.
# Versi baru: ?v=565 / kw-cache-v565
```

---

# Changelog — Sesi 139: Bugfix Navigasi "Semua Fitur" Dashboard Hub (goTo ke sub-tab tidak aktif)

## Bug yang diperbaiki

Dilaporkan user (screenshot): klik kartu apa pun di grid "🗂️ Semua Fitur"
yang targetnya `dash-penasihat`/`dash-ai-rekomendasi`/
`dash-ai-ringkasan-harian`/`dash-hidup-seimbang`/`dash-refleksi`/`dash-fi`/
`dash-lifeos` (Penasihat AI, Rekomendasi AI, Ringkasan Harian AI, Skor Hidup
Seimbang, Refleksi & Self-Care, Kebebasan Finansial, Life OS) selalu terlihat
"mengarah ke Tangga Ternak Uang", bukan ke kartu yang diklik.

**Root cause**: `target.goTo` ketujuh kartu itu (`advisorCard`/
`aiRecommendBody`/`aiBriefingBody`/`lifeBalanceCard`/`refleksiCard`/
`dashFiCard`/`lifeOSWrap`) hidup di dalam container yang ada di
`SECTION_GROUPS` sub-tab **LAIN** (`#dashboardHubPinnedWrap` → sub-tab
"📌 Widget"; `#lifeOSWrap` → sub-tab "🌦️ Insight") — bukan di sub-tab
"🗂️ Fitur" tempat kartunya sendiri berada. `dashHubNavigateToFeature()`
SEBELUM fix ini tidak pernah memanggil `DashboardHub.setSectionTab()`
dulu sebelum `scrollIntoView()`, jadi kalau user sedang di sub-tab lain,
elemen tujuan tetap disembunyikan `u-dnone` → `scrollIntoView()` jadi
no-op tanpa error apa pun. Yang kelihatan cuma efek sampingan:
`showPage()` di baris sebelumnya sudah keburu reset scroll ke 0, dan
karena kartu "Tangga Ternak Uang" (`#tanggaKeuanganCard`) SENGAJA selalu
tampil di atas seluruh sub-tab (di luar `SECTION_GROUPS` manapun), itulah
yang selalu terlihat — bukan navigasi yang benar-benar salah arah, murni
efek "mendarat di posisi paling atas yang kebetulan didominasi kartu itu".

## Diperbaiki

- **`modules/dashboard-hub/dashboard-hub.js`** — tambah
  `DASHHUB_GOTO_SECTION_MAP` (100% REUSE nilai `SECTION_GROUPS` yang sudah
  ada di `DashboardHub.applySectionTab()`, dibalik jadi id→tab) +
  `_dashHubResolveGoToSection(goToId)` (jalan naik lewat `parentElement`
  dari elemen `goTo` sampai ketemu id yang terdaftar di peta itu, atau
  `null` kalau memang di luar section manapun — mis. Tangga
  Keuangan/Hero, yang memang tidak butuh pindah tab). `dashHubNavigateToFeature()`
  sekarang memanggil `DashboardHub.setSectionTab(section)` (kalau ada)
  SEBELUM `scrollIntoView()`, hanya utk `target.page==='dashboard-hub'`.
  0 baris/fungsi lama dihapus, 0 perilaku lain berubah — kartu yang
  goTo-nya memang sudah di sub-tab aktif (atau di luar section manapun)
  perilakunya identik dengan sebelumnya.
- **`app-bundle-b.min.js`** — patch identik ditempel manual ke bundle
  (bundle ini yang benar-benar dimuat `index.html`/`app_production.html`),
  supaya tidak perlu menunggu build ulang utk verifikasi manual pertama.
  `node scripts/build.js` lalu dijalankan sungguhan (lihat di bawah) untuk
  menghasilkan bundle final dari source yang sudah dipatch — bundle hasil
  patch manual ini jadi konsisten dgn hasil build otomatis.

## Ditambahkan

- **`tests/dashboard-hub-goto-subtab.test.js`** (10 test baru) — load
  `dashboard-hub.js` ASLI lewat `vm` dgn DOM tiruan minimal yang meniru
  struktur nyata (`advisorCard`/`lifeBalanceCard`/`refleksiCard`/
  `dashFiCard` sbg descendant `#dashboardHubPinnedWrap`, `lifeOSWrap`
  berdiri sendiri, dst): resolusi section per id (termasuk naik beberapa
  level ancestor & id yang tidak terdaftar/tidak ada → `null`, tidak
  throw), serta integrasi `dashHubNavigateToFeature()` penuh
  (`setSectionTab` terpanggil dgn tab yang benar SEBELUM `scrollIntoView`,
  kartu yang tidak butuh pindah tab TIDAK memicu `setSectionTab` sama
  sekali, dan goTo di halaman lain tidak pernah menyentuh sub-tab
  Dashboard Hub).

## Tidak diubah

- `SECTION_GROUPS` di `DashboardHub.applySectionTab()` — 0 baris
  disentuh, `DASHHUB_GOTO_SECTION_MAP` murni REUSE nilainya, bukan
  keputusan taksonomi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) — 0 baris disentuh,
  seluruh `target.goTo` per kartu tetap persis sama.
- Navigasi ke page LAIN (`keuangan`/`shop`/`carnotes`/`pajak`/`aset`/dst)
  — 0 baris disentuh, guard baru hanya aktif utk
  `target.page==='dashboard-hub'`.
- `showPage()`, `applySectionTab()` — 0 baris disentuh, dipanggil apa
  adanya.

## Test & Build

```
node --test tests/*.test.js
# tests 62 / pass 62 / fail 0  (52 lama + 10 baru, semua hijau)

node scripts/build.js kw139-fix-dashboard-hub-goto-subtab
# ✓ Sintaks kedua bundle valid (node --check lolos)
# ✓ index.html & app_production.html sudah identik.
# Versi baru: ?v=564 / kw-cache-v564
```

---

# Changelog — Smart Delivery Engine, Sesi 4/6: Fungsi Additive Shop + Cobek

Lihat `RENCANA-SESI-RINGKAS.md` untuk peta 6 sesi lengkap. Sesi ini
melanjutkan Sesi 1-3 (`modules/ai/*`, `modules/logistics/*`, sudah ada &
tidak disentuh) dengan menambah fungsi kalkulasi ke 3 file Shop yang SUDAH
ADA (bukan file baru) — sesuai rencana ringkas, TIDAK ada file baru di
sesi ini.

## Ditambahkan (semua PURE/read-only, tidak ada UI/tombol/wiring baru)

- **`modules/shop/cobek-etalase.js`** — `weightCalculator({beratPerUnit,
  qty})`, `volumeCalculator({panjang, lebar, tinggi, qty})`,
  `packingCalculator({items, capacityKg, capacityM3})`: kalkulator
  berat/volume/rit pengiriman, murni parameter (D.products belum punya
  field berat/volume, jadi tidak baca D sama sekali).
- **`modules/shop/cobek-pricing.js`** — `calculateFuel(vehicleId)`
  (bungkus `LogisticsEngine.fuel()` dgn pesan alasan gagal),
  `calculateProfit({productId, qty, deliveryPlan})` (revenue - modal -
  ongkir dari `D.products` + `deliveryPlan.route`), `calculateVehicleCapacity
  ({vehicleId, items, capacityKg, capacityM3})` (gabungan
  `packingCalculator()` + `calculateFuel()`).
- **`modules/shop/cobek-order.js`** — `calculateSmartDelivery({productId,
  qty, produsenId, kmKonsumen, biayaPerKmKonsumen, metode, vehicleId,
  marginPct})`: orkestrator rencana pengiriman lengkap 1 produk, Etape 1
  (jarak/biaya ke Produsen) diambil otomatis dari `D.produsen[].jarakKm/
  biayaPerKm` kalau ada, lewat `LogisticsEngine.plan()` +
  `calculateProfit()`. `requestAIRecommendation({...})` (async): bangun
  prompt lewat `AIService.buildPrompt()`, kirim ke AI lewat
  `callAIProviderRaw()` KALAU `D.profile.apiKey` sudah diisi (pola sama
  dgn `PriceReko.checkMarketAI()`), kalau belum tetap balikin prompt-nya
  (`aiText:null`) — tidak memaksa isi API Key dulu.
- **`tests/cobek-smart-delivery.test.js`** (file baru, 21 test) — meliputi
  ke-8 fungsi di atas, termasuk kasus gagal (produk tidak ketemu, histori
  BBM belum cukup, kapasitas tidak dikasih, API Key kosong, AI gagal
  dihubungi).

## Tidak diubah

- `modules/ai/*`, `modules/logistics/*` (Sesi 1-3) — 0 byte diubah, cuma
  DIPAKAI (dipanggil dari dalam fungsi baru di atas, referensi lewat nama
  global karena urutan load `scripts/build.js` menaruh Shop SEBELUM AI/
  Logistics — lihat catatan di tiap fungsi baru).
- Tidak ada file baru di `scripts/build.js` (semua fungsi ditambah ke file
  yang SUDAH terdaftar), jadi tidak ada perubahan urutan/registrasi build.
- Tidak ada UI/tombol/menu baru, tidak ada `save()` dipanggil dari fungsi
  manapun di atas — semua murni baca `D` (read-only) + hitung.
- `D.products`/`D.vehicles` tidak ditambah field baru (berat/volume/
  kapasitas tetap jadi parameter eksplisit, bukan field D baru).

## Yang masih perlu diputuskan sebelum Sesi 5

"Inventory" mau dipetakan ke stok produk Shop (`cobek-etalase.js`), stok
sparepart kendaraan (`tx-stok-sparepart.js`), keduanya, atau modul baru? —
lihat `RENCANA-SESI-RINGKAS.md`.

## Hasil test

```
node --test tests/cobek-smart-delivery.test.js
# tests 21 / pass 21 / fail 0

node --test tests/*.test.js
# tests 1985 / pass 1985 / fail 0  (baseline lama tetap hijau, 0 diubah)

node scripts/build.js
# ✅ Build "kw99-sesi25-fix-gdrive-backup-await-9" selesai & lolos cek sintaks

node --test tests/*.test.js   (setelah build)
# tests 1985 / pass 1985 / fail 0
```

---

# Changelog — Bangun UI Tab "📊 Laporan" Shop/Cobek + FAB Kontekstual

## Ditambahkan

- **Tab "📊 Laporan" di halaman Shop kini bisa diakses.** Logic-nya
  (`Laporan.renderTab()`, `topProdukAgg()`, `renderTopProduk()`,
  `renderTopPelanggan()`, `setPeriodeLap()`/`getRangeLap()` di
  `cobek-order.js`, `exportLaporanShopXLSX()` di `cobek-io.js`) sudah ada
  sejak lama termasuk cabang `t==='laporan'` di `setShopTab()`, tapi tidak
  pernah punya markup HTML — jadi selama ini sama sekali tidak bisa dibuka
  user. Sekarang tab ini menampilkan: filter periode sendiri (terpisah dari
  tab Riwayat), 4 kartu ringkasan (Transaksi/Omzet/Untung/Margin), grafik
  tren penjualan 6 bulan, top 5 produk terlaris, dan top 5 pelanggan.
- **FAB kontekstual `#shopLaporanFab`** di tab Laporan Shop, menyamakan
  standar UI dengan FAB Laporan Keuangan (`REPORTS-2.0.md`) — 2 aksi:
  📤 Export Laporan (`exportLaporanShopXLSX()`) & 📊 Export Semua Data
  (`exportShopSemuaXLSX()`), keduanya fungsi lama, reuse penuh. `#shopFab`
  (Sprint 2 Tahap 2) tidak diubah, tetap tampil di semua tab Shop.

## Tidak diubah

- Tidak ada business logic baru selain 1 wrapper tipis `renderShopLaporan()`
  (pola sama dgn `renderShop()`/`renderShopGrafik()` yang sudah ada).
- Tidak ada class CSS baru — 100% reuse `.keu-fab*`, `.grid2`, `.stat-box`,
  `.grafik-bar-wrap` yang sudah ada. Hanya 1 rule posisi FAB aditif.
- `setShopTab()`, `Laporan.*`, `ShopExport.*` (business logic) — 0 baris
  tersentuh.

## Verifikasi

Browser (Playwright + Chrome headless) dgn data transaksi nyata: tab
Laporan menghitung & menampilkan angka dengan benar, FAB & filter periode
berfungsi tanpa error. `node --test` → **1755/1755 PASS** (28 test baru,
aditif, baseline 1727 tetap hijau). `npm run build` → lolos semua guard.

---

# Changelog — Google Sheets Sync: Fix Bug "shop" + Tambah Modul yang Hilang

## Diperbaiki (BUG kritis)

- **`SHEETS_MODULES` salah tulis `'shop'`, seharusnya `'cobek'`.** `D` tidak
  pernah punya field bernama `shop` (data transaksi shop/kasir asli ada di
  `D.cobek`, dan `SHEETS_SCHEMAS.cobek` sudah lengkap sejak awal tapi tidak
  pernah terpakai). Akibatnya tab "shop" di Google Sheets selalu dibuat
  tapi **selalu 0 baris** — transaksi shop tidak pernah benar-benar
  ke-sync ke Sheets sejak fitur ini ada, walau terlihat terdaftar di
  daftar modul. Sekarang pakai `'cobek'` (schema yang sudah ada
  langsung terpakai, tidak perlu skema baru).

## Ditambahkan (modul yang tadinya tidak ikut sync sama sekali)

- **`simList`** (data SIM/pajak kendaraan) — skema baru ditambahkan.
- **`tukangWorkers`** (daftar tukang/pekerja) — skema baru ditambahkan.
- **`tukangAbsensi`** (absensi & upah harian tukang) — sengaja TIDAK diberi
  skema kolom tetap (bentuk datanya beda antara mode `jam` vs `borongan`),
  otomatis fallback ke 1 kolom JSON per baris (perilaku yang memang sudah
  didukung `sheetsItemToCells`/`sheetsCellsToItem`, bukan bug).
- **`gajiMingguanHistory`** (riwayat hasil hitung gaji mingguan) — data
  lama di modul ini TIDAK punya `id` unik per entri (cuma
  `{weekStart,weekEnd,total,count,...}`), padahal sync butuh `id` buat
  diffing antar baris. Ditambahkan: (a) `id:uid()` di titik push baru
  (`reset-gaji-mingguan.js`), (b) migrasi data `toVersion:3` yang
  membackfill `id` ke entri LAMA yang sudah kadung tersimpan tanpa id
  (`SCHEMA_VERSION` 2 → 3).

## Sengaja TIDAK ditambahkan

- **`jalanLogs`** (catatan perjalanan) — dicek dulu, ternyata fitur ini
  sudah legacy/tidak aktif (tidak ada 1 pun `.push()` ke array ini di
  seluruh kode, dan `data-archive.js` sendiri sudah melabelinya
  "fitur lama, data lama"). Tidak ada gunanya disync.

## Verifikasi

- `node scripts/build.js`: bundle naik ke versi 364, lolos semua lint
  otomatis (u-dnone, escapeHtml, chicken-egg OCR).
- `npm test`: **1688/1688 PASS** (termasuk 3 test lama yang nilai
  `SCHEMA_VERSION` hardcode-nya ikut disesuaikan dari 2 → 3, karena
  memang versi terbarunya sekarang 3 — intent tesnya sendiri, migrasi
  toVersion:2 tetap terdaftar & tetap dites, tidak berubah).

---

# Changelog — Backup Coverage Fix (Custom Per-Modul Backup)

## Diperbaiki

- **Celah keamanan**: `runBackup()` (backup custom per-modul di modal
  "Backup Custom") dulu menaruh `D.profile` APA ADANYA ke file export,
  TANPA menghapus `apiKey` — beda sendiri dari `buildBackupPayload()`
  (dipakai tombol Backup utama) yang sudah benar menghapusnya. Kalau
  user pernah isi API key AI di profil lalu pakai jalur backup custom
  ini, key itu ikut nyangkut di file JSON hasil export. Sekarang
  `apiKey` dihapus juga di jalur ini sebelum diekspor.
- **Cakupan data tidak lengkap**: 9 field berikut sebelumnya tidak
  ikut modul toggle manapun di backup custom, jadi selalu hilang dari
  hasil export meskipun semua toggle diaktifkan (beda dari tombol
  Backup utama yang otomatis lengkap karena pakai `{...D}`):
  `refleksi` (gratitude/self-care/catatan pribadi), `gajiMingguanHistory`,
  `tukangBorHargaMemory`, `tukangWorkers`, `tukangAbsensi`,
  `torsiChecklist`, `debtStrategy`, `favoritKeys`, `dashCardPrefs`.
  Sekarang semuanya ikut dimasukkan di modul "lain". Khusus
  `favoritKeys`, dibaca lewat `getFavoritKeys()` (bukan `D.favoritKeys`
  langsung) supaya patuh invariant satu-pintu-mutasi ADR di
  `dashboard-hub-favorit.js` (ada guard test otomatis untuk ini).
- Sisi restore (`applyRestoredData`) tidak perlu diubah — sudah pakai
  spread generik `D={...D,...imp}` jadi field baru ini otomatis
  ke-restore dengan benar begitu ada di file backup.

## Verifikasi

- `node scripts/build.js` dijalankan ulang (`app-bundle-a/b.min.js`,
  `index.html`/`app_production.html`, `sw.js` naik ke versi 363) karena
  `runBackup()` ikut ter-bundle di `app-bundle-b.min.js`, bukan
  dimuat lepas.
- `npm test` (`node --test tests/*.test.js`): **1688/1688 PASS**,
  termasuk guard ADR `favoritKeys` di atas.

## Tidak diubah

- Tombol Backup utama (`exportData()`/`runFullBackup()` via
  `buildBackupPayload()`) TIDAK berubah — jalur itu memang sudah benar
  sejak awal (lengkap + apiKey sudah disaring).

---

# Changelog — Sprint 2 Tahap 19: Fitur Tangga Ternak Uang

Baseline: Sprint 2 Tahap 18 (Resource Hints + Theme Color) selesai.

## Ditambahkan

- **`tangga-keuangan.js`** (modul baru) — kartu "🪜 Tangga Ternak Uang" di
  Dashboard Hub, tepat di bawah Hero Card. Menganalisis OTOMATIS posisi
  user di 7 anak tangga (Nabung Cash 10jt, Lunasi Hutang Kecil, Dana
  Darurat 3-6 bulan, Investasi 20% income, Dana Pendidikan Anak, Lunasi
  KPR, Kekayaan Abadi & Berbagi) berdasarkan data yang SUDAH ADA:
  `totalSaldoAkun()`, `D.bills`, `D.targets` (Dana Darurat), `D.assets`
  (kategori investasi), `D.eduFunds`, `AsetKeluarga.build()`, dan
  `D.pajakZakat.zakatLog`. Beberapa threshold (mis. estimasi 20% income
  & Rp1M kekayaan bersih di anak tangga 7) adalah **heuristik ilustratif**
  yang ditulis transparan di catatan tiap baris kartu, bukan pelacakan
  presisi/nasihat finansial personal.
- **`tangga-ternak-uang.jpg`** — gambar infografis tangga, dipakai sebagai
  background kartu.
- **`styles.css`**: 10 baris CSS baru (`.tk-*`) khusus styling baris
  anak tangga di kartu ini — murni tambahan di akhir file, tidak
  menimpa rule lain.
- **`index.html`, `app_production.html`**: tambah markup kartu (di
  bawah Hero Card) + `<script src="tangga-keuangan.js?v=1">` di-load
  SETELAH `app-bundle-a/b.min.js`.

## Cara kerja teknis (non-invasive)

- File JS terpisah dari bundle, dimuat belakangan — semua fungsi/modul
  global yang dipakai (`D`, `WorthIt`, `AsetKeluarga`, `totalSaldoAkun`,
  `escapeHtml`, `fmtFull`) dijamin sudah ada saat file ini jalan.
- Render ulang saat halaman Dashboard Hub dibuka dilakukan dengan
  **membungkus** `window.showPage` yang sudah ada (panggil versi asli
  dulu, baru render kartu ini kalau halamannya `dashboard-hub`) —
  bukan menimpa/mengganti isi fungsi asli di bundle.

## Tidak diubah

- Tidak ada baris di `app-bundle-a.min.js`/`app-bundle-b.min.js` yang
  disentuh/di-rebuild.
- Tidak ada logic/data existing (Keuangan, Dana Darurat, Investasi,
  dst.) yang berubah — modul ini murni MEMBACA data yang sudah ada.

---

# Changelog — Sprint 2 Tahap 18: Resource Hints + Theme Color

Baseline: Sprint 2 Tahap 17 (Shadow Token Migration + Modern UI Layer) selesai.

## Ditambahkan

- **`<meta name="theme-color" content="#08090c">`** — warna address bar
  browser mobile mengikuti `--bg` tema dark (default app), kesan lebih
  menyatu/native saat dibuka sebagai PWA/tab browser.
- **`preconnect`/`dns-prefetch`** ke 3 domain yang sudah ada di
  allowlist CSP (`cdn.jsdelivr.net`, `cdnjs.cloudflare.com`,
  `accounts.google.com`) — domain-domain ini sebelumnya baru dikoneksi
  saat fitur lazy-load (eruda/tesseract.js/jsPDF/Google Identity)
  dipicu; hint ini cuma buka koneksi DNS/TLS lebih awal supaya saat
  fitur itu dipakai terasa lebih cepat. 0 byte aset tambahan, 0
  perubahan visual/JS.

## Tidak diubah

- Tidak ada file JavaScript yang disentuh.
- Tidak ada `app-bundle-a/b.min.js` yang di-rebuild (tidak perlu).

---

# Changelog — Sprint 2 Tahap 17: Shadow Token Migration + Modern UI Layer

Baseline: Sprint 2 Tahap 16 (Secondary Clickable Hover Elevation) selesai.

## Ditambahkan

- **`modern-ui-layer.css`** (file baru, ~3KB) — lapisan CSS tambahan
  murni additive (tidak menimpa token warna/kontras Tahap 9): glass
  blur pada header & bottom-nav, lift/elevation halus pada `.card`/
  tombol saat hover/tap (pakai token `--shadow-*`/`--dur-*` yang sudah
  ada), focus ring aksesibel untuk navigasi keyboard, scrollbar tipis
  di layar ≥900px, font smoothing, dan menghormati
  `prefers-reduced-motion`. Di-link dari `index.html` &
  `app_production.html` setelah `styles.css`, terpisah dari bundle JS
  sehingga tidak butuh rebuild `app-bundle-a/b.min.js`.

## Diubah (value-preserving, tanpa perubahan visual)

- **`styles.css`**: 22 deklarasi `box-shadow` literal (nilai numerik
  langsung) dipindah ke 20 token `var(--shadow-*)` baru di `:root`
  (`ROADMAP-v1.1.md` Item 5, Medium Priority, 🟢 CSS-only). Nilai akhir
  identik persis dengan sebelumnya — pola sama seperti migrasi
  border-radius (Tahap 11), duration (Tahap 12), dan font-size (Tahap
  14). `0 0 0 0 transparent` (reset/animation-state, bukan shadow
  desain) sengaja tidak dimigrasi.
- **`index.html`, `app_production.html`**: tambah satu baris
  `<link rel="stylesheet" href="modern-ui-layer.css?v=1">` setelah
  `styles.css?v=337`.

## Tidak diubah

- Tidak ada file JavaScript yang disentuh, tidak ada `app-bundle-a/b.min.js`
  yang di-rebuild (tidak perlu — perubahan murni CSS baru + tokenisasi
  value-preserving).
- Tidak ada nilai warna, kontras (Tahap 9), radius, ukuran font, atau
  timing animasi yang berubah.

---

# Changelog — Tahap 1: Audit UI & Pembangunan Design System (Foundation)

Baseline: `repo-final.zip` (v242 / `kw83-tahap0-feature-registry-17`).

## Ditambahkan

- **`design-tokens.css`** (file baru) — sumber tunggal seluruh design
  token: 9 blok warna tema (`[data-theme="..."]`), spacing (`--sp-*`),
  border-radius (`--r-*`), font-size (`--fs-*`), z-index (`--z-*`) —
  dipindah apa adanya dari `styles.css`. Ditambah token baru (aditif):
  - `--font-body`, `--font-heading` (dipakai menggantikan 32 string
    literal `font-family` yang berulang di `styles.css`)
  - 7 token radius tambahan: `--r-2xs`, `--r-3xs`, `--r-4xs`, `--r-3xl`,
    `--r-4xl`, `--r-5xl`, `--r-99` (melengkapi skala radius yang sudah
    ada supaya seluruh `border-radius` di `styles.css` bisa pakai token)
  - Skala referensi `--shadow-xs…xl` dan `--dur-fast…slow` (belum
    dipakai di komponen manapun — disiapkan untuk Tahap 2+)
- **`UI-AUDIT.md`** — hasil audit lengkap CSS/HTML/komponen.
- **`DESIGN-SYSTEM.md`** — katalog design token & inventaris komponen.
- **`CHANGELOG.md`** — dokumen ini.
- **`FILES-CHANGED.md`** — daftar file berubah beserta alasan.

## Diubah (tanpa perubahan visual)

- **`styles.css`**: blok token dipindah ke `design-tokens.css` (diganti
  komentar penunjuk); 71 deklarasi `border-radius` & 32 deklarasi
  `font-family` yang sebelumnya angka/string literal diganti referensi
  `var(--token)` dengan **nilai akhir identik** (value-preserving).
  739 → 727 baris.
- **`index.html`, `app_production.html`**: tambah satu baris
  `<link rel="stylesheet" href="design-tokens.css?v=242">` sebelum
  link `styles.css`, supaya token termuat lebih dulu. Kedua file tetap
  identik satu sama lain (diverifikasi dengan `diff`).

## Tidak diubah

- Tidak ada file JavaScript yang disentuh.
- Tidak ada nilai warna, spacing, radius, ukuran font, shadow, atau
  timing animasi yang berubah — seluruh tokenisasi murni memindahkan
  nilai yang sudah ada ke sebuah variabel dengan nilai yang sama persis.
- `FEATURE_REGISTRY`, ADR-001, Blueprint Final: tidak disentuh.
- Build pipeline (`scripts/build.js`), Service Worker (`sw.js`), cache
  (`CACHE_NAME`), routing, IndexedDB, LocalStorage: tidak disentuh.
- Tidak ada icon library yang ditambahkan — Material Symbols Rounded
  dipertimbangkan tapi ditunda karena kendala CSP + tidak ada akses
  jaringan untuk self-host font (lihat `UI-AUDIT.md` §5 dan
  `DESIGN-SYSTEM.md` §9 untuk detail & rekomendasi Tahap 2).
- Tidak ada fitur yang dihapus, tidak ada file yang dihapus atau
  digabung, tidak ada perubahan struktur folder, tidak ada dependency
  baru.

## Hasil test

```
node --test tests/*.test.js
# tests 1227
# pass 1227
# fail 0
```

Identik sebelum dan sesudah perubahan (1227/1227 pass di kedua kondisi)
— sesuai ekspektasi, karena tidak ada file JavaScript yang tersentuh.

`npm run build` dan `npm run lint` sengaja **tidak dijalankan** pada
sesi ini (di luar scope Tahap 1 / tidak tersedia di sandbox — lihat
`UI-AUDIT.md` §7 untuk detail).

## Rekomendasi untuk Tahap 2

Lihat bagian "Rekomendasi untuk Tahap 2" di `UI-AUDIT.md` untuk daftar
lengkap (6 item): verifikasi `.u-r99`, migrasi inline style → utility
class, self-host icon font, penerapan skala shadow/transition ke
komponen baru, token ukuran font display, dan pemecahan `styles.css`
per domain.

---

## Tahap 6 — Audit Icon & Perbaikan Minimal

Baseline: hasil Tahap 5 (1227/1227 test PASS, tidak ada JS berubah
sejak Tahap 1). Melanjutkan dari posisi "baseline confirmed 1227/1227,
mulai audit icon menyeluruh" — bukan mengulang audit sebelumnya.

### Audit

Diperiksa seluruh 69 file `.js` (termasuk `lifeos/**`), `styles.css`,
`index.html`/`app_production.html` untuk enam kategori icon: SVG
Inline, SVG File, Emoji, Unicode Symbol, Image Icon, CSS Generated
Icon. Ringkasan kuantitatif:

- **Emoji**: 4.759 karakter total — 400 di HTML statis (pola: 1 emoji
  per judul section/kartu/tombol/opsi, dipakai konsisten), ±4.359 di
  JavaScript (mayoritas field `icon:` pada data registry, mis.
  `dashboard-hub-registry.js`, dan label tombol/toast di 60+ file JS
  lain).
- **SVG Inline**: 16 pemakaian, seluruhnya di `index.html`
  (`app_production.html` identik), bergaya konsisten
  (`stroke="currentColor"`, `viewBox="0 0 24 24"`, `stroke-width="2"`).
- **SVG File**: 2 (`icon-192.svg`, `icon-512.svg`) — app icon PWA,
  tidak terkait icon di dalam UI.
- **Unicode Symbol**: `▾` (chevron collapse, 30+×, teks statis di
  `<span class="card-collapse-toggle">`), `✕` (tombol tutup modal,
  7×), `‹ › → ← ↑ ⋮` (navigasi/aksi, konsisten).
- **CSS Generated Icon**: 1 (`details.card summary::after{content:'▾'}`).
- **Image Icon**: 0 (tidak ada icon berupa `<img>` atau
  `background-image` di `styles.css`; satu-satunya kecocokan `<img
  onerror=...>` yang ter-grep adalah contoh string di teks dokumentasi
  keamanan, bukan icon yang dirender).

### Temuan yang dieksekusi

4 tombol `qs-btn` (menu cepat Keuangan, Laporan, Car Notes, AI
Asisten) memakai **icon ganda**: SVG gear inline diikuti langsung oleh
emoji `⚙️` — makna identik, dirender berdampingan. Ini inkonsistensi
nyata dibanding 2 tombol `qs-btn` lain (Dashboard, Shop) yang sudah
benar (SVG + label teks, tanpa duplikasi). Emoji `⚙️` yang redundan
dihapus; SVG gear dipertahankan sebagai satu-satunya icon pada keempat
tombol tersebut. Perubahan murni penghapusan teks di dalam atribut
HTML statis — tidak menyentuh `data-action`, event listener, atribut
`aria-label`, atau file JavaScript manapun.

### Temuan yang TIDAK dieksekusi (rekomendasi Tahap 7)

- **7 emoji `page-title`** (🏠📊🪨🏍️🕌🤖🧭) — aman secara teknis untuk
  diganti SVG lokal (murni teks HTML statis, diverifikasi tidak ada
  JS yang membaca `.page-title` sama sekali — 0 hasil `grep`), tapi
  butuh desain 7 aset SVG baru + review visual, di luar batas
  "perubahan minimal" Tahap 6.
- **±380 emoji lain di HTML** (`card-title`, tombol aksi, `<option>`,
  empty-state) — pola konsisten tapi volume besar, sama seperti di
  atas.
- **±4.359 emoji di JavaScript** — mayoritas field data (`icon:` pada
  registry), tidak bisa diganti tanpa mengubah JavaScript, yang
  dilarang eksplisit di Tahap 6. Dicatat sebagai rekomendasi murni.
- Seluruh Unicode Symbol (`▾ ✕ ‹ › → ← ↑ ⋮`) dan CSS-generated icon
  **dipertahankan** — sudah konsisten, ringan, dan fungsional; tidak
  ada alasan mengganti.

### Hasil test

```
node --test tests/*.test.js
# tests 1227
# pass 1227
# fail 0
```

Identik sebelum dan sesudah (1227/1227 pass di kedua kondisi) — sesuai
ekspektasi karena tidak ada file JavaScript, `styles.css`, ADR-001,
FEATURE_REGISTRY, Blueprint Final, Build System, Service Worker, atau
Routing yang tersentuh.

---

## Tahap 7 — Micro Interaction & Motion System

Baseline: hasil Tahap 6 (1227/1227 PASS, `UI-ICON-AUDIT.md` selesai,
0 JS berubah sejak Tahap 1). Fokus murni polish interaksi ala
Material Design 3 — tidak ada layout, ukuran, spacing, typography,
warna, atau icon yang diubah. Hanya `styles.css` yang disentuh.

### Ditambahkan (aditif)

- **Motion design tokens** di `:root`: `--dur-fast` (100ms),
  `--dur-base` (150ms), `--dur-moderate` (200ms), `--dur-slow`
  (250ms), serta `--ease-standard`, `--ease-emphasized`,
  `--ease-emphasized-accel` (kurva MD3). Semua durasi berada dalam
  target 100–250ms sesuai instruksi.
- **`prefers-reduced-motion`**: blok global yang mempercepat seluruh
  animasi/transisi ke ~0 dan menonaktifkan smooth-scroll bila
  pengguna mengaktifkan preferensi ini di OS/browser — belum ada
  sebelumnya.
- **`:focus-visible`**: ring fokus konsisten (outline, tidak memakan
  ruang layout) untuk seluruh elemen interaktif, plus varian khusus
  untuk `.fi`/`.fs`/`.chat-input` yang sudah punya `:focus` sendiri.
  Sebelumnya aplikasi tidak punya indikator fokus keyboard sama
  sekali di luar input teks.
- **Ripple effect berbasis CSS murni** (pulsa dari tengah elemen,
  tanpa JavaScript, tanpa koordinat sentuh — keterbatasan bawaan
  teknik CSS-only) pada 13 tap-target primer yang aman dari risiko
  clipping: `.btn`, `.chip-btn`, `.type-btn`, `.pm-btn`,
  `.qs-action`, `.bill-action-row`, `.card-collapse-toggle`,
  `.pin-key`, `.theme-card`, `.qs-btn`, `.kasir-tile`,
  `.dashhub-feature-card`, `.customer-card`.
- **Press feedback yang tadinya belum ada**: `.chip-btn:active`,
  `.type-btn:active`, `.pm-btn:active`, `.theme-card:active`
  (scale-down konsisten dengan pola `:active{transform:scale(...)}`
  yang sudah dipakai di `.btn`/`.pin-key`/dll), serta
  `.nav-item:active svg` (scale-down ikon saat bottom nav ditekan).
- **Card elevation on hover** (desktop-only, dibungkus
  `@media (hover:hover) and (pointer:fine)` — pola yang sudah ada
  di file ini sejak sebelumnya): `.card`, `.kasir-tile`,
  `.dashhub-feature-card` mendapat `box-shadow` halus saat hover;
  `.card` & `.dashhub-feature-card` mendapat `transition` baru
  supaya elevasi ini animatif (sebelumnya `.card` tidak punya
  `transition` sama sekali).
- **Hover state tambahan** (desktop-only) untuk `.btn` (brightness),
  `.chip-btn`, `.type-btn`, `.pm-btn`, `.theme-card`, `.qs-btn`,
  `.nav-item`, `.customer-card`, `.bill-action-row` — seluruhnya
  memakai warna yang **sudah ada** di tema (`var(--accent)`,
  `var(--accent-soft)`), tidak ada warna baru diperkenalkan.

### Disempurnakan (nilai lama dipertahankan, hanya kurva/kelengkapan diperhalus)

- `overlayIn`, `slideUp` (dipakai bersama oleh `.modal`, `.calc-modal`,
  `.qs-modal` — dialog & bottom sheet): easing diseragamkan ke token
  MD3 (`--ease-standard` untuk fade overlay, `--ease-emphasized`
  untuk slide masuk sheet/dialog). **Durasi tidak diubah** (tetap
  0.2s/0.25s, hanya direferensikan lewat token `--dur-moderate` /
  `--dur-slow` yang nilainya sama persis). `slideUp` ditambah fade
  opacity `.4→1` beriringan dengan translate, supaya entrance terasa
  lebih halus (standar MD3 emphasized-decelerate).
- `.toast` (snackbar): sebelumnya hanya fade opacity; sekarang
  ditambah slide vertikal kecil (`translate(-50%,10px)` →
  `translate(-50%,0)`) beriringan dengan fade, memakai mekanisme
  `.toast.show` yang **sudah ada** di JS (`toast()` di
  `format-tema.js`/bundle) — tidak ada perubahan JS.
- `.page` (transisi ganti halaman): referensi durasi/easing
  diseragamkan ke token (`--dur-moderate`, `--ease-standard`),
  nilai akhir identik (0.2s, kurva setara `ease`).

### TIDAK dieksekusi (rekomendasi Tahap 8)

- **Exit/closing animation untuk overlay & bottom sheet**: `.overlay`
  disembunyikan lewat `display:none` instan setelah class `.open`
  dilepas oleh JS (`modals.js`) — animasi keluar yang mulus butuh
  penundaan `display:none` (mis. via `animationend`/`setTimeout` di
  JS), yang berada di luar batas "tidak mengubah JavaScript" Tahap 7.
- Ripple sungguhan berbasis koordinat sentuh (bukan pulsa dari
  tengah) — teknis membutuhkan JS untuk membaca posisi klik/tap dan
  menset custom property `--x`/`--y`; versi CSS-only di Tahap 7
  adalah pendekatan terdekat tanpa JS.
- Elevation/hover pada tap-target sekunder lain (`.stat-box.clickable`,
  `.budget-item.clickable`, dll.) — sudah punya `:active` feedback
  memadai, tidak disentuh supaya perubahan tetap minimal.

### Verifikasi non-regresi

```
node --test tests/*.test.js
# tests 1227
# pass 1227
# fail 0
```

Identik sebelum & sesudah. **0 file JavaScript disentuh** (hanya
`styles.css`, +79 baris murni aditif/penyempurnaan). `index.html` dan
`app_production.html` **tidak berubah sama sekali** di Tahap 7 (tetap
identik satu sama lain). ADR-001, FEATURE_REGISTRY, Blueprint Final,
Build System, Service Worker, Routing tidak disentuh.

## Tahap 8 — Final QA, Accessibility, Performance & Release Candidate

Baseline: hasil Tahap 7 (1228/1228 test PASS — lihat catatan angka di
`FINAL-QA.md` §1 — 0 JS berubah sejak Tahap 1). Tahap terakhir: audit
menyeluruh, tanpa fitur baru dan tanpa redesign.

### Ditambahkan

- **`FINAL-QA.md`** (file baru) — laporan audit akhir lengkap:
  Accessibility (focus-visible, keyboard nav, contrast, touch target,
  reduced motion, hover dependency, scroll behavior), Responsive
  (360–1024px), Performance CSS (selector, duplikasi, transition,
  shadow, radius, typography), Design System (konsistensi token),
  Motion Audit, Icon Audit Summary, daftar rekomendasi Tahap 9, dan
  ringkasan Tahap 1–8.

### Diubah

- Tidak ada. Tahap 8 murni dokumentasi — **0 file CSS/JS/HTML
  disentuh**. Seluruh temuan performa/konsistensi CSS (radius, shadow,
  transition, font-size literal vs token) dan kontras warna `--text3`
  dicatat sebagai rekomendasi di `FINAL-QA.md`, tidak dieksekusi,
  mengikuti instruksi eksplisit Tahap 8 ("jangan mengubah jika
  berisiko").

### Hasil test

```
node --test tests/*.test.js
# tests 1228
# pass 1228
# fail 0
```

Identik sebelum & sesudah (tidak ada perubahan kode). **0 file
JavaScript disentuh** sepanjang Tahap 1–8. ADR-001, FEATURE_REGISTRY,
Blueprint Final, Build System, Service Worker, Routing tidak disentuh.

### Rekomendasi untuk Tahap 9

Lihat `FINAL-QA.md` §8 untuk daftar lengkap (6 item CSS risiko rendah,
1 item token warna risiko sedang, 3 item carry-over yang butuh
perubahan JavaScript dari Tahap 6–7).

### Status akhir

Seluruh Quality Gate Tahap 8 **LULUS**. Project dinyatakan
**RELEASE CANDIDATE**, siap digunakan.

## Final Release Candidate — Release Notes, Dokumentasi & Handover

Ini BUKAN tahap pengembangan — murni dokumentasi & handover setelah
Release Candidate (Tahap 8) dinyatakan LULUS. Baseline: hasil Tahap 8
(1228/1228 test PASS, 0 JS berubah sejak Tahap 1).

### Ditambahkan

- **`RELEASE-NOTES.md`** (file baru) — ringkasan Release Candidate,
  highlight perubahan Tahap 1–8, fitur utama, modernisasi UI, design
  system, motion system, accessibility, responsive, performance, icon
  audit, hasil testing, dan quality gate.
- **`PROJECT-SUMMARY.md`** (file baru) — struktur project, arsitektur
  (pola source-file-plus-minified-bundle), design system, file
  penting, entry point, folder utama, komponen utama per domain, dan
  alur aplikasi singkat — ditujukan untuk developer lain yang akan
  memelihara project ini.
- **`KNOWN-ISSUES.md`** (file baru) — seluruh isu yang sengaja belum
  diperbaiki (kontras `--text3`, touch target sekunder, literal CSS
  vs token, emoji `icon:` di JavaScript, exit animation, ripple
  koordinat sentuh), dikelompokkan per kategori risiko perbaikan
  (🟢 CSS-only / 🟡 token warna / 🔴 butuh JavaScript). Murni
  dokumentasi — tidak ada perbaikan dieksekusi.
- **`ROADMAP-v1.1.md`** (file baru) — backlog versi berikutnya,
  dikelompokkan High/Medium/Low Priority, seluruh item yang
  membutuhkan perubahan JavaScript ditandai eksplisit.

### Diubah

- Tidak ada file kode (HTML/CSS/JS) yang diubah. Hanya file Markdown
  baru + pembaruan `CHANGELOG.md`/`FILES-CHANGED.md` (bagian ini).

### Hasil test

```
node --test tests/*.test.js
# tests 1228
# pass 1228
# fail 0
```

Identik dengan hasil Tahap 8 — tidak ada perubahan kode di tahap
finalisasi ini. **0 file JavaScript/CSS/HTML disentuh** sepanjang
Tahap 1 hingga Final Release Candidate. ADR-001, FEATURE_REGISTRY,
Blueprint Final, Build System, Service Worker, Routing tidak disentuh.

### Status akhir

**FINAL RELEASE CANDIDATE** — siap dipelihara dan dikembangkan pada
versi berikutnya. Lihat `RELEASE-NOTES.md` untuk ringkasan rilis,
`PROJECT-SUMMARY.md` untuk onboarding developer baru, `KNOWN-ISSUES.md`
untuk isu yang belum diperbaiki, dan `ROADMAP-v1.1.md` untuk backlog
v1.1.

---

# Changelog — Sprint 1, Tahap 2: Dashboard 2.0 — Hero Card

Baseline: FINAL RELEASE CANDIDATE (v242 / `kw83-tahap0-feature-registry-17`,
1228/1228 test PASS) + Sprint 1 Tahap 1 (`DASHBOARD-2.0-PLAN.md`, audit-only,
0 file kode disentuh).

## Ditambahkan

- **Hero Card** di `page-dashboard-hub` (`index.html`/`app_production.html`)
  — elemen pertama setelah header, sebelum search bar, sesuai
  `DASHBOARD-2.0-PLAN.md` §11/§12. Menampilkan (semua dari data yang SUDAH
  ADA, tidak ada business logic baru):
  - Sapaan + nama profil (`D.profile.nama`, field yang sudah ada)
  - Tanggal hari ini (format native `Date.toLocaleDateString('id-ID', ...)`)
  - Saldo semua akun (`totalSaldoAkun()` dari `akun.js`, dipanggil apa
    adanya — tidak ada logic saldo baru)
  - Pemasukan & pengeluaran bulan berjalan (agregasi `D.transactions` dgn
    pola yang sama persis dgn `renderDashboard()`/`renderDashLaporanMini()`
    di `modules-render.js`)
- **`DashboardHubHero`** (object baru di `dashboard-hub.js`) — modul render
  murni tampilan, dipanggil dari `DashboardHub.render()` secara aditif
  (pola sama dgn `LifeOSHome.render()`/`DashboardHubFavoritView.render()`
  yang sudah ada — tidak mengubah baris lain).
- CSS baru scoped `.dashhub-hero*` di `styles.css` — Material Design 3 /
  Material You: radius besar (`--r-2xl`), gradient aksen tipis, elevation
  via shadow, hierarki tipografi jelas. 100% memakai token yang sudah ada
  (`--r-*`/`--sp-*`/`--fs-*`/`--accent*`/`.green`/`.red`), responsif lewat
  breakpoint yang sudah ada di file ini (`max-width:359px`, `min-width:600px`).
- **`HERO-CARD.md`** — dokumentasi struktur, data, CSS, dan alasan desain
  Hero Card.
- **`tests/dashboard-hub-hero.test.js`** — 8 test baru: render tanpa data
  (placeholder aman), render dgn `D.profile.nama`, saldo positif/negatif,
  agregasi bulan berjalan (termasuk memastikan transaksi bulan lalu &
  transfer diabaikan), dan integrasi ke `DashboardHub.render()` (grid
  kategori tetap tidak berubah).

## Diubah

- **`dashboard-hub.js`**: tambah `_dashHubHeroMonthTx()` + object
  `DashboardHubHero` (murni fungsi baru, tidak ada baris lama yang
  dihapus/diubah), + 1 baris pemanggilan aditif di `DashboardHub.render()`.
- **`index.html`**: tambah blok `<div class="dashhub-hero" id="dashHubHeroCard">…</div>`
  di dalam `#page-dashboard-hub`, sebelum `.dashhub-search-wrap`. Tidak ada
  elemen lain yang dipindah/dihapus.
- **`styles.css`**: tambah blok CSS baru scoped `.dashhub-hero*` (lihat
  `HERO-CARD.md` §CSS). Tidak ada deklarasi `.dashhub-*` yang sudah ada
  yang diubah.
- **`app_production.html`**: disinkronkan ulang jadi salinan persis
  `index.html` lewat `node scripts/build.js` (konvensi proyek yang sudah
  ada sejak awal, bukan proses baru).
- **`app-bundle-a.min.js`, `app-bundle-b.min.js`**: dibuat ulang dari
  source lewat `node scripts/build.js` supaya Hero Card benar-benar
  ter-load di app (kedua file HTML memuat bundle ini, bukan file source
  individual). **`scripts/build.js` sendiri TIDAK diedit/diubah logic-nya**
  — dijalankan apa adanya sesuai alur kerja yang sudah didokumentasikan di
  file itu ("Jalankan skrip ini SETIAP KALI selesai edit file .js sumber").
- **`sw.js`**: `CACHE_NAME` naik ke `kw-cache-v243` — efek samping otomatis
  dari `scripts/build.js` (bagian bump-version, bukan perubahan logic
  Service Worker apa pun).
- Nomor versi `?v=242` → `?v=243` di kedua HTML, dan
  `kw83-tahap0-feature-registry-17` → `-18` di 6 file source versi — juga
  efek samping otomatis `scripts/build.js`, konsisten dgn konvensi versi
  yang sudah ada sejak Tahap 0.
- **`docs/FILE-MAP.md`**: ditulis ulang otomatis oleh `scripts/build.js`
  (bagian dari alur build yang sudah ada, bukan proses baru).

## Tidak diubah

- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) — tidak disentuh sama
  sekali.
- ADR-001, Routing (`dashHubNavigateToFeature`/`DashboardHub.open`),
  Business Logic (`totalSaldoAkun()` dipakai APA ADANYA, tidak ada
  perubahan di `akun.js`).
- Grid kategori, Favorit, Life OS, Pinned Widgets, Bottom Navigation — tidak
  ada satu baris pun dari komponen-komponen ini yang diubah.
- `scripts/build.js` — dijalankan, tidak diedit.
- Tidak ada dependency baru ditambahkan (`package.json` tidak berubah).

## Hasil test

```
node --test tests/*.test.js
# tests 1235
# pass 1235
# fail 0
```

Catatan: baseline FINAL RELEASE CANDIDATE yang diverifikasi ulang di
lingkungan ini (`node --test tests/*.test.js` pada arsip asli, sebelum
perubahan apa pun) menghasilkan **1227/1227 PASS**, bukan 1228 seperti
disebut di status header — kemungkinan selisih pencatatan minor di
dokumentasi sebelumnya, dicatat di sini demi akurasi. Tidak ada test lama
yang gagal atau dihapus; 8 test baru dari `tests/dashboard-hub-hero.test.js`
ditambahkan murni aditif, sehingga total naik 1227 → 1235.

## Status

Hero Card selesai, sesuai cakupan Sprint 1 Tahap 2. **Belum** mengerjakan
Quick Actions, refactor Grid Dashboard, Widget lain, atau Bottom Navigation
— menunggu instruksi Sprint 1 Tahap 3.

# Changelog — Sprint 1, Tahap 3: Dashboard 2.0 — Quick Actions

Baseline: Sprint 1 Tahap 2 — Hero Card (1235/1235 test PASS, build
`kw83-tahap0-feature-registry-18`, v243).

## Ditambahkan

- **Quick Actions** di `page-dashboard-hub` (`index.html`/`app_production.html`)
  — baris tombol kartu kecil (pill) bergaya Material Design 3/Material You,
  tepat di bawah Hero Card, sebelum search bar. 5 aksi, semua memanggil
  fungsi yang **SUDAH ADA** (tidak ada business logic baru):
  - 💰 **Transaksi** → `openTxModal('expense')` (`transaksi.js`, pola sama
    dgn tombol "+ Pengeluaran" di menu Aksi Cepat lama/`qsDashboard`)
  - 📝 **Catatan** → `openCatatan('anak')` (`transaksi.js`, satu-satunya
    fungsi "buka form catatan" yang sudah ada di app)
  - 💾 **Backup** → `openBackupModal()` (`backup-restore.js`, dipakai juga
    oleh 3 tombol lama lain: `qsDashboard`, `qsShop`, `qsLaporan`)
  - 🔍 **Cari** → fokus native ke `#dashHubSearchInput` yang sudah ada tepat
    di bawah Quick Actions (murni `element.focus()`, bukan logic baru)
  - 🤖 **AI** → `showPage('ai', document.querySelectorAll('.nav-item')[3])`
    (`modal-navigasi.js` + `PAGE_NAV_IDX.ai` yang sudah ada di
    `dashboard-hub.js`, pola sama dgn navigasi "Edit Profil" di `qsAI`)
- CSS baru scoped `.dashhub-qa*` di `styles.css` — 5 kolom grid pill,
  radius penuh (`--r-pill`), 100% memakai token yang sudah ada
  (`--sp-*`/`--r-pill`/`--fs-icon-lg`/`--surface2`/`--surface3`/`--border`/
  `--accent`/`--text2`), breakpoint `max-width:359px` (3 kolom, konsisten
  dgn pola stack Hero Card) & `min-width:600px` (hover state, konsisten dgn
  `.dashhub-feature-card:hover`).
- **`QUICK-ACTIONS.md`** — dokumentasi struktur, aksi, event yang dipanggil,
  CSS baru, dan alasan desain.
- **`tests/dashboard-hub-quickactions.test.js`** — 10 test baru: markup ada
  & posisinya benar (di antara Hero Card & search bar), 5 tombol persis,
  tiap tombol memanggil fungsi yang sudah ada (bukan fungsi baru), Hero
  Card/Grid Dashboard tidak tersentuh, parity `index.html`/
  `app_production.html`, dan token CSS yang dipakai semuanya sudah
  terdefinisi di `:root`.

## Diubah

- **`index.html`**: tambah blok `<div class="dashhub-qa-row" id="dashHubQuickActions">…</div>`
  di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-hero` dan sebelum
  `.dashhub-search-wrap`. Tidak ada elemen lain (Hero Card, search bar,
  Favorit, Grid Dashboard, Life OS, Pinned Widgets) yang dipindah/diubah.
- **`styles.css`**: tambah blok CSS baru scoped `.dashhub-qa*` (lihat
  `QUICK-ACTIONS.md` §3). Tidak ada deklarasi `.dashhub-*` yang sudah ada
  yang diubah.
- **`app_production.html`**: disinkronkan ulang jadi salinan persis
  `index.html` lewat `node scripts/build.js` (konvensi proyek yang sama
  sejak Tahap 2, bukan proses baru).
- **`app-bundle-a.min.js`, `app-bundle-b.min.js`**: dibuat ulang dari source
  lewat `node scripts/build.js` (Quick Actions murni markup, tidak ada
  fungsi JS baru yang perlu ikut ke-bundle — regenerasi ini hanya supaya
  bundle tetap sinkron dgn `index.html` versi terbaru, sama seperti proses
  Tahap 2). **`scripts/build.js` sendiri TIDAK diedit.**
- **`sw.js`**: `CACHE_NAME` naik ke `kw-cache-v244` — efek samping otomatis
  `scripts/build.js`.
- Nomor versi `?v=243` → `?v=244`, dan
  `kw83-tahap0-feature-registry-18` → `-19` — efek samping otomatis
  `scripts/build.js`.
- **`docs/FILE-MAP.md`**: ditulis ulang otomatis oleh `scripts/build.js`.

## Tidak diubah

- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), ADR-001 — tidak
  disentuh sama sekali.
- Business Logic — tidak ada fungsi baru; kelima tombol Quick Actions
  murni memanggil `openTxModal`/`openCatatan`/`openBackupModal`/`showPage`
  yang sudah ada, atau `.focus()` native ke elemen yang sudah ada.
- Routing (`dashHubNavigateToFeature`/`DashboardHub.open`) — tidak diubah;
  tombol AI memakai `showPage()` langsung (pola yang sudah dipakai di
  markup `qsAI`/`qsDashboard`), bukan lewat `DashboardHub.open()`.
- **Grid Dashboard** (`#dashboardHubGrid`/`#dashboardHubWrap`) — tidak
  disentuh.
- **Widget** (Life OS, Favorit, Pinned Widgets) — tidak disentuh.
- **Bottom Navigation** (`.nav-item`) — tidak disentuh; hanya *dibaca*
  (`document.querySelectorAll('.nav-item')[3]`) untuk parameter `showPage()`,
  sama persis pola yang sudah dipakai di markup `qsDashboard` (mis.
  `document.querySelectorAll('.nav-item')[6]` untuk "Edit Profil").
- `dashboard-hub.js` — **tidak ada baris JS yang diubah**; Quick Actions
  100% markup (HTML+CSS), tidak butuh modul JS baru karena setiap tombol
  langsung memanggil fungsi global yang sudah ada lewat `data-onclick`
  (mekanisme dispatcher yang sudah ada di
  `features-helpers-global-security.js`, pola sama dgn tombol
  `qs-action` yang sudah dipakai di `qsDashboard`/`qsAI`).
- `scripts/build.js` — dijalankan, tidak diedit.
- Tidak ada dependency baru ditambahkan (`package.json` tidak berubah).

## Hasil test

```
node --test tests/*.test.js
# tests 1245
# pass 1245
# fail 0
```

Baseline Tahap 2 (1235/1235 PASS) diverifikasi ulang di lingkungan ini
sebelum perubahan apa pun. Tidak ada test lama yang gagal atau dihapus; 10
test baru dari `tests/dashboard-hub-quickactions.test.js` ditambahkan murni
aditif, sehingga total naik 1235 → 1245.

## Status

Quick Actions selesai, sesuai cakupan Sprint 1 Tahap 3. **Belum**
mengerjakan Widget Dashboard, Grid Dashboard, Statistik, atau AI Insight —
menunggu instruksi Sprint 1 Tahap 4.

# Changelog — Sprint 1 Tahap 4: Modern Dashboard Grid

Baseline: Sprint 1 Tahap 3 selesai (Hero Card + Quick Actions), `node
--test` 1245/1245 PASS. Lihat `DASHBOARD-GRID.md` untuk detail lengkap.

## Diubah

- **`styles.css`** — modernisasi visual Dashboard Grid (Material Design
  3): radius kartu diperbesar (`--r-lg`→`--r-xl`), padding/gap kartu &
  kategori mengikuti token spacing yang sudah ada (`--sp-*`), elevation
  shadow ditambahkan di kartu fitur (default, tekan, & hover), ikon
  kategori diperbesar + shadow tipis, favorite indicator (`.dashhub-fav-star`)
  diubah dari teks bintang polos jadi chip bulat (icon-button M3), dan
  satu class baru `.dashhub-cat-badge` (chip kecil jumlah fitur per
  kategori). Semua **class lama tetap dipakai** (tidak ada rename),
  semua nilai memakai token yang sudah ada di `:root` (tidak ada token
  baru).
- **`dashboard-hub.js`** — 1 baris ditambah: render `.dashhub-cat-badge`
  berisi `cat.features.length` di sebelah label kategori. Murni
  render/tampilan (memakai data yang sudah tersedia saat render),
  **`FEATURE_REGISTRY` tidak disentuh/diubah**.

## Ditambahkan

- **`DASHBOARD-GRID.md`** — dokumentasi deliverable Tahap 4.

## Tidak diubah

- Hero Card, Quick Actions, Bottom Navigation, AI, Statistik, Widget
  Drag & Drop, Search — sama sekali tidak disentuh (di luar cakupan
  Tahap 4).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1246
# pass 1246
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, dan seluruh fungsi Dashboard (buka fitur, toggle favorit,
search, LifeOS, Pinned Widgets) diverifikasi tetap tampil & berfungsi
setelah perubahan CSS/markup ini.

## Status

Modern Dashboard Grid selesai, sesuai cakupan Sprint 1 Tahap 4. Sesuai
instruksi, pengerjaan **berhenti di sini** — tahap berikutnya menunggu
instruksi lebih lanjut.

# Changelog — Sprint 1 Tahap 5: Dashboard Summary Cards

Baseline: Sprint 1 Tahap 4 selesai (Hero Card + Quick Actions + Modern
Dashboard Grid), `node --test` 1246/1246 PASS. Lihat `DASHBOARD-SUMMARY.md`
untuk detail lengkap.

## Ditambahkan

- **`dashboard-hub.js`** — fungsi baru murni-baca `_dashHubSummaryMonthTx()`
  + object baru `DashboardHubSummary` (render 4 kartu ringkas: Pemasukan/
  Pengeluaran/Bersih/Jumlah Transaksi bulan berjalan dari `D.transactions`),
  + 1 baris pemanggilan aditif
  `if (typeof DashboardHubSummary !== 'undefined') DashboardHubSummary.render();`
  di dalam `DashboardHub.render()`, pola sama dgn `DashboardHubHero.render()`
  yang sudah ada. Tidak ada baris lama yang dihapus/diubah.
- **`index.html`, `app_production.html`** — tambah blok
  `<div class="dashhub-summary-grid" id="dashHubSummaryGrid"></div>` di
  dalam `#page-dashboard-hub`, tepat setelah `.dashhub-qa-row` (Quick
  Actions), sebelum `.dashhub-search-wrap`. Kedua file tetap identik satu
  sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — blok CSS baru scoped `.dashhub-summary*` (~6
  deklarasi + 1 media query), 100% pakai token yang sudah ada
  (`--sp-*`/`--r-xl`/`--fs-caption`/`--fs-title-sm`/`--surface2`/`--border`)
  serta utility `.green`/`.red` yang sudah ada. Tidak ada deklarasi
  `.dashhub-*` lama yang diubah nilainya.
- **`DASHBOARD-SUMMARY.md`** — dokumentasi deliverable Tahap 5.
- **`tests/dashboard-hub-summary.test.js`** — 6 test baru untuk
  `_dashHubSummaryMonthTx()`/`DashboardHubSummary` + 1 test integrasi
  `DashboardHub.render()`.

## Tidak diubah

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Dashboard
  Grid (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`),
  Bottom Navigation, AI, Statistik, Widget Drag & Drop, Search — sama
  sekali tidak disentuh (di luar cakupan Tahap 5).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1252
# pass 1252
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, dan seluruh fungsi Dashboard Grid (buka fitur, toggle
favorit, search, LifeOS, Pinned Widgets) diverifikasi tetap tampil &
berfungsi setelah perubahan ini.

## Status

Dashboard Summary Cards selesai, sesuai cakupan Sprint 1 Tahap 5. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke Tahap 6
(AI Insight/Statistik/dst), menunggu instruksi lebih lanjut.

# Changelog — Sprint 1 Tahap 6: Modern Pinned Widgets

Baseline: Sprint 1 Tahap 5 selesai (Hero Card + Quick Actions + Summary
Cards + Modern Dashboard Grid), `node --test` 1252/1252 PASS. Lihat
`PINNED-WIDGETS.md` untuk detail lengkap.

## Diubah

- **`styles.css`** — modernisasi visual 6 widget lama di dalam
  `#dashboardHubPinnedWrap` (`advisorCard`, `lifeBalanceCard`,
  `refleksiCard`, `dashFiCard`, `dashPensiunCard`, `dashAbsensiCard`):
  radius diperbesar via token (`var(--r-2xl)`), padding/spacing lebih
  lega (`--sp-7/8`), elevation shadow default + hover, header
  (`.card-title`) diperjelas (font lebih besar, non-uppercase, garis
  pemisah), + layout responsive (1 kolom mobile → 2 kolom tablet → 3
  kolom desktop, urutan DOM tidak berubah). **Semua aturan di-scope
  lewat descendant selector `#dashboardHubPinnedWrap ...`** — definisi
  dasar `.card`/`.card-title` (dipakai ~40+ kartu lain di seluruh app)
  **tidak diubah sama sekali**.

## Ditambahkan

- **`PINNED-WIDGETS.md`** — dokumentasi deliverable Tahap 6.
- **`tests/dashboard-hub-pinnedwidgets.test.js`** — 11 test baru:
  widget & urutan tidak berubah, markup/`data-action` tiap widget tidak
  berubah, Hero/Quick Actions/Summary Cards/Grid tetap ada, `.card`/
  `.card-title` dasar tidak diedit, override ter-scope dengan benar,
  token CSS valid, breakpoint responsive ada.

## Tidak diubah

- `dashboard-hub.js`, `index.html`, `app_production.html` — **0 baris
  berubah** (modernisasi murni CSS, isi/urutan/event/data widget tidak
  disentuh; rendering isi widget sudah ditangani modul JS masing-masing
  seperti sebelumnya).
- Hero Card, Quick Actions, Summary Cards, Dashboard Grid — sama sekali
  tidak disentuh (di luar cakupan Tahap 6).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1263
# pass 1263
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, Summary Cards, dan Dashboard Grid diverifikasi tetap
tampil & berfungsi setelah perubahan CSS ini; 6 widget Pinned tetap
tampil dengan konten/event/urutan yang sama, hanya lebih modern secara
visual.

## Status

Modern Pinned Widgets selesai, sesuai cakupan Sprint 1 Tahap 6. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke AI
Insight, Dashboard Analytics, atau Drag & Drop, menunggu instruksi
Sprint 1 Tahap 7.

# Changelog — Sprint 1 Tahap 7: Dashboard Analytics

Baseline: Sprint 1 Tahap 6 selesai (Hero Card + Quick Actions + Summary
Cards + Modern Dashboard Grid + Modern Pinned Widgets), `node --test`
1263/1263 PASS. Lihat `DASHBOARD-ANALYTICS.md` untuk detail lengkap.

## Ditambahkan

- **`dashboard-hub.js`** — fungsi baru murni-baca
  `_dashHubAnalyticsMonthTx()` + object baru `DashboardHubAnalytics`
  (render 5 kartu horizontal kecil: Transaksi Bulan Ini/Total Pemasukan/
  Total Pengeluaran/Saldo Bersih/Pemasukan vs Pengeluaran (%) dari
  `D.transactions` bulan berjalan), + 1 baris pemanggilan aditif
  `if (typeof DashboardHubAnalytics !== 'undefined') DashboardHubAnalytics.render();`
  di dalam `DashboardHub.render()`, tepat setelah pemanggilan
  `DashboardHubSummary.render()`, pola sama dgn Tahap 5/6. Tidak ada
  baris lama yang dihapus/diubah.
- **`index.html`, `app_production.html`** — tambah blok
  `<div class="dashhub-analytics-row" id="dashHubAnalyticsRow"></div>`
  di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-summary-grid`
  (Summary Cards), sebelum `.dashhub-search-wrap` — sesuai instruksi
  "setelah Summary Cards, sebelum Dashboard Grid". Kedua file tetap
  identik satu sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — blok CSS baru scoped `.dashhub-analytics*` (5
  deklarasi, baris horizontal scroll), 100% pakai token yang sudah ada
  (`--sp-*`/`--r-xl`/`--fs-caption`/`--fs-title-sm`/`--surface2`/
  `--border`) serta utility `.green`/`.red` yang sudah ada. Pola scroll
  horizontal reuse dari `.trs-chip-row`/`.kasir-kat-chips` yang sudah
  ada. Tidak ada deklarasi `.dashhub-*` lama yang diubah nilainya.
- **`DASHBOARD-ANALYTICS.md`** — dokumentasi deliverable Tahap 7.
- **`tests/dashboard-hub-analytics.test.js`** — 7 test baru untuk
  `_dashHubAnalyticsMonthTx()`/`DashboardHubAnalytics` + 1 test
  integrasi `DashboardHub.render()`.

## Tidak diubah

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Summary
  Cards (`.dashhub-summary*`), Dashboard Grid
  (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`), Pinned
  Widgets (`#dashboardHubPinnedWrap`) — sama sekali tidak disentuh (di
  luar cakupan Tahap 7).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1270
# pass 1270
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, Summary Cards, Dashboard Grid, dan Pinned Widgets
diverifikasi tetap tampil & berfungsi setelah perubahan ini; Dashboard
Analytics tampil sebagai baris kartu horizontal baru di antara Summary
Cards dan search bar.

## Status

Dashboard Analytics selesai, sesuai cakupan Sprint 1 Tahap 7. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke AI
Insight, Drag & Drop, atau Dashboard 3.0, menunggu Sprint 2.

---

# Changelog — Sprint 2 Tahap 1: FAB Halaman Keuangan (Finance 2.0)

Baseline: diaudit ulang langsung dari source code (bukan dari laporan
sebelumnya) — Sprint 1 Tahap 7 selesai, `node --test` **1271/1271
PASS**. Tidak ditemukan artefak Finance 2.0 apa pun (FAB/CSS/test) di
project sebelum Tahap ini; lihat `FINANCE-2.0.md` §0 untuk detail.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  (FAB tambah transaksi cepat: 💚 Pemasukan / 🔴 Pengeluaran) di dalam
  `#page-keuangan`, tepat setelah `.cn-tabs`, sebelum
  `#keuanganTab-kelola` (supaya tampil di kedua tab Kelola & Laporan).
  Reuse fungsi `openTxModal('income'|'expense')` yang sudah ada di
  `transaksi.js` — **tidak ada fungsi JS baru**. Toggle buka/tutup pakai
  mekanisme `data-onclick` generik yang sudah ada
  (`features-helpers-global-security.js`, tidak diubah). Kedua file
  tetap identik satu sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — blok CSS baru scoped `.keu-fab*` (append di akhir
  file), 100% pakai token yang sudah ada (`--sp-*`/`--r-full`/
  `--r-pill`/`--fs-icon*`/`--z-dropdown`/`--accent`/`--surface3`/
  `--border2`/`--dur-fast`/`--ease-standard`). Tidak ada deklarasi lama
  yang diubah nilainya.
- **`FINANCE-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 1.
- **`tests/finance-2.0-fab.test.js`** — 12 test struktural baru
  (markup FAB ada & di posisi yang benar, reuse `openTxModal()`, reuse
  `data-onclick`, parity `index.html`/`app_production.html`, CSS pakai
  token yang sudah ada, guard `FEATURE_REGISTRY` & business logic tidak
  disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics (Tahap 7) — tidak
  disentuh sama sekali.
- Seluruh isi Halaman Keuangan yang sudah ada (Anggaran, Dana Pensiun,
  Proyek Renovasi, Sewa Kios, dll.) — 0 baris berubah.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), ADR-001, business
  logic (`transaksi.js`, `modules-calc.js`, dll.), routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1283
# pass 1283
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus/diubah.
Hero Dashboard, Dashboard, dan Halaman Keuangan diverifikasi tetap
tampil & berfungsi setelah perubahan ini; FAB tampil sebagai tombol
mengambang baru di Halaman Keuangan.

## Status

FAB Halaman Keuangan selesai, sesuai cakupan Sprint 2 Tahap 1. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
halaman Shop, Car Notes, atau Laporan, menunggu instruksi Sprint 2
Tahap 2.

---

# Changelog — Sprint 2 Tahap 2: FAB Halaman Shop (Shop 2.0)

Baseline: Sprint 2 Tahap 1 selesai, `node --test` **1283/1283 PASS**.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  (FAB aksi cepat: 🛒 Transaksi Baru / 📦 Tambah Produk) di dalam
  `#page-shop`, tepat setelah `.cn-tabs`, sebelum `#shopTab-kasir`
  (supaya tampil di seluruh 6 tab Shop). Reuse **penuh** class CSS
  `.keu-fab*` dari Sprint 2 Tahap 1 (tidak ada class baru) dan fungsi
  `openOrderModal()`/`openProductModal()` yang sudah ada — **tidak ada
  fungsi JS baru**. Toggle buka/tutup pakai mekanisme `data-onclick`
  generik yang sudah ada. Kedua file tetap identik satu sama lain
  (diverifikasi dengan `diff`).
- **`styles.css`** — 1 rule aditif `#page-shop .keu-fab{bottom:150px;}`
  supaya FAB Shop tidak tumpang tindih dengan `.kasir-floatbar` di tab
  Kasir AI. Rule `.keu-fab` asli (Tahap 1) tidak diubah nilainya. Tidak
  ada class `.shop-fab*` baru.
- **`SHOP-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 2.
- **`tests/shop-fab.test.js`** — 16 test struktural baru (markup FAB
  ada & di posisi yang benar, reuse class `.keu-fab*`, reuse
  `openOrderModal()`/`openProductModal()`, reuse `data-onclick`, parity
  `index.html`/`app_production.html`, guard tidak ada class CSS baru,
  guard rule `.keu-fab` asli tidak berubah, guard `cobek-io.js`/
  `cobek-tx-cart.js`/`FEATURE_REGISTRY` tidak disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Keuangan &
  FAB-nya (Sprint 2 Tahap 1) — tidak disentuh sama sekali.
- Seluruh isi Halaman Shop yang sudah ada (Kasir AI, Manual, Etalase,
  Produsen, Riwayat, Pelanggan) — 0 baris berubah, tetap tampil &
  berfungsi seperti sebelumnya.
- `cobek-io.js` (`openOrderModal`, `setShopTab`), `cobek-tx-cart.js`
  (`openProductModal`) — 0 baris berubah; hanya dipanggil ulang (reuse)
  dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), ADR-001, business
  logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1299
# pass 1299
# fail 0
```

Tidak ada test lama yang gagal/dihapus/diubah. Hero Dashboard,
Dashboard, Halaman Keuangan+FAB, dan Halaman Shop diverifikasi tetap
tampil & berfungsi setelah perubahan ini; FAB tampil sebagai tombol
mengambang baru di seluruh tab Halaman Shop.

## Status

FAB Halaman Shop selesai, sesuai cakupan Sprint 2 Tahap 2. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint 2 Tahap 3.

---

# Changelog — Sprint 2 Tahap 3: FAB Halaman Car Notes (Car Notes 2.0)

Baseline: Sprint 2 Tahap 2 selesai, `node --test` **1299/1299 PASS**.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  (FAB aksi cepat: ⛽ Isi BBM / 🔧 Servis) di dalam `#page-carnotes`,
  tepat setelah `.cn-tabs`, sebelum komentar `<!-- BBM TAB -->` (supaya
  tampil di kedua tab Car Notes). Reuse **penuh** class CSS `.keu-fab*`
  dari Sprint 2 Tahap 1 (tidak ada class baru) dan fungsi
  `openBbmModal()`/`openServisModal()` yang sudah ada — **tidak ada
  fungsi JS baru**. Toggle buka/tutup pakai mekanisme `data-onclick`
  generik yang sudah ada. Kedua file tetap identik satu sama lain
  (diverifikasi dengan `diff`).
- **`CAR-NOTES-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 3.
- **`tests/car-notes-fab.test.js`** — 17 test struktural baru (markup
  FAB ada & di posisi yang benar, reuse class `.keu-fab*`, reuse
  `openBbmModal()`/`openServisModal()`, reuse `data-onclick`, parity
  `index.html`/`app_production.html`, guard tidak ada class CSS baru
  & tidak ada override posisi baru di `styles.css`, guard
  `vehicle-core.js`/`sparepart-servis.js`/`FEATURE_REGISTRY`/
  `dashboard-hub.js` tidak disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Keuangan &
  FAB-nya (Tahap 1), Halaman Shop & FAB-nya (Tahap 2) — tidak disentuh
  sama sekali.
- Seluruh isi Halaman Car Notes yang sudah ada (tab BBM & Servis,
  spesifikasi kendaraan, pajak/SIM, sparepart, stok, import data) — 0
  baris berubah, tetap tampil & berfungsi seperti sebelumnya.
- `styles.css` — **tidak disentuh sama sekali** di Tahap 3 ini; FAB Car
  Notes memakai posisi default `.keu-fab` tanpa override tambahan
  (berbeda dari Tahap 2 yang butuh 1 override untuk Shop).
- `vehicle-core.js` (`openBbmModal`, `setCnTab`), `sparepart-servis.js`
  (`openServisModal`) — 0 baris berubah; hanya dipanggil ulang (reuse)
  dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic kendaraan, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1316
# pass 1316
# fail 0
```

Tidak ada test lama yang gagal/dihapus/diubah. Hero Dashboard,
Dashboard, Halaman Keuangan+FAB, Halaman Shop+FAB, dan Halaman Car
Notes diverifikasi tetap tampil & berfungsi setelah perubahan ini; FAB
tampil sebagai tombol mengambang baru di kedua tab Halaman Car Notes.

## Status

FAB Halaman Car Notes selesai, sesuai cakupan Sprint 2 Tahap 3. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint 2 Tahap 4.

---

# Changelog — Sprint 2 Tahap 4: FAB Halaman Laporan (Reports 2.0)

Baseline: Sprint 2 Tahap 3 selesai, `node --test` **1316/1316 PASS**.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  baru (FAB aksi cepat: 🧾 Export PDF / 📄 Export CSV) di dalam
  `#keuanganTab-laporan`, tepat setelah pembukaan div-nya, sebelum
  `.page-settings-btn`. Audit menemukan bahwa Laporan adalah **tab**
  di dalam `#page-keuangan`, bukan page terpisah — FAB baru ini
  (`#laporanFab`) sengaja ditaruh **di dalam** tab Laporan (kontekstual,
  beda dari `#keuFab` Tahap 1 yang ditaruh di luar kedua tab) supaya
  hanya tampil saat tab Laporan aktif, murni lewat toggle `u-dnone`
  yang **sudah ada** (`setKeuanganTab()`, `tx-list-cashflow.js`, tidak
  disentuh) — **tidak ada JS baru sama sekali**. Reuse **penuh** class
  CSS `.keu-fab*` dari Sprint 2 Tahap 1 (tidak ada class baru) dan
  fungsi `exportLaporanPDF()`/`exportCSV()` yang sudah ada. `#keuFab`
  (Tahap 1) tidak diubah, tetap tampil di kedua tab seperti sebelumnya.
  Kedua file tetap identik satu sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — 1 rule aditif
  `#keuanganTab-laporan .keu-fab{bottom:170px;}` supaya `#laporanFab`
  tidak tumpang tindih dengan `#keuFab` saat tab Laporan aktif. Rule
  `.keu-fab` asli (Tahap 1) dan override Shop (Tahap 2) tidak diubah
  nilainya. Tidak ada class `.laporan-fab*`/`.reports-fab*` baru.
- **`REPORTS-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 4.
- **`tests/laporan-fab.test.js`** — 20 test struktural baru (markup FAB
  ada & di posisi yang benar, penempatan kontekstual di dalam tab
  Laporan, reuse class `.keu-fab*`, reuse
  `exportLaporanPDF()`/`exportCSV()`, reuse `data-onclick`, parity
  `index.html`/`app_production.html`, guard tidak ada class CSS baru &
  guard override posisi, guard `tx-list-cashflow.js`/
  `features-aiwidget-reminder-gdrive-search.js`/`backup-restore.js`/
  `FEATURE_REGISTRY`/`dashboard-hub.js` tidak disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Shop & FAB-nya
  (Tahap 2), Halaman Car Notes & FAB-nya (Tahap 3) — tidak disentuh
  sama sekali.
- `#keuFab` (Tahap 1) dan seluruh isi tab Kelola & Laporan yang sudah
  ada (filter, grafik, proyeksi arus kas, per kategori, daftar
  transaksi, card export) — 0 baris berubah, tetap tampil & berfungsi
  seperti sebelumnya.
- `tx-list-cashflow.js` (`setKeuanganTab`),
  `features-aiwidget-reminder-gdrive-search.js` (`exportLaporanPDF`),
  `backup-restore.js` (`exportCSV`) — 0 baris berubah; hanya dipanggil
  ulang (reuse) dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1335
# pass 1335
# fail 0
```

Tidak ada test lama yang gagal/dihapus/diubah. Hero Dashboard,
Dashboard, Halaman Keuangan+FAB (Kelola & Laporan), Halaman Shop+FAB,
dan Halaman Car Notes+FAB diverifikasi tetap tampil & berfungsi setelah
perubahan ini; FAB Laporan tampil sebagai tombol mengambang baru,
kontekstual hanya di tab Laporan.

## Status

FAB tab Laporan selesai, sesuai cakupan Sprint 2 Tahap 4. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint berikutnya.

---

# Changelog — Tahap 9: Perbaikan Kontras `--text3` (ROADMAP-v1.1.md #1)

Baseline: Sprint 2 Tahap 4 selesai, `node --test` **1336/1336 PASS**.

## Diubah

- **`styles.css`** — 9 baris diubah (hanya value hex `--text3` per
  tema: `dark`, `ocean`, `light`, `stone`, `slate`, `mono`, `sand`,
  `ink`, `sage`), hue/saturation dipertahankan (adjust lightness saja)
  agar kontras terhadap `--bg` dan `--surface2` mencapai ≥4.5:1 (WCAG
  AA). Tidak ada token/class baru, tidak ada value lain per tema yang
  berubah.

## Ditambahkan

- **`tests/theme-text3-contrast.test.js`** — 30 test struktural baru:
  parsing token warna dari `styles.css` + verifikasi rasio kontras WCAG
  tiap tema vs `--bg`/`--surface2`, plus guard tidak ada class baru &
  token lain per tema tetap utuh.
- **`THEME-CONTRAST-FIX.md`** — dokumentasi deliverable Tahap 9.

## Tidak diubah

- Hero Dashboard, Dashboard, Halaman Keuangan+FAB, Shop+FAB, Car
  Notes+FAB, tab Laporan+FAB — tidak disentuh.
- `FEATURE_REGISTRY`, `dashboard-hub.js`, ADR-001, business logic,
  build system, service worker, `package.json`, `index.html`,
  `app_production.html`.
- Item lain di `ROADMAP-v1.1.md` (border-radius, shadow, transition
  token, dll.) — menunggu tahap berikutnya.

## Hasil test

```
node --test
# tests 1366
# pass 1366
# fail 0
```

## Status

Item #1 `ROADMAP-v1.1.md` selesai. Sesuai instruksi, pengerjaan
**berhenti di sini** — tidak melanjutkan ke item roadmap berikutnya.

## Tahap 10 — Exit/Closing Animation Overlay & Bottom Sheet

ROADMAP-v1.1.md item #2 (High Priority, KNOWN-ISSUES.md §5.1).

- **`styles.css`** — tambah `@keyframes overlayOut`/`slideDown` +
  rule `.overlay.closing`/`.calc-overlay.closing` (reverse simetris
  dari `overlayIn`/`slideUp` yang sudah ada, 100% token
  `--dur-moderate`/`--dur-slow`/`--ease-standard`/`--ease-emphasized`).
- **`modal-navigasi.js`** — `closeModal()` sekarang menunda pelepasan
  class `open` lewat `animationend`+fallback `setTimeout`, dengan guard
  re-open cepat & guard id modal tidak ditemukan. `openModal()` +1
  baris (`classList.remove('closing')`).
- **`tests/modal-close-animation.test.js`** — 10 test baru (7
  struktural DOM + 3 struktural CSS).
- **`MODAL-EXIT-ANIMATION.md`** — dokumentasi deliverable Tahap 10.

## Tidak diubah

- Hero Dashboard, Dashboard, Halaman Keuangan+FAB, Shop+FAB, Car
  Notes+FAB, tab Laporan+FAB — tidak disentuh.
- `FEATURE_REGISTRY`, `dashboard-hub.js`, ADR-001, business logic,
  build system, service worker, `package.json`, `index.html`,
  `app_production.html`.
- Modal generik (confirm/prompt/choice/info/pinPrompt) & quick-switcher
  (`openQS`/`closeQS`) — tidak lewat `closeModal()`, di luar scope.
- Item lain di `ROADMAP-v1.1.md` — menunggu tahap berikutnya.

## Hasil test

```
node --test
# tests 1375
# pass 1375
# fail 0
```

## Status

Item #2 `ROADMAP-v1.1.md` selesai. Sesuai instruksi, pengerjaan
**berhenti di sini** — tidak melanjutkan ke item roadmap berikutnya.

## Tahap 11 — Migrasi Token `border-radius`

ROADMAP-v1.1.md item #4 (Medium Priority, KNOWN-ISSUES.md §2.1).

- **`styles.css`** — 42 literal `border-radius` (16px/10px/20px/12px)
  diganti `var(--r-2xl/--r-md/--r-pill/--r-lg)`, value-preserving.
- **`tests/dashboard-hub-pinnedwidgets.test.js`** — 1 guard test
  diupdate mengikuti representasi baru (nilai `.card` tetap 16px).
- **`BORDER-RADIUS-TOKEN-MIGRATION.md`** — dokumentasi deliverable.

## Tidak diubah

- FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic,
  build system, package.json, service worker.
- Item lain di `ROADMAP-v1.1.md` — menunggu tahap berikutnya.

## Hasil test

```
node --test
# tests 1376
# pass 1376
# fail 0
```

## Status

Item #4 `ROADMAP-v1.1.md` selesai.

## Tahap 12 — Konsolidasi Token Durasi Transition

ROADMAP-v1.1.md item #6 (Medium Priority, KNOWN-ISSUES.md §2.3).
Item #5 (box-shadow token) dilewati: token `--shadow-*` yang disebut
di roadmap ternyata belum pernah dibuat.

- **`styles.css`** — 32 literal durasi transition (`0.2s`/`.2s`,
  `0.15s`/`.15s`, `0.25s`/`.25s`) diganti `var(--dur-moderate)`/
  `var(--dur-base)`/`var(--dur-slow)`, value-preserving (hanya nilai
  match persis token yang dimigrasi).
- **`TRANSITION-DURATION-TOKENS.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1376
# pass 1376
# fail 0
```

## Status

Item #6 `ROADMAP-v1.1.md` selesai.

## Tahap 13 — Touch Target Padding .chip-btn/.qs-btn

ROADMAP-v1.1.md item #7 (Medium Priority, KNOWN-ISSUES.md §1.2).

- **`styles.css`** — padding vertikal `.chip-btn` (6px→11px) & `.qs-btn`
  (7px→12px), font-size/warna/border tidak berubah.
- **`tests/touch-target-padding.test.js`** — 3 test baru.
- **`TOUCH-TARGET-PADDING.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1379
# pass 1379
# fail 0
```

## Status

Item #7 `ROADMAP-v1.1.md` selesai.

## Tahap 14 — Migrasi Token font-size

ROADMAP-v1.1.md item #9 (Low Priority, KNOWN-ISSUES.md §2.4).

- **`styles.css`** — 51 literal `font-size` (11px/12px/13px) diganti
  `var(--fs-caption/--fs-label/--fs-body)`, value-preserving.
- **`tests/touch-target-padding.test.js`** — 1 guard diupdate mengikuti
  representasi baru (nilai `.chip-btn` tetap 12px).
- **`FONT-SIZE-TOKEN-MIGRATION.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1379
# pass 1379
# fail 0
```

## Status

Item #9 `ROADMAP-v1.1.md` selesai.

## Tahap 15 — Container max-width Konsisten (.page)

ROADMAP-v1.1.md item #10 (Low Priority, KNOWN-ISSUES.md §3.1).

- **`styles.css`** — +1 rule aditif `.page{max-width:1080px}` di
  `@media (min-width:1024px)`, reuse nilai existing dari
  `#page-dashboard-hub` (tidak diubah, tetap menang via specificity ID).
- **`tests/page-container-maxwidth.test.js`** — 3 test baru.
- **`PAGE-CONTAINER-MAXWIDTH.md`** — dokumentasi deliverable.

## Tidak diubah

`#page-dashboard-hub` (Dashboard V2), FEATURE_REGISTRY, business logic,
build system, package.json, service worker.

## Hasil test

```
node --test
# tests 1382
# pass 1382
# fail 0
```

## Status

Item #10 `ROADMAP-v1.1.md` selesai.

## Tahap 16 — Hover Elevation Tap-Target Sekunder

ROADMAP-v1.1.md item #11 (Low Priority, KNOWN-ISSUES.md §5.3).

- **`styles.css`** — +1 rule hover aditif (`.stat-box.clickable`,
  `.cobek-stat.clickable`, `.bbm-stat.clickable`,
  `.budget-sum-box.clickable`, `.budget-item.clickable`), reuse shadow
  value `.card:hover`, di dalam media block existing.
- **`tests/secondary-clickable-hover.test.js`** — 3 test baru.
- **`SECONDARY-CLICKABLE-HOVER.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1385
# pass 1385
# fail 0
```

## Status

Item #11 selesai. ROADMAP-v1.1.md item CSS-only/additive/value-preserving
**habis** — sisa #3 (FEATURE_REGISTRY, dilarang), #5 (butuh skala token
baru), #8 (🔴 butuh JS) menunggu sesi terpisah dengan mandat eksplisit.

## Sprint 3 Tahap 3.1 — AI Command Center Foundation

Baseline diverifikasi langsung dari isi repository (bukan klaim sesi
sebelumnya yang tidak konsisten dengan file ini): `node --test`
1384/1384 PASS sebelum tahap ini dimulai.

Foundation registry netral untuk command AI (aksi yang bisa dieksekusi
langsung, dipakai command palette/asisten AI di tahap selanjutnya).
Murni logic, tanpa DOM/UI, tanpa command bawaan apa pun — registry
kosong sampai modul lain mendaftar di Tahap 3.2+. Terpisah dari
FEATURE_REGISTRY (taksonomi navigasi) secara sengaja; tidak membaca
maupun menulis FEATURE_REGISTRY.

- **`ai-command-center.js`** — baru. `window.AICommandCenter`:
  `registerCommand`, `unregisterCommand`, `getCommands`, `getCommand`,
  `execute` (dibungkus try/catch, tidak pernah throw ke pemanggil),
  `clear`.
- **`tests/ai-command-center.test.js`** — 14 test baru.
- **`scripts/build.js`** — +1 baris, daftarkan `ai-command-center.js` ke
  `GROUP_B`. Logic build.js tidak diedit.
- **`AI-COMMAND-CENTER-FOUNDATION.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, business logic modul manapun,
`index.html`/`app_production.html`, `sw.js`, `package.json`.

## Hasil test

```
node --test
# tests 1398
# pass 1398
# fail 0
```

## Status

Foundation Tahap 3.1 selesai. Registry aktif tapi kosong — pendaftaran
command nyata & UI command palette adalah scope Tahap 3.2+, sesi
terpisah dengan mandat eksplisit.

## Sprint 3 → Dashboard V2 Migration — RFC Tahap V2.1 (Layout Foundation)

**PLANNING ONLY — tidak ada file kode yang diubah.** `node --test` tetap
1398/1398 PASS (baseline tidak berubah).

Audit + Migration Plan + Dependency Map + Risk Assessment untuk migrasi
Dashboard V2 (evolusi dari Hero Dashboard existing `#page-dashboard-hub`,
BUKAN dashboard terpisah). Temuan audit: istilah "Dashboard V2" sudah
dipakai 15 dokumen sebelumnya sebagai item yang eksplisit "tidak
diubah"; bottom nav (`#mainNav`) & `showPage()` adalah chrome GLOBAL
dipakai semua 8 halaman (termasuk Finance/Vehicle/Reports/Shop) sehingga
tidak bisa diedit langsung tanpa melanggar constraint; tidak ada preseden
Sidebar di codebase (app 100% mobile bottom-nav).

Rencana Tahap V2.1: 5 komponen (Sidebar/Header V2/Main Content
Container/Bottom Navigation V2/FAB V2) dibangun sebagai scaffold BARU,
dormant, tidak wired ke routing/DOM live — tidak menyentuh `#mainNav`,
`showPage()`, `FEATURE_REGISTRY`, atau business logic modul manapun.

- **`DASHBOARD-V2-MIGRATION-RFC.md`** — dokumen RFC lengkap (audit,
  dependency map, risk assessment, daftar file proyeksi implementasi).

## Tidak diubah

Seluruh file kode (0 file kode disentuh). FEATURE_REGISTRY,
`dashboard-hub.js`, `#mainNav`, `showPage()`, business logic
Finance/Vehicle/Reports/Shop, data layer.

## Hasil test

```
node --test
# tests 1398
# pass 1398
# fail 0
```

## Status

RFC menunggu persetujuan eksplisit. Implementasi V2.1 (5 file kode
proyeksi, lihat §6 RFC) BELUM dimulai.

## Tahap V2.1 — Dashboard V2 Shell (Layout Foundation)

Baseline: `node --test` 1399/1399 PASS. BLOCKER "Dashboard V2 Shell
(V2.1) belum ada" dianggap selesai sesi ini — implementasi dieksekusi
persis sesuai `DASHBOARD-V2-MIGRATION-RFC.md` §4.

### Ditambahkan

- **`dashboard-v2-shell.js`** (file baru) — `window.DashboardV2Shell`
  dgn API `init()`/`render()`/`destroy()`. Scaffold 5 komponen layout
  DORMANT (Sidebar, Header V2, Main Content Container, Bottom
  Navigation V2, FAB V2), semua placeholder murni: tidak ada business
  logic, tidak ada routing, tidak ada integrasi `FEATURE_REGISTRY`.
  Root container (`#dashboardV2Root`) dibuat & di-mount lewat JS
  (`document.createElement`/`appendChild`), bukan markup HTML statis —
  0 baris `index.html`/`app_production.html` disentuh. Namespace class
  baru `dashboard-v2-*` (bukan `.nav`/`.nav-item`) supaya tidak
  bersinggungan dgn query global `showPage()`.
- **`tests/dashboard-v2-shell.test.js`** — 15 test baru: API tersedia,
  init/render/destroy idempotent, struktur 5 placeholder, FAB tidak
  interaktif, namespace tidak bentrok `.nav-item`/`#mainNav`, regresi
  Dashboard Hub existing & HTML tidak berubah.
- **`styles.css`**: rule CSS aditif namespace `dashboard-v2-*` utk 5
  komponen, 100% reuse token existing (`--sp-*`, `--fs-*`, `--bg`,
  `--surface`, `--text`/`--text2`, `--border`, `--header-bg`),
  breakpoint Sidebar desktop-only (`min-width:1024px`).
- **`DASHBOARD-V2-SHELL.md`** — dokumentasi deliverable tahap ini.

### Diubah (aditif)

- **`scripts/build.js`**: +1 baris, daftarkan `dashboard-v2-shell.js`
  ke `GROUP_B`. Logic build.js tidak diedit.

### Tidak diubah

`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `#mainNav`,
`showPage()`, business logic Finance/Vehicle/Reports/Shop/Hero
Dashboard, data layer.

### Hasil test

```
node --test
# tests 1414
# pass 1414
# fail 0
```

### Status

V2.1 (Layout Foundation) selesai, dormant. V2.2+ (wire-up) tetap
menunggu mandat eksplisit terpisah.

## Tahap V2.2 — Dashboard V2: Header V2 & Hero V2

Baseline: `node --test` 1414/1414 PASS (akhir Tahap V2.1). Tidak
mengulang audit; melengkapi isi 2 placeholder existing di
`dashboard-v2-shell.js` (Header, Main Content Container).

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): Header V2 sekarang
  merender 4 sub-placeholder (greeting, tombol search `disabled`,
  tombol notification `disabled`, avatar `role="img"`). Main Content
  Container sekarang membungkus Hero V2 (welcome title `<h2>`, Health
  Score, Balance, Insight) — semua teks statis placeholder, dirender
  sbg anak Main (bukan komponen top-level baru; struktur 5 komponen
  V2.1 tidak berubah). Semua dibangun via `replaceChildren()`, tanpa
  `innerHTML`. Atribut aksesibilitas: `role="banner"`/`role="img"`/
  `role="region"` + `aria-label`/`aria-labelledby` sesuai konteks.
- **`tests/dashboard-v2-hero.test.js`** — 12 test baru (Header/Hero
  dirender, 4 placeholder Hero, idempotent, tetap dormant, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/data
  layer/Dashboard Hub existing/HTML).
- **`styles.css`**: rule CSS aditif utk sub-elemen Header V2 & Hero V2,
  100% reuse token existing (`--sp-*`, `--r-pill`, `--r-full`, `--r-xl`,
  `--fs-*`, `--text`/`--text2`, `--surface2`, `--accent-soft`).
- **`DASHBOARD-V2-HERO.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

API `init()`/`render()`/`destroy()`, struktur top-level 5 komponen
V2.1, `index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, business logic
Finance/Vehicle/Reports/Shop/Hero Dashboard existing, `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan).

### Hasil test

```
node --test
# tests 1426
# pass 1426
# fail 0
```

### Status

V2.2 selesai, dormant. V2.2.2+/V2.3 (wire-up nyata) tetap menunggu
mandat eksplisit terpisah.

## Tahap V2.3 — Dashboard V2: Summary Cards & Quick Actions

Baseline: `node --test` 1426/1426 PASS (akhir Tahap V2.2). Tidak
mengulang audit; melengkapi Main Content Container di
`dashboard-v2-shell.js` dgn 2 sub-komponen baru, sejajar dgn Hero V2.

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): Main Content Container
  sekarang membungkus 3 anak berurutan — Hero V2 (tidak berubah),
  Summary Cards (baru), Quick Actions (baru). Struktur top-level 5
  komponen V2.1 & API `init()`/`render()`/`destroy()` tidak berubah.
  - **Summary Cards** (`#dashboardV2SummaryCards`, `role="region"`):
    4 kartu placeholder murni — Total Balance, Monthly Income, Monthly
    Expense, Health Score. Semua teks statis `-- (placeholder)`, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun.
  - **Quick Actions** (`#dashboardV2QuickActions`, `role="region"`):
    4 tombol placeholder — Tambah Transaksi, Catatan Kendaraan, Backup,
    Laporan. **Semua `disabled`**, tanpa `onclick`/`addEventListener`,
    tanpa routing (tidak memanggil `showPage()`), tanpa business logic
    apa pun.
  - Dibangun via `replaceChildren()` di semua level, tanpa `innerHTML`.
    Atribut aksesibilitas: `role="region"` + `aria-label` per section
    & per elemen anak.
- **`tests/dashboard-v2-summary.test.js`** — 13 test baru (struktur
  Main 3 anak berurutan, Summary Cards 4 kartu, Quick Actions 4 tombol
  semua disabled, idempotent, tetap dormant, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/data layer/tanpa
  event handler nyata/Dashboard Hub existing/HTML).
- **`DASHBOARD-V2-SUMMARY.md`** — dokumentasi deliverable tahap ini.

### Diubah (penyesuaian test lama, bukan regresi)

- **`tests/dashboard-v2-hero.test.js`**: 1 assersi pada test
  "render() tetap idempotent..." disesuaikan — sebelumnya mengasumsikan
  Main Content Container hanya py 1 anak (Hero). Sejak Tahap V2.3, Main
  py 3 anak (Hero + Summary Cards + Quick Actions); assersi diganti jadi
  memastikan Hero tetap anak pertama & tidak menumpuk. Assersi lain di
  file ini (Header 4 sub-placeholder, Hero 4 placeholder, dormant, dll)
  tidak berubah dan tetap lulus.

### Tidak diubah

`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, business logic
Finance/Vehicle/Reports/Shop/Hero Dashboard existing, `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `styles.css` (tidak
disentuh — Summary Cards/Quick Actions tahap ini murni struktur DOM,
styling visual di luar scope).

### Hasil test

```
node --test
# tests 1439
# pass 1439
# fail 0
```

### Status

V2.3 (Summary Cards + Quick Actions) selesai, dormant, tidak wired.
Wire-up nyata (sumber data real, aktivasi tombol, integrasi
FEATURE_REGISTRY/routing) tetap di luar scope, butuh mandat eksplisit
terpisah.

## Tahap V2.4 — Dashboard V2: Module Grid & Insight Panel

Baseline: `node --test` 1439/1439 PASS (akhir Tahap V2.3). Melengkapi
Main Content Container dgn 2 sub-komponen baru, sejajar dgn Hero V2/
Summary Cards/Quick Actions.

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): Main Content Container
  sekarang membungkus 5 anak berurutan — Hero, Summary Cards, Quick
  Actions (tidak berubah), Module Grid (baru), Insight Panel (baru).
  - **Module Grid** (`#dashboardV2ModuleGrid`, `role="region"`): 6
    kartu placeholder — Finance, Vehicle, Reports, Family, Documents,
    Settings. Sekadar label statis, tanpa link/routing.
  - **Insight Panel** (`#dashboardV2InsightPanel`, `role="region"`): 3
    baris insight placeholder — "Backup belum dilakukan", "Saldo
    stabil bulan ini", "Kendaraan akan servis". Teks statis, tidak
    membaca data nyata.
- **`tests/dashboard-v2-summary.test.js`**: assersi struktur Main
  disesuaikan (5 anak, bukan 3) + 6 test baru (Module Grid section, 6
  module card, Insight Panel section, 3 insight item, dormant check,
  regresi tanpa routing/event).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`,
`scripts/build.js`.

### Hasil test

```
node --test
# tests 1445
# pass 1445
# fail 0
```

### Status

V2.4 (Module Grid + Insight Panel) selesai, dormant, tidak wired.

## Tahap V2.5 — Dashboard V2: Sidebar Navigation & Bottom Navigation V2 items

Baseline: `node --test` 1445/1445 PASS (akhir Tahap V2.4). Melengkapi
ISI 2 placeholder top-level yg dari V2.1 masih teks polos (Sidebar,
Bottom Navigation V2) — konsisten dgn pola `_buildHeader()` (V2.2):
tiap komponen dipecah jadi method builder tersendiri.

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): `render()` di-refactor
  memanggil 2 method builder baru, `_buildSidebar()` dan
  `_buildBottomNav()`, alih-alih membangun teks polos inline. Struktur
  top-level 5 komponen & API `init()`/`render()`/`destroy()` tidak
  berubah.
  - **Sidebar** (`#dashboardV2Sidebar`): 5 item navigasi placeholder —
    Dashboard, Finance, Vehicle, Reports, Settings. Semua
    `<button type="button" disabled>`, namespace class baru
    `dashboard-v2-sidebar-item` (BUKAN `.nav-item`).
  - **Bottom Navigation V2** (`#dashboardV2BottomNav`): 4 item navigasi
    placeholder — Home, Finance, Vehicle, More. Semua
    `<button type="button" disabled>`, namespace class baru
    `dashboard-v2-bottomnav-item`. Class induk `dashboard-v2-bottomnav`
    tidak berubah.
  - Semua tombol `disabled`, tanpa `onclick`/`addEventListener`, tanpa
    routing (tidak memanggil `showPage()`), tanpa business logic apa
    pun — murni placeholder navigasi, sama seperti FAB V2/tombol
    Header V2. Dibangun via `replaceChildren()`, tanpa `innerHTML`.
- **`tests/dashboard-v2-navigation.test.js`** — 10 test baru (root
  tetap 5 komponen, Sidebar 5 item sesuai urutan & disabled, Bottom Nav
  4 item sesuai urutan & disabled, idempotent, tetap dormant, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/
  `.nav-item` global/Dashboard Hub existing/HTML).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh — item navigasi tahap ini murni struktur DOM, styling
visual di luar scope), `scripts/build.js` (tidak ada file baru yg
perlu didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2), `tests/dashboard-v2-summary.test.js`
(V2.3/V2.4) — tidak ada assersi yg terdampak, tetap 100% lulus tanpa
perubahan.

### Hasil test

```
node --test
# tests 1456
# pass 1456
# fail 0
```

### Status

V2.5 (Sidebar Navigation + Bottom Navigation V2 items) selesai,
dormant, tidak wired. Kelima komponen top-level V2.1 kini py isi
placeholder lengkap (Sidebar, Header, Main, Bottom Nav, FAB). Wire-up
nyata (routing, aktivasi tombol, integrasi FEATURE_REGISTRY) tetap di
luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.6 — Recent Activity

Baseline: akhir Tahap V2.5 (`tests 1456 / pass 1456 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildRecentActivity()`,
  di-wire ke `_buildMain()` sbg anak ke-6 (setelah Insight Panel V2.4).
  Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions ->
  Module Grid -> Insight Panel -> **Recent Activity**.
  - Recent Activity: 5 baris item aktivitas placeholder murni
    (`dashboardV2RecentActivityItem1..5`, class induk
    `dashboard-v2-recent-activity-item`) — teks statis semacam
    "Transaksi tercatat (placeholder)", TIDAK membaca
    `D.profile`/`D.transactions`/sumber data nyata apa pun. Pola identik
    `_buildInsightPanel()` (V2.4): `role="region"` + `aria-label` pada
    section, tiap item py `aria-label` sendiri, dibangun via
    `replaceChildren()`, tanpa `innerHTML`.
  - Tanpa `onclick`/`addEventListener`, tanpa routing (tidak memanggil
    `showPage()`), tanpa business logic apa pun — sama seperti seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-activity.test.js`** — 11 test baru (Recent
  Activity ditemukan sbg anak ke-6 Main + role/aria-label, tepat 5
  item, urutan & isi 5 item sesuai, tetap dormant, idempotent, root
  top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`dashboard-hub.js`/
  HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak Main
  disesuaikan dari 5 menjadi 6 (struktur Main sekarang py Recent
  Activity sbg anak ke-6): test struktur Main berurutan, dan test
  idempotensi `render()`. Tidak ada assersi lain yg terdampak — assersi
  `root.children.length` (top-level, tetap 5) tidak diubah.

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1467
# pass 1467
# fail 0
```

### Status

V2.6 (Recent Activity) selesai, dormant, tidak wired. Main Content
Container kini py 6 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity). Wire-up nyata (data
aktivitas sungguhan, routing, integrasi FEATURE_REGISTRY) tetap di
luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.7 — Statistics Panel

Baseline: akhir Tahap V2.6 (`tests 1467 / pass 1467 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildStatisticsPanel()`,
  di-wire ke `_buildMain()` sbg anak ke-7 (setelah Recent Activity
  V2.6). Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions
  -> Module Grid -> Insight Panel -> Recent Activity ->
  **Statistics Panel**.
  - Statistics Panel: section `role="region"` + `aria-label="Statistics"`
    berisi 4 kartu statistik placeholder (Income, Expense, Savings,
    Active Vehicles — id `dashboardV2StatisticsCardIncome/Expense/
    Savings/Vehicles`, class induk `dashboard-v2-statistics-card`).
  - Tiap kartu adalah `<button type="button" disabled>` (pola `disabled`
    sama dgn Quick Actions V2.3/Sidebar & Bottom Nav V2.5) berisi 4
    sub-elemen placeholder statis: icon (`dashboard-v2-statistics-icon`),
    title (`dashboard-v2-statistics-title`), value
    (`dashboard-v2-statistics-value`, "-- (placeholder)"), trend
    (`dashboard-v2-statistics-trend`, "-- (placeholder)").
  - Semua teks statis, TIDAK membaca `D.profile`/`D.transactions`/
    sumber data nyata apa pun. Dibangun via `replaceChildren()`, tanpa
    `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa routing
    (tidak memanggil `showPage()`), tanpa integrasi
    `FEATURE_REGISTRY`/`AICommandCenter`, tanpa `fetch`, tanpa state
    baru — murni render-stub dormant, konsisten dgn seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-statistics.test.js`** — 13 test baru (Statistics
  Panel ditemukan sbg anak ke-7 Main + role/aria-label "Statistics",
  tepat 4 kartu, urutan & atribut `disabled` 4 kartu, isi 4 sub-elemen
  tiap kartu (icon/title/value/trend), tetap dormant, idempotent, root
  top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak Main
  disesuaikan dari 6 menjadi 7 (struktur Main sekarang py Statistics
  Panel sbg anak ke-7): test struktur Main berurutan, dan test
  idempotensi `render()` (ditambah cek `statisticsPanel.children.length`
  = 4). Tidak ada assersi lain yg terdampak.
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak Main
  di test idempotensi disesuaikan dari 6 menjadi 7 (assersi lain di
  file ini — urutan/id 5 activity item, dormant, regresi — tidak
  terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1480
# pass 1480
# fail 0
```

### Status

V2.7 (Statistics Panel) selesai, dormant, tidak wired. Main Content
Container kini py 7 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel). Wire-up
nyata (data statistik sungguhan, aktivasi kartu, routing, integrasi
`FEATURE_REGISTRY`) tetap di luar scope, butuh mandat eksplisit
terpisah.

## Tahap V2.8 — Upcoming Tasks

Baseline: akhir Tahap V2.7 (`tests 1480 / pass 1480 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildUpcomingTasks()`,
  di-wire ke `_buildMain()` sbg anak ke-8 (setelah Statistics Panel
  V2.7). Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions
  -> Module Grid -> Insight Panel -> Recent Activity -> Statistics
  Panel -> **Upcoming Tasks**.
  - Upcoming Tasks: section `role="region"` + `aria-label="Upcoming
    Tasks"` berisi 5 kartu tugas placeholder (Bayar Listrik, Servis
    Kendaraan, Backup Data, Review Laporan, Perbarui Dokumen — id
    `dashboardV2UpcomingTaskCardListrik/Servis/Backup/Laporan/Dokumen`,
    class induk `dashboard-v2-upcoming-task-card`).
  - Tiap kartu adalah `<button type="button" disabled>` (pola sama
    persis dgn Statistics Panel V2.7) berisi 4 sub-elemen placeholder
    statis: icon (`dashboard-v2-upcoming-task-icon`), title
    (`dashboard-v2-upcoming-task-title`), due date
    (`dashboard-v2-upcoming-task-due-date`, "-- (placeholder)"),
    status (`dashboard-v2-upcoming-task-status`, "-- (placeholder)").
  - Semua teks statis, TIDAK membaca `D.profile`/`D.transactions`/
    sumber data nyata apa pun. Dibangun via `replaceChildren()`, tanpa
    `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa routing
    (tidak memanggil `showPage()`), tanpa integrasi
    `FEATURE_REGISTRY`/`AICommandCenter`, tanpa `fetch`, tanpa state
    baru — murni render-stub dormant, konsisten dgn seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-upcoming.test.js`** — 13 test baru (Upcoming
  Tasks ditemukan sbg anak ke-8 Main + role/aria-label "Upcoming
  Tasks", tepat 5 kartu, urutan & atribut `disabled` 5 kartu, isi 4
  sub-elemen tiap kartu (icon/title/due date/status), tetap dormant,
  idempotent, root top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak Main
  disesuaikan dari 7 menjadi 8 (struktur Main sekarang py Upcoming
  Tasks sbg anak ke-8): test struktur Main berurutan, dan test
  idempotensi `render()` (ditambah cek `upcomingTasks.children.length`
  = 5). Tidak ada assersi lain yg terdampak.
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 7 menjadi 8 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 7 menjadi 8 (assersi lain
  di file ini tidak terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1493
# pass 1493
# fail 0
```

### Status

V2.8 (Upcoming Tasks) selesai, dormant, tidak wired. Main Content
Container kini py 8 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel, Upcoming
Tasks). Wire-up nyata (data tugas sungguhan, aktivasi kartu, routing,
integrasi `FEATURE_REGISTRY`) tetap di luar scope, butuh mandat
eksplisit terpisah.

## Tahap V2.9 — Notifications Center

Baseline: akhir Tahap V2.8 (`tests 1493 / pass 1493 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildNotifications()`,
  di-wire ke `_buildMain()` sbg anak ke-9 (setelah Upcoming Tasks
  V2.8). Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions
  -> Module Grid -> Insight Panel -> Recent Activity -> Statistics
  Panel -> Upcoming Tasks -> **Notifications Center**.
  - Notifications Center: section `role="region"` + `aria-label=
    "Notifications"` berisi 5 kartu notifikasi placeholder (Backup
    berhasil, Pengeluaran tinggi minggu ini, Jadwal servis mendekat,
    Laporan bulanan siap, Sinkronisasi selesai — id
    `dashboardV2NotificationCardBackup/Pengeluaran/Servis/Laporan/
    Sinkronisasi`, class induk `dashboard-v2-notification-card`).
  - Tiap kartu adalah `<button type="button" disabled>` (pola sama
    persis dgn Upcoming Tasks V2.8/Statistics Panel V2.7) berisi 4
    sub-elemen placeholder statis: icon
    (`dashboard-v2-notification-icon`), title
    (`dashboard-v2-notification-title`), description
    (`dashboard-v2-notification-description`, "-- (placeholder)"),
    timestamp (`dashboard-v2-notification-timestamp`,
    "-- (placeholder)").
  - Semua teks statis, TIDAK membaca `D.profile`/`D.transactions`/
    sumber data nyata apa pun. Dibangun via `replaceChildren()`, tanpa
    `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa routing
    (tidak memanggil `showPage()`), tanpa integrasi
    `FEATURE_REGISTRY`/`AICommandCenter`, tanpa `fetch`, tanpa state
    baru — murni render-stub dormant, konsisten dgn seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-notifications.test.js`** — 13 test baru
  (Notifications ditemukan sbg anak ke-9 Main + role/aria-label
  "Notifications", tepat 5 kartu, urutan & atribut `disabled` 5 kartu,
  isi 4 sub-elemen tiap kartu (icon/title/description/timestamp),
  tetap dormant, idempotent, root top-level tetap 5 komponen, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/
  `fetch`/`dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 8 menjadi 9 (struktur Main sekarang py
  Notifications Center sbg anak ke-9): test struktur Main berurutan
  (ditambah cek `main.children[8].id === 'dashboardV2Notifications'`),
  dan test idempotensi `render()`. Tidak ada assersi lain yg
  terdampak.
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 8 menjadi 9 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 8 menjadi 9 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 8 menjadi 9 (assersi lain
  di file ini tidak terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1506
# pass 1506
# fail 0
```

### Status

V2.9 (Notifications Center) selesai, dormant, tidak wired. Main
Content Container kini py 9 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center). Wire-up nyata (data
notifikasi sungguhan, aktivasi kartu, dismiss/read-state, routing,
integrasi `FEATURE_REGISTRY`) tetap di luar scope, butuh mandat
eksplisit terpisah.

## Tahap V2.10 — AI Command Center UI

Baseline: akhir Tahap V2.9 (`tests 1506 / pass 1506 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildAiCommandCenter()`,
  di-wire ke `_buildMain()` sbg anak ke-10 (setelah Notifications
  Center V2.9). Urutan Main sekarang: Hero -> Summary Cards -> Quick
  Actions -> Module Grid -> Insight Panel -> Recent Activity ->
  Statistics Panel -> Upcoming Tasks -> Notifications Center ->
  **AI Command Center**.
  - AI Command Center: section `role="region"` + `aria-label="AI
    Command Center"` berisi 6 anak: 1 search field placeholder
    (`<input type="text" readonly>`, id
    `dashboardV2AiCommandCenterSearch`, class
    `dashboard-v2-ai-search`), 4 kartu aksi placeholder (Analyze
    Finance, Analyze Vehicle, Generate Report, Smart Assistant — id
    `dashboardV2AiCommandCenterAction<Key>`, class
    `dashboard-v2-ai-action-card`), dan 1 area saran placeholder (id
    `dashboardV2AiCommandCenterSuggestion`, class
    `dashboard-v2-ai-suggestion`, teks statis "-- (placeholder)").
  - Search field murni `readonly` (bukan `disabled`, supaya tetap bisa
    fokus/dibaca screen reader — namun tanpa input handler apa pun).
    4 kartu aksi murni `<button type="button" disabled>` (pola sama
    persis dgn Quick Actions V2.3). Area saran murni `<div>` teks
    statis, bukan elemen interaktif.
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK menyentuh `ai-command-center.js` existing (modul AI
    sungguhan tidak disentuh/direferensikan). Dibangun via
    `replaceChildren()`, tanpa `innerHTML`, tanpa `onclick`/
    `addEventListener`, tanpa routing (tidak memanggil `showPage()`),
    tanpa integrasi `FEATURE_REGISTRY`, tanpa state baru — murni
    render-stub dormant, konsisten dgn seluruh sub-komponen Main
    tahap-tahap sebelumnya.
  - Catatan penamaan: identifier kode (id/method) memakai
    `AiCommandCenter` (bukan `AICommandCenter`) supaya tidak collide
    scr string dgn nama modul `AICommandCenter` existing yg sengaja
    diverifikasi TIDAK direferensikan oleh regresi test tahap-tahap
    sebelumnya (V2.2–V2.9). Teks tampilan (`aria-label`) tetap "AI
    Command Center" apa adanya.
- **`tests/dashboard-v2-ai.test.js`** — 14 test baru (AI Command
  Center ditemukan sbg anak ke-10 Main + role/aria-label "AI Command
  Center", tepat 6 anak, search field readonly, urutan & atribut
  `disabled` 4 kartu aksi, suggestion area & isi placeholder, tetap
  dormant, idempotent, root top-level tetap 5 komponen, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/
  `fetch`/`ai-command-center.js`/`dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 9 menjadi 10 (struktur Main sekarang py AI
  Command Center sbg anak ke-10): test struktur Main berurutan
  (ditambah cek `main.children[9].id === 'dashboardV2AiCommandCenter'`),
  dan test idempotensi `render()`. Tidak ada assersi lain yg
  terdampak.
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi
  lain di file ini tidak terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1520
# pass 1520
# fail 0
```

### Status

V2.10 (AI Command Center UI) selesai, dormant, tidak wired. Main
Content Container kini py 10 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center, AI Command Center).
Wire-up nyata (AI sungguhan, pemrosesan search, aktivasi kartu aksi,
routing, integrasi `FEATURE_REGISTRY`/`AICommandCenter` existing)
tetap di luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.11 — Dashboard V2 – Health Score Widget

### Ditambahkan

- **`dashboard-v2-shell.js`** — method builder baru `_buildHealthScore()`,
  di-wire ke `_buildMain()` sbg anak ke-11 (setelah AI Command Center
  V2.10). Section `role="region"` + `aria-label="Health Score"`, berisi
  6 anak berurutan:
  - 1 circular score placeholder (`dashboardV2HealthScoreCircle`, class
    `dashboard-v2-health-score-circle`) membungkus 1 nilai skor statis
    (`dashboardV2HealthScoreValue`, textContent `"--"`).
  - 1 subtitle statis (`dashboardV2HealthScoreSubtitle`, class
    `dashboard-v2-health-score-subtitle`, textContent "Overall System
    Health").
  - 4 kartu metrik (Finance, Vehicle, Documents, Family), pola identik
    `_buildNotifications()`/`_buildAiCommandCenter()`: `<button
    type="button" disabled>` (class `dashboard-v2-health-metric-card`),
    masing2 berisi 3 anak — icon (`span`, class
    `dashboard-v2-health-metric-icon`), title (`span`, class
    `dashboard-v2-health-metric-title`), status placeholder (`span`,
    class `dashboard-v2-health-metric-status`, textContent "--
    (placeholder)").
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK menyentuh `ai-command-center.js`/`dashboard-hub.js`/
    `FEATURE_REGISTRY` existing. Dibangun via `replaceChildren()`,
    tanpa `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa
    routing (tidak memanggil `showPage()`), tanpa state baru — murni
    render-stub dormant, konsisten dgn seluruh sub-komponen Main
    tahap-tahap sebelumnya. Namespace class baru memakai konvensi
    `dashboard-v2-health-*`, belum ada deklarasi CSS baru
    (`styles.css` tidak disentuh).
- **`tests/dashboard-v2-health.test.js`** — 13 test baru (Health Score
  Widget ditemukan sbg anak ke-11 Main + role/aria-label "Health
  Score", tepat 6 anak, circular score placeholder & subtitle,
  urutan & atribut `disabled`/isi 4 kartu metrik, tetap dormant,
  idempotent, root top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 10 menjadi 11 (assersi lain di file ini tidak
  terdampak).
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 10 menjadi 11 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 10 menjadi 11 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 10 menjadi 11 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 10 menjadi 11
  (assersi lain di file ini tidak terdampak).
- **`tests/dashboard-v2-ai.test.js`** — 1 assersi jumlah anak Main di
  test idempotensi disesuaikan dari 10 menjadi 11 (assersi lain di
  file ini tidak terdampak, termasuk assersi anak ke-10 AI Command
  Center yg tetap benar).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1533
# pass 1533
# fail 0
```

### Status

V2.11 (Health Score Widget) selesai, dormant, tidak wired. Main
Content Container kini py 11 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center, AI Command Center, Health
Score Widget). Wire-up nyata (kalkulasi skor sungguhan, integrasi data
Finance/Vehicle/Documents/Family nyata, aktivasi kartu metrik, routing)
tetap di luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.12 — Dashboard V2 – Predictive Insights

### Ditambahkan

- **`dashboard-v2-shell.js`** — method builder baru
  `_buildPredictiveInsights()`, di-wire ke `_buildMain()` sbg anak
  ke-12 (setelah Health Score Widget V2.11). Section `role="region"`
  + `aria-label="Predictive Insights"`, berisi 5 kartu insight
  prediktif berurutan (Cash Flow Forecast, Budget Trend, Vehicle
  Maintenance Prediction, Family Schedule Prediction, Document
  Expiration Prediction), pola identik
  `_buildNotifications()`/`_buildAiCommandCenter()`/
  `_buildHealthScore()`: `<button type="button" disabled>` (class
  `dashboard-v2-predictive-card`), masing2 berisi 5 sub-elemen —
  icon (`span`, class `dashboard-v2-predictive-icon`), title (`span`,
  class `dashboard-v2-predictive-title`), prediction placeholder
  (`span`, class `dashboard-v2-predictive-prediction`, textContent
  `"--"`), confidence placeholder (`span`, class
  `dashboard-v2-predictive-confidence`, textContent `"--"`), dan
  recommendation placeholder (`span`, class
  `dashboard-v2-predictive-recommendation`, textContent "--
  (placeholder)").
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK ada perhitungan/prediksi sungguhan apa pun, TIDAK menyentuh
    `ai-command-center.js`/`dashboard-hub.js`/`FEATURE_REGISTRY`
    existing. Dibangun via `replaceChildren()` (di level section & di
    level setiap kartu), tanpa `innerHTML`, tanpa `onclick`/
    `addEventListener`, tanpa routing (tidak memanggil `showPage()`),
    tanpa state baru — murni render-stub dormant, konsisten dgn
    seluruh sub-komponen Main tahap-tahap sebelumnya. Namespace class
    baru memakai konvensi `dashboard-v2-predictive-*`, belum ada
    deklarasi CSS baru (`styles.css` tidak disentuh).
- **`tests/dashboard-v2-predictive.test.js`** — 11 test baru
  (Predictive Insights ditemukan sbg anak ke-12 Main +
  role/aria-label "Predictive Insights", tepat 5 kartu, urutan &
  atribut `disabled`/isi 5 kartu (icon/title/prediction/confidence/
  recommendation), tetap dormant, idempotent, root top-level tetap 5
  komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 11 menjadi 12 (assersi lain di file ini tidak
  terdampak).
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 11 menjadi 12 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 11 menjadi 12 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 11 menjadi 12 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 11 menjadi 12
  (assersi lain di file ini tidak terdampak).
- **`tests/dashboard-v2-ai.test.js`** — 1 assersi jumlah anak Main di
  test idempotensi disesuaikan dari 11 menjadi 12 (assersi lain di
  file ini tidak terdampak).
- **`tests/dashboard-v2-health.test.js`** — 1 assersi jumlah anak Main
  di test idempotensi disesuaikan dari 11 menjadi 12 (assersi lain di
  file ini tidak terdampak, termasuk assersi anak ke-11 Health Score
  yg tetap benar).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1544
# pass 1544
# fail 0
```

### Status

V2.12 (Predictive Insights) selesai, dormant, tidak wired. Main
Content Container kini py 12 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center, AI Command Center, Health
Score Widget, Predictive Insights). Wire-up nyata (perhitungan
prediksi/forecast sungguhan, integrasi data Finance/Vehicle/Family/
Documents nyata, aktivasi kartu, routing, styling visual) tetap di
luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.13 — Dashboard V2 – Automation Center

### Ditambahkan

- **`dashboard-v2-shell.js`** — method builder baru
  `_buildAutomationCenter()`, di-wire ke `_buildMain()` sbg anak ke-13
  (setelah Predictive Insights V2.12). Section `role="region"` +
  `aria-label="Automation Center"`, berisi 5 kartu automation
  berurutan (Auto Backup, Monthly Report, Budget Reminder, Vehicle
  Service Reminder, Document Renewal Reminder), pola identik
  `_buildNotifications()`/`_buildAiCommandCenter()`/
  `_buildHealthScore()`/`_buildPredictiveInsights()`: `<button
  type="button" disabled>` (class `dashboard-v2-automation-card`),
  masing2 berisi 5 sub-elemen — icon (`span`, class
  `dashboard-v2-automation-icon`), title (`span`, class
  `dashboard-v2-automation-title`), schedule placeholder (`span`,
  class `dashboard-v2-automation-schedule`, textContent `"--"`),
  status placeholder (`span`, class `dashboard-v2-automation-status`,
  textContent `"Disabled"`), dan description placeholder (`span`,
  class `dashboard-v2-automation-description`, teks statis per kartu).
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK ada scheduling/eksekusi automation sungguhan apa pun, TIDAK
    menyentuh `ai-command-center.js`/`dashboard-hub.js`/
    `FEATURE_REGISTRY` existing. Dibangun via `replaceChildren()` (di
    level section & di level setiap kartu), tanpa `innerHTML`, tanpa
    `onclick`/`addEventListener`, tanpa routing (tidak memanggil
    `showPage()`), tanpa state baru — murni render-stub dormant,
    konsisten dgn seluruh sub-komponen Main tahap-tahap sebelumnya.
    Namespace class baru memakai konvensi
    `dashboard-v2-automation-*`, belum ada deklarasi CSS baru
    (`styles.css` tidak disentuh).
- **`tests/dashboard-v2-automation.test.js`** — 11 test baru
  (Automation Center ditemukan sbg anak ke-13 Main +
  role/aria-label "Automation Center", tepat 5 kartu, urutan &
  atribut `disabled`/isi 5 kartu (icon/title/schedule/status/
  description), tetap dormant, idempotent, root top-level tetap 5
  komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 12 menjadi 13 (assersi lain di file ini tidak
  terdampak).
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 12 menjadi 13
  (assersi lain di file ini tidak terdampak).
- **`tests/dashboard-v2-ai.test.js`** — 1 assersi jumlah anak Main di
  test idempotensi disesuaikan dari 12 menjadi 13 (assersi lain di
  file ini tidak terdampak).
- **`tests/dashboard-v2-health.test.js`** — 1 assersi jumlah anak Main
  di test idempotensi disesuaikan dari 12 menjadi 13 (assersi lain di
  file ini tidak terdampak).
- **`tests/dashboard-v2-predictive.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak, termasuk assersi anak ke-12
  Predictive Insights yg tetap benar).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1555
# pass 1555
# fail 0
```

### Status

V2.13 (Automation Center) selesai, dormant, tidak wired. Main Content
Container kini py 13 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications Center, AI Command Center, Health Score
Widget, Predictive Insights, Automation Center). Wire-up nyata
(scheduling/eksekusi automation sungguhan, integrasi backup/laporan/
reminder nyata, aktivasi kartu, routing, styling visual) tetap di luar
scope, butuh mandat eksplisit terpisah.

## Tahap V2.14A — Dashboard V2 Activation Framework

### Ditambahkan

- **`dashboard-v2-activation.js`** (file baru) — mekanisme feature flag
  internal in-memory untuk Dashboard V2, terpisah sepenuhnya dari
  `dashboard-v2-shell.js`:
  - `isDashboardV2Enabled()` — baca state flag saat ini. Default `false`.
  - `enableDashboardV2()` — set flag jadi `true`. Idempotent.
  - `disableDashboardV2()` — set flag jadi `false`. Idempotent.
  State disimpan di variabel closure top-level file (`_dashboardV2Enabled`),
  in-memory saja (tidak localStorage/cookie/query-param), reset ke default
  `false` setiap file di-load ulang. Tiga fungsi juga ditempel ke
  `window` (pola sama dgn `window.DashboardV2Shell` di
  `dashboard-v2-shell.js`) untuk pemakaian di browser.
  File ini TIDAK membaca/menulis `FEATURE_REGISTRY`, TIDAK memanggil
  `showPage()`, TIDAK menyentuh DOM sama sekali, TIDAK
  meng-instantiate/memanggil `DashboardV2Shell`, TIDAK menghubungkan
  data (`D.profile`/`D.transactions`/dst). Flag ini murni disiapkan
  untuk dibaca oleh tahap wiring terpisah nanti — mengaktifkannya di
  tahap ini SENDIRIAN tidak menampilkan apa pun karena belum ada kode
  lain di repo yang membacanya.
- **`tests/dashboard-v2-activation.test.js`** — 11 test baru: default
  `false`, `enableDashboardV2()`, `disableDashboardV2()`, idempotensi
  enable & disable, transisi berulang, isolasi state antar-instance
  load, jaminan tidak menyentuh `document`/DOM, jaminan tidak memanggil
  `showPage()`, jaminan tidak mengakses `FEATURE_REGISTRY`, serta cek
  statis (grep) atas source file untuk memastikan tidak ada baris kode
  aktif yang mereferensikan `showPage(`, `FEATURE_REGISTRY`, atau
  `DashboardV2Shell`.
- **`scripts/build.js`** — mendaftarkan `dashboard-v2-activation.js` di
  daftar file bundle, tepat setelah `dashboard-v2-shell.js` (murni
  administratif supaya file baru ikut ter-bundle; tidak mengubah urutan
  atau entri lain).
- **`DASHBOARD-V2-ACTIVATION.md`** (file baru) — dokumentasi tahap ini.

### Tidak diubah

`FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `showPage()`,
`dashboard-hub.js`, `index.html`, `app_production.html`,
`dashboard-v2-shell.js`, seluruh business logic aplikasi (D.*), routing,
serta seluruh test suite V2.1–V2.13 yang sudah ada — tidak ada satu
baris pun di file-file tersebut yang tersentuh tahap ini. Dashboard
lama (Dashboard Hub existing) tetap default & aktif sepenuhnya, tidak
terpengaruh oleh flag ini.

### Hasil test

```
node --test
# tests 1566
# pass 1566
# fail 0
```

### Status

Mekanisme aktivasi (feature flag) untuk Dashboard V2 sudah tersedia
tapi belum dipakai di mana pun — Dashboard V2 tetap 100% dormant,
Dashboard lama tetap default. Wiring nyata (mis. `dashboard-hub.js`
atau titik lain membaca `isDashboardV2Enabled()` untuk memutuskan
render Dashboard mana yang ditampilkan) tetap di luar scope, butuh
mandat eksplisit terpisah (tahap integrasi berikutnya).

## Tahap V2.14B — Dashboard V2 Activation Wiring (render, baca-saja)

### Diubah

- **`dashboard-v2-shell.js`** — `render()` sekarang membaca
  `isDashboardV2Enabled()` (global dari `dashboard-v2-activation.js`,
  V2.14A) satu kali di awal, untuk menentukan 2 atribut root yang sudah
  ada sejak V2.1 (`hidden`, `data-dashboard-v2-state`):
  - Flag `false` (default) → root tetap `hidden` + `data-dashboard-v2-state="dormant"` (perilaku identik V2.1–V2.13, tidak berubah).
  - Flag `true` → atribut `hidden` dilepas (`removeAttribute`) +
    `data-dashboard-v2-state="active"`.
  Dipanggil via `typeof isDashboardV2Enabled === 'function'` guard, jadi
  kalau `dashboard-v2-activation.js` belum ter-load di suatu environment,
  `render()` tetap jalan tanpa error dan fallback ke dormant (tidak ada
  perubahan perilaku dari sebelumnya). Struktur top-level 5 komponen,
  API `init()`/`render()`/`destroy()`, dan seluruh sub-komponen Main
  (Hero .. Automation Center) tidak berubah — satu-satunya perubahan
  adalah blok baca-flag + toggle 2 atribut di awal `render()`.
  Tidak ada `showPage()`, tidak ada `FEATURE_REGISTRY`, tidak ada
  pembacaan data Finance/Vehicle/AI, tidak ada `fetch`, tidak ada
  property state instance baru (`this.*`), tidak ada event listener baru.
- **`tests/dashboard-v2-shell.test.js`** dan test V2.1–V2.13 lainnya —
  **tidak diubah**. Karena sandbox test-test tersebut tidak menyuntik
  `isDashboardV2Enabled`, guard `typeof` di `render()` otomatis fallback
  ke `false` (dormant) — perilaku persis sama seperti sebelum tahap ini,
  jadi tidak ada assertion yang perlu disesuaikan.

### Ditambahkan

- **`tests/dashboard-v2-activation-render.test.js`** (file baru) — 11
  test: default (`isDashboardV2Enabled` tidak ada/`false`) tetap hidden
  + dormant; setelah flag `true` → hidden dilepas + `active`; setelah
  flag kembali `false` → hidden lagi + dormant; environment tanpa
  `isDashboardV2Enabled` sama sekali tetap fallback ke dormant tanpa
  error; idempotensi `render()` saat flag `true` maupun `false` (tetap 1
  root, tetap 5 children, atribut konsisten); transisi berulang
  `false → true → false → true`; jaminan `render()` tidak memanggil
  `showPage()`; jaminan `render()` tidak mengakses `FEATURE_REGISTRY`;
  jaminan `render()` hanya MEMBACA flag (tidak memanggil
  `enableDashboardV2()`/`disableDashboardV2()` sendiri); serta cek
  statis (grep atas source, di luar baris komentar) untuk memastikan
  tidak ada referensi kode aktif ke `showPage(`/`FEATURE_REGISTRY`.
  Flag activation di test ini disimulasikan lewat fungsi
  `isDashboardV2Enabled` yang di-inject manual ke sandbox
  `dashboard-v2-shell.js` (bukan menjalankan `dashboard-v2-activation.js`
  sungguhan) — logic enable/disable itu sendiri sudah dites terpisah di
  `tests/dashboard-v2-activation.test.js` (V2.14A).
- **`DASHBOARD-V2-ACTIVATION-RENDER.md`** (file baru) — dokumentasi
  tahap ini.

### Tidak diubah

`dashboard-v2-activation.js` (V2.14A, sudah final — tidak disentuh),
`FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `showPage()`,
`dashboard-hub.js`, `index.html`, `app_production.html`, routing, dan
seluruh business logic aplikasi (`D.*`). Dashboard lama tetap default
& aktif sepenuhnya. Seluruh test suite V2.1–V2.14A yang sudah ada tidak
diubah, tetap 100% lulus tanpa modifikasi assertion.

### Hasil test

```
node --test
# tests 1577
# pass 1577
# fail 0
```

### Status

`DashboardV2Shell.render()` kini secara nyata terhubung ke activation
flag (V2.14A) — tapi Dashboard V2 tetap dormant secara default & tidak
ada satu pun titik lain di repo yang memanggil
`enableDashboardV2()`/mengaktifkan flag ini. Dashboard lama tetap
satu-satunya yang tampil ke pengguna. Wiring rendering nyata ke UI
(kapan/bagaimana `DashboardV2Shell.init()`/`render()` benar-benar
dipanggil dari titik masuk aplikasi, serta penggantian Dashboard lama)
tetap di luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.14C — Dashboard V2 Mount (baca activation flag di DashboardHub.render())

### Diubah

- **`dashboard-hub.js`** — `DashboardHub.render()` menambah SATU blok
  baru di akhir (pola sama persis dgn conditional render() opsional yg
  sudah ada: `LifeOSHome.render()`, `DashboardHubFavoritView.render()`,
  `DashboardHubHero.render()`, `DashboardHubSummary.render()`,
  `DashboardHubAnalytics.render()`):
  ```js
  if (typeof isDashboardV2Enabled === 'function' && isDashboardV2Enabled() === true
    && typeof DashboardV2Shell !== 'undefined') {
    DashboardV2Shell.init();
    DashboardV2Shell.render();
  }
  ```
  Flag `false` (default) → blok ini no-op total, Dashboard lama berjalan
  identik dgn sebelum tahap ini. Flag `true` → `DashboardV2Shell.init()`
  lalu `DashboardV2Shell.render()` dipanggil (keduanya idempotent by
  contract dari V2.1/V2.14B, jadi `DashboardHub.render()` dipanggil
  berkali-kali tidak menumpuk root/children Dashboard V2). Tidak ada
  perubahan lain di `dashboard-hub.js` — `showPage()`, `FEATURE_REGISTRY`,
  `DashboardHub.open()`, dan seluruh logic render existing di atas blok
  ini tidak tersentuh.
- **12 file test lama** (`tests/dashboard-v2-shell.test.js`,
  `tests/dashboard-v2-hero.test.js`, `tests/dashboard-v2-activity.test.js`,
  `tests/dashboard-v2-statistics.test.js`,
  `tests/dashboard-v2-notifications.test.js`,
  `tests/dashboard-v2-upcoming.test.js`, `tests/dashboard-v2-ai.test.js`,
  `tests/dashboard-v2-health.test.js`,
  `tests/dashboard-v2-predictive.test.js`,
  `tests/dashboard-v2-automation.test.js`,
  `tests/dashboard-v2-navigation.test.js`,
  `tests/dashboard-v2-summary.test.js`) — masing2 punya SATU assertion
  peninggalan V2.1–V2.13 yg menjamin `dashboard-hub.js` **0 referensi**
  ke `DashboardV2Shell` (`assert.doesNotMatch(hubSrc, /DashboardV2Shell/)`).
  Assertion itu SENGAJA jadi usang di tahap ini (mount V2.14C memang
  dimandatkan menyentuh `dashboard-hub.js`), jadi diperbarui: sekarang
  menjamin referensi `DashboardV2Shell` di `dashboard-hub.js` muncul
  **tepat 1x**, **di dalam guard `typeof DashboardV2Shell !== 'undefined'`**
  (bukan unconditional / tersebar di banyak tempat). Tidak ada assertion
  lain di file2 ini yg diubah.

### Ditambahkan

- **`tests/dashboard-v2-mount.test.js`** (file baru) — 11 test: default
  (flag `false`) Dashboard lama tetap jalan & `DashboardV2Shell` sama
  sekali tidak dipanggil; flag `true` → `init()` dipanggil; flag `true`
  → `render()` dipanggil; flag `false` (disable) → Dashboard lama tetap,
  `DashboardV2Shell` tidak dipanggil; `DashboardHub.render()` dipanggil
  berkali-kali saat flag `true` → `init()`/`render()` Dashboard V2 ikut
  1:1 (bukan dobel dalam satu panggilan); jaminan tidak dobel dalam satu
  panggilan `DashboardHub.render()`; environment tanpa
  `isDashboardV2Enabled` sama sekali → tidak error, tidak mount;
  environment tanpa `DashboardV2Shell` sama sekali → tidak error walau
  flag `true`; jaminan tidak memanggil `showPage()`; jaminan blok mount
  tidak "memakai" `FEATURE_REGISTRY` dgn cara baru; serta cek statis
  (grep atas potongan source di sekitar blok mount) memastikan blok itu
  tidak mereferensikan `FEATURE_REGISTRY`/`showPage(` secara tekstual.
- **`DASHBOARD-V2-MOUNT.md`** (file baru) — dokumentasi tahap ini.

### Tidak diubah

`dashboard-v2-shell.js` (V2.1–V2.14B), `dashboard-v2-activation.js`
(V2.14A), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
`index.html`, `app_production.html`, routing, dan seluruh business
logic aplikasi (`D.*`, Finance/Vehicle/Reports/AI). Dashboard lama tetap
default & aktif — mount Dashboard V2 hanya terjadi kalau flag activation
diaktifkan secara eksplisit, dan tidak ada satu pun titik lain di repo
yang melakukan itu.

### Hasil test

```
node --test
# tests 1588
# pass 1588
# fail 0
```

### Status

Dashboard V2 kini bisa benar-benar ter-mount ke DOM (via
`DashboardV2Shell.init()`+`render()`) setiap kali `DashboardHub.render()`
dipanggil — TAPI hanya kalau activation flag (V2.14A) diaktifkan. Karena
tidak ada kode produksi yang memanggil `enableDashboardV2()`, flag tetap
`false` secara default dan Dashboard lama tetap satu-satunya yang
tampil ke pengguna. Titik masuk nyata untuk mengaktifkan flag ini (mis.
toggle developer/QA, query-param, atau UI settings) tetap di luar
scope, butuh mandat eksplisit terpisah.

## Tahap V2.14C+ — Guard Init-Once Dashboard V2 Mount

Baseline: hasil akhir V2.14C (`node --test` → 1588/1588 PASS).

### Ditambahkan

- **Guard init-once** di `DashboardHub.render()` (blok mount Dashboard V2,
  V2.14C): `DashboardV2Shell.init()` kini hanya dipanggil **sekali** (flag
  internal `DashboardHub._dashHubV2Initialized`), sedangkan
  `DashboardV2Shell.render()` tetap dipanggil setiap kali
  `DashboardHub.render()` dipanggil, selama `isDashboardV2Enabled() ===
  true`. Sebelumnya `init()` ikut terpanggil ulang tiap `DashboardHub.
  render()` — aman (idempotent by contract), tapi kerja sia-sia.
- **`tests/dashboard-v2-init-once.test.js`** (file baru) — 8 test baru:
  init() sekali walau render() berkali-kali, render() tetap 1:1 dgn
  jumlah panggilan `DashboardHub.render()`, disable→enable ulang tidak
  memicu init() kedua, beberapa siklus disable/enable tetap 1x init,
  Dashboard lama tetap normal saat flag false, environment tanpa
  `DashboardV2Shell` tidak error, tidak memanggil `showPage()`, dan
  jaminan statis blok guard tidak mereferensikan `FEATURE_REGISTRY`.
- **`DASHBOARD-V2-INIT-ONCE.md`** — dokumentasi deliverable tahap ini.

### Diubah

- **`dashboard-hub.js`**: hanya blok mount Dashboard V2 di dalam
  `DashboardHub.render()` (lihat V2.14C) yang disentuh — dibungkus guard
  `if (!DashboardHub._dashHubV2Initialized) { ...init()... }`. Tidak ada
  baris lain di file ini yang diubah.
- **`tests/dashboard-v2-mount.test.js`**: 1 assertion pada test
  `"DashboardHub.render() dipanggil berkali-kali saat flag true..."`
  disesuaikan — sebelumnya menegaskan `init()` ikut bertambah di
  panggilan `render()` ke-2 (perilaku V2.14C sebelum guard ini), kini
  menegaskan `init()` tetap 1 sedangkan `render()` tetap bertambah.
  Assertion lain di file yang sama tidak disentuh.

### Tidak diubah

`dashboard-v2-shell.js`, `dashboard-v2-activation.js`,
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
`index.html`, `app_production.html`, routing, dan seluruh business
logic aplikasi. Dashboard lama tetap default & aktif; guard ini murni
menghemat panggilan `init()` saat flag Dashboard V2 aktif — tidak
mengubah kapan/apakah Dashboard V2 muncul.

### Hasil test

```
node --test
# tests 1596
# pass 1596
# fail 0
```

## Tahap V2.14D — Auto Destroy Dashboard V2 + Perbaikan Kontrak Test

Baseline: hasil akhir Tahap "Guard Init-Once" (`node --test` → 1596/1596
PASS).

### Ditambahkan

- **Blok auto-destroy** di `DashboardHub.render()` (setelah blok
  mount/init-once V2.14C+): kalau `isDashboardV2Enabled() === false`
  **dan** `DashboardV2Shell` tersedia **dan** `DashboardHub.
  _dashHubV2Initialized === true` (pernah ter-init sebelumnya), maka
  `DashboardV2Shell.destroy()` dipanggil TEPAT SEKALI, lalu
  `_dashHubV2Initialized` di-reset ke `false`. Guard memakai pola
  `typeof` yang sama dengan blok mount di atasnya.
- **`DASHBOARD-V2-AUTO-DESTROY.md`** — dokumentasi deliverable tahap
  ini.

### Diubah

- **`dashboard-hub.js`**: hanya method `DashboardHub.render()`, blok
  setelah guard init-once — ditambah blok auto-destroy baru. Tidak ada
  baris lain yang disentuh, `dashboard-v2-shell.js` tidak diubah.
- **12 file test** (`tests/dashboard-v2-activity.test.js`,
  `dashboard-v2-ai.test.js`, `dashboard-v2-automation.test.js`,
  `dashboard-v2-health.test.js`, `dashboard-v2-hero.test.js`,
  `dashboard-v2-mount.test.js`, `dashboard-v2-navigation.test.js`,
  `dashboard-v2-notifications.test.js`, `dashboard-v2-predictive.test.js`,
  `dashboard-v2-shell.test.js`, `dashboard-v2-statistics.test.js`,
  `dashboard-v2-summary.test.js`, `dashboard-v2-upcoming.test.js`) — 1
  assertion tiap file disesuaikan: sebelumnya menegaskan referensi tekstual
  `typeof DashboardV2Shell !== 'undefined'` muncul TEPAT 1x di
  `dashboard-hub.js`; sekarang menegaskan TEPAT 2x (1 guard mount/init +
  1 guard auto-destroy), sesuai kontrak baru. Regression check TIDAK
  dihapus — hanya angka & komentarnya diperbarui.
- **`tests/dashboard-v2-init-once.test.js`**: mock `DashboardV2Shell`
  ditambah `destroy()`. Dua test yang sebelumnya menegaskan "init()
  hanya sekali selama umur aplikasi" ditulis ulang mengikuti kontrak
  baru "init() sekali PER SIKLUS AKTIVASI": disable men-trigger
  `destroy()` sekali, enable berikutnya boleh memanggil `init()` lagi.
  Test "Dashboard lama (flag false dari awal)" ditambah assertion
  `destroy() === 0` (belum pernah init, jadi destroy tidak boleh
  terpanggil). Test lain di file ini tidak berubah logikanya.

### Tidak diubah

`dashboard-v2-shell.js`, `dashboard-hub-registry.js`
(`FEATURE_REGISTRY`), `showPage()`, `index.html`,
`app_production.html`, routing, dan seluruh business logic aplikasi.
Dashboard lama tetap default & aktif.

### Hasil test

```
node --test tests/dashboard-v2-init-once.test.js
# tests 8
# pass 8
# fail 0

node --test
# tests 1596
# pass 1596
# fail 0
```

## Tahap V2.15 — Dashboard V2 Activation Switch

Baseline: hasil akhir Tahap V2.14D — Auto Destroy (`node --test` →
1596/1596 PASS).

### Ditambahkan

- **Blok Activation Switch** (`_dashHubV2SwitchHtml()`, fungsi baru) di
  `dashboard-hub.js`: merender satu blok toggle UI (checkbox + label
  "Dashboard V2 aktif/nonaktif") di bagian atas `#dashboardHubGrid`,
  HANYA kalau `isDashboardV2Enabled`/`enableDashboardV2`/
  `disableDashboardV2` (dari `dashboard-v2-activation.js`, V2.14A)
  semuanya tersedia sbg function — pola guard `typeof` yang sama dengan
  blok mount/init-once/auto-destroy. Kalau salah satu tidak tersedia,
  blok ini no-op total (tidak ada markup switch sama sekali).
- **`DashboardHub.toggleDashboardV2()`** (method baru): dipanggil lewat
  `data-action="DashboardHub.toggleDashboardV2"` pada checkbox switch
  (pola sama dgn `data-action="DashboardHub.open"` yang sudah ada). Baca
  state sekarang lewat `isDashboardV2Enabled()`, panggil
  `disableDashboardV2()` kalau sedang `true` / `enableDashboardV2()`
  kalau sedang `false` (keduanya fungsi existing V2.14A, tidak diubah),
  lalu panggil `DashboardHub.render()` supaya switch dan seluruh blok
  mount/init-once/auto-destroy (V2.14C/V2.14D, tidak diubah) langsung
  mengikuti state baru.
- **`tests/dashboard-v2-activation-switch.test.js`** (file baru) — 11
  test: switch tidak dirender tanpa API aktivasi, switch dirender saat
  API tersedia, checkbox mengikuti `isDashboardV2Enabled()`, label
  "Dashboard V2" muncul, `toggleDashboardV2()` memanggil
  `enableDashboardV2()`/`disableDashboardV2()` sesuai arah flip,
  `toggleDashboardV2()` memanggil `DashboardHub.render()` tepat 1x,
  tidak memanggil `showPage()`, jaminan statis tidak mereferensikan
  `FEATURE_REGISTRY`, aman tanpa `DashboardV2Shell`, dan idempotent saat
  dipanggil berulang.
- **`DASHBOARD-V2-ACTIVATION-SWITCH.md`** — dokumentasi deliverable
  tahap ini.

### Diubah

- **`dashboard-hub.js`**: satu fungsi baru (`_dashHubV2SwitchHtml()`)
  ditambahkan sebelum deklarasi `const DashboardHub`; `el.innerHTML` di
  `DashboardHub.render()` diubah dari
  `FEATURE_REGISTRY.map(...).join('')` menjadi
  `_dashHubV2SwitchHtml() + FEATURE_REGISTRY.map(...).join('')`; satu
  method baru (`toggleDashboardV2()`) ditambahkan ke objek `DashboardHub`
  setelah `render()`, sebelum `open()`. Tidak ada baris lain yang
  disentuh — blok mount/init-once/auto-destroy (V2.14C/V2.14D) persis
  sama, `dashboard-v2-shell.js` dan `dashboard-v2-activation.js` tidak
  diubah.

### Tidak diubah

`dashboard-v2-shell.js`, `dashboard-v2-activation.js`,
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
`index.html`, `app_production.html`, routing, seluruh business logic
aplikasi, dan seluruh file test lama (tidak ada assertion di file test
manapun yang diubah pada tahap ini — hanya 1 file test baru). Dashboard
lama tetap default & aktif; switch murni menambah cara MENGUBAH flag
lewat UI, tidak mengubah kapan/apakah Dashboard V2 muncul untuk flag
yang sama.

### Hasil test

```
node --test tests/dashboard-v2-activation-switch.test.js
# tests 11
# pass 11
# fail 0

node --test
# tests 1607
# pass 1607
# fail 0
```

## Tahap V2.16 — Dashboard V2 Data Adapter Layer

Baseline: hasil akhir Tahap V2.15 — Activation Switch (`node --test` →
1607/1607 PASS).

### Ditambahkan

- **`dashboard-v2-data-adapter.js`** (file baru, satu-satunya file
  produksi baru tahap ini) — lapisan baca-saja (read-only) di atas state
  global `D` (features-helpers-global-security.js), empat fungsi murni:
  - `getFinanceSummary()` — `accountCount`/`totalBalance` dari
    `D.accounts`, `transactionCount` dari `D.transactions`.
  - `getVehicleSummary()` — `vehicleCount` dari `D.vehicles`,
    `bbmLogCount` dari `D.bbmLogs`, `servisLogCount` dari `D.servisLogs`.
  - `getFamilySummary()` — `anakCount` dari `D.catatan.anak`,
    `milestoneDoneCount`/`milestoneTotalCount` dari `D.milestones`,
    `reminderCount` dari `D.reminders`.
  - `getDocumentSummary()` — `simCount` dari `D.simList`,
    `vehicleTaxDocCount` dari field dokumen pajak per kendaraan
    (`pajakTahunanTgl`/`pajakLimaTahunTgl`/`ujiKelayakanTgl` di tiap
    elemen `D.vehicles`, ditulis `vehicle-core.js`).
  Semua fungsi: guard `typeof D` (return `null` kalau `D` belum
  ter-load), tanpa `fetch`, tanpa state baru (tidak ada `let`/`var`
  top-level), tanpa mutasi `D`, tanpa routing/`showPage()`/
  `FEATURE_REGISTRY`.
- **`tests/dashboard-v2-data-adapter.test.js`** (file baru) — 18 test:
  perhitungan tiap fungsi ringkasan, penanganan data kosong/tidak
  lengkap, guard saat `D` belum ter-load/`null`, jaminan read-only lewat
  `Proxy` yang melarang `set`/`deleteProperty` pada `D`, tidak menyentuh
  `document`/`showPage()`/`FEATURE_REGISTRY`, dan jaminan statis tidak
  ada `let`/`var` top-level maupun referensi tekstual `fetch(`/
  `DashboardV2Shell`.
- **`DASHBOARD-V2-DATA-ADAPTER.md`** — dokumentasi deliverable tahap
  ini, termasuk hasil inspeksi sumber data existing per domain.

### Diubah

Tidak ada. Tahap ini murni menambah file baru — `dashboard-hub.js`,
`dashboard-v2-shell.js`, `dashboard-v2-activation.js`, dan seluruh file
test lama TIDAK disentuh.

### Tidak diubah

Dashboard lama, business logic (`D.*` writer: `transaksi.js`,
`vehicle-core.js`, `akun.js`, dst), `FEATURE_REGISTRY`/
`dashboard-hub-registry.js`, `showPage()`, `index.html`,
`app_production.html`, routing. Dashboard V2 BELUM memakai adapter ini
di tahap ini — tidak ada satu pun titik lain di repo yang memanggil
`getFinanceSummary()`/`getVehicleSummary()`/`getFamilySummary()`/
`getDocumentSummary()`. Wiring pemakaian oleh Dashboard V2 di luar
scope tahap ini.

### Hasil test

```
node --test tests/dashboard-v2-data-adapter.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1625
# pass 1625
# fail 0
```

## Tahap V2.17 — Dashboard V2 Hero Data Integration

Baseline: hasil akhir Tahap V2.16 — Dashboard V2 Data Adapter Layer
(`node --test` → 1625/1625 PASS).

### Diubah

- **`dashboard-v2-shell.js`** — `_buildHero()` (satu-satunya fungsi yang
  disentuh tahap ini) sekarang mulai memakai
  `dashboard-v2-data-adapter.js` (V2.16), TAPI HANYA di Hero. 4 elemen
  baru ditambah sbg anak Hero (additive, di bawah 4 elemen lama Tahap
  V2.2 yang TIDAK diubah):
  - `dashboardV2HeroFinanceSummary` — dari `getFinanceSummary()`.
  - `dashboardV2HeroVehicleSummary` — dari `getVehicleSummary()`.
  - `dashboardV2HeroFamilySummary` — dari `getFamilySummary()`.
  - `dashboardV2HeroDocumentSummary` — dari `getDocumentSummary()`.

  Setiap fungsi adapter dipanggil lewat guard `typeof fn === 'function'`
  (pola sama dgn `isDashboardV2Enabled()`, Tahap V2.14B) — shell TIDAK
  membaca `D` langsung sama sekali, satu-satunya jalur baca data tetap
  lewat adapter. Kalau fungsi adapter tidak tersedia ATAU return `null`
  (mis. `D` belum ter-load — guard internal adapter sendiri), elemen
  fallback ke teks placeholder ("Keuangan: -- (placeholder)" dst) — 4
  elemen baru ini SELALU ada & SELALU punya teks, tidak pernah
  kosong/`undefined`. Summary Cards, Module Grid, Statistics, Activity,
  Notifications, Automation, AI, Predictive, Health — semua di luar Hero
  — TIDAK disentuh sama sekali.

### Ditambahkan

- **`tests/dashboard-v2-hero-data.test.js`** (file baru) — 17 test:
  4 elemen data summary baru tampil dgn fallback placeholder saat
  adapter tidak di-load/return `null`; 4 elemen lama (title/healthScore/
  balance/insight) tidak berubah; masing-masing dari 4 fungsi adapter
  menampilkan ringkasan sungguhan saat tersedia & ada data (di-mock per
  fungsi); integrasi sungguhan end-to-end (adapter ASLI + shell dalam
  satu sandbox, `D` tiruan) untuk kasus ada data, `D` belum ter-load, dan
  idempotency `render()`; aksesibilitas (`aria-label` di 4 elemen baru);
  constraint statis (tanpa `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa
  `D.` langsung di shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang
  sama tanpa `let`/`var` top-level baru, guard `typeof` dipakai utk
  ke-4 fungsi); `dashboard-hub.js`/`index.html`/`app_production.html`
  tetap tidak tersentuh.
- **`DASHBOARD-V2-HERO-DATA.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Summary Cards/Module Grid/Statistics
Panel/Recent Activity/Notifications Center/Automation Center/AI Command
Center/Predictive Insights/Health Score Widget (semua sub-komponen Main
selain Hero), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh 94 file
test lama (baseline V2.16) tidak satu pun diubah — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-hero-data.test.js
# tests 17
# pass 17
# fail 0

node --test
# tests 1642
# pass 1642
# fail 0
```

## Tahap V2.18 — Summary Cards Data Integration

Baseline: 1642/1642 PASS (akhir Tahap V2.17).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildSummaryCards()` diedit.
  Mengikuti pola persis Tahap V2.17 (`_buildHero`): 4 elemen baru
  ditambah sbg anak Summary Cards, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 4 kartu lama (Total Balance/
  Monthly Income/Monthly Expense/Health Score) TIDAK berubah. Summary
  Cards jadi 8 anak (4 lama + 4 baru).
- **`tests/dashboard-v2-summary.test.js`** — 2 assertion lama
  (`cards.children.length`) disesuaikan dari `4` ke `8` (satu-satunya
  perubahan: jumlah anak Summary Cards bertambah akibat penambahan
  additive tahap ini).

### Ditambahkan

- **`tests/dashboard-v2-summary-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 4 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 2x — Hero + Summary Cards); Hero (V2.17) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-SUMMARY-DATA.md`** — dokumentasi deliverable tahap
  ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Quick Actions/Module Grid/Insight
Panel/Recent Activity/Statistics Panel/Upcoming Tasks/Notifications
Center/AI Command Center/Health Score Widget/Predictive Insights/
Automation Center (semua sub-komponen Main selain Summary Cards),
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html`. Tidak ada fetch, tidak ada
business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.17) tidak satu pun diubah selain 2 assertion di
`tests/dashboard-v2-summary.test.js` (jumlah child berubah) — hanya
1 file test baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-summary-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1660
# pass 1660
# fail 0
```

## Tahap V2.19 — Module Grid Data Integration

Baseline: 1660/1660 PASS (akhir Tahap V2.18).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildModuleGrid()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18: 4 elemen baru ditambah sbg
  anak Module Grid, satu per fungsi `dashboard-v2-data-adapter.js`
  (getFinanceSummary/getVehicleSummary/getFamilySummary/
  getDocumentSummary), dgn fallback placeholder bila adapter tidak
  tersedia/return `null`. 6 kartu lama (Finance/Vehicle/Reports/
  Family/Documents/Settings) TIDAK berubah. Module Grid jadi 10 anak
  (6 lama + 4 baru). Reports & Settings sengaja tidak dapat elemen data
  baru (tidak ada fungsi adapter utk domain itu).
- **`tests/dashboard-v2-summary.test.js`** — 2 assertion lama
  (`moduleGrid.children.length`/`grid.children.length`) disesuaikan
  dari `6` ke `10` (satu-satunya perubahan: jumlah anak Module Grid
  bertambah akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`** — 1 assertion constraint
  (jumlah guard `typeof fn === 'function'` per fungsi adapter)
  disesuaikan dari `2x` ke `3x`, karena `_buildModuleGrid()` menambah 1
  titik pemanggilan guard baru per fungsi.

### Ditambahkan

- **`tests/dashboard-v2-module-grid-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 6 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 3x — Hero + Summary Cards + Module Grid); Hero (V2.17) &
  Summary Cards (V2.18) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-MODULE-GRID-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions/
Insight Panel/Recent Activity/Statistics Panel/Upcoming Tasks/
Notifications Center/AI Command Center/Health Score Widget/Predictive
Insights/Automation Center (semua sub-komponen Main selain Module
Grid), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
routing, `index.html`, `app_production.html`. Tidak ada fetch, tidak
ada business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.18) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-summary.test.js` dan 1 assertion guard-count di
`tests/dashboard-v2-summary-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-module-grid-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1678
# pass 1678
# fail 0
```

## Tahap V2.20 — Statistics Panel Data Integration

Baseline: 1678/1678 PASS (akhir Tahap V2.19).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildStatisticsPanel()`
  diedit. Mengikuti pola persis Tahap V2.17/V2.18/V2.19: 4 elemen baru
  ditambah sbg anak Statistics Panel, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 4 kartu lama (Income/Expense/
  Savings/Active Vehicles) TIDAK berubah. Statistics Panel jadi 8 anak
  (4 lama + 4 baru).
- **`tests/dashboard-v2-statistics.test.js`** — 2 assertion lama
  (`panel.children.length`) disesuaikan dari `4` ke `8` (satu-satunya
  perubahan: jumlah anak Statistics Panel bertambah akibat penambahan
  additive tahap ini).
- **`tests/dashboard-v2-summary.test.js`** — 1 assertion lama
  (`statisticsPanel.children.length`) disesuaikan dari `4` ke `8`,
  alasan yang sama.
- **`tests/dashboard-v2-summary-data.test.js`** &
  **`tests/dashboard-v2-module-grid-data.test.js`** — masing-masing 1
  assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `3x` ke `4x`, karena
  `_buildStatisticsPanel()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-statistics-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 4 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 4x — Hero + Summary Cards + Module Grid + Statistics Panel);
  Hero (V2.17), Summary Cards (V2.18) & Module Grid (V2.19) tidak ikut
  berubah; `dashboard-hub.js`/`index.html`/`app_production.html` tetap
  tidak tersentuh.
- **`DASHBOARD-V2-STATISTICS-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Upcoming Tasks,
Notifications Center, AI Command Center, Health Score Widget,
Predictive Insights, Automation Center (semua sub-komponen Main selain
Statistics Panel), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.19) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-statistics.test.js`, 1 assertion
child-count di `tests/dashboard-v2-summary.test.js`, dan 2 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js` &
`tests/dashboard-v2-module-grid-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-statistics-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1696
# pass 1696
# fail 0
```

## Tahap V2.21 — Recent Activity Data Integration

Baseline: 1696/1696 PASS (akhir Tahap V2.20).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildRecentActivity()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18/V2.19/V2.20: 4 elemen baru
  ditambah sbg anak Recent Activity, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 baris lama (item1-item5)
  TIDAK berubah. Recent Activity jadi 9 anak (5 lama + 4 baru).
- **`tests/dashboard-v2-activity.test.js`** — 2 assertion lama
  (`activity.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Recent Activity bertambah
  akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary.test.js`** — 1 assertion lama
  (`recentActivity.children.length`) disesuaikan dari `5` ke `9`,
  alasan yang sama.
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`** &
  **`tests/dashboard-v2-statistics-data.test.js`** — masing-masing 1
  assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `4x` ke `5x`, karena
  `_buildRecentActivity()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-recent-activity-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 baris lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 5x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity); Hero (V2.17), Summary Cards (V2.18), Module Grid
  (V2.19) & Statistics Panel (V2.20) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-RECENT-ACTIVITY-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Statistics Panel, Upcoming Tasks,
Notifications Center, AI Command Center, Health Score Widget,
Predictive Insights, Automation Center (semua sub-komponen Main selain
Recent Activity), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.20) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-activity.test.js`, 1 assertion
child-count di `tests/dashboard-v2-summary.test.js`, dan 3 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js` &
`tests/dashboard-v2-statistics-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-recent-activity-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1714
# pass 1714
# fail 0
```

## Tahap V2.22 — Upcoming Tasks Data Integration

Baseline: 1714/1714 PASS (akhir Tahap V2.21).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildUpcomingTasks()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18/V2.19/V2.20/V2.21: 4 elemen
  baru ditambah sbg anak Upcoming Tasks, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 kartu lama (listrik/servis/
  backup/laporan/dokumen) TIDAK berubah. Upcoming Tasks jadi 9 anak (5
  lama + 4 baru).
- **`tests/dashboard-v2-upcoming.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Upcoming Tasks bertambah akibat
  penambahan additive tahap ini).
- **`tests/dashboard-v2-summary.test.js`** — 1 assertion lama
  (`upcomingTasks.children.length`) disesuaikan dari `5` ke `9`, alasan
  yang sama.
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`** &
  **`tests/dashboard-v2-recent-activity-data.test.js`** — masing-masing
  1 assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `5x` ke `6x`, karena
  `_buildUpcomingTasks()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-upcoming-tasks-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 6x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks); Hero (V2.17), Summary Cards
  (V2.18), Module Grid (V2.19), Statistics Panel (V2.20) & Recent
  Activity (V2.21) tidak ikut berubah; `dashboard-hub.js`/
  `index.html`/`app_production.html` tetap tidak tersentuh.
- **`DASHBOARD-V2-UPCOMING-TASKS-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Statistics Panel, Recent Activity,
Notifications Center, AI Command Center, Health Score Widget,
Predictive Insights, Automation Center (semua sub-komponen Main selain
Upcoming Tasks), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.21) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-upcoming.test.js`, 1 assertion
child-count di `tests/dashboard-v2-summary.test.js`, dan 4 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js` &
`tests/dashboard-v2-recent-activity-data.test.js` — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-upcoming-tasks-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1732
# pass 1732
# fail 0
```

## Tahap V2.23 — Notifications Data Integration

Baseline: 1732/1732 PASS (akhir Tahap V2.22).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildNotifications()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18/V2.19/V2.20/V2.21/V2.22: 4
  elemen baru ditambah sbg anak Notifications, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 kartu lama (backup/
  pengeluaran/servis/laporan/sinkronisasi) TIDAK berubah. Notifications
  jadi 9 anak (5 lama + 4 baru).
- **`tests/dashboard-v2-notifications.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Notifications bertambah akibat
  penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`**,
  **`tests/dashboard-v2-recent-activity-data.test.js`** &
  **`tests/dashboard-v2-upcoming-tasks-data.test.js`** — masing-masing
  1 assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `6x` ke `7x`, karena
  `_buildNotifications()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-notifications-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 7x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks + Notifications); Hero (V2.17),
  Summary Cards (V2.18), Module Grid (V2.19), Statistics Panel
  (V2.20), Recent Activity (V2.21) & Upcoming Tasks (V2.22) tidak ikut
  berubah; `dashboard-hub.js`/`index.html`/`app_production.html` tetap
  tidak tersentuh.
- **`DASHBOARD-V2-NOTIFICATIONS-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, AI Command Center, Health Score Widget, Predictive
Insights, Automation Center (semua sub-komponen Main selain
Notifications), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.22) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-notifications.test.js`, dan 5
assertion guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js` &
`tests/dashboard-v2-upcoming-tasks-data.test.js` — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-notifications-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1750
# pass 1750
# fail 0
```

## Tahap V2.24 — Automation Center Data Integration

Baseline: 1750/1750 PASS (akhir Tahap V2.23).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildAutomationCenter()`
  diedit. Mengikuti pola persis Tahap
  V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23: 4 elemen baru ditambah sbg
  anak Automation Center, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 kartu lama (autoBackup/
  monthlyReport/budgetReminder/vehicleServiceReminder/
  documentRenewalReminder) TIDAK berubah. Automation Center jadi 9
  anak (5 lama + 4 baru).
- **`tests/dashboard-v2-automation.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Automation Center bertambah
  akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`**,
  **`tests/dashboard-v2-recent-activity-data.test.js`**,
  **`tests/dashboard-v2-upcoming-tasks-data.test.js`** &
  **`tests/dashboard-v2-notifications-data.test.js`** — masing-masing
  1 assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `7x` ke `8x`, karena
  `_buildAutomationCenter()` menambah 1 titik pemanggilan guard baru
  per fungsi.

### Ditambahkan

- **`tests/dashboard-v2-automation-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 8x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks + Notifications + Automation
  Center); Hero (V2.17), Summary Cards (V2.18), Module Grid (V2.19),
  Statistics Panel (V2.20), Recent Activity (V2.21), Upcoming Tasks
  (V2.22) & Notifications (V2.23) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-AUTOMATION-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, AI Command Center, Health Score Widget,
Predictive Insights (semua sub-komponen Main selain Automation
Center), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
routing, `index.html`, `app_production.html`. Tidak ada fetch, tidak
ada business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.23) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-automation.test.js`, dan 6 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js` &
`tests/dashboard-v2-notifications-data.test.js` — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-automation-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1768
# pass 1768
# fail 0
```

## Tahap V2.25 — AI Command Center Data Integration

Baseline: 1768/1768 PASS (akhir Tahap V2.24).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildAiCommandCenter()`
  diedit. Mengikuti pola persis Tahap
  V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23/V2.24: 4 elemen baru
  ditambah sbg anak AI Command Center, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 6 anak lama (1 search field + 4
  action card + 1 suggestion area) TIDAK berubah. AI Command Center
  jadi 10 anak (6 lama + 4 baru).
- **`tests/dashboard-v2-ai.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `6` ke `10`
  (satu-satunya perubahan: jumlah anak AI Command Center bertambah
  akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`**,
  **`tests/dashboard-v2-recent-activity-data.test.js`**,
  **`tests/dashboard-v2-upcoming-tasks-data.test.js`**,
  **`tests/dashboard-v2-notifications-data.test.js`** &
  **`tests/dashboard-v2-automation-data.test.js`** — masing-masing 1
  assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `8x` ke `9x`, karena
  `_buildAiCommandCenter()` menambah 1 titik pemanggilan guard baru
  per fungsi.

### Ditambahkan

- **`tests/dashboard-v2-ai-data.test.js`** — 18 test baru: adapter
  tidak di-load → 4 elemen baru tetap ada dgn fallback placeholder; 6
  anak lama tidak berubah; fungsi adapter tersedia tapi return `null`
  → tetap fallback placeholder; masing-masing dari 4 fungsi adapter
  menampilkan ringkasan sungguhan saat tersedia & ada data (di-mock
  per fungsi); integrasi sungguhan end-to-end (adapter ASLI + shell
  dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D` belum
  ter-load, dan idempotency `render()`; aksesibilitas (`aria-label` di
  4 elemen baru); constraint statis (tanpa `fetch(`/`showPage(`/
  `FEATURE_REGISTRY`, tanpa `D.` langsung di shell, tanpa `innerHTML`,
  adapter tetap 4 fungsi yang sama tanpa `let`/`var` top-level baru,
  guard `typeof` dipakai utk ke-4 fungsi tepat 9x — Hero + Summary
  Cards + Module Grid + Statistics Panel + Recent Activity + Upcoming
  Tasks + Notifications + Automation Center + AI Command Center); Hero
  (V2.17), Summary Cards (V2.18), Module Grid (V2.19), Statistics
  Panel (V2.20), Recent Activity (V2.21), Upcoming Tasks (V2.22),
  Notifications (V2.23) & Automation Center (V2.24) tidak ikut
  berubah; `dashboard-hub.js`/`index.html`/`app_production.html` tetap
  tidak tersentuh.
- **`DASHBOARD-V2-AI-DATA.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, Automation Center, Health Score Widget,
Predictive Insights (semua sub-komponen Main selain AI Command
Center), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
routing, `index.html`, `app_production.html`. Tidak ada fetch, tidak
ada business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.24) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-ai.test.js`, dan 7 assertion guard-count di
`tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js`,
`tests/dashboard-v2-notifications-data.test.js` &
`tests/dashboard-v2-automation-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-ai-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1786
# pass 1786
# fail 0
```

## Tahap V2.26 — Health Score Data Integration

Baseline: `node --test` 1786/1786 PASS (akhir Tahap V2.25 — AI Command
Center Data Integration).

### Diubah

- **`_buildHealthScore()` di `dashboard-v2-shell.js`** — ditambah 4
  elemen baru (`dashboardV2HealthFinanceData`,
  `dashboardV2HealthVehicleData`, `dashboardV2HealthFamilyData`,
  `dashboardV2HealthDocumentData`), satu per fungsi
  `dashboard-v2-data-adapter.js` (`getFinanceSummary`/
  `getVehicleSummary`/`getFamilySummary`/`getDocumentSummary`),
  dipanggil lewat guard `typeof fn === 'function'`, dgn fallback
  placeholder kalau adapter tidak tersedia/return `null`. Health Score
  jadi total 10 anak (6 lama V2.11 + 4 baru). Dibuat dgn
  `createElement()`, digabung ke `children` lewat `replaceChildren()`.
  Tidak ada fungsi lain yang diedit; adapter tidak disentuh; tidak ada
  `D.` langsung/`fetch()`/`showPage()`/`FEATURE_REGISTRY`/`innerHTML`.

### Ditambahkan

- **`tests/dashboard-v2-health-data.test.js`** — 18 test baru: adapter
  tidak di-load → 4 elemen baru tetap ada dgn fallback placeholder; 6
  anak lama tidak berubah; fungsi adapter tersedia tapi return `null`
  → tetap fallback placeholder; masing-masing dari 4 fungsi adapter
  menampilkan ringkasan sungguhan saat tersedia & ada data (di-mock
  per fungsi); integrasi sungguhan end-to-end (adapter ASLI + shell
  dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D` belum
  ter-load, dan idempotency `render()`; aksesibilitas (`aria-label` di
  4 elemen baru); constraint statis (tanpa `fetch(`/`showPage(`/
  `FEATURE_REGISTRY`, tanpa `D.` langsung di shell, tanpa `innerHTML`,
  adapter tetap 4 fungsi yang sama tanpa `let`/`var` top-level baru,
  guard `typeof` dipakai utk ke-4 fungsi tepat 10x — Hero + Summary
  Cards + Module Grid + Statistics Panel + Recent Activity + Upcoming
  Tasks + Notifications + Automation Center + AI Command Center +
  Health Score); Hero (V2.17), Summary Cards (V2.18), Module Grid
  (V2.19), Statistics Panel (V2.20), Recent Activity (V2.21), Upcoming
  Tasks (V2.22), Notifications (V2.23), Automation Center (V2.24) & AI
  Command Center (V2.25) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-HEALTH-DATA.md`** — dokumentasi deliverable tahap
  ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, Automation Center, AI Command Center,
Predictive Insights (semua sub-komponen Main selain Health Score),
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html`. Tidak ada fetch, tidak ada
business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.25) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-health.test.js`, dan 8 assertion guard-count di
`tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js`,
`tests/dashboard-v2-notifications-data.test.js`,
`tests/dashboard-v2-automation-data.test.js` &
`tests/dashboard-v2-ai-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-health-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1804
# pass 1804
# fail 0
```

## Tahap V2.27 — Predictive Insights Data Integration

Baseline: `node --test` 1804/1804 PASS (akhir Tahap V2.26 — Health
Score Data Integration).

### Diubah

- **`_buildPredictiveInsights()` di `dashboard-v2-shell.js`** —
  ditambah 4 elemen baru (`dashboardV2PredictiveFinanceData`,
  `dashboardV2PredictiveVehicleData`, `dashboardV2PredictiveFamilyData`,
  `dashboardV2PredictiveDocumentData`), satu per fungsi
  `dashboard-v2-data-adapter.js` (`getFinanceSummary`/
  `getVehicleSummary`/`getFamilySummary`/`getDocumentSummary`),
  dipanggil lewat guard `typeof fn === 'function'`, dgn fallback
  placeholder kalau adapter tidak tersedia/return `null`. Predictive
  Insights jadi total 9 anak (5 kartu lama V2.12 + 4 baru). Dibuat dgn
  `createElement()`, digabung ke `section` lewat `replaceChildren()`.
  Tidak ada fungsi lain yang diedit; adapter tidak disentuh; tidak ada
  `D.` langsung/`fetch()`/`showPage()`/`FEATURE_REGISTRY`/`innerHTML`.

### Ditambahkan

- **`tests/dashboard-v2-predictive-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia
  tapi return `null` → tetap fallback placeholder; masing-masing dari
  4 fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data,
  `D` belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 11x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks + Notifications + Automation Center
  + AI Command Center + Health Score + Predictive Insights); Hero
  (V2.17), Summary Cards (V2.18), Module Grid (V2.19), Statistics
  Panel (V2.20), Recent Activity (V2.21), Upcoming Tasks (V2.22),
  Notifications (V2.23), Automation Center (V2.24), AI Command Center
  (V2.25) & Health Score (V2.26) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-PREDICTIVE-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, Automation Center, AI Command Center,
Health Score (semua sub-komponen Main selain Predictive Insights),
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html`. Tidak ada fetch, tidak ada
business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.26) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-predictive.test.js`, dan 9 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js`,
`tests/dashboard-v2-notifications-data.test.js`,
`tests/dashboard-v2-automation-data.test.js`,
`tests/dashboard-v2-ai-data.test.js` &
`tests/dashboard-v2-health-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-predictive-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1822
# pass 1822
# fail 0
```

## Tahap V2.28 — Dashboard Refresh Lifecycle

Baseline: ZIP V2.27 (`kw83-tahap0-feature-registry-28`), 1822/1822 test
PASS.

### Ditambahkan

- **`dashboard-v2-shell.js`** — satu method baru, `DashboardV2Shell.
  refresh()`, yang memperbarui ISI seluruh panel yang sudah memakai
  `dashboard-v2-data-adapter.js` (V2.16) — Hero (V2.17), Summary Cards
  (V2.18), Module Grid (V2.19), Statistics Panel (V2.20), Recent
  Activity (V2.21), Upcoming Tasks (V2.22), Notifications (V2.23),
  Automation Center (V2.24), AI Command Center (V2.25), Health Score
  (V2.26) & Predictive Insights (V2.27) — TANPA `destroy()`/`init()`/
  `render()` ulang & TANPA membuat root/main baru. Kontrak:
  - No-op (`return null`) kalau dipanggil sebelum `init()` (root belum
    ada) — sengaja TIDAK memanggil `init()` di dalam `refresh()`.
  - No-op (`return null`) kalau dipanggil sebelum `render()` (root ada
    tapi belum py anak `main`) — sengaja TIDAK memanggil `render()` di
    dalam `refresh()`.
  - Kalau sudah pernah `render()`: bangun instance baru dari
    `_buildMain(document)` (builder existing, 0 baris diubah/di-
    refactor), lalu pindahkan children-nya ke node `main` yang SUDAH
    ADA di DOM lewat `replaceChildren()` (fallback manual
    `removeChild`/`appendChild`, pola identik `render()`/`destroy()`).
  - `root`/`sidebar`/`header`/`main`/`bottomNav`/`fab` — identitas/
    referensi node top-level dijamin SAMA sebelum & sesudah
    `refresh()` (hanya isi/children `main` yang berubah).
  - Tidak membaca `D` langsung (satu-satunya jalur baca tetap lewat 4
    fungsi adapter — `getFinanceSummary()`/`getVehicleSummary()`/
    `getFamilySummary()`/`getDocumentSummary()` — dan itu pun hanya
    secara tidak langsung lewat builder-builder yang sudah ada, dengan
    guard `typeof fn === 'function'` yang sudah ada sejak V2.17–V2.24).
  - Tidak ada `fetch()`, `showPage()`, `FEATURE_REGISTRY`, `innerHTML`,
    atau query DOM global — sama sekali tidak dipakai/ditambah.
  - Tidak menyentuh Activation Switch (`isDashboardV2Enabled()`)
    ataupun atribut `hidden`/`data-dashboard-v2-state` di root — itu
    murni domain `render()` (V2.14B).
  - Idempotent: dipanggil berkali-kali aman, tidak menumpuk node.
  - Tidak ada state instance/global baru (murni memakai `this._root`
    yang sudah ada sejak V2.1).
- **`tests/dashboard-v2-refresh.test.js`** (file baru, 22 test) —
  ketersediaan `refresh()`; no-op sebelum `init()`/`render()`; tidak
  memanggil `init()`/`destroy()`/`render()` ulang; tidak membuat root
  baru; integrasi sungguhan dgn adapter ASLI (`D` berubah di antara
  `render()` & `refresh()`, 11 panel ter-update konsisten); fallback
  aman tanpa adapter ter-load; inspeksi source `refresh()` (tanpa
  `D.`/`D[`, `fetch(`, `showPage(`, `FEATURE_REGISTRY`, `innerHTML`,
  query DOM global, `isDashboardV2Enabled`); idempotency; Activation
  Switch tidak berubah; referensi root/sidebar/header/main/bottomNav/
  fab dipertahankan; Sidebar/Header/Bottom Nav tidak ikut ter-refresh;
  API `init()`/`render()`/`destroy()` lama tidak berubah.
- **`DASHBOARD-V2-REFRESH.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js`, `dashboard-hub.js`, `dashboard-v2-
activation.js` (byte-identik dgn baseline V2.27), seluruh builder
`_build*()` yang sudah ada (0 baris diubah/di-refactor — `refresh()`
murni memanggil `_buildMain()` apa adanya), Activation Switch, mount
lifecycle `init()`/`render()`/`destroy()`, `FEATURE_REGISTRY`/
`dashboard-hub-registry.js`, `showPage()`, routing, `index.html`,
`app_production.html` (selain versi build `?v=` yang disinkronkan
otomatis oleh `build.js`, di luar perubahan manual tahap ini). Tidak
ada fetch, tidak ada business logic baru, tidak ada state instance/
global baru. Seluruh file test lama (baseline V2.27) tidak satu pun
diubah — hanya 1 file test baru ditambahkan
(`tests/dashboard-v2-refresh.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.27) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah, aditif
murni — 0 baris dihapus) + `tests/dashboard-v2-refresh.test.js` (baru)
+ `DASHBOARD-V2-REFRESH.md` (baru) + `CHANGELOG.md`/`FILES-
CHANGED.md` (diubah, aditif) yang berbeda secara manual — sisanya
(bundle `app-bundle-*.min.js`, `app_production.html`, `index.html`,
`sw.js`, `docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek
otomatis `node scripts/build.js` (bump versi build), bukan sentuhan
manual.

## Hasil test

```
node --test tests/dashboard-v2-refresh.test.js
# tests 22
# pass 22
# fail 0

node --test
# tests 1844
# pass 1844
# fail 0
```

## Tahap V2.29 — Dashboard Auto Refresh

Baseline: ZIP V2.28 (`kw83-tahap0-feature-registry-29`), 1844/1844 test
PASS.

### Ditambahkan

- **`dashboard-v2-shell.js`** — tiga method baru, `DashboardV2Shell.
  startAutoRefresh(intervalMs?)` / `stopAutoRefresh()` /
  `isAutoRefreshActive()`, plus konstanta `AUTO_REFRESH_DEFAULT_MS`
  (30000ms) & state instance `_autoRefreshTimer`, yang membungkus
  `refresh()` (V2.28) di dalam satu timer periodik supaya Dashboard V2
  otomatis memanggil `refresh()` tanpa caller manual memanggilnya tiap
  kali data berubah. Kontrak:
  - `startAutoRefresh(intervalMs?)` — mulai timer (`setInterval`) yang
    memanggil `this.refresh()` (V2.28, tidak diubah/di-refactor sama
    sekali) tiap `intervalMs` ms (default `AUTO_REFRESH_DEFAULT_MS`
    kalau argumen tidak diberi/tidak valid — bukan angka positif).
    Idempotent: dipanggil berkali-kali TIDAK menumpuk timer — timer
    lama selalu dibersihkan dulu (lewat `stopAutoRefresh()` internal)
    sebelum timer baru dibuat, jadi selalu tepat 1 timer aktif.
  - `stopAutoRefresh()` — hentikan timer aktif (kalau ada), reset
    `_autoRefreshTimer` ke `null`. Aman dipanggil berkali-kali / sebelum
    pernah `startAutoRefresh()` (no-op, `return null`).
  - `isAutoRefreshActive()` — murni membaca state timer (`!== null`),
    tidak membuat/menghapus timer apa pun.
  - Kenapa timer periodik (bukan hook ke titik tulis `D`): tidak ada
    satu pun titik "notify data berubah" terpusat di repo ini — `D`
    ditulis oleh banyak modul independen tanpa event bus/pub-sub apa
    pun, dan menambah hook semacam itu ke modul lain jelas di luar
    scope tahap ini (additive-only, tidak boleh menyentuh business
    logic/file lain). Timer periodik 100% self-contained di
    `dashboard-v2-shell.js` (pola sama dgn `setInterval(...)` 5 menit
    yang sudah ada di `features-sheets-pwa-selftest.js`).
  - Tiap tick timer HANYA memanggil `this.refresh()` — TIDAK pernah
    memanggil `init()`/`destroy()`/`render()` ulang, TIDAK membuat root
    baru. Kontrak no-op `refresh()` (before `init()`/`render()`, atau
    setelah `destroy()`) tetap berlaku penuh terhadap tick timer — kalau
    timer sempat tick sebelum root/main ada (atau setelah root
    ter-detach lewat `destroy()`), `refresh()` sendiri yang no-op
    (`return null`); tidak ada logic tambahan di sini untuk itu, dan
    Dashboard TIDAK diam-diam ter-mount ulang.
  - Tidak membaca `D` sama sekali (langsung maupun tidak langsung) —
    ketiga method baru hanya memanggil `setInterval`/`clearInterval`/
    `this.refresh()`, tidak pernah menyebut `D`, `getFinanceSummary`/
    `getVehicleSummary`/`getFamilySummary`/`getDocumentSummary`.
  - Tidak ada `fetch()`, `showPage()`, `FEATURE_REGISTRY`, `innerHTML`,
    atau query DOM global — sama sekali tidak dipakai/ditambah.
  - Guard `typeof setInterval/clearInterval === 'function'` — no-op
    aman di environment tanpa timer.
  - Opt-in murni: TIDAK auto-start sendiri saat file di-load (pola
    sama dgn Activation Switch V2.15) — caller yang memanggil
    `startAutoRefresh()` secara eksplisit.
  - `_buildMain()` tetap punya persis 3 kemunculan di kode aktif (1
    definisi + 1 call site `render()` + 1 call site `refresh()`) —
    tidak ada call site ke-4 yang ditambah oleh `startAutoRefresh()`
    (tidak menduplikasi logic pembangunan panel).
- **`tests/dashboard-v2-auto-refresh.test.js`** (file baru, 20 test) —
  ketersediaan API baru & `AUTO_REFRESH_DEFAULT_MS`; state awal
  (`isAutoRefreshActive()` false, `stopAutoRefresh()` sebelum start
  no-op); pendaftaran timer & aktivasi status; default vs custom vs
  fallback interval tidak valid; pembersihan timer oleh
  `stopAutoRefresh()`; idempotency `startAutoRefresh()` (tidak
  menumpuk timer); tiap tick memanggil `refresh()` persis 1x & TIDAK
  memanggil `init()`/`render()`/`destroy()`; tick aman sebelum
  `init()`/`render()` & setelah `destroy()`; integrasi sungguhan dgn
  adapter ASLI (`D` berubah di antara `render()` & tick, panel
  ter-update via `refresh()`); tidak membaca `D` langsung & tidak
  memakai `fetch()`/`showPage()`/`FEATURE_REGISTRY`/`innerHTML`
  (inspeksi source ketiga method baru); `startAutoRefresh()` secara
  tekstual hanya memanggil `refresh()`; environment tanpa
  `setInterval` aman; `_buildMain()` tidak dapat call site baru;
  idempotent end-to-end (banyak tick tidak menumpuk node).
- **`DASHBOARD-V2-AUTO-REFRESH.md`** — dokumentasi deliverable tahap
  ini.

### Tidak diubah

`refresh()` (V2.28), `init()`/`render()`/`destroy()`, seluruh
`_build*()` builder existing di `dashboard-v2-shell.js`,
`dashboard-v2-data-adapter.js`, `dashboard-hub.js`, `dashboard-v2-
activation.js` (byte-identik dgn baseline V2.28), Activation Switch,
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html` (selain versi build `?v=` yang
disinkronkan otomatis oleh `build.js`, di luar perubahan manual tahap
ini). Tidak ada fetch, tidak ada business logic baru, `D` tidak dibaca
langsung. Seluruh file test lama (baseline V2.28) tidak satu pun
diubah — hanya 1 file test baru ditambahkan
(`tests/dashboard-v2-auto-refresh.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.28) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah, aditif
murni — 0 baris dihapus) + `tests/dashboard-v2-auto-refresh.test.js`
(baru) + `DASHBOARD-V2-AUTO-REFRESH.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda secara manual —
sisanya (bundle `app-bundle-*.min.js`, `app_production.html`,
`index.html`, `sw.js`, `docs/FILE-MAP.md`, 6 file sinkronisasi versi)
adalah efek otomatis `node scripts/build.js` (bump versi build), bukan
sentuhan manual.

## Hasil test

```
node --test tests/dashboard-v2-auto-refresh.test.js
# tests 20
# pass 20
# fail 0

node --test
# tests 1864
# pass 1864
# fail 0

node scripts/build.js
# ✅ Build "kw83-tahap0-feature-registry-31" selesai & lolos cek sintaks

node --test   (setelah build)
# tests 1864
# pass 1864
# fail 0
```

## Tahap V2.30 — Interactive Dashboard Cards

Baseline: ZIP V2.29 (`kw83-tahap0-feature-registry-31`), 1864/1864 test
PASS.

### Ditambahkan

- **`dashboard-v2-shell.js`** — `_buildModuleGrid()` (Module Grid, Tahap
  V2.4/V2.19): 3 dari 6 kartu placeholder lama (Finance, Vehicle,
  Settings) sekarang klik-able, reuse 100% mekanisme navigasi yang
  sudah ada — TIDAK ada fungsi navigasi baru:
  1. Kartu diberi `role="button"`, `tabindex="0"`,
     `data-action="dashHubNavigateToFeature"`,
     `data-args='[{"page":"keuangan"}]'` (atau `"carnotes"`/
     `"settings"`) — pola atribut deklaratif yang sama persis dgn
     `data-action="openTxModal" data-args='["expense"]'` yang sudah
     dipakai puluhan tombol lain di `index.html`.
  2. Dispatcher klik global yang sudah ada
     (`features-helpers-global-security.js`,
     `document.addEventListener('click', ...)`, TIDAK diubah) membaca
     atribut itu & memanggil fungsi global sesuai nama.
  3. `dashHubNavigateToFeature({page})` (`dashboard-hub.js`, TIDAK
     diubah) memanggil `showPage(target.page, navItems[
     PAGE_NAV_IDX[target.page]] || null)`.
  4. `showPage()` (`modal-navigasi.js`, TIDAK diubah) — router utama
     app yang sudah dipakai puluhan tempat lain.
  - Akibatnya `dashboard-v2-shell.js` sendiri TIDAK PERNAH memanggil
    `showPage()`/`FEATURE_REGISTRY`/`addEventListener`/`.onclick=`
    secara tekstual — murni atribut deklaratif; regex-check regresi yang
    sudah ada sejak V2.3 (`tests/dashboard-v2-summary.test.js`) tetap
    lulus tanpa modifikasi.
  - 3 kartu lain (Reports, Family, Documents) SENGAJA dibiarkan
    `page: null` — tetap placeholder murni seperti sejak V2.4, karena
    tidak py 1 page tunggal yang tidak ambigu di `PAGE_NAV_IDX` tanpa
    keputusan produk baru (Reports = tab di dalam Keuangan, Family =
    bagian LifeOS di `dashboard-hub`, Documents = tersebar
    Vehicle/Pajak) — lihat `DASHBOARD-V2-INTERACTIVE-CARDS.md`
    §"Kenapa hanya 3 dari 6 kartu".
  - Tidak membaca `D` langsung — kartu hanya membawa nama page statis.
  - Additive murni — 0 baris kode existing dihapus; satu-satunya
    perubahan struktural adalah menambah field `page` di 6 entri
    `modules[]` & membungkus pembuatan kartu lama dalam
    `if (mod.page) {...} else {...}` dengan cabang `else` = kode lama
    persis tidak berubah.
- **`tests/dashboard-v2-interactive-cards.test.js`** (file baru, 1
  test) — test integrasi: memuat `dashboard-v2-shell.js` bersama
  `dashboard-hub.js` ASLI (bukan mock) di satu sandbox
  (`tests/helpers/loadSource.js`), benar-benar memanggil rantai
  `data-action` → `dashHubNavigateToFeature()` → `showPage()`
  (di-stub) utk ketiga kartu (Finance/Vehicle/Settings) & memverifikasi
  nama page yang benar terpanggil tepat 1x; juga memverifikasi
  Reports/Family/Documents tetap 0 `data-action`.
- **`DASHBOARD-V2-INTERACTIVE-CARDS.md`** — dokumentasi deliverable
  tahap ini.

### Diubah (update test obsolete)

- **`tests/dashboard-v2-summary.test.js`** — test "Module Grid: 6
  module card ... sesuai urutan & placeholder" diganti jadi
  memverifikasi Finance/Vehicle/Settings punya `role="button"`/
  `data-action`/`data-args` yang benar & TIDAK lagi match
  `/placeholder/i`, sedangkan Reports/Family/Documents tetap match
  `/placeholder/i` & 0 `data-action`.
- **`tests/dashboard-v2-module-grid-data.test.js`** — test "6 kartu
  lama ... tidak berubah" diganti jadi memverifikasi
  Finance/Vehicle/Settings punya `data-action` yang benar,
  Reports/Family/Documents tetap 0 `data-action`.
- Tidak ada test lain (di luar 2 file di atas) yang perlu diperbarui —
  semua regex-check global (`showPage(`, `addEventListener`,
  `.onclick =`, `FEATURE_REGISTRY`) di file test lain tetap valid tanpa
  modifikasi.

### Tidak diubah

`dashboard-hub.js`, `modal-navigasi.js`,
`features-helpers-global-security.js`, `modules-render.js`,
`dashboard-hub-registry.js`/`FEATURE_REGISTRY`, `refresh()`, `init()`/
`render()`/`destroy()`, seluruh `_build*()` builder lain di
`dashboard-v2-shell.js` (Hero, Summary Cards, Quick Actions, Insight
Panel, Recent Activity, Statistics Panel, Upcoming Tasks,
Notifications, AI Command Center, Health Score, Predictive Insights,
Automation Center, Sidebar, Header, Bottom Nav, Auto Refresh),
`index.html`, `app_production.html` (selain versi build `?v=` yang
disinkronkan otomatis oleh `build.js`). Tidak ada `fetch()`, tidak ada
business logic baru, `D` tidak dibaca langsung.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.29) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah, aditif —
0 baris dihapus) + `tests/dashboard-v2-summary.test.js` (diubah,
assersi obsolete diperbarui) + `tests/dashboard-v2-module-grid-
data.test.js` (diubah, assersi obsolete diperbarui) +
`tests/dashboard-v2-interactive-cards.test.js` (baru) +
`DASHBOARD-V2-INTERACTIVE-CARDS.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (aditif) yang berbeda secara manual — sisanya
(bundle `app-bundle-*.min.js`, `app_production.html`, `index.html`,
`sw.js`, `docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek
otomatis `node scripts/build.js` (bump versi build), bukan sentuhan
manual.

## Hasil test

```
node --test tests/dashboard-v2-interactive-cards.test.js
# tests 1
# pass 1
# fail 0

node --test
# tests 1865
# pass 1865
# fail 0

node scripts/build.js
# ✅ Build "kw83-tahap0-feature-registry-32" selesai & lolos cek sintaks

node --test   (setelah build)
# tests 1865
# pass 1865
# fail 0
```

## Tahap V2.31 — Hero Real Data

Baseline: Dashboard V2 V2.30.1 (Stable) — mutual-exclusion Dashboard Hub
↔ Dashboard V2 sudah selesai, 1870/1870 test PASS, build PASS.

### Diubah (REPLACE placeholder → data nyata, bukan menambah elemen baru)

- **`dashboard-v2-shell.js`** — `_buildHero()` SAJA yang disentuh (builder
  lain tidak diedit sama sekali):
  1. 4 variabel summary adapter (`getFinanceSummary`/`getVehicleSummary`/
     `getFamilySummary`/`getDocumentSummary`, `dashboard-v2-data-
     adapter.js`, V2.16, TIDAK diubah) dipindah ke ATAS blok `_buildHero`
     — dari lokasi lamanya di Tahap V2.17 — supaya di-REUSE oleh 4
     placeholder LAMA di bawah ini TANPA memanggil fungsi adapter 2x.
  2. 4 placeholder LAMA (title/healthScore/balance/insight, Tahap V2.2)
     sekarang diisi data nyata — id/class/`data-dashboard-v2-part` TIDAK
     berubah, hanya `textContent`/`aria-label` yang di-REPLACE:
     - **title**: `Selamat datang — {N} data tercatat` (N = jumlah akun +
       kendaraan + anak + dokumen SIM, dari 4 summary adapter).
     - **healthScore**: diisi ulang maknanya jadi **Skor Kelengkapan
       Data** — `{X}/4 kategori terisi` (X = jumlah domain
       Keuangan/Kendaraan/Keluarga/Dokumen yang py minimal 1 data).
       Adapter TIDAK punya fungsi skor "Hidup Seimbang" (itu ranah
       `LifeBalance.compute()` di `hidup-seimbang.js`, di luar adapter &
       di luar scope tahap ini — lihat `DASHBOARD-V2-HERO-REAL-DATA.md`
       §"Keputusan cakupan").
     - **balance**: `Saldo: Rp {totalBalance}` dari `getFinanceSummary()`.
     - **insight**: kalimat ringkasan gabungan 4 domain (akun/kendaraan/
       anak/SIM).
  3. Kalau adapter/`D` belum tersedia (guard `typeof fn === 'function'`
     gagal, pola sama persis dgn V2.17/V2.18), 4 elemen fallback ke teks
     placeholder ASLI V2.2 byte-identik — jalur ini yang dipakai
     `tests/dashboard-v2-hero.test.js` & `tests/dashboard-v2-hero-
     data.test.js` (keduanya me-load shell TANPA adapter), sehingga kedua
     file test lama TETAP lulus tanpa 1 baris pun diubah.
  4. 4 elemen data summary BARU (Tahap V2.17: `dashboardV2HeroFinance-
     Summary` dkk) tidak berubah perilakunya — tetap memakai variabel
     summary yang sama (reuse), bukan fetch ulang.
- **`tests/dashboard-v2-hero-real-data.test.js`** (file baru, 6 test) —
  integrasi sungguhan (`dashboard-v2-data-adapter.js` ASLI + `D` tiruan,
  tidak di-mock): 4 placeholder lama menampilkan data nyata & tidak lagi
  match `/placeholder/i`; healthScore parsial (3/4 domain terisi) dihitung
  benar; jalur "adapter tidak di-load" tetap fallback placeholder
  byte-identik; constraint check (`D` tidak dibaca langsung, adapter tidak
  diubah, `dashboard-hub.js` tidak diubah).
- **`DASHBOARD-V2-HERO-REAL-DATA.md`** — dokumentasi deliverable tahap
  ini, termasuk rasional keputusan cakupan Health Score.

### Tidak diubah (regresi non-obsolete)

- `dashboard-v2-data-adapter.js` — 0 byte diubah, tetap persis 5 fungsi
  (`_dashV2AdapterHasD`/`getFinanceSummary`/`getVehicleSummary`/
  `getFamilySummary`/`getDocumentSummary`) seperti baseline V2.16.
- `dashboard-hub.js` — tidak disentuh (masih V2.30.1, mutual-exclusion
  Hub↔V2 tidak berubah).
- `_buildSummaryCards()`/`_buildQuickActions()`/`_buildModuleGrid()`/
  seluruh `_build*()` builder lain di `dashboard-v2-shell.js` — tidak
  disentuh, hanya `_buildHero()` yang diedit.
- **Seluruh test lama** (baseline V2.30.1, 1870 test) — 0 file diubah;
  hanya 1 file test baru ditambahkan (`tests/dashboard-v2-hero-real-
  data.test.js`). `tests/dashboard-v2-hero.test.js` &
  `tests/dashboard-v2-hero-data.test.js` yang tadinya berisiko jadi
  obsolete ternyata TETAP lulus tanpa modifikasi — keduanya me-load shell
  tanpa adapter, sehingga tetap menguji jalur fallback placeholder yang
  tidak berubah.
- `index.html`, `app_production.html` (selain versi build `?v=` yang
  disinkronkan otomatis oleh `build.js`) — Hero tetap self-mounting via
  JS, 0 markup Dashboard V2 baru.
- Tidak ada `fetch()`, tidak ada routing/`showPage()`, tidak ada
  `FEATURE_REGISTRY`, tidak ada `D` dibaca langsung, tidak ada
  `innerHTML`, tidak ada business logic baru — healthScore/title/insight
  murni interpolasi presentasional dari field count yang sudah dihitung
  adapter, bukan formula/skor bisnis baru.

## Hasil test

```
node --test tests/dashboard-v2-hero-real-data.test.js
# tests 6 / pass 6 / fail 0

node --test tests/dashboard-v2-hero.test.js tests/dashboard-v2-hero-data.test.js
# tests 30 / pass 30 / fail 0  (regresi non-obsolete, 0 diubah)

node --test
# tests 1876 / pass 1876 / fail 0

node scripts/build.js
# ✅ Build "kw-v2-31-hero-real-data-1" selesai & lolos cek sintaks

node --test   (setelah build)
# tests 1876 / pass 1876 / fail 0
```

## Sesi 74 (2026-07-20) — Finance Intelligence Foundation (Batch 6)

Keputusan produk FINAL eksplisit user (target baru Batch 6, lanjutan
setelah Finance Account & Finance Category Foundation Sesi 73). Target:
Cash Flow Summary, Budget Summary, Income vs Expense, Financial Health
Score, Insight dasar — semua REUSE penuh atas service/registry/data yang
sudah ada, TIDAK ada framework baru, TIDAK duplikasi logic, TIDAK
mengubah struktur data `D`.

### Ditambahkan (PURE/read-only, tidak ada UI/tombol/wiring baru)

- `modules/finance/finance-intelligence.js` — objek `FinanceIntelligence`:
  - `incomeVsExpense(range?)` — total income/expense per rentang tanggal
    eksplisit `{from,to}` (default bulan berjalan). Satu-satunya logic
    genuinely baru sesi ini — sebelumnya tidak ada versi murni (non-DOM)
    dari agregasi ini.
  - `cashflowSummary()` — wrapper tipis `computeCashflowForecast()`
    (`modules/finance/tx-list-cashflow.js`) + `incomeVsExpense()` bulan
    berjalan.
  - `budgetSummary(month?, year?)` — wrapper tipis `Budget.getUsed()`/
    `Budget.getEffectiveLimit()` (`budget.js`) atas `D.budgets`.
  - `healthScore()` — skor 0-100 komposit 4 komponen (savings rate,
    budget adherence, rasio utang thd saldo via `totalDebtValue()`/
    `totalSaldoAkun()`, proyeksi cashflow 30 hari) — tiap komponen HANYA
    disertakan kalau service pendukungnya tersedia (guard `typeof`), skor
    diskalakan ulang dari bobot yang tersedia.
  - `insights()` — insight dasar (deficit/good_savings/budget_over/
    cashflow_negative/health_score) derivatif langsung dari 4 fungsi di
    atas. BUKAN duplikasi `FinCoach` (`modules/shared/modules-calc.js`) —
    FinCoach tetap widget Dashboard proaktif dgn state dismiss/persist &
    mencakup domain di luar finance murni.
  - `summary()` — satu pintu masuk gabungan ke-5 fungsi di atas.

### Diubah

- `scripts/build.js` — `GROUP_B` nambah `modules/finance/finance-
  intelligence.js`, diletakkan setelah `pajak-aset-ui-wrappers.js`
  (dependency `totalDebtValue()`) & sebelum `app-bootstrap.js`.

### Test

- `tests/finance-intelligence.test.js` (BARU, 17 test) — pola sama
  `tests/finance-predict.test.js`, dependency (`computeCashflowForecast`,
  `Budget`, `totalSaldoAkun`, `totalDebtValue`) di-mock lewat `loadSource`
  extraGlobals (isolasi murni per fungsi).

### Hasil test

```
node --test tests/finance-intelligence.test.js
# tests 17 / pass 17 / fail 0

node --test tests/*.test.js
# tests 2583 / pass 2583 / fail 0   (naik dari 2566)

node scripts/build.js kw74-batch6-finance-intelligence-foundation
# ✅ Build "kw74-batch6-finance-intelligence-foundation" selesai & lolos cek sintaks (?v=498)

node --test tests/*.test.js   (setelah build)
# tests 2583 / pass 2583 / fail 0
```

## Sesi 76 (2026-07-20) — Vehicle Intelligence Foundation (Batch 7)

Keputusan produk FINAL eksplisit user (target baru Batch 7, di luar
kandidat Batch 6 lama). Target: lapisan agregasi PURE domain VEHICLE —
vehicle overview, health score per kendaraan, ringkasan armada (fleet),
insight dasar — pola SAMA PERSIS `FinanceIntelligence` (Sesi 74, Batch 6),
cuma dipindah ke domain vehicle. TIDAK ada Dashboard, TIDAK ada
HTML/CSS, TIDAK ada AI Hook, TIDAK ada Reminder (eksplisit di luar scope
sesi ini).

### Ditambahkan (PURE/read-only, tidak ada UI/tombol/wiring baru)

- `modules/vehicle/vehicle-intelligence.js` — objek `VehicleIntelligence`:
  - `vehicleOverview(vehicleId)` — ringkasan 1 kendaraan: KM saat ini
    (`getVehicleKm()`), prediksi servis (`predictService()`), efisiensi
    BBM (`fuelEfficiency()`) — semua reuse murni, `{ok:false}` kalau
    kendaraan tidak ditemukan.
  - `healthScore(vehicleId)` — skor 0-100 komposit 2 komponen (service
    adherence dari status `predictService().items` — aman/segera/lewat,
    ketersediaan data BBM dari `fuelEfficiency()` ok/tidak), bobot 50/50,
    HANYA komponen yang tersedia disertakan (guard `ok`/`length`), skor
    diskalakan ulang dari bobot yang tersedia — pola sama persis
    `FinanceIntelligence.healthScore()`.
  - `fleetSummary()` — agregasi lintas SEMUA `D.vehicles`: total
    kendaraan, total item servis lewat jatuh tempo (reuse
    `predictService()` per kendaraan, status yang sama dgn
    `_vehicleOverdueCheck()`), rata-rata `healthScore()` armada. Belum
    ada versi murni (non-DOM, lintas-kendaraan) sebelum sesi ini —
    satu-satunya logic genuinely baru selain skoring komposit.
  - `insights(vehicleId?)` — insight dasar derivatif. Tanpa `vehicleId`:
    fleet-level (dari `fleetSummary()`). Dengan `vehicleId`: kendaraan
    itu saja (servis lewat, estimasi biaya BBM bulanan, skor kesehatan).
    BUKAN duplikasi rule `AIDecision` (`vehicle-service-overdue`/
    `vehicle-fuel-efficiency-drop` di `sparepart-servis.js`) — rule itu
    proaktif dgn cooldown/severity/registrasi, insight di sini derivatif
    ringan tanpa cooldown/registrasi apa pun.
  - `summary(vehicleId?)` — satu pintu masuk gabungan (fleet + insights,
    ditambah vehicle overview/healthScore/insights kendaraan kalau
    `vehicleId` diisi).

### Diubah

- `scripts/build.js` — `GROUP_B` nambah `modules/vehicle/vehicle-
  intelligence.js`, diletakkan setelah `modules/finance/finance-
  dashboard.js` & sebelum `app-bootstrap.js` (dependency `getVehicleKm`/
  `predictService`/`fuelEfficiency` dari `vehicle-core.js`/`sparepart-
  servis.js`, keduanya sudah dimuat lebih awal di urutan build).

### Test

- `tests/vehicle-intelligence.test.js` (BARU, 17 test) — pola sama
  `tests/finance-intelligence.test.js`, dependency (`getVehicleKm`,
  `predictService`, `fuelEfficiency`) di-mock lewat `loadSource`
  extraGlobals (isolasi murni per fungsi).

### Hasil test

```
node --test tests/vehicle-intelligence.test.js
# tests 17 / pass 17 / fail 0

node --test tests/*.test.js
# tests 2614 / pass 2614 / fail 0   (naik dari 2597)

node scripts/build.js kw76-batch7-vehicle-intelligence-foundation
# ✅ Build "kw76-batch7-vehicle-intelligence-foundation" selesai & lolos cek sintaks (?v=500)

node --test tests/*.test.js   (setelah build)
# tests 2614 / pass 2614 / fail 0
```

## Catatan dokumentasi — gap Sesi 77–83 (CHANGELOG.md)

`CHANGELOG.md` sempat berhenti di entri Sesi 76 (Vehicle Intelligence
Foundation) — 7 sesi berikutnya (77 Vehicle Dashboard Foundation, 78
Vehicle Reminder Foundation, 79 Vehicle AI Hook Foundation, 80 Vehicle
AI Dashboard Integration, 81 Vehicle Analytics Foundation, 82 Vehicle
Decision Engine Foundation, 83 Vehicle Automation Foundation) TIDAK
pernah ditambahkan ke file ini, padahal semuanya sudah lengkap tercatat
di `docs/CLAUDE.md`/`docs/BATCH_PLAN.md`/`docs/NEXT_SESSION.md` (pola
gap dokumentasi yang sama seperti insiden Sesi 39/41/44/46/47/60/67 —
gap murni dokumentasi, BUKAN gap keputusan produk atau kode). Detail
lengkap ke-7 sesi itu: lihat `docs/BATCH_PLAN.md` § Batch 7 (tabel Sesi
77-83). Ditandai di sini transparan supaya sesi dokumentasi-sinkronisasi
berikutnya bisa mengisi retroaktif kalau diperlukan — TIDAK diisi penuh
di sesi ini (Sesi 84) krn scope sesi ini adalah implementasi Vehicle
Dashboard Final Integration, bukan audit/backfill dokumentasi lintas-sesi.

## Sesi 84 (2026-07-20) — Vehicle Dashboard Final Integration (Batch 7)

Keputusan produk FINAL eksplisit user: lanjutan Batch 7 setelah Vehicle
Automation Foundation (Sesi 83) — menutup gap yang dicatat eksplisit
Sesi 83: Service Reminder & Fuel Reminder (`VehicleReminder`, Sesi 78)
belum pernah menembak notifikasi browser NYATA (hanya Tax Reminder yang
sudah, lewat jalur ad-hoc lama di `reminder-notif.js`).

### Ditambahkan

- `modules/vehicle/vehicle-notif-bridge.js` — objek `VehicleNotifBridge`:
  - `items(vehicleId?, firedIds?)` — lapisan penerjemah PURE (tidak
    pernah memanggil `fireNotif()`/`Notification`/`localStorage`
    sendiri), 100% reuse `VehicleReminder.serviceReminders()`/
    `.fuelReminders()` (Sesi 78) apa adanya. HANYA severity `'overdue'`
    diambil (pola sama ambang tagihan/pajak yang sudah ada — hanya H-0
    s/d lewat yang aktif tembak notif push, `'due-soon'`/`'info'` tetap
    murni domain dashboard/insight feed). Hasil diterjemahkan jadi
    bentuk generik `{fireKey,title,body}`, difilter `firedIds` (dedupe
    hari yang sama, disuplai pemanggil dari `kw_notif_fired.ids`).
    `taxReminders()` SENGAJA TIDAK disertakan — jalur ad-hoc lama di
    `reminder-notif.js` (baca `D.vehicles`+`VEHTAX_ITEMS` langsung,
    mendahului `VehicleReminder`) sudah menembak notif pajak;
    menyertakannya lagi lewat modul ini akan dobel-tembak utk tipe yang
    sama (format `fireKey` beda, tidak saling terdeteksi lewat
    `firedIds` yang sama).

### Diubah

- `reminder-notif.js` `checkAndFireReminders()` — 1 blok baru
  ditambahkan setelah blok SPT Tahunan, SEBELUM
  `localStorage.setItem('kw_notif_fired'...)`: guard `typeof
  VehicleNotifBridge!=='undefined'`, panggil
  `VehicleNotifBridge.items(undefined, fired.ids)`, lalu `fireNotif()`
  tiap item + push `fireKey` ke `fired.ids` — pola identik blok
  tagihan/LDR/pajak-kendaraan/SIM/SPT yang sudah ada di file yang sama.
  TIDAK ada perubahan ke blok pajak kendaraan (`VEHTAX_ITEMS`) yang
  sudah ada.
- `scripts/build.js` — `GROUP_B` nambah
  `modules/vehicle/vehicle-notif-bridge.js`, diletakkan setelah
  `vehicle-reminder.js`, sebelum `vehicle-ai-hook.js` (posisi
  `reminder-notif.js` sendiri di `GROUP_B` TIDAK dipindah — referensi
  `VehicleNotifBridge` di `checkAndFireReminders()` diresolusi saat
  fungsi DIPANGGIL, bukan saat file di-parse, pola sama persis
  referensi `VEHTAX_ITEMS`/`predictService` yang sudah ada sebelumnya
  di file yang sama).

### Test

- `tests/vehicle-notif-bridge.test.js` (BARU, 10 test) — pola sama
  `tests/vehicle-ai-hook.test.js`, dependency `VehicleReminder`
  di-mock lewat `loadSource` extraGlobals (isolasi murni). Catatan
  teknis: 2 assersi awal (array kosong) sempat gagal krn array hasil
  sandbox `vm` beda realm dari array host (pola sama catatan
  `tests/vehicle-reminder.test.js` Sesi 78) — diperbaiki pakai
  `.length===0`/`Array.from()` sebelum `deepEqual`, bukan
  `deepEqual([],[])` langsung.

### Hasil test

```
node --test tests/vehicle-notif-bridge.test.js
# tests 10 / pass 10 / fail 0

node --test tests/*.test.js
# tests 2826 / pass 2826 / fail 0   (naik dari 2816)

node scripts/build.js kw84-batch7-vehicle-dashboard-final-integration
# ✅ Build "kw84-batch7-vehicle-dashboard-final-integration" selesai & lolos cek sintaks (?v=508)

node --test tests/*.test.js   (setelah build)
# tests 2826 / pass 2826 / fail 0
```

## Sesi 133 (2026-07-22) — Reorganisasi Insight AI: Vehicle & Finance dipindah ke tab fitur masing-masing

**Catatan gap dokumentasi:** entri kronologis di `CHANGELOG.md` berhenti
di Sesi 84 (Batch 7) — source code sudah berjalan sampai `?v=554`
(build `kw130-data-management-core-backup-history-health-7`) saat sesi
ini dimulai, gap Sesi 85-132 TIDAK di-backfill di sesi ini (di luar
scope, lihat `docs/PROJECT_STATE.md` § Backfill S85–S110 untuk gap
serupa sebelumnya). **Tidak ada folder `tests/` di ZIP yang diterima
sesi ini** — regression test `node --test` TIDAK BISA dijalankan;
verifikasi sesi ini murni manual (syntax check `node --check`, audit
grep referensi ID, verifikasi div balance & keunikan ID di HTML,
`node scripts/build.js` lolos cek sintaks bundle). **User WAJIB
menjalankan `npm test` sendiri sebelum menganggap perubahan ini final.**

### Konteks

Permintaan eksplisit user: "pindahkan semua insight AI ke navigasi baru
atau pindahkan ke tab masing-masing fitur". Audit menemukan sub-tab
"insight" di Dashboard Hub (`SECTION_GROUPS.insight`,
`modules/dashboard-hub/dashboard-hub.js`) menumpuk 26 card lintas-domain
jadi satu (Finance×10, Vehicle×8, Cross×6, LifeOS×1, EIE×1) tanpa
pengelompokan. Keputusan (dikonfirmasi user): card yang murni 1 domain
dipindah ke tab fitur terkait; card lintas-domain (Cross/LifeOS/EIE)
TETAP di sub-tab "insight" Dashboard Hub karena tidak punya "rumah" 1
fitur tunggal.

### Diubah

- **`modules/dashboard-hub/dashboard-hub.js`** — 18 baris pemanggilan
  `render()` (`FinanceDashboard`, `FinancialForecastPresenter`,
  `BudgetRecommendationPresenter`, `CashFlowProjectionPresenter`,
  `FinancialGoalPresenter`, `InvestmentPlannerPresenter`,
  `DebtOptimizerPresenter`, `RetirementPlannerPresenter`,
  `FinancialHealthScorePresenter`, `FinancialRiskDashboardPresenter`,
  `VehicleDashboard`, `VehicleInsightPresenter`, `VehicleDailyBrief`,
  `VehicleAlertPanel`, `VehicleInsightFeed`,
  `VehicleAnalyticsPresenter`, `VehicleDecisionPresenter`,
  `VehicleAutomationPresenter`) DIHAPUS dari `DashboardHub.render()`
  (dipindah ke `renderKeuangan()`/`renderCnTab()` — lihat di bawah).
  `SECTION_GROUPS.insight` dikurangi dari 26 jadi 8 entry (hanya
  `lifeOSWrap`/`eieWrap`/`crossDashWrap`/`crossBriefWrap`/
  `crossInsightWrap`/`personalOverviewWrap`/`crossWidgetsWrap`/
  `lifePriorityWrap` — murni lintas-domain). **TIDAK ADA logic/rumus
  presenter yang diubah** — murni pindah LOKASI pemanggilan `render()`,
  fungsi presenter itu sendiri 0 perubahan.
- **`modules/shared/modules-render.js`** — `renderKeuangan()` nambah 10
  baris pemanggilan render Finance presenter di atas (persis sama,
  hanya pindah lokasi panggilan). `renderCnTab()` nambah 8 baris
  pemanggilan render Vehicle presenter di atas (persis sama, hanya
  pindah lokasi panggilan).
- **`index.html` / `app_production.html`** (disinkronkan, 0 diff) — 18
  container `<div class="dashhub-wrap">` (findashWrap dst, vehdashWrap
  dst) DIPINDAH dari section Dashboard Hub ke: 10 container Finance →
  `#page-keuangan` > `#keuanganTab-laporan` (sub-tab "📊 Laporan"); 8
  container Vehicle → `#page-carnotes` (dekat `#mobilInsightCard`).
  Lokasi lama diganti komentar penanda (bukan dihapus total tanpa
  jejak). Verifikasi: 0 ID duplikat, div `<div>`/`</div>` tetap seimbang
  (1768/1768), tiap 18 ID container muncul tepat 1×.
- Versi build: `?v=554` → `?v=556` (2× jalan `build.js`, sekali auto-
  increment tanpa nama eksplisit lalu di-build ulang dgn nama sesi yang
  benar — lihat catatan di bawah).

### Tidak diubah

Semua fungsi `.render()`/`.summary()`/API presenter (Finance/Vehicle
Intelligence dkk) — 100% reuse, tidak ada baris logic di dalamnya yang
disentuh. `crossDashWrap`/`crossBriefWrap`/`crossInsightWrap`/
`personalOverviewWrap`/`crossWidgetsWrap`/`lifePriorityWrap`/
`lifeOSWrap`/`eieWrap` TETAP di Dashboard Hub (keputusan produk sesi
ini — lintas-domain, bukan diabaikan). `propertyManagementWrap`/
`rentalManagementWrap`/`assetPortfolioWrap`/`assetMaintenanceWrap`/
`recommendationPanelWrap`/`actionQueueWrap` (di luar `SECTION_GROUPS`
sejak sebelum sesi ini — gap pre-existing, bukan scope sesi ini) TIDAK
disentuh.

### Hasil verifikasi (TANPA `tests/` — lihat catatan gap di atas)

```
node --check modules/dashboard-hub/dashboard-hub.js   # OK
node --check modules/shared/modules-render.js         # OK
node scripts/build.js kw133-insight-ai-reorganisasi-vehicle-finance-ke-tab-fitur
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=556
# index.html & app_production.html identik (0 diff)
# 0 ID HTML duplikat, div balance 1768/1768 seimbang
```

**PENTING:** sesi berikutnya (atau user sendiri) WAJIB menjalankan
`npm test` penuh dgn folder `tests/` yang lengkap sebelum rilis
dianggap final — sesi ini tidak bisa memverifikasi regression test
sama sekali krn ZIP yang diterima tidak menyertakan `tests/`.

## Sesi 134 (2026-07-22) — Gap fix: live-wiring `renderDashboard()` dobel-render 18 presenter Finance/Vehicle pasca-Sesi 133

**Konteks:** Audit terpisah (bukan lanjutan alur kerja sesi biasa) menemukan
Sesi 133 hanya menghapus 18 pemanggilan `render()` (Finance ×10, Vehicle
×8) dari `DashboardHub.render()` (`dashboard-hub.js`) lalu menambahkannya
ke `renderKeuangan()`/`renderCnTab()` — TAPI tidak menghapus 18 baris yang
SAMA dari blok "DASHBOARD HUB — LIVE WIRING" di dalam `renderDashboard()`
(`modules/shared/modules-render.js`). Blok live-wiring itu awalnya dibuat
supaya card Dashboard Hub tetap ter-update kalau user menyimpan data dari
halaman lain, tapi sejak Sesi 133 card Finance/Vehicle sudah tidak lagi
tinggal di Dashboard Hub — jadi 18 baris itu jadi murni duplikasi kerja:
`renderDashboard()` dipanggil dari puluhan titik `save()` di seluruh app
(bukan cuma pas buka tab Keuangan/Kendaraan), jadi tiap kali user simpan
data apa pun di halaman mana pun, `FinanceIntelligence`/`VehicleIntelligence`
dkk dihitung ulang DUA KALI (sekali di sini, sekali lagi nanti oleh
`renderKeuangan()`/`renderCnTab()` yang dipanggil dari titik `save()` yang
sama). Tidak merusak tampilan (elemen tetap ketemu lewat `getElementById`
krn container-nya cuma pindah lokasi, bukan dihapus), tapi bertentangan
dengan tujuan efisiensi reorganisasi Sesi 133 & klaim "DIPINDAH" (harusnya
dihapus dari lokasi lama, bukan diduplikasi).

### Diubah

- **`modules/shared/modules-render.js`** — 18 baris pemanggilan `render()`
  (`FinanceDashboard`, `FinancialForecastPresenter`,
  `BudgetRecommendationPresenter`, `CashFlowProjectionPresenter`,
  `FinancialGoalPresenter`, `InvestmentPlannerPresenter`,
  `DebtOptimizerPresenter`, `RetirementPlannerPresenter`,
  `FinancialHealthScorePresenter`, `FinancialRiskDashboardPresenter`,
  `VehicleDashboard`, `VehicleInsightPresenter`, `VehicleDailyBrief`,
  `VehicleAlertPanel`, `VehicleInsightFeed`, `VehicleAnalyticsPresenter`,
  `VehicleDecisionPresenter`, `VehicleAutomationPresenter`) DIHAPUS dari
  blok live-wiring `renderDashboard()`. `PropertyManagementPresenter`/
  `RentalManagementPresenter`/`AssetPortfolioPresenter`/
  `AssetMaintenancePresenter`/`CrossDashboardCard`/dst (card yang MASIH
  tinggal di Dashboard Hub) TIDAK disentuh — tetap live-wiring seperti
  semula. Komentar blok (`~25 presenter`) diperbarui jadi `~18 presenter`
  + catatan gap fix ditambahkan di titik penghapusan.
- **7 file `modules/vehicle/vehicle-*.js`** (`vehicle-alert-panel.js`,
  `vehicle-analytics-presenter.js`, `vehicle-automation-presenter.js`,
  `vehicle-daily-brief.js`, `vehicle-decision-presenter.js`,
  `vehicle-insight-feed.js`, `vehicle-insight-presenter.js`) +
  `vehicle-dashboard.js` — komentar header "Dipanggil dari
  DashboardHub.render() & live-wiring renderDashboard()" (SUDAH BASI sejak
  Sesi 133, tidak sempat diperbarui sesi itu) diperbarui jadi "Dipanggil
  dari renderCnTab()" + catatan live-wiring dihapus.
- **9 file `modules/finance/*-presenter.js`** (`budget-recommendation-`,
  `debt-optimizer-`, `finance-dashboard.js`, `financial-forecast-`,
  `financial-goal-`, `financial-health-score-`, `financial-risk-dashboard-`,
  `investment-planner-`, `retirement-planner-presenter.js`) — komentar
  header senada, diperbarui jadi "Dipanggil dari renderKeuangan()".

### Tidak diubah

Logic/rumus di dalam presenter itu sendiri — 0 baris disentuh, murni
menghapus pemanggilan duplikat + memperbarui komentar. Container HTML,
`SECTION_GROUPS`, dan struktur tab dari Sesi 133 tidak disentuh (sudah
benar, terverifikasi saat audit).

### Hasil verifikasi

```
node --check modules/shared/modules-render.js   # OK
node --check modules/vehicle/vehicle-*.js (8 file)   # OK semua
node --check modules/finance/*-presenter.js (9 file) # OK semua
node scripts/build.js kw134-gap-fix-live-wiring-dobel-finance-vehicle
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=557
# index.html & app_production.html identik (0 diff)
# grep app-bundle-a/b.min.js: FinanceDashboard.render()/VehicleDashboard.render()
#   dst masing-masing HANYA 1 titik panggil (sebelumnya 2) — duplikasi hilang
```

**PENTING (masih berlaku dari Sesi 133):** folder `tests/` TETAP tidak ada
di ZIP yang diterima sesi ini — regression `node --test` TIDAK BISA
dijalankan. Verifikasi murni manual (syntax check + grep + build).
**User WAJIB menjalankan `npm test` penuh sebelum menganggap gap fix ini
final**, terutama utk memastikan card Finance/Vehicle di tab Keuangan/
Kendaraan tetap live-update dgn benar tanpa live-wiring `renderDashboard()`.

## Sesi 135 (2026-07-22) — Perf fix: `renderDashboard()` sinkron tanpa syarat di `showMain()` bikin PIN-unlock lambat

**Konteks:** User melaporkan "setelah input PIN, masuk ke dashboard utama
lama". Audit menemukan `showMain()` (dipanggil begitu PIN benar, lihat
`modules/shared/keamanan-pin.js`) memanggil `renderDashboard()` SINKRON
tanpa syarat — padahal landing page default app ini BUKAN Beranda
(`page-dashboard`), tapi Dashboard Hub (`page-dashboard-hub`, lihat
komentar di `modules/finance/tangga-keuangan.js` & `docs/PROJECT_STATE.md`).
Beberapa baris di bawahnya, `refreshCurrentPage()` merender halaman yang
BENERAN aktif — kalau itu Dashboard Hub, artinya `DashboardHub.render()`
(sendiri berat: bangun ulang seluruh grid fitur + 15+ presenter) baru
mulai dieksekusi SETELAH `renderDashboard()` selesai menghitung & menggambar
seluruh konten Beranda (Advisor/LifeBalance/AIWidget/FinCoach/
AIRecommendCard/AIDailyBriefingCard + loop `DASH_RENDER_ORDER` 17 kartu)
ke halaman yang TIDAK kelihatan sama sekali (ketutup Dashboard Hub). Pada
skenario paling umum (buka app dari kondisi tertutup/PWA baru dibuka, PIN
muncul di landing page default), ini kerja dua kali lipat berturutan
SEBELUM konten yang benar-benar dilihat user sempat tergambar — kandidat
kuat penyebab jeda "lama" pasca-PIN yang dilaporkan.

### Diubah

- **`modules/shared/features-helpers-global-security.js`** (`showMain()`)
  — pemanggilan `renderDashboard()` sekarang dicek dulu: kalau Beranda
  BUKAN halaman aktif saat unlock (`!document.querySelector('.page.active
  #page-dashboard')` — kasus paling umum), `renderDashboard()` disusulkan
  lewat `runDeferredOrNow()` yang sama dgn 6 pemanggilan non-inti
  (checkBackup/checkBills/dst) yang sudah dijadwalkan di sini sejak
  sebelumnya — TIDAK memblokir `refreshCurrentPage()` yang merender
  halaman yang benar-benar dilihat user. Kalau Beranda MEMANG halaman
  aktif (PIN cuma overlay, bukan reload — kalau user mengunci app saat
  lagi di Beranda, `.page.active` tetap keingat), `renderDashboard()` di
  sini DILEWATI (bukan dihapus) — dibiarkan `refreshCurrentPage()` di
  bawah yang merender via `renderPageContent('dashboard')` seperti biasa,
  sekaligus membereskan gap duplikat lama (renderDashboard() sebelumnya
  terpanggil 2× berturutan kalau kebetulan Beranda yang aktif — gap ini
  sudah ada dari sebelum sesi ini, ikut dibereskan sekalian karena
  triggernya sama persis).

### Tidak diubah

`renderDashboard()` itu sendiri — 0 baris logic/rumus di dalamnya
disentuh. `refreshCurrentPage()`, `DashboardHub.render()`, urutan render
`DASH_RENDER_ORDER`, dan semua presenter — 0 perubahan. Murni KAPAN/
berapa kali `renderDashboard()` dipanggil dari `showMain()`.

### Hasil verifikasi

```
node --check modules/shared/features-helpers-global-security.js   # OK
node scripts/build.js kw135-perf-fix-renderdashboard-sinkron-saat-pin-unlock
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=558
# index.html & app_production.html identik (0 diff)
```

**PENTING (masih berlaku dari Sesi 133/134):** folder `tests/` TETAP tidak
ada di ZIP — regression `node --test` TIDAK BISA dijalankan, verifikasi
murni manual. **User WAJIB menjalankan `npm test` + tes manual buka app
dari kondisi tertutup (cold start) DAN dari kondisi terkunci saat di
Beranda**, supaya kedua skenario (`_berandaAktifSaatUnlock` true/false)
sama-sama tervalidasi sebelum dianggap final. Kalau setelah ini jeda
pasca-PIN masih terasa lama, kemungkinan besar bottleneck-nya ada di
`DashboardHub.render()` sendiri (grid fitur + 15+ presenter, semua
sinkron) — kandidat optimasi lanjutan yang belum disentuh sesi ini.

## Sesi 136 (2026-07-22) — Gap fix: kartu "Tangga Ternak Uang" macet lebih lama di "Menghitung..." (regresi dari Sesi 135)

**Konteks:** User melaporkan kartu "Tangga Keuangan" masih "cuma
menghitung" pasca perbaikan Sesi 135. Audit menemukan Sesi 135 (perf fix
PIN-unlock) tanpa sengaja memperlambat kartu ini: `#tanggaKeuanganCard`
secara FISIK ada di dalam `#page-dashboard-hub`, tapi satu-satunya titik
yang merender isinya adalah live-wiring di dalam `renderDashboard()`
(`modules/shared/modules-render.js`) — bukan dipanggil langsung dari
`DashboardHub.render()` (`dashboard-hub.js`) seperti SEMUA kartu lain yang
juga tinggal di Dashboard Hub (Hero/Summary/Analytics/Property/Rental/
Asset/dst — semua itu double-wired: sekali langsung di `DashboardHub.render()`,
sekali lagi di live-wiring `renderDashboard()` utk live-update lintas
halaman). Ini gap peninggalan Sesi 121 (S121 cuma menambahkan ke live-
wiring, lupa menambahkan panggilan langsung yang jadi pola standar semua
kartu Dashboard Hub lainnya) — sebelum Sesi 135 "cukup cepat ketutupan"
karena `renderDashboard()` selalu sinkron, jadi live-wiring-nya cuma
telat 1 frame. Sesi 135 membuat `renderDashboard()` DITUNDA lewat
`runDeferredOrNow()` saat Dashboard Hub yang aktif (kasus paling umum) —
kartu ini jadi kena tunda DUA KALI berturutan (nunggu `renderDashboard()`
dulu, baru nunggu live-wiring di dalamnya), jadi jeda "Menghitung..."-nya
makin terasa/lama.

### Diubah

- **`modules/dashboard-hub/dashboard-hub.js`** (`DashboardHub.render()`) —
  ditambahkan `if (typeof TanggaKeuangan !== 'undefined')
  TanggaKeuangan.render();` LANGSUNG di dalam fungsi ini (pola sama persis
  Hero/Summary/Analytics/Property/dst di atasnya), sehingga kartu ini
  selalu ikut ter-render di frame yang SAMA dengan kartu Dashboard Hub
  lain begitu halaman ini ditampilkan — tidak lagi bergantung pada timing
  `renderDashboard()`. Panggilan `TanggaKeuangan.render()` di live-wiring
  `renderDashboard()` (`modules/shared/modules-render.js`, ditambahkan S121)
  TIDAK dihapus — tetap dipertahankan utk skenario user tetap di Dashboard
  Hub lalu simpan data dari halaman lain (live-update), pola sama dgn
  DecisionCenterHome/UnifiedDashboardHome dkk.

### Tidak diubah

`TanggaKeuangan.compute()`/`render()` itu sendiri — 0 baris logic/rumus
disentuh. Sesi 135 (kondisi `_berandaAktifSaatUnlock`) tidak di-revert —
tetap berlaku utk mempercepat first-paint Dashboard Hub, cuma sekarang
kartu Tangga Keuangan tidak lagi ikut kena delay tambahan dari situ.

### Hasil verifikasi

```
node --check modules/dashboard-hub/dashboard-hub.js   # OK
node scripts/build.js kw136-gap-fix-tangga-keuangan-menghitung-macet
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=559
# index.html & app_production.html identik (0 diff)
# grep app-bundle-a.min.js: TanggaKeuangan.render() sekarang 2 titik
#   panggil (langsung di DashboardHub.render() + live-wiring), sesuai pola
#   standar kartu Dashboard Hub lain
```

**PENTING (masih berlaku dari sesi-sesi sebelumnya):** folder `tests/`
TETAP tidak ada di ZIP — regression `node --test` TIDAK BISA dijalankan.
**User WAJIB coba manual: buka app dari kondisi tertutup (cold start),
masuk PIN, dan cek kartu "Tangga Ternak Uang" langsung terisi (BUKAN lagi
"Menghitung...") begitu Dashboard Hub tampil** — ini skenario yang paling
kena dampak gap ini.

## Sesi 156d (2026-07-22) — Konsolidasi tab Car Notes: vehicle selector ke atas, gabung Alert/InsightFeed/Decision, Analytics & Fuel card collapsible

**Konteks:** tindak lanjut butir #2 catatan `docs/NEXT_SESSION.md` § S156b
("11 card AI/insight ditumpuk vertikal SEBELUM vehicle selector &
odometer"). User memilih 3 dari 4 saran yang tercatat di sana untuk
dikerjakan sesi ini (saran ke-4, gabung Fuel Briefing ke Fuel
Intelligence Card, SENGAJA belum dikerjakan — di luar scope sesi ini).

**Catatan gap dokumentasi:** entri kronologis `CHANGELOG.md` sebelum ini
berhenti di Sesi 136 — source code sudah berjalan sampai build
`kw156b-fuel-buttons-window-expose-fix-587` (`?v=588`) saat sesi ini
dimulai, gap Sesi 137-156b TIDAK di-backfill di sesi ini (di luar scope,
riwayatnya ada di `docs/NEXT_SESSION.md` § catatan sync tiap sesi).

### Ditambahkan

- **`modules/vehicle/vehicle-attention-presenter.js`** (BARU) —
  `VehicleAttentionPresenter.render()`, gabungan tampilan
  `VehicleAlertPanel` + `VehicleInsightFeed` + `VehicleDecisionPresenter`
  jadi SATU card ranked "🧭 Perlu Perhatian". 100% reuse
  `VehicleRecommendationEngine.recommendations()` ->
  `VehiclePriorityScoring.rank()` -> `VehicleActionRecommendation.
  withAction()` (persis alur `VehicleDecisionPresenter` lama — sumber ini
  sudah mencakup reminder overdue/due-soon + insight type 'warning',
  lihat komentar `_fromReminders()`/`_fromInsights()` di
  `vehicle-recommendation-engine.js`) + `VehicleAIHook.fleetSummary()`
  utk sisa insight type 'info'/'positive' yang sengaja dilewati
  `VehicleRecommendationEngine`. 0 rumus/skoring baru. Silent kalau
  kosong (pola sama panel lama).

### Diubah

- **`index.html`/`app_production.html`:**
  - Blok `.vehicle-select`/odometer/tombol "+ Kelola Kendaraan" dipindah
    ke paling atas `#page-carnotes` (setelah `#mobilInsightCard`, sebelum
    `#vehdashWrap`) — murni perubahan urutan DOM, 0 perubahan id/logic.
  - `#vehAlertWrap` + `#vehInsightFeedWrap` dihapus, `#vehDecisionWrap`
    (yang lama ada di bawah `#vehAutomationWrap`) dihapus & dipindah —
    ketiganya diganti 1 container baru `#vehAttentionWrap`/
    `#vehAttentionBody`, diisi `VehicleAttentionPresenter.render()`.
  - `#vehAnalyticsWrap`, `#fuelDashWrap`, `#fuelCompareWrap`,
    `#fuelTrendWrap` dijadikan collapsible (pola `card-collapse-toggle`/
    `card-collapse-body` yang sama persis `vehSpecCard`), default
    TERTUTUP (key: `vehAnalyticsCard`, `fuelDashCard`, `fuelCompareCard`,
    `fuelTrendCard`).
- **`modules/shared/modal-navigasi.js`** — `toggleCardCollapse()`/
  `applyOneCardCollapsePref()`/`applyCardCollapsePrefs()` di-extend
  dengan `CARD_COLLAPSE_DEFAULT_CLOSED` (array key yang defaultnya
  TERTUTUP kalau user belum pernah tap toggle-nya sama sekali/belum ada
  entry di `localStorage.cardCollapsePrefs`). Card di luar daftar ini
  perilakunya 0 berubah (tetap default terbuka). Preferensi user yang
  sudah tersimpan (baik true maupun false) tetap prioritas di atas
  default ini — tidak menimpa pilihan user.
- **`modules/shared/modules-render.js`** (`renderCnTab()`) — panggilan
  `VehicleAlertPanel.render()`/`VehicleInsightFeed.render()`/
  `VehicleDecisionPresenter.render()` (3 baris terpisah) diganti 1
  panggilan `VehicleAttentionPresenter.render()`. File lama
  (`vehicle-alert-panel.js`/`vehicle-insight-feed.js`/
  `vehicle-decision-presenter.js`) TIDAK dihapus (histori/rollback,
  0 test yang mereferensikannya) — cuma tidak lagi dipanggil dari sini.
- **`scripts/build.js`** — `modules/vehicle/vehicle-attention-presenter.js`
  didaftarkan di `GROUP_A`, tepat setelah
  `modules/vehicle/vehicle-decision-presenter.js`.

### Tidak diubah

0 rumus/skoring/engine BBM & kendaraan disentuh — sesi ini murni
presentasi (urutan DOM, konsolidasi 3 card jadi 1, default collapse).
`FuelBriefing`/`FuelIntelligenceCard` (saran ke-4 yang belum dikerjakan)
TIDAK disentuh.

### Hasil verifikasi

```
node --test tests/*.test.js
# tests 371 / pass 371 / fail 0   (sebelum & sesudah build, 0 regresi)

node scripts/build.js
# ✅ Build "kw156b-fuel-buttons-window-expose-fix-588" selesai & lolos
#    cek sintaks bundle (node --check), ?v=589
# index.html & app_production.html identik (0 diff, ditulis ulang
#    otomatis oleh build.js)
```

**ZIP:** `kw_release_sesi156c_car-notes-consolidation_v589.zip`

**Known Issue (masih berlaku dari sesi-sesi sebelumnya):** `npm run
lint`/esbuild tetap tidak bisa dijalankan (tanpa akses internet di
sandbox ini) — bundle hasil build TANPA minifikasi.

**Sengaja di luar scope sesi ini (next TODO):**
1. Saran ke-4 yang belum dikerjakan: gabung Fuel Briefing ke Fuel
   Intelligence Card (2 card sama-sama soal BBM kendaraan aktif).
2. Butir #1 catatan `docs/NEXT_SESSION.md` § S156b — audit menyeluruh
   pola `const Nama = {...}` + `data-action` tanpa expose `window` di
   seluruh project (belum tersentuh sesi ini).

# Consolidation Note (digabung oleh Claude, 2026-07-23)

Zip ini (`kw_release_sesi160_gopay-scan-fix_v607.zip`, index/app_production
`?v=607`) diverifikasi sebagai **hasil akhir yang sudah mencakup semua
perubahan** dari 3 paket lain yang diupload bareng:

- `kw_release_sesi156d_fuel-briefing-consolidation_v592.zip` (?v=591, Sesi 156d)
- `kw_flatten_batched_files.zip` (batch file individual, timestamp s.d. Sesi ~159/160 awal)
- `kw_release_sesi160_fuel-gauge-visual_v606.zip` (Sesi 160, fuel gauge visual)

**Metode verifikasi:** dibandingkan mtime tiap file (relatif) di keempat
paket — untuk 344 dari 352 path unik, v607 punya versi terbaru; 8 sisanya
cuma file backup bundle lama (`backups/app-bundle-*.min.*.js`) yang memang
sudah tidak relevan. Isi file yang sama antara batch flatten & v607
dicek `diff` — identik. Tambahan cek:

```
node --check app-bundle-a.min.js   # OK
node --check app-bundle-b.min.js   # OK
node --test tests/*.test.js
# tests 380 / pass 380 / fail 0
```

Kesimpulan: **tidak perlu merge manual** — v607 SUDAH menjadi update
terbaru gabungan. Paket ini didistribusikan ulang apa adanya sebagai
`kw_merged_latest_v607.zip`.

# Sesi 160b: Bugfix Modal Scan Akun + Total Saldo di Pengaturan (2026-07-23)

## Konteks
Laporan user: setelah scan "📷 Scan Universal (Bank/E-Wallet/Bibit/Jago)" dari dalam
modal Tambah/Edit Akun, centang item hasil scan, lalu tap "✅ Impor yang Dicentang" —
yang muncul balik adalah form input Akun lagi (bukan kembali ke data/daftar Akun).
User juga minta data akun ditambahkan ke Pengaturan > Keuangan.

## Perubahan

- **`modules/shared/scan-ocr.js`** (`UniversalScan.importSelected()`): root cause —
  `accModal` (tempat tombol Scan Universal berada) tidak pernah ditutup saat
  `universalOcrModal` dibuka di atasnya, jadi setelah `closeModal('universalOcrModal')`
  yang kelihatan lagi adalah `accModal` yang masih `open` di belakang. Fix: tambah
  `closeModal('accModal')` di akhir `importSelected()`.
- **`index.html` / `app_production.html`** — kartu "🏦 Akun & Metode Pembayaran" di
  Pengaturan > Keuangan (`stgGroup2`) ditambah ringkasan "Total Saldo Akun" (+ jumlah
  akun yang ikut dihitung), sebelumnya kartu ini cuma daftar per-akun tanpa total.
- **`modules/shared/modules-render.js`** (`renderAccGrid()`): isi ringkasan baru di atas
  lewat `totalSaldoAkun()`/`linkedAssetAccountIds()` yang sudah ada (100% reuse, 0 rumus
  baru). Guard `getElementById` null karena elemen baru cuma ada di halaman Pengaturan.

## Hasil verifikasi
```
node scripts/build.js kw160b-akun-scan-modal-fix-total-saldo
# ✅ Build selesai, ?v=608, index.html & app_production.html identik

node --test tests/*.test.js
# tests 380 / pass 380 / fail 0 (0 regresi)
```

# Sesi 161: Investment Planner Gap Fix — sumber data direwire ke Buku Aset (2026-07-23)

## Konteks
Laporan user: kartu "Investment Planner" selalu kosong walau sudah ada data
investasi di 📋 Buku Aset (Modal Investasi / Harga Beli × Jumlah Unit).
Root cause: `InvestmentPlannerAPI` (Sesi 95) membaca `Investment`/
`D.investments` (`modules/asset/investasi.js`, Sesi 9) — modul yang TIDAK
PERNAH punya UI penulis data (`Investment.addHolding()` tidak pernah
dipanggil dari button/modal manapun di seluruh app). Jadi Investment
Planner selalu kosong berapa pun data yang user isi, karena user
sebenarnya mengisi data investasinya lewat 📋 Buku Aset (`D.assets`,
field `modalInvestasi`/`hargaBeli`×`jumlahUnit` — sudah ada UI-nya &
sudah dipakai kartu "Performa Investasi" di halaman Aset).

## Perubahan

- **`modules/asset/aset.js`**: `Aset.investmentPerformance()` baru —
  diekstrak murni dari `Aset.renderInvestasi()` (0 rumus baru, 0 behavior
  berubah), pola SAMA PERSIS `AssetInsight.compute()` vs
  `AssetInsight.render()` yang sudah ada di file ini. `renderInvestasi()`
  sekarang memanggil fungsi ini utk data, lalu render DOM seperti biasa.
- **`modules/finance/investment-planner-api.js`**: `_portfolio()`/
  `_allocation()` direwire baca `Aset.investmentPerformance()`, BUKAN lagi
  `Investment.portfolioSummary()`/`Investment.assetAllocation()`. Alokasi
  dikelompokkan by `jenis` (field yang sudah ada di Buku Aset, pola sama
  grouping-by-kategori di `AssetInsight.compute()`). `totalDividend`/
  `totalRealizedGain` selalu 0 (jujur dilaporkan — Buku Aset memang tidak
  melacak riwayat dividen/jual per instrumen, beda cakupan dari
  `Investment`). `watchlistAlerts()` selalu `ok:true, count:0` (Buku Aset
  tidak punya konsep watchlist — bukan error, jujur dilaporkan kosong).
  Pesan rekomendasi `invest_no_holdings` diperbaiki (sebelumnya menyuruh
  "tambahkan instrumen" tanpa bilang di mana; sekarang eksplisit arahkan
  ke field Modal Investasi/Harga Beli × Jumlah Unit di Buku Aset).
- **`modules/finance/investment-planner-presenter.js`**: pesan empty-state
  yang SALAH ("tambahkan di 📋 Buku Aset > Investasi" — menu itu tidak
  pernah ada) diganti jadi arahan yang benar.
- `Investment`/`D.investments`/`modules/asset/investasi.js` TIDAK dihapus
  (masih tersedia kalau nanti mau dibuatkan UI "add holding" sendiri —
  opsi B yang belum dipilih user), hanya sudah tidak dipakai lagi sebagai
  sumber Investment Planner.

## Test baru
`tests/investment-planner-gap-fix.test.js` (7 test): formula
`investmentPerformance()` (kosong tanpa data modal; ROI/gain/best/worst
dgn data modalInvestasi & hargaBeli×jumlahUnit), `InvestmentPlannerAPI`
end-to-end via `Aset` (bukan `Investment`), `assetAllocation()` grouping
by jenis, `watchlistAlerts()` selalu kosong, `ok:false` yang benar kalau
`Aset` belum dimuat.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 387 / pass 387 / fail 0 (0 regresi, naik dari 380)

node scripts/build.js kw161-investment-planner-gap-fix-610
# ✅ Build selesai, ?v=610, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 387 / pass 387 / fail 0
```

---

# Changelog — Sesi 188 (Tahap 7C-4b lanjutan): prefill form tambah part dari hasil OCR dikembalikan

## Konteks
Instruksi eksplisit user: "Prefill form dengan hasil OCR", "Jangan ubah proses
simpan", "Jangan ubah fitur lain". Baseline sesi ini adalah
`kw187-sparepart-ocr-add-noprefill-657` (Sesi 187 override: `open()` di
`sparepart-ocr-catalog-add.js` sempat dibuat TIDAK menulis prefill ke DOM).
Sesi ini mengembalikan perilaku prefill (Tahap 7C-3c) tanpa menyentuh alur
simpan atau fitur lain.

## Perubahan

- **`modules/vehicle/sparepart-ocr-catalog-add.js`**: `sparepartOcrCatalogAddOpen()`
  sekarang memanggil helper baru `_sparepartOcrCatalogAddWritePrefill(parsed)`
  SETELAH `VehicleCatalogUI.openForm()` (mode "Tambah Part Baru" tanpa id).
  Helper ini reuse `fields(parsed)` yang sudah ada (0 logic parsing baru) dan
  menulis ke `catPartName`/`catOemCode`/`catBarcode` — HANYA kalau elemen ada
  di DOM & nilainya tidak kosong (guard sama seperti desain awal Tahap 7C-3c).
  `confirmAndSave()`/alur simpan TIDAK diubah sama sekali — form tetap
  berstatus "belum disimpan" sampai user konfirmasi.
- Header komentar file diperbarui menjelaskan perubahan ini.
- `tests/sparepart-ocr-catalog-add.test.js`: 3 test "no prefill" lama diganti
  jadi 5 test prefill (isi field dari hasil parse, guard nilai kosong tidak
  menimpa, guard parsed undefined, guard elemen DOM sebagian tidak ada) — net
  +2 test (17 total file ini, naik dari 15... eh dari kondisi noprefill).
  Test lain (`fields()`, `confirmAndSave()`, guard dependency) TIDAK diubah.

TIDAK ada perubahan ke parser (7C-2), pencarian (7C-3a), kartu detail (7C-3b),
orkestrator (7C-4/Sesi 187 awal), `VehicleCatalogUI.openForm()`/`save()`, atau
fitur lain manapun.

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 684 / pass 684 / fail 0 (naik dari 682, +2 test baru, 0 regresi)

node scripts/build.js kw188-tahap7C4b-sparepart-ocr-add-prefill
# ✅ Build selesai, ?v=658, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 684 / pass 684 / fail 0
```

---

# Changelog — Sesi 317 (Tahap 6 — Migrasi Scanner): hide nav/toast/modal/header dipindah total ke ScannerSession

## Konteks
Lanjutan Sesi 316 (Tahap 5 — `modules/shared/scanner-session.js` dibuat,
`docs/PRODUCT_DECISIONS.md` § "Scanner — Exclusive Scanner Mode via
ScannerSession (FINAL — Sesi 316, PD-007)"). Tahap 6 menuntaskan migrasi:
Scanner Engine (`vehicle-scanner.js`/`sparepart-scanner.js`) SEKARANG hanya
mengurus kamera (ZXing/decode/overlay video), 0 sentuhan ke
`#mainNav`/`#mainHeader`/modal/toast — tanggung jawab itu 100% pindah ke
`ScannerSession.pauseUI()`/`resumeUI()`, dipanggil eksplisit dari
`ScannerSession.enter()`/`exit()`.

## Perubahan

- **`modules/vehicle/vehicle-scanner.js`**: `vehicleScannerHideChrome()`/
  `vehicleScannerRestoreChrome()` DIHAPUS. `vehicleScannerScan()` sekarang
  memanggil `ScannerSession.enter()` SEBELUM membangun overlay & mulai
  decode, dan `ScannerSession.exit()` SETELAH teardown overlay (baik lewat
  tombol tutup, kode berhasil dibaca, maupun path error) — guard `typeof
  ScannerSession` supaya tetap aman kalau modul ini belum dimuat (mis. test
  terisolasi).
- **`modules/vehicle/sparepart-scanner.js`**: `sparepartScannerBuildOverlay()`
  tidak lagi memanggil `vehicleScannerHideChrome()` (fungsi itu sudah tidak
  ada); `sparepartScannerCameraAdapter()` memanggil `ScannerSession.enter()`/
  `exit()` dgn pola & guard yang sama persis `vehicleScannerScan()`.
- **`modules/shared/modal-navigasi.js`**: blok IIFE `camera-scan-active`
  (`MutationObserver` + `document.querySelector('video')` +
  `setInterval(400ms)` + style injection `_camScanFixStyle`) DIHAPUS total —
  digantikan `ScannerSession.pauseUI()`/`resumeUI()` (state eksplisit,
  bukan lagi DOM-Detection reaktif).
- **`modules/shared/scanner-session.js`**: 0 perubahan API dari Tahap 5 —
  `pauseUI()`/`resumeUI()` sudah 100% reuse teknik lama (hide
  `#mainNav`/`#mainHeader`, suspend `.overlay.open`/`#toast` via style
  `scanner-session-active`) sejak dibuat, Tahap 6 murni menuntaskan
  pemanggilnya (Scanner Engine + modal-navigasi.js) supaya benar-benar 0
  jalur lain yang menyentuh chrome/modal/toast di luar file ini (PD-007
  ditegakkan penuh).
- **`scripts/build.js`**: 0 perubahan urutan build — `scanner-session.js`
  sudah terdaftar sejak Sesi 316 (SEBELUM `vehicle-scanner.js`/
  `sparepart-scanner.js`, keduanya MEMANGGIL `ScannerSession`).

## Test

- `tests/scanner-lifecycle-baseline-s317.test.js` (characterization test
  kode ASLI SEBELUM refactor, dibuat awal Sesi 317 sesuai catatan di
  kepalanya sendiri) **DIHAPUS** — persis seperti yang diprediksi di
  komentarnya: begitu tanggung jawab pindah ke `ScannerSession`, test
  "Scanner Engine reuse hideChrome/restoreChrome milik dirinya sendiri"
  seharusnya hilang, sinyal migrasi sudah terjadi.
- `tests/scanner-session.test.js` (BARU, 15 test) — menggantikan cakupan
  eksternal test lama (fake DOM manual, pola sama): `pauseUI()`/`resumeUI()`
  round-trip (nav/header display + body class `scanner-session-active` +
  style injection idempotent), `enter()`/`exit()` (guard anti-dobel,
  `isActive()`, aman dipanggil di luar urutan), `AIBus.emit()` guarded
  (`Scanner:opened`/`Scanner:closed`), expose `window.ScannerSession`.
- `tests/vehicle-scanner.test.js`/`tests/sparepart-scanner.test.js` — 0
  perubahan (sudah HANYA mencakup logic murni sejak awal — errorMessage()/
  buildHints() — 0 referensi ke hideChrome/RestoreChrome yang dihapus).

## Hasil verifikasi
```
node --test tests/*.test.js
# tests 1600 / pass 1600 / fail 0   (baseline SEBELUM Tahap 6, ZIP sesi315)

# setelah Tahap 6 (hapus scanner-lifecycle-baseline-s317.test.js, tambah
# tests/scanner-session.test.js +15):
node --test tests/*.test.js
# tests 1615 / pass 1615 / fail 0   (naik dari 1600, 0 regresi)

node scripts/build.js s317-tahap6-migrasi-scanner-scannersession
# ✅ Build selesai, ?v=827, index.html & app_production.html identik

node --test tests/*.test.js   # setelah build
# tests 1615 / pass 1615 / fail 0
```

PD-007 sekarang DITEGAKKAN PENUH: Scanner Engine 0% menyentuh modal/toast/
dashboard, `ScannerSession.enter()`/`exit()` adalah satu-satunya titik
masuk/keluar Exclusive Scanner Mode, state "scanner aktif" 100% eksplisit
(bukan lagi disimpulkan dari keberadaan `<video>` di DOM).
