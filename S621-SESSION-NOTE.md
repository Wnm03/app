# S621 — Fix: tombol "Perbaiki Gap Dana Titipan" tidak menutup gap `missing`

## Gejala (laporan user)
Tes Otomatis (Pengaturan > Diagnostik) melaporkan gagal terus-menerus:

```
TitipanReconcile.checkAll(): audit sinkron Dana Titipan ... — 1 gagal
TitipanReconcile.checkAll() menemukan gap --
sync.ok=false (missing:1 orphan:0 mismatch:0),
ownerIdConsistency.ok=true (divergent:0),
debtNameStaleness.ok=true (stale:0)
```

Tombol "🔧 Perbaiki Gap Dana Titipan" di bawah hasil tes sudah ditekan
(sesuai hint-nya sendiri: "akan minta konfirmasi dulu & cuma memproses gap
yang benar-benar ditemukan"), tapi gap yang sama tetap muncul lagi tiap Tes
Otomatis dijalankan ulang.

## Audit
1. Patch `S620-FIX-titipan-akun-only-owner-MERGED.zip` yang sudah di-upload
   ke repo **TIDAK relevan** dengan gap di foto. S620 mengerjakan alur
   "Titipan Akun-Only Owner" (`s620-titipan-account-only-owner-linked-expense`
   / `sC-titipan-majoris-expense-comparison`) — domain `accountSync`
   (cabang Akun) di `TitipanReconcile.checkAll()`. Gap di foto ada di
   `sync` (cabang Aset/Investasi, fungsi `check()`), sub-check yang
   **berbeda**. Jadi walau S620 sudah ter-upload, gap `sync.missing:1` di
   foto memang tidak akan pernah ikut hilang — bukan salah upload, patch-nya
   memang tidak menyentuh bagian itu.
2. Akar masalah sebenarnya: `repairTitipanOrphans()` (`self-test.js`,
   dipanggil tombol "🔧 Perbaiki Gap Dana Titipan") **dari S595 cuma pernah
   memanggil `TitipanReconcile.repairOrphans()`** — fungsi yang namanya
   sendiri sudah bilang "orphan-only" (lihat komentarnya di
   `titipan-reconcile.js`). Tapi teks hint di bawah tombol itu (di
   `app_production.html`/`index.html`) sudah lama menjanjikan tombol ini
   menutup **dua-duanya**: "membuat baris ... yang belum tercatat (missing),
   dan/atau menghapus baris ... (orphan)".
3. Akibatnya: kalau gap yang terdeteksi murni `missing` (seperti kasus
   nyata di foto — `missing:1 orphan:0`), `repairTitipanOrphans()` versi
   lama masuk ke cabang paling atas `if(pre.ok||!pre.orphan.length)` dan
   langsung `toast('✅ Tidak ada gap orphan ...')` **tanpa berbuat apa-apa**.
   Tombol terlihat sukses (ada toast), tapi baris Buku Utang yang seharusnya
   dibuat tidak pernah dibuat — gap `missing` bertahan selamanya sampai aset/
   holding sumbernya kebetulan di-save ulang secara manual.

## Perbaikan
- **`modules/finance/titipan-reconcile.js`**: tambah `TitipanReconcile.repairMissing()`
  (pola sama `repairOrphans()`, pengecualian yang sama dari modul ini yang
  sengaja 0-mutasi). Menelusuri tiap key `missing` balik ke Aset/Holding
  sumbernya, lalu memanggil ulang jalur sync yang **sudah ada**
  (`TitipanSync.reconcile(a)` cabang Aset, `Investment._syncTitipanDebt(h)`
  cabang Investasi) — 0 rumus baru, cuma memanggil ulang fungsi sync yang
  sudah idempotent. Key yang sumbernya sudah tidak ada di data masuk ke
  `unresolved`, tidak dibuang diam-diam.
- **`self-test.js`**: `repairTitipanOrphans()` sekarang memanggil **kedua**
  sisi (`repairMissing()` kalau ada gap missing, `repairOrphans()` kalau ada
  gap orphan) dalam satu alur konfirmasi, jadi perilakunya akhirnya sesuai
  dengan teks hint yang sudah lama ada. Nama fungsi & `data-action` di HTML
  **tidak diganti** (menghindari edit 2 file HTML + bundle tanpa manfaat
  fungsional).
- **`tests/titipan-reconcile.test.js`**: 11 test baru untuk `repairMissing()`
  (cabang Aset via `TitipanSync`, fallback ke `Aset._syncOwnerDebts()`,
  cabang Investasi, dedup 1 aset dgn >1 owner missing, key sumber hilang ->
  `unresolved`, no-op kalau tidak ada gap, aman kalau `D` belum ada).

## Regresi
`node --test tests/*.test.js` — **4344/4344 pass**, 0 gagal.
`node scripts/build.js` — build sukses, versi naik `s620...` → `s621-owner-registry-mandatory-lookup` (`?v=1348` → `?v=1349`).

## Cara pakai setelah upload
Buka Pengaturan > Diagnostik > Tes Otomatis, jalankan tes (akan tetap
menunjukkan gap yang sama, tes itu sendiri 0-mutasi) lalu tekan lagi
"🔧 Perbaiki Gap Dana Titipan" — sekarang baris `missing` yang dilaporkan
akan benar-benar dibuat, bukan cuma dicek.

## File yang diubah
- `modules/finance/titipan-reconcile.js` (logic baru: `repairMissing()`)
- `self-test.js` (logic baru: `repairTitipanOrphans()` menangani missing+orphan)
- `tests/titipan-reconcile.test.js` (11 test baru)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (hasil `node scripts/build.js`)
- `app_production.html`, `index.html`, `sw.js` (bump versi otomatis dari build.js)
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js` (HANYA konstanta versi disamakan oleh
  build.js, 0 logic berubah)
- `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md` (regenerasi otomatis)
