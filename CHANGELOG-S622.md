# S622 — Root cause KEDUA ditemukan: badai toast dari self-test otomatis (bukan navigasi tab)

Lanjutan audit S619/S621. Fix S619/S621 (`dismissAllToasts()` di `showPage()`/`setAsetTab()`
+ 11 fungsi ganti sub-tab lain) menutup celah "toast lama nyangkut saat PINDAH tab". Tapi ada
skenario kedua yang TIDAK melibatkan perpindahan tab sama sekali: user sudah DIAM di satu tab
(mis. Investasi), lalu `autoRunSelfTestIfNeeded()` (self-test.js) kebetulan terpicu di situ.

## Root cause

`autoRunSelfTestIfNeeded()` dipanggil 800ms setelah tiap boot/unlock app (lihat
`features-helpers-global-security.js`), jalan otomatis SEKALI per perubahan versi build —
TERLEPAS dari tab mana yang sedang aktif user saat itu (mis. app di-reload/unlock saat user
masih di tab Investasi). Fungsi ini menjalankan `computeSelfTestResults()`, yang mengeksekusi
ratusan test case lewat FUNGSI ASLI aplikasi di atas data dummy `__selftest_*__` — beberapa di
antaranya (mis. `WorthIt.undoBought()`) punya efek samping `toast()` SUNGGUHAN (persis toast
"↺ ... dikembalikan ke daftar Prioritas Belanja" yang terlihat di video S619). Karena ini bukan
event navigasi, fix `dismissAllToasts()` di titik-titik tab-switch (S619/S621) tidak pernah
tersentuh — toast dari test case beruntun ini numpuk di `_toastQueue` & mengantre menutupi
tombol/konten tab yang sedang aktif selama beberapa detik, membuat tab terasa "tidak
respon"/macet meski hasil tesnya sendiri 0 gagal.

Sesi S615/S616 (fitur ghost-migration/sync) menaikkan versi build lebih sering → self-test
otomatis lebih sering terpicu ulang → gejala ini jadi lebih sering muncul saat itu, cocok
dengan laporan user.

## Fix

1. **`modules/shared/format-tema.js`** — flag `_toastSuppressed` (default `false`, 0 perubahan
   perilaku pemanggil existing) + setter `setToastSuppressed(v)`. `toast()`/`toastUndo()`
   langsung `return` tanpa masuk antrean kalau flag aktif.
2. **`self-test.js`** (`computeSelfTestResults()`) — nyalakan `setToastSuppressed(true)`
   SEBELUM loop eksekusi test case, matikan lagi di `finally` (jadi tetap aman kalau ada test
   case yang throw tak terduga). Assert & logic tiap test case 0 berubah — cuma efek samping
   `toast()`-nya yang diredam, bukan hasil tesnya. Dipakai bareng oleh `runSelfTest()` (tombol
   manual "▶️ Jalankan Tes") dan `autoRunSelfTestIfNeeded()`, jadi kedua jalur otomatis ikut
   aman — toast RINGKASAN akhir ("✅ Semua tes berhasil"/"⚠️ N tes gagal") tetap tampil normal
   krn dipanggil setelah suppress dimatikan lagi.
3. **`self-test.js`** (`autoRunSelfTestIfNeeded()`) — tambah `dismissAllToasts()` di titik
   paling awal sebelum mulai jalan, membersihkan toast basi yang mungkin sudah mengantre dari
   aksi tepat sebelum boot selesai (pola sama dgn S619/S621, cuma titik panggil beda).

## Cakupan yang SENGAJA belum disentuh

- Skenario navigasi tab (S619/S621) — tetap seperti sebelumnya, fix ini murni menambal celah
  non-navigasi yang baru ditemukan, bukan menggantikan.
- Toast dari aksi user yang SUNGGUHAN sedang berjalan bareng self-test (mis. user tap tombol
  simpan tepat saat self-test jalan di background) — kasus ini sangat sempit (self-test cuma
  jalan sekali per build & auto-skip kalau ada modal terbuka), tidak diaudit terpisah sesi ini.

## Test & Build

- `node --test tests/*.test.js` → 4920/4920 pass, 0 fail (0 test baru — fix ini murni
  meredam efek-samping UI, tidak ada logic baru yang butuh assertion terpisah; tidak ada test
  existing yang menggantungkan toast benar-benar tampil selama self-test jalan).
- `node scripts/build.js` → sukses, versi s621 → s622, sintaks kedua bundle valid.
