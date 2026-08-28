# Sesi Normalisasi hitungKas (T4+, sebagian) + Audit Final P1 + Rekonstruksi Baseline s661

Sesi ini dikerjakan ULANG dari nol karena sesi sebelumnya kena limit sebelum
sempat menulis audit final/session note/zip patch. Baseline s661 (T1+T2+T3+P1+P2)
tidak lagi tersedia sbg working tree, jadi direkonstruksi dari 6 zip patch yang
sudah diupload sebelumnya + base `app-main` (s659).

## Bagian 1 — Rekonstruksi baseline s661

Merge berurutan sesuai `RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md`:
base (s659, 4752 test) → T1 (4756) → T2 (4762) → **Audit Final P1** (lihat
`AUDIT-FINAL-P1-cash-projection-vs-proyeksi-kas.md`) → T3 (4781) → P2 (4788).
Setiap tahap dijalankan `node --test tests/*.test.js` sebelum lanjut ke tahap
berikutnya — 0 regresi di tiap titik.

**Audit Final P1** (bagian terpenting yang belum sempat ditulis sesi lalu):
dua kandidat zip P1 (`p1-cash-projection` vs `p1-proyeksi-kas`) diuji
`isGajiTransaction()`-nya terhadap 1128 transaksi asli
`backup-keluarga-W-2026-08-27-fixed.json`. Hasil: `p1-cash-projection` cuma
mendeteksi 8/84 transaksi gaji riil (meleset 90%) karena tidak mengecek
`subcategory`; `p1-proyeksi-kas` tepat 84/84. **`p1-proyeksi-kas` dipilih.**
Konflik skema field dgn kartu P2 (yang ditulis melawan skema
`p1-cash-projection`) diresolusi dgn menambah field alias di
`cash-projection.js` (0 logika baru, cuma nama field dobel) — detail lengkap
di dokumen audit terpisah.

Isu build minor yang diperbaiki saat rekonstruksi: `MODULE_RENDER_VERSION` di
`modules/shared/modules-render.js` sempat tidak sinkron (`bumpVersionEverywhere()`
tidak mendeteksi nilai lama yg sudah menyimpang) — diperbaiki manual, build
lolos setelahnya.

Baseline s661 final: **4788/4788 test pass, 0 fail.**

## Bagian 2 — Normalisasi hitungKas (Sesi T4+, cakupan modules-calc.js + feature-insights.js)

**Status: implementasi + test selesai, build & full test suite lolos
(4799/4799 pass, 0 fail).**

### Yang dikerjakan

**5 titik `modules/shared/modules-calc.js`** — semua ditambah guard
`t.hitungKas!==false`:
- `FI.annualExpense()`
- `FI.monthlySurplus()`
- `SalaryAllocation.avgMonthlyIncome()`
- `DanaDaruratAI.computeRecommendation()` (loop CV volatilitas income bulanan)
- `FinCoach.compute()` fallback `txM` — ini fix inti bug `FinCoach.showAll()`
  vs Dashboard yang bisa beda angka kalau salah satu jalur lupa filter

**2 titik `modules/ai/feature-insights.js`**:
- `KeuanganInsight.compute()` fallback `txM`
- Cek anggaran (%) di dalam `compute()` — baca `D.transactions` LANGSUNG
  (bukan lewat `txM`), jadi butuh guard terpisah dari titik di atas

Guardrail yang diverifikasi: `ctx.txM` di seluruh rantai
`FinCoach→KeuanganInsight` **hanya** dipakai untuk agregasi kas (turunan
inc/exp/anggaran), tidak pernah untuk riwayat/tampilan transaksi. Aman
difilter di titik konstruksi. Pola guard konsisten: filter di titik
`D.transactions.filter(...)` awal (bukan dipisah belakangan ke inc/exp
masing-masing) supaya 1 titik guard menjamin semua turunan di bawahnya bersih.

### Test regresi baru

`tests/hitungkas-normalisasi-financial-calc.test.js` — **11 test**, dijalankan
lewat `loadSource()` (muat `budget.js` + `modules-calc.js` [+ `feature-insights.js`
utk 4 test terakhir] bareng dalam 1 sandbox).

**Verifikasi red/green** (revert sementara ke-7 guard, jalankan test, restore):
- 7 test "positif" (menguji guard aktif mengecualikan `hitungKas:false`) — **red**
  tanpa fix, **green** dgn fix.
- 4 test backward-compat (transaksi TANPA field `hitungKas` tetap kehitung
  penuh, 0 migrasi data) — **green di kedua kondisi** (sesuai ekspektasi,
  karena defaultnya memang `!==false`).

**2 false-positive ditemukan & diperbaiki selama verifikasi ini** (dicatat
eksplisit di komentar test, bukan cuma di sini):
1. Test awal `FinCoach.compute()` fallback (skenario "tidak ada sinyal
   defisit") ternyata **selalu lolos apapun isinya** kalau `KeuanganInsight`
   tidak dimuat bareng `modules-calc.js` — karena sinyal `'defisit'` SEKARANG
   satu-satunya sumbernya `KeuanganInsight.compute()` (dipanggil dari dalam
   `FinCoach.compute()`, dibungkus `typeof`-guard yg diam-diam skip kalau
   modul itu undefined). Diperbaiki dengan memuat `feature-insights.js` bareng
   di test itu (`loadInsights()`, bukan `loadCalc()`).
2. Nominal test surplus awalnya simetris income/expense (mis. 500rb vs
   500rb) — kalau begitu, bug guard yang cuma kena salah satu sisi (mis. cuma
   `exp` lupa difilter) bisa menghasilkan hasil akhir yang kebetulan tetap
   sama dgn versi ter-guard penuh (false-negative, test tidak akan
   mendeteksi bug separuh-jalan). Diperbaiki dgn nominal sengaja tidak
   simetris di semua test yang melibatkan inc & exp bersamaan.

### File yang berubah (isi zip sesi ini)

- `modules/shared/modules-calc.js` (5 titik guard + bump `MODULE_CALC_VERSION`)
- `modules/ai/feature-insights.js` (2 titik guard)
- `modules/finance/cash-projection.js` (dari Audit Final P1 — `proyeksi-kas`
  + field alias kompat P2)
- `scripts/build.js` (daftar `cash-projection.js` di `GROUP_B`, dari P1)
- `modules/shared/modules-render.js` (kartu Proyeksi Kas P2, wiring
  `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`, dari P2 + fix versi konstanta)
- `app_production.html`, `index.html` (markup kartu P2 + versi ter-bump)
- `tests/hitungkas-normalisasi-financial-calc.test.js` (baru, 11 test)
- `tests/cash-projection-p1.test.js`, `tests/cash-projection-card-s-p2.test.js`,
  `tests/dashboard-hub-settings.test.js` (update), + test T1/T2/T3 — semua
  bagian rekonstruksi baseline s661
- `AUDIT-FINAL-P1-cash-projection-vs-proyeksi-kas.md` (baru)
- `SESI-NORMALISASI-HITUNGKAS-DAN-AUDIT-FINAL-P1.md` (dokumen ini)
- Artefak build rutin: `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`

### Verifikasi akhir

- `node --test tests/*.test.js` → **4799/4799 pass, 0 fail** (4788 baseline
  s661 + 11 baru).
- `node scripts/build.js s662-normalisasi-hitungkas-financial-calc` → lolos,
  versi 1401→1402.
- Catatan lingkungan: `esbuild` tidak terpasang → bundle TANPA minifikasi
  (valid, lolos `node --check`, tapi ukuran lebih besar dari produksi biasa).
  Jalankan `npm install --save-dev esbuild` lalu build ulang sebelum rilis
  final kalau mau ukuran normal — sama seperti catatan di sesi-sesi
  sebelumnya.

## Belum dikerjakan (lanjutan)

- **`isGajiTransaction()` vs bisnis Cobek** — belum diaudit ulang di luar
  konteks P1 (mis. apakah kategori "Bisnis"/"Cobek toko" lain yang BUKAN gaji
  ada risiko false-positive match `/gaji/i` — dari audit P0 data asli, TIDAK
  ada kasus itu di 236 tx income yg dicek, tapi belum diverifikasi general).
- Sisa `filter-laporan.js`, `cashflow-projection-presenter.js`,
  `financial-forecast-presenter.js`, `debt-optimizer-*`,
  `dana-kelolaan.js`/`dana-titipan-*` (Sesi T4+ lanjutan, tiap file butuh
  audit terpisah sebelum coding — lihat rencana kerja, RISIKO: SEDANG).
