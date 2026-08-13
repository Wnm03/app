# S595 — TitipanReconcile.repairOrphans() + tombol perbaikan

## Masalah
Tes Otomatis (Diagnostik) melaporkan `TitipanReconcile.checkAll()` gagal:
`sync.ok=false (missing:0 orphan:2 mismatch:0)`.

`orphan` = baris di Buku Utang (`D.debts`) yang masih ditandai
`linkedAssetId`/`linkedInvestmentId` + `linkedOwnerId` (dibuat otomatis
lewat `Aset._syncOwnerDebts()` / `Investment._syncTitipanDebt()` sebagai
representasi "dana titipan" owner non-SELF), TAPI owner yang bersangkutan
sudah tidak ada lagi di `a.owners[]`/`h.owners[]` (porsi dicabut/dihapus).

Root cause gap-nya BUKAN salah hitung — `check()`/`checkAll()` sudah benar
mendeteksinya. Gap-nya: `_syncOwnerDebts()`/`_syncTitipanDebt()` HANYA
membersihkan baris orphan milik ASET/HOLDING itu SENDIRI, dan HANYA saat
aset/holding itu kebetulan di-save ulang. Kalau ownernya dicabut lewat
jalur lain (mis. aset/holding-nya sendiri lalu dihapus, restore backup
lama, edit data manual), baris Buku Utang "titipan" itu nyangkut selamanya
sampai ada yang sadar & sengaja save ulang — tidak ada titik lain di app
yang membersihkannya.

## Perbaikan
1. **`modules/finance/titipan-reconcile.js`** — fungsi baru
   `repairOrphans()`. Berbeda dari seluruh fungsi lain di modul ini
   (semua PURE baca-saja), fungsi ini SATU-SATUNYA yang menulis ke `D`:
   menghapus dari `D.debts` persis baris-baris yang terdeteksi `orphan`
   oleh `check()` (key format sama persis), reuse 100% definisi orphan
   yang sudah ada — 0 rumus baru. TIDAK dipanggil otomatis dari mana pun
   (bukan bagian `checkAll()`/`warnIfNotOk()`, bukan dari Tes Otomatis).
2. **`self-test.js`** — fungsi global baru `repairTitipanOrphans()`:
   cek dulu ada gap orphan atau tidak, `askConfirm()` ke user (menjelaskan
   ini MENGHAPUS baris Buku Utang), baru panggil
   `TitipanReconcile.repairOrphans()` + `save()`, lalu re-run Tes Otomatis
   supaya badge status ikut update.
3. **`index.html`** — tombol baru "🔧 Perbaiki Gap Dana Titipan (Orphan)"
   di kartu "🧪 Tes Otomatis" (Pengaturan → Diagnostik), `data-action`
   ke fungsi di atas, dengan keterangan singkat bahwa tombol ini BEDA
   kontrak dari "▶️ Jalankan Tes" (yang tetap 0-mutasi seperti sebelumnya).
4. **`tests/titipan-reconcile.test.js`** — 5 test case baru utk
   `repairOrphans()`: hapus orphan cabang Aset, hapus orphan cabang
   Investasi (fallback `titipan_investor`), tidak menghapus apa pun kalau
   tidak ada gap, tidak menyentuh utang biasa (non-titipan), aman kalau
   `D` belum ada. Semua 34 test di file ini + 4151 test satu suite lolos.

## Cara pakai (utk gap yang sudah kejadian di data live user)
Buka Pengaturan → Diagnostik → kartu "🧪 Tes Otomatis" → scroll ke bawah
hasil tes → tekan "🔧 Perbaiki Gap Dana Titipan (Orphan)" → konfirmasi.
Jalankan "▶️ Jalankan Tes" sekali lagi utk pastikan `orphan` sudah 0.
