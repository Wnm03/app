# Sesi AF1 (lanjutan #2) — Auto-fill Sisa Porsi: tutup 2 item checklist test wajib terakhir

Ref: `DESIGN-LOCK-autofill-sisa-porsi.md`, `SESI-AF1-SESSION-NOTE.md` (sesi 1),
`SESI-AF1-LANJUTAN-SESSION-NOTE.md` (sesi 2). File ini HANYA berisi 1 file yang berubah di
sesi ini — semua file dari sesi 1 & 2 lainnya TIDAK berubah lagi.

## Kenapa sesi ini perlu

Dicek ulang seluruh checklist "Test yang wajib ada" di Design Lock terhadap state setelah sesi 2:
4 dari 6 item sudah tercakup (2 baris, 3+ baris, semua `_touched`, presisi 4 desimal round-trip
1 skala). 2 item MASIH BELUM ada test-nya sama sekali:
1. **"`resetOwners()`/buka modal ulang → `_touched` ke-reset (draft baru)"** — 0 test.
2. **"Test round-trip Nominal (kritis)"** — Design Lock minta 3 nominal (1.700.000 / 500.000 /
   74.136) × 3 skala `nilaiAset` (kecil ~1jt, sedang ~10jt, besar ~1M+) = 9 kombinasi; test S457
   yang ada cuma menutupi 1 kombinasi (1.700.000 @ ~11,7jt).

## Yang dikerjakan

**`tests/asset-owners-nominal-precision-s457.test.js`** (satu-satunya file berubah):
1. **8 test round-trip nominal baru** (`roundTripNominalCase()` helper) — menutupi 3 skala ×
   3 nominal (1 kombinasi lama tetap dipertahankan apa adanya, 8 kombinasi baru ditambah).
   Alur tiap test: isi Nominal manual di baris 0 → `saveOwners()` → `openOwnersModal()` lagi
   (simulasi tutup+buka) → verifikasi Nominal tampilan turunan dari porsi tersimpan masih dekat
   dgn nominal yang diketik.
   - **Temuan**: 3 kombinasi skala BESAR (nilaiAset Rp1,5M) gagal dgn toleransi tetap Rp20 --
     ini BUKAN bug, tapi konsekuensi matematis presisi 4-desimal yang SUDAH diketahui & dicatat
     eksplisit di Design Lock ("known-limitation, bukan blocker, solusi anchor terpisah sudah
     ditolak tim"). 1 langkah pembulatan porsi terkecil (0,0001%) = `nilaiAset × 0.000001` rupiah
     -- pada nilaiAset Rp1,5M itu ~Rp1.500/langkah, jauh di atas toleransi Rp20 yang masuk akal
     utk skala kecil/sedang. **Fix**: toleransi test dibuat PROPORSIONAL ke resolusi presisi pada
     skala tsb (`max(20, nilaiAset*0.000001 + 5)`), dgn komentar panjang menjelaskan kenapa (supaya
     tidak disalahartikan sbg longgar sembarangan) -- bukan mengubah kode `aset.js` sama sekali.
2. **2 test `_touched` reset baru**:
   - `openOwnersModal()`: buka modal, edit baris (jadi `_touched`), tutup modal (draft dibuang
     tanpa Simpan), buka modal lagi → tambah baris baru → baris baru tidak mewarisi `_touched`
     DAN benar-benar berfungsi sbg target auto-fill lagi (bukan cuma `undefined` kebetulan).
   - `resetOwners()`: sama tapi lewat tombol Reset Draft (tanpa tutup modal).
   - Kedua test LULUS tanpa perlu ubah kode `aset.js` -- `openOwnersModal()`/`resetOwners()`
     sudah benar by construction (keduanya me-`map()` draft baru cuma dari field
     `{ownerId,ownerName,porsi,isSelf}`, `_touched` otomatis tidak pernah ikut ter-copy). Test ini
     murni menambah BUKTI/regresi-guard eksplisit utk perilaku yang sebelumnya cuma "kebetulan
     benar", sesuai permintaan Design Lock.

## Verifikasi
- `node --check` lolos.
- File ini sendiri: **14 test, 14 pass, 0 fail**.
- `node --test tests/*.test.js` (suite penuh): **4265 test, 4265 pass, 0 fail** (naik dari 4255 di
  sesi 2 → +10 test baru: 8 round-trip + 2 `_touched` reset).

## Checklist "Test yang wajib ada" (Design Lock) — status akhir
- [x] 2 baris: isi baris A → baris B otomatis `100 - A`.
- [x] 3+ baris, isi baris pertama → baris kosong berikutnya (bukan semua).
- [x] Semua baris `_touched` → tidak ada auto-fill.
- [x] Nominal→Porsi presisi 4 desimal, round-trip lossless (regresi S457).
- [x] `resetOwners()`/buka modal ulang → `_touched` ke-reset. **(BARU sesi ini)**
- [x] Round-trip Nominal 3 nilai × 3 skala. **(BARU sesi ini, 1/9 sudah ada dari S457 lama)**

Semua item checklist wajib di Design Lock SEKARANG TERCAKUP. Tidak ada lagi item test wajib yang
tersisa di `DESIGN-LOCK-autofill-sisa-porsi.md` per sesi ini.

## TIDAK disentuh sesi ini
- Semua file dari sesi 1 (`modules-calc.js`, `investasi-view.js`, `akun.js`) & sesi 2 (`aset.js`,
  3 file test lain) — sudah benar, 0 perubahan lagi diperlukan.
- `MODULE_CALC_VERSION` & versi lain — TETAP belum di-bump (3 sesi AF1 sekarang perlu 1x build
  resmi gabungan via `scripts/build.js` sebelum merge ke riwayat sesi utama).
- `npm run lint` — masih belum bisa dijalankan di sandbox (jaringan diblokir).

## Cara pakai patch ini
Extract & timpa `tests/asset-owners-nominal-precision-s457.test.js` SETELAH patch sesi 1 & sesi 2
sudah di-apply berurutan (patch ini cuma 1 file, murni tambahan test di atas hasil sesi 2).

## File dalam ZIP
- `tests/asset-owners-nominal-precision-s457.test.js` (diperbarui — 8 test round-trip + 2 test
  `_touched` reset baru)
- `SESI-AF1-LANJUTAN2-SESSION-NOTE.md` (file ini)

## Next
- Jalankan `npm run lint` di lingkungan asli.
- Jalankan `scripts/build.js` resmi (bump versi bundle + `MODULE_CALC_VERSION`) utk ketiga sesi
  AF1 sekaligus (sesi 1 + lanjutan + lanjutan #2) sebelum merge ke riwayat sesi utama (nomor sesi
  resmi project, S583/Sesi 9 dst sesuai catatan sesi 1).
- Opsional (di luar cakupan Design Lock, disebut di sesi 2): tambah test wiring
  Porsi%-trigger/coverage baru utk `InvestmentUI`/`AccOwners` kalau mau paritas dgn `Aset`.
