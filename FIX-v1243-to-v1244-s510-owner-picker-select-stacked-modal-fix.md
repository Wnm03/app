# FIX v1243 → v1244 — S510: Dropdown "Pilih Pemilik" Tidak Bisa Dipilih (Modal Tumpukan)

## Baseline & Final Version
- Baseline: FULL RELEASE v1243 (`s509c-asset-vehicle-view-action`)
- Final: v1244 (`s510-owner-picker-select-stacked-modal-fix`)
- Baseline regression: 3342/3342 PASS
- Final regression: 3346/3346 PASS (3342 baseline + 4 test baru; 0 test lama
  diubah, 0 test dihapus)

## Laporan Bug (dari screenshot user)
Buka Aset (Kendaraan) → ⚖️ Atur Porsi Kepemilikan → ➕ Tambah Pemilik →
tap dropdown "Pilih pemilik" (native `<select>`, opsi "kamera" tersedia dari
`OwnerRegistry`). Opsi termuat & terlihat, tapi tap di opsi "kamera" tidak
pernah membuat radio-nya berpindah — dropdown tetap di "— Pilih pemilik —".

## Root Cause
`assetOwnersModal` dibuka lewat `Aset.openOwnersModal()` DARI DALAM
`assetModal` yang masih terbuka (bukan lewat `showPage()` pindah tab) —
artinya dua `.overlay.open` bertumpuk sekaligus. `.modal` (styles.css)
dianimasikan pakai `animation: slideUp` yang memakai CSS `transform`
(`translateY`). Pada sejumlah WebView Android (termasuk WebView yang dipakai
Brave di screenshot user), membuka modal KEDUA yang juga dianimasikan pakai
`transform` SEBELUM compositing layer milik modal PERTAMA sempat
didemosikan menghasilkan popup native `<select>` yang salah hitung
koordinat opsinya — opsi termuat & terlihat, tapi tap di opsi manapun
SELAIN opsi yang sedang aktif tidak terdaftar. Ini kategori bug yang sama
persis dengan yang sudah pernah ditangani di proyek ini sebelumnya (lihat
komentar "opacity-stuck-0" di `openModal()`) — animasi CSS + WebView Android
yang tidak selalu 1:1 dengan spesifikasi.

`_ownerNameFieldHtml()`/`onOwnerSelectChange()` di `modules/asset/aset.js`
sendiri SUDAH BENAR (diverifikasi lewat pembacaan kode & test existing) —
bug murni di lapisan rendering/animasi CSS, bukan logic JS pemilihan owner.

## Perbaikan
`openModal()` (`modules/shared/modal-navigasi.js`) sekarang mengecek APAKAH
sudah ada `.overlay.open` LAIN SEBELUM modal baru ditandai `.open` — kalau
ya (kasus tumpukan, mis. `assetOwnersModal` dari dalam `assetModal`),
`.modal` di dalam overlay yang baru dibuka ditandai class `.no-anim`
(`styles.css`: `.modal.no-anim { animation:none; transform:none; }`), yang
melewati animasi `slideUp`/`transform` sepenuhnya untuk modal tersebut —
modal langsung tampil di posisi akhir tanpa menambah compositing layer baru
yang jadi pemicu bug. Modal yang dibuka SENDIRIAN (tidak ada modal lain
yang masih terbuka) TIDAK terpengaruh sama sekali — animasi slideUp normal
tetap berjalan seperti sebelumnya, 0 perubahan visual untuk kasus modal
tunggal.

```diff
+ const _stacked=!!document.querySelector('.overlay.open');
+ const _modalInner=(typeof el.querySelector==='function')?el.querySelector('.modal'):null;
+ if(_modalInner)_modalInner.classList.toggle('no-anim',_stacked);
  el.classList.remove('closing');
  el.classList.add('open');
```

```diff
  .modal { ... animation: slideUp var(--dur-slow) var(--ease-emphasized); }
  @keyframes slideUp { from { transform: translateY(40px); opacity:.4; } to { transform: translateY(0); opacity:1; } }
+ .modal.no-anim { animation: none; transform: none; }
```

Guard `typeof el.querySelector==='function'` ditambahkan supaya konsisten
dengan pola guard defensif yang sudah dipakai di seluruh file ini (mock
lama di beberapa test tidak menyediakan `querySelector` pada elemen modal
palsu — lihat `tests/scan-ocr-epoch-guard.test.js`, tetap lolos tanpa
perubahan pada test itu sendiri).

## Implementation
- `styles.css` — 1 rule baru `.modal.no-anim` (+ komentar penjelasan).
- `modules/shared/modal-navigasi.js` — `openModal()`: 3 baris logic baru
  tepat sebelum `el.classList.add('open')` (deteksi tumpukan + toggle
  class), 0 fungsi baru, 0 perubahan pada bagian lain fungsi ini
  (self-heal ScannerSession, reflow paksa `offsetWidth`, epoch counter,
  `_syncNavVisibilityForModals()` — semua UNCHANGED).
- `tests/openmodal-stacked-no-anim-s510.test.js` — test baru (4), fokus ke
  `openModal()`: (1) modal tunggal TIDAK dapat `.no-anim`, (2) modal
  tumpukan (kasus persis `assetOwnersModal` di atas `assetModal`) DAPAT
  `.no-anim`, (3) guard aman kalau `.modal` child tidak ditemukan, (4)
  guard aman kalau `el.querySelector` bukan fungsi (kompatibel dgn mock
  lama di test lain).

## Tests
- Test baru: `tests/openmodal-stacked-no-anim-s510.test.js` — 4/4 PASS
- Full regression: 3346/3346 PASS

## Regression
- Baseline v1243: 3342/3342 PASS
- Setelah S510: 3346/3346 PASS (3342 + 4 baru, 0 lama diubah/dihapus)

## Guardrail
```
modules/asset/aset.js ................. UNCHANGED (logic owner-picker
                                          sudah benar, bug murni di layer
                                          animasi CSS/modal)
OwnerRegistry .......................... UNCHANGED
MultiOwnerEngine ....................... UNCHANGED
_ownerNameFieldHtml()/onOwnerSelectChange() ... UNCHANGED
```
Diverifikasi lewat `diff -rq` baseline v1243 vs hasil final: hanya
`styles.css`, `modules/shared/modal-navigasi.js` (logic), dan
`tests/openmodal-stacked-no-anim-s510.test.js` (test baru) yang berubah
secara SENGAJA, di luar file build standar (`app-bundle-*.min.js`,
`index.html`, `app_production.html`, `sw.js`, 4 file konstanta versi lain,
`FILE-MAP.md`, `COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md`).

## Browser verification
NOT RUN — browser tidak tersedia di environment sesi ini. Fix ini menutup
mekanisme yang paling konsisten dengan gejala di screenshot user (opsi
dropdown termuat tapi tidak bisa dipilih, khusus saat modal dibuka
bertumpuk) dan sejalan dengan histori bug WebView-animasi sejenis di
proyek ini — tapi tetap **direkomendasikan verifikasi manual di HP Android
yang sama** (tap "kamera" di dropdown "Pilih pemilik" setelah tap "➕
Tambah Pemilik" di dalam ⚖️ Atur Porsi Kepemilikan) sebelum dianggap
selesai sepenuhnya, sama seperti catatan serupa di FIX S509b/S509c.

## Release Gate
`node scripts/verify-release-ready.js` LOLOS dengan 2 override manual
(lint & minify tidak tersedia di sandbox tanpa akses jaringan — eslint dan
esbuild tidak terpasang), dicatat via `CONFIRM_LINT_UNAVAILABLE_REASON` &
`CONFIRM_UNMINIFIED_REASON`. GATE html-sync: LOLOS tanpa override.
`verify-bundle-freshness.js` & `verify-window-expose.js`: LOLOS.
