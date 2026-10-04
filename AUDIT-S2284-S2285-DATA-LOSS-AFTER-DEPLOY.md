# Audit S2284–S2285 — Data Hilang Setelah Deploy

## Root cause yang ditemukan

1. `load()` memiliki `catch` yang hanya menampilkan error lalu selesai. Jika exception terjadi **setelah snapshot lama berhasil dibaca/di-merge** (mis. migration/SOT normalization), boot dapat tetap lanjut ke `showMain()`. State `D` bisa default/parsial dan save berikutnya berpotensi menimpa snapshot lama.
2. Release memiliki risiko **source sudah berubah tetapi bundle yang benar-benar dipakai browser belum di-build ulang**. `verify-bundle-freshness.js` sudah ada, tetapi sekarang dibuat gate deploy khusus yang juga memeriksa kontrak persistence.
3. Data browser (`localStorage`/IndexedDB) terikat pada **origin**. Deploy ke domain/subdomain/protokol yang berbeda tidak otomatis membawa data lama. Ini tidak bisa diperbaiki oleh service-worker cache karena Cache Storage juga terikat origin.

## Perbaikan

- S2284: startup persistence sekarang fail-closed pada exception tak terduga; `D` dikembalikan ke state awal, recovery flag diaktifkan, dan `__kwInitRuntime()` menghentikan boot sebelum UI/save.
- S2285: deploy gate memblokir release jika bundle stale/missing, key `kw_v4`/`kw_v4_mirror` berubah/hilang, DB `kw_idb_v1` berubah, atau versi HTML/SW tidak sinkron.

## Batasan penting

Jika deployment berpindah origin, data lama tetap berada di origin lama. User harus kembali ke origin lama atau restore backup JSON/Drive. Runtime tidak boleh mengklaim data sudah hilang sebelum origin dan storage diperiksa.

## Release protocol

`npm run audit:deploy-data-continuity` → `npm run build:release` → `npm run release-check` → deploy **seluruh artifact hasil build**, bukan hanya file source patch.

## Verifikasi pada baseline yang diaudit

- Baseline sebelum perubahan: `node scripts/verify-bundle-freshness.js` → kedua bundle fresh.
- Setelah S2284 source diubah, `node scripts/deploy-data-continuity-gate.js` sengaja **BLOCK** karena `app-bundle-b.min.js` menjadi stale. Ini adalah perilaku yang diinginkan: source persistence tidak boleh dideploy tanpa rebuild bundle B.
- Targeted regression: **12/12 PASS** (`S2284`, `S2320`, `S2322`).

## Bukti data masih ada di backup

Backup `backup-keluarga-W-2026-10-04.json` adalah snapshot schema v11 dan memiliki data transaksi, kendaraan, servis, serta stok part. Jadi file backup bukan empty-state. fileciteturn1file0L1-L5
