# ASET KELUARGA — LAPORAN GABUNGAN LINTAS-MODUL
**Keluarga W · Sprint 2 · Tahap 5 — Kartu "🏠 Aset Keluarga" di tab Laporan**

Baseline: Sprint 2 Tahap 4 selesai (FAB Laporan), `node --test`
**1598/1598 PASS** (1 kegagalan pre-existing & tidak terkait — lihat catatan
di bawah).

## 1. Apa yang ditambahkan

Kartu baru **"🏠 Aset Keluarga"** di tab Laporan (`#keuanganTab-laporan`),
tepat di bawah kartu 🏦 Saldo Akun. Kartu ini menyusun ulang 3 angka yang
sebelumnya cuma bisa dilihat terpisah di 3 tempat berbeda:

- **💰 Keuangan** — Saldo Akun (`totalSaldoAkun()`) dikurangi Utang & Cicilan
  (`totalDebtValue()` + `totalCicilanOutstanding()` + utang manual dari
  Pajak & Zakat).
- **🪨 Shop** — Nilai Stok/Inventori (`totalInventoriBisnisValue()`) +
  Piutang Pelanggan (`totalPiutangValue()`).
- **🏍️ Car Notes** — jumlah kendaraan terdaftar di Car Notes (`D.vehicles`)
  dibandingkan dengan nilai kendaraan yang **sudah tercatat** di 📋 Buku Aset
  (`D.assets` dengan `jenis === 'Kendaraan'`). Kalau ada kendaraan yang belum
  ditautkan nilainya, kartu menampilkan info supaya user tahu itu belum ikut
  terhitung ke total.
- **Total Aset Keluarga** — penjumlahan ketiganya.

## 2. Kenapa ini BUKAN sumber angka baru

Kartu 🏦 Kekayaan Bersih (`Kekayaan.renderBersih()`, modules-calc.js) sudah
lama jadi satu-satunya sumber angka "kekayaan bersih total" yang dipakai
growth-rate/snapshot/Kebebasan Finansial (FI) — kartu ini **tidak
menduplikasi atau menggantikannya**. `AsetKeluarga` (file baru
`aset-keluarga.js`) murni membaca ulang fungsi-fungsi total yang SAMA
(`totalSaldoAkun`, `totalDebtValue`, `totalCicilanOutstanding`,
`totalInventoriBisnisValue`, `totalPiutangValue`) lalu menyusunnya per-modul
supaya bisa dibaca sebagai satu laporan "Aset Keluarga" lintas
Shop/Car Notes/Keuangan — cocok untuk yang mau lihat kontribusi tiap modul
tanpa bolak-balik ke 3 halaman.

Nilai kendaraan sengaja **tidak** menambah field/relasi data baru antara
Car Notes (`D.vehicles`, operasional: servis/pajak/BBM) dan Buku Aset
(`D.assets`, finansial). Keduanya dibandingkan lewat **jumlah** saja (bukan
dicocokkan satu-satu by id/nama) — kalau user mau nilai kendaraannya ikut
masuk Total Aset Keluarga, tetap dicatat lewat 📋 Buku Aset → jenis
"🏍️ Kendaraan" seperti biasa (fitur ini sudah ada sejak awal, tidak diubah).

## 3. File yang berubah

- **Baru**: `aset-keluarga.js` — `AsetKeluarga.{keuangan,shop,carNotes,build,
  render}`, didaftarkan di `GROUP_A` (`scripts/build.js`) tepat setelah
  `aset.js`.
- **`index.html`**: kartu baru `#asetKeluargaCard` (+ `#akKeuangan`,
  `#akShop`, `#akCarNotes`, `#akTotal`) di dalam `#keuanganTab-laporan`,
  reuse penuh class `.card`/`.card-collapse-body`/`toggleCardCollapse` yang
  sudah ada — tidak ada CSS baru.
- **`modules-render.js`**: 1 baris pemanggilan `AsetKeluarga.render()` di
  akhir `renderLaporan()` (guarded `typeof AsetKeluarga!=='undefined'`, pola
  sama dengan pemanggilan modul lain di fungsi yang sama).
- **Baru**: `tests/aset-keluarga.test.js` — 7 test murni-logika (tanpa DOM)
  untuk `AsetKeluarga.{keuangan,shop,carNotes,build}`, load file asli lewat
  `loadSource()` (pola sama dengan `aset.test.js`).

## 4. Catatan pre-existing test failure

1 test gagal (`FEATURE_REGISTRY — target.goTo … piutangList … #page-pajak`,
`tests/dashboard-hub-registry.test.js`) — **sudah gagal sebelum perubahan
ini** (diverifikasi di zip asli sebelum Tahap 5 dimulai), tidak berkaitan
dengan kartu Aset Keluarga. Dibiarkan apa adanya sesuai lingkup Tahap 5
(hanya kartu Laporan baru), tidak ikut diperbaiki di sini supaya diff tetap
fokus & bisa direview terpisah.
