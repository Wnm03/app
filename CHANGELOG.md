# Changelog — Sesi Res-D (Owner Resolver: Regression & Release, v1307)

## Konteks
Penutup rantai `DESIGN-LOCK-LINKED-ASSET-ACCOUNT-OWNER-DEFAULT.md`:
Res-A (design lock) → Res-B (`resolveOwnerDefaultForAccount()` +
`getAccOwnersEffective()`, data-layer) → Res-C (integrasi UI
`updateTxDeductionOwnerVisibility()`) → **Res-D** (sesi ini): regresi
penuh & release. 0 file source produksi diedit sesi ini.

## Hasil
- Full `npm test`: **4066 test, 4057 pass, 9 fail** — identik
  sebelum/sesudah `node scripts/build.js`. Ke-9 kegagalan diaudit satu
  per satu: semuanya pre-existing (domain `data-health-check.js` self-link
  S559, `s551` investment-nominal stale test yang sudah didokumentasikan
  utk di-retire, `s574` filter-tx-owner-split legacy) — 0 terkait Owner
  Resolver.
- Invariant wajib (`recalcAccBalance()`, `DanaTitipanPortfolioAPI.build()`,
  `titipanCommitments`, pemisahan `deductionOwnerId`/`ownerPorsiId`) — md5
  identik sebelum/sesudah build, 0 disentuh.
- Build: `s576-pemilik-sumber-potongan-visibility` → `s577-res-d-regression-release`,
  v1306 → v1307. `verify-bundle-freshness`/`verify-window-expose` OK.
  `verify-release-ready` LOLOS (gate lint/minify di-override manual,
  alasan sandbox tanpa akses jaringan, sama seperti S508–S576).
- Detail lengkap: `RES-D-IMPLEMENTATION-REPORT.md`, `FILES-CHANGED-RES-D.md`.

## Status
**RELEASE COMPLETE.**

---

# Changelog — Sesi 516 (BUG-S516-001: Owner Picker Dana Titipan — Fix Escaping ownerId)

## Konteks
Laporan user: modal "💰 Pokok Dana Titipan" kadang gagal simpan dgn error
"Owner tidak ditemukan..." walau owner jelas ada di dropdown. Audit statis
awal (baca `listExistingOwners()`/`saveCommitment()`/`recordReturn()` +
3 sumber ownerId) SALAH menyimpulkan race condition/bundle basi — semua
fungsi itu 100% konsisten kalau dibaca terpisah. Root cause sebenarnya ada
di lapisan yang terlewat: `DanaTitipanCommitmentUI.open()`, tempat
dropdown benar-benar dirender ke DOM.

## Root Cause
`open()` menyuntik `o.ownerId` MENTAH (tanpa `escapeHtml`) ke atribut HTML
`<option value="${o.ownerId}">` lewat `innerHTML` — cuma `o.ownerName` yg
di-escape di baris yg sama. `ownerId` yg memuat `"` merusak atribut HTML
di tengah jalan -> `sel.value` terbaca TERPOTONG, beda dari `ownerId` asli
-> validasi `saveCommitment()`/`recordReturn()` gagal cocokkan ke
`listExistingOwners()` -> error "Owner tidak ditemukan..." walau owner
aslinya valid. Dua tombol per-owner (`data-args='["${o.ownerId}"]'`) punya
lubang sama utk karakter `'`.

## Perubahan
- `modules/finance/dana-titipan-portfolio-presenter.js`:
  - `DanaTitipanCommitmentUI.open()` — `value="${o.ownerId}"` ->
    `value="${escapeHtml(o.ownerId)}"`.
  - `render()` (2 tombol per-owner) — `data-args='["${o.ownerId}"]'` ->
    `data-args="${escapeHtml(JSON.stringify([o.ownerId]))}"` (pola SUDAH
    established di file yg sama, `Aset.openOwnersModalById`).
- `tests/s516-dana-titipan-commitment-ownerid-escaping.test.js` (BARU,
  2 test, dgn `escapeHtml` ASLI bukan stub — dikonfirmasi FAIL thd kode
  sblm fix, PASS stlh fix).
- `tests/s485d-titipan-commitment-ui.test.js` — 2 assertion lama diupdate
  mengikuti format `data-args` baru yg ter-escape.

Detail lengkap: `FIX-v1249-to-v1250-s516-titipan-commitment-ownerid-escape.md`,
`docs/BUG_REGISTRY.md` (`BUG-S516-001`).

## Verifikasi
- `node --test tests/*.test.js` -> **3374/3374 lolos, 0 gagal** (3372
  baseline + 2 baru).
- `node scripts/build.js` -> `v1249/s515-...` -> `v1250/s516-...`, sintaks
  bundle lolos `node --check`.
- `node scripts/verify-bundle-freshness.js` / `verify-window-expose.js` ->
  OK.
- `node scripts/verify-release-ready.js` -> LOLOS (gate `lint`/`minify`
  di-override manual — eslint/esbuild tidak bisa diinstall di sandbox
  tanpa akses jaringan, konsisten pola sesi sebelumnya).

## HARD RULE — isolasi sentuhan
0 sentuhan ke `listExistingOwners()`/`saveCommitment()`/`recordReturn()`
(logic-nya sudah benar sejak awal). 0 sentuhan ke `ownership-engine.js`,
`multi-owner-engine.js`, `investasi.js`, `akun.js`.

---

# Changelog — Sesi 494 (Kuota Nominal Titipan di `investmentOwnersModal`, Gate 2 PLAN-owner-registry-multi-session.md)

## Konteks
Prasyarat: S493 selesai (registry `ownerId` konsisten lintas 3 domain).
Gate 2 (kuota nominal dana titipan) dikonfirmasi eksplisit sebelum
implementasi (lihat percakapan sesi ini): **(1)** basis nominal per
holding = `holdingCost` (pokok masuk, konsisten `DanaTitipanPortfolioAPI`
existing) — BUKAN `holdingValue`; **(2)** owner belum punya
`titipanCommitments`/`principalAmount` -> tampilkan prompt **"catat
pokok dulu"** (BUKAN tampil tanpa batas/diam saja); **(3)** pelanggaran
kuota = **soft warning** ⚠️ (tetap bisa Simpan, pola sama
`OVER_ALLOCATED` existing) — BUKAN hard block; **(4)** scope HANYA
`investmentOwnersModal` (`assetOwnersModal` di luar scope, tidak
disentuh).

## Perubahan
- `modules/finance/dana-titipan-portfolio-presenter.js`: API baru
  `DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, holdingId)` —
  total `holdingCost` yang SUDAH teralokasi ke `ownerId` di holding LAIN
  (semua holding investasi KECUALI `holdingId` yang sedang dibuka di
  modal). 100% REUSE `_holdingSplits()` (basis cost yang sama dgn
  `build()`) — **0 rumus baru**, cuma filter+jumlah `costSplit` per
  owner lintas holding lain. Owner SELF dikecualikan (pola sama
  `build()`). `holdingId` opsional (kalau kosong, tidak ada holding yang
  dikecualikan).
- `modules/asset/investasi-view.js` (`InvestmentUI`):
  - `_ownerQuotaText(o)` (baru) — hitung & render `"💰 Kuota sisa: Rp X"`
    per baris owner non-SELF di `investmentOwnersModal`. Formula PERSIS
    sesuai Gate 2: `principalAmount - allocatedExcluding(ownerId,
    holdingId) - (holdingCost(holding) * porsiDraft/100)`. Baris SELF
    -> string kosong (kuota tidak pernah tampil utk SELF). Owner belum
    punya commitment -> prompt "catat pokok dulu" (Gate 2 #2). Kuota
    negatif -> soft warning ⚠️ "melebihi pokok dikomit" (Gate 2 #3, TIDAK
    pernah menonaktifkan tombol Simpan).
  - `_updateOwnerQuotaDisplay(i)` (baru) — update HANYA
    `#investOwnerKuota{i}` (live, tiap ketik porsi), TANPA render ulang
    seluruh list — pola sama alasan `onOwnerPorsiInput()` tidak memanggil
    `_renderOwnersList()` (supaya fokus/kursor input tidak hilang).
  - `_renderOwnersList()`: tiap baris non-SELF sekarang punya container
    `<div id="investOwnerKuota{i}">` berisi `_ownerQuotaText(o)`. Baris
    SELF TIDAK punya container ini sama sekali.
  - `onOwnerPorsiInput(i,val)`: tambah 1 baris panggil
    `_updateOwnerQuotaDisplay(i)` setelah `updateOwnersTotal()` — kuota
    ter-update live tiap ketik, **terpisah total** dari validasi
    total-porsi 100% (`updateOwnersTotal()`/`saveBtn.disabled` TIDAK
    dibaca/diubah oleh kuota, dan sebaliknya — keduanya tidak saling
    override, sesuai instruksi).
- `tests/s494-titipan-kuota-nominal-investment-owners.test.js` (**baru**,
  14 test case): 6 test murni `allocatedExcluding()` (exclude holding
  sedang dibuka, tanpa `holdingId` = jumlah semua holding, SELF
  dikecualikan, ownerId tidak ditemukan -> 0, ownerId kosong -> 0 tanpa
  throw, multi-owner porsi split lintas holding), 8 test DOM
  `InvestmentUI._ownerQuotaText()`/`_updateOwnerQuotaDisplay()`/
  `onOwnerPorsiInput()`/`_renderOwnersList()` — termasuk 1 test eksplisit
  yang membuktikan `saveBtn.disabled` TETAP `false` (total porsi pas
  100%) meski kuota titipan sudah lebih (soft warning, tidak override
  validasi total-porsi — Gate 2 #3 & instruksi pemisahan validasi).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh (TANPA
  minifikasi, esbuild masih tidak tersedia di sandbox ini — sama seperti
  S488-S493).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  1225 (bagian rutin proses build).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  disamakan ke `s494-owner-registry-cross-domain-validation` (rutin,
  `bumpVersionEverywhere()` memakai label sesi sebelumnya sbg basis
  auto-increment nomor sesi — versi APP_BUILD_VERSION tetap naik jadi
  1225, nama sesi ini tercatat di CHANGELOG & session note).
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Yang TIDAK diubah (out-of-scope, sesuai instruksi)
- `assetOwnersModal`/`aset.js` — 0 sentuhan (Gate 2 #4: scope hanya
  `investmentOwnersModal`).
- 0 migrasi/merge/rename data existing — `D.titipanCommitments`/
  `D.investments[].owners[]` dibaca apa adanya, tidak ditulis ulang oleh
  fitur kuota ini sama sekali (murni read-only projection, sama prinsip
  `DanaTitipanPortfolioAPI.build()`).
- 0 rumus valuasi baru — `allocatedExcluding()` 100% reuse
  `_holdingSplits()`, `_ownerQuotaText()` 100% reuse `holdingCost()` +
  `allocatedExcluding()` + `getCommitments()` yang sudah ada.
- Validasi total-porsi 100% (`MultiOwnerEngine.totalPorsi()`/
  `remainingPorsi()`/`updateOwnersTotal()`) — 0 baris diubah, tetap satu-
  satunya yang mengontrol `saveBtn.disabled`.

## Verifikasi
- `node --test tests/s494-titipan-kuota-nominal-investment-owners.test.js`
  → **14/14 lolos**.
- `node --test tests/*.test.js` → **3233/3233 lolos, 0 gagal** (3219 test
  lama + 14 baru, **0 regresi**).
- `node scripts/verify-window-expose.js` → lolos (68 modul data-action,
  semua ter-window-expose, 0 baru butuh expose — `_ownerQuotaText()`/
  `_updateOwnerQuotaDisplay()` internal, tidak dipanggil lewat
  `data-action`).
- `node scripts/build.js` → lolos semua lint blocking; versi naik
  1224→1225; kedua bundle lolos `node --check`.
- `node scripts/verify-release-ready.js` → **LOLOS** (2 gate di-override
  manual: lint eslint & minify esbuild, sandbox tanpa akses jaringan,
  sama seperti S488-S493 — lihat `docs/RELEASE-GATE-LOG.md`).

## Belum ditangani (di luar scope sesi ini)
- Gate 2 #4 kalau nanti diputuskan "ikut" `assetOwnersModal` juga —
  sengaja TIDAK dikerjakan sesi ini (scope eksplisit hanya
  `investmentOwnersModal`), butuh sesi terpisah kalau diperlukan.
- Lint (`eslint`) & minifikasi (`esbuild`) nyata — sama seperti sesi
  sebelumnya, perlu `npm install` di environment dgn akses registry.

# Changelog — Sesi 493 (Owner Registry: Validasi Silang & Cleanup, penutup rangkaian S489-S493)

## Konteks
Sesi penutup rangkaian `PLAN-owner-registry-multi-session.md` (S489 core
registry, S490 wiring `assetOwnersModal`, S491 wiring
`investmentOwnersModal`, S492 retrofit `titipanCommitmentModal` Gate #2
= SENTUH). S493 MURNI pengujian & dokumentasi — **0 baris business logic
diubah** (0 sentuhan ke `MultiOwnerEngine`/`OwnerRegistry`/
`Investment.getOwners()`/`DanaTitipanPortfolioAPI` — semua fungsi
dipanggil apa adanya, hanya dites lintas domain).

## Perubahan
- **Test baru**: `tests/s493-owner-registry-cross-domain-validation.test.js`
  (7 test) — membuktikan `ownerId` hasil `OwnerRegistry.findOrCreate()`
  bisa dipakai KONSISTEN lintas 3 domain (Aset via `MultiOwnerEngine`
  langsung, Investasi via `Investment.getOwners()`, Titipan via
  `DanaTitipanPortfolioAPI.listExistingOwners()`/`build()`), dan bahwa
  `validateOwners()`/`splitByPorsi()`/`selfPorsi()`/`selfOwnedValue()`/
  agregasi SELF-non-SELF **TIDAK berubah** perilakunya sama sekali walau
  `ownerId` berasal dari registry (bukan `uid()` manual) — termasuk 1
  test regresi eksplisit yang membuktikan owner legacy (`ownerId` manual
  pra-S489) tetap diterima berdampingan dgn owner registry di
  aset/holding yang sama, tanpa migrasi dipaksakan.
- **Audit regresi**: `MultiOwnerEngine.validateOwners()` (dan seluruh
  suite `tests/multi-owner-engine.test.js` 41 test,
  `tests/multi-owner-piutang-debt-split-s394.test.js` 12 test,
  `tests/s462-investasi-multi-owner-titipan.test.js` 4 test — total 57
  test regresi domain multi-owner) dijalankan ulang penuh setelah S489-492
  — 57/57 lolos, 0 regresi formula porsi/validasi/split.
- `docs/BUG_REGISTRY.md`: entri baru **OWNREG-GATE3-001** (§0a-10) —
  mendokumentasikan rename-owner UI (`OwnerRegistry.rename()`/edit nama
  entri existing) sebagai **OUT OF SCOPE (Gate #3)**, keputusan sadar
  sejak awal plan (Gate #1 poin 3), bukan utang teknis diam-diam.
- `PLAN-owner-registry-multi-session.md`: status diupdate — rangkaian
  S489-S493 **SELESAI**; Gate 2 baru (Kuota Nominal Titipan, S494) masih
  BELUM diputuskan, menunggu sesi terpisah sesuai instruksi eksplisit.
- Konstanta versi build disamakan ke
  `s493-owner-registry-cross-domain-validation` di semua file yang biasa
  ikut sinkron per sesi (lihat `s493-SESSION-NOTE.md` untuk daftar
  lengkap file).

## Verifikasi yang sudah dijalankan
- `node --test tests/s493-owner-registry-cross-domain-validation.test.js`
  → **7/7 lolos**.
- `node --test tests/multi-owner-engine.test.js
  tests/multi-owner-piutang-debt-split-s394.test.js
  tests/s462-investasi-multi-owner-titipan.test.js` → **57/57 lolos**
  (audit regresi `validateOwners()` full, 0 gagal).
- `node --test tests/*.test.js` → **3219/3219 lolos, 0 gagal** (3212
  baseline S492 + 7 baru S493, 0 regresi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-release-ready.js` (dgn override lint/minify —
  eslint & esbuild tidak tersedia di sandbox tanpa akses jaringan,
  dicatat di `docs/RELEASE-GATE-LOG.md`) → lolos.

## Tidak dilakukan (sesuai instruksi eksplisit scope S493)
- Tidak ada migrasi/merge/rename `ownerId` data existing.
- Gate 2 baru (Kuota Nominal Titipan, untuk S494) **belum diputuskan**
  sesi ini — di luar scope, plan mensyaratkan sesi terpisah.
- `OwnerRegistry.rename()`/UI edit nama owner — tetap out-of-scope
  (Gate #3), didokumentasikan di `docs/BUG_REGISTRY.md` (OWNREG-GATE3-001),
  bukan diimplementasikan.

---

# Changelog — Sesi 488 (Tes Buka/Tutup Modal: daftarkan titipanCommitmentModal & titipanReturnModal ke sweep)

## Konteks
`titipanCommitmentModal` ("💰 Pokok Dana Titipan", dibuat S485d) &
`titipanReturnModal` ("↩️ Catat Pengembalian Dana Titipan", dibuat S486)
terdeteksi "(kelengkapan cakupan) modal belum terdaftar" di Tes
Buka/Tutup Modal (dilihat user lewat 🧪 Tes Buka/Tutup Modal di halaman
Beranda: "107/119 modal aman · 11 butuh konteks (wajar) · 1
bermasalah") — gap coverage tes murni, bukan bug fungsional (kedua
modal sudah berfungsi normal lewat tombol asli di UI Dana Titipan).

## Perubahan
- `self-test.js` + `app-bundle-b.min.js` (embedded copy) —
  `MODULE_METHOD_MODAL_SPECS`: 2 spec baru, `DanaTitipanCommitmentUI.open()`
  & `DanaTitipanReturnUI.open()`, keduanya dipanggil TANPA `ownerId`
  (aman, 0 mutasi `D` — `DanaTitipanCommitmentUI.open()` render dropdown
  owner kosong kalau `listExistingOwners()` kosong,
  `DanaTitipanReturnUI.open()` render tampilan owner kosong — pola sama
  `InvestmentUI.openOwnersModal()`/`InvestmentListUI.openModal()` di
  spec-spec sekitarnya).
- Konstanta versi build disamakan ke `s488-titipan-modal-sweep-fix` di
  semua file yang biasa ikut sinkron per sesi (lihat
  `s488-SESSION-NOTE.md` utk daftar lengkap file).
- Cache-busting `?v=1216`→`?v=1218` (index.html, app_production.html)
  & `kw-cache-v1216`→`kw-cache-v1218` (sw.js) — via `node scripts/build.js`.

## Verifikasi yang sudah dijalankan
- `node scripts/build.js s488-titipan-modal-sweep-fix` — lolos, versi
  konstanta tersinkron, kedua bundle ditulis ulang & valid sintaks.
- `node --test tests/*.test.js` → **3178/3178 lolos, 0 gagal** (0
  regresi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.
- `node scripts/verify-release-ready.js` (dgn override lint/minify —
  eslint & esbuild tidak tersedia di sandbox tanpa akses jaringan,
  dicatat di `docs/RELEASE-GATE-LOG.md`) → lolos.

## Status akhir
Kedua modal sekarang terdaftar di sweep. Jalankan 🧪 Tes Buka/Tutup
Modal sekali lagi di aplikasi utk konfirmasi visual "119/119 modal
aman" (tidak bisa disimulasikan headless di sandbox ini karena sweep
jalan di DOM browser sungguhan).

---

# Changelog — Sesi 477 (Tes Buka/Tutup Modal: daftarkan investmentOwnersModal ke sweep)

## Konteks
`investmentOwnersModal` ("⚖️ Atur Porsi Kepemilikan" holding investasi,
dibuat S464) terdeteksi "(kelengkapan cakupan) modal belum terdaftar" di
Tes Buka/Tutup Modal — gap coverage tes murni, bukan bug fungsional.

## Perubahan
- `self-test.js` + `app-bundle-b.min.js` (embedded copy) —
  `MODULE_METHOD_MODAL_SPECS`: 1 spec baru
  `InvestmentUI.openOwnersModal()`, dipanggil TANPA id (aman, 0 mutasi
  `D.investments`, sama seperti pola `Aset.openOwnersModal()` saat
  `Aset.editId` kosong).
- Konstanta versi build disamakan ke `s477-modal-sweep-coverage-fix` di
  semua file yang biasa ikut sinkron per sesi (lihat
  `s477-SESSION-NOTE.md` utk daftar lengkap file).
- Cache-busting `?v=1201`→`?v=1202` (index.html, app_production.html)
  & `kw-cache-v1201`→`kw-cache-v1202` (sw.js).

## Status
Lihat `s477-SESSION-NOTE.md` utk detail & daftar verifikasi yang masih
perlu dijalankan manual (full test suite + cek visual sweep modal).

---

# Changelog — Sesi 474 (Virtual Bill Item — s468d: buffer/regression final)

## Konteks
Sesi buffer/dokumentasi terakhir dari `s468-PLAN-virtual-bill-item-tx-list.md`
(a+b+c sudah tuntas & fitur sudah jalan sejak Sesi 473). Sesi ini murni
verifikasi gabungan + 1 test skenario end-to-end (pengganti cek manual
browser) — **0 perubahan logic baru**.

## Perubahan
- `tests/virtual-bill-manual-scenario-s468d.test.js` (**baru**, 1 test):
  skenario gabungan a+b+c — 1 bill biasa + 1 bill shared + 1 bill freq
  mingguan, semua jatuh tempo bulan berjalan, dalam 1 render: ketiganya
  tergenerate (`generateVirtualBillItemsForMonth`), nominal shared =
  `b.amount` (bukan `totalAmount`), semua id berprefix `vbill_`, `txHTML()`
  konsisten (badge "⏳ Terjadwal", routing `openBillModal`, 0
  `data-action="delTx"`), `delTx()` thd id virtual manapun 0 efek ke `D`.
- Konstanta versi module disamakan ke `s474-virtual-bill-item-final`.

## Verifikasi yang sudah dijalankan (full regression, gabungan a+b+c+d)
- `node scripts/build.js s474-virtual-bill-item-final` — lolos, 0 error
  blocking, 0 warning drift `AUDIT_MATRIX.md`.
- `node --test tests/*.test.js` → **3051/3051 lolos, 0 gagal** (0 regresi
  dari baseline v1187 s466 s/d sesi ini — total 3051-3033=18 test baru
  utk seluruh fitur virtual bill item: 8 (s468a) + 4 (s468b) + 5 (s468c)
  + 1 (s468d)).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.

## Status akhir — Fitur "Virtual Bill Item di List Transaksi" SELESAI
Semua item Definition of Done di `s468-PLAN-virtual-bill-item-tx-list.md`
terpenuhi (generator, txHTML/delTx guard, wiring+guard periode, exclude
lunas/arsip, regresi mIncome/mExpense/mNet/pagination, test shared-bill
nominal). Release ini (`v1196`) siap jadi baseline audit sesi berikutnya.

---

# Changelog — Sesi 473 (Virtual Bill Item — s468c: wiring ke allTx + guard periode)

## Konteks
Lanjutan Sesi 471-472 (`s468a`+`s468b` selesai). Eksekusi tahap `s468c` dari
`s468-PLAN-virtual-bill-item-tx-list.md` — sesi ini yang **membuat fitur
terlihat oleh user**: section "⏳ Akan Jatuh Tempo" sekarang dirender di
tab Keuangan, di atas list `#allTx`.

## Perubahan
- `modules/shared/modules-render.js` — `renderKeuangan()`: sebelum render
  `#allTx`, section baru `#allTxVirtualBills` diisi lewat
  `generateVirtualBillItemsForMonth(curYear,curMonth)` **HANYA** kalau
  `txListPeriode==='bulan'` **DAN** `curYear`/`curMonth` sama dgn
  tahun/bulan aktual (`new Date()`, temuan #7 di plan) — di luar kondisi
  itu section dikosongkan total (bukan dirender kosong dgn pesan). Item
  virtual dirender lewat `txHTML()` yg sudah siap sejak `s468b`, **TIDAK**
  disisipkan ke `sorted`/`visible`/pagination — jadi `mIncome`/`mExpense`/
  `mNet` (dihitung dari `txM`, tidak disentuh) dan hitungan "Tampilkan
  lebih banyak (N lagi)" (`visibleCount`/`sorted.length`, tidak disentuh)
  otomatis 0 risiko (poin bahaya #3 & #5 di plan).
- `index.html`, `app_production.html` — `<div id="allTxVirtualBills">`
  baru disisipkan tepat di atas `<div id="allTx">` (kartu "📋 Semua
  Transaksi", tab Keuangan), di kedua file (dua-duanya harus manual sync,
  pola sama modal index yg lain).
- `tests/virtual-bill-alltx-wiring-s468c.test.js` (**baru**, 5 test, pakai
  `extractFunction()` helper krn `renderKeuangan()` terlalu besar utk
  di-mock semua dependency): section muncul + generator terpanggil saat
  `txListPeriode==='bulan'` & bulan aktual; section TIDAK muncul & generator
  TIDAK terpanggil saat nav ke bulan lain; section TIDAK muncul saat
  `txListPeriode` bukan `'bulan'` (mis. `'minggu'`) walau bulan aktual; 0
  item virtual → section kosong (bukan error); regression eksplisit
  `mIncome` tetap murni dari `D.transactions`, tidak terpengaruh nominal
  item virtual.
- Konstanta versi module disamakan ke `s473-virtual-bill-alltx-wiring`.

## Verifikasi yang sudah dijalankan
- `node scripts/build.js s473-virtual-bill-alltx-wiring` — lolos, 0 error
  blocking.
- `node --test tests/*.test.js` → **3050/3050 lolos, 0 gagal** (3045
  baseline + 5 test baru, 0 regresi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.

## Status setelah sesi ini
Fitur "Virtual Bill Item di List Transaksi" **jalan & teruji** (s468a+b+c
lengkap — minimum wajib menurut plan selesai). Sisa: `s468d` (opsional/
buffer) — regression pass gabungan sekali lagi + cek manual browser (1
bill biasa + 1 shared + 1 mingguan, semua bulan berjalan) + finalisasi
dokumentasi, kalau dibutuhkan.

---

# Changelog — Sesi 472 (Virtual Bill Item — s468b: txHTML + guard delTx)

## Konteks
Lanjutan Sesi 471 (`s468a` selesai). Eksekusi tahap `s468b` dari
`s468-PLAN-virtual-bill-item-tx-list.md`: patch router di `txHTML()` untuk
merender item virtual (belum ada pemanggil yang mengirimnya — itu scope
`s468c`), plus guard defense-in-depth di `delTx()`. **0 perubahan
perilaku terlihat user** sampai `s468c` (wiring ke `allTx`) selesai.

## Perubahan
- `modules/finance/tx-list-cashflow.js`:
  - `txHTML(t)` — branch baru di awal fungsi: kalau `t.virtual &&
    String(t.id).startsWith('vbill_')` → render kartu khusus (badge
    "⏳ Terjadwal", ikon dari kategori, `data-action="openBillModal"`
    dgn `t.billId` asli — bukan id virtual), tombol 🗑 **dihilangkan
    total** dari kartu virtual (bukan cuma disembunyikan CSS). 0
    perubahan ke cabang transaksi asli (fallthrough tetap sama persis).
  - `delTx(id)` — guard baris PERTAMA (sebelum `askConfirm` dipanggil):
    `if(String(id).startsWith('vbill_'))` → `toast('Tagihan ini belum
    dibayar')` + `return`. Defense in depth (poin bahaya #2 di plan) —
    tetap aman walau ke-trigger bukan lewat tombol UI (mis. race
    re-render).
- `tests/virtual-bill-txhtml-deltx-guard-s468b.test.js` (**baru**, 4
  test): kartu virtual render badge+routing benar & TIDAK punya
  `data-action="delTx"`/`"editTx"`, transaksi asli 0 regresi, `delTx()`
  id virtual TIDAK memicu `askConfirm` (toast muncul), `delTx()` id asli
  tetap normal (askConfirm terpanggil, transaksi terhapus).
- Konstanta versi module disamakan ke `s472-virtual-bill-txhtml-deltx-guard`.

## Tidak ada perubahan
- 0 file wiring/render disentuh (`modules-render.js` — `allTx` belum
  memanggil `generateVirtualBillItemsForMonth()`, itu scope `s468c`). 0
  perubahan perilaku terlihat user di sesi ini.

## Verifikasi yang sudah dijalankan
- `node scripts/build.js s472-virtual-bill-txhtml-deltx-guard` — lolos, 0
  error blocking.
- `node --test tests/*.test.js` → **3045/3045 lolos, 0 gagal** (3041
  baseline + 4 test baru, 0 regresi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.

## Status setelah sesi ini
`txHTML()`/`delTx()` siap menerima item virtual. Sesi lanjutan wajib:
`s468c` (wiring ke `allTx` + guard periode `txListPeriode==='bulan'` +
bulan/tahun aktual — ini yang bikin fitur **terlihat** user), `s468d`
(opsional: regression pass gabungan + dokumentasi final).

---

# Changelog — Sesi 471 (Virtual Bill Item — s468a: generator murni)

## Konteks
Eksekusi tahap pertama (`s468a`) dari rencana
`s468-PLAN-virtual-bill-item-tx-list.md` (audit sudah selesai sebelumnya,
3 poin "belum diputuskan" sudah difinalkan): tagihan (`D.bills`) yang belum
dibayar & jatuh tempo bulan ini akan ditampilkan sbg "item virtual" di list
transaksi tab Keuangan. Sesi ini **cuma generator logic murni** — belum
nyentuh UI/render (`txHTML`, `delTx`, `modules-render.js`) sama sekali,
sesuai pemecahan sesi di plan (s468a→b→c→d, 1 zip patch per sesi).

## Perubahan
- `modules/finance/tagihan-kalender.js` — fungsi baru
  `generateVirtualBillItemsForMonth(year,month)`: loop `D.bills`, reuse
  `getBillOccurrencesInMonth()` (jadwal freq+sisaTenor, sudah ada) +
  `getBillPaidThisPeriodInfo()` (exclude yg sudah lunas periode ini, sudah
  ada) — 0 logic baru. `D.billsArchive` otomatis ter-exclude (loop cuma
  `D.bills`, tagihan lunas sudah pindah keluar dari situ lewat
  `markBillPaid()`). Nominal shared pakai `b.amount` apa adanya (sudah
  porsi user sejak disimpan, bukan `b.totalAmount`). Id berprefix eksplisit
  `vbill_${billId}_${year}${month}` (siap dipakai routing `txHTML`/`delTx`
  di sesi lanjutan `s468b`, sesuai rekomendasi arsitektur plan). PURE:
  tidak baca DOM, tidak mutasi `D` sama sekali.
- `tests/virtual-bill-generator-s468a.test.js` (**baru**, 8 test): item
  virtual tergenerate benar, exclude bill yg sudah dibayar periode ini,
  exclude bill di `D.billsArchive`, nominal shared = `b.amount` bukan
  `b.totalAmount`, freq mingguan & tahunan tetap dapat occurrence yang
  benar, bill tanpa occurrence di bulan target tidak muncul, fungsi
  terverifikasi PURE (0 mutasi `D`).
- Konstanta versi module disamakan ke `s471-virtual-bill-item-generator`
  (rutin, `node scripts/build.js`).

## Tidak ada perubahan
- 0 file render/UI disentuh (`modules-render.js`, `modals.js`,
  `tx-list-cashflow.js` — `txHTML`/`delTx` belum dipatch, itu scope
  `s468b`). 0 perubahan perilaku terlihat user sampai `s468c` (wiring ke
  `allTx`) selesai.

## Verifikasi yang sudah dijalankan
- `node scripts/build.js s471-virtual-bill-item-generator` — lolos, 0
  error blocking (2 warning non-blocking pre-existing: drift baseline
  `AUDIT_MATRIX.md` selisih 1 file krn 1 test file baru — housekeeping
  rutin, ditunda ke sesi drift berikutnya; 5 file lewat ambang 1600
  baris, pre-existing, tidak disentuh sesi ini).
- `node --test tests/*.test.js` → **3041/3041 lolos, 0 gagal** (3033
  baseline + 8 test baru, 0 regresi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.

## Status setelah sesi ini
`generateVirtualBillItemsForMonth()` siap dipakai. Sesi lanjutan wajib:
`s468b` (patch `txHTML`+guard `delTx`), `s468c` (wiring ke `allTx` +
guard periode `txListPeriode==='bulan'`), `s468d` (opsional: regression
pass gabungan + dokumentasi final).

---

# Changelog — Sesi 470 (Housekeeping: sinkronkan baseline docs/AUDIT_MATRIX.md)

## Konteks

`node scripts/build.js` sudah beberapa sesi terakhir (mulai Sesi 468)
menampilkan warning non-blocking "docs/AUDIT_MATRIX.md kemungkinan sudah
usang" — tabel "Coverage Baseline" (§1) belum diupdate sejak pasca-
v1153/S438, sementara ±31 sesi berikutnya (termasuk seluruh pekerjaan
BUG-INV-001 Opsi 3, Sesi 466-469) sudah menambah banyak file baru. Item
ini eksplisit dicatat sbg "housekeeping minor, bukan bagian BUG-INV-001"
di `PATCH-README.md` Sesi 468-469 — dikerjakan sekarang murni supaya
`node scripts/build.js` bersih dari warning lagi (0 perubahan behavior
app, 0 file kode disentuh).

## Perubahan

- `docs/AUDIT_MATRIX.md` — tabel "Coverage Baseline" (§1) disinkronkan ke
  angka repo sungguhan hasil `lintDocsBaselineCountDrift()`: Total files
  822→861 (+39), JavaScript 555→579 (+24), Markdown 243→258 (+15),
  Tests/HTML/JSON/CSS/Module families tetap. 1 baris catatan baru
  ditambahkan (pola sama update-update sebelumnya) menjelaskan drift ini
  terkumpul dari Sesi 438-470, bukan perubahan tunggal sesi ini.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh (TANPA
  minifikasi, esbuild masih tidak tersedia di sandbox ini).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  1191 (bagian rutin proses build; naik 3 angka dari 1188 karena
  `scripts/build.js` dijalankan berulang selama proses verifikasi warning
  di sesi ini — TIDAK ada isi/logic yang berubah antar run, cuma nomor
  versi ikut naik tiap `node scripts/build.js` dipanggil).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  disamakan ke `s470-audit-matrix-baseline-sync` (rutin). Tidak ada modal
  baru — `MODAL_HTML` tetap 96 elemen.
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Verifikasi

- `node scripts/build.js s470-audit-matrix-baseline-sync` — warning
  "docs/AUDIT_MATRIX.md kemungkinan sudah usang" **HILANG** (sebelumnya
  muncul tiap build sejak S468); pesan baru: "✓ Angka baseline di
  docs/AUDIT_MATRIX.md masih sinkron dengan repo". Semua lint blocking
  lain tetap lolos.
- `node --test tests/*.test.js` → **3033/3033 lolos, 0 gagal** (0
  perubahan test, 0 regresi — sesi ini murni dokumentasi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.
- Kedua bundle lolos `node --check` (sintaks valid).

## Belum ditangani (di luar scope sesi ini, pre-existing)

- Lint (`eslint`) & minifikasi (`esbuild`) nyata — perlu `npm install` di
  environment dgn akses registry.
- 5 file source sudah lewat ambang 1600 baris (warning non-blocking,
  pre-existing, tidak berubah sesi ini) — kandidat dipecah modulnya kalau
  sempat: `business-flow-presenter.js`, `aset.js`, `build.js`,
  `modules-render.js`, `scan-ocr.js`.

---

# Changelog — Sesi 469 (Navigasi Dashboard Hub: kartu Investment Planner -> tab Investasi)

## Konteks

Item terbuka yang dicatat `REKOMENDASI-SESI-467-FASE2-TRANSAKSI.md` §3
("Navigasi Dashboard Hub — kartu 'Investment Planner' lama perlu entry
navigasi baru terpisah dari `InvestmentListUI`") & `PATCH-README.md` Sesi
468. `InvestmentPlannerPresenter` (baca `D.assets` via
`Aset.investmentPerformance()`) & tab "💹 Investasi" (`InvestmentListUI`,
baca `D.investments` via `Investment.*`, Sesi 466-468/BUG-INV-001) adalah
2 fitur BEDA sumber data — sebelumnya kartu Investment Planner yang
kosong ("Belum ada data modal") mengarahkan user ke tab "📋 Buku Aset"
generik lewat teks saja (bukan link), TIDAK ada jalur klik ke tab
"💹 Investasi" yang sekarang benar-benar bisa dipakai mencatat holding.
0 kartu baru, 0 perubahan pada `Investment`/`Aset`/data model manapun —
murni wiring navigasi 1 kondisi (`holdingsCount===0`) + 1 entry map yang
sebelumnya hilang.

## Perubahan

- `modules/dashboard-hub/dashboard-hub.js`: `ASET_TAB_IDX` ditambah
  `investasi:4` (tab "💹 Investasi" sudah ada di `ASET_TAB_ORDER`/HTML
  sejak Sesi 466, tapi belum terdaftar eksplisit di map ini —
  sebelumnya tetap JALAN lewat fallback `setAsetTab()` sendiri saat `el`
  undefined, map ini melengkapinya biar eksplisit & konsisten dgn pola
  `KEU_TAB_IDX`/`SHOP_TAB_IDX` dkk).
- `modules/finance/investment-planner-presenter.js`:
  - `INVESTPLANNER_NAV_TARGETS` ditambah entry baru `investasiTab:
    {page:'aset',tab:'investasi',goTo:'asetTab-investasi'}` — TERPISAH
    dari `self` yang sudah ada (0 perubahan pada `self`).
  - `_overviewCard(p)` — KHUSUS jalur `p.holdingsCount===0`, `onClick`
    sekarang mengarah ke `investasiTab` (bukan lagi `self`), sub text
    diperbarui jadi mengarahkan ke tab "💹 Investasi" yang bisa dipakai
    mencatat holding beneran (sebelumnya cuma teks "Isi Modal Investasi
    ... di 📋 Buku Aset" tanpa link). Jalur `holdingsCount>0` & `!p.ok`
    TIDAK berubah (tetap `self`, 0 regresi).
- `tests/investment-planner-investasi-nav-s469.test.js` (**baru**, 5 test
  case): `INVESTPLANNER_NAV_TARGETS.investasiTab`/`.self` (bentuk &
  keduanya ada terpisah), `_overviewCard()` 3 jalur (`holdingsCount:0` ->
  target baru, `holdingsCount>0` -> tetap `self`, `!p.ok` -> tetap `self`),
  `ASET_TAB_IDX` (map lengkap 5 entry).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh (TANPA
  minifikasi, esbuild masih tidak tersedia di sandbox ini).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  1188 (bagian rutin proses build).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  disamakan ke `s469-investment-planner-investasi-nav` (rutin,
  `bumpVersionEverywhere()`). Tidak ada modal baru sesi ini — `MODAL_HTML`
  tetap 96 elemen.
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Verifikasi

- `node --test tests/investment-planner-investasi-nav-s469.test.js` →
  **5/5 lolos, 0 gagal**.
- `node --test tests/finance-nav-consistency-s254b.test.js
  tests/investment-planner-gap-fix.test.js` → **19/19 lolos** (jalur
  `holdingsCount:2`/render 3-kartu S254B tetap pass tanpa modifikasi —
  0 regresi perilaku lama).
- `node --test tests/*.test.js` → **3033/3033 lolos, 0 gagal** (3028 test
  lama + 5 baru, **0 regresi**).
- `node scripts/build.js s469-investment-planner-investasi-nav` — lolos
  semua lint blocking.
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.
- Kedua bundle lolos `node --check` (sintaks valid).

## Belum ditangani (di luar scope sesi ini, pre-existing)

- Lint (`eslint`) & minifikasi (`esbuild`) nyata — perlu `npm install` di
  environment dgn akses registry.
- `docs/AUDIT_MATRIX.md` "Coverage Baseline" drift (pre-existing,
  housekeeping minor) — warning saja, tidak blocking build.

---

# Changelog — Sesi 468 (BUG-INV-001 Opsi 3, Fase 4: verifikasi 4 dead-read call site — FIXED)

## Konteks

Menindaklanjuti "Belum ditangani" Sesi 467 — Fase 4 dari
`AUDIT-BUILD-UI-INVESTASI-OPSI3.md`: verifikasi 4 dead-read call site
(`invest-ai-widget.js`, `self-reward-ai-widget.js`, `dana-kelolaan.js`,
`ownership-settings-presenter.js`, `user-finance-adapter.js`) sekarang
membaca `D.investments` dengan benar setelah Fase 1-3 (Sesi 466-467)
membuka jalur tulis nyata. Pendekatan: sandbox `loadSource()` end-to-end
(source ASLI, bukan reimplementasi), holding diisi lewat
`Investment.addHolding()`/`addTransaction()` (jalur tulis yang sama
dipakai UI), BUKAN manual-tulis `D.investments` — dianggap setara smoke-
test browser untuk kelima call site ini karena semuanya murni baca &
transformasi data (0 logic DOM/render terlibat). 0 perubahan pada
`investasi.js`/kelima call site itu sendiri — murni test coverage +
update dokumentasi status bug.

## Perubahan

- `tests/investment-dead-read-verification-s468.test.js` (**baru**, 9
  test case): tiap call site diuji 2 kondisi — BEFORE (`D.investments`
  kosong, baseline dead-read lama) & AFTER (holding diisi via
  `Investment.addHolding()`, memverifikasi data terbaca benar):
  `DanaKelolaan.sumInvestasi()`/`listTitipan()`,
  `SelfRewardAI._analyzeInvestasi()`, `InvestAI._checkPortofolio()`,
  `OwnershipSettingsPresenter._collect()`/`summary()`,
  `_eieInvestmentBreakdown()` (`user-finance-adapter.js`).
- `docs/BUG_REGISTRY.md`: entri BUG-INV-001 diupdate — "Update Sesi 468"
  ditambahkan, status BUG-INV-001 diubah dari OPEN ke **FIXED** (seluruh
  4 fase Opsi 3 tuntas).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh (TANPA
  minifikasi, esbuild masih tidak tersedia di sandbox ini).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  1187 (bagian rutin proses build).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  disamakan ke `s468-investment-dead-read-verification` (rutin,
  `bumpVersionEverywhere()`). Tidak ada modal baru sesi ini — `MODAL_HTML`
  tetap 96 elemen.
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
  (293 file, 1997 identifier global; 15 family, 0 tanpa test langsung).

## Verifikasi

- `node --test tests/investment-dead-read-verification-s468.test.js` →
  **9/9 lolos, 0 gagal**.
- `node --test tests/*.test.js` → **3028/3028 lolos, 0 gagal** (3019 test
  lama + 9 baru, **0 regresi**).
- `node scripts/build.js s468-investment-dead-read-verification` —
  lolos semua lint blocking (termasuk `lintModalHtmlIndexDrift()`).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.
- Kedua bundle lolos `node --check` (sintaks valid).

## Belum ditangani (di luar scope sesi ini, pre-existing)

- Lint (`eslint`) & minifikasi (`esbuild`) nyata — perlu `npm install` di
  environment dgn akses registry.
- `docs/AUDIT_MATRIX.md` "Coverage Baseline" drift (pre-existing,
  housekeeping minor, bukan bagian BUG-INV-001) — belum disentuh (build
  cuma warning, tidak blocking).
- Navigasi Dashboard Hub — kartu "📈 Investment Planner" lama masih
  terpisah dari `InvestmentListUI` (dicatat sbg item terbuka di
  `REKOMENDASI-SESI-467-FASE2-TRANSAKSI.md` §3, bukan bagian BUG-INV-001).

---

# Changelog — Sesi 464 (AUD-008 lanjutan: UI modal titipan investasi)

## Konteks

AUD-008 (`docs/BUG_REGISTRY.md`) sebelumnya sudah **DONE (Sesi 462)** untuk
bagian engine — `investasi.js` sudah punya `h.owners[]` opsional +
`Investment.getOwners()`/`setOwners()` lewat `MultiOwnerEngine` yang sudah
ada — tapi UI-nya (form multi-baris pemilik, mirror `assetModal`) sengaja
ditunda ke sesi berikutnya. Sesi ini mengerjakan UI-nya.

## Perubahan

- `modules/asset/investasi-view.js` (**baru**): `InvestmentUI` — modal
  "⚖️ Atur Porsi Kepemilikan" untuk holding investasi. Mirror
  `Aset.openOwnersModal()`/`_renderOwnersList()`/`updateOwnersTotal()`/
  `addOwnerRow()`/`removeOwnerRow()`/`onOwnerNameInput()`/
  `onOwnerPorsiInput()`/`onOwnerIsSelfToggle()`/`saveOwners()`/
  `resetOwners()` dari `aset.js` (S392a-S453), versi RINGKAS — **tanpa**
  lapisan Nominal (Rp) dua-arah (S429/S457) karena holding investasi tidak
  punya field nilai manual yang setara dengan `a.nilai` (unit/avgPrice/
  currentPrice selalu diturunkan ulang dari riwayat transaksi lewat
  `Investment.recomputeHolding()`, bukan diisi manual). Field yang diedit
  hanya Nama Pemilik + Porsi (%) + toggle "Ini saya". Penyimpanan 100%
  reuse `Investment.setOwners()` (sudah ada sejak S462) — 0 validasi/rumus
  porsi baru ditulis di sini.
- `scripts/build.js`: `modules/asset/investasi-view.js` didaftarkan ke
  `GROUP_B`, tepat setelah `investasi.js` (dependency: butuh `Investment`
  sudah dimuat lebih dulu).
- `modules/shared/modals.js`: entry baru `investmentOwnersModal`
  ditambahkan ke akhir array `MODAL_HTML` (index 92). `MODAL_VERSION`
  di-bump ke `s464-investment-owners-modal-ui`.
- `index.html` & `app_production.html`: `<script>document.write(MODAL_HTML[92]);</script>`
  ditambahkan tepat setelah baris `assetOwnersModal` (index 91).
- `docs/BUG_REGISTRY.md`: AUD-008 ditandai selesai sepenuhnya (engine +
  UI).

## Belum ditangani (disengaja, di luar scope sesi ini)

- Belum ada tombol pemicu (`data-action="InvestmentUI.openOwnersModal"`)
  yang dipasang di UI lain (mis. daftar/edit holding investasi) — modul
  investasi belum punya halaman/list holding terpusat di codebase ini,
  jadi pemanggilan `InvestmentUI.openOwnersModal(id)` untuk sekarang perlu
  di-wire manual oleh caller mana pun yang punya id holding-nya (pola
  sama seperti tombol "⚖️ Atur Porsi Kepemilikan" di `assetModal`, yang
  akan dikerjakan begitu ada UI daftar holding investasi).
- `app-bundle-a.min.js`/`app-bundle-b.min.js` PERLU di-rebuild
  (`npm run build`) sebelum dipakai production — tooling esbuild tidak
  tersedia di environment ini.

## S465 — Rebuild bundle & sinkronisasi versi (audit lanjutan S464)

Menindaklanjuti satu dari dua item "Belum ditangani" di atas: rebuild
bundle. Item tombol pemicu tetap TIDAK dikerjakan (masih butuh keputusan
produk soal halaman/list holding investasi terpusat — di luar scope
audit teknis).

## Perubahan

- Ditemukan drift versi: `MODAL_VERSION` (modals.js) sudah di `s464-...`
  tapi `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION`
  (features-helpers-global-security.js), `MODULE_RENDER_VERSION`
  (modules-render.js), `MODULE_CALC_VERSION` (modules-calc.js), dan
  `MODULE_FEATURES_VERSION` (chat-action-handlers.js) masih tertinggal di
  `s461-...` — build.js menolak lanjut sampai ke-5 konstanta itu
  disamakan manual dulu (lihat `verifyVersionConstantsSynced()`).
  Disamakan ke `s464-investment-owners-modal-ui`, lalu `node
  scripts/build.js` dijalankan ulang; build.js sendiri lalu auto-bump
  semuanya sekali lagi ke `s465-investment-owners-modal-ui` (perilaku
  bawaan `bumpVersionEverywhere()`, bukan sesi kerja baru) & versi build
  numerik 1181 → 1182.
- `app-bundle-a.min.js` & `app-bundle-b.min.js`: di-rebuild penuh via
  `node scripts/build.js` — sekarang berisi `investasi-view.js`/
  `InvestmentUI` (sebelumnya belum, karena belum pernah di-build ulang
  sejak S464). esbuild tidak tersedia di sandbox ini (tanpa akses
  registry npm) jadi bundle TANPA minifikasi (raw concat, fallback
  bawaan build.js) — lebih besar dari build sebelumnya tapi valid
  (`node --check` lolos) & `verify-bundle-freshness.js` konfirmasi hash
  source cocok.
- `index.html`, `app_production.html`, `sw.js`: `?v=` / `CACHE_NAME`
  disamakan ke `1182` oleh build.js (bagian rutin dari proses build).
- Verifikasi penuh dijalankan ulang setelah build: `node --test
  tests/*.test.js` (2984/2984 lolos), `verify-window-expose.js` (63
  modul, semua ter-expose), `verify-release-ready.js` (lolos dengan 2
  gate di-override manual — lint & minify — karena keduanya butuh akses
  npm registry yang tidak ada di sandbox ini; alasan override tercatat
  di `docs/RELEASE-GATE-LOG.md`).

## Belum ditangani (tetap di luar scope)

- Tombol pemicu `InvestmentUI.openOwnersModal(id)` di UI lain — masih
  belum ada halaman/list holding investasi terpusat di codebase (bahkan
  `Investment.addHolding()` sendiri belum pernah dipanggil dari UI mana
  pun). Ini keputusan produk/desain UI baru, bukan sekadar audit teknis,
  jadi sengaja tidak ditambahkan di sini.
- Lint (`eslint`) & minifikasi (`esbuild`) nyata — perlu dijalankan
  ulang di environment dengan akses `npm install` sebelum rilis
  production final, supaya bundle ukurannya kembali kecil & lolos lint
  asli (bukan override).

## Audit lanjutan — `Investment`/`D.investments` domain dikonfirmasi mati sejak Sesi 161

Dipicu oleh pertanyaan soal tombol pemicu `InvestmentUI.openOwnersModal()`
yang belum terpasang. Audit langsung (`grep` menyeluruh, bukan asumsi)
mengonfirmasi `Investment.addHolding()` tidak pernah dipanggil dari UI
mana pun di seluruh codebase — didukung pernyataan eksplisit dari
`investment-planner-api.js` sendiri (Sesi 161 memindahkan alur investasi
user ke Buku Aset/`D.assets`). Minimal 9 sesi (192/193, 390/406b, 455,
458-460, 462, 464, 465 termasuk sesi ini) menambah fitur ownership/sync/
UI di atas domain data yang tidak pernah terisi.

Dicatat sebagai **BUG-INV-001** (severity P2, status OPEN) di
`docs/BUG_REGISTRY.md`, dgn 3 opsi remediasi diajukan (freeze &
dokumentasikan / decommission & migrasi ke `Aset.investmentPerformance()`
/ akhirnya bangun UI holding investasi) — **belum dipilih**, menunggu
keputusan pemilik produk. Baris AUD-008 di registry yang sama juga
diupdate dgn catatan silang ke temuan ini. Tidak ada perubahan kode
fungsional di sesi ini — murni dokumentasi audit.

# Changelog — Sesi 466 (BUG-INV-001 Opsi 3, Fase 1: halaman/list holding investasi)

## Konteks

Menindaklanjuti `AUDIT-BUILD-UI-INVESTASI-OPSI3.md` (audit teknis, 0 kode
diubah, sesi sebelumnya) — mengerjakan Fase 1 dari 4 fase yang diajukan di
situ: halaman list holding + modal tambah/edit + wiring CRUD dasar. Fase
2 (UI transaksi Beli/Jual/Dividen), Fase 3 (UI Watchlist — tombol pemicu
"⚖️ Atur Porsi Kepemilikan" SUDAH selesai di Fase 1 ini, lebih cepat dari
estimasi krn ternyata trivial), dan Fase 4 (verifikasi 4 dead-read call
site dgn data nyata) tetap di luar scope sesi ini.

## Perubahan

- `modules/asset/investasi-list-view.js` (**baru**): `InvestmentListUI` —
  presenter halaman "💹 Investasi" (sub-tab baru di bawah `#page-aset`).
  `render()` (kartu ringkasan portofolio via `Investment.portfolioSummary()`
  + list holding, 100% reuse, 0 rumus baru), `openModal(id)`/`save()`
  (wiring `Investment.addHolding()`/`updateHolding()`, SUDAH ADA sejak
  awal), `deleteFromModal()` (wiring `Investment.deleteHolding()`, SUDAH
  ADA), `openOwnersModalForEdit()` (wrapper tipis yang mendelegasikan
  PENUH ke `InvestmentUI.openOwnersModal(id)` — S464, 0 logic baru).
  Field Unit/Harga Rata-rata di modal `investmentModal` SENGAJA bisa diisi
  manual (Fase 2/UI transaksi belum ada) — `recomputeHolding()` akan
  mengambil alih nilai ini otomatis begitu Fase 2 selesai, 0 konflik.
- `modules/shared/modals.js`: entry baru `investmentModal` ditambahkan ke
  akhir array `MODAL_HTML` (index 93, total 94 elemen). Field: Nama,
  Jenis, Unit, Harga Rata-rata, Harga Saat Ini, Catatan — TANPA field
  titipan manual (`fundSource`/`titipanOwner`), mengikuti rekomendasi
  §3.2 audit: delegasi penuh ke `investmentOwnersModal` yang sudah ada,
  pola sama persis `assetModal`. `MODAL_VERSION` di-bump ke
  `s466-investment-list-view-ui`.
- `index.html` & `app_production.html` (disinkronkan manual, keduanya
  identik): tombol sub-tab baru "💹 Investasi" di `.cn-tabs` bawah
  `#page-aset`; section baru `#asetTab-investasi` (kartu ringkasan +
  `#investmentHoldingList` + tombol "＋ Tambah Holding"); baris
  `<script>document.write(MODAL_HTML[93]);</script>` ditambahkan tepat
  setelah baris `investmentOwnersModal` (index 92).
- `modules/asset/aset.js`: `ASET_TAB_ORDER` ditambah `'investasi'`;
  `setAsetTab()` menangani tab baru ini — toggle `u-dnone` (pola sama 4
  tab lain) + panggil `InvestmentListUI.render()` SAAT tab ini benar-benar
  dibuka (fresh data tiap kali, bukan cuma toggle class).
- `modules/shared/modules-render.js`: `renderPageContent('aset')` sekarang
  ikut memanggil `InvestmentListUI.render()` (pola sama presenter
  Manajemen — `PropertyManagementPresenter.render()` dkk — yang sudah ada
  di blok yang sama), supaya reload langsung ke tab Investasi / restore
  state tetap dapat data fresh tanpa perlu tap ulang tab-nya.
- `scripts/build.js`: `modules/asset/investasi-list-view.js` didaftarkan
  ke `GROUP_B`, tepat setelah `investasi-view.js` (dependency:
  `InvestmentListUI` butuh `Investment` DAN `InvestmentUI` sudah dimuat
  lebih dulu).
- `app-bundle-a.min.js` & `app-bundle-b.min.js`: di-rebuild penuh via
  `node scripts/build.js s466-investment-list-view-ui`. esbuild tetap
  tidak tersedia di sandbox ini (tanpa akses registry npm) — bundle TANPA
  minifikasi (raw concat, fallback bawaan build.js, sama seperti S465),
  valid (`node --check` lolos), `verify-bundle-freshness.js` konfirmasi
  hash source cocok.
- `index.html`, `app_production.html`, `sw.js`: `?v=` / `CACHE_NAME`
  disamakan ke `1183` oleh build.js (bagian rutin proses build). Versi
  build numerik 1182 → 1183.
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md`: regenerasi otomatis
  oleh build.js (291 file, 1995 identifier global; 15 family modul, 0
  tanpa test file langsung).

## Verifikasi

- `node scripts/build.js s466-investment-list-view-ui` — semua lint
  blocking lolos (`lintModalHtmlIndexDrift()` dkk), 2 kategori warning
  non-blocking pre-existing (catch block kosong, file oversized) tidak
  berubah krn sesi ini.
- `node --test tests/*.test.js` → **2984/2984 lolos, 0 gagal** (0 test
  baru ditambahkan sesi ini — lihat "Belum ditangani" di bawah).
- `node scripts/verify-window-expose.js` → 64 modul dipakai lewat
  data-action, semuanya sudah window-expose (`InvestmentListUI` ikut
  terverifikasi expose ke `window`).
- `node scripts/verify-bundle-freshness.js` → kedua bundle segar, hash
  source cocok.

## Belum ditangani (di luar scope sesi ini)

- ~~**Test coverage baru** untuk `InvestmentListUI`~~ — **SELESAI**, lihat
  "Sesi 466 (lanjutan) — Test coverage InvestmentListUI" di bawah.
- Fase 2 (UI riwayat & form transaksi Beli/Jual/Dividen per holding,
  wired ke `Investment.addTransaction()`), Fase 3 (UI Watchlist — badge
  `watchlistAlerts()`), Fase 4 (verifikasi 4 dead-read call site
  `invest-ai-widget.js`/`self-reward-ai-widget.js`/`dana-kelolaan.js`/
  `ownership-settings-presenter.js`/`user-finance-adapter.js` dgn data
  holding nyata) — sesuai breakdown §5 audit, menyusul di sesi terpisah.
- Lint (`eslint`) & minifikasi (`esbuild`) nyata — sama seperti S465,
  perlu dijalankan ulang di environment dgn akses `npm install` sebelum
  rilis production final.
- `docs/AUDIT_MATRIX.md` "Coverage Baseline" (Total files/JavaScript/
  Markdown) sudah drift dari jumlah file sungguhan (warning non-blocking
  dari build.js, PRE-EXISTING sejak sebelum sesi ini) — belum diupdate.

# Changelog — Sesi 466 (lanjutan) — Test coverage `InvestmentListUI`

## Konteks

Menindaklanjuti item "Belum ditangani" di atas — menulis test coverage
baru untuk `InvestmentListUI` (`modules/asset/investasi-list-view.js`,
Fase 1 BUG-INV-001 Opsi 3) yang sebelumnya belum ada file test khusus.
Fase 2 (UI transaksi Beli/Jual/Dividen), Fase 3 (UI Watchlist), Fase 4
(verifikasi 4 dead-read call site dgn data nyata) TETAP di luar scope —
lihat `AUDIT-BUILD-UI-INVESTASI-OPSI3.md` §5 untuk breakdown fase.

## Perubahan

- `tests/investment-list-ui-s466.test.js` (**baru**, 15 test case):
  dijalankan lewat source ASLI via `loadSource()` (bukan reimplementasi
  logic di test) dgn DOM tiruan STATEFUL (getElementById auto-vivify +
  menyimpan state antar panggilan) — pola sama persis
  `tests/asset-owners-flow-e2e-392a-to-392e.test.js`. Cakupan:
  - `render()`: kartu ringkasan portofolio (`_renderSummary`, 100% reuse
    `Investment.portfolioSummary()`) & daftar holding (`_renderList`),
    termasuk empty-state saat `D.investments` kosong dan kasus 2 holding
    (1 untung/1 rugi, cross-check `class="green"`/`class="red"`).
  - `openModal(id)`: mode Tambah (id kosong — form kosong, tombol
    Owners/Delete disembunyikan) vs mode Edit (prefill semua field dari
    holding yang ada, tombol Owners/Delete tampil); dropdown Jenis
    dirender apa adanya dari `INVESTMENT_TYPES`.
  - `save()`: jalur Tambah (`Investment.addHolding()`), jalur Edit
    (`Investment.updateHolding()` + tulis manual `unit`/`avgPrice`
    langsung ke object holding — sesuai catatan scope Fase 1 di kepala
    `investasi-list-view.js`, karena `recomputeHolding()`/UI transaksi
    belum ada), jalur gagal (nama kosong → `Error` dari
    `Investment.addHolding()` → toast peringatan, `D.investments` tidak
    berubah), & guard `Investment` belum dimuat (`typeof` undefined,
    dites dgn context terpisah yang HANYA me-load
    `investasi-list-view.js`, TANPA `investasi.js` — supaya
    `typeof Investment` benar-benar resolve ke `"undefined"`, bukan
    binding `const` yang sudah pernah di-load bareng di context lain).
  - `deleteFromModal()`: konfirmasi `askConfirm` true (holding terhapus +
    seluruh efek samping — `renderKekayaanBersih`/`hitungZakatMaal`/
    `renderDebtList`/`AIBus.emit`) vs false (tidak ada perubahan sama
    sekali), & guard `editId` null (no-op, tidak melempar).
  - `openOwnersModalForEdit()`: delegasi penuh ke
    `InvestmentUI.openOwnersModal(editId)` saat `editId` terisi, guard
    "simpan holding ini dulu" saat `editId` null, & guard `InvestmentUI`
    belum dimuat.
- Tidak ada perubahan pada `modules/asset/investasi-list-view.js` maupun
  `modules/asset/investasi.js` sendiri — sesi ini murni menambah test,
  0 perubahan behavior aplikasi.
- `docs/BUG_REGISTRY.md`: entri BUG-INV-001 diupdate — status regression
  test & catatan "Update Sesi 466 (lanjutan)" ditambahkan (status
  BUG-INV-001 TETAP **OPEN**, hanya item test coverage yang tertutup;
  Fase 2-4 masih belum dikerjakan).
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md`: regenerasi otomatis
  oleh `build.js` (test file baru ikut terhitung).
- `app-bundle-a.min.js`/`app-bundle-b.min.js`, `index.html`/
  `app_production.html`/`sw.js`, & konstanta versi (`MODAL_VERSION` dkk):
  di-bump/rebuild rutin lewat `node scripts/build.js
  s466-investment-list-ui-test-coverage` (0 perubahan source aplikasi,
  cuma versi & regenerasi bundle/docs otomatis — `?v=`/`CACHE_NAME` →
  1185).

## Verifikasi

- `node --test tests/investment-list-ui-s466.test.js` → **15/15 lolos, 0
  gagal**.
- `node --test tests/*.test.js` → **2999/2999 lolos, 0 gagal** (2984 test
  lama + 15 baru, **0 regresi**).
- `node scripts/build.js s466-investment-list-ui-test-coverage` — lolos
  semua lint blocking; 2 kategori warning non-blocking pre-existing
  (catch block kosong, file oversized) tidak berubah krn sesi ini.

## Belum ditangani (di luar scope sesi ini)

- Fase 2 (UI transaksi Beli/Jual/Dividen), Fase 3 (UI Watchlist), Fase 4
  (verifikasi 4 dead-read call site dgn data nyata) — MASIH belum
  dikerjakan, sesuai breakdown §5 `AUDIT-BUILD-UI-INVESTASI-OPSI3.md`.
- Lint (`eslint`) & minifikasi (`esbuild`) nyata — sama seperti sesi
  sebelumnya, perlu `npm install` di environment dgn akses registry.

---

# Changelog — Sesi 467 (BUG-INV-001 Opsi 3, Fase 2 + Fase 3: UI Transaksi & Watchlist)

## Konteks

Menindaklanjuti "Belum ditangani" Sesi 466 — mengerjakan Fase 2 (UI
Transaksi Beli/Jual/Dividen, §3.3) & Fase 3 (UI Watchlist, §3.5) dari
`AUDIT-BUILD-UI-INVESTASI-OPSI3.md`. Backend (`Investment.addTransaction()`/
`deleteTransaction()`/`getTransactions()`/`getWatchlist()`/`addWatch()`/
`updateWatch()`/`removeWatch()`/`watchlistAlerts()`) sudah lengkap & teruji
sejak awal — sesi ini murni lapisan UI, 0 perubahan pada `investasi.js`
sendiri. Fase 4 (verifikasi 4 dead-read call site dgn data nyata) TETAP di
luar scope — butuh smoke-test manual di browser dgn data produksi nyata.

## Perubahan

- `modules/asset/investasi-tx-view.js` (**baru**): `InvestmentTxUI` —
  modal `investmentTxModal` (riwayat transaksi holding + form tambah
  dengan toggle tipe Beli/Jual/Dividen, pola `type-toggle3` sama persis
  `billModal`). `open(holdingId)`/`openFromEdit()` (delegasi dari tombol
  statis baru "💱 Riwayat Transaksi" di `investmentModal`, pola sama
  persis `InvestmentListUI.openOwnersModalForEdit()`), `setType(type)`
  (toggle field qty/price vs amount), `render()` (100% reuse
  `Investment.getTransactions({investmentId})`, sudah terurut terbaru
  dulu — realizedGain ditampilkan khusus transaksi jual), `save()` (100%
  reuse `Investment.addTransaction()` — validasi qty/amount/jual-melebihi-
  unit sepenuhnya dari backend, 0 validasi baru di UI), `deleteTx(id)`
  (konfirmasi `askConfirm` + 100% reuse `Investment.deleteTransaction()`).
  Tidak ada fungsi update transaksi di UI — backend memang cuma
  add/delete (average-cost method), "edit" = hapus lalu catat ulang.
- `modules/asset/investasi-watch-view.js` (**baru**): `InvestmentWatchUI` —
  card "📈 Watchlist" baru di tab Investasi + modal `investmentWatchModal`
  (Tambah/Edit/Hapus). `render()` (100% reuse `Investment.getWatchlist()`
  + badge "🎯 Target tercapai" dari `Investment.watchlistAlerts()`, 0
  kondisi alert baru), `openModal(id)`/`save()`/`deleteFromModal()` — pola
  SAMA PERSIS `InvestmentListUI.openModal()`/`save()`/`deleteFromModal()`.
  `render()`-nya dipanggil dari `InvestmentListUI.render()` (1 titik SSOT
  baru di `investasi-list-view.js`) supaya kedua call-site render tab
  Investasi yang sudah ada (`modules-render.js` & `aset.js setAsetTab`)
  otomatis ikut me-refresh watchlist tanpa perlu disentuh.
- `modules/asset/investasi-list-view.js`: `render()` sekarang juga
  memanggil `InvestmentWatchUI.render()` (guard `typeof`); `openModal(id)`
  toggle tombol baru `investmentTxBtn` (sama pola `investmentOwnersBtn` —
  cuma tampil di mode Edit).
- `modules/shared/modals.js`: 2 modal baru ditambahkan ke `MODAL_HTML`
  (index 94 `investmentTxModal`, index 95 `investmentWatchModal`, total
  96 elemen) + 1 tombol baru "💱 Riwayat Transaksi" disisipkan ke dalam
  `investmentModal` yang sudah ada (setelah tombol "⚖️ Atur Porsi
  Kepemilikan") — catatan hint di `investmentModal` juga diperbarui
  (tidak lagi bilang "menyusul di sesi berikutnya"). `MODAL_VERSION` →
  `s467-investment-list-ui-test-coverage`.
- `index.html`, `app_production.html`: `document.write(MODAL_HTML[94])`/
  `[95]` ditambahkan setelah `[93]`; card baru "📈 Watchlist" ditambahkan
  ke `#asetTab-investasi` (setelah card "📋 Daftar Holding").
- `scripts/build.js`: `investasi-tx-view.js` & `investasi-watch-view.js`
  didaftarkan ke `GROUP_B`, tepat setelah `investasi-list-view.js`
  (dependency: `InvestmentTxUI.openFromEdit()` butuh `InvestmentListUI.
  editId`, dan `InvestmentListUI.render()` sekarang memanggil
  `InvestmentWatchUI.render()`).
- `tests/investment-tx-watch-ui-s467.test.js` (**baru**, 20 test case):
  dijalankan lewat source ASLI via `loadSource()` + DOM tiruan STATEFUL,
  pola sama persis `tests/investment-list-ui-s466.test.js`. Cakupan
  `InvestmentTxUI`: `open()`/`openFromEdit()` (guard editId kosong &
  delegasi), `render()` (empty-state), `setType()` (toggle visibility),
  `save()` (beli → unit/avgPrice holding ter-update via
  `recomputeHolding()`, dividen → amount tercatat tanpa mengubah unit,
  jual melebihi unit → toast error dari backend, 0 tersimpan),
  `deleteTx()` (konfirmasi true/false, unit dihitung ulang setelah
  hapus). Cakupan `InvestmentWatchUI`: `render()` (empty-state, badge
  "Target tercapai" cuma muncul utk item yang lolos syarat
  `lastPrice<=targetPrice`), `openModal()` (mode Tambah vs Edit, toggle
  tombol Hapus), `save()` (jalur Tambah/Edit/gagal nama kosong),
  `deleteFromModal()` (konfirmasi true/guard editId null). Ditutup dgn 1
  test integrasi: `InvestmentListUI.render()` ikut memanggil
  `InvestmentWatchUI.render()`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh (TANPA
  minifikasi, esbuild masih tidak tersedia di sandbox ini — sama seperti
  S465/S466).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  1186 (bagian rutin proses build).
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`
  — konstanta versi disamakan ke `s467-investment-list-ui-test-coverage`
  (rutin, `bumpVersionEverywhere()`).
- `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
  (293 file, 1997 identifier global; 15 family, 0 tanpa test langsung).
- `docs/BUG_REGISTRY.md`: entri BUG-INV-001 diupdate — "Update Sesi 467"
  ditambahkan (status BUG-INV-001 TETAP **OPEN**, Fase 1-3 selesai, Fase
  4 masih belum dikerjakan).

## Verifikasi

- `node --test tests/investment-tx-watch-ui-s467.test.js` → **20/20
  lolos, 0 gagal**.
- `node --test tests/*.test.js` → **3019/3019 lolos, 0 gagal** (2999 test
  lama + 20 baru, **0 regresi**).
- `node scripts/build.js` — lolos semua lint blocking (termasuk
  `lintModalHtmlIndexDrift()` — 96 elemen `MODAL_HTML` vs 96
  `document.write(MODAL_HTML[N])`); `verify-window-expose.js` lolos
  (`InvestmentTxUI`/`InvestmentWatchUI` ter-expose ke `window`); kedua
  bundle lolos `node --check`.

## Belum ditangani (di luar scope sesi ini)

- Fase 4 (verifikasi 4 dead-read call site — `invest-ai-widget.js`,
  `self-reward-ai-widget.js`, `dana-kelolaan.js`,
  `ownership-settings-presenter.js`, `user-finance-adapter.js` — dgn
  data holding produksi nyata) — butuh smoke-test manual di browser,
  tidak bisa dilakukan dari sandbox headless.
- Lint (`eslint`) & minifikasi (`esbuild`) nyata — sama seperti sesi
  sebelumnya, perlu `npm install` di environment dgn akses registry.
- `docs/AUDIT_MATRIX.md` "Coverage Baseline" drift (pre-existing,
  housekeeping minor, bukan bagian BUG-INV-001) — belum disentuh.
