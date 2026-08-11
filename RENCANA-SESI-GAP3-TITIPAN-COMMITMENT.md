# Rencana Sesi — Gap #3: Titipan Principal / Allocation Reconciliation

> **STATUS: SELESAI — 5/5 sesi tuntas (S485a→S485e), build final 1214.**
> Ringkasan penutup ada di bagian "Ringkasan Akhir Gap #3" di paling bawah
> dokumen ini. Detail regresi/build/verifikasi HARD RULE sesi penutup ada
> di `s485e-SESSION-NOTE.md` + `PATCH-README-s485e.md`.

Dokumen ini memecah implementasi Gap #3 (`D.titipanCommitments[]` + owner
picker + projection extension + UI) menjadi beberapa sesi kerja terpisah,
sesuai konvensi project: **1 sesi = 1 langkah yang bisa diaudit, ditest, dan
di-build sendiri = 1 pasang zip (release + patch)**.

Prinsip pembagian:
- Tiap sesi HARUS bisa lulus regression penuh sendiri sebelum lanjut ke
  sesi berikutnya (tidak ada sesi yang menyisakan state "setengah jadi"
  yang bikin app crash/error kalau berhenti di situ).
- Layer paling berisiko (projection/allocation guard) diisolasi jadi sesi
  sendiri supaya gampang direview/di-revert terpisah dari layer UI.
- Tidak ada sesi yang menyentuh HARD RULE (OwnershipEngine, MultiOwnerEngine,
  investasi.js, `_syncTitipanDebt()`, akun.js) — semua perubahan tetap di
  dalam `dana-titipan-portfolio-presenter.js` + `modals.js` + tests.

---

## Sesi 1 (S485a) — Data Model + Owner Picker (read-only)

**Tujuan:** fondasi paling aman — belum ada tulis-menulis data, belum ada UI.

**Scope:**
- `D.titipanCommitments` — pola init lazy (`D.titipanCommitments =
  D.titipanCommitments || []`) di titik baca/tulis, sama seperti
  `D.investmentWatchlist`. Tidak ada migration destructive.
- `DanaTitipanPortfolioAPI.listExistingOwners()` — helper read-only:
  iterasi `Investment.getHoldings()` → `Investment.getOwners(h)` →
  dedup by `ownerId` → `[{ownerId, ownerName}]`.
- **Tidak** menyentuh `build()`/`render()` existing sama sekali — output
  S484 lama harus identik sebelum/sesudah sesi ini.

**Out of scope sesi ini:** CRUD, projection extension, modal, UI.

**Test:**
- `listExistingOwners()` dedup by `ownerId` (bukan `ownerName`).
- Owner sama nama, `ownerId` beda → tetap 2 entri.
- Legacy `titipan_investor` collision → tetap 1 entri gabungan (dicatat
  sebagai keterbatasan, bukan bug baru).
- Guard: aman dipanggil tanpa `Investment`/`MultiOwnerEngine` dimuat.
- 11 test S484 lama tetap PASS, 0 regresi.

**Deliverable:** 1 zip release + 1 zip patch (`s484→s485a`), + catatan sesi.

---

## Sesi 2 (S485b) — Commitment CRUD (backend, tanpa UI)

**Tujuan:** logika create/update `D.titipanCommitments`, murni via API,
belum ada modal — supaya CRUD bisa diuji lewat unit test sebelum disambung
ke DOM (lebih gampang diaudit terpisah dari markup).

**Scope:**
- `DanaTitipanPortfolioAPI.saveCommitment({ownerId, ownerName,
  principalAmount, committedDate, notes})`:
  - Validasi: `ownerId` wajib & harus ada di `listExistingOwners()`
    (existing-owner-only, TIDAK generate identity baru), `principalAmount`
    numerik & ≥ 0, tanggal format existing.
  - Upsert by `ownerId`: kalau sudah ada record → update in place; kalau
    belum → push baru dengan `id: uid()`.
  - **Tidak** menyentuh `D.accounts`, `D.transactions`, `D.investmentTx`,
    `D.investments`, `D.debts` — isolasi akuntansi total.
- (Opsional, kalau perlu) `deleteCommitment(id)` read-only-safe, hanya
  kalau dibutuhkan requirement fase ini — kalau tidak ada requirement
  eksplisit hapus, skip dulu (bisa jadi sesi terpisah nanti).

**Out of scope sesi ini:** projection (`build()`), modal, render UI.

**Test:**
- Create baru (push).
- Upsert (`ownerId` sama → update, bukan push duplikat).
- `ownerId` tersimpan persis dari pilihan (bukan hasil ketik ulang nama).
- Owner tidak ada di `listExistingOwners()` → ditolak, tidak membuat
  `ownerId` baru.
- Principal negatif/non-numerik → ditolak.
- Commitment tidak mengubah `D.accounts`/`D.investments`/`D.debts` sama
  sekali (assert deep-equal sebelum/sesudah selain `titipanCommitments`).
- Regression S485a + S484 tetap PASS.

**Deliverable:** 1 zip release + 1 zip patch (`s485a→s485b`).

---

## Sesi 3 (S485c) — Projection Extension (`build()`)

**Tujuan:** bagian paling berisiko secara logika — union owner,
allocation guard, status. Diisolasi dari UI supaya review fokus ke angka,
bukan markup.

**Scope:**
- Extend `DanaTitipanPortfolioAPI.build()`:
  - Owner list = **union** dari `titipanCommitments` + owner hasil
    agregasi holding (bukan cuma salah satu sumber).
  - Per owner: `principalAmount` (dari commitment, `null` kalau tidak
    ada — JANGAN default 0), `allocatedPrincipal`/`currentValue`/`gain`
    (tetap 100% reuse mekanisme S484 lama, 0 rumus baru).
  - Guard `estimatedUnallocated`/`overAllocatedAmount`/
    `allocationStatus` (`OK` / `OVER_ALLOCATED` / `PRINCIPAL_NOT_SET`)
    sesuai spec §14–§15 (tidak pernah negatif, tidak pernah default 0
    kalau principal memang belum ada).
  - `totals` baru: `principalAmountTotal`, `estimatedUnallocatedTotal`
    (hanya dijumlah dari owner yang punya principal), `overAllocatedTotal`.

**Out of scope sesi ini:** modal, render UI (boleh render tetap pakai
versi S485a/b sementara, projection baru belum ditampilkan dulu).

**Test (paling banyak, ini jantung logikanya):**
- Commitment + allocation < principal → `OK`, unallocated benar.
- Commitment + allocation > principal → `OVER_ALLOCATED`, unallocated=0,
  `overAllocatedAmount` benar.
- Commitment tanpa holding → allocated=0, currentValue=0, gain=0,
  unallocated=principal, status `OK`.
- Holding tanpa commitment → `principalAmount:null`,
  `estimatedUnallocated:null`, status `PRINCIPAL_NOT_SET` (bukan 0).
- Principal = allocated persis → unallocated = 0, status `OK`.
- Multi-holding satu owner, multi-owner satu holding (regresi kombinasi).
- `totals.estimatedUnallocatedTotal` tidak memasukkan owner
  `PRINCIPAL_NOT_SET`.
- **Test case utama (spec §24):** Budi Rp100jt, BBCA+RDPU+Emas →
  allocated 70jt, unallocated 30jt, currentValue 75jt, gain 5jt, `OK`.
- Regression S485a+b + S484 tetap PASS.

**Deliverable:** 1 zip release + 1 zip patch (`s485b→s485c`).

---

## Sesi 4 (S485d) — UI: Modal CRUD + Render Extension

**Tujuan:** sambungkan semua logika sesi 1–3 ke UI yang bisa dipakai user.

**Scope:**
- `titipanCommitmentModal` baru di `MODAL_HTML` (`modals.js`), pola
  gabungan `investmentOwnersModal` (dropdown owner) +
  `investmentTxModal` (form tambah + list). Field: Pilih Owner (`<select
  id="titipanCommitOwner">` dari `listExistingOwners()`, bukan free-text),
  Pokok Dana Titipan, Tanggal, Catatan.
- 1 baris `<script>document.write(MODAL_HTML[N]);</script>` baru di
  `index.html` (app_production.html TIDAK diedit manual — auto-copy oleh
  `build.js`).
- Extend `DanaTitipanPortfolioPresenter.render()` — tampilkan Pokok
  Dikomit / Teralokasi / Estimasi Belum Teralokasi / Nilai Saat Ini /
  Untung-Rugi per owner, label **"Estimasi Belum Teralokasi"** (bukan
  Kas/Saldo/Dana Tersisa), badge ⚠️ kalau `OVER_ALLOCATED`, "Belum
  dicatat" (bukan "Rp0") kalau `PRINCIPAL_NOT_SET`.
- Tombol trigger buka modal via `data-action` (bukan inline `onclick`).

**Out of scope sesi ini:** perubahan logika `build()`/CRUD (murni
konsumsi API sesi 1–3).

**Test:**
- Snapshot/DOM-level test kalau project punya konvensinya, atau minimal
  guard container opsional tetap aman tanpa DOM.
- Full regression S485a+b+c + S484.

**Deliverable:** 1 zip release + 1 zip patch (`s485c→s485d`).
**Wajib browser smoke test di sesi ini** (satu-satunya sesi yang
mengubah markup/DOM nyata).

---

## Sesi 5 (S485e) — Final Regression, Build, & Dokumentasi

**Tujuan:** penutup — build resmi, verifikasi tidak ada perubahan liar ke
engine lain, finalisasi dokumen sesi & release notes.

**Scope:**
- Full `node --test tests/*.test.js` (gabungan semua sesi 1–4).
- `node scripts/build.js s485-...` → bump versi, sync bundle, sync
  `index.html`/`app_production.html`.
- Full test lagi setelah build.
- `grep`/diff eksplisit memastikan **tidak ada** perubahan di
  `ownership-engine.js`, `multi-owner-engine.js`, `investasi.js`,
  `akun.js`, `_syncTitipanDebt()`.
- Tulis `s485-SESSION-NOTE.md` + `PATCH-README-s485.md` (pola sama
  seperti punya S484), dengan bagian eksplisit:
  - **PRE-EXISTING / OUT OF SCOPE**: `titipan_investor` legacy collision.
  - **Remaining limitations**: principal self-reported, tidak ada
    validasi ke `account.balance`, belum ada partial return/withdrawal
    (Case F), legacy owner identity bisa tetap ambigu.

**Deliverable:** 1 zip release (full app) + 1 zip patch
(`s483(baseline s484)→s485` gabungan, untuk yang mau langsung lompat dari
S484 ke S485 final) + dokumen sesi.

---

## Ringkasan urutan zip

| # | Kode | Isi | Zip |
|---|------|-----|-----|
| 1 | S485a | Data model + owner picker (read-only) | release + patch |
| 2 | S485b | Commitment CRUD backend | release + patch |
| 3 | S485c | Projection extension (`build()`) | release + patch |
| 4 | S485d | UI (modal + render) | release + patch |
| 5 | S485e | Final build + regression + dokumentasi | release + patch (final) |

Setiap sesi baru **hanya boleh dimulai** setelah sesi sebelumnya:
1. lulus test yang didefinisikan di sesi itu sendiri,
2. lulus full regression (semua test lama + baru),
3. berhasil di-build tanpa error,
4. zip release+patch sudah dihasilkan.

Tidak ada sesi yang boleh menyentuh `OwnershipEngine`,
`MultiOwnerEngine`, `investasi.js`, `_syncTitipanDebt()`, atau
`akun.js` — kalau di tengah jalan ternyata dibutuhkan, STOP dan laporkan
sebelum lanjut (sesuai HARD RULE awal).

---

## Ringkasan Akhir Gap #3 (ditulis di sesi S485e, sesi penutup)

Semua 5 sesi selesai, tuntas sesuai urutan rencana di atas, tanpa ada
sesi yang di-skip atau digabung:

| # | Kode | Build | Isi | Status |
|---|------|-------|-----|--------|
| 1 | S485a | 1211* | Data model + `listExistingOwners()` (read-only) | ✅ selesai |
| 2 | S485b | 1211→1212* | `saveCommitment()` CRUD backend (existing-owner-only, upsert by `ownerId`) | ✅ selesai |
| 3 | S485c | 1212 | Extend `build()` — union owner, `allocationStatus`, totals | ✅ selesai |
| 4 | S485d | 1212→1213 | Modal `titipanCommitmentModal` + `DanaTitipanCommitmentUI` + extend `render()` | ✅ selesai |
| 5 | S485e | 1213→**1214** | Build final + regresi penuh + dokumentasi penutup (sesi ini) | ✅ selesai |

*Nomor build S485a/S485b persis mengikuti catatan sesi masing-masing
(`s485a`/`s485b` tidak menyisakan file SESSION-NOTE terpisah dari
S485b di repo yang diaudit sesi ini — rujuk `s485b-SESSION-NOTE.md`
untuk detail build S485a+b, dan `s485c-SESSION-NOTE.md` untuk
verifikasi HARD RULE-nya).

### Hasil akhir

- **Test:** `node --test tests/*.test.js` → **3144/3144 PASS**, 0 gagal,
  0 regresi, setelah build final S485e (build 1214).
- **Build:** `node scripts/build.js s485e-final-regression-docs` →
  sukses, versi 1213→1214, sintaks kedua bundle valid, `index.html`/
  `app_production.html` sinkron `?v=1214`.
- **HARD RULE:** diff eksplisit build 1213 (S485d) → build 1214 (S485e)
  mengonfirmasi `ownership-engine.js`, `multi-owner-engine.js`,
  `investasi.js` (termasuk `_syncTitipanDebt()`), dan `akun.js`
  **TIDAK BERUBAH SAMA SEKALI** di sesi ini maupun akumulasi
  S485a-e — sesuai HARD RULE yang dipegang sejak awal rencana.
- **Scope aktual sesi S485e:** murni bump versi build (1213→1214) +
  regenerasi `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` otomatis
  oleh `build.js` + dokumentasi penutup (dokumen ini +
  `s485e-SESSION-NOTE.md` + `PATCH-README-s485e.md`). **0 baris logika
  baru** — semua logika Gap #3 sudah selesai di S485a-d.

### PRE-EXISTING / OUT OF SCOPE (tidak diperbaiki sepanjang Gap #3)

- **`titipan_investor` legacy collision** — holding lama dengan
  `fundSource:'titipan'` semuanya memakai `ownerId` literal
  `'titipan_investor'`. Kalau 2 orang berbeda memakai jalur legacy ini,
  keduanya collapse jadi 1 entri owner di `listExistingOwners()`, jadi
  juga 1 baris commitment/1 modal edit yang sama di UI S485d. Dicatat
  sejak S485a, dikonfirmasi ulang di tiap sesi berikutnya (S485b/c/d),
  **sengaja tidak diperbaiki** dalam rencana Gap #3 ini (di luar scope,
  perbaikan identity legacy butuh keputusan/migration terpisah di luar
  isolasi `dana-titipan-portfolio-presenter.js`+`modals.js`).

### Remaining limitations (untuk backlog, di luar Gap #3)

- **Principal self-reported** — `principalAmount` di
  `D.titipanCommitments[]` murni input manual user lewat modal, tidak
  ada validasi silang ke `account.balance`/histori transaksi riil.
- **Tidak ada validasi ke saldo akun** — sistem tidak mengecek apakah
  Pokok Dana Titipan yang dicatat benar-benar match dengan mutasi kas
  yang terjadi.
- **Belum ada partial return/withdrawal (Case F)** — kalau owner
  menarik sebagian titipan sebelum semua holding dilepas, belum ada
  alur khusus; `saveCommitment()` hanya upsert nilai pokok, tidak
  melacak riwayat penarikan.
- **Legacy owner identity bisa tetap ambigu** — lihat poin
  `titipan_investor` di atas; berlaku juga untuk kemungkinan collision
  identity lain yang belum ditemukan di luar pola ini.

Backlog di atas disarankan jadi Gap terpisah kalau mau dikerjakan
(bukan bagian dari Gap #3), supaya tetap konsisten dengan prinsip
"1 sesi = 1 langkah yang bisa diaudit sendiri" di project ini.
