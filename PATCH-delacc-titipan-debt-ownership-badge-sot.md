# Patch susulan: "1 SOT" badge/dropdown Kepemilikan Akun vs porsi Holding/Dana Titipan

## Bug (2 bagian, dikonfirmasi user lewat screenshot + jawaban "Keduanya")

Badge/chip "Kepemilikan" (mis. "Keluarga") pada kartu Akun & Metode
Pembayaran, dan dropdown "Filter Kepemilikan" di atasnya, membaca field
`acc.ownership` (OwnershipEngine, tipe TUNGGAL SELF/INVESTOR/CUSTOMER/
THIRD_PARTY/FAMILY, diisi manual lewat modal Edit Akun) — field ini
**terpisah total** dari porsi kepemilikan real:
- Holding Investasi yang ditautkan langsung ke akun (`findLinkedHoldingForAccount()`)
- `acc.owners[]` yang diisi lewat modal "⚖️ Atur Porsi Kepemilikan Akun"

Akibatnya akun yang porsinya sudah diatur non-SELF (mis. tertaut Holding
"Majoris" milik owner lain) tetap tampil badge default "Milik Sendiri" kalau
belum pernah diklasifikasi manual — dan tetap ikut nongol di filter "Milik
Sendiri". Ini gap yang sama persis dengan yang sudah berkali-kali diperbaiki
proyek ini untuk sumber lain (dropdown Pemilik Sumber Potongan/Ditanggung
Oleh), tapi belum pernah untuk badge/filter Akun ini.

Bagian kedua: baris "👥 Porsi: ..." di kartu akun sebelumnya HANYA tampil
untuk akun yang `linked` (tertaut Aset/Holding) — akun berdiri-sendiri yang
porsinya diisi langsung lewat modal "⚖️ Atur Porsi Kepemilikan Akun" (contoh
skenario BRI di screenshot user) tidak pernah dapat baris porsi sama sekali.

## Fix (additive, 0 rumus porsi baru — 100% reuse sumber yang sama dengan
`resolveOwnerDefaultForAccount()`)

- `modules/finance/akun.js`: fungsi baru `resolveAccOwnershipBadgeState(accId)`
  — baca porsi real efektif (Holding tertaut > `acc.owners[]` eksplisit,
  prioritas sama persis `resolveOwnerDefaultForAccount()`), balikin status
  `mismatch` (porsi real non-SELF tapi badge masih default/belum
  diklasifikasi). Murni baca, 0 mutasi.
- `modules/shared/modules-render.js` (`renderAccGrid()`):
  1. Chip badge ganti jadi "⚠️ Belum diklasifikasi" kalau `mismatch` (bukan
     "Milik Sendiri" yang menyesatkan).
  2. Baris "👥 Porsi:" sekarang JUGA tampil untuk akun standalone (bukan
     cuma yang tertaut Aset/Holding).
  3. Filter Kepemilikan "SELF" (Milik Sendiri) mengecualikan akun yang
     `mismatch` — tidak lagi menampilkan akun berporsi non-SELF sebagai
     "Milik Sendiri".
- Tipe kepemilikan SPESIFIK (INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY) SENGAJA
  TIDAK di-auto-tebak dari porsi — porsi cuma punya nama pemilik, bukan tipe
  semantik. Klasifikasi tipe akhir tetap manual lewat dropdown "Kepemilikan"
  di modal Edit Akun (idiom sama persis `titipanGapLine` yang sudah ada di
  file ini: tandai gap, jangan tebak diam-diam).

## Verifikasi

- Test baru: `tests/delacc-titipan-debt-ownership-badge-sot.test.js` (8 kasus:
  mismatch Holding, standalone SELF, badge sudah diklasifikasi manual, chip
  peringatan di kartu, baris porsi standalone tampil, 0 regresi akun tanpa
  owners, filter SELF exclude mismatch, filter SELF tidak exclude FAMILY
  eksplisit).
- Full suite: **4296/4296 lolos** (`node --test tests/*.test.js`).
- `node --check` lolos di semua file yang diedit.
- Build ulang sukses (v1347), sintaks bundle lolos.

## File yang berubah/ditambah

- `modules/finance/akun.js` (diedit)
- `modules/shared/modules-render.js` (diedit)
- `tests/delacc-titipan-debt-ownership-badge-sot.test.js` (baru)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild v1347)
- `index.html`, `app_production.html`, `sw.js` (versi di-bump build.js)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (auto-regenerate build.js)
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js` (auto version-sync
  build.js, isi non-versi tidak berubah)

**Cara pakai:** extract isi zip ini ke atas folder project (menimpa patch
`delacc-titipan-debt` sebelumnya + file terbaru), lalu upload ULANG semua
file yang berubah (bukan cuma HTML/sw.js).
