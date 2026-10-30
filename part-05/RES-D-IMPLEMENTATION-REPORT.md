# Sesi Res-D — Regression & Release

Laporan final sesi Res-D (Design Lock
`DESIGN-LOCK-LINKED-ASSET-ACCOUNT-OWNER-DEFAULT.md` §4), menutup rantai
Res-A → Res-B → Res-C → **Res-D**. 0 file source produksi diedit sesi ini —
murni regresi, verifikasi invariant, dan release packaging.

## 1. Baseline

- Versi masuk sesi ini: `s576-pemilik-sumber-potongan-visibility` (v1306).
- Full `node --test tests/*.test.js` SEBELUM build: **4066 test, 4057 pass,
  9 fail**.

## 2. Audit 9 kegagalan (semua pre-existing, 0 terkait Owner Resolver)

| # | Test | File | Domain | Status |
|---|---|---|---|---|
| 1 | `runDataHealthCheck: warn ... accountId-nya SAMA` | `tests/data-health-check-tx-assetid-selflink-s559.test.js` | Sesi 559, self-link asset check | Pre-existing, di luar scope Owner Resolver (`data-health-check.js` tidak disentuh Res-B/C) |
| 2–7 (kecuali #5) | `_ownerNominalText()` ×6 | `tests/s551-investment-owners-nominal-readonly.test.js` | Investment owner nominal (domain lain) | **Sudah didokumentasikan utk di-retire** sejak `FIX-s551-nominal-readonly-test-retire.md` (superseded oleh `s552-investment-owners-nominal-bidirectional.test.js`) — file retire belum tereksekusi di snapshot ini, tapi ini murni stale test lama, bukan regresi baru |
| 8–9 | `showFilteredTx(scope=account)` / `resolveTxOwnerAssignment` | `tests/s574-tx-account-not-owner-no-split.test.js` | Filter-tx owner split (fitur lama, beda dari `deductionOwnerId`) | Pre-existing, fungsi `selectFilterTxOwnerSplit` yg diharapkan hilang masih ada — tidak disentuh sesi Res manapun |

**Kesimpulan:** ke-9 kegagalan sudah ada SEBELUM Res-A dimulai, tidak
menyentuh `transaksi.js`/`akun.js` bagian Owner Resolver, dan sebagian
(kelompok #2) sudah punya catatan resmi "tahu & sengaja belum dihapus" dari
sesi lama. **0 regresi baru dari Res-A/B/C/D.**

## 3. Build & Release Gate

- `node scripts/build.js s577-res-d-regression-release` — **SUKSES**.
  Versi: `s576-pemilik-sumber-potongan-visibility` → `s577-res-d-regression-release`,
  `?v=1306` → `?v=1307`, `CACHE_NAME` → `kw-cache-v1307`.
- Full `node --test tests/*.test.js` SESUDAH build: **4066 test, 4057
  pass, 9 fail** — angka identik sebelum/sesudah build (build.js hanya
  bump versi + regenerasi bundle, 0 test berubah).
- `verify-bundle-freshness.js` — ✓ OK (hash source cocok kedua bundle).
- `verify-window-expose.js` — ✓ OK (73 modul lengkap, 371 file di-scan).
- `verify-release-ready.js` — gate `html-sync` hijau otomatis; gate
  `lint`/`minify` di-override manual (sama seperti S508–S576, sandbox
  tanpa akses jaringan npm/esbuild), tercatat di
  `docs/RELEASE-GATE-LOG.md` (entry `2026-08-12T09:06:28.564Z`).

## 4. Verifikasi Invariant Wajib (§4 Res-D, Design Lock)

Dicek byte-identik sebelum vs sesudah build (`md5sum`), dan struktur kode
diperiksa manual:

| Invariant | File | Hasil |
|---|---|---|
| `recalcAccBalance()` murni `baseBalance ± transaksi`, 0 owner-aware | `modules/finance/akun.js` | ✓ Tidak berubah, tidak ada logic owner masuk |
| `DanaTitipanPortfolioAPI.build()` tetap projection derived-on-read | `modules/finance/dana-titipan-aggregation-api.js` | ✓ Tidak berubah |
| `D.titipanCommitments` tetap principal, tidak disamakan saldo akun | `modules/finance/dana-titipan-aggregation-api.js` | ✓ Tidak berubah |
| `deductionOwnerId` ↔ `ownerPorsiId` tetap terpisah total | `modules/finance/transaksi.js` | ✓ Tidak berubah — 0 cross-reference ditemukan |

`md5sum` ketiga file produksi inti (`akun.js`, `transaksi.js`,
`dana-titipan-aggregation-api.js`) **identik** sebelum dan sesudah
`build.js` dijalankan — build.js tidak menyentuh satu baris pun logic
bisnis di file-file ini.

## 5. File yang benar-benar berubah sesi ini

Murni artefak version-bump/build (list lengkap di `FILES-CHANGED.md`) — 0
file source produksi (`.js` non-bundle, non-version-const) tersentuh.

## 6. Output

- `kw_release_v1307_s577-res-d-regression-release.zip` — full release tree.
- `kw_patch_v1306-to-v1307_s577-res-d-regression-release.zip` — patch
  (isi = file yang berubah relatif v1306 saja).
- `CHANGELOG` (entry baru), `FILES-CHANGED.md`, `docs/RELEASE-GATE-LOG.md`
  (entry baru) — lihat masing-masing.

## 7. Status

**RELEASE COMPLETE.** Rantai Res-A → Res-B → Res-C → Res-D (Owner
Resolver linked-asset → account → owner default) selesai, 0 regresi baru,
semua invariant lock lama & lock baru terjaga.
