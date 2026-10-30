# S523-C — Commitment Delete vs Owner Linkage Removal (BUG-02, BUG-06, BUG-14)

Fokus sesi ini HANYA BUG-02, BUG-06, BUG-14 (BUG-03/BUG-12 dari S523 BUG
REGISTER tetap terbuka, di luar scope sesi ini).

## Root cause

- **BUG-02** ("Hapus S522 hanya menghapus commitment, bukan linkage
  owner"): audit mengonfirmasi `DanaTitipanPortfolioAPI.deleteCommitment()`
  (S522) SUDAH terisolasi total — hanya menyentuh `D.titipanCommitments`,
  **tidak pernah** menyentuh `OwnerRegistry`/`D.assets`/`D.investments`/
  `D.transactions`/`D.titipanReturns` (dibuktikan test S523C(3), assert
  deep-equal sebelum/sesudah utk kelima struktur data itu). Root cause
  sebenarnya BUKAN kebocoran data, melainkan **tidak ada operasi bernama
  eksplisit** untuk "lepas keterikatan owner dari Dana Titipan" yang
  terpisah dari "hapus record pokok" — keduanya sebelumnya cuma 1 fungsi
  (`deleteCommitment`, dipanggil dari dalam modal edit pokok saja).
- **BUG-06** ("Tidak ada scoped removal dari Dana Titipan"): dikonfirmasi
  — sebelum sesi ini tidak ada titik panggil untuk "lepas keterikatan"
  langsung dari kartu owner di dashboard (harus buka modal edit pokok
  dulu, baca `editingOwnerId`).
- **BUG-14** ("Belum ada test lifecycle delete"): dikonfirmasi — belum
  ada test end-to-end create→commitment→delete→owner visibility→
  cross-domain safety dalam 1 skenario.

## Perbedaan lifecycle sebelum/sesudah

**Sebelum:** hanya `deleteCommitment(ownerId)` — CRUD "hapus record
pokok", dipanggil dari tombol 🗑 Hapus di dalam modal `titipanCommitmentModal`
(butuh `editingOwnerId` in-memory dari `open()`).

**Sesudah:** dua operasi dgn kontrak terpisah, REUSE mekanisme yang sama
(0 rumus baru):
1. `deleteCommitment(ownerId)` — TIDAK BERUBAH sama sekali.
2. `removeOwnerLinkage(ownerId)` (BARU) — dipanggil LANGSUNG dari kartu
   owner (`data-action="DanaTitipanCommitmentUI.removeOwnerLinkage"`,
   tombol "🔓 Lepas Keterikatan Dana Titipan"), 100% reuse
   `deleteCommitment()` di baliknya. Beda dari (1): titik panggil (kartu,
   bukan modal), pesan konfirmasi eksplisit ("porsi Investasi/Aset TIDAK
   ikut berubah, identitas owner tetap ada"), dan kontrak yang
   didokumentasikan+ditest eksplisit (termasuk isolasi ke `OwnerRegistry`
   yang sebelumnya HANYA ditest tidak langsung lewat isolasi
   assets/investments di S522).
3. **Global owner deletion** — SENGAJA TIDAK dibuat (`OwnerRegistry`
   belum punya API delete resmi, keputusan desain §4 dokumen rekomendasi
   S523 belum diambil, dan BATASAN sesi ini eksplisit melarangnya).

## File berubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — tambah
  `DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId)` (reuse
  `deleteCommitment()`), `DanaTitipanCommitmentUI.removeOwnerLinkage(ownerId)`
  (UI wrapper + `askConfirm()`), dan 1 tombol baru di `renderInto()`
  kartu owner. **0 baris lama dihapus/diubah** — murni tambahan (diff
  murni `706a707,768`, +62 baris).
- `tests/s523c-commitment-delete-vs-owner-linkage.test.js` (baru, 11 test
  case).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild penuh, tanpa
  minifikasi — esbuild tidak tersedia di sandbox).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  1257 (rutin, `bumpVersionEverywhere()`).
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js` — konstanta versi disamakan
  (`s527-dana-titipan-ui-multiowner`, rutin).
- `docs/FILE-MAP.md` / `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis.

**TIDAK disentuh** (sesuai HARD SCOPE): `scripts/build.js`,
`modules/shared/owner-registry.js` (0 method baru ditambahkan ke core
registry — sesuai rekomendasi §4 dokumen S523: guard tetap di modul
konsumen), `modules/shared/multi-owner-engine.js`, business logic core
Investment/Asset, Holding selector, formula aggregation apa pun.

## Regression tests

Baru (`s523c-commitment-delete-vs-owner-linkage.test.js`, 11 test):
1. Lifecycle create→commitment→deleteCommitment→owner global tetap ada.
2. Lifecycle end-to-end 1 skenario (BUG-14): create→commitment→delete→
   owner visibility (PRINCIPAL_NOT_SET, tetap tampil krn masih ada porsi
   Aset)→cross-domain safety.
3. `deleteCommitment()` isolasi total termasuk `OwnerRegistry` (BUG-02).
4–7. `removeOwnerLinkage()`: melepas linkage tanpa hapus owner global;
   no-op aman kalau tidak ada commitment; isolasi total (Returns/
   Investment/Asset/Transaction/OwnerRegistry); porsi owner LAIN di
   Aset/Investasi tidak ikut berubah.
8–9. `deleteCommitment()` dan `removeOwnerLinkage()` tidak saling
   mencampur (antar owner berbeda, dan dipanggil berurutan pada owner
   sama).
10. `removeOwnerLinkage()` tidak pernah mengubah `D.ownerRegistry`
    (bukan global delete).
11. Kedua fungsi benar-benar 2 referensi terpisah di
    `DanaTitipanPortfolioAPI`.

## Test count sebelum/sesudah

- Sebelum (baseline S523-B): **3685/3685 lolos**.
- Sesudah: **3696/3696 lolos** (3685 lama + 11 baru, **0 regresi**).

## Semua test hijau

`node --test tests/*.test.js` → 3696 pass, 0 fail, 0 cancelled.

## Build

`node scripts/build.js` — lolos semua lint blocking (termasuk
`lintModalHtmlIndexDrift()`/`verifyVersionConstantsSynced()`). Bundle
valid (`node --check`), belum diminify (esbuild tidak tersedia).
Versi: `s526-dana-titipan-ui-multiowner` → `s527-dana-titipan-ui-multiowner`,
build `1257`.

## Diff audit terhadap baseline S523-B

Dibandingkan `kw_S523-B_titipan-owner-creation.zip` (sebelum build.js):
hanya **1 file source berubah** (`dana-titipan-portfolio-presenter.js`,
murni tambahan +62 baris, 0 baris lama dihapus) + **1 file baru**
(test). 0 file lain berubah di luar itu sebelum build dijalankan; setelah
build, hanya file version-bearing rutin yang berubah (bundle/HTML/sw.js/
versi konstanta), sesuai pola S523-B.

## Di luar scope (tidak disentuh sesi ini)

- BUG-03 (OwnerRegistry belum punya API delete/remove resmi) — keputusan
  desain §4 dokumen rekomendasi S523 belum diambil, tetap terbuka.
- BUG-12 (guard delete lintas domain Piutang/Utang — `syncOwnerDebts`)
  — tidak diaudit sesi ini, BUKAN bagian dari fokus BUG-02/06/14.
- BUG-07/08 (Holding selector) → S523-D.
- BUG-09 (aggregation anomaly) → S523-E (kondisional).

Jangan lanjut ke S523-D.
