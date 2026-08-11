# Sesi 392a — UI Skeleton "Atur Porsi Kepemilikan" (langkah 1 dari beberapa)

## Instruksi user

Lanjutan permintaan porsi kepemilikan majemuk (S390 fondasi engine, S391 split
untung + reko AI otomatis). Sisa kerja yang belum dikerjakan (dicatat di
FIX-s391): form UI utk isi porsi kepemilikan per aset. User minta dibuatkan
langkah kerja beberapa sesi, kerjakan salah satu — yang RINGAN dulu.

## Audit sebelum implementasi

- `modules/shared/modals.js` — `assetModal` (yang sudah ada) belum punya
  entry point ke pengaturan porsi kepemilikan; hanya field `assetOwnership`
  single-select (dari `OwnershipEngine` S191, 1 tipe/entity).
- `modules/asset/aset.js` — belum ada method apa pun terkait "owners"/porsi
  majemuk di object `Aset`. `MultiOwnerEngine` (S390) & split otomatis
  (S391) sudah siap dipakai tapi belum ada UI yang memanggilnya untuk INPUT
  (S391 cuma baca lewat presenter read-only + rule AI).
- Kesimpulan: permintaan "form UI porsi kepemilikan" itu sendiri beberapa
  sub-langkah (modal shell, render baca, form tambah/hapus baris, validasi
  total realtime, save/reset). Dipecah jadi rencana kerja bertahap di bawah.

## Rencana kerja (beberapa sesi, urut dari paling ringan)

1. **Sesi 392a (sesi ini, DIKERJAKAN)** — UI skeleton read-only.
   - Tombol "⚖️ Atur Porsi Kepemilikan" di `assetModal`.
   - Modal baru `assetOwnersModal` (shell): nama aset, daftar pemilik
     read-only, keterangan status (tunggal/majemuk), tombol Tutup.
   - `Aset.openOwnersModal()` — baca lewat `MultiOwnerEngine.getOwners()`
     (100% reuse, TIDAK ada logic/skema data baru), render read-only.
   - Tidak ada tambah/hapus/simpan porsi sesi ini.
2. **Sesi 392b (belum dikerjakan)** — Form baris pemilik interaktif:
   `addOwnerRow()`/`removeOwnerRow()` (render input nama + porsi %, tombol
   tambah/hapus baris di dalam modal yang sudah ada dari 392a).
3. **Sesi 392c (belum dikerjakan)** — Validasi realtime:
   `updateOwnersTotal()` (indikator total porsi jalan tiap baris
   diubah/ditambah/dihapus, pakai `MultiOwnerEngine.totalPorsi()`/
   `remainingPorsi()` yang sudah ada, warna hijau/merah sesuai 100%).
4. **Sesi 392d (belum dikerjakan)** — Persist:
   `saveOwners()` (validasi lewat `MultiOwnerEngine.validateOwners()` ->
   `setOwners()` -> tulis ke `D.assets`, refresh render Buku Aset & modal
   `assetModal`) dan `resetOwners()` (reset ke kepemilikan tunggal SELF
   100%, dgn konfirmasi krn mengubah data).
5. **Sesi 392e (belum dikerjakan, opsional)** — Regression check menyeluruh:
   pastikan rule AI S391 (`asset-multi-owner-porsi-incomplete`/
   `asset-multi-owner-profit-split-info`) & split keuntungan otomatis tetap
   akurat setelah form input beneran dipakai user (bukan cuma
   `setOwners()` programatik/DevTools spt asumsi S390-391).

## Yang dikerjakan sesi ini (392a)

1. **`modules/shared/modals.js`**
   - Tombol baru `⚖️ Atur Porsi Kepemilikan` (`data-action="Aset.openOwnersModal"`)
     ditambahkan di `assetModal`, tepat sebelum field `Kepemilikan` yang
     sudah ada. Tidak mengubah elemen/field lain di `assetModal`.
   - Modal baru `assetOwnersModal` (append di akhir `MODAL_HTML`, urutan
     array lain TIDAK diubah): judul, `assetOwnersAssetName`,
     `assetOwnersList` (render baris pemilik), `assetOwnersTotalBox`
     (status), tombol Tutup. Belum ada form input apa pun.
   - `MODAL_VERSION` -> `s392a-asset-owners-modal-skeleton`.
2. **`modules/asset/aset.js`** — 1 method baru: `Aset.openOwnersModal()`.
   - Ambil aset dari `Aset.editId` (aset yang sedang dibuka/diedit).
   - Kalau aset belum tersimpan (lagi isi form Tambah Aset baru): tampilkan
     pesan "simpan dulu".
   - Kalau ada: panggil `MultiOwnerEngine.getOwners(a)` (S390, 100% reuse,
     TIDAK ada rumus/skema baru) & render read-only (nama pemilik + porsi
     %), plus keterangan status kepemilikan tunggal/majemuk.
   - Method ini PURE UI (baca saja) — tidak menulis apa pun ke `D`.

## Yang SENGAJA TIDAK dikerjakan sesi ini

- `addOwnerRow()`, `removeOwnerRow()`, `updateOwnersTotal()`, `saveOwners()`,
  `resetOwners()` — belum ada, ditunda ke Sesi 392b-d (lihat rencana di
  atas).
- Tidak ada perubahan skema data (`entity.owners`) atau logic
  `MultiOwnerEngine`/`asset-ownership-split-presenter.js`/rule AI S391 —
  semuanya dipakai apa adanya (reuse murni).
- `scripts/build.js` tidak diubah (tidak ada file baru yang perlu
  diregistrasi — sesi ini murni edit 2 file source yang sudah ada).

## Regression & build

`npm test`: **2661/2661 pass** (tidak ada test baru — sesi ini murni UI
wiring tanpa logic/kalkulasi baru untuk diuji unit).
`node scripts/build.js s392a-asset-owners-modal-skeleton` — sukses, sintaks
kedua bundle valid. Versi v1089 → **v1090**.

## Status

Langkah 1 dari 5 rencana "form UI porsi kepemilikan" **SELESAI** (skeleton
read-only). Lanjutan (392b-e) siap dikerjakan sesi berikutnya kapan saja
diminta — tinggal isi form interaktif di atas shell modal yang sudah ada.
