# Session note — fix: odometer stuck + interval pengingat servis "nyasar" antar kendaraan

## Ringkasan

Dua bug independen, dua akar masalah, 4 file diubah. Semua 4700 test (`npm test`)
tetap **PASS** setelah patch.

---

## Bug 1 — Odometer stuck setelah edit + pindah tab

**File:** `modules/vehicle/vehicle-core.js`

**Root cause:** `commitCurKmEdit()` memanggil `renderCnTab()` **sementara**
elemen `<input id="cnCurKmInput">` masih ada di DOM (blur baru saja terjadi,
`innerHTML` belum ditimpa). `renderCnTab()` (di `modules/modules-render.js`,
baris ~1737) hanya mau menulis ulang teks odometer kalau
`#cnCurKmInput` **sudah tidak ada**:

```js
if(curKmEl&&!document.getElementById('cnCurKmInput')){ ... }
```

Karena guard itu selalu gagal di titik itu, `<input>` nempel permanen —
dan `startEditCurKm()` sendiri langsung `return` kalau elemen itu masih ada
(dikira "sedang diedit"). Efek: field odometer berhenti update untuk
kendaraan apa pun setelah edit pertama.

**Fix:** `inp.removeAttribute('id')` di awal `commitCurKmEdit()`, sebelum
`renderCnTab()` dipanggil, supaya guard di atas lolos dan menimpa ulang
tampilan odometer seperti seharusnya.

---

## Bug 2 — Interval pengingat servis "tidak tersimpan" / histori "tidak kebaca"

**File baru helper:** `modules/vehicle/sparepart-servis.js`
**Dipasang di:** `car-notes.js` (3 titik) + `modules/finance/tx-servis.js` (1 titik)

**Root cause:** Sejak S622/S629, kategori sparepart (`D.sparepartCats`) bisa
di-scope ke 1 kendaraan spesifik lewat `cat.vehicleId`, dan kartu Pengingat
Servis Dashboard **sudah benar** memfilternya per kendaraan lewat
`catVisibleForVehicle(cat, vehicleId)`.

Tapi titik-titik yang **mencari** kategori saat **menyimpan/mengisi form**
servis masih mencari nama kategori secara **global**, tanpa peduli kendaraan
aktif:

- `Servis._saveInner()` (car-notes.js) — `let matched=D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase())`
- `Servis.onItemAutofillInterval()` (car-notes.js) — autofill kolom interval
- prefill saat buka modal edit servis (car-notes.js)
- `_resolveServisCategoryId()` (tx-servis.js) — versi sinkron dari panel
  Transaksi Keuangan

Akibatnya: kalau 2 kendaraan sama-sama punya item bernama sama (mis. "Ganti
Oli"), servis kendaraan B bisa ke-link ke kategori **privat** milik
kendaraan A. Di kartu Pengingat kendaraan B, kategori itu lalu disembunyikan
(karena `cat.vehicleId`-nya bukan B). Dari sudut pandang B: histori servis
"tidak kebaca" dan interval yang barusan diisi "tidak tersimpan" — padahal
tersimpan, cuma nyangkut ke kategori kendaraan lain.

**Fix:** helper baru `resolveServisCatForVehicle(name, vehicleId)` di
`sparepart-servis.js` — SoT tunggal match-by-nama yang sadar kendaraan:

1. Prioritas kategori yang **scoped ke `vehicleId` aktif**.
2. Fallback ke kategori **universal** (`cat.vehicleId` kosong).
3. **Tidak pernah** jatuh ke kategori privat kendaraan lain.

Dipasang di 3 titik `car-notes.js` (autofill interval, prefill edit, save)
dan `_resolveServisCategoryId()` di `tx-servis.js` (menerima `vehicleId`
tambahan dari `opts.vehicleId`, yang sudah selalu diisi oleh
`applyTxServisFromTx()`). Semua pemanggilan dijaga `typeof
resolveServisCatForVehicle==='function'` dengan fallback ke perilaku lama,
mengikuti pola defensif yang sudah ada di codebase ini — supaya tetap aman
kalau `car-notes.js`/`tx-servis.js` dimuat terisolasi tanpa
`sparepart-servis.js` (seperti sejumlah test yang pakai `loadSource`).

---

---

## Bug 3 — Kartu "🔧 Pengingat Servis" di Dashboard/Beranda: kategori privat kendaraan lain ikut nyasar tampil

**File:** `modules/shared/modules-render.js` (`renderDashboardServisReminder()`)

**Root cause:** Gap dari kelas yang sama dengan Bug 2, ditemukan saat audit
lanjutan. `remindableCats` di widget Dashboard difilter `intervalKm>0 &&
showInReminder!==false` saja, **tanpa** `catVisibleForVehicle(cat, vehicleId)`
— beda dari `Servis.renderReminder()` (car-notes.js) yang sudah benar
menyertakan filter itu. Karena widget ini bisa menampilkan beberapa
kendaraan sekaligus, filter lama (dihitung 1x di luar loop) juga tidak bisa
langsung ditempel `catVisibleForVehicle(cat,vehicleId)` dengan 1 vehicleId
tunggal.

Efeknya kebalikan dari Bug 2: alih-alih kategori "hilang", di sini kategori
**privat milik kendaraan lain ikut muncul nyasar** di kartu Pengingat
kendaraan yang sedang aktif/difilter di Beranda.

Catatan: ada 2 salinan file lain dengan fungsi bernama sama
(`modules/modules-render.js`, `modules/shop/modules-render.js`) yang
mengandung bug identik, tapi terkonfirmasi **dead code** — tidak direferensi
`scripts/build.js` sama sekali, jadi tidak diubah (di luar cakupan, tidak
mempengaruhi app yang berjalan).

**Fix:** pindahkan filter `catVisibleForVehicle(cat, veh.id)` ke **dalam**
loop per-kendaraan (`remindableCatsAll` dihitung sekali di luar tanpa filter
vehicle, lalu `remindableCats` dihitung ulang per `veh.id` di dalam
`vehicles.forEach`).

---

## Bug 4 (minor) — `Sparepart.syncFromCatalog()`: sinkron stok dari Katalog Suku Cadang bisa numpang ke kategori privat kendaraan lain

**File:** `modules/vehicle/sparepart-servis.js`

**Root cause:** Pola sama Bug 2 — saat sinkron part dari Katalog Suku
Cadang untuk 1 kendaraan aktif, kategori tujuan dicari dengan
`D.sparepartCats.find(c=>c.name.toLowerCase()===catName.toLowerCase())`
secara global. Kalau kendaraan lain sudah punya kategori privat bernama
sama, stok kendaraan aktif bisa ke-link ke kategori privat kendaraan lain
itu.

**Fix:** pakai `resolveServisCatForVehicle(catName, curVehicleId)` (guard
`typeof`, sama pola seperti perbaikan lain).

---

## Verifikasi

- `npm test` → **4700/4700 pass**, 0 fail — juga setelah full build.
- `node scripts/verify-window-expose.js` → OK.
- `node scripts/verify-bundle-freshness.js` → OK, kedua bundle segar & hash
  source cocok.
- `node scripts/build.js` → **sekarang lolos sampai selesai** (lihat catatan
  di bawah).
- `npm run lint` tidak bisa dijalankan di lingkungan ini (eslint tidak
  terpasang, tidak ada akses jaringan untuk install) — tidak divalidasi.

## Catatan tambahan: perbaikan agar `node scripts/build.js` bisa selesai

Sebelumnya `build.js` gagal di langkah `verifyVersionConstantsSynced()`: 4
konstanta versi (`MODULE_RENDER_VERSION`, `MODAL_VERSION`,
`MODULE_CALC_VERSION`, `MODULE_FEATURES_VERSION`) sudah lama nyangkut di
nilai `'s643-keamanan-pin-per-device-salt'`, sementara sumber kebenaran versi
(`APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION` di
`features-helpers-global-security.js`) sudah di `'s649'`.
`bumpVersionEverywhere()` cuma cari-ganti string versi LAMA persis, jadi 4
konstanta yang sudah menyimpang itu tidak pernah ikut ter-update — **ini
pre-existing, sudah terjadi juga di zip sumber asli sebelum sesi ini
disentuh sama sekali**, tidak disebabkan oleh 5 fix bug di atas.

Fix: 4 konstanta yang menyimpang disamakan manual ke nilai versi terkini
sebelum build (sesuai instruksi error message-nya sendiri), lalu
`node scripts/build.js` dijalankan ulang — berhasil membangun
`s651-keamanan-pin-per-device-salt`, sinkron semua konstanta versi, menulis
ulang `app-bundle-a.min.js`/`app-bundle-b.min.js`,
`index.html`/`app_production.html` (query `?v=1384`), dan `sw.js`
(`CACHE_NAME` `kw-cache-v1384`).

---

## Sesi lanjutan — Audit "Car Notes lebih pintar" + 4 perbaikan

Diminta audit menyeluruh fitur Car Notes utk rekomendasi AI/data, lalu kerjakan 4 gap yang ditemukan:

### Gap 1 — Kartu Pengingat Servis (car-notes.js) tidak nyambung ke `VehicleActionRecommendation`
App ini sudah punya decision-engine berlapis matang (`VehicleIntelligence` →
`VehicleReminder` → `VehicleAIHook` → `VehicleRecommendationEngine` →
`VehicleActionRecommendation`/`VehiclePriorityScoring`), tapi `Servis.renderReminder()`
(car-notes.js) adalah implementasi terpisah sendiri yang tidak pernah
memanggilnya — jadi teks aksi konkret ("Jadwalkan servis sekarang", dst)
tidak pernah muncul di tab Car Notes.
**Fix:** `renderReminder()` sekarang memetakan status baris (`sisa<=0` →
`overdue`, mendekati ambang → `due-soon`) lalu 100% reuse
`VehicleActionRecommendation.actionFor({type:'service',severity})` (fungsi
yang SUDAH ADA, bukan logic baru) utk teks aksi, ditampilkan sebagai baris
"👉 ..." di tiap kategori overdue/due-soon.

### Gap 2 — Interval servis 100% statis, tidak ada rekomendasi berbasis data
`getEffectiveIntervalKm()` cuma baca default admin/override manual, tidak
pernah dibandingkan dgn pola servis AKTUAL (`D.servisLogs`).
**Fix:** fungsi baru `recommendIntervalKm(vehicleId,cat)` (sparepart-servis.js)
menghitung rata-rata jarak KM antar servis kategori itu dari histori nyata
(reuse `servisLogMatchesCat()` apa adanya, min. 2 catatan). Hasilnya
ditampilkan sbg baris saran ("💡 Dari N jeda servis terakhir, rata-rata kamu
servis tiap ~X km...") di modal "Interval Khusus" (`editVehicleIntervalOverride()`)
— hanya tampil kalau beda ≥100 km dari interval saat ini, murni saran, tidak
pernah menimpa angka manapun sendiri.

### Gap 3 — Dropdown "Kategori" (Stok Sparepart) tanpa pencarian
`<select id="stockCatId">` native flat, makin susah dicari begitu daftar
kategori panjang (multi-kendaraan × banyak part).
**Fix:** kotak cari baru `#stockCatSearch` di atas dropdown (modals.js),
filter live via `Sparepart.filterStockCatOptions()` (menyembunyikan
`<option>` yang tidak cocok lewat `.hidden`, 0 perubahan pada value/opsi
itu sendiri). Reset otomatis tiap `populateStockCatSelect()` dipanggil ulang
(buka modal baru/ganti kendaraan).

### Gap 4 — `getItemSuggestions()` (suggest-box "Jenis Servis/Item") tidak scoped per kendaraan
Ditemukan saat audit: sumber saran dari `D.sparepartCats` diambil TANPA
`catVisibleForVehicle()` — beda dari sumber lain di fungsi yang sama
(`partsStock` & `_catalogNameCache`, keduanya sudah scoped). Bisa nawarin
nama kategori privat milik kendaraan lain, membingungkan (walau tetap aman
kalau dipilih, karena `save()` sudah lewat `resolveServisCatForVehicle()`).
**Fix:** tambah filter `catVisibleForVehicle(c,vid)` di loop `D.sparepartCats`.

### File tambahan yang berubah (di luar versi/bundle)
- `modules/vehicle/sparepart-servis.js` — `recommendIntervalKm()`,
  `filterStockCatOptions()`, fix scoping `getItemSuggestions()`
- `car-notes.js` — `renderReminder()` pakai `VehicleActionRecommendation`
- `modules/shared/modals.js` — kotak cari `#stockCatSearch` di modal Stok Sparepart

### Verifikasi sesi ini
`npm test` → 4700/4700 pass. `node scripts/build.js` → sukses (`s652`,
`?v=1385`). `verify-bundle-freshness` & `verify-window-expose` → OK.

---

## File yang berubah

**Fix bug (5 file):**
- `modules/vehicle/vehicle-core.js`
- `modules/vehicle/sparepart-servis.js`
- `car-notes.js`
- `modules/finance/tx-servis.js`
- `modules/shared/modules-render.js`

**Efek build (versi + bundle, wajib disertakan supaya fix di atas benar-benar
aktif di app — HTML memuat bundle `.min.js`, bukan file source langsung):**
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `app_production.html`, `index.html`, `sw.js`
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js` (cuma bump
  konstanta versi, tidak ada perubahan logika)
- `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md` (regenerasi otomatis oleh
  build, dokumentasi saja)

**PENTING utk deploy:** upload SEMUA file di atas, bukan cuma HTML/sw.js —
kalau cuma sebagian yang di-upload, bundle & source bisa tidak sinkron.

---

## Sesi lanjutan — Fix bug nyata di `predictService()`/`maintenanceForecast()` (audit sebelum tambah UI forecast)

**Konteks:** saat audit kenapa `maintenanceForecast()` belum dipasang di UI, ditemukan `predictService()` sendiri sudah AKTIF dipakai `_vehicleOverdueCheck()` → rule AIDecision `vehicle-service-overdue` (notifikasi nyata ke user), dan di situ ada 2 gap + 1 gap turunan.

### Gap A — `predictService()` tidak filter `catVisibleForVehicle()`
Loop sebelumnya `(D.sparepartCats||[])` mentah — kategori PRIVAT kendaraan lain ikut terhitung utk kendaraan aktif.

### Gap B — `predictService()` tidak filter `intervalKm>0 && showInReminder!==false`
Bug yang sama persis dengan yang sudah diperbaiki di `Servis.renderReminder()` (car-notes.js, komentar "Sesi 295"), tapi belum pernah ditempel ke `predictService()` meski keduanya menghitung hal yang sama. Kategori "sampah" hasil scan Katalog Suku Cadang (`intervalKm:0`) membuat `sisaKm` selalu negatif → status `'lewat'` permanen → berpotensi memicu notifikasi AI "servis lewat jatuh tempo" yang salah/spam.

**Fix A+B:** `predictService()` sekarang menghitung `remindable` (filter gabungan `intervalKm>0 && showInReminder!==false && catVisibleForVehicle(cat, vehicleId)`) sebelum dipakai baik untuk mode array (`categoryId` kosong) maupun mode 1 kategori (`categoryId` diisi) — disamakan persis dgn filter yang sudah benar di `Servis.renderReminder()`. Sudah dicek: tidak ada pemanggil `predictService()` lain di codebase ini yang mengisi `categoryId`, jadi perubahan pada cabang itu aman.

### Gap C (turunan Gap A+B) — `maintenanceForecast()`: pencocokan biaya histori exact-string-match
`s.item===r.categoryName` polos, bukan `servisLogMatchesCat()` (fuzzy match yang sudah dipakai `recommendIntervalKm()`) — `biayaEstimasi` lebih sering `null` dari seharusnya meski catatan servisnya sebenarnya cocok.

**Fix C:** ambil objek kategori (`D.sparepartCats.find(c=>c.id===r.categoryId)`), lalu pakai `servisLogMatchesCat(s,cat)` seperti fungsi lain di file ini.

**File berubah:** `modules/vehicle/sparepart-servis.js` (source), `app-bundle-b.min.js` (bundle ditempel manual dgn teks identik — lihat catatan verifikasi di bawah).

**PENTING — belum diverifikasi penuh di sesi ini:** repo/payload yang di-upload ke sesi ini cuma berisi file sumber yang relevan + 2 bundle, TANPA `scripts/build.js`, suite test (`npm test`), atau `package.json`. Jadi:
- Belum bisa dijalankan `npm test` (4700+ test) untuk memverifikasi tidak ada regresi.
- Belum bisa dijalankan `node scripts/build.js` untuk bump versi & regenerasi bundle resmi (bundle di sini ditempel manual by hand, teks identik dgn source, TAPI belum lewat proses build/minify/version-sync yang biasa).
- `verify-bundle-freshness.js` / `verify-window-expose.js` / `verify-release-ready.js` belum dijalankan.

**Sebelum deploy:** jalankan ulang siklus biasa (full repo + `npm test` + `node scripts/build.js`) supaya versi & bundle resmi konsisten, bukan cuma pakai bundle hasil tempel manual di patch ini.
