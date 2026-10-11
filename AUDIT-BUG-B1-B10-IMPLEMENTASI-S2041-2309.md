# Audit Lanjutan Rantai Perbaikan dan Akumulasi — B1–B10 / S2041-2309

Tanggal: 11 Oktober 2026
Baseline: `app-main (18).zip` (build 2295), SHA-256 `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`
Build hasil: `s2041-1-part-sot-hardening-2309` (`?v=2309`, `kw-cache-v2309`)

## Temuan audit rantai 2308 dan tindak lanjut

| # | Temuan | Tindakan |
|---|---|---|
| 1 | Payload 2308: 69 checksum + manifest cocok, APPLY_FILES == isi ZIP, tidak ada file identik baseline | Terverifikasi, tidak perlu perubahan |
| 2 | `verify-patch-integrity.js` default ke `PATCH-MANIFEST-S2529.md` (basi), melaporkan "43 apply files" | Default kini memilih manifest B1-B10 dengan nomor build tertinggi; nama manifest dicetak di output. `PATCH_MANIFEST` tetap bisa menimpa |
| 3 | `FILE-HASHES-SHA256.txt`: 12 dari 110 entri tidak cocok file aktual (sudah basi sejak sebelum patch) | 110 entri dibuat ulang dari file aktual; 0 mismatch |
| 4 | `parseMoneyID('0.500')` -> 500 (awalan 0 dianggap ribuan) | Pemisah tunggal 3 digit dianggap ribuan hanya jika bagian depan tidak diawali `0`; `0.500` -> 0.5, `15.000` -> 15000 tetap. Tes ditambahkan |
| 5 | E2E 2308 dilaporkan diblokir kebijakan browser | Di lingkungan audit ini E2E lulus 11/11 (aplikasi booting normal); blokir sebelumnya murni lingkungan |

## Perubahan runtime
- `pajak-aset-ui-wrappers.js` (`parseMoneyID`), bundle A/B dibangun ulang, versi 2309 sinkron di `index.html`, `app_production.html`, `sw.js`.
- Non-runtime: `scripts/verify-patch-integrity.js`, `tests/bugfix-b5-b8-decimal-id-regression.test.js`, `FILE-HASHES-SHA256.txt`, `docs/*`.

## Bukti
| Pemeriksaan | Hasil |
|---|---|
| Build `node scripts/build.js 2309 --require-minify` | PASS; sintaks bundle & sinkron HTML lolos |
| Full suite (`TEST_FORCE_RERUN=1`) | 8.782 tes: 8.781 pass, 0 fail, 1 skipped |
| Release gate | RELEASE GATE LOLOS (lint, SOT, version/HTML/SW sync, bundle freshness, source-size dalam cap) |
| `verify-patch-integrity` (manifest 2309) | PASS |
| E2E `node e2e/run-e2e.js` | PASS 11/11 (hanya skenario Car Notes/fuel) |

## Batasan
- E2E hanya mencakup skenario Car Notes/fuel; alur investasi/aset/shop/pajak belum diuji UI.
- `assetNilai` dan `modalInvestasi` di `aset.js` memakai `parsePzNum`, tidak diaudit di sini.
- Panggilan `parseMoneyID` dibungkus `typeof ... === 'function'` dengan fallback `parseDecStr`; bila `pajak-aset-ui-wrappers.js` gagal dimuat, `15.000` kembali terbaca 15 secara diam-diam.
- Bukan review baris-per-baris seluruh runtime.
