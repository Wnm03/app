# Fix s280 (v939) — "Cara Bayar balik ke Tunai saat edit Cicilan"

## Root cause
`editTx()` (modules/finance/transaksi.js) mencari bill terkait lewat `t.billLinkId`.
Tapi `_saveTxInner()` sengaja set `billLinkId:null` untuk cicilan tenor terakhir/1x
(lihat `sisaTenor>0?billId:null`) — jadi transaksi begini SUDAH tidak punya bill aktif,
walau `payMethod`-nya sendiri masih tercatat `'cicilan'`.

Karena `editTx()` cuma cek `billLinkId`, transaksi begini jatuh ke branch "tidak ada
bill" yang HARDCODE `setPayMethod('tunai')` — chip Cara Bayar keliatan Tunai walau
aslinya Cicilan. Kalau user cuma edit nominal/catatan lalu Simpan (tanpa sadar/sentuh
chip Cara Bayar), `_saveTxInner()` ikut menimpa `payMethod` transaksi jadi `'tunai'`
permanen.

## Fix
Tambah parameter `userInitiated` ke `setPayMethod(m, userInitiated=true)` + flag
`_txPayMethodTouchedByUser`:
- Dipanggil `true` (default) hanya saat user benar-benar tap chip Tunai/Cicilan/Rutin.
- Semua panggilan programatik di `editTx()`/`openTxModal()` pakai `false`.
- Di `_saveTxInner()`, cabang simpan generik (bukan cicilan/langganan baru) sekarang
  cuma menulis `payMethod:'tunai'` kalau `_txPayMethodTouchedByUser` true. Kalau user
  tidak pernah sentuh chip, `payMethod` asli transaksi (`existingTx.payMethod`)
  dipertahankan apa adanya.

## Hasil
- 1889/1889 test lolos.
- `_txPayMethodTouchedByUser` terverifikasi ada di bundle final.
- Versi: v939, sw cache `kw-cache-v939`.
