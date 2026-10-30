# S1602 — Fix lanjutan: item suggest-box tetap tidak terisi meski sudah onclick (S1601)

## Kenapa S1601 (onclick) belum cukup
Video reproduksi di HP asli (Android, Brave) nunjukin: tap di item "Jajan —
Makan" TERDETEKSI (item sempat ke-highlight/pressed state abu-abu), tapi field
Subkategori tetap kosong & keyboard langsung nutup di frame berikutnya (< 100ms).

Root cause sebenarnya: `preventDefault()` di handler `mousedown` ATAU `click`
tidak pernah bisa mencegah default action blur/tutup-keyboard dari SENTUHAN
aslinya — default action touch cuma bisa dicegah dari handler `touchstart`
atau `touchend` itu sendiri. Jadi urutan yang terjadi: `touchstart` pada item →
browser proses default action-nya duluan (blur input → keyboard mulai
nutup → viewport reflow/scroll) → baru setelah itu `touchend`/`click` mau
diproses, tapi target sudah keburu bergeser oleh reflow atau box sudah
kepacu ke-hide → seleksi gagal, sama seperti sebelum S1601.

## Fix
Setiap item suggest-box sekarang punya DUA handler:
- `onclick="select...()"` — tetap ada, fallback untuk mouse/desktop
- `ontouchstart="event.preventDefault();select...()"` — BARU, ini yang jadi
  penentu di HP: `preventDefault()` di titik ini beneran mencegah blur/tutup-
  keyboard sebelum terjadi, DAN langsung menjalankan fungsi seleksi saat itu
  juga (tidak nunggu touchend/click). Karena default touchstart di-cegah,
  event mouse turunan (mousedown/click) otomatis dibatalkan browser — jadi
  di device sentuh cuma `ontouchstart` yang jalan, tidak dobel dengan onclick.

Titik yang diubah — sama seperti S1601 (4 generator, bukan per-field manual):
- `modules/finance/transaksi.js`: `onTxCatInput()`, `onTxSubCatInput()`,
  `simpleAutocompleteInput()` (dipakai bareng pName/prName/billName/
  stockName/sparepartName/bbmSpbu/txNote/dll)
- `modules/shop/cobek-order.js`: generator `selectShopCustomer`

Blur-hide 150ms delay tetap dipertahankan sbg fallback (tidak dihapus).

## Yang perlu di-upload
Semua file di ZIP ini — versi naik ke **v1602** (dari v1600 asli / v1601 yang
kemarin belum terbukti cukup). Kalau v1601 sempat di-upload, timpa semua
dengan v1602 ini.

**Catatan:** bundle belum diminify (esbuild tidak tersedia di environment
build sandbox) — install `esbuild` lokal & build ulang kalau mau ukuran kecil,
hasilnya tetap valid tanpa itu, cuma lebih besar filenya.

## Verifikasi
- Full test suite: 5809/5812 passing (3 fail SA16 gate pre-existing, sama
  seperti S1601, tidak terkait perubahan ini)
- Build resmi lolos, sintaks kedua bundle valid, versi v1602

## PENTING
Fix S1601 (onclick) BELUM terbukti gagal karena diuji langsung — video yang
dipakai buat diagnosis ini kemungkinan masih menguji versi lama (v1600) yang
live di wnm03.github.io, bukan v1601. Jadi S1602 ini adalah penguatan
preventif berdasarkan analisis mekanisme touch event, BUKAN hasil ngoding-buta
tanpa dasar — tapi tetap **wajib direproduksi ulang di HP asli setelah upload
v1602** buat konfirmasi final, karena belum ada video yang menguji v1601/v1602
secara langsung.
