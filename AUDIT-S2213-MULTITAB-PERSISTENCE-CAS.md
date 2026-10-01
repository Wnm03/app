# A-S2213 — Multi-Context Persistence CAS Audit

## Temuan

Audit multi-tab menemukan race yang tidak dapat dijamin hanya dengan BroadcastChannel/storage-event stale guard: dua context dapat sama-sama menganggap state masih fresh sebelum notifikasi lintas-context tiba. Context kedua dapat menulis snapshot lama setelah context pertama melakukan commit.

## Risiko

Tanpa compare-and-swap pada storage boundary, snapshot dari context lama dapat menjadi last-writer-wins dan menimpa perubahan context lain. Warning lintas-tab tetap berguna, tetapi event delivery asynchronous sehingga bukan mutual exclusion.

## Perbaikan

1. Menambahkan `IDBStore.setManyIfCurrent(entries, guardKey, expectedValue, nextValue)`.
2. Outbox replay/failure-clear juga menggunakan CAS terhadap writer token sehingga replay dari tab lama tidak dapat menghapus queue hasil commit tab lain.
2. Guard dibaca dan dibandingkan di transaksi IndexedDB `readwrite` yang sama dengan `kw_v4_mirror` dan durable finance outbox.
3. Setiap context mempertahankan writer token yang diketahui dari durable storage.
4. Commit pertama memperoleh token baru; writer dengan token lama ditolak secara atomik.
5. Conflict menandai context sebagai stale dan tidak melakukan fallback localStorage, sehingga snapshot lama tidak menggantikan state durable.
6. Writer token ikut berada dalam persistence transaction yang sama, sehingga state + outbox + ownership token memiliki commit boundary yang sama.

## Invariant

- Hanya writer dengan token terkini yang dapat commit.
- Stale writer tidak boleh menjadi last-writer-wins.
- `kw_v4_mirror` dan finance outbox tetap satu batch atomic.
- Conflict tidak menghasilkan localStorage-only mirror.
- Writer yang berhasil mendapat token baru untuk save berikutnya.

## Validasi

- S2213 CAS + replay guard: 5/5 PASS
- S2201–S2211 relevant regression: 15/15 test files PASS
- Persistence/outbox regression chain: 17/17 test files PASS
- Modified source syntax: PASS
- Build penuh tidak dijadikan PASS checkpoint bila preflight versi workspace masih mismatch; generated artifacts tidak dimasukkan ke patch.

## Catatan

BroadcastChannel dan storage-event tetap dipertahankan sebagai UX stale-state notification. CAS IndexedDB adalah correctness boundary; notification bukan correctness boundary.
