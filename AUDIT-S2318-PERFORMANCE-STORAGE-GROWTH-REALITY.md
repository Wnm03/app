# Keluarga W — S2318 Performance / Storage Growth Reality Audit

## Status
**OPEN / EVIDENCE GAP — STATIC AUDIT COMPLETE, RUNTIME SCALE TEST NOT EXECUTED**

Lineage: `app-main (49)` → S2304 → … → S2317 → **S2318**.

S2318 adalah audit-only. Tidak ada perubahan production code, schema, persistence, UI, atau service worker.

## 1. Tujuan

Memeriksa risiko pertumbuhan data dan degradasi performa pada:
- penyimpanan utama `D` / localStorage;
- `D.transactions`, `D.servisLogs`, BBM, Shop/Stock dan domain besar lain;
- LifeOS `IDBStore` namespace terpisah;
- Service Worker/cache storage;
- render/scan yang berpotensi menjadi O(n) atau lebih buruk ketika histori membesar;
- keberadaan mekanisme archive sebelum storage penuh.

## 2. Evidence yang benar-benar terverifikasi

### 2.1 Local storage dan mitigasi kapasitas

`index.html` secara eksplisit menyatakan bahwa data aplikasi disimpan di **localStorage**, dengan peringatan kapasitas sekitar ±5 MB per aplikasi/browser. UI juga menyediakan:
- indikator kapasitas (`storageOverallBar`, `storageActualQuota`, `storageBreakdown`);
- saran archive (`archiveSuggestHint`);
- aksi **Arsipkan Data Lama (Pilih Tahun)**;
- riwayat archive (`archiveHistoryWrap`).

Ini membuktikan adanya awareness dan UI mitigasi storage growth, tetapi **belum membuktikan** bahwa archive benar-benar mengurangi ukuran storage secara efektif pada data nyata.

### 2.2 Backup / external copy

UI settings menyatakan Backup/Restore JSON tersedia. Integrasi Google Sheets juga menampilkan local count dan menjelaskan bahwa data dapat disinkronkan ke Sheets; Google Drive diposisikan sebagai backup seluruh data.

Ini adalah jalur recovery/copy, bukan bukti bahwa pertumbuhan localStorage otomatis terkendali.

### 2.3 LifeOS memakai storage terpisah

`lifeos-registry.js` dan `lifeos-data-model.md` mendokumentasikan `LifeOSStore` sebagai namespace terpisah dari `D`, dipersist melalui `IDBStore` dengan key `lifeos:store`, dan tidak menggunakan `save()` milik `D`.

Dengan demikian pertumbuhan LifeOS tidak identik dengan ukuran payload utama `D`.

### 2.4 Contoh scan/render yang bergantung pada jumlah histori

Static source evidence menunjukkan beberapa operasi langsung terhadap array histori:
- `BudgetReko.monthsAvailable()` melakukan iterasi seluruh `D.transactions` untuk mencari transaksi paling awal;
- `BudgetReko.incomeAvgPerMonth()` dan `computeCategoryAverages()` melakukan `filter/reduce` terhadap `D.transactions` pada render/rekomendasi;
- service/BBM paths menggunakan `find`, `filter`, `push`, dan penghapusan dengan `filter` terhadap `D.servisLogs`/`D.bbmLogs`/`D.transactions`.

Ini bukan otomatis bug: untuk histori kecil, O(n) wajar. Namun biaya akan tumbuh linear terhadap jumlah histori dan perlu benchmark nyata untuk menentukan ambang yang terasa di perangkat Android.

## 3. Yang belum dapat dibuktikan

Runtime browser/device tidak tersedia dalam audit ini. Karena itu S2318 **tidak boleh** menyatakan PASS untuk:

1. 100 / 1.000 / 5.000 / 10.000 / 25.000 transaksi;
2. 100 / 1.000 / 5.000 / 10.000 service logs;
3. mixed dataset besar (Finance + Vehicle + Shop + Stock + Renov);
4. waktu `save()` / reload / initial render pada dataset besar;
5. ukuran aktual localStorage sebelum dan sesudah archive;
6. kegagalan saat quota tercapai;
7. apakah backup/restore tetap responsif pada JSON besar;
8. IDB read/write latency untuk `LifeOSStore` pada data besar;
9. Service Worker Cache Storage growth dan eviction behavior;
10. Android Chrome/PWA memory pressure atau crash/OOM.

Tidak ada angka benchmark yang dibuat-buat.

## 4. Matrix runtime yang masih diperlukan

| Dataset | Operasi | Bukti yang harus diukur |
|---:|---|---|
| 100 | load → render → save | latency, error |
| 1.000 | sama | latency, error |
| 5.000 | sama | latency, error |
| 10.000 | sama | latency, error |
| 25.000 | sama | latency, error/quota |
| besar + archive | archive tahun lama | bytes before/after, integrity |
| besar + backup | JSON export/import | duration, size, integrity |
| besar + LifeOS | IDB get/set | duration, integrity |
| PWA | reload/offline/cache | cache size, recovery |

Dataset harus sintetis dan disposable; jangan memakai data pribadi pengguna.

## 5. Findings

### F1 — Storage growth sudah diakui dan memiliki UI archive
**VERIFIED STATIC.**

Ada storage meter dan archive-by-year. Ini mengurangi risiko operasional, tetapi efektivitasnya belum runtime-tested.

### F2 — Histori Finance berpotensi menjadi hot path
**VERIFIED STATIC / PERFORMANCE NOT QUANTIFIED.**

Beberapa fitur menghitung ulang dari seluruh `D.transactions`. Dengan histori makin panjang, render/rekomendasi dapat meningkat linear. Belum ada bukti bahwa pengguna akan merasakan degradasi pada ambang tertentu.

### F3 — LifeOS storage dipisahkan dari D
**VERIFIED STATIC.**

`LifeOSStore` memakai `IDBStore` key terpisah. Ini arsitektural positif untuk isolasi growth, tetapi belum membuktikan performa IDB pada data besar.

### F4 — Tidak ada bukti runtime quota exhaustion
**UNVERIFIED.**

UI memperingatkan quota dan menyediakan archive, tetapi tidak ada runtime evidence dalam sesi ini tentang perilaku ketika quota benar-benar tercapai.

### F5 — Tidak ada perubahan produksi yang diperlukan dari audit ini
**VERIFIED.**

S2318 hanya menghasilkan audit document. Tidak ada alasan berbasis evidence untuk mengubah production code sebelum runtime benchmark tersedia.

## 6. Verdict

**S2318 = OPEN / EVIDENCE GAP.**

Static architecture menunjukkan:
- storage growth sudah dipantau;
- archive tersedia;
- backup/restore tersedia;
- LifeOS storage dipisahkan;
- beberapa render/analitik melakukan scan linear atas histori.

Tetapi **belum ada bukti runtime** untuk menetapkan batas aman jumlah data atau menyatakan bahwa aplikasi tetap responsif pada dataset besar.

### Hard Stop
Jangan membuat optimasi/index/cache baru hanya berdasarkan dugaan. Langkah berikutnya harus berupa **S2318-RUNTIME** dengan browser/device atau harness runtime yang benar-benar dapat mengukur storage size, save/load, render, archive, backup/restore, IDB, dan cache pada dataset sintetis.

## 7. Chain impact

S2318 menambah **1 audit document saja** dan tidak mengubah production runtime.

Rantai release tetap terpisah dari audit ini; blocker S2302 yang lama tidak dianggap selesai.
