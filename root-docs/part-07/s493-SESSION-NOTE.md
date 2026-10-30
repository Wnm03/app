# Sesi 493 — Validasi Silang & Cleanup Owner Registry (langkah 5/5, penutup S489-S493)

Ref: `PLAN-owner-registry-multi-session.md`.

## Scope (persis sesuai instruksi — S494/Gate 2 TIDAK disentuh)
1. Audit & jalankan `MultiOwnerEngine.validateOwners()` full regresi.
2. Test lintas 3 domain (Aset + Investasi + Titipan) — `ownerId` sama dari
   registry dipakai konsisten.
3. Pastikan agregasi SELF/non-SELF & validasi total porsi 100% identik.
4. Update `BUG_REGISTRY`/`CHANGELOG` — rename-owner UI didokumentasikan
   out-of-scope (Gate #3).
5. **0 migrasi/merge/rename data existing.**

**HARD RULE dipatuhi:** sesi ini **0 baris business logic diubah** — tidak
ada file `modules/*.js` yang disentuh (kecuali bump konstanta versi rutin
lewat `build.js`, bukan logic). Hanya 2 kategori perubahan: (a) test baru
murni-baca, (b) dokumentasi (`BUG_REGISTRY.md`/`CHANGELOG.md`/PLAN).

## 1. Audit & regresi `MultiOwnerEngine.validateOwners()`
Ditelusuri semua caller `validateOwners()` di codebase (dipanggil langsung
oleh `getOwners()`, `setOwners()`, `splitByPorsi()` — 3 titik, semua di
`multi-owner-engine.js`, tidak ada duplikat implementasi di modul lain).
Coverage existing yang relevan dijalankan ulang:
- `tests/multi-owner-engine.test.js` (41 test — termasuk 11 test spesifik
  `validateOwner()`/`validateOwners()`: baris valid, ownerId kosong,
  porsi 0/>100, toleransi floating-point 33.33×3, total≠100, ownerId
  duplikat case/whitespace-insensitive, baris tidak valid dgn index)
- `tests/multi-owner-piutang-debt-split-s394.test.js` (12 test)
- `tests/s462-investasi-multi-owner-titipan.test.js` (4 test)

**Hasil: 57/57 lolos, 0 regresi.** Formula total-porsi/duplikat-ownerId/
toleransi-epsilon TIDAK berubah walau S490/491 sekarang mengisi `ownerId`
lewat `OwnerRegistry.findOrCreate()` — `validateOwners()` tetap
memperlakukan `ownerId` sebagai string biasa (tidak ada special-case utk
ownerId hasil registry), dibuktikan eksplisit test #5 file baru di bawah.

## 2 & 3. Test baru — `tests/s493-owner-registry-cross-domain-validation.test.js` (7 test)
Semua angka dihitung LEWAT fungsi asli (0 hardcode hasil rumus manual):

1. `ownerId` dari `OwnerRegistry.findOrCreate()` dipakai di Aset
   (`MultiOwnerEngine.getOwners()`) + Investasi (`Investment.getOwners()`)
   → 1 identity yang sama di kedua domain, dedup by nama (bukan dobel).
2. `ownerId` registry yang sama di holding Investasi → dikenali
   `DanaTitipanPortfolioAPI.listExistingOwners()` (union holding+registry
   S492, dedup by id → 1 entri, bukan 2) → `saveCommitment()` valid.
3. `DanaTitipanPortfolioAPI.build()` — 1 `ownerId` registry dipakai di 2
   holding berbeda → `allocatedPrincipal` teragregasi benar, diverifikasi
   silang lewat `MultiOwnerEngine.splitByPorsi()` dipanggil manual di
   test (0 hardcode angka).
4. Agregasi SELF/non-SELF (`selfPorsi()`/`selfOwnedValue()`/
   `splitByPorsi()`) di Aset **tidak berubah** walau `ownerId` non-SELF
   dari registry, bukan `uid()` manual.
5. `validateOwners()` — total≠100% & ownerId duplikat **tetap ditolak**
   sama persis walau salah satu `ownerId` dari registry (0 pengecualian).
6. Isolasi lintas domain: `MultiOwnerEngine.setOwners()` (pure) tidak
   memutasi `D.investments`/`D.ownerRegistry`/`D.titipanCommitments`
   domain lain, entity asli juga tidak dimutasi (0 side-effect).
7. Regresi eksplisit: owner legacy (`ownerId` manual pra-S489) tetap
   diterima berdampingan dgn owner registry di aset/holding yang SAMA —
   `getOwners()` tidak memaksa migrasi, `isSynthesized:false` (dipakai
   apa adanya).

## 4. Dokumentasi — `BUG_REGISTRY.md` / `CHANGELOG.md`
- `docs/BUG_REGISTRY.md` §0a-10, entri baru **OWNREG-GATE3-001**:
  rename-owner UI (`OwnerRegistry.rename()`/edit nama entri existing)
  didokumentasikan **OUT OF SCOPE (Gate #3)** — keputusan sadar sejak
  Gate #1 poin 3 di plan awal, BUKAN utang teknis diam-diam. Menjelaskan
  konsekuensi: `findOrCreate(name)` dgn nama baru = entri baru (id
  beda), bukan rename entri lama.
- `CHANGELOG.md`: entri baru "Sesi 493" di paling atas (pola sama entri
  sesi-sesi sebelumnya), merangkum audit regresi + test baru + dokumentasi.
- `PLAN-owner-registry-multi-session.md`: status diupdate — rangkaian
  S489-S493 **SELESAI**; Gate 2 baru (Kuota Nominal Titipan, S494)
  **BELUM diputuskan**, menunggu sesi terpisah sesuai instruksi eksplisit
  ("jangan masuk S494/Gate 2").

## 5. 0 migrasi/merge/rename data existing
Dikonfirmasi lewat test #6 & #7 file baru (isolasi + owner legacy tetap
berdampingan tanpa dipaksa migrasi) — tidak ada `D.assets`/`D.investments`/
`D.ownerRegistry`/`D.titipanCommitments` yang ditulis ulang/dimigrasi di
sesi ini, baik lewat kode maupun lewat langkah manual.

## 6. Verifikasi
- `node --test tests/s493-owner-registry-cross-domain-validation.test.js`
  → **7/7 lolos**.
- `node --test tests/multi-owner-engine.test.js
  tests/multi-owner-piutang-debt-split-s394.test.js
  tests/s462-investasi-multi-owner-titipan.test.js` → **57/57 lolos**.
- `node --test tests/*.test.js` → **3219/3219 lolos, 0 gagal** (3212
  baseline S492 + 7 baru, 0 regresi).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-release-ready.js` → lolos, 2 override manual sama
  seperti S488-S492 (eslint/esbuild tidak terpasang di sandbox, dicatat
  di `docs/RELEASE-GATE-LOG.md`).
- Build → versi bundle v1223 → **v1224**, label
  `s493-owner-registry-cross-domain-validation`.

## Out-of-scope (sesuai instruksi eksplisit)
- **S494/Gate 2 (Kuota Nominal Titipan) TIDAK disentuh** — 4 keputusan
  desain di plan (basis nominal, owner tanpa commitment, hard/soft block,
  scope investasi-vs-aset) **belum dijawab**, prasyarat S493 sekarang
  sudah terpenuhi tapi keputusan Gate 2 itu sendiri MENUNGGU sesi
  terpisah sesuai instruksi user.
- `OwnerRegistry.rename()`/edit nama — tetap out-of-scope (Gate #3),
  didokumentasikan bukan diimplementasikan.
- 0 perubahan business logic — semua file `modules/*.js` yang berubah
  hanya bump konstanta versi rutin (`APP_BUILD_VERSION` dkk, via
  `build.js`), bukan logic.

## Status akhir
Rangkaian **S489 (registry core) → S490 (aset.js) → S491 (investasi-view.js)
→ S492 (titipan retrofit) → S493 (validasi silang & cleanup)** SELESAI.
Owner Registry sekarang jadi satu sumber kebenaran opsional lintas
Aset/Investasi/Titipan untuk owner BARU (mulai S490+), owner lama tetap
aman/tidak dimigrasi. Gate 2 (kuota nominal titipan untuk S494) menunggu
keputusan eksplisit di sesi terpisah.
