# FIX v1111 → v1112 — Sesi 406 — BUG-015: Date Overflow (Monthly Recurrence)

## Konteks

`Date.setMonth()` native JavaScript tidak melakukan clamp tanggal: kalau
tanggal asal tidak ada di bulan tujuan (mis. tanggal 29/30/31 sedangkan
bulan tujuan lebih pendek), JS overflow otomatis ke bulan berikutnya.
Contoh: 31 Januari + 1 bulan menghasilkan 3 Maret, bukan 28/29 Februari
seperti ekspektasi kalender pada umumnya untuk recurrence bulanan
(cicilan, langganan, tagihan, sewa).

Ditemukan 12 call site di codebase yang memakai pola native
`d.setMonth(d.getMonth()+n)` untuk menghitung tanggal jatuh tempo bulan
berikutnya (atau mundur 1 bulan saat membatalkan pembayaran).

Lihat `docs/BUG_REGISTRY.md` — BUG-015 untuk detail severity/impact.

## Perubahan

### Helper baru

- `modules/shared/features-helpers-global-security.js` — tambah
  `addMonthsClamped(base, months)`. Algoritma: geser dulu ke tanggal 1
  (`setDate(1)`) SEBELUM `setMonth()` supaya pergeseran bulan itu sendiri
  tidak pernah overflow (tanggal 1 selalu valid di bulan manapun), lalu
  hitung jumlah hari di bulan tujuan dan clamp tanggal asli ke situ.
  Mutasi in-place & return objek `Date` yang sama (bukan clone baru)
  supaya kompatibel drop-in dengan pola pemanggilan lama. Berlaku juga
  untuk `months` negatif (mundur bulan).

### Call site diganti (12 lokasi, 5 file)

| File | Lokasi/fungsi | Arah |
|---|---|---|
| `modules/business/sewakios.js` | `nextTagih()` | +1 |
| `modules/finance/tagihan-kalender.js` | revert cicilan (`revertBillFromDeletedTx`) | -1 |
| `modules/finance/tagihan-kalender.js` | revert utang (`revertBillFromDeletedTx`) | -1 |
| `modules/finance/tagihan-kalender.js` | revert langganan/tagihan freq bulanan | -1 |
| `modules/finance/tagihan-kalender.js` | `advanceBillNextDue()` | +1 |
| `modules/finance/tagihan-kalender.js` | occurrence loop kalender (range) | +1 |
| `modules/finance/tagihan-kalender.js` | occurrence loop kalender (per bulan) | +1 |
| `modules/finance/piutang-utang.js` | `defaultNextDue()` | +1 |
| `modules/finance/transaksi.js` | `onCicilanTenorSelectChange()` | +1 |
| `modules/finance/transaksi.js` | `saveTx()` cicilan baru | +1 |
| `modules/finance/transaksi.js` | `saveTx()` langganan freq bulanan | +1 |
| `modules/shared/scan-ocr.js` | `maybeOfferPaylaterReminder()` | +1 |

### Fallback wrapper `_amc015()`

4 file di atas (`tagihan-kalender.js`, `piutang-utang.js`, `transaksi.js`,
`scan-ocr.js`) dimuat berdiri sendiri oleh beberapa test lewat
`tests/helpers/loadSource.js` **tanpa** ikut memuat
`features-helpers-global-security.js` di sandbox yang sama — sehingga
`addMonthsClamped()` global tidak selalu tersedia saat file itu dites.
Setiap file diberi wrapper lokal `_amc015(base, months)`: kalau
`addMonthsClamped` global tersedia, dipakai; kalau tidak, fallback ke
implementasi identik (bukan re-implementasi logic baru, algoritma
persis sama).

`modules/business/sewakios.js` dan `modules/asset/aset.js` **tidak**
diberi wrapper — sewakios.js tidak pernah dimuat standalone oleh test
manapun, dan tidak perlu diubah sama sekali (lihat bagian dikecualikan).

### Dikecualikan dari scope (didokumentasikan, tidak diubah)

- `modules/asset/aset.js:1744` (`TimelineW.addMonthsToDate()`) — memanggil
  `d.setDate(1)` SEBELUM `setMonth()`, jadi hari selalu `1` dan tidak
  pernah overflow secara matematis. Tidak perlu fix.
- `car-notes.js:9` (`VEHTAX_ITEMS.uji.advance`) — interval "Uji
  Kelayakan" +6 bulan, bukan recurrence bulanan (`freq==='bulanan'`).
  Secara teknis tetap berisiko overflow tanggal, tapi di luar scope
  eksplisit sesi ini (recurrence bulanan). Direkomendasikan sebagai
  tindak lanjut terpisah (BUG-015b) bila diperlukan.

### Test yang perlu disesuaikan (bukan test baru)

3 file test memakai brace-counting manual untuk meng-extract fungsi
`advanceBillNextDue()` langsung dari source `tagihan-kalender.js` ke
sandbox `vm` mereka sendiri — karena `advanceBillNextDue()` sekarang
memanggil `_amc015()`, fungsi itu juga perlu ikut di-extract, kalau
tidak sandbox melempar `ReferenceError: _amc015 is not defined`:

- `tests/s285-bill-lunas-tanggal-bayar.test.js`
- `tests/s292-markbillpaid-doublepay-guard.test.js`
- `tests/s303-utang-custom-pay-amount.test.js` (2 sandbox terpisah di
  file yang sama)

Perubahan hanya menambah satu baris `extractFnSource('_amc015')` ke
snippet yang sudah ada di tiap file — tidak ada assertion/skenario test
baru yang ditambahkan.

## Verifikasi

- Algoritma clamp diverifikasi manual terhadap kasus tepi:
  - 31 Jan +1 → 28 Feb (2026, bukan tahun kabisat)
  - 31 Jan +1 → 29 Feb (2028, tahun kabisat)
  - 31 Mar -1 → 28 Feb
  - 15 Jan +1 → 15 Feb (tanpa overflow, tidak ke-clamp)
  - 30 Apr +1 → 30 Mei
  - 31 Des +1 → 31 Jan (lintas tahun)
  - 31 Jan -1 → 31 Des (lintas tahun, mundur)
- `node --test tests/*.test.js` → **2721 pass / 0 fail**.
- `node scripts/build.js s406-bug015-date-overflow-clamp` → sukses,
  8 file source disinkronkan ke label versi `s406-bug015-date-overflow-clamp`,
  `?v=` di `index.html`/`app_production.html` naik dari `1111` → `1112`,
  `CACHE_NAME` di `sw.js` → `kw-cache-v1112`, kedua bundle
  (`app-bundle-a.min.js`/`app-bundle-b.min.js`) lolos cek sintaks
  (`node --check`).

## Business logic

Tidak ada perubahan business logic selain mekanisme penambahan/
pengurangan bulan itu sendiri. Tidak ada refactor lain di luar scope
BUG-015.
