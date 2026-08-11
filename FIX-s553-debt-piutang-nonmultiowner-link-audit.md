# FIX S553 — Piutang/Utang tertaut ke aset yang bukan multi-owner (audit gap dari S551/S552)

## Konteks
Rekomendasi audit S551/S552 mempertanyakan apakah `debtAssetId`/`piutangAssetId`
(field "Kaitkan ke Aset Multi-Owner" di modal Piutang/Utang, lihat
`modules/finance/piutang-utang.js` `resolveEntryAssetSelfPorsi()`) punya
cross-check setara pola owner-mismatch S551.

## Temuan
Piutang/Utang **tidak** punya `owners[]` sendiri (beda dari Investasi↔Aset yang
dua-duanya multi-owner entity) — jadi pattern S551 (bandingkan owner
*signature* dua entity) secara struktural **tidak applicable** di sini.
Piutang/Utang cuma mereferensi porsi via `MultiOwnerEngine.selfPorsi(asset)`.

Orphan check untuk `debtAssetId`/`piutangAssetId` sendiri **sudah ada** sejak
S401b (predates S551) — bukan gap.

## Gap nyata yang ditutup
Field itu berlabel "Kaitkan ke **Aset Multi-Owner**", tapi tidak ada peringatan
kalau user menautkan ke aset yang ternyata **single-owner** — tautan jadi
silent no-op (`resolveEntryAssetSelfPorsi()` fallback ke 100%, sama persis
seperti tidak ditautkan sama sekali). User bisa salah kira porsinya sudah
kesplit padahal tidak.

## Perubahan
`data-health-check.js`: tambah cek `warn` untuk Piutang & Utang (pola
identik) — kalau `assetId` resolve ke aset yang ada tapi
`MultiOwnerEngine.getOwners(asset).isMultiOwner === false`, munculkan
peringatan "aman diabaikan kalau memang sengaja cuma buat referensi".

Guard: `typeof MultiOwnerEngine` (pola sama semua guard lain di file ini) —
kalau engine belum dimuat, cek diam saja. 0 mutasi data, murni baca.

## Test
`tests/data-health-check-debt-piutang-nonmultiowner-link-s553.test.js` — 6 test:
warn utk single-owner (Piutang & Utang), tidak warn utk multi-owner, tidak
warn kalau tidak ditautkan, dan guard orphan (assetId dihapus) tidak ikut
trigger cek ini.

## Status
Full suite: 3832/3832 pass, 0 fail (di atas tree gabungan S550 full-merge +
S551 + S552 + S553).
