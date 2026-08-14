# Patch: Fix Titipan Akun Langsung + Ghost Asset (Agustus 2026)

ZIP ini berisi **file lengkap (bukan diff)** hasil penerapan patch
`FIX-titipan-akun-langsung-ghost-asset.patch`. Setiap file sudah dalam
struktur folder yang sama seperti di repo — tinggal upload manual
(replace/overwrite) ke path yang sama di GitHub.

## Bug yang diperbaiki

**Bug A — Titipan akun tertaut langsung ke Holding tidak terhitung**
Holding yang tertaut LANGSUNG ke akun (lewat "🔗 Hubungkan ke Akun",
`h.accountId`) tanpa Aset perantara, transaksinya tidak pernah ikut
terhitung ke Dana Titipan / rekonsiliasi "Pengeluaran Majoris" —
karena `resolveTxOwnerSplitForAccount()` dan agregasi Dana Titipan
sebelumnya hanya mencari lewat `D.assets[].accountId`.

**Bug B — Ghost asset (sudah pindah ke Holding lain) dianggap tautan aktif**
Aset yang sudah dimigrasi otomatis (`_migratedToInvestmentId`) atau
ditautkan manual (`investmentId`) ke Holding lain masih bisa di-resolve
sebagai tautan aktif oleh `resolveInvestmentAssetLink()`, dan masih
ditawarkan sebagai opsi baru di dropdown link — menyebabkan data dobel
di daftar Investasi dan toast palsu "⚠️ Kepemilikan beda".

## File yang diubah

| File | Perubahan |
|---|---|
| `modules/asset/investasi.js` | `resolveInvestmentAssetLink()` & `investmentAssetLinkOptionsHtml()` — guard ghost asset |
| `modules/finance/filter-laporan.js` | `resolveTxOwnerSplitForAccount()` — cek Holding tertaut langsung ke akun sebelum fallback ke Aset |
| `modules/finance/dana-titipan-aggregation-api.js` | Agregasi Dana Titipan — union akun ikut sertakan akun tertaut langsung ke Holding |
| `modules/finance/dana-titipan-portfolio-render.js` | Presenter — pakai jalur resolusi baru |
| `tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js` | Test baru (Bug A: A1–A7, Bug B: B1–B7) |

## Cara upload manual

1. Buka repo di GitHub, masuk ke masing-masing path di atas.
2. Klik file → Edit (pensil) → replace seluruh isi dengan isi file dari ZIP ini
   (kecuali `tests/...test.js` yang merupakan file baru → Add file → Create new file).
3. Commit langsung ke branch kerja (atau buat branch baru sesuai kebiasaan).

Patch mentah (`.diff`) tetap disertakan sebagai referensi/arsip.
