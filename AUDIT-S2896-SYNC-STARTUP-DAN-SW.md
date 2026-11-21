# AUDIT S2896 — poin 4 (sinkron utang bagi hasil) & poin 2 (service worker aktif)

Audit saja: **0 source aplikasi diubah** (build tetap 2909). Basis: patch S2896 lanjutan di atas app-main (20). Data: backup keluarga-W 20 Nov 2026 (tidak ikut arsip).
Skrip pengujian (dapat diulang): `e2e/audit-s2896/` — `bagi-hasil-sync-skenario.js`, `bagi-hasil-hapus-dp.js` (butuh `BACKUP=`), `service-worker-offline-update.js`.

## Ringkasan

| # | Temuan | Dampak | Prioritas |
|---|---|---|---|
| P4-1 | Utang bagi hasil HANYA diselaraskan saat peristiwa laba (akui/koreksi/cairkan/batal) dan `bhSave`. Tidak ada sinkron saat boot/restore/impor. | Data yang ledger laba-nya ada tapi utangnya hilang (restore backup lama, sinkron Drive dari perangkat belum-patch) tidak punya utang bagi hasil; kartu Dana Titipan tidak menampilkan penerima; Data Health tidak mendeteksi. | Sedang |
| P4-2 | `OwnerRegistry.rename()` memperbarui nama di `D.debts`, tetapi TIDAK di `D.renovProjects[].bagiHasil.owners[].ownerName`. | Nama utang kembali ke nama lama pada sinkron berikutnya (nama basi di Buku Utang/Dana Titipan). | Rendah–sedang |
| P4-3 | Hapus pemasukan DP setelah laba diakui: pencairan benar diblokir ("Koreksi laba diperlukan"), panel detail memperingatkan, tetapi nilai utang bagi hasil tetap 1.588.100 sampai laba dikoreksi manual; kartu Dana Titipan tidak memberi peringatan. | Angka hak penerima terlihat terlalu besar sementara; tidak ada kebocoran kas (guard bekerja). | Rendah |
| P2-1 | Offline: bundle bertanda `?v=` tidak ketemu di cache. Precache menyimpan URL tanpa `?v=`, padahal halaman meminta `app-bundle-*.min.js?v=2909`; `caches.match(request)` mencocokkan query persis. | Dua jendela di mana app TIDAK boot offline (layar kosong, 503): (a) instalasi pertama sebelum ada 1x load online yang sudah dikontrol SW; (b) tepat setelah deploy baru (SW baru `activate` menghapus cache lama; load online berikutnya belum terjadi). Setelah 1x load online keduanya pulih. | Sedang (hanya offline) |
| P2-2 | Harness e2e lama tidak pernah menjalankan SW: `serviceWorkers:'block'` dan host `127.0.0.1` (setupPWA hanya mendaftar SW untuk https/`localhost`). | Semua uji browser sebelumnya buta terhadap jalur SW. | Info |
| P2-3 | Update SW saat sesi berjalan: tidak ada reload paksa (guard `__kwBooted`), banner "Versi baru tersedia" muncul, data localStorage utuh (9.808 byte sebelum/sesudah), tanpa loop reload (0 navigasi). | OK. | — |

## Bukti

### Poin 4 (backup asli, proyek wallpanel)
- S0 normal: selesai + akui penuh → utang home in 1.588.100 (benar).
- S1 data "lama" (ledger ada, utang dihapus, disimpan, boot ulang): utang `[]`, ledger 1 entri; kartu Dana Titipan hanya "renov" dan "mas sihab" (home in tidak muncul); Data Health tidak menyebut bagi hasil. Mesin Renovasi (`renovSyncBagiHasilUtang`) sudah termuat saat boot, jadi sinkron saat startup memungkinkan secara teknis.
- S1b: pulih hanya setelah peristiwa laba berikutnya (koreksi 1 + akui 1 → utang terbentuk lagi).
- S3 rename "home in" → "home out": utang berganti nama, tetapi `bagiHasil.owners[1].ownerName` tetap "home in"; setelah koreksi+akui berikutnya nama utang kembali "home in".
- S4 hapus 1 dari 2 pemasukan DP setelah laba diakui penuh: `labaMaks` 2.692.582 → 0, `koreksiDiperlukan` = true, pencairan 1.000 ditolak ("Koreksi laba diperlukan sebelum pencairan"), panel detail memuat peringatan; utang tetap 1.588.100.

### Poin 2 (Chromium, SW aktif, host `localhost`)
- SW terdaftar/aktif, cache `kw-cache-v2909` berisi 13 URL precache (semua file ada).
- Offline reload: B0 (instalasi pertama) GAGAL boot; B1 (setelah 1x load online terkontrol) boot; B2 (tepat setelah update SW) GAGAL boot; B3 (setelah 1x load online pasca-update) boot. Pengecekan boot memakai `typeof D==='object' && typeof showPage==='function'` (cek `mainApp` saja menipu: HTML boot tanpa JS).
- `fetch('app-bundle-a.min.js?v=2909')` offline = 503; `styles.css` tanpa query = 200.

## Rekomendasi (belum dikerjakan)

1. **P2-1**: di `sw.js` pada jalur offline (navigasi & aset) pakai `caches.match(request, { ignoreSearch: true })` sebagai cadangan, atau precache URL ber-`?v=` dari versi build. Tambah tes yang menjalankan SW sungguhan (skrip audit sudah ada sebagai dasar). Sebaiknya `activate` baru menghapus cache lama setelah cache baru terisi.
2. **P4-1**: panggil `renovSyncBagiHasilUtang` untuk proyek dana klien yang punya ledger + `bagiHasil` sekali setelah boot dan setelah restore, hanya bila hasilnya berubah (idempoten; 1 `save()`), atau minimal tambah temuan "utang bagi hasil belum sinkron" di Data Health dengan tombol perbaiki.
3. **P4-2**: sebarkan `ownerName` baru ke `D.renovProjects[].bagiHasil.owners` di `OwnerRegistry.rename()`/`merge()` (cermin blok `D.debts`).
4. **P4-3**: tampilkan peringatan "koreksi laba diperlukan" juga di kartu Dana Titipan/Buku Utang untuk utang bagi hasil, atau tandai nilainya "menunggu koreksi".

Belum diuji: Android/Safari/Firefox, update SW dengan chunk lazy lintas versi, Drive/Sheets.


## STATUS PERBAIKAN (S2897, build 2910) — keempat temuan sudah diperbaiki dan diuji

| # | Perbaikan | Bukti |
|---|---|---|
| P2-1 | `sw.js`: (a) lima skrip yang dimuat `index.html`/`app_production.html` tetapi tidak ada di precache ditambahkan (`nav-scroll.js`, `boot-early.js`, `segmented-control.js`, `bundle-load-guard.js`, `modal-write.js`) — ini akar utama 503 offline; (b) cadangan `caches.match(..., { ignoreSearch: true })` untuk request ber-`?v=` (navigasi & aset). Catatan: perbaikan `ignoreSearch` SAJA tidak cukup (B0/B2 tetap gagal sampai skrip tadi masuk precache). | `e2e/audit-s2896/service-worker-offline-update.js`: B0, B1, B2, B3 semua boot (sebelumnya B0 dan B2 gagal), 0 error. |
| P4-1 | `renovSyncBagiHasilUtangSemua()` (renovasi.js): selaraskan utang bagi hasil semua proyek dana klien; idempoten, `save()` hanya bila ada perubahan, rollback bila gagal. Dipanggil setelah mesin klien siap saat boot/restore (`app-init-runtime.js`) dan saat mesin termuat lambat (`akun.js`). | `bagi-hasil-sync-skenario.js` dengan backup asli: S1 (ledger ada, utang hilang, boot ulang) kini utang home in 1.588.100 pulih dan kartu Dana Titipan menampilkannya. |
| P4-2 | `OwnerRegistry.rename()`/`merge()` menyebarkan nama/ID ke `D.renovProjects[].bagiHasil.owners` (+ `renovBagiOwnerId` pada merge); merge dibatalkan bila source dan target sama-sama penerima di satu proyek. Hasil bertambah field `bagiHasil`. | S3: nama utang tetap "home out" setelah koreksi+akui berikutnya. |
| P4-3 | Kartu Dana Titipan menandai "(menunggu koreksi laba)" (kalimat status dan baris detail) bila proyeknya `koreksiDiperlukan`. Nilai utang tidak diubah otomatis (koreksi laba tetap keputusan manual; pencairan tetap diblokir). | `bagi-hasil-hapus-dp.js` (diperluas): setelah hapus 1 DP, kartu home in menampilkan penanda. |

Tes baru: `tests/s2897-bagi-hasil-startup-rename-koreksi-sw.test.js` (10 tes, termasuk gate precache vs aset index.html).
Masih belum diuji: Android/Safari/Firefox, chunk lazy lintas versi saat update, Drive/Sheets.
