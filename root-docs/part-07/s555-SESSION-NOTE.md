# SESI 555 — Perbaikan 3 Temuan Tes Otomatis (Tes Buka/Tutup Modal & Tes Modal)

Sesi ini murni memperbaiki 3 hal yang dilaporkan oleh dua widget diagnostik
internal ("🪟 Tes Buka/Tutup Modal" & "🧮 Jalankan Tes") sendiri — 0 fitur
baru, 0 perubahan perilaku aplikasi untuk pengguna. Semua perbaikan ada di
**self-test.js** (harness diagnostik, bukan kode aplikasi).

## 1. `openTxLinkedServisModal` — "elemen #txLinkedServisModal tidak ditemukan (tebakan id salah?)"

**Root cause:** `computeModalSweepFnNames()` otomatis menangkap semua
fungsi global berpola `open*Modal()` lalu MENEBAK id modalnya dari nama
fungsi (`openXModal` → `#xModal`). `openTxLinkedServisModal()`
(`modules/finance/tx-servis.js`) memang cocok pola nama itu, tapi
fungsinya bukan pembuka modal sendiri — ia jembatan `txEditId` →
`servisLinkId` yang JUSTRU menutup `txModal` lalu reuse
`Servis.openModal()` (id sebenarnya: `#servisModal`, yang SUDAH terdaftar
benar di `MODULE_METHOD_MODAL_SPECS`). Tebakan otomatis "txLinkedServisModal"
karena itu selalu salah.

**Fix:** tambah `MODAL_SWEEP_MANUAL_OVERRIDE_FNS` (Set berisi
`'openTxLinkedServisModal'`) yang dikecualikan dari
`computeModalSweepFnNames()`, lalu daftarkan manual di
`RISKY_OPENER_SPECS` dengan id yang benar (`servisModal`) + `before`/`after`
yang menyiapkan transaksi & catatan servis dummy bertaut (`txEditId` →
`servisLinkId`) supaya sweep memanggil fungsi persis seperti alur asli UI,
lalu membersihkan diri (0 mutasi data permanen).

## 2. `titipanExpenseModal` — "1 modal ada di halaman tapi belum masuk sweep manapun"

**Root cause:** modal `#titipanExpenseModal` ("💸 Pengeluaran Dana
Titipan", dibuat S521-B1) dibuka lewat `TitipanExpenseUI.open()` tapi
belum pernah didaftarkan ke `MODULE_METHOD_MODAL_SPECS` — murni
ketinggalan didaftarkan saat fitur itu dibuat, pola sama dengan gap-gap
serupa yang sudah diperbaiki sesi-sesi sebelumnya (`assetOwnersModal`,
`investmentOwnersModal`, `titipanCommitmentModal`, dst).

**Fix:** tambah entry `{label:'TitipanExpenseUI.open()',
id:'titipanExpenseModal', call:()=>{ TitipanExpenseUI.open(); }}` di
`MODULE_METHOD_MODAL_SPECS`, persis pola tetangganya
(`DanaTitipanCommitmentUI.open()`/`DanaTitipanReturnUI.open()`) — 0
before/after karena `open()` sendiri sudah aman dipanggil tanpa data
(toast peringatan kalau modul terkait belum termuat, atau render list
owner kosong).

## 3. "Buku Aset: totalAssetValue() & Kekayaan Bersih konsisten" — `dapat 27328191 vs ekspektasi 27328191.083606`

**Root cause:** BUKAN bug di `renderBersih()`/`currentNetWorth()` — rumus
kode sudah 100% benar & konsisten. Bug ada di test itu sendiri:
`netEl.textContent` dihasilkan lewat `fmtFullSigned()` yang
`Math.round()`-kan nilainya (nominal rupiah tidak pernah pecahan),
sedangkan `expected` di test dihitung ulang langsung dari
`totalAssetValue()`/`Investment.selfOwnedTotalValue()`/dst TANPA
pembulatan. Begitu ada holding investasi dengan harga/unit pecahan (mis.
NAV reksadana), `expected` jadi angka berpecahan sementara hasil tampilan
sudah dibulatkan — perbandingan `===` jadi selalu gagal walau rumusnya
identik (mirip persis kasus S482 yang sudah pernah diperbaiki untuk baris
`totalAsetExpected` di atasnya).

**Fix:** bungkus `expected` dengan `Math.round(...)` sebelum
dibandingkan ke `parsePzNum(netEl.textContent)`, supaya kedua sisi
perbandingan setara (apples-to-apples) dengan apa yang benar-benar
dirender ke layar.

## Status
- `node --test tests/*.test.js`: **3924/3932 PASS** — identik dengan
  baseline sebelum sesi ini (8 kegagalan pre-existing & tidak berubah,
  lihat `not ok 68/69/112/600/603/608/610/691` — semuanya sudah gagal di
  ZIP sebelum sesi ini juga, tidak disebabkan atau diperbaiki oleh sesi
  ini, di luar cakupan 3 temuan di atas).
- `node scripts/build.js s555-modal-sweep-datahealth-fixes` dijalankan:
  versi `s554-investment-owners-nominal-readonly` →
  `s555-modal-sweep-datahealth-fixes`, `?v=` **1286 → 1287**,
  `CACHE_NAME` → `kw-cache-v1287`. `app_production.html` disinkronkan
  ulang dari `index.html`.
- 4 file source (`modules/shared/modules-render.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`) ditemukan sudah menyimpang versi ("s554"
  yang beda label dari `features-helpers-global-security.js") SEBELUM
  sesi ini dimulai — disamakan manual ke `s555-modal-sweep-datahealth-fixes`
  supaya `bumpVersionEverywhere()` bisa lolos verifikasi sinkronisasi.
  Ini murni housekeeping versi, bukan perubahan logic.
- Bundle unminified (esbuild tidak tersedia di sandbox) — sintaks lolos
  `node --check`, 100% valid dipakai.

## Apa yang berubah
- `self-test.js` — 3 perbaikan di atas (murni harness diagnostik).
- Sisanya (`app-bundle-a/b.min.js`, `app_production.html`, `index.html`,
  `sw.js`, `modules/shared/modules-render.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`) — HANYA hasil `scripts/build.js`
  (version-bump + regenerasi bundle + regenerasi dokumentasi
  auto-generated), 0 logic tambahan masuk lewat proses build.

## Cara pakai patch ini
Timpa file-file di atas ke lokasi yang sama di deployment v1286 kamu.
Upload SEMUA file yang berubah (bukan cuma HTML/sw.js) — bundle
(`app-bundle-a.min.js`/`app-bundle-b.min.js`) WAJIB ikut ter-upload
karena itu yang sebenarnya dijalankan browser.
