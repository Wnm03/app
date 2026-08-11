# Sesi B1 — Field `investmentId` di Aset + Dropdown Link ke Holding Investasi

Pola: sama persis S506 `vehAssetId` (Kendaraan → Buku Aset), diterapkan arah baru:
Aset → Holding Investasi.

## Scope sesi ini (SENGAJA dibatasi)
- Field baru `a.investmentId` (nullable, string id holding di `D.investments[]`) di skema Aset.
- Dropdown "🔗 Hubungkan ke Holding Investasi" di `assetModal` (modules/shared/modals.js),
  ditaruh persis sebelum tombol "⚖️ Atur Porsi Kepemilikan".
- Populate dropdown saat modal dibuka (`Aset._populateInvestmentLinkSelect`, dipanggil dari
  `Aset.openModal`) + baca & simpan nilainya di `Aset._saveInner()`.
- 0 logic lain: TIDAK ada bridging ke `assetOwnersModal` (read-only kalau terhubung), TIDAK ada
  baris "🔗 Terhubung ke Investasi" di kartu Aset, TIDAK ada alat bantu migrasi. Itu scope
  B2/B3/B4.

## File yang diubah
- `modules/shared/modals.js` — tambah 1 field `<div class="fg">...<select id="assetInvestmentId">`
  di `assetModal`.
- `modules/asset/aset.js`:
  - Fungsi baru `assetInvestmentLinkOptionsHtml(currentInvestmentId)` (pure, baca `D.investments`).
  - Method baru `Aset._populateInvestmentLinkSelect(a)`, dipanggil dari `Aset.openModal()`.
  - `Aset._saveInner()`: baca `#assetInvestmentId`, set/hapus `a.investmentId` (konvensi sama
    `vehAssetId`: "— Tidak terhubung —" → field dihapus dari record, bukan disimpan kosong).

## Verifikasi
- `node -c modules/asset/aset.js` → OK.
- `new Function(...)` syntax-check `modules/shared/modals.js` → OK.
- Belum ada test otomatis ditambahkan sesi ini (test end-to-end untuk field+dropdown murni
  UI-wiring, menyusul digabung di test regresi B5 sesuai rencana sesi).

## Sesi berikutnya
- B2: `assetOwnersModal` read-only kalau `investmentId` terisi.
- B3: baris "🔗 Terhubung ke Investasi" + porsi read-only di kartu Aset.
- B4: alat bantu migrasi (saran, bukan auto-link) di 🩺 Data Health Check.
- B5: regression penuh + release notes gabungan.
