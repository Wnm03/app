# PATCH S2854 — Chat AI: bayar tagihan, lunasi piutang, Dana Titipan, Renovasi, stok Cobek
Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2853; zip ini kumulatif (build v2878).

## Perubahan
| # | Tipe aksi | Perilaku |
|---|---|---|
| 1 | `pay_tagihan` | Menjalankan `markBillPaid` yang ada; dialog tanggal/nominal dijawab otomatis dari parameter AI. Dialog tak terduga (mis. "sudah dibayar periode ini", pilih pemilik) dibatalkan dan dilaporkan sebagai error. Nominal hanya boleh beda untuk kind `utang`. `tagihan-kalender.js` tidak diubah |
| 2 | `pay_piutang` | Talangan titipan = pemasukan non-pribadi (`talanganPayoffCreate`); piutang tertaut transaksi = pemasukan ke akun asal (hanya pelunasan penuh); piutang biasa = lunas / kurangi sisa. Piutang order Shop ditolak. Gagal simpan = rollback |
| 3 | `add_titipan` | `OwnerRegistry.findOrCreate` + `DanaTitipanPortfolioAPI.saveCommitment` (jalur UI). Pokok existing diganti, pesan menyebut nilai lama |
| 4 | `add_renov_proyek`, `add_renov_item` | Proyek (RAB/klien/lokasi/dana) dan item belum dibayar. `add_tagihan` menerima `projectName` + `itemName` untuk tautan proyek/item |
| 5 | `add_stok_cobek` | Tambah stok produk existing via `ProductRepository`; bila `accountName`+`hargaBeli` diisi, mencatat pengeluaran Bisnis/Cobek bertanda stok. Rollback bila gagal |
| 6 | Alur konfirmasi | `confirmChatAction`/`confirmAllChatActions` kini async (berurutan, penjaga klik ganda). Label, form Edit, ringkasan kartu, prompt AI diperbarui |

File: chat-action-handlers.js, modules/ai/chat-action.js, ai-chat.js, penanda versi (modals/modules-render/modules-calc/features-helpers-global-security), bundle, HTML, sw.js, docs/.

## Verifikasi
- Full suite TZ=UTC (8 shard): 10142 tes, 10141 lulus, 0 gagal, 1 skip (+11 tes baru `s2854-...test.js`).
- verify-release-ready LOLOS; lint 0 error.
- Browser (Chromium headless, 390x844, backup wallpanel-rab, AI di-stub): `e2e/s2854-chat-bayar-lunasi-titipan-renov-stok.js` 19/19 lulus, 0 pageerror.

## Belum
- Balasan AI sungguhan belum dicoba; kepatuhan model terhadap field baru perlu dicoba sekali.
- Pelunasan utang (Buku Utang), piutang order Shop, produk baru Cobek, akun/aset baru tetap lewat aplikasi.
- `build.js` menaikkan nomor versi sendiri, jadi hasil akhir v2878.

## Terapkan
Ekstrak di atas repo, lalu `node scripts/apply-delete-manifest.js` bila perlu.
