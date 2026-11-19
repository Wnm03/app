# PATCH S2853 — Chat AI: banyak usulan sekaligus, piutang/utang, akun + pemilik titipan
Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2852; zip ini kumulatif (build v2876).

## Perubahan
| # | Perubahan | File |
|---|---|---|
| 1 | Satu balasan AI boleh memuat sampai 20 blok `[[ACTION]]` (`extractChatActions`). Tiap blok jadi kartu sendiri (Konfirmasi / Edit / Batal) + kartu "Konfirmasi semua (n)" / "Batal semua". Konfirmasi semua menjalankan tiap usulan sendiri-sendiri (gagal satu tidak membatalkan yang lain) lalu meringkas hasil. Blok rusak/tipe asing dilewati dengan peringatan; lebih dari 20 = sisanya diabaikan + peringatan. `extractChatAction` lama tetap ada (blok pertama). Tipe aksi kini dicek `hasOwnProperty` (nama seperti `constructor` ditolak) | modules/ai/chat-action.js, ai-chat.js, modules/shared/modules-render-b.js |
| 2 | Tipe baru `add_piutang` dan `add_utang`, ditulis lewat `BillDebtPiutangCanonicalWriter`. Hanya catatan (tanpa transaksi kas); peringatan bila ada yang persis sama; utang dengan cicilan membuat tagihan otomatis (`Debt.syncBill`). Jenis utang disaring ke daftar form (`kta/kartu_kredit/pinjol/pribadi/koperasi/lainnya`) | chat-action-handlers.js |
| 3 | `add_transaksi` dan `add_tagihan` menerima `accountName` + `ownerName`. Nama yang disebut tapi tak dikenal/ambigu = error (dulu diam-diam jatuh ke akun pertama). `ownerName` pada pengeluaran: pemilik punya porsi di akun = potong porsi (`deductionOwnerId`); selain itu talangan (`titipanLinkId`+`titipanTalangan`+piutang via `maybeCreateTitipanTalanganPiutang`), pola S2848. Gagal di tengah = transaksi dan piutang dikembalikan. Pemasukan + `ownerName` ditolak | chat-action-handlers.js |
| 4 | `add_tagihan` kini lewat writer canonical (dulu `D.bills.push` langsung); `kind` hanya `tagihan`/`langganan` (cicilan/utang butuh tenor); pemilik tersimpan sehingga tombol Bayar memperlakukannya sebagai talangan | chat-action-handlers.js |
| 5 | Prompt AI memuat tipe baru, field akun/pemilik, daftar nama pemilik Dana Titipan (`chatTitipanOwnerNames`), batas 20 blok, dan instruksi bahwa pelunasan/pembayaran tidak lewat chat | ai-chat.js |
| 6 | Kartu usulan menampilkan akun dan pemilik; form Edit punya pilihan Akun + isian Pemilik | modules/ai/chat-action.js, chat-action-handlers.js |
| Tes | `s2853-chat-aksi-multi-piutang-utang.test.js` (12 tes); `s2309` disesuaikan (literal `id:txId`, intinya tetap: tanpa `D.transactions.push`) | tests |
| E2E | `e2e/s2853-chat-multi-aksi.js` (25 pemeriksaan, AI disimulasikan dengan stub) | e2e |

## Verifikasi
- Full suite TZ=UTC: 10131 tes, 10130 lulus, 0 gagal, 1 skip.
- Gate: verify-release-ready LOLOS (bundle-freshness, sot-integrity, window-expose, docs-sync, no-inline-handlers, no-personal-data); lint 0 error.
- Browser (Chromium headless, 390x844, backup wallpanel-rab): 25/25 pada e2e S2853; e2e S2845/2847/2849/2850/2851 dan dana-proyek full.js 49/49 tetap lulus (satu-satunya "GAGAL" di skrip lama adalah filter error jaringan sandbox `ERR_TUNNEL_CONNECTION_FAILED`).

## Belum / batasan
- Balasan AI sungguhan belum dicoba (jaringan sandbox tertutup; AI di-stub). Kepatuhan model terhadap format banyak blok dan nama akun perlu dicoba sekali dengan kunci API asli.
- Tidak ada aksi pelunasan/pembayaran piutang, utang, atau tagihan lewat chat (sengaja: dialog pemilik/pelunasan sebagian ada di alur UI).
- Belum ada aksi untuk akun baru, aset/investasi, proyek renovasi, produk/stok Cobek, dan Dana Titipan baru.
- Android, Safari, Firefox belum diuji.

## Terapkan
- Ekstrak zip di atas repo, lalu `node scripts/apply-delete-manifest.js` (atau build) bila `modules/modals.js` dan `modules/shop/modals.js` masih ada.
