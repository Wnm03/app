# FIX v1145 -> v1146 (s432) — Audit fitur Transfer Antar Akun

## Konteks

Permintaan user: audit fitur Transfer di transaksi keuangan, kasih
rekomendasi perbaikan, lalu kerjakan perbaikannya dengan test nyata (bukan
cuma rekomendasi di atas kertas).

## Ruang lingkup audit

`modules/finance/tx-transfer.js` (`openTransferModal()`/`saveTransfer()`) +
titik singgungnya: `delTx()` (`modules/finance/tx-list-cashflow.js`),
`recalcAccBalance()` (`modules/finance/akun.js`), render kartu transaksi
(`txHTML()`).

**Sebelum sesi ini: 0 file test utk `tx-transfer.js` sama sekali** (audit:
`docs/COVERAGE-PER-MODULE.md` tidak punya entri modul ini) — fitur transfer
sebelumnya tidak punya jaring pengaman regresi otomatis sama sekali.

## Temuan & perbaikan

### 1. 🔴 BUG KRITIS: kaki transfer jadi orphan saat dihapus

**Temuan**: `saveTransfer()` membuat 2 baris transaksi (`transfer_out` di
akun asal, `transfer_in` di akun tujuan) tapi TIDAK ADA field apa pun yang
menautkan keduanya. `delTx()` cuma tahu cara hapus SATU baris by `id`.
Akibatnya: user hapus salah satu kaki transfer (mis. dari kartu "Semua
Transaksi") -> kaki satunya TETAP ADA sendirian -> saldo salah satu akun
jadi pincang PERMANEN (uang "menghilang" dari 1 akun tanpa pernah tercatat
keluar dari akun lain, atau sebaliknya "muncul" tanpa asal). Makin parah
karena `transaksi.js:527` sudah menyarankan user "Hapus & buat ulang kalau
salah" utk transfer yang salah input — saran itu sendiri yang memicu bug
ini kalau user cuma menghapus 1 baris yang salah (lupa/tidak sadar ada
baris pasangannya di akun lain).

**Perbaikan**: field baru `transferPairId` (uid() baru, SAMA di kedua baris
hasil 1x `saveTransfer()`) ditulis ke kedua transaksi. `delTx()` sekarang:
kalau transaksi yang dihapus adalah `transfer_out`/`transfer_in` DAN punya
`transferPairId`, cari pasangannya (`transferPairId` sama, `id` beda) &
hapus BARENGAN — 1 tap hapus, 2 baris hilang, saldo kedua akun tetap
konsisten. Toast baru: "🗑 Transfer dihapus (2 sisi sekaligus, saldo kedua
akun ikut disesuaikan)".

**Batasan yang diketahui**: transfer LAMA (dibuat sebelum sesi ini, belum
punya `transferPairId`) TIDAK bisa dipasangkan otomatis secara aman (tidak
ada cara menebak pasangannya cuma dari amount/date/accountId tanpa risiko
salah pasang kalau ada >1 transfer dgn nominal & tanggal sama) — tetap
berperilaku SAMA seperti sebelum sesi ini utk data lama (hapus 1 sisi
saja). User yang menemukan transfer lama yang pincang disarankan audit
manual lewat Laporan.

### 2. 🟠 BUG: crash kalau akun asal/tujuan tidak valid

**Temuan**: `saveTransfer()` langsung akses `toAcc.name`/`fromAcc.name`
tanpa cek `fromAcc`/`toAcc` benar-benar ketemu di `D.accounts`. Kalau
`from`/`to` kosong (mis. dropdown belum sempat ke-populate) atau id basi,
`.find()` balikin `undefined` -> `TypeError: Cannot read properties of
undefined` -> seluruh fungsi berhenti di tengah jalan tanpa pesan jelas ke
user (uncaught exception, bukan validasi rapi seperti guard `amt`/`from===to`
yang sudah ada di baris sebelumnya).

**Perbaikan**: guard eksplisit `if(!fromAcc||!toAcc)` + toast "⚠️ Akun
asal/tujuan tidak valid — pilih ulang akunnya", sebelum akses `.name`.

### 3. 🟡 UX: modal transfer bisa dibuka dgn <2 akun

**Temuan**: `openTransferModal()` tidak cek jumlah akun. Kalau user cuma
punya 0-1 akun, modal tetap terbuka dgn dropdown asal/tujuan kosong/cuma 1
opsi — error baru muncul SETELAH user isi form & tekan simpan ("Akun asal
dan tujuan harus berbeda", membingungkan kalau akunnya memang cuma 1).

**Perbaikan**: guard di `openTransferModal()` — kalau `D.accounts.length<2`,
modal TIDAK dibuka, toast langsung: "⚠️ Butuh minimal 2 akun untuk transfer
— tambah akun dulu di Kelola Akun".

### 4. 🟢 Minor: note isi spasi kosong lolos jadi note

**Temuan**: `document.getElementById('trNote').value||'Transfer'` — string
spasi (`'   '`) itu truthy di JS, jadi lolos jadi note asli (bukan fallback
`'Transfer'`) walau isinya cuma spasi.

**Perbaikan**: `.trim()` dulu sebelum fallback: `(val||'').trim()||'Transfer'`.

## Yang SUDAH BENAR (diverifikasi, tidak diubah)

- `t.note` di-escape saat render (`txHTML()`, `tx-list-cashflow.js`) — 0
  risiko XSS dari note transfer, walau `note` mentah tidak di-escape saat
  disimpan (pola sama dgn seluruh modul transaksi lain, escape konsisten
  dilakukan di titik render, bukan titik simpan).
- `recalcAccBalance()` (`akun.js`) sudah benar menghitung `transfer_out`
  (kurang) & `transfer_in` (tambah) per akun — diverifikasi ulang lewat
  test baru (lihat di bawah), tidak ada bug di titik ini.
- `transaksi.js:527` blokir edit transfer langsung (arahkan ke hapus & buat
  ulang) — perilaku ini SENGAJA dipertahankan (transfer 2-kaki lebih aman
  di-recreate daripada diedit parsial), makin valid sekarang setelah temuan
  #1 diperbaiki (hapus sekarang aman, tidak lagi menyisakan orphan).

## Test (nyata, dijalankan — bukan cuma rekomendasi)

`tests/tx-transfer-audit-s432.test.js` — 9 test BARU, load SOURCE ASLI
(`tx-transfer.js`, `tx-list-cashflow.js`, `akun.js`) lewat `loadSource()`:
1. `openTransferModal()` <2 akun -> ditolak, modal tidak terbuka.
2. `openTransferModal()` >=2 akun -> modal terbuka normal.
3. `saveTransfer()` akun invalid -> guard toast, tidak crash, 0 transaksi
   tersimpan.
4. `saveTransfer()` sukses -> 2 baris transaksi berpasangan
   (`transferPairId` sama, `id` beda), amount & accountId benar.
5. `saveTransfer()` note spasi kosong -> fallback "Transfer".
6. `saveTransfer()` + `recalcAccBalance()` end-to-end -> saldo akun asal
   berkurang & tujuan bertambah PERSIS sebesar nominal transfer.
7. `delTx()` hapus 1 kaki transfer BARU -> KEDUA kaki ikut terhapus (bukti
   fix bug #1 beneran jalan, bukan cuma di teori).
8. `delTx()` transfer LEGACY (tanpa `transferPairId`) -> hapus 1 sisi saja,
   0 crash, 0 regresi utk data lama.
9. `delTx()` transaksi biasa (bukan transfer) -> perilaku lama tidak
   berubah.

Test lama (seluruh suite) tetap 0 regresi.

`node --test tests/*.test.js` -> **2889/2889 pass, 0 fail** (naik dari
2880, +9 test baru).

## Release Gate

`node scripts/verify-release-ready.js`:
- **Lint/Minify**: eslint/esbuild tidak tersedia (sandbox tanpa akses
  jaringan, konsisten sesi-sesi sebelumnya) -> di-override manual. Detail:
  `docs/RELEASE-GATE-LOG.md`.
- **html-sync**: lolos tanpa override.

## Build

`node scripts/build.js s432-audit-fitur-transfer` -> sukses, `v1145` ->
`v1146`.

## File yang berubah

- `modules/finance/tx-transfer.js` — guard akun <2 (`openTransferModal`),
  guard `fromAcc`/`toAcc` invalid, `transferPairId` baru, `.trim()` note
  (`saveTransfer`)
- `modules/finance/tx-list-cashflow.js` — `delTx()` hapus kaki pasangan
  transfer lewat `transferPairId`
- `tests/tx-transfer-audit-s432.test.js` — BARU, 9 test
- `docs/RELEASE-GATE-LOG.md` — 1 entri baru (append, otomatis)
- Konstanta versi (8 file source pola sama sesi-sesi sebelumnya) naik ke
  `s432-audit-fitur-transfer`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=1145`
  -> `?v=1146`
- `backups/` — 2 file backup bundle lama (otomatis oleh `build.js`)

## Rekomendasi lanjutan (belum dikerjakan, di luar scope sesi ini)

- **Biaya transfer/admin bank**: form transfer belum punya field biaya
  (mis. transfer antar bank beda yang kena potongan admin) — kalau
  dibutuhkan, perlu sesi terpisah (field baru + UI + 1 tx tambahan/split
  amount, bukan perubahan kecil).
- **Riwayat "transfer pincang" lama**: tidak ada tool audit utk mendeteksi
  transfer legacy yang sudah kadung orphan sebelum fix ini (mis. akibat
  bug #1 di masa lalu). Kalau dibutuhkan, bisa jadi sesi terpisah: scan
  `D.transactions` cari `transfer_out`/`transfer_in` tanpa pasangan yang
  amount & tanggalnya cocok, tampilkan sbg laporan ke user (READ-ONLY,
  jangan auto-fix — user yang paling tahu konteks aslinya).
- **Edit transfer langsung**: masih diblokir sengaja (lihat bagian "Yang
  SUDAH BENAR" di atas) — tetap TIDAK direkomendasikan diubah, hapus & buat
  ulang sekarang sudah aman (fix #1).
