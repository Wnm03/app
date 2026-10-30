# MODAL-EXIT-ANIMATION.md — Tahap 10: Exit/Closing Animation Overlay & Bottom Sheet

Mengerjakan **item #2 High Priority** di `ROADMAP-v1.1.md`
(`KNOWN-ISSUES.md` §5.1): overlay/bottom sheet sebelumnya hilang
instan (`display:none`) begitu class `open` dilepas, tidak simetris
dengan animasi masuk (`overlayIn`/`slideUp`) yang sudah ada sejak
Tahap 7.

## Kenapa item ini yang dipilih

- Item #1 (kontras `--text3`) sudah selesai di Tahap 9.
- Item #3 (ganti emoji `icon:` di `FEATURE_REGISTRY`) **tidak boleh
  dikerjakan** — `dashboard-hub-registry.js`/`FEATURE_REGISTRY` masuk
  daftar terlarang di instruksi tahap ini.
- Item #2 memenuhi semua kriteria: scope kecil (1 fungsi + 1 blok
  CSS), aditif, risiko rendah, reuse pola/token yang sudah ada
  (`--dur-moderate`/`--dur-slow`/`--ease-standard`/`--ease-emphasized`,
  serta reverse persis dari keyframes `overlayIn`/`slideUp` yang sudah
  ada), tidak butuh arsitektur baru.

## Perubahan

### 1. `styles.css` (aditif)

Menambah 2 keyframes baru & 2 rule baru, tepat di lokasi komentar
Tahap 7 yang dulu menjelaskan kenapa fitur ini ditunda:

- `@keyframes overlayOut` — reverse dari `overlayIn` (fade opacity 1→0).
- `@keyframes slideDown` — reverse simetris dari `slideUp` (translateY
  0→40px, opacity 1→.4 — nilai sama persis, cuma arah dibalik).
- `.overlay.closing, .calc-overlay.closing` — pakai `overlayOut`,
  durasi/easing token yang sama dengan `.overlay.open`
  (`var(--dur-moderate)`/`var(--ease-standard)`).
- `.overlay.closing .modal, .calc-overlay.closing .calc-modal` — pakai
  `slideDown`, token sama dengan `.modal`/`.calc-modal`
  (`var(--dur-slow)`/`var(--ease-emphasized)`).

Tidak ada selector atau nilai lama yang diubah. `.qs-modal-overlay`
(quick switcher) & modal generik (`confirmModal`/`promptModal`/dst,
yang tidak lewat `closeModal()`) sengaja **tidak** disentuh — di luar
scope minimal tahap ini, lihat "Tidak Diubah" di bawah.

### 2. `modal-navigasi.js` (aditif, murni JS UI helper — bukan business logic)

`closeModal(id)` sebelumnya langsung `classList.remove('open')`
(hilang instan). Sekarang:

1. Tambah class `closing` dulu (memicu `overlayOut`/`slideDown` di CSS).
2. Tunggu event `animationend`, **atau** fallback `setTimeout(...,260)`
   (jaga-jaga kalau browser tidak kirim `animationend`, mis. elemen
   tanpa animasi aktif) — pola persis yang disebutkan di catatan lama
   `styles.css` ("via animationend/setTimeout").
3. Baru lepas `open`+`closing`, lalu panggil
   `_syncNavVisibilityForModals()` seperti semula.
4. Guard re-open: kalau modal yang sama dibuka lagi (`openModal()`)
   sebelum animasi keluar selesai, `openModal()` melepas class
   `closing` lebih dulu — jadi timer/`animationend` dari `closeModal()`
   yang lama tidak ikut menutup modal yang baru saja dibuka ulang.
5. Guard `closeModal()` dipanggil 2× berturut-turut (double-tap ✕)
   dan guard id modal yang tidak ada di DOM (`if(!el)return;`) —
   sebelumnya baris ini akan melempar error kalau `id` salah.

`openModal(id)` cuma dapat 1 baris tambahan: `el.classList.remove('closing')`
sebelum `add('open')`, supaya poin 4 di atas berfungsi.

`closeCalc()` (di `kalkulator-input.js`, **tidak diubah**) sudah
memanggil `closeModal('calcModal')`, jadi otomatis ikut kebagian
animasi keluar tanpa perlu sentuh file itu.

## File yang Berubah

| File | Jenis | Keterangan |
|---|---|---|
| `styles.css` | Diubah (aditif) | +4 baris CSS efektif (2 keyframes + 2 rule) menggantikan komentar catatan lama Tahap 7, 100% token yang sudah ada. |
| `modal-navigasi.js` | Diubah (aditif) | `closeModal()` ditulis ulang bagian internalnya (delay + guard), `openModal()` +1 baris. Signature kedua fungsi & seluruh fungsi lain di file tidak berubah. |
| `tests/modal-close-animation.test.js` | **Baru** | 10 test: 7 struktural DOM (via `loadSource`+`fakeDom.js`) utk `closeModal`/`openModal` (delay, `animationend`, fallback timer, guard re-open, guard double-close, guard id hilang, `openModal` tidak regresi), 3 struktural CSS (keyframes ada, token dipakai, `slideDown` reverse simetris dari `slideUp`). |
| `MODAL-EXIT-ANIMATION.md` | **Baru** | Dokumen ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap 10 ditambahkan di akhir file (aditif). |
| `FILES-CHANGED.md` | Diubah | Entry Tahap 10 ditambahkan di akhir file (aditif). |
| `KNOWN-ISSUES.md` | Diubah | §5.1 ditandai selesai, dipindah ke bagian "Sudah Diperbaiki". |
| `ROADMAP-v1.1.md` | Diubah | Item #2 High Priority ditandai selesai. |

`index.html`/`app_production.html` **tidak perlu diubah** — keduanya
sudah memuat `styles.css` & `modal-navigasi.js` apa adanya sejak
sebelumnya, jadi perubahan isi kedua file itu otomatis ikut termuat.

## Tidak Diubah (ditegaskan)

- Dashboard V2, Hero Dashboard.
- `FEATURE_REGISTRY` / `dashboard-hub-registry.js`.
- Business logic (tidak ada perhitungan/aturan data yang berubah —
  ini murni transisi visual buka/tutup modal).
- ADR-001, build system (`scripts/build.js` **tidak dijalankan**,
  sesuai konvensi Tahap 1–9 — lihat `FILES-CHANGED.md` entry
  sebelumnya), Service Worker (`sw.js`), `package.json`.
- `app-bundle-a.min.js`/`app-bundle-b.min.js` — belum memuat isi
  `modal-navigasi.js`/`styles.css` versi baru sampai `build.js`
  dijalankan manual oleh maintainer (konvensi yang sama dipakai di
  `FINANCE-2.0.md`/`SHOP-2.0.md`/`CAR-NOTES-2.0.md`/`REPORTS-2.0.md`).
- Modal generik (`confirmModal`/`promptModal`/`choiceModal`/`infoModal`/
  `pinPromptModal`) & quick-switcher (`openQS`/`closeQS`) — modal-modal
  ini tidak lewat `closeModal()` (masing-masing pakai resolver
  `_xxxAnswer`/`_xxxSubmit` sendiri supaya `Promise` yang sedang
  ditunggu tetap ter-resolve), jadi sengaja di luar scope minimal
  tahap ini. Bisa jadi kandidat tahap berikutnya kalau diperlukan.

## Hasil Test

```
node --test
# tests 1375
# pass 1375
# fail 0
```

## Status

Item #2 `ROADMAP-v1.1.md` selesai. Sesuai instruksi, pengerjaan
**berhenti di sini** — tidak melanjutkan ke item roadmap berikutnya.
