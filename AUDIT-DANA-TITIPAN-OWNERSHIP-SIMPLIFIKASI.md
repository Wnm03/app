# Audit: Dana Titipan & Ownership — Apakah Bisa Disederhanakan?

**Cakupan audit:** `modules/shared/ownership-engine.js`, `modules/shared/multi-owner-engine.js`,
`modules/shop/multi-owner-engine.js`, `modules/shared/owner-registry.js`,
`modules/shared/ownership-settings-presenter.js`, `modules/asset/asset-ownership-split-presenter.js`,
`modules/finance/dana-titipan-portfolio-presenter.js`, `modules/finance/titipan-expense-flow.js`,
`modules/finance/titipan-expense-ui.js`, `docs/BUG_REGISTRY.md`, `PLAN-owner-registry-multi-session.md`.

**Kesimpulan singkat: YA, ini benar-benar overcomplicated — bukan cuma perasaan.**
Ada **7 representasi kepemilikan berbeda** yang hidup berdampingan, **2 implementasi
engine yang nyaris identik tapi sudah divergen**, dan **84 file test** khusus area ini
(lebih banyak dari kebanyakan domain lain di codebase). Sebagian besar kompleksitas
ini historis/akretif (menumpuk sesi demi sesi dgn disiplin "0 breaking change"), bukan
by-design — jadi bisa disederhanakan, tapi harus bertahap, bukan rewrite besar.

---

## Temuan 1 — 7 Sistem Identitas Kepemilikan Berjalan Paralel

| # | Sumber | Field | Dipakai di |
|---|---|---|---|
| 1 | `OwnershipEngine` (S191) | `entity.ownership` (string, 1 tipe/entity) | fondasi lama, sebagian masih dibaca sbg fallback |
| 2 | `MultiOwnerEngine.owners[]` | `{ownerId, porsi, ownerName}` | Aset, Investasi (porsi pecahan) |
| 3 | Legacy Aset | `titipanAmount`/`titipanOwnerType`/`titipanOwnerName` | disintesis on-the-fly jadi 2 owner |
| 4 | Legacy Investasi | `fundSource==='titipan'` + `titipanOwner` | disintesis, `ownerId` **di-hardcode** `'titipan_investor'` utk SEMUA orang |
| 5 | `D.titipanCommitments[]` | commitment per `ownerId` (pokok dana) | CRUD terpisah di `DanaTitipanPortfolioAPI` |
| 6 | `D.titipanReturns[]` | log pengembalian dana | CRUD terpisah lagi |
| 7 | `D.ownerRegistry[]` (S489+) | `{id, name}` central registry | **hanya dipakai record BARU** — seed sengaja kosong |

Setiap sistem baca/tulis identitas dengan cara berbeda. Kode konsumen (presenter,
data-health-check, UI) harus tahu urutan prioritas ke-7 sumber ini untuk tahu "siapa
pemilik sebenarnya" — itulah kenapa `dana-titipan-portfolio-presenter.js` sampai
1640 baris dan `_synthesizeFromTitipan()` jadi salah satu fungsi paling rumit di
`multi-owner-engine.js`.

## Temuan 2 — Dua Engine Kembar yang Sudah Divergen

`modules/shared/multi-owner-engine.js` dan `modules/shop/multi-owner-engine.js`
dimulai dari kode yang **identik** (komentar header pun copy-paste persis), tapi
`shared/` sudah dapat tambahan (Sesi 406b: `_synthesizeFromTitipan()`, +80 baris)
yang **tidak pernah di-porting** ke `shop/`. Artinya:

- Perilaku sinkronisasi kepemilikan **beda** antara flow toko dan flow keuangan/aset,
  walau namanya sama persis dan awalnya dimaksudkan sebagai 1 engine.
- Setiap fix di satu file punya risiko besar "lupa apply ke saudaranya" — sudah
  terjadi sekali (Sesi 406b), dan tidak ada guard/test yang mendeteksi divergensi ini.

## Temuan 3 — `OwnerRegistry` Tidak Pernah Benar-Benar Jadi Single Source of Truth

Gate #1 di `PLAN-owner-registry-multi-session.md` mengunci seed **kosong** saat S489:
data lama TIDAK di-backfill. Konsekuensinya permanen — bukan cuma masa transisi:

- Owner lama (pra-S489) tetap fragmen: nama sama di Aset A dan Aset B bisa punya
  `ownerId` beda selamanya, kecuali diaudit ulang manual.
- Registry baru dipakai sbg sumber dropdown untuk entri **baru** — dua sistem
  identitas (fragmented lama + registry baru) hidup berdampingan tanpa batas waktu.
- `OwnerRegistry` juga **tidak punya fungsi rename/merge** (`OWNREG-GATE3-001`,
  status OPEN, sengaja out-of-scope) — jadi kalaupun mau konsolidasi manual, tidak
  ada tool-nya.

## Temuan 4 — Bug Identitas yang Sudah Diketahui, Belum Diperbaiki

`GAP3-AUD-001` (status: OPEN) mendokumentasikan bahwa jalur legacy Investasi
(`fundSource==='titipan'`) men-generate `ownerId` **konstan** `'titipan_investor'`
untuk *semua* penitip legacy — Budi dan Cici yang sama-sama masih pakai jalur lama
akan **collapse jadi satu identity** kalau diagregasi berbasis `ownerId` (mis. di
proyeksi Dana Titipan). Ini bukan temuan baru dari audit ini — sudah tercatat sejak
closeout Gap #3, dan dibiarkan karena perbaikannya "berpotensi mengubah legacy
behavior & data existing."

## Temuan 5 — Satu File Presenter Jadi Tempat Semua Menumpuk

`dana-titipan-portfolio-presenter.js` (1640 baris) sudah melalui ~15 sesi
(S484→S550) yang **masing-masing menambah field/state baru** ke `build()`:
`principalAmount`, `estimatedUnallocated`, `overAllocatedAmount`, `allocationStatus`,
`returnedTotal`, `outstandingPrincipal`, `hasGainTracking`, dst — semua di objek
owner yang sama, semua di file yang sama. Pola "reuse 100%, 0 rumus baru" yang
didisiplinkan tiap sesi itu bagus untuk safety, tapi efek sampingnya: file ini jadi
satu-satunya tempat yang tahu cara menggabungkan ke-7 sistem identitas di atas —
titik gagal tunggal (single point of failure) untuk seluruh fitur titipan.

## Temuan 6 — Beban Test Sudah Melebihi Beban Fitur

**84 file test** murni untuk ownership/titipan (di luar test domain lain yang
menyentuhnya secara tidak langsung). Beberapa contoh judul yang menunjukkan pola
"fix identitas → butuh 1 sesi audit + 1 sesi fix + regression test baru" berulang:
`s523a-owner-identity-duplicate-orphan-audit`, `s545-legacy-titipan-owner-registry-migration`,
`s547-self-owner-identity-unification`, `s551-asset-investasi-duplicate-name-owner-mismatch`,
`s554-dana-titipan-linked-asset-doublecount`. Ini indikasi kuat: kompleksitas
struktural (bukan cuma volume kode) sudah jadi sumber bug berulang, bukan sekali
selesai.

---

## Rekomendasi (urut prioritas, tetap 1-sesi-1-task sesuai gaya kerja G)

**R1 — Satukan 2 engine (paling murah, paling mendesak). ✅ DONE (Sesi s559).**
`modules/shop/multi-owner-engine.js` dihapus — investigasi sebelum eksekusi
menemukan file ini sudah lama jadi dead file (tidak pernah live di production
sejak ~v1165), bukan divergensi aktif seperti dikira audit awal. 0 referensi
tersisa. Lihat `FIX-s559-r1-shop-multiowner-engine-dead-file-removal.md`.

**R2 — Migrasi satu-kali `OwnerRegistry` dari data legacy. ✅ DONE (Sesi s560).**
Lihat `FIX-s560-r2-owners-to-registry-migration.md`.

**R3 — Perbaiki `GAP3-AUD-001` sebelum nambah fitur titipan baru. ❌ BELUM DIKERJAKAN.**
Bug identity-collision ini bukan cuma "informational" — kalau dua penitip legacy
collapse jadi satu `ownerId`, proyeksi Dana Titipan (nominal, alokasi) salah secara
finansial, bukan cuma tampilan. Masih status OPEN/PRE-EXISTING/OUT-OF-SCOPE di
`docs/BUG_REGISTRY.md`. Prioritaskan sebelum menambah field/status baru lagi ke
layer presenter Dana Titipan.

**R4 — Tambah `OwnerRegistry.rename()`/`merge()`. ✅ DONE (Sesi s561).**
Menutup `OWNREG-GATE3-001`. Lihat `FIX-s561-r4-owner-registry-rename-merge.md`.

**R5 — Pecah `dana-titipan-portfolio-presenter.js` jadi 3 modul. ✅ DONE (Sesi s562-s563).**
Dipecah persis sesuai (a)/(b)/(c) di bawah — 0 rumus/logic diubah, murni pindah
lokasi kode:
- `modules/finance/dana-titipan-aggregation-api.js` — `build()`/helper agregasi
  (murni hitung, read-only), mendeklarasikan `DanaTitipanPortfolioAPI`.
- `modules/finance/dana-titipan-commitment-return-api.js` — CRUD Commitment/Return,
  extend `DanaTitipanPortfolioAPI` yang sama via `Object.assign()`.
- `modules/finance/dana-titipan-portfolio-render.js` — render/UI
  (`DanaTitipanPortfolioPresenter`/`DanaTitipanCommitmentUI`/`DanaTitipanReturnUI`).

File lama (1640 baris) sudah dihapus setelah semua caller (`scripts/build.js`,
35 file test) diupdate ke urutan muat 3 file baru. Regresi penuh: 3954/3960 pass
— 6 kegagalan dikonfirmasi **pre-existing, tidak terkait split ini**
(`tests/s551-investment-owners-nominal-readonly.test.js`, memanggil fungsi
`_ownerNominalText()` yang sudah di-rename jadi `_ownerNominalValue()` sejak Sesi
552 — dibuktikan lewat repro pakai file lama sebelum dihapus, hasilnya sama).
`node scripts/build.js` sukses (v1292/s563), file lama sudah keluar dari daftar
"file kegedean" build. Detail lengkap: `FIX-s562-r5-dana-titipan-presenter-split-WIP.md`.

**Temuan baru dari sesi R5 (di luar scope R5, belum diputuskan):**
`tests/s551-investment-owners-nominal-readonly.test.js` adalah test usang
(stale) yang tidak pernah diupdate setelah rename Sesi 552 — perlu sesi
terpisah untuk memutuskan: update assertion ke nama fungsi baru, atau retire
(kalau sudah fully-superseded test S552).

**R6 — Moratorium field/state baru di layer ownership sampai R1–R3 selesai.**
Pola "1 sesi = 1 field baru (principalAmount → estimatedUnallocated → ... )" yang
selama ini aman secara regresi, justru menambah kombinasi kasus di atas fondasi
identitas yang belum solid. Tunda fitur baru di area ini sampai identitas
owner benar-benar 1 sumber kebenaran. **Masih berlaku** — R3 belum selesai.

---

## Yang SEBAIKNYA TIDAK dilakukan

- **Jangan rewrite total ke 1 engine ownership baru.** Risiko regresi lintas
  Aset/Investasi/Titipan/Shop terlalu besar untuk 1 sesi, dan bertentangan dengan
  disiplin proyek ini sendiri ("0 breaking change", 1 task = 1 sesi).
- **Jangan auto-merge nama kembar di `OwnerRegistry` tanpa konfirmasi** — sudah
  didokumentasikan sebagai risiko sejak Gate #1, tetap berlaku untuk migrasi R2.

## Ringkasan Prioritas

| Prioritas | Item | Effort | Risiko jika ditunda | Status |
|---|---|---|---|---|
| 1 | R1 — satukan 2 engine | Kecil | Divergensi diam-diam berulang | ✅ DONE |
| 2 | R3 — fix GAP3-AUD-001 | Sedang | Salah hitung finansial titipan legacy | ❌ BELUM |
| 3 | R2 — migrasi OwnerRegistry | Sedang–Besar | Fragmentasi identitas makin lebar | ✅ DONE |
| 4 | R4 — rename/merge API | Kecil | Beban edit manual terus berulang | ✅ DONE |
| 5 | R5 — pecah presenter | Sedang | File makin sulit dipahami tiap sesi baru | ✅ DONE |
| — | R6 — moratorium fitur baru | (kebijakan, bukan kode) — **DICABUT S566**, lihat `FIX-s566-r6-moratorium-closure.md` | Kompleksitas terus menumpuk (sudah tidak berlaku, R1–R5 tuntas) | ⚠️ Masih berlaku (tunggu R3) |
