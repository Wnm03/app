# HANDOFF S2844 — Tagihan Pribadi/Titipan (lanjutan HASIL-UJI-BROWSER-TAGIHAN-DANA-TITIPAN)

Tanggal: 19 November 2026. Basis: app-main_17 (bundle v2859) + patch S2840–S2843. Patch ZIP kumulatif S2840–S2844, hanya berisi file yang berubah.
Aturan tetap: identitas "renov" dan "home in" TIDAK digabung di mana pun.

## 1. Yang sudah dikerjakan (kode)
| # | Temuan uji | Perubahan | File |
|---|---|---|---|
| 1,2 | Tagihan tidak mengenal kepemilikan; kolom pemilik tersembunyi | `deductionOwnerId` kini disimpan untuk SEMUA tagihan (bukan hanya yang tertaut proyek); SELF tidak disimpan. Saat bayar, tagihan non-proyek membawa pemilik tersimpan (bila masih pemilik akun sumber). Label diperjelas: "Pemilik dana / Penanggung (opsional — kosong = ikut pemilik akun sumber)"; placeholder "Ikut pemilik akun" bila tanpa proyek, "Pilih saat bayar" bila ada proyek | `finance/tagihan-kalender.js`, `finance/tx-renov.js`, `shared/modals.js` |
| 1 | Tidak ada ringkasan per kepemilikan | Helper `billOwnershipOf`, `getBillOwnershipSplit`, `updateBillOwnershipCard` (di tx-renov.js). Kartu "Pribadi / Titipan + chip per pemilik" dibuat dinamis di bawah pill statistik (index.html tidak diubah); hanya muncul bila ada tagihan titipan. Chip "🤝 nama pemilik" di tiap kartu tagihan titipan | `finance/tx-renov.js`, `shared/modules-render.js`, `finance/tagihan-kalender.js` |
| 4 | "home in" tidak tampil di Dana Titipan | `DanaTitipanPortfolioAPI.build()`: sumber ke-4 = pemilik akun non-SELF (append-only, tanpa menggabung identitas). Tampil dengan Pokok Rp0 / PRINCIPAL_NOT_SET | `finance/dana-titipan-aggregation-api.js` |
| 8 | Teks internal bocor/basi | Hapus "DESIGN-S520-...", "linkage S519", "fungsinya menyusul sesi berikutnya" di modal Pengeluaran Dana Titipan | `shared/modals.js` |
| 9 | Layar Dana Titipan membingungkan | Baris penjelas "Sudah Dialokasikan" vs "Total Teralokasi" di ketiga status ringkasan pool. Tombol "Catat/Update Pokok" ganda: ternyata hanya 1 yang terlihat (1 lagi di kartu lama yang tersembunyi) — tidak diubah | `finance/dana-titipan-portfolio-render.js` |
| 10 | Angka negatif tanpa minus | `fmt()` sengaja memakai nilai mutlak (konvensi app) → TIDAK diubah global. Hanya sub-teks kartu Kekayaan Bersih: "Saldo -Rp 1.641.149" | `finance/finance-dashboard.js` |
| – | Build resmi gagal | `MODULE_RENDER_VERSION` 2861 → 2859 (sinkron dengan konstanta lain). `build.js --require-minify` kini lolos tanpa trik manual; 4 tes versi yang sebelumnya gagal jadi hijau | `shared/modules-render.js` |
| – | Tes | Baru `tests/s2844-tagihan-kepemilikan-pribadi-titipan.test.js` (8 tes). Diperbarui `tests/s2830-renov-dropdown-pemilik-tambah-kelola.test.js` (placeholder baru) | tests |

Catatan teknis: `tagihan-kalender.js` tepat 1599 baris (batas gate 1600) — jangan tambah baris di sana; taruh helper baru di tx-renov.js. Gate S1860 melarang `catch(_e){}` kosong.

## 2. Hasil uji browser (Chromium 390×844, backup wallpanel-rab, 3 versi)
| Pengukuran | Baseline | +S2843 | +S2844 |
|---|---|---|---|
| Total tagihan Des 2026 | Rp596.382 | Rp596.382 | Rp596.382 |
| Kartu Pribadi / Titipan | – | – | Pribadi Rp291.900 / Titipan Rp304.482 (home in) |
| Setelah bayar wallpanel Rp212.000 | – | – | Titipan Rp92.482, Pribadi tetap |
| Chip pemilik di daftar | 0 | 0 | 3 ("home in") |
| Pemilik di Dana Titipan | renov, mas sihab | sama | renov, mas sihab, **home in** |
| Debt Optimizer memuat "home in" | Ya | Tidak | Tidak |
| Total Utang sebelum → sesudah bayar | 3.869.829 → 3.657.829 | sama | sama |
| Saldo pribadi sebelum → sesudah | −1.641.149 → −1.853.149 | sama | sama |
| Ledger home in / renov | 15→16 / 10 | sama | sama |
| Tx baru | home in, BRI, proyek renov | sama | sama |
| Error JS | tidak ada | tidak ada | tidak ada |

Pembayaran dari dana pemilik lain tetap masuk pengeluaran pribadi (akun BRI berlabel SELF) — SENGAJA tidak diubah (keputusan desain, lihat §4).

## 3. Status verifikasi
- Full suite TZ=UTC: referensi (base+S2843) 10034 tes / 38 gagal. Hasil saya (run 1): 10041 / 37 gagal; 4 gagal-lama jadi hijau, 3 gagal-baru sudah diperbaiki (batas 1600 baris, S2830, S1860). Run 2 menemukan 7 regresi `_saveBillInner()` → sudah diperbaiki dengan guard `typeof billOwnerIdFromForm`; tes terkait (49) + S2844 hijau.
- **BELUM dijalankan ulang: full suite final** setelah perbaikan terakhir dan setelah baris penjelas pool. Wajib: `TZ=UTC node --test tests/*.test.js`, bandingkan nama gagal dengan 38 gagal referensi (tidak boleh ada yang baru).
- **BELUM selesai: uji browser alur form tagihan baru** (tambah tagihan di akun BRI → pemilik "home in" otomatis terpilih & tersimpan → bayar → tx membawa `deductionOwnerId`; tagihan akun Cash → pribadi, tanpa penanda). Catatan: ✏️ Edit pada tagihan yang sudah punya riwayat bayar membuka `txModal` (edit transaksi terakhir), bukan modal tagihan — inilah asal "txModal terbuka" di laporan lama (bukan bug). Untuk menguji modal tagihan, pakai `openBillModal()` tanpa id (tagihan baru).
- Belum: uji Android, Safari/Firefox, build resmi di-upload.

## 4. Keputusan terbuka (butuh jawaban n)
1. Tagihan titipan yang dibayar dari akun SELF berporsi pemilik lain (BRI): tetap "pengeluaran pribadi" (sekarang) atau dipisah dari laporan pribadi? Kartu tagihan sekarang menandainya Titipan, laporan masih menghitung pribadi → perlu diselaraskan.
2. Perlu tanya pemilik saat bayar untuk tagihan non-proyek di akun multi-pemilik? (sekarang tidak, agar tidak membatalkan pembayaran di jalur tanpa modal).
3. `goal-adapter.js` (goalSourceDebt) masih bisa memuat utang titipan akun (catatan S2843).

## 5. Cara lanjut di chat baru
1. Lampirkan: app-main_17.zip, patch ZIP kumulatif S2840–S2844 (file di atas), backup wallpanel-rab.json, dokumen ini.
2. Terapkan patch di atas app-main_17; jalankan `node scripts/build.js --require-minify` di salinan (harus lolos tanpa trik).
3. Jalankan full suite & bandingkan dengan 38 gagal referensi.
4. Uji browser §3 (alur form tagihan baru) lalu perbarui laporan.
5. Putuskan §4, lalu kerjakan.
