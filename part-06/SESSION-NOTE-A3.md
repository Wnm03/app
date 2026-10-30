# Sesi A3 — Badge "Saran Otomatis" di Form Target Dana Darurat (Kalkulator Dana Darurat Otomatis, Kelompok A — SESI TERAKHIR)

## Konteks

Lanjutan langsung dari `SESSION-NOTE-A2.md` (Sesi A2 — field `suggestedAmount`
di `_emergencyFundRisk()`). Tujuan sesi ini sesuai
`LANGKAH-SESI-IMPLEMENTASI.md`: badge/tombol "Saran otomatis" di form Target
Dana Darurat (`modules/finance/tx-target.js` + `styles.css`), menampilkan
hasil A1, klik untuk isi field amount. Ini menutup Kelompok A.

## Perubahan sesi ini

**3 file source disentuh** (patch-only): `modules/finance/tx-target.js`,
`modules/shared/modals.js`, `styles.css`.

- **`modules/finance/tx-target.js`** — 2 fungsi baru:
  - **`renderEmergencyFundSuggestBadge()`** — reuse `suggestEmergencyFundTarget()`
    (A1) **apa adanya**, guard `typeof` + try/catch sama persis pola A2.
    Badge tersembunyi kecuali: checkbox Dana Darurat dicentang **DAN**
    `{ok:true}`. Isi teks badge & `dataset.suggested` diambil langsung dari
    `targetAmount`/`multiplier`/`basedOnMonths` hasil A1.
  - **`applyEmergencyFundSuggestBadge()`** — handler klik badge, isi
    `tAmt.value` dari `dataset.suggested`, toast konfirmasi. No-op kalau
    belum ada `dataset.suggested` (badge belum pernah dirender `ok:true`).
  - Wiring: dipanggil di akhir `openTargetModal()` (hide by default utk mode
    tambah/edit non-Dana-Darurat) dan di kedua ujung `onTargetDanaDaruratToggle()`
    (hide saat unchecked, refresh saat checked).
  - **SENGAJA TIDAK menyentuh** hint lama di `onTargetDanaDaruratToggle()`
    (yang sudah ada sebelum Kelompok A, pakai `FI.annualExpense()/12*6`
    sendiri) — badge baru ini independen & additive, bukan pengganti/refactor
    hint lama. Unifikasi kedua sumber rekomendasi itu (kalau memang
    diinginkan nanti) adalah sesi terpisah, di luar scope "1 sesi 1 target".
  - **0 perubahan** ke `openTargetModal()`/`saveTarget()`/
    `onTargetAccChange()`/`showTargetAccountTx()`/`addTarget()`/`delTarget()`
    selain 2 baris panggilan `renderEmergencyFundSuggestBadge()` di atas.
- **`modules/shared/modals.js`** — 1 blok HTML baru disisipkan di
  `targetModal`, tepat setelah field "Target (Rp)" (`#tAmt`) dan sebelum
  "Akun Terkait": `<div id="tEmergencySuggestBadge">` (hidden by default,
  `data-action="applyEmergencyFundSuggestBadge"`) berisi `<span
  class="badge-text">` (diisi JS) + label "Pakai →". 0 perubahan ke modal
  lain / field lain di `targetModal`.
- **`styles.css`** — 1 baris tambahan: `#tEmergencySuggestBadge:active{
  transform:scale(0.98)}`, reuse token warna yang sudah ada
  (`var(--accent3-soft)`/`var(--accent3)`/`var(--text)`, dipakai inline di
  HTML di atas — sesuai instruksi sesi "reuse token yang ada", tidak
  menambah CSS var baru).

**Test baru**: `tests/emergency-fund-suggest-badge.test.js` (10 test), pola
sama `tests/s692-target-modal-editbyid.test.js` (fake DOM minimal via
`loadSource`, bukan jsdom, karena fungsi yang dites baca/tulis DOM).

## Verifikasi

- Test baru (10 test), cakupan:
  1. Badge tersembunyi kalau checkbox Dana Darurat belum dicentang.
  2. Badge tersembunyi kalau `suggestEmergencyFundTarget` belum dimuat
     (guard `typeof`).
  3. Badge tersembunyi kalau hasilnya `{ok:false}`.
  4. Badge tersembunyi kalau `suggestEmergencyFundTarget()` throw (guard
     try/catch, tidak ikut throw).
  5. Badge tampil & teksnya terisi benar kalau checked + `{ok:true}`.
  6. `applyEmergencyFundSuggestBadge()` mengisi `tAmt` dari
     `dataset.suggested` + toast sukses.
  7. `applyEmergencyFundSuggestBadge()` no-op kalau belum ada
     `dataset.suggested`.
  8. `openTargetModal()` mode tambah — badge tetap tersembunyi (checkbox
     default unchecked, regresi perilaku lama tidak berubah).
  9. `onTargetDanaDaruratToggle()` — badge muncul saat dicentang, hilang
     lagi saat di-uncheck.
  10. Hint lama (`FI.annualExpense()`-based) di `onTargetDanaDaruratToggle()`
      **tetap pakai angka sendiri**, TIDAK ikut berubah oleh angka dari badge
      baru (dites dengan sengaja membuat kedua sumber angka beda jauh, lalu
      pastikan masing-masing tetap independen) — 0 regresi ke logic lama.
- Full suite (`node --test tests/*.test.js`): **6028/6030 pass**. 2 gagal —
  **sama persis 2 kegagalan pre-existing** yang sudah tercatat di
  `SESSION-NOTE-A1.md`/`SESSION-NOTE-A2.md`
  (`verify-release-ready`/`checkBundleFreshness`, terkait `eslint`/bundle
  belum di-build ulang di sandbox ini — **tidak terkait** file yang disentuh
  sesi ini). 0 regresi baru dari 6018/6020 (A2) → 6028/6030 (A3, +10 test
  baru, +2 gagal pre-existing sama seperti sebelumnya).
- `node -c` lolos untuk keempat file yang disentuh (`tx-target.js`,
  `tx-list-cashflow.js`, `financial-risk-dashboard-api.js`, `modals.js`) —
  2 file terakhir itu hasil re-apply patch A1+A2 apa adanya ke
  `app-main-fixed.zip` (base upload sesi ini belum berisi A1/A2), bukan
  perubahan baru sesi ini.
- Build (`node scripts/build.js`) **belum dijalankan** di sesi patch ini
  (network disabled di sandbox) — perlu dijalankan oleh penerima patch
  sebelum merge, sama seperti catatan A1/A2.

## Catatan integrasi patch

Base yang dipakai sesi ini adalah `app-main-fixed.zip` yang diupload —
setelah dicek, base tsb **belum berisi hasil A1/A2** (`suggestEmergencyFundTarget`/
`suggestedAmount` belum ada di dalamnya). Supaya A3 bisa dites & tetap
konsisten dengan tabel akumulasi Kelompok A, patch A1 (`tx-list-cashflow.js`)
dan A2 (`financial-risk-dashboard-api.js`) di-re-apply apa adanya (byte-identik
dengan isi `patch-A1-suggestEmergencyFundTarget.zip`/
`patch-A2-emergencyFundRisk-suggestedAmount.zip` yang sudah diupload
sebelumnya) ke dalam patch ZIP sesi ini, supaya 1 ZIP ini bisa langsung
di-apply ke `app-main-fixed.zip` tanpa perlu urutan apply manual 3 ZIP
terpisah. **0 baris berbeda** di kedua file itu dibanding patch A1/A2
sebelumnya — murni re-bundling, bukan perubahan baru.

## Daftar akumulasi file patch Kelompok A (LENGKAP — sesi terakhir)

| File | Sesi | Status |
|---|---|---|
| `modules/finance/tx-list-cashflow.js` | A1 | `suggestEmergencyFundTarget()` baru (murni, 0 tulis `D`) |
| `tests/emergency-fund-suggest.test.js` | A1 | test baru (7 test) |
| `SESSION-NOTE-A1.md` | A1 | catatan sesi A1 |
| `modules/finance/financial-risk-dashboard-api.js` | A2 | `_emergencyFundRisk()` +field `suggestedAmount` (reuse A1, 0 logic risk berubah) |
| `tests/emergency-fund-risk-suggested-amount.test.js` | A2 | test baru (8 test) |
| `SESSION-NOTE-A2.md` | A2 | catatan sesi A2 |
| `modules/finance/tx-target.js` | A3 | 2 fungsi baru: `renderEmergencyFundSuggestBadge()`/`applyEmergencyFundSuggestBadge()` (reuse A1, 0 logic hint lama berubah) |
| `modules/shared/modals.js` | A3 | 1 blok HTML badge baru di `targetModal` (0 field lain berubah) |
| `styles.css` | A3 | 1 baris `:active` state (reuse token warna yang ada) |
| `tests/emergency-fund-suggest-badge.test.js` | A3 | test baru (10 test) |
| `SESSION-NOTE-A3.md` | A3 | catatan sesi ini |

**Kelompok A — Kalkulator Dana Darurat Otomatis: SELESAI (A1 → A2 → A3).**
Sesi berikutnya yang bisa mulai (independen, lihat
`LANGKAH-SESI-IMPLEMENTASI.md`): **B1** (audit pemetaan AI, murni dokumen —
tidak ada blocker), atau **D1**/**E1**/**E2** (independen, bisa kapan saja).
**C0** (keputusan BUG-INV-001) & **F0** (keputusan proteksi kesehatan) masih
perlu diputuskan N sebelum Kelompok C/F bisa mulai.
