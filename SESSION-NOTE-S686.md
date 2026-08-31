# SESSION-NOTE-S686

## Scope
DSR (Rasio Cicilan) di zona merah (>35%) sekarang ikut muncul sbg warning
otomatis di Data Health Check — sebelumnya cuma kelihatan kalau user buka
halaman Debt Strategy sendiri (piutang-utang.js) atau kartu dashboard Debt
Optimizer (debt-optimizer-presenter.js).

Latar belakang: audit fitur "rasio cicilan/pendapatan" (dipicu dari
infografis edukasi utang Yodhi CFP) menemukan konsepnya SUDAH ADA di app
sbg DSR (`DebtStrategy.computeDSR()`, threshold 30/35% ala DSR perbankan).
Gap yang ditemukan: DSR merah tidak proaktif — user harus buka halaman
spesifik utk lihatnya. Sesi ini nutup gap itu.

## Perubahan
- `data-health-check.js` — tambah 1 check baru di `runDataHealthCheck()`,
  setelah blok `(D.debts||[]).forEach(...)`, sebelum cek `D.renovProjects`.
  Reuse PENUH `DebtStrategy.computeDSR()` (piutang-utang.js) apa adanya,
  threshold `>35` disamakan persis dgn `debt-optimizer-api.js`
  (`debt_dsr_high`) & `debt-optimizer-presenter.js` (`_dsrCard` cls `'red'`).
  0 rumus baru, 0 perubahan ke cek lain di file itu.
- Guard: `typeof DebtStrategy!=='undefined'&&typeof DebtStrategy.computeDSR
  ==='function'` — aman kalau load order berubah / dipanggil dari test
  terisolasi tanpa piutang-utang.js dimuat.
- False-positive guard: hanya munculkan issue kalau `incAvg>0` DAN
  `pct` berupa number (bukan `null`) — hindari warning palsu utk keluarga
  yang belum pernah catat income (computeDSR return `pct:null` di kasus
  itu).

## Test
- File baru: `tests/s686-data-health-check-dsr-warning.test.js` (5 test)
- Sengaja MOCK `DebtStrategy.computeDSR()` langsung lewat `extraGlobals`
  loadSource (bukan load `piutang-utang.js`+`worthit.js` penuh) — unit
  test ini cuma mau pastikan `data-health-check.js` memanggil
  `DebtStrategy.computeDSR()` apa adanya & merender issue-nya dgn benar,
  bukan nge-test ulang formula DSR itu sendiri.
- Kasus dites: DSR merah (38%) → warn muncul; DSR persis di batas 35% →
  TIDAK warn (strict `>35`, bukan `>=`); DSR zona aman/kuning (20%) →
  TIDAK warn; `incAvg:0, pct:null` (belum ada data income) → TIDAK warn;
  `DebtStrategy` belum dimuat sama sekali → guard, tidak error.
- Cross-realm note: `args[0]` (objek nav target) dibandingkan pakai
  `JSON.stringify(...)` bukan `assert.deepEqual` langsung — pola sama dgn
  known issue cross-realm vm sandbox (lihat catatan S674).

## Full suite
`node --test tests/*.test.js` → **5059 pass, 0 fail** (baseline + 5 test
baru sesi ini). 0 regresi ke cek Data Health Check lain.

## File yang berubah (patch ZIP sesi ini)
- `data-health-check.js` (modifikasi)
- `tests/s686-data-health-check-dsr-warning.test.js` (baru)
- `SESSION-NOTE-S686.md` (baru)

## Belum dikerjakan (di luar cakupan sesi ini, sengaja)
- Rekomendasi #3 dari audit (simulasi "DSR bakal naik jadi X% kalau utang
  ini disimpan" di form Buku Utang sebelum submit) — scope terpisah,
  nyentuh modal Utang, bukan Data Health Check. Kandidat sesi berikutnya.
- Threshold custom per keluarga (field `D.debtStrategy.threshold`) — belum
  ada demand konkret, sengaja tidak ditambah preemptif.
