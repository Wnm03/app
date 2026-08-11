# FIX s551 — Audit duplikat nama Aset↔Investasi dengan kepemilikan berbeda

## Latar belakang
Ditemukan lewat laporan user (Agustus 2026): instrumen bernama sama
("Schorder") tercatat SEKALIGUS di Buku Aset (`D.assets[]`) dan sebagai
holding Investasi (`D.investments[]`), tapi susunan pemiliknya berbeda —
di Aset dimiliki investor titipan ("renov") 100%, di Investasi dimiliki
diri sendiri ("Milik Sendiri") 100%. Tidak ada mekanisme apa pun di app
yang memberi tahu user soal ini (2 domain paralel, tidak saling tahu).

Risiko: dobel-hitung nilai di Kekayaan Bersih/Zakat, dan porsi dana
titipan yang salah tercatat.

## Perubahan
File: `data-health-check.js` (fungsi `runDataHealthCheck()`)

Tambah 1 rule baru (murni baca, 0 mutasi data):
1. Kelompokkan `D.assets[]` berdasarkan nama (trim + lowercase, exact
   match — sengaja tidak fuzzy untuk hindari false-positive).
2. Untuk tiap holding di `D.investments[]`, cari aset dengan nama sama.
3. Bandingkan "signature" pemilik efektif dari kedua sisi lewat
   `MultiOwnerEngine.getOwners()` (100% reuse, 0 rumus baru — fungsi yang
   sama dipakai `assetOwnersModal` & `investmentOwnersModal`).
4. Kalau signature beda → push issue `level:'warn'` dengan judul "Nama
   sama di Buku Aset & Investasi dgn kepemilikan berbeda", muncul di
   modal 🩺 Hasil Pemindaian Data (`dataHealthModal`, sama seperti
   cek-cek lain di file ini).

Guard `typeof MultiOwnerEngine !== 'undefined'` — kalau modul belum
dimuat, cek diam saja (0 crash, 0 false-positive), pola sama persis
semua guard lain di file ini (S497, S501, dst).

## Cakupan sengaja DIBATASI (di luar scope patch ini)
- Tidak ada field link resmi baru (`assetId` di holding Investasi) —
  itu rekomendasi B.2 terpisah, butuh sesi sendiri (nambah skema data).
- Tidak ada badge di level list (rekomendasi B.3) — hanya masuk ke
  Data Health Check modal seperti cek lain, konsisten pola existing.
- Match nama EXACT (bukan fuzzy/mirip) — kalau user salah ketik beda
  1 huruf, tidak akan terdeteksi. Trade-off sengaja demi 0 false-positive.

## Cara pakai
Buka menu yang memanggil `runDataHealthCheck()` (🩺 Hasil Pemindaian
Data / Data Health Check di Pengaturan) — kalau ada instrumen nama
kembar Aset+Investasi dengan owner beda, akan muncul sebagai warning.

## Test
File permanen: `tests/data-health-check-asset-investasi-owner-mismatch-s551.test.js`
(pola sama persis `tests/data-health-check-catalog-dup-s268.test.js`, via harness
`tests/helpers/loadSource.js` yang sudah ada di proyek — tidak perlu file helper
baru). 9 test, semua ✅ (`node --test`):
- Kasus nama sama + owner BEDA ("Schorder": Aset=investor 100%,
  Investasi=self 100%) → 1 issue terdeteksi.
- Kasus nama sama + owner SAMA ("Sama Persis": keduanya self 100%) →
  0 issue (tidak false-positive).
- Nama berbeda → 0 issue.
- Match EXACT sengaja bukan fuzzy — typo 1 huruf ("Schorder" vs "Schroder")
  TIDAK terdeteksi (sesuai batasan yang didokumentasikan di atas).
- Match case-insensitive & trim whitespace tetap terdeteksi.
- Default SELF 100% (tanpa field owners/ownership sama sekali) di kedua sisi
  → signature sama → 0 issue.
- 1 nama investasi cocok dgn >1 aset nama sama → tiap pasangan mismatch
  dilaporkan sbg issue terpisah, pasangan yang owner-nya sama tidak ikut.
- 0 mutasi ke `D.assets`/`D.investments` (murni baca).
- Regresi cek lama "Stok sparepart minus" di file yang sama tetap jalan.
