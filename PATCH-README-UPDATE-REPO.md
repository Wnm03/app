# Patch update repo — Ghost Asset "Majoris" + Bersihkan Aset Ghost (S592)

ZIP ini HANYA berisi file yang berubah/baru dibanding repo GitHub Anda
saat ini (`app-main__13_.zip`), hasil audit `diff -rq` penuh terhadap
seluruh isi repo. Semua bundle sudah di-build ULANG dari source
(`node scripts/build.js`), bukan tempel manual — jadi 2 file bundle di
sini sudah final dan berisi SEMUA fix di bawah sekaligus.

## Fix #1 — Aset investasi baru tidak sync ke Holding
`migrateAssetInvestmentsToHoldings()` (`modules/asset/aset-misc.js`) dulu
mensyaratkan field opsional "Modal Investasi"/"Harga Beli+Jumlah Unit"
terisi. Kalau user cuma isi "Estimasi Nilai Saat Ini" saja (field itu
memang ditandai opsional), aset tidak pernah bermigrasi ke tab Investasi
tanpa indikasi error apa pun.
**Fix**: fallback `buku=nilai` kalau jenis aset termasuk kategori
investasi (Kripto/Reksadana/Saham/Deposito-Investasi/Emas) dan `nilai>0`.

## Fix #2 — Ghost asset "Majoris" dobel di dropdown Multi-Owner
`getMultiOwnerAssets()` (`modules/finance/piutang-utang.js`) tidak
menyaring record yang sudah bermigrasi (`_migratedToInvestmentId`),
jadi record lama tetap muncul berdampingan dengan Holding barunya di
dropdown "Kaitkan ke Aset Multi-Owner" — tampak dobel.
**Fix**: tambah guard `if(a._migratedToInvestmentId)return false;` di
awal filter.

## Fix #3 (baru, S592) — Kartu "🧹 Bersihkan Aset Ghost (Migrasi)"
Fix #2 di atas cuma menyaring dari TAMPILAN dropdown — record ghost lama
tetap tersimpan permanen di data, sebelumnya cuma bisa dibuang manual
lewat Backup/Restore (export JSON → hapus objek → restore).
**Fitur baru**: 1 kartu di Settings → tab Kepemilikan yang menampilkan
semua record ghost + tombol hapus permanen per baris. 0 logic hapus baru
ditulis — delegasi penuh ke `Aset.delete()` yang sudah ada (sudah
termasuk cascade cleanup `D.debts` terkait). Kartu otomatis sembunyi
kalau tidak ada yang perlu dibersihkan.
File baru: `modules/shared/ghost-asset-cleanup-ui.js`,
`tests/s592-ghost-asset-cleanup-ui.test.js`.

## Housekeeping (ditemukan saat verifikasi S592, ditambal sesi ini)
`modules/shared/owner-registry-settings-ui.js` (fitur "Kelola Daftar
Pemilik", S564) ternyata **hilang dari daftar `scripts/build.js`** sejak
S564 sendiri — isi filenya sendiri TIDAK berubah (tidak disertakan di
ZIP ini karena identik), tapi tanpa registrasi ini, build ulang apa pun
akan diam-diam MENGHAPUS fitur itu dari bundle produksi. Sudah ditambal
di `scripts/build.js` yang disertakan.

## File dalam patch ini
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — bundle final, WAJIB diupload, berisi SEMUA fix di atas
- `modules/asset/aset-misc.js` — fix #1
- `modules/finance/piutang-utang.js` — fix #2
- `modules/shared/ghost-asset-cleanup-ui.js` — BARU, fix #3
- `tests/s592-ghost-asset-cleanup-ui.test.js` — BARU, 6 test fix #3
- `modules/shared/modules-render.js` — 1 baris render hook fix #3
- `index.html`, `app_production.html` — kartu baru fix #3
- `scripts/build.js` — registrasi file baru + tambal gap housekeeping
- `chat-action-handlers.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js` — bump versi
  otomatis (housekeeping build.js, versi 1327)
- `sw.js` — bump `CACHE_NAME` (housekeeping)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `docs/RELEASE-GATE-LOG.md` — regenerasi/log otomatis
- `PATCH-ghost-asset-migrated-investment.md`, `s592-SESSION-NOTE.md` — dokumentasi

## Cara update repo GitHub
Timpa file-file di atas persis di path yang sama di repo Anda (struktur
folder ZIP ini sudah sama dengan struktur repo). **Upload SEMUA file di
atas, jangan cuma HTML/sw.js** — bundle & source harus tetap sinkron.

## Verifikasi
- `node --test tests/*.test.js` → **4173/4173 lolos**, 0 regresi.
- `verify-window-expose.js` → lolos.
- `verify-bundle-freshness.js` → lolos.
- `verify-release-ready.js` → lolos dengan 2 override manual (eslint &
  esbuild tidak terpasang di sandbox tanpa akses jaringan — dicatat di
  `docs/RELEASE-GATE-LOG.md`). Untuk ukuran bundle ter-minify: jalankan
  `npm install --save-dev esbuild && node scripts/build.js` sekali di
  environment Anda sendiri (opsional, bundle saat ini sudah 100% valid).
