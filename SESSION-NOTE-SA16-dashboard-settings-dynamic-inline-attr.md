# SA16 (v1597) — Migrasi atribut event inline dinamis di dashboard settings

**Basis:** app-main baseline v1591 + patch akumulasi
`PATCH-fuelpriceref-SA11-SA12-SA13-SA14ab-SA15-v1596.zip` yang sudah diupload
sebelumnya (sesi fix-fuelpriceref-harga-sync + SA11 + SA12 + SA13 + SA14a
+ SA14b + SA15, sudah di-apply ke proyek penuh). ZIP patch sesi ini
**AKUMULASI** SEMUA sesi sebelumnya — timpa semua file di dalamnya ke
project asli, tidak perlu apply patch-patch sebelumnya terpisah lagi.

## Latar belakang

Lanjutan epic migrasi `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md`
(rekomendasi #3), rencana 8 sesi SA11-SA18. SA11-SA15 (aset-owners.js,
investasi-view.js, akun.js, investasi-list-view.js, aset.js, 5 file preview
import) sudah tuntas, 67 dari 123 titik. SA16 = "dashboard settings" (4
file, 17 titik), sesuai urutan rencana yang dicatat di
`SESSION-NOTE-SA15-import-preview-dynamic-inline-attr.md`:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA16 (sesi ini)** | dashboard settings (4 file) | 17 |
| SA17 (rencana) | `cashflow-projection-presenter.js` dkk (4 file) | 8 |
| SA18 (rencana) | 18 file sisa | 45 |

## Kenapa file ini beda pola dari SA11-SA15

Audit ulang menemukan 2 varian **BARU** yang belum pernah muncul di
SA11-SA15 (semua sesi itu selalu punya minimal 1 token/literal dinamis per
titik — `[i,"$value"]`, `[i,"$checked"]`, atau 3-arg dengan literal field):

1. **Literal boolean murni, 0 token dinamis** —
   `onclick="setAllDashCardPrefs(true)"` / `onclick="setAllDashCardPrefs(false)"`
   → `data-args='[true]'` / `data-args='[false]'`. Beda dari SA11-SA15 yang
   selalu bawa minimal `$el`/`$checked`/idx.
2. **0 argumen sama sekali** — 6 titik `onchange="_dashCashProjSetXxx()"`
   (fungsi baca DOM sendiri lewat `getElementById(...)`, bukan lewat
   parameter). Migrasi ke `data-onchange="_dashCashProjSetXxx"` **TANPA**
   atribut `data-onchange-args` sama sekali — dispatcher generik
   `_dataActionResolveArgs` (`modules/shared/features-helpers-global-security.js`)
   sudah default ke array kosong `[]` kalau `argsRaw` falsy (baris
   `if(argsRaw){...}` — `else` implisit tetap `args=[]`). **0 perubahan
   infrastruktur**, pola ini cukup dipakai apa adanya, tapi belum pernah
   diuji end-to-end sebelumnya karena SA11-SA15 selalu >=1 argumen.

2 titik sisanya (`toggleDashCardPref`, `DashboardSettings.reorderCard`)
pola sama persis SA11-SA15 (literal string + `$checked`, atau 2 literal
string murni).

## Perubahan

4 file, pola migrasi per titik:

1. `onclick="setAllDashCardPrefs(true)"` →
   `data-action="setAllDashCardPrefs" data-args='[true]'`
2. `onclick="setAllDashCardPrefs(false)"` →
   `data-action="setAllDashCardPrefs" data-args='[false]'`
3. `onchange="toggleDashCardPref('${c.key}',this.checked)"` →
   `data-onchange="toggleDashCardPref" data-onchange-args='["${c.key}","$checked"]'`
4. `onchange="_dashCashProjSetXxx()"` (6 fungsi, 0 arg) →
   `data-onchange="_dashCashProjSetXxx"` (tanpa `data-onchange-args`)
5. `onclick="DashboardSettings.reorderCard('${key}','up')"` →
   `data-action="DashboardSettings.reorderCard" data-args='["${key}","up"]'`
   (sama untuk `'down'`)

Rincian titik per file:

| File | Titik | Isi |
|---|---|---|
| `modules/shared/modules-render.js` | 9 | pola 4 ×6 (`_dashCashProjSetCycleDay`, `SetKirimanVal`, `SetIncludeKiriman`, `SetIncludePendingGaji`, `SetSurplusMonths`, `SetPolaAbsenWeeks`) + pola 1, 2, 3 |
| `modules/shop/modules-render.js` | 3 | pola 1, 2, 3 |
| `modules/modules-render.js` | 3 | pola 1, 2, 3 |
| `modules/dashboard-hub/dashboard-hub-settings.js` | 2 | pola 5 (`'up'`/`'down'`) |

Total 17 titik (9+3+3+2), sesuai audit awal. `modules/shop/modules-render.js`
dan `modules/modules-render.js` isinya duplikat persis blok
dashboard-card-prefs dari `modules/shared/modules-render.js` (3
salinan/varian bundle terpisah untuk flavor app yang berbeda) — migrasi
identik diterapkan di ketiganya.

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil.
Fungsi `setAllDashCardPrefs`/`toggleDashCardPref`/
`DashboardSettings.reorderCard`/6 fungsi `_dashCashProjSetXxx` tidak
disentuh sama sekali.

## Test

**Baru:** `tests/sa16-dashboard-settings-dynamic-inline-attr.test.js` (30
test):
- Gate statis permanen per file (4 file): 0 atribut event inline tersisa.
- Gate sanity: regex-nya sendiri terverifikasi mendeteksi pola asli & tidak
  salah tangkap `data-action=`/`data-onchange=`.
- Gate string literal: tiap titik `data-action`/`data-args` (pola 1, 2, 5)
  dan `data-onchange`/`data-onchange-args` (pola 3) atau `data-onchange`
  tanpa args (pola 4, 6 fungsi) benar-benar ada di source.
- 10 test end-to-end lewat dispatcher ASLI (`_dataActionClickHandler` untuk
  klik, `_dataActionInputChangeHandler` untuk change — keduanya diekstrak
  dari source yang sama persis, **TIDAK** diubah lagi sesi ini) memakai
  objek stub (spy):
  - 2 test `setAllDashCardPrefs(true/false)` via `data-action`.
  - 1 test `toggleDashCardPref(key, checked)` via `data-onchange` +
    `data-onchange-args` (`$checked`).
  - **6 test BARU** khusus pola 0-argumen: dataset TANPA `onchangeArgs`
    sama sekali → dispatcher tetap memanggil fungsi target dengan args
    kosong `[]` — pola yang belum pernah diuji di SA11-SA15 (semua sesi
    itu selalu >=1 argumen).
  - 2 test `DashboardSettings.reorderCard(key,'up'/'down')` via
    `data-action`.

**Regresi:** audit menemukan **1 test lama** yang menguji markup render
langsung — `tests/dashboard-hub-settings.test.js`, test
`renderDashCardOrderUI() — render ke #dashCardOrderList sesuai urutan
efektif, tombol ujung disabled` meng-assert regex mengandung
`reorderCard('refleksi','up')` (pola inline lama). Disinkronkan: assert
sekarang mencari `data-args='["refleksi","up"]'` (komentar ditambahkan
menunjuk ke session note ini). 0 test lain di seluruh `tests/` ditemukan
menyentuh markup 4 file ini (`grep -rl` untuk semua nama
fungsi/id terkait → cuma 1 hit tambahan di
`tests/dash-card-show-hide.test.js`, tapi itu cuma komentar penjelas, bukan
assert markup — tidak perlu disinkronkan).

## Hasil build & test

- `node --test tests/*.test.js`: **5780 pass, 0 fail** (baseline sebelum
  sesi ini 5750 + 30 test baru SA16 = 5780, cocok).
- `node scripts/build.js`: versi **1596 -> 1597**. `app_production.html`,
  `sw.js` (CACHE_NAME), dan versi konstanta di 5 file source disinkronkan
  otomatis. Bundle **TANPA minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` → OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` → OK, kedua bundle segar.
- `node tests/verify-release-ready.js` → **lolos, dengan override manual**
  untuk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang). **⚠️ Override ke-8 berturut-turut untuk 2 gate yang sama**
  (S1587, S1588, S1589, SA11, SA12, SA13, SA14a, SA14b, SA15, sekarang
  SA16) — makin mendesak: jalankan `npm install --save-dev eslint esbuild`
  begitu W kerja di environment dengan akses jaringan.

## docs/CLAUDE.md

Diupdate sesi ini dengan 1 entri baru (SA16).

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi)
modules/finance/akun.js                          (SA13, tidak diubah lagi)
modules/asset/investasi-list-view.js             (SA14a, tidak diubah lagi)
modules/asset/aset.js                            (SA14b, tidak diubah lagi)
modules/vehicle/vehicle-catalog-import-ui.js     (SA15, tidak diubah lagi)
modules/vehicle/honda-pdf-import-ui.js           (SA15, tidak diubah lagi)
modules/vehicle/vehicle-catalog-web-import-ui.js (SA15, tidak diubah lagi)
modules/business/shop-scan-ui.js                 (SA15, tidak diubah lagi)
modules/business/shop-pdf-import-ui.js           (SA15, tidak diubah lagi)
modules/shared/modules-render.js                 (SA16 — 9 titik dimigrasi, BARU sesi ini)
modules/shop/modules-render.js                   (SA16 — 3 titik dimigrasi, BARU sesi ini)
modules/modules-render.js                        (SA16 — 3 titik dimigrasi, BARU sesi ini)
modules/dashboard-hub/dashboard-hub-settings.js  (SA16 — 2 titik dimigrasi, BARU sesi ini)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1597)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1597)
tests/sa16-dashboard-settings-dynamic-inline-attr.test.js (BARU, SA16)
tests/dashboard-hub-settings.test.js             (fix regresi SA16 — 1 assert disinkronkan)
tests/sa15-import-preview-dynamic-inline-attr.test.js (SA15, tidak diubah lagi)
tests/aset-dynamic-inline-attr-sa14b.test.js     (SA14b, tidak diubah lagi)
tests/s667-aset-owner-status-filter.test.js      (SA14b, tidak diubah lagi)
tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js (SA14a, tidak diubah lagi)
tests/s664-investmentlistui-filterbar-owner-count-badge.test.js (SA14a, tidak diubah lagi)
tests/s669-investmentlistui-multiselect-owner-filter.test.js (SA14a, tidak diubah lagi)
tests/s671-investmentlistui-filter-select-all-clear.test.js (SA14a, tidak diubah lagi)
tests/aset-owners-dynamic-inline-attr-sa11.test.js (SA11, tidak diubah lagi)
tests/investasi-view-dynamic-inline-attr-sa12.test.js (SA12, tidak diubah lagi)
tests/akun-accowners-dynamic-inline-attr-sa13.test.js (SA13, tidak diubah lagi)
tests/asset-owners-flow-e2e-392a-to-392e.test.js  (SA11, tidak diubah lagi)
tests/fuel-price-ref.test.js                     (sesi fuel-price-ref, tidak diubah lagi)
tests/s552-investment-owners-nominal-bidirectional.test.js (SA12, tidak diubah lagi)
docs/FILE-MAP.md                                  (regenerated otomatis)
docs/COVERAGE-PER-MODULE.md                       (regenerated otomatis)
docs/RELEASE-GATE-LOG.md                          (log override ke-8, auto-append)
docs/CLAUDE.md                                    (1 entri baru: SA16)
MANIFEST-PATCH-fuelpriceref-SA11-SA12.md          (diupdate sesi ini, cakupan ZIP terbaru)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (SA11)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (SA12)
SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md (SA13)
SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md (SA14a)
SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md    (SA14b)
SESSION-NOTE-SA15-import-preview-dynamic-inline-attr.md (SA15)
SESSION-NOTE-SA16-dashboard-settings-dynamic-inline-attr.md (BARU, sesi ini)
```

## Sisa antrian epic S1588

SA11-SA16 tuntas (84 dari 123 titik). Sisa:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA17 (rekomendasi sesi berikutnya)** | `cashflow-projection-presenter.js`, `tx-bbm.js`, `cicilan.js`, `tx-stok-sparepart.js` | 8 |
| SA18 | 18 file sisa tersebar (`aset-reports.js`, `titipan-expense-ui.js`, `dana-titipan-portfolio-render.js`, dll) | 45 |

## Rekomendasi tindak lanjut lain

1. `npm install --save-dev eslint esbuild` — makin mendesak, override
   ke-8 berturut-turut untuk gate yang sama sejak beberapa sesi lalu.
2. **Belum diuji di browser sungguhan** (sandbox ini tidak ada akses
   browser) — kalau W punya kesempatan, coba buka Pengaturan → Kartu di
   Beranda (aktifkan/matikan semua, toggle per kartu), Dashboard Hub →
   urutan kartu (▲▼), dan kartu "Proyeksi Kas Bulan Ini" → pengaturan
   (mode jendela kewajiban, kiriman mingguan, dll) di Chrome/Edge/Firefox
   versi lama vs versi baru — untuk konfirmasi independen bahwa migrasi
   ini memang tetap berfungsi di bawah CSP `script-src-attr 'none'`.
3. SA17 (cashflow projection presenter dkk, 8 titik, 4 file) direkomendasikan
   sesi berikutnya sesuai urutan rencana — belum diaudit detail.
