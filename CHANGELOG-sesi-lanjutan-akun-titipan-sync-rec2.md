# CHANGELOG — Sesi lanjutan: Rekomendasi #2 (nominal sync akun berdiri-sendiri → Dana Titipan)

Tanggal: 2026-08-14
Basis: app-main-patch-data-health-actions.zip (sesi Rec #1 audit + Rec #3 badge, sudah diupload)

## Konteks

PATCH-NOTES-akun-dana-titipan-sync.md §2 mencatat 3 rekomendasi. Sesi-sesi
sebelumnya sudah mengerjakan Rekomendasi #1 (audit `checkAccounts()`,
presence-only) dan Rekomendasi #3 (badge kosmetik di kartu Akun). Sesi ini
mengerjakan **Rekomendasi #2** — bikin baris Buku Utang bernominal utk akun
berdiri-sendiri (bukan tertaut Aset) yang punya porsi kepemilikan non-SELF,
menutup gap "porsi tersimpan tapi tidak pernah masuk hitungan Dana Titipan"
sepenuhnya (bukan cuma terdeteksi/terlihat lewat badge).

## Keputusan desain (ditanya eksplisit ke user sebelum implementasi)

1. **Nominal** = saldo akun **saat ini** (`recalcAccBalance(acc.id)`), real-time
   — BUKAN snapshot dikunci saat porsi diedit. Konsekuensi yang disadari: beda
   dari Aset/Investasi, baris "Dana titipan akun" ini akan naik-turun otomatis
   tiap ada transaksi masuk/keluar di akun berdiri-sendiri itu.
2. **Kapan re-sync**: tiap kali ada transaksi masuk/keluar di akun itu
   (real-time) — direalisasikan lewat gerbang tunggal `save()`, BUKAN titik
   panggil baru di `transaksi.js` (lihat "Cara wiring" di bawah).

## File yang diubah

- **`modules/finance/titipan-sync.js`** (diubah — tambah 1 fungsi baru
  `TitipanSync.reconcileAccounts()`, 0 fungsi lama diubah perilakunya).
  Pola tulis 1:1 sama `Aset._syncOwnerDebts(a)`: 1 baris utang PER OWNER
  non-SELF, ditandai `linkedAccountId`+`linkedOwnerId` di baris utangnya
  sendiri, owner yang dicabut/porsi→0 → baris otomatis dihapus, akun yang
  dihapus permanen atau baru ditautkan ke Aset → baris lama ikut dibersihkan.
  Beda dari `reconcile(a)`: fungsi ini yang benar-benar MENULIS ke `D.debts`
  (satu-satunya fungsi tulis di modul ini).

- **`modules/shared/features-helpers-global-security.js`** (diubah — 1 baris
  ditambah di `save()`, gerbang tunggal yang sudah ada). `save()` dipanggil
  SETELAH SETIAP mutasi transaksi (in/out/transfer) & SETELAH simpan porsi
  (`AccOwners.save()`) — persis titik yang sudah dipakai
  `syncLinkedAssetNilaiFromAkun()` (arah Akun→Aset). Wiring di sini otomatis
  memenuhi "real-time tiap transaksi" TANPA menambah titik panggil baru di
  `transaksi.js`/`akun.js` sendiri (0 risiko 1 titik tulis kelewat, alasan
  yang sama modul `titipan-sync.js` dibuat sesi 10a).

- **`modules/finance/titipan-reconcile.js`** (diubah — **komentar saja**, 0
  logic diubah): update catatan di `checkAll()` dan
  `_actualLinkedAccountDebts()` yang sebelumnya bilang gap "sengaja DITUNDA"/
  "SELALU kosong" — sekarang mencatat bahwa Rekomendasi #2 sudah dikerjakan
  sesi ini.

- **`tests/titipan-sync.test.js`** (diubah — tambah 10 test baru utk
  `reconcileAccounts()`: no-op guards, tulis baris baru, update nominal
  real-time saat saldo berubah, skip akun tertaut-Aset, bersihkan baris saat
  akun baru ditautkan/owner dicabut/akun dihapus, banyak owner per akun,
  abaikan SELF/porsi≤0).

Tidak ada file lain yang disentuh.

## Verifikasi

```
node --test tests/titipan-sync.test.js       # 17/17 pass (7 lama + 10 baru)
node --test tests/*.test.js                  # 4289/4289 pass, 0 regresi
```

## Efek samping yang perlu diketahui

Begitu patch ini aktif, tiap `save()` (dipanggil di hampir semua alur tulis
app) sekarang juga menjalankan `TitipanSync.reconcileAccounts()`:

- Kalau kamu SUDAH punya akun berdiri-sendiri dengan porsi kepemilikan
  non-SELF>0 tersimpan, baris Buku Utang baru akan MUNCUL otomatis
  (`linkedAccountId`+`linkedOwnerId`) begitu `save()` berikutnya jalan — ini
  yang sebelumnya cuma dilaporkan sebagai gap oleh `checkAccounts()`/badge,
  sekarang benar-benar tertutup.
- Nominal baris itu akan berubah tiap ada transaksi di akun tersebut
  (sesuai keputusan desain "real-time saldo saat ini").
- `TitipanReconcile.checkAccounts()` akan mulai `ok:true` utk akun-akun yang
  sebelumnya `missing` (begitu save() berikutnya jalan), badge "⚠️ Porsi
  titipan belum sinkron" di kartu Akun juga akan otomatis hilang utk akun
  yang sudah tersinkron.
- Kekayaan Bersih/Zakat Maal yang membaca `D.debts` akan ikut mencerminkan
  utang titipan akun berdiri-sendiri ini (sebelumnya tidak pernah terhitung).

## Yang masih di luar scope

- Belum ada UI khusus utk menampilkan/menjelaskan baris "Dana titipan akun"
  ini secara terpisah dari baris Aset/Investasi di tab Dana Titipan (masih
  tampil sebagai baris Buku Utang biasa). Bisa jadi sesi terpisah kalau
  diperlukan.
