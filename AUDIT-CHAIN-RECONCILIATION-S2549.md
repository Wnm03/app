# Audit rekonsiliasi rantai akumulasi — S2549

## Keputusan identitas

- Nomor sesi akumulasi koreksi ini: **S2549** (lanjutan setelah artefak bernomor S2548).
- Nama lama `S2041` pada patch A1/B7 dipertahankan hanya sebagai provenance patch terdahulu; bukan nomor sesi akumulasi saat ini.
- Baseline yang benar-benar dipakai untuk overlay ini: **`app-main (6).zip`**, sesuai arsip yang tersedia di percakapan. Ini tidak sama dengan baseline yang tertulis pada README S2548 (`app-main__8_`) atau manifest lama lainnya.

## Fakta yang diverifikasi

1. `scripts/verify-patch-integrity.js` membaca manifest bawaan `PATCH-MANIFEST-S2529.md` jika `PATCH_MANIFEST` tidak diatur. Karena itu PASS bawaan tidak membuktikan integritas patch S2549.
2. Manifest S2549 menyediakan blok `BEGIN_APPLY_FILES`/`END_APPLY_FILES`, sehingga pemeriksaan dapat diarahkan secara eksplisit ke manifest patch ini.
3. Rantai historis `CUMULATIVE-AUDIT-CHAIN.txt` yang diwarisi dari baseline berhenti pada artefak sesi lama (S2061/S2061–S2069), sehingga bukan catatan lengkap seluruh sesi sampai S2548.
4. README S2548 mencatat 8.538 tes dan 10 kegagalan terkait bundle; pada baseline/overlay ini, laporan uji yang tersedia mencatat 8.692 tes dan 13 kegagalan pada baseline. Angka-angka ini berasal dari konteks baseline berbeda dan tidak boleh digabung sebagai satu run yang sama.
5. `FILE-HASHES-SHA256.txt` tidak diperbarui dalam patch ini. Instruksi proyek mengharuskan refresh setelah build berhasil; build minified belum dapat diverifikasi karena `esbuild` tidak tersedia di lingkungan ini.

## Baseline lineage — jangan menyimpulkan urutan yang belum terbukti

| Artefak | Baseline yang disebut | Status hubungan |
|---|---|---|
| `PATCH-MANIFEST-S2529.md` | `app-main (14).zip` / v2272 (sesuai audit pengguna) | Tidak ada bukti cukup di artefak ini untuk menghubungkannya secara langsung ke `(6).zip`. |
| `PATCH-MANIFEST-S2537.md` | menyatakan bundle v2273 | Catatan sesi tersedia; ancestry archive belum dibuktikan. |
| `PATCH-README-S2548-FIX-TEST-FAILURES.md` | `app-main__8_` | Berbeda nama dari baseline S2549; ancestry belum dibuktikan. |
| Manifest CI-gate terdahulu | `app-main (3).zip` (sesuai audit pengguna) | Tidak diklaim sebagai leluhur langsung S2549. |
| Patch A1/B7 yang dikoreksi | `app-main (6).zip` | Baseline langsung patch ini; file source/test/config overlay diterapkan terhadap arsip ini. |

## Gerbang yang belum selesai

- `npm run build` / `node scripts/build.js --require-minify`: belum PASS; `esbuild` tidak tersedia.
- `python3 scripts/refresh-file-hashes.py --write`: sengaja belum dijalankan sebelum build akhir.
- `python3 scripts/refresh-file-hashes.py --check` dan tes `S256AU`: perlu dijalankan setelah build dan refresh hash.
- `verify-bundle-freshness`, `npm run lint`, full test suite, dan `release-check`: belum dinyatakan PASS untuk S2549.
- Manifest-manifest lama dan seluruh sesi S2549+ tidak diklaim telah diaudit lengkap. Audit mendalam itu membutuhkan artefak masing-masing; ketiadaan artefak di workspace ini bukan bukti bahwa sesi tidak pernah ada.

## Urutan finalisasi

1. Jalankan build minified di lingkungan dengan dependency `esbuild` yang benar.
2. Jalankan `python3 scripts/refresh-file-hashes.py --write` setelah build berhasil.
3. Jalankan `python3 scripts/refresh-file-hashes.py --check`, tes `tests/s256au-file-hashes-sync.test.js`, pemeriksaan freshness bundle, lint, dan suite penuh.
4. Catat hasil aktual beserta exit code/log; jangan mengubah status menjadi PASS jika tidak dijalankan.
5. Jika build mengubah file yang termasuk daftar apply, perbarui daftar file dan fingerprint manifest S2549 lalu jalankan ulang gerbang integritas.
