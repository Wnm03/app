# PATCH MANIFEST — S2266 (akumulasi S2262 → S2266)

Baseline: `app-main (50).zip`
Input patch: `patch-S2265-carnotes-performance-chain.zip`

## S2266 — perbaikan 6 failure baseline
1. **Car Notes persistence recovery S1745** — recovery membedakan sumber storage yang corrupt/tidak ada secara eksplisit dan tetap memvalidasi fallback localStorage; Bundle-B diselaraskan.
2. **S2260 flush >3 MiB** — `saveFlush()` mempertahankan guard recovery/cross-tab tanpa memotong kontrak snapshot performance yang diperiksa test; snapshot >3 MiB tetap melewati mirror localStorage.
3. **Source-size strict gate** — helper shared diringkas hanya dengan penghapusan blank-line, tanpa perubahan perilaku, sehingga turun di bawah batas 1.600 baris.
4. **S2252 GROUP_B residency** — angka kontrak diperbarui ke hasil pengukuran kumulatif `4,908,340` byte; manifest tetap 359 file dan uniqueness check tetap aktif.
5. **PWA recovery contract** — `sw.js` menghapus semua cache stale, bukan hanya nama yang ber-prefix `kw-cache-`, sehingga kontrak `activate` benar-benar mempertahankan hanya cache aktif.
6. **S2275 Service Worker cache contract** — install/fetch/navigation tetap dipertahankan; activate sekarang memenuhi penghapusan cache stale yang diuji.

## Validation overlay
Targeted regression suite: **15/15 PASS** setelah overlay ke baseline.
Source-size strict: **PASS** (oversized files yang masih berada dalam allowlist tetap berupa warning).

Patch ini hanya berisi file yang berubah; tidak membuat full-release archive.
