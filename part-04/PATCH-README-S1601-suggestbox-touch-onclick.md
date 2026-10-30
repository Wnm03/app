# S1601 — Fix: item suggest-box tidak terisi saat di-tap di HP (WebView touch)

## Bug
Dropdown kategori/subkategori (dan suggest-box lain: pName, prName, billName,
stockName, sparepartName, bbmSpbu, txNote, dll) sudah muncul saat field
di-tap, tapi tap di salah satu ITEM di dalam dropdown tidak mengisi field —
seolah tidak ngapa-ngapain.

## Root cause
Item suggest-box pakai pola `onmousedown="event.preventDefault();select...()"`.
Pola ini rapuh di WebView Android/iOS karena sebagian WebView tidak konsisten
menyintesis event `mousedown` dari tap sentuh (urutan idealnya
touchstart→touchend→mousedown sintetis→blur, tapi mousedown-nya sendiri kadang
tidak pernah terjadi). Akibatnya handler `onmousedown` tidak pernah terpanggil,
padahal delay hide-on-blur 150ms (`_txCatOnBlur`/`_txSubCatOnBlur`/inline
`onblur=setTimeout(...)`) sebenarnya sudah didesain untuk kasih waktu ke
`mousedown`.

## Fix
Ganti handler item suggest-box dari `onmousedown+preventDefault` ke `onclick`.
`click` adalah event yang HAMPIR SELALU disintesis dari tap di semua WebView
(beda dengan mousedown sintetis yang tidak konsisten), dan delay 150ms yang
sudah ada tetap cukup memberi waktu untuk `click` (yang notabene terjadi lebih
lambat dari mousedown di urutan event standar, tapi masih jauh di bawah 150ms).

Cukup 4 titik generator yang perlu diubah (bukan puluhan field terpisah),
karena `simpleAutocompleteInput()` dipakai bareng oleh banyak field:

- `modules/finance/transaksi.js`
  - `onTxCatInput()` — item kategori (txCat) + tombol "➕ Tambah kategori baru"
  - `onTxSubCatInput()` — item subkategori (txSubCat)
  - `simpleAutocompleteInput()` — generator generik, dipakai oleh: pName,
    prName, billName, stockName, sparepartName, bbmSpbu, txBbmSpbu, txNote,
    stockCode, sparepartCode, txShopSaleCustName/Phone/Addr, dan field
    suggest-box lain yang memanggil fungsi ini
- `modules/shop/cobek-order.js`
  - generator `selectShopCustomer` (nama pelanggan cobek)

Blur-hide 150ms delay DIBIARKAN apa adanya — tidak ada perubahan di situ.

## Yang perlu di-upload
Semua file di ZIP ini (bukan cuma transaksi.js/cobek-order.js) — bundle
app-bundle-a.min.js & app-bundle-b.min.js serta file versi lain ikut berubah
karena proses build (`node scripts/build.js`) menaikkan versi ke **v1601**
(dari v1600) dan menyinkronkan konstanta versi di beberapa file.

**Catatan:** bundle di ZIP ini BELUM diminify (esbuild tidak tersedia di
environment build). Kalau mau ukuran bundle sekecil versi sebelumnya, jalankan
`npm install --save-dev esbuild` lalu `node scripts/build.js` ulang di
environment yang punya akses internet sebelum rilis — hasilnya tetap valid
kalau tidak, cuma lebih besar filenya.

## Verifikasi
- Full test suite: 5809/5812 passing. 3 fail adalah SA16 gate pre-existing di
  `modules/modules-render.js` (bukan file live `modules-render-b.js`, hasil
  merge lama S697) — tidak terkait perubahan ini, sudah ada sebelum patch.
- Build resmi lolos (`node scripts/build.js`), sintaks kedua bundle valid.
- **BELUM direproduksi di HP asli** — mohon dites langsung di device (bukan
  cuma browser desktop) sebelum dianggap fixed permanen.
