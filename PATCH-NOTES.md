# PATCH-NOTES — Fix Migrasi Kendaraan ke Holding (2026-08-29)

## Ringkasan
Fix bug #2 dari audit user: aset non-investasi (mis. Kendaraan) yang diisi
field generik "Harga Beli/Unit" + "Jumlah Unit" ikut ke-migrasi otomatis ke
Holding Investasi lewat `migrateAssetInvestmentsToHoldings()`.

## Root cause
`modules/asset/aset-misc.js` — filter kandidat migrasi menghitung
`buku = a.hargaBeli * a.jumlahUnit` tanpa mengecek `a.jenis` dulu di jalur
utama. Field "Harga Beli/Unit" & "Jumlah Unit" di `assetModal` bersifat
generik (tampil di semua jenis aset), bukan eksklusif investasi. Akibatnya
Kendaraan (atau jenis lain di luar mapping investasi) yang kebetulan diisi
kedua field itu ikut lolos jadi kandidat, ke-`Investment.addHolding()` dengan
`type` fallback `'Lainnya'`, dan hilang dari Buku Aset
(`_migratedToInvestmentId`).

## Fix
Tambah `.filter(a=>!!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis])` di filter
kandidat, SEBELUM `buku` dihitung — menyamakan gate jenis yang sudah dipakai
di fallback `buku=a.nilai` beberapa baris di bawahnya. Sekarang hanya aset
berjenis investasi yang dikenal (Kripto/Reksadana/Saham/Deposito-Investasi/
Emas-Logam-Mulia) yang bisa jadi kandidat migrasi.

## File yang berubah
- `modules/asset/aset-misc.js` (fix inti + komentar penjelasan)
- `tests/s476a-migrate-investasi-to-holdings.test.js` (+2 test regresi:
  Kendaraan & Elektronik dgn hargaBeli+jumlahUnit terisi harus TIDAK
  termigrasi)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`,
  `index.html`, `sw.js` — hasil `node scripts/build.js`, versi naik ke 1446
- `docs/CLAUDE.md`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Verifikasi
- Test suite terkait: pass (termasuk 2 test baru).
- Full suite: **4901/4901 pass**, 0 gagal, 0 regresi.
- Build sukses, sintaks bundle lolos `node --check`.

## PENTING — cara pakai
Migrasi ini `_migratedToInvestmentId`-nya **aditif & tidak reversibel
otomatis** untuk kendaraan yang SUDAH terlanjur ke-migrasi sebelum patch ini
naik. Fix ini cuma mencegah migrasi BARU — kendaraan yang sudah kadung jadi
Holding (flag `_migratedToInvestmentId` sudah terset + entri sudah ada di
`D.investments`) TIDAK otomatis dikembalikan. Kalau ada data user yang sudah
kena bug ini, perlu langkah manual/skrip migrasi-balik terpisah (belum
dibuat sesi ini) — cek dulu apakah user punya kasus itu sebelum deploy.

## Bug #1 (klik holding tidak respon) — BELUM di-fix
Masih menunggu konfirmasi user: apakah muncul toast pas tap item holding hasil
migrasi, atau benar-benar 0 reaksi. Lihat detail di `docs/CLAUDE.md` sesi ini.

## Bug #1 (klik holding 0 reaksi) — SEKARANG DIKERJAKAN

### Root cause
`InvestmentListUI._renderList()` (`modules/asset/investasi-list-view.js`)
membangun HTML lewat `holdings.map(...)` TANPA try/catch per-baris. Kalau
SATU holding bikin salah satu hitungan (`holdingValue`/`holdingGainLoss`/
`holdingROI`/`investmentCrossCheckWarning`) throw, exception itu merambat
keluar SEBELUM `el.innerHTML=...` sempat jalan. Fungsi ini dipanggil
langsung dari `render()`/`setAsetTab()` — BUKAN lewat dispatcher data-action
yang punya try/catch+toast — jadi error itu tidak pernah ditangkap/di-toast.
Efeknya: list tetap menampilkan HTML dari render sukses SEBELUMNYA (row
tampak normal dgn `data-action` yang "benar" secara visual), tapi render
TERBARU tidak pernah ter-apply — persis gejala "kelihatan normal, tap = 0
reaksi, 0 toast" yang dilaporkan.

### Fix
Bungkus hitungan per-holding dgn try/catch di `_renderList()`. Holding yang
gagal dihitung fallback ke nilai aman (0) dan tetap dirender sbg row yang
BISA di-tap (dgn badge ⚠️ penanda), bukan menjatuhkan seluruh render list.

### File berubah (tambahan sesi ini)
- `modules/asset/investasi-list-view.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`,
  `index.html`, `sw.js` — build ulang, versi naik ke 1447
- `docs/CLAUDE.md`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

### Test
Tidak ada test otomatis baru untuk fix ini — fungsi menyentuh DOM
(`document.getElementById`), di luar cakupan harness `loadSource.js` sesuai
konvensi proyek yang sudah ada. Full suite (4901 test) tetap dijalankan
ulang & 0 regresi.

### Catatan penting
Ini adalah *hardening* berbasis analisis kode terbaik yang bisa dilakukan
tanpa akses langsung ke device. Kalau setelah update ini tap masih 0 reaksi,
kemungkinan besar bukan dari `_renderList()` — aktifkan "Debug Console" di
Pengaturan (toast error akan menunjukkan lokasi persis) atau cek apakah ada
overlay/CSS lain yang menutupi area tap.

## Deploy
Upload SEMUA file yang berubah di ZIP ini (bukan cuma HTML/sw.js) ke
server/VPS, lalu redeploy PWA seperti biasa.
