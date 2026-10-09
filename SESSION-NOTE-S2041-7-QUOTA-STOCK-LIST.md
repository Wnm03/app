# S2041.7 — Uji kuota localStorage, daftar stok/servis besar; indeks riwayat pemakaian part (v2283)

Akumulatif di atas S2041.2–S2041.6.

## 1. Kuota localStorage terlampaui — LULUS (0 perubahan)
`Storage.setItem('kw_v4')` dipaksa melempar QuotaExceededError lalu `save(); saveFlush()`: tidak ada error halaman, toast "localStorage penuh, data TETAP tersimpan di IndexedDB" tampil, dan data benar-benar ada di IndexedDB (diverifikasi dengan membaca store `kv`). Kontrol tanpa error: LS + IDB sama-sama berisi. Catatan metode: `saveFlush()` tanpa `save()` lebih dulu tidak menulis apa pun (tidak ada perubahan state) -- itu perilaku benar, bukan bug.

## 2. Riwayat servis — AMAN
`Servis.renderList` dibatasi: ±630 node DOM berapa pun jumlah log (100–3000 log, 28–98 ms @4x).

## 3. Daftar stok sparepart — dioptimasi sebagian
Temuan: `Sparepart.renderStockList()` TIDAK dibatasi (9 node/baris: 3000 baris = 27.000 node), dan memanggil `getPartUsageHistory()` per baris yang memfilter seluruh `D.servisLogs` (O(baris x log)).
- Fix: `_buildPartUsageIndex()` satu kali per render (Map partId -> log, urutan & predikat sama persis dgn filter lama, tanpa duplikat bila usedPartId == catalogPartLinkedStockId); `getPartUsageHistory(partId, usageIndex?)` memakai indeks bila diberikan, tanpa argumen perilaku lama tidak berubah.
- Hasil (3000 baris stok + 3000 log pemakaian, CPU 4x): 1.286 ms -> 806 ms. Sisanya: `getServiceLinkage` per baris (±0,1-0,2 ms) dan DOM.
- Tes baru `tests/s2041-7-stock-usage-history-index.test.js` (2 tes): hasil berindeks == hasil lama untuk semua part id (termasuk dua-field, kendaraan tak dikenal).
- BELUM dikerjakan (perubahan perilaku UI, butuh keputusan): batasi daftar stok (mis. 100 baris + "tampilkan lebih banyak") agar DOM tidak tumbuh tanpa batas. Pada ≤500 baris (69 ms @4x) tidak terasa.

## Verifikasi
Suite penuh v2283: 8.720 tes, 8.719 lulus, 0 gagal, 1 dilewati. Gate: bundle segar, window-expose, lazy-boundaries, performance-budget PASS. Build resmi 2282 -> 2283.

## Deploy
Upload ULANG semua file di ZIP. Menggantikan ZIP sebelumnya.
