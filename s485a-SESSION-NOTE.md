# Sesi 485a (Gap #3 — Titipan Commitment, langkah 1/5: Data Model + Owner Picker read-only)

## Konteks

Lanjutan audit Gap #3 (BUG-INV-001) yang sengaja ditunda di Sesi 484.
Keputusan final: Opsi C (hybrid minimal, `D.titipanCommitments[]` top-level
kecil, 0 engine baru). Audit lanjutan menemukan `ownerId` TIDAK stabil
sebagai identitas lintas-holding (lihat temuan §5 di bawah) — disepakati
solusi: owner picker read-only (`listExistingOwners()`) sebagai fondasi,
BUKAN owner registry baru.

Implementasi dipecah jadi 5 sesi (lihat
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md`). Sesi ini = **langkah 1/5**.

## Target sesi ini

- `DanaTitipanPortfolioAPI.listExistingOwners()` — read-only, 0 tulis ke
  `D`, 0 registry baru, dedup by `ownerId` (bukan `ownerName`).
- **Tidak** menyentuh `build()`/`render()`/`D.titipanCommitments` sama
  sekali — CRUD & projection extension menyusul di Sesi 485b/485c.

## File yang diubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — tambah
  `DanaTitipanPortfolioAPI.listExistingOwners()` (+ komentar update di
  header file).
- `tests/s485a-titipan-commitment-owner-picker.test.js` (BARU) — 11 test.
- `scripts/build.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `index.html`, `app_production.html`, kedua bundle, `sw.js`,
  `modules/shared/modals.js`/`modules-calc.js`/`modules-render.js`/
  `features-helpers-global-security.js`, `chat-action-handlers.js` —
  **hanya bump versi build** (1209→1210), 0 perubahan markup/logic lain
  di file-file itu (diverifikasi lewat diff eksplisit terhadap baseline
  S484, lihat §Verifikasi di bawah).

## Hasil test

`node --test tests/*.test.js` → **3098/3098 PASS** (3087 lama + 11 baru),
0 gagal, 0 regresi. Dijalankan 2x (sebelum & sesudah build), hasil sama.

## Hasil build

`node scripts/build.js s485a-titipan-commitment-owner-picker` → sukses,
versi s484→s485a (build 1209→1210), sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=1210` sinkron.

## Verifikasi HARD RULE (wajib per instruksi audit)

`diff` eksplisit baseline S484 vs hasil sesi ini terhadap file yang
DILARANG diubah:

```
ownership-engine.js     -> TIDAK BERUBAH
multi-owner-engine.js   -> TIDAK BERUBAH
investasi.js            -> TIDAK BERUBAH (termasuk _syncTitipanDebt())
akun.js                 -> TIDAK BERUBAH
```

Semua file lain yang ikut ter-diff (bundle, index.html, modals.js, dst)
diverifikasi HANYA berisi bump konstanta versi build — 0 markup/logic
baru (belum ada modal/UI sesi ini, itu Sesi 485d).

## Temuan/keputusan owner identity (ringkasan, detail di audit sebelumnya)

- `ownerId` = identity utama, `ownerName` = display snapshot saja.
- Dedup di `listExistingOwners()` SELALU by `ownerId`, tidak pernah by
  nama — 2 owner beda `ownerId` dengan nama sama tetap 2 entri terpisah
  (test #3).
- **PRE-EXISTING / OUT OF SCOPE** (tidak diperbaiki sesi ini maupun sesi
  mendatang dalam rencana 5-sesi ini): holding legacy
  `fundSource:'titipan'` di `Investment.getOwners()` (investasi.js)
  SELALU mengembalikan `ownerId` literal `'titipan_investor'` apa pun
  isi `titipanOwner`-nya. Konsekuensi: 2 holding legacy milik 2 orang
  berbeda collapse jadi 1 entri owner di `listExistingOwners()` (test
  #5, sengaja didokumentasikan sebagai perilaku yang diketahui, bukan
  bug baru sesi ini). Perbaikan (migrasi ownerId/rewrite legacy
  holdings/ubah `getOwners()`) secara eksplisit DILARANG oleh keputusan
  audit sebelumnya.

## Progress & Next TODO

Langkah 1/5 selesai, teruji, ter-build. **Sesi 485b** (berikutnya): CRUD
backend `D.titipanCommitments` (create/upsert by `ownerId`, validasi
existing-owner-only, isolasi penuh dari `D.accounts`/`D.investments`/
`D.debts`) — masih tanpa UI/modal.

## Known Issue

Tidak ada known issue baru dari perubahan sesi ini, selain
`titipan_investor` collision yang sudah dicatat di atas (pre-existing).
