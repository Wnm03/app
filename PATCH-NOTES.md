# CONSOLIDATED — v1313 (S582 closeout) → final, seluruh rangkaian S583 digabung jadi 1 patch

Status: **1 patch tunggal**, hasil merge SEMUA patch S583 dari yang tertua
ke terbaru, diterapkan berurutan ke atas snapshot baseline v1313
(`kw_release_v1313_s582-9-preexisting-test-failures-closeout.zip`) di
lingkungan kerja, lalu diverifikasi dgn **regresi penuh** (bukan per-sesi).
Patch ini berisi HANYA hasil akhir tiap file (union seluruh perubahan) —
bukan kumpulan 16 file zip terpisah lagi.

## Urutan penerapan (kronologis, terlama → terbaru)
Ditentukan dari timestamp file di dalam tiap zip (bukan asumsi nama), lalu
diverifikasi isinya saling menyambung (mis. `titipan-reconcile.js` tumbuh
progresif tiap sesi, bukan lompat):

| # | Sumber | Waktu | Isi |
|---|---|---|---|
| 1 | `titipan-reconcile-patch.zip` | 13:15 | `titipan-reconcile.js` v1 (Rec #2 awal) + test |
| 2 | `kw-patch-v1314-...-wiring.zip` | 13:22 | wiring awal, `smoke-test.js`, `build.js` |
| 3 | `kw-patch-v1315-...-investasi-branch.zip` | 13:34 | cabang Investasi di `check()` |
| 4 | `PATCH-v1315-to-v1316-...-sesi4-ownerid-consistency-audit.zip` | 13:53 | `checkOwnerIdConsistency()` |
| 5 | `PATCH-v1316-to-v1317-...-sesi5-debt-name-staleness-audit.zip` | 14:01 | `checkDebtNameStaleness()` |
| 6 | `PATCH-v1317-to-v1317-...-sesi6-titipan-reconcile-checkall.zip` | 14:16 | `checkAll()` agregator |
| 7 | `PATCH-s583-sesi7-...-wire-selftest.zip` | 14:23 | wiring `checkAll()` ke `self-test.js` |
| 8 | `PATCH-s583-sesi8-owner-registry-debts-propagate-fix.zip` | 14:31 | fix propagate `owner-registry.js` |
| 9 | `kw_release_s583-networth-...-audit-docs-only.zip` | 11:37* | audit dokumentasi (0 kode) |
| 10 | `kw_patch_v1313_s584-...-test-lock.zip` | 11:44* | test lock hasil audit #9 |
| 11 | `PATCH-s583-sesi9-owners-save-enforce-reconcile.zip` | 22:15 | Rec #3 enforcement (`warnIfNotOk` di 3 titik `saveOwners()`) |
| 12 | `PATCH-s583-sesi11-buku-utang-sync-readonly-ui.zip` | 22:18 | badge nama basi read-only di Buku Utang |
| 13 | `PATCH-s583-sesi10a-...-single-gate-design.zip` | 23:17 | `titipan-sync.js` (gerbang, belum di-wire) |
| 14 | `PATCH-s583-sesi10b-...-single-gate-wiring.zip` | 23:21 | wiring gerbang ke 5 titik `_syncOwnerDebts()` |
| 15 | *(sesi kerja sebelumnya)* rec3-verify + Rec #5 cross-module invariant | — | fix gap merge sesi 11↔14 + 5 test baru |

\* Sesi 9–10 (audit networth self-portion) independen/paralel dari rantai
`titipan-reconcile`, timestamp lebih awal tapi tidak bertentangan file apa
pun dgn baris 1–8 — urutan taruh di sini murni supaya tabel terbaca 1
alur, bukan klaim urutan sebab-akibat.

## Konflik yang ditemukan & diselesaikan sesi ini
**#11 vs #14** (`sesi9` vs `sesi10b`) menyentuh file yang SAMA
(`modules/asset/aset.js`, `modules/finance/akun.js`) tapi `sesi10b`
ternyata dibangun dari basis SEBELUM `sesi9` — diverifikasi lewat diff
eksplisit kedua file patch. Kalau diterapkan mentah-mentah berurutan
(#11 lalu #14), 4 baris `TitipanReconcile.warnIfNotOk(...)` (Rec #3
enforcement, ditambahkan #11) di 2 dari 3 titik `saveOwners()` HILANG
diam-diam tertimpa `sesi10b`. Baris #15 memulihkannya secara eksplisit
(bukan re-derivasi logic baru) — lihat komentar inline di
`modules/asset/aset.js`/`modules/finance/akun.js` bagian
"S583 sesi-12" utk detail penuh. Ini SATU-SATUNYA konflik nyata yang
ditemukan di antara seluruh rangkaian; sisanya (`titipan-reconcile.js`
tumbuh linear #1→#8, `aset.js`/`akun.js` #14→#15) saling menyambung tanpa
tabrakan.

## File akhir dalam patch ini (union seluruh sesi + rebuild, 27 file)
- `docs/AUDIT-S583-NETWORTH-SELFPORTION-CONSISTENCY.md` — dari #9
- `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md` — akumulasi #2–#6
- `docs/FIX-S584-NETWORTH-SELFPORTION-CONSISTENCY-TEST-LOCK.md` — dari #10
- `modules/asset/aset.js` — akumulasi #14 + #15 (fix konflik di atas)
- `modules/asset/investasi-view.js` — dari #11 (`InvestmentUI.saveOwners()` enforcement)
- `modules/finance/akun.js` — akumulasi #14 + #15
- `modules/finance/piutang-utang.js` — dari #12 (badge nama basi read-only)
- `modules/finance/titipan-reconcile.js` — akumulasi penuh #1→#6 (`check()`,
  `checkOwnerIdConsistency()`, `checkDebtNameStaleness()`, `checkAll()`) + #11 (`warnIfNotOk()`)
- `modules/finance/titipan-sync.js` — dari #13, wiring dipertahankan dari #14
- `modules/shared/owner-registry.js` — dari #8 (propagate fix)
- `modules/shared/smoke-test.js` — dari #2
- `scripts/build.js` — akumulasi #2 + #14 (registrasi `titipan-sync.js` setelah `aset.js`)
- `self-test.js` — dari #7 (wiring `checkAll()`)
- 9 file test (akumulasi seluruh sesi + 1 baru dari #15,
  `s587-cross-module-owner-registry-invariant.test.js`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil rebuild sesi ini (v1314),
  lihat bagian "Rebuild deploy"

## Artefak build/deploy — SEKARANG disertakan (rebuild sudah dijalankan)
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js` — sebelumnya sengaja tidak disertakan
karena rebuild belum dijalankan (perlu akses ke seluruh source tree app,
bukan cuma delta patch). Sesi ini rebuild sudah dijalankan terhadap
source tree penuh; lihat bagian "Rebuild deploy" di atas untuk detail
langkah & hasil verifikasi. Kelima file ini sekarang bagian resmi dari
patch (versi 1314, semua konsisten).

## Regresi penuh — hasil
Dijalankan `node --test tests/*.test.js` di root app hasil merge (v1313 +
seluruh 15 layer di atas):
```
baseline v1313 murni (sebelum patch apa pun): 4071 test, 4071 pass, 0 fail
setelah SEMUA patch S583 digabung                 : 4135 test, 4135 pass, 0 fail
```
**0 gagal, 0 regresi.** +64 test baru (8 file test baru/berubah:
`titipan-reconcile.test.js`, `dana-kelolaan-titipan-representation-invariant-r5.test.js`,
`s561-owner-registry-rename-merge-r4.test.js`, `s584-networth-selfportion-consistency-audit.test.js`,
`s585-titipan-reconcile-saveowners-enforce.test.js`,
`s586-debt-renderlist-stale-name-badge.test.js`, `titipan-sync.test.js`,
`titipan-sync-wiring.test.js`, ditambah `s587-cross-module-owner-registry-invariant.test.js` baru).
`node -c` bersih di seluruh 11 file source yang disentuh.

Catatan soal 6 kegagalan pre-existing yang dicatat PATCH-NOTES sesi-9
(`s551-investment-owners-nominal-readonly.test.js`,
`ctx.InvestmentUI._ownerNominalText is not a function`): **TIDAK muncul**
di regresi gabungan ini — baseline v1313 murni di lingkungan kerja ini pun
sudah 4071/4071 bersih tanpa file itu gagal. Kemungkinan file test
tersebut sudah diretired (ada `docs/FIX-s551-nominal-readonly-test-retire.md`
di baseline v1313) sebelum sesi-9 ditulis, atau environment sesi-9 beda
dari snapshot v1313 yang dipakai sesi ini — di luar cakupan verifikasi
sesi ini utk ditelusuri lebih jauh, tapi tidak berdampak ke hasil regresi
0-gagal di atas.

## 5 rekomendasi awal — status akhir
| # | Rekomendasi | Status |
|---|---|---|
| 1 | Gerbang tunggal `TitipanSync.reconcile()` | Selesai (#13, #14) |
| 2 | Audit konsistensi Dana Titipan (`check()`/`checkAll()`) | Selesai (#1–#6) |
| 3 | Enforcement OwnerRegistry kanonik tiap `saveOwners()` | Selesai (#11), diverifikasi menyeluruh & dipulihkan dari konflik merge (#15) |
| 4 | Utang hasil sync tampil read-only di UI Buku Utang (badge nama basi) | Selesai (#12, `modules/finance/piutang-utang.js`) |
| 5 | Test invarian lintas modul | Selesai (#15, `s587-...test.js`) |

> **Koreksi:** versi PATCH-NOTES sebelumnya salah menandai Rec #4 sebagai
> "N/A by design" — itu tertukar dengan audit self-portion Net Worth (#9,
> independen/paralel, lihat catatan `*` di atas). Rec #4 yang sebenarnya
> adalah badge nama basi read-only di Buku Utang, dan itu sudah dikerjakan
> di #12 (`modules/finance/piutang-utang.js`). Sudah SELESAI, bukan N/A.
> Semua 5 rekomendasi awal kini berstatus selesai.

## Rebuild deploy (dijalankan sesi ini)
Langkah `node scripts/build.js` yang sebelumnya ditandai belum dijalankan
sudah dieksekusi terhadap source tree penuh (`kw_release_v1313_...zip`
+ seluruh file source di atas), lalu diverifikasi:

```
node --test tests/*.test.js        → 4135/4135 pass (pre-build)
node scripts/build.js               → versi baru 1314, sintaks bundle valid
node scripts/verify-bundle-freshness.js → app-bundle-a.min.js & app-bundle-b.min.js segar
node scripts/verify-window-expose.js    → OK, 73 modul data-action ter-window-expose
node --check app-bundle-a.min.js / app-bundle-b.min.js → OK
node --test tests/*.test.js        → 4135/4135 pass (post-build)
```

Log lengkap: `regression-evidence/rebuild-s583-final.log`.

Catatan: esbuild tidak tersedia di lingkungan sandbox ini (tidak ada akses
jaringan), jadi `app-bundle-a.min.js`/`app-bundle-b.min.js` yang disertakan
**belum diminifikasi** — build.js otomatis fallback ke mode tanpa-minify
dan tetap lolos cek sintaks (`node --check`) serta `verify-bundle-freshness.js`.
Aman dipakai, hanya lebih besar ukurannya. Kalau mau versi terminifikasi,
jalankan `npm install --save-dev esbuild` lalu `node scripts/build.js` ulang
di lingkungan dengan akses jaringan — build.js otomatis pakai esbuild kalau
terdeteksi.

File yang ditambahkan ke patch akibat rebuild ini: `app-bundle-a.min.js`,
`app-bundle-b.min.js`, `index.html`, `app_production.html`, `sw.js`
(seluruhnya versi 1314, konsisten — `?v=1314` di HTML, `kw-cache-v1314`
di `sw.js`).
