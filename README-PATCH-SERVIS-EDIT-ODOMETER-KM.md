# Patch (kumulatif): Riwayat Servis — Edit KM di bawah histori + rekomendasi lanjutan

## Sesi 1 — Masalah & Perbaikan Inti
Edit riwayat servis lama ditolak kalau KM dikoreksi lebih rendah dari servis
sebelumnya (`below_previous_service`), padahal user sering perlu membetulkan
data historis yang salah input. `SESSION-NOTE-S750-SERVIS-CATEGORY-EDIT.md`
sudah ada di repo mendeskripsikan rencana ini, tapi kodenya belum pernah
benar-benar masuk ke `car-notes.js` (base snapshot masih versi lama/blokir).

Perbaikan (`car-notes.js`):
1. `validateServiceOdometer()` — `below_previous_service` dilewati KHUSUS saat
   edit (`excludeId` terisi). Batas `above_current_odometer` dan
   `above_next_service` tetap berlaku — bukan menghapus validasi, cuma
   melonggarkan urutan-kronologis-ke-belakang saat mengoreksi data lama.
   Catatan BARU (`excludeId` kosong) tetap wajib urutan penuh.
2. `Servis._saveInner()` — validasi odometer penuh hanya dijalankan kalau
   perlu: catatan baru, ATAU KM berubah, ATAU tanggal berubah. Edit yang cuma
   mengubah kategori/komponen/catatan/foto/biaya dilewatkan dari validasi
   urutan sama sekali.
3. Snapshot historis (`intervalKmAtService`, `nextDueKm`, `nextDueDate`,
   `nextDueAxis`) tidak lagi ditulis ulang untuk edit metadata-only —
   `_preserveHistoricalSnapshot` menjaga basis pengingat lama tetap utuh.
   Jejak audit ringan dicatat ke `s.editHistory[]` (maks 50 entri).

## Sesi 2 — Rekomendasi yang Dikerjakan (sesi ini)
Semua perubahan di bawah ada di `car-notes.js` kecuali disebutkan lain.

1. **Indikator UI mode edit** — `Servis._renderKmEditHint(isEdit)` (baru),
   dipanggil dari `openModal()`. Menyisipkan teks kecil di bawah field
   Odometer/KM, HANYA tampil saat Edit: *"Mode edit: KM boleh dikoreksi lebih
   rendah dari servis sebelumnya (tetap tidak boleh melebihi odometer
   kendaraan sekarang atau servis sesudahnya)."* Elemen dibuat sekali (cek
   `getElementById` dulu), pola sama seperti elemen dinamis lain di file ini.

2. **Tampilkan `editHistory[]` di UI** — `Servis._renderEditHistoryHtml(s)`
   (baru), dipanggil dari `renderEditReminderTab()` (tab 🔔 Pengingat pada
   modal Edit Servis). Read-only, menampilkan maks 5 entri terbaru
   (tanggal/jam + field yang berubah). String kosong kalau riwayat kosong —
   0 dampak visual ke entry lama yang belum pernah diedit metadata-only.

3. **Perbaiki version drift 4 konstanta** — `MODULE_RENDER_VERSION`
   (`modules/shared/modules-render.js`), `MODAL_VERSION`
   (`modules/shared/modals.js`), `MODULE_CALC_VERSION`
   (`modules/shared/modules-calc.js`), `MODULE_FEATURES_VERSION`
   (`chat-action-handlers.js`) — semua diubah dari `'1699'` ke `'1700'`.
   Dikonfirmasi `'1700'` adalah nilai yang benar dengan mengecek
   `app-bundle-a.min.js` (bundle sudah `'1700'` untuk keempatnya; hanya
   source-nya yang nyimpang). Ini murni perbaikan drift, TIDAK menyentuh
   `scripts/build.js` atau menjalankan rebuild.

4. **Expose `getServiceOdometerIntegrity()` ke UI** —
   `Servis.renderOdometerIntegrityBadge(beforeEl)` (baru), dipanggil dari
   `renderList()` sebelum daftar riwayat. Fungsi integrity-check yang sudah
   ada (deteksi `km_regression`/`missing_km`/`invalid_km`) sebelumnya tidak
   pernah dipanggil dari UI mana pun — sekarang tampil sebagai banner kecil
   HANYA kalau ada temuan (`ok:false`), supaya tidak menambah noise visual
   saat data bersih.

5. **Split `car-notes.js` (2639+ baris)** — **DITUNDA, tidak dikerjakan sesi
   ini.** Refactor struktural (misal pecah jadi car-notes-bbm.js /
   car-notes-servis.js / car-notes-torsi.js mengikuti pola
   `modules-render.js` + `modules-render-b.js`) berisiko tinggi untuk
   dikerjakan sekaligus dengan patch fungsional di atas — blast radius besar,
   butuh sesi tersendiri dengan regresi penuh sebelum & sesudah split murni
   (0 perubahan logic). Direkomendasikan sebagai sesi terpisah.

## Sesi 3 — Perbaikan 5 Fail Pre-Existing (sesi ini)
5 fail yang sebelumnya dianggap "pre-existing / tidak terkait servis" di
Sesi 1-2 ternyata berasal dari 2 akar masalah independen, keduanya soal
HTML statis (`index.html` / `app_production.html`), bukan logic:

1. **Tema "Minimal" belum pernah didaftarkan** — `minimal-ui-theme.css`
   sudah ada di repo dan lulus 3 test isi-CSS-nya sendiri
   (`minimal-theme-ui-audit.test.js`), sesuai rencana di
   `SESSION-NOTE-S749-MOCKUP-LAYOUT-THEME.md`, tapi tidak pernah benar2
   ditautkan ke HTML (pola yang sama seperti fix servis di Sesi 1: catatan
   sesi ada, kodenya belum masuk). Perbaikan (`index.html`):
   - Tambah `<link rel="stylesheet" href="minimal-ui-theme.css?v=1700">`
     di `<head>`, setelah `modern-ui-layer.css`.
   - Tambah `theme-card` baru `data-t="minimal"` di grid tema (`#themeGrid`),
     ditaruh SETELAH kartu "Graphite" (di akhir, bukan disisipkan) — pola
     sama seperti pendaftaran "modern" di s640 (comment penanda S749 di atas
     kartu). 9 tema lama + modern + Graphite 0 diubah/dipindah.
   - `setTheme()`/`applyEffectiveTheme()` (`modules/shared/format-tema.js`)
     TIDAK disentuh — keduanya generik berbasis `data-theme` attribute,
     tema baru otomatis jalan tanpa perubahan JS (dikonfirmasi test
     `minimal theme CSS tersedia dan scoped` sudah PASS sebelum sesi ini).
2. **`app_production.html` sudah drift dari `index.html` di base
   snapshot** — 1 baris (`<div id="serviceIntegrityCard">...</div>`) ada di
   `index.html` tapi hilang di `app_production.html`, independen dari tema
   Minimal. Perbaikan: `app_production.html` ditulis ulang jadi cermin
   persis `index.html` (+ marker AUTO-GENERATED), pakai logika yang identik
   dgn `scripts/build.js` (baris 2441-2455) — TANPA menjalankan build penuh
   (tidak menyentuh esbuild/bundle, sesuai batasan yang sama dgn Sesi 1/2).
3. **Efek samping yang diharapkan, bukan regresi** — `tests/s640-modern-
   theme-registration-audit.test.js` sebelumnya mengunci jumlah total
   `.theme-card` = 12 (guard count utk pendaftaran modern/Graphite dulu).
   Menambah kartu ke-13 (Minimal) otomatis bikin assert itu gagal — ini
   angka yang MEMANG harus naik seiring tema baru ditambahkan (pola sama
   seperti test itu sendiri pernah di-update saat Graphite ditambah), jadi
   nilainya dikoreksi dari 12 -> 13 di file test yang sama. Tidak ada
   assertion lain di file itu yang diubah.

## Test
- Baseline (`app-main__6_.zip` asli): `node --test tests/*.test.js` →
  **6728 pass / 5 fail** (5 gagal pre-existing, semua soal HTML-sync/tema
  Minimal — tidak terkait servis).
- Setelah Sesi 1 (fix inti): identik **6728/5**, 0 regresi baru.
- Setelah Sesi 2 (4 rekomendasi di atas): sempat regresi 1 test baru
  (`servis-checklist-saveall-sesi2a.test.js` — regex ketat mengecek
  `Servis.syncServiceChecklist();\s*openModal('servisModal')` berurutan
  langsung; pemanggilan `_renderKmEditHint()` yang disisipkan di antaranya
  memecah urutan itu). Diperbaiki dengan memindahkan pemanggilan
  `_renderKmEditHint()` ke SEBELUM `syncServiceChecklist()`, bukan di antara
  `syncServiceChecklist()` dan `openModal()` — hasil akhir kembali
  **6728 pass / 5 fail**, identik baseline, 0 regresi baru.
- Setelah Sesi 3 (fix 5 fail pre-existing di atas): sempat regresi 1 test
  baru (`s640-modern-theme-registration-audit.test.js`, count 12 vs 13 —
  lihat poin 3 di atas), dikoreksi di test yang sama. Hasil akhir:
  **6733 pass / 0 fail** — seluruh 6733 test, TIDAK ADA fail tersisa.
- `node scripts/service-sot-integrity-gate.js` — SEMUA 7 sub-gate servis
  PASS (termasuk "FULL REGRESSION", yang di Sesi 1-2 tetap FAIL hanya
  krn mewarisi 5 kegagalan pre-existing — sekarang bersih krn 5 itu sudah
  diperbaiki di Sesi 3).
- `node -c car-notes.js` — sintaks valid.
- `checkHtmlSync()` (`scripts/verify-release-ready.js`) — status `synced`.

## Bundle (app-bundle-a/b.min.js) — SENGAJA TIDAK di-rebuild
Sama seperti Sesi 1: base snapshot sudah punya version drift pre-existing
sebelum patch apa pun disentuh. Perbaikan drift di Sesi 2 (poin 3 di atas)
menyamakan SOURCE ke nilai yang sudah ada di bundle (`'1700'`) — jadi
justru mengurangi risiko `node scripts/build.js` gagal di sesi berikutnya,
bukan menambahnya. Bundle tetap tidak di-rebuild sesi ini (di luar cakupan
kedua patch fungsional di atas); rebuild direkomendasikan sebagai langkah
terpisah setelah drift ini beres.

## File yang diubah (ZIP ini, kumulatif Sesi 1+2+3)
- `car-notes.js` — fix inti (Sesi 1) + 3 fitur UI baru (Sesi 2, poin 1/2/4)
- `chat-action-handlers.js` — fix version drift (Sesi 2, poin 3)
- `modules/shared/modules-render.js` — fix version drift (Sesi 2, poin 3)
- `modules/shared/modals.js` — fix version drift (Sesi 2, poin 3)
- `modules/shared/modules-calc.js` — fix version drift (Sesi 2, poin 3)
- `index.html` — daftarkan tema Minimal: link CSS + theme-card baru (Sesi 3)
- `app_production.html` — di-sinkron ulang jadi cermin persis `index.html`
  (tema Minimal + fix drift `serviceIntegrityCard` yang sudah ada
  sebelumnya) (Sesi 3)
- `tests/s640-modern-theme-registration-audit.test.js` — koreksi angka
  guard total theme-card dari 12 ke 13 (Sesi 3, lihat poin 3 di atas)

## Sisa Rekomendasi (belum dikerjakan)
- Split `car-notes.js` menjadi beberapa file per submodul (BBM/Servis/Torsi)
  — lihat poin 5 di atas, sengaja ditunda sebagai sesi terpisah.
- Setelah version drift beres, jalankan `node scripts/build.js <versi-baru>`
  di sesi terpisah untuk benar-benar merilis bundle yang menyertakan semua
  perubahan di atas (saat ini source sudah berisi fix, tapi
  `app-bundle-a/b.min.js` belum di-rebuild — ini sekarang MENCAKUP juga
  tema Minimal dari Sesi 3, belum hanya version drift Sesi 2).
