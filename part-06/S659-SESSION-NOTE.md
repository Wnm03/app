# s659 — Tutup gap test SSOT Net Worth (AUDIT-MENYELURUH-2026-08-28.md, Rekomendasi #5)

**Tanggal:** 2026-08-28
**Sumber:** AUDIT-MENYELURUH-2026-08-28.md §5 & §6 poin 5

## Temuan audit
`Kekayaan.currentNetWorth()` (SSOT resmi Net Worth, dipakai AssetPortfolioAPI/
snapshot/CAGR/Financial Freedom) sudah reuse `FI.totalDebt()` sejak fix S268.
Tapi `Kekayaan.renderBersih()` (dipakai Dashboard) **tidak** — dia menghitung
ulang formula utang sendiri, LENGKAP dengan fallback baca langsung dari DOM
(`document.getElementById('zmUtang').value`) kalau `D.pajakZakat.utangJT`
falsy. Karena app ini SPA (semua `<div class="page">` tetap ada di DOM,
ditoggle `.active`, tidak dibuat/dihapus), elemen `#zmUtang` bisa saja
terbaca walau user sedang di Dashboard, bukan Zakat.

Audit mencatat ini sebagai temuan *moderate-confidence, belum ada test
guard* — `dashboard-networth-ssot-s268.test.js` cuma menguji `FI.totalDebt()`
& `currentNetWorth()`, `renderBersih()` tidak pernah benar-benar dipanggil
di test manapun.

## Yang dikerjakan (ikuti alur rekomendasi audit persis)
1. **Tulis test dulu** (`tests/dashboard-networth-renderbersih-ssot-s659.test.js`)
   yang benar-benar memanggil `Kekayaan.renderBersih()` (via DOM stub
   custom, bukan permissive-stub `loadSource.js` yang memang tidak cocok
   utk fungsi baca/tulis DOM) & `Kekayaan.currentNetWorth()` dengan `D`
   yang sama, assert angka identik — persis seperti rekomendasi §6 poin 5.
2. **Jalankan SEBELUM fix** untuk membuktikan gap-nya nyata (bukan cuma
   teori): skenario edge case (`utangJT=0` tapi `#zmUtang` DOM masih
   simpan nilai stale `9999999`) → **gagal terbukti**, Dashboard menampilkan
   `-Rp 9499999` sedangkan SSOT `Rp 500000` — beda 10 juta rupiah.
3. Sesuai instruksi rekomendasi ("kalau gagal di skenario tertentu, unify
   `renderBersih()` untuk reuse `FI.totalDebt()` juga, 0 rumus baru, pola
   sama fix S268 sebelumnya") → **unify**: baris `utangManual + totalDebtValue()
   + totalCicilanOutstanding()` di `renderBersih()` diganti jadi
   `FI.totalDebt()` (identik formula, tanpa fallback DOM-read).
4. Jalankan ulang test → **3/3 lolos**, termasuk kasus edge yang tadinya gagal.

## Verifikasi
- Test baru sebelum fix: 1 lolos (kasus normal, karena `utangJT` truthy
  membuat kedua formula kebetulan sama), **2 gagal** (edge case DOM-stale +
  cek source reuse `FI.totalDebt()`) — membuktikan gap nyata.
- Setelah fix: **3/3 lolos**.
- `node --check modules/shared/modules-calc.js` → sintaks valid.
- `node --test tests/*.test.js` → **4752/4752 PASS** (4749 lama + 3 baru,
  0 regresi di tempat lain).
- `node scripts/verify-release-ready.js` → Gate dead-code tetap `clean`
  (test file baru otomatis di luar cakupan gate itu, sesuai desain —
  hanya `tests/*.test.js` yang di-skip, bukan dianggap dead code).
- `node scripts/build.js s659-networth-renderbersih-ssot-unify` → sukses,
  versi baru **v1399**, sintaks bundle valid.

## Dampak fungsional
Net Worth yang ditampilkan di kartu Dashboard ("Kekayaan Bersih") sekarang
**dijamin identik** dengan Net Worth di AssetPortfolioAPI/wealth
snapshot/CAGR/Financial Freedom di SEMUA kondisi — termasuk edge case yang
sebelumnya bisa beda angka (state SPA + `D.pajakZakat.utangJT` belum
tersinkron). Fallback baca `#zmUtang.value` yang dihapus sudah dikonfirmasi
"sebagian besar redundan dalam praktik normal" oleh audit (karena
`oninput="hitungZakatMaal()"` men-sync `D.pajakZakat.utangJT` di setiap
keystroke) — jadi menghapusnya tidak menghilangkan skenario penggunaan
normal apa pun, cuma menutup 1 edge case yang berisiko salah.

## File yang berubah (13, hanya ini yang ada di ZIP patch)
- `modules/shared/modules-calc.js` — **fix utama** (`renderBersih()` unify
  ke `FI.totalDebt()`)
- `tests/dashboard-networth-renderbersih-ssot-s659.test.js` — **test baru**
  (3 test, menutup gap §5)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang (v1399)
- `app_production.html`, `index.html`, `sw.js` — bump `?v=`/`CACHE_NAME`
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-
  security.js`, `modules/shared/modals.js`, `modules/shared/modules-
  render.js` — sinkronisasi konstanta versi (otomatis oleh `build.js`)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

## Sisa Rekomendasi audit
- #3: housekeeping 402 file `.md` + 15 `.patch/.diff` ke `docs/archive/`
  (opsional, risiko rendah)
- #4: audit manual titik `.innerHTML=` dari sumber eksternal (CSV/OCR/
  restore) — prioritas sedang, belum dikerjakan
