# Fase 5B — S2769 (akumulasi di atas S2768)

## Koreksi audit
- Rencana §A#4 ("tema hanya ganti warna") sebagian keliru: Graphite & Modern sudah memakai angka monospace; radius, padding, spasi, dan `--density` identik di 4 tema; `--density` dan `--font-num` tidak tersambung.
- Kontras: teks sekunder `--text2` Light (#6060a0 di #f5f5fa) = **5,25:1** (lolos). Dugaan "berpotensi di bawah 4,5:1" tidak terbukti pada Light. Satu-satunya `--text2` yang gagal di permukaan umum adalah **Modern di atas `--surface3`** (4,35:1).

## Perubahan (hanya `tokens.css`, tanpa `!important`, tanpa override komponen baru)
1. Token per tema (blok FASE 5B):
   | Tema | `--density` | `--card-pad` | `--card-radius` | `--font-num` |
   |---|---|---|---|---|
   | Dark, Light (lega) | 1 | 14px | 14px | Space Grotesk |
   | Graphite, Modern (padat) | .8 | 10px | 10px | monospace |
   Layar ≥900px: pad +6px, radius +4px (`--card-pad-up`, `--card-radius-up`) sehingga Dark/Light di desktop tetap 20px/18px seperti sebelumnya; padat menjadi 16px/14px.
2. `.card` membaca `--card-pad`/`--card-radius`; jarak bawah kartu = `12px × --density` (kartu grup Pengaturan dikecualikan, aturan lamanya tetap).
3. Angka uang (`.stat-val .tx-amount .shop-price-final .shop-price-strike .ldr-days .money .card-val`) membaca `--font-num`.
4. `--text2` Modern #6b6b6b → #686868 (4,55:1 di `--surface3`, 4,98:1 di `--surface2`). Tema lain tidak diubah.
5. Dihapus: `@media (min-width:1100px){:root{--density:.86}}` (tidak dipakai apa pun; digantikan token tema).

## Terukur (Chromium, seed sintetis; sebelum → sesudah)
- Mobile 390, kartu (padding/radius/jarak): Dark & Light 13/14/10 → 14/14/12; Graphite & Modern 13/14/10 → 10/10/9,6.
- Desktop 1440: Dark & Light **tidak berubah** (20/18/12, 0 selisih pada 8 halaman); Graphite & Modern 20/18/12 → 16/14/9,6.
- Font angka: sebelum = sesudah di 4 tema × 3 viewport × 8 halaman (tidak ada perubahan; hanya sumbernya kini token).
- Tinggi halaman mobile: Dark/Light +4…+26px; Graphite/Modern −6…−71px.
- 0 error console/page, 0 scroll horizontal di 96 kombinasi (3 viewport × 4 tema × 8 halaman). Teks <12px dan kontrol <40px pada Keuangan tidak berubah.
- Capture: `docs/screenshots-fase5b/{before,after}/` (Keuangan, 4 tema × mobile/desktop) + `metrics.json`; ulang dengan `python3 tools/capture-fase5b.py`.

## Belum / catatan jujur
- Kontras hanya diukur pada token (4 tema × bg/surface/surface2/3/4), bukan setiap elemen di DOM. Teks `--text2` di atas `--surface4` masih <4,5:1 (Dark 4,26; Light 4,22; Modern 3,89) tetapi hanya dipakai pada tombol fungsi kalkulator (`.calc-key.fn`); tidak diubah. `--text3` Light/Modern di `--surface3` 4,24/4,16 dan aksen Light sebagai teks 3,94:1 di `--surface2` juga tidak diubah (di luar lingkup `--text2`).
- Aturan ber-ID (mis. `#page-carnotes .card`, `.dashhub-wrap.card`) tetap menang atas token, jadi sebagian kartu (Car Notes 13px, hub 12px) tidak ikut tema.
- Tipografi/radius per komponen Graphite (129 selektor) sengaja tidak disentuh.
- Font web tidak termuat di sandbox (fallback); Safari/Firefox, Android, lint penuh belum.
- Sisa Fase 5: layar PIN, empty state, skeleton, transisi halaman.
