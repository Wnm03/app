# FIX v1014 (s350) — Race condition resolver dialog custom ("tombol Bayar/Riwayat macet, 0 toast")

## Laporan user
- Tombol "📋 Katalog" / Import PDF Katalog: tidak ada respon, tidak ada toast.
- Tagihan: tombol "Riwayat" & "✅ Bayar" delay/macet — baru "hidup" setelah tap tombol lain.

## Audit
Diverifikasi langsung ke source (bukan tebakan) — 2 defect independen, keduanya
menghasilkan gejala yang sama: tombol terasa "mati" tanpa toast/error apa pun,
karena Promise yang seharusnya resolve malah **menggantung selamanya** (bukan
reject — makanya `.catch()` di dispatcher klik tidak pernah kebagian menangkap
apa pun).

### 1) `modules/shared/modal-navigasi.js` — resolver tunggal, bukan antrean
`askConfirm()`/`showPromptModal()`/`showChoiceModal()`/`showAlertModal()`/
`showPinPromptModal()` masing-masing cuma punya SATU variabel resolver
module-scope (mis. `_confirmResolve`). Kalau fungsi show-nya terpanggil 2x
sebelum jawaban pertama masuk (double-tap tombol "Bayar" di layar sentuh —
sangat umum di HP), panggilan kedua **menimpa** resolver panggilan pertama.
Promise pertama (yang sedang di-`await` oleh `markBillPaid()` dkk) jadi
orphan permanen.

**Fix:** `_queueDialog()`/`_resolveDialog()` — semua permintaan dialog masuk
antrean per-jenis; permintaan berikutnya baru ditampilkan setelah yang
sebelumnya dijawab. Tidak ada lagi Promise yang hilang. 0 perubahan pada
pemanggil (signature `askConfirm()` dkk tetap sama).

### 2) `modules/shared/features-helpers-global-security.js` — tidak ada guard klik ganda
`_dataActionClickHandler()` tidak mencegah 1 elemen yang sama terpicu 2x
hampir bersamaan (double-tap) selagi action async-nya masih pending —
penyebab utama fix #1 di atas jadi relevan di lapangan.

**Fix:** tandai elemen dgn `dataset.pendingAction` selama Promise hasil
action-nya masih pending; klik ulang pada elemen yang sama diabaikan sampai
action pertama selesai/gagal.

### 3) `modules/asset/aset.js` — `IDBStore._open()` bisa hang tanpa timeout
`indexedDB.open()` tidak punya handler `onblocked`, dan tidak ada timeout.
Kalau open request blocked, `onsuccess`/`onerror` tidak pernah terpanggil →
`_dbPromise` gantung selamanya → semua fitur lewat `IDBStore`
(`VehicleCatalog`/Import PDF Katalog/dll) jadi tombol mati tanpa toast.

**Fix:** tambah `req.onblocked` (log) + timeout 8 detik yang reject dgn
pesan jelas & reset cache `_dbPromise`, supaya paling buruk user dapat toast
error yang bisa dilaporkan, bukan tombol yang diam mati total.

## Test
`tests/modal-navigasi-dialog-queue.test.js` (baru, 2 test) — membuktikan 2-3
panggilan `askConfirm()`/`showPromptModal()` concurrent semuanya resolve dgn
jawaban masing-masing yang benar, tidak ada yang orphan/hang. Full suite:
2404/2404 pass.

## File yang berubah
- `modules/shared/modal-navigasi.js`
- `modules/shared/features-helpers-global-security.js`
- `modules/asset/aset.js`
- `tests/modal-navigasi-dialog-queue.test.js` (baru)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild otomatis via `node scripts/build.js`)
- `index.html`, `app_production.html`, `sw.js` (bump versi otomatis, v1012 → v1014)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis)
