# PATCH-README-S572

## Apa yang diperbaiki

`#txAcc` (dropdown "Akun / Metode" di modal Tambah/Edit Transaksi) tidak
lagi meninggalkan **stale state** di dropdown "Kaitkan ke Aset
Multi-Owner" / "Porsi Pemilik (akun patungan)" saat user ganti akun.
Sebelumnya, `onchange` dropdown itu cuma set `_txAccManuallySet=true` dan
tidak pernah memanggil `onTxAccChange()` — jadi dua blok tsb tetap
menampilkan data akun yang LAMA sampai user memicu refresh lewat jalur
lain (mis. tutup-buka modal).

## File diubah

- `modules/shared/modals.js` — satu baris:
  `onchange="_txAccManuallySet=true"` → `onchange="onTxAccChange()"`
  pada elemen `id="txAcc"`.

## File ditambahkan

- `tests/s572-tx-acc-change-stale-state.test.js` — 8 skenario regresi
  (account A→B, B→A, self-link/owner, non-owner, repeated change, dan
  wiring statis HTML LIVE vs orphan). **8/8 PASS**.
- `AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md` — audit root cause & daftar
  file duplicate/orphan yang sengaja tidak disentuh.
- `PATCH-README-S572.md` — dokumen ini.

## File yang SENGAJA tidak diubah

`modules/modals.js`, `modules/shop/modals.js`, `finance/transaksi.js`
(root) — ketiganya dead/orphan, tidak direferensikan `scripts/build.js`.
Lihat `AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md` untuk detail & risiko
duplicate source yang perlu diwaspadai ke depan.

## Verifikasi yang sudah dijalankan

| Langkah | Hasil |
|---|---|
| `node --check modules/shared/modals.js` | ✅ Lolos |
| `node --test tests/s572-tx-acc-change-stale-state.test.js` | ✅ 8/8 PASS |
| `npm test` (full suite) | ✅ 4014 tests, 4007 pass, 7 fail (fail = 7 pre-existing, sama persis dgn baseline; 0 failure baru) |
| `node scripts/build.js` | ✅ Build sukses (`v1301`), kedua bundle lolos `node --check` |
| Cek isi `app-bundle-a.min.js` | ✅ Mengandung `onchange="onTxAccChange()"` pada `id="txAcc"`, 0 sisa `_txAccManuallySet=true` langsung |

## Cara upload

Upload **semua** file yang berubah, bukan cuma HTML:

- `modules/shared/modals.js`
- `app-bundle-a.min.js`
- `app-bundle-b.min.js`
- `index.html`, `app_production.html`, `sw.js` (versi cache ikut naik ke
  `v1301` oleh `scripts/build.js`)
- `tests/s572-tx-acc-change-stale-state.test.js` (opsional utk deploy
  production, tapi disarankan ikut commit ke repo)
