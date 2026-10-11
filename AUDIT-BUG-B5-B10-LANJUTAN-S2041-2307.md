# Audit Lanjutan B5–B10 — Keluarga-W (build 2307)

- **Baseline:** `app-main (18).zip` (2295) + patch kumulatif B1–B4 (2305). Hasil: `s2041-1-part-sot-hardening-2307`.
- **Cakupan:** menindaklanjuti kandidat finance yang di audit B1–B4 dicatat "belum diperbaiki/dikonfirmasi" (parse bunga/inflasi dengan koma, 0% tergeser `||`, parse nominal), lalu menyisir input desimal bertipe teks (`inputmode=decimal`) di modal. Bukan audit baris-per-baris.

## Temuan terkonfirmasi (direproduksi dengan kode aktual, lalu diperbaiki)

| ID | Lokasi | Gejala | Perbaikan |
|---|---|---|---|
| B5 | `parseDecStr()` (`pajak-aset-ui-wrappers.js`) — dipakai Investasi (qty/harga/fee/watch), Aset (harga beli, jumlah unit, harga kini), penyusutan | `1.500,50` → **1,5005** (seharusnya 1500,5); `12.345.678` → 12,345; `1,234,567` → 1,234 | Pemisah terakhir = desimal bila titik & koma bersamaan; pemisah berulang = ribuan. `7,5`, `1,234.5`, `1.5` tetap sama. |
| B6 | `Debt.save()` — `debtBunga` (input teks) | Bunga `7,5` tersimpan **7** (`parseFloat` berhenti di koma) → simulasi snowball/avalanche memakai bunga salah | Pakai `parseDecimalID`; kosong → 0; negatif tetap diclamp 0. |
| B7 | `EduFund.save()` — `eduInflasi`, `eduReturn` | `7,5` → 7; **0% → 12% / 8%** (`||` menggeser nol ke default) | Parser koma-sadar; default hanya bila kosong/NaN, 0 valid. |
| B8 | `EduFund.updatePreview()` | Pratinjau memakai string mentah: `50.000.000` → 50, `7,5` → 7, beda dari angka yang disimpan | Pratinjau memakai parser yang sama dengan `save()`. |
| B9 | Kasir Shop: `computeTxShopSaleTotals` (`cobek-tx-cart.js`) & `Order.computeTotals` (`cobek-order.js`) | Ongkir negatif/Infinity memotong total; di jalur Tx-cart diskon > subtotal membuat profit lebih rugi dari modal sebenarnya, diskon negatif menaikkan total & profit | Ongkir dijepit ≥0 & finite; diskon Tx-cart dijepit ke [0, subtotal] (jalur Order sudah dijepit sejak B4). |
| B10 | `pajak-pbb-zakat.js`: Zakat Penghasilan, UMKM, PPh21 "isi dari transaksi" | Bulan/tahun dibandingkan lewat `new Date('YYYY-MM-DD')` (UTC) → transaksi tgl 1 bisa masuk bulan/tahun sebelumnya di TZ negatif. **Tidak terlihat di WIB**; konsistensi dgn B1/B2. | Perbandingan string `YYYY-MM`/`YYYY`. |

## Diperiksa dan tidak ditemukan bug
- `FI.saveSettings` (SWR/return/inflasi/rentang) dan `pensReturn` sudah menangani koma.
- Input persen bertipe `number` (`txCicilanBunga`, `billSharedPct`, `gcLemburRate`, `prkMargin`) aman: browser menormalkan nilai ke titik.
- `self-reward-engine.js`, `scoring-engine.js` (EIE), `lifeos/ui/review.js`: tanggal sudah memakai `todayStr()`/fallback lokal; tidak ada temuan substantif pada bacaan ini. Akumulasi `insights` EIE dibatasi `slice(-200)` dan cooldown RuleEngine.

## Gerbang
| Gerbang | Hasil |
|---|---|
| Tes baru B5–B8 (4) dan B9–B10 (3) | 7/7 PASS; **gagal tanpa perbaikan** (diverifikasi) |
| Full suite | 8.777 tes: 8.776 lulus, 0 gagal, 1 skipped |
| `npm run release-check` | PASS (build 2307, bundle segar, HTML/SW sinkron) |
| `FILE-HASHES-SHA256.txt --check` | 110 entri valid |
| Browser E2E / manual UI | **BELUM DIJALANKAN** |

## Batas & lanjutan
- `parseDecStr("15.000")` tetap 15 (ambigu: titik tunggal + 3 digit). Itu perilaku lama yang disengaja untuk berat/qty; untuk **harga Rupiah** di Investasi/Watchlist, pengguna yang mengetik titik ribuan tunggal akan tetap salah → perlu keputusan: jadikan field harga memakai `parsePzNum` atau tambahkan pemformat input. Tidak diubah di patch ini karena mengubah kontrak qty.
- `lemburMultiplier` memakai `||1.5` (0 → 1,5); tidak dianggap bug karena pengali 0 tidak realistis.
- Pajak/Zakat/PPh21: tarif progresif, PTKP, biaya jabatan, nisab 85 g, haul 354 hari diperiksa dan sesuai. PBB menerapkan tarif langsung ke NJOP kena pajak (tanpa NJKP 20%/40%) — asumsi domain, bukan diubah.
- Haul memakai `new Date(haulMaalMulai)` (UTC): selisih ≤7 jam di WIB, diabaikan.
- Domain belum disisir baris-per-baris: AI, dashboard, sisa asset/vehicle, Shop PO (receiving/purchase-engine). Tidak ada klaim "0 bug substantif" untuk seluruh aplikasi.
