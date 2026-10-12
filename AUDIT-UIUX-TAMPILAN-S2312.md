# AUDIT UI/UX TAMPILAN — baseline app-main (12) + PATCH S2041-2312 (build 2312)

Tanggal: 11 Oktober 2026 · Peran: audit saja (tidak ada kode aplikasi yang diubah) · Perbaikan dikerjakan pihak lain.
Semua perbaikan di bawah bersifat **presentasi (CSS/markup/teks)**; tidak menyentuh logic, SOT, atau data.

## 0. Hasil penerapan patch
| Pemeriksaan | Status |
|---|---|
| Overlay patch ke baseline (87 file; 67 identik dgn baseline, 16 berubah, 4 baru) | PASS |
| Hash payload patch (`FILE-HASHES-SHA256.txt`) | PASS (13/13 yang tercantum cocok) |
| `verify-patch-integrity.js` | PASS (87 apply files, 0 delete) |
| Full test (`run-full-test.js`, paksa ulang) | PASS — 8.790 tes, 8.789 pass, 0 fail, 1 skipped (sama dgn klaim patch) |
| `verify-bundle-freshness` kedua bundle | PASS |
| `verify-window-expose` | PASS (83 modul) |
| Build runtime / cache | `s2041-1-part-sot-hardening-2312` / `kw-cache-v2312` |
| Release gate lint (eslint) | NOT VERIFIED — tidak dijalankan di sandbox ini |
Catatan: baseline `app-main (12)` ternyata sudah berada di build 2311 (S2311 sudah ada), sehingga patch efektif menambah: `parsePzNum` (desimal), E2E 390px, dan sinkronisasi versi 2312.

## 1. Metode & batas
- Chromium headless (Playwright) pada 360×800, 390×844, 412×915, 1280×720, 1440×900; 8 halaman (Beranda/Hub, Keuangan, Aset, Mobil, Pajak, Shop, AI, Pengaturan) + 4 modal (Pengeluaran, Pemasukan, Isi BBM, Servis) pada 360×640 dan 390×844.
- Data sintetis (1 kendaraan, 24 transaksi, 2 log BBM); tema bawaan `dark`. Tema lain tidak diaudit ulang.
- Diukur: overflow horizontal, ukuran target sentuh, ukuran font, kontras WCAG (alpha dikomposit), pembungkusan angka, posisi scroll, geometri header.
- **Tidak** diverifikasi: Safari/iOS, sentuhan nyata, screen reader, tema selain `dark`, halaman/sub-tab yang tidak dibuka (Laporan, Budget, Tagihan, Piutang, Akun, Servis detail, Jalan, Katalog, sub-tab Shop selain default).
- Tidak ada overflow horizontal halaman (`scrollWidth − clientWidth = 0`) di 5 viewport × 8 halaman: PASS.

## 2. Temuan (urut prioritas)

### U-01 · TINGGI · Tab utama Keuangan: 6 dari 7 tab tak terlihat di mobile
- Bukti: pada 360 dan 390 px tiap tab selebar 334 px/364 px (lebar bar sama) → hanya "💰 Kelola" terlihat; Tagihan & Cicilan, Budget, Piutang & Utang, Aset & Proyek, Laporan, Akun ada di luar layar tanpa petunjuk geser. `scrollWidth` bar 2.586 vs `clientWidth` 366.
- Akar masalah: aturan grid lama `#page-keuangan > .cn-tabs .cn-tab { width:100% }` (styles.css ±baris 1371) tidak di-reset oleh aturan S2311 `#page-keuangan > .cn-tabs > .cn-tab { flex:0 0 auto … }` (±baris 3481). Cek E2E S2311 ("satu baris, nowrap, dapat digeser") lulus karena hanya memeriksa properti, bukan lebar tab.
- Perbaikan (CSS): tambah `width:auto` pada aturan ±baris 3481 (dan pada varian `@media (max-width:359px)`).
- Diuji dgn injeksi CSS: lebar tab menjadi 80/144/86/138/125/92/74 px → 3 tab terlihat + sisanya terbaca sebagai bisa digeser. Status: **VERIFIED (efek), perbaikan belum diterapkan**.
- Saran tes: E2E assert `min(lebar tab) < 0.6 × clientWidth bar` dan ≥ 3 tab terlihat.

### U-02 · TINGGI · Label tab aktif nyaris tak terbaca (kontras 1,08:1)
- Bukti (dark): teks `rgb(23,24,27)` di atas `rgb(14,15,19)` pada `.segmented-control > .kel-subtab.active` (Keuangan › "📊 Ringkasan"), `.chip-btn.active` di Shop ("Harga Jual" dan toggle "▦"), dan chip aktif di Pengaturan ("0").
- Akar masalah: `.kel-subtab.active/.chip-btn.active/.cn-tab.active { color:var(--on-accent)!important }` (modern-ui-layer.css ±baris 895–905) bertabrakan dgn `.segmented-control > .active { background:var(--surface); color:var(--text) }` (styles.css ±1454): latar tetap gelap tetapi teks dipaksa gelap.
- Perbaikan (CSS): untuk `.segmented-control > .active` set `color:var(--text)!important` (atau jangan pakai `--on-accent` bila latar bukan `--accent`).
- Diuji injeksi: warna teks menjadi `rgb(243,241,236)`. Status: **VERIFIED (efek)**.

### U-03 · TINGGI · Header desktop bergeser ganda (offset sidebar dua kali)
- Bukti (1280 px): `.header` sticky di `left=464, width=816` (seharusnya `left=232, width=1048`); `margin-left:232px` diterapkan di dalam kontainer yang sudah bergeser 232 px. Merek "Keluarga W" tampil dua kali (sidebar + header) dan tombol aksi terdorong; ruang kosong 232 px di kiri header.
- Perbaikan (CSS): hapus `margin-left` pada `.header` saat layout sidebar aktif (kontainer sudah memberi offset) — atau hapus offset di kontainer, bukan keduanya.
- Diuji injeksi `margin-left:0` → `left=232, width=1048`. Status: **VERIFIED (efek)**.
- Terkait: merek ganda — pertimbangkan menyembunyikan teks merek di header saat sidebar tampil.

### U-04 · SEDANG-TINGGI · Mobil: halaman pertama kali dibuka sudah ter-scroll ±539 px
- Bukti: kunjungan pertama ke Mobil (klik nav nyata) → `#scrollRoot.scrollTop = 539`; judul "Car Notes", kartu Kendaraan Aktif, odometer, dan aksi Update KM/Katalog tersembunyi di balik header; kunjungan berikutnya `0`. Jejak: `scrollIntoView` dipanggil dari `setCnTab` → `scrollTabBarIntoView(el)` (vehicle-core.js ±baris 905; juga ±957/980 untuk sub-tab insight) saat render awal, bukan karena aksi pengguna.
- Perbaikan: jangan panggil `scrollTabBarIntoView` pada render/inisialisasi awal (hanya pada klik tab oleh pengguna), atau reset `scrollRoot.scrollTop=0` setelah render awal.
- Status: **VERIFIED (perilaku)**.

### U-05 · SEDANG · Tombol Simpan modal tidak terlihat tanpa scroll
- Bukti: Simpan berada di y=878 (Pengeluaran/Pemasukan, 390×844) dan y=1066 (Isi BBM); pada 360×640 y=858/1045/1127. Modal (`overflow-y:auto`) tidak memiliki footer sticky → tombol utama di luar layar saat form terbuka; Isi BBM butuh >1 layar scroll.
- Perbaikan: footer aksi `position:sticky; bottom:0` dgn latar solid + safe-area; ringkas jarak antarfield di mobile.
- Status: **VERIFIED**.

### U-06 · SEDANG · Angka Rupiah terpecah 2–4 baris di kartu sempit
- Bukti: "Rp 20.630.000" menjadi 3 baris (Keuangan › Saldo Akun, 390 px, lebar 79 px) dan 4 baris di Beranda › Kebebasan Finansial (1280 px, lebar 61 px; "Rp / 20.6 / 30.0 / 00"); "Rp 224.400.000" 2 baris (Pajak › nisab); "Rp 34.000/32.000" 3–7 baris di grafik BBM (elemen SVG teks).
- Perbaikan: `white-space:nowrap` pada nilai uang + grid kartu `repeat(auto-fit,minmax(110px,1fr))`/ukuran font `clamp()`; atau tampilkan format ringkas ("Rp 20,6 jt") di tile sempit. Teks SVG: perlebar viewBox/`text-anchor`.
- Status: **VERIFIED**.

### U-07 · SEDANG · Kontras teks-di-atas-aksen di bawah 3:1
- Putih di atas emas `#c9a35f`: **2,36:1** — tab aktif Beranda (`.dhb-subtab.active` "📊 Ringkasan"), chip kendaraan aktif (Mobil), tombol kirim AI "↑", bar kasir ("0 item/Bayar →", saat tampil).
- Teks gelap di atas ungu `#7c3aed`: **3,12:1** — "✅ Catat Sudah Bayar Bulan Ini" (Pajak).
- Putih di atas hijau `#16a34a`: **3,30:1** pada 10,5 px tebal — "Transaksi baru" (Shop).
- Label kecil berwarna (10 px): `pwa-workspace-kicker` teal 3,64:1 (Mobil), ungu 3,49:1 (Pajak).
- Perbaikan: satu token `--on-accent` per warna aksi (emas → teks gelap), hapus `color:#fff` hard-coded; naikkan label kicker ke ≥4,5:1 atau ≥12 px.
- Status: **VERIFIED (angka)**. Catatan: hasil bar kasir dan item menu FAB tertutup (rasio 1:1 dari scan) diabaikan karena tidak tampil.

### U-08 · SEDANG · Kartu "Fuel Intelligence": tata letak & teks
- Header: ikon ⛽ berada di kotak selebar hampir seluruh baris (±460 px di desktop, ±145 px di mobile) sehingga judul terdorong ke kanan.
- Teks: satu paragraf (≈1.150 karakter) mengulang "berpotensi memengaruhi konsumsi BBM" enam kali ("Cek/servis "Oli Mesin" … Cek/servis "Oli Gardan" …") — sulit dipindai; juga tumpang-tindih dgn baris "Risiko perawatan".
- Perbaikan: ikon ukuran tetap (≈40 px); gabungkan item serupa menjadi 1 kalimat + daftar bullet maks. 3 item ("+3 lainnya"); satu penjelasan dampak saja.
- Status: **VERIFIED**.

### U-09 · SEDANG · Tombol "Tambah" di sidebar desktop tidak rapi
- Bukti: `.nav-fab` (160×46, relative) berisi ikon "+" yang menonjol keluar/ter-offset di kiri-atas dan label "Tambah" di pojok kanan atas kotak; keduanya tidak sejajar vertikal. Terlihat di semua halaman desktop.
- Perbaikan: sidebar → `flex-direction:row; align-items:center; gap:10px`, ikon tanpa `margin-top` negatif (aturan mobile `.nav-fab-icon{margin-top:…}` bocor ke desktop).
- Status: **VERIFIED (visual)**; akar CSS **NOT VERIFIED**.

### U-10 · SEDANG · Inkonsistensi bilah tab antar halaman (mobile)
- Keuangan: satu baris (setelah U-01 benar), Aset/Shop/Pengaturan: grid 2–3 baris, Pajak: 2 chip; sub-tab Aset menampilkan label 2 baris ("Analisis & Pajak"). Pilih satu pola (scroll 1 baris atau grid ≤ 2 baris) untuk semua.
- Status: **VERIFIED** (pengamatan).

### U-11 · SEDANG · Kartu Beranda berbadan kosong
- "💰 Proyeksi Kas Bulan Ini" dan "🏖️ Dana Pensiun": `#dashCashProjBody`, `#dashPensiunBody` kosong (header + panah saja), pada 1280 px setelah 3 dtk, data sintetis ada. Tidak ada empty-state.
- Perbaikan: tampilkan teks empty-state ("Belum ada data cukup…") bila presenter tidak mengisi; atau sembunyikan kartu.
- Status: **VERIFIED (kosong)**; apakah kosong karena data sintetis minim **NOT VERIFIED** — perlu cek dgn data nyata.

### U-12 · SEDANG · Toast menutupi form
- Bukti: pada modal "Catat Isi BBM" toast "Backup semua berhasil…" (3 baris) menimpa field "Total" dan menghalangi input; toast tidak bisa ditutup dan muncul di tengah layar.
- Perbaikan: toast di atas bilah navigasi/sisi atas, `pointer-events:none` untuk toast informatif, ringkas teks ("Backup lokal OK; Drive/Sheets belum terhubung").
- Status: **VERIFIED** (muncul setelah save otomatis dari seeding; frekuensi di pemakaian nyata **NOT VERIFIED**).

### U-13 · RENDAH-SEDANG · Ukuran font & target sentuh
- 9 px: label aksi cepat Beranda (Transaksi/Riwayat/Cari Fitur/AI/Titipan). 10–10,5 px: eyebrow/kicker, `bbm-lbl`, `tx-meta`, label stat Shop, "Otomatis" (Aset). Pil status 10 px di desktop.
- Target <32 px: tile angka Keuangan (`kbPiutang`, `kbInventori` ±24 px tinggi, bila klik), toggle ▦/☰ Shop (31 px), tombol 🗑 (36×24, desktop), chip AI cepat (28 px tinggi, desktop), tautan "console.anthropic.com" (14 px tinggi), "Kelola →" (16 px).
- Perbaikan: minimal 11–12 px untuk teks bermakna; area sentuh ≥44 px (padding/`::after`).
- Input modal: 1–3 field per modal berfont <16 px → zoom otomatis iOS saat fokus (**NOT VERIFIED** di iOS).

### U-14 · RENDAH · Aksesibilitas label formulir
- Semua input di 4 modal yang diuji tidak punya asosiasi label programatik (`label[for]`/`aria-label`): 6/6 (Pengeluaran, Pemasukan), 9/10 (BBM), 5/5 (Servis). Input halaman tanpa label terasosiasi: Pajak (`zfJiwa`, `pzHargaEmas`, `pzNisabBulan`, `pzFitrahJiwa`), Pengaturan (`sGaji`, `sKirim`, `sTanggalLahir`). Label visual ada; hanya relasinya yang hilang.
- Perbaikan: `for`/`id` atau `aria-labelledby`.

### U-15 · RENDAH · Beranda
- Tombol "←" di header Dashboard Hub tampil di halaman utama (tak jelas tujuannya; **NOT VERIFIED** aksinya).
- "Ownership Summary" memakai layar pertama penuh (5 baris, termasuk empat baris bernilai 0); baris "Lihat semua kategori" + tombol ▾ terselip di tengah daftar. Selaras dgn prioritas dashboard informatif: pertimbangkan ringkas ke 1 baris + tautan, atau pindah ke bawah.
- Hub desktop: tab ("Ringkasan/Fitur/Widget/Insight") tumpang-tindih dgn header karena U-03.

### U-16 · RENDAH · Konsol produksi
- Setiap pemuatan Beranda mencatat `console.error` "[smoke-test] Ditemukan 71 masalah… ID dirujuk getElementById() tapi tidak ada di HTML" (mis. `dashAccList`, `dashAccTotal`, `ldrCycle`, `dashServisReminderCard`, …) — dua kali per muat. Status: **NOT VERIFIED** apakah ini ID dinamis/lazy yang sah atau sisa kode lama; minimal turunkan ke `console.debug` di produksi.

## 3. Yang diperiksa dan OK
- Tidak ada scroll horizontal halaman di 5 viewport × 8 halaman.
- Tombol Simpan modal tinggi 44 px; tombol tutup tersedia; modal tidak overflow horizontal.
- AI Asisten: 0 temuan target/label di mobile.
- `showPage()` mereset `scrollRoot` (kecuali kasus U-04).
- Bilah nav bawah mobile: tombol FAB "+" terbaca, ukuran ≥44 px (hasil E2E patch; tidak diuji ulang di sini).

## 4. Daftar tugas perbaikan (tanpa menyentuh logic/SOT/data)
| # | Tugas | File kandidat | Risiko |
|---|---|---|---|
| 1 | U-01 `width:auto` pada `.cn-tab` bilah Keuangan | styles.css | Rendah |
| 2 | U-02 warna teks tab aktif segmented | styles.css / modern-ui-layer.css | Rendah |
| 3 | U-03 hapus offset ganda `.header` desktop | styles.css | Rendah |
| 4 | U-04 hentikan auto-scroll render awal Mobil | vehicle-core.js | Rendah (UI saja) |
| 5 | U-05 footer Simpan sticky di modal | styles.css | Sedang (modal banyak) |
| 6 | U-06 nowrap/clamp nilai uang | styles.css + presenter kartu | Rendah |
| 7 | U-07 token on-accent konsisten + kicker ≥4,5:1 | styles.css, modern-ui-layer.css | Rendah |
| 8 | U-08 header & teks Fuel Intelligence | fuel-card.js | Rendah |
| 9 | U-09 rapikan FAB sidebar desktop | styles.css | Rendah |
| 10 | U-10–U-16 sesuai uraian | beragam | Rendah |

## 5. Saran tes regresi
E2E tambahan (viewport 390 & 1280): lebar tab Keuangan, kontras tab aktif ≥4,5:1, `header.left == sidebarWidth`, `scrollRoot.scrollTop==0` setelah pindah ke Mobil pertama kali, tombol Simpan modal `bottom ≤ viewport`.
