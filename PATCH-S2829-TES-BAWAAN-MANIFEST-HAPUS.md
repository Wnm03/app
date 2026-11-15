# PATCH S2829 — 3 tes gagal bawaan zip dibereskan + audit kategori bawaan Renovasi (AKUMULATIF S2821 s/d S2829)
Dasar: S2828 (build 2844) -> build 2846.

## 3 tes gagal bawaan (S1780, s1608, S2308)
Penyebab: 5 file lama yang sudah pensiun di `DELETE-FILES.txt` masih ikut di zip app-main (zip patch tidak bisa menghapus file), jadi tes penjaga "file ini harus sudah dihapus" gagal. BUKAN bug kode.
Perbaikan: `node scripts/apply-delete-manifest.js` (= `npm run apply-delete-manifest`) di app-main. Hapus:
- modules/modals.js
- modules/shop/modals.js
- modules/asset/features-helpers-global-security.js
- modules/finance/features-helpers-global-security.js
- modules/shop/features-helpers-global-security.js
Bundle tidak berubah isinya (file itu tidak masuk bundle; hanya penanda versi build yang naik). **Terapkan patch ini lalu jalankan `npm run apply-delete-manifest` sekali** (zip tidak bisa membawa penghapusan). `DELETE-FILES.txt` ikut di zip.

## Kategori bawaan Renovasi untuk cicilan dari form Transaksi — tidak perlu perubahan
Panel "Catat juga ke Proyek Renovasi" hanya muncul bila kategori pengeluaran terdeteksi `isRenovCatName` (transaksi.js), jadi bill cicilan dari form Transaksi selalu membawa kategori Renovasi pilihan user (`category:cat`), dan cicilan berikutnya lewat markBillPaid memakai kategori bill itu. Fallback `renovBillDefaultCategory()` (S2825) hanya relevan untuk bill dari form Tagihan yang tak punya kategori.

## Tes & gerbang
Suite penuh hijau tanpa kegagalan bawaan; verify-bundle-freshness, verify-window-expose, `build --require-minify` OK.
