# FIX s560 — R2: Migrasi `owners[]` Ad-Hoc ke `OwnerRegistry` (Aset + Investasi)

**Sumber:** `AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md`, Temuan 3 ("OwnerRegistry
Tidak Pernah Benar-Benar Jadi Single Source of Truth"). Urutan disepakati: R1 →
GAP3 fix → **R2** → R4 → R5 → R6.

## Sebelum eksekusi: GAP3-AUD-001 ternyata sudah FIXED, bukan OPEN

Cek ulang `docs/BUG_REGISTRY.md` sebelum mulai R2: `GAP3-AUD-001` (identity
collision `titipan_investor` literal di holding legacy) ternyata **sudah
diperbaiki di Sesi 545/546** (`Investment.migrateLegacyTitipanOwners()`, wired
otomatis via `DATA_MIGRATIONS toVersion:6`), tapi entri di `BUG_REGISTRY.md`
tidak pernah diupdate — masih tertulis status OPEN. Diperbaiki (append status
baru, histori asli tidak diedit) sebelum lanjut R2, supaya dokumen tidak
menyesatkan sesi berikutnya.

## Scope R2

Kasus BEDA dari GAP3-AUD-001: bukan holding tanpa `owners[]` sama sekali, tapi
`a.owners[]`/`h.owners[]` yang **sudah array**, dibuat SEBELUM
`assetOwnersModal`/`investmentOwnersModal` disambung ke `OwnerRegistry` (S490/
S491) — masih pakai `ownerId` hasil `uid()` ad-hoc lama. Contoh: "Budi" di Aset
A dan Aset B punya `ownerId` berbeda meski orangnya sama.

## Perubahan

- **`modules/asset/aset.js`:** tambah `Aset.migrateOwnersToRegistry()`.
- **`modules/asset/investasi.js`:** tambah `Investment.migrateOwnersToRegistry()`
  (pola identik, target `h.owners[]`).
- **`modules/shared/features-helpers-global-security.js`:** `SCHEMA_VERSION`
  6→7, tambah `DATA_MIGRATIONS toVersion:7` yang memanggil kedua fungsi di atas
  — jalan otomatis 1x saat boot/restore JSON, sama pola persis toVersion:6.
- **`docs/BUG_REGISTRY.md`:** status `GAP3-AUD-001` diupdate (lihat di atas).
- **Test baru:** `tests/s560-owners-to-registry-migration-r2.test.js` (5 test:
  konvergensi ownerId lintas Aset, lintas Investasi, idempotency, guard
  tabrakan, holding tanpa `owners[]` di-skip aman).
- **Test disesuaikan:** `tests/s546-schema-v6-titipan-owner-migration-wiring.test.js`
  — 1 test lama ("holding sudah multi-owner tidak disentuh migrasi") diisolasi
  ke `migrateLegacyTitipanOwners()` langsung (bukan `runDataMigrations()` penuh),
  karena sejak toVersion:7 holding multi-owner MEMANG sengaja ikut dinormalisasi
  — itu esensi R2. 1 test baru ditambah utk mengunci perilaku toVersion:7 ini
  lewat `runDataMigrations()` end-to-end.

## Mekanisme migrasi (sama pola dgn S545)

1. Untuk tiap baris owner non-SELF: derive `ownerId` kanonik via
   `OwnerRegistry.findOrCreate(ownerName)`.
2. **Relabel `D.debts[].linkedOwnerId` (atau `linkedAssetId`) LEBIH DULU**,
   baru ganti `ownerId` di baris `owners[]` — supaya `id`/histori/status
   `lunas` entri Buku Utang tetap sama, tidak kebuang & dibuat ulang.
3. **Idempotent**: baris yang `ownerId`-nya sudah kanonik di-skip.
4. **Guard tabrakan**: kalau konsolidasi bikin 2 baris `owners[]` di ENTITY
   YANG SAMA jadi `ownerId` identik (data korup/2 nama sengaja dipisah), entity
   itu di-skip UTUH — dicatat di `res.conflicts`, tidak ada auto-merge porsi.

## Verifikasi

- `npm test` sebelum: 3947 test, 3941 pass / 6 fail (baseline, tidak terkait).
- `npm test` sesudah + 5 test baru + 1 test disesuaikan: 3953 test, **3947 pass
  / 6 fail** — sama persis 6 kegagalan pre-existing, 0 regresi baru.
- `node scripts/build.js`: berhenti di `verifyVersionConstantsSynced()`
  (`modules/shared/modals.js` MODAL_VERSION desync) — **pre-existing**, sudah
  dikonfirmasi gagal identik di baseline sebelum sesi R1, di luar scope sesi
  ini juga.

## Di luar scope sesi ini

- R4 (rename/merge API `OwnerRegistry`), R5 (pecah
  `dana-titipan-portfolio-presenter.js`), R6 (moratorium field baru — berlaku
  efektif mulai sekarang per kesepakatan, bukan kode).
- Perbaikan bug `verifyVersionConstantsSynced()` (pre-existing, tidak terkait
  ownership/titipan).
