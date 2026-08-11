# FIX s363/s364 — Lint otomatis "overlay bypass self-heal ScannerSession" (tier-2, lanjutan audit s360-s362)

## Latar belakang
`FIX-s362-scannersession-global-watchdog.md` mencatat rekomendasi tier-2
yang belum diimplementasikan: kodifikasi audit manual
`grep -rn "classList.add('open')" modules/` (dijalankan tangan tiap ada
laporan "tombol/dialog macet, 0 toast" — lihat `FIX-s360`, `FIX-s361`) jadi
lint otomatis di `scripts/build.js`, supaya modul fitur baru yang lupa lewat
`openModal()`/`_queueDialog()`/`openQS()` ketahuan saat build, bukan lewat
laporan user lagi.

## Perbaikan
Tambah `lintOverlayOpenBypassesGuard()` di `scripts/build.js`, didaftarkan
sebagai entry baru di `LINT_REGISTRY` (severity `blocking`). Lint ini scan
seluruh `ALL_SOURCE` (source yang benar-benar masuk bundle) mencari pola
`.classList.add('open')` / `.classList.add("open")`, lalu menolak build
kalau ditemukan di luar 2 file yang di-*whitelist* secara eksplisit:
- `modules/shared/modal-navigasi.js` — implementasi guard itu sendiri.
- `self-test.js` — harness diagnostik internal yang sengaja
  menambah/mengembalikan class `open` sementara untuk menguji renderer
  (simpan-restore state asli), bukan jalur UI yang dipicu tap user.

Whitelist sengaja dibuat sempit per-file (bukan pengecualian folder) supaya
menambahkan overlay bypass baru harus disengaja, bukan kebetulan lolos.

## Verifikasi
- `node scripts/build.js` — lint baru lolos (`✓ Semua overlay dibuka lewat
  jalur yang sudah dipasangi self-heal ScannerSession`), build sukses,
  versi konsisten **1031** di semua file.
- Full suite: `node --test tests/*.test.js` — 2179/2181 pass, 2 fail
  PRE-EXISTING & tidak terkait (sama seperti baseline s362, tidak berubah).
- Manual sanity check: sengaja menambahkan `el.classList.add('open')` di
  file di luar whitelist, jalankan `node scripts/build.js` → build berhenti
  dengan pesan lint yang tepat menyebut file:baris pelanggarannya, lalu
  baris tes dihapus lagi (tidak disertakan di rilis ini).

## File yang berubah
- `scripts/build.js` (`lintOverlayOpenBypassesGuard()` baru +
  `OVERLAY_OPEN_BYPASS_ALLOWLIST` + 1 entry baru di `LINT_REGISTRY`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild rutin, tidak ada
  perubahan source app di luar `scripts/build.js` pada sesi ini)
- `sw.js`, `index.html`, `app_production.html` — versi `?v=1028` → `?v=1031`

## Cakupan sisa (belum dikerjakan sesi ini)
Rekomendasi tier-2 lain dari `FIX-s362`: lint pembanding bundle-vs-source
untuk mencegah pola bug s326↔s328 ("source sudah fix, bundle lupa
di-rebuild"). Rekomendasi tier-3 (elemen recovery visual saat state
nyangkut) juga belum dikerjakan. Keduanya di luar scope patch ini.
