# Sesi 398 — Saran Alokasi Gaji (5 Pos), v1099 → v1100

## Latar belakang

User audit rumus "Bulanan × N" yang beredar (300 pensiun, 6 dana darurat,
0.5 biaya harian, 0.3 investasi, 0.2 self-reward) terhadap kode aktual.
Hasil audit (diverifikasi ke source, bukan tebakan):

| Rumus | Status sebelum sesi ini |
|---|---|
| × 300 (pensiun/FI) | Sudah ada — `FI.targetNominal()` (`modules-calc.js`), swr adjustable |
| × 6 (dana darurat) | Sudah ada, tapi HANYA di alur "toggle Dana Darurat" saat bikin Target baru (`onTargetDanaDaruratToggle()`, `tx-target.js`) — tidak ada tempat lain lihat angka ini tanpa buka modal Target |
| × 0.5 / × 0.3 / × 0.2 | Tidak ada sama sekali |

Keputusan (dikonfirmasi user): tidak bikin fitur "wizard alokasi gaji" baru
yang nulis data sendiri (risiko SSOT ganda). Tambah 1 kalkulator SARAN murni
yang bisa diakses kapan saja dari Pengaturan → Profil, basis "Bulanan" =
**rata-rata Pemasukan aktual dari transaksi** (bukan field "Gaji Pokok
Harian" yang khusus payroll harian/lembur) — window sama persis dgn
`FI.effectiveMonths()` supaya konsisten dgn cara FI menghitung pengeluaran.

## Perubahan

1. **`modules/shared/modules-calc.js`** — objek baru `SalaryAllocation`
   (ditaruh tepat setelah wrapper `FI.*`, TIDAK memodifikasi objek `FI`):
   - `avgMonthlyIncome()` — total transaksi `type==='income'` dalam window
     `FI.effectiveMonths()` ÷ jumlah bulan.
   - `suggest()` — return `{bulanan, danaDaruratTarget (×6), pensiunFiTarget
     (×100/swr, ikut asumsi SWR FI), fiMultiplier, biayaHarian (×0.5),
     investasi (×0.3), selfReward (×0.2)}`.
   - Wrapper global tipis `salaryAllocationSuggest()`.
2. **`modules/shared/profil-pengaturan.js`** — `renderSalaryAllocationSuggestion()`,
   render hasil ke hint box (pola sama persis `onTargetDanaDaruratToggle()`
   di `tx-target.js`) — **tidak menulis ke `D.targets`/manapun**, murni saran.
3. **`index.html` / `app_production.html`** — kartu baru "💰 Saran Alokasi
   Gaji" di tab Pengaturan → Profil, di antara kartu "🪪 Profil Pribadi" dan
   "🤖 AI Asisten". Tombol "💡 Hitung Saran Alokasi" (`data-action`) +
   hint box `#salaryAllocHint` (default `u-dnone`).
4. **`tests/salary-allocation-s398.test.js`** (baru, 4 test) — cakupan
   `avgMonthlyIncome()` (kosong, rata-rata benar, expense diabaikan) &
   `suggest()` (5 pos sesuai rumus, ikut asumsi SWR FI termasuk default 4%
   → 25× yang setara 300× kalau dibandingkan basis pengeluaran tahunan FI).

## Kenapa aman / additive

- 0 perubahan ke `FI` — objek baru terpisah, tidak ada modifikasi kontrak.
- 0 perubahan ke alur Dana Darurat existing (`tx-target.js` tidak disentuh).
- Tidak ada tulis data baru — murni fungsi kalkulasi + tampilan saran.
- Field "Gaji Pokok Harian" (payroll harian) tidak disentuh/dipakai sebagai
  basis, supaya tidak salah campur dua konsep penghasilan yang beda.

## Test

`tests/salary-allocation-s398.test.js` — 4 test baru, semua PASS.
Full suite: **2699/2699 pass, 0 fail** (`node --test tests/*.test.js`).

## Build

`node scripts/build.js s398-salary-allocation-suggestion` → v1100, sintaks
bundle valid, `index.html`/`app_production.html` identik, versi sinkron di
8 file source.

## Cara pasang (patch)

Timpa file berikut ke lokasi yang sama persis di project:

```
modules/shared/modules-calc.js
modules/shared/profil-pengaturan.js
tests/salary-allocation-s398.test.js   (baru)
app-bundle-a.min.js
app-bundle-b.min.js
index.html
app_production.html
sw.js
docs/FILE-MAP.md
docs/COVERAGE-PER-MODULE.md
```

Catatan: `chat-action-handlers.js`, `modules/shared/multi-owner-engine.js`,
`modules/shared/features-helpers-global-security.js`,
`modules/business/shop-data-io-api.js`,
`modules/shop/generic/product-repository.js`, `modules/shared/modals.js`,
`modules/shared/modules-render.js` juga ikut berubah TAPI cuma bump
konstanta versi (`node scripts/build.js`), 0 perubahan logika — tetap
disertakan di ZIP biar semua versi konsisten kalau mau upload penuh.
