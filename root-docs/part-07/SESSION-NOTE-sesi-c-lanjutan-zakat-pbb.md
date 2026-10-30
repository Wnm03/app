# Session Note — Sesi C-lanjutan: Zakat/PBB (`finance.updated` kind "zakat" + "tagihan" source:"pbb")

## Permintaan user

"lanjut" — melanjutkan dari sesi Akun (`account.updated`, v1640).
Rekomendasi di session note sebelumnya: lanjut ke item Prioritas Sedang,
mulai dari yang paling mirip pola yang sudah terbukti — dipilih
**Zakat/PBB** (`pajak-pbb-zakat.js`).

## Audit awal

`grep -n "save();" modules/finance/pajak-pbb-zakat.js` → 9 titik,
cocok dgn temuan `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md`. Ditelusuri
satu-satu, dipisah jadi 2 kelompok:

**Aksi diskrit (layak emit, 3 titik):**
- `PBB.ikatTagihan()` — 2 cabang (create tagihan baru / update
  existing) — nulis `D.bills`, analog persis `tagihan-kalender.js`.
- `Zakat.catatDibayar()` — nulis `D.pajakZakat.zakatLog` +
  `D.transactions` (transaksi pengeluaran zakat nyata).
- `Zakat.delLog()` — hapus 1 entry log zakat.

**Dipicu render/kalkulasi berulang (SKIP, 6 titik):** `PBB.hitung()`,
`Zakat.hitungMaal()`, `RefAI.check()` (timestamp saja), `RefAI.
applySelected()` (lebih ke update setting referensi global daripada
transaksi individual — dipertimbangkan lagi kalau ada permintaan
eksplisit), `PPh21.hitung()`. Keenam titik ini terpanggil OTOMATIS tiap
kali fungsi render terkait jalan (bukan hanya saat user benar2
melakukan aksi) — emit di sini akan membanjiri konsumen event dgn
notifikasi palsu tiap render, jadi SENGAJA dilewati (kriteria sama
dgn "rendah" yang dipakai metode audit §4 aslinya, dan sama dgn
keputusan skip `quickToggleInclude()` di sesi Akun sebelumnya).

## Implementasi

3 titik emit baru di `modules/finance/pajak-pbb-zakat.js`, semua
di-guard `typeof AIBus!=="undefined"`:

1. `PBB.ikatTagihan()` cabang edit → `finance.updated {kind:"tagihan",
   action:"edit",billId,amount,source:"pbb"}`
2. `PBB.ikatTagihan()` cabang create → `finance.updated {kind:"tagihan",
   action:"create",billId,amount,source:"pbb"}` (id baru diambil lewat
   variabel lokal `_newPbbBillId`, pola sama persis `_newBillIdSesiC`/
   `_savedPiutangIdSesiC` sesi-sesi sebelumnya)
3. `Zakat.catatDibayar()` → `finance.updated {kind:"zakat",
   action:"create",jenis,amount}`
4. `Zakat.delLog()` → `finance.updated {kind:"zakat",action:"delete",
   deletedId}`

**Kind BARU**: `"zakat"` — belum ada presedennya sebelum sesi ini,
payload konsisten skema `kind:"piutang"/"tagihan"/"transaksi"` dst yang
sudah ada (tidak ada struktur event baru yang diciptakan, cuma nilai
`kind` baru).

## Verifikasi

- Test baru `tests/pajak-pbb-zakat-aibus-emit-sesi-c.test.js` — 5 test,
  semua pass. Harness reuse helper `makeD()`/`makeDoc()`/`autoEl()` dari
  `tests/pajak-pbb-zakat-crud.test.js` yang sudah ada (0 helper baru
  diciptakan dari nol), + AIBus event collector pola sama sesi-sesi
  sebelumnya.
- Full suite: **6324/6326 pass** (base 6319/6321 + 5 test baru). 2
  gagal — dikonfirmasi PRE-EXISTING (`verify-release-ready` end-to-end
  eslint-override test, `txHTML()` virtual-bill S468d — identik dgn 2
  kegagalan yg sudah dikonfirmasi di sesi Akun sebelumnya, 0 regresi
  baru).
- `node scripts/build.js`: **lolos bersih di percobaan pertama** (beda
  dari sesi Akun sebelumnya yang sempat kena version-marker basi —
  kali ini build langsung dijalankan tepat setelah source berubah,
  jadi tidak sempat ada drift). Versi naik `1640` → **v1641**.
- `node scripts/verify-release-ready.js`: LOLOS, 2 override
  `lint`/`minify` (sandbox tanpa akses npm/esbuild, konsisten).

## Isi ZIP patch ini

Kumulatif dari SEMUA sesi sejak rekonsiliasi v1639 (Sesi E1-E6, F1,
Akun `account.updated`, dan Zakat/PBB ini) — overlay di atas
`app-main__76_.zip`, BUKAN full checkout. `CHANGELOG.md` dalam ZIP
tetap ringkasan skala-patch (bukan `CHANGELOG.md` proyek utuh), perlu
di-prepend manual ke `CHANGELOG.md` produksi nyata saat digabung.

## Yang SENGAJA belum dikerjakan (backlog sesi berikutnya)

Dari Prioritas Sedang audit, sisa setelah sesi ini:

- Dana Titipan (6 file: `titipan-sync.js`, `titipan-reconcile.js`,
  `titipan-expense-flow.js`, `dana-titipan-*.js` — kandidat event
  `titipan.updated`, belum ada presedennya, scope PALING besar dari
  sisa domain — disarankan dipecah lagi jadi beberapa sesi kecil kalau
  giliran domain ini)
- Shop/Cobek produk-stok (`cobek-io.js`, `cobek-pricing.js`,
  `cobek-etalase.js`, `tx-cobek.js`)
- `investasi.js` dasar (perlu ditelusuri method mana yg belum lewat
  3 file view yg sudah emit `investment.updated`)
- Aset non-core (`aset-misc.js`, `aset-emas-impor.js`,
  `aset-reports.js`)
- Wiring listener `AIService.wireEvents()` ke event2 baru
  (`account.updated`, `finance.updated{kind:"zakat"}`) — masih 0%
  (catatan lama dari `AUDIT-AI-WIRING-GAP.md`, belum disentuh sesi
  manapun)
- Sesi B (Fase 1 poin 2) & Sesi D (Master Database) — di luar fokus
  Sesi C, tetap tidak disentuh

## Rekomendasi lanjutan

Domain berikutnya yang polanya paling mirip yang sudah terbukti:
Shop/Cobek produk-stok (`cobek-io.js` dkk) — scope-nya lebih kecil dari
Dana Titipan, cocok jadi sesi ringan berikutnya sebelum masuk Dana
Titipan yang lebih besar.
