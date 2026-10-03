# S2386 — Reuse snapshot riwayat sesi servis

## Temuan
`removeHistorySessionComponent()` dan `removeHistorySessionCategory()` lebih dulu memanggil `_historySessionContext(sessionId)`, yang sudah mengambil semua baris sesi ke `ctx.originalRows`. Keduanya kemudian memanggil `_historySessionComponentEntries(sessionId)`, yang memindai `D.servisLogs` sekali lagi untuk sesi yang sama.

## Perubahan
Resolver entri menerima parameter opsional `sourceRows`. Pemanggil hapus komponen/kategori meneruskan `ctx.originalRows`, sehingga satu operasi UI memakai snapshot yang sama dan tidak memindai seluruh riwayat lagi untuk menyusun entri. Pemanggilan lama satu argumen tetap menggunakan `_historySessionRows(sessionId)`.

## Batas keamanan/perilaku
- Tidak mengubah filter sesi, deduplikasi komponen, urutan baris, pemetaan canonical, atau aturan mutasi/rollback.
- Snapshot dipakai hanya dalam alur sinkron sebelum konfirmasi asinkron; operasi mutasi tetap menerima konteks yang sama seperti sebelumnya.
- Tidak menambah cache global atau cache lintas sesi.

## Validasi
Uji kontrak sumber S2386 dan test kumulatif dijalankan terpisah. Full suite/release gate tidak dianggap lulus kecuali hasil lengkap tersedia.
