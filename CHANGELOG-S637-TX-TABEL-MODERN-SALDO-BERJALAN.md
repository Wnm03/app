# Patch — Sesi s637 (RENCANA-MODERNISASI-UI.md)

Lanjutan langsung dari s635 (token tema) & s636 (ticker Beranda) di
PATCH-AUDIT-UIUX-VISUAL-2026-08.zip. Baseline: overlay zip itu di atas
app-main terbaru.

**Scope:** pola tabel Ledger Pro + kolom saldo berjalan, KHUSUS tab Uang
(`#allTx`, `renderKeuangan()`). Riwayat (`filterTxList`) & Dana Titipan
sengaja TIDAK disentuh (sesi terpisah sesuai tabel rencana).

**Keputusan user (audit sebelum coding):** kolom "Saldo" (saldo berjalan)
HANYA muncul kalau filter Akun sedang pilih 1 akun spesifik (bukan "Semua
Akun") — saldo berjalan lintas-akun (gabungan kas+bank+e-wallet) tidak
bermakna secara finansial. Saat "Semua Akun", tabel tetap dirender tapi
tanpa kolom Saldo sama sekali (bukan ditampilkan 0/salah).

## Perubahan (semua additive, 0 fungsi lama diubah)

- `modules/finance/akun.js` — fungsi baru `computeAccRunningBalances(accId)`:
  pure, reuse rumus PERSIS `recalcAccBalance()` (seed `acc.baseBalance`,
  income+/expense-/transfer_out-/transfer_in+), tapi merekam saldo
  SETELAH tiap transaksi (bukan cuma total). Dihitung dari SELURUH riwayat
  transaksi akun itu (bukan subset hasil filter), diurutkan naik
  berdasarkan tanggal (stable sort) supaya akumulasi kronologis benar.
- `modules/finance/tx-list-cashflow.js` — 2 fungsi baru `txTableRowHTML()` /
  `txTableHTML()`. `txHTML()` (kartu, dipakai 10 tema lama) 0 disentuh.
  Kolom Saldo hanya dirender kalau `txTableHTML()` dipanggil dengan
  `accIdForBalance` terisi.
- `modules/shared/modules-render.js` — di `renderKeuangan()`, percabangan
  `D.profile.theme==='modern'` (SSOT, bukan DOM query) menentukan
  `#allTx` dirender via `txTableHTML()` (tabel) atau jalur lama
  `visible.map(txHTML)` (kartu). `singleAccId` diturunkan dari filter
  `kf.acc` (`null` kalau "semua"). 10 tema lain 0 dampak.
- `styles.css` — class baru `.tx-tbl*` (table/thead/td/wrap util
  horizontal-scroll utk layar sempit), tidak menyentuh `.tx-item` dkk.
  Sel Nominal & Saldo reuse class `.tx-amount` yang sudah ada supaya
  otomatis kebagian `tabular-nums`/`font-mono` dari aturan s635 (0 aturan
  font baru).
- `tests/s637-tx-tabel-modern-saldo-berjalan.test.js` (BARU) — 11 test:
  matematika `computeAccRunningBalances()` (seed, akumulasi kronologis
  independen dari urutan array, isolasi per-akun), gating kolom Saldo
  (ada/tidak ada tergantung `accIdForBalance`), markup `data-action`
  editTx/delTx tetap sama pola kartu, regresi `txHTML()` byte-level 0
  berubah, wiring `renderKeuangan()` (percabangan tema via pembacaan
  source), keberadaan class CSS.

**Tidak disentuh:** `index.html`/`app_production.html` (0 markup baru,
`#allTx` container sudah ada), item virtual tagihan (`vbill_*`, tetap
kartu via `txHTML()` apa adanya — bukan transaksi riil, tidak ikut saldo
berjalan), pagination/`txListPage`/`moreWrap` (logic count tidak
disentuh).

## Verifikasi
- `node --check` ketiga file JS yang diubah → OK
- `node --test tests/*.test.js` → **4558/4558 pass** (4547 sebelumnya +
  11 baru), 0 regresi.
- `node scripts/build.js` TIDAK dijalankan (esbuild tidak tersedia di
  sandbox ini) — jalankan sendiri sebelum upload utk regenerasi bundle &
  bump versi resmi (`app_production.html` tidak berubah sesi ini, gate
  `html-sync` aman).

## File dalam ZIP ini
- `modules/finance/akun.js`
- `modules/finance/tx-list-cashflow.js`
- `modules/shared/modules-render.js`
- `styles.css`
- `tests/s637-tx-tabel-modern-saldo-berjalan.test.js` (BARU)
- `CHANGELOG-S637-TX-TABEL-MODERN-SALDO-BERJALAN.md`
