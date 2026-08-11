# FIX v1252 → v1253 — Sesi 522: Dana Titipan owner Aset + Hapus commitment

## Bug 1: "Owner tidak ditemukan" utk owner yang cuma diatur porsinya di Buku Aset

**Root cause:** `DanaTitipanPortfolioAPI.listExistingOwners()` cuma union
Investasi + `OwnerRegistry`. Dashboard `build()` sudah lintas domain
(Investasi + Aset, sejak Sesi B1/S499) tapi `listExistingOwners()`
ketinggalan — jadi owner yang HANYA diatur lewat "⚖️ Atur Porsi
Kepemilikan" di Buku Aset (mis. "kamera") muncul sbg kartu dashboard
nyata, muncul di dropdown modal, tapi ditolak saat Simpan.

**Fix:** tambah domain Aset sbg union ketiga di `listExistingOwners()`,
100% reuse `_asetOwnersForTitipan()` (guard existing-owners-only,
isSynthesized-safe — sama persis yang dipakai `build()`). Dedup by
`ownerId`, 2 sumber lama (union holding, OwnerRegistry) 0 diubah.

## Bug 2: tidak ada fungsi hapus utk commitment

**Root cause:** `DanaTitipanPortfolioAPI` cuma punya
`saveCommitment()`/`getCommitments()` — 0 delete.

**Fix:** `DanaTitipanPortfolioAPI.deleteCommitment(ownerId)` (isolasi
total, hanya sentuh `D.titipanCommitments`), + tombol "🗑 Hapus" baru di
`titipanCommitmentModal` (tampil hanya mode edit), wired ke
`DanaTitipanCommitmentUI.deleteCommitment()` (askConfirm dulu, pola sama
`DanaTitipanReturnUI.deleteEntry()`).

## File diubah
- `modules/finance/dana-titipan-portfolio-presenter.js`
- `modules/shared/modals.js`
- `sw.js` (cache-bust v1253)

## Test
- `tests/s522-dana-titipan-owner-aset-hapus.test.js` (6 test baru)
- Full suite: 3440/3440 passing (0 regresi)
