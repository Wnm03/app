# LONG_TERM_DEVELOPMENT_PROTOCOL.md — Protokol pengembangan jangka panjang

Ditambahkan sesi checkpoint TASK-144 (Sesi 144A.2), atas permintaan
eksplisit user (TASK-LONGTERM-001). Dokumen ini TIDAK menggantikan
`docs/SESSION_RULES.md` (tetap sumber kebenaran tunggal untuk urutan
kerja per sesi) — dokumen ini adalah lapisan protokol jangka panjang
di atasnya, supaya repository ini bisa dilanjutkan oleh sesi AI baru,
jendela chat baru, atau model AI berbeda, tanpa perlu audit ulang.

Kalau ada perbedaan isi dengan `docs/SESSION_RULES.md` atau
`.ai/AI_RULES.md` untuk urutan kerja teknis per sesi, file-file
tersebut yang berlaku. Dokumen ini murni merangkum prinsip jangka
panjang yang harus konsisten di semua sesi, chat, dan model.

---

## 1. Filosofi Repository

Repository ini berkembang secara **inkremental**, satu task kecil demi
satu task kecil, selama ratusan sesi ke depan.

- Tidak ada rewrite besar-besaran.
- Tidak ada penggantian arsitektur.
- Tidak ada refactor yang tidak perlu / tidak diminta task.
- Backward compatibility diutamakan di atas segalanya — kode/data
  lama yang sudah jalan tidak boleh rusak demi fitur baru.

Prinsip ini sejalan dengan `.ai/AI_RULES.md` § Larangan mutlak
("Jangan redesign arsitektur", "Jangan refactor besar").

## 2. Aturan Sesi (Session Rules)

- Setiap sesi punya **satu** task yang jelas.
- Jangan mencampur beberapa fitur yang tidak berhubungan dalam satu
  sesi.
- Selesaikan satu task sampai tuntas sebelum memulai task lain.
- Kalau ditemukan bug di luar scope task yang sedang berjalan: catat,
  jangan diperbaiki di sesi yang sama (lihat `.ai/AI_RULES.md`).

## 3. Aturan Checkpoint (Checkpoint Rules)

Setiap sesi implementasi sebaiknya diakhiri dengan checkpoint yang
bisa dipulihkan (recoverable), **kapan pun praktis dilakukan**.

Urutan yang diutamakan:

1. Simpan file yang dimodifikasi.
2. Verifikasi sintaks.
3. Build.
4. Regenerasi bundle.
5. Buat checkpoint ZIP.
6. Verifikasi ZIP (`unzip -t` atau setara).

Kalau build tidak bisa selesai karena fitur memang sengaja belum
lengkap (mis. baru markup UI, logikanya menyusul di sesi lain): jelaskan
alasannya dengan jelas ke user, jangan memaksakan ZIP dibuat dari hasil
yang tidak valid.

Update dokumentasi boleh ditunda kalau situasi mengharuskan (mis.
kuota/waktu sesi hampir habis), tapi harus tetap diselesaikan sebelum
fitur tersebut dianggap benar-benar selesai (`docs/ZIP_RULES.md`: ZIP
lebih prioritas daripada dokumentasi, tapi dokumentasi tetap wajib
menyusul).

## 4. Source of Truth

Urutan prioritas dokumen ketika mencari konteks/keputusan:

1. `PROJECT_MANIFEST.md`
2. `.ai/AI_RULES.md`
3. `.ai/AI_STATE.md`
4. `.ai/AI_TASK_QUEUE.md`
5. Spesifikasi TASK yang sedang dikerjakan
6. Kode sumber aplikasi (source code existing)

**Jangan pernah mengarang/menebak spesifikasi yang hilang.** Kalau
spesifikasi task tidak ada atau tidak jelas, itu sinyal untuk berhenti
dan bertanya ke user — bukan mengisi kekosongan dengan asumsi sendiri.

## 5. Alur Kerja Fitur (Feature Workflow)

```
Spesifikasi
  ↓
Implementasi
  ↓
Build
  ↓
Tests
  ↓
Checkpoint ZIP
  ↓
Dokumentasi
  ↓
Task Berikutnya
```

Alur ringkas ini konsisten dengan diagram lengkap di
`docs/WORKFLOW.md` (READ → IMPLEMENT → TEST → FULL TEST → BUILD → ZIP
→ UPDATE DOCS → NEXT SESSION → STOP).

## 6. Perilaku AI (AI Behaviour)

- Jangan pernah mendesain ulang aplikasi.
- Jangan pernah menulis ulang modul yang sudah berfungsi.
- Jangan duplikasi kalkulasi — kalau sudah ada rumus/engine yang sama,
  reuse.
- Selalu reuse engine/helper yang sudah ada (mis. `FuelGaugeEngine`,
  `FuelTankProfile`, dsb — pola "single source of truth" per domain).
- Selalu jaga backward compatibility.

## 7. Versioning

- Selalu gunakan nama versi eksplisit ketika `scripts/build.js`
  memintanya (mis. format `kw<N>-<ringkasan>-<angka>`).
- Jangan pernah mengubah konstanta versi (`MODAL_VERSION`,
  `MODULE_RENDER_VERSION`, `APP_BUILD_VERSION`, dll) secara manual,
  kecuali diminta secara eksplisit oleh user. Perubahan versi adalah
  tanggung jawab `scripts/build.js`, bukan editan tangan di kode
  aplikasi.

## 8. Kebijakan Dokumentasi (Documentation Policy)

Setiap fitur baru pada akhirnya harus punya:

- Spesifikasi Task (Task Specification)
- Implementasi (Implementation)
- Test Regresi (Regression Tests)
- Catatan Rilis (Release Notes)

Dokumentasi boleh menyusul ZIP checkpoint (lihat § 3), tapi tidak
boleh dilewatkan sama sekali untuk fitur yang dianggap selesai.

## 9. Alur Pemulihan (Recovery Workflow)

Kalau melanjutkan dari chat/sesi/model lain:

1. Baca dokumen repository (lihat § 4 Source of Truth).
2. Lanjutkan dari checkpoint terverifikasi terakhir.
3. Jangan mengaudit ulang pekerjaan yang sudah selesai, kecuali
   diminta secara eksplisit oleh user.

Ini konsisten dengan `.ai/AI_RULES.md` § RECOVERY MODE.

## 10. Kriteria Sukses (Success Criteria)

Repository ini harus tetap dapat dikelola (maintainable) walaupun
sudah melalui ratusan sesi pengembangan — oleh AI mana pun, di chat
mana pun, dengan atau tanpa riwayat percakapan sebelumnya.

---

## Catatan Validasi

Dokumen ini disusun agar selaras dengan aturan yang sudah ada di:

- `.ai/AI_RULES.md` (otoritas tertinggi untuk keputusan alur kerja
  sesi berjalan)
- `docs/SESSION_RULES.md` (sumber kebenaran tunggal urutan kerja per
  sesi track lama)
- `docs/WORKFLOW.md` (diagram alur kerja ringkas)
- `docs/ZIP_RULES.md` (aturan wajib pembuatan ZIP rilis)

Tidak ada pertentangan yang ditemukan antara dokumen ini dan dokumen-
dokumen di atas. Kalau di masa depan ditemukan ketidaksesuaian, urutan
otoritas `.ai/AI_RULES.md` § "Otoritas dokumen" tetap berlaku:
`.ai/AI_RULES.md` → `.ai/AI_STATE.md` → `.ai/AI_TASK_QUEUE.md` →
`.ai/AI_CONTEXT.md` → `.ai/AI_DECISIONS.md` → kode sumber existing.
Dokumen ini berada di lapisan yang sama dengan dokumentasi historis
`docs/` lainnya — bukan pengganti otoritas manapun di atas.
