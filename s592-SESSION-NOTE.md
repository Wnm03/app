# Sesi 592 — Bersihkan Aset Ghost (Migrasi) + tambal gap build.js

Lanjutan `PATCH-ghost-asset-migrated-investment.md` (fix dropdown ghost
"Majoris" dobel). Patch itu sudah menyaring record ber-flag
`_migratedToInvestmentId` dari dropdown "Kaitkan ke Aset Multi-Owner",
tapi record lamanya sendiri belum ada jalur hapus permanen dari dalam app.

## Yang dikerjakan

### 1. Fitur baru: `GhostAssetCleanupUI`
- File baru `modules/shared/ghost-asset-cleanup-ui.js` — kartu
  "🧹 Bersihkan Aset Ghost (Migrasi)" di Settings -> tab Kepemilikan,
  berdampingan dengan "Kelola Daftar Pemilik" (S564).
- `render()` — daftar SEMUA `D.assets` berflag `_migratedToInvestmentId`.
  Kartu otomatis sembunyi (`u-dnone`) kalau 0 ghost record.
- `deleteGhost(id)` — **0 logic hapus baru**, delegasi PENUH ke
  `Aset.delete()` (aset.js, sudah punya `askConfirm()` + cascade cleanup
  `D.debts` terkait + `save()` + re-render semua panel turunan). Presenter
  ini murni re-render list ghost-nya sendiri sesudahnya.
- Wiring render hook di `modules-render.js` (pola sama persis
  `OwnerRegistrySettingsUI.render()` di baris sebelumnya).
- Kartu baru di `index.html` (+ `app_production.html` via auto-sync
  build.js), `#ghostAssetCleanupCard` / `#ghostAssetCleanupList`.

### 2. HOUSEKEEPING (ditemukan saat verifikasi, ditambal sesi ini)
`modules/shared/owner-registry-settings-ui.js` (fitur "Kelola Daftar
Pemilik", S564) **hilang dari daftar GROUP_B di `scripts/build.js`** —
gap sudah ada sejak S564 sendiri. File source-nya ada & sudah dites
(`tests/s564-owner-registry-settings-ui-r4.test.js` tetap lolos), tapi
tidak pernah ikut ter-bundle lewat build.js resmi; isinya sebelumnya cuma
pernah ditempel manual ke `app-bundle-a.min.js` hasil build lama tanpa
registrasi source yang benar.

**Dampak kalau tidak ditambal**: `node scripts/build.js` bersih (tanpa
baris ini) akan diam-diam MENGHAPUS seluruh fitur "Kelola Daftar Pemilik"
dari bundle produksi berikutnya — diverifikasi langsung (build percobaan
tanpa fix ini menghasilkan bundle yang 0% mengandung `renameOwner`/
`_usageCounts`).

**Fix**: tambah `'modules/shared/owner-registry-settings-ui.js'` ke
GROUP_B (build.js), ditaruh TEPAT setelah `owner-registry.js` (dependency
wajib). 0 perubahan ke isi file `owner-registry-settings-ui.js` sendiri.

## File yang dipatch
- `modules/shared/ghost-asset-cleanup-ui.js` — BARU
- `tests/s592-ghost-asset-cleanup-ui.test.js` — BARU (6 test)
- `scripts/build.js` — tambah 2 baris path GROUP_B (fitur baru +
  housekeeping gap lama)
- `modules/shared/modules-render.js` — 1 baris render hook
- `index.html` / `app_production.html` — 1 kartu baru di tab Kepemilikan
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — bundle final, hasil
  `node scripts/build.js` (build ULANG PENUH dari source, bukan tempel
  manual — supaya gap seperti #2 di atas tidak terulang)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

## Verifikasi
- `node --test tests/*.test.js` → **4173/4173 lolos** (baseline + 6 test
  baru, 0 regresi termasuk ke `s564-owner-registry-settings-ui-r4.test.js`
  yang sekarang benar-benar ter-bundle).
- `verify-window-expose.js` → lolos (`GhostAssetCleanupUI` window-exposed).
- `verify-bundle-freshness.js` → lolos.
- `verify-release-ready.js` → lolos dengan 2 override manual (eslint &
  esbuild tidak terpasang di sandbox — sama seperti sesi-sesi sebelumnya,
  dicatat di `docs/RELEASE-GATE-LOG.md`).

## Tidak dikerjakan (di luar scope, sengaja)
- Tombol tambah/edit owner LANGSUNG di dropdown "Pilih Owner" (Image 1) —
  sesuai rekomendasi sesi sebelumnya, sengaja TIDAK ditaruh per-dropdown;
  kelola tetap terpusat di 1 layar Settings (menghindari duplikasi 3x).
- "Hapus seluruh data" (reset total) — sudah ada jalurnya sendiri
  (Settings -> Keamanan -> Reset Aplikasi), tidak disentuh sesi ini.
- Ghost record versi lama yang sudah kadung ada di database live user
  TIDAK otomatis terhapus oleh sesi ini — user perlu buka kartu baru ini
  sekali dan hapus manual per baris (by design, supaya user bisa review
  dulu sebelum hapus permanen).
