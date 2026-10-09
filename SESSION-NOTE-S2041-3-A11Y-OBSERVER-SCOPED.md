# S2041.3 — Observer a11y: sapuan dibatasi ke induk elemen baru (akumulatif di atas S2041.2)

Baseline: app-main (9) = v2279. ZIP ini AKUMULATIF: S2041.2 (loop `part-crud-s2041`) + S2041.3 (ini). Hasil build: v2281. Delta-only terhadap baseline.

## Masalah
`modules/shared/a11y-action-controls.js` memasang `MutationObserver` di `document.body` (childList+subtree). Tiap record, termasuk perubahan teks saja (`textContent=` menambah text node) dan penghapusan saja, menjalankan ulang `querySelectorAll` ke SELURUH dokumen (selector native-pressed ±1,5k karakter, ±20 ms @4x CPU per sapuan).

## Perubahan
- `a11y-action-controls.js`: callback observer sekarang (1) mengabaikan record tanpa elemen yang ditambahkan (teks-saja / hapus-saja tidak bisa melahirkan kontrol baru), (2) mengumpulkan `record.target` (induk) saja, dibuang bila sudah terlepas dari DOM dan di-dedupe bila bersarang, (3) menyapu hanya induk itu untuk enhance / pressed / native-pressed. Induk dipakai (bukan node baru) agar tombol/chip yang baru ditambahkan tetap cocok (querySelectorAll tidak menyertakan root-nya sendiri). Hook tanpa argumen (`_a11yWorthItTabsSync`, `_a11yExpandedTogglesSync`) tetap jalan sekali per frame (hanya `getElementById`, murah). Sapuan awal `document` saat install TIDAK berubah.
- Tes baru: `tests/s2041-3-a11y-observer-scoped-sweep.test.js` (4 tes; 3 gagal di source lama).
- Tes kontrak diperbarui: `tests/s256ah-pressed-state.test.js` (menghitung literal `_a11yPressedSyncAll(document)` = 2 -> kini 1 install + 1 `(r)`; intinya sama: sapuan penuh hanya saat install).
- Build resmi `node scripts/build.js --require-minify`: 2280 -> 2281 (stempel versi di HTML, sw.js CACHE_NAME, 5 file source, FILE-MAP.md, COVERAGE-PER-MODULE.md, kedua bundle).

## Temuan: tidak perlu diubah
- `smoke-test.js` SUDAH dibatasi mode dev (`?dev=1`, `kw_dev`, `file:`, localhost/127.0.0.1); di GitHub Pages langsung return. Biaya ±340 ms di audit adalah artefak uji di localhost.
- `self-test.js` + case registry sudah lazy-load (S2261), jalan 2,5 dtk setelah boot, dan hanya SEKALI per build per perangkat (`kw_selftest_build`). Tidak diubah (biaya satu kali per update; menunda lagi berisiko mengubah kontrak jadwal 2.5 dtk).

## Verifikasi (Chromium, CPU 4x, tanpa service worker)
- 40 mutasi kecil (teks + tambah/hapus span), satu per frame: sebelum 2 long task / 152 ms; sesudah 0 long task / 0 ms. Sapuan penuh dokumen oleh selector besar: dari 41 -> 0 (40 sapuan tersisa kini hanya pada induk kecil).
- Fungsi: `.chip[data-action]` yang ditambahkan dinamis tetap mendapat `role=button` + `tabindex=0`. 0 error halaman. Navigasi 4 halaman tanpa long task.
- Idle: tidak ada loop (mutasi childList berulang = 0; yang tersisa hanya atribut tab/role saat boot lambat di 4x, identik dengan sebelum).
- Gate: `verify-bundle-freshness`, `verify-window-expose`, `audit-lazy-boundaries` (99/99), `performance-budget`: PASS. Suite penuh: lihat bagian bawah.

## Belum dikerjakan
- 7 tes gagal pra-eksisting (`perf-navigation-v1825` x6, `s2462-finance-stale-write-and-input-guards` x1), sama di baseline asli.
- Dari audit browser: 1 request 404 saat cold start belum diidentifikasi; 102 temuan smoke-test (ID/`data-action`) belum diverifikasi apakah tombolnya benar-benar diam; ukuran transfer terkompresi bundle; durasi tulis IndexedDB; scroll FPS di HP fisik.

## Deploy
Upload ULANG semua file di ZIP (bundle A & B, kedua HTML, sw.js). ZIP ini menggantikan PATCH-S2041-2 (sudah termasuk isinya).

## Suite penuh (v2281)
`node --test tests/*.test.js`: 8.718 tes, 8.710 lulus, 7 gagal. Ketujuhnya sama dengan baseline (perf-navigation-v1825 x6, s2462-finance-stale-write-and-input-guards x1); tidak terkait patch ini.
