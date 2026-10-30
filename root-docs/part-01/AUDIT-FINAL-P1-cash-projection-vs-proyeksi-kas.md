# Audit Final P1 — `p1-cash-projection` vs `p1-proyeksi-kas`

Konteks: dua zip patch Sesi P1 diupload terpisah (`kw_patch_sesi-p1-cash-projection.zip`
dan `kw_patch_sesi-p1-proyeksi-kas.zip`), masing-masing implementasi lengkap
`modules/finance/cash-projection.js` + test sendiri, ISI BEDA (bukan revisi satu sama
lain). Keduanya klaim sudah lolos audit P0 dan test masing-masing 100% pass. Audit ini
memutuskan mana yang jadi baseline final sebelum Sesi P2 (UI card) dibangun di atasnya.

## Metode

Menjalankan kedua fungsi `isGajiTransaction(t)` terhadap **1128 transaksi asli**
(bukan data sintetis) dari `backup-keluarga-W-2026-08-27-fixed.json`, lalu
membandingkan hasil deteksinya terhadap ground truth (transaksi `subcategory:"Gaji
toko"` — pola gaji nyata terbesar user, 84 transaksi, total Rp 55.229.569).

## Temuan

| Versi | Kriteria deteksi | Gaji terdeteksi | vs ground truth (84 tx) |
|---|---|---|---|
| `p1-cash-projection` | `note` match `/gaji/i` **ATAU** `category` match `/gaji/i` | 8 tx (Rp 5.892.569) | **Meleset 76/84 (90%)** |
| `p1-proyeksi-kas` | `category` **ATAU** `subcategory` **ATAU** `note` match `/gaji/i` | 84 tx (Rp 55.229.569) | **Tepat 84/84 (100%)** |

Akar masalah `p1-cash-projection`: transaksi gaji asli user tersimpan dengan
`category:"Penghasilan"`, `subcategory:"Gaji toko"`, `note` **kosong**. Karena
versi ini tidak pernah mengecek `subcategory`, dan `category`-nya ("Penghasilan")
tidak match `/gaji/i`, dan notenya kosong — 76 dari 84 transaksi gaji riil lolos
tidak terhitung sama sekali. Session note zip itu sendiri mengklaim "8/8 gaji riil
user ini tercatat kategori Penghasilan, bukan Gaji, note pola 'Gaji mingguan dari
absensi...'" — klaim ini **tidak cocok** dengan isi backup asli (yang ditemukan
justru 84 tx `subcategory:"Gaji toko"` bernote kosong, bukan 8 tx bernote gaji).
Sepertinya audit P0 versi ini dijalankan terhadap data lain / asumsi yang tidak
diverifikasi ulang terhadap backup final.

`p1-proyeksi-kas` session note-nya, sebaliknya, mencantumkan angka yang **cocok
persis** dengan pengecekan ulang audit ini: 84 tx `Gaji toko`, 43 tx `H`, 31 tx
`Tambahan`, 7 tx `Bonus toko` — semuanya diverifikasi ulang di audit ini dan
angkanya sama persis.

Logika `sisaKewajiban`/`kewajibanSisa` (perhitungan sisa kewajiban terjadwal)
di kedua versi **secara fungsional setara** — sama-sama skip bill yang
`getBillPaidThisPeriodInfo()!=null` per-bill (bukan `monthTotal - dibayar` naif),
jadi tidak ada trade-off di sisi ini.

## Keputusan

**`p1-proyeksi-kas` dipilih sebagai baseline final Sesi P1.** Alasan: satu-satunya
kriteria yang menentukan benar/salahnya proyeksi kas (deteksi gaji) diverifikasi
langsung terhadap data produksi nyata, bukan diasumsikan.

## Konflik yang mengikutinya & resolusi

Sesi P2 (kartu UI Dashboard) ternyata ditulis melawan skema field
`p1-cash-projection` (`gajiProjected`, `kewajibanSisa`), BUKAN skema field
`p1-proyeksi-kas` (`proyeksiGaji`, `sisaKewajiban`). Daripada menulis ulang
kartu P2 (dan berisiko regresi ke wiring `DASH_CARD_DEFS` yang sudah teruji),
`cash-projection.js` versi `proyeksi-kas` yang dipakai (logic benar) ditambah
**field alias** di `return` `getMonthlyCashProjection()`:

```js
gajiProjected: proyeksiGaji,
gajiTercatat: recordedGaji,
gajiPending: pendingGajiEstimate,
kewajibanSisa: sisaKewajiban,
kewajibanTerjadwal: billMonthTotal,
```

0 logika baru — nilai identik, cuma nama field dobel supaya kartu P2 tetap
jalan tanpa modifikasi. Didokumentasikan inline di source dgn referensi ke
dokumen ini.

## File final yang dipakai

- `modules/finance/cash-projection.js` — dari `p1-proyeksi-kas`, + alias field di atas.
- `tests/cash-projection-p1.test.js` — dari `p1-proyeksi-kas` (14 test, semua terhadap
  skema field asli `proyeksiGaji`/`sisaKewajiban`, alias tidak perlu test terpisah
  karena 0 logika baru).
- `scripts/build.js` (daftar `GROUP_B`) — dari `p1-proyeksi-kas`.
- Zip `p1-cash-projection` **tidak dipakai sama sekali** di baseline final —
  disimpan sbg riwayat/pembanding audit ini saja.
