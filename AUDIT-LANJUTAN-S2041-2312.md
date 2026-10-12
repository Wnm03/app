# Audit Lanjutan & Akumulasi — build 2312 (B1–B10 + UI/UX S2311 + hardening parser/E2E)

Tanggal: 11 Oktober 2026
Baseline: `app-main (18).zip` (build 2295), SHA-256 `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`
Build hasil: `s2041-1-part-sot-hardening-2312` (`?v=2312`, `kw-cache-v2312`)

## Perubahan
1. **`parsePzNum` (audit):** fungsi lama membuang semua non-digit, sehingga input desimal eksplisit seperti `1500000,50` terbaca 150000050 (100x lipat). Dipakai antara lain oleh nilai aset, modal investasi, NJOP/PBB, harga emas/gram, dana darurat, bon tukang. Kini desimal eksplisit di akhir (`[.,]` + 1–2 digit) dibulatkan ke rupiah utuh lewat `parseMoneyID`; input lain (`1.234.567`, `Rp 15.000`, `-2.500`, teks tampilan) tidak berubah.
2. **E2E:** 5 cek baru pada viewport mobile 390px: FAB "+" di Beranda (menu fallback terbuka, 4 aksi, tombol >= 44px, di dalam viewport dan di atas navigasi bawah, klik kedua menutup) dan tab Uang (satu baris, `nowrap`, dapat digeser, breadcrumb ganda tersembunyi, tanpa scroll horizontal). Total E2E 16 cek.
3. Tes regresi `parsePzNum` ditambahkan; `FILE-HASHES-SHA256.txt` dibuat ulang; versi 2312 sinkron.

## Bukti
| Pemeriksaan | Hasil |
|---|---|
| Full suite paksa ulang | 8.790 tes: 8.789 pass, 0 fail, 1 skipped |
| Release gate | lihat manifest 2312 |
| E2E headless | PASS 16/16 |

## Batasan
- Pembulatan desimal `parsePzNum` ke rupiah utuh adalah keputusan kontrak (aset/pajak berbasis rupiah bulat); bukan cocok untuk kuantitas/harga pecahan.
- Panggilan `parseMoneyID` masih berfallback `parseDecStr` bila `pajak-aset-ui-wrappers.js` gagal dimuat.
- Verifikasi UI memakai DOM/computed-style di Chromium headless 390px; bukan Safari/iOS, bukan interaksi sentuh nyata, dan bukan penilaian estetika.
- Bukan review baris-per-baris seluruh runtime.
