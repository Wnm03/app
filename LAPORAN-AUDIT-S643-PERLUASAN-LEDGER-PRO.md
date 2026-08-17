# LAPORAN AUDIT — Sesi s643 (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md)
Audit lintas s641 (Riwayat) + s642 (Dana Titipan) — sesi PENUTUP rencana ini.

**Baseline:** app-main + overlay s635–s640 + patch s641 + patch s642.

---

## 1. Audit ulang gating (bukan cuma baca changelog)

| Sesi | Scope | Cara gating | Status |
|---|---|---|---|
| s641 | Tabel Riwayat (`#filterTxList`, `filter-laporan.js`) | `D.profile.theme==='modern'` di `showFilteredTx()`, reuse `txTableHTML()` s637 | ✅ 0 regresi ke jalur `txHTML()` kartu |
| s642 | Mini-tabel riwayat pengembalian di kartu owner Dana Titipan | `D.profile.theme==='modern'` di `_returnsHistoryHtml()` | ✅ struktur `<details>` kartu owner (S631-S634) 0 diubah |

6 test audit baru (`tests/s643-audit-lintas-s641-s642.test.js`) memverifikasi
ulang kedua gating di atas + memastikan `.tx-tbl*` (CSS) tidak nambah
selector baru sejak s637 (reuse murni) + cek cakupan lintas 5 layar
sekaligus dalam 1 assertion.

## 2. Full test suite

- Sebelum sesi ini (s635-s642): 4606/4606 pass.
- Setelah + 6 test audit baru: **4612/4612 pass, 0 fail, 0 regresi**.
- `verify-window-expose.js` → OK.
- `verify-release-ready.js` → gate `html-sync` ✅, `version-sync` ✅
  (v1374, belum di-bump krn sesi ini belum lewat `scripts/build.js`).
  Gate `lint`/`minify` GAGAL krn `eslint`/`esbuild` tidak tersedia di
  sandbox — sama seperti seluruh sesi s635-s642 sebelumnya, **wajib**
  `npm run check` penuh di environment kamu sebelum rilis.

## 3. Cakupan Ledger Pro — status akhir

| Layar | Status |
|---|---|
| Beranda | ✅ ticker (s636) |
| Uang (`#allTx`) | ✅ tabel + saldo berjalan (s637) |
| Aset (`#assetList`) | ✅ tabel list padat (s639) |
| Riwayat (`#filterTxList`) | ✅ tabel + saldo berjalan kondisional (s641) |
| Dana Titipan | ✅ mini-tabel riwayat pengembalian (s642) — holdings/badge/owner card lain SENGAJA tetap non-tabel (bukan daftar transaksi datar, lihat §2 `RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md`) |

**5/5 layar padat-data sekarang punya jalur Ledger Pro** (2 di antaranya —
Beranda & Dana Titipan — dengan cakupan parsial by design, bukan celah).
Ini melengkapi alasan #2 di keputusan NO-GO audit s640 ("cakupan tabel
belum menjangkau semua layar").

## 4. Evaluasi ulang Go/No-Go Default

Keputusan NO-GO audit s640 punya 2 alasan. Status masing-masing sekarang:

1. **"Perlu feedback pemakaian nyata dulu"** — TIDAK berubah oleh sesi
   ini. Ini murni soal kebijakan/pengalaman pengguna, bukan sesuatu yang
   bisa diselesaikan lewat audit teknis atau menambah cakupan kode. Tema
   `modern` baru terdaftar sbg opsi sejak s640 — belum ada rentang waktu
   pemakaian nyata sama sekali.
2. **"Cakupan tabel belum menjangkau semua layar"** — **sekarang
   terselesaikan** (5/5 layar, lihat §3).

**Kesimpulan: TETAP NO-GO untuk default**, tapi dengan alasan yang sudah
menyempit jadi murni #1 — teknis sudah tidak jadi penghalang lagi.

Ini **bukan keputusan otomatis "jadi default begitu cakupan penuh"** —
sesuai catatan risiko asli (`RENCANA-MODERNISASI-UI.md` §6): tema baru
"baru dipertimbangkan jadi default setelah [...] kalau hasilnya sesuai
ekspektasi", yang secara eksplisit mensyaratkan sinyal preferensi
pengguna nyata, bukan sekadar audit teknis lolos.

**Rekomendasi konkret:** biarkan tema `modern` sbg opsi dulu (sudah
terdaftar sejak s640, sekarang cakupannya utuh) untuk 1 periode pemakaian
nyata. Kalau nanti dipakai & disukai, sesi lanjutan tinggal ubah 2 baris
yang sudah diverifikasi TIDAK BERUBAH oleh test s640 (`<body
data-theme="fresh">` di HTML & fallback `'dark'` di
`applyEffectiveTheme()`) — perubahan itu sendiri rendah risiko, tapi
keputusan KAPAN melakukannya ada di tangan kamu, bukan hasil audit ini.

## 5. File yang berubah sesi ini
- `tests/s643-audit-lintas-s641-s642.test.js` (BARU) — 6 test
- `LAPORAN-AUDIT-S643-PERLUASAN-LEDGER-PRO.md` (BARU, file ini)
- `CHANGELOG-S643-AUDIT-PERLUASAN-LEDGER-PRO.md` (BARU)

**Tidak diubah:** seluruh kode produksi (`filter-laporan.js`,
`dana-titipan-portfolio-render.js`, `styles.css`, dst) — sesi ini murni
audit + 1 test file baru, 0 logic diubah.

**Status rencana:** `RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md`
(s641–s643): **SELESAI SEMUA SESI.**
