# SA12 — Migrasi atribut event inline dinamis di `investasi-view.js`

**⚠️ PERBEDAAN PENTING dari sesi SA11 sebelumnya — baca dulu sebelum apply:**
Sesi ini **HANYA menerima 2 ZIP** yang W upload (`patch-SA11-aset-owners-dynamic-inline-attr.zip`
dan `patch-fuelpriceref-harga-sync.zip`), **BUKAN proyek penuh** (tidak ada
`package.json`, `scripts/build.js`, `tests/helpers/loadSource.js`, atau
~300 file module lain yang disebut di `app-bundle-b.min.js`). Karena itu,
sesi ini **TIDAK BISA** menjalankan `node scripts/build.js`, `node --test
tests/*.test.js` (full suite), atau regenerasi bundle/HTML/sw.js seperti
alur wajib di `docs/SESSION_RULES.md`. Detail apa yang bisa & tidak bisa
dikerjakan, dan apa yang W perlu lakukan sebelum sesi ini dianggap "selesai"
sesuai SESSION_RULES, ada di bagian **"Batasan sandbox sesi ini"** di bawah.

## Latar belakang

Lanjutan `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` (rekomendasi #3) &
`SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md`. SA11 sudah
menuntaskan `aset-owners.js` (10 titik). SA12 (sesi ini) menuntaskan
`investasi-view.js` (10 titik) — family fitur sama "Atur Porsi Kepemilikan",
pola migrasi identik dgn SA11.

## Cara file sumber didapat (krn tidak ada akses proyek penuh)

`modules/asset/investasi-view.js` **diekstrak APA ADANYA** dari
`app-bundle-b.min.js` (file dari ZIP SA11) — bundle itu, menurut
SESSION-NOTE-SA11, dibuild **TANPA minifikasi** (esbuild tidak ada di
sandbox), jadi isinya adalah source asli tiap file yang di-concat mentah2
oleh `build.js`, bukan hasil minify. Titik potong file (baris pertama
komentar header `// investasi-view.js — InvestmentUI: ...` sampai baris
terakhir `window.InvestmentUI = InvestmentUI;`) diverifikasi dgn:
- Panjang hasil ekstraksi: **1061 baris** — cocok PERSIS dgn kolom "Baris"
  utk `modules/asset/investasi-view.js` di `docs/FILE-MAP.md` (dari ZIP
  SA11: `| 236 | \`modules/asset/investasi-view.js\` | 1061 | ... |`).
- `node --check` atas hasil ekstraksi: sintaks valid.

Pendekatan ini **hanya bisa dipakai kalau bundle memang dibuild tanpa
minifikasi** (persis kondisi ZIP SA11 kemarin) — kalau sesi depan mengirim
bundle yang SUDAH diminify (esbuild akhirnya terpasang), cara ini TIDAK
akan berfungsi lagi & investasi-view.js/file lain HARUS dikirim sebagai
source asli.

## Perubahan

**`modules/asset/investasi-view.js`** — 10 titik dimigrasi, pola identik SA11
(`onX="Fn(arg,this.value)"` → `data-onX="Fn" data-onX-args='[arg,"$value"]'`):

1. `_ownerNameFieldHtml()` — input nama pemilik (free-text fallback)
2. `_ownerNameFieldHtml()` — select pilih pemilik (`onOwnerSelectChange`)
3. `_renderOwnersList()` — input Porsi (%)
4. `_renderOwnersList()` — input Nominal (Rp)
5. `_renderOwnersList()` — checkbox "Ini saya" (`$checked`, bukan `$value`)
6. `_ownerSettlementFieldHtml()` — select Status Dana
7. `_renderRebalancePanel()` — select pilih pemilik manual
8-10. `_renderRebalancePanel()` — 3 radio metode rebalance (proporsional/largest/manual)

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil.
Semua fungsi `onOwner*`/`setRebalance*` di `InvestmentUI` tidak disentuh.

## Verifikasi yang BISA dilakukan di sandbox ini

1. **Gate statis (regex S1588):** 0 kemunculan `onclick=`/`onchange=`/
   `oninput=`/dst (bukan `data-*`) tersisa di file ini — dicek `tests/investasi-view-dynamic-inline-attr-sa12.test.js` (test pertama).
2. **Tepat 10 titik `data-onX="InvestmentUI...."`** — dicek test kedua.
3. **Fungsional end-to-end lewat dispatcher ASLI** (diekstrak dari
   `modules/shared/features-helpers-global-security.js` yang SAMA persis
   dgn yang dipakai SA11 — file ini AKUMULASI dari ZIP SA11, tidak diubah
   lagi sesi ini): markup hasil `_renderOwnersList()`/`_ownerNameFieldHtml()`
   diproses dispatcher nyata → `onOwnerNameInput`/`onOwnerIsSelfToggle`/
   `onOwnerSettlementChange`/`onOwnerPorsiInput` benar-benar terpanggil dgn
   argumen tepat & draft ter-update. **10 test baru, semua dijalankan nyata
   di sandbox ini lewat `node --test tests/investasi-view-dynamic-inline-attr-sa12.test.js`
   → 12 pass, 0 fail** (10 test di atas + gate + count).

**Beda gaya dari test SA11:** test ini pakai `vm.Script` mandiri dgn stub
`Investment` minimal (3 method: `getHolding`/`getOwners`/`getOwnerSettlement`
— persis yang dipanggil `openOwnersModal()`), BUKAN
`tests/helpers/loadSource.js` + `modules/asset/investasi.js` asli (tidak
tersedia di sandbox ini). Assertion & cakupan setara SA11, murni beda
mekanisme loading. **Sesi depan yang punya akses proyek penuh SEBAIKNYA**
menyamakan gaya ke `loadSource()` (ganti stub `Investment` jadi module asli)
supaya konsisten dgn test lain di proyek — lihat komentar header test file.

## Batasan sandbox sesi ini — WAJIB ditindaklanjuti W sebelum merge

Yang **TIDAK** dikerjakan sesi ini (beda dari alur wajib SESSION_RULES.md),
krn file-file berikut tidak ada di 2 ZIP yang diupload:

1. **`node scripts/build.js`** — TIDAK dijalankan (`scripts/build.js` tidak
   ada). Versi build (`?v=...`, `CACHE_NAME`, konstanta versi di 5 file
   source) **TIDAK di-bump** sesi ini — masih di angka lama (v1592 dari
   SA11). `app-bundle-a.min.js`/`app-bundle-b.min.js`/`index.html`/
   `app_production.html`/`sw.js` **TIDAK disertakan** di ZIP patch ini (drop
   dari SA11 apa adanya akan MENYESATKAN krn tidak mencerminkan perubahan
   SA12 — lebih aman tidak menyertakan drpd menyertakan versi basi).
2. **`node --test tests/*.test.js` (FULL SUITE)** — TIDAK bisa dijalankan
   (proyek penuh, `tests/helpers/loadSource.js`, ~300 module lain tidak
   ada). Hanya file test BARU sesi ini yang dijalankan & lolos (lihat di
   atas) — regresi ke file LAIN (mis. `tests/investasi-...-flow-e2e-*.test.js`
   kalau ada yang menegaskan pola `onOwnerNameInput\(1` inline lama, mirip
   fix regresi SA11 di `asset-owners-flow-e2e-392a-to-392e.test.js`) **BELUM
   dicek** — W/sesi depan WAJIB grep proyek asli utk pola inline lama
   `InvestmentUI\.onOwner.*\(` atau `InvestmentUI\.setRebalance.*\(` di
   file test lain sebelum menganggap SA12 aman digabung.
3. **`docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md`/`docs/RELEASE-GATE-LOG.md`**
   — TIDAK diregenerasi (butuh script build yang tidak tersedia).
4. **Release gate (`node tests/verify-release-ready.js`)** — TIDAK
   dijalankan.

### Langkah yang W perlu lakukan di lingkungan proyek penuh:
1. Timpa `modules/asset/investasi-view.js` dari ZIP ini ke project asli
   (basis: v1592 pasca-SA11).
2. Timpa/tambahkan `tests/investasi-view-dynamic-inline-attr-sa12.test.js`.
3. Jalankan `node --test tests/*.test.js` full suite — pastikan tetap
   hijau (harusnya 5671 + 10 = 5681, TAPI ini estimasi, bukan angka
   terverifikasi — cek langsung di lingkungan W).
4. Jalankan `node scripts/build.js` seperti biasa (bump versi otomatis).
5. Jalankan `node tests/verify-release-ready.js` (override lint/minify
   seperti sesi2 sebelumnya kalau eslint/esbuild masih belum terpasang).
6. Update `docs/CLAUDE.md` sesuai hasil di atas.

## Rekomendasi tindak lanjut

1. **SA13-SA18 masih 0 disentuh** (103 dari 123 titik audit S1588 tersisa
   di 36 file lain). Urutan berikutnya sesuai rencana SA11:
   **SA13 (`akun.js`, AccOwners, 7 titik)**.
2. **Kalau memungkinkan, upload ZIP proyek PENUH (bukan cuma patch) di sesi
   berikutnya** — supaya sesi Claude bisa menjalankan full test suite +
   build script sendiri sesuai SESSION_RULES.md, bukan verifikasi
   sebagian/mandiri seperti sesi ini. Alternatif: upload minimal
   `package.json` + `tests/helpers/loadSource.js` + module dependency yang
   relevan tiap sesi SA1x kalau ZIP proyek penuh terlalu besar.
3. `npm install --save-dev eslint esbuild` — sama seperti rekomendasi SA11,
   makin mendesak.

## File yang berubah (masuk ZIP patch ini)

```
modules/asset/investasi-view.js                        (SA12 — 10 titik dimigrasi, BARU di ZIP ini)
modules/asset/aset-owners.js                            (carry-over SA11, TIDAK diubah lagi)
modules/vehicle/fuel-price-ref.js                       (carry-over sesi fuel-price-ref, TIDAK diubah lagi)
modules/shared/modals.js                                (carry-over sesi fuel-price-ref, TIDAK diubah lagi)
modules/shared/features-helpers-global-security.js      (carry-over SA11, TIDAK diubah lagi)
modules/shared/modules-calc.js                          (carry-over SA11, TIDAK diubah lagi)
modules/shared/modules-render.js                        (carry-over SA11, TIDAK diubah lagi)
chat-action-handlers.js                                 (carry-over SA11, TIDAK diubah lagi)
tests/aset-owners-dynamic-inline-attr-sa11.test.js      (carry-over SA11)
tests/asset-owners-flow-e2e-392a-to-392e.test.js        (carry-over SA11)
tests/fuel-price-ref.test.js                            (carry-over sesi fuel-price-ref)
tests/investasi-view-dynamic-inline-attr-sa12.test.js   (BARU, SA12, 12 test — dijalankan & lolos di sandbox ini)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md             (carry-over)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md    (carry-over)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (BARU, sesi ini)
```

**TIDAK disertakan sesi ini** (lihat "Batasan sandbox" di atas):
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
`docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md`.
