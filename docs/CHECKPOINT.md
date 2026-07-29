# CHECKPOINT.md — Status granular sesi berjalan (update tiap sesi/step)

Kalau sesi terputus di tengah jalan, lanjutkan dari **Current Step**,
JANGAN audit/implement/test/build ulang bagian yang sudah **Completed**.

## Current Session

Sesi 312 (2026-07-27) — FIX: akun baru dari opsi "➕ Buat Akun Baru dari
Aset Ini" (`Aset.save()`, blok `accountId==='__new__'`) tidak mewarisi
`ownership` aset sumbernya — resolusi `ownership` dipindah ke SEBELUM blok
pembuatan akun, `newAcc` sekarang menyertakan field `ownership` apa adanya
(pola field sama `_saveAccInner()`/`akun.js`). Akun tertaut LAMA (bukan
`__new__`) tidak disentuh — di luar scope. SELESAI PENUH. Detail lengkap:
`CHANGELOG.md` § S312.

Belum digarap (ditunda, bukan bug — lihat `docs/NEXT_SESSION.md`): kartu
akun tertaut selalu blur walau toggle "Aktif" — ini BY DESIGN
(`renderAccGrid()`, `modules-render.js`), toggle memang tidak berlaku
selama masih tertaut Aset.

---

Sesi 311 (2026-07-27) — FIX: nominal akun tertaut ke Buku Aset tidak sync
saat nilai aset diedit (`Aset.save()` di `modules/asset/aset.js`,
`accountId` yang sudah tertaut sebelumnya sekarang ikut dikoreksi ke nilai
aset terbaru lewat pola `txDelta`, riwayat transaksi akun tidak diubah).
SELESAI PENUH. Detail lengkap: `CHANGELOG.md` § S311.

---

Sesi 287 (2026-07-27) — FIX: Katalog Suku Cadang tidak sync ke dropdown
"Pilih Sparepart" (input transaksi Keuangan) & Kelola Stok Sparepart tidak
push ke Katalog. SELESAI PENUH. Detail lengkap: `CHANGELOG.md` § Sesi 287.

**Target eksplisit user**: 2 screenshot melaporkan katalog suku cadang
belum tampil di input transaksi, dan Kelola Kategori/Stok Sparepart
seharusnya sync otomatis dgn Katalog.

**Implementasi**: Tahap 10 (lanjutan bridge Tahap 9 Sesi 266) — 2 arah
sync antara `VehicleCatalog` (Katalog Suku Cadang) & `D.partsStock`:
1. `syncUnlinkedCatalogPartsToStock()` baru (tx-stok-sparepart.js), tautkan
   otomatis part katalog yang belum ada di `D.partsStock` tiap panel stok
   dibuka — reuse `syncPartsStockFromCatalog()` 100%.
2. `Sparepart.saveStock()` (sparepart-servis.js) push part stok baru ke
   `VehicleCatalog.create()` best-effort, pola sama `applyTxStockFromTx()`.

**Scope**: 2 file JS + 2 file test (10 test baru). 0 skema/store baru, 0
perubahan ke fungsi bridge murni yang sudah ada (Tahap 9 dipakai apa
adanya).

## Test

`node --test tests/*.test.js` -> **1553/1554 pass** (naik dari 1543/1544,
+10 test baru). 1 fail SUDAH ADA sebelum sesi ini (FEATURE_REGISTRY,
`stgGroup3`/Pengingat belum dihapus dari index.html — pekerjaan lain yang
sedang berjalan, di luar cakupan fix ini).

## Build

`node scripts/build.js s287-sparepart-catalog-tx-sync` -> sukses, `?v=811`
(naik dari `?v=810`).

## ZIP

`kw_release_sesi287_sparepart-catalog-tx-sync_v811.zip` — dibuat &
diverifikasi `unzip -t`.

## Current Step

Sesi 287 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP.

---

Sesi 262 (2026-07-26) — Selective Liquid Glass + M3 Expressive UI refresh
(floating nav, glass chrome, kontras badge stok). SELESAI PENUH. Detail
lengkap: `CHANGELOG.md` § Sesi 262.

**Target eksplisit user**: implementasi arah UI Material 3 Expressive +
Selective Liquid Glass yang sudah disepakati lewat preview interaktif
(floating bottom nav, tanpa FAB, nav 6 item asli, palet netral kalem) ke
file project nyata, plus buat preview HTML implementasi, plus doc-sync.

**Implementasi**: lihat `CHANGELOG.md` § Sesi 262 untuk detail penuh
(`modern-ui-layer.css`, `nav-scroll.js` baru, `preview-m3-liquidglass.html`
baru, 1 bug token mati + 1 fix kontras WCAG AA ditemukan & diperbaiki).

**Scope**: CSS-only + 1 file JS mandiri baru. TIDAK menyentuh
`app-bundle-a/b.min.js` atau modul bisnis apa pun — 0 resiko ke 1228 test
JS yang ada (test suite tidak dijalankan ulang sesi ini karena tidak ada
perubahan logic bisnis untuk diverifikasi).

---

## Sesi sebelumnya (arsip singkat)

Sesi 203 (Continue, 2026-07-25) — Delivery Plan UI: hubungkan TripEngine
(S198) ke Order/Kasir. SELESAI PENUH.

**Target eksplisit user**: TripEngine/LogisticsEngine/calculateSmartDelivery/
calculateVehicleCapacity/weightCalculator/volumeCalculator/packingCalculator
sudah lengkap tapi belum ada UI ("senyap") — hubungkan ke UI nyata (form
Order), tambah hook Dashboard & AI Insight, tulis test, build, ZIP.

**Implementasi**:
- `modules/shared/modals.js` — field baru `pBeratPerUnit`/`pPanjang`/
  `pLebar`/`pTinggi` di `productModal` (dipakai `weightCalculator()`/
  `volumeCalculator()`, S4/S198, lewat TripEngine). Tombol baru "🚚 Rencana
  Pengiriman" di `orderModal`. Modal baru `deliveryPlanModal` (index 80 di
  `MODAL_HTML`) — form produk/qty/produsen/metode/kendaraan/margin +
  ringkasan ongkir/harga/profit/berat/volume + tombol rekomendasi AI.
  `MODAL_VERSION` dibump otomatis oleh build.js.
- `app_production.html`/`index.html` — `document.write(MODAL_HTML[80])`
  ditambah setelah `hondaPdfImportModal` (source of truth; build.js sinkron
  keduanya otomatis).
- `modules/shop/cobek-etalase.js` — `Etalase.openModal()`/`Etalase.save()`
  baca/tulis `beratPerUnit`/`panjang`/`lebar`/`tinggi` ke `D.products[]`.
  0 rumus baru, field APA ADANYA disimpan.
- **File baru** `modules/shop/delivery-plan-ui.js` — `DeliveryPlanUI`
  (open/onProductChange/setMetode/calc/askAI), presenter MURNI: 100% reuse
  `TripEngine.plan()`/`weight()`/`volume()` (S198, sendiri delegasi PERSIS
  ke `calculateSmartDelivery()`/`weightCalculator()`/`volumeCalculator()`)
  + `requestAIRecommendation()` (S6). 0 rumus/logic AI baru. Terdaftar di
  `scripts/build.js` (GROUP_B, setelah `trip-engine.js`).
- `modules/ai/feature-insights.js` — item baru `ShopInsight` #5
  `'shop-delivery-plan'`: muncul kalau ada produk dgn
  `beratPerUnit`/dimensi terisi, arahkan ke fitur Rencana Pengiriman.
  100% reuse `TripEngine`, guard `typeof`, tidak throw kalau
  belum dimuat.
- Dashboard hook: item AI Insight di atas otomatis tampil di kartu AI
  Insight Dashboard (`FeatureInsightUI`/`renderDashboard()` yang sudah
  ada) — tidak menambah kartu findash baru ke
  `ShopBusinessEnginePresenter` (di luar cakupan, risiko ubah struktur
  grid 3-kartu yang sudah ada test-nya).

## Test

`node --test tests/*.test.js` -> **996/996 pass, 0 fail** (naik dari 987 —
9 test baru `tests/delivery-plan-ui.test.js`: `DeliveryPlanUI.open()`/
`calc()`/`setMetode()` tidak throw walau DOM di-stub permisif,
`TripEngine.plan()`/`weight()`/`volume()` dipakai presenter, & 3 test
`ShopInsight` item `shop-delivery-plan` muncul/tidak sesuai data produk).

## Build

`node scripts/build.js` -> sukses, `?v=717` (naik dari `?v=716`).
FILE-MAP.md ditulis ulang otomatis (265 file, 1655 identifier global).

## ZIP

`kw_release_sesi203_delivery-plan-ui_v717.zip` — dibuat & diverifikasi
`unzip -t`.

## Current Step

Sesi 203 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP.

---

Sesi 189 (Tahap 7C-4b lanjutan, 2026-07-25) — Hubungkan Detail OCR ke UI.
SELESAI PENUH.

**Target eksplisit user**: hubungkan `SparepartOcrCatalogDetail` (Tahap
7C-3b, sebelumnya fungsi MURNI tanpa sentuh DOM) ke UI nyata.

**Implementasi**:
- `modules/vehicle/sparepart-ocr-catalog-detail.js` — fungsi baru
  `sparepartOcrCatalogDetailOpen()` (`SparepartOcrCatalogDetail.open`):
  reuse `show()` yang SUDAH ADA apa adanya (0 logic baru), KALAU
  ditemukan tulis `html`-nya ke `#sparepartOcrDetailBody` lalu buka modal
  lewat `openModal('sparepartOcrDetailModal')` (SUDAH ADA,
  `modal-navigasi.js`). `found:false` -> tidak menulis DOM/tidak buka
  modal (perilaku "jika ditemukan, tampilkan" tidak berubah).
  `document`/`openModal` guard typeof, gagal aman.
- `modules/shared/modals.js` — modal baru `sparepartOcrDetailModal`
  (index 78 di `MODAL_HTML`), berisi container `#sparepartOcrDetailBody`,
  read-only, tombol tutup standar. `MODAL_VERSION` dibump.
- `index.html` — `<script>document.write(MODAL_HTML[78])</script>`
  ditambah setelah `vehCatalogImportModal` (source of truth;
  `app_production.html` ditulis ulang otomatis oleh build.js).
- `modules/vehicle/sparepart-ocr-orchestrator.js` — step `'detail'`
  sekarang utamakan `SparepartOcrCatalogDetail.open()`, fallback ke
  `.show()` murni utk kompatibilitas mundur. 0 logic pencarian/parsing
  baru — orkestrator tetap murni pemanggil.

## Test

`node --test tests/*.test.js` -> **690/690 pass, 0 fail** (naik dari 684
— 5 test baru `tests/sparepart-ocr-catalog-detail.test.js` utk `open()`,
1 test baru `tests/sparepart-ocr-orchestrator.test.js` utk prioritas
`.open()` vs `.show()`), 2x — sebelum & sesudah build.

## Build

`node scripts/build.js kw189-sparepart-ocr-detail-ui` -> sukses,
`?v=660` (naik dari `?v=659`).

## ZIP

`kw_release_sesi189_tahap7C4b-sparepart-ocr-detail-ui_v660.zip` — dibuat
& diverifikasi `unzip -t`.

## Current Step

Sesi 189 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan &
link ditampilkan ke user. STOP.

---

Sesi 188 (Tahap 7C-4b lanjutan, 2026-07-24) — Prefill form tambah part dari
hasil OCR dikembalikan. SELESAI PENUH.

**Target eksplisit user**: prefill form dengan hasil OCR; jangan ubah proses
simpan; jangan ubah fitur lain.

**Implementasi**: `modules/vehicle/sparepart-ocr-catalog-add.js` —
`sparepartOcrCatalogAddOpen()` kembali menulis field prefill
(`catPartName`/`catOemCode`/`catBarcode`) ke DOM setelah
`VehicleCatalogUI.openForm()` (mode tambah), reuse `fields(parsed)` yang
sudah ada, guard elemen tidak ada/nilai kosong (mengembalikan perilaku Tahap
7C-3c yang sempat dinonaktifkan di Sesi 187/`noprefill-657`).
`confirmAndSave()`/alur simpan TIDAK disentuh. Detail lengkap: `CHANGELOG.md`
§ Sesi 188.

## Test

`node --test tests/*.test.js` -> **684/684 pass, 0 fail** (naik dari 682 —
+2 test baru di `tests/sparepart-ocr-catalog-add.test.js`).

## Build

`node scripts/build.js kw188-tahap7C4b-sparepart-ocr-add-prefill` -> sukses,
`?v=658` (naik dari `?v=657`).

## ZIP

`kw_release_sesi188_tahap7C4b-sparepart-ocr-add-prefill_v658.zip` — dibuat &
diverifikasi `unzip -t`.

## Current Step

Sesi 188 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP.

---

Sesi 187 (Tahap 7C-4b, 2026-07-24) — Orkestrator Scan -> Parse -> Cari
Vehicle Catalog -> Detail/Add. SELESAI PENUH.

**Target eksplisit user**: buat orkestrator yang merangkai Scan -> Parse
-> Cari Vehicle Catalog; kalau ditemukan panggil Detail, kalau tidak
panggil Add. Jangan ubah UI selain wiring.

**Implementasi**: `modules/vehicle/sparepart-ocr-orchestrator.js`
(`SparepartOcrOrchestrator.run()`) — 0 logic baru, murni memanggil
berurutan `SparepartOcr.scan()` (7C-1) -> `SparepartOcrParser.
parseText()` (7C-2) -> `SparepartOcrCatalogLink.findFromParsed()` (7C-3a)
-> `found` ? `SparepartOcrCatalogDetail.show()` (7C-3b) :
`SparepartOcrCatalogAdd.open()` (7C-3c). Scan `null`/`''` -> berhenti,
tidak lanjut. Kelima dependency opsional (guard typeof), gagal aman.
TIDAK ada tombol/entry-point UI baru ditaruh ke halaman manapun sesi ini.
Detail lengkap: `CHANGELOG.md` § Sesi 187 (Tahap 7C-4b).

## Test

`node --test tests/*.test.js` -> **682/682 pass, 0 fail** (naik dari 672 —
10 test baru `tests/sparepart-ocr-orchestrator.test.js`, 2x — sebelum &
sesudah build).

## Build

`node scripts/build.js kw187-tahap7C4b-sparepart-ocr-orchestrator` ->
sukses, `?v=656` (naik dari `?v=655`).

## ZIP

`kw_release_sesi187_tahap7C4b-sparepart-ocr-orchestrator_v656.zip` —
dibuat & diverifikasi `unzip -t`.

## Current Step

Sesi 187 (Tahap 7C-4b) selesai penuh — ZIP rilis dibuat & diverifikasi,
ringkasan & link ditampilkan ke user. STOP (menunggu target lanjutan —
kandidat: wiring orkestrator ini ke tombol scan label nyata di halaman
Vehicle Catalog, belum ada keputusan produk).

---

Sesi 166 (2026-07-23) — Fitur baru: "Pantau Harga" (Price Watch) — tab ke-3
Worth It?. SELESAI PENUH.

**Target eksplisit user**: catat harga 1 produk dari waktu ke waktu (manual
ATAU dari scan), AI bandingkan ke tren harga historis + kondisi keuangan,
lalu kasih saran "aman dibeli sekarang" vs "tunggu dulu" — via fitur Worth
It? yang sudah ada (bukan modul baru terpisah, konfirmasi user).

**Implementasi**: `WorthIt.PW` (`modules/finance/worthit.js`) — sub-objek
baru, pola sama persis `CAT_FIELDS`/`catFieldsHtml` (Sesi 165b): fungsi PURE
dipisah dari wiring DOM. `D.priceWatch` array baru (`{id,name,entries:[]}`,
tiap entry `{id,price,date,source:'manual'|'scan'}`), backward compatible
(`D.priceWatch||[]` di semua pembacaan, tidak perlu migrasi data lama).
`trend(entries)` (PURE) — hitung latest/min/max/avg dari entries, klasifikasi
arah turun/naik/stabil (ambang ±3% dari rata-rata, pola ambang sama gaya
`healthScore()`), `belum_cukup` kalau entry <2. `financialSafety()` (PURE)
— 100% reuse `FinanceIntelligence.summary()` (Sesi 74) apa adanya, TIDAK
ada rumus cashflow/health-score baru, guard `typeof` kalau modul belum
dimuat. `verdict(trend,finance)` (PURE) — gabung tren harga + kondisi
keuangan jadi 1 saran: turun+sehat→aman, turun+skor rendah/cashflow
minus→override tetap tunggu, naik→selalu tunggu. Input harga: manual
(`promptAddEntry()`, `showPromptModal()`) ATAU scan (`scanEntry()` 100%
reuse `scanReceipt()` yang SUDAH ADA — generic OCR struk/nota, ditembak ke
2 input hidden `wiWatchScanAmt`/`wiWatchScanDate`, `oninput` otomatis
commit ke `addEntry()` begitu OCR selesai — TIDAK ada parser OCR baru).
`render()` — list kartu per produk (verdict box + histori harga + tombol
catat/scan/hapus), dipanggil dari `WorthIt.switchTab('watch')` yang
diperluas (Sesi 165b hanya 2 tab, sekarang generik 3 tab).
`modules/shared/modals.js` — tombol tab ke-3 "📈 Pantau Harga" di
`worthItModal` + div `#wiTabWatch` (list produk + 2 input hidden scan +
tombol "➕ Tambah Produk Dipantau"). TIDAK ada perubahan struktur data
`D.wishlist`/`D.transactions` yang sudah ada, TIDAK ada framework baru,
TIDAK ada duplikasi logic keuangan (100% baca ulang `FinanceIntelligence`).
+15 test baru `tests/worthit-pricewatch.test.js` (13 unit `trend()`/
`verdict()`/`financialSafety()` PURE + 1 integrasi ringan `addItem()`/
`addEntry()`/`trend()` end-to-end via `D` lokal — pola sama
`tests/worthit-jenis.test.js`). Wiring DOM (`render()`/`promptAddItem()`/
`scanEntry()`/dst) sengaja TIDAK dites unit (baca/tulis `document`,
di luar cakupan `loadSource.js`), cukup diverifikasi manual/smoke-test.

## Test

`node --test tests/*.test.js` -> **424/424 pass, 0 fail** (naik dari 409 —
15 test baru `tests/worthit-pricewatch.test.js`, 2x — sebelum & sesudah
build).

## Build

`node scripts/build.js kw166-worthit-pricewatch` -> sukses, `?v=618`
(naik dari `?v=617`). Bundle TANPA minifikasi (esbuild tidak tersedia di
sandbox, fallback otomatis), kedua bundle lolos `node --check`,
`index.html`==`app_production.html`.

## ZIP

`kw_release_sesi166_worthit_pricewatch_v618.zip` — dibuat & diverifikasi
`unzip -t`.

## Current Step

Sesi 166 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP (menunggu target lanjutan).

---

Sesi 161 (2026-07-23) — Bugfix gap Investment Planner (dilaporkan user):
kartu "Investment Planner" selalu kosong walau sudah ada data investasi
di 📋 Buku Aset. SELESAI PENUH.

**Root cause**: `InvestmentPlannerAPI` (Sesi 95) membaca `Investment`/
`D.investments` (`modules/asset/investasi.js`, Sesi 9) — modul yang TIDAK
PERNAH punya UI penulis data (`Investment.addHolding()` tidak pernah
dipanggil dari mana pun). User sebenarnya mengisi data investasinya lewat
📋 Buku Aset (`D.assets`, field `modalInvestasi`/`hargaBeli`×`jumlahUnit`).

**Fix**: `Aset.investmentPerformance()` baru (`modules/asset/aset.js`,
diekstrak murni dari `Aset.renderInvestasi()` yang sudah ada — 0 rumus
baru). `InvestmentPlannerAPI._portfolio()`/`_allocation()`
(`modules/finance/investment-planner-api.js`) direwire baca fungsi itu,
bukan `Investment` lagi. `watchlistAlerts()` jujur `count:0` (Buku Aset
tidak punya watchlist). Pesan empty-state presenter yang salah
diperbaiki. Detail lengkap: `CHANGELOG.md` § Sesi 161. +7 test baru
(`tests/investment-planner-gap-fix.test.js`), regression 387/387 pass
(2x — sebelum & sesudah build). Build
`kw161-investment-planner-gap-fix-610` (`?v=610`), kedua bundle lolos
`node --check`, `index.html`==`app_production.html`.

## Current Step

Sesi 161 selesai penuh — ZIP rilis dibuat, ringkasan & link ditampilkan
ke user. STOP (menunggu target lanjutan).

## Files Changed (Sesi 161)

- `modules/asset/aset.js` — `Aset.investmentPerformance()` baru
  (diekstrak dari `Aset.renderInvestasi()`, 0 rumus baru), `renderInvestasi()`
  dirombak untuk memanggilnya.
- `modules/finance/investment-planner-api.js` — `_portfolio()`/
  `_allocation()` direwire ke `Aset.investmentPerformance()`;
  `watchlistAlerts()` disederhanakan (selalu `ok:true, count:0`); pesan
  `invest_no_holdings` diperbaiki.
- `modules/finance/investment-planner-presenter.js` — pesan empty-state
  holdingsCount===0 diperbaiki.
- `tests/investment-planner-gap-fix.test.js` — baru, 7 test.

- `app-bundle-a.min.js` — dibuat ulang otomatis oleh `scripts/build.js` dari
  source yang sudah dipatch (grup A, memuat `modules-render.js`).
- `app-bundle-b.min.js` — dibuat ulang otomatis (versi disamakan, 0 source
  di grup B berubah).
- `tests/dash-card-show-hide.test.js` — file test BARU, 7 test.
- `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — hasil
  build (`?v=565`), disinkronkan otomatis.
- `CHANGELOG.md`, `FILES-CHANGED.md` — entry Sesi 140.
- `docs/CHECKPOINT.md` (file ini), `docs/NEXT_SESSION.md` — sinkronisasi
  dokumentasi.
- **TIDAK diubah:** `hideDashCardEl()`, `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/
  `DASH_CARD_BY_KEY`, `isDashCardOn()`/`toggleDashCardPref()`/
  `setAllDashCardPrefs()`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`,
  termasuk field `dashKey`), `dashHubNavigateToFeature()`
  (`dashboard-hub.js`, sudah diperbaiki Sesi 139 utk kasus sub-tab, TIDAK
  disentuh lagi sesi ini), seluruh 62 test lama.

## Test

`node --test tests/*.test.js` -> **69/69 pass, 0 fail** (naik dari 62, 7
test baru murni aditif).

## Build

`node scripts/build.js kw140-fix-dashcard-toggle-inline-style` -> sukses,
`?v=565`. Bundle TANPA minifikasi (esbuild tidak tersedia di sandbox,
fallback otomatis).

## ZIP

`kw_release_sesi140_fix-dashcard-toggle-inline-style_v565.zip` — dibuat &
diverifikasi `unzip -t` ("No errors detected in compressed data").

---

Sebelumnya Sesi 139 (2026-07-22) — Bugfix navigasi "Semua Fitur" Dashboard Hub.
SELESAI PENUH. **Dilaporkan user** (screenshot preview HTML): klik kartu
apa pun di grid "🗂️ Semua Fitur" yang goTo-nya adalah Penasihat AI/
Rekomendasi AI/Ringkasan Harian AI/Skor Hidup Seimbang/Refleksi & Self-
Care/Kebebasan Finansial (FI)/Life OS selalu terlihat "mengarah ke Tangga
Ternak Uang". **Root cause**: `target.goTo` ketujuh kartu itu hidup di
dalam container yang ada di `SECTION_GROUPS` sub-tab LAIN
(`#dashboardHubPinnedWrap` → sub-tab "📌 Widget"; `#lifeOSWrap` → sub-tab
"🌦️ Insight") — bukan di sub-tab "🗂️ Fitur" tempat kartunya sendiri.
`dashHubNavigateToFeature()` tidak pernah memanggil
`DashboardHub.setSectionTab()` dulu sebelum `scrollIntoView()`, jadi
kalau user sedang di sub-tab lain, elemen tujuan tetap `u-dnone` →
`scrollIntoView()` no-op tanpa error; yang kelihatan cuma efek
sampingan `showPage()` reset scroll ke 0, mendarat di kartu Tangga
Ternak Uang yang SENGAJA selalu tampil di atas seluruh sub-tab. **Fix**:
`DASHHUB_GOTO_SECTION_MAP` baru (100% reverse-map dari `SECTION_GROUPS`
yang sudah ada) + `_dashHubResolveGoToSection()` (jalan naik lewat
`parentElement`) di `modules/dashboard-hub/dashboard-hub.js` —
`dashHubNavigateToFeature()` sekarang switch ke sub-tab yang benar dulu
sebelum scroll, hanya utk `target.page==='dashboard-hub'`. 10 test baru
(`tests/dashboard-hub-goto-subtab.test.js`), regression 62/62 pass (52
lama + 10 baru). Build `kw139-fix-dashboard-hub-goto-subtab` (`?v=564`),
kedua bundle lolos `node --check`, `index.html`==`app_production.html`.
**Catatan skop test**: sama seperti Sesi 138, ZIP kerja ini hanya
membawa test yang tersedia di `tests/` (sekarang 5 file, 62 test),
BUKAN full suite ribuan test yang disebut riwayat sesi-sesi lampau di
file ini.

## Current Step

Sesi 139 selesai penuh — ZIP rilis dibuat & diverifikasi (`unzip -t`),
ringkasan & link ditampilkan ke user. STOP (menunggu target lanjutan).

## Files Changed (Sesi 139)

- `modules/dashboard-hub/dashboard-hub.js` — `DASHHUB_GOTO_SECTION_MAP` +
  `_dashHubResolveGoToSection()` baru; `dashHubNavigateToFeature()` +1
  blok (switch sub-tab sebelum scroll ke `target.goTo`).
- `app-bundle-b.min.js`, `app-bundle-a.min.js` — dibuat ulang otomatis
  oleh `scripts/build.js` dari source yang sudah dipatch.
- `tests/dashboard-hub-goto-subtab.test.js` — file test BARU, 10 test.
- `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — hasil
  build (`?v=564`), disinkronkan otomatis.
- `CHANGELOG.md`, `FILES-CHANGED.md` — entry Sesi 139.
- `docs/CHECKPOINT.md` (file ini) — sinkronisasi dokumentasi.
- **TIDAK diubah:** `SECTION_GROUPS`/`applySectionTab()`,
  `dashboard-hub-registry.js` (`FEATURE_REGISTRY`), `showPage()`, markup
  `index.html`/`app_production.html` (0 perubahan manual, cuma `?v=`
  otomatis), seluruh 52 test lama.

## Test

`node --test tests/*.test.js` -> **62/62 pass, 0 fail** (naik dari 52,
10 test baru murni aditif).

## Build

`node scripts/build.js kw139-fix-dashboard-hub-goto-subtab` -> sukses,
`?v=564`. Bundle TANPA minifikasi (esbuild tidak tersedia di sandbox,
fallback otomatis).

## ZIP

`kw_release_sesi139_fix-dashboard-hub-goto-subtab_v564.zip` — dibuat &
diverifikasi `unzip -t` ("No errors detected in compressed data").

---

Sebelumnya Sesi 138 (2026-07-22) — Cleanup fisik `#page-dashboard` lama (dead code
pasca-migrasi Dashboard Hub) + 2 pintu nyasar + null-guard `backupBanner`.
SELESAI PENUH. **Temuan awal sesi**: dari 17 card di `DASH_RENDER_ORDER`,
cuma 13 yang benar-benar mati (`bill`/`servisReminder`/`sewaKiosReminder`/
`backupReminder`/`danaDarurat`/`cashflowForecast`/`timeline`/`budgetMini`/
`eduFund`/`zakatMini`/`laporanMini`/`siapPulang`/`ldr`) — 4 sisanya
(`fi`/`pensiun`/`absensi`/`refleksi`) TETAP HIDUP karena elemennya sudah
pindah ke `#page-dashboard-hub` sejak migrasi Tahap 3a, hanya render-nya
masih dikontrol fungsi yang sama. **Fix**: `DASH_CARD_DEFS`/
`DASH_RENDER_ORDER` (`modules/shared/modules-render.js`) dipangkas ke 4
entry hidup saja; guard `if(getElementById('page-dashboard'))` di
`setAllDashCardPrefs`/`toggleDashCardPref` diarahkan ke
`page-dashboard-hub`; `renderDashboard()` dibersihkan dari baris yang
nulis ke elemen dashboard lama (`dIncome`/`dExpense`/`dBalance`/`dShop`/
`recentTx`/`dashAccList`) — `dashCtx` TETAP dipertahankan (masih dipakai
`FinCoach`). 4 titik `getElementById('backupBanner')`/`'lastBackupDate'`
tanpa null-check di `modules/shared/backup-restore.js` diperbaiki pakai
optional chaining/null-check (pola sama yang sudah dipakai luas di file
itu) — SEBELUM HTML dihapus, supaya `checkBackup()`/`runFullBackup()`
tidak crash begitu elemennya hilang. Entry mati `dash-laporan-mini`
(target `page:'dashboard'`) dihapus dari `FEATURE_REGISTRY`
(`modules/dashboard-hub/dashboard-hub-registry.js`) — padanan live-nya
sudah ada (`keu-saldo-akun`/`keu-grafik` di bawah section `keuangan`).
Tombol "Saldo Akun" di kartu Kekayaan Bersih (`app_production.html`)
diperbaiki dari `showPage('dashboard', ...)` ke
`showPage('dashboard-hub', ...)` (nav index 0 sama persis). Baru setelah
semua pintu nyasar & null-guard beres, blok HTML `#page-dashboard`
(baris 202–325) dihapus fisik, `index.html` disinkronkan (sekarang
identik `app_production.html`, terverifikasi `diff`). Build
`kw138-batch-breadcrumb-navigasi-page-dashboard-cleanup` (`?v=562`),
kedua bundle lolos `node --check`. **Catatan skop test**: ZIP kerja sesi
ini hanya membawa 4 file test (`tests/tagihan-kalender.test.js`,
`tests/data-archive.test.js`, `tests/eie-registry.test.js`,
`tests/lifeos-link-registry.test.js` — 52/52 pass, 2x sebelum & sesudah
build), BUKAN full suite ribuan test yang disebut riwayat sesi
sebelumnya di file ini — cakupan regresi otomatis sesi ini terbatas ke
4 file itu saja; verifikasi tambahan dilakukan manual (grep menyeluruh
memastikan 0 sisa referensi ke `id="page-dashboard"`/`dashBillCard`/
`dIncome`/`dExpense`/`dBalance`/`dShop`/`recentTx`/`dashAccList`/dst di
HTML setelah blok dihapus).

**Belum/di luar scope sesi ini**: modal `qsDashboard` ("⚙️ Aksi Cepat")
sekarang ORPHAN — satu-satunya tombol pemicunya ada di dalam blok
`#page-dashboard` yang baru dihapus, jadi tidak ada lagi cara membuka
modal ini dari UI manapun. Modal TIDAK makan biaya render selama tidak
dibuka (bukan bug aktif), tapi worth dibersihkan (hapus HTML modal +
referensi terkait) di sesi lanjutan kalau mau benar-benar tuntas.

Sesi 138 lanjutan (2026-07-22) — **Cleanup modal orphan `qsDashboard`.**
Konfirmasi user ("Lanjutkan"): tuntaskan catatan "belum selesai" dari
bagian pertama sesi ini. Diverifikasi dulu (bukan diasumsikan) bahwa
`qsDashboard` benar-benar 100% orphan — grep menyeluruh ke seluruh
`app_production.html` (HTML) & semua file `*.js` (JS) memastikan tidak
ada `data-action="openQS" data-args='["qsDashboard"]'` maupun
`openQS('qsDashboard')` terprogram tersisa di mana pun (beda dari
`qsBillActions` yang polanya mirip tapi TERNYATA masih dipanggil
programatik dari `tagihan-kalender.js` — jadi TIDAK ikut dihapus).
Ditemukan 1 titik tambahan yang akan crash kalau modalnya dihapus tanpa
diperbaiki dulu: `self-test.js` `EXTRA_MODAL_SWEEP_SPECS` masih punya
entry smoke-test `{fn:'openQS',args:['qsDashboard'],...}` — dihapus
duluan SEBELUM HTML-nya, pola yang sama dengan urutan null-guard
`backupBanner` sebelum HTML dihapus di bagian pertama sesi ini. Setelah
itu blok HTML `qs-modal-overlay#qsDashboard` (komentar "QUICK SETTINGS:
DASHBOARD" + isi modal, ~39 baris) dihapus fisik dari
`app_production.html`, `index.html` disinkronkan ulang. Build
`kw138-batch2-qsdashboard-orphan-modal-cleanup` (`?v=563`), regression
52/52 pass (2x, sebelum & sesudah build), kedua bundle lolos
`node --check`, `index.html`==`app_production.html` terverifikasi.
**Catatan**: aksi-aksi di dalam modal ini (+Pemasukan/+Pengeluaran/
Transfer/Jual Shop/Worth It/+Tagihan/+Target/+Akun/Backup/Kalkulator
Gaji/Absensi Harian) semuanya TETAP bisa diakses lewat entry point lain
yang sudah ada di app (tombol nav bawah, tab masing-masing fitur,
Pengaturan) — yang hilang murni satu shortcut menu, bukan fungsinya.

Sebelumnya Sesi 121 (2026-07-21) — Bugfix: Kartu "Tangga Ternak Uang" macet di
"Menghitung..." (dilaporkan user, screenshot). SELESAI PENUH.
**Root cause**: `page-dashboard-hub` adalah landing page DEFAULT (statis
`class="page active"` di HTML), jadi boot lewat
`showMain()->refreshCurrentPage()->renderPageContent()`, BUKAN
`showPage()`. `tangga-keuangan.js` sebelumnya HANYA render lewat wrap
`window.showPage` sendiri + fallback `setTimeout(450ms)` di window
'load' — keduanya tidak pernah tersentuh (atau kalah race lawan
`await load()`) di boot pertama, jadi kartu bisa macet permanen. Pola
gap SAMA PERSIS DecisionCenterHome (S118). **Fix (1 baris + cleanup)**:
`TanggaKeuangan.render()` disambungkan ke blok "DASHBOARD HUB — LIVE
WIRING" di `renderDashboard()` (modules/shared/modules-render.js) —
titik yang sama dipakai 20+ presenter Dashboard Hub lain, dipanggil
LANGSUNG-sinkron dari `showMain()` setelah data siap + tiap `save()` di
seluruh app. Wrap `window.showPage`/`setTimeout` lama di
`tangga-keuangan.js` DIHAPUS (superseded, sumber race-nya). 0 perubahan
di `compute()`/`render()` TanggaKeuangan sendiri. Test
`dashboard-hub-live-wiring.test.js` diperluas (5→6 widget terkunci).
Regression 3328/3328 pass (2x), build
`kw121-batch14-tangga-keuangan-boot-render-fix` (?v=538), kedua bundle
lolos node --check, index.html==app_production.html, ZIP dibuat &
tervalidasi.

Sebelumnya Sesi 120 (2026-07-21) — Batch 13 Final Integration & Release (PENUTUP).
SELESAI PENUH: audit akhir 0 blocker kritis, regression 3328/3328 pass
(2x), build `kw120-batch13-final-integration-release` (?v=537), kedua
bundle lolos node --check, index.html==app_production.html, FILE-MAP
ter-update otomatis, ZIP rilis dibuat & tervalidasi. **Batch 13 DITUTUP
RESMI.**

Sebelumnya Sesi 119 (2026-07-21) — Release Candidate Validation (Batch 13).
SELESAI PENUH: 13-item checklist audit dijalankan, 0 bug perilaku
ditemukan, 1 gap test-coverage ditutup (actionQueueChatContext, +6
test), regression 3328/3328 pass (2x), build
`kw119-batch13-release-candidate-validation` (?v=536), ZIP dibuat &
tervalidasi. Batch 13 dinyatakan SIAP RILIS.

Sebelumnya Sesi 118 (2026-07-21) — Cross Module Integration Hardening (Batch 13).
SELESAI PENUH: audit modules/cross/* + DashboardHub + ai-chat.js
menemukan 1 gap wiring (DecisionCenterHome tidak live di
renderDashboard()), diperbaiki 1 baris (100% reuse), +4 test baru
(tests/cross-module-integration-hardening.test.js), regression
3322/3322 pass (2x), build `kw118-batch13-cross-module-integration-
hardening` (?v=535), ZIP dibuat & tervalidasi.

Sebelumnya Sesi 84 (2026-07-20) — Vehicle Dashboard Final Integration (Batch 7).
SELESAI PENUH (implementasi/test/regression/build/ZIP di pesan
pertama, dokumentasi lengkap di kelanjutan sesi ini — sama sesi
logis, 2 pesan, pola sama Sesi 78).

## Current Step

Sesi 138 selesai penuh — ZIP rilis sudah dibuat & diverifikasi
(`unzip -t`), ringkasan & link ditampilkan ke user. STOP (menunggu user
pilih: lanjut bersihkan modal `qsDashboard` orphan, atau target lain).

## Files Changed (Sesi 138, lanjutan — qsDashboard cleanup)

- `self-test.js` — entry `qsDashboard` dihapus dari
  `EXTRA_MODAL_SWEEP_SPECS`.
- `app_production.html` — blok modal `qs-modal-overlay#qsDashboard`
  (~39 baris) dihapus.
- `index.html` — disinkronkan (identik `app_production.html`).
- Hasil build (`?v=563`): `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `sw.js`, `docs/FILE-MAP.md`, konstanta versi di 6 file source.
- **TIDAK diubah:** `openQS`/`closeQS` (generic, masih dipakai 6 modal
  QS lain), `qsBillActions` (dikonfirmasi masih dipanggil programatik
  dari `tagihan-kalender.js`, BUKAN orphan).

## Files Changed (Sesi 138)

- `modules/shared/modules-render.js` — `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`
  dipangkas 17→4, guard `page-dashboard`→`page-dashboard-hub` (2 titik),
  `renderDashboard()` dibersihkan dari tulis-ke-elemen-mati (6 baris).
- `modules/shared/backup-restore.js` — 4 titik `backupBanner`/
  `lastBackupDate` di-null-guard.
- `modules/dashboard-hub/dashboard-hub-registry.js` — entry
  `dash-laporan-mini` dihapus.
- `app_production.html` — tombol Saldo Akun retarget `dashboard-hub`,
  blok `#page-dashboard` (202 baris) dihapus.
- `index.html` — disinkronkan (identik `app_production.html`).
- Hasil build (`?v=562`): `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `sw.js`, `docs/FILE-MAP.md`, konstanta versi di 6 file source.
- `docs/CHECKPOINT.md` (file ini) — sinkronisasi dokumentasi.
- **TIDAK diubah:** modal `qsDashboard` (HTML-nya, di luar scope —
  lihat catatan orphan di atas), `styles.css`, seluruh isi
  `#page-dashboard-hub` selain 1 tombol Saldo Akun.

## Test

`node --test tests/*.test.js` (4 file test yang tersedia di ZIP kerja
ini) -> **52/52 pass, 0 fail** (2x — sebelum & sesudah build).

## Build

`node scripts/build.js kw138-batch-breadcrumb-navigasi-page-dashboard-cleanup`
-> sukses, `?v=562`. Bundle TANPA minifikasi (esbuild tidak tersedia di
sandbox, fallback otomatis).

## ZIP

`kw_release_sesi138_breadcrumb-navigasi-3lapis_v562.zip` — dibuat &
diverifikasi `unzip -t` ("No errors detected in compressed data").

## Completed

- [x] Keputusan produk FINAL eksplisit user: lanjutan Batch 7 setelah
  Vehicle Automation Foundation (Sesi 83) — target "Vehicle Dashboard
  Final Integration", diinterpretasikan sbg menutup gap eksplisit yang
  dicatat Sesi 83: wiring Service Reminder & Fuel Reminder
  (`VehicleReminder`, Sesi 78) ke notifikasi browser NYATA.
- [x] File baru `modules/vehicle/vehicle-notif-bridge.js`
  (`VehicleNotifBridge`): `items(vehicleId?, firedIds?)` — 100% reuse
  `VehicleReminder.serviceReminders()`/`.fuelReminders()`, HANYA
  severity `'overdue'`, hasil `{fireKey,title,body}`, difilter
  `firedIds`. `taxReminders()` SENGAJA TIDAK disertakan (jalur ad-hoc
  lama sudah menembak notif pajak).
- [x] `reminder-notif.js` `checkAndFireReminders()` — 1 blok baru
  (guard `typeof VehicleNotifBridge`) menembak `fireNotif()` per item
  & push `fireKey` ke `fired.ids`, ditambahkan sebelum
  `localStorage.setItem('kw_notif_fired'...)`.
- [x] `scripts/build.js` — GROUP_B nambah
  `modules/vehicle/vehicle-notif-bridge.js`, setelah
  `vehicle-reminder.js`, sebelum `vehicle-ai-hook.js`.
- [x] `tests/vehicle-notif-bridge.test.js` (BARU, 10 test) — items()
  kosong (VehicleReminder belum dimuat), service overdue, service
  due-soon (tidak ditembak), fuel overdue, fuel info/due-soon (tidak
  ditembak), gabungan service+fuel lintas kendaraan, dedupe firedIds,
  firedIds bukan array (guard), vehicleId diteruskan apa adanya,
  taxReminders TIDAK pernah dipanggil bridge.
- [x] `node --test tests/*.test.js` (full suite, sebelum build) ->
  2826/2826 pass (naik dari 2816) — 2 assersi awal sempat gagal (array
  cross-realm sandbox vm), diperbaiki pakai `.length===0`/
  `Array.from()`.
- [x] `node scripts/build.js kw84-batch7-vehicle-dashboard-final-integration`
  -> sukses, `?v=508` (naik dari `?v=507`).
- [x] Full test suite diulang setelah build -> tetap 2826/2826 pass.
- [x] ZIP release dibuat & diverifikasi (`unzip -t` — "No errors
  detected in compressed data").
- [x] Dokumentasi disinkronkan: `docs/CLAUDE.md`,
  `docs/PROJECT_STATE.md`, `docs/NEXT_SESSION.md`,
  `docs/BATCH_PLAN.md`, `CHANGELOG.md` (+ catatan gap Sesi 77-83 yang
  ditemukan di `CHANGELOG.md` saat sesi ini, ditandai transparan bukan
  diisi retroaktif penuh — di luar scope sesi ini), `docs/CHECKPOINT.md`
  (file ini).

## Current Step

Sesi selesai penuh — menampilkan ringkasan & link ZIP ke user, lalu
STOP (menunggu user pilih target lanjutan Batch 7).

## Remaining

- [ ] STOP — tunggu user pilih target lanjutan Batch 7 (lihat
  `docs/NEXT_SESSION.md` § "Target berikutnya": wiring
  `VehicleAIHook`/`FinanceDashboard.getAIHook()` ke AI Daily
  Briefing/`ai-chat.js`, builder/filter picker
  `financeAccount`/`financeCategory`, chart/grafik visual utk
  `VehicleTrendAPI.monthlyCostTrend()`, wiring `VehicleDecisionAPI`/
  `VehicleRecommendationEngine` ke AI briefing/chat, insight-level
  Priority Scoring, Plugin Marketplace, atau kind Life Object baru
  selain `generic`/`ref` — semua butuh keputusan produk dulu, jangan
  ditebak).
- [ ] (Opsional, di luar scope sesi ini) Backfill retroaktif entri
  Sesi 77-83 di `CHANGELOG.md` kalau user minta sesi dokumentasi-sinkronisasi
  terpisah — detail lengkap sudah ada di `docs/BATCH_PLAN.md`.

## Files Changed (Sesi 84)

- `modules/vehicle/vehicle-notif-bridge.js` — file BARU
  (`VehicleNotifBridge`).
- `reminder-notif.js` — `checkAndFireReminders()` +1 blok wiring.
- `scripts/build.js` — GROUP_B +1 entry.
- `tests/vehicle-notif-bridge.test.js` — file test BARU, 10 test.
- Hasil build (`?v=508`): `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md`, +
  konstanta versi di 6 file source (sinkronisasi otomatis `build.js`).
- `docs/CLAUDE.md`, `docs/PROJECT_STATE.md`, `docs/NEXT_SESSION.md`,
  `docs/BATCH_PLAN.md`, `CHANGELOG.md`, `docs/CHECKPOINT.md` —
  sinkronisasi dokumentasi.
- **TIDAK diubah:** `modules/vehicle/vehicle-reminder.js` (Sesi 78,
  dipakai apa adanya lewat `serviceReminders()`/`fuelReminders()` — 0
  perubahan diperlukan), blok pajak kendaraan (`VEHTAX_ITEMS`) di
  `reminder-notif.js` (jalur lama, tidak disentuh). `styles.css`,
  `index.html`/`app_production.html`, `modules/dashboard-hub/*` — 0
  perubahan (TIDAK ada UI/panel/dashboard card baru sesi ini, murni
  wiring service-ke-notifikasi).

## Test

`node --test tests/*.test.js` -> **2826/2826 pass, 0 fail** (naik dari
2816 sebelum sesi ini).

## Build

`node scripts/build.js kw84-batch7-vehicle-dashboard-final-integration`
-> sukses, `?v=508`. Bundle TANPA minifikasi (esbuild tidak tersedia di
sandbox, fallback otomatis — sama seperti sesi-sesi sebelumnya).

## ZIP

`kw_release_sesi84_vehicle-dashboard-final-integration_v508.zip` —
dibuat & diverifikasi `unzip -t` ("No errors detected in compressed
data").

---

## Checkpoint — Sesi 157 (2026-07-23): Split Nav Car Notes jadi 4 Tab

**Selesai:** `#page-carnotes` dipecah jadi 4 `cn-tabs` (🧠 Insight AI /
⛽ BBM / 🔧 Servis / 🚦 Pajak & SIM), pola sama persis `setKeuanganTab`.
Vehicle selector + Odometer tetap di luar tab (multi-vehicle utuh).
Detail lengkap: `docs/CLAUDE.md` § Sesi 157.

**Hasil build (`?v=597`, `kw157-mobil-nav-split-tab`):**
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`, + konstanta versi
di 5 file source (sinkronisasi otomatis `build.js`).

**TIDAK diubah:** semua presenter/engine vehicle & fuel (0 rumus/render
baru — murni reorganisasi DOM `index.html` + `setCnTab()` di
`vehicle-core.js`). Tidak ada file test baru (murni DOM, existing test
sudah cukup).

## Test

`node --test tests/*.test.js` -> **381/381 pass, 0 fail**.

## Build

`node scripts/build.js kw157-mobil-nav-split-tab` -> sukses, `?v=597`.

## ZIP

`kw_release_sesi157_mobil_nav_split_tab_v597.zip` — dibuat & dikirim ke
user.

---

## Checkpoint — Sesi 158 (2026-07-23): Bugfix 6 card bocor di semua tab Dashboard Hub

**Selesai:** `SECTION_GROUPS.insight` (`dashboard-hub.js`) ditambah 6 id
(`propertyManagementWrap`/`rentalManagementWrap`/`assetPortfolioWrap`/
`assetMaintenanceWrap`/`recommendationPanelWrap`/`actionQueueWrap`) yang
sebelumnya tidak terdaftar & selalu tampil di semua tab. Detail lengkap:
`docs/CLAUDE.md` § Sesi 158.

**Hasil build (`?v=598`, `kw158-dashboard-hub-section-groups-fix`):**
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
`keluarga-w-preview.html` (regenerasi), + konstanta versi di 5 file
source.

## Test

`node --test tests/*.test.js` -> **381/381 pass, 0 fail**.

## Build

`node scripts/build.js kw158-dashboard-hub-section-groups-fix` -> sukses, `?v=598`.

## ZIP

`kw_release_sesi158_dashboard_hub_section_groups_fix_v598.zip` — dibuat & dikirim ke user.

---

## Checkpoint — Sesi 164b (2026-07-23): Cek status "kategori punya field generik" + implementasi SIM

**Konteks:** User minta cek ulang 5 tempat yang disebut masih generik
(Akun/Jenis Akun, Kelola Kendaraan, SIM, Utang & Piutang, Worth It?) —
ternyata #1 (Akun→Jenis Akun) sudah selesai dikerjakan sesi ini (lihat
`accJenisFieldsWrap`, `onAccJenisChange()` di `modules/finance/akun.js`)
dan #4 (Utang, bukan Piutang) sudah selesai di sesi KW-163 sebelumnya
(`Debt.JENIS_DEFAULTS`/`Debt.onJenisChange()` di
`modules/finance/piutang-utang.js`). Sisa yang belum: #2 Kelola
Kendaraan (belum ada dropdown Jenis Kendaraan sama sekali), #3 SIM
(dropdown ada tapi tanpa default masa berlaku/estimasi biaya), #5 Worth
It? (kategori cuma label, tanpa pertanyaan tambahan beda per kategori).

**Dikerjakan sesi ini:** #3 SIM — `SIM_JENIS_DEFAULTS` (estimasi biaya
perpanjangan per jenis, angka umum PNBP Indonesia) +
`SIM_MASA_BERLAKU_TAHUN=5` + `onSimJenisChange()` di
`modules/vehicle/vehicle-core.js`, dipanggil dari `onchange` dropdown
`simJenis` (`modules/shared/modals.js`) dan otomatis saat buka modal SIM
baru (`openSimModal()`). Field kosong saja yang diisi otomatis (tidak
menimpa input manual/edit). Bonus bugfix: `simBiaya` sebelumnya TIDAK
PERNAH disimpan ke `D.simList` di `saveSim()` (field dibaca ke UI tapi
hilang tiap save) — sekarang ikut disimpan.

**Belum dikerjakan (untuk sesi berikutnya):** #2 Kelola Kendaraan (butuh
dropdown Jenis Kendaraan: motor/mobil/listrik, field beda per jenis —
mobil: oli mesin+transmisi terpisah, listrik: kapasitas baterai bukan
interval KM) dan #5 Worth It? (pertanyaan tambahan per kategori
Kebutuhan/Keinginan).

## Test

`node --test tests/*.test.js` -> **392/392 pass, 0 fail** (baseline lama
tanpa test baru khusus SIM — belum ditambahkan test unit terpisah).

## Build

`node scripts/build.js kw164-sim-jenis-fields-616` -> sukses, `?v=615`.

## ZIP

`kw_release_sesi164b_sim_jenis_fields_v616.zip` — dibuat & dikirim ke user.

---

## Checkpoint — Sesi 165 (2026-07-23): #2 Kelola Kendaraan — dropdown Jenis
Kendaraan (implementasi ringkas 1 dari 2 sisa item "masih generik")

**Konteks:** Lanjutan sisa dari Sesi 164b — user minta kerjakan salah satu
dari #2 Kelola Kendaraan / #5 Worth It? secara ringkas. Dipilih #2.

**Dikerjakan sesi ini:** Modal Kelola Kendaraan (`vehicleModal` di
`modules/shared/modals.js`) sekarang punya dropdown **Jenis Kendaraan**
(motor/mobil/listrik) yang mengganti field di bawahnya secara dinamis
(pola sama persis `onAccJenisChange()`/`accJenisFieldsWrap` di
`modules/finance/akun.js`):
- **Motor** (default) — 1 field interval servis (KM), sama seperti perilaku
  lama.
- **Mobil** — 2 field terpisah: Interval Servis Oli Mesin (KM, default
  5000) & Interval Servis Oli Transmisi (KM) — oli mesin tetap disimpan ke
  `v.serviceIntervalKm` (dipakai reminder servis existing), oli transmisi
  field baru `v.oliTransmisiIntervalKm`.
- **Listrik** — field interval KM DIGANTI Kapasitas Baterai (kWh), field
  baru `v.batteryCapacityKwh`; `v.serviceIntervalKm` diset 0 (kendaraan
  listrik tidak ganti oli).

Implementasi: `vehJenisFieldsHtml(jenis,v)` (pure, render HTML field per
jenis) + `onVehJenisChange()` (wiring DOM, dipanggil dari `onchange`
dropdown & dari `openVehicleModal()`/`editVehicle()`) + `vehMetaText(v)`
(pure, teks ringkasan di daftar Kelola Kendaraan — dipakai
`renderVehicleManageList()` di `modules-render.js`, gantikan teks statis
"Interval servis: X km" yang dulu sama utk semua jenis) — semuanya di
`modules/vehicle/vehicle-core.js`. Kendaraan lama tanpa field `jenis`
default ke `'motor'` (backward compatible, tidak ada migrasi data
diperlukan). 8 test baru `tests/vehicle-jenis.test.js` (pola sama
`tests/debt-jenis.test.js` — hanya fungsi murni yang dites, bukan
DOM/modal wiring).

**Belum dikerjakan (untuk sesi berikutnya):** #5 Worth It? (pertanyaan
tambahan per kategori Kebutuhan/Keinginan — field `wiCategory`/`wlCategory`
di `worthItModal` masih cuma dropdown polos tanpa pertanyaan lanjutan beda
per kategori).

## Test

`node --test tests/*.test.js` -> **403/403 pass, 0 fail** (naik dari 392 —
11 test baru `tests/vehicle-jenis.test.js`).

## Build

`node scripts/build.js kw165-vehicle-jenis-fields` -> sukses, `?v=616`.

## ZIP

`kw_release_sesi165_vehicle_jenis_fields_v616.zip` — dibuat & dikirim ke
user.

---

## Checkpoint — Sesi 165b (2026-07-23): #5 Worth It? — pertanyaan tambahan
per kategori Kebutuhan/Keinginan (item terakhir dari "masih generik")

**Konteks:** Lanjutan sisa Sesi 165 — user minta kerjakan sisa item #5
Worth It? secara ringkas.

**Dikerjakan sesi ini:** Dropdown Kategori di `worthItModal` (baik tab 🔍
Cek 1 Barang `wiCategory` maupun tab 📋 Prioritas Belanja `wlCategory`)
sekarang punya pertanyaan lanjutan yang berubah sesuai kategori dipilih
(pola sama persis `onVehJenisChange()`/`vehJenisFieldsHtml()` di
`modules/vehicle/vehicle-core.js`):
- **Kebutuhan** — dropdown "Alasan Kebutuhan": rusak/tidak berfungsi, habis
  & perlu restock, belum pernah punya (tapi memang perlu), atau
  wajib/keharusan.
- **Keinginan** — dropdown "Sudah Kepikiran Sejak Kapan?": baru
  lihat/kepikiran, beberapa hari terakhir, atau sudah lama diincar.

Implementasi: `WorthIt.CAT_FIELDS` (config per kategori) +
`WorthIt.catFieldsHtml(cat,prefix,val)` (pure, render HTML opsi) +
`WorthIt.onCategoryChange(prefix,presetVal)` (wiring DOM, dipanggil dari
`onchange` dropdown `wiCategory`/`wlCategory` & saat modal dibuka/edit) +
`WorthIt.readCatExtra(cat,prefix)` (baca jawabannya saat submit) — semua di
`modules/finance/worthit.js`. Jawabannya dipakai buat:
- Tab single (`WorthIt.hitung()`): menambah/mengganti baris hasil cek
  sesuai jawaban (mis. "baru lihat" → peringatan lebih tegas soal
  impulsif; "sudah lama diincar" → aturan tunggu 3 hari dianggap lewat).
- Tab list (`WorthIt.computeScore()`): ikut menggeser skor prioritas
  (mis. "belum pernah punya" dapat skor kebutuhan lebih rendah dari
  kebutuhan yang jelas rusak/habis/wajib).

Field baru (`catExtra`) disimpan di tiap item `D.wishlist` — backward
compatible, item lama tanpa field ini tetap jalan normal (`readCatExtra`
return `null`, tidak dipakai di scoring). 6 test baru
`tests/worthit-jenis.test.js` (pola sama `tests/vehicle-jenis.test.js` —
hanya `WorthIt.catFieldsHtml()` yang dites, bukan DOM/modal wiring).

## Test

`node --test tests/*.test.js` -> **409/409 pass, 0 fail** (naik dari 403 —
6 test baru `tests/worthit-jenis.test.js`).

## Build

`node scripts/build.js kw165-worthit-kategori-fields` -> sukses, `?v=617`.

## ZIP

`kw_release_sesi165b_worthit_kategori_fields_v617.zip` — dibuat & dikirim
ke user.

## Checkpoint — Sesi 267 (2026-07-26): Kasir AI — parity Alamat/Delivered/DP dgn Order

Audit ditemukan Kasir AI (`modules/business/kasir.js`) kirim 3 field lebih
sedikit dari Order manual: `address` selalu hardcode `''`, `delivered`
selalu hardcode `true`, dan tidak ada dukungan DP/Piutang. `recordShopSale()`
sendiri sudah generik (terima ketiganya) — gapnya murni di layar Kasir.

Fix (additif, 0 baris Order/`recordShopSale()` diubah):
- Tambah field Alamat (`kasirCustAddr`), toggle "Sudah diserahkan"
  (`kasirDelivered` + `Kasir.toggleDeliveredField()`), dan field DP
  (`kasirDP`) di `index.html` (kasir-cart-fields).
- `Kasir._checkoutInner()`: teruskan address & delivered ke
  `recordShopSale()`; logic DP→Piutang (hitung sisa, `D.transactions.amount
  = dp`, buat `D.piutang` kalau sisa>0) **diduplikasi** dari
  `Order._saveInner()` (opsi A — user pilih ini di atas opsi ekstrak
  helper bersama, krn Kasir tidak pernah edit entri lama jadi tidak perlu
  logic reconciliation `piutangLinkId`).
- `Kasir.reset()` ikut clear 3 field baru.

## Test

`node --test tests/*.test.js` -> **1369/1369 pass, 0 fail** (tidak ada test
baru ditambahkan — perubahan murni wiring UI, dicek manual lewat build+lint).

## Build

`node scripts/build.js kasir-audit-address-delivered-dp` -> sukses, `?v=784`.

## ZIP

`kw_release_kasir-audit-address-delivered-dp_v784.zip` — dibuat & dikirim
ke user.

---

## Checkpoint — Sesi 320 (2026-07-28): Sewa Kios — Status Kosong/Disewa jadi dinamis

**Konteks:** Audit ulang "field mana lagi yang masih generik" (lanjutan pola
Sesi 164b–165b: Akun/Kendaraan/SIM/Utang/Worth It). Ditemukan 1 gap baru:
dropdown Status (`skStatus`) di modal Kelola Unit Kios (`sewaKiosUnitModal`)
tidak punya `onchange` sama sekali — field "Nama Penyewa" selalu tampil
walau status masih "Kosong" (belum ada penyewa).

**Dikerjakan sesi ini:** `SewaKios.onStatusChange()` (pola sama persis
`onVehJenisChange()`/`onSimJenisChange()` di
`modules/vehicle/vehicle-core.js`) — toggle `u-dnone` pada
`skPenyewaWrap` (fg wrap baru yang membungkus field `skPenyewa`,
`modules/shared/modals.js`): status **Disewa** -> field Nama Penyewa
tampil, status **Kosong** -> disembunyikan. Dipanggil dari `onchange`
dropdown `skStatus` & sekali saat modal dibuka (`openUnitModal()`,
`modules/business/sewakios.js`) supaya konsisten baik saat Tambah Unit
maupun Edit Unit. Data `penyewa` tetap tersimpan apa adanya (tidak ada
perubahan skema) — cuma visibility field yang berubah, jadi tidak ada
migrasi data diperlukan.

## Test

`node --test tests/*.test.js` -> **1629/1629 pass, 0 fail** (tidak ada test
baru — perubahan murni wiring UI/visibility, sama pola dgn Sesi 267).

## Build

`node scripts/build.js kw320-sewakios-status-dinamis` -> sukses, `?v=833`.

## ZIP

`kw_release_sesi320_sewakios-status-dinamis_v833.zip` — dibuat & dikirim
ke user.

---

## Checkpoint — Sesi 321 (2026-07-28): Dana Titipan Aset — label/placeholder Nama jadi dinamis

**Konteks:** Lanjutan audit "field generik" — kandidat #2 yang sebelumnya
ditandai "minor, perlu konfirmasi": dropdown "Dana Titipan Dari"
(`assetTitipanOwnerType`, modal Aset) sudah punya 3 pilihan
(Investor/Keluarga/Lainnya) tapi label & placeholder field Nama di
sebelahnya statis ("Nama (opsional)" / "Pak Budi, dll") sama utk ketiganya.

**Dikerjakan sesi ini:** `Aset.TITIPAN_OWNER_LABELS` (config per tipe) +
`Aset.onTitipanOwnerTypeChange()` — pola sama persis
`Debt.JENIS_DEFAULTS`/`Debt.onJenisChange()`
(`modules/finance/piutang-utang.js`). Label & placeholder field Nama
sekarang berubah sesuai tipe dipilih: Investor -> "Nama Investor" ("Pak
Budi, PT Modal Jaya, dll"), Keluarga -> "Nama Anggota Keluarga" ("Kakak,
Ibu, Om Budi, dll"), Lainnya -> "Nama/Keterangan" ("Koperasi, teman, dll").
Dipanggil dari `onchange` dropdown, dari `Aset.toggleTitipan()` (saat
toggle Dana Titipan dinyalakan), & sekali saat modal Aset dibuka
(`openModal()`) supaya konsisten saat Tambah/Edit. Murni UI copy — TIDAK
ada field/skema data baru (`titipanOwnerName` tetap 1 field yang sama),
jadi tidak ada migrasi data diperlukan.

## Test

`node --test tests/*.test.js` -> **1629/1629 pass, 0 fail** (tidak ada test
baru — perubahan murni UI label/placeholder, sama pola dgn Sesi 320).

## Build

`node scripts/build.js kw321-danatitipan-label-dinamis` -> sukses, `?v=834`.

## ZIP

`kw_release_sesi321_danatitipan-label-dinamis_v834.zip` — dibuat & dikirim
ke user.

---

## Checkpoint — Sesi 322 (2026-07-28): Sewa Kios — Harga Sewa/Bulan ikut disembunyikan saat Kosong

**Konteks:** User minta pastikan field "Harga Sewa / Bulan" (bukan cuma
"Nama Penyewa") juga ikut mengikuti status Kosong/Disewa — sebelumnya di
Sesi 320 cuma `skPenyewaWrap` yang ditoggle, `skHarga` masih selalu tampil.

**Dikerjakan sesi ini:** `skHarga` sekarang dibungkus `skHargaWrap`
(`modules/shared/modals.js`), ikut ditoggle bareng `skPenyewaWrap` di
`SewaKios.onStatusChange()` (`modules/business/sewakios.js`) — status
**Disewa** -> Nama Penyewa & Harga Sewa/Bulan sama-sama tampil, status
**Kosong** -> keduanya disembunyikan. Data `hargaSewaBulanan` tetap
tersimpan apa adanya kalau sebelumnya sudah diisi (cuma visibility field
yang berubah, bukan value-nya) — jadi kalau unit balik status ke Disewa
lagi, harga lama masih ada.

## Test

`node --test tests/*.test.js` -> **1629/1629 pass, 0 fail**.

## Build

`node scripts/build.js kw322-sewakios-harga-dinamis` -> sukses, `?v=835`.

## ZIP

`kw_release_sesi322_sewakios-harga-dinamis_v835.zip` — dibuat & dikirim ke
user.
