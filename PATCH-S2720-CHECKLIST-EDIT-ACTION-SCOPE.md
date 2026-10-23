# S2720 — Checklist edit action scope

## Temuan
Jalur edit checklist pada `service-history-checklist-edit-s2036.js` menggunakan `payload.actionType || owner.actionType || 'ganti'`. Nilai tindakan checklist yang sengaja kosong (`''`) dianggap falsy lalu mewarisi aksi sesi, sehingga proyeksi baseline pengingat komponen dapat menyimpang dari tindakan komponen yang tersimpan.

## Perbaikan
- Bila payload memiliki properti `actionType`, nilainya diperlakukan otoritatif termasuk string kosong.
- Aksi sesi hanya menjadi fallback jika payload memang tidak memiliki properti `actionType`.
- Tidak mengubah riwayat lain dan tidak melakukan migrasi data.

## Verifikasi
- `node --test tests/servis-checklist-edit-session-reminder-s2036.test.js tests/s2719-checklist-action-scope.test.js tests/reminder-baseline-neutral-legacy.test.js`: 11/11 lulus.
- `node --check modules/vehicle/service-history-checklist-edit-s2036.js`: lulus.
- `npm run build`: lulus; kedua bundle lolos pemeriksaan sintaks dan versi/cache sinkron di 2682.
- Build masih memberi peringatan inventaris `docs/AUDIT_MATRIX.md` usang (total file, JS, Markdown, JSON). Full suite dan browser/WebView E2E belum dijalankan.
