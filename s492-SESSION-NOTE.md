# Sesi 492 — Retrofit `titipanCommitmentModal` ke OwnerRegistry (langkah 4/5)

Ref: `PLAN-owner-registry-multi-session.md`.

## Keputusan Gate #2 (dikonfirmasi user sebelum sesi ini mulai)
**Gate #2 = SENTUH.** Instruksi eksplisit user:
> `DanaTitipanPortfolioAPI.listExistingOwners()` menjadi consumer
> `OwnerRegistry.listAll()`, tetapi tidak melakukan migrasi, rename, merge,
> atau perubahan `ownerId` pada data existing. Jangan diperluas ke hal lain.

## Yang dikerjakan (`modules/finance/dana-titipan-portfolio-presenter.js`)
`listExistingOwners()` diubah dari "union holding saja" (S485a) menjadi
**union holding (TIDAK diubah sama sekali) + `OwnerRegistry.listAll()`
sebagai sumber kedua** (append, dedup gabungan by id — kalau id registry
kebetulan sama dgn `ownerId` union holding, entri union holding yang
menang, entri registry di-skip):

- 0 baris logic union holding lama diubah/dihapus — hanya ditambahkan blok
  baru setelahnya yang membaca `OwnerRegistry.listAll()` dan meng-append
  entri yang `id`-nya belum ada di `seen`.
- Kenapa union (bukan ganti total): Gate #1 (S489) mengunci seed KOSONG —
  semua owner yang sudah ada di holding SEBELUM S490/491 live TIDAK PERNAH
  masuk registry, dan sesi ini DILARANG migrasi/backfill. Kalau union
  dibuang & diganti murni `OwnerRegistry.listAll()`, seluruh owner lama
  hilang dari picker titipan — itu justru pelanggaran "tidak boleh ubah
  data existing" (secara efek, bukan secara ownerId literal). Union
  dipertahankan justru untuk menjaga data legacy tetap terlihat/aman,
  sekaligus fungsi ini benar-benar "menjadi consumer" registry (dibaca &
  digabung, bukan diabaikan) — sesuai kalimat instruksi Gate #2 apa adanya.
- 0 mutasi ke `D.investments`/`D.assets`/`D.ownerRegistry`/`D.titipanCommitments`
  di dalam `listExistingOwners()` itu sendiri (fungsi tetap murni baca,
  0 panggilan `save()`).
- Tidak ada perluasan scope lain: `saveCommitment()`/`recordReturn()`/
  `getCommitments()`/`getReturns()`/`build()` **tidak disentuh** — mereka
  tetap konsumsi `listExistingOwners()` apa adanya (existing-owner-only),
  otomatis ikut mendukung owner dari registry tanpa perlu diubah.

## Verifikasi
- Test baru `tests/s492-titipan-listexistingowners-registry-consumer.test.js`
  (8 test): registry kosong → hasil persis sama seperti S485a (test #1);
  registry-only owner tanpa holding sama sekali ikut muncul, bukti "jadi
  consumer" (test #2); gabungan holding+registry owner berbeda → union
  dulu lalu registry, 0 owner hilang (test #3); id kebetulan sama antara
  registry & holding → union menang, tidak dobel (test #4); **0 mutasi
  `D.investments`/`D.ownerRegistry`, 0 panggilan `save()`, nama kembar
  beda `ownerId` TETAP 2 entri terpisah (test #5 — bukti utama "data
  legacy tetap aman")**; `saveCommitment()` untuk owner yang hanya ada di
  registry tetap valid (test #6); guard tanpa `OwnerRegistry` dimuat sama
  sekali (test #7); entri registry malformed tidak crash (test #8).
- **`tests/s485a-titipan-commitment-owner-picker.test.js` (11 test lama,
  0 dimodifikasi) tetap hijau apa adanya** — bukti langsung "data legacy
  tetap aman" sesuai instruksi: dedup by ownerId, SELF dikecualikan,
  legacy collision `titipan_investor`, urutan deterministik, guard tanpa
  Investment/MultiOwnerEngine, `D.titipanCommitments` tidak diinisialisasi
  oleh fungsi baca — semua skenario itu masih persis sama karena union
  holding tidak diubah satu baris pun.
- `node --test tests/*.test.js` → **3212/3212 lolos** (baseline 3204 +
  8 baru, 0 regresi — termasuk 11 test S485a & 8 test S485d CRUD titipan).
- `verify-release-ready.js` → lolos, 2 override manual sama seperti
  S488-S491 (eslint/esbuild tidak terpasang di sandbox, dicatat di
  `docs/RELEASE-GATE-LOG.md`).
- Build → versi bundle v1222 → **v1223**, label
  `s492-titipan-listexistingowners-registry-consumer`.

## Out-of-scope (sesuai instruksi eksplisit — "jangan diperluas ke hal lain")
- Tidak ada migrasi/backfill/rename/merge `ownerId` data existing.
- `DanaTitipanCommitmentUI`/`DanaTitipanReturnUI` (modal UI, S485d/S486)
  **tidak disentuh** — mereka otomatis dapat owner registry lewat
  `listExistingOwners()` tanpa perlu perubahan kode di sana.
- Gate 2 baru (Kuota Nominal Titipan, untuk S494) **belum diputuskan** di
  sesi ini — plan mensyaratkan S493 (validasi silang + cleanup) selesai
  dulu sebagai prasyarat, bukan sesi paralel.

## Next
**S493 — Validasi Silang & Cleanup** (prasyarat wajib sebelum Gate 2/S494
boleh diputuskan):
- `MultiOwnerEngine.validateOwners()` full regresi.
- Test lintas 3 domain: Aset + Investasi + Titipan pakai `ownerId` sama
  dari registry → agregasi SELF/non-SELF tetap benar.
- Update `BUG_REGISTRY`/`CHANGELOG` — catat rename-owner UI sebagai
  out-of-scope eksplisit (Gate #3).
- Final ZIP checkpoint rangkaian S489-S493.

Setelah S493 selesai & hijau, baru Gate 2 (kuota nominal titipan, 4
keputusan di plan) boleh dijawab dan S494 boleh dimulai.
