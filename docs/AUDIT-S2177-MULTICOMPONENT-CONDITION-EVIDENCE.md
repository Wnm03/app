# S2177 — Multi-component condition evidence audit

## Temuan
`computeServiceUrgency()` pada jalur condition-only membaca `conditionResult` dari root `D.servisLogs` saja. Pada penyimpanan sesi checklist multi-komponen, root condition adalah proyeksi baris pertama; kondisi untuk komponen berikutnya berada pada `checklist[].conditionResult`. Pengingat komponen yang bukan baris pertama dapat kehilangan bukti `rusak` dan salah tampil `normal`.

## Perbaikan
- Condition-only reminder memprioritaskan `conditionResult` / `conditionStatus` dari baris checklist yang cocok dengan `serviceComponentId` atau `categoryId` target.
- Kondisi `rusak` pada baris target tidak ditimpa kondisi root dari komponen lain.
- Fallback root tetap tersedia untuk history legacy tanpa checklist, history tanpa baris checklist yang cocok, dan target yang memang diwakili baris pertama.
- Jika target memiliki baris checklist sendiri tetapi tidak memiliki hasil kondisi, root condition dari baris komponen lain tidak dipakai sebagai bukti target.
- Bukti penggantian tetap menggunakan `matchesActionTypeForReset()` dari S2175/S2176; root action yang stale tidak bisa menggantikan tindakan komponen.

## Tes S2177
1. Kondisi rusak pada baris checklist kedua tanpa root condition menghasilkan status `rusak`.
2. Kondisi rusak target mengalahkan root condition `baik` yang berasal dari baris pertama.
3. Baris target dengan tindakan `ganti` yang eksplisit tetap menghasilkan status `normal`.

## Batasan
Ini memperbaiki proyeksi runtime dan tidak memigrasikan atau mengubah data backup. Identitas historis yang ambigu tetap perlu ditinjau secara eksplisit; tidak ada inferensi otomatis atas data backup.
