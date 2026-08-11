# FIX s561 — R4: `OwnerRegistry.rename()`/`merge()`

**Sumber:** `AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md`, menutup
`OWNREG-GATE3-001` (docs/BUG_REGISTRY.md — status OPEN sejak S493, "rename UI
out-of-scope, butuh sesi tersendiri yang eksplisit memutuskan (a) auto-collapse
atau (b) tetap terpisah").

## Keputusan Gate #3 (dikunci sesi ini)

**Opsi (b): rename TIDAK auto-collapse.** Rename ke nama yang kebetulan sama
dengan entri lain tetap menghasilkan 2 `id` terpisah — konsisten dengan
"registry dedup by id, bukan by nama" (S489). Kalau memang mau digabung,
harus lewat `merge()` eksplisit. Alasan: rename biasanya perbaikan typo/nama
panggilan pada 1 orang, bukan pernyataan "2 orang ini sama" — auto-collapse
diam-diam berisiko menggabung 2 identitas berbeda tanpa sadar.

## Perubahan

- **`modules/shared/owner-registry.js`:**
  - `rename(id, newName)` — ubah `name` di registry + **propagasi** ke semua
    salinan `ownerName` denormalized (`D.assets[].owners[]`,
    `D.investments[].owners[]`, `D.titipanCommitments[]`). Tanpa propagasi
    ini, rename di registry saja tidak akan terlihat di UI manapun — semua
    consumer baca `ownerName` dari baris masing-masing, bukan lookup ke
    registry saat render.
  - `merge(sourceId, targetId)` — pindahkan semua referensi `sourceId` ke
    `targetId` (owners[] Aset/Investasi, titipanCommitments, `D.debts[].linkedOwnerId`),
    hapus entri `sourceId` dari registry. **Guard tabrakan** sama pola dgn R2
    (`migrateOwnersToRegistry()`): kalau 1 aset/holding sudah punya baris
    `sourceId` DAN `targetId` sekaligus, `merge()` **batal total** (tidak ada
    perubahan parsial), return `{ok:false, reason:'conflict', conflicts:[...]}`.
  - Komentar lama di `findOrCreate()` yang menyebut rename "out-of-scope"
    diupdate.
- **Test baru:** `tests/s561-owner-registry-rename-merge-r4.test.js` (7 test):
  rename + propagasi 3 domain, id tidak ditemukan, nama kosong, non-collapse,
  merge + propagasi 4 domain (termasuk kontinuitas `id` debt), guard tabrakan,
  validasi input merge.
- **Tidak ada UI** — pola sama persis S489 ("fondasi dulu, tanpa wiring"),
  wiring ke `assetOwnersModal`/`investmentOwnersModal`/`titipanCommitmentModal`
  sengaja ditunda ke sesi terpisah.

## Verifikasi

- `npm test`: 3960 test, **3954 pass / 6 fail** — 6 kegagalan sama persis
  baseline pre-existing (`_ownerNominalText()`), 0 regresi baru.
- `node scripts/build.js`: berhenti di `verifyVersionConstantsSynced()` —
  pre-existing, sama seperti sesi R1/R2, di luar scope.

## Di luar scope

- R5 (pecah `dana-titipan-portfolio-presenter.js` 1640 baris).
- UI untuk `rename()`/`merge()` (fondasi backend saja sesi ini).
- Perbaikan bug `verifyVersionConstantsSynced()` (pre-existing, tidak terkait
  ownership/titipan).
