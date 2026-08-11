# FIX-S554 — Dana Titipan dobel-hitung aset tertaut + restore rule Data Health Check S551

## Latar belakang

Laporan user (Agustus 2026): instrumen "Schorder" — owner "renov" — tercatat
dua kali di tab Dana Titipan (`allocatedPrincipal` Rp2.000.000, seharusnya
Rp1.000.000). Audit menemukan **2 bug terpisah tapi berkaitan**, keduanya
dikonfirmasi lewat test sebelum diperbaiki (bukan dugaan):

1. Dobel-hitung nyata di `DanaTitipanPortfolioAPI.build()`.
2. Rule Data Health Check yang seharusnya memperingatkan kasus ini
   (didokumentasikan lengkap sejak S551, termasuk 9 test permanen) ternyata
   **tidak pernah benar-benar masuk** ke `data-health-check.js` — 3/9 test
   S551 FAIL persis di titik audit ini.

## Bug 1 — Dobel-hitung aset tertaut di `DanaTitipanPortfolioAPI`

**Akar masalah:** kalau user menautkan Aset ke Holding Investasi lewat
dropdown "🔗 Hubungkan ke Holding Investasi" (`a.investmentId`), tautan itu
HANYA dihormati di `Aset.totalValue()` (aset.js, Sesi B8,
`.filter(a=>!a.investmentId)`). `_assetSplits(a)` di
`modules/finance/dana-titipan-portfolio-presenter.js` — satu-satunya sumber
data domain Aset untuk `build()` **dan** `allocatedExcluding()` — tidak
pernah mengecek field ini. Akibatnya instrumen yang sama terhitung 2x:
1x dari porsi `h.owners[]` di domain Investment, 1x lagi dari porsi
`a.owners[]` di domain Aset.

**Perbaikan:** `_assetSplits(a)` sekarang balikin `null` (aset itu
dikecualikan, caller skip) kalau `a.investmentId` terisi — logic exclude
SAMA PERSIS `Aset.totalValue()`, unconditional (0 pengecekan holding-nya
masih ada atau tidak, konsisten dengan cara Kekayaan Bersih memperlakukan
link orphan). Fix ditaruh di helper bersama, bukan diduplikasi di
`build()`/`allocatedExcluding()` masing-masing — jadi kedua caller otomatis
ikut benar, 0 logic ganda.

```js
_assetSplits(a) {
  if (!a || typeof MultiOwnerEngine === 'undefined') return null;
  if (a.investmentId) return null; // BARU — cegah dobel-hitung aset yg sudah ditautkan
  const owners = this._asetOwnersForTitipan(a);
  ...
```

## Bug 2 — Rule Data Health Check S551 direstorasi

**Temuan:** `tests/data-health-check-asset-investasi-owner-mismatch-s551.test.js`
(9 test, ditulis sejak S551) — 3 test FAIL karena rule "Nama sama di Buku
Aset & Investasi dgn kepemilikan berbeda" tidak ada satu baris pun di
`data-health-check.js`. Dokumen `FIX-s551-...md` mengklaim rule sudah
diimplementasikan & lolos 9/9, tapi kode sumbernya hilang/tidak pernah
ter-commit.

**Perbaikan:** rule diimplementasikan di `runDataHealthCheck()`
(`data-health-check.js`), murni baca, 0 mutasi `D.assets`/`D.investments`:

1. Kelompokkan `D.investments[]` per nama (trim+lowercase, exact match —
   sengaja bukan fuzzy, hindari false-positive).
2. Untuk tiap holding, cari aset di `D.assets[]` dengan nama sama persis.
3. Bandingkan "signature" pemilik efektif kedua sisi lewat
   `MultiOwnerEngine.getOwners()` (100% reuse, 0 rumus baru) — signature =
   daftar `{ownerId, porsi}` disortir + porsi dibulatkan 2 desimal (toleransi
   float, pola sama `PORSI_EPSILON`).
4. Signature beda → `issues.push({level:'warn', title:'Nama sama di Buku
   Aset & Investasi dgn kepemilikan berbeda', ...})`.

Guard `typeof MultiOwnerEngine !== 'undefined'` — pola sama semua guard lain
di file ini, diam saja kalau modul belum dimuat.

**Cakupan sengaja DIBATASI (sama seperti dokumen S551 asli):**
- Tidak menyentuh cek `investmentId` orphan (B6/B7-B8) yang sudah ada —
  rule ini murni untuk pasangan nama-sama yang BELUM ditautkan resmi.
- Tidak ada field link baru / badge UI — rule S552 (`investments[].assetId`
  orphan check) & S553 (Piutang/Utang non-multi-owner link) TIDAK termasuk
  di sesi ini (dua-duanya sudah punya FIX-doc & test tersendiri tapi juga
  belum ter-implementasi — di luar scope 2 fix yang diminta user kali ini,
  butuh sesi terpisah).

## File yang berubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — fix `_assetSplits()`
- `data-health-check.js` — restore rule S551
- `tests/dana-titipan-portfolio-linked-asset-doublecount-s554.test.js` —
  test baru (4 kasus): reproduksi persis laporan user, kasus normal (0
  regresi), link orphan tetap dikecualikan, `allocatedExcluding()` ikut fix
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh
  (`node scripts/build.js s554-danatitipan-doublecount-datahealthcheck-s551-restore`,
  esbuild tidak tersedia di sandbox ini jadi belum diminify, tetap 100%
  valid — sama seperti sesi-sesi sebelumnya)
- `index.html`, `app_production.html`, `sw.js` — `?v=`/`CACHE_NAME` → 1287
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  disamakan (rutin, `bumpVersionEverywhere()`)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

## Verifikasi

- `node --test tests/data-health-check-asset-investasi-owner-mismatch-s551.test.js`
  → **9/9 lolos** (sebelumnya 6/9, 3 FAIL).
- `node --test tests/dana-titipan-portfolio-linked-asset-doublecount-s554.test.js`
  → **4/4 lolos** (baru), termasuk reproduksi persis kasus "Schorder"/"renov"
  — `allocatedPrincipal` sekarang Rp1.000.000 (bukan Rp2.000.000).
- `node --test tests/*.test.js` → **3924/3932 lolos** (naik dari
  3916/3928 baseline sebelum sesi ini — 3 test S551 + 1 test S552-regresi
  ikut lolos, **0 regresi baru** dari fix ini).
- `node scripts/build.js` → lolos semua lint blocking, kedua bundle lolos
  `node --check`.

## Belum ditangani (di luar scope sesi ini — 8 kegagalan pre-existing, tidak
disentuh)

- `[gap-check] assetModal`/`assetOwnersModal` (3 test) — gap UI id lama,
  tidak terkait sesi ini.
- S552: `investments[].assetId` orphan check (2 test) — didokumentasikan di
  `FIX-s552-asset-investasi-link-badge.md`, kode belum ter-implementasi,
  butuh sesi sendiri.
- S553: Piutang/Utang tertaut ke aset single-owner (2 test) — didokumentasikan
  di `FIX-s553-debt-piutang-nonmultiowner-link-audit.md`, kode belum
  ter-implementasi, butuh sesi sendiri.
- `FI.investmentAssetValue()` scope "zakatable" (1 test) — di luar cakupan
  Dana Titipan/Data Health Check, perlu audit terpisah.
