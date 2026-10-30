# S1765 — Persistence stale-fallback hardening

## Perubahan
- Menambahkan monotonic `_savePersistSeq` pada jalur `_saveImmediate()`.
- Setiap snapshot persistence memperoleh sequence number.
- Jika write IndexedDB lama gagal setelah snapshot yang lebih baru sudah diantrikan, fallback `localStorage` untuk snapshot lama dilewati agar tidak menimpa recovery snapshot terbaru.
- Snapshot terbaru tetap memakai fallback localStorage bila write IDB-nya sendiri gagal.
- Tidak mengubah SoT: IndexedDB tetap primary, localStorage tetap emergency snapshot.

## Validasi
- persistence-stale-fallback-s1765.test.js: PASS
- persistence-race-1742: PASS
- persistence-lifecycle-1743: PASS
- persistence-multitab-1744: PASS
- persistence-recovery-1745: PASS
- verify-bundle-freshness: PASS
- verify-window-expose: 82/82 PASS
- Car Notes performance: PASS
- Car Notes integrity: PASS
- source JS >1600: 0
- build: PASS, release 1760

Catatan: esbuild tidak tersedia di environment, sehingga bundle valid tetapi belum diminify.
