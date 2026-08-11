# PLAN: Owner Registry — Sinkronisasi ownerId Lintas Aset/Investasi/Titipan

**Sumber:** Audit `assetOwnersModal` / `investmentOwnersModal` / `titipanCommitmentModal`
**Status:** RANGKAIAN S489-S493 SELESAI (registry core, aset.js, investasi-view.js, titipan retrofit, validasi silang & cleanup). Gate 2 baru (Kuota Nominal Titipan, S494) BELUM diputuskan — menunggu sesi terpisah.
**Prinsip:** 1 sesi = 1 file ZIP checkpoint. Tiap sesi scope sempit, tidak boleh bocor ke sesi berikutnya.

---

## GATE — Keputusan Wajib Sebelum Implementasi

Tidak ada kode ditulis sebelum ini dijawab (terutama #1, ini menentukan bentuk `owner-registry.js`):

| # | Keputusan | Opsi |
|---|---|---|
| 1 | Seed awal registry | **DIKUNCI (S489): (a) Kosong.** Semua owner lama tetap standalone, tidak di-backfill. |
| 2 | Retrofit `titipanCommitmentModal.listExistingOwners()` | **DIKUNCI (S492): SENTUH.** `listExistingOwners()` jadi consumer `OwnerRegistry.listAll()` — ditambahkan sbg sumber KEDUA (append, dedup by id), union holding lama (S485a) TIDAK diganti/dihapus. 0 migrasi/rename/merge/ubah `ownerId` data existing. Lihat `s492-SESSION-NOTE.md`. |
| 3 | Scope rename owner | **out-of-scope** di paket ini (S489-S493), dicatat eksplisit sbg Gate #3 di CHANGELOG saat S493 |

Jika #1 = (b), tambahkan sub-keputusan: apakah collapse butuh konfirmasi manual per nama kembar, atau auto-merge silent.

---

## S489 — Owner Registry Core (module baru, tanpa UI wiring)

**Scope:**
- Buat `modules/shared/owner-registry.js`: struktur `D.ownerRegistry: [{id, name}]`, fungsi `listAll()`, `findOrCreate(name)`
- Terapkan kebijakan seed sesuai Gate #1
- Unit test murni (tanpa modal) untuk registry: create, lookup, dedup by id (bukan by name)

**Out-of-scope:** tidak sentuh `aset.js`, `investasi-view.js`, `modals.js`, `titipanCommitmentModal`

**Exit criteria:** registry berdiri sendiri, test hijau, tidak ada regresi karena belum ada consumer yang pakai.

**Danger point:** kalau seed = (b), pastikan proses seed idempotent (tidak re-seed tiap load) — cek flag `D.ownerRegistrySeeded`.

---

## S490 — Wire `assetOwnersModal` ke Registry

**Scope:**
- `aset.js`: ganti `onOwnerNameInput` (free-text) → `onOwnerSelectChange` (dropdown dari `OwnerRegistry.listAll()` + opsi "buat baru")
- `_renderOwnersList()`: render `<select>` bukan `<input type="text">`
- Baris `isSelf:true` tetap dikecualikan dari dropdown (tidak berubah)
- `saveOwners()`: baris baru → `OwnerRegistry.findOrCreate(name)` bukan `uid()` langsung

**Out-of-scope:** `investasi-view.js`, `titipanCommitmentModal`

**Exit criteria:** regresi test 392* series hijau, manual test: 2 aset pakai nama owner sama → `ownerId` sama.

---

## S491 — Wire `investmentOwnersModal` ke Registry

**Scope:** replikasi persis pola S490 ke `investasi-view.js` (`investmentOwnersModal`)

**Out-of-scope:** `titipanCommitmentModal`, `aset.js` (sudah selesai di S490)

**Exit criteria:** regresi test 462* series hijau, manual test lintas Aset↔Investasi: owner sama → `ownerId` sama.

---

## S492 — Retrofit `titipanCommitmentModal` (kondisional, tergantung Gate #2)

**Jika Gate #2 = "sentuh":**
- `DanaTitipanPortfolioAPI.listExistingOwners()` baca dari `OwnerRegistry.listAll()` alih-alih union ad-hoc dari holding
- Pastikan catatan lama ("dua owner beda ownerId nama sama = 2 entri terpisah") tetap valid untuk data existing yang belum di-touch

**Jika Gate #2 = "biarkan legacy":** skip sesi ini, dokumentasikan alasan di CHANGELOG dan tutup sebagai keputusan sadar, bukan utang teknis diam-diam.

**Exit criteria:** test titipan modal (S485a/S485d series) tetap hijau, tidak ada mutasi data existing.

---

## S493 — Validasi Silang & Cleanup — **SELESAI**

**Scope:**
- Jalankan `MultiOwnerEngine.validateOwners()` full regresi — pastikan logika total-porsi 100% tidak berubah (dropdown cuma ganti cara isi nama)
- Test lintas 3 domain: Aset + Investasi + Titipan pakai `ownerId` sama → agregasi SELF/non-SELF tetap benar
- Update `BUG_REGISTRY` / `CHANGELOG` — catat rename-owner UI sebagai out-of-scope eksplisit (Gate #3)
- Final ZIP checkpoint

**Exit criteria:** full test suite hijau, dokumentasi konsisten, tidak ada TODO tersembunyi.

**Hasil (lihat `s493-SESSION-NOTE.md` untuk detail lengkap):**
- Audit regresi `MultiOwnerEngine.validateOwners()` (57 test terkait domain multi-owner) → 57/57 lolos, 0 regresi.
- Test baru `tests/s493-owner-registry-cross-domain-validation.test.js` (7 test) — `ownerId` registry konsisten lintas Aset/Investasi/Titipan, agregasi SELF/non-SELF & validasi total 100% tidak berubah.
- `docs/BUG_REGISTRY.md` — entri **OWNREG-GATE3-001** (§0a-10): rename-owner UI didokumentasikan OUT OF SCOPE (Gate #3).
- `node --test tests/*.test.js` → 3219/3219 lolos, 0 regresi.
- 0 migrasi/merge/rename `ownerId` data existing.

---

## Dependency Chain

```
Gate (#1 wajib, #2 opsional tapi harus dijawab, #3 konfirmasi)
  → S489 (core registry)
    → S490 (aset.js)
      → S491 (investasi-view.js)
        → S492 (titipan retrofit, kondisional #2)
          → S493 (validasi + cleanup)
```

Tidak ada sesi yang boleh mulai sebelum sesi sebelumnya di-ZIP dan verify, sesuai disiplin proyek.

---

## GATE 2 — Kuota Nominal Titipan (untuk S494, wajib jawab sebelum mulai)

Prasyarat: **S493 harus selesai lebih dulu** — kuota per owner hanya valid kalau `ownerId` konsisten lintas holding (hasil kerja registry S489-S493). Bukan sesi paralel.

| # | Keputusan | Opsi |
|---|---|---|
| 1 | Basis nominal per holding | `holdingCost` (pokok masuk — konsisten dgn `DanaTitipanPortfolioAPI`) atau `holdingValue` (nilai sekarang) |
| 2 | Owner belum punya `titipanCommitments` (principalAmount belum dicatat) | Kuota tampil tanpa batas (silent) atau prompt "catat pokok dulu" |
| 3 | Sifat validasi kuota lebih | Hard block (tombol Simpan mati) atau soft warning (⚠️, tetap bisa simpan — pola sama `OVER_ALLOCATED` yang sudah ada) |
| 4 | Scope | Hanya `investmentOwnersModal` (investasi) sesuai permintaan awal, atau ikut `assetOwnersModal` (properti) juga |

---

## S494 — Kuota Nominal Titipan di `investmentOwnersModal` (kondisional, depend S493 + Gate 2)

**Scope:**
- API baru kecil di `DanaTitipanPortfolioAPI`: `allocatedExcluding(ownerId, holdingId)` — total teralokasi owner itu ke holding LAIN (exclude holding yang sedang dibuka), reuse `build()`/`_holdingSplits()` yang sudah ada, 0 rumus baru.
- `investasi-view.js`: di `onOwnerPorsiInput()`/`updateOwnersTotal()`, tiap baris non-SELF tampilkan "Kuota sisa: Rp X" live — `principalAmount - allocatedExcluding(...) - nominal draft saat ini` (basis sesuai Gate #1).
- Terapkan hard/soft block sesuai Gate #3, terpisah dari validasi total-100%-per-holding (tidak boleh saling override).

**Out-of-scope:** `assetOwnersModal` (kecuali Gate #4 = "ikut"), rumus valuasi baru, migrasi data.

**Exit criteria:** test baru untuk `allocatedExcluding()` + regresi 464*/485* series hijau, manual test: owner dgn pokok X, alokasi ke holding A > sisa kuota → sesuai perilaku Gate #3.

