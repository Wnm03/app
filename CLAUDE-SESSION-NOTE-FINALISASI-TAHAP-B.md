# Finalisasi — Fitur Asset (Tahap B, lanjutan dari ZIP bugfix Tahap A)

## Audit singkat
Source of truth = `keluarga-w-aset-bugfix-patch.zip` (hasil Tahap A) diterapkan
di atas base v307. Sebelum finalisasi, repo sudah di 1551/1551 PASS. Audit
finalisasi mencakup: build produksi, integrasi Asset (registry/dispatcher),
routing halaman, parity modal, konsistensi bundle, dan tampilan UI.

## Verifikasi yang dilakukan
1. **Build produksi** (`node scripts/build.js`) — lolos semua lint bawaan
   (u-dnone mismatch, escapeHtml, OCR chicken-egg guard), versi disinkronkan
   ke semua file source + bundle, `index.html`/`app_production.html`
   dikonfirmasi identik.
2. **Registry** — `dash-card-registry.test.js` (invariant DASH_CARD_DEFS ==
   DASH_RENDER_ORDER) tetap hijau; entry Aset (`aset-buku`, `aset-alokasi`,
   `aset-emas`) di `dashboard-hub-registry.js` utuh.
3. **Modal** — `modal-html-parity.test.js` (index MODAL_HTML[] harus sama
   panjang & urutan dgn `document.write(MODAL_HTML[i])`) tetap hijau; markup
   `assetModal` di `modals.js` dicek manual, field ID-nya (assetName,
   assetJenis, assetModalInvestasi, assetHargaBeli, assetJumlahUnit,
   assetAccId, assetZakatableBtn, dst) cocok 1:1 dgn yang direferensikan
   `aset.js`.
4. **Routing** — halaman `page-aset` ada di `index.html`, terdaftar sbg
   halaman tunggal (`page:'aset'`, tanpa tab) di `dashboard-hub-registry.js`.
5. **Bundle** — `app-bundle-a.min.js`/`app-bundle-b.min.js` di-generate ulang
   via `npm run build`, dikonfirmasi mengandung fix terbaru (`grep` baris
   `renderList()` yg sudah termasuk `PajakAset.renderList()`).
6. **UI** — 5 kartu dashboard Aset (`assetDashboard`, `assetInvestasiDashboard`,
   `assetPenyusutanDashboard`, `assetPajakDashboard`, `laporanAsetCard`) &
   window-registration (`Object.assign(window,{...})`) dikonfirmasi utuh.

## Bug ditemukan & diperbaiki
### `Aset.renderList()` — cabang list KOSONG melewatkan `PajakAset.renderList()`
Saat aset TERAKHIR dihapus (list jadi kosong), `Aset.renderList()` masuk ke
cabang early-return yang memanggil `renderDashboard()`, `renderInvestasi()`,
`Penyusutan.renderList()`, `LaporanAset.renderList()` — TAPI TIDAK memanggil
`PajakAset.renderList()` (padahal cabang non-kosong memanggil kelimanya).
Akibatnya kartu 🧾 Pajak Aset (estimasi PBB & Zakat Maal) tetap menampilkan
angka dari aset yang SUDAH DIHAPUS, tidak ikut disembunyikan seperti 4 kartu
lain — persis pola bug "kartu tidak ikut sinkron" yang sudah pernah terjadi
sebelumnya di app ini (lihat komentar `BUGFIX-INTEGRASI` di `aset.js`).

**Fix**: tambahkan `PajakAset.renderList();` di cabang empty-state
`Aset.renderList()`, urutannya disamakan dgn cabang non-kosong.

**Test baru**: `tests/aset.test.js` — "Aset.renderList — list KOSONG (hapus
aset terakhir) TETAP memicu PajakAset.renderList()..." — dikonfirmasi
menangkap regresi ini (fail 1 test kalau fix di-revert, balik ke 0 fail
setelah fix diterapkan).

## Yang TIDAK diubah
Tidak ada fitur baru, tidak ada refactor. Semua perubahan lain (bump versi
`APP_BUILD_VERSION` dkk, regenerasi bundle, `docs/FILE-MAP.md`) adalah hasil
otomatis `npm run build`.

## Hasil regression test
`node --test tests/*.test.js` → **1552/1552 PASS, 0 FAIL**.
