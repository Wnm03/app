# ZIP_RULES.md — Aturan wajib pembuatan ZIP rilis

Ditambahkan Sesi 26 (2026-07-18). St bekerja dari mobile, upload ZIP =
state sesi (bukan repo persisten) — ZIP adalah cara SATU-SATUNYA user
menerima hasil kerja. Karena itu ZIP diprioritaskan di atas dokumentasi.

## Urutan wajib

```
Build
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
