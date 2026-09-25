# S2013 — Restore Failure Diagnostic Patch

## Tujuan
Diagnostic-only patch untuk menemukan tahap restore yang masih menghasilkan `Error {}`.
Tidak mengubah isi backup dan tidak memperbaiki/menghapus data servis.

## Perubahan
- `modules/shared/backup-restore.js`
  - memberi marker tahap restore;
  - menangkap name/message/code/stack error asli;
  - menyimpan detail ke `window.__S2013_RESTORE_DIAGNOSTIC`;
  - dialog restore menampilkan tahap + pesan error asli.
- Bundle A/B dan file cache/build disinkronkan ke build `2001`.

## Tahap yang dilacak
shape-validation, checksum-validation, backup-shape-known-keys, backup-version,
snapshot-current-data, snapshot-auxiliary-idb, prepare-restored-auxiliary-idb,
merge-backup-into-state, apply-restored-data-migrations, run-data-migrations,
normalize-legacy-service-logs, service-history-sot-normalizer,
remove-temporary-vehicle-catalog, reconcile-service-integrity,
odometer-validation, ownership-validation, save-flush-init, restore-auxiliary-idb.

## Cara uji
1. Upload seluruh file patch ke deployment, bukan hanya HTML.
2. Pastikan cache/build menjadi `v2001`.
3. Gunakan backup asli yang sebelumnya valid checksum; jangan edit backup.
4. Jalankan Restore.
5. Jika gagal, dialog sekarang harus menyebut `Restore gagal pada tahap: ...` dan `Error: ...`.
6. Bila perlu buka console dan jalankan:
   `window.__S2013_RESTORE_DIAGNOSTIC`
7. Kirimkan hasil objek tersebut apa adanya.

## Build
Build version: 2001.
Build lolos syntax check untuk kedua bundle.
Catatan: environment tidak memiliki esbuild, sehingga bundle tidak diminify.
