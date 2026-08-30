# S621 — Audit bug serupa: toast menutupi tombol di SEMUA titik ganti sub-tab (lanjutan S619)

Setelah fix S619 (toast menutupi tombol di tab Investasi via `setAsetTab`), diaudit apakah
pola bug yang sama ada di titik lain. Root cause S619: `toast()` murni berbasis waktu, tidak
tahu kalau tab/sub-tab sudah berganti — cuma dibersihkan di titik navigasi yang secara
eksplisit memanggil `dismissAllToasts()` (S619 baru menambahkannya di `showPage()` &
`setAsetTab()`).

## Temuan

Codebase sendiri sudah menandai pola ini berulang lewat komentar "pola SAMA PERSIS dgn
setAsetTab/setKeuanganTab/setShopTab/setCnTab/setPajakTab dst" di 10 fungsi lain — semuanya
toggle sub-tab/pane di DALAM satu halaman yang sama (jadi TIDAK lewat `showPage()`, yang
artinya fix S619 di `showPage()` tidak menjangkau titik-titik ini). Dicek satu-satu: tidak
ada satupun yang sudah memanggil `dismissAllToasts()` sebelum sesi ini — bug serupa
dikonfirmasi ada di semua titik berikut:

| # | Fungsi | File | Konteks |
|---|--------|------|---------|
| 1 | `setSettingsTab` | `modules/shared/pengaturan-search.js` | sub-tab halaman Settings |
| 2 | `setKeuanganTab` | `modules/finance/tx-list-cashflow.js` | tab utama halaman Uang |
| 3 | `setLaporanTab` | `modules/finance/tx-list-cashflow.js` | sub-tab Laporan (dlm Uang) |
| 4 | `setKelolaTab` | `modules/finance/tx-list-cashflow.js` | sub-tab Kelola (dlm Uang) |
| 5 | `setBillListTab` | `modules/finance/tagihan-kalender.js` | filter Bayar/Lunas Tagihan |
| 6 | `setShopTab` (+alias `setCobekTab`) | `modules/shop/cobek-io.js` | tab utama halaman Shop |
| 7 | `setCnTab` | `modules/vehicle/vehicle-core.js` | tab utama Car Notes |
| 8 | `setCnInsightTab` | `modules/vehicle/vehicle-core.js` | sub-tab Insight AI (dlm Car Notes) |
| 9 | `setCnBbmTab` | `modules/vehicle/vehicle-core.js` | sub-tab BBM (dlm Car Notes) |
| 10 | `setPajakTab` | `pajak-aset-ui-wrappers.js` | tab utama halaman Pajak |
| 11 | `setPjkTab` | `pajak-aset-ui-wrappers.js` | sub-tab PPh21/PBB (dlm Pajak) |

Contoh skenario nyata: simpan transaksi di sub-tab Kelola (toast "Tersimpan ✅" muncul) →
user langsung tap sub-tab Laporan → toast lama masih tampil, menutupi kartu/tombol di
Laporan. Sama persis polanya dengan tab Investasi di S619, cuma domainnya beda.

## Fix

Tambah `if(typeof dismissAllToasts==='function')dismissAllToasts();` di baris paling awal
tiap 11 fungsi di atas — sebelum toggle pane, pola identik dengan fix `setAsetTab()` di
S619. 0 perubahan logic render/DOM lain, 0 fungsi baru (reuse penuh `dismissAllToasts()`
dari `modules/shared/format-tema.js`, S619).

## Cakupan yang SENGAJA belum disentuh

- `selectVehicle()` (vehicle-core.js) — ganti kendaraan aktif via chip selector, bukan ganti
  tab/pane (tidak toggle `u-dnone` antar section berbeda), render ulang konten yang SAMA di
  tempat yang sama. Risiko toast menutupi tombol jauh lebih rendah krn tidak ada pane baru
  yang "muncul dari bawah toast" — di-skip sesi ini, bisa diaudit terpisah kalau ada laporan.
- Ikon search header (🔍 sebelah ⚙️ Settings) — masih ditunda sesuai arahan user di S619,
  belum ada bukti/reproduksi.

## Test & Build

- `node --test tests/*.test.js` → 4920/4920 pass, 0 fail.
- `node scripts/build.js` → sukses, versi s619 → s620, sintaks kedua bundle valid.
