# Patch Gabungan (POST-BUILD, siap upload langsung): Rekomendasi Kategori Servis
# + History-Sync + Vehicle-Edit (S657) + Interval Waktu (Bulan)

Update dari patch gabungan sebelumnya: sudah dijalankan `node scripts/build.js`
di atas `app-main__6_.zip` yang di-upload, jadi semua file turunan (bundle,
`app_production.html`, `sw.js`, sinkronisasi versi) sudah ikut ter-generate
dan disertakan di sini. **Tidak perlu jalankan `node scripts/build.js` lagi
setelah menerapkan patch ini** — cukup timpa semua file dgn path yang sama.

## Hasil verifikasi

```
node --test tests/*.test.js        → 4741/4741 pass, 0 fail
node scripts/verify-window-expose.js → OK (76 modul, semua ter-expose)
node scripts/build.js               → sukses, versi s660-keamanan-pin-per-device-salt, ?v=1393
node --check (kedua bundle)         → sintaks valid
```

Versi lama terdeteksi di repo upload: `s659` / `?v=1390..1392` (bervariasi per
file, hasil sesi-sesi sebelumnya) → disamakan semua jadi `s660` / `?v=1393`.

## Sumber fix (dari 4 zip patch asli, sudah dipastikan kumulatif tanpa ada yang hilang)

1. `patch-rekomendasi-kategori-servis.zip`
2. `patch-rekomendasi-kategori-servis-history-sync.zip`
3. `patch-sparepart-servis-history-sync-plus-vehicle-edit.zip`
4. `patch-sparepart-interval-waktu-bulan.zip`

`modules/vehicle/sparepart-servis.js` di tiap zip berurutan bersifat kumulatif
murni (#1 ⊂ #2 ⊂ #3 ⊂ #4) — tidak ada fix yang hilang/ketimpa, hanya nambah.
`index.html` cuma disentuh zip #1 (tombol "💡 Rekomendasi Kategori Sesuai
Kendaraan"); `car-notes.js` cuma disentuh zip #4 (`Servis.renderReminder()`
pakai axis bulan).

## Isi zip ini (SEMUA file yang benar-benar berubah/baru setelah build)

| File | Status | Keterangan |
|---|---|---|
| `modules/vehicle/sparepart-servis.js` | Diubah (source) | Semua fix dari 4 patch (kumulatif) |
| `car-notes.js` | Diubah (source) | `Servis.renderReminder()` pakai axis bulan |
| `index.html` | Diubah (source) | Tombol rekomendasi kategori + `#sparepartRecommendBox` |
| `tests/sparepart-recommend-categories.test.js` | Baru | Tier manual/generic/history |
| `tests/sparepart-catmodal-vehicle-edit-audit.test.js` | Baru | Audit S657 vehicle-edit |
| `tests/sparepart-interval-bulan.test.js` | Baru | 11 test interval bulan |
| `docs/FIX-recommendCategories-history-sync-gap.md` | Baru | Dokumentasi lengkap semua audit/fix |
| `app_production.html` | Auto-generated (build.js) | Cermin `index.html`, `?v=1393` |
| `app-bundle-a.min.js` | Auto-generated (build.js) | Belum diminify (esbuild tidak ada di environment build ini — lihat catatan di bawah) |
| `app-bundle-b.min.js` | Auto-generated (build.js) | sda |
| `sw.js` | Auto-generated (build.js) | `CACHE_NAME` → `kw-cache-v1393` |
| `chat-action-handlers.js` | Auto-generated (build.js) | Sinkronisasi `MODULE_FEATURES_VERSION` → `s660-...` |
| `modules/shared/modals.js` | Auto-generated (build.js) | Sinkronisasi versi (`MODAL_VERSION`) |
| `modules/shared/modules-calc.js` | Auto-generated (build.js) | Sinkronisasi versi (`MODULE_CALC_VERSION`) |
| `modules/shared/modules-render.js` | Auto-generated (build.js) | Sinkronisasi versi (`MODULE_RENDER_VERSION`) |
| `modules/shared/features-helpers-global-security.js` | Auto-generated (build.js) | Sinkronisasi versi |
| `docs/FILE-MAP.md` | Auto-generated (build.js) | 315 file, 2205 identifier global |
| `docs/COVERAGE-PER-MODULE.md` | Auto-generated (build.js) | 19 family, 4 tanpa test langsung |

## ⚠️ Catatan penting soal ukuran bundle

`esbuild` tidak tersedia di environment sandbox tempat build ini dijalankan
(tidak ada akses internet), jadi `app-bundle-a.min.js` (1.35 MB) dan
`app-bundle-b.min.js` (3.58 MB) di zip ini **belum diminify** — lebih besar
dari biasanya, tapi 100% valid (lolos `node --check`) dan aman dipakai apa
adanya. Kalau mau ukuran kecil seperti biasa: setelah menerapkan patch ini,
jalankan sekali di environment kamu yang ada internet:
```
npm install --save-dev esbuild
node scripts/build.js
```
— itu akan menghasilkan ulang kedua bundle dalam bentuk terminifikasi tanpa
mengubah logic apa pun (source `.js` tidak berubah).

## Belum dikerjakan (dari README zip #4, belum diselesaikan sesi manapun)

- Field "Interval Waktu (Bulan)" masih di-inject runtime lewat JS
  (`ensureIntervalBulanField()`), belum ditambahkan permanen ke template HTML
  modal di `modules/shared/modals.js`.
- Override per-kendaraan untuk `intervalBulan` (serupa `intervalOverrides`
  untuk km) belum ada.
- `recommendCategories()` belum menyertakan estimasi bulan.
