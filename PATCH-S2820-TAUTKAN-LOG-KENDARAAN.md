# PATCH S2820 — Tautkan log kendaraan ke transaksi (F6 bertahap), akumulatif di atas S2819, build 2832

## Perubahan (Cek Kesehatan Data)
- Temuan "Log kendaraan bisa ditautkan ke transaksi yang sudah ada" + tombol "🔗 Tautkan N log" (`DataHealth.linkVehicleLogs`). Syarat cocok (semua): log BBM/servis berbiaya > 0 dan belum tertaut, ada TEPAT 1 transaksi pengeluaran dengan tanggal sama, nominal sama, akun sama (bila log punya akun), kategori = nama kendaraan, serta transaksi itu belum tertaut ke log lain. Tautan dua arah: `log.txLinkId` dan `tx.bbmLinkId/servisLinkId` (lewat `FinanceTxSOT.patchMetaById`). Nominal, jumlah transaksi, dan saldo tidak berubah.
- Temuan "Log kendaraan berbiaya tanpa transaksi": hanya informasi (jumlah, total, contoh). TIDAK membuat transaksi otomatis (saldo Cash akan makin negatif). Tombol "🙈 Abaikan sisa log" hanya menandai `txSkip:true` pada log (data log utuh) supaya temuan berhenti muncul; putuskan per log lewat edit log bila ingin dicatat.
- Pada backup 2026-11-12: 27 log cocok aman. 3 log lain cocok tanggal+nominal tetapi kategori transaksinya bukan kendaraan (Hadiah, Makan) sehingga sengaja tidak ditautkan otomatis.

## Rekomendasi 6 (hasil baca kode, bukan uji angka)
Majoris tidak terhitung ganda: akun yang tertaut ke aset dikecualikan penuh dari `totalSaldoAkun()`, dan Majoris berpemilik INVESTOR sehingga porsi milik sendiri 0 di total aset. Cash -4,9 juta tetap perlu kamu cocokkan dengan uang fisik/mutasi bank.

## Hasil
- Full suite: 9820 tes, 9819 lulus, 0 gagal, 1 skip. Build 2831 -> 2832.
- Belum diuji di browser/Android.
