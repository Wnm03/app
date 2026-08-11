# S551 — Nominal (Rp) Read-Only per Baris Pemilik di investmentOwnersModal

## Latar belakang
Audit S540/B1-B12 (double-count Buku Aset vs Investasi) menemukan bahwa
`investmentOwnersModal` (khusus holding Investasi) sengaja didesain TANPA
field Nominal (Rp) sejak awal (lihat komentar "VERSI RINGKAS" di
`investasi-view.js`) — karena nilai holding SELALU dihitung ulang otomatis
dari unit×harga (bukan field manual seperti `a.nilai` di Buku Aset), jadi
tidak aman dibuat dua-arah seperti di Aset.

Rekomendasi #1 dari audit: tambah **Nominal (Rp) read-only** per baris
pemilik di modal ini (dihitung otomatis dari nilai holding × porsi,
live-update saat ketik %) — TANPA mengubah keputusan arsitektur di atas
(field ini tetap satu-arah, murni tampilan turunan, TIDAK PERNAH ditulis
balik ke draft/holding).

## Apa yang dikerjakan (Sesi 1 dari 2 rekomendasi audit)
- `modules/asset/investasi-view.js` (`InvestmentUI`):
  - `_ownerNominalText(o)` — baru. Hitung teks "Nominal (Rp)" dari
    `Investment.holdingValue(h)` (nilai pasar terkini holding yang sedang
    dibuka di modal, SUDAH ADA sejak awal `investasi.js`, 0 rumus baru) ×
    `draft[i].porsi / 100`. Sengaja basis `holdingValue()` (nilai pasar
    kini), BUKAN `holdingCost()` (basis biaya, dipakai `_ownerQuotaText()`
    untuk keperluan lain) — field ini menjawab "porsi X% ini setara berapa
    Rupiah SEKARANG", konsisten dengan cara Buku Aset menampilkan Nominal
    dari nilai kini.
  - `_updateOwnerNominalDisplay(i)` — baru. Update HANYA elemen
    `#investOwnerNominal{i}` tiap ketik %, pola identik
    `_updateOwnerQuotaDisplay(i)` (S494) — supaya fokus/kursor input porsi
    tidak hilang tiap karakter diketik.
  - `_renderOwnersList()` — tambah 1 baris field baru per pemilik:
    `<div class="fi" id="investOwnerNominal{i}">...</div>` (read-only,
    styling `background:var(--surface3)` sama pola field disabled
    lainnya), diletakkan tepat di bawah field Porsi (%).
  - `onOwnerPorsiInput(i,val)` — tambah 1 baris panggilan
    `InvestmentUI._updateOwnerNominalDisplay(i)` supaya nominal ikut
    live-update tiap ketik %, sejajar dengan `_updateOwnerQuotaDisplay(i)`
    yang sudah ada.
- `tests/s551-investment-owners-nominal-readonly.test.js` — baru, 7 test:
  holding kosong → string kosong, basis `holdingValue()` bukan
  `holdingCost()`, porsi 0/100%, render awal per-baris di
  `_renderOwnersList()`, live-update via `onOwnerPorsiInput()`, dan
  pembuktian field ini TIDAK PERNAH menulis balik ke draft/holding.
- Versi: `s548-merge-tx-sync-servis-plus-s540bc-s545-548` →
  `s553-investment-owners-nominal-readonly` (lompat s549-s552 otomatis
  dari `scripts/build.js` — kena `bumpVersionEverywhere()` self-increment
  tiap re-run build sampai semua 6 konstanta versi tersinkron; lihat log
  build di bawah), `?v=` **1284 → 1285**, `CACHE_NAME` →
  `kw-cache-v1285`. `package.json` `0.85.7` → `0.85.8`.

## Yang SENGAJA TIDAK diubah
- **Rekomendasi #2 (banner "✅ Samakan Porsi dari Aset Ini & Tautkan")
  BELUM dikerjakan** — sesuai instruksi user, dibagi 2 sesi terpisah.
  Lihat `RENCANA-SESI-S552-BANNER-SAMAKAN-PORSI.md` (dibuat di sesi ini
  sebagai catatan rencana, BELUM diimplementasikan) untuk kelanjutannya.
- Arsitektur link manual antara Buku Aset ↔ holding Investasi (patch
  B1-B12, `investmentId` kosong = belum tertaut) TIDAK disentuh sama
  sekali di sesi ini.
- Tidak ada perubahan pada `Investment.setOwners()`/
  `MultiOwnerEngine`/`DanaTitipanPortfolioAPI` — 100% reuse fungsi yang
  sudah ada, field baru murni derivatif tampilan.

## Status
- **3797/3797 test PASS** (`node --test tests/*.test.js`) — 3790 baseline
  (upload awal sesi ini) + 7 test baru.
- `node scripts/build.js` dijalankan (build.js self-detect & bump versi
  otomatis sampai semua konstanta sinkron) — lolos `node --check` untuk
  kedua bundle.
- Regresi ulang setelah build: 3797/3797 PASS lagi (0 perubahan angka).
- `npm run release-check` LOLOS dengan 2 override (dicatat di
  `docs/RELEASE-GATE-LOG.md`): eslint tidak tersedia (sandbox tanpa akses
  npm registry) & bundle tidak diminify (esbuild tidak tersedia) — pola
  override yang sama dipakai sesi-sesi sebelumnya di sandbox ini.
