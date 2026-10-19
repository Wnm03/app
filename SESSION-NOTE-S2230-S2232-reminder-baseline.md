# S2230–S2232 — Baseline interval Pengingat Servis

Gejala: Roller CVT diganti di 21.311 km (= odometer) tampil "Terlewat 9.311 km"; Busi "Terlewat 11.711 km" dgn "Terakhir di 5.600 km".

- S2230 `computeServiceUrgency` (sparepart-servis.js): sumbu *periksa* kini memakai penggantian (ganti/pasang/overhaul) terbaru sbg baseline bila lebih baru dari catatan periksa. Komponen `gantiResetsInterval=false` tetap dikecualikan. Catatan ber-KM > odometer diabaikan.
- S2230 CSS: `.servis-reminder-list` max-height `max(420px, 100dvh-240px)` (kartu terakhir tidak terpotong).
- S2231 `service-legacy-maintenance.js` `evaluateAction`: aturan sama utk mode legacy. `predictService` (sparepart-servis-b.js) mengekspos `lastKm` dari urgency engine.
- S2232 `summarizeServiceHistory`: "Terakhir diperiksa/diganti" kini component-scoped (matchesActionTypeForReset), vehicleId dibandingkan sbg string.

Tes: tests/s2230-replacement-resets-inspect-axis.test.js (6 tes); kontrak CSS disesuaikan. Suite penuh 8953/8954 lolos (1 skip), release gate, service-sot gate, audit-service-reminder-chain-s2151 (substantiveFindings 0).

Di luar scope: `ServiceMaintenanceEngine` tidak dipakai UI; part tanpa riwayat sama sekali tetap dihitung dari odometer 0 (perilaku lama, non-legacy).
