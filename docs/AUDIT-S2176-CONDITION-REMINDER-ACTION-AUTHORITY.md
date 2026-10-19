# S2176 — Otoritas tindakan checklist untuk pengingat condition-only

## Temuan
Cabang `conditionOnly` pada `computeServiceUrgency()` memilih riwayat terbaru berdasarkan kategori lalu menilai `replaced` dari `latest.actionType` tingkat sesi. Ini melewati guard S2169/S2175. Akibatnya, riwayat multi-komponen dengan root `ganti` yang stale dapat menutupi kondisi `rusak`, meskipun tidak ada baris checklist yang membuktikan komponen target diganti.

## Perbaikan
Status `replaced` kini ditentukan oleh `matchesActionTypeForReset(latest, cat, 'ganti', true)`. Dengan demikian aturan identitas/aksi checklist yang sama digunakan untuk pengingat interval dan pengingat condition-only. Riwayat masih tetap bisa dipakai untuk membaca hasil kondisi, tetapi tindakan sesi yang tidak terhubung ke komponen target tidak dianggap bukti penggantian.

## Tes
Tes baru `tests/s2176-condition-reminder-action-authority.test.js` mencakup:
1. Root `ganti` stale pada checklist multi-komponen yang tidak cocok tidak menutupi kondisi rusak.
2. Baris checklist target dengan tindakan `ganti` yang eksplisit tetap mengembalikan kondisi normal.
3. Baris target `periksa` tidak di-upgrade menjadi penggantian oleh root `ganti`.

## Batasan
Ini memperbaiki otoritas tindakan pada cabang condition-only; tidak mengubah atau memigrasikan data backup, dan tidak menyelesaikan identitas historis yang tidak memiliki bukti cukup.
