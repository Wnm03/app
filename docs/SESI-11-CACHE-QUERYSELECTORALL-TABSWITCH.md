# Sesi 11 — Cache querySelectorAll di fungsi setXTab (build `s11-cache-queryselectorall-tabswitch`, `?v=868`)

## Latar belakang
Dari 111 pemanggilan `querySelectorAll` di source (di luar bundle/tests), diaudit satu-satu
mana yang dipanggil di jalur "sering" (tiap ganti tab/subtab) tanpa hasilnya di-cache ke
variabel. Ditemukan 8 fungsi `set*Tab`/`set*SubTab` dengan pola bug yang PERSIS SAMA:

```js
document.querySelectorAll(SEL).forEach(b=>b.classList.remove('active'));
if (el) el.classList.add('active');
else { const btn = document.querySelectorAll(SEL)[idx]; ... } // <-- query SEL lagi
```

Selector yang sama (`SEL`) dipanggil ke DOM dua kali dalam satu eksekusi fungsi, padahal
DOM tidak berubah struktur di antara kedua panggilan (hanya class `active` yang
dihapus/ditambahkan pada anak-anaknya, tidak memengaruhi hasil selector `.cn-tab`/
`.subtab` itu sendiri). Fungsi ini dipanggil setiap kali user pindah tab/subtab, jadi
setiap perpindahan tab membuang satu query DOM yang sama sekali tidak perlu.

## Perbaikan
Cache hasil `querySelectorAll` pertama ke variabel lokal, pakai ulang untuk fallback index
di branch `else`. Tidak ada perubahan behavior (NodeList yang di-cache identik dengan yang
akan didapat dari query kedua), murni penghematan 1 DOM query per switch tab.

Fungsi yang diperbaiki (8 total, di 5 file):
- `modules/shared/pengaturan-search.js` → `setSettingsTab()`
- `modules/asset/aset.js` → `setAsetTab()`
- `modules/finance/tx-list-cashflow.js` → `setKeuanganTab()`, `setLaporanTab()`, `setKelolaTab()`
- `modules/vehicle/vehicle-core.js` → `setCnInsightTab()`, `setCnBbmTab()`
- `pajak-aset-ui-wrappers.js` → `setPjkTab()`

Total `querySelectorAll` di source: **111 → 103** (turun 8, sesuai jumlah fungsi yang
diperbaiki).

## Item lain yang DIAUDIT tapi TIDAK diubah (bukan bug, sengaja dibiarkan)
- `dashboard-hub.js` (`dashHubNavigateToFeature`), `budget.js`, `cobek-io.js` bagian chip
  toggle, dsb: masing-masing hanya query 1x per pemanggilan (bukan pola duplikat), dan
  dipicu oleh 1 klik user (bukan di dalam loop render). Tidak ada dampak performa berarti,
  jadi tidak disentuh sesi ini supaya scope tetap kecil dan aman.
- Item "699× innerHTML=" dan "app-bundle-b.min.js monolit / lazy-load per modul" BELUM
  dikerjakan sesi ini — di luar scope build ini, butuh keputusan arsitektur terpisah
  (lazy-load per modul berarti perubahan cara `index.html` memuat script, bukan sekadar
  refactor kecil).

## Test
Regression: **1747/1747 PASS** (baseline sebelumnya tidak diketahui persis, tapi seluruh
suite lolos 100% setelah perubahan + build).

`BUILD PASS / TEST PASS / ZIP / STOP`
