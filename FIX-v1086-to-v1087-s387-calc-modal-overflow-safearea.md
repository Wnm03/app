# FIX v1086 → v1087 — Sesi 387: `.calc-modal` (Tambah Transaksi) kepotong di
browser mobile dgn toolbar bawah

## Bug

Modal "Tambah Transaksi" (`#calcModal`, class `.calc-modal`) TIDAK punya
`max-height`/`overflow-y`/`env(safe-area-inset-bottom)` sama sekali —
beda dari `.modal` (modal lain di app) yang sudah benar. Kalau tinggi
konten modal (Kategori/Subkategori/Jumlah + kalkulator) lebih tinggi dari
viewport yang KELIHATAN (browser mobile dgn toolbar alamat/nav bawah
yang masih tampil, mis. Brave), bagian bawah modal (baris kalkulator/
scan struk) kepotong di balik toolbar browser & TIDAK BISA discroll utk
dijangkau — krn tidak ada `overflow-y:auto` yg membatasi tinggi modal ke
area yg kelihatan.

## Audit bug serupa

Cuma ada 3 class modal bottom-sheet di app (`border-radius: Npx Npx 0 0`):
`.modal`, `.calc-modal`, `.qs-modal`. Ditemukan 2 dari 3 bermasalah:
- `.calc-modal` — 0 dari 3 proteksi (max-height/overflow-y/safe-area).
- `.qs-modal` — sudah ada `max-height:88vh` + safe-area, TAPI kurang
  fallback `88dvh` (`vh` di browser mobile pakai tinggi viewport
  MAKSIMAL/toolbar-collapsed, bukan tinggi yg kelihatan saat toolbar
  masih tampil — beda dgn `dvh` yg dinamis ngikutin toolbar).
- `.modal` — sudah benar (vh+dvh+overflow-y+safe-area), dijadikan
  acuan pola perbaikan.

## Perubahan

- `styles.css`
  - `.calc-modal` — tambah `max-height:90vh; max-height:90dvh;
    overflow-y:auto; overflow-x:hidden;` + padding-bottom dibungkus
    `calc(28px + env(safe-area-inset-bottom, 0px))` (sebelumnya flat
    `28px`). Pola PERSIS SAMA `.modal`.
  - `.qs-modal` — tambah 1 baris `max-height:88dvh;` (fallback dvh
    setelah `88vh`, sama pola `.modal`).
- Versi `v1086` → `v1087`.

## Test

CSS-only, tidak menyentuh JS — `node --test tests/*.test.js` tetap
2614/2616 PASS (2 fail sama, pre-existing, tidak terkait — lihat
`FIX-v1084-to-v1086-s386-csv-import-berat-catatan.md`).
