# S2371 — Optimasi pemindaian sesi saat edit servis

## Temuan
Saat menyimpan edit servis, pembentukan `_editSessionRowsBefore` menjalankan `D.servisLogs.find(...)` dua kali di dalam predikat `D.servisLogs.filter(...)`. Karena predikat dipanggil untuk setiap log, pencarian sumber sesi berulang untuk tiap baris dan dapat membuat biaya mendekati O(n²).

## Perubahan
- Cari record edit satu kali sebelum filter.
- Turunkan session key satu kali dengan urutan fallback `sessionId || serviceJobId || editId` yang sama.
- Filter tetap membatasi kendaraan dan memakai konversi `String(...)` yang sama.
- Deep-clone/fallback clone tiap baris tetap dipertahankan; tidak ada cache lintas operasi atau mutasi pada sumber.

## Risiko dan batas verifikasi
Perubahan terbatas pada resolusi kunci sesi. Tes fokus memeriksa satu lookup dan kontrak fallback/filter. Belum menjalankan full test suite, build produksi, verifikasi freshness bundle, atau release gate; patch ini adalah source patch dan tidak siap dirilis sebelum pemeriksaan tersebut dijalankan.
