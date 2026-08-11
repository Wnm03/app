# DESIGN-S540-CUSTODIAN-GROUPING.md — Rencana True Grouping Instrumen per Institusi

## Status
**DIKUNCI (Design Lock disetujui user).** Keputusan final di bawah.
Eksekusi dimulai dari S540-A (Tahap 1 — registry fondasi).

## Keputusan final (disetujui user)

| Item | Keputusan |
|---|---|
| Data model | Opsi A (Registry + `custodianId`) |
| Registry | `D.investmentCustodians[]` |
| Referensi | `D.investments[].custodianId` |
| Seed otomatis | Tidak |
| Backfill data lama | Tidak |
| Holding tanpa custodian | **Flat di luar grup** (BUKAN grup "Lainnya" — data lama tidak boleh tersembunyi di balik grup baru) |
| Assign | Manual per holding (S540-C) |
| Mass assign | **Non-goal S540** — Design Lock terpisah kalau dibutuhkan nanti |
| `build()` | Tidak diubah untuk grouping — grouping murni di layer render presenter |
| Rumus finansial | Tidak disentuh |
| `investasi.js` | Hanya disentuh di S540-B |
| Regression | 3704+/3704+ PASS wajib tiap tahap |
| Build | Terpisah setiap tahap |
| ZIP | 1 tahap = 1 ZIP |

## Progres eksekusi
- [x] **S540-A — Registry fondasi.** `modules/shared/custodian-registry.js`
  (pola identik `owner-registry.js`) + `tests/s540a-custodian-registry.test.js`
  (9 test baru, mirror `s489-owner-registry.test.js`). 0 wiring ke
  `investasi.js`/UI/presenter. Terdaftar di `scripts/build.js` (ikut
  ter-bundle, tapi 0 consumer memanggilnya). Regression 3713/3713 PASS
  (3704 lama + 9 baru). Build v1270 selesai. ZIP: lihat
  `S540A-FULL-RELEASE.zip` / `kw_patch_v1269-to-v1270_s540a-custodian-registry.zip`.
- [x] **S540-B — field `custodianId` di `investasi.js` (read-only).**
  `Investment.addHolding()` sekarang set `custodianId: null` default.
  Holding lama TANPA field ini sama sekali tetap terbaca normal
  (`custodianId: undefined`, bukan dipaksa `null`) — dibuktikan test
  eksplisit. `updateHolding()` SENGAJA belum punya jalur `patch.custodianId`
  (scope S540-C) — patch itu diam-diam diabaikan, 0 crash. 6 test baru
  (`tests/s540b-investasi-custodian-id.test.js`), regression 3719/3719
  PASS. Build v1271. ZIP:
  `S540B-FULL-RELEASE.zip` / `kw_patch_v1270-to-v1271_s540b-investasi-custodianid.zip`.
- [x] **S540-C — UI assign kustodian per holding.** `Investment.updateHolding()`
  sekarang punya jalur tulis `patch.custodianId` (falsy -> `null`). Dropdown
  "Kustodian (opsional)" ditambahkan ke `investmentModal` (modals.js,
  di bawah field Catatan) — opsi diisi `CustodianRegistry.listAll()` +
  "➕ Buat kustodian baru…" (prompt nama -> `findOrCreate()`, pola sama persis
  `DanaTitipanCommitmentUI.addNewOwner()` S523-B). `InvestmentListUI`
  (investasi-list-view.js) merender dropdown di `openModal()`
  (`_renderCustodianOptions()`), menangani pilihan "buat baru"
  (`onCustodianSelectChange()`), & menulis pilihan lewat `updateHolding()`
  di `save()` (holding baru: `addHolding()` dulu lalu `updateHolding()`
  terpisah utk custodianId, karena `addHolding()` sengaja tidak diubah
  tanda tangannya). 0 grouping, 0 perubahan `build()`/formula portfolio —
  murni assignment referensi. 7 test baru
  (`tests/s540c-investasi-custodian-assign.test.js`) + 1 test lama
  (`s540b-investasi-custodian-id.test.js` #5) diupdate krn behaviornya
  sengaja berubah sesuai rencana tahap ini. Regression 3726/3726 PASS.
  Build v1272. ZIP: `S540C-FULL-RELEASE.zip` /
  `kw_patch_v1271-to-v1272_s540c-investasi-custodian-ui-assignment.zip`.
- [x] **S540-D — true grouping di render presenter.** `_renderNow()`
  (`dana-titipan-portfolio-presenter.js`) group `o.holdings` by
  `custodianId` SEBELUM render ke HTML, lewat `_groupHoldingsByCustodian()`
  baru (baca `custodianId` LANGSUNG dari `Investment.getHolding()`, BUKAN
  dari hasil `build()` — `build()` **0 diubah**, dibuktikan test #1).
  Satu kustodian = satu `<details class="titipan-custodian-group">`
  expandable (label nama via `CustodianRegistry.listAll()` + jumlah
  instrumen). Holding tanpa `custodianId` (null/undefined, termasuk semua
  data lama) tetap FLAT di luar grup — BUKAN grup "Lainnya", sesuai
  keputusan final di bawah. 10 test baru
  (`tests/s540d-investasi-custodian-grouping.test.js`). Regression
  3736/3736 PASS. Build v1273. ZIP: `S540D-FULL-RELEASE.zip` /
  `kw_patch_v1272-to-v1273_s540d-investasi-custodian-grouping.zip`.

**Seluruh Design Lock S540 SELESAI (4/4 tahap).**

## Follow-up pasca-S540 (di luar Design Lock, dicatat terpisah)
Setelah S540 selesai, dicatat 3 item lanjutan opsional (bukan bagian
Design Lock ini, non-goal S540 tetap non-goal):
- [x] **S541 — Subtotal per grup kustodian.** Header `<summary>` grup
  kustodian (`<details class="titipan-custodian-group">`, S540-D)
  sekarang tampilkan subtotal pokok→kini±gain per kustodian tanpa perlu
  expand (`_groupSubtotal()` baru, 0 rumus finansial baru — murni jumlah
  `hh.allocatedPrincipal`/`currentValue`/`gain` yang sudah ada di dalam
  grup). `build()`/`_groupHoldingsByCustodian()` 0 diubah. 7 test baru
  (`tests/s541-titipan-custodian-group-subtotal.test.js`). Regression
  3743/3743 PASS. Build v1274. Detail: `s541-SESSION-NOTE.md`.
- [ ] **Mass assign kustodian** — TETAP non-goal, sama seperti keputusan
  final Design Lock S540 di atas. Butuh Design Lock terpisah (keputusan
  UX: pilih banyak holding sekaligus → assign 1 kustodian) sebelum
  dikerjakan.
- [x] **S542 — Rename/hapus kustodian dari registry.** `CustodianRegistry`
  (S540-A) nambah `rename(id, newName)`/`remove(id)` (pola guard `typeof` &
  validasi sama persis `findOrCreate()`, 0 pola baru). UI trigger: link
  "✏️ Ubah Nama Kustodian" / "🗑️ Hapus Kustodian" di bawah dropdown
  `#investCustodian` (investmentModal), tampil HANYA kalau dropdown sedang
  terpilih ke entri kustodian nyata (`InvestmentListUI._syncCustodianActionButtons()`
  baru). Hapus kustodian WAJIB konfirmasi eksplisit (`askConfirm()`) yang
  menjelaskan holding terkait TIDAK ikut terhapus — cuma fallback ke label
  generik "Kustodian" (perilaku aman S540-D test #8, TIDAK diubah sesi ini).
  0 cascading delete ke `D.investments[]`. 10 test baru
  (`tests/s542-custodian-rename-remove.test.js`). Regression 3753/3753
  PASS. Build v1275. Detail: `s542-SESSION-NOTE.md`.


## Latar belakang
Permintaan awal user: instrumen seperti "Sucorinvest", "Schroder", "BNI AM"
seharusnya tampil sebagai **sub-item** dari 🏦 Majoris (platform/kustodian
tempat instrumen itu dibeli), bukan baris sejajar di list holding owner.

Yang sudah dikerjakan (S535): **indent visual seragam** — semua baris
`.titipan-holding-row` dapat border-left+indent yang sama, TIDAK ada relasi
parent-child sungguhan. Ini murni kosmetik.

**Audit data model (dikerjakan sesi ini):**
- `D.investments[]` (`modules/asset/investasi.js`) — field yang ada saat ini
  cuma `id, name, type, unit, avgPrice, currentPrice, ...` (+ ownership
  fields). **0 field institusi/kustodian/parent sama sekali.**
  "🏦 Majoris" saat ini kemungkinan besar cuma nama holding biasa (bank/RDN
  dicatat sebagai 1 investment sendiri) — hubungannya ke Sucorinvest/
  Schroder/BNI AM murni di kepala user, tidak ada di data.
- `o.holdings[]` (hasil `DanaTitipanPortfolioAPI.build()`,
  `dana-titipan-portfolio-presenter.js`) adalah **flat array**, di-generate
  ulang tiap render dari union `Investment.getHoldings()` + `D.assets`. Tidak
  ada tempat untuk menyimpan relasi hierarki bahkan kalau mau — perlu field
  baru di sumbernya (`D.investments[]`), bukan di hasil derived `build()`.
- **Preseden yang bisa dipakai ulang**: `OwnerRegistry`
  (`modules/shared/owner-registry.js`, S489) — pola registry kecil
  `{id, name}` + `findOrCreate(name)` yang SUDAH terbukti jalan untuk
  masalah serupa (dedup entitas by nama, referensi via `id` di record lain).
  Kustodian/institusi bisa pakai pola identik.

**File yang kena HARD RULE proteksi** (dari disiplin proyek): `investasi.js`
ADA di daftar file terproteksi. Perubahan skema di sini WAJIB eksplisit
disetujui dulu — ini salah satu alasan utama kenapa item ini butuh Design
Lock, bukan sekadar "sesi ringan".

## Tujuan
User bisa melihat instrumen dikelompokkan di bawah platform/kustodiannya
(mis. semua reksadana di Majoris nge-collapse jadi 1 grup), dengan relasi
yang BENAR-BENAR ada di data (bukan visual doang) — supaya konsisten dipakai
di semua tempat yang menampilkan holding (Dana Titipan portfolio card,
mungkin juga Investasi tab utama nanti).

## Prinsip desain (non-negotiable)
1. **0 mutasi data existing tanpa migrasi eksplisit.** Investment lama yang
   belum diisi `custodianId` HARUS tetap tampil benar (fallback: tanpa grup/
   grup "Lainnya"), TIDAK boleh hilang atau error.
2. **1 field baru, bukan restrukturisasi.** Tambah `custodianId` (opsional)
   ke `D.investments[]` — TIDAK mengubah field lain yang sudah ada, TIDAK
   mengubah kontrak `Investment.getHoldings()` selain menambah 1 field pass-
   through.
3. **Registry kecil terpisah**, pola sama persis `OwnerRegistry` (S489):
   `D.investmentCustodians: [{id, name, icon?}]`, seed KOSONG (tidak
   backfill otomatis dari nama existing — user assign manual per holding,
   sama seperti pola Owner Registry).
4. **`build()` di `dana-titipan-portfolio-presenter.js` HANYA baca, tidak
   agregasi ulang.** Grouping-nya dilakukan di layer render (presenter),
   bukan mengubah rumus `allocatedPrincipal`/`currentValue`/`gain` yang
   sudah ada — 0 rumus finansial baru.
5. **Regression penuh (3704 test) WAJIB 100% PASS** tiap tahap, sebelum &
   sesudah build (pola baku proyek).
6. **`investasi.js` HANYA disentuh di tahap yang eksplisit membahas field
   baru** — bukan disentuh "sambil lewat" di tahap UI.

## Opsi data model (dibandingkan)

| Opsi | Cara kerja | Plus | Minus |
|---|---|---|---|
| **A — Registry + `custodianId` (DIREKOMENDASIKAN)** | `D.investmentCustodians[{id,name,icon}]`, `D.investments[].custodianId` referensi ke situ. Pola identik `OwnerRegistry`. | Robust (rename kustodian 1 tempat, tidak perlu update semua holding); konsisten pola proyek; gampang extend (logo/warna per kustodian nanti). | 1 entity baru + 1 field baru + UI assign (dropdown pilih/buat kustodian) — kerja lebih banyak dari Opsi B. |
| **B — Free-text `custodianName` di tiap investment** | Tambah `custodianName` string langsung di `D.investments[]`, grouping by exact-match string. | Lebih cepat dikerjakan, tidak ada entity baru. | Rawan typo ("Majoris" vs "majoris " vs "Bank Majoris") bikin grup pecah; rename harus update semua holding manual; tidak scalable kalau nanti mau tambah field lain per kustodian. |
| **C — Parse dari nama holding (implisit)** | Tebak parent dari holding lain yang namanya cocok pattern (mis. holding bertype "bank"). | 0 field baru. | Fragile, gampang salah tebak, TIDAK direkomendasikan — ditolak di awal, dicatat di sini biar tidak diusulkan ulang. |

**Rekomendasi: Opsi A.** Sejalan dengan pola `OwnerRegistry` yang sudah
terbukti aman & dipakai proyek ini, dan lebih tahan lama untuk kebutuhan
serupa di masa depan (Investasi tab utama, laporan per kustodian, dst).

## Rencana tahapan (kalau Opsi A disetujui)
Ikut disiplin "1 task = 1 sesi" seperti `PLAN-owner-registry-multi-session.md`:

1. **Tahap 1 — Fondasi registry (0 wiring UI).** Buat
   `modules/shared/custodian-registry.js` (pola identik
   `owner-registry.js`): `listAll()`, `findOrCreate(name)`,
   `D.investmentCustodians` seed kosong. 0 file lain disentuh. Test baru
   khusus file ini.
2. **Tahap 2 — Field `custodianId` di `investasi.js` (READ-ONLY dulu).**
   Tambah `custodianId: null` default di `addHolding()`, TIDAK ada UI untuk
   mengisinya masih. Verifikasi `getHoldings()` pass-through field ini tanpa
   pecah test existing (holding lama otomatis `custodianId: null`/undefined,
   harus tetap render sama seperti sekarang — regression guard eksplisit).
3. **Tahap 3 — UI assign kustodian per holding.** Dropdown "Pilih/Buat
   Kustodian" di form edit investment (pola sama dropdown "Pilih Aset" yang
   sudah ada) — konsumsi `CustodianRegistry.findOrCreate()`. Murni CRUD,
   0 agregasi baru.
4. **Tahap 4 — Grouping di render `dana-titipan-portfolio-presenter.js`.**
   `_renderNow()` (S539) group `o.holdings` by `custodianId` SEBELUM
   `.map()` ke HTML — holding tanpa `custodianId` masuk grup "Lainnya"
   (atau tampil flat seperti sekarang, opsi UX perlu diputuskan user).
   0 perubahan ke `build()`/`DanaTitipanPortfolioAPI` — grouping murni di
   layer presenter render.

Setiap tahap: regresi 3704 penuh PASS sebelum lanjut tahap berikutnya,
version bump + build terpisah per tahap (bukan digabung 1 commit besar).

## Kriteria selesai keseluruhan
- Holding dengan `custodianId` sama tampil terkelompok di bawah 1 header
  kustodian yang bisa expand/collapse.
- Holding TANPA `custodianId` (semua data lama) tetap tampil, tidak hilang,
  tidak error — baik flat atau di grup "Lainnya" (keputusan UX Tahap 4).
- `Investment.getHoldings()` tetap 100% backward-compatible untuk
  consumer lain yang belum tahu soal `custodianId` (investasi-list-view.js,
  invest-ai-widget.js, dll — 0 pecah).
- Regression 3704/3704 PASS di titik akhir seluruh tahap.

## Non-goals (sengaja TIDAK dikerjakan di rencana ini)
- Tidak membuat grouping multi-level (institusi > sub-akun > instrumen) —
  1 level parent-child saja.
- Tidak migrasi/backfill otomatis holding lama ke kustodian tertentu
  (konsisten prinsip "0 mutasi data existing" — sama seperti Gate #1
  OwnerRegistry).
- Tidak menyentuh Aset (`D.assets`) di paket ini — scope awal cuma
  `D.investments[]`/Dana Titipan holdings. Perluasan ke Aset (kalau
  dibutuhkan) adalah Design Lock terpisah.

## Pertanyaan yang perlu dijawab sebelum eksekusi Tahap 1
1. Setuju Opsi A (registry) dibanding Opsi B (free-text)?
2. Holding tanpa kustodian: tampil flat di luar grup (seperti sekarang),
   atau masuk grup "Lainnya" yang bisa di-collapse juga?
3. Assign kustodian per holding: dilakukan manual 1-per-1 lewat form edit
   (Tahap 3), atau perlu tombol "assign massal" untuk holding lama?
