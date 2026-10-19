# S2175 — Guard reset interval untuk riwayat kategori dengan checklist multi-komponen

## Ringkasan

Memperketat `matchesActionTypeForReset()` pada `modules/vehicle/sparepart-servis.js`. Bila sebuah riwayat servis memiliki checklist lebih dari satu baris tetapi tidak ada baris checklist yang dapat dicocokkan ke komponen/kategori pengingat yang sedang dihitung, `actionType` tingkat sesi tidak lagi dianggap bukti untuk mereset interval komponen tersebut.

## Perilaku yang dikunci

1. Riwayat masih dapat ditampilkan lewat pencocokan kategori (`servisLogMatchesCat`), tetapi tidak digunakan sebagai bukti reset/action untuk target kategori yang tidak cocok ke baris checklist.
2. Checklist dengan baris yang eksplisit cocok ke `categoryId` dan memiliki tindakan yang valid tetap dapat memengaruhi reset pengingat kategori tersebut.
3. Riwayat legacy dengan satu baris checklist tetap dapat memakai `log.actionType` sebagai fallback kompatibilitas.
4. Guard hanya berlaku pada kueri dengan `actionTypeFilter` atau `forReminder`; tampilan riwayat tanpa filter tidak dihilangkan.
5. Tidak ada migrasi atau perubahan terhadap backup pengguna.

## Pengujian

- Tes baru: `tests/s2175-category-only-multi-checklist-reset-guard.test.js` — 3/3 lulus.
- Tes terarah kumulatif S2164, S2169–S2175 — 17/17 lulus.
- `npm run build` — lulus; kedua bundle lolos `node --check`, HTML sinkron, versi build `2581`.
- `node scripts/verify-bundle-freshness.js` — lulus.
- Full `npm test` tidak selesai dalam batas waktu 120 detik. Log berhenti setelah sekitar 633 subtes yang terlihat; hasil ini bukan kelulusan full suite.

## File runtime/deployment yang berubah

- `modules/vehicle/sparepart-servis.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html`, `sw.js`
- File versi sinkron hasil build: `modules/shared/modules-render.js`, `modules/shared/modals.js`, `modules/shared/modules-calc.js`, `modules/shared/features-helpers-global-security.js`, `chat-action-handlers.js`
- Dokumentasi build yang dihasilkan: `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`
- `tests/s2175-category-only-multi-checklist-reset-guard.test.js`

## Batasan

Patch ini mencegah reset berdasarkan bukti tindakan yang tidak terkait, tetapi tidak dapat menetapkan identitas komponen pada data historis yang memang ambigu. Kasus multi-komponen tanpa baris checklist yang cocok perlu diperbaiki melalui pemetaan yang memiliki bukti kuat, bukan dengan menebak dari `actionType` tingkat sesi.
