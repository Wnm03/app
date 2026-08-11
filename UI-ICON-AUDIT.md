# UI Icon Audit — Tahap 6

Lanjutan dari Tahap 5 (baseline 1227/1227 test PASS, 0 JS berubah).
Audit ini **tidak mengulang** audit CSS/HTML umum di `UI-AUDIT.md`
(Tahap 1) — fokus khusus pada inventarisasi seluruh *icon* di project,
sesuai instruksi Tahap 6.

## Metodologi

- Pemindaian penuh (bukan sampel) terhadap seluruh 69 file `.js`
  (termasuk `lifeos/**`), `styles.css`, `index.html`/
  `app_production.html`, menggunakan pola regex per kategori:
  - Emoji: rentang Unicode emoji (`U+1F300–U+1FAFF`,
    `U+2600–U+27BF`, `U+1F1E6–U+1F1FF`, `U+2B00–U+2BFF`)
  - SVG Inline: tag `<svg ...>` literal di markup
  - SVG File: file `.svg` di root/aset
  - Unicode Symbol fungsional: `› ‹ ✕ ✓ ✗ ★ ☆ ▾ ▸ → ← ↑ ↓ ⋮`
  - CSS Generated Icon: deklarasi `content:'...'` di `styles.css`
  - Image Icon: tag `<img>` icon & `background-image` di CSS
- Setiap kecocokan diverifikasi manual (baca konteks baris) untuk
  membedakan icon UI sungguhan vs. false positive (mis. emoji di
  dalam string dokumentasi/komentar, atau karakter emoji yang
  merupakan **data pengguna**, bukan icon).

## Ringkasan angka

| Kategori | Jumlah | Lokasi utama |
|---|---:|---|
| Emoji | 4.759 | 400 di HTML statis, ±4.359 di JavaScript |
| SVG Inline | 16 | `index.html` (≡ `app_production.html`) |
| SVG File | 2 | `icon-192.svg`, `icon-512.svg` (PWA manifest) |
| Unicode Symbol (fungsional) | ±45 | `▾` (30+×), `✕` (7×), `‹›→←↑⋮` |
| CSS Generated Icon | 1 | `styles.css` — `details.card summary::after` |
| Image Icon | 0 | Tidak ada `<img>`/`background-image` sebagai icon |

## Tabel detail per lokasi

| Lokasi File | Jenis Icon | Digunakan Untuk | Konsisten? | Aksi | Alasan |
|---|---|---|---|---|---|
| `index.html` baris 298, 538, 807, 1205 (tombol `qs-btn` qsKeuangan/qsLaporan/qsCarnotes/qsAI) | SVG Inline + Emoji (duplikat) | Icon "buka menu cepat" | **Tidak** | **DIGANTI** — emoji `⚙️` dihapus, SVG dipertahankan | Dua icon bermakna sama dirender berdampingan; bug inkonsistensi nyata |
| `index.html` baris 177, 634 (tombol `qs-btn` qsDashboard/qsShop) | SVG Inline | Icon + label tombol ("Aksi Cepat", "Atur") | Konsisten | Dipertahankan | Sudah pola benar: SVG + teks tanpa duplikasi |
| `index.html` baris 669, 1985–2009 (search icon, grid icon, dsb.) | SVG Inline | Icon fungsional UI kecil | Konsisten (gaya seragam `stroke=currentColor`, viewBox 24×24, stroke-width 2) | Dipertahankan | Sudah SVG rapi, tidak ada yang perlu diubah |
| `styles.css` baris 82 (`details.card summary::after`) | CSS Generated Icon | Panah dropdown native `<details>` | Konsisten, ringan | Dipertahankan | Native, tanpa markup tambahan |
| `index.html` ±30 titik `<span class="card-collapse-toggle">▾</span>` | Unicode Symbol | Chevron expand/collapse kartu | Konsisten, satu pola dipakai berulang identik | Dipertahankan | Fungsional, ringan, tidak butuh SVG |
| `index.html` 7× `✕` (`modal-title` close), `‹ › → ← ↑ ⋮` | Unicode Symbol | Tutup modal / navigasi bulan / kirim chat / dsb. | Konsisten | Dipertahankan | Simbol sistem standar |
| `index.html` 7× `class="page-title"` (🏠 Beranda, 📊 Laporan, 🪨 Bisnis Shop, 🏍️ Car Notes, 🕌 Pajak & Zakat, 🤖 AI Asisten, 🧭 Dashboard Hub) | Emoji (UI, teks statis HTML) | Icon judul halaman | Konsisten sebagai pola (1 emoji/halaman) | Dipertahankan di Tahap 6; **direkomendasikan** untuk Tahap 7 | Aman teknis (0 referensi JS ke `.page-title`, diverifikasi `grep`), tapi perlu 7 aset SVG baru + review visual → di luar "perubahan minimal" |
| `index.html` ±380 titik lain: `card-title`, tombol aksi (`btn-ghost`, `card-setting-btn`), `<option>` dropdown, `empty-icon` | Emoji (UI, teks statis HTML) | Icon semantik per section/tombol/state kosong | Konsisten sebagai pola, volume besar | Dipertahankan (rekomendasi Tahap 7) | Aman teknis tapi effort besar; perlu >380 icon SVG baru |
| `dashboard-hub-registry.js` field `icon:` (🏠💰🛒🚗🕌📦🌱🤖☁️⚙️ dst., ±25 entri) | Emoji (**data JavaScript**) | Icon kartu dashboard, dirender lewat JS | Konsisten | **Dipertahankan — tidak boleh diganti tanpa ubah JS** | Field pada object registry; mengganti = mengubah JavaScript |
| 60+ file `.js` lain (mis. `modals.js` 374×, `modules-render.js` 160×, `features-aiwidget-reminder-gdrive-search.js` 126×) | Emoji (mayoritas **data/label JS**, sebagian berpotensi teks pengguna) | Icon tombol, toast, label dinamis; sebagian bisa jadi bagian teks yang diinput pengguna | Beragam | **Dipertahankan — rekomendasi JS untuk Tahap 7, bukan dieksekusi** | Dilarang mengubah JavaScript di Tahap 6; sebagian butuh verifikasi kasus-per-kasus mana yang UI-icon murni vs. data pengguna |
| `app-bundle-a.min.js`, `app-bundle-b.min.js` | Emoji (build output) | Hasil bundling otomatis dari source `.js` | — | Tidak disentuh | File hasil build (`scripts/build.js`); mengedit langsung = menyimpang dari source of truth & melanggar batas "Build System tidak boleh diubah" |
| `icon-192.svg`, `icon-512.svg` | SVG File | App icon PWA (manifest) | Konsisten | Dipertahankan | Sudah SVG file terpisah sesuai standar PWA, tidak terkait icon dalam UI |
| Baris 19 `index.html` (`<img onerror="...">` dalam teks) | Image Icon (false positive) | Contoh string di catatan keamanan CSP, bukan icon yang dirender | N/A | Dipertahankan (bukan icon) | Bukan elemen `<img>` nyata — bagian dari teks dokumentasi inline |

## Daftar dipertahankan

- 14 SVG inline fungsional (search icon, grid icon, dll.)
- 2 SVG file (`icon-192.svg`, `icon-512.svg`)
- 1 CSS-generated icon (`::after{content:'▾'}`)
- Seluruh Unicode symbol fungsional (`▾ ✕ ‹ › → ← ↑ ⋮`)
- 2 tombol `qs-btn` yang sudah benar (Dashboard, Shop)
- Seluruh emoji di JavaScript (data & UI) — termasuk field `icon:` di
  `dashboard-hub-registry.js`
- 7 emoji `page-title` + ±380 emoji lain di HTML (dipertahankan untuk
  Tahap 6, direkomendasikan migrasi di Tahap 7)

## Daftar diganti (Tahap 6)

- 4× emoji `⚙️` redundan dihapus dari tombol `qs-btn`
  (qsKeuangan, qsLaporan, qsCarnotes, qsAI) di `index.html` dan
  `app_production.html`. SVG gear yang sudah ada dipertahankan sebagai
  satu-satunya icon.

## Daftar SVG baru

Tidak ada — perbaikan Tahap 6 murni penghapusan teks duplikat, tidak
memerlukan aset baru. `assets/icons/` disiapkan sebagai lokasi
rekomendasi untuk Tahap 7.

## Rekomendasi untuk Tahap 7 (icon yang butuh perubahan JavaScript)

1. **Migrasi 7 emoji `page-title` → SVG lokal** — bisa dilakukan
   tanpa menyentuh JS (murni HTML), tapi butuh sesi terpisah untuk
   desain 7 icon + review visual sebelum dieksekusi.
2. **Migrasi ±380 emoji lain di HTML** (`card-title`, tombol,
   `<option>`, empty-state) → SVG lokal — sama seperti di atas, HTML-
   only tapi volume besar.
3. **Emoji pada field `icon:` di `dashboard-hub-registry.js`** (dan
   registry serupa) → mengganti ke SVG memerlukan perubahan JavaScript
   (struktur data + cara render), harus dilakukan sebagai tahap
   tersendiri dengan scope eksplisit "boleh ubah JS", di luar batasan
   Tahap 6.
4. **Audit lanjutan per file JS** untuk memisahkan emoji yang murni
   icon UI (aman diganti) vs. emoji yang merupakan bagian dari teks/
   template yang bisa memuat data pengguna (tidak boleh diubah) —
   perlu ditinjau kasus per kasus, tidak bisa digeneralisasi lewat
   regex saja.

## Verifikasi non-regresi

| Pemeriksaan | Sebelum | Sesudah |
|---|---|---|
| `node --test tests/*.test.js` | 1227/1227 PASS | 1227/1227 PASS (identik) |
| File JS yang tersentuh | — | **0** |
| `index.html` ≡ `app_production.html` | Identik | Tetap identik (diverifikasi `diff`) |
| ADR-001, FEATURE_REGISTRY, Blueprint Final, Build System, Service Worker, Routing | — | **Tidak disentuh** |
