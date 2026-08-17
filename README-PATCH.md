# Patch: Fix loading kelip putih→hitam & tabel Dana Titipan tidak rapi

Tanggal: 2026-08-17
File yang diubah: `styles.css` (HANYA file ini, 2 blok tambahan, tidak ada yang dihapus/diubah selain itu)

## Cara pakai
1. `dana-titipan-loading-fix.patch` — git patch, apply dengan:
   ```
   git apply dana-titipan-loading-fix.patch
   ```
   atau `patch -p1 < dana-titipan-loading-fix.patch` dari root project.
2. Atau langsung timpa `styles.css` di folder project dengan file `styles.css`
   di zip ini (sudah berisi fix + seluruh isi asli, tidak ada yang hilang).

## Bug #1 — Loading awal kelip putih lalu hitam
**Root cause:** `.u-dnone { display:none; }` didefinisikan LEBIH AWAL di
styles.css daripada `.onboard { display:flex; ... }` dan
`.pin-screen { display:flex; ... }`. Karena spesifisitas CSS-nya sama
(1 class), aturan yang datang belakangan di file yang menang — jadi
`display:flex` milik `.onboard`/`.pin-screen` MENGALAHKAN `display:none`
dari `.u-dnone`, walau elemen `<div id="onboard" class="onboard u-dnone">`
punya class `u-dnone`. Efeknya: layar Onboarding/PIN (latar terang, sebelum
tema gelap diterapkan `applyEffectiveTheme()`) sempat ke-paint TERBUKA di
layar begitu HTML+CSS selesai dimuat, dan baru disembunyikan setelah JS
(`init()` di app-bundle-b.min.js) selesai jalan beberapa saat kemudian
(nunggu `await load()` dkk). Itulah kilatan putih→hitam yang terekam di
video — bukan murni soal bundle JS besar, tapi soal urutan CSS.

**Fix:** tambah aturan spesifisitas lebih tinggi
`.onboard.u-dnone, .pin-screen.u-dnone { display:none; }` supaya SELALU
menang berapa pun urutan file-nya. Tidak menyentuh HTML/JS sama sekali,
dan tidak memakai `!important` blanket di `.u-dnone` (dipakai 150+ tempat
lain di app) supaya risiko regresi seminimal mungkin.

**Catatan tambahan (tidak diubah di patch ini, hanya observasi):**
`app-bundle-a.min.js` (~1.3MB) dan `app-bundle-b.min.js` (~3.6MB) dimuat
lewat `<script src=...>` biasa (bukan `defer`/`async`), dan `index.html`
memakai `document.write(MODAL_HTML[n])` ~100 kali yang butuh bundle-a
sudah tereksekusi SINKRON saat parsing HTML. Ini genuinely bikin proses
loading "berat" (jaringan+parse besar sebelum app interaktif), tapi
memperbaikinya butuh refactor loading strategy (mis. ganti pola
`document.write` modal ke lazy-render), bukan patch CSS satu baris —
di luar scope patch ini supaya tidak berisiko merusak wiring modal yang
ada.

## Bug #2 — Tabel Dana Titipan (kartu per-pemilik) tidak rapi
**Root cause:** baris ringkasan owner (`<summary class="u-flex u-jcb ...">`)
memuat avatar + nama + blok "Pokok Rp X → Kini Rp Y +Rp Z" dalam SATU baris
flex tanpa `flex-wrap`. Kalau ruang tidak cukup, browser men-shrink blok
angka (child terakhir) sampai teksnya terpaksa wrap — dan karena tidak ada
kontrol wrap, ia patah di TENGAH angka/kata ("...→ Kini" lanjut baris baru
"Rp X +Rp 0"), persis seperti di screenshot (owner "mas sihab").

**Fix:** izinkan `<summary>` wrap ke 2 baris — baris atas avatar+nama, baris
bawah blok Pokok→Kini→± turun penuh 1 baris rata kanan, dengan setiap
potongan teks (`Pokok`, nominal, `Kini`, nominal, ±) tetap sebagai unit utuh
yang boleh pindah baris tapi tidak pernah terpotong di tengah. Murni CSS,
0 teks/angka/struktur HTML/JS diubah.
