# ZIP_RULES.md — Aturan wajib pembuatan ZIP rilis

Ditambahkan Sesi 26 (2026-07-18). St bekerja dari mobile, upload ZIP =
state sesi (bukan repo persisten) — ZIP adalah cara SATU-SATUNYA user
menerima hasil kerja. Karena itu ZIP diprioritaskan di atas dokumentasi.

## Urutan wajib

```
Build
  ↓
Release Gate (BARU Sesi 424 — scripts/verify-release-ready.js, WAJIB)
  ↓
ZIP
  ↓
Link ZIP (present_files, ditampilkan ke user)
  ↓
Update Dokumentasi
  ↓
STOP
```

**ZIP selalu lebih penting daripada dokumentasi.** Kalau kuota/waktu
mepet: buat ZIP dulu, dokumentasi belakangan (boleh menyusul di sesi
berikutnya kalau benar-benar terpaksa — tapi usahakan selalu sempat).

## Release Gate (BARU Sesi 424, WAJIB sebelum ZIP)

Jalankan `node scripts/verify-release-ready.js` SETELAH build, SEBELUM
bikin ZIP. Skrip ini mengecek 2 hal & BLOCK (exit 1, ZIP jangan dibuat)
kalau ada masalah:

1. **Lint** — `eslint .` harus lolos. Kalau eslint ternyata TIDAK
   TERSEDIA di environment (bukan error kode sungguhan, cuma environment
   tidak bisa install/jalankan eslint), boleh di-override dgn
   `CONFIRM_LINT_UNAVAILABLE_REASON="alasan nyata"`. Kalau eslint
   ternyata BISA jalan & menemukan error sungguhan, BLOCK ini TIDAK BISA
   di-override — perbaiki dulu errornya.
2. **Minifikasi** — kedua bundle (`app-bundle-a.min.js`/`-b.min.js`)
   harus hasil esbuild (diminify), bukan fallback mentah. Kalau esbuild
   TIDAK TERSEDIA di environment, boleh di-override dgn
   `CONFIRM_UNMINIFIED_REASON="alasan nyata"`.
3. **Sinkronisasi HTML** (BARU Sesi 425) — `app_production.html` harus
   persis `index.html` + komentar AUTO-GENERATED yang disisipkan
   `scripts/build.js` (lihat "index.html vs app_production.html" di
   bawah). Kalau beda (biasanya lupa jalankan build lagi setelah edit
   HTML), BLOCK — **TIDAK BISA di-override**, cukup jalankan
   `node scripts/build.js` lagi.

Override APAPUN otomatis dicatat permanen ke `docs/RELEASE-GATE-LOG.md`
(append-only, jangan diedit tangan) — supaya ada jejak audit kapan & kenapa
gate ini dilewati, BUKAN cuma catatan prosa di FIX-*.md yang gampang jadi
template kosong ("lint tidak bisa dijalankan" tanpa detail).

**Kalau gate ini BLOCK dan overridenya genuinely tidak berlaku** (mis.
eslint TERPASANG tapi menemukan error sungguhan) — JANGAN dipaksa lanjut
bikin ZIP. Perbaiki dulu, atau kalau benar2 tidak sempat, laporkan ke user
secara eksplisit bahwa ZIP ini belum lolos release gate & kenapa.

Setiap FIX-*.md sesi yang menghasilkan ZIP WAJIB mencantumkan status
konkret dari gate ini (lolos / di-override + alasan / diblokir) — lihat
format di `docs/SESSION_RULES.md`.

## index.html vs app_production.html (Sesi 425)

`index.html` adalah **satu-satunya sumber kebenaran** untuk HTML — SELALU
edit file ini, JANGAN pernah edit `app_production.html` langsung.
`scripts/build.js` menulis ulang `app_production.html` otomatis di setiap
build (isi = `index.html` + komentar HTML "AUTO-GENERATED ... JANGAN edit
file ini langsung" tepat setelah `<head>`) supaya kalaupun ada yang lupa &
membuka `app_production.html` untuk edit, langsung terlihat jelas itu
salah. Kalau lupa jalankan build setelah edit `index.html`, atau
`app_production.html` terlanjur diedit manual, Release Gate (poin 3 di
atas) akan BLOCK sampai `node scripts/build.js` dijalankan lagi.

## Kapan ZIP WAJIB dibuat

- Setiap kali ada perubahan source code yang lolos test+build.
- Setiap kali ada perubahan dokumentasi signifikan yang diminta
  eksplisit oleh user untuk dikirim (mis. sesi setup LDOS ini).

## Kapan ZIP TIDAK perlu dibuat ulang

- Kalau checkpoint sesi sebelumnya menyatakan ZIP terakhir masih valid
  dan tidak ada perubahan source sejak itu — cukup kirim ulang link
  file yang sama (lihat pola Sesi 24 checkpoint-recovery).

## Isi ZIP

Seluruh working directory project (source, `docs/`, `tests/`, file root
seperti `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md`), KECUALI
`node_modules/`. Jangan pernah membuat ZIP dari file pilihan manual —
selalu dari seluruh folder kerja supaya tidak ada file yang tertinggal
(riwayat project pernah kejadian file source/bundle ketinggalan gara-
gara zip manual).

## Penamaan file

Pola: `kw_release_sesi<N>_<ringkasan-singkat>_v<build>.zip`

Contoh: `kw_release_sesi25_lifeos_goal_adapter_v454.zip`.
