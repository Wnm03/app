# Fix v997 (s333) — BUG-014: `spendingAnalysis()`/`budgetSuggestion()` tidak diurutkan berdasarkan prioritas

## Latar belakang

Ditemukan di Sesi Audit-Docs 9 (audit langsung 100% terhadap
`modules/finance/budget-recommendation-api.js`, lihat
`docs/BUG_REGISTRY.md` §0a-7 versi sebelum fix, `docs/AUDIT_MATRIX.md`
§14): `spendingAnalysis().items` (dan turunannya,
`budgetSuggestion().suggestions`) hanya mewarisi urutan `D.budgets` apa
adanya dari `FinanceIntelligence.budgetSummary()` — TIDAK pernah
diurutkan berdasarkan prioritas kategori (over/near/underused) atau
besaran nominal.

`BudgetRecommendationPresenter` (`budget-recommendation-presenter.js`,
tidak diubah sesi ini) mengasumsikan urutan itu sudah = prioritas:
- `_topSuggestionCard()` memakai `suggestions[0]` sbg kartu "💡
  Rekomendasi Utama".
- `_overCard()` memakai `sa.items.find(it => it.category==='over')`
  (elemen `over` PERTAMA) sbg label "Terbesar: {nama}".

Akibatnya, kalau `D.budgets` berisi anggaran `over` yang BUKAN elemen
pertama (mis. anggaran underused dibuat lebih dulu), kartu "Rekomendasi
Utama" bisa menampilkan saran berprioritas rendah, dan label "Terbesar"
bisa menunjuk anggaran over dgn nominal kecil — bukan yang benar-benar
paling mendesak/besar.

## Perubahan

**`modules/finance/budget-recommendation-api.js`** (satu-satunya file
kode yang diubah):

- Tambah `_CATEGORY_PRIORITY` — tabel mapping kategori ke rank prioritas
  (`over:0, near:1, underused:2, ok:3`), murni data, bukan rumus.
- Tambah `_sortBySeverity(items)` — helper baru, mengurutkan **COPY**
  array (`.slice()` dulu, 0 mutasi array asli) berdasarkan:
  1. Prioritas kategori (`_CATEGORY_PRIORITY`).
  2. Dalam kategori yang sama: `over` → selisih `used-limit` menurun
     (overage terbesar duluan, cocok dgn label "Terbesar" presenter);
     `near` → `pct` menurun (paling dekat ke over duluan); `underused`
     → `pct` menaik (paling sedikit terpakai duluan, paling banyak sisa
     yg bisa dialihkan).
- `spendingAnalysis()`: setelah `_classify()` tiap item spt biasa,
  panggil `this._sortBySeverity(classified)` sebelum dikembalikan sbg
  `items`. Field lain (`totalLimit`/`totalUsed`/`totalSisa`/
  `overallPct`/`overCount`/`nearCount`/`underusedCount`/`okCount`)
  TIDAK berubah — semua tetap dihitung dari data yang sama, cuma
  urutan array `items`-nya yang berubah.
- `budgetSuggestion()` — **TIDAK diubah sama sekali**. Fungsi ini
  memfilter `sa.items` (`category !== 'ok'`) tanpa sort tambahan, jadi
  otomatis mewarisi urutan baru dari `spendingAnalysis()`.
- `budgetInsight()`/`summary()`/`_budget()`/`_classify()` — tidak
  diubah (tidak bergantung urutan array, murni hitung count/gabungan).

0 rumus finansial baru, 0 perubahan kontrak field (`items`/
`suggestions` tetap array berisi objek dgn field yang sama persis),
konsisten dgn prinsip "100% REUSE, TIDAK ada rumus baru" yang
didokumentasikan di kepala file.

**`tests/budget-recommendation-severity-sort-s333.test.js`** (baru, 7
test) — menjalankan SOURCE ASLI lewat harness `loadSource`, dgn
`FinanceIntelligence.budgetSummary()` di-mock:
1. `items` diurutkan `over → near → underused`, bukan urutan `D.budgets`.
2. Dalam kategori `over`, item dgn overage (`used-limit`) terbesar ada
   di depan.
3. Count per kategori (`overCount`/`nearCount`/`underusedCount`) tetap
   benar pasca-sort (tidak ada item hilang/dobel).
4. `budgetSuggestion().suggestions[0]` adalah item `over` dgn overage
   terbesar — skenario reproduksi BUG-014 persis (underused dibuat
   sebelum over di `D.budgets`).
5. Urutan penuh `suggestions` konsisten `over→over→near→underused`.
6. Kategori `underused` diurutkan `pct` menaik.
7. Array asli dari `FinanceIntelligence.budgetSummary()` TIDAK
   termutasi (bukti `_sortBySeverity()` bekerja di atas copy) + guard
   `{ok:false}` tetap diteruskan apa adanya.

## Verifikasi

- `node --check modules/finance/budget-recommendation-api.js` → OK.
- `node --test tests/budget-recommendation-severity-sort-s333.test.js`
  → **7/7 PASS**.
- `node --test tests/*.test.js` → **2074/2074 PASS** (2067 lama + 7
  baru, 0 fail, 0 regresi).
- `node scripts/build.js s333-fix-budget-reco-priority-sort` → sukses,
  versi build **s333-fix-budget-reco-priority-sort**, `?v=997`,
  seluruh guard regresi build.js (escapeHtml, chicken-egg OCR, MODAL_HTML
  drift, scanner structural drift) lolos, kedua bundle lolos
  `node --check`, `index.html`/`app_production.html` identik,
  `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` diregenerasi.
  (Catatan: esbuild tidak terpasang di environment ini — bundle valid
  tapi belum diminify, ukuran lebih besar dari build sebelumnya; tidak
  memengaruhi kebenaran fungsional.)

## Dokumentasi disinkronkan

- `docs/BUG_REGISTRY.md` — BUG-014 dipindah statusnya ke
  **FIXED (v997/S333)**, entri lengkap ditambahkan ke `# 0. Resolved
  (this baseline)`, entri asli di `§0a-7` diupdate field
  Fix/Regression test/Verification/Status (bukti/root cause/trigger
  historis tetap utuh, tidak dihapus).
- `docs/AUDIT_MATRIX.md` §14 — baris `spendingAnalysis()`/
  `budgetSuggestion()` diupdate jadi "Bug — FIXED (v997/S333)".
- `docs/KNOWN-ISSUES.md` §14 — BUG-014 ditandai ✅ FIXED dgn ringkasan
  fix.
- `TODO.md` § "Finance/BudgetRecommendationAPI" — 2 task terkait
  BUG-014 ditandai **DONE (v997/S333)**.

## Kesimpulan

BUG-014 (P2 Medium) selesai diperbaiki di v997/S333. `_overCard()`
(`.find()` elemen `over` pertama) & `_topSuggestionCard()`
(`suggestions[0]`) di `budget-recommendation-presenter.js` sekarang
otomatis mendapat data yang benar-benar terurut prioritas/nominal —
TIDAK ada perubahan kode di file presenter itu sendiri (dampak
diselesaikan murni di layer API, sesuai kontrak "presenter 0 logic
tambahan" yang sudah didokumentasikan di kepala file presenter). Task
improvement (`summary()` memanggil `spendingAnalysis()` 3x; sisa gap
test unit langsung utk `_budget()`/`_classify()`/`budgetInsight()`/
`summary()`) TETAP OPEN, tidak dikerjakan sesi ini — dicatat di
`TODO.md`.
