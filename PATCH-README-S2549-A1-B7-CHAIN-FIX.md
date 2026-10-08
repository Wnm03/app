# PATCH S2549 — A1/B7 + perbaikan bukti rantai akumulasi

## Identitas
- **Baseline langsung:** `app-main (6).zip`.
- **Patch sebelumnya yang diakumulasikan:** `PATCH-S2041-A1-B7-FOLLOWUP.zip`.
- **Nomor sesi koreksi:** S2549. Label S2041 pada nama patch terdahulu bukan nomor sesi terbaru.
- **Jenis:** overlay kumulatif untuk source/test/config dan artefak audit; bukan paket rilis.

## Perubahan source yang dibawa
- `eslint.config.js`: cakupan Node/CommonJS untuk dua tes root-level historis.
- `modules/shared/features-helpers-global-security.js`: satu definisi kanonis `_financeMutationBlockedByStaleState()`.
- `modules/finance/features-helpers-global-security.js`: definisi duplikat dihapus; pemanggil tetap memakai guard kanonis.
- `tests/s2462-finance-stale-write-and-input-guards.test.js`: cek kepemilikan source, pemanggil, dan keberadaan guard di bundle; log PASS hardcoded dihapus.
- `tests/s2467-piutang-utang-atomic-stale-write.test.js`: membaca guard dari shared source.
- `tests/s2379-batch-rollback-single-log-pass.test.js`: matcher disesuaikan dengan deklarasi `restoreBatch` aktual.

## Perbaikan rantai
- Menetapkan manifest spesifik S2549 dengan blok `BEGIN_APPLY_FILES`/`END_APPLY_FILES`.
- Memperbarui `CUMULATIVE-AUDIT-CHAIN.txt` tanpa menghapus sejarah lama.
- Menambahkan `AUDIT-CHAIN-RECONCILIATION-S2549.md` untuk membedakan fakta terverifikasi dari baseline lineage yang belum terbukti.
- Mencatat eksplisit bahwa PASS manifest bawaan S2529 bukan bukti integritas patch ini.

## Verifikasi yang tersedia dari audit patch sebelumnya
- Syntax check file JS/config yang diubah: PASS.
- Tes terarah gabungan sebelumnya: 10/11 PASS; kegagalan tersisa adalah residensi guard pada `app-bundle-b.min.js` yang basi.
- `verify-bundle-freshness`: FAIL untuk `app-bundle-b.min.js`.
- Build minified belum dapat dilakukan pada lingkungan ini karena `esbuild` tidak tersedia.

## Dilarang mengklaim rilis siap
`FILE-HASHES-SHA256.txt` belum di-refresh, karena refresh wajib dilakukan setelah build final berhasil. Jalankan build, refresh hash, lalu tes hash/freshness/lint/full suite/release-check pada lingkungan ber-dependency lengkap.

## Menjalankan patch-integrity yang benar
Dari root `app-main`:

```sh
PATCH_MANIFEST=PATCH-MANIFEST-S2549-A1-B7-CHAIN-FIX.md node scripts/verify-patch-integrity.js
```

Jangan gunakan PASS dari manifest default `PATCH-MANIFEST-S2529.md` sebagai bukti untuk patch S2549.
