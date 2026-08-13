# AUDIT-13-OWNER-RESOLVER-POST-DL-NEXT-7.md

Status: **AUDIT, 0 kode diubah.** Sesi lanjutan setelah DL-Next-7
(S580, v1310) selesai — memverifikasi 0 gap turunan sebelum ditutup
total, pola sama persis AUDIT-12 pasca DL-Next-6.

## Cakupan
Grep ulang `deductionOwnerId`/`resolveOwnerDefaultForAccount` di seluruh
`modules/` + root, plus review manual cabang `data-health-check.js` yang
BELUM disentuh DL-Next-7 (cabang `existsOnOtherAcc`).

## Hasil grep — regresi DL-Next-7 sendiri
- **PASS.** Consumer `deductionOwnerId` tetap 3 file: `transaksi.js`
  (produsen), `tx-list-cashflow.js` (DL-Next-6), `data-health-check.js`
  (DL-Next-7). 1 file baru muncul di grep (`akun.js`) tapi **hanya 2
  baris komentar** ("0 deductionOwnerId di sesi S574-A/B") — 0 logic,
  bukan consumer nyata.
- `node --test tests/*.test.js`: 4077 test, 4068 pass, 9 fail (identik
  pre-existing sejak v1309, 0 regresi baru).

## Temuan baru (severity RENDAH): cabang `existsOnOtherAcc` punya pola serupa

**Lokasi:** `data-health-check.js`, cabang yang membedakan kasus C
("owner valid tapi di akun lain") vs A ("owner tidak ditemukan sama
sekali") — masih cek `(a.owners||[]).some(...)` mentah ke SEMUA akun
LAIN, bukan lewat `resolveOwnerDefaultForAccount(a.id)`.

**Dibuktikan lewat reproduksi:** owner `oX` valid **hanya** lewat aset
multi-owner tertaut ke `acc-other` (akun itu sendiri tidak punya
`owners[]` manual) → transaksi di `acc-target` dgn
`deductionOwnerId:'oX'` menghasilkan judul **"Pemilik Sumber Potongan
tidak ditemukan"** (kasus A), padahal seharusnya kasus C ("bukan
pemilik akun transaksi ini") karena `oX` sebenarnya valid secara
global lewat aset tertaut akun lain.

**Kenapa severity RENDAH (bukan seperti DL-Next-7):** DL-Next-7 bikin
warning muncul PADAHAL DATA VALID (0 warning seharusnya). Temuan ini
beda — **warning tetap muncul di kedua kasus** (level `warn` sama),
cuma **judul/pesan salah kategori** (bilang "tidak ditemukan sama
sekali" padahal sebenarnya "ada, tapi di akun lain") — user tetap
diberi tahu ada yang perlu dicek, cuma penjelasannya kurang presisi.

**Cakupan dampak:** hanya transaksi yang (a) owner-nya benar-benar
tidak ada di akun transaksi manapun caranya, (b) TAPI valid di akun
LAIN yang sumbernya aset tertaut (bukan `acc.owners[]` manual akun
itu). Kombinasi sempit — jauh lebih jarang dari kasus DL-Next-7.

## Rekomendasi (kandidat, BUKAN dikerjakan sekarang)

**DL-Next-8 (kandidat)** — ganti basis `existsOnOtherAcc` dari
`(a.owners||[])` mentah ke `resolveOwnerDefaultForAccount(a.id)` per
akun lain (pola sama persis DL-Next-7). Perlu keputusan eksplisit:
performa (loop `D.accounts` × `resolveOwnerDefaultForAccount()` per
akun, bukan 1x) — kemungkinan dampak diabaikan (jumlah akun biasanya
kecil), tapi perlu dicatat sebagai keputusan sadar.

## Ringkasan

| # | Temuan | Risiko | Status |
|---|---|---|---|
| 1 | Regresi DL-Next-7 sendiri (consumer lain, akun.js komentar-saja) | Nihil | **PASS** |
| 2 | `existsOnOtherAcc` salah kategori (A vs C) utk owner valid via aset di akun lain | **Rendah** (warning tetap muncul, cuma judul kurang presisi) | Kandidat **DL-Next-8**, belum di-lock |

**Kesimpulan:** DL-Next-7 **aman, 0 regresi turunan**. 1 gap kecil baru
ditemukan (beda scope, severity rendah) — direkomendasikan jadi
DL-Next-8, menunggu Design Lock terpisah sebelum diimplementasi.
