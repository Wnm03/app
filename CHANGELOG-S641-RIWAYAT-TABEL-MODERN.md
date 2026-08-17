# Patch — Sesi s641 (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md)
Perluasan tabel Ledger Pro ke Riwayat (`#filterTxList`)

**Baseline:** app-main + overlay s635–s640 (merge terverifikasi, 4596/4596
test pass) + `RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md` (draft
rencana, sesi ini mengerjakan baris s641 di tabel §3).

## Scope
`showFilteredTx()` (`modules/finance/filter-laporan.js`), fungsi tunggal
yang merender `#filterTxList` dipakai dari 4 pemanggil (`scope`:
`dashboard`/`keuangan`/`laporan`/`account` — Riwayat Beranda, Riwayat tab
Uang, Laporan, dan Riwayat Transaksi 1 akun dari Buku Aset).

## Perubahan
- **REUSE 100%** `txTableHTML()`/`txTableRowHTML()` yang sudah ada sejak
  s637 (`modules/finance/tx-list-cashflow.js`) — 0 fungsi/CSS baru.
- Gating persis pola s637: `D.profile&&D.profile.theme==='modern'&&typeof
  txTableHTML==='function'`, jalur `else` (kartu `txHTML()`) 0 diubah.
- **Kolom saldo berjalan** hanya aktif saat `scope==='account'` (dipanggil
  dari `Aset.openTxHistory`, 1 akun spesifik) — `accId` dipassing ke
  `txTableHTML(visible, scope==='account'?accId:null)`. Scope lain
  (`dashboard`/`keuangan`/`laporan`) bisa lintas-akun, jadi `null` —
  `txTableHTML` sudah otomatis sembunyikan kolom Saldo kalau param ini
  null (perilaku existing dari s637, 0 logic baru).
- **Batch "muat lebih banyak"**: append `<tr>` lewat `txTableRowHTML()`
  langsung ke `<tbody>` yang sudah ada (bukan panggil ulang
  `txTableHTML()` penuh, supaya tidak nyisipin `<table>`/`<thead>` baru
  di tengah daftar) — fallback ke `txHTML()` kartu kalau `<tbody>` tidak
  ditemukan (guard, seharusnya tidak pernah kejadian tapi mencegah
  silent-fail kalau markup berubah di masa depan).

## Yang TIDAK diubah
- `tx-list-cashflow.js`, `styles.css` (0 fungsi/CSS baru, reuse penuh)
- `modules-render.js` (tab Uang, s637), `aset.js` (s639), dashboard-hub
  (s636), Dana Titipan (s638) — 0 disentuh sesi ini
- Jalur kartu `txHTML()` — dipakai apa adanya di semua scope utk 10 tema
  lama, byte-identik dgn sebelum sesi ini

## File yang berubah
- `modules/finance/filter-laporan.js` — gating tabel modern di
  `showFilteredTx()`

## File baru
- `tests/s641-riwayat-tabel-modern.test.js` — 5 test (wiring gating
  render awal, saldo berjalan hanya di scope `account`, batch lanjutan
  append `<tr>` bukan tabel penuh, fallback kartu 0 regresi)

## Verifikasi
- `node --test tests/s641-riwayat-tabel-modern.test.js` → 5/5 pass
- `node --test tests/*.test.js` → **4601/4601 pass** (4596 sebelumnya + 5
  baru), 0 fail, 0 regresi

## Status cakupan Ledger Pro (update dari laporan s640)
| Layar | Status |
|---|---|
| Beranda | ✅ ticker (s636) |
| Uang (`#allTx`) | ✅ tabel + saldo berjalan (s637) |
| Aset (`#assetList`) | ✅ tabel list padat (s639) |
| **Riwayat (`#filterTxList`)** | **✅ tabel + saldo berjalan kondisional (s641, sesi ini)** |
| Dana Titipan | ⚠️ masih kartu, class `.money` saja (s638) — belum dikerjakan, lihat s642 di rencana |

**Belum dikerjakan (di luar scope sesi ini):** s642 (Dana Titipan) dan
s643 (audit lintas + evaluasi ulang go/no-go default) — lihat
`RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md`.
