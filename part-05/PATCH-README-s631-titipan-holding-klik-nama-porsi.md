# S631 — Dana Titipan: klik nama aset langsung buka Atur Porsi

## Masalah
Kartu "Dana Titipan dalam Investasi" perlu 2 langkah utk atur porsi aset
yang SUDAH tertaut: pilih ulang di dropdown "Pilih Aset" → tap tombol
"⚖️ Atur Porsi Aset" terpisah. Padahal nama instrumen sudah tampil di
baris holding (mis. "🏦 Majoris (85.043%)").

## Fix (additive, 0 breaking change)
- `modules/finance/dana-titipan-portfolio-render.js`:
  - `_holdingRowHtml()`: nama holding sekarang tombol klik-langsung →
    `DanaTitipanCommitmentUI.openAssetPorsiDirect(assetId)`.
  - `openAssetPorsi()` (dropdown lama) di-refactor: routing diekstrak ke
    `_routeAssetPorsi(assetId)` — dipakai bareng oleh `openAssetPorsi()`
    dan `openAssetPorsiDirect()` baru. 0 perubahan perilaku dropdown lama.
  - Dropdown "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" di kartu owner
    **tidak dihapus** — masih satu-satunya jalan utk TAUTKAN ASET BARU
    (yang belum py baris holding). Utk aset yang sudah tertaut, klik nama
    sekarang jadi jalur utama (lebih ringkas, 1 tap).
- Test baru: `tests/s631-titipan-holding-name-direct-porsi.test.js` (6 test).

## Hasil test
`npm test` → **4495/4495 pass**, 0 fail (naik dari 4489).

## Build
`node scripts/build.js` → sukses, versi `s631-titipan-explicit-owner-only`,
build #1365. Kedua bundle lolos `node --check`. `index.html`/
`app_production.html` sinkron.

---

## SESI 632 (lanjutan ringan, rekomendasi #2 dari audit S631)

### Masalah
Tiap kartu owner di Dana Titipan punya grid detail 8 baris (Pokok
Dikomit/Estimasi dari Transaksi/Teralokasi ke Holding/Estimasi Belum
Teralokasi/Nilai Saat Ini/Untung-Rugi/Sudah Dikembalikan/Pokok Belum
Dikembalikan) — SELALU terbuka, padahal ringkasan Pokok→Kini→gain
sudah tampil di `<summary>` kartu owner itu sendiri. Di layar HP bikin
kartu panjang & scroll-heavy kalau owner-nya banyak.

### Fix (additive, murni markup, 0 rumus/data diubah)
- Grid detail dibungkus `<details class="titipan-detail-toggle">`
  collapsed-by-default dgn label `<summary>Detail lengkap</summary>` —
  pola SAMA PERSIS `<details>` kartu owner & grup kustodian yang sudah
  ada di file ini (0 CSS/JS baru, native browser expand/collapse).
- Ringkasan Pokok→Kini→gain di `<summary>` kartu owner (di LUAR
  `<details>` baru ini) TIDAK disentuh — tetap selalu kelihatan tanpa
  perlu expand apa pun.
- Class `titipan-detail-grid` & semua isi baris (label, angka, helper
  `_principalCell()`/`_unallocatedCell()`/`_outstandingCell()`/
  `_expenseComparisonForOwner()`) dipertahankan 100% apa adanya —
  cuma dipindah ke dalam pembungkus `<details>`.

### Hasil test
Test baru: `tests/s632-titipan-detail-grid-collapsed.test.js` (3 test).
`npm test` → **4498/4498 pass**, 0 fail (naik dari 4495).

### Build
`node scripts/build.js` → sukses, versi `s632-titipan-explicit-owner-only`,
build **#1366**. Kedua bundle lolos `node --check`. `index.html`/
`app_production.html` sinkron.

---

## SESI 633 (lanjutan ringan #2, konsolidasi visual dropdown "Pilih Aset")

### Masalah
Sejak S631, nama holding yang SUDAH tertaut bisa diklik langsung utk
atur porsi — jadi dropdown "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" di
bawahnya SEKARANG cuma perlu dipakai utk kasus TAUTKAN ASET BARU (aset
yang belum py baris holding sama sekali). Tapi kontrol ini masih SELALU
tampil terbuka di tiap kartu owner, walau ownernya sudah py holding
lengkap dan jarang butuh tautkan aset baru lagi — bikin kartu makin
panjang.

### Fix (additive, murni markup, 0 logic/id/onchange diubah)
- Dropdown `<select id="titipanAssetPick_${oi}">` + tombol "⚖️ Atur
  Porsi Aset" dibungkus `<details class="titipan-linkasset-toggle">`
  collapsed-by-default, label `<summary>+ Tautkan Aset Baru</summary>` —
  pola sama S632.
- id/`data-owner-id`/`onchange`/`data-action` select & tombol di
  dalamnya **TIDAK diubah sama sekali** — `onAssetPickChange()`,
  `openAssetPorsi()`, test s543 (preserve selection) & s608 (opsi
  Holding) tetap jalan 100% tanpa modifikasi (dibuktikan re-run test
  itu bareng test baru sesi ini, 0 fail).
- Klik nama holding (jalur utama S631, `openAssetPorsiDirect()`) TETAP
  di luar toggle ini — tidak terpengaruh sama sekali.

### Hasil test
Test baru: `tests/s633-titipan-linkasset-toggle-collapsed.test.js`
(3 test). Re-run `tests/s543-*` + `tests/dana-titipan-asset-picker-
holding-option-s608.test.js` bareng test baru → semua pass, 0 regresi.
`npm test` → **4501/4501 pass**, 0 fail (naik dari 4498).

### Build
`node scripts/build.js` → sukses, versi `s633-titipan-explicit-owner-only`,
build **#1367**. Kedua bundle lolos `node --check`. `index.html`/
`app_production.html` sinkron.

## Ringkasan visual kumulatif (S631+S632+S633)
Tiap kartu owner Dana Titipan sekarang:
1. Summary: Pokok→Kini→gain (selalu kelihatan, tidak berubah).
2. Baris holding: nama instrumen = tombol klik-langsung ke Atur Porsi
   (S631) — tidak perlu dropdown lagi utk aset yang sudah tertaut.
3. "Detail lengkap" — collapsed, isi 8 baris rincian lama (S632).
4. "+ Tautkan Aset Baru" — collapsed, isi dropdown+tombol lama, HANYA
   dipakai utk aset yang BELUM tertaut (S633).

## Sisa rekomendasi (usul next session, belum dikerjakan)
1. Konsolidasi PENUH jadi 1 dropdown per kartu (bukan per owner) —
   masih di-skip, perlu ubah struktur `titipanAssetPick_N` + picker
   owner terpisah, plus migrasi test s543/s608. Risiko lebih besar,
   layak jadi sesi tersendiri.
2. Tombol aksi 3-kolom (`Atur Pokok`/`Catat Pengembalian`/`Lepas
   Keterikatan`) dipindah ke menu "⋮" overflow — masih di-skip (perlu
   modal overlay baru + wiring markup di index.html/app_production.html).

## File yang berubah/baru (kumulatif S631+S632+S633)
- `modules/finance/dana-titipan-portfolio-render.js` (fix S631+S632+S633)
- `tests/s631-titipan-holding-name-direct-porsi.test.js` (baru)
- `tests/s632-titipan-detail-grid-collapsed.test.js` (baru)
- `tests/s633-titipan-linkasset-toggle-collapsed.test.js` (baru)
- Hasil build resmi: `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`, 5 file konstanta versi
  (`modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js`).
