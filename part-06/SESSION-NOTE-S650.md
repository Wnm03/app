# Sesi S650 — Fix BUG-013 (_emergencyFundRisk saldo Dana Darurat real-time)

## Konteks

Ini item terakhir Blok D rencana awal (S652/S653 di
`RENCANA-IMPLEMENTASI-S646-S664.md`). BUG-009/010/011/012 sudah tuntas di
sesi-sesi sebelumnya (S647–S649 + audit source S646), jadi urutan aktual
sesi loncat langsung ke sini.

## Masalah

**File:** `modules/finance/financial-risk-dashboard-api.js` —
`_emergencyFundRisk()`

Helper ini cek status "Target Dana Darurat" langsung dari `D.targets`,
pakai `dd.saved` MENTAH untuk bandingkan terhadap `dd.amount`. Untuk
target yang **tertaut ke akun** (`dd.accountId` terisi), `dd.saved` cuma
snapshot manual yang bisa STALE — saldo akun sebenarnya sudah
naik/turun lewat transaksi berjalan, tapi field `saved` tidak ikut
ter-update otomatis tanpa aksi eksplisit (lihat komentar
`DanaDaruratAI.updateSaved()` di `modules-calc.js`: "Target ini tertaut
ke akun, saldo ikut otomatis dari akunnya" — yang "otomatis" itu artinya
harus dibaca lewat `recalcAccBalance()`, bukan dari field `saved`).

Akibatnya Financial Risk Dashboard bisa salah menampilkan warning "Dana
Darurat belum tercapai" padahal saldo akun real sudah capai/lewat target
(atau sebaliknya, tidak flag warning padahal saldo real belum cukup).

## Fix

`_emergencyFundRisk()` sekarang menghitung `saved` lewat:
```js
const saved = (dd && dd.accountId && typeof recalcAccBalance === 'function')
  ? recalcAccBalance(dd.accountId)
  : (dd ? (dd.saved || 0) : 0);
```
— reuse pola SAMA PERSIS `DanaDaruratAI.currentSaved()` (modules-calc.js)
/ `invest-ai-widget.js._checkDanaDarurat()`. Target tanpa `accountId`
(saldo manual) tetap fallback ke `dd.saved` apa adanya — 0 regresi. 0
rumus baru, cuma sumber `saved` yang benar dipakai juga di titik ini.

## Test

`tests/s650-emergencyfundrisk-realtime-balance.test.js` (5 test, semua
pass):
1. Target tertaut akun, `dd.saved` stale rendah tapi saldo akun real
   sudah capai target → `[]` (tidak ikut angka basi).
2. Target tertaut akun, saldo real belum capai target → 1 warning,
   persen dihitung dari saldo real (bukan `dd.saved`).
3. Target TIDAK tertaut akun → tetap pakai `dd.saved` apa adanya (0
   regresi, `recalcAccBalance` tidak dipakai sama sekali).
4. Target tertaut akun tapi `recalcAccBalance` belum dimuat (guard
   `typeof`) → fallback ke `dd.saved`, tidak throw.
5. Saldo real pas sama dengan target → `[]` (batas `>=`, 0 regresi
   kondisi tepi).

Test lama `tests/financial-risk-dashboard-api.test.js` (9 test, semua
pakai target tanpa `accountId`) tetap pass tanpa perubahan — dikonfirmasi
0 regresi.

**Full suite:** `node --test tests/*.test.js` → **4653/4653 pass** (4648
sebelumnya + 5 baru), 0 fail.

## File yang berubah (patch-only)

```
modules/finance/financial-risk-dashboard-api.js                (edit)
tests/s650-emergencyfundrisk-realtime-balance.test.js           (baru)
```

## Sesi berikutnya (rekomendasi)

Blok D (BUG-012/013) sekarang tuntas. Semua bug P1/P2 dari daftar awal
(BUG-006 s/d BUG-013) sudah fix di source. Rekomendasi urutan berikutnya:

1. **Stale-doc cleanup** — `TODO.md` masih menandai BUG-006/007/009/010/
   011/012/013 sebagai OPEN padahal semua sudah DONE di source (dicek
   audit S646 + sesi S647–S650 ini). Sesi kecil khusus update tabel TODO
   supaya tidak menyesatkan audit berikutnya.
2. Lanjut **Blok E — Data Health** (backup 2026-08-16): S654 Pemilik
   Sumber Potongan hilang (8 warning), S655 Aset "Majoris" kepemilikan
   ganda, S656 Item Renovasi akun tidak valid (7 warning), S657 Anggaran
   "Pulsa/Kuota" kategori tidak valid — tapi **cek dulu status masing2
   langsung ke source/data** (pola sama audit S646), karena beberapa
   kemungkinan juga sudah tertangani duluan.
