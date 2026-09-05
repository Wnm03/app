# PATCH FINAL (akumulasi) — build 1555 / s740

Basis: `app-main__58_.zip` (snapshot yang kamu upload) + `PATCH-v1550-
financial-risk-zakat.zip` di-apply penuh (langkah wajib README-PATCH
sudah dijalankan: `zakat-reminder.js` masuk GROUP_A) + **6 sesi ringan
housekeeping dokumentasi tambahan sesi ini** — SEMUA perbaikan
sebelumnya tetap utuh, tidak ada yang hilang/ditimpa balik.

**Sudah dijalankan di repo LENGKAP (bukan sandbox terpisah), berkali-
kali sepanjang sesi, hasil akhir:**
- `node --test tests/*.test.js` → **5534/5534 lulus, 0 gagal, 0 regresi**
  (dijalankan ulang setelah tiap perubahan dokumentasi, tetap hijau)
- `node scripts/build.js` → sukses, versi FINAL **s740, build 1555**,
  sintaks kedua bundle lolos `node --check`, **0 warning drift
  `AUDIT_MATRIX.md`** (baseline sudah disinkronkan persis dengan jumlah
  file sungguhan di repo — dicek pakai logic yang sama persis dengan
  `lintDocsBaselineCountDrift()` di `build.js`)

Isi zip ini **HANYA file yang benar-benar berubah** dibanding
`app-main__58_.zip` asli (dicek pakai `diff -rq`, bukan tebakan) — tinggal
timpa ke repo kamu.

## Cara pakai
Timpa semua file di zip ini ke path yang sama persis di repo asli, lalu
jalankan `npm test` sekali lagi untuk verifikasi di lingkungan kamu
sendiri.

## Yang dikerjakan sesi ini (housekeeping, "sesi ringan")

Dari daftar rekomendasi sebelumnya, saya kerjakan yang **tidak butuh
keputusan desain/bisnis baru** (murni housekeeping dokumentasi, 0 risiko
regresi kode) — yang butuh keputusan (Zakat Fitrah, modul finance-
analytics baru, HidupSeimbang card, dst.) SENGAJA belum dikerjakan,
tetap di antrian:

1. **`docs/AUDIT_MATRIX.md` — Coverage Baseline disinkronkan**
   (sebelumnya sudah usang 6 sesi: Tagihan/DanaTitipan/Piutang-Utang/
   Shop-restock/FinancialRisk/Zakat semua belum tercatat di baseline
   count). Angka baru: Total files 1391→**1523**, JavaScript 833→**915**,
   Markdown 508→**558**, Tests 470→**544** (HTML/JSON/CSS/Module
   families tetap). Ditambahkan sebagai paragraf drift baru mengikuti
   pola dokumentasi yang sudah ada di file itu sendiri (histori drift
   sebelumnya TIDAK dihapus, cuma ditambah entri baru) — 0 klaim
   perubahan behavior, murni angka housekeeping.

2. **`AUDIT-DASHBOARD-INSIGHT-COVERAGE.md` — §6 diperbaiki & disatukan
   ke repo.** Temuan: file `AUDIT-DASHBOARD-INSIGHT-COVERAGE.md` yang
   ikut di `PATCH-v1550-financial-risk-zakat.zip` sesi lalu ternyata
   **punya 2 section "## 6. Status per sesi" yang terduplikasi dan
   SALING KONTRADIKSI** — satu versi (tabel) bilang Zakat "✅ Selesai",
   versi satunya (bullet, sisa dari sesi lebih lama yang lupa dihapus)
   masih bilang "⬜ Zakat — masih perlu keputusan ambang". Diperbaiki
   dengan menggabungkan SEMUA info dari kedua versi jadi 1 §6 yang
   konsisten (tidak ada info yang dibuang, cuma dihapus duplikasinya),
   lalu file ini ditaruh permanen di root repo (`AUDIT-DASHBOARD-
   INSIGHT-COVERAGE.md`) supaya tidak lagi jadi lampiran terpisah yang
   gampang divergen dari kondisi repo sungguhan.

## File yang ikut (30, kumulatif — supaya tidak ada fix yang hilang)

### Kode logic (baru, dari sesi-sesi sebelumnya)
- modules/finance/zakat-reminder.js
- modules/finance/piutang-utang-reminder.js
- modules/finance/tagihan-reminder.js
- modules/shop/shop-restock-reminder.js

### Wiring (diubah, dari sesi-sesi sebelumnya)
- modules/cross/life-dashboard-summary-api.js
- modules/cross/priority-engine.js
- scripts/build.js — 1 baris ditambahkan ke GROUP_A:
  `'modules/finance/zakat-reminder.js',` setelah
  `'modules/finance/pajak-pbb-zakat.js',`

### Bump versi build only (0 perubahan logic)
- modules/shared/modules-render.js
- modules/shared/modals.js
- modules/shared/modules-calc.js
- modules/shared/features-helpers-global-security.js
- chat-action-handlers.js

### Style
- styles.css

### Test (8 file, dari sesi-sesi sebelumnya)
- tests/zakat-reminder.test.js
- tests/zakat-wiring.test.js
- tests/financial-risk-wiring.test.js
- tests/piutang-utang-reminder.test.js
- tests/piutang-utang-reminder-wiring.test.js
- tests/tagihan-reminder.test.js
- tests/tagihan-danatitipan-wiring.test.js
- tests/shop-restock-reminder.test.js

### Dokumentasi housekeeping (BARU sesi ini)
- docs/AUDIT_MATRIX.md — Coverage Baseline disinkronkan (lihat §1 atas)
- AUDIT-DASHBOARD-INSIGHT-COVERAGE.md — §6 diperbaiki, ditaruh di root
  repo (file baru di posisi ini)

### Hasil build (regenerated, JANGAN diedit manual)
- app-bundle-a.min.js
- app-bundle-b.min.js
- app_production.html
- index.html
- sw.js
- docs/FILE-MAP.md
- docs/COVERAGE-PER-MODULE.md

## Masih di antrian (butuh keputusan, SENGAJA belum dikerjakan)

1. **Zakat Fitrah** — perlu keputusan ambang due-date tahunan (kapan
   trigger, biasanya musiman Ramadan); belum ada state apa pun untuk
   itu.
2. **1 modul finance-analytics per sesi** (`DebtOptimizerAPI`,
   `FinancialGoalAPI`, dst.) — dipilih berdasar relevansi, 1 per sesi
   sesuai pola RULE #1 proyek ini.
3. **`HidupSeimbang` sebagai 1 summary card** — beda bentuk tampilan
   dari reminder list, perlu keputusan desain UI.
4. **Pasang esbuild** kalau environment kamu punya akses npm registry —
   bundle saat ini TIDAK diminify (esbuild tidak terdeteksi di sandbox
   ini): `npm install --save-dev esbuild` lalu build ulang, otomatis
   kepakai.
5. **42 catch block kosong total** terdeteksi lint `build.js` (warning,
   bukan error, TIDAK terkait sesi ini — sudah ada sejak sebelumnya).
   Kalau mau dibereskan, ini juga kandidat "sesi ringan" berikutnya:
   tambahkan komentar alasan sengaja-kosong ATAU `console.warn` minimal
   di tiap catch block yang ditemukan, 1 per 1 supaya gampang di-review.
6. **4 file source lewat ambang 1600 baris** (`build.js`,
   `modules-render.js` x2, `aset-owners.js`) — kandidat dipecah, atau
   masukkan ke `OVERSIZED_FILE_ALLOWLIST` kalau memang sengaja besar.
