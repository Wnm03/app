# Sesi S636 — Keamanan PIN: salt hash per-perangkat

**Konteks:** Audit keamanan proaktif atas `modules/shared/keamanan-pin.js`
(diminta user: "buatkan patch perbaikan keamanan PIN"), bukan dari laporan
bug spesifik.

**Temuan:** `hashPin()` sebelumnya pakai salt string TETAP
(`'kwPinSalt_v1:'`) yang identik di semua instalasi. Karena source code
app ini terbuka di repo GitHub, salt itu bukan rahasia — penyerang bisa
precompute satu tabel hash untuk 10.000 kombinasi PIN 4-digit sekali saja,
lalu pakai ulang tabel yang sama untuk membalik hash `kw_pin` curian dari
instalasi mana pun. Ini membuat fungsi salting nyaris tidak memberi
proteksi tambahan.

**Fix:** salt acak 16-byte per-instalasi (`kw_pin_salt` di localStorage),
dibuat otomatis saat pertama kali dibutuhkan. Migrasi transparan: PIN lama
(hash skema lama) tetap diterima sekali di `checkPin()` lalu ditulis ulang
pakai skema baru — user tidak perlu reset PIN. `disablePinFlow()` ikut
membersihkan `kw_pin_salt`.

**Batasan yang tetap ada (didokumentasikan, bukan bug):**
- PIN tetap 4 digit (10.000 kombinasi) — begitu penyerang tahu salt
  spesifik korban (satu localStorage yang sama dgn hash-nya), brute-force
  offline tetap cepat. Lockout percobaan PIN (sudah ada sejak sesi
  sebelumnya) memitigasi ini HANYA untuk jalur UI/keypad, bukan akses
  langsung ke JS console/localStorage.
- Perbandingan hash (`===`) bukan constant-time — risiko timing attack
  lewat JS di browser terhadap variabel lokal dinilai sangat rendah untuk
  ancaman yang relevan di sini (tidak diubah sesi ini).

**File yang berubah:**
- `modules/shared/keamanan-pin.js` — logic salt per-perangkat + migrasi
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild (source di atas
  ikut ter-bundle)
- `index.html`, `app_production.html`, `sw.js` — bump versi v1368→v1369
  (otomatis dari `scripts/build.js`)
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — sinkron
  konstanta versi (otomatis dari `scripts/build.js`, tanpa perubahan
  logic)
- `CHANGELOG.md` — entri baru
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

**Test:** `node --test tests/*.test.js` → **4505/4505 lulus, 0 gagal**
(termasuk `tests/keamanan-pin-apikey.test.js` &
`tests/boot-pin-idempotent.test.js`, tidak ada regresi).

**Belum dijalankan di lingkungan ini:** `npm run lint` (tidak ada akses
network di lingkungan ini untuk eslint) dan `verify-release-ready.js` —
disarankan dijalankan manual di project sebelum merge.
