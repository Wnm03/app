# Patch — setTheme() trigger re-render tab Uang/Aset saat pindah ke tema "modern"

## Masalah
Tema "modern" (RENCANA-MODERNISASI-UI.md, s635-s639) sebagian markup-nya
di-gate lewat CSS murni (`[data-theme="modern"]` di styles.css — warna,
--font-mono, ticker Beranda), tapi sebagian lain (tabel Ledger Pro tab Uang
di renderKeuangan(), list padat tab Aset di Aset.renderList()) di-gate lewat
cek `D.profile.theme==='modern'` DI DALAM fungsi render masing2 tab.

setTheme() sebelumnya cuma set atribut data-theme + save() — CSS langsung
reaktif, tapi markup terstruktur (kartu -> tabel) baru berubah kalau tab
Uang/Aset di-render ulang (pindah tab lalu balik, ganti filter, dst).
User melihat ini sbg "tampilan tidak berubah, hanya tema/warna saja".

## Fix
`modules/shared/format-tema.js` — `setTheme()`: tambah pemanggilan
`renderKeuangan()` dan `Aset.renderList()` (guarded `typeof`) di akhir
fungsi, supaya tab yg sedang terbuka ikut re-render seketika saat ganti
tema, bukan menunggu next navigasi.

## Cakupan & risiko
- 1 file diubah, tambahan 2 baris pemanggilan fungsi (guarded).
- Tidak mengubah rumus/logic render itu sendiri — murni memanggil ulang
  fungsi render yang sudah ada.
- Tidak berdampak ke 10 tema lama: kedua fungsi sudah self-branch
  berdasarkan D.profile.theme, jadi utk tema selain "modern" hasil
  render-nya sama seperti sebelumnya (jalur kartu).
- Guarded typeof supaya aman kalau file dipakai test standalone atau
  elemen DOM terkait belum ada (masing2 fungsi sudah early-return null).

## Verifikasi
`node --test tests/*.test.js` → **4612/4612 pass, 0 fail** (baseline
sebelumnya 4596 di merge overlay s635-639; selisih krn ada penambahan
test lain sejak README itu ditulis, TIDAK ada test yang di-skip/hapus).

## File dalam patch
- `modules/shared/format-tema.js` (isi diganti)
