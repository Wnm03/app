# IMPLEMENTATION_POLICY.md — Kebijakan implementasi permanen

Ditambahkan Sesi 26 (2026-07-18).

## Wajib

Semua implementasi harus:

- **Additive** — menambah, bukan mengganti struktur yang sudah ada.
- **Backward compatible** — kontrak/output lama tidak berubah kecuali
  memang itu tujuan eksplisit sesi tsb.
- **Reuse existing** — pakai fungsi/helper/pola yang sudah ada di
  project sebelum menulis yang baru.

## Dilarang

- **Rewrite** — menulis ulang file/modul dari nol padahal bisa
  diperluas secara additive.
- **Refactor besar** — perubahan struktural lintas banyak file dalam
  satu sesi (refactor kecil-lokal, mis. ekstrak 1 fungsi jadi builder
  bernama seperti Sesi 24/25, tetap boleh — itu bukan "refactor besar").
- **Duplicate** — helper, function, storage, registry, adapter, event
  yang sudah ada tidak boleh ditulis ulang versi keduanya.

## Alur keputusan saat menemukan sesuatu yang ambigu

```
Menemukan fungsi/pola existing yang relevan?
      ↓ ya
   REUSE — jangan tulis versi baru

Butuh keputusan produk?
      ↓
Cek docs/PRODUCT_DECISIONS.md
      ↓
Jawabannya sudah ada?
   ↓ ya                        ↓ tidak
Langsung implementasikan   STOP, tanya user dulu
(jangan tanya lagi)        (jangan menebak)
```

## Kapan boleh audit

Audit ulang SELURUH project TIDAK boleh dilakukan tanpa alasan kuat.
Audit KECIL (baca 1-3 file yang relevan langsung dgn target sesi ini)
selalu boleh dan justru dianjurkan sebelum menulis kode — ini beda dari
"audit ulang seluruh project" yang dilarang.

## Kaitan dgn track

- Kalau target sesi ada di `docs/AI_SCOPE.md` → cek
  `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md` dulu.
- Kalau target sesi ada di `docs/LIFEOS_SCOPE.md` → cek
  `docs/PROJECT_STATE.md` § LifeOS dulu.
- Jangan campur pola/kode dari 2 track dalam 1 perubahan tanpa
  keputusan eksplisit (mis. Target Summary AI yang mau reuse
  `goalAdapterList()` LifeOS — sudah dicatat di
  `docs/PRODUCT_DECISIONS.md`, tapi perlu diverifikasi lagi tidak
  melanggar "LifeOS read-only, zero-touch `D`" sebelum dikerjakan).
