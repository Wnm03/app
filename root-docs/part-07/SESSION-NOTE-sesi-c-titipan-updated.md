# Session Note — Sesi C: Dana Titipan (`titipan.updated`)

## Konteks

Urutan sesi ringan berikutnya (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
§2i, dikerjakan setelah Sesi D-lanjutan3 v1670):

1. **Sesi C — Dana Titipan (`titipan.updated`)** ← sesi ini
2. Sesi D-lanjutan4 (opsional) — filter/chip `masterCategory` di
   `Servis.renderList()` (Riwayat Servis)
3. Sesi F lanjutan — thumbnail gambar & lightbox
4. Sesi kecil menambah gate wajib version-bump di `scripts/build.js`

Sumber temuan: `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` temuan #5 —
"Dana Titipan — SELURUH domain 0% Event Bus". 4 file dengan `save()`
tapi 0 `AIBus`: `dana-titipan-pool-api.js` (2x),
`dana-titipan-commitment-return-api.js` (4x), `titipan-reconcile.js`
(3x), `titipan-expense-flow.js` (1x) — total 10 titik. Nama event sudah
diputuskan di roadmap §2d poin 2: **`titipan.updated`**.

## Perubahan kode

10 titik emit baru, semua `titipan.updated`, guard `typeof
AIBus!=="undefined"` (pola sama persis `account.updated`/
`product.updated`/`investment.updated`, payload `{kind, action, ...id}`):

- **`modules/finance/dana-titipan-pool-api.js`**
  - `_addEntry()` (dipakai `addOpeningBalance()`/`addDeposit()`):
    `{kind:'pool', action:'opening_balance'|'deposit', entryId}`
  - `deleteEntry()`: `{kind:'pool', action:'delete', entryId}`
- **`modules/finance/dana-titipan-commitment-return-api.js`**
  - `saveCommitment()`: `{kind:'commitment', action:'create'|'edit',
    ownerId}` — dibedakan via `isEditCommitment` (record ditemukan
    sebelum upsert atau tidak)
  - `deleteCommitment()`: `{kind:'commitment', action:'delete', ownerId}`
    (juga otomatis ke-cover saat dipanggil dari `removeOwnerLinkage()`,
    yang 100% delegasi ke fungsi ini — 0 emit dobel)
  - `recordReturn()`: `{kind:'return', action:'create', returnId,
    ownerId}`
  - `deleteReturn()`: `{kind:'return', action:'delete', returnId}`
- **`modules/finance/titipan-reconcile.js`**
  - `repairOwnerIdConsistency()`: `{kind:'reconcile',
    action:'repair-owner-id', unified}` — hanya emit kalau `unified > 0`
    (pola sama guard `save()`-nya yang sudah ada)
  - `repairDebtNameStaleness()`: `{kind:'reconcile',
    action:'repair-debt-name', synced}` — hanya emit kalau `synced > 0`
  - `repairTransactionOwnerRefs()`: `{kind:'reconcile',
    action:'repair-tx-owner-refs', fixed, cleared}` — hanya emit kalau
    `fixed || cleared`
- **`modules/finance/titipan-expense-flow.js`**
  - `submit()`: `{kind:'expense', action:'create', txIds}` — setelah
    `save()`, sebelum `return`

0 field/logic bisnis lama diubah — murni tambah 1 baris emit setelah
tiap `save()` yang sudah ada.

## Listener `AIService.wireEvents()`

`modules/ai/ai-service.js` — `titipan.updated` ditambahkan ke array
event yang disambungkan ke `AIDecision.decide()` (7 event lama tidak
berubah: `finance.updated`/`asset.updated`/`vehicle.updated`/
`delivery.created`/`account.updated`/`product.updated`/
`investment.updated`). Dikerjakan sekalian di sesi yang sama supaya
`titipan.updated` tidak jadi "pemancar tanpa radio" baru (alasan yang
sama dengan kenapa §2e/§2f menyambungkan 3 event lain lebih dulu).

## Sengaja TIDAK dikerjakan sesi ini

- `investasi.js` dasar (event baru di luar `investment.updated` yang
  sudah ada) — item Prioritas Sedang lain di audit yang sama, di luar
  scope "Dana Titipan" sesi ini.
- Aset non-core (`aset-misc.js`/`aset-emas-impor.js`/`aset-reports.js`)
  — idem.
- Sesi D-lanjutan4 (filter/chip `masterCategory` di
  `Servis.renderList()`), Sesi F lanjutan (thumbnail/lightbox), gate
  wajib version-bump — 3 item lain di urutan §2i, ditunda ke sesi
  masing-masing sesuai "1 sesi = 1 fokus kecil".

## Test

- Baru: `tests/dana-titipan-aibus-titipan-updated-sesi-c.test.js` (21
  test, 21/21 pass) — mencakup ke-10 titik emit (payload lengkap per
  titik, termasuk kasus 0-emit saat guard `unified`/`synced`/
  `fixed||cleared` false atau id/ownerId tidak ditemukan), guard
  `AIBus` tidak ada (2 titik representatif: pool-api & titipan-reconcile
  tidak throw), plus 2 test listener `wireEvents()` (nyambung ke
  `titipan.updated` + regresi 7 event lama tidak berubah).
- Full suite (`node --test tests/*.test.js`): **6441/6443 pass**, 2 gagal
  — **persis sama** dengan yang sudah dikonfirmasi pre-existing di
  v1670 (S468d, `txHTML()` item virtual `vbill_`), **0 regresi baru**.
- `node scripts/build.js`: lolos, versi dibump
  `s-sesi-c-wireevents-account-product-investment-1665` →
  `s-sesi-c-titipan-updated-1672` (slug diganti manual sebelum build
  supaya mencerminkan sesi ini, bukan cuma angka auto-increment; `?v=`
  index.html/app_production.html/sw.js ikut sinkron ke `1647`).
- `node scripts/verify-window-expose.js` / `verify-bundle-freshness.js`:
  OK.
- `node scripts/verify-release-ready.js`: lolos via 2 override (lint
  eslint tidak tersedia, bundle tanpa minifikasi esbuild) — sandbox
  tanpa akses jaringan, sama seperti semua sesi sebelumnya (v1640-v1671).
  Log tercatat di `docs/RELEASE-GATE-LOG.md`.

## Belum dikerjakan (lanjutan §2i)

- Sesi D-lanjutan4 — filter/chip `masterCategory` di
  `Servis.renderList()` (Riwayat Servis).
- Sesi F lanjutan — thumbnail gambar & lightbox.
- Sesi kecil menambah gate wajib version-bump di `scripts/build.js`.
- Domain Event Bus lain yang masih 0% dari audit yang sama:
  `investasi.js` dasar (event baru), Aset non-core, Zakat/PBB (3/9
  titik, tidak berubah sesi ini).
