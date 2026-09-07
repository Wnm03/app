# SESSION-NOTE-S1588 — Perbaiki 4 test pre-existing yang gagal (regex stale S750/S751/S752)

**Basis:** dibangun di atas hasil sesi sebelumnya (versi 1587, `s756-fuel-jenis-
unknown-edit-legacy`, lihat `SESSION-NOTE-S1587-txcat-txsubcat-dropdown-focus-fix.md`).
Timpa semua file di ZIP patch ini ke project asli. Versi baru: **1588**,
`s757-fuel-jenis-unknown-edit-legacy`.

## Kenapa sesi ini duluan (prioritas dari daftar saran W)

Dari 6 saran tambahan W di luar session note S1587, sesi ini mengerjakan
**saran #4**: "Perbaiki dulu 4 test yang gagal pre-existing sebelum menambah
test baru — supaya suite hijau 100% jadi baseline yang jelas." Ini dipilih
duluan (bukan saran #1 konversi 10 field `simpleAutocompleteInput`, atau
#3 test regresi generik) karena keduanya butuh baseline suite hijau dulu
supaya kalau ada test merah baru setelah perubahan berikutnya, itu jelas
regresi baru — bukan bercampur dengan 4 kegagalan lama yang sudah "dianggap
wajar". Sesuai disiplin one-task-per-session, saran #1/#2/#3/#5/#6 SENGAJA
belum dikerjakan sesi ini (lihat bagian "Rekomendasi tindak lanjut").

## Root cause 4 test yang gagal

4 test gagal ada di 2 file:
- `tests/fuel-jenis-dropdown-s750.test.js` (2 test)
- `tests/fuel-ref-modal-s751.test.js` (1 test)
- `tests/fuel-ref-modal-s752.test.js` (1 test)

Semua 4 gagal karena regex assertion yang **strict 2-argumen**:
```
onchange="FuelPriceRef.onSelectChange('bbmJenis','bbmHarga')"
onchange="FuelPriceRef.onSelectChange('txBbmJenis','txBbmHargaL')"
```

Saya cek langsung ke `modules/shared/modals.js` (via `loadSource` +
`MODAL_HTML`, sama seperti cara test-nya baca markup) — source AKTUAL sudah
3-argumen sejak sesi lain (kemungkinan S753/S755 terkait fuel-jenis-per-vehicle):
```
onchange="FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId)"
onchange="FuelPriceRef.onSelectChange('txBbmJenis','txBbmHargaL',document.getElementById('txBbmVehicle').value)"
```
Argumen ke-3 (`vehicleId`) itu memang dipakai `FuelPriceRef.onSelectChange`
(cek `modules/vehicle/fuel-price-ref.js:168`, signature-nya
`onSelectChange(selectId,hargaId,vehicleId)`) — jadi ini BUKAN bug di kode
aplikasi, murni test S750/S751/S752 yang ketinggalan update saat argumen
ke-3 ditambahkan di sesi lain (persis seperti catatan di SESSION-NOTE-S1587).

## Perbaikan

Di ketiga file test, regex diubah dari strict 2-arg jadi tolerant terhadap
argumen tambahan setelah `'bbmHarga'`/`'txBbmHargaL'`:
```
// sebelum (strict, false-negative begitu ada arg ke-3):
/onchange="FuelPriceRef\.onSelectChange\('bbmJenis','bbmHarga'\)"/
// sesudah (tolerant thd argumen tambahan apa pun sebelum penutup `)"`):
/onchange="FuelPriceRef\.onSelectChange\('bbmJenis','bbmHarga'[^"]*\)"/
```
Pola sama untuk `txBbmJenis`/`txBbmHargaL`. Dipilih pendekatan tolerant
(bukan hardcode `,curVehicleId` persis) supaya kalau argumen ke-3 berubah
lagi di sesi mendatang (mis. ganti nama variabel), test ini tidak ikut jadi
stale lagi — assersi yang dijaga tetap sama: dua argumen pertama benar &
onchange memang wired ke fungsi yang benar, bukan detail argumen tambahan.
Tidak ada perubahan di kode aplikasi (`modules/shared/modals.js` dll) sesi
ini — murni perbaikan test.

File test diedit: `tests/fuel-jenis-dropdown-s750.test.js`,
`tests/fuel-ref-modal-s751.test.js`, `tests/fuel-ref-modal-s752.test.js`.

## Build & test

- `node --test tests/*.test.js` SEBELUM fix: 5650 pass, **4 fail** (persis
  4 yang disebut di atas).
- `node --test tests/*.test.js` SETELAH fix: **5654 pass, 0 fail** — suite
  100% hijau, baseline bersih tercapai.
- `node scripts/build.js` dijalankan — versi naik dari 1587 → **1588**,
  `s756-...` → `s757-...`. Sintaks kedua bundle lolos `node --check`.
- `esbuild`/`eslint` MASIH TIDAK terpasang di sandbox ini (sama seperti
  sesi S1587, tanpa akses jaringan) → bundle belum diminify, `npm run lint`
  belum bisa jalan. `verify-release-ready.js` di-override manual utk 2 gate
  ini (`CONFIRM_LINT_UNAVAILABLE_REASON` / `CONFIRM_UNMINIFIED_REASON`),
  tercatat di `docs/RELEASE-GATE-LOG.md`. Ini override KE-2 kalinya secara
  berturut-turut untuk 2 gate yang sama — sesuai saran #5 W, jangan sampai
  ini menumpuk lebih jauh; begitu W kerja di environment dengan akses
  jaringan, jalankan `npm install --save-dev esbuild eslint` lalu build
  ulang tanpa override, supaya `RELEASE-GATE-LOG.md` kembali jadi sinyal
  rilis yang bisa dipercaya penuh.
- `verify-window-expose.js` → OK (78 modul dipakai lewat data-action, semua
  sudah window-expose).

## File yang berubah (masuk ZIP patch ini)

```
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
chat-action-handlers.js          (cuma sinkronisasi versi, tidak ada logic berubah)
index.html
modules/shared/features-helpers-global-security.js  (cuma sinkronisasi versi)
modules/shared/modals.js         (cuma sinkronisasi versi, TIDAK ada perubahan markup)
modules/shared/modules-calc.js   (cuma sinkronisasi versi)
modules/shared/modules-render.js (cuma sinkronisasi versi)
sw.js
tests/fuel-jenis-dropdown-s750.test.js   (regex fix)
tests/fuel-ref-modal-s751.test.js        (regex fix)
tests/fuel-ref-modal-s752.test.js        (regex fix)
docs/COVERAGE-PER-MODULE.md      (regenerated otomatis oleh build.js)
docs/FILE-MAP.md                 (regenerated otomatis oleh build.js)
docs/RELEASE-GATE-LOG.md         (log override gate, lihat di atas)
```

ZIP ini berisi AKUMULASI penuh dari sesi S1587 + S1588 (semua file yang
berubah di kedua sesi), sesuai instruksi "1 sesi 1 patch zip, akumulasikan
ke file patch yang sudah diupload" — timpa semua file di ZIP ini ke project
asli, tidak perlu apply ZIP S1587 secara terpisah lagi.

## Rekomendasi tindak lanjut (sesi berikutnya, dari daftar saran W yang masih tersisa)

1. **Saran #1**: konversi 10 field `simpleAutocompleteInput(...)` yang masih
   pakai inline `oninput=`/`onfocus=`/`onblur=` ke pola dispatcher
   `data-onfocus="simpleAutocompleteInput" data-onfocus-args='[...]'` generik
   (bukan bikin wrapper kecil satu-satu). Field: `txBbmSpbu`,
   `txShopSaleCustName/Phone/Addr`, `txNote`, `pName`, `prName`,
   `sparepartName/Code`, `stockName/Code`, `billName`, `bbmSpbu` — cek ulang
   daftar lengkap di `modules/shared/modals.js` sebelum mulai.
2. **Saran #2**: sebelum konversi `onShopCustFieldInput`/`onServisItemInput`/
   `Payroll.showFormFields`, cek dulu apakah fungsi itu benar-benar buka
   suggest-box saat fokus atau cuma validasi — kalau cuma validasi, TIDAK
   perlu ikut dikonversi ke `data-onfocus`.
3. **Saran #3**: tambah test regresi generik "field dengan suggest-box
   companion div wajib punya `onfocus` ATAU `data-onfocus`" — supaya refactor
   di masa depan yang menghapus onfocus langsung ketahuan tanpa perlu test
   manual per-field.
4. **Saran #5**: begitu ada akses jaringan, `npm install --save-dev esbuild
   eslint` lalu build ulang tanpa override (2 gate sudah di-override 2 sesi
   berturut-turut, S1587 & S1588 — jangan ditambah lagi kalau bisa dihindari).
5. **Saran #6**: perbaiki/beri disclaimer klaim "SA1-SA9 TUNTAS 100%" di
   `index.html` (masih belum disentuh sejak S1587).
6. **104 blok `<script>` inline** di `index.html` (epic tersendiri, sudah
   dicatat dari sesi-sesi sebelum S1587) masih menyusul, di luar scope semua
   saran W di atas.
